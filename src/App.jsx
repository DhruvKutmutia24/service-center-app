import { useState, useEffect } from "react";
import Login from "./components/Login";
import OwnerDashboard from "./components/OwnerDashboard";
import AdvisorDashboard from "./components/AdvisorDashboard";
import BillingDashboard from "./components/BillingDashboard";
import CashierDashboard from "./components/CashierDashboard";
import BookingPage from "./components/BookingPage";
import ReceptionistDashboard from "./components/ReceptionistDashboard";
import SpareDashboard from "./components/SpareDashboard";

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (userData) => setUser(userData);
  const handleLogout = () => setUser(null);

  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  // ─── Public routes (no login required) ───────────────────────────────────
  if (
    window.location.pathname === "/book" ||
    window.location.hostname === "booking.keeltech.in" ||
    window.location.hostname === "booking.sheetalauto.com"
  )
    return <BookingPage />;

  // ─── Auth gate ────────────────────────────────────────────────────────────
  if (!user) return <Login onLogin={handleLogin} />;

  // ─── Role-based dashboards ────────────────────────────────────────────────
  if (user.role === "owner")
    return <OwnerDashboard user={user} onLogout={handleLogout} />;
  if (user.role === "advisor")
    return <AdvisorDashboard user={user} onLogout={handleLogout} />;
  if (user.role === "billing")
    return <BillingDashboard user={user} onLogout={handleLogout} />;
  if (user.role === "cashier")
    return <CashierDashboard user={user} onLogout={handleLogout} />;
  if (user.role === "receptionist")
    return <ReceptionistDashboard user={user} onLogout={handleLogout} />;
  if (user.role === "spare_part_manager")
    return <SpareDashboard user={user} onLogout={handleLogout} />;

  // ─── Fallback ─────────────────────────────────────────────────────────────
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
