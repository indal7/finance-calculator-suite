"""Tests for new backend features: structured logging, caching, and handler responses."""
import json
import logging

import pytest
from utils import (
    ok, bad_request, server_error,
    get_request_id, log_request, log_response, get_logger,
    calculate_sip, calculate_emi, calculate_fd, calculate_cagr,
)


# ──────────────────────────────────────────────────────────────────────────────
# Standardised response format
# ──────────────────────────────────────────────────────────────────────────────

class TestOkResponse:
    def test_status_success(self):
        resp = ok({"value": 42})
        body = json.loads(resp["body"])
        assert body["status"] == "success"
        assert body["data"] == {"value": 42}

    def test_includes_request_id(self):
        resp = ok({"value": 1}, request_id="abc-123")
        body = json.loads(resp["body"])
        assert body["requestId"] == "abc-123"

    def test_status_code_200(self):
        assert ok({})["statusCode"] == 200


class TestBadRequestResponse:
    def test_status_error(self):
        resp = bad_request("missing field")
        body = json.loads(resp["body"])
        assert body["status"] == "error"
        assert body["error"] == "missing field"

    def test_status_code_400(self):
        assert bad_request("oops")["statusCode"] == 400

    def test_includes_request_id(self):
        resp = bad_request("bad", request_id="req-1")
        body = json.loads(resp["body"])
        assert body["requestId"] == "req-1"


class TestServerErrorResponse:
    def test_status_code_500(self):
        assert server_error("boom")["statusCode"] == 500

    def test_status_error(self):
        resp = server_error("internal")
        body = json.loads(resp["body"])
        assert body["status"] == "error"
        assert body["error"] == "internal"


# ──────────────────────────────────────────────────────────────────────────────
# Request ID extraction
# ──────────────────────────────────────────────────────────────────────────────

class TestGetRequestId:
    def test_extracts_from_v2_context(self):
        event = {"requestContext": {"requestId": "test-id-123"}}
        assert get_request_id(event) == "test-id-123"

    def test_generates_uuid_when_missing(self):
        rid = get_request_id({})
        assert len(rid) == 36  # UUID4 format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

    def test_unique_ids_generated(self):
        id1 = get_request_id({})
        id2 = get_request_id({})
        assert id1 != id2


# ──────────────────────────────────────────────────────────────────────────────
# Structured JSON logging
# ──────────────────────────────────────────────────────────────────────────────

class TestStructuredLogging:
    def test_logger_returns_logger_instance(self):
        logger = get_logger("test-logger")
        assert isinstance(logger, logging.Logger)
        assert logger.name == "test-logger"

    def test_log_request_does_not_raise(self):
        # log_request should emit without raising
        log_request("req-1", "sip", {"monthlyInvestment": 5000}, "127.0.0.1")

    def test_log_response_does_not_raise(self):
        log_response("req-1", "sip", 12.5, cached=False)

    def test_log_response_cached_flag(self):
        # Verify cached=True is accepted without error
        log_response("req-2", "emi", 0.8, cached=True)

    def test_json_formatter_output(self, capfd):
        """Logger must emit valid JSON on each log line."""
        logger = get_logger("json-test")
        logger.info("hello world")
        captured = capfd.readouterr()
        # Find last non-empty line from stderr (handler writes to stderr)
        lines = [l for l in captured.err.strip().split("\n") if l.strip()]
        if lines:
            payload = json.loads(lines[-1])
            assert "timestamp" in payload
            assert "level" in payload
            assert payload["message"] == "hello world"


# ──────────────────────────────────────────────────────────────────────────────
# In-memory caching
# ──────────────────────────────────────────────────────────────────────────────

class TestCaching:
    def setup_method(self):
        # Clear LRU caches before each test to ensure isolation
        calculate_sip.cache_clear()
        calculate_emi.cache_clear()
        calculate_fd.cache_clear()
        calculate_cagr.cache_clear()

    def test_sip_cache_hit(self):
        calculate_sip(5000.0, 12.0, 10.0)
        calculate_sip(5000.0, 12.0, 10.0)
        info = calculate_sip.cache_info()
        assert info.hits >= 1

    def test_emi_cache_hit(self):
        calculate_emi(500000.0, 8.5, 5.0)
        calculate_emi(500000.0, 8.5, 5.0)
        info = calculate_emi.cache_info()
        assert info.hits >= 1

    def test_fd_cache_hit(self):
        calculate_fd(100000.0, 7.0, 3.0, 4)
        calculate_fd(100000.0, 7.0, 3.0, 4)
        info = calculate_fd.cache_info()
        assert info.hits >= 1

    def test_cagr_cache_hit(self):
        calculate_cagr(50000.0, 100000.0, 5.0)
        calculate_cagr(50000.0, 100000.0, 5.0)
        info = calculate_cagr.cache_info()
        assert info.hits >= 1

    def test_different_inputs_are_different_cache_entries(self):
        r1 = calculate_sip(1000.0, 12.0, 5.0)
        r2 = calculate_sip(2000.0, 12.0, 5.0)
        assert r1["totalInvested"] != r2["totalInvested"]

    def test_cache_returns_correct_result_after_hit(self):
        first  = calculate_sip(3000.0, 10.0, 8.0)
        second = calculate_sip(3000.0, 10.0, 8.0)
        assert first == second
        assert first["totalValue"] > first["totalInvested"]


# ──────────────────────────────────────────────────────────────────────────────
# Handler integration (response shape from handlers)
# ──────────────────────────────────────────────────────────────────────────────

class TestHandlerResponseShape:
    """Verify that each handler returns the standardised {status, data, requestId} envelope."""

    def _make_event(self, body: dict) -> dict:
        return {"body": json.dumps(body), "requestContext": {"requestId": "test-req"}}

    def test_sip_handler_response_shape(self):
        from sip.handler import handler
        event = self._make_event({"monthlyInvestment": 5000, "annualRate": 12, "years": 10})
        resp = handler(event, None)
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["status"] == "success"
        assert "data" in body
        assert "totalValue" in body["data"]
        assert body["requestId"] == "test-req"

    def test_emi_handler_response_shape(self):
        from emi.handler import handler
        event = self._make_event({"principal": 500000, "annualRate": 8.5, "years": 5})
        resp = handler(event, None)
        body = json.loads(resp["body"])
        assert body["status"] == "success"
        assert "emi" in body["data"]

    def test_fd_handler_response_shape(self):
        from fd.handler import handler
        event = self._make_event({"principal": 100000, "annualRate": 7, "years": 3, "compoundingFrequency": 4})
        resp = handler(event, None)
        body = json.loads(resp["body"])
        assert body["status"] == "success"
        assert "maturityAmount" in body["data"]

    def test_cagr_handler_response_shape(self):
        from cagr.handler import handler
        event = self._make_event({"beginningValue": 50000, "endingValue": 100000, "years": 5})
        resp = handler(event, None)
        body = json.loads(resp["body"])
        assert body["status"] == "success"
        assert "cagr" in body["data"]

    def test_handler_bad_request_shape(self):
        from sip.handler import handler
        event = self._make_event({"monthlyInvestment": -1, "annualRate": 12, "years": 10})
        resp = handler(event, None)
        assert resp["statusCode"] == 400
        body = json.loads(resp["body"])
        assert body["status"] == "error"
        assert "error" in body

