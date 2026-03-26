FROM python:3.9-slim

WORKDIR /app

COPY pyproject.toml uv.lock README.md ./
COPY book_hotels/ ./book_hotels/

RUN pip install --no-cache-dir flask python-dotenv requests pika

ENV PYTHONUNBUFFERED=1
ENV FLASK_DEBUG=1

EXPOSE 5000

CMD ["python", "-m", "flask", "--app", "book_hotels.book_hotels_app", "run", "--host=0.0.0.0"]
