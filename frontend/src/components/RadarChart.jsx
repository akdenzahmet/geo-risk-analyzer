import React from "react";

/**
 * RadarChart - Saf SVG ve Matematiksel Hesaplamalarla Oluşturulan
 * Hem tekli hem de çoklu konum karşılaştırma modunu destekleyen Örümcek Ağı Grafiği.
 */
const RadarChart = ({ data = {}, dataB = null, compareMode = false }) => {
  // Grafik boyutları
  const width = 360;
  const height = 240;
  const cx = width / 2;
  const cy = height / 2 - 5;
  const rMax = 62; // Yarıçapı hafifçe daraltarak uzun etiketler için yan boşlukları artırdık

  const totalAxes = 5;
  const labels = [
    "Deprem Güvenliği",
    "Sel Güvenliği",
    "Zemin Sağlamlığı",
    "Asayiş Güvenliği",
    "Ulaşım Kolaylığı"
  ];

  // A ve B için veri dizileri
  const valuesA = [
    data.earthquakeSafety ?? 50,
    data.floodSafety ?? 50,
    data.soilSafety ?? 50,
    data.securitySafety ?? 50,
    data.transportSafety ?? 50
  ];

  const valuesB = dataB ? [
    dataB.earthquakeSafety ?? 50,
    dataB.floodSafety ?? 50,
    dataB.soilSafety ?? 50,
    dataB.securitySafety ?? 50,
    dataB.transportSafety ?? 50
  ] : null;

  // Açı hesaplama fonksiyonu (Yukarıdan başlaması için -PI/2 ofsetli)
  const getCoordinates = (index, value, maxVal = 100) => {
    const angle = (index * 2 * Math.PI) / totalAxes - Math.PI / 2;
    const radius = (value / maxVal) * rMax;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    return { x, y };
  };

  // 1. Arka plandaki 5 halka katmanı (Örümcek ağının seviyeleri: 20, 40, 60, 80, 100)
  const gridLevels = [20, 40, 60, 80, 100];
  const gridPolygons = gridLevels.map((level) => {
    const points = [];
    for (let i = 0; i < totalAxes; i++) {
      const { x, y } = getCoordinates(i, level);
      points.push(`${x},${y}`);
    }
    return points.join(" ");
  });

  // 2. Eksen çizgileri
  const axisLines = [];
  for (let i = 0; i < totalAxes; i++) {
    const outerPoint = getCoordinates(i, 100);
    axisLines.push({
      x1: cx,
      y1: cy,
      x2: outerPoint.x,
      y2: outerPoint.y
    });
  }

  // 3. Konum A Poligon Koordinatları
  const pointsA = [];
  for (let i = 0; i < totalAxes; i++) {
    const { x, y } = getCoordinates(i, valuesA[i]);
    pointsA.push(`${x},${y}`);
  }
  const polyPointsA = pointsA.join(" ");

  // 4. Konum B Poligon Koordinatları (Eğer karşılaştırma aktifse)
  let polyPointsB = "";
  if (compareMode && valuesB) {
    const pointsB = [];
    for (let i = 0; i < totalAxes; i++) {
      const { x, y } = getCoordinates(i, valuesB[i]);
      pointsB.push(`${x},${y}`);
    }
    polyPointsB = pointsB.join(" ");
  }

  // Etiketlerin hizalamasını belirleyen yardımcılar
  const getLabelAnchor = (index) => {
    const angle = (index * 2 * Math.PI) / totalAxes - Math.PI / 2;
    const cos = Math.cos(angle);
    if (Math.abs(cos) < 0.1) return "middle";
    return cos > 0 ? "start" : "end";
  };

  const getLabelOffset = (index) => {
    const angle = (index * 2 * Math.PI) / totalAxes - Math.PI / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      dx: cos * 15,
      dy: sin * 10 + 2
    };
  };

  return (
    <div style={styles.container} className="glass-panel">
      <div style={styles.header}>
        <span style={styles.title}>Güvenlik Endeksleri Derecesi</span>
        <span style={styles.subtitle}>(% Yüksek Değer = Daha Güvenli Konum)</span>
      </div>
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          {/* Konum A Gradyanı (Cyan/Yeşil tonu) */}
          <radialGradient id="radarGradA" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--success)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="rgba(16, 185, 129, 0.01)" stopOpacity="0.02" />
          </radialGradient>
          {/* Konum B Gradyanı (Turuncu tonu) */}
          <radialGradient id="radarGradB" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.4" />
            <stop offset="100%" stopColor="rgba(249, 115, 22, 0.01)" stopOpacity="0.02" />
          </radialGradient>
          {/* Tekli Mod Gradyanı */}
          <radialGradient id="radarGradSingle" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="rgba(6, 182, 212, 0.01)" stopOpacity="0.02" />
          </radialGradient>
          
          <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Örümcek Ağı Izgarası */}
        {gridPolygons.map((points, idx) => (
          <polygon
            key={`grid-${idx}`}
            points={points}
            fill="none"
            stroke="rgba(255, 255, 255, 0.07)"
            strokeWidth="1"
            strokeDasharray={idx === 4 ? "none" : "2, 2"}
          />
        ))}

        {/* 2. Eksen Çizgileri */}
        {axisLines.map((line, idx) => (
          <line
            key={`axis-${idx}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="rgba(255, 255, 255, 0.07)"
            strokeWidth="1"
          />
        ))}

        {/* 3. Konum A Çizimi */}
        <polygon
          points={polyPointsA}
          fill={compareMode ? "url(#radarGradA)" : "url(#radarGradSingle)"}
          stroke={compareMode ? "var(--success)" : "var(--accent-cyan)"}
          strokeWidth="2"
          filter="url(#glowFilter)"
        />

        {/* 4. Konum B Çizimi (Karşılaştırma Aktifse) */}
        {compareMode && polyPointsB && (
          <polygon
            points={polyPointsB}
            fill="url(#radarGradB)"
            stroke="#f97316"
            strokeWidth="2"
            filter="url(#glowFilter)"
          />
        )}

        {/* Veri Noktalarındaki Küçük Çemberler */}
        {valuesA.map((val, idx) => {
          const { x, y } = getCoordinates(idx, val);
          return (
            <circle
              key={`dotA-${idx}`}
              cx={x}
              cy={y}
              r="3"
              fill="#fff"
              stroke={compareMode ? "var(--success)" : "var(--accent-cyan)"}
              strokeWidth="1.5"
            />
          );
        })}

        {compareMode && valuesB && valuesB.map((val, idx) => {
          const { x, y } = getCoordinates(idx, val);
          return (
            <circle
              key={`dotB-${idx}`}
              cx={x}
              cy={y}
              r="3"
              fill="#fff"
              stroke="#f97316"
              strokeWidth="1.5"
            />
          );
        })}

        {/* 5. Eksen Etiketleri */}
        {labels.map((label, idx) => {
          const outerPoint = getCoordinates(idx, 100);
          const { dx, dy } = getLabelOffset(idx);
          const anchor = getLabelAnchor(idx);
          
          return (
            <g key={`label-group-${idx}`}>
              <text
                x={outerPoint.x + dx}
                y={outerPoint.y + dy}
                fill="#f8fafc" // Çok parlak slate-50 beyazı (okunabilirliği artırdı)
                fontSize="10"
                fontWeight="700"
                fontFamily="sans-serif"
                textAnchor={anchor}
              >
                {label}
              </text>
              
              {!compareMode ? (
                // Tekli Mod Eksen Skoru
                <text
                  x={outerPoint.x + dx}
                  y={outerPoint.y + dy + 11}
                  fill="var(--accent-cyan)"
                  fontSize="10"
                  fontWeight="800"
                  fontFamily="monospace"
                  textAnchor={anchor}
                >
                  %{valuesA[idx]}
                </text>
              ) : (
                // Karşılaştırma Modu Çift Skorlar
                <text
                  x={outerPoint.x + dx}
                  y={outerPoint.y + dy + 11}
                  fontSize="9.5"
                  fontWeight="800"
                  fontFamily="monospace"
                  textAnchor={anchor}
                >
                  <tspan fill="var(--success)">A:%{valuesA[idx]}</tspan>
                  <tspan fill="rgba(255,255,255,0.4)">|</tspan>
                  <tspan fill="#f97316">B:%{valuesB ? valuesB[idx] : 0}</tspan>
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const styles = {
  container: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px",
    backgroundColor: "rgba(255, 255, 255, 0.01)",
    border: "1px solid rgba(255, 255, 255, 0.03)",
    borderRadius: "14px",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: "4px",
    gap: "1px",
  },
  title: {
    fontSize: "0.76rem",
    fontWeight: "700",
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  subtitle: {
    fontSize: "0.64rem",
    color: "var(--text-muted)",
  }
};

export default RadarChart;
