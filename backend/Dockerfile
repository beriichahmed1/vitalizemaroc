FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app

COPY pyproject.toml ./
COPY app ./app
COPY alembic.ini ./
COPY migrations ./migrations
COPY entrypoint.sh ./

RUN pip install --no-cache-dir . \
    && sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh \
    && useradd --create-home --shell /usr/sbin/nologin appuser

USER appuser
EXPOSE 8000
ENTRYPOINT ["./entrypoint.sh"]
