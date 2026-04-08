"""REST API routes for notifications service."""
from __future__ import annotations

import logging
from http import HTTPStatus

from flask import Blueprint, jsonify, request

from .supabase_client import supabase

logger = logging.getLogger(__name__)

notifications_bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")


@notifications_bp.route("", methods=["GET"])
def get_notifications():
    """
    Get notifications for a user.
    
    Query params:
        user_id (required): The user's ID
        limit (optional): Max notifications to return (default 50)
        offset (optional): Pagination offset (default 0)
    """
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"success": False, "error": "user_id is required"}), HTTPStatus.BAD_REQUEST
    
    if not supabase:
        return jsonify({"success": False, "error": "Database not configured"}), HTTPStatus.SERVICE_UNAVAILABLE
    
    limit = min(int(request.args.get("limit", 50)), 100)  # Cap at 100
    offset = int(request.args.get("offset", 0))
    
    try:
        response = (
            supabase.table("notifications")
            .select("id, user_id, trip_id, type, title, message, payload, is_read, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        
        return jsonify({
            "success": True,
            "data": response.data,
            "count": len(response.data)
        })
    except Exception as e:
        logger.error("Failed to fetch notifications: %s", e)
        return jsonify({"success": False, "error": "Failed to fetch notifications"}), HTTPStatus.INTERNAL_SERVER_ERROR


@notifications_bp.route("/unread-count", methods=["GET"])
def get_unread_count():
    """
    Get count of unread notifications for a user.
    
    Query params:
        user_id (required): The user's ID
    """
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"success": False, "error": "user_id is required"}), HTTPStatus.BAD_REQUEST
    
    if not supabase:
        return jsonify({"success": False, "error": "Database not configured"}), HTTPStatus.SERVICE_UNAVAILABLE
    
    try:
        response = (
            supabase.table("notifications")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .eq("is_read", False)
            .execute()
        )
        
        return jsonify({
            "success": True,
            "count": response.count or 0
        })
    except Exception as e:
        logger.error("Failed to fetch unread count: %s", e)
        return jsonify({"success": False, "error": "Failed to fetch unread count"}), HTTPStatus.INTERNAL_SERVER_ERROR


@notifications_bp.route("/<notification_id>/read", methods=["PATCH"])
def mark_as_read(notification_id: str):
    """Mark a single notification as read."""
    if not supabase:
        return jsonify({"success": False, "error": "Database not configured"}), HTTPStatus.SERVICE_UNAVAILABLE
    
    try:
        response = (
            supabase.table("notifications")
            .update({"is_read": True})
            .eq("id", notification_id)
            .execute()
        )
        
        if not response.data:
            return jsonify({"success": False, "error": "Notification not found"}), HTTPStatus.NOT_FOUND
        
        return jsonify({"success": True, "data": response.data[0]})
    except Exception as e:
        logger.error("Failed to mark notification as read: %s", e)
        return jsonify({"success": False, "error": "Failed to update notification"}), HTTPStatus.INTERNAL_SERVER_ERROR


@notifications_bp.route("/read-all", methods=["PATCH"])
def mark_all_as_read():
    """
    Mark all notifications as read for a user.
    
    Query params:
        user_id (required): The user's ID
    """
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"success": False, "error": "user_id is required"}), HTTPStatus.BAD_REQUEST
    
    if not supabase:
        return jsonify({"success": False, "error": "Database not configured"}), HTTPStatus.SERVICE_UNAVAILABLE
    
    try:
        response = (
            supabase.table("notifications")
            .update({"is_read": True})
            .eq("user_id", user_id)
            .eq("is_read", False)
            .execute()
        )
        
        return jsonify({
            "success": True,
            "updated_count": len(response.data) if response.data else 0
        })
    except Exception as e:
        logger.error("Failed to mark all notifications as read: %s", e)
        return jsonify({"success": False, "error": "Failed to update notifications"}), HTTPStatus.INTERNAL_SERVER_ERROR
