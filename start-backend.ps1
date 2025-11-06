# PowerShell script to start the backend server
# Usage: .\start-backend.ps1

# Set execution policy for this session (if needed)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force

# Change to backend directory
Set-Location -Path "backend"

# Activate virtual environment
& "..\venv\Scripts\Activate.ps1"

# Start the uvicorn server
python -m uvicorn app.main:app --reload

