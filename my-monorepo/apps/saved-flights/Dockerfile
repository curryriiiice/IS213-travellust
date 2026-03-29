FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y gcc curl && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv

COPY pyproject.toml uv.lock* README.md ./

RUN uv sync --frozen --no-dev

# Copy application code
COPY src/ ./src/

# Expose internal port
EXPOSE 5000

# Run application
CMD ["uv", "run", "python", "-m", "src.app"]

