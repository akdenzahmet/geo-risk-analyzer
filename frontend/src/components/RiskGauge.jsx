import React, { useEffect, useState } from "react";

const RiskGauge = ({ score = 0, level = "Güvenli" }) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  
  // Yavaşça puanın dolmasını sağlayan animasyon efekti
  useEffect(() => {
    setAnimatedScore(0);
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 150);
    return () => clearTimeout(timer);
  }, [score]);

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  // Risk skoruna göre renk belirleme
  const getColor = (val) => {
    if (val < 30) return "#10b981"; // Safe Green (Güvenli)
    if (val < 50) return "#0ea5e9"; // Low Risk Blue (Düşük Riskli)
    if (val < 75) return "#f59e0b"; // Medium Risk Orange (Orta Riskli)
    return "#ef4444"; // High Risk Red (Yüksek Riskli)
  };

  const currentColor = getColor(score);

  return (
    <div style={styles.container}>
      <div style={styles.gaugeWrapper}>
        <svg width="140" height="140" viewBox="0 0 120 120">
          {/* Arka plan halkası */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth="10"
          />
          {/* Dolgu halkası */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={currentColor}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
            style={{
              transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)",
              filter: `drop-shadow(0 0 8px ${currentColor}44)`
            }}
          />
        </svg>
        <div style={styles.scoreTextWrapper}>
          <span style={styles.scoreLabel}>GENEL RİSK</span>
          <span style={{ ...styles.scoreValue, color: currentColor }}>
            {animatedScore.toFixed(1)}
          </span>
          <span style={{ ...styles.scoreLabelSub, color: currentColor, fontWeight: "700" }}>
            {level.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 0",
  },
  gaugeWrapper: {
    position: "relative",
    width: "140px",
    height: "140px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreTextWrapper: {
    position: "absolute",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreLabel: {
    fontSize: "0.65rem",
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: "0.1em",
  },
  scoreValue: {
    fontSize: "1.75rem",
    fontWeight: "800",
    lineHeight: "1.1",
    margin: "2px 0",
    fontVariantNumeric: "tabular-nums",
  },
  scoreLabelSub: {
    fontSize: "0.6rem",
    color: "#94a3b8",
  },
  details: {
    marginTop: "12px",
    textAlign: "center",
  },
  riskBadgeContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontSize: "0.9rem",
  },
  riskLabel: {
    color: "#94a3b8",
    fontSize: "0.85rem",
  }
};

export default RiskGauge;
