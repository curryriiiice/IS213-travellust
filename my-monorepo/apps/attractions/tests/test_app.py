from attractions.app import create_app


class FakeRepository:
    def __init__(self):
        self.catalog_records = {
            "aaaaaaa1-1111-1111-1111-111111111111": {
                "catalog_attraction_id": "aaaaaaa1-1111-1111-1111-111111111111",
                "name": "Gardens by the Bay",
                "location": "Singapore",
                "gmaps_link": "https://maps.google.com/example",
                "cost": "32.50",
                "category": "Nature",
                "description": "Iconic waterfront gardens",
                "created_at": "2026-03-19T10:00:00Z",
                "updated_at": "2026-03-19T10:00:00Z",
            },
            "bbbbbbb2-2222-2222-2222-222222222222": {
                "catalog_attraction_id": "bbbbbbb2-2222-2222-2222-222222222222",
                "name": "Universal Studios Singapore",
                "location": "Sentosa",
                "gmaps_link": "https://maps.google.com/uss",
                "cost": "88.00",
                "category": "Theme Park",
                "description": "Movie-themed amusement park",
                "created_at": "2026-03-19T11:00:00Z",
                "updated_at": "2026-03-19T11:00:00Z",
            },
        }
        self.records = {
            "11111111-1111-1111-1111-111111111111": {
                "attraction_id": "11111111-1111-1111-1111-111111111111",
                "trip_id": "22222222-2222-2222-2222-222222222222",
                "name": "Gardens by the Bay",
                "location": "Singapore",
                "gmaps_link": "https://maps.google.com/example",
                "visit_time": "2026-03-20T12:00:00Z",
                "duration_minutes": 180,
                "cost": "32.50",
                "created_at": "2026-03-20T10:00:00Z",
                "updated_at": "2026-03-20T10:00:00Z",
            },
            "44444444-4444-4444-4444-444444444444": {
                "attraction_id": "44444444-4444-4444-4444-444444444444",
                "trip_id": "22222222-2222-2222-2222-222222222222",
                "name": "Singapore Flyer",
                "location": "Singapore",
                "gmaps_link": "https://maps.google.com/flyer",
                "visit_time": "2026-03-20T15:00:00Z",
                "duration_minutes": 60,
                "cost": "40.00",
                "created_at": "2026-03-20T11:00:00Z",
                "updated_at": "2026-03-20T11:00:00Z",
            },
            "55555555-5555-5555-5555-555555555555": {
                "attraction_id": "55555555-5555-5555-5555-555555555555",
                "trip_id": "66666666-6666-6666-6666-666666666666",
                "name": "Tokyo Tower",
                "location": "Tokyo",
                "gmaps_link": "https://maps.google.com/tokyo-tower",
                "visit_time": "2026-04-01T09:00:00Z",
                "duration_minutes": 90,
                "cost": "25.00",
                "created_at": "2026-04-01T08:00:00Z",
                "updated_at": "2026-04-01T08:00:00Z",
            }
        }

    def list_attractions(self):
        return list(self.records.values())

    def list_catalog_attractions(self, search=None):
        records = list(self.catalog_records.values())
        if not search:
            return records
        search_lower = search.lower()
        return [
            record
            for record in records
            if search_lower in record["name"].lower()
            or search_lower in (record.get("location") or "").lower()
        ]

    def get_catalog_attraction(self, catalog_attraction_id):
        return self.catalog_records.get(catalog_attraction_id)

    def list_attractions_by_trip(self, trip_id):
        return [
            record for record in self.records.values() if record["trip_id"] == trip_id
        ]

    def get_attraction(self, attraction_id):
        return self.records.get(attraction_id)

    def create_attraction(self, payload):
        next_id = "33333333-3333-3333-3333-333333333333"
        record = {"attraction_id": next_id, **payload}
        self.records[next_id] = record
        return record

    def create_attraction_from_catalog(self, trip_id, catalog_attraction_id, payload=None):
        catalog_record = self.get_catalog_attraction(catalog_attraction_id)
        if catalog_record is None:
            return None
        next_id = "77777777-7777-7777-7777-777777777777"
        record = {
            "attraction_id": next_id,
            "trip_id": trip_id,
            "catalog_attraction_id": catalog_attraction_id,
            "name": catalog_record["name"],
            "location": catalog_record["location"],
            "gmaps_link": catalog_record["gmaps_link"],
            "cost": catalog_record["cost"],
            **(payload or {}),
        }
        self.records[next_id] = record
        return record

    def update_attraction(self, attraction_id, payload):
        if attraction_id not in self.records:
            return None
        self.records[attraction_id] = {
            **self.records[attraction_id],
            **payload,
            "attraction_id": attraction_id,
        }
        return self.records[attraction_id]

    def delete_attraction(self, attraction_id):
        return self.records.pop(attraction_id, None)


def test_healthcheck():
    app = create_app(repository=FakeRepository())
    client = app.test_client()

    response = client.get("/health")

    assert response.status_code == 200
    assert response.get_json() == {"service": "attractions", "status": "ok"}


def test_list_attractions():
    app = create_app(repository=FakeRepository())
    client = app.test_client()

    response = client.get("/api/attractions")

    assert response.status_code == 200
    data = response.get_json()
    assert data["count"] == 3
    assert {record["name"] for record in data["data"]} == {
        "Gardens by the Bay",
        "Singapore Flyer",
        "Tokyo Tower",
    }


def test_list_catalog_attractions():
    app = create_app(repository=FakeRepository())
    client = app.test_client()

    response = client.get("/api/catalog/attractions")

    assert response.status_code == 200
    data = response.get_json()
    assert data["count"] == 2
    assert {record["name"] for record in data["data"]} == {
        "Gardens by the Bay",
        "Universal Studios Singapore",
    }


def test_search_catalog_attractions():
    app = create_app(repository=FakeRepository())
    client = app.test_client()

    response = client.get("/api/catalog/attractions?search=sentosa")

    assert response.status_code == 200
    data = response.get_json()
    assert data["count"] == 1
    assert data["data"][0]["name"] == "Universal Studios Singapore"


def test_get_catalog_attraction_by_id():
    app = create_app(repository=FakeRepository())
    client = app.test_client()

    response = client.get(
        "/api/catalog/attractions/aaaaaaa1-1111-1111-1111-111111111111"
    )

    assert response.status_code == 200
    assert (
        response.get_json()["data"]["catalog_attraction_id"]
        == "aaaaaaa1-1111-1111-1111-111111111111"
    )


def test_list_attractions_by_trip_id():
    app = create_app(repository=FakeRepository())
    client = app.test_client()

    response = client.get(
        "/api/trips/22222222-2222-2222-2222-222222222222/attractions"
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data["count"] == 2
    assert {record["name"] for record in data["data"]} == {
        "Gardens by the Bay",
        "Singapore Flyer",
    }


def test_get_attraction_by_id():
    app = create_app(repository=FakeRepository())
    client = app.test_client()

    response = client.get("/api/attractions/11111111-1111-1111-1111-111111111111")

    assert response.status_code == 200
    assert (
        response.get_json()["data"]["attraction_id"]
        == "11111111-1111-1111-1111-111111111111"
    )


def test_create_attraction():
    app = create_app(repository=FakeRepository())
    client = app.test_client()

    response = client.post(
        "/api/attractions",
        json={
            "trip_id": "22222222-2222-2222-2222-222222222222",
            "name": "Universal Studios Singapore",
            "location": "Sentosa",
            "duration_minutes": 240,
            "cost": "88.00",
        },
    )

    assert response.status_code == 201
    assert response.get_json()["data"]["name"] == "Universal Studios Singapore"


def test_create_attraction_from_catalog():
    app = create_app(repository=FakeRepository())
    client = app.test_client()

    response = client.post(
        "/api/trips/22222222-2222-2222-2222-222222222222/attractions/from-catalog"
        "?catalog_attraction_id=aaaaaaa1-1111-1111-1111-111111111111",
        json={"visit_time": "2026-03-21T12:00:00Z", "duration_minutes": 180},
    )

    assert response.status_code == 201
    data = response.get_json()["data"]
    assert data["trip_id"] == "22222222-2222-2222-2222-222222222222"
    assert data["catalog_attraction_id"] == "aaaaaaa1-1111-1111-1111-111111111111"
    assert data["name"] == "Gardens by the Bay"


def test_create_attraction_from_catalog_requires_catalog_id():
    app = create_app(repository=FakeRepository())
    client = app.test_client()

    response = client.post(
        "/api/trips/22222222-2222-2222-2222-222222222222/attractions/from-catalog",
        json={"visit_time": "2026-03-21T12:00:00Z"},
    )

    assert response.status_code == 400
    assert "catalog_attraction_id" in response.get_json()["error"]


def test_create_attraction_from_catalog_rejects_invalid_fields():
    app = create_app(repository=FakeRepository())
    client = app.test_client()

    response = client.post(
        "/api/trips/22222222-2222-2222-2222-222222222222/attractions/from-catalog"
        "?catalog_attraction_id=aaaaaaa1-1111-1111-1111-111111111111",
        json={"name": "Do not allow override"},
    )

    assert response.status_code == 400
    assert "cannot be set" in response.get_json()["error"]


def test_create_attraction_from_catalog_not_found():
    app = create_app(repository=FakeRepository())
    client = app.test_client()

    response = client.post(
        "/api/trips/22222222-2222-2222-2222-222222222222/attractions/from-catalog"
        "?catalog_attraction_id=missing",
        json={"visit_time": "2026-03-21T12:00:00Z"},
    )

    assert response.status_code == 404
    assert response.get_json()["error"] == "Catalog attraction not found"


def test_create_requires_trip_id_and_name():
    app = create_app(repository=FakeRepository())
    client = app.test_client()

    response = client.post("/api/attractions", json={"location": "Singapore"})

    assert response.status_code == 400
    assert "Missing required fields" in response.get_json()["error"]


def test_create_rejects_non_schema_fields():
    app = create_app(repository=FakeRepository())
    client = app.test_client()

    response = client.post(
        "/api/attractions",
        json={
            "trip_id": "22222222-2222-2222-2222-222222222222",
            "name": "Marina Bay Sands SkyPark",
            "attraction_id": "should-not-be-set-by-client",
        },
    )

    assert response.status_code == 400
    assert "cannot be set" in response.get_json()["error"]


def test_reject_non_object_payload():
    app = create_app(repository=FakeRepository())
    client = app.test_client()

    response = client.post("/api/attractions", json=["bad"])

    assert response.status_code == 400
    assert "JSON object" in response.get_json()["error"]


def test_update_attraction():
    app = create_app(repository=FakeRepository())
    client = app.test_client()

    response = client.put(
        "/api/attractions/11111111-1111-1111-1111-111111111111",
        json={"duration_minutes": 240, "cost": "40.00"},
    )

    assert response.status_code == 200
    assert response.get_json()["data"]["duration_minutes"] == 240


def test_update_rejects_primary_key_changes():
    app = create_app(repository=FakeRepository())
    client = app.test_client()

    response = client.put(
        "/api/attractions/11111111-1111-1111-1111-111111111111",
        json={"attraction_id": "other-id"},
    )

    assert response.status_code == 400
    assert "cannot be updated" in response.get_json()["error"]


def test_delete_attraction():
    app = create_app(repository=FakeRepository())
    client = app.test_client()

    response = client.delete("/api/attractions/11111111-1111-1111-1111-111111111111")

    assert response.status_code == 200
    assert response.get_json()["message"] == "Attraction deleted"


def test_not_found_returns_404():
    app = create_app(repository=FakeRepository())
    client = app.test_client()

    response = client.get("/api/attractions/999")

    assert response.status_code == 404
    assert response.get_json()["error"] == "Attraction not found"
