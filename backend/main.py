import uvicorn
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import logging

from backend.config import settings
from backend.database import get_db, engine, IS_SIMULATED_MODE, Base
from backend.schemas import AnalysisRequest, AnalysisResponse
from backend.services.spatial_service import get_spatial_metrics
from backend.services.ai_service import generate_risk_and_valuation
from backend.seed_data import seed_spatial_data

# Logging yapılandırması
logger = logging.getLogger("MainApplication")

# FastAPI uygulaması
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Yapay Zeka Destekli Coğrafi Bilgi Sistemleri (WebGIS) Gayrimenkul Risk Değerlendirme Uygulaması",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS (Cross-Origin Resource Sharing) Ayarları
# React frontend uygulamamızın (5174 portunda çalışacak) backend'e (8081 portu) erişebilmesini sağlar
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Geliştirme aşamasında tüm kökenlere izin veriyoruz
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    """Uygulama başlarken tabloları oluşturur ve CBS verilerini veritabanına tohumlar."""
    if not IS_SIMULATED_MODE and engine is not None:
        try:
            logger.info("PostGIS veritabanı tabloları oluşturuluyor...")
            Base.metadata.create_all(bind=engine)
            
            # Verileri tohumlama
            db = next(get_db())
            if db:
                logger.info("Veritabanı başlangıç verileri tohumlanıyor...")
                seed_spatial_data(db)
        except Exception as e:
            logger.error(f"Tablolar oluşturulurken veya tohumlanırken hata oluştu: {e}")
            logger.warning("Uygulama veritabanı olmadan çalışmaya devam edecek (Simülasyon moduna geçilebilir).")
    else:
        logger.info("Simüle mod aktif: Tablo oluşturma ve tohumlama adımları atlandı.")

@app.get("/api/health", summary="Sağlık Durumu ve Mod Kontrolü")
def health_check(db: Session = Depends(get_db)):
    """API'nin çalışıp çalışmadığını ve veritabanı bağlantı durumunu bildirir."""
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "database_connected": not IS_SIMULATED_MODE and db is not None,
        "engine_mode": "Simulated GIS (Local Shape Engine)" if IS_SIMULATED_MODE else "Native PostGIS (Database Connected)"
    }

@app.post("/api/analyze", response_model=AnalysisResponse, summary="Lokasyon Bazlı Yapay Zeka Risk ve Emlak Analizi")
def analyze_location(request: AnalysisRequest, db: Session = Depends(get_db)):
    """
    Belirtilen koordinat (enlem/boylam) için mekansal mesafe analizleri yapar,
    ardından yapay zeka modeline göre emlak değerlemesi ve risk raporu oluşturur.
    """
    logger.info(f"Analiz İsteği Alındı: Lat={request.latitude}, Lon={request.longitude}, Tip={request.property_type}, Yaş={request.building_age}")
    
    try:
        # 1. Mekansal GIS analizlerini yap (Fay mesafesi, sel bölgesi, sosyal donatılar vb.)
        spatial_metrics = get_spatial_metrics(request.latitude, request.longitude, db)
        
        # 2. Risk puanlaması, değerleme ve yapay zeka tavsiyelerini oluştur
        response_data = generate_risk_and_valuation(
            lat=request.latitude,
            lon=request.longitude,
            spatial_metrics=spatial_metrics,
            property_type=request.property_type,
            building_age=request.building_age
        )
        
        return response_data
    except Exception as e:
        logger.error(f"Analiz sırasında beklenmedik hata: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analiz işlemi başarısız oldu: {str(e)}"
        )

@app.post("/api/seed", summary="Veritabanı CBS Verilerini Manuel Tohumla")
def seed_database(db: Session = Depends(get_db)):
    """Veritabanını coğrafi test verileriyle doldurmak için kullanılan manuel tetikleyici."""
    if IS_SIMULATED_MODE or db is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uygulama simüle modda çalışıyor. Veritabanı bağlantısı yok, tohumlama yapılamaz."
        )
    return seed_spatial_data(db)

if __name__ == "__main__":
    logger.info(f"FastAPI Sunucusu Başlatılıyor: Port={settings.PORT}")
    uvicorn.run(
        "backend.main:app", 
        host=settings.HOST, 
        port=settings.PORT, 
        reload=settings.DEBUG
    )
