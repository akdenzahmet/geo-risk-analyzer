import math
import logging
from sqlalchemy.orm import Session
from sqlalchemy import func, cast
from geoalchemy2 import Geography
from shapely.geometry import Point as ShapelyPoint, LineString as ShapelyLineString, Polygon as ShapelyPolygon

from backend.database import IS_SIMULATED_MODE
from backend.models import FaultLine, FloodZone, Amenity, SecurityHotspot
from geoalchemy2.shape import to_shape

logger = logging.getLogger("SpatialService")

# --- HATA ALMA DURUMUNDA KULLANILACAK BELLEK İÇİ COĞRAFİ VERİLER (İSTANBUL MERKEZLİ) ---
# Kuzey Anadolu Fay Hattı (Marmara Segmenti) ve İkincil Faylar
SIM_FAULTS = [
    ShapelyLineString([(28.0, 40.75), (28.4, 40.78), (28.8, 40.82), (29.2, 40.86), (29.6, 40.88), (30.0, 40.92)]),  # Ana Marmara Fayı
    ShapelyLineString([(28.5, 41.05), (28.9, 41.08), (29.3, 41.11)]),  # İkincil Kuzey segmenti
]

# Taşkın / Sel Riski Bulunan Dere Yatakları
SIM_FLOOD_ZONES = [
    {
        "name": "Ayamama Deresi Taşkın Havzası",
        "risk_level": "Yüksek",
        "polygon": ShapelyPolygon([(28.79, 40.97), (28.83, 40.97), (28.84, 41.04), (28.79, 41.04)])
    },
    {
        "name": "Alibeyköy Deresi Taşkın Yatağı",
        "risk_level": "Orta",
        "polygon": ShapelyPolygon([(28.91, 41.06), (28.96, 41.06), (28.95, 41.13), (28.90, 41.13)])
    },
    {
        "name": "Riva Deresi Taşkın Alanı",
        "risk_level": "Yüksek",
        "polygon": ShapelyPolygon([(29.20, 41.17), (29.26, 41.17), (29.24, 41.26), (29.17, 41.26)])
    }
]

# Sosyal Donatılar (Hastaneler, Ulaşım Noktaları vb.)
SIM_AMENITIES = [
    {"name": "Taksim Metro İstasyonu", "type": "metro", "lat": 41.0369, "lon": 28.9850},
    {"name": "Kadıköy İskele ve Metro", "type": "metro", "lat": 40.9912, "lon": 29.0223},
    {"name": "Avcılar Devlet Hastanesi", "type": "hastane", "lat": 40.9901, "lon": 28.7214},
    {"name": "Maslak İTÜ Kampüsü & Metro", "type": "metro", "lat": 41.1044, "lon": 29.0242},
    {"name": "Sabiha Gökçen Havalimanı", "type": "havalimani", "lat": 40.8986, "lon": 29.3092},
    
    # Yeni Metro, Metrobüs ve Vapur İskeleleri
    {"name": "Üsküdar Vapur İskelesi & Metro", "type": "vapur", "lat": 41.0268, "lon": 29.0161},
    {"name": "Beşiktaş Vapur İskelesi", "type": "vapur", "lat": 41.0418, "lon": 29.0068},
    {"name": "Altunizade Metrobüs & Metro", "type": "metrobus", "lat": 41.0210, "lon": 29.0435},
    {"name": "Zincirlikuyu Metrobüs İstasyonu", "type": "metrobus", "lat": 41.0678, "lon": 29.0118},
    {"name": "Söğütlüçeşme Metrobüs & Gar", "type": "metrobus", "lat": 40.9911, "lon": 29.0365},
    
    # Sanayi Tesisleri (Çevresel Risk)
    {"name": "Dudullu Organize Sanayi Bölgesi", "type": "sanayi", "lat": 40.9980, "lon": 29.1720},
    {"name": "İkitelli Organize Sanayi Bölgesi", "type": "sanayi", "lat": 41.0750, "lon": 28.7980},
    
    # Ana Otoyol Çizgileri / Düğümleri (Gürültü Kirliliği)
    {"name": "D-100 Otoyolu Zincirlikuyu Geçişi", "type": "otoyol", "lat": 41.0682, "lon": 29.0125},
    {"name": "TEM Otoyolu Kavacık Kavşağı", "type": "otoyol", "lat": 41.0910, "lon": 29.0970},
]

# Emniyet birimleri ve asayiş olay noktaları mock verileri
SIM_SECURITY_HOTSPOTS = [
    {"name": "Aksaray - Yoğun Asayiş Bölgesi", "type": "olay", "severity": 4.2, "lat": 41.0088, "lon": 28.9536},
    {"name": "Taksim Meydanı Çevresi", "type": "olay", "severity": 3.5, "lat": 41.0369, "lon": 28.9877},
    {"name": "Tarlabaşı Bulvarı Sıcak Nokta", "type": "olay", "severity": 3.8, "lat": 41.0340, "lon": 28.9760},
    {"name": "Bağcılar - Orta Şiddet Olay Bölgesi", "type": "olay", "severity": 2.9, "lat": 41.0380, "lon": 28.8550},
    {"name": "Sultangazi - Orta Şiddet Olay Bölgesi", "type": "olay", "severity": 2.5, "lat": 41.1050, "lon": 28.9100},
    {"name": "Küçükçekmece - Düşük Şiddet Olay Bölgesi", "type": "olay", "severity": 1.8, "lat": 41.0000, "lon": 28.7800},
    
    {"name": "Kadıköy İlçe Emniyet Müdürlüğü", "type": "karakol", "severity": 1.0, "lat": 40.9905, "lon": 29.0242},
    {"name": "Beşiktaş İlçe Emniyet Müdürlüğü", "type": "karakol", "severity": 1.0, "lat": 41.0424, "lon": 29.0059},
    {"name": "Beyoğlu İlçe Emniyet Müdürlüğü", "type": "karakol", "severity": 1.0, "lat": 41.0318, "lon": 28.9744},
    {"name": "Fatih İlçe Emniyet Müdürlüğü", "type": "karakol", "severity": 1.0, "lat": 41.0100, "lon": 28.9400},
    {"name": "Avcılar İlçe Emniyet Müdürlüğü", "type": "karakol", "severity": 1.0, "lat": 40.9800, "lon": 28.7220},
]


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """İki coğrafi nokta arasındaki mesafeyi Haversine formülü ile METRE cinsinden hesaplar."""
    R = 6371000.0  # Dünya yarıçapı (metre)
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def get_spatial_metrics(lat: float, lon: float, db: Session = None) -> dict:
    """
    Belirtilen koordinat için CBS (GIS) risk parametrelerini döndürür.
    PostGIS aktifse SQL, aksi takdirde yerel Shapely/Haversine simülasyonu kullanılır.
    """
    # Eğer simüle moddaysak veya veritabanı oturumu yoksa
    if IS_SIMULATED_MODE or db is None:
        logger.info(f"Simüle Coğrafi Analiz Motoru devrede: ({lat}, {lon})")
        return _get_simulated_spatial_metrics(lat, lon)
    
    try:
        # 1. En yakın fay hattı mesafesi
        # ST_Distance yardımıyla coğrafi (geography) mesafe hesaplayıp km'ye çeviriyoruz
        point_geom = func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)
        
        nearest_fault = db.query(
            FaultLine.name,
            func.ST_Distance(cast(FaultLine.geom, Geography), cast(point_geom, Geography)).label("distance_meters")
        ).order_by("distance_meters").first()
        
        nearest_fault_distance_km = 999.0
        if nearest_fault:
            nearest_fault_distance_km = nearest_fault.distance_meters / 1000.0
            
        # 2. Sel/Taşkın bölgesi kontrolü
        # ST_Contains kullanarak noktanın poligon içinde olup olmadığını buluyoruz
        flood_zone = db.query(FloodZone.name, FloodZone.risk_level).filter(
            func.ST_Contains(FloodZone.geom, point_geom)
        ).first()
        
        is_in_flood_zone = False
        flood_zone_risk = "Düşük"
        if flood_zone:
            is_in_flood_zone = True
            flood_zone_risk = flood_zone.risk_level
            
        # 3. En yakın sosyal donatı mesafesi (tüm donatılar arasından en yakını)
        nearest_amenity = db.query(
            Amenity.name,
            Amenity.type,
            func.ST_Distance(cast(Amenity.geom, Geography), cast(point_geom, Geography)).label("distance_meters")
        ).order_by("distance_meters").first()
        
        nearest_amenity_distance_m = 9999.0
        if nearest_amenity:
            nearest_amenity_distance_m = nearest_amenity.distance_meters
            
        # Alt-tipler için mesafeleri sorgula
        def get_min_dist_by_type(amenity_type):
            res = db.query(
                func.ST_Distance(cast(Amenity.geom, Geography), cast(point_geom, Geography)).label("distance_meters")
            ).filter(Amenity.type == amenity_type).order_by("distance_meters").first()
            return res.distance_meters if res else 99999.0
            
        nearest_metro_distance_m = get_min_dist_by_type("metro")
        nearest_vapur_distance_m = get_min_dist_by_type("vapur")
        nearest_metrobus_distance_m = get_min_dist_by_type("metrobus")
        nearest_industry_distance_m = get_min_dist_by_type("sanayi")
        nearest_highway_distance_m = get_min_dist_by_type("otoyol")
        
        # Harita donatı listesini GeoJSON olarak frontend'e gönder
        all_amenities = db.query(Amenity).all()
        amenities_features = []
        for am in all_amenities:
            shapely_pt = to_shape(am.geom)
            amenities_features.append({
                "type": "Feature",
                "properties": {
                    "name": am.name,
                    "type": am.type
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [shapely_pt.x, shapely_pt.y]
                }
            })
        amenities_geojson = {
            "type": "FeatureCollection",
            "features": amenities_features
        }
            
        # 4. En yakın emniyet (karakol) mesafesi
        nearest_police = db.query(
            SecurityHotspot.name,
            func.ST_Distance(cast(SecurityHotspot.geom, Geography), cast(point_geom, Geography)).label("distance_meters")
        ).filter(SecurityHotspot.type == "karakol").order_by("distance_meters").first()
        
        nearest_police_distance_m = 99999.0
        if nearest_police:
            nearest_police_distance_m = nearest_police.distance_meters

        # 5. En yakın olay noktası mesafesi ve bilgileri
        nearest_incident = db.query(
            SecurityHotspot.name,
            SecurityHotspot.severity,
            func.ST_Distance(cast(SecurityHotspot.geom, Geography), cast(point_geom, Geography)).label("distance_meters")
        ).filter(SecurityHotspot.type == "olay").order_by("distance_meters").first()
        
        nearest_incident_distance_m = 99999.0
        nearest_incident_name = "Bilinmiyor"
        nearest_incident_severity = 1.0
        if nearest_incident:
            nearest_incident_distance_m = nearest_incident.distance_meters
            nearest_incident_name = nearest_incident.name
            nearest_incident_severity = nearest_incident.severity
            
        # Tüm güvenlik noktalarının GeoJSON listesi (haritada çizim için)
        all_hotspots = db.query(SecurityHotspot).all()
        hotspots_features = []
        for hs in all_hotspots:
            shapely_pt = to_shape(hs.geom)
            hotspots_features.append({
                "type": "Feature",
                "properties": {
                    "name": hs.name,
                    "type": hs.type,
                    "severity": hs.severity
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [shapely_pt.x, shapely_pt.y]
                }
            })
        security_hotspots_geojson = {
            "type": "FeatureCollection",
            "features": hotspots_features
        }

        # Zemin tipi hesaplama (İstanbul'un litolojik yapısını simüle eden enlem tabanlı kural motoru)
        # Genelde güney sahilleri (Avcılar, Kadıköy kıyıları, Bakırköy) killi zemin (E), kuzey kayaçtır (A/B)
        if lat < 40.96:
            soil_type = "Zemin Sınıfı E (Killi/Alüvyon - Yüksek Sıvılaşma Riski)"
            landslide_risk = "Orta"
        elif 40.96 <= lat < 41.06:
            soil_type = "Zemin Sınıfı C (Sıkı Kum/Kil - Orta Derece Taşıma Gücü)"
            landslide_risk = "Düşük"
        else:
            soil_type = "Zemin Sınıfı A/B (Masif Kayaçlar - Yüksek Taşıma Gücü)"
            landslide_risk = "Düşük (Eğimli alanlarda Orta)"
            
        return {
            "nearest_fault_distance_km": round(nearest_fault_distance_km, 2),
            "is_in_flood_zone": is_in_flood_zone,
            "flood_zone_risk": flood_zone_risk,
            "soil_type": soil_type,
            "landslide_risk": landslide_risk,
            "nearest_amenity_distance_m": round(nearest_amenity_distance_m, 1),
            "nearest_police_distance_m": round(nearest_police_distance_m, 1),
            "nearest_incident_distance_m": round(nearest_incident_distance_m, 1),
            "nearest_incident_name": nearest_incident_name,
            "nearest_incident_severity": round(nearest_incident_severity, 1),
            "security_hotspots_geojson": security_hotspots_geojson,
            "nearest_metro_distance_m": round(nearest_metro_distance_m, 1),
            "nearest_vapur_distance_m": round(nearest_vapur_distance_m, 1),
            "nearest_metrobus_distance_m": round(nearest_metrobus_distance_m, 1),
            "nearest_industry_distance_m": round(nearest_industry_distance_m, 1),
            "nearest_highway_distance_m": round(nearest_highway_distance_m, 1),
            "amenities_geojson": amenities_geojson
        }
        
    except Exception as e:
        logger.error(f"PostGIS sorgulaması sırasında hata alındı: {e}. Simülasyona dönülüyor.")
        return _get_simulated_spatial_metrics(lat, lon)


def _get_simulated_spatial_metrics(lat: float, lon: float) -> dict:
    """Yalnızca Shapely ve Haversine kullanarak Python seviyesinde CBS analizi simülasyonu yapar."""
    point = ShapelyPoint(lon, lat)
    
    # 1. Fay Hattı Mesafesi Hesaplama
    min_fault_dist_km = 999.0
    for fault_line in SIM_FAULTS:
        # Shapely en yakın noktayı bulur
        nearest_point_on_line = fault_line.interpolate(fault_line.project(point))
        # Koordinatlardan gerçek mesafeyi metre cinsinden hesapla
        dist_m = haversine_distance(lat, lon, nearest_point_on_line.y, nearest_point_on_line.x)
        dist_km = dist_m / 1000.0
        if dist_km < min_fault_dist_km:
            min_fault_dist_km = dist_km
            
    # 2. Sel Bölgesi Kontrolü
    is_in_flood = False
    flood_zone_risk = "Düşük"
    for zone in SIM_FLOOD_ZONES:
        if zone["polygon"].contains(point):
            is_in_flood = True
            flood_zone_risk = zone["risk_level"]
            break
            
    # 3. En Yakın Sosyal Donatı
    min_amenity_dist_m = 99999.0
    for am in SIM_AMENITIES:
        dist_m = haversine_distance(lat, lon, am["lat"], am["lon"])
        if dist_m < min_amenity_dist_m:
            min_amenity_dist_m = dist_m
            
    # Alt donatılar için mesafeleri bulalım
    nearest_metro_distance_m = 99999.0
    nearest_vapur_distance_m = 99999.0
    nearest_metrobus_distance_m = 99999.0
    nearest_industry_distance_m = 99999.0
    nearest_highway_distance_m = 99999.0
    
    for am in SIM_AMENITIES:
        dist_m = haversine_distance(lat, lon, am["lat"], am["lon"])
        if am["type"] == "metro" and dist_m < nearest_metro_distance_m:
            nearest_metro_distance_m = dist_m
        elif am["type"] == "vapur" and dist_m < nearest_vapur_distance_m:
            nearest_vapur_distance_m = dist_m
        elif am["type"] == "metrobus" and dist_m < nearest_metrobus_distance_m:
            nearest_metrobus_distance_m = dist_m
        elif am["type"] == "sanayi" and dist_m < nearest_industry_distance_m:
            nearest_industry_distance_m = dist_m
        elif am["type"] == "otoyol" and dist_m < nearest_highway_distance_m:
            nearest_highway_distance_m = dist_m

    # Simüle GeoJSON listesi
    amenities_features = []
    for am in SIM_AMENITIES:
        amenities_features.append({
            "type": "Feature",
            "properties": {
                "name": am["name"],
                "type": am["type"]
            },
            "geometry": {
                "type": "Point",
                "coordinates": [am["lon"], am["lat"]]
            }
        })
    amenities_geojson = {
        "type": "FeatureCollection",
        "features": amenities_features
    }
            
    # 4. En Yakın Karakol
    min_police_dist_m = 99999.0
    for hotspot in SIM_SECURITY_HOTSPOTS:
        if hotspot["type"] == "karakol":
            dist_m = haversine_distance(lat, lon, hotspot["lat"], hotspot["lon"])
            if dist_m < min_police_dist_m:
                min_police_dist_m = dist_m
                
    # 5. En Yakın Olay Noktası
    min_incident_dist_m = 99999.0
    nearest_incident_name = "Bilinmiyor"
    nearest_incident_severity = 1.0
    for hotspot in SIM_SECURITY_HOTSPOTS:
        if hotspot["type"] == "olay":
            dist_m = haversine_distance(lat, lon, hotspot["lat"], hotspot["lon"])
            if dist_m < min_incident_dist_m:
                min_incident_dist_m = dist_m
                nearest_incident_name = hotspot["name"]
                nearest_incident_severity = hotspot["severity"]
                
    # Simüle GeoJSON oluşturma
    hotspots_features = []
    for hs in SIM_SECURITY_HOTSPOTS:
        hotspots_features.append({
            "type": "Feature",
            "properties": {
                "name": hs["name"],
                "type": hs["type"],
                "severity": hs["severity"]
            },
            "geometry": {
                "type": "Point",
                "coordinates": [hs["lon"], hs["lat"]]
            }
        })
    security_hotspots_geojson = {
        "type": "FeatureCollection",
        "features": hotspots_features
    }

    # Zemin Sınıfı ve Heyelan Derecelendirmesi
    if lat < 40.96:
        soil_type = "Zemin Sınıfı E (Killi/Alüvyon - Yüksek Sıvılaşma Riski)"
        landslide_risk = "Orta"
    elif 40.96 <= lat < 41.06:
        soil_type = "Zemin Sınıfı C (Sıkı Kum/Kil - Orta Derece Taşıma Gücü)"
        landslide_risk = "Düşük"
    else:
        soil_type = "Zemin Sınıfı A/B (Masif Kayaçlar - Yüksek Taşıma Gücü)"
        landslide_risk = "Yüksek (Heyelan Riski - Kuzey Eğimli Orman Sınırı)"

    return {
        "nearest_fault_distance_km": round(min_fault_dist_km, 2),
        "is_in_flood_zone": is_in_flood,
        "flood_zone_risk": flood_zone_risk,
        "soil_type": soil_type,
        "landslide_risk": landslide_risk,
        "nearest_amenity_distance_m": round(min_amenity_dist_m, 1),
        "nearest_police_distance_m": round(min_police_dist_m, 1),
        "nearest_incident_distance_m": round(min_incident_dist_m, 1),
        "nearest_incident_name": nearest_incident_name,
        "nearest_incident_severity": round(nearest_incident_severity, 1),
        "security_hotspots_geojson": security_hotspots_geojson,
        "nearest_metro_distance_m": round(nearest_metro_distance_m, 1),
        "nearest_vapur_distance_m": round(nearest_vapur_distance_m, 1),
        "nearest_metrobus_distance_m": round(nearest_metrobus_distance_m, 1),
        "nearest_industry_distance_m": round(nearest_industry_distance_m, 1),
        "nearest_highway_distance_m": round(nearest_highway_distance_m, 1),
        "amenities_geojson": amenities_geojson
    }
