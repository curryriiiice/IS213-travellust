from __future__ import annotations

# MOCKED — OutSystems User_Login endpoint is not yet live.
# Replace this function body with a real httpx call once OutSystems is ready.

MOCK_USER = {
    "id": "test-user-1",
    "email": "test@travellust.com",
    "name": "Test User",
    "roles": ["user"],
}


def validate_user_credentials(email: str, password: str) -> dict | None:
    """
    Validate credentials against OutSystems User_Login.
    Currently returns a hardcoded test user for any input.
    """
    if not email or not password:
        return None
    return MOCK_USER
