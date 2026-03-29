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
                "deleted": False,
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
                "deleted": False,
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
                "deleted": False,
                "created_at": "2026-04-01T08:00:00Z",
                "updated_at": "2026-04-01T08:00:00Z",
            },
            "66666666-6666-6666-6666-666666666666": {
                "attraction_id": "66666666-6666-6666-6666-666666666666",
                "trip_id": "22222222-2222-2222-2222-222222222222",
                "name": "Soft Deleted Attraction",
                "location": "Singapore",
                "gmaps_link": "https://maps.google.com/deleted",
                "visit_time": "2026-03-20T18:00:00Z",
                "duration_minutes": 45,
                "cost": "10.00",
                "deleted": True,
                "created_at": "2026-03-20T12:00:00Z",
                "updated_at": "2026-03-20T12:00:00Z",
            }
        }

    def list_attractions(self):
        return [record for record in self.records.values() if not record.get("deleted")]

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
            record
            for record in self.records.values()
            if record["trip_id"] == trip_id and not record.get("deleted")
        ]

    def get_attraction(self, attraction_id):
        record = self.records.get(attraction_id)
        if record and not record.get("deleted"):
            return record
        return None

    def create_attraction(self, payload):
        next_id = "33333333-3333-3333-3333-333333333333"
        record = {"attraction_id": next_id, "deleted": False, **payload}
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
            "deleted": False,
            **(payload or {}),
        }
        self.records[next_id] = record
        return record

    def update_attraction(self, trip_id, attraction_id, payload):
        if attraction_id not in self.records:
            return None
        if self.records[attraction_id]["trip_id"] != trip_id:
            return None
        if self.records[attraction_id].get("deleted"):
            return None
        self.records[attraction_id] = {
            **self.records[attraction_id],
            **payload,
            "attraction_id": attraction_id,
        }
        return self.records[attraction_id]

    def soft_delete_attraction(self, trip_id, attraction_id):
        if attraction_id not in self.records:
            return None
        if self.records[attraction_id]["trip_id"] != trip_id:
            return None
        if self.records[attraction_id].get("deleted"):
            return None
        self.records[attraction_id]["deleted"] = True
        return self.records[attraction_id]


class FakeTripsClient:
    def __init__(self):
        self.trips = {
            "22222222-2222-2222-2222-222222222222": {
                "id": "22222222-2222-2222-2222-222222222222",
                "attraction_ids": ["11111111-1111-1111-1111-111111111111"],
            },
            "66666666-6666-6666-6666-666666666666": {
                "id": "66666666-6666-6666-6666-666666666666",
                "attraction_ids": ["55555555-5555-5555-5555-555555555555"],
            },
        }

    def get_trip(self, trip_id):
        return self.trips.get(trip_id)

    def append_attraction_id(self, trip_id, attraction_id):
        trip = self.trips.get(trip_id)
        if trip is None:
            raise AssertionError("append_attraction_id called for missing trip")
        if attraction_id not in trip["attraction_ids"]:
            trip["attraction_ids"].append(attraction_id)
        return trip


def make_client():
    app = create_app(
        repository=FakeRepository(),
        trips_client=FakeTripsClient(),
    )
    return app.test_client()


def test_healthcheck():
    client = make_client()

    response = client.get("/health")

    assert response.status_code == 200
    assert response.get_json() == {"service": "attractions", "status": "ok"}


def test_list_attractions():
    client = make_client()

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
    client = make_client()

    response = client.get("/api/catalog/attractions")

    assert response.status_code == 200
    data = response.get_json()
    assert data["count"] == 2
    assert {record["name"] for record in data["data"]} == {
        "Gardens by the Bay",
        "Universal Studios Singapore",
    }


def test_search_catalog_attractions():
    client = make_client()

    response = client.get("/api/catalog/attractions?search=sentosa")

    assert response.status_code == 200
    data = response.get_json()
    assert data["count"] == 1
    assert data["data"][0]["name"] == "Universal Studios Singapore"


def test_get_catalog_attraction_by_id():
    client = make_client()

    response = client.get(
        "/api/catalog/attractions/aaaaaaa1-1111-1111-1111-111111111111"
    )

    assert response.status_code == 200
    assert (
        response.get_json()["data"]["catalog_attraction_id"]
        == "aaaaaaa1-1111-1111-1111-111111111111"
    )


def test_list_attractions_by_trip_id():
    client = make_client()

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
    client = make_client()

    response = client.get("/api/attractions/11111111-1111-1111-1111-111111111111")

    assert response.status_code == 200
    assert (
        response.get_json()["data"]["attraction_id"]
        == "11111111-1111-1111-1111-111111111111"
    )


def test_create_attraction():
    client = make_client()

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
    client = make_client()

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


def test_create_attraction_in_trip_manually():
    client = make_client()

    response = client.post(
        "/api/trips/22222222-2222-2222-2222-222222222222/attractions",
        json={
            "name": "Universal Studios Singapore",
            "location": "Sentosa",
            "duration_minutes": 240,
            "cost": "88.00",
        },
    )

    assert response.status_code == 201
    data = response.get_json()["data"]
    assert data["trip_id"] == "22222222-2222-2222-2222-222222222222"
    assert data["name"] == "Universal Studios Singapore"


def test_create_attraction_in_trip_from_catalog():
    client = make_client()

    response = client.post(
        "/api/trips/22222222-2222-2222-2222-222222222222/attractions",
        json={
            "catalog_attraction_id": "aaaaaaa1-1111-1111-1111-111111111111",
            "visit_time": "2026-03-21T12:00:00Z",
            "duration_minutes": 180,
        },
    )

    assert response.status_code == 201
    data = response.get_json()["data"]
    assert data["trip_id"] == "22222222-2222-2222-2222-222222222222"
    assert data["catalog_attraction_id"] == "aaaaaaa1-1111-1111-1111-111111111111"
    assert data["name"] == "Gardens by the Bay"


def test_create_attraction_from_catalog_requires_catalog_id():
    client = make_client()

    response = client.post(
        "/api/trips/22222222-2222-2222-2222-222222222222/attractions/from-catalog",
        json={"visit_time": "2026-03-21T12:00:00Z"},
    )

    assert response.status_code == 400
    assert "catalog_attraction_id" in response.get_json()["error"]


def test_create_attraction_from_catalog_rejects_invalid_fields():
    client = make_client()

    response = client.post(
        "/api/trips/22222222-2222-2222-2222-222222222222/attractions/from-catalog"
        "?catalog_attraction_id=aaaaaaa1-1111-1111-1111-111111111111",
        json={"name": "Do not allow override"},
    )

    assert response.status_code == 400
    assert "cannot be set" in response.get_json()["error"]


def test_create_attraction_from_catalog_not_found():
    client = make_client()

    response = client.post(
        "/api/trips/22222222-2222-2222-2222-222222222222/attractions/from-catalog"
        "?catalog_attraction_id=missing",
        json={"visit_time": "2026-03-21T12:00:00Z"},
    )

    assert response.status_code == 404
    assert response.get_json()["error"] == "Catalog attraction not found"


def test_create_trip_attraction_requires_existing_trip():
    client = make_client()

    response = client.post(
        "/api/trips/missing-trip/attractions",
        json={
            "name": "Universal Studios Singapore",
            "location": "Sentosa",
        },
    )

    assert response.status_code == 404
    assert response.get_json()["error"] == "Trip missing-trip was not found"


def test_create_requires_trip_id_and_name():
    client = make_client()

    response = client.post("/api/attractions", json={"location": "Singapore"})

    assert response.status_code == 400
    assert "Missing required fields" in response.get_json()["error"]


def test_trip_scoped_create_requires_name_or_catalog_id():
    client = make_client()

    response = client.post(
        "/api/trips/22222222-2222-2222-2222-222222222222/attractions",
        json={"location": "Singapore"},
    )

    assert response.status_code == 400
    assert "Missing required fields" in response.get_json()["error"]


def test_trip_scoped_catalog_create_rejects_invalid_fields():
    client = make_client()

    response = client.post(
        "/api/trips/22222222-2222-2222-2222-222222222222/attractions",
        json={
            "catalog_attraction_id": "aaaaaaa1-1111-1111-1111-111111111111",
            "name": "Do not allow override",
        },
    )

    assert response.status_code == 400
    assert "cannot be set" in response.get_json()["error"]


def test_create_rejects_non_schema_fields():
    client = make_client()

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
    client = make_client()

    response = client.post("/api/attractions", json=["bad"])

    assert response.status_code == 400
    assert "JSON object" in response.get_json()["error"]


def test_update_attraction():
    client = make_client()

    response = client.put(
        "/api/trips/22222222-2222-2222-2222-222222222222/attractions/11111111-1111-1111-1111-111111111111",
        json={"duration_minutes": 240, "cost": "40.00"},
    )

    assert response.status_code == 200
    assert response.get_json()["data"]["duration_minutes"] == 240


def test_update_rejects_primary_key_changes():
    client = make_client()

    response = client.put(
        "/api/trips/22222222-2222-2222-2222-222222222222/attractions/11111111-1111-1111-1111-111111111111",
        json={"attraction_id": "other-id"},
    )

    assert response.status_code == 400
    assert "cannot be updated" in response.get_json()["error"]


def test_delete_attraction():
    client = make_client()

    response = client.delete(
        "/api/trips/22222222-2222-2222-2222-222222222222/attractions/11111111-1111-1111-1111-111111111111"
    )

    assert response.status_code == 200
    assert response.get_json()["message"] == "Attraction soft deleted"
    assert response.get_json()["data"]["deleted"] is True


def test_update_rejects_wrong_trip():
    client = make_client()

    response = client.put(
        "/api/trips/different-trip/attractions/11111111-1111-1111-1111-111111111111",
        json={"duration_minutes": 240},
    )

    assert response.status_code == 404


def test_deleted_attraction_not_returned_in_lists():
    client = make_client()

    response = client.get(
        "/api/trips/22222222-2222-2222-2222-222222222222/attractions"
    )

    assert response.status_code == 200
    ids = {record["attraction_id"] for record in response.get_json()["data"]}
    assert "66666666-6666-6666-6666-666666666666" not in ids


def test_not_found_returns_404():
    client = make_client()

    response = client.get("/api/attractions/999")

    assert response.status_code == 404
    assert response.get_json()["error"] == "Attraction not found"


def test_create_adds_attraction_id_to_trip():
    trips_client = FakeTripsClient()
    app = create_app(
        repository=FakeRepository(),
        trips_client=trips_client,
    )
    client = app.test_client()

    response = client.post(
        "/api/trips/22222222-2222-2222-2222-222222222222/attractions",
        json={
            "name": "Universal Studios Singapore",
            "location": "Sentosa",
        },
    )

    assert response.status_code == 201
    created_id = response.get_json()["data"]["attraction_id"]
    assert created_id in trips_client.trips["22222222-2222-2222-2222-222222222222"]["attraction_ids"]
