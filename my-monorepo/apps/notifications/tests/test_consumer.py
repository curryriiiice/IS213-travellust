"""Unit tests for the notifications consumer."""

import json
import logging
from unittest.mock import MagicMock, patch

import pytest

from notifications.consumer import (
    _handle_booking_failure,
    _handle_booking_success,
    _handle_payment_failure,
    _handle_payment_success,
    _on_message,
)


# ---------------------------------------------------------------------------
# Handler unit tests (no broker needed)
# ---------------------------------------------------------------------------

def test_handle_booking_success(caplog):
    with caplog.at_level(logging.INFO, logger="notifications.consumer"):
        _handle_booking_success({"user_id": "u1", "booking_id": "b1"})
    assert "u1" in caplog.text
    assert "b1" in caplog.text


def test_handle_booking_failure(caplog):
    with caplog.at_level(logging.WARNING, logger="notifications.consumer"):
        _handle_booking_failure({"user_id": "u2", "reason": "no availability"})
    assert "u2" in caplog.text
    assert "no availability" in caplog.text


def test_handle_payment_success(caplog):
    with caplog.at_level(logging.INFO, logger="notifications.consumer"):
        _handle_payment_success({"user_id": "u3", "amount": "99.00"})
    assert "u3" in caplog.text
    assert "99.00" in caplog.text


def test_handle_payment_failure(caplog):
    with caplog.at_level(logging.WARNING, logger="notifications.consumer"):
        _handle_payment_failure({"user_id": "u4", "reason": "insufficient funds"})
    assert "u4" in caplog.text
    assert "insufficient funds" in caplog.text


# ---------------------------------------------------------------------------
# _on_message dispatch tests (mocked channel/method)
# ---------------------------------------------------------------------------

def _make_method(routing_key: str):
    method = MagicMock()
    method.routing_key = routing_key
    method.delivery_tag = 1
    return method


@pytest.mark.parametrize("routing_key,payload", [
    ("booking.success", {"user_id": "u1", "booking_id": "b1"}),
    ("booking.failure", {"user_id": "u2", "reason": "sold out"}),
    ("payment.success", {"user_id": "u3", "amount": "50.00"}),
    ("payment.failure", {"user_id": "u4", "reason": "declined"}),
])
def test_on_message_dispatches_correctly(routing_key, payload, caplog):
    channel = MagicMock()
    method = _make_method(routing_key)
    body = json.dumps(payload).encode()

    with caplog.at_level(logging.DEBUG, logger="notifications.consumer"):
        _on_message(channel, method, None, body)

    channel.basic_ack.assert_called_once_with(delivery_tag=1)
    assert payload["user_id"] in caplog.text


def test_on_message_invalid_json(caplog):
    channel = MagicMock()
    method = _make_method("booking.success")

    with caplog.at_level(logging.ERROR, logger="notifications.consumer"):
        _on_message(channel, method, None, b"not-json")

    assert "Invalid JSON" in caplog.text
    channel.basic_ack.assert_called_once_with(delivery_tag=1)


def test_on_message_unknown_routing_key(caplog):
    channel = MagicMock()
    method = _make_method("unknown.event")
    body = json.dumps({"user_id": "u9"}).encode()

    with caplog.at_level(logging.WARNING, logger="notifications.consumer"):
        _on_message(channel, method, None, body)

    assert "No handler" in caplog.text
    channel.basic_ack.assert_called_once_with(delivery_tag=1)


def test_on_message_handler_exception_still_acks(caplog):
    channel = MagicMock()
    method = _make_method("booking.success")
    body = json.dumps({"user_id": "u1", "booking_id": "b1"}).encode()

    with patch("notifications.consumer._handle_booking_success", side_effect=RuntimeError("boom")):
        with caplog.at_level(logging.ERROR, logger="notifications.consumer"):
            _on_message(channel, method, None, body)

    channel.basic_ack.assert_called_once_with(delivery_tag=1)
