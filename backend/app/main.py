"""KisanGuard Backend: Main FastAPI Application Entrypoint."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.api.ws.dashboard import router as ws_router
from app.config import settings
from app.lifespan import lifespan
from app.utils.correlation import CorrelationIDMiddleware
from app.utils.errors import KisanGuardError

logger = logging.getLogger("kisanguard")

app = FastAPI(
    title="KisanGuard API",
    description="Hyperlocal Heat & Drought Alert Platform for India's Outdoor Workers and Smallholders",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# 1. Middleware
app.add_middleware(CorrelationIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Global Exception Handlers
@app.exception_handler(KisanGuardError)
async def kisanguard_error_handler(request: Request, exc: KisanGuardError) -> JSONResponse:
    req_id = getattr(request.state, "correlation_id", "unknown")
    content = {
        "error": exc.code,
        "message": exc.message,
        "request_id": req_id,
        **exc.extra,
    }
    return JSONResponse(status_code=exc.status_code, content=content)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    req_id = getattr(request.state, "correlation_id", "unknown")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "VALIDATION_ERROR",
            "message": str(exc.errors()),
            "request_id": req_id,
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    req_id = getattr(request.state, "correlation_id", "unknown")
    logger.exception("unhandled_server_error", exc_info=exc, request_id=req_id)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected server error occurred.",
            "request_id": req_id,
        },
    )


# 3. Root health check (unauthenticated for ALB / ECS target groups)
@app.get("/health", tags=["Health"])
async def root_health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# 4. Mount API Routers
app.include_router(api_router, prefix="/v1")
app.include_router(ws_router, prefix="/ws", tags=["WebSocket"])
