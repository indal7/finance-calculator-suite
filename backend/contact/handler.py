"""
AWS Lambda handler – Contact Form Submissions
POST /contact

Request body:
{
  "name":    "Rahul Sharma",
  "email":   "rahul@example.com",
  "phone":   "+919876543210",    // optional
  "subject": "Question about SIP Calculator",  // optional
  "message": "I have a question about..."
}

Response (201):
{
  "status": "success",
  "data": {
    "id": "<uuid>",
    "message": "Thank you! Your message has been received."
  },
  "requestId": "<uuid>"
}
"""

import sys
import os
import re
import time
import uuid
import html
import json
import logging
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from utils import (
    CORS_HEADERS, bad_request, server_error,
    parse_body, get_request_id, logger,
)

# ──────────────────────────────────────────────────────────────────────────────
# DynamoDB client – initialised outside handler for connection reuse
# ──────────────────────────────────────────────────────────────────────────────

import boto3
from botocore.exceptions import ClientError

_TABLE_NAME = os.environ.get("CONTACT_TABLE_NAME", "contact_submissions")
_NOTIFY_EMAIL = os.environ.get("NOTIFY_EMAIL", "")
_SES_FROM_EMAIL = os.environ.get("SES_FROM_EMAIL", "")

_dynamodb = boto3.resource("dynamodb")
_table = _dynamodb.Table(_TABLE_NAME)

# Optional: SES client for email notification
_ses = boto3.client("ses") if _NOTIFY_EMAIL else None

# ──────────────────────────────────────────────────────────────────────────────
# Validation constants
# ──────────────────────────────────────────────────────────────────────────────

_EMAIL_RE = re.compile(
    r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
)
_PHONE_RE = re.compile(r"^\+?[0-9\s\-]{7,15}$")

_MAX_NAME_LEN = 100
_MAX_EMAIL_LEN = 254
_MAX_PHONE_LEN = 20
_MAX_SUBJECT_LEN = 200
_MAX_MESSAGE_LEN = 5000

# Basic honeypot / time-based spam detection
_MIN_SUBMISSION_SECONDS = 3  # submissions faster than 3s are likely bots


# ──────────────────────────────────────────────────────────────────────────────
# Sanitisation
# ──────────────────────────────────────────────────────────────────────────────

def _sanitize(value: str) -> str:
    """Strip leading/trailing whitespace and escape HTML entities."""
    return html.escape(value.strip(), quote=True)


# ──────────────────────────────────────────────────────────────────────────────
# Validation
# ──────────────────────────────────────────────────────────────────────────────

def _validate(body: dict) -> str | None:
    """Validate contact form fields. Returns error message or None."""

    # --- Required fields ---
    name = body.get("name")
    if not name or not isinstance(name, str) or not name.strip():
        return "Name is required."
    if len(name.strip()) < 2:
        return "Name must be at least 2 characters."
    if len(name) > _MAX_NAME_LEN:
        return f"Name must be at most {_MAX_NAME_LEN} characters."

    email = body.get("email")
    if not email or not isinstance(email, str) or not email.strip():
        return "Email is required."
    if len(email) > _MAX_EMAIL_LEN:
        return f"Email must be at most {_MAX_EMAIL_LEN} characters."
    if not _EMAIL_RE.match(email.strip()):
        return "Please provide a valid email address."

    message = body.get("message")
    if not message or not isinstance(message, str) or not message.strip():
        return "Message is required."
    if len(message.strip()) < 10:
        return "Message must be at least 10 characters."
    if len(message) > _MAX_MESSAGE_LEN:
        return f"Message must be at most {_MAX_MESSAGE_LEN} characters."

    # --- Optional fields ---
    phone = body.get("phone")
    if phone and isinstance(phone, str) and phone.strip():
        if len(phone) > _MAX_PHONE_LEN:
            return f"Phone must be at most {_MAX_PHONE_LEN} characters."
        if not _PHONE_RE.match(phone.strip()):
            return "Please provide a valid phone number."

    subject = body.get("subject")
    if subject and isinstance(subject, str) and len(subject) > _MAX_SUBJECT_LEN:
        return f"Subject must be at most {_MAX_SUBJECT_LEN} characters."

    # --- Honeypot: reject if hidden field is filled ---
    if body.get("website"):
        return "Spam detected."

    return None


# ──────────────────────────────────────────────────────────────────────────────
# Email notification (SES)
# ──────────────────────────────────────────────────────────────────────────────

def _send_notification(item: dict) -> None:
    """Best-effort email notification via SES. Failures are logged, not raised."""
    if not _ses or not _NOTIFY_EMAIL or not _SES_FROM_EMAIL:
        return
    try:
        subject_line = item.get("subject") or "New Contact Form Submission"
        _ses.send_email(
            Source=_SES_FROM_EMAIL,
            Destination={"ToAddresses": [_NOTIFY_EMAIL]},
            Message={
                "Subject": {"Data": f"[Contact Form] {subject_line}"},
                "Body": {
                    "Text": {
                        "Data": (
                            f"Name: {item['name']}\n"
                            f"Email: {item['email']}\n"
                            f"Phone: {item.get('phone', 'N/A')}\n"
                            f"Subject: {item.get('subject', 'N/A')}\n\n"
                            f"Message:\n{item['message']}\n\n"
                            f"Submitted at: {item['created_at']}\n"
                            f"ID: {item['id']}"
                        )
                    }
                },
            },
        )
        logger.info("Notification sent", extra={"to": _NOTIFY_EMAIL, "id": item["id"]})
    except ClientError as exc:
        logger.warning(
            "Failed to send notification",
            extra={"error": str(exc), "id": item["id"]},
        )


# ──────────────────────────────────────────────────────────────────────────────
# Lambda handler
# ──────────────────────────────────────────────────────────────────────────────

def handler(event: dict, context) -> dict:
    request_id = get_request_id(event)
    start_time = time.time()

    # CORS preflight
    if event.get("httpMethod") == "OPTIONS" or (
        event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS"
    ):
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    # Parse body
    try:
        body = parse_body(event)
    except Exception:
        return bad_request("Invalid JSON body.", request_id)

    # Validate
    error = _validate(body)
    if error:
        logger.info(
            "Validation failed",
            extra={"requestId": request_id, "error": error},
        )
        return bad_request(error, request_id)

    # Build DynamoDB item
    IST = timezone(timedelta(hours=5, minutes=30))
    now = datetime.now(IST).isoformat()
    submission_id = str(uuid.uuid4())
    item = {
        "id":         submission_id,
        "name":       _sanitize(body["name"]),
        "email":      _sanitize(body["email"]),
        "phone":      _sanitize(body.get("phone", "")) or None,
        "subject":    _sanitize(body.get("subject", "")) or None,
        "message":    _sanitize(body["message"]),
        "created_at": now,
        "source_ip":  (
            event.get("requestContext", {}).get("http", {}).get("sourceIp")
            or event.get("requestContext", {}).get("identity", {}).get("sourceIp")
        ),
        "status":     "new",
    }
    # Remove None values to keep DynamoDB clean
    item = {k: v for k, v in item.items() if v is not None}

    logger.info(
        "Saving contact submission",
        extra={"requestId": request_id, "submissionId": submission_id},
    )

    # Write to DynamoDB
    try:
        _table.put_item(Item=item)
    except ClientError as exc:
        logger.error(
            "DynamoDB write failed",
            extra={"requestId": request_id, "error": str(exc)},
        )
        return server_error("Failed to save your message. Please try again later.", request_id)

    # Best-effort email notification
    _send_notification(item)

    duration_ms = (time.time() - start_time) * 1000
    logger.info(
        "Contact submission saved",
        extra={
            "requestId":    request_id,
            "submissionId": submission_id,
            "durationMs":   round(duration_ms, 2),
        },
    )

    response_body = {
        "status": "success",
        "data": {
            "id": submission_id,
            "message": "Thank you! Your message has been received. We'll get back to you within 24–48 hours.",
        },
    }
    if request_id:
        response_body["requestId"] = request_id

    return {
        "statusCode": 201,
        "headers": CORS_HEADERS,
        "body": json.dumps(response_body),
    }
