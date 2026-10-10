"""Lambda: Amazon A2I Callback Handler — Processes human reviewer decisions."""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from app.services.trust_service import trust_service

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """
    Triggered when Amazon A2I human review loop completes via SNS topic.
    Extracts human answers, computes majority vote, updates audit trail,
    and dispatches alerts if approved or corrected.
    """
    logger.info("A2I callback lambda invoked")

    records = event.get("Records", [])
    if not records:
        # Direct payload invocation (for testing)
        records = [{"Sns": {"Message": json.dumps(event)}}]

    results: list[dict[str, Any]] = []

    for record in records:
        message_str = record.get("Sns", {}).get("Message", "{}")
        try:
            msg = json.loads(message_str)
        except Exception:
            msg = record

        human_loop_name = msg.get("humanLoopName", msg.get("task_id", "a2i_sample"))
        answers = msg.get("humanAnswers", [])

        # Default fallback decision
        decision = msg.get("decision", "APPROVED")
        reviewer_id = msg.get("reviewer_id", "rev_default")
        corrected_value = msg.get("corrected_value")
        notes = msg.get("notes")

        # Parse majority vote if structured answers present
        if answers:
            votes: dict[str, int] = {}
            for ans in answers:
                content = ans.get("answerContent", {})
                vote = content.get("decision", "APPROVED")
                votes[vote] = votes.get(vote, 0) + 1
                reviewer_id = ans.get("reviewerId", reviewer_id)
                if content.get("corrected_value"):
                    corrected_value = content.get("corrected_value")
                if content.get("notes"):
                    notes = content.get("notes")

            decision = max(votes.keys(), key=lambda k: votes[k])

        # Execute async callback
        res = asyncio.run(
            trust_service.handle_a2i_callback(
                task_id=human_loop_name,
                decision=decision,
                reviewer_id=reviewer_id,
                corrected_value=corrected_value,
                reviewer_notes=notes,
            )
        )
        results.append(res)

    return {"status": "SUCCESS", "processed": len(results), "results": results}
