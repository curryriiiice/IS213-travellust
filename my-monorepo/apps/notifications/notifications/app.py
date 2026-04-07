from __future__ import annotations

from http import HTTPStatus

from flask import Flask, jsonify
from flask_cors import CORS

from .consumer import start_consumer_thread
from .routes import notifications_bp


def create_app() -> Flask:
    app = Flask(__name__)
    
    # Enable CORS for frontend access
    CORS(app, origins=["http://localhost:5173", "http://localhost:3000"])

    # Register blueprints
    app.register_blueprint(notifications_bp)

    # Start RabbitMQ consumer in background thread
    start_consumer_thread()

    @app.get("/health")
    def healthcheck():
        return jsonify({"service": "notifications", "status": "ok"}), HTTPStatus.OK

    return app


app = create_app()
