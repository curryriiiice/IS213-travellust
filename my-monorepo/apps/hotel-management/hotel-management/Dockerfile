# Hotel Management Composite Service Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy pyproject.toml and uv.lock
COPY pyproject.toml uv.lock ./

# Install uv package manager
RUN pip install uv

# Install dependencies using uv
RUN uv sync --frozen

# Copy the service files
COPY src/ /app/

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV SEARCH_SERVICE_URL=http://hotel-search-wrapper:5000
ENV SAVED_HOTELS_SERVICE_URL=http://saved-hotels:5000

# Expose the port
EXPOSE 5000

# Run the application
CMD ["python", "-u", "hotel_management_app.py"]
