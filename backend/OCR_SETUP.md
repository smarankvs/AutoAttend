# OCR Setup Instructions

This project uses EasyOCR for extracting information from ID cards during registration.

## Installation

### Step 1: Install Python Dependencies

```bash
cd backend
.\venv\Scripts\Activate.ps1  # On Windows
# or
source venv/bin/activate  # On Linux/Mac

pip install -r requirements.txt
```

### Step 2: EasyOCR Automatic Setup

EasyOCR will automatically download the required models on first use. The first time you run the OCR service, it will:

1. Download the English language model (~50-100 MB)
2. Store it in your user directory
3. This is a one-time download

**Note:** Make sure you have a stable internet connection for the first run.

### Step 3: Verify Installation

You can test if OCR is working by running:

```python
python -c "from app.services.ocr_service import ocr_service; print('OCR is ready!')"
```

## Troubleshooting

### Issue: "OCR is not available" error

**Solution:** Make sure EasyOCR is installed:
```bash
pip install easyocr==1.7.0
```

### Issue: Slow first-time processing

**Solution:** This is normal. EasyOCR downloads models on first use. Subsequent runs will be faster.

### Issue: Out of memory errors

**Solution:** If you have limited RAM, you can modify `backend/app/services/ocr_service.py` to use GPU:
```python
reader = easyocr.Reader(['en'], gpu=True)  # Requires CUDA
```

Or use a smaller model:
```python
reader = easyocr.Reader(['en'], gpu=False, model_storage_directory='./models')
```

## ID Card Format Requirements

For best OCR results, ensure ID cards have:

1. **Clear text** - Well-lit, in focus
2. **High resolution** - At least 300x300 pixels
3. **Good contrast** - Dark text on light background
4. **English text** - Currently supports English only

## Supported ID Card Information

The system extracts:
- **Full Name** - From "Name:", "Full Name:" fields
- **Roll Number/USN** - From "USN:", "Roll No:", "Student ID:" fields
- **Branch/Department** - From "Branch:", "Department:", "Course:" fields
- **Email** - Email addresses found on the card
- **Role** - Automatically detected from keywords like "Student", "Faculty", "Teacher"

## Role Detection Keywords

- **Teacher/Faculty:** faculty, teacher, instructor, professor, staff, employee
- **Student:** student, learner, pupil, scholar

