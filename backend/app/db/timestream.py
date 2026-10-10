"""Amazon Timestream write for WBGT time-series data."""

from __future__ import annotations

import logging
import time
from typing import Any

import aioboto3

from app.config import settings

logger = logging.getLogger(__name__)

_session = aioboto3.Session()


def _endpoint_url() -> dict:
    if settings.LOCALSTACK_ENDPOINT:
        return {"endpoint_url": settings.LOCALSTACK_ENDPOINT}
    return {}


async def write_wbgt_records(ward_id: str, records: list[dict]) -> None:
    """
    Write WBGT hourly forecast records to Timestream.
    Each record: { hour_utc, wbgt_c, ta_c, tnw_c, tg_c, humidity_pct, psi, severity }
    """
    try:
        async with _session.client(
            "timestream-write",
            region_name=settings.AWS_REGION,
            **_endpoint_url(),
        ) as ts:
            timestream_records = []
            for rec in records:
                ts_record = {
                    "Dimensions": [
                        {"Name": "ward_id", "Value": ward_id},
                        {"Name": "severity", "Value": rec.get("severity", "UNKNOWN")},
                    ],
                    "MeasureName": "wbgt_c",
                    "MeasureValue": str(rec.get("wbgt_c", 0)),
                    "MeasureValueType": "DOUBLE",
                    "Time": str(int(time.time() * 1000)),
                    "TimeUnit": "MILLISECONDS",
                }
                timestream_records.append(ts_record)

            # Timestream accepts up to 100 records per write
            for i in range(0, len(timestream_records), 100):
                batch = timestream_records[i:i + 100]
                await ts.write_records(
                    DatabaseName=settings.TIMESTREAM_DB,
                    TableName=settings.TIMESTREAM_TABLE,
                    Records=batch,
                )
            logger.info("timestream_write_complete", ward_id=ward_id, record_count=len(records))
    except Exception as e:
        # Timestream write failure should not block the main pipeline
        logger.error("timestream_write_failed", ward_id=ward_id, error=str(e))
