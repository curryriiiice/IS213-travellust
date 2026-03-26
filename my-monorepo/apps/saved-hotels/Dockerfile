# Saved Hotels Service Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy pyproject.toml, uv.lock and README.md
COPY pyproject.toml uv.lock README.md ./

# Install uv package manager
RUN pip install uv

# Install dependencies using uv
RUN uv sync --frozen

# Copy the service files
COPY src/ /app/

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV PATH="/app/.venv/bin:$PATH"

# Expose the port
EXPOSE 5000

# Run the application
CMD ["python", "-u", "saved_hotels_app.py"]
