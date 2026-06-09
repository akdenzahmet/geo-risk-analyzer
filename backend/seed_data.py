import logging
from sqlalchemy.orm import Session
from geoalchemy2.shape import from_shape
from shapely.geometry import Point, LineString, Polygon

from backend.database import SessionLocal, IS_SIMULATED_MODE
from backend.models import FaultLine, FloodZone, Amenity, SecurityHotspot

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DatabaseSeeder")

def seed_spatial_data(db: Session) -> dict:
    """Veritabanını CBS analizleri için test verileriyle doldurur (Yalnızca PostGIS modundaysa)."""
    if IS_SIMULATED_MODE or db is None:
        msg = "Simüle mod aktif veya DB oturumu yok. Tohumlama işlemi atlandı."
        logger.info(msg)
        return {"status": "skipped", "message": msg}
        
    try:
        results = {}
        
        # 1. Fay Hatlarını Tohumlama (Eskileri silip yeniden ekler)
        db.query(FaultLine).delete()
        db.commit()
        if True:
            logger.info("Fay hatları ekleniyor...")
            f1 = FaultLine(
                name="Kuzey Anadolu Fay Hattı (Marmara Ana Segmenti)",
                geom=from_shape(LineString([(28.0, 40.75), (28.4, 40.78), (28.8, 40.82), (29.2, 40.86), (29.6, 40.88), (30.0, 40.92)]), srid=4326)
            )
            f2 = FaultLine(
                name="Kuzey Marmara İkincil Fay Segmenti",
                geom=from_shape(LineString([(28.5, 41.05), (28.9, 41.08), (29.3, 41.11)]), srid=4326)
            )
            db.add_all([f1, f2])
            db.commit()
            results["faults_seeded"] = 2
            logger.info("Fay hatları başarıyla eklendi.")
        else:
            results["faults_seeded"] = 0
            logger.info("Fay hatları veritabanında zaten mevcut.")
            
        # 2. Sel / Taşkın Bölgelerini Tohumlama (Eskileri silip yeniden ekler)
        db.query(FloodZone).delete()
        db.commit()
        if True:
            logger.info("Taşkın yatakları ekleniyor...")
            fz1 = FloodZone(
                name="Ayamama Deresi Taşkın Havzası",
                risk_level="Yüksek",
                geom=from_shape(Polygon([(28.79, 40.97), (28.83, 40.97), (28.84, 41.04), (28.79, 41.04), (28.79, 40.97)]), srid=4326)
            )
            fz2 = FloodZone(
                name="Alibeyköy Deresi Taşkın Yatağı",
                risk_level="Orta",
                geom=from_shape(Polygon([(28.91, 41.06), (28.96, 41.06), (28.95, 41.13), (28.90, 41.13), (28.91, 41.06)]), srid=4326)
            )
            fz3 = FloodZone(
                name="Riva Deresi Taşkın Alanı",
                risk_level="Yüksek",
                geom=from_shape(Polygon([(29.20, 41.17), (29.26, 41.17), (29.24, 41.26), (29.17, 41.26), (29.20, 41.17)]), srid=4326)
            )
            db.add_all([fz1, fz2, fz3])
            db.commit()
            results["flood_zones_seeded"] = 3
            logger.info("Taşkın yatakları başarıyla eklendi.")
        else:
            results["flood_zones_seeded"] = 0
            logger.info("Taşkın yatakları veritabanında zaten mevcut.")
            
        # 3. Ulaşım ve Sağlık Donatılarını Tohumlama (Eskileri silip yeniden ekler)
        db.query(Amenity).delete()
        db.commit()
        if True:
            logger.info("Sosyal donatılar ekleniyor...")
            a1 = Amenity(name="Taksim Metro İstasyonu", type="metro", geom=from_shape(Point(28.9850, 41.0369), srid=4326))
            a2 = Amenity(name="Kadıköy İskele ve Metro", type="metro", geom=from_shape(Point(29.0223, 40.9912), srid=4326))
            a3 = Amenity(name="Avcılar Devlet Hastanesi", type="hastane", geom=from_shape(Point(28.7214, 40.9901), srid=4326))
            a4 = Amenity(name="Maslak İTÜ Kampüsü & Metro", type="metro", geom=from_shape(Point(29.0242, 41.1044), srid=4326))
            a5 = Amenity(name="Sabiha Gökçen Havalimanı", type="havalimani", geom=from_shape(Point(29.3092, 40.8986), srid=4326))
            a6 = Amenity(name="Üsküdar Vapur İskelesi & Metro", type="vapur", geom=from_shape(Point(29.0161, 41.0268), srid=4326))
            a7 = Amenity(name="Beşiktaş Vapur İskelesi", type="vapur", geom=from_shape(Point(29.0068, 41.0418), srid=4326))
            a8 = Amenity(name="Altunizade Metrobüs & Metro", type="metrobus", geom=from_shape(Point(29.0435, 41.0210), srid=4326))
            a9 = Amenity(name="Zincirlikuyu Metrobüs İstasyonu", type="metrobus", geom=from_shape(Point(29.0118, 41.0678), srid=4326))
            a10 = Amenity(name="Söğütlüçeşme Metrobüs & Gar", type="metrobus", geom=from_shape(Point(29.0365, 40.9911), srid=4326))
            a11 = Amenity(name="Dudullu Organize Sanayi Bölgesi", type="sanayi", geom=from_shape(Point(29.1720, 40.9980), srid=4326))
            a12 = Amenity(name="İkitelli Organize Sanayi Bölgesi", type="sanayi", geom=from_shape(Point(28.7980, 41.0750), srid=4326))
            a13 = Amenity(name="D-100 Otoyolu Zincirlikuyu Geçişi", type="otoyol", geom=from_shape(Point(29.0125, 41.0682), srid=4326))
            a14 = Amenity(name="TEM Otoyolu Kavacık Kavşağı", type="otoyol", geom=from_shape(Point(29.0970, 41.0910), srid=4326))
            db.add_all([a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14])
            db.commit()
            results["amenities_seeded"] = 14
            logger.info("Sosyal donatılar başarıyla eklendi.")
        else:
            results["amenities_seeded"] = 0
            logger.info("Sosyal donatılar veritabanında zaten mevcut.")
            
        # 4. Asayiş ve Güvenlik Noktalarını Tohumlama (Eskileri silip yeniden ekler)
        db.query(SecurityHotspot).delete()
        db.commit()
        if True:
            logger.info("Asayiş ve güvenlik noktaları ekleniyor...")

            # Emniyet Müdürlükleri / Karakollar (type="karakol")
            s1 = SecurityHotspot(name="Kadıköy İlçe Emniyet Müdürlüğü",   type="karakol", severity=1.0, geom=from_shape(Point(29.0242, 40.9905), srid=4326))
            s2 = SecurityHotspot(name="Beşiktaş İlçe Emniyet Müdürlüğü",  type="karakol", severity=1.0, geom=from_shape(Point(29.0059, 41.0424), srid=4326))
            s3 = SecurityHotspot(name="Beyoğlu İlçe Emniyet Müdürlüğü",   type="karakol", severity=1.0, geom=from_shape(Point(28.9744, 41.0318), srid=4326))
            s4 = SecurityHotspot(name="Fatih İlçe Emniyet Müdürlüğü",     type="karakol", severity=1.0, geom=from_shape(Point(28.9400, 41.0100), srid=4326))
            s5 = SecurityHotspot(name="Avcılar İlçe Emniyet Müdürlüğü",   type="karakol", severity=1.0, geom=from_shape(Point(28.7220, 40.9800), srid=4326))

            # Asayiş Olay Sıcak Noktaları (type="olay")
            i1 = SecurityHotspot(name="Aksaray - Yoğun Asayiş Bölgesi",          type="olay", severity=4.2, geom=from_shape(Point(28.9536, 41.0088), srid=4326))
            i2 = SecurityHotspot(name="Taksim Meydanı Çevresi",                   type="olay", severity=3.5, geom=from_shape(Point(28.9877, 41.0369), srid=4326))
            i3 = SecurityHotspot(name="Tarlabaşı Bulvarı Sıcak Nokta",            type="olay", severity=3.8, geom=from_shape(Point(28.9760, 41.0340), srid=4326))
            i4 = SecurityHotspot(name="Bağcılar - Orta Şiddet Olay Bölgesi",     type="olay", severity=2.9, geom=from_shape(Point(28.8550, 41.0380), srid=4326))
            i5 = SecurityHotspot(name="Sultangazi - Orta Şiddet Olay Bölgesi",   type="olay", severity=2.5, geom=from_shape(Point(28.9100, 41.1050), srid=4326))
            i6 = SecurityHotspot(name="Küçükçekmece - Düşük Şiddet Olay Bölgesi", type="olay", severity=1.8, geom=from_shape(Point(28.7800, 41.0000), srid=4326))

            db.add_all([s1, s2, s3, s4, s5, i1, i2, i3, i4, i5, i6])
            db.commit()
            results["security_seeded"] = 11
            logger.info("Asayiş ve güvenlik noktaları başarıyla eklendi.")
        else:
            results["security_seeded"] = 0
            logger.info("Asayiş noktaları veritabanında zaten mevcut.")

        return {
            "status": "success",
            "message": "Veritabanı CBS tohumlama işlemi tamamlandı.",
            "data": results
        }
        
    except Exception as e:
        logger.error(f"Veritabanı tohumlama hatası: {e}")
        db.rollback()
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    db = SessionLocal()
    if db:
        seed_spatial_data(db)
        db.close()
