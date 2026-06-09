from pydantic import BaseModel, Field
from typing import List, Optional

class AnalysisRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90, description="Konumun Enlemi (Latitude)")
    longitude: float = Field(..., ge=-180, le=180, description="Konumun Boylamı (Longitude)")
    property_type: Optional[str] = Field("apartment", description="Gayrimenkul Türü (apartment, house, commercial)")
    building_age: Optional[int] = Field(0, ge=0, le=100, description="Bina Yaşı (Yıl)")

class Coordinate(BaseModel):
    latitude: float
    longitude: float

class RiskFactor(BaseModel):
    name: str = Field(..., description="Risk Faktörü Adı (örn. Deprem, Sel, Zemin)")
    score: float = Field(..., description="0-100 arası risk puanı")
    level: str = Field(..., description="Risk Seviyesi (Düşük, Orta, Yüksek)")
    details: str = Field(..., description="Detaylı risk açıklaması")

class SecurityData(BaseModel):
    nearest_police_distance_m: float = Field(..., description="En yakın emniyet birimine mesafe (metre)")
    nearest_incident_distance_m: float = Field(..., description="En yakın asayiş olay noktasına mesafe (metre)")
    nearest_incident_name: str = Field(..., description="En yakın olay noktası adı")
    nearest_incident_severity: float = Field(..., description="En yakın olay noktasının şiddet katsayısı (1.0-5.0)")
    security_index: str = Field(..., description="Genel Asayiş Endeksi (Güvenli, Orta, Riskli)")

class GeographicalData(BaseModel):
    nearest_fault_distance_km: float = Field(..., description="En yakın fay hattına olan kuş uçuşu mesafe (km)")
    is_in_flood_zone: bool = Field(..., description="Konum taşkın/sel bölgesinde mi?")
    soil_type: str = Field(..., description="Zemin Tipi ve Sınıfı")
    landslide_risk: str = Field(..., description="Heyelan riski derecesi")
    nearest_amenity_distance_m: float = Field(..., description="En yakın sosyal donatıya mesafe (metre)")
    security: SecurityData = Field(..., description="Asayiş ve güvenlik endeksi verileri")
    nearest_metro_distance_m: float = Field(..., description="En yakın metro istasyonuna mesafe (metre)")
    nearest_vapur_distance_m: float = Field(..., description="En yakın vapur iskelesine mesafe (metre)")
    nearest_metrobus_distance_m: float = Field(..., description="En yakın metrobüs durağına mesafe (metre)")
    nearest_industry_distance_m: float = Field(..., description="En yakın sanayi bölgesine mesafe (metre)")
    nearest_highway_distance_m: float = Field(..., description="En yakın otoyola mesafe (metre)")
    walkability_score: float = Field(..., description="Yaşanabilirlik ve Donatı Skoru (0-100)")
    environmental_risk_score: float = Field(..., description="Çevresel Kirlilik ve Gürültü Risk Puanı (0-100)")

class RealEstateValuation(BaseModel):
    estimated_m2_price_try: float = Field(..., description="Tahmini metrekare birim fiyatı (TL)")
    safety_premium_multiplier: float = Field(..., description="Güvenlik çarpanı (Risk durumuna göre fiyatı etkiler)")
    investment_score: float = Field(..., description="0-100 arası yatırım potansiyeli puanı")
    valuation_confidence: float = Field(..., description="Fiyat tahmin güvenilirlik skoru (0.0 - 1.0)")

class AIReport(BaseModel):
    summary: str = Field(..., description="Yapay zeka tarafından hazırlanan konum özet raporu")
    strengths: List[str] = Field(..., description="Lokasyonun güçlü yönleri")
    weaknesses: List[str] = Field(..., description="Lokasyonun zayıf/riskli yönleri")
    recommendations: List[str] = Field(..., description="Yatırımcıya/Alıcıya özel aksiyon ve güvenlik önerileri")

class AnalysisResponse(BaseModel):
    coordinate: Coordinate
    overall_risk_score: float = Field(..., description="0-100 arası genel risk skoru")
    risk_level: str = Field(..., description="Genel Risk Seviyesi (Güvenli, Düşük Riskli, Orta Riskli, Yüksek Riskli)")
    risk_factors: List[RiskFactor]
    geographical_data: GeographicalData
    valuation: RealEstateValuation
    ai_report: AIReport
    security_hotspots_geojson: Optional[dict] = Field(None, description="Haritada çizilecek karakol ve olay noktaları (GeoJSON)")
    amenities_geojson: Optional[dict] = Field(None, description="Haritada çizilecek donatılar ve duraklar (GeoJSON)")
