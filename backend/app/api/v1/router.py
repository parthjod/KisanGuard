"""API v1 master router mounting all domain-specific routers."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import alerts, audit, cdhi, frontend_adapter, health, irrigation, org, users, wbgt, webhook

api_router = APIRouter()

api_router.include_router(frontend_adapter.router, tags=["Frontend Adapter"])
api_router.include_router(wbgt.router, tags=["WBGT"])
api_router.include_router(cdhi.router, tags=["CDHI & CSYR"])
api_router.include_router(irrigation.router, tags=["Irrigation"])
api_router.include_router(alerts.router, tags=["Alerts"])
api_router.include_router(audit.router, tags=["Audit Trail"])
api_router.include_router(users.router, tags=["Users"])
api_router.include_router(org.router, tags=["Organization Dashboard"])
api_router.include_router(webhook.router, tags=["Partner Webhooks"])
api_router.include_router(health.router, tags=["Health"])
