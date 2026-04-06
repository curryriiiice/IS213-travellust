from book_attractions.app import create_app


class EventRecorder:
    def __init__(self, should_succeed=True):
        self.should_succeed = should_succeed
        self.events = []

    def __call__(self, routing_key, payload):
        self.events.append((routing_key, payload))
        return self.should_succeed


class FakeTripsClient:
    def get_trip(self, trip_id):
        if trip_id != "22222222-2222-2222-2222-222222222222":
            return None
        return {"trip_id": trip_id, "member_ids": [1, 2, 3]}


class FakeAttractionsClient:
    def get_attraction(self, attraction_id):
        if attraction_id == "missing":
            return None
        return {
            "attraction_id": attraction_id,
            "trip_id": "22222222-2222-2222-2222-222222222222",
            "name": "Gardens by the Bay",
            "cost": "32.50",
        }


class FakeBookedTicketsClient:
    def create_booked_ticket(self, payload):
        return {
            "booked_ticket_id": payload["user_id"],
            "user_id": payload["user_id"],
            "f_h_a_id": payload["f_h_a_id"],
            "cost": payload.get("cost"),
            "paid_by": payload["paid_by"],
            "cancelled": payload.get("cancelled", False),
        }


class MismatchedBookedTicketsClient:
    def create_booked_ticket(self, payload):
        return {
            "booked_ticket_id": payload["user_id"],
            "user_id": payload["user_id"],
            "f_h_a_id": "wrong-attraction-id",
            "cost": payload.get("cost"),
            "paid_by": payload["paid_by"],
            "cancelled": payload.get("cancelled", False),
        }


def test_healthcheck():
    publisher = EventRecorder()
    app = create_app(
        attractions_client=FakeAttractionsClient(),
        booked_tickets_client=FakeBookedTicketsClient(),
        trips_client=FakeTripsClient(),
        random_value_fn=lambda: 0.9,
        publish_event_fn=publisher,
    )
    client = app.test_client()

    response = client.get("/health")

    assert response.status_code == 200
    assert response.get_json() == {"service": "book-attractions", "status": "ok"}


def test_book_attraction_success():
    publisher = EventRecorder()
    app = create_app(
        attractions_client=FakeAttractionsClient(),
        booked_tickets_client=FakeBookedTicketsClient(),
        trips_client=FakeTripsClient(),
        random_value_fn=lambda: 0.9,
        publish_event_fn=publisher,
    )
    client = app.test_client()

    response = client.post(
        "/api/book-attractions",
        json={
            "user_id": [1, 2],
            "trip_id": "22222222-2222-2222-2222-222222222222",
            "attraction_id": "11111111-1111-1111-1111-111111111111",
            "cost": "99.99",
            "paid_by": 1,
        },
    )

    assert response.status_code == 201
    data = response.get_json()["data"]
    assert len(data["booked_tickets"]) == 2
    assert data["booked_tickets"][0]["f_h_a_id"] == "11111111-1111-1111-1111-111111111111"
    assert data["resolved_trip_id"] == "22222222-2222-2222-2222-222222222222"
    assert data["booking_confirmation"] == "Booking successful."
    assert data["booked_tickets"][0]["booked_ticket_id"] == 1
    assert publisher.events == [
        (
            "booking.success",
            {
                "service": "book-attractions",
                "trip_id": "22222222-2222-2222-2222-222222222222",
                "attraction_id": "11111111-1111-1111-1111-111111111111",
                "attraction_name": "Gardens by the Bay",
                "paid_by": 1,
                "user_id": [1, 2],
                "booking_id": [1, 2],
                "cost": "99.99",
                "status": "success",
            },
        )
    ]


def test_simulated_booking_failure():
    publisher = EventRecorder()
    app = create_app(
        attractions_client=FakeAttractionsClient(),
        booked_tickets_client=FakeBookedTicketsClient(),
        trips_client=FakeTripsClient(),
        random_value_fn=lambda: 0.0,
        publish_event_fn=publisher,
    )
    client = app.test_client()

    response = client.post(
        "/api/book-attractions",
        json={
            "user_id": [1, 2],
            "trip_id": "22222222-2222-2222-2222-222222222222",
            "attraction_id": "11111111-1111-1111-1111-111111111111",
            "cost": "99.99",
            "paid_by": 1,
        },
    )

    assert response.status_code == 503
    assert response.get_json()["data"]["f_h_a_id"] == "11111111-1111-1111-1111-111111111111"
    assert "Simulated booking failure" in response.get_json()["error"]
    assert publisher.events == [
        (
            "booking.failure",
            {
                "service": "book-attractions",
                "trip_id": "22222222-2222-2222-2222-222222222222",
                "attraction_id": "11111111-1111-1111-1111-111111111111",
                "attraction_name": "Gardens by the Bay",
                "paid_by": 1,
                "user_id": [1, 2],
                "reason": "Simulated booking failure. Please try again.",
                "status": "failure",
            },
        )
    ]


def test_fails_if_booked_ticket_response_does_not_match_saved_attraction():
    publisher = EventRecorder()
    app = create_app(
        attractions_client=FakeAttractionsClient(),
        booked_tickets_client=MismatchedBookedTicketsClient(),
        trips_client=FakeTripsClient(),
        random_value_fn=lambda: 0.9,
        publish_event_fn=publisher,
    )
    client = app.test_client()

    response = client.post(
        "/api/book-attractions",
        json={
            "user_id": [1],
            "trip_id": "22222222-2222-2222-2222-222222222222",
            "attraction_id": "11111111-1111-1111-1111-111111111111",
            "cost": "99.99",
            "paid_by": 1,
        },
    )

    assert response.status_code == 502
    assert "wrong attraction" in response.get_json()["error"]
    assert publisher.events == [
        (
            "booking.failure",
            {
                "service": "book-attractions",
                "trip_id": "22222222-2222-2222-2222-222222222222",
                "attraction_id": "11111111-1111-1111-1111-111111111111",
                "attraction_name": "Gardens by the Bay",
                "paid_by": 1,
                "user_id": [1],
                "reason": "booked_tickets service returned a record for the wrong attraction.",
                "status": "failure",
            },
        )
    ]


def test_requires_attraction_id():
    publisher = EventRecorder()
    app = create_app(
        attractions_client=FakeAttractionsClient(),
        booked_tickets_client=FakeBookedTicketsClient(),
        trips_client=FakeTripsClient(),
        random_value_fn=lambda: 0.9,
        publish_event_fn=publisher,
    )
    client = app.test_client()

    response = client.post(
        "/api/book-attractions",
        json={"user_id": [1], "trip_id": "trip-1", "paid_by": 1},
    )

    assert response.status_code == 400
    assert "attraction_id" in response.get_json()["error"]
    assert publisher.events == []


def test_requires_trip_id():
    publisher = EventRecorder()
    app = create_app(
        attractions_client=FakeAttractionsClient(),
        booked_tickets_client=FakeBookedTicketsClient(),
        trips_client=FakeTripsClient(),
        random_value_fn=lambda: 0.9,
        publish_event_fn=publisher,
    )
    client = app.test_client()

    response = client.post(
        "/api/book-attractions",
        json={
            "user_id": [1],
            "attraction_id": "11111111-1111-1111-1111-111111111111",
            "paid_by": 1,
        },
    )

    assert response.status_code == 400
    assert "trip_id" in response.get_json()["error"]
    assert publisher.events == []


def test_rejects_user_not_in_trip():
    publisher = EventRecorder()
    app = create_app(
        attractions_client=FakeAttractionsClient(),
        booked_tickets_client=FakeBookedTicketsClient(),
        trips_client=FakeTripsClient(),
        random_value_fn=lambda: 0.9,
        publish_event_fn=publisher,
    )
    client = app.test_client()

    response = client.post(
        "/api/book-attractions",
        json={
            "user_id": [1, 999],
            "trip_id": "22222222-2222-2222-2222-222222222222",
            "attraction_id": "11111111-1111-1111-1111-111111111111",
            "paid_by": 1,
        },
    )

    assert response.status_code == 400
    assert "do not belong to trip" in response.get_json()["error"]
    assert publisher.events == []


def test_requires_user_id_list():
    publisher = EventRecorder()
    app = create_app(
        attractions_client=FakeAttractionsClient(),
        booked_tickets_client=FakeBookedTicketsClient(),
        trips_client=FakeTripsClient(),
        random_value_fn=lambda: 0.9,
        publish_event_fn=publisher,
    )
    client = app.test_client()

    response = client.post(
        "/api/book-attractions",
        json={
            "user_id": 1,
            "trip_id": "22222222-2222-2222-2222-222222222222",
            "attraction_id": "11111111-1111-1111-1111-111111111111",
            "paid_by": 1,
        },
    )

    assert response.status_code == 400
    assert "non-empty list" in response.get_json()["error"]
    assert publisher.events == []


def test_attraction_not_found_does_not_publish_event():
    publisher = EventRecorder()
    app = create_app(
        attractions_client=FakeAttractionsClient(),
        booked_tickets_client=FakeBookedTicketsClient(),
        trips_client=FakeTripsClient(),
        random_value_fn=lambda: 0.9,
        publish_event_fn=publisher,
    )
    client = app.test_client()

    response = client.post(
        "/api/book-attractions",
        json={
            "user_id": [1],
            "trip_id": "22222222-2222-2222-2222-222222222222",
            "attraction_id": "missing",
            "paid_by": 1,
        },
    )

    assert response.status_code == 404
    assert publisher.events == []


def test_success_response_is_unchanged_when_publish_fails():
    publisher = EventRecorder(should_succeed=False)
    app = create_app(
        attractions_client=FakeAttractionsClient(),
        booked_tickets_client=FakeBookedTicketsClient(),
        trips_client=FakeTripsClient(),
        random_value_fn=lambda: 0.9,
        publish_event_fn=publisher,
    )
    client = app.test_client()

    response = client.post(
        "/api/book-attractions",
        json={
            "user_id": [1, 2],
            "trip_id": "22222222-2222-2222-2222-222222222222",
            "attraction_id": "11111111-1111-1111-1111-111111111111",
            "cost": "99.99",
            "paid_by": 1,
        },
    )

    assert response.status_code == 201
    assert response.get_json()["data"]["booking_confirmation"] == "Booking successful."
    assert len(publisher.events) == 1
