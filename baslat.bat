@echo off
title Antigravity Geo-Risk Proje Yoneticisi
echo =======================================================================
echo     YAPAY ZEKA DESTEKLI GAYRIMENKUL VE RISK ANALIZI UYGULAMASI
echo =======================================================================
echo.

echo [1/3] PostgreSQL/PostGIS veritabanı Docker üzerinde başlatılıyor...
docker compose up -d db
echo.

echo [2/3] Backend bagimliliklari kontrol ediliyor ve modül olarak baslatiliyor...
# Uygulamayı ana klasörden (root) "python -m backend.main" şeklinde çalıştırıyoruz
start "Antigravity Geo-Risk - Backend (FastAPI)" cmd /k "pip install -r backend\requirements.txt && python -m backend.main"

echo.
echo [3/3] React Frontend Sunucusu baslatiliyor...
echo.
cd frontend && npm run dev

pause
