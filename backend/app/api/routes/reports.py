"""
Report generation endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
from io import BytesIO
import uuid

from app.database import get_db
from app.services.aws import AWSService
from app.models.exposure import ExposureLog

router = APIRouter()


class ReportRequest(BaseModel):
    """Report generation request model."""
    user_id: str
    report_type: str  # daily, weekly, monthly, custom
    period: str = "last_30_days"  # or date range
    format: str = "pdf"  # pdf, csv, json


@router.post("/generate")
async def generate_report(
    request: ReportRequest,
    db: Session = Depends(get_db)
):
    """
    Generate air quality exposure report.
    
    Creates PDF report with exposure history, recommendations, and statistics.
    Stores in S3 and returns download URL.
    """
    try:
        # Determine date range
        end_date = datetime.utcnow().date()
        if request.period == "last_7_days":
            start_date = end_date - timedelta(days=7)
        elif request.period == "last_30_days":
            start_date = end_date - timedelta(days=30)
        elif request.period == "last_90_days":
            start_date = end_date - timedelta(days=90)
        else:
            start_date = end_date - timedelta(days=30)
        
        # Query exposure logs
        logs = db.query(ExposureLog).filter(
            ExposureLog.user_id == uuid.UUID(request.user_id),
            ExposureLog.date >= start_date,
            ExposureLog.date <= end_date
        ).all()
        
        # Calculate statistics
        total_exposure = sum(float(log.exposure_score or 0) for log in logs)
        total_duration = sum(log.duration_minutes for log in logs)
        avg_aqi = (total_exposure / (total_duration / 60)) if total_duration > 0 else 0
        
        # Generate report content
        report_content = generate_report_content(
            request.user_id,
            logs,
            start_date,
            end_date,
            total_exposure,
            avg_aqi
        )
        
        # Upload to S3
        aws_service = AWSService()
        report_filename = f"reports/{request.user_id}/exposure_{start_date}_{end_date}.{request.format}"
        
        upload_result = await aws_service.upload_to_s3(
            file_content=report_content.encode('utf-8'),
            key=report_filename,
            content_type="application/pdf" if request.format == "pdf" else "application/json"
        )
        
        report_id = str(uuid.uuid4())
        
        return {
            "success": True,
            "report_id": report_id,
            "status": "generated",
            "download_url": upload_result.get("url", f"/api/reports/download/{report_id}"),
            "format": request.format,
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "statistics": {
                "total_exposure": round(total_exposure, 2),
                "average_aqi": round(avg_aqi, 1),
                "days_logged": len(set(log.date for log in logs))
            }
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user_id format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")


@router.get("/download/{report_id}")
async def download_report(
    report_id: str,
    db: Session = Depends(get_db)
):
    """
    Download generated report.
    
    Returns report file for download.
    """
    # In production, fetch from S3 or database
    return {
        "report_id": report_id,
        "message": "Download link would be provided here",
        "note": "In production, this would return the actual file or redirect to S3 URL"
    }


@router.get("/list")
async def list_user_reports(
    user_id: str = Query(..., description="User ID"),
    db: Session = Depends(get_db)
):
    """
    List all reports for a user.
    
    Returns history of generated reports.
    """
    return {
        "user_id": user_id,
        "reports": []
    }


def generate_report_content(
    user_id: str,
    logs: list,
    start_date,
    end_date,
    total_exposure: float,
    avg_aqi: float
) -> str:
    """
    Generate report content.
    
    In production, this would generate actual PDF using a library like ReportLab.
    For now, returns JSON summary.
    """
    return f"""
AIR QUALITY EXPOSURE REPORT
User ID: {user_id}
Period: {start_date} to {end_date}

SUMMARY:
- Total Exposure Score: {total_exposure:.2f}
- Average AQI: {avg_aqi:.1f}
- Days Logged: {len(set(log.date for log in logs))}
- Total Activities: {len(logs)}

RECOMMENDATIONS:
- {'Maintain current exposure levels' if avg_aqi < 50 else 'Consider reducing time in polluted areas'}
- {'Good air quality exposure' if avg_aqi < 100 else 'Monitor symptoms and limit outdoor activities'}

This is a simplified text report. Production version would be a formatted PDF with charts and detailed analysis.
"""
