import math
from backend.schemas import AnalysisResponse, Coordinate, RiskFactor, GeographicalData, RealEstateValuation, AIReport, SecurityData

def generate_risk_and_valuation(
    lat: float, 
    lon: float, 
    spatial_metrics: dict, 
    property_type: str = "apartment", 
    building_age: int = 0
) -> AnalysisResponse:
    """
    Konumsal analiz sonuçları ve bina özelliklerine dayanarak risk puanları, 
    emlak değerlemesi ve yapay zeka öneri raporu üretir.
    """
    
    # 1. Deprem Riski Hesaplama (Ağırlık: %60)
    fault_dist = spatial_metrics["nearest_fault_distance_km"]
    soil_type = spatial_metrics["soil_type"]
    
    # Mesafe bazlı deprem riski (faya yaklaştıkça risk artar)
    if fault_dist < 3.0:
        eq_base = 90
    elif fault_dist < 7.0:
        eq_base = 75
    elif fault_dist < 15.0:
        eq_base = 50
    elif fault_dist < 30.0:
        eq_base = 25
    else:
        eq_base = 10
        
    # Zemin tipi etkisi
    if "Zemin Sınıfı E" in soil_type:
        eq_base += 15  # Gevşek killi/alüvyon zemin riski artırır
    elif "Zemin Sınıfı C" in soil_type:
        eq_base += 5
    else:
        eq_base -= 10  # A/B Grubu kayaç zemin sönümler
        
    # Bina yaşı etkisi
    if building_age > 30:
        eq_base += 20
    elif building_age > 15:
        eq_base += 10
    else:
        eq_base += 0
        
    eq_score = min(max(eq_base, 0), 100)
    eq_level = "Yüksek" if eq_score >= 70 else ("Orta" if eq_score >= 40 else "Düşük")
    
    # 2. Sel/Taşkın Riski Hesaplama (Ağırlık: %15)
    is_in_flood = spatial_metrics["is_in_flood_zone"]
    flood_risk_level = spatial_metrics["flood_zone_risk"]
    
    if is_in_flood:
        flood_score = 90 if flood_risk_level == "Yüksek" else (65 if flood_risk_level == "Orta" else 40)
    else:
        # Dere yatağında değilse de yakınlık veya genel eğimden dolayı ufak bir pay verilir
        flood_score = 15
        
    flood_level = "Yüksek" if flood_score >= 70 else ("Orta" if flood_score >= 40 else "Düşük")
    
    # 3. Zemin/Heyelan Riski Hesaplama (Ağırlık: %15)
    landslide_risk_str = spatial_metrics["landslide_risk"]
    if "Yüksek" in landslide_risk_str:
        soil_score = 80
    elif "Orta" in landslide_risk_str:
        soil_score = 50
    else:
        soil_score = 20
        
    soil_level = "Yüksek" if soil_score >= 70 else ("Orta" if soil_score >= 40 else "Düşük")

    # 4. Asayiş ve Güvenlik Riski (Ağırlık: %20)
    police_dist = spatial_metrics["nearest_police_distance_m"]
    incident_dist = spatial_metrics["nearest_incident_distance_m"]
    incident_sev = spatial_metrics["nearest_incident_severity"]
    
    # Olay noktasına yakınlık cezası
    if incident_dist < 500:
        incident_penalty = 50 * (incident_sev / 3.0)
    elif incident_dist < 1000:
        incident_penalty = 30 * (incident_sev / 3.0)
    elif incident_dist < 2000:
        incident_penalty = 15 * (incident_sev / 3.0)
    else:
        incident_penalty = 0
        
    # Karakola yakınlık indirimi (bonus)
    if police_dist < 300:
        police_bonus = 25
    elif police_dist < 1000:
        police_bonus = 15
    elif police_dist < 2000:
        police_bonus = 5
    else:
        police_bonus = 0
        
    # Taban asayiş risk skoru
    sec_base = 35 + incident_penalty - police_bonus
    security_score = min(max(sec_base, 0.0), 100.0)
    security_score = round(security_score, 1)
    
    security_level = "Yüksek" if security_score >= 70 else ("Orta" if security_score >= 40 else "Düşük")
    
    # Genel Risk Skoru (Ağırlıklı Ortalama)
    overall_risk_score = (eq_score * 0.5) + (flood_score * 0.15) + (soil_score * 0.15) + (security_score * 0.2)
    overall_risk_score = round(min(max(overall_risk_score, 0.0), 100.0), 1)
    
    if overall_risk_score < 30:
        overall_level = "Güvenli"
    elif overall_risk_score < 50:
        overall_level = "Düşük Riskli"
    elif overall_risk_score < 75:
        overall_level = "Orta Riskli"
    else:
        overall_level = "Yüksek Riskli"
        
    # Risk Detay Açıklamaları
    eq_details = f"En yakın fay hattına uzaklık {fault_dist} km. "
    if "Zemin Sınıfı E" in soil_type:
        eq_details += "Zayıf zemin yapısı deprem dalgalarını büyütebilir. "
    else:
        eq_details += "Sert zemin yapısı sismik dalgalara karşı direnç sağlar. "
    if building_age > 20:
        eq_details += "Bina yaşı 20 yılı aşkın olduğundan yapısal yorgunluk dikkate alınmalıdır."
    else:
        eq_details += "Bina yaşı yeni olup deprem yönetmeliğine uygunluk ihtimali yüksektir."

    flood_details = "Konum, belirlenen aktif taşkın yatağı içerisinde yer almaktadır." if is_in_flood \
        else "Bölge taşkın yatakları dışında olup sel riski minimaldir."
        
    soil_details = f"Zemin tipi: {soil_type}. Dik yamaçlar veya dolgu alanlarında {landslide_risk_str.lower()} düzeyde heyelan riski mevcuttur."

    sec_details = f"En yakın emniyet birimine uzaklık {round(police_dist, 0)} m. En yakın asayiş sıcak noktasına uzaklık {round(incident_dist, 0)} m ({spatial_metrics['nearest_incident_name']})."
    if security_score >= 60:
        sec_details += " Bölgede suç/olay yoğunluğu yüksek olduğundan ek güvenlik önlemleri gerekebilir."
    else:
        sec_details += " Karakol yakınlığı ve düşük olay yoğunluğu sayesinde asayiş düzeyi yüksektir."

    # 5. Yaşanabilirlik Skoru Hesaplama (0-100)
    metro_dist = spatial_metrics["nearest_metro_distance_m"]
    metrobus_dist = spatial_metrics["nearest_metrobus_distance_m"]
    vapur_dist = spatial_metrics["nearest_vapur_distance_m"]
    
    min_transit = min(metro_dist, metrobus_dist, vapur_dist)
    base_walk = 90 if min_transit < 700 else (75 if min_transit < 1500 else 45)
    
    amenity_dist = spatial_metrics["nearest_amenity_distance_m"]
    amenity_bonus_pt = 8 if amenity_dist < 1000 else 0
    
    walkability_score = base_walk + amenity_bonus_pt
    walkability_score = min(max(walkability_score, 10.0), 98.0)
    
    # 6. Çevresel Kirlilik ve Gürültü Risk Puanı Hesaplama (0-100)
    ind_dist = spatial_metrics["nearest_industry_distance_m"]
    hwy_dist = spatial_metrics["nearest_highway_distance_m"]
    
    if ind_dist < 600:
        ind_penalty = 55
    elif ind_dist < 1500:
        ind_penalty = 30
    elif ind_dist < 3000:
        ind_penalty = 10
    else:
        ind_penalty = 0
        
    if hwy_dist < 300:
        hwy_penalty = 45
    elif hwy_dist < 1000:
        hwy_penalty = 20
    elif hwy_dist < 2000:
        hwy_penalty = 5
    else:
        hwy_penalty = 0
        
    environmental_risk_score = ind_penalty + hwy_penalty
    environmental_risk_score = min(max(environmental_risk_score, 0.0), 100.0)
    environmental_risk_score = round(environmental_risk_score, 1)

    env_level = "Yüksek" if environmental_risk_score >= 70 else ("Orta" if environmental_risk_score >= 40 else "Düşük")
    env_details = f"En yakın otoyola uzaklık {round(hwy_dist, 0)} m. En yakın sanayi tesisine uzaklık {round(ind_dist, 0)} m."
    if environmental_risk_score >= 50:
        env_details += " Sanayi ve otoyol yakınlığı nedeniyle hava kalitesi düşük ve gürültü seviyesi yüksek olabilir."
    else:
        env_details += " Çevresel kirlilik kaynaklarından uzak, gürültü seviyesi düşük ve hava kalitesi iyi bir bölgedir."

    risk_factors = [
        RiskFactor(name="Deprem Riski", score=eq_score, level=eq_level, details=eq_details),
        RiskFactor(name="Sel ve Taşkın Riski", score=flood_score, level=flood_level, details=flood_details),
        RiskFactor(name="Zemin Güvenliği ve Heyelan", score=soil_score, level=soil_level, details=soil_details),
        RiskFactor(name="Asayiş ve Güvenlik", score=security_score, level=security_level, details=sec_details),
        RiskFactor(name="Çevresel Risk ve Gürültü", score=environmental_risk_score, level=env_level, details=env_details)
    ]
    
    # 4. Emlak Değerlemesi (Heuristic)
    # İstanbul için taban m² birim fiyatı 55.000 TL
    base_m2_price = 55000.0
    
    # Coğrafi konuma göre premium ekleyelim (Boğaz hattı, Beşiktaş, Kadıköy veya Maslak yakınlığı)
    # Merkez enlemler 41.00 - 41.05 ve boylamlar 28.98 - 29.05 arası premium kabul edilebilir.
    dist_to_center_lat = abs(lat - 41.015)
    dist_to_center_lon = abs(lon - 28.979)
    center_dist = math.sqrt(dist_to_center_lat**2 + dist_to_center_lon**2)
    
    # Merkez yaklaştıkça fiyat çarpanı artar (Max 2.5 kat)
    location_multiplier = 1.0 + max(0.0, (0.25 - center_dist) / 0.1)
    
    # Sosyal donatı yakınlık bonusu (metro, metrobüs veya vapura yakınsa fiyat artar)
    min_transit_dist = min(
        spatial_metrics["nearest_metro_distance_m"],
        spatial_metrics["nearest_metrobus_distance_m"],
        spatial_metrics["nearest_vapur_distance_m"]
    )
    if min_transit_dist < 600:
        amenity_bonus = 1.25  # %25 artış
    elif min_transit_dist < 1300:
        amenity_bonus = 1.12  # %12 artış
    else:
        amenity_bonus = 0.92  # Uzaksa değer kaybı
        
    # Emlak tipi çarpanı
    type_multiplier = 1.0
    if property_type == "house":
        type_multiplier = 1.4  # Müstakil ev m² değeri fazladır
    elif property_type == "commercial":
        type_multiplier = 1.6  # Ticari dükkan/ofis değeri fazladır
        
    # Güvenlik Çarpanı (Risk oranında iskonto uygulanır)
    # Çok yüksek riskli yerlerde fiyat %35'e kadar düşebilir (0.65 çarpanı)
    safety_premium_multiplier = round(1.10 - (overall_risk_score / 200.0), 2)
    
    # Bina Yaşı Değer Kaybı
    age_multiplier = max(0.5, 1.0 - (building_age * 0.015))
    
    estimated_m2_price = base_m2_price * location_multiplier * amenity_bonus * type_multiplier * safety_premium_multiplier * age_multiplier
    estimated_m2_price = round(estimated_m2_price, -2) # En yakın 100 TL'ye yuvarla
    
    # Yatırım Potansiyeli Skoru
    # Düşük riskli, donatılara yakın, genç binalar yüksek yatırım skoru alır
    inv_score = 100 - (overall_risk_score * 0.5) - (building_age * 0.8)
    if amenity_dist < 800:
        inv_score += 15
    inv_score = round(min(max(inv_score, 10.0), 98.0), 1)
    
    valuation_confidence = round(0.90 - (building_age * 0.003) - (0.002 * (1 if is_in_flood else 0)), 2)
    
    valuation = RealEstateValuation(
        estimated_m2_price_try=estimated_m2_price,
        safety_premium_multiplier=safety_premium_multiplier,
        investment_score=inv_score,
        valuation_confidence=valuation_confidence
    )
    
    # 5. Yapay Zeka Raporu (AI Report) Oluşturma
    strengths = []
    weaknesses = []
    recommendations = []
    
    # Güçlü yönler
    if fault_dist > 15:
        strengths.append(f"Kuzey Anadolu Fay Hattı segmentlerine güvenli mesafede ({round(fault_dist, 1)} km) bulunuyor.")
    if "Zemin Sınıfı A/B" in soil_type:
        strengths.append("Deprem dalgalarını sönümleyen sağlam masif kayaç (A/B sınıfı) zemin yapısına sahip.")
    if not is_in_flood:
        strengths.append("Aktif akarsu yatakları ve taşkın/sel tehlike bölgelerinin dışında yer alıyor.")
    if amenity_dist < 800:
        strengths.append(f"Toplu taşıma ve ana arterlere çok yakın konumda (en yakın donatı {round(amenity_dist, 0)} metre).")
    if building_age < 10:
        strengths.append("Yeni ve modern deprem yönetmeliklerine uygun bina yaş sınıfında.")
    if police_dist < 800:
        strengths.append(f"Emniyet birimlerine (Karakol) çok yakın konumda ({round(police_dist, 0)} metre). Asayiş güvenliği yüksek.")
    if security_score < 35:
        strengths.append("Asayiş risk endeksi düşük, suç oranı minimal ve huzurlu bir lokasyonda yer alıyor.")
    if walkability_score >= 75:
        strengths.append(f"Yüksek yaşanabilirlik oranına sahip ({round(walkability_score, 0)}/100). Toplu taşıma imkanları ve sosyal donatılar çok zengin.")
    if environmental_risk_score < 25:
        strengths.append("Sanayi bölgelerinden ve otoyol gürültüsünden uzak, temiz ve sakin bir çevre yapısına sahip.")
        
    if not strengths:
        strengths.append("Bölge, şehir merkezine ve ana otoyollara erişim kolaylığına sahiptir.")

    # Zayıf yönler
    if fault_dist < 5.0:
        weaknesses.append(f"Fay hattına oldukça yakın konumda ({round(fault_dist, 1)} km). Sismik aktivite riski çok yüksek.")
    if "Zemin Sınıfı E" in soil_type:
        weaknesses.append("Yüksek deprem büyütmesi ve sıvılaşma potansiyeli olan gevşek killi/alüvyon zemin yapısı.")
    if is_in_flood:
        weaknesses.append(f"Taşkın yatağı içerisinde yer alıyor. {flood_risk_level} derecede sel ve su baskını riski.")
    if building_age > 25:
        weaknesses.append(f"Bina yaşının yüksek olması ({building_age} yıl) yapısal yorgunluk ve eski yönetmelik riskini beraberinde getirir.")
    if min_transit_dist > 2500:
        weaknesses.append("Merkezi ulaşım ağlarına (metro, metrobüs, vapur) uzak mesafe.")
    if security_score >= 65:
        weaknesses.append(f"Bölgesel asayiş risk skoru yüksek. En yakın olay yoğunluk merkezine mesafe {round(incident_dist, 0)} metre.")
    if environmental_risk_score >= 60:
        weaknesses.append(f"Sanayi ve otoyol hatlarına yakınlık kaynaklı gürültü ve hava kirliliği riski yüksek ({round(environmental_risk_score, 0)}/100).")
    if walkability_score < 40:
        weaknesses.append("Toplu taşıma ağlarına erişim kısıtlı, yaşanabilirlik endeksi düşük.")
        
    if not weaknesses:
        weaknesses.append("Önemli bir coğrafi veya yapısal risk unsuru saptanmamıştır.")

    # Öneriler
    if building_age > 15:
        recommendations.append("Binaya ait Deprem Dayanıklılık ve Karot Testi raporlarını talep edin.")
    if fault_dist < 10.0 or "Zemin Sınıfı E" in soil_type:
        recommendations.append("Bina temel tipini kontrol edin (Radye temel ve fore kazık uygulamaları araştırılmalıdır).")
    if is_in_flood:
        recommendations.append("Bodrum kat su yalıtımı ve bölgedeki drenaj hatlarının kapasitesini sorgulayın. Sel sigortasını genişletin.")
    if security_score >= 50:
        recommendations.append("Gayrimenkul için 7/24 kamera sistemi ve alarm gibi ek güvenlik donanımlarını değerlendirin.")
    if police_dist > 2000:
        recommendations.append("Emniyet birimlerine mesafe uzak olduğundan site içi güvenlik veya akıllı kilit sistemleri tercih edilmelidir.")
    if environmental_risk_score >= 50:
        recommendations.append("Mülk için ses yalıtımlı çift cam sistemleri tercih edilmeli ve binanın hava filtrasyon altyapısı araştırılmalıdır.")
    if overall_risk_score > 60:
        recommendations.append("Yüksek risk puanından ötürü fiyat pazarlığında emlak iskontosu (%15-%30) talep edin.")
        
    recommendations.append("Mevcut mülk için DASK poliçesini ve özel konut sigortasını güncel bedeller üzerinden yaptırın.")

    # Özet metin oluşturma
    level_expl = {
        "Güvenli": "Son derece güvenli bir coğrafi konumda ve sağlam zemin üzerinde yer almaktadır.",
        "Düşük Riskli": "Coğrafi açıdan düşük risk grubunda olup, emlak değeri kararlı bir yapı sergilemektedir.",
        "Orta Riskli": "Çevresindeki fay hatları veya zemin yapısı nedeniyle orta derecede risk taşımaktadır. Yapısal durumun incelenmesi önerilir.",
        "Yüksek Riskli": "Fay hattına yakınlık veya sel yatağı konumu nedeniyle yüksek risk altındadır. Yatırım ve yaşam kararlarında tedbirli olunmalıdır."
    }
    
    summary = f"Bu konum için yapılan analizlerde genel risk puanı 100 üzerinden {overall_risk_score} olarak hesaplanmış ve bölge '{overall_level}' sınıfına dahil edilmiştir. {level_expl[overall_level]}"
    if fault_dist < 10.0:
        summary += f" Fay hattına olan {round(fault_dist, 1)} km yakınlık sismik güvenliği en çok etkileyen faktördür."
    
    ai_report = AIReport(
        summary=summary,
        strengths=strengths,
        weaknesses=weaknesses,
        recommendations=recommendations
    )
    
    return AnalysisResponse(
        coordinate=Coordinate(latitude=lat, longitude=lon),
        overall_risk_score=overall_risk_score,
        risk_level=overall_level,
        risk_factors=risk_factors,
        geographical_data=GeographicalData(
            nearest_fault_distance_km=spatial_metrics["nearest_fault_distance_km"],
            is_in_flood_zone=spatial_metrics["is_in_flood_zone"],
            soil_type=spatial_metrics["soil_type"],
            landslide_risk=spatial_metrics["landslide_risk"],
            nearest_amenity_distance_m=spatial_metrics["nearest_amenity_distance_m"],
            security=SecurityData(
                nearest_police_distance_m=spatial_metrics["nearest_police_distance_m"],
                nearest_incident_distance_m=spatial_metrics["nearest_incident_distance_m"],
                nearest_incident_name=spatial_metrics["nearest_incident_name"],
                nearest_incident_severity=spatial_metrics["nearest_incident_severity"],
                security_index="Güvenli" if security_score < 40 else ("Orta" if security_score < 70 else "Riskli")
            ),
            nearest_metro_distance_m=spatial_metrics["nearest_metro_distance_m"],
            nearest_vapur_distance_m=spatial_metrics["nearest_vapur_distance_m"],
            nearest_metrobus_distance_m=spatial_metrics["nearest_metrobus_distance_m"],
            nearest_industry_distance_m=spatial_metrics["nearest_industry_distance_m"],
            nearest_highway_distance_m=spatial_metrics["nearest_highway_distance_m"],
            walkability_score=walkability_score,
            environmental_risk_score=environmental_risk_score
        ),
        valuation=valuation,
        ai_report=ai_report,
        security_hotspots_geojson=spatial_metrics["security_hotspots_geojson"],
        amenities_geojson=spatial_metrics["amenities_geojson"]
    )
