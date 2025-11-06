"""
OCR Service for extracting information from ID cards.
Uses EasyOCR for text extraction and pattern matching for data parsing.
"""
import easyocr
import re
import logging
from typing import Dict, Optional, Tuple
from PIL import Image
import io
import numpy as np

# Fix for Pillow 10+ compatibility - ANTIALIAS was removed
# EasyOCR uses it internally, so we need to provide it for compatibility
if not hasattr(Image, 'ANTIALIAS'):
    Image.ANTIALIAS = Image.LANCZOS  # Use LANCZOS as replacement

logger = logging.getLogger(__name__)

# Initialize EasyOCR reader lazily (on first use)
# This will download models on first run
reader = None
OCR_AVAILABLE = False

def _initialize_reader():
    """Initialize EasyOCR reader on first use."""
    global reader, OCR_AVAILABLE
    if reader is None and not OCR_AVAILABLE:
        try:
            logger.info("Initializing EasyOCR reader (first time - may take a moment)...")
            reader = easyocr.Reader(['en'], gpu=False)
            OCR_AVAILABLE = True
            logger.info("EasyOCR reader initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize EasyOCR: {e}")
            OCR_AVAILABLE = False
            reader = None
    return reader


class OCRService:
    """Service for extracting information from ID card images."""
    
    @staticmethod
    def extract_text_from_image(image_bytes: bytes) -> str:
        """
        Extract all text from an image using EasyOCR.
        
        Args:
            image_bytes: Image file bytes
            
        Returns:
            Extracted text as a single string
        """
        # Initialize reader on first use
        ocr_reader = _initialize_reader()
        if ocr_reader is None:
            raise Exception("OCR is not available. Please install EasyOCR and ensure models are downloaded.")
        
        try:
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_bytes))
            
            # Convert to RGB if necessary (EasyOCR expects RGB)
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert to numpy array for EasyOCR
            image_array = np.array(image)
            
            # Extract text
            results = ocr_reader.readtext(image_array)
            
            # Combine all detected text
            text_lines = [result[1] for result in results]
            full_text = " ".join(text_lines)
            
            logger.info(f"Extracted text: {full_text[:200]}...")  # Log first 200 chars
            return full_text
            
        except Exception as e:
            logger.error(f"Error extracting text from image: {e}")
            raise Exception(f"Failed to extract text from image: {str(e)}")
    
    @staticmethod
    def detect_role(text: str) -> str:
        """
        Detect if the ID card belongs to a teacher or student.
        
        Args:
            text: Extracted text from ID card
            
        Returns:
            'teacher' or 'student'
        """
        text_lower = text.lower()
        
        # Keywords that indicate teacher/faculty
        teacher_keywords = ['faculty', 'teacher', 'instructor', 'professor', 'staff', 'employee']
        
        # Keywords that indicate student
        student_keywords = ['student', 'learner', 'pupil', 'scholar']
        
        # Check for teacher keywords first (higher priority)
        for keyword in teacher_keywords:
            if keyword in text_lower:
                return 'teacher'
        
        # Check for student keywords
        for keyword in student_keywords:
            if keyword in text_lower:
                return 'student'
        
        # Default to student if no clear indication
        return 'student'
    
    @staticmethod
    def extract_name(text: str) -> Optional[str]:
        """
        Extract full name from ID card text.
        Looks for patterns like "Name:", "Full Name:", etc.
        
        Args:
            text: Extracted text from ID card
            
        Returns:
            Extracted name or None
        """
        # Patterns for name extraction
        name_patterns = [
            r'name[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
            r'full\s+name[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
            r'student\s+name[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
            r'^([A-Z][a-z]+\s+[A-Z][a-z]+)',  # First line might be name
        ]
        
        for pattern in name_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                name = match.group(1).strip()
                # Validate name (should have at least first and last name)
                if len(name.split()) >= 2:
                    return name
        
        return None
    
    @staticmethod
    def extract_roll_number(text: str) -> Optional[str]:
        """
        Extract roll number/USN/University Seat Number from ID card text.
        
        Args:
            text: Extracted text from ID card
            
        Returns:
            Extracted roll number or None
        """
        # Patterns for roll number (various formats)
        roll_patterns = [
            r'usn[:\s]+([A-Z0-9]+)',
            r'university\s+seat\s+number[:\s]+([A-Z0-9]+)',
            r'roll\s+no[.:\s]+([A-Z0-9]+)',
            r'roll\s+number[:\s]+([A-Z0-9]+)',
            r'student\s+id[:\s]+([A-Z0-9]+)',
            r'id[:\s]+([A-Z][0-9]{6,})',  # Pattern like S001234 or similar
            r'([A-Z][0-9]{6,})',  # Generic pattern: Letter followed by 6+ digits
        ]
        
        for pattern in roll_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                roll_number = match.group(1).strip().upper()
                # Validate roll number (should be reasonable length)
                if 3 <= len(roll_number) <= 20:
                    return roll_number
        
        return None
    
    @staticmethod
    def extract_branch(text: str) -> Optional[str]:
        """
        Extract branch/department from ID card text.
        
        Args:
            text: Extracted text from ID card
            
        Returns:
            Extracted branch name or None
        """
        # Common branch patterns
        branch_patterns = [
            r'branch[:\s]+([A-Z][a-zA-Z\s]+)',
            r'department[:\s]+([A-Z][a-zA-Z\s]+)',
            r'course[:\s]+([A-Z][a-zA-Z\s]+)',
            r'program[:\s]+([A-Z][a-zA-Z\s]+)',
        ]
        
        # Common branch keywords to look for
        common_branches = [
            'computer science', 'electronics', 'mechanical', 'civil', 
            'electrical', 'information technology', 'ai', 'machine learning',
            'data science', 'cyber security', 'software engineering'
        ]
        
        # Try pattern matching first
        for pattern in branch_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                branch = match.group(1).strip()
                # Clean up branch name
                branch = re.sub(r'\s+', ' ', branch)  # Multiple spaces to single
                if len(branch) <= 100:  # Reasonable length
                    return branch.title()
        
        # Try keyword matching
        text_lower = text.lower()
        for branch_name in common_branches:
            if branch_name in text_lower:
                return branch_name.title()
        
        return None
    
    @staticmethod
    def extract_email(text: str) -> Optional[str]:
        """
        Extract email from ID card text.
        
        Args:
            text: Extracted text from ID card
            
        Returns:
            Extracted email or None
        """
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        match = re.search(email_pattern, text)
        if match:
            return match.group(0).lower()
        return None
    
    @staticmethod
    def process_id_card(image_bytes: bytes) -> Dict[str, any]:
        """
        Process ID card image and extract all relevant information.
        
        Args:
            image_bytes: ID card image file bytes
            
        Returns:
            Dictionary with extracted information:
            {
                'role': 'student' or 'teacher',
                'full_name': str or None,
                'roll_number': str or None,
                'branch': str or None,
                'email': str or None,
                'raw_text': str
            }
        """
        # Initialize reader on first use
        ocr_reader = _initialize_reader()
        if ocr_reader is None:
            raise Exception("OCR is not available. Please install EasyOCR and ensure models are downloaded.")
        
        # Extract text from image
        raw_text = OCRService.extract_text_from_image(image_bytes)
        
        # Extract information
        role = OCRService.detect_role(raw_text)
        full_name = OCRService.extract_name(raw_text)
        roll_number = OCRService.extract_roll_number(raw_text)
        branch = OCRService.extract_branch(raw_text)
        email = OCRService.extract_email(raw_text)
        
        return {
            'role': role,
            'full_name': full_name,
            'roll_number': roll_number,
            'branch': branch,
            'email': email,
            'raw_text': raw_text
        }


# Singleton instance
ocr_service = OCRService()

