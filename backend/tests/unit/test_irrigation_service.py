"""Unit tests: Model 3 PPO selection logic, state builder, and MAD framework overrides."""

from __future__ import annotations

import pytest
from app.ml.model3_irrigation.inference import decode_action, select_ppo_model
from app.ml.model3_irrigation.mad_framework import check_mad_critical, check_mad_override


def test_select_ppo_model_variants():
    manifest = {
        "compound": "model3_ppo_compound.zip",
        "drought": "model3_ppo_drought.zip",
        "heatwave": "model3_ppo_heatwave.zip",
        "mixed": "model3_ppo_mixed.zip",
        "default": "model3_ppo_final.zip",
    }

    # Compound state: heat > 35 and spi_3 < -1.0
    res_compound = select_ppo_model(cdhi_score=75, spi_3=-1.5, tmax_c=38.0, manifest=manifest)
    assert res_compound == "compound"

    # Drought only: spi_3 < -1.0 and tmax <= 35
    res_drought = select_ppo_model(cdhi_score=50, spi_3=-1.5, tmax_c=32.0, manifest=manifest)
    assert res_drought == "drought"

    # Heatwave only: tmax > 35 and spi_3 >= -1.0
    res_heat = select_ppo_model(cdhi_score=50, spi_3=-0.2, tmax_c=39.0, manifest=manifest)
    assert res_heat == "heatwave"

    # Mixed conditions: cdhi > 40
    res_mixed = select_ppo_model(cdhi_score=45, spi_3=0.0, tmax_c=30.0, manifest=manifest)
    assert res_mixed == "mixed"

    # Normal / default conditions
    res_default = select_ppo_model(cdhi_score=20, spi_3=0.5, tmax_c=28.0, manifest=manifest)
    assert res_default == "default"


def test_mad_critical_thresholds():
    # Wheat threshold: 35%
    assert check_mad_critical(30.0, "wheat") is True
    assert check_mad_critical(40.0, "wheat") is False

    # Rice threshold: 55%
    assert check_mad_critical(50.0, "rice") is True
    assert check_mad_critical(60.0, "rice") is False


def test_mad_safety_override():
    # If soil moisture is critical and PPO says WAIT -> override to IRRIGATE
    action, overridden = check_mad_override(soil_moisture_pct=28.0, crop="wheat", ppo_action="WAIT")
    assert action == "IRRIGATE"
    assert overridden is True

    # If soil moisture is adequate, respect PPO decision
    action, overridden = check_mad_override(soil_moisture_pct=42.0, crop="wheat", ppo_action="WAIT")
    assert action == "WAIT"
    assert overridden is False


def test_decode_action_conversion():
    # action 0 -> WAIT, 0 litres
    act_str, litres = decode_action(0, 0.0, plot_area_ha=1.0)
    assert act_str == "WAIT"
    assert litres == 0

    # action > 0 -> IRRIGATE with positive litres
    act_str, litres = decode_action(2, 20.0, plot_area_ha=1.0)
    assert act_str == "IRRIGATE"
    assert litres > 0
