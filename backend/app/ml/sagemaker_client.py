"""SageMaker real-time endpoint client — fallback path when in-process fails."""

from __future__ import annotations

import json
import logging
from typing import Any

import aioboto3

from app.config import settings

logger = logging.getLogger(__name__)

_session = aioboto3.Session()


async def invoke_endpoint(
    endpoint_name: str,
    payload: dict,
    content_type: str = "application/json",
) -> dict:
    """
    Invoke a SageMaker real-time endpoint.
    Used as fallback when in-process model inference fails.
    """
    async with _session.client(
        "sagemaker-runtime",
        region_name=settings.AWS_REGION,
    ) as runtime:
        try:
            response = await runtime.invoke_endpoint(
                EndpointName=endpoint_name,
                ContentType=content_type,
                Body=json.dumps(payload).encode("utf-8"),
            )
            body = await response["Body"].read()
            return json.loads(body)
        except Exception as e:
            logger.error(
                "sagemaker_invoke_failed",
                endpoint=endpoint_name,
                error=str(e),
            )
            raise


async def invoke_wbgt_endpoint(features: list[float]) -> dict:
    """Invoke the WBGT SageMaker endpoint."""
    return await invoke_endpoint(
        settings.SAGEMAKER_WBGT_ENDPOINT,
        {"features": features},
    )


async def invoke_cdhi_endpoint(features: list[float]) -> dict:
    """Invoke the CDHI/CSYR SageMaker endpoint."""
    return await invoke_endpoint(
        settings.SAGEMAKER_CDHI_ENDPOINT,
        {"features": features},
    )
