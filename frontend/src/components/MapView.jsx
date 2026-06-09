import React from "react";
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  useMapEvents,
  Polyline,
  Polygon,
  Circle,
  CircleMarker,
  ZoomControl,
  Tooltip
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Yaprak ikonlarının kırılmasını önleyen düzeltme (Leaflet Default Icon Fix)
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// İstanbul gerçek idari sınır koordinatları
import { ISTANBUL_EUROPE, ISTANBUL_ASIA, ISTANBUL_ISLANDS } from "../constants/istanbulBounds";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// HTML/CSS tabanlı, parlayan özel harita işaretçisi oluşturucu
const createCustomMarker = (color, label) => {
  return L.divIcon({
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        <div class="marker-pulse" style="
          position: absolute;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background-color: ${color};
          opacity: 0.35;
        "></div>
        <div style="
          position: relative;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background-color: ${color};
          border: 2px solid #fff;
          box-shadow: 0 0 8px ${color};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 800;
          color: #fff;
        ">${label}</div>
      </div>
    `,
    className: "custom-div-icon",
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

// İstanbul Avrupa, Anadolu ve Adalar sınırları Constants'tan yükleniyor.

const MAP_FAULTS = [
  // Ana Marmara Fayı
  [[40.75, 28.0], [40.78, 28.4], [40.82, 28.8], [40.86, 29.2], [40.88, 29.6], [40.92, 30.0]],
  // Kuzey İkincil Fayı
  [[41.05, 28.5], [41.08, 28.9], [41.11, 29.3]]
];

const MAP_FLOOD_ZONES = [
  {
    name: "Ayamama Deresi Taşkın Havzası",
    color: "#06b6d4",
    coords: [[40.97, 28.79], [40.97, 28.83], [41.04, 28.84], [41.04, 28.79]],
    riskLevel: "Yüksek Risk"
  },
  {
    name: "Alibeyköy Deresi Taşkın Yatağı",
    color: "#3b82f6",
    coords: [[41.06, 28.91], [41.06, 28.96], [41.13, 28.95], [41.13, 28.90]],
    riskLevel: "Orta Risk"
  },
  {
    name: "Riva Deresi Taşkın Alanı",
    color: "#0ea5e9",
    coords: [[41.17, 29.20], [41.17, 29.26], [41.26, 29.24], [41.26, 29.17]],
    riskLevel: "Yüksek Risk"
  }
];

// Harita tıklama olaylarını yakalayan yardımcı bileşen
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const MapView = ({ selectedCoords, onMapClick, securityData, amenitiesData, compareMode, coordsA, coordsB }) => {
  // Varsayılan olarak harita İstanbul merkezli açılır
  const defaultPosition = [41.015, 28.979];
  const defaultZoom = 11;

  return (
    <div className="dark-theme-map">
      <MapContainer 
        center={defaultPosition} 
        zoom={defaultZoom} 
        scrollWheelZoom={true}
        zoomControl={false}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomControl position="bottomright" />
        {/* Koyu Mod Görünümü veren TileLayer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* İstanbul Avrupa Yakası Aktif Analiz Sınır Hattı */}
        <Polygon
          positions={ISTANBUL_EUROPE}
          pathOptions={{
            color: "var(--accent-cyan)",
            fillColor: "var(--accent-cyan)",
            fillOpacity: 0.02, // Haritada kara parçasını çok hafif aydınlatır
            weight: 2,
            dashArray: "6, 8", // Şık kesikli çizgiler
            opacity: 0.5,
            interactive: false // Tıklamaları engellememesi için non-interactive
          }}
        />

        {/* İstanbul Anadolu Yakası Aktif Analiz Sınır Hattı */}
        <Polygon
          positions={ISTANBUL_ASIA}
          pathOptions={{
            color: "var(--accent-cyan)",
            fillColor: "var(--accent-cyan)",
            fillOpacity: 0.02,
            weight: 2,
            dashArray: "6, 8",
            opacity: 0.5,
            interactive: false
          }}
        />

        {/* İstanbul Adaları Aktif Analiz Sınır Hattı */}
        {ISTANBUL_ISLANDS.map((coords, index) => (
          <Polygon
            key={`island-${index}`}
            positions={coords}
            pathOptions={{
              color: "var(--accent-cyan)",
              fillColor: "var(--accent-cyan)",
              fillOpacity: 0.02,
              weight: 2,
              dashArray: "6, 8",
              opacity: 0.5,
              interactive: false
            }}
          />
        ))}

        {/* Tıklama Olay Dinleyicisi */}
        <MapClickHandler onMapClick={onMapClick} />

        {/* Fay Hatlarının Çizilmesi (Kırmızı Çizgi) */}
        {MAP_FAULTS.map((coords, index) => (
          <Polyline 
            key={`fault-${index}`}
            positions={coords}
            pathOptions={{ 
              color: "#ef4444", 
              weight: 3.5, 
              opacity: 0.85,
              dashArray: "8, 6"
            }}
          />
        ))}

        {/* Sel/Taşkın Bölgelerinin Çizilmesi (Mavi Poligonlar) */}
        {MAP_FLOOD_ZONES.map((zone, index) => (
          <Polygon 
            key={`flood-${index}`}
            positions={zone.coords}
            pathOptions={{ 
              color: zone.color, 
              fillColor: zone.color, 
              fillOpacity: 0.15, 
              weight: 1.5,
              interactive: true
            }}
            eventHandlers={{
              click: (e) => {
                // Taşkın alanına tıklandığında altındaki haritaya tıklama olayını iletelim
                onMapClick(e.latlng.lat, e.latlng.lng);
              }
            }}
          >
            <Tooltip sticky className="premium-tooltip">
              <div style={{ color: "#fff", fontWeight: 600 }}>🌊 {zone.name}</div>
              <div style={{ color: "#60a5fa", fontSize: "0.75rem", fontWeight: 500, marginTop: "2px" }}>
                Risk Derecesi: {zone.riskLevel}
              </div>
            </Tooltip>
          </Polygon>
        ))}

        {/* Tekli Mod Seçilen Konum İşaretçisi */}
        {!compareMode && selectedCoords && (
          <Marker 
            position={[selectedCoords.lat, selectedCoords.lon]}
            icon={createCustomMarker("var(--accent-cyan)", "★")}
          >
            <Popup>
              <div style={{ color: "#fff", textAlign: "center" }}>
                <strong style={{ display: "block", marginBottom: "4px" }}>Seçilen Konum</strong>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  {selectedCoords.lat.toFixed(5)}, {selectedCoords.lon.toFixed(5)}
                </span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Karşılaştırma Modu - Konum A İşaretçisi (Yeşil) */}
        {compareMode && coordsA && (
          <Marker 
            position={[coordsA.lat, coordsA.lon]}
            icon={createCustomMarker("var(--success)", "A")}
          >
            <Popup>
              <div style={{ color: "#fff", fontWeight: "bold" }}>📍 Konum A</div>
              <div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
                {coordsA.lat.toFixed(5)}, {coordsA.lon.toFixed(5)}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Karşılaştırma Modu - Konum B İşaretçisi (Turuncu) */}
        {compareMode && coordsB && (
          <Marker 
            position={[coordsB.lat, coordsB.lon]}
            icon={createCustomMarker("#f97316", "B")}
          >
            <Popup>
              <div style={{ color: "#fff", fontWeight: "bold" }}>📍 Konum B</div>
              <div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
                {coordsB.lat.toFixed(5)}, {coordsB.lon.toFixed(5)}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Asayiş Noktalarının Haritada Çizilmesi */}
        {securityData?.features?.map((feature, index) => {
          const [lon, lat] = feature.geometry.coordinates;
          const { name, type, severity } = feature.properties;
          
          if (type === "karakol") {
            return (
              <CircleMarker
                key={`police-${index}`}
                center={[lat, lon]}
                radius={7}
                pathOptions={{
                  color: "#2563eb",
                  fillColor: "#3b82f6",
                  fillOpacity: 0.9,
                  weight: 2,
                }}
              >
                <Popup>
                  <div style={{ color: "#fff", fontWeight: "bold" }}>👮 {name}</div>
                  <div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>Emniyet / Karakol Noktası</div>
                </Popup>
              </CircleMarker>
            );
          } else {
            return (
              <React.Fragment key={`incident-group-${index}`}>
                {/* Merkez Noktası */}
                <CircleMarker
                  center={[lat, lon]}
                  radius={4}
                  pathOptions={{
                    color: "#b91c1c",
                    fillColor: "#ef4444",
                    fillOpacity: 0.9,
                    weight: 1,
                  }}
                >
                  <Popup>
                    <div style={{ color: "#fff", fontWeight: "bold" }}>⚠️ {name}</div>
                    <div style={{ color: "#ef4444", fontSize: "0.8rem" }}>Asayiş Risk Derecesi: {severity}/5.0</div>
                  </Popup>
                </CircleMarker>
                {/* Etki Çemberi - interactive: false tıklamayı arkaya geçirir */}
                <Circle
                  center={[lat, lon]}
                  radius={severity * 150}
                  pathOptions={{
                    color: "#ef4444",
                    fillColor: "#ef4444",
                    fillOpacity: 0.1,
                    weight: 1,
                    dashArray: "4, 4",
                    interactive: false
                  }}
                />
              </React.Fragment>
            );
          }
        })}

        {/* Sosyal Donatı ve Çevresel Katmanların Haritada Çizilmesi */}
        {amenitiesData?.features?.map((feature, index) => {
          const [lon, lat] = feature.geometry.coordinates;
          const { name, type } = feature.properties;
          
          let iconEmoji = "📍";
          let markerColor = "#64748b";
          let showEtkiAlani = false;
          let etkiRadius = 0;
          let etkiColor = "#64748b";

          if (type === "metro") {
            iconEmoji = "🚇";
            markerColor = "#06b6d4";
          } else if (type === "metrobus") {
            iconEmoji = "🚌";
            markerColor = "#10b981";
          } else if (type === "vapur") {
            iconEmoji = "⛴️";
            markerColor = "#3b82f6";
          } else if (type === "sanayi") {
            iconEmoji = "🏭";
            markerColor = "#f59e0b";
            showEtkiAlani = true;
            etkiRadius = 600;
            etkiColor = "#f59e0b";
          } else if (type === "otoyol") {
            iconEmoji = "🚗";
            markerColor = "#6366f1";
            showEtkiAlani = true;
            etkiRadius = 300;
            etkiColor = "#6366f1";
          } else if (type === "hastane") {
            iconEmoji = "🏥";
            markerColor = "#ef4444";
          } else if (type === "havalimani") {
            iconEmoji = "✈️";
            markerColor = "#8b5cf6";
          }

          return (
            <React.Fragment key={`amenity-group-${index}`}>
              <CircleMarker
                center={[lat, lon]}
                radius={6}
                pathOptions={{
                  color: markerColor,
                  fillColor: markerColor,
                  fillOpacity: 0.8,
                  weight: 1.5
                }}
              >
                <Popup>
                  <div style={{ color: "#fff", fontWeight: "bold" }}>{iconEmoji} {name}</div>
                  <div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>Tür: {type.toUpperCase()}</div>
                </Popup>
              </CircleMarker>
              
              {showEtkiAlani && (
                <Circle
                  center={[lat, lon]}
                  radius={etkiRadius}
                  pathOptions={{
                    color: etkiColor,
                    fillColor: etkiColor,
                    fillOpacity: 0.05,
                    weight: 1,
                    dashArray: "3, 6",
                    interactive: false
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapView;
