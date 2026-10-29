from pydantic import BaseModel

from app.models.enums import ApplicationStatus


class MonthlyApplicationCount(BaseModel):
    month: str
    count: int


class AnalyticsSummaryResponse(BaseModel):
    total_applications: int
    applications_by_status: dict[ApplicationStatus, int]
    interviews_scheduled: int
    offers_received: int
    rejections: int
    monthly_applications: list[MonthlyApplicationCount]
