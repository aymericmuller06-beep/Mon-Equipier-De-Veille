FROM python:3.14-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV DATABASE_PATH=/app/data/veille.db

EXPOSE 8000

# Un seul worker : la synchronisation automatique tourne dans le processus
CMD ["gunicorn", "--workers", "1", "--threads", "4", "--bind", "0.0.0.0:8000", "main:app"]
