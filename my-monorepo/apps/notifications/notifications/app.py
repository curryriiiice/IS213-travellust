from __future__ import annotations

from http import HTTPStatus

from flask import Flask, jsonify

from notifications.consumer import start_consumer_thread


def create_app() -> Flask:
    app = Flask(__name__)

    start_consumer_thread()

    @app.get("/health")
    def healthcheck():
        return jsonify({"service": "notifications", "status": "ok"}), HTTPStatus.OK

    return app


app = create_app()
