@echo off
cd backend
call ..\venv\Scripts\activate.bat
python -m uvicorn app.main:app --reload

