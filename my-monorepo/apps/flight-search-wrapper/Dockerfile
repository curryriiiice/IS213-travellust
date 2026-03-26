FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install pip and upgrade
RUN pip install --no-cache-dir --upgrade pip

# Copy pyproject.toml
COPY pyproject.toml ./

# Install Python dependencies
RUN pip install --no-cache-dir flask flask-cors requests python-dotenv gunicorn

# Copy application code
COPY src/ ./src/

# Expose internal port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:5000/api/health')"

# Run application
CMD ["python", "-m", "src.app"]
