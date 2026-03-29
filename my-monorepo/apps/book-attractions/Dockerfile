FROM python:3.9-slim

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY pyproject.toml uv.lock* README.md ./

RUN uv sync --frozen --no-install-project --no-dev

COPY book_attractions/ ./book_attractions/

ENV PYTHONUNBUFFERED=1
ENV FLASK_DEBUG=1

EXPOSE 5000

CMD ["uv", "run", "python", "-m", "flask", "--app", "book_attractions.app:app", "run", "--host=0.0.0.0"]
