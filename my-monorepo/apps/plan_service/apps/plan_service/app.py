from flask import Flask
from .config import Config
from .routes.health import health_bp
from .routes.plan import plan_bp


def create_app():
    """Create and configure Flask application"""
    app = Flask(__name__)
    app.config.from_object(Config)

    # Register blueprints
    app.register_blueprint(health_bp)
    app.register_blueprint(plan_bp)

    # Global error handlers
    @app.errorhandler(404)
    def handle_not_found(error):
        return {"success": False, "error": "Resource not found"}, 404

    @app.errorhandler(500)
    def handle_internal_error(error):
        return {"success": False, "error": "Internal server error"}, 500

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=Config.FLASK_PORT, debug=True)
