from flask import Flask
from .config import Config
from .logging_config import setup_logging, get_logger
from .routes.flights import flights_bp

# Setup logging
setup_logging()
logger = get_logger(__name__)


def create_app():
    """Create and configure the Flask application"""
    app = Flask(__name__)
    app.config.from_object(Config)
    app.url_map.strict_slashes = False  # Allow both /api/flights and /api/flights/

    # Configure Flask app logging
    setup_logging(app)
    logger.info("Starting Saved Flights service")

    # Register blueprints
    app.register_blueprint(flights_bp)

    # Health check endpoint
    @app.route('/api/health')
    def health_check():
        return {'status': 'healthy', 'service': 'saved-flights'}

    # Global error handlers
    @app.errorhandler(404)
    def handle_not_found(error):
        return {'success': False, 'error': 'Resource not found'}, 404

    @app.errorhandler(500)
    def handle_internal_error(error):
        return {'success': False, 'error': 'Internal server error'}, 500

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=Config.FLASK_PORT, debug=True)
elif __name__ == 'src.app':  # When run as module with `python -m src.app`
    app = create_app()
    app.run(host='0.0.0.0', port=Config.FLASK_PORT, debug=True)
