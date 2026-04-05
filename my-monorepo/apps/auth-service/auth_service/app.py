from __future__ import annotations

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

load_dotenv()


def create_app() -> Flask:
    app = Flask(__name__)

    CORS(app, origins=["http://localhost:8080"], supports_credentials=True)

    from auth_service.routes.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix="/api/auth")

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app


app = create_app()
