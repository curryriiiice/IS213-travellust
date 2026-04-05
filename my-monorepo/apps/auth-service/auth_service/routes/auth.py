from __future__ import annotations

import jwt
from flask import Blueprint, jsonify, request

from auth_service.middleware.auth_guard import token_required
from auth_service.services.outsystems import validate_user_credentials
from auth_service.services.token import create_access_token, create_refresh_token, decode_token

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/login")
def login():
    body = request.get_json(silent=True) or {}
    email = body.get("email", "").strip()
    password = body.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = validate_user_credentials(email, password)
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    access_token = create_access_token(user["id"], user["email"], user["name"], user["roles"])
    refresh_token = create_refresh_token(user["id"])

    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user,
    })


@auth_bp.post("/refresh")
def refresh():
    body = request.get_json(silent=True) or {}
    refresh_token = body.get("refresh_token", "")

    if not refresh_token:
        return jsonify({"error": "refresh_token is required"}), 400

    try:
        payload = decode_token(refresh_token)
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Refresh token has expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid refresh token"}), 401

    if payload.get("type") != "refresh":
        return jsonify({"error": "Invalid token type"}), 401

    access_token = create_access_token(
        payload["sub"],
        payload.get("email", ""),
        payload.get("name", ""),
        payload.get("roles", []),
    )
    return jsonify({"access_token": access_token, "token_type": "bearer"})


@auth_bp.get("/me")
@token_required
def me():
    user = request.current_user
    return jsonify({
        "id": user["sub"],
        "email": user.get("email", ""),
        "name": user.get("name", ""),
        "roles": user.get("roles", []),
    })


@auth_bp.post("/logout")
def logout():
    return jsonify({"message": "Logged out successfully"})
