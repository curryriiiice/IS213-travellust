from unittest.mock import Mock, patch

from book_attractions.publisher import publish_booking_event


@patch("book_attractions.publisher.pika")
def test_publish_booking_event_publishes_persistent_json(mock_pika):
    connection = Mock()
    channel = Mock()
    connection.channel.return_value = channel
    mock_pika.BlockingConnection.return_value = connection

    payload = {"service": "book-attractions", "status": "success"}

    result = publish_booking_event("booking.success", payload)

    assert result is True
    mock_pika.ConnectionParameters.assert_called_once_with(
        host="rabbitmq",
        port=5672,
    )
    channel.exchange_declare.assert_called_once_with(
        exchange="travellust_notifications",
        exchange_type="topic",
        durable=True,
    )
    channel.basic_publish.assert_called_once()
    call = channel.basic_publish.call_args.kwargs
    assert call["exchange"] == "travellust_notifications"
    assert call["routing_key"] == "booking.success"
    assert call["body"] == '{"service": "book-attractions", "status": "success"}'
    mock_pika.BasicProperties.assert_called_once_with(
        content_type="application/json",
        delivery_mode=2,
    )
    connection.close.assert_called_once()


@patch("book_attractions.publisher.pika")
def test_publish_booking_event_returns_false_when_connection_fails(mock_pika):
    mock_pika.BlockingConnection.side_effect = RuntimeError("boom")

    result = publish_booking_event("booking.failure", {"status": "failure"})

    assert result is False
