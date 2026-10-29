from fastapi import APIRouter

from app.routers.analytics import router as analytics_router
from app.routers.applications import router as applications_router
from app.routers.auth import router as auth_router
from app.routers.health import router as health_router
from app.routers.interviews import (
    application_interviews_router,
)
from app.routers.interviews import (
    router as interviews_router,
)

api_router = APIRouter()
api_router.include_router(health_router, prefix="/api", tags=["health"])
api_router.include_router(auth_router, prefix="/api/auth", tags=["auth"])
api_router.include_router(
    applications_router,
    prefix="/api/applications",
    tags=["applications"],
)
api_router.include_router(
    application_interviews_router,
    prefix="/api",
    tags=["interviews"],
)
api_router.include_router(
    interviews_router,
    prefix="/api/interviews",
    tags=["interviews"],
)
api_router.include_router(
    analytics_router,
    prefix="/api/analytics",
    tags=["analytics"],
)
