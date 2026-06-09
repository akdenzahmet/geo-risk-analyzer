from sqlalchemy import Column, Integer, String, Float
from geoalchemy2 import Geometry
from backend.database import Base

class FaultLine(Base):
    __tablename__ = "fault_lines"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    # WGS84 coğrafi koordinat sistemi (SRID: 4326)
    geom = Column(Geometry(geometry_type="LINESTRING", srid=4326))

class FloodZone(Base):
    __tablename__ = "flood_zones"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    risk_level = Column(String)  # "Yüksek", "Orta", "Düşük"
    geom = Column(Geometry(geometry_type="POLYGON", srid=4326))

class Amenity(Base):
    __tablename__ = "amenities"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(String, index=True)  # "hastane", "okul", "metro", "avm"
    geom = Column(Geometry(geometry_type="POINT", srid=4326))

class SecurityHotspot(Base):
    """
    Asayiş güvenlik noktaları tablosu.
    İki tip kayıt tutar:
      - 'karakol': Emniyet müdürlükleri ve polis karakolları (güvenliği artırır)
      - 'olay'   : Asayiş olaylarının yoğunlaştığı sıcak noktalar (riski artırır)
    severity: 1.0 (hafif) - 5.0 (çok yoğun) ağırlık çarpanı
    """
    __tablename__ = "security_hotspots"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(String, index=True)     # "karakol" veya "olay"
    severity = Column(Float, default=1.0) # 1.0 - 5.0 arası etki şiddeti
    geom = Column(Geometry(geometry_type="POINT", srid=4326))
