"""Unit tests: Trust layer invariant checks and A2I flagging rules."""

from __future__ import annotations

import pytest
from app.services.trust_service import trust_service


def test_flag_low_confidence():
    flagged, reasons = trust_service.should_flag(
        confidence=0.84,
        missing_pct=0.05,
        wbgt=32.0,
        cdhi=40.0,
    )
    assert flagged is True
    assert any("low_confidence" in r for r in reasons)


def test_flag_high_missing_data():
    flagged, reasons = trust_service.should_flag(
        confidence=0.92,
        missing_pct=0.15,
        wbgt=32.0,
        cdhi=40.0,
    )
    assert flagged is True
    assert any("high_missing_data" in r for r in reasons)


def test_flag_wbgt_outlier():
    flagged, reasons = trust_service.should_flag(
        confidence=0.92,
        missing_pct=0.02,
        wbgt=52.0,
        cdhi=40.0,
    )
    assert flagged is True
    assert any("wbgt_outlier" in r for r in reasons)


def test_flag_conflicting_signals():
    flagged, reasons = trust_service.should_flag(
        confidence=0.90,
        missing_pct=0.02,
        wbgt=28.0,
        cdhi=65.0,
    )
    assert flagged is True
    assert any("conflicting_signals" in r for r in reasons)


def test_clean_prediction_no_flag():
    flagged, reasons = trust_service.should_flag(
        confidence=0.93,
        missing_pct=0.03,
        wbgt=33.0,
        cdhi=70.0,
    )
    assert flagged is False
    assert len(reasons) == 0
