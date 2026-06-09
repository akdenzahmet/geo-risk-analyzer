FROM python:3.10-slim

WORKDIR /app

# PostgreSQL bağlantı kütüphanesi (psycopg2) ve CBS araçları için temel işletim sistemi paketlerini kuruyoruz
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Bağımlılıkları kopyala ve yükle
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Tüm backend kodlarını kopyala
COPY . /app/backend

# Python modül arama yolunu ayarla
ENV PYTHONPATH=/app

EXPOSE 8081

# FastAPI uygulamasını 8081 portundan başlat
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8081"]
