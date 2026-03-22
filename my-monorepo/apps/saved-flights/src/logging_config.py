"""Simple logging configuration for Saved Flights service"""
import logging
import sys

def setup_logging(app=None):
    """Configure application logging"""
    logging.basicConfig(
        level=logging.INFO,
        format='[%(asctime)s] %(levelname)s in %(module)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

def get_logger(name):
    """Get a logger with the specified name"""
    return logging.getLogger(name)
