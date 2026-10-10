"""Script: Setup local DynamoDB tables and GSIs in LocalStack or AWS."""

from __future__ import annotations

import logging
import sys
import boto3

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("setup_local_db")


def get_dynamo_client():
    endpoint = "http://localhost:4566"
    return boto3.client("dynamodb", region_name="ap-south-1", endpoint_url=endpoint)


def create_tables(client):
    tables = [
        {
            "TableName": "kisanguard-users",
            "KeySchema": [
                {"AttributeName": "user_id", "KeyType": "HASH"},
                {"AttributeName": "SK", "KeyType": "RANGE"},
            ],
            "AttributeDefinitions": [
                {"AttributeName": "user_id", "AttributeType": "S"},
                {"AttributeName": "SK", "AttributeType": "S"},
                {"AttributeName": "phone_hash", "AttributeType": "S"},
                {"AttributeName": "ward_id", "AttributeType": "S"},
                {"AttributeName": "role", "AttributeType": "S"},
                {"AttributeName": "org_id", "AttributeType": "S"},
            ],
            "GlobalSecondaryIndexes": [
                {
                    "IndexName": "phone-index",
                    "KeySchema": [{"AttributeName": "phone_hash", "KeyType": "HASH"}],
                    "Projection": {"ProjectionType": "ALL"},
                },
                {
                    "IndexName": "ward-index",
                    "KeySchema": [
                        {"AttributeName": "ward_id", "KeyType": "HASH"},
                        {"AttributeName": "role", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                },
                {
                    "IndexName": "org-index",
                    "KeySchema": [
                        {"AttributeName": "org_id", "KeyType": "HASH"},
                        {"AttributeName": "user_id", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                },
            ],
            "BillingMode": "PAY_PER_REQUEST",
        },
        {
            "TableName": "kisanguard-features",
            "KeySchema": [
                {"AttributeName": "entity_id", "KeyType": "HASH"},
                {"AttributeName": "date", "KeyType": "RANGE"},
            ],
            "AttributeDefinitions": [
                {"AttributeName": "entity_id", "AttributeType": "S"},
                {"AttributeName": "date", "AttributeType": "S"},
            ],
            "BillingMode": "PAY_PER_REQUEST",
        },
        {
            "TableName": "kisanguard-audit",
            "KeySchema": [
                {"AttributeName": "prediction_id", "KeyType": "HASH"},
                {"AttributeName": "event_type", "KeyType": "RANGE"},
            ],
            "AttributeDefinitions": [
                {"AttributeName": "prediction_id", "AttributeType": "S"},
                {"AttributeName": "event_type", "AttributeType": "S"},
                {"AttributeName": "user_id", "AttributeType": "S"},
                {"AttributeName": "timestamp", "AttributeType": "S"},
                {"AttributeName": "org_id", "AttributeType": "S"},
                {"AttributeName": "date", "AttributeType": "S"},
                {"AttributeName": "a2i_task_id", "AttributeType": "S"},
            ],
            "GlobalSecondaryIndexes": [
                {
                    "IndexName": "user_id-timestamp-index",
                    "KeySchema": [
                        {"AttributeName": "user_id", "KeyType": "HASH"},
                        {"AttributeName": "timestamp", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                },
                {
                    "IndexName": "org_id-date-index",
                    "KeySchema": [
                        {"AttributeName": "org_id", "KeyType": "HASH"},
                        {"AttributeName": "date", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                },
                {
                    "IndexName": "a2i_task_id-index",
                    "KeySchema": [{"AttributeName": "a2i_task_id", "KeyType": "HASH"}],
                    "Projection": {"ProjectionType": "ALL"},
                },
            ],
            "BillingMode": "PAY_PER_REQUEST",
        },
        {
            "TableName": "kisanguard-alerts",
            "KeySchema": [
                {"AttributeName": "alert_id", "KeyType": "HASH"},
                {"AttributeName": "user_id", "KeyType": "RANGE"},
            ],
            "AttributeDefinitions": [
                {"AttributeName": "alert_id", "AttributeType": "S"},
                {"AttributeName": "user_id", "AttributeType": "S"},
                {"AttributeName": "created_at", "AttributeType": "S"},
                {"AttributeName": "org_id", "AttributeType": "S"},
            ],
            "GlobalSecondaryIndexes": [
                {
                    "IndexName": "user_id-timestamp-index",
                    "KeySchema": [
                        {"AttributeName": "user_id", "KeyType": "HASH"},
                        {"AttributeName": "created_at", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                },
                {
                    "IndexName": "org_id-date-index",
                    "KeySchema": [
                        {"AttributeName": "org_id", "KeyType": "HASH"},
                        {"AttributeName": "created_at", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                },
            ],
            "BillingMode": "PAY_PER_REQUEST",
        },
        {
            "TableName": "kisanguard-pipeline-status",
            "KeySchema": [
                {"AttributeName": "date", "KeyType": "HASH"},
                {"AttributeName": "SK", "KeyType": "RANGE"},
            ],
            "AttributeDefinitions": [
                {"AttributeName": "date", "AttributeType": "S"},
                {"AttributeName": "SK", "AttributeType": "S"},
            ],
            "BillingMode": "PAY_PER_REQUEST",
        },
        {
            "TableName": "kisanguard-crop-calendars",
            "KeySchema": [
                {"AttributeName": "state", "KeyType": "HASH"},
                {"AttributeName": "crop#month", "KeyType": "RANGE"},
            ],
            "AttributeDefinitions": [
                {"AttributeName": "state", "AttributeType": "S"},
                {"AttributeName": "crop#month", "AttributeType": "S"},
            ],
            "BillingMode": "PAY_PER_REQUEST",
        },
    ]

    for tbl in tables:
        name = tbl["TableName"]
        try:
            client.create_table(**tbl)
            logger.info(f"Table created: {name}")
        except client.exceptions.ResourceInUseException:
            logger.info(f"Table already exists: {name}")
        except Exception as e:
            logger.warning(f"Could not create table {name}: {e}")


if __name__ == "__main__":
    try:
        c = get_dynamo_client()
        create_tables(c)
        logger.info("Local database initialization completed.")
    except Exception as exc:
        logger.error(f"Error initializing database: {exc}")
        sys.exit(0)
