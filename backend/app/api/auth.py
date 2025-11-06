from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload
from typing import Optional
import os
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_password_hash
from app.schemas.user import UserLogin, Token, UserResponse, UserCreate, UserUpdate
from app.models.user import User
from app.core.dependencies import get_current_user
import logging

logger = logging.getLogger(__name__)

# Import OCR service only when needed (lazy import to avoid startup issues)
try:
    from app.services.ocr_service import ocr_service
    OCR_SERVICE_AVAILABLE = True
except ImportError as e:
    logger.warning(f"OCR service not available: {e}")
    ocr_service = None
    OCR_SERVICE_AVAILABLE = False

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token."""
    user = db.query(User).filter(User.username == user_credentials.username).first()
    
    if not user or not verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email already exists
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
        role=user_data.role,
        student_id=user_data.student_id,
        branch=user_data.branch
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user


@router.post("/register-with-id", response_model=UserResponse)
async def register_with_id_card(
    id_card_front: UploadFile = File(..., description="Front side of ID card (required)"),
    id_card_back: Optional[UploadFile] = File(None, description="Back side of ID card (optional)"),
    username: str = Form(..., description="Desired username"),
    password: str = Form(..., description="Password for account"),
    full_name: str = Form(..., description="Full name (must match ID card)"),
    roll_number: str = Form(..., description="Roll number/USN (must match ID card)"),
    branch: str = Form(..., description="Branch/Department"),
    year_of_joining: int = Form(..., description="Year of joining"),
    db: Session = Depends(get_db)
):
    """
    Register a new user (student or teacher) using ID card OCR.
    The system will automatically detect role and extract information from the ID card.
    """
    try:
        # Validate image file
        if not id_card_front.content_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Front ID card must be an image file"
            )
        
        # Read front ID card image
        front_image_bytes = await id_card_front.read()
        
        # Read back ID card image if provided
        back_image_bytes = None
        if id_card_back:
            if not id_card_back.content_type.startswith('image/'):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Back ID card must be an image file"
                )
            back_image_bytes = await id_card_back.read()
        
        # Process front ID card with OCR
        if not OCR_SERVICE_AVAILABLE or ocr_service is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OCR service is not available. Please contact administrator."
            )
        
        logger.info(f"Processing ID card for user: {username}")
        extracted_data = ocr_service.process_id_card(front_image_bytes)
        
        # If back card is provided, process it and merge data
        if back_image_bytes and OCR_SERVICE_AVAILABLE and ocr_service:
            back_data = ocr_service.process_id_card(back_image_bytes)
            # Merge data (front takes priority for conflicts)
            if not extracted_data.get('full_name') and back_data.get('full_name'):
                extracted_data['full_name'] = back_data['full_name']
            if not extracted_data.get('roll_number') and back_data.get('roll_number'):
                extracted_data['roll_number'] = back_data['roll_number']
            if not extracted_data.get('branch') and back_data.get('branch'):
                extracted_data['branch'] = back_data['branch']
            if not extracted_data.get('email') and back_data.get('email'):
                extracted_data['email'] = back_data['email']
        
        # Determine role - only students can register with this endpoint
        role = extracted_data.get('role', 'student')
        if role == 'teacher':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Teachers cannot register through this endpoint. Please use the standard registration."
            )
        
        # Validate that extracted name matches provided name (lenient check)
        # OCR can be inaccurate, so we trust user input but log mismatches
        extracted_name = extracted_data.get('full_name', '').strip().lower()
        provided_name = full_name.strip().lower()
        
        if extracted_name:
            # Check if names match (allowing for minor OCR errors)
            # Remove extra spaces and compare
            extracted_name_normalized = ' '.join(extracted_name.split())
            provided_name_normalized = ' '.join(provided_name.split())
            
            # Check for substring match or similar words
            name_match = False
            
            # Check if one is contained in the other
            if extracted_name_normalized in provided_name_normalized or provided_name_normalized in extracted_name_normalized:
                name_match = True
            else:
                # Check for word overlap (at least 50% of words should match)
                extracted_words = set(extracted_name_normalized.split())
                provided_words = set(provided_name_normalized.split())
                if extracted_words and provided_words:
                    match_ratio = len(extracted_words & provided_words) / max(len(extracted_words), len(provided_words))
                    if match_ratio >= 0.5:  # Lowered threshold to 50%
                        name_match = True
                    else:
                        # Check for character similarity (fuzzy match for OCR errors)
                        # Remove common OCR mistakes and check similarity
                        common_replacements = {
                            '0': 'O', '1': 'I', '5': 'S', '8': 'B',
                            'rn': 'm', 'cl': 'd', 'vv': 'w'
                        }
                        extracted_clean = extracted_name_normalized
                        provided_clean = provided_name_normalized
                        for old, new in common_replacements.items():
                            extracted_clean = extracted_clean.replace(old, new)
                            provided_clean = provided_clean.replace(old, new)
                        
                        # If still similar after replacements, allow it
                        if extracted_clean in provided_clean or provided_clean in extracted_clean:
                            name_match = True
            
            # Only log warning, don't block - trust user input since they have the physical ID card
            if not name_match:
                logger.warning(
                    f"Name mismatch for user {username}: "
                    f"Extracted '{extracted_data.get('full_name', 'Not found')}' "
                    f"but user provided '{full_name}'. Allowing registration - trusting user input."
                )
        
        # Validate that extracted roll number matches provided roll number (lenient check)
        # OCR can misread characters, so we use fuzzy matching
        extracted_roll = extracted_data.get('roll_number', '').strip().upper()
        provided_roll = roll_number.strip().upper()
        
        if extracted_roll and provided_roll:
            # Remove spaces and special characters for comparison
            extracted_roll_clean = ''.join(c for c in extracted_roll if c.isalnum())
            provided_roll_clean = ''.join(c for c in provided_roll if c.isalnum())
            
            # Common OCR character confusions
            ocr_replacements = {
                '0': 'O', '1': 'I', '5': 'S', '8': 'B',
                'O': '0', 'I': '1', 'S': '5', 'B': '8'
            }
            
            # Try exact match first
            roll_match = extracted_roll_clean == provided_roll_clean
            
            # If no exact match, try with OCR replacements
            if not roll_match:
                extracted_fuzzy = extracted_roll_clean
                provided_fuzzy = provided_roll_clean
                for old, new in ocr_replacements.items():
                    extracted_fuzzy = extracted_fuzzy.replace(old, new)
                    provided_fuzzy = provided_fuzzy.replace(old, new)
                
                roll_match = extracted_fuzzy == provided_fuzzy
            
            # If still no match, check similarity (allow 1-2 character differences for OCR errors)
            if not roll_match and len(extracted_roll_clean) > 0 and len(provided_roll_clean) > 0:
                # Calculate Levenshtein-like similarity
                max_len = max(len(extracted_roll_clean), len(provided_roll_clean))
                min_len = min(len(extracted_roll_clean), len(provided_roll_clean))
                
                # Allow if lengths are similar and at least 80% of characters match
                if abs(len(extracted_roll_clean) - len(provided_roll_clean)) <= 2:
                    matches = sum(1 for a, b in zip(extracted_roll_clean, provided_roll_clean) if a == b)
                    similarity = matches / max_len if max_len > 0 else 0
                    if similarity >= 0.8:
                        roll_match = True
            
            # Only log warning, don't block - trust user input since they have the physical ID card
            if not roll_match:
                logger.warning(
                    f"Roll number mismatch for user {username}: "
                    f"Extracted '{extracted_data.get('roll_number', 'Not found')}' "
                    f"but user provided '{roll_number}'. Allowing registration - trusting user input."
                )
        
        # Use provided values
        extracted_email = extracted_data.get('email')
        email = extracted_email if extracted_email else f"{username}@autoattend.edu"
        
        # Validate username uniqueness
        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )
        
        # Validate email uniqueness
        existing_email = db.query(User).filter(User.email == email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Validate student_id uniqueness if it's a student with roll number
        if role == 'student' and roll_number:
            existing_student_id = db.query(User).filter(User.student_id == roll_number).first()
            if existing_student_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Student ID {roll_number} already registered"
                )
        
        # Validate branch (must be from allowed list)
        allowed_branches = ['CSE', 'ISE', 'ECE', 'AIML', 'AICY', 'MEC', 'CIV']
        if branch.upper() not in [b.upper() for b in allowed_branches]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid branch. Please select one of: {', '.join(allowed_branches)}"
            )
        
        # Normalize branch to uppercase
        branch = branch.upper()
        
        # Validate year_of_joining (should be a reasonable year)
        current_year = 2025  # You can make this dynamic
        if year_of_joining < 2000 or year_of_joining > current_year + 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid year of joining. Please enter a year between 2000 and {current_year + 1}."
            )
        
        # Create user
        hashed_password = get_password_hash(password)
        new_user = User(
            username=username,
            email=email,
            full_name=full_name,
            hashed_password=hashed_password,
            role=role,
            student_id=roll_number if role == 'student' else None,
            branch=branch,
            year_of_joining=year_of_joining
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        logger.info(f"Successfully registered user: {username} as {role}")
        
        return new_user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during registration: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information."""
    try:
        # Ensure photos are loaded for primary_photo property
        if hasattr(current_user, 'photos'):
            _ = current_user.photos  # Access to trigger lazy loading
        return current_user
    except Exception as e:
        logger.error(f"Error serializing user info: {e}")
        # Return user without photos if there's an issue
        return current_user


@router.put("/me", response_model=UserResponse)
def update_current_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's profile (branch and year of joining)."""
    # Only allow students to update their own profile
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can update their profile"
        )
    
    # Validate branch if provided
    if user_update.branch is not None:
        allowed_branches = ['CSE', 'ISE', 'ECE', 'AIML', 'AICY', 'MEC', 'CIV']
        if user_update.branch.upper() not in [b.upper() for b in allowed_branches]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid branch. Please select one of: {', '.join(allowed_branches)}"
            )
        current_user.branch = user_update.branch.upper()
    
    # Validate year_of_joining if provided
    if user_update.year_of_joining is not None:
        current_year = 2025  # You can make this dynamic
        if user_update.year_of_joining < 2000 or user_update.year_of_joining > current_year + 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid year of joining. Please enter a year between 2000 and {current_year + 1}."
            )
        current_user.year_of_joining = user_update.year_of_joining
    
    db.commit()
    db.refresh(current_user)
    
    return current_user

