# Attendance Cleanup System

## Overview
The AutoAttend system now automatically manages attendance records by deleting old data while preserving student and teacher information. This helps maintain database performance and saves storage space.

## Features

### Automatic Daily Cleanup
- **Schedule**: Runs automatically every day at **2:00 AM**
- **Retention Period**: Keeps attendance records for the last **6 months**
- **Automatic**: No manual intervention required
- **Safe**: Only deletes attendance records; preserves all user and class data

### What Gets Deleted
- ✅ Attendance records older than 6 months
- ✅ Based on `attendance_date` field

### What Gets Preserved
- ✅ All student accounts (`users` table)
- ✅ All teacher accounts (`users` table)
- ✅ All classes (`classes` table)
- ✅ All enrollments (`enrollments` table)
- ✅ All student photos (`student_photos` table)
- ✅ Recent attendance records (last 6 months)

## Technical Implementation

### Components

1. **Cleanup Service** (`backend/app/services/cleanup.py`)
   - Contains the core cleanup logic
   - Safely deletes old attendance records
   - Returns detailed statistics

2. **Background Scheduler** (`backend/app/main.py`)
   - Uses APScheduler for task scheduling
   - Runs cleanup job daily at 2:00 AM
   - Automatically starts/stops with the FastAPI application

3. **Manual Cleanup Endpoint** (`backend/app/api/attendance.py`)
   - `POST /attendance/cleanup-old-records?months=6`
   - Allows teachers to manually trigger cleanup
   - Useful for testing or immediate cleanup

### Configuration

The cleanup system uses:
- **Retention Period**: 6 months (configurable)
- **Schedule**: Daily at 2:00 AM (configurable in `main.py`)
- **Date Calculation**: Uses average of 30.44 days per month for accuracy

## Usage

### Automatic Cleanup
The cleanup runs automatically when the backend server is running. No action needed.

### Manual Cleanup (Teachers Only)
Teachers can manually trigger cleanup via API:

```bash
POST /attendance/cleanup-old-records?months=6
```

**Parameters:**
- `months` (optional): Number of months to retain (default: 6, range: 1-24)

**Response:**
```json
{
  "status": "success",
  "message": "Deleted 150 attendance records older than 6 months",
  "cutoff_date": "2024-01-15",
  "deleted_count": 150
}
```

## Installation

1. Install APScheduler (if not already installed):
   ```bash
   pip install apscheduler==3.10.4
   ```

2. Restart the backend server:
   ```bash
   # Make sure you're in the backend directory
   uvicorn app.main:app --reload
   ```

3. Verify the scheduler is running:
   - Check server logs for: `"Background scheduler started. Daily cleanup scheduled at 2:00 AM"`

## Logging

The cleanup system logs important events:

- **Info**: Cleanup started, records deleted, no records found
- **Error**: Database errors, cleanup failures

Check your server logs to monitor cleanup operations.

## Database Impact

### Before Cleanup
```
Total attendance records: 10,000
Oldest record: 2023-01-01
Newest record: 2024-07-15
```

### After Cleanup (6 months retention)
```
Total attendance records: 1,800
Oldest record: 2024-01-15  (6 months ago)
Newest record: 2024-07-15
Deleted: 8,200 records
```

## Customization

### Change Retention Period
Edit the cleanup job in `backend/app/main.py`:
```python
result = cleanup_service.cleanup_old_attendance(db, months=6)  # Change 6 to desired months
```

### Change Schedule Time
Edit the CronTrigger in `backend/app/main.py`:
```python
trigger=CronTrigger(hour=2, minute=0)  # Change hour and minute as needed
```

### Disable Automatic Cleanup
Comment out the scheduler code in `backend/app/main.py`:
```python
# scheduler.start()  # Disable automatic cleanup
```

## Safety Features

1. **Transaction Safety**: Uses database transactions with rollback on error
2. **Logging**: All operations are logged for auditing
3. **Preservation**: Only attendance records are deleted; all other data is safe
4. **Error Handling**: Graceful error handling prevents data corruption

## Testing

To test the cleanup system:

1. Create some test attendance records with old dates
2. Use the manual cleanup endpoint:
   ```bash
   curl -X POST "http://localhost:8000/attendance/cleanup-old-records?months=1" \
        -H "Authorization: Bearer YOUR_TOKEN"
   ```
3. Verify old records are deleted while recent ones remain

## Troubleshooting

### Cleanup Not Running
- Check if APScheduler is installed: `pip list | grep apscheduler`
- Check server logs for scheduler startup messages
- Verify the backend server is running continuously

### Too Many/Few Records Deleted
- Verify the retention period (default: 6 months)
- Check the `attendance_date` field values in your database
- Review cleanup logs for details

### Database Errors
- Ensure MySQL connection is stable
- Check database permissions
- Review error logs for specific issues

## Notes

- The cleanup process is **non-reversible**. Deleted records cannot be recovered.
- Consider backing up your database before running manual cleanup.
- The automatic cleanup runs during low-traffic hours (2 AM) to minimize impact.
- Student IDs and Teacher IDs are never deleted, only attendance records.

---

**Last Updated**: July 2024
**Version**: 1.0
