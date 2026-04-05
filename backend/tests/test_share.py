"""Tests for the share handler validation logic."""
import json
import sys
import os
import pytest
from unittest.mock import patch, MagicMock

# Ensure backend is in the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Mock boto3 entirely so tests work without it installed
mock_table = MagicMock()
mock_dynamodb = MagicMock()
mock_dynamodb.Table.return_value = mock_table

_boto3_mock = MagicMock()
_boto3_mock.resource.return_value = mock_dynamodb

# Create a real-ish ClientError for botocore.exceptions
class _FakeClientError(Exception):
    pass

_botocore_mock = MagicMock()
_botocore_exceptions_mock = MagicMock()
_botocore_exceptions_mock.ClientError = _FakeClientError

sys.modules.setdefault('boto3', _boto3_mock)
sys.modules.setdefault('botocore', _botocore_mock)
sys.modules.setdefault('botocore.exceptions', _botocore_exceptions_mock)

with patch.dict(os.environ, {'SHARE_TABLE_NAME': 'test-shared-results'}):
    from share.handler import _validate_post, _generate_id, _convert_decimals, handler
    # Patch the module-level _table to our mock so put_item/get_item work
    import share.handler as _share_mod
    _share_mod._table = mock_table


class TestValidatePost:
    def test_valid_sip(self):
        body = {"calculator": "sip", "inputs": {"monthlyInvestment": 5000, "annualRate": 12, "years": 10}}
        assert _validate_post(body) is None

    def test_valid_emi(self):
        body = {"calculator": "emi", "inputs": {"principal": 500000, "annualRate": 8.5, "years": 5}}
        assert _validate_post(body) is None

    def test_valid_fd(self):
        body = {"calculator": "fd", "inputs": {"principal": 100000, "annualRate": 7, "years": 3, "compoundingFrequency": 4}}
        assert _validate_post(body) is None

    def test_valid_cagr(self):
        body = {"calculator": "cagr", "inputs": {"beginningValue": 50000, "endingValue": 100000, "years": 5}}
        assert _validate_post(body) is None

    def test_valid_lumpsum(self):
        body = {"calculator": "lumpsum", "inputs": {"principal": 100000, "annualRate": 12, "years": 10}}
        assert _validate_post(body) is None

    def test_invalid_calculator(self):
        body = {"calculator": "xyz", "inputs": {"a": 1}}
        assert "must be one of" in _validate_post(body)

    def test_missing_calculator(self):
        body = {"inputs": {"a": 1}}
        assert "must be one of" in _validate_post(body)

    def test_missing_inputs(self):
        body = {"calculator": "sip"}
        assert "'inputs' must be" in _validate_post(body)

    def test_missing_required_field(self):
        body = {"calculator": "sip", "inputs": {"monthlyInvestment": 5000, "annualRate": 12}}
        assert "Missing input fields" in _validate_post(body)

    def test_extra_field(self):
        body = {"calculator": "sip", "inputs": {"monthlyInvestment": 5000, "annualRate": 12, "years": 10, "extra": 1}}
        assert "Unexpected input fields" in _validate_post(body)

    def test_non_numeric_value(self):
        body = {"calculator": "sip", "inputs": {"monthlyInvestment": "abc", "annualRate": 12, "years": 10}}
        assert "must be a number" in _validate_post(body)

    def test_negative_value(self):
        body = {"calculator": "sip", "inputs": {"monthlyInvestment": -100, "annualRate": 12, "years": 10}}
        assert "must not be negative" in _validate_post(body)

    def test_value_exceeds_max(self):
        body = {"calculator": "sip", "inputs": {"monthlyInvestment": 99999999999, "annualRate": 12, "years": 10}}
        assert "exceeds maximum" in _validate_post(body)

    def test_optional_stepup_rate_accepted(self):
        body = {"calculator": "sip", "inputs": {"monthlyInvestment": 5000, "annualRate": 12, "years": 10, "stepUpRate": 10}}
        assert _validate_post(body) is None

    def test_optional_stepup_rate_zero_accepted(self):
        body = {"calculator": "sip", "inputs": {"monthlyInvestment": 5000, "annualRate": 12, "years": 10, "stepUpRate": 0}}
        assert _validate_post(body) is None

    def test_optional_stepup_rate_rejected_for_emi(self):
        body = {"calculator": "emi", "inputs": {"principal": 500000, "annualRate": 9, "years": 5, "stepUpRate": 10}}
        assert "Unexpected input fields" in _validate_post(body)


class TestGenerateId:
    def test_returns_string(self):
        assert isinstance(_generate_id(), str)

    def test_returns_short_id(self):
        id_ = _generate_id()
        assert 6 <= len(id_) <= 12

    def test_unique_ids(self):
        ids = {_generate_id() for _ in range(100)}
        assert len(ids) == 100


class TestConvertDecimals:
    def test_converts_decimal_to_int(self):
        from decimal import Decimal
        result = _convert_decimals({"val": Decimal("5000")})
        assert result["val"] == 5000
        assert isinstance(result["val"], int)

    def test_converts_decimal_to_float(self):
        from decimal import Decimal
        result = _convert_decimals({"val": Decimal("8.5")})
        assert result["val"] == 8.5
        assert isinstance(result["val"], float)

    def test_nested_dict(self):
        from decimal import Decimal
        result = _convert_decimals({"inputs": {"a": Decimal("100"), "b": Decimal("12.5")}})
        assert result["inputs"]["a"] == 100
        assert result["inputs"]["b"] == 12.5


class TestHandlerPost:
    def test_post_success(self):
        mock_table.put_item.return_value = {}
        event = {
            "requestContext": {"http": {"method": "POST"}},
            "body": json.dumps({"calculator": "sip", "inputs": {"monthlyInvestment": 5000, "annualRate": 12, "years": 10}})
        }
        result = handler(event, None)
        assert result["statusCode"] == 201
        body = json.loads(result["body"])
        assert body["status"] == "success"
        assert "id" in body["data"]

    def test_post_validation_error(self):
        event = {
            "requestContext": {"http": {"method": "POST"}},
            "body": json.dumps({"calculator": "invalid"})
        }
        result = handler(event, None)
        assert result["statusCode"] == 400

    def test_options_returns_204(self):
        event = {"requestContext": {"http": {"method": "OPTIONS"}}}
        result = handler(event, None)
        assert result["statusCode"] == 204


class TestHandlerGet:
    def test_get_success(self):
        from decimal import Decimal
        mock_table.get_item.return_value = {
            "Item": {
                "id": "test123",
                "calculator": "sip",
                "inputs": {"monthlyInvestment": Decimal("5000"), "annualRate": Decimal("12"), "years": Decimal("10")},
                "created_at": "2026-01-01T00:00:00"
            }
        }
        event = {
            "requestContext": {"http": {"method": "GET"}},
            "pathParameters": {"id": "test123"}
        }
        result = handler(event, None)
        assert result["statusCode"] == 200
        body = json.loads(result["body"])
        assert body["data"]["calculator"] == "sip"
        assert body["data"]["inputs"]["monthlyInvestment"] == 5000

    def test_get_not_found(self):
        mock_table.get_item.return_value = {}
        event = {
            "requestContext": {"http": {"method": "GET"}},
            "pathParameters": {"id": "notfound"}
        }
        result = handler(event, None)
        assert result["statusCode"] == 404

    def test_get_invalid_id(self):
        event = {
            "requestContext": {"http": {"method": "GET"}},
            "pathParameters": {"id": ""}
        }
        result = handler(event, None)
        assert result["statusCode"] == 400
