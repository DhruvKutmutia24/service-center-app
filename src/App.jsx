import { useState, useEffect } from "react";
import Login from "./components/Login";
import OwnerDashboard from "./components/OwnerDashboard";
import AdvisorDashboard from "./components/AdvisorDashboard";
import BillingDashboard from "./components/BillingDashboard";
import CashierDashboard from "./components/CashierDashboard";

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  // If not logged in, show login screen
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // After login, show role-specific dashboard
  if (user.role === "owner") {
    return <OwnerDashboard user={user} onLogout={handleLogout} />;
  }

  if (user.role === "advisor") {
    return <AdvisorDashboard user={user} onLogout={handleLogout} />;
  }

  if (user.role === "billing") {
    return <BillingDashboard user={user} onLogout={handleLogout} />;
  }

  if (user.role === "cashier") {
    return <CashierDashboard user={user} onLogout={handleLogout} />;
  }

  // For other roles (we'll build these later)
  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h2>Welcome, {user.full_name}!</h2>
      <p>Your {user.role} dashboard is under construction.</p>
      <button
        onClick={handleLogout}
        style={{
          backgroundColor: "#ef4444",
          color: "white",
          padding: "10px 20px",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        Logout
      </button>
    </div>
  );
}

export default App;
