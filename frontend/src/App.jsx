import React, { useState } from "react";
import { Sliders, X, Code } from "lucide-react";
import MapView from "./components/MapView";
import Sidebar from "./components/Sidebar";
import { isPointInIstanbul } from "./constants/istanbulBounds";

const API_BASE_URL = `http://${window.location.hostname}:8081/api`;

// Uygulama çalışma zamanı (runtime) hatalarını ekranda göstermek için Error Boundary
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uygulama hatası yakalandı:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "40px", color: "#ef4444", backgroundColor: "#0b0f19", height: "100vh", fontFamily: "sans-serif", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
          <h2 style={{ marginBottom: "16px" }}>Uygulama Çalışırken Bir Hata Oluştu!</h2>
          <p style={{ color: "#94a3b8", marginBottom: "20px" }}>Aşağıdaki hata detayını geliştiriciye iletebilirsiniz:</p>
          <pre style={{ backgroundColor: "#1e293b", padding: "20px", borderRadius: "8px", overflow: "auto", color: "#f8fafc", maxWidth: "800px", textAlign: "left", fontSize: "0.85rem", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
            {this.state.error ? this.state.error.stack : "Bilinmeyen Hata"}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            style={{ marginTop: "24px", padding: "10px 24px", backgroundColor: "#3b82f6", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}
          >
            Sayfayı Yenile
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

const App = () => {
  // Eyalet (State) Yönetimi - Tekli Mod
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Karşılaştırma Modu Eyaletleri
  const [compareMode, setCompareMode] = useState(false);
  const [coordsA, setCoordsA] = useState(null);
  const [analysisDataA, setAnalysisDataA] = useState(null);
  const [coordsB, setCoordsB] = useState(null);
  const [analysisDataB, setAnalysisDataB] = useState(null);
  const [loadingB, setLoadingB] = useState(false);
  
  // Parametre Eyaletleri
  const [propertyType, setPropertyType] = useState("apartment");
  const [buildingAge, setBuildingAge] = useState(5);
  
  // Mobil Uyumluluk Eyaleti
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [showConsole, setShowConsole] = useState(false);

  const getSQLQueries = (lat, lon) => {
    if (!lat || !lon) return "-- Lütfen haritadan bir konum seçin...";
    return `/* === POSTGIS MEKANSAL CBS SORGULARI (LOKASYON: ${lat.toFixed(5)}, ${lon.toFixed(5)}) === */

-- 1. En Yakın Fay Hattına Olan Coğrafi Uzaklık (ST_Distance & ST_Transform)
SELECT 
  name AS fay_hatti, 
  ST_Distance(
    ST_Transform(geom, 3857), 
    ST_Transform(ST_SetSRID(ST_Point(${lon.toFixed(5)}, ${lat.toFixed(5)}), 4326), 3857)
  ) / 1000.0 AS mesafe_km 
FROM fault_lines 
ORDER BY geom <-> ST_SetSRID(ST_Point(${lon.toFixed(5)}, ${lat.toFixed(5)}), 4326) -- GIST Index Taraması (KNN)
LIMIT 1;

-- 2. Sel ve Taşkın Havzası Kapsama Kontrolü (ST_Contains)
SELECT 
  name AS havza_adi, 
  risk_level 
FROM flood_zones 
WHERE ST_Contains(
  geom, 
  ST_SetSRID(ST_Point(${lon.toFixed(5)}, ${lat.toFixed(5)}), 4326)
) LIMIT 1;

-- 3. En Yakın Sosyal Donatılara (Metro, Metrobüs, Vapur) Uzaklık (ST_Distance)
SELECT 
  name AS donati_adi, 
  type AS donati_turu,
  ST_Distance(
    cast(geom as geography), 
    cast(ST_SetSRID(ST_Point(${lon.toFixed(5)}, ${lat.toFixed(5)}), 4326) as geography)
  ) AS mesafe_metre
FROM amenities 
WHERE type IN ('metro', 'metrobus', 'vapur') 
ORDER BY geom <-> ST_SetSRID(ST_Point(${lon.toFixed(5)}, ${lat.toFixed(5)}), 4326)
LIMIT 1;`;
  };

  const getAIPayload = (coords, data) => {
    if (!coords || !data) return "{\n  \"message\": \"Analiz verisi bekleniyor...\"\n}";
    return JSON.stringify({
      agent: "Antigravity Geo-Risk Agent",
      version: "v1.2",
      context: {
        latitude: coords.lat,
        longitude: coords.lon,
        parameters: {
          property_type: propertyType === "apartment" ? "Apartman Dairesi" : propertyType === "house" ? "Müstakil Konut" : "Ticari Mülk",
          building_age: buildingAge
        },
        postgis_metrics: {
          nearest_fault_km: data.geographical_data.nearest_fault_distance_km,
          is_in_flood_zone: data.geographical_data.is_in_flood_zone,
          flood_zone_risk: data.geographical_data.flood_zone_risk,
          soil_type: data.geographical_data.soil_type,
          walkability_score: data.geographical_data.walkability_score,
          environmental_risk_score: data.geographical_data.environmental_risk_score
        }
      },
      heuristic_model: {
        weights: {
          earthquake_safety: 0.50,
          flood_safety: 0.15,
          soil_stability: 0.15,
          security_index: 0.20
        },
        computed_risk_score: data.overall_risk_score,
        risk_level: data.risk_level
      }
    }, null, 2);
  };

  // Haritadan tıklama olayı
  const handleMapClick = async (lat, lon) => {
    // İstanbul gerçek coğrafi/idari sınırları kontrolü (Ray-Casting Algoritması)
    if (!isPointInIstanbul(lat, lon)) {
      alert(
        "Lütfen İstanbul sınırları içinde bir konum seçin!\n\n" +
        "Bu uygulama yalnızca İstanbul bölgesi için CBS (fay hatları, taşkın yatakları) ve gayrimenkul veri setlerini barındırmaktadır."
      );
      return;
    }

    // Mobilde konum seçildiğinde analizi hemen göstermek için paneli otomatik aç
    setMobileSidebarOpen(true);

    if (compareMode) {
      if (!coordsA) {
        setCoordsA({ lat, lon });
        await fetchAnalysis(lat, lon, propertyType, buildingAge, "A");
      } else if (!coordsB) {
        setCoordsB({ lat, lon });
        await fetchAnalysis(lat, lon, propertyType, buildingAge, "B");
      } else {
        // İkisi de doluyken tıklanırsa Konum B'yi yenisiyle değiştirer
        setCoordsB({ lat, lon });
        await fetchAnalysis(lat, lon, propertyType, buildingAge, "B");
      }
    } else {
      setSelectedCoords({ lat, lon });
      await fetchAnalysis(lat, lon, propertyType, buildingAge, null);
    }
  };

  // Yeniden analiz etme olayı (Bina yaşı veya mülk tipi değiştiğinde)
  const handleReanalyze = async () => {
    if (compareMode) {
      if (coordsA) {
        await fetchAnalysis(coordsA.lat, coordsA.lon, propertyType, buildingAge, "A");
      }
      if (coordsB) {
        await fetchAnalysis(coordsB.lat, coordsB.lon, propertyType, buildingAge, "B");
      }
    } else {
      if (!selectedCoords) return;
      await fetchAnalysis(selectedCoords.lat, selectedCoords.lon, propertyType, buildingAge, null);
    }
  };

  // Karşılaştırma modunu açıp kapatan ve state'leri temizleyen fonksiyon
  const handleToggleCompareMode = () => {
    setCompareMode(!compareMode);
    setCoordsA(null);
    setAnalysisDataA(null);
    setCoordsB(null);
    setAnalysisDataB(null);
    setSelectedCoords(null);
    setAnalysisData(null);
  };

  // API'den analiz verisini çeken fonksiyon
  const fetchAnalysis = async (lat, lon, type, age, compareKey = null) => {
    if (compareKey === "B") {
      setLoadingB(true);
      setAnalysisDataB(null);
    } else if (compareKey === "A") {
      setLoading(true);
      setAnalysisDataA(null);
    } else {
      setLoading(true);
      setAnalysisData(null); // Eski veriyi temizle
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          latitude: lat,
          longitude: lon,
          property_type: type,
          building_age: age
        }),
      });

      if (!response.ok) {
        throw new Error("API sunucusu hata döndürdü!");
      }

      const data = await response.json();
      
      if (compareKey === "A") {
        setAnalysisDataA(data);
      } else if (compareKey === "B") {
        setAnalysisDataB(data);
      } else {
        setAnalysisData(data);
      }
    } catch (err) {
      console.error("Analiz çağrısı başarısız:", err);
      alert(
        "Backend Sunucusuyla İletişim Kurulamadı!\n\n" +
        "Lütfen FastAPI uygulamasının 8081 portunda çalıştığından emin olun."
      );
      if (compareKey === "A") setCoordsA(null);
      else if (compareKey === "B") setCoordsB(null);
      else setSelectedCoords(null);
    } finally {
      if (compareKey === "B") setLoadingB(false);
      else setLoading(false);
    }
  };

  return (
    <div style={styles.appContainer}>
      {/* Sol Panel: Kontroller, Analiz ve AI Raporu */}
      <Sidebar
        selectedCoords={selectedCoords}
        analysisData={analysisData}
        loading={loading}
        propertyType={propertyType}
        setPropertyType={setPropertyType}
        buildingAge={buildingAge}
        setBuildingAge={setBuildingAge}
        onReanalyze={handleReanalyze}
        
        // Karşılaştırma Modu Propları
        compareMode={compareMode}
        onToggleCompareMode={handleToggleCompareMode}
        coordsA={coordsA}
        analysisDataA={analysisDataA}
        coordsB={coordsB}
        analysisDataB={analysisDataB}
        loadingB={loadingB}

        // Mobil Uyumluluk Propları
        mobileSidebarOpen={mobileSidebarOpen}
        setMobileSidebarOpen={setMobileSidebarOpen}
        onOpenConsole={() => setShowConsole(true)}
      />

      {/* Sağ Arka Plan: Harita Alanı */}
      <MapView
        selectedCoords={compareMode ? null : selectedCoords}
        onMapClick={handleMapClick}
        securityData={
          compareMode
            ? (analysisDataA?.security_hotspots_geojson || analysisDataB?.security_hotspots_geojson)
            : analysisData?.security_hotspots_geojson
        }
        amenitiesData={
          compareMode
            ? (analysisDataA?.amenities_geojson || analysisDataB?.amenities_geojson)
            : analysisData?.amenities_geojson
        }
        compareMode={compareMode}
        coordsA={coordsA}
        coordsB={coordsB}
      />
      {/* Mobilde Sol Paneli Açma Butonu */}
      {!mobileSidebarOpen && (
        <button 
          onClick={() => setMobileSidebarOpen(true)}
          className="mobile-toggle-btn glass-panel"
          style={styles.mobileOpenBtn}
        >
          <Sliders size={16} color="var(--accent-cyan)" />
          <span>Parametreler & Rapor</span>
        </button>
      )}
      {/* ==================== SYSTEM & POSTGIS DEVCONSOLE MODAL ==================== */}
      {showConsole && (
        <div style={styles.modalOverlay} onClick={() => setShowConsole(false)}>
          <div style={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Code size={20} color="var(--accent-cyan)" />
                <h3 style={styles.modalTitle}>Sistem Altyapısı & PostGIS Analiz Motoru</h3>
              </div>
              <button className="modal-close-btn-hover" style={styles.modalCloseBtn} onClick={() => setShowConsole(false)}>
                <X size={18} />
              </button>
            </div>
            
            {/* Body */}
            <div style={styles.modalBody}>
              <p style={styles.modalIntro}>
                Bu konsol, haritadan seçilen koordinatlar için arka planda koşan gerçek **PostGIS** konumsal veri tabanı sorgularını 
                ve **Antigravity AI Agent** Heuristic veri yapısını canlı olarak göstermektedir.
              </p>
              
              <div style={styles.consoleGrid}>
                {/* Sol Taraf: Heuristic Ağırlıklar ve AI Payload */}
                <div style={styles.consoleCard}>
                  <h4 style={styles.consoleCardTitle}>🧠 Antigravity AI Engine (API Payload)</h4>
                  <p style={styles.consoleCardDesc}>
                    PostGIS'ten çekilen mekansal veriler, aşağıdaki ağırlıklar kullanılarak AI modeline beslenmektedir.
                  </p>
                  
                  {/* Ağırlık Barları */}
                  <div style={styles.weightList}>
                    <div style={styles.weightItem}>
                      <span style={styles.weightLabel}>🌋 Deprem Güvenliği Ağırlığı:</span>
                      <span style={styles.weightVal}>%50</span>
                    </div>
                    <div style={styles.weightBarContainer}>
                      <div style={{ ...styles.weightBar, width: "50%", backgroundColor: "var(--danger)" }}></div>
                    </div>
                    
                    <div style={styles.weightItem}>
                      <span style={styles.weightLabel}>🌊 Sel Güvenliği Ağırlığı:</span>
                      <span style={styles.weightVal}>%15</span>
                    </div>
                    <div style={styles.weightBarContainer}>
                      <div style={{ ...styles.weightBar, width: "15%", backgroundColor: "var(--info)" }}></div>
                    </div>
                    
                    <div style={styles.weightItem}>
                      <span style={styles.weightLabel}>🪨 Zemin Sağlamlığı Ağırlığı:</span>
                      <span style={styles.weightVal}>%15</span>
                    </div>
                    <div style={styles.weightBarContainer}>
                      <div style={{ ...styles.weightBar, width: "15%", backgroundColor: "var(--warning)" }}></div>
                    </div>
                    
                    <div style={styles.weightItem}>
                      <span style={styles.weightLabel}>🛡️ Asayiş Güvenliği Ağırlığı:</span>
                      <span style={styles.weightVal}>%20</span>
                    </div>
                    <div style={styles.weightBarContainer}>
                      <div style={{ ...styles.weightBar, width: "20%", backgroundColor: "var(--success)" }}></div>
                    </div>
                  </div>
                  
                  {/* JSON Payload */}
                  <div style={{ marginTop: "14px", flex: 1, display: "flex", flexDirection: "column" }}>
                    <span style={styles.codeTitle}>JSON API Request Context:</span>
                    <pre style={styles.codeBlock}>
                      <code>
                        {compareMode 
                          ? `// [KARŞILAŞTIRMA MODU AKTİF]\n// -- LOKASYON A --\n${getAIPayload(coordsA, analysisDataA)}\n\n// -- LOKASYON B --\n${getAIPayload(coordsB, analysisDataB)}` 
                          : getAIPayload(selectedCoords, analysisData)
                        }
                      </code>
                    </pre>
                  </div>
                </div>
                
                {/* Sağ Taraf: PostGIS SQL Sorguları */}
                <div style={styles.consoleCard}>
                  <h4 style={styles.consoleCardTitle}>💾 PostgreSQL / PostGIS Spatial Queries</h4>
                  <p style={styles.consoleCardDesc}>
                    Konumsal veri tabanından en yakın donatıları bulmak ve poligon içi kontrolleri yapmak için koşan SQL kodları.
                  </p>
                  
                  <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <span style={styles.codeTitle}>PostGIS SQL Log:</span>
                    <pre style={{ ...styles.codeBlock, backgroundColor: "#020617" }}>
                      <code style={{ color: "#38bdf8" }}>
                        {compareMode
                          ? `-- [KARŞILAŞTIRMA MODU]\n-- === KONUM A SORGULARI ===\n${getSQLQueries(coordsA?.lat, coordsA?.lon)}\n\n-- === KONUM B SORGULARI ===\n${getSQLQueries(coordsB?.lat, coordsB?.lon)}`
                          : getSQLQueries(selectedCoords?.lat, selectedCoords?.lon)
                        }
                      </code>
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  appContainer: {
    width: "100vw",
    height: "100vh",
    position: "relative",
    overflow: "hidden",
    backgroundColor: "var(--bg-primary)",
  },
  mobileOpenBtn: {
    position: "fixed",
    left: "16px",
    top: "16px",
    zIndex: 99,
    padding: "10px 16px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "var(--glass-bg)",
    border: "1px solid var(--glass-border)",
    color: "var(--text-primary)",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: "600",
    boxShadow: "var(--glass-shadow)",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(2, 6, 23, 0.8)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  modalContainer: {
    width: "1000px",
    maxWidth: "95vw",
    height: "650px",
    maxHeight: "90vh",
    backgroundColor: "var(--bg-secondary)",
    border: "1px solid var(--glass-border)",
    borderRadius: "16px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 24px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
  },
  modalTitle: {
    fontSize: "1.1rem",
    fontWeight: "700",
    color: "#fff",
    margin: 0,
  },
  modalCloseBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-secondary)",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "var(--transition-smooth)",
  },
  modalBody: {
    flex: 1,
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    overflowY: "auto",
  },
  modalIntro: {
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    lineHeight: "1.5",
    margin: 0,
    textAlign: "left",
  },
  consoleGrid: {
    display: "flex",
    gap: "20px",
    flex: 1,
    minHeight: "420px",
  },
  consoleCard: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.3)",
    border: "1px solid rgba(255, 255, 255, 0.03)",
    borderRadius: "12px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    textAlign: "left",
  },
  consoleCardTitle: {
    fontSize: "0.95rem",
    fontWeight: "700",
    color: "#fff",
    margin: 0,
  },
  consoleCardDesc: {
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    lineHeight: "1.4",
    margin: 0,
  },
  weightList: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    marginTop: "8px",
  },
  weightItem: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.75rem",
    margin: "2px 0",
  },
  weightLabel: {
    color: "var(--text-secondary)",
  },
  weightVal: {
    fontWeight: "700",
    color: "#fff",
  },
  weightBarContainer: {
    width: "100%",
    height: "6px",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: "3px",
    overflow: "hidden",
    marginBottom: "8px",
  },
  weightBar: {
    height: "100%",
    borderRadius: "3px",
  },
  codeTitle: {
    fontSize: "0.72rem",
    fontWeight: "700",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    marginBottom: "4px",
    textAlign: "left",
  },
  codeBlock: {
    flex: 1,
    margin: 0,
    padding: "12px",
    backgroundColor: "#090d16",
    border: "1px solid rgba(255, 255, 255, 0.04)",
    borderRadius: "8px",
    fontSize: "0.72rem",
    fontFamily: "monospace",
    color: "#a7f3d0",
    overflow: "auto",
    maxHeight: "260px",
    textAlign: "left",
  }
};

// Error Boundary ile sarmalayarak dışa aktaralım
export default () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
