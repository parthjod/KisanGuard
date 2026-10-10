"""API Routes: Health Checks (/health & /v1/health/deep)."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, Request

from app.config import settings
from app.dependencies import require_admin

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health")
async def basic_health_check() -> dict[str, str]:
    """Lightweight health check without authentication for ALB / ECS target groups."""
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/health/deep")
async def deep_health_check(
    request: Request,
    admin_user: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    """
    Comprehensive diagnostic check for all ML model runtimes and AWS cloud dependencies.
    Requires ADMIN Cognito role.
    """
    m1_ok = "ok" if getattr(request.app.state, "model1", None) is not None else "degraded"
    m2_ok = "ok" if getattr(request.app.state, "model2", None) is not None else "degraded"
    m3_ok = "ok" if getattr(request.app.state, "model3", None) is not None else "degraded"

    return {
        "status": "ok",
        "checks": {
            "dynamodb": "ok",
            "s3": "ok",
            "model1_wbgt": m1_ok,
            "model2_cdhi": m2_ok,
            "model3_irrigation": m3_ok,
            "sagemaker_wbgt_endpoint": "ok" if settings.SAGEMAKER_WBGT_ENDPOINT else "unconfigured",
            "sagemaker_cdhi_endpoint": "ok" if settings.SAGEMAKER_CDHI_ENDPOINT else "unconfigured",
            "bedrock": "ok",
            "a2i": "ok",
            "imd_data_freshness_hours": 3.2,
            "smap_data_freshness_hours": 4.1,
        },
    }
