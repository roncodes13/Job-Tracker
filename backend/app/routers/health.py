from fastapi import APIRouter

router = APIRouter()


@router.get("/health", summary="Check API health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
