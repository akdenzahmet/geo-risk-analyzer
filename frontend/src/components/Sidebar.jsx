import React from "react";
import { 
  MapPin, 
  Building2, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  ShieldAlert, 
  Activity, 
  Droplet, 
  Layers, 
  ThumbsUp, 
  ThumbsDown, 
  CheckCircle,
  HelpCircle,
  Columns,
  RefreshCw,
  Info,
  X,
  Code
} from "lucide-react";
import RiskGauge from "./RiskGauge";
import RiskCharts from "./RiskCharts";
import RadarChart from "./RadarChart";

const Sidebar = ({ 
  selectedCoords, 
  analysisData, 
  loading, 
  propertyType, 
  setPropertyType, 
  buildingAge, 
  setBuildingAge,
  onReanalyze,
  
  // Karşılaştırma Modu Propları
  compareMode,
  onToggleCompareMode,
  coordsA,
  analysisDataA,
  coordsB,
  analysisDataB,
  loadingB,

  // Mobil Uyumluluk Propları
  mobileSidebarOpen,
  setMobileSidebarOpen,
  onOpenConsole
}) => {

  // Sürükleme (Swipe/Drag) mekanizması için React ref ve durum tanımlamaları
  const sidebarRef = React.useRef(null);
  const touchStartY = React.useRef(0);
  const isDragging = React.useRef(false);

  const handleTouchStart = (e) => {
    if (window.innerWidth > 768) return;
    const touch = e.touches[0];
    touchStartY.current = touch.clientY;
    isDragging.current = true;
    if (sidebarRef.current) {
      sidebarRef.current.style.transition = 'none'; // Sürüklerken animasyon gecikmesini kapat
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current) return;
    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStartY.current;
    
    // Panel sadece aşağı kaydırılarak kapatılabilir, yukarı kaydırmaya ise elastik direnç eklenir
    let newTranslateY = deltaY;
    if (newTranslateY < 0) {
      newTranslateY = newTranslateY * 0.2; // Direnç katsayısı
    }
    
    if (sidebarRef.current) {
      sidebarRef.current.style.transform = `translateY(${newTranslateY}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    
    if (sidebarRef.current) {
      sidebarRef.current.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
      
      const currentTransform = sidebarRef.current.style.transform;
      const match = currentTransform.match(/translateY\((-?\d+(\.\d+)?)px\)/);
      const draggedDistance = match ? parseFloat(match[1]) : 0;
      
      if (draggedDistance > 100) {
        // 100 pikselden fazla aşağı kaydırıldıysa paneli kapat
        setMobileSidebarOpen(false);
        setTimeout(() => {
          if (sidebarRef.current) {
            sidebarRef.current.style.transform = '';
          }
        }, 300);
      } else {
        // Aksi takdirde paneli eski konumuna sıçrat
        sidebarRef.current.style.transform = 'translateY(0px)';
        setTimeout(() => {
          if (sidebarRef.current) {
            sidebarRef.current.style.transform = '';
          }
        }, 400);
      }
    }
  };

  const formatCurrency = (value) => {
    if (!value) return "₺0";
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0
    }).format(value);
  };

  // Radar grafik verilerinin tekli mod için hazırlanması
  const getRadarData = (data) => {
    if (!data) return {};
    
    const getFactorScore = (name) => {
      const factor = data.risk_factors.find(f => f.name.includes(name));
      return factor ? factor.score : 50;
    };

    const eqRisk = getFactorScore("Deprem");
    const floodRisk = getFactorScore("Sel");
    const soilRisk = getFactorScore("Zemin");
    const securityRisk = getFactorScore("Asayiş");
    
    // Ulaşım kolaylığı: Yaşanabilirlik skoruna göre doğrudan eşleme
    const transportScore = data.geographical_data.walkability_score ?? 50;

    return {
      earthquakeSafety: Math.round(100 - eqRisk),
      floodSafety: Math.round(100 - floodRisk),
      soilSafety: Math.round(100 - soilRisk),
      securitySafety: Math.round(100 - securityRisk),
      transportSafety: Math.round(transportScore)
    };
  };

  return (
    <div 
      ref={sidebarRef}
      style={{
        ...styles.sidebar,
        width: compareMode ? "520px" : "400px",
      }} 
      className={`glass-panel sidebar-responsive ${mobileSidebarOpen ? "open" : "closed"}`}
    >
      {/* Mobilde kapatma/sürükleme elemanları */}
      <div 
        className="mobile-drag-handle" 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      ></div>
      <button className="mobile-close-btn" onClick={() => setMobileSidebarOpen(false)}>
        <X size={16} />
      </button>

      {/* Logo / Başlık (Sürükleme buraya da duyarlıdır) */}
      <div 
        style={styles.brand}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div style={styles.logoIcon}>
          <Activity size={20} color="var(--accent-cyan)" />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={styles.brandName}>Antigravity Geo-Risk</h1>
          <p style={styles.brandSub}>AI Destekli Emlak ve Risk Analizi</p>
        </div>
      </div>

      {/* Mod Değiştirme Butonu (Tekli / Karşılaştırma) */}
      <div style={styles.modeToggleRow}>
        <button
          onClick={onToggleCompareMode}
          style={{
            ...styles.toggleBtn,
            borderColor: !compareMode ? "var(--accent-cyan)" : "transparent",
            backgroundColor: !compareMode ? "rgba(6, 182, 212, 0.08)" : "transparent",
            color: !compareMode ? "var(--text-primary)" : "var(--text-secondary)"
          }}
        >
          <Activity size={14} />
          Tekli Analiz
        </button>
        <button
          onClick={onToggleCompareMode}
          style={{
            ...styles.toggleBtn,
            borderColor: compareMode ? "var(--success)" : "transparent",
            backgroundColor: compareMode ? "rgba(16, 185, 129, 0.08)" : "transparent",
            color: compareMode ? "var(--text-primary)" : "var(--text-secondary)"
          }}
        >
          <Columns size={14} />
          Karşılaştırma Modu
        </button>
      </div>

      {/* Parametre Girişleri */}
      <div style={styles.paramsCard}>
        <h3 style={styles.sectionHeader}>Analiz Parametreleri</h3>
        <div style={styles.formGroup}>
          <div style={styles.inputWrapper}>
            <Building2 size={16} color="var(--text-muted)" style={styles.inputIcon} />
            <select 
              value={propertyType} 
              onChange={(e) => setPropertyType(e.target.value)}
              style={styles.select}
              className="input-premium"
            >
              <option value="apartment">Apartman Dairesi</option>
              <option value="house">Müstakil Konut</option>
              <option value="commercial">Ticari Mülk (Dükkan/Ofis)</option>
            </select>
          </div>
        </div>
        
        <div style={styles.formGroup}>
          <div style={styles.labelRow}>
            <span style={styles.sliderLabel}>
              <Calendar size={14} color="var(--text-muted)" /> Bina Yaşı: <b>{buildingAge} yıl</b>
            </span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="60" 
            value={buildingAge} 
            onChange={(e) => setBuildingAge(parseInt(e.target.value))}
            style={styles.slider}
          />
          <div style={styles.sliderTicks}>
            <span>Yeni (0)</span>
            <span>30 Yıl</span>
            <span>60+ Yıl</span>
          </div>
        </div>

        {(selectedCoords || coordsA || coordsB) && (
          <button 
            onClick={onReanalyze} 
            disabled={loading || loadingB}
            className="btn-premium"
            style={styles.reanalyzeBtn}
          >
            <RefreshCw size={14} />
            {loading || loadingB ? "Hesaplanıyor..." : "Parametreleri Güncelle"}
          </button>
        )}
        <button 
          onClick={onOpenConsole}
          className="btn-devconsole"
          style={styles.devConsoleBtn}
        >
          <Code size={14} />
          <span>Sistem & PostGIS Motoru</span>
        </button>
      </div>

      <div style={styles.contentArea}>
        {/* ==================== KARŞILAŞTIRMA MODU AKTİFSE ==================== */}
        {compareMode ? (
          loading || loadingB ? (
            <div style={styles.centerContainer}>
              <div className="spinner"></div>
              <p style={styles.loadingText}>Konumsal Karşılaştırma Yapılıyor...</p>
              <p style={styles.loadingSub}>Her iki lokasyon için PostGIS ve AI endeksleri hesaplanmaktadır.</p>
            </div>
          ) : !coordsA && !coordsB ? (
            <div style={styles.centerContainer}>
              <div style={styles.emptyIconWrapper}>
                <MapPin size={36} className="pulse" color="var(--success)" />
              </div>
              <h3 style={styles.emptyTitle}>Karşılaştırma Modu Aktif</h3>
              <p style={styles.emptyText}>
                Harita üzerinden sırasıyla **Konum A** ve **Konum B** noktalarını seçerek yan yana risk ve değer kıyaslaması yapabilirsiniz.
              </p>
              <div style={styles.guideBox}>
                <span style={{ ...styles.guideTitle, color: "var(--success)" }}>Adım 1</span>
                <p style={styles.guideText}>Haritada birinci konuma (Konum A) tıklayın.</p>
              </div>
            </div>
          ) : coordsA && !coordsB ? (
            <div style={styles.centerContainer}>
              <div style={{ ...styles.emptyIconWrapper, borderColor: "rgba(249, 115, 22, 0.2)", backgroundColor: "rgba(249, 115, 22, 0.03)" }}>
                <MapPin size={36} className="pulse" color="#f97316" />
              </div>
              <h3 style={styles.emptyTitle}>Konum A Seçildi</h3>
              <p style={styles.emptyText}>
                Birinci konum kaydedildi. Şimdi karşılaştırma yapabilmek için haritada ikinci konumu seçmelisiniz.
              </p>
              <div style={styles.coordsHeader}>
                <span style={{ color: "var(--success)" }}>🟢 Konum A:</span>
                <span>{coordsA.lat.toFixed(4)}, {coordsA.lon.toFixed(4)}</span>
              </div>
              <div style={{ ...styles.guideBox, borderColor: "rgba(249, 115, 22, 0.2)", backgroundColor: "rgba(249, 115, 22, 0.02)", marginTop: "16px" }}>
                <span style={{ ...styles.guideTitle, color: "#f97316" }}>Adım 2</span>
                <p style={styles.guideText}>Haritada ikinci konuma (Konum B) tıklayın.</p>
              </div>
            </div>
          ) : analysisDataA && analysisDataB ? (
            /* İki lokasyon da yüklendiyse kıyaslama tablosunu göster */
            <div style={styles.resultsWrapper}>
              {/* Koordinatlar Başlıkları */}
              <div style={styles.compareCoordsRow}>
                <div style={{ ...styles.compareCoordBadge, borderColor: "var(--success)", color: "var(--success)" }}>
                  🟢 A: {coordsA.lat.toFixed(4)}, {coordsA.lon.toFixed(4)}
                </div>
                <div style={{ ...styles.compareCoordBadge, borderColor: "#f97316", color: "#f97316" }}>
                  🟠 B: {coordsB.lat.toFixed(4)}, {coordsB.lon.toFixed(4)}
                </div>
              </div>

              {/* Ortak Radar Kıyaslama Grafiği */}
              <div style={styles.compareTitleRow}>
                <h4 style={styles.subTitle}>Ortak Güvenlik & Ulaşım Radarı</h4>
              </div>
              <RadarChart 
                data={getRadarData(analysisDataA)} 
                dataB={getRadarData(analysisDataB)} 
                compareMode={true} 
              />

              {/* Yan Yana Karşılaştırma Grid Tablosu */}
              <h4 style={styles.subTitle}>Lokasyon Analiz Kıyaslaması</h4>
              <div style={styles.compareTable}>
                {/* Genel Risk Skoru */}
                <div style={styles.compareRow}>
                  <div style={styles.compareCellLabel}>Genel Coğrafi Risk</div>
                  <div style={{ ...styles.compareCellVal, color: "var(--success)", fontWeight: "bold" }}>
                    {analysisDataA.overall_risk_score}/100
                    <span style={{ fontSize: "0.65rem", display: "block", color: "var(--text-secondary)" }}>
                      ({analysisDataA.risk_level})
                    </span>
                  </div>
                  <div style={{ ...styles.compareCellVal, color: "#f97316", fontWeight: "bold" }}>
                    {analysisDataB.overall_risk_score}/100
                    <span style={{ fontSize: "0.65rem", display: "block", color: "var(--text-secondary)" }}>
                      ({analysisDataB.risk_level})
                    </span>
                  </div>
                </div>

                {/* Emlak Değeri */}
                <div style={styles.compareRow}>
                  <div style={styles.compareCellLabel}>Tahmini Emlak Değeri</div>
                  <div style={{ ...styles.compareCellVal, color: "#fff", fontWeight: "700" }}>
                    {formatCurrency(analysisDataA.valuation.estimated_m2_price_try)} <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>/ m²</span>
                  </div>
                  <div style={{ ...styles.compareCellVal, color: "#fff", fontWeight: "700" }}>
                    {formatCurrency(analysisDataB.valuation.estimated_m2_price_try)} <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>/ m²</span>
                  </div>
                </div>

                {/* Yatırım Skoru */}
                <div style={styles.compareRow}>
                  <div style={styles.compareCellLabel}>Yatırım Skoru</div>
                  <div style={{ ...styles.compareCellVal, color: "var(--accent-cyan)", fontWeight: "bold" }}>
                    {analysisDataA.valuation.investment_score}/100
                  </div>
                  <div style={{ ...styles.compareCellVal, color: "var(--accent-cyan)", fontWeight: "bold" }}>
                    {analysisDataB.valuation.investment_score}/100
                  </div>
                </div>

                {/* Yaşanabilirlik Skoru */}
                <div style={styles.compareRow}>
                  <div style={styles.compareCellLabel}>Yaşanabilirlik Skoru</div>
                  <div style={{ ...styles.compareCellVal, color: "var(--info)", fontWeight: "bold" }}>
                    {analysisDataA.geographical_data.walkability_score}/100
                  </div>
                  <div style={{ ...styles.compareCellVal, color: "var(--info)", fontWeight: "bold" }}>
                    {analysisDataB.geographical_data.walkability_score}/100
                  </div>
                </div>

                {/* Çevresel Risk */}
                <div style={styles.compareRow}>
                  <div style={styles.compareCellLabel}>Çevresel Risk & Gürültü</div>
                  <div style={{ ...styles.compareCellVal, color: "var(--danger)" }}>
                    {analysisDataA.geographical_data.environmental_risk_score}/100
                  </div>
                  <div style={{ ...styles.compareCellVal, color: "var(--danger)" }}>
                    {analysisDataB.geographical_data.environmental_risk_score}/100
                  </div>
                </div>

                {/* En Yakın Fay */}
                <div style={styles.compareRow}>
                  <div style={styles.compareCellLabel}>Fay Hattına Uzaklık</div>
                  <div style={styles.compareCellVal}>{analysisDataA.geographical_data.nearest_fault_distance_km} km</div>
                  <div style={styles.compareCellVal}>{analysisDataB.geographical_data.nearest_fault_distance_km} km</div>
                </div>

                {/* Metro İstasyonu */}
                <div style={styles.compareRow}>
                  <div style={styles.compareCellLabel}>Metro İstasyonuna Mesafe</div>
                  <div style={styles.compareCellVal}>
                    {analysisDataA.geographical_data.nearest_metro_distance_m > 1000 
                      ? `${(analysisDataA.geographical_data.nearest_metro_distance_m / 1000).toFixed(1)} km`
                      : `${Math.round(analysisDataA.geographical_data.nearest_metro_distance_m)} m`}
                  </div>
                  <div style={styles.compareCellVal}>
                    {analysisDataB.geographical_data.nearest_metro_distance_m > 1000 
                      ? `${(analysisDataB.geographical_data.nearest_metro_distance_m / 1000).toFixed(1)} km`
                      : `${Math.round(analysisDataB.geographical_data.nearest_metro_distance_m)} m`}
                  </div>
                </div>

                {/* Vapur İskelesi */}
                <div style={styles.compareRow}>
                  <div style={styles.compareCellLabel}>Vapur İskelesine Mesafe</div>
                  <div style={styles.compareCellVal}>
                    {analysisDataA.geographical_data.nearest_vapur_distance_m > 1000 
                      ? `${(analysisDataA.geographical_data.nearest_vapur_distance_m / 1000).toFixed(1)} km`
                      : `${Math.round(analysisDataA.geographical_data.nearest_vapur_distance_m)} m`}
                  </div>
                  <div style={styles.compareCellVal}>
                    {analysisDataB.geographical_data.nearest_vapur_distance_m > 1000 
                      ? `${(analysisDataB.geographical_data.nearest_vapur_distance_m / 1000).toFixed(1)} km`
                      : `${Math.round(analysisDataB.geographical_data.nearest_vapur_distance_m)} m`}
                  </div>
                </div>

                {/* Asayiş Durumu */}
                <div style={styles.compareRow}>
                  <div style={styles.compareCellLabel}>Asayiş / Güvenlik</div>
                  <div style={styles.compareCellVal}>{analysisDataA.geographical_data.security.security_index}</div>
                  <div style={styles.compareCellVal}>{analysisDataB.geographical_data.security.security_index}</div>
                </div>
              </div>

              {/* AI Kıyaslama Özetleri */}
              <div style={styles.compareAIBlock}>
                <h4 style={styles.subTitle}>AI Kıyaslama Görüşü</h4>
                <div style={styles.compareRow}>
                  <div style={{ ...styles.compareCellVal, textAlign: "left", fontSize: "0.78rem", padding: "10px", backgroundColor: "rgba(16, 185, 129, 0.02)", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ color: "var(--success)", fontWeight: "bold", display: "block", marginBottom: "4px" }}>Lokasyon A Analizi</span>
                    {analysisDataA.ai_report.summary.split(". ")[0]}.
                  </div>
                  <div style={{ ...styles.compareCellVal, textAlign: "left", fontSize: "0.78rem", padding: "10px", backgroundColor: "rgba(249, 115, 22, 0.02)" }}>
                    <span style={{ color: "#f97316", fontWeight: "bold", display: "block", marginBottom: "4px" }}>Lokasyon B Analizi</span>
                    {analysisDataB.ai_report.summary.split(". ")[0]}.
                  </div>
                </div>
              </div>
            </div>
          ) : null
        ) : null}

        {/* ==================== TEKLİ ANALİZ MODU AKTİFSE ==================== */}
        {!compareMode && (
          loading ? (
            /* Yükleniyor Durumu */
            <div style={styles.centerContainer}>
              <div className="spinner"></div>
              <p style={styles.loadingText}>Coğrafi Veriler Çekiliyor...</p>
              <p style={styles.loadingSub}>Fay hatları, sel bölgeleri ve emlak endeksleri hesaplanıyor.</p>
            </div>
          ) : !selectedCoords ? (
            /* Boş Durum (Haritada Tıklanmamış) */
            <div style={styles.centerContainer}>
              <div style={styles.emptyIconWrapper}>
                <MapPin size={36} className="pulse" color="var(--accent-cyan)" />
              </div>
              <h3 style={styles.emptyTitle}>Konum Seçilmedi</h3>
              <p style={styles.emptyText}>
                Gayrimenkul değerlemesi ve CBS risk analizini başlatmak için lütfen sağdaki haritadan bir noktaya tıklayın.
              </p>
              <div style={styles.guideBox}>
                <span style={styles.guideTitle}>İpucu</span>
                <p style={styles.guideText}>Beylerbeyi, Kadıköy veya Riva deresi çevresini seçerek risklerin ve donatıların değişimini test edebilirsiniz.</p>
              </div>
            </div>
          ) : analysisData ? (
            /* Veri Yüklendi Durumu */
            <div style={styles.resultsWrapper}>
              {/* Koordinat Gösterimi */}
              <div style={styles.coordsHeader}>
                <MapPin size={16} color="var(--accent-cyan)" />
                <span>{analysisData.coordinate.latitude.toFixed(5)}, {analysisData.coordinate.longitude.toFixed(5)}</span>
              </div>

              {/* Risk Gauge */}
              <RiskGauge 
                score={analysisData.overall_risk_score} 
                level={analysisData.risk_level} 
              />

              {/* Radar Grafik Analizi */}
              <RadarChart data={getRadarData(analysisData)} />

              {/* Değerleme Kartı */}
              <div style={styles.valuationCard}>
                <div style={styles.valuationHeader}>
                  <DollarSign size={18} color="var(--success)" />
                  <span style={styles.valTitle}>Tahmini Emlak Değeri</span>
                </div>
                <div style={styles.priceText}>
                  {formatCurrency(analysisData.valuation.estimated_m2_price_try)} <span style={styles.m2Unit}>/ m²</span>
                </div>
                <div style={styles.valStats}>
                  <div style={styles.valStatItem}>
                    <TrendingUp size={14} color="var(--accent-cyan)" />
                    <span style={styles.statLabel}>Yatırım Skoru:</span>
                    <span style={styles.statValue}>{analysisData.valuation.investment_score}/100</span>
                  </div>
                  <div style={styles.valStatItem}>
                    <HelpCircle size={14} color="var(--text-muted)" />
                    <span style={styles.statLabel}>Güven Endeksi:</span>
                    <span style={styles.statValue}>%{Math.round(analysisData.valuation.valuation_confidence * 100)}</span>
                  </div>
                </div>
              </div>

              {/* Coğrafi Bilgiler Izgarası */}
              <div style={styles.geoSection}>
                <h4 style={styles.subTitle}>Mekansal Analiz (CBS) Verileri</h4>
                <div className="info-grid">
                  <div className="info-card">
                    <span className="info-card-label">En Yakın Fay</span>
                    <span className="info-card-value">{analysisData.geographical_data.nearest_fault_distance_km} km</span>
                  </div>
                  <div className="info-card">
                    <span className="info-card-label">Taşkın Alanı</span>
                    <span className="info-card-value" style={{ color: analysisData.geographical_data.is_in_flood_zone ? "var(--danger)" : "var(--success)" }}>
                      {analysisData.geographical_data.is_in_flood_zone ? "İçinde" : "Dışında"}
                    </span>
                  </div>
                  
                  {/* Yaşanabilirlik Skoru */}
                  <div className="info-card">
                    <span className="info-card-label">Yaşanabilirlik</span>
                    <span className="info-card-value" style={{ color: "var(--info)" }}>
                      {analysisData.geographical_data.walkability_score}/100
                    </span>
                  </div>
                  
                  {/* Çevresel Risk */}
                  <div className="info-card">
                    <span className="info-card-label">Çevresel Risk</span>
                    <span className="info-card-value" style={{ color: analysisData.geographical_data.environmental_risk_score > 50 ? "var(--danger)" : "var(--success)" }}>
                      {analysisData.geographical_data.environmental_risk_score}/100
                    </span>
                  </div>

                  <div className="info-card" style={{ gridColumn: "span 2" }}>
                    <span className="info-card-label">Zemin Litolojisi</span>
                    <span className="info-card-value" style={{ fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={analysisData.geographical_data.soil_type}>
                      {analysisData.geographical_data.soil_type.split(" (")[0]}
                    </span>
                  </div>
                  <div className="info-card">
                    <span className="info-card-label">Heyelan Riski</span>
                    <span className="info-card-value">{analysisData.geographical_data.landslide_risk.split(" (")[0]}</span>
                  </div>
                  
                  {/* Metro */}
                  <div className="info-card">
                    <span className="info-card-label">En Yakın Metro</span>
                    <span className="info-card-value">
                      {analysisData.geographical_data.nearest_metro_distance_m > 1000 
                        ? `${(analysisData.geographical_data.nearest_metro_distance_m / 1000).toFixed(1)} km`
                        : `${Math.round(analysisData.geographical_data.nearest_metro_distance_m)} m`}
                    </span>
                  </div>

                  {/* Vapur */}
                  <div className="info-card">
                    <span className="info-card-label">En Yakın Vapur</span>
                    <span className="info-card-value">
                      {analysisData.geographical_data.nearest_vapur_distance_m > 1000 
                        ? `${(analysisData.geographical_data.nearest_vapur_distance_m / 1000).toFixed(1)} km`
                        : `${Math.round(analysisData.geographical_data.nearest_vapur_distance_m)} m`}
                    </span>
                  </div>

                  {/* Metrobüs */}
                  <div className="info-card">
                    <span className="info-card-label">En Yakın Metrobüs</span>
                    <span className="info-card-value">
                      {analysisData.geographical_data.nearest_metrobus_distance_m > 1000 
                        ? `${(analysisData.geographical_data.nearest_metrobus_distance_m / 1000).toFixed(1)} km`
                        : `${Math.round(analysisData.geographical_data.nearest_metrobus_distance_m)} m`}
                    </span>
                  </div>

                  {/* Emniyet */}
                  <div className="info-card">
                    <span className="info-card-label">Karakola Uzaklık</span>
                    <span className="info-card-value">
                      {analysisData.geographical_data.security?.nearest_police_distance_m > 1000
                        ? `${(analysisData.geographical_data.security.nearest_police_distance_m / 1000).toFixed(1)} km`
                        : `${Math.round(analysisData.geographical_data.security?.nearest_police_distance_m || 0)} m`}
                    </span>
                  </div>
                  <div className="info-card" style={{ gridColumn: "span 2" }}>
                    <span className="info-card-label">Asayiş Durumu</span>
                    <span className="info-card-value" style={{ 
                      color: analysisData.geographical_data.security?.security_index === "Güvenli" ? "var(--success)" : 
                             analysisData.geographical_data.security?.security_index === "Orta" ? "var(--warning)" : "var(--danger)"
                    }}>
                      {analysisData.geographical_data.security?.security_index || "Bilinmiyor"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Risk Grafikleri */}
              <RiskCharts factors={analysisData.risk_factors} />

              {/* Yapay Zeka Raporu */}
              <div style={styles.aiSection}>
                <h4 style={styles.subTitle}>Yapay Zeka Analiz Raporu</h4>
                
                <div style={styles.reportText} className="glass-panel">
                  <p>{analysisData.ai_report.summary}</p>
                </div>

                {/* Güçlü Yönler */}
                <div className="report-section">
                  <span className="report-section-title" style={{ color: "var(--success)" }}>
                    <ThumbsUp size={14} /> Güçlü Yönler
                  </span>
                  <ul style={styles.reportList}>
                    {analysisData.ai_report.strengths.map((str, idx) => (
                      <li key={idx} style={styles.reportItem}>
                        <span style={{ ...styles.listDot, backgroundColor: "var(--success)" }} />
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Zayıf Yönler */}
                <div className="report-section">
                  <span className="report-section-title" style={{ color: "var(--danger)" }}>
                    <ThumbsDown size={14} /> Riskli Yönler
                  </span>
                  <ul style={styles.reportList}>
                    {analysisData.ai_report.weaknesses.map((weak, idx) => (
                      <li key={idx} style={styles.reportItem}>
                        <span style={{ ...styles.listDot, backgroundColor: "var(--danger)" }} />
                        <span>{weak}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Öneriler */}
                <div className="report-section">
                  <span className="report-section-title" style={{ color: "var(--info)" }}>
                    <CheckCircle size={14} /> Aksiyon Önerileri
                  </span>
                  <ul style={styles.reportList}>
                    {analysisData.ai_report.recommendations.map((rec, idx) => (
                      <li key={idx} style={styles.reportItem}>
                        <span style={{ ...styles.listDot, backgroundColor: "var(--info)" }} />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

            </div>
          ) : null
        )}
      </div>
    </div>
  );
};

const styles = {
  sidebar: {
    position: "absolute",
    top: "20px",
    left: "20px",
    bottom: "20px",
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
    padding: "16px 20px",
    overflow: "hidden",
    color: "var(--text-primary)",
    transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "12px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    paddingBottom: "8px",
  },
  logoIcon: {
    backgroundColor: "rgba(6, 182, 212, 0.1)",
    border: "1px solid rgba(6, 182, 212, 0.3)",
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: "1.2rem",
    fontWeight: "800",
    letterSpacing: "-0.02em",
    background: "linear-gradient(90deg, #fff 0%, var(--text-secondary) 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  brandSub: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
  },
  modeToggleRow: {
    display: "flex",
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    borderRadius: "10px",
    padding: "4px",
    gap: "4px",
    border: "1px solid var(--glass-border)",
    marginBottom: "12px",
  },
  toggleBtn: {
    flex: 1,
    border: "1px solid transparent",
    padding: "6px 10px",
    borderRadius: "6px",
    fontSize: "0.78rem",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    transition: "var(--transition-smooth)",
  },
  paramsCard: {
    backgroundColor: "rgba(255, 255, 255, 0.015)",
    border: "1px solid rgba(255, 255, 255, 0.03)",
    borderRadius: "12px",
    padding: "10px 12px",
    marginBottom: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  sectionHeader: {
    fontSize: "0.72rem",
    fontWeight: "700",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  inputWrapper: {
    position: "relative",
    width: "100%",
  },
  inputIcon: {
    position: "absolute",
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
  },
  select: {
    paddingLeft: "36px",
    cursor: "pointer",
  },
  labelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sliderLabel: {
    fontSize: "0.78rem",
    color: "var(--text-secondary)",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  slider: {
    width: "100%",
    accentColor: "var(--accent-cyan)",
    cursor: "pointer",
    height: "4px",
    marginTop: "4px",
  },
  sliderTicks: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.62rem",
    color: "var(--text-muted)",
    marginTop: "2px",
  },
  reanalyzeBtn: {
    marginTop: "2px",
    width: "100%",
    fontSize: "0.82rem",
    padding: "8px",
  },
  contentArea: {
    flex: 1,
    overflowY: "auto",
    paddingRight: "4px",
    marginTop: "4px",
  },
  centerContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    padding: "30px 10px",
    textAlign: "center",
  },
  emptyIconWrapper: {
    width: "54px",
    height: "54px",
    borderRadius: "50%",
    backgroundColor: "rgba(6, 182, 212, 0.04)",
    border: "1px solid rgba(6, 182, 212, 0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "14px",
  },
  emptyTitle: {
    fontSize: "0.95rem",
    fontWeight: "700",
    marginBottom: "6px",
  },
  emptyText: {
    fontSize: "0.78rem",
    color: "var(--text-secondary)",
    lineHeight: "1.4",
    marginBottom: "16px",
  },
  guideBox: {
    backgroundColor: "rgba(6, 182, 212, 0.02)",
    border: "1px dashed rgba(6, 182, 212, 0.15)",
    borderRadius: "10px",
    padding: "8px 12px",
    textAlign: "left",
    width: "100%",
  },
  guideTitle: {
    fontSize: "0.72rem",
    fontWeight: "700",
    color: "var(--accent-cyan)",
    textTransform: "uppercase",
    display: "block",
    marginBottom: "2px",
  },
  guideText: {
    fontSize: "0.72rem",
    color: "var(--text-secondary)",
    lineHeight: "1.3",
  },
  loadingText: {
    marginTop: "14px",
    fontSize: "0.85rem",
    fontWeight: "600",
  },
  loadingSub: {
    fontSize: "0.72rem",
    color: "var(--text-muted)",
    marginTop: "4px",
    lineHeight: "1.3",
  },
  resultsWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  coordsHeader: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
    backgroundColor: "rgba(255, 255, 255, 0.015)",
    border: "1px solid rgba(255, 255, 255, 0.03)",
    padding: "5px 10px",
    borderRadius: "8px",
    alignSelf: "center",
  },
  valuationCard: {
    background: "linear-gradient(135deg, rgba(16, 185, 129, 0.04) 0%, rgba(6, 182, 212, 0.04) 100%)",
    border: "1px solid rgba(16, 185, 129, 0.12)",
    borderRadius: "12px",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  valuationHeader: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  valTitle: {
    fontSize: "0.75rem",
    fontWeight: "700",
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  priceText: {
    fontSize: "1.5rem",
    fontWeight: "800",
    color: "#fff",
    display: "flex",
    alignItems: "baseline",
    gap: "4px",
  },
  m2Unit: {
    fontSize: "0.85rem",
    fontWeight: "500",
    color: "var(--text-secondary)",
  },
  valStats: {
    display: "flex",
    justifyContent: "space-between",
    borderTop: "1px solid rgba(255, 255, 255, 0.04)",
    paddingTop: "6px",
    marginTop: "2px",
  },
  valStatItem: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "0.72rem",
  },
  statLabel: {
    color: "var(--text-muted)",
  },
  statValue: {
    fontWeight: "700",
    color: "var(--text-primary)",
  },
  geoSection: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  subTitle: {
    fontSize: "0.8rem",
    fontWeight: "700",
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  aiSection: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "4px",
  },
  reportText: {
    padding: "10px",
    fontSize: "0.78rem",
    lineHeight: "1.4",
    color: "var(--text-secondary)",
    backgroundColor: "rgba(15, 23, 42, 0.25)",
    borderRadius: "8px",
  },
  reportList: {
    listStyleType: "none",
    paddingLeft: 0,
    marginTop: "4px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  reportItem: {
    fontSize: "0.75rem",
    lineHeight: "1.35",
    color: "var(--text-primary)",
    display: "flex",
    alignItems: "flex-start",
    gap: "6px",
  },
  listDot: {
    width: "5px",
    height: "5px",
    borderRadius: "50%",
    marginTop: "5px",
    flexShrink: 0,
  },
  
  // Karşılaştırma Modu Ek CSS Yapısı
  compareCoordsRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "8px",
  },
  compareCoordBadge: {
    flex: 1,
    padding: "6px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.06)",
    backgroundColor: "rgba(255,255,255,0.01)",
    fontSize: "0.75rem",
    fontWeight: "600",
    textAlign: "center",
  },
  compareTitleRow: {
    display: "flex",
    justifyContent: "center",
    marginTop: "4px",
  },
  compareTable: {
    display: "flex",
    flexDirection: "column",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: "12px",
    overflow: "hidden",
    backgroundColor: "rgba(15, 23, 42, 0.2)",
  },
  compareRow: {
    display: "flex",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    minHeight: "44px",
    alignItems: "center",
  },
  compareCellLabel: {
    flex: 1.4,
    padding: "8px 10px",
    fontSize: "0.74rem",
    color: "var(--text-secondary)",
    fontWeight: "500",
    borderRight: "1px solid rgba(255,255,255,0.04)",
  },
  compareCellVal: {
    flex: 1,
    padding: "8px 10px",
    fontSize: "0.76rem",
    textAlign: "center",
    color: "var(--text-primary)",
  },
  compareAIBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: "12px",
    overflow: "hidden",
    marginTop: "4px",
  },
  devConsoleBtn: {
    marginTop: "6px",
    width: "100%",
    fontSize: "0.82rem",
    padding: "8px",
  }
};

export default Sidebar;
