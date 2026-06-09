import React from "react";

const RiskCharts = ({ factors = [] }) => {
  // Puan rengini belirleyen yardımcı fonksiyon
  const getFactorColor = (score) => {
    if (score < 30) return "var(--success)";
    if (score < 50) return "var(--info)";
    if (score < 75) return "var(--warning)";
    return "var(--danger)";
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Risk Faktörleri Dağılımı</h3>
      <div style={styles.list}>
        {factors.map((factor, index) => {
          const barColor = getFactorColor(factor.score);
          return (
            <div key={index} style={styles.factorCard}>
              <div style={styles.header}>
                <span style={styles.name}>{factor.name}</span>
                <span style={{ ...styles.score, color: barColor }}>
                  {factor.score}/100
                </span>
              </div>
              
              {/* İlerleme Çubuğu */}
              <div style={styles.progressTrack}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${factor.score}%`,
                    backgroundColor: barColor,
                    boxShadow: `0 0 10px ${barColor}44`,
                  }}
                />
              </div>
              
              <div style={styles.details}>
                <span style={styles.detailsText}>{factor.details}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginTop: "8px",
  },
  title: {
    fontSize: "0.9rem",
    fontWeight: "700",
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    paddingBottom: "8px",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  factorCard: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(255, 255, 255, 0.04)",
    borderRadius: "10px",
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    transition: "transform 0.2s ease, border-color 0.2s ease",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontSize: "0.85rem",
    fontWeight: "600",
    color: "var(--text-primary)",
  },
  score: {
    fontSize: "0.85rem",
    fontWeight: "700",
    fontVariantNumeric: "tabular-nums",
  },
  progressTrack: {
    width: "100%",
    height: "6px",
    backgroundColor: "var(--bg-primary)",
    borderRadius: "3px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: "3px",
    transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  details: {
    marginTop: "2px",
  },
  detailsText: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    lineHeight: "1.4",
  },
};

export default RiskCharts;
