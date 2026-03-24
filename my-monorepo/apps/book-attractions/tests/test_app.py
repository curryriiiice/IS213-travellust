from book_attractions.app import create_app


class FakeTripsClient:
    def user_belongs_to_trip(self, trip_id, user_id):
        if trip_id != "22222222-2222-2222-2222-222222222222":
            return False
        return str(user_id) in {"1", "2", "3"}


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

    def create_from_catalog(self, trip_id, catalog_attraction_id, payload):
        if catalog_attraction_id == "missing":
            return None
        return {
            "attraction_id": "11111111-1111-1111-1111-111111111111",
            "trip_id": trip_id,
            "catalog_attraction_id": catalog_attraction_id,
            "name": "Gardens by the Bay",
            **payload,
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


def test_healthcheck():
    app = create_app(
        attractions_client=FakeAttractionsClient(),
        booked_tickets_client=FakeBookedTicketsClient(),
        trips_client=FakeTripsClient(),
    )
    client = app.test_client()

    response = client.get("/health")

    assert response.status_code == 200
    assert response.get_json() == {"service": "book-attractions", "status": "ok"}


def test_book_from_catalog():
    app = create_app(
        attractions_client=FakeAttractionsClient(),
        booked_tickets_client=FakeBookedTicketsClient(),
        trips_client=FakeTripsClient(),
    )
    client = app.test_client()

    response = client.post(
        "/api/book-attractions",
        json={
            "user_id": [1, 2],
            "trip_id": "22222222-2222-2222-2222-222222222222",
            "catalog_attraction_id": "aaaaaaa1-1111-1111-1111-111111111111",
            "visit_time": "2026-03-25T10:00:00Z",
            "duration_minutes": 120,
            "cost": "99.99",
            "paid_by": 1,
        },
    )

    assert response.status_code == 201
    data = response.get_json()["data"]
    assert len(data["booked_tickets"]) == 2
    assert data["booked_tickets"][0]["f_h_a_id"] == "11111111-1111-1111-1111-111111111111"
    assert data["resolved_trip_id"] == "22222222-2222-2222-2222-222222222222"


def test_book_existing_attraction():
    app = create_app(
        attractions_client=FakeAttractionsClient(),
        booked_tickets_client=FakeBookedTicketsClient(),
        trips_client=FakeTripsClient(),
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
    assert response.get_json()["data"]["booked_tickets"][0]["f_h_a_id"] == (
        "11111111-1111-1111-1111-111111111111"
    )


def test_requires_one_attraction_selector():
    app = create_app(
        attractions_client=FakeAttractionsClient(),
        booked_tickets_client=FakeBookedTicketsClient(),
        trips_client=FakeTripsClient(),
    )
    client = app.test_client()

    response = client.post(
        "/api/book-attractions",
        json={"user_id": [1], "trip_id": "trip-1", "paid_by": 1},
    )

    assert response.status_code == 400
    assert "exactly one" in response.get_json()["error"]


def test_requires_trip_id():
    app = create_app(
        attractions_client=FakeAttractionsClient(),
        booked_tickets_client=FakeBookedTicketsClient(),
        trips_client=FakeTripsClient(),
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


def test_rejects_user_not_in_trip():
    app = create_app(
        attractions_client=FakeAttractionsClient(),
        booked_tickets_client=FakeBookedTicketsClient(),
        trips_client=FakeTripsClient(),
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
    assert "does not belong to trip" in response.get_json()["error"]


def test_requires_user_id_list():
    app = create_app(
        attractions_client=FakeAttractionsClient(),
        booked_tickets_client=FakeBookedTicketsClient(),
        trips_client=FakeTripsClient(),
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
