from datetime import date, timedelta
from sqlalchemy.orm import Session
from app.models.attendance import Attendance
import logging

logger = logging.getLogger(__name__)


class CleanupService:
    """Service for cleaning up old attendance records."""
    
    @staticmethod
    def cleanup_old_attendance(db: Session, months: int = 6) -> dict:
        """
        Delete attendance records older than specified months.
        
        Args:
            db: Database session
            months: Number of months to keep (default: 6)
            
        Returns:
            dict with cleanup statistics
        """
        try:
            # Calculate cutoff date (approximately months ago)
            # Using average of 30.44 days per month for better accuracy
            cutoff_date = date.today() - timedelta(days=int(months * 30.44))
            
            # Count records to be deleted (for logging)
            count_query = db.query(Attendance).filter(
                Attendance.attendance_date < cutoff_date
            )
            records_to_delete = count_query.count()
            
            if records_to_delete == 0:
                logger.info(f"No attendance records older than {months} months found. Cutoff date: {cutoff_date}")
                return {
                    "status": "success",
                    "message": f"No records to delete",
                    "cutoff_date": cutoff_date.isoformat(),
                    "deleted_count": 0
                }
            
            # Delete old records
            deleted = count_query.delete(synchronize_session=False)
            db.commit()
            
            logger.info(f"Successfully deleted {deleted} attendance records older than {months} months (cutoff: {cutoff_date})")
            
            return {
                "status": "success",
                "message": f"Deleted {deleted} attendance records older than {months} months",
                "cutoff_date": cutoff_date.isoformat(),
                "deleted_count": deleted
            }
            
        except Exception as e:
            logger.error(f"Error during attendance cleanup: {str(e)}")
            db.rollback()
            return {
                "status": "error",
                "message": f"Error cleaning up attendance: {str(e)}",
                "deleted_count": 0
            }


# Global instance
cleanup_service = CleanupService()
