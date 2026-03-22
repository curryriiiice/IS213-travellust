FROM python:3.9-slim

WORKDIR /app

COPY pyproject.toml uv.lock README.md ./
COPY hotel_management/ ./hotel_management/

RUN pip install --no-cache-dir flask google-search-results python-dotenv supabase

ENV PYTHONUNBUFFERED=1
ENV FLASK_DEBUG=1

EXPOSE 5000

CMD ["python", "-m", "flask", "--app", "hotel_management.hotel_search_wrapper_app", "run", "--host=0.0.0.0"]
