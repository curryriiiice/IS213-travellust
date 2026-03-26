FROM python:3.9-slim
WORKDIR /app
# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*
# Install uv package manager
RUN pip install --no-cache-dir uv
# Copy dependency files
COPY pyproject.toml uv.lock* README.md ./
# Install dependencies using uv
RUN uv sync --frozen --no-install-project --no-dev
# Copy application code
COPY apps/plan_service/ ./apps/plan_service/
# Expose internal port
EXPOSE 5000
# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD uv run python -c "import requests; requests.get('http://localhost:5000/api/health')"
# Run application with uv
CMD ["uv", "run", "python", "-m", "apps.plan_service.app"]