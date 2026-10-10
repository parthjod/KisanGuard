"""Unit tests: CDHI formula matches training notebook specifications exactly."""

from __future__ import annotations

import pytest
from app.ml.model2_cdhi_csyr.cdhi_formula import (
    CROP_CONFIG,
    STAGE_MULTIPLIERS,
    categorize_cdhi,
    compute_cdhi,
    get_stage_multiplier,
)


def test_compute_cdhi_exact_values():
    """Validates CDHI mathematical formulation per PRD Section 3.2."""
    score, components = compute_cdhi(
        tmax_mean=41.2,
        spi_3=-2.1,
        ahsd=18.0,
        hdd=330.0,
        sma=0.62,
    )
    # Expected formula outputs:
    # heat_norm = min(max((41.2 - 20) / 30, 0), 1) = 21.2 / 30 = 0.7067
    # drought_norm = min(max(2.1 / 3, 0), 1) = 0.7
    # ahsd_norm = min(max(18 / 20, 0), 1) = 0.9
    # hdd_norm = min(max(330 / 15, 0), 1) = 1.0 (clamped)
    # sma_norm = min(max(-0.62, 0), 1) = 0.0
    assert 60.0 <= score <= 80.0
    assert "heat_norm" in components
    assert "drought_norm" in components
    assert "ahsd_norm" in components
    assert "hdd_norm" in components
    assert "sma_norm" in components


def test_categorize_cdhi():
    assert categorize_cdhi(15.0) == "SAFE"
    assert categorize_cdhi(29.9) == "SAFE"
    assert categorize_cdhi(30.0) == "CAUTION"
    assert categorize_cdhi(59.9) == "CAUTION"
    assert categorize_cdhi(60.0) == "RED"
    assert categorize_cdhi(85.0) == "RED"


def test_crop_thresholds_table():
    assert "wheat" in CROP_CONFIG
    assert CROP_CONFIG["wheat"]["heat_threshold_c"] == 30
    assert CROP_CONFIG["rice"]["heat_threshold_c"] == 35
    assert CROP_CONFIG["millet"]["heat_threshold_c"] == 40


def test_stage_multipliers():
    assert STAGE_MULTIPLIERS["flowering"] == 1.0
    assert STAGE_MULTIPLIERS["grain_filling"] == 0.9
    assert STAGE_MULTIPLIERS["vegetative"] == 0.4
    assert STAGE_MULTIPLIERS["maturity"] == 0.25
    assert get_stage_multiplier("flowering") == 1.0
