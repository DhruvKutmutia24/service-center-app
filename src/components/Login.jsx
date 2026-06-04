import { useState } from "react";
import { supabase } from "../lib/supabase";
import logo from "../assets/logo.png";

const FONT = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@500&display=swap');`;

// Design tokens — matches all dashboards
const C = {
  primary: "#1E293B",
  primaryDeep: "#0F172A",
  amber: "#F59E0B",
  amberLight: "#FEF3C7",
  surface: "#FFFFFF",
  bg: "#F1F5F9",
  border: "#E2E8F0",
  text: "#0F172A",
  textSec: "#475569",
  textMuted: "#94A3B8",
  red: "#EF4444",
  redLight: "#FEE2E2",
  green: "#10B981",
};

function Login({ onLogin }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: `${phone}@sheetal.auto`,
          password,
        });

      if (!authError && authData?.user) {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", authData.user.id)
          .eq("is_active", true)
          .single();

        if (!userError && userData) {
          onLogin(userData);
          return;
        }
      }
      setError("Invalid phone number or password");
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputBase = {
    width: "100%",
    padding: "13px 16px",
    border: `2px solid ${C.border}`,
    borderRadius: 10,
    fontSize: 15,
    boxSizing: "border-box",
    backgroundColor: C.bg,
    color: C.text,
    fontFamily: "inherit",
    outline: "none",
    transition: "border-color 0.15s, background 0.15s",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        padding: 20,
        boxSizing: "border-box",
        // Slate gradient — matches the mobile login screen
        background: `linear-gradient(145deg, ${C.primaryDeep} 0%, ${C.primary} 60%, #1e3a5f 100%)`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>
        {FONT}
        {`
        @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .login-card { animation: fadeIn 0.35s ease forwards; }
        .login-input:focus { border-color: #F59E0B !important; background: #fff !important; box-shadow: 0 0 0 3px rgba(245,158,11,0.12) !important; }
        .login-btn:not(:disabled):hover { background: #334155 !important; }
        .pass-toggle:hover { color: #F59E0B !important; }
      `}
      </style>

      {/* Subtle background blobs — slate tones, not purple */}
      <div
        style={{
          position: "absolute",
          top: "-8%",
          right: "-4%",
          width: 480,
          height: 480,
          borderRadius: "50%",
          background: "rgba(245,158,11,0.06)",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-10%",
          left: "-5%",
          width: 420,
          height: 420,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.04)",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />

      {/* Login Card */}
      <div
        className="login-card"
        style={{
          width: "100%",
          maxWidth: 440,
          backgroundColor: C.surface,
          padding: "44px 40px",
          borderRadius: 18,
          boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
          position: "relative",
          zIndex: 1,
          border: `1px solid rgba(255,255,255,0.08)`,
        }}
      >
        {/* Logo + branding */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          {/* Logo image */}
          <div
            style={{
              width: 88,
              height: 88,
              margin: "0 auto 18px",
              borderRadius: "50%",
              background: C.surface,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
              border: "2px solid rgba(255,255,255,0.12)",
              overflow: "hidden",
              padding: 6,
            }}
          >
            <img
              src={logo}
              alt="Sheetal Automobiles"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                borderRadius: "50%",
              }}
            />
          </div>

          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: C.text,
              margin: "0 0 5px",
              letterSpacing: -0.5,
            }}
          >
            Sheetal Automobiles
          </h1>
          <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>
            Tata Motors Authorized Service Center
          </p>
        </div>

        {/* Divider with label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 28,
          }}
        >
          <div style={{ flex: 1, height: 1, backgroundColor: C.border }} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: C.textMuted,
              textTransform: "uppercase",
              letterSpacing: "1px",
              whiteSpace: "nowrap",
            }}
          >
            Staff Login
          </span>
          <div style={{ flex: 1, height: 1, backgroundColor: C.border }} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Phone */}
          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 700,
                color: C.textSec,
                marginBottom: 7,
                textTransform: "uppercase",
                letterSpacing: "0.4px",
              }}
            >
              Phone Number
            </label>
            <input
              className="login-input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9876543210"
              required
              autoComplete="username"
              style={{
                ...inputBase,
                fontFamily: "'DM Mono', monospace",
                fontSize: 17,
                letterSpacing: 1,
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 22 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 700,
                color: C.textSec,
                marginBottom: 7,
                textTransform: "uppercase",
                letterSpacing: "0.4px",
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                className="login-input"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                style={{ ...inputBase, paddingRight: 46 }}
              />
              <button
                type="button"
                className="pass-toggle"
                onClick={() => setShowPass((p) => !p)}
                style={{
                  position: "absolute",
                  right: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 18,
                  color: C.textMuted,
                  padding: 0,
                  lineHeight: 1,
                  transition: "color 0.15s",
                }}
              >
                {showPass ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                backgroundColor: C.redLight,
                color: C.red,
                padding: "12px 16px",
                borderRadius: 9,
                marginBottom: 18,
                fontSize: 13,
                fontWeight: 500,
                border: `1px solid ${C.red}33`,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 16 }}>⚠️</span>
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            className="login-btn"
            disabled={loading}
            style={{
              width: "100%",
              backgroundColor: loading ? C.textMuted : C.primary,
              color: "#fff",
              padding: "15px",
              borderRadius: 10,
              border: "none",
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              fontFamily: "inherit",
              letterSpacing: 0.3,
              transition: "background 0.15s",
            }}
          >
            {loading ? (
              <>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    border: "2.5px solid rgba(255,255,255,0.3)",
                    borderTop: "2.5px solid white",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <span style={{ fontSize: 17, opacity: 0.8 }}>→</span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div
          style={{
            marginTop: 28,
            paddingTop: 20,
            borderTop: `1px solid ${C.border}`,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
            🔒 Secure login powered by Supabase
          </p>
          <p
            style={{
              fontSize: 11,
              color: C.border,
              margin: "6px 0 0",
              fontWeight: 500,
            }}
          >
            © 2026 Sheetal Automobiles PVT LTD. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
