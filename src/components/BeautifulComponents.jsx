// Beautiful UI Components for Owner & Advisor Dashboards
// Copy these styles to enhance your existing dashboards

// ============================================
// 1. BEAUTIFUL HEADER COMPONENT
// ============================================
export const BeautifulHeader = ({ title, subtitle, onLogout, userName }) => (
  <div
    style={{
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      padding: "24px 40px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      boxShadow: "0 4px 6px rgba(102, 126, 234, 0.2)",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
      {/* Logo */}
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "12px",
          background: "rgba(255, 255, 255, 0.2)",
          backdropFilter: "blur(10px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: "bold",
          fontSize: "20px",
          border: "2px solid rgba(255, 255, 255, 0.3)",
        }}
      >
        T
      </div>
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: "24px",
            color: "white",
            fontWeight: "700",
            textShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          {title}
        </h1>
        <p
          style={{
            margin: "4px 0 0 0",
            color: "rgba(255, 255, 255, 0.9)",
            fontSize: "14px",
          }}
        >
          Welcome back, {userName} 👋
        </p>
      </div>
    </div>
    <button
      onClick={onLogout}
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        backdropFilter: "blur(10px)",
        color: "white",
        padding: "12px 24px",
        border: "2px solid rgba(255, 255, 255, 0.3)",
        borderRadius: "10px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "600",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        e.target.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
        e.target.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.target.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
        e.target.style.transform = "translateY(0)";
      }}
    >
      🚪 Logout
    </button>
  </div>
);

// ============================================
// 2. BEAUTIFUL STAT CARD
// ============================================
export const BeautifulStatCard = ({ title, value, icon, color, bgColor }) => (
  <div
    style={{
      background: "white",
      padding: "24px",
      borderRadius: "16px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.07)",
      border: "1px solid #f0f0f0",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      cursor: "pointer",
      position: "relative",
      overflow: "hidden",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-4px)";
      e.currentTarget.style.boxShadow = "0 12px 24px rgba(0, 0, 0, 0.15)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.07)";
    }}
  >
    {/* Decorative gradient background */}
    <div
      style={{
        position: "absolute",
        top: "-50%",
        right: "-20%",
        width: "150px",
        height: "150px",
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${bgColor}40, ${bgColor}10)`,
        filter: "blur(40px)",
        pointerEvents: "none",
      }}
    />

    <div style={{ position: "relative", zIndex: 1 }}>
      {/* Icon */}
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "14px",
          backgroundColor: bgColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "16px",
          fontSize: "24px",
          boxShadow: `0 8px 16px ${bgColor}40`,
        }}
      >
        {icon}
      </div>

      {/* Title */}
      <p
        style={{
          margin: "0 0 8px 0",
          color: "#6b7280",
          fontSize: "14px",
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {title}
      </p>

      {/* Value */}
      <p
        style={{
          margin: 0,
          fontSize: "36px",
          fontWeight: "bold",
          color: color,
          lineHeight: "1",
        }}
      >
        {value}
      </p>
    </div>
  </div>
);

// ============================================
// 3. BEAUTIFUL TABS
// ============================================
export const BeautifulTabs = ({ tabs, activeTab, onTabChange }) => (
  <div
    style={{
      backgroundColor: "white",
      borderBottom: "1px solid #e5e7eb",
      padding: "0 40px",
      display: "flex",
      gap: "8px",
    }}
  >
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onTabChange(tab.id)}
        style={{
          padding: "16px 24px",
          border: "none",
          backgroundColor: activeTab === tab.id ? "#eff6ff" : "transparent",
          borderBottom:
            activeTab === tab.id
              ? "3px solid #667eea"
              : "3px solid transparent",
          color: activeTab === tab.id ? "#667eea" : "#6b7280",
          fontWeight: activeTab === tab.id ? "600" : "500",
          fontSize: "14px",
          cursor: "pointer",
          borderRadius: "8px 8px 0 0",
          transition: "all 0.2s",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
        onMouseEnter={(e) => {
          if (activeTab !== tab.id) {
            e.target.style.backgroundColor = "#f9fafb";
          }
        }}
        onMouseLeave={(e) => {
          if (activeTab !== tab.id) {
            e.target.style.backgroundColor = "transparent";
          }
        }}
      >
        <span style={{ fontSize: "16px" }}>{tab.icon}</span>
        {tab.label}
      </button>
    ))}
  </div>
);

// ============================================
// 4. BEAUTIFUL ALERT CARD
// ============================================
export const BeautifulAlertCard = ({
  title,
  subtitle,
  count,
  icon,
  isAlert,
  color = "blue",
}) => {
  const colors = {
    red: {
      bg: isAlert ? "#fee2e2" : "#f0fdf4",
      border: isAlert ? "#fca5a5" : "#86efac",
      text: isAlert ? "#991b1b" : "#166534",
    },
    yellow: {
      bg: isAlert ? "#fef3c7" : "#f0fdf4",
      border: isAlert ? "#fbbf24" : "#86efac",
      text: isAlert ? "#92400e" : "#166534",
    },
    blue: {
      bg: isAlert ? "#dbeafe" : "#f0fdf4",
      border: isAlert ? "#60a5fa" : "#86efac",
      text: isAlert ? "#1e40af" : "#166534",
    },
  };

  const c = colors[color];

  return (
    <div
      style={{
        background: c.bg,
        border: `2px solid ${c.border}`,
        padding: "18px 20px",
        borderRadius: "12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        transition: "all 0.2s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "10px",
            backgroundColor: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
          }}
        >
          {icon}
        </div>
        <div>
          <h4
            style={{
              margin: 0,
              fontSize: "15px",
              color: c.text,
              fontWeight: "600",
            }}
          >
            {title}
          </h4>
          <p
            style={{
              margin: "4px 0 0 0",
              fontSize: "13px",
              color: c.text,
              opacity: 0.8,
            }}
          >
            {subtitle}
          </p>
        </div>
      </div>
      <span
        style={{
          fontSize: "32px",
          fontWeight: "bold",
          color: c.text,
        }}
      >
        {count}
      </span>
    </div>
  );
};

// ============================================
// 5. BEAUTIFUL VEHICLE CARD
// ============================================
export const BeautifulVehicleCard = ({ vehicle, onClick, showWorkStatus }) => (
  <div
    onClick={onClick}
    style={{
      backgroundColor: "white",
      padding: "16px",
      borderRadius: "12px",
      border: "1px solid #e5e7eb",
      cursor: "pointer",
      transition: "all 0.2s",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = "#f9fafb";
      e.currentTarget.style.borderColor = "#667eea";
      e.currentTarget.style.transform = "translateX(4px)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = "white";
      e.currentTarget.style.borderColor = "#e5e7eb";
      e.currentTarget.style.transform = "translateX(0)";
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: showWorkStatus ? "12px" : "0",
      }}
    >
      <div>
        <span
          style={{
            fontWeight: "600",
            color: "#111827",
            fontSize: "15px",
          }}
        >
          {vehicle.vehicle_number}
        </span>
        {vehicle.customer_name && (
          <>
            <span style={{ margin: "0 8px", color: "#d1d5db" }}>•</span>
            <span style={{ fontSize: "13px", color: "#6b7280" }}>
              {vehicle.customer_name}
            </span>
          </>
        )}
      </div>
      <span
        style={{
          padding: "4px 10px",
          backgroundColor: "#eff6ff",
          color: "#1e40af",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: "600",
        }}
      >
        View →
      </span>
    </div>

    {showWorkStatus && (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {/* Work status badges would go here */}
      </div>
    )}
  </div>
);

// ============================================
// 6. BEAUTIFUL BUTTON
// ============================================
export const BeautifulButton = ({
  children,
  onClick,
  variant = "primary",
  icon,
  disabled,
}) => {
  const variants = {
    primary: {
      bg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "white",
      shadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
    },
    secondary: {
      bg: "#f3f4f6",
      color: "#374151",
      shadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
    },
    success: {
      bg: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      color: "white",
      shadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
    },
    danger: {
      bg: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
      color: "white",
      shadow: "0 4px 12px rgba(239, 68, 68, 0.3)",
    },
  };

  const style = variants[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? "#e5e7eb" : style.bg,
        color: disabled ? "#9ca3af" : style.color,
        padding: "12px 24px",
        border: "none",
        borderRadius: "10px",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: "14px",
        fontWeight: "600",
        boxShadow: disabled ? "none" : style.shadow,
        transition: "all 0.2s",
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.target.style.transform = "translateY(-2px)";
          e.target.style.boxShadow = disabled
            ? "none"
            : "0 6px 20px rgba(102, 126, 234, 0.4)";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.target.style.transform = "translateY(0)";
          e.target.style.boxShadow = style.shadow;
        }
      }}
    >
      {icon && <span style={{ fontSize: "16px" }}>{icon}</span>}
      {children}
    </button>
  );
};

// ============================================
// 7. BEAUTIFUL LOADING SPINNER
// ============================================
export const BeautifulLoading = () => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      backgroundColor: "#f9fafb",
      gap: "20px",
    }}
  >
    <div
      style={{
        width: "60px",
        height: "60px",
        border: "4px solid #e5e7eb",
        borderTop: "4px solid #667eea",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }}
    />
    <p
      style={{
        fontSize: "16px",
        color: "#6b7280",
        fontWeight: "500",
      }}
    >
      Loading your dashboard...
    </p>
    <style>
      {`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}
    </style>
  </div>
);

// ============================================
// 8. STYLES TO ADD TO YOUR MAIN COMPONENT
// ============================================
export const GLOBAL_STYLES = `
  * {
    box-sizing: border-box;
  }
  
  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .fade-in {
    animation: fadeIn 0.3s ease-out;
  }
`;