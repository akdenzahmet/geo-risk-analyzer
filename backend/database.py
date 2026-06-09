import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import OperationalError
from backend.config import settings

# Günlük kayıtları (Logging) ayarları
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DatabaseConnection")

Base = declarative_base()

import time

engine = None
SessionLocal = None
IS_SIMULATED_MODE = False

retries = 6
for i in range(retries):
    try:
        logger.info(f"PostgreSQL/PostGIS veritabanına bağlanılıyor (Deneme {i+1}/{retries})...")
        engine = create_engine(
            settings.DATABASE_URL, 
            connect_args={"connect_timeout": 3}
        )
        # Bağlantıyı test edelim
        connection = engine.connect()
        connection.close()
        
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        logger.info("PostgreSQL/PostGIS veritabanı bağlantısı BAŞARILI.")
        IS_SIMULATED_MODE = False
        break
    except (OperationalError, Exception) as e:
        if i < retries - 1:
            logger.warning(f"Bağlantı başarısız: {e}. 3 saniye sonra tekrar denenecek...")
            time.sleep(3)
        else:
            logger.warning("=" * 60)
            logger.warning("UYARI: PostgreSQL/PostGIS veritabanı bağlantısı BAŞARISIZ OLDU!")
            logger.warning(f"Hata detayı: {e}")
            logger.warning("Uygulama otomatik olarak 'SIMÜLE EDİLMİŞ COĞRAFİ MOTOR' moduna geçiyor.")
            logger.warning("Bu modda analizler bellek içi Shapely kütüphanesiyle yapılacaktır.")
            logger.warning("=" * 60)
            IS_SIMULATED_MODE = True
            engine = None
            SessionLocal = None

def get_db():
    """FastAPI Dependency Injection için DB session oluşturucu."""
    if IS_SIMULATED_MODE or SessionLocal is None:
        # Simüle modda None döner, servisler bunu algılayarak bellek içi mock verileri kullanır.
        yield None
    else:
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
