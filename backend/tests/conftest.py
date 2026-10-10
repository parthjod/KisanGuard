"""Pytest configuration and shared fixtures for unit and integration testing."""

from __future__ import annotations

import os
from typing import AsyncGenerator, Generator

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport

# Set testing environment variables before importing app
os.environ["AWS_REGION"] = "ap-south-1"
os.environ["S3_BUCKET"] = "kisanguard-data-ap-south-1"
os.environ["COGNITO_USER_POOL_ID"] = "ap-south-1_mock"
os.environ["COGNITO_CLIENT_ID"] = "mock_client_id"
os.environ["COGNITO_JWKS_URL"] = "https://cognito-idp.ap-south-1.amazonaws.com/mock/.well-known/jwks.json"
os.environ["SAGEMAKER_WBGT_ENDPOINT"] = "kisanguard-wbgt-v1"
os.environ["SAGEMAKER_CDHI_ENDPOINT"] = "kisanguard-cdhi-csyr-v2"
os.environ["A2I_FLOW_ARN"] = "arn:aws:sagemaker:ap-south-1:123456789012:flow-definition/kisanguard"
os.environ["STEP_FUNCTIONS_ALERT_PIPELINE_ARN"] = "arn:aws:states:ap-south-1:123456789012:stateMachine:kisanguard-alert-pipeline"
os.environ["STEP_FUNCTIONS_RETRAIN_PIPELINE_ARN"] = "arn:aws:states:ap-south-1:123456789012:stateMachine:kisanguard-retrain-pipeline"
os.environ["SNS_ORIGINATION_NUMBER"] = "+919999999999"
os.environ["PINPOINT_APP_ID"] = "mock_pinpoint_app"
os.environ["SNS_OPS_TOPIC_ARN"] = "arn:aws:sns:ap-south-1:123456789012:kisanguard-ops-topic"
os.environ["KMS_CMK_ARN"] = "arn:aws:kms:ap-south-1:123456789012:key/mock-kms-key"
os.environ["USE_LOCAL_MODELS"] = "true"

from app.main import app


@pytest.fixture(scope="session")
def client() -> Generator[TestClient, None, None]:
    """Synchronous test client with initialized lifespan."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Asynchronous HTTP test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def auth_headers_worker() -> dict[str, str]:
    return {"Authorization": "Bearer mock_jwt_worker"}


@pytest.fixture
def auth_headers_farmer() -> dict[str, str]:
    return {"Authorization": "Bearer mock_jwt_farmer"}


@pytest.fixture
def auth_headers_admin() -> dict[str, str]:
    return {"Authorization": "Bearer mock_jwt_admin"}
