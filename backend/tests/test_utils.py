"""Unit tests for utils.py formulas."""
import pytest
from utils import calculate_sip, calculate_emi, calculate_fd, calculate_cagr


class TestSip:
    def test_basic(self):
        r = calculate_sip(5000, 12, 10)
        assert r["totalInvested"] == 600000
        assert r["totalValue"] > r["totalInvested"]
        assert r["estimatedReturns"] == round(r["totalValue"] - r["totalInvested"], 2)

    def test_returns_positive(self):
        r = calculate_sip(500, 8, 3)
        assert r["estimatedReturns"] > 0

    def test_stepup_sip_5_percent(self):
        """Test step-up SIP with 5% annual increase"""
        r = calculate_sip(5000, 12, 10, step_up_rate=5)
        # With step-up, total invested should be more than base SIP
        base_r = calculate_sip(5000, 12, 10, step_up_rate=0)
        assert r["totalInvested"] > base_r["totalInvested"]
        assert r["totalValue"] > base_r["totalValue"]
        # Verify returns are positive
        assert r["estimatedReturns"] > 0

    def test_stepup_sip_10_percent(self):
        """Test step-up SIP with 10% annual increase"""
        r = calculate_sip(5000, 12, 10, step_up_rate=10)
        base_r = calculate_sip(5000, 12, 10, step_up_rate=0)
        # With higher step-up, should be even more than 5% step-up
        five_percent = calculate_sip(5000, 12, 10, step_up_rate=5)
        assert r["totalInvested"] > five_percent["totalInvested"]
        assert r["totalValue"] > five_percent["totalValue"]

    def test_stepup_zero_equals_no_stepup(self):
        """Test that step_up_rate=0 is same as no step-up"""
        r1 = calculate_sip(5000, 12, 10)
        r2 = calculate_sip(5000, 12, 10, step_up_rate=0)
        assert r1["totalInvested"] == r2["totalInvested"]
        assert r1["totalValue"] == r2["totalValue"]
        assert r1["estimatedReturns"] == r2["estimatedReturns"]


class TestEmi:
    def test_basic(self):
        r = calculate_emi(500000, 8.5, 5)
        assert 10000 < r["emi"] < 11000
        assert r["totalInterest"] > 0

    def test_total_payment(self):
        r = calculate_emi(100000, 10, 2)
        assert abs(r["totalPayment"] - r["emi"] * 24) < 1


class TestFd:
    def test_basic(self):
        r = calculate_fd(100000, 7, 3, 4)
        assert r["principal"] == 100000
        assert r["maturityAmount"] > 100000
        assert r["totalInterest"] > 0

    def test_maturity_equals_principal_plus_interest(self):
        r = calculate_fd(50000, 6, 2, 12)
        assert abs(r["maturityAmount"] - (r["principal"] + r["totalInterest"])) < 0.01


class TestCagr:
    def test_basic(self):
        r = calculate_cagr(50000, 100000, 5)
        assert abs(r["cagr"] - 14.8698) < 0.01

    def test_absolute_return(self):
        r = calculate_cagr(50000, 100000, 5)
        assert abs(r["absoluteReturn"] - 100.0) < 0.01

    def test_total_gain(self):
        r = calculate_cagr(50000, 100000, 5)
        assert r["totalGain"] == 50000
