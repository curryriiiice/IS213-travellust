# auth-service

Authentication microservice for TravelLust. It is the only service that talks to OutSystems to validate user credentials. On success it issues a short-lived JWT access token and a long-lived refresh token, which the frontend uses to authenticate all subsequent requests.

**Port:** `5016`

---

## How it works

```
Browser                  auth-service              OutSystems
  |                           |                        |
  |-- POST /api/auth/login --> |                        |
  |                           |-- POST /api/users/ --> |
  |                           |      authenticate      |
  |                           |                        |
  |                           |<-- 200 user data ------|
  |                           |                        |
  |<-- access_token + --------|
  |    refresh_token           |
  |                           |
  |-- GET /api/auth/me ------> |  (validates JWT locally, no OutSystems call)
  |<-- user payload -----------|
```

1. The browser sends credentials to `auth-service`
2. `auth-service` forwards them to the OutSystems `User_Login` endpoint (OutSystems handles password hashing internally)
3. On success, `auth-service` issues two JWTs and returns them to the browser
4. The browser stores the tokens in `localStorage` and attaches the access token as a `Bearer` header on every request
5. When the access token expires (15 min), the frontend automatically exchanges the refresh token for a new one via `/api/auth/refresh`
6. OutSystems is **never called directly by the browser** — only by this service

---

## Endpoints

### `POST /api/auth/login`
Validates credentials and returns tokens.

**Request**
```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Response `200`**
```json
{
  "access_token": "<jwt>",
  "refresh_token": "<jwt>",
  "token_type": "bearer",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "Jane Doe",
    "roles": ["user"]
  }
}
```

**Response `401`** — invalid credentials
```json
{ "error": "Invalid email or password" }
```

---

### `POST /api/auth/refresh`
Exchanges a valid refresh token for a new access token.

**Request**
```json
{ "refresh_token": "<jwt>" }
```

**Response `200`**
```json
{ "access_token": "<jwt>", "token_type": "bearer" }
```

---

### `GET /api/auth/me`
Returns the current user decoded from the access token. Requires `Authorization: Bearer <access_token>` header.

**Response `200`**
```json
{
  "id": "user-123",
  "email": "user@example.com",
  "name": "Jane Doe",
  "roles": ["user"]
}
```

**Response `401`** — missing, expired, or invalid token

---

### `POST /api/auth/logout`
Stateless logout — always returns `200`. The client is responsible for deleting the stored tokens.

```json
{ "message": "Logged out successfully" }
```

---

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | Yes | — | Secret key used to sign and verify JWTs. Use a long random string in production. |
| `JWT_ALGORITHM` | No | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `15` | How long access tokens are valid |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | `7` | How long refresh tokens are valid |
| `OUTSYSTEMS_BASE_URL` | When live | — | Base URL of the OutSystems environment e.g. `https://your-env.outsystemscloud.com` |
| `OUTSYSTEMS_API_KEY` | When live | — | API key for the OutSystems REST endpoint |

---

## Project structure

```
auth_service/
├── app.py                  # Flask app factory, registers blueprint, CORS
├── routes/
│   └── auth.py             # All 4 route handlers
├── services/
│   ├── outsystems.py       # OutSystems credential validation (mocked in dev)
│   └── token.py            # JWT create / decode logic
└── middleware/
    └── auth_guard.py       # @token_required decorator for protected routes
```

---

## Running locally

```bash
# Via Docker Compose (recommended)
docker compose up -d auth-service

# Directly
cd apps/auth-service
uv run python -m flask --app auth_service.app run --host=0.0.0.0 --port=5000
```

Test it:
```bash
# Login (works with any credentials while OutSystems is mocked)
curl -X POST http://localhost:5016/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "test"}'

# Get current user
curl http://localhost:5016/api/auth/me \
  -H "Authorization: Bearer <access_token>"
```

---

## Connecting OutSystems

Currently `services/outsystems.py` is mocked and returns a hardcoded test user for any credentials. To go live:

1. Build a `POST /api/users/authenticate` REST endpoint in OutSystems Service Studio that calls `User_Login()` and returns `{ UserId, Email, Name, Roles }`
2. Replace the mock body in `services/outsystems.py` with an `httpx` call to that endpoint
3. Add `OUTSYSTEMS_BASE_URL` and `OUTSYSTEMS_API_KEY` to `.env`
4. Add `httpx` to `pyproject.toml` dependencies and run `uv lock`
5. Rebuild: `docker compose up -d --build auth-service`

No other files need to change.
