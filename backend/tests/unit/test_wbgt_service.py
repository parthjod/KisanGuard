"""Unit tests: WBGT calculations, PSI ranges, and severity classification."""

from __future__ import annotations

import pytest
from app.ml.model1_wbgt.postprocess import (
    classify_severity,
    compute_psi,
    compute_wbgt,
    get_rest_minutes,
    is_safe_to_work,
)


def test_compute_wbgt_iso_7243():
    # WBGT = 0.7 * Tnw + 0.2 * Tg + 0.1 * Ta
    # Ta=35.0, Tnw=30.0, Tg=40.0
    # 0.7*30 + 0.2*40 + 0.1*35 = 21 + 8 + 3.5 = 32.5
    val = compute_wbgt(ta=35.0, tnw=30.0, tg=40.0)
    assert val == 32.5


def test_classify_severity_boundaries():
    assert classify_severity(29.5) == "LOW"
    assert classify_severity(30.9) == "LOW"
    assert classify_severity(31.0) == "MODERATE"
    assert classify_severity(32.9) == "MODERATE"
    assert classify_severity(33.0) == "HIGH"
    assert classify_severity(36.5) == "HIGH"


def test_compute_psi_bounded():
    psi_light = compute_psi(wbgt=32.0, met=117)
    assert 0.0 <= psi_light <= 10.0

    psi_heavy = compute_psi(wbgt=36.0, met=360)
    assert 0.0 <= psi_heavy <= 10.0
    assert psi_heavy > psi_light


def test_rest_schedules():
    assert get_rest_minutes("HIGH", "HEAVY") == 45
    assert get_rest_minutes("MODERATE", "HEAVY") == 30
    assert get_rest_minutes("LOW", "HEAVY") == 15
    assert get_rest_minutes("LOW", "LIGHT") == 0


def test_is_safe_to_work():
    assert is_safe_to_work("LOW", "LIGHT") is True
    assert is_safe_to_work("HIGH", "HEAVY") is False
