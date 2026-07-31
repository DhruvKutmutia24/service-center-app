import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import logo from "../assets/logo.png";
import * as XLSX from "xlsx";
import QRCode from "qrcode";

const makeTheme = (dark) => ({
  sidebar: "#0f172a",
  sidebarHover: "#1e293b",
  sidebarText: "#94a3b8",
  bg: dark ? "#0f172a" : "#f8fafc",
  surface: dark ? "#1e293b" : "#ffffff",
  surfaceElevated: dark ? "#263246" : "#f1f5f9",
  border: dark ? "#334155" : "#e2e8f0",
  borderStrong: dark ? "#475569" : "#cbd5e1",
  text: dark ? "#f1f5f9" : "#0f172a",
  textSecondary: dark ? "#94a3b8" : "#475569",
  textMuted: dark ? "#64748b" : "#94a3b8",
  accent: "#f59e0b",
  accentBg: dark ? "#451a03" : "#fef3c7",
  green: dark ? "#10b981" : "#059669",
  greenLight: dark ? "#052e16" : "#ecfdf5",
  red: dark ? "#f87171" : "#dc2626",
  redLight: dark ? "#2d0a0a" : "#fef2f2",
  amber: dark ? "#fbbf24" : "#d97706",
  amberLight: dark ? "#1c0f00" : "#fffbeb",
  blue: dark ? "#60a5fa" : "#2563eb",
  blueLight: dark ? "#0f1e3d" : "#eff6ff",
  purple: dark ? "#a78bfa" : "#7c3aed",
  purpleLight: dark ? "#1e0a3c" : "#f5f3ff",
  cyan: dark ? "#22d3ee" : "#0891b2",
  cyanLight: dark ? "#061b24" : "#ecfeff",
  shadow: dark ? "0 1px 3px rgba(0,0,0,0.5)" : "0 1px 3px rgba(0,0,0,0.08)",
  shadowMd: dark ? "0 4px 12px rgba(0,0,0,0.6)" : "0 4px 6px rgba(0,0,0,0.07)",
  shadowLg: dark
    ? "0 10px 30px rgba(0,0,0,0.7)"
    : "0 10px 15px rgba(0,0,0,0.1)",
});

const FONT = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=DM+Mono:wght@400;500&display=swap');`;

const DEPT_KEYS = [
  "mechanic",
  "painter",
  "denter",
  "electrician",
  "three_m",
  "alignment_balancing",
  "washing",
];
const TEAM_ROLES = ["mechanic", "denter", "electrician"];

// CHANGE 1: receptionist added before advisor
const ALL_ROLES = [
  "mechanic",
  "painter",
  "denter",
  "electrician",
  "3m",
  "alignment_balancing",
  "washing",
  "gateman",
  "front_checkup",
  "billing",
  "cashier",
  "receptionist",
  "advisor",
  "body_shop_advisor",
  "spare_part_manager",
  "staff",
  "owner",
];

// CHANGE 2: receptionist label added
const ROLE_LABELS = {
  mechanic: "Mechanic",
  painter: "Painter",
  denter: "Denter",
  electrician: "Electrician",
  "3m": "3M Work",
  alignment_balancing: "Alignment",
  washing: "Washing",
  gateman: "Gateman",
  front_checkup: "Front Checkup",
  billing: "Billing",
  cashier: "Cashier",
  receptionist: "Receptionist",
  advisor: "Advisor",
  body_shop_advisor: "Body Shop Advisor",
  spare_part_manager: "Spare / Store",
  staff: "Staff",
  owner: "Owner",
};

const STAGE_META = {
  front_checkup: { label: "Front Checkup", icon: "🔍", color: "#8b5cf6" },
  advisor_review: { label: "Advisor Review", icon: "👔", color: "#db2777" },
  pending: { label: "Pending", icon: "⏳", color: "#d97706" },
  mechanic: { label: "Mechanic", icon: "🔧", color: "#d97706" },
  painter: { label: "Painter", icon: "🎨", color: "#8b5cf6" },
  denter: { label: "Denter", icon: "🔨", color: "#0891b2" },
  electrician: { label: "Electrician", icon: "⚡", color: "#ea580c" },
  three_m: { label: "3M Work", icon: "✨", color: "#8b5cf6" },
  alignment_balancing: { label: "Alignment", icon: "⚖️", color: "#db2777" },
  washing: { label: "Washing", icon: "💧", color: "#0891b2" },
  pdi: { label: "PDI", icon: "✅", color: "#059669" },
  billing: { label: "Billing", icon: "🧾", color: "#2563eb" },
  payment: { label: "Payment", icon: "💳", color: "#059669" },
  ready_for_exit: { label: "Ready for Exit", icon: "🚪", color: "#059669" },
  completed: { label: "Completed", icon: "✔️", color: "#64748b" },
};

const getISTMidnightUTC = () => {
  const off = 5.5 * 3600000;
  const istNow = new Date(Date.now() + off);
  istNow.setUTCHours(0, 0, 0, 0);
  return new Date(istNow.getTime() - off).toISOString();
};

const toZ = (s) =>
  !s ? null : String(s).includes("Z") || String(s).includes("+") ? s : s + "Z";

// A stalled network request (backgrounded/throttled tab, dropped connection) never
// resolves or rejects on its own, which leaves an unguarded fetch's `finally` block
// (and the loading spinner it clears) hanging forever. Bound every main dashboard load.
const withTimeout = (promise, ms = 15000) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), ms),
    ),
  ]);

const formatIST = (s) => {
  if (!s) return "—";
  return new Date(toZ(s)).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const fmt = (n) =>
  `₹${(parseFloat(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const fmtMins = (m) =>
  !m || m <= 0
    ? "—"
    : m < 60
      ? `${Math.round(m)}m`
      : `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`;

const dateRange = (preset, cfrom, cto) => {
  const now = new Date();
  const off = 5.5 * 3600000;
  const ist = (d) => new Date(d.getTime() + off).toISOString().split("T")[0];
  if (preset === "today") return { from: ist(now), to: ist(now) };
  if (preset === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { from: ist(y), to: ist(y) };
  }
  if (preset === "7days") {
    const w = new Date(now);
    w.setDate(w.getDate() - 6);
    return { from: ist(w), to: ist(now) };
  }
  if (preset === "30days") {
    const m = new Date(now);
    m.setDate(m.getDate() - 29);
    return { from: ist(m), to: ist(now) };
  }
  if (preset === "custom") return { from: cfrom, to: cto };
  return { from: ist(now), to: ist(now) };
};

const Chip = ({ color, bg, children, style = {} }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 8px",
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 700,
      color,
      background: bg,
      whiteSpace: "nowrap",
      letterSpacing: "0.2px",
      ...style,
    }}
  >
    {children}
  </span>
);

const Bx = ({ T, children, style = {}, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 8,
      padding: 20,
      boxShadow: T.shadow,
      ...(onClick ? { cursor: "pointer" } : {}),
      ...style,
    }}
    onMouseEnter={(e) =>
      onClick && (e.currentTarget.style.boxShadow = T.shadowMd)
    }
    onMouseLeave={(e) =>
      onClick && (e.currentTarget.style.boxShadow = T.shadow)
    }
  >
    {children}
  </div>
);

const KPI = ({ T, label, value, icon, color, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 8,
      padding: "16px 18px",
      boxShadow: T.shadow,
      cursor: onClick ? "pointer" : "default",
      minWidth: 0,
    }}
    onMouseEnter={(e) =>
      onClick && (e.currentTarget.style.boxShadow = T.shadowMd)
    }
    onMouseLeave={(e) =>
      onClick && (e.currentTarget.style.boxShadow = T.shadow)
    }
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: T.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 16 }}>{icon}</span>
    </div>
    <div
      style={{
        fontSize: 26,
        fontWeight: 800,
        color,
        fontFamily: "'DM Mono',monospace",
        lineHeight: 1,
      }}
    >
      {value}
    </div>
  </div>
);

const Btn = ({
  T,
  children,
  onClick,
  v = "primary",
  sz = "md",
  disabled = false,
  style = {},
}) => {
  const vs = {
    primary: { bg: "#f59e0b", color: "#fff", border: "#f59e0b" },
    secondary: { bg: T.surfaceElevated, color: T.text, border: T.border },
    danger: { bg: T.red, color: "#fff", border: T.red },
    ghost: { bg: "transparent", color: T.textSecondary, border: T.border },
    success: { bg: T.green, color: "#fff", border: T.green },
  };
  const ss = {
    sm: { padding: "5px 10px", fontSize: 12 },
    md: { padding: "8px 14px", fontSize: 13 },
    lg: { padding: "11px 22px", fontSize: 14 },
  };
  const s = vs[v];
  const p = ss[sz];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? T.surfaceElevated : s.bg,
        color: disabled ? T.textMuted : s.color,
        border: `1px solid ${disabled ? T.border : s.border}`,
        borderRadius: 6,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        opacity: disabled ? 0.6 : 1,
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        ...p,
        ...style,
      }}
    >
      {children}
    </button>
  );
};

const Inp = ({
  T,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  style = {},
}) => (
  <div style={{ marginBottom: 14, ...style }}>
    {label && (
      <label
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 700,
          color: T.textSecondary,
          marginBottom: 5,
          textTransform: "uppercase",
          letterSpacing: "0.4px",
        }}
      >
        {label}
        {required && <span style={{ color: T.red }}> *</span>}
      </label>
    )}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "9px 12px",
        border: `1px solid ${T.border}`,
        borderRadius: 6,
        fontSize: 14,
        color: T.text,
        background: T.surface,
        outline: "none",
        fontFamily: "inherit",
        boxSizing: "border-box",
      }}
      onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
      onBlur={(e) => (e.target.style.borderColor = T.border)}
    />
  </div>
);

const Sel = ({ T, label, value, onChange, options, style = {} }) => (
  <div style={{ marginBottom: 14, ...style }}>
    {label && (
      <label
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 700,
          color: T.textSecondary,
          marginBottom: 5,
          textTransform: "uppercase",
          letterSpacing: "0.4px",
        }}
      >
        {label}
      </label>
    )}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "9px 12px",
        border: `1px solid ${T.border}`,
        borderRadius: 6,
        fontSize: 14,
        color: T.text,
        background: T.surface,
        outline: "none",
        fontFamily: "inherit",
        cursor: "pointer",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
);

const Dlg = ({ T, open, onClose, title, children, width = 520 }) => {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.surface,
          borderRadius: 10,
          width: "100%",
          maxWidth: width,
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: T.shadowLg,
          border: `1px solid ${T.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 20px",
            borderBottom: `1px solid ${T.border}`,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: T.text }}>
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 18,
              color: T.textMuted,
              lineHeight: 1,
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {children}
        </div>
      </div>
    </div>
  );
};

const SecTitle = ({ T, children, action }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
      paddingBottom: 8,
      borderBottom: "2px solid #f59e0b",
    }}
  >
    <span
      style={{
        fontSize: 12,
        fontWeight: 800,
        color: T.text,
        textTransform: "uppercase",
        letterSpacing: "0.6px",
      }}
    >
      {children}
    </span>
    {action}
  </div>
);

const Empty = ({ T, icon, text }) => (
  <div
    style={{ textAlign: "center", padding: "36px 20px", color: T.textMuted }}
  >
    <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
    <div style={{ fontSize: 13, fontWeight: 500 }}>{text}</div>
  </div>
);

const WorkBadges = ({ T, ws }) => {
  if (!ws) return null;
  const active = DEPT_KEYS.filter((k) => ws[`${k}_required`]);
  if (!active.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 5 }}>
      {active.map((k) => {
        const st = ws[`${k}_status`];
        const map = {
          completed: [T.green, T.greenLight],
          in_progress: [T.amber, T.amberLight],
          on_hold: [T.red, T.redLight],
          not_started: [T.textMuted, T.surfaceElevated],
        };
        const [c, bg] = map[st] || map.not_started;
        const ic =
          {
            completed: "✅",
            in_progress: "🔄",
            on_hold: "⏸️",
            not_started: "⏳",
          }[st] || "⏳";
        return (
          <Chip key={k} color={c} bg={bg} style={{ fontSize: 10 }}>
            {ic} {STAGE_META[k]?.label?.split(" ")[0]}
          </Chip>
        );
      })}
    </div>
  );
};

const TH = ({ T, children }) => (
  <th
    style={{
      padding: "8px 12px",
      textAlign: "left",
      fontSize: 10,
      fontWeight: 800,
      color: T.textMuted,
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      whiteSpace: "nowrap",
      borderBottom: `2px solid ${T.border}`,
    }}
  >
    {children}
  </th>
);
const TD = ({ T, children, style = {} }) => (
  <td
    style={{
      padding: "9px 12px",
      fontSize: 13,
      color: T.text,
      borderBottom: `1px solid ${T.border}`,
      ...style,
    }}
  >
    {children}
  </td>
);

// ─── Modals ───────────────────────────────────────────────────────────────────
function QuickViewModal({ T, title, vehicles, onVehiclePress, onClose }) {
  return (
    <Dlg
      T={T}
      open={true}
      onClose={onClose}
      title={`${title} — ${vehicles.length} vehicle${vehicles.length !== 1 ? "s" : ""}`}
      width={680}
    >
      {vehicles.length === 0 ? (
        <Empty T={T} icon="✅" text="No vehicles" />
      ) : (
        vehicles.map((v) => {
          const meta = STAGE_META[v.current_stage] || {
            icon: "🚗",
            color: T.blue,
            label: v.current_stage,
          };
          return (
            <div
              key={v.id}
              onClick={() => {
                onVehiclePress(v);
                onClose();
              }}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                padding: "12px 14px",
                borderRadius: 8,
                border: `1px solid ${T.border}`,
                borderLeft: `3px solid ${meta.color}`,
                marginBottom: 8,
                cursor: "pointer",
                background: T.surface,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = T.surfaceElevated)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = T.surface)
              }
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: 15,
                      fontFamily: "'DM Mono',monospace",
                      color: T.text,
                    }}
                  >
                    {v.vehicle_number}
                  </span>
                  {v.model && (
                    <Chip color={T.blue} bg={T.blueLight}>
                      {v.model}
                    </Chip>
                  )}
                  {v.priority !== "normal" && (
                    <Chip
                      color={v.priority === "vip" ? T.purple : T.red}
                      bg={v.priority === "vip" ? T.purpleLight : T.redLight}
                    >
                      {v.priority.toUpperCase()}
                    </Chip>
                  )}
                </div>
                <div style={{ fontSize: 13, color: T.textSecondary }}>
                  {v.customer_name || "—"} • {v.customer_phone || "—"}
                </div>
                {v.work_stages?.[0] && (
                  <WorkBadges T={T} ws={v.work_stages[0]} />
                )}
              </div>
              <div
                style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}
              >
                <Chip color={meta.color} bg={meta.color + "22"}>
                  {meta.icon} {meta.label}
                </Chip>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 5 }}>
                  {formatIST(v.entry_time)}
                </div>
              </div>
            </div>
          );
        })
      )}
    </Dlg>
  );
}

function VehicleDetailModal({ T, vehicle, users, teams, onClose }) {
  const [history, setHistory] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase
        .from("vehicle_history")
        .select("*,user:users!vehicle_history_user_id_fkey(full_name)")
        .eq("vehicle_id", vehicle.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("customer_complaints")
        .select("*")
        .eq("vehicle_id", vehicle.id)
        .order("complaint_number", { ascending: true }),
    ]).then(([h, c]) => {
      setHistory(h.data || []);
      setComplaints(c.data || []);
      setLoading(false);
    });
  }, [vehicle.id]);

  const ws = vehicle.work_stages?.[0];
  const teamMap = Object.fromEntries((teams || []).map((t) => [t.id, t.name]));
  const userMap = Object.fromEntries(
    (users || []).map((u) => [u.id, u.full_name]),
  );
  const meta = STAGE_META[vehicle.current_stage] || {
    label: vehicle.current_stage,
    icon: "🚗",
    color: T.blue,
  };

  const info = [
    ["Customer", vehicle.customer_name || "—"],
    ["Phone", vehicle.customer_phone || "—"],
    ["Model", vehicle.model || "—"],
    [
      "Odometer",
      vehicle.odometer_reading ? `${vehicle.odometer_reading} km` : "—",
    ],
    ["Fuel", vehicle.fuel_level || "—"],
    ["Priority", vehicle.priority || "normal"],
    ["Service", vehicle.service_type?.replace(/_/g, " ") || "—"],
    ["Entry", formatIST(vehicle.entry_time)],
    vehicle.expected_completion_time && [
      "Expected",
      formatIST(vehicle.expected_completion_time),
    ],
    vehicle.bill_amount > 0 && ["Bill", fmt(vehicle.bill_amount)],
    vehicle.total_paid > 0 && ["Paid", fmt(vehicle.total_paid)],
    vehicle.credit_amount > 0 && ["Credit", fmt(vehicle.credit_amount)],
    vehicle.credit_guaranteed_by && [
      "Guaranteed By",
      vehicle.credit_guaranteed_by,
    ],
    vehicle.payment_status && ["Payment", vehicle.payment_status],
    vehicle.job_code && ["Job Code", vehicle.job_code],
  ].filter(Boolean);

  return (
    <Dlg
      T={T}
      open={true}
      onClose={onClose}
      title={`${meta.icon} ${vehicle.vehicle_number} — ${meta.label}`}
      width={740}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 14,
        }}
      >
        {info.map(([l, val]) => (
          <div
            key={l}
            style={{
              background: T.surfaceElevated,
              borderRadius: 6,
              padding: "8px 12px",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: T.textMuted,
                fontWeight: 700,
                textTransform: "uppercase",
                marginBottom: 3,
              }}
            >
              {l}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: T.text,
                textTransform: "capitalize",
                wordBreak: "break-word",
              }}
            >
              {val}
            </div>
          </div>
        ))}
      </div>
      {vehicle.customer_voice && (
        <div
          style={{
            background: T.blueLight,
            border: `1px solid ${T.blue}33`,
            borderRadius: 8,
            padding: 12,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: T.blue,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            💬 Customer Voice
          </div>
          <div style={{ fontSize: 13, color: T.text, fontStyle: "italic" }}>
            "{vehicle.customer_voice}"
          </div>
        </div>
      )}
      {ws && DEPT_KEYS.some((d) => ws[`${d}_required`]) && (
        <div style={{ marginBottom: 14 }}>
          <SecTitle T={T}>Work Status</SecTitle>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 8,
            }}
          >
            {DEPT_KEYS.map((dept) => {
              if (!ws[`${dept}_required`]) return null;
              const st = ws[`${dept}_status`];
              const map = {
                completed: [T.green, T.greenLight],
                in_progress: [T.amber, T.amberLight],
                on_hold: [T.red, T.redLight],
                not_started: [T.textMuted, T.surfaceElevated],
              };
              const [c, bg] = map[st] || map.not_started;
              const dm = STAGE_META[dept];
              return (
                <div
                  key={dept}
                  style={{
                    background: bg,
                    borderRadius: 8,
                    padding: "9px 10px",
                    border: `1px solid ${c}44`,
                  }}
                >
                  <div style={{ fontSize: 14, marginBottom: 3 }}>{dm.icon}</div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: T.textSecondary,
                    }}
                  >
                    {dm.label}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: c,
                      textTransform: "capitalize",
                      marginTop: 2,
                    }}
                  >
                    {st?.replace(/_/g, " ")}
                  </div>
                  {ws[`${dept}_team_id`] && teamMap[ws[`${dept}_team_id`]] && (
                    <div
                      style={{ fontSize: 9, color: T.textMuted, marginTop: 1 }}
                    >
                      👥 {teamMap[ws[`${dept}_team_id`]]}
                    </div>
                  )}
                  {ws[`${dept}_locked_by`] &&
                    userMap[ws[`${dept}_locked_by`]] && (
                      <div style={{ fontSize: 9, color: T.textMuted }}>
                        👤 {userMap[ws[`${dept}_locked_by`]]}
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {complaints.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <SecTitle T={T}>Complaints ({complaints.length})</SecTitle>
          {complaints.map((c) => (
            <div
              key={c.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                padding: "9px 12px",
                background: T.surfaceElevated,
                borderRadius: 6,
                marginBottom: 6,
              }}
            >
              <div>
                <span style={{ fontWeight: 700, color: T.text, fontSize: 13 }}>
                  #{c.complaint_number}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: T.textSecondary,
                    marginLeft: 10,
                  }}
                >
                  {c.complaint_text}
                </span>
              </div>
              <Chip
                color={c.is_resolved ? T.green : T.amber}
                bg={c.is_resolved ? T.greenLight : T.amberLight}
              >
                {c.is_resolved ? "Resolved" : "Pending"}
              </Chip>
            </div>
          ))}
        </div>
      )}
      <SecTitle T={T}>Timeline</SecTitle>
      {loading ? (
        <div style={{ textAlign: "center", padding: 20, color: T.textMuted }}>
          Loading...
        </div>
      ) : history.length === 0 ? (
        <Empty T={T} icon="📭" text="No history" />
      ) : (
        <div style={{ maxHeight: 300, overflowY: "auto" }}>
          {history.map((item, idx) => (
            <div
              key={item.id}
              style={{ display: "flex", gap: 10, marginBottom: 4 }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: "#f59e0b",
                    marginTop: 4,
                  }}
                />
                {idx < history.length - 1 && (
                  <div
                    style={{
                      width: 1,
                      flex: 1,
                      background: T.border,
                      marginTop: 2,
                      minHeight: 14,
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  flex: 1,
                  background: T.surfaceElevated,
                  borderRadius: 6,
                  padding: "7px 11px",
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: T.text,
                      textTransform: "capitalize",
                    }}
                  >
                    {item.stage?.replace(/_/g, " ")} —{" "}
                    {item.action?.replace(/_/g, " ")}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: T.textMuted,
                      flexShrink: 0,
                      marginLeft: 8,
                    }}
                  >
                    {formatIST(item.created_at)}
                  </span>
                </div>
                {item.user && (
                  <div style={{ fontSize: 10, color: T.textSecondary }}>
                    👤 {item.user.full_name}
                  </div>
                )}
                {item.new_value && (
                  <div
                    style={{
                      fontSize: 10,
                      color: T.textSecondary,
                      marginTop: 1,
                    }}
                  >
                    {item.new_value}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Dlg>
  );
}

// ─── Excel Export ─────────────────────────────────────────────────────────────
async function exportToExcel(reportType, fromDate, toDate) {
  const f0 = fromDate + "T00:00:00+05:30";
  const t0 = toDate + "T23:59:59+05:30";
  const wb = XLSX.utils.book_new();
  const sheet = (rows, name) => {
    if (rows.length)
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name);
  };

  if (reportType === "operations") {
    const { data: veh } = await supabase
      .from("vehicles")
      .select(
        "*,work_stages(*),advisor:users!vehicles_advisor_id_fkey(full_name)",
      )
      .eq("current_stage", "completed")
      .gte("updated_at", f0)
      .lte("updated_at", t0)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });
    const vids = (veh || []).map((v) => v.id);
    const { data: hist } = vids.length
      ? await supabase
          .from("vehicle_history")
          .select("*,user:users!vehicle_history_user_id_fkey(full_name)")
          .in("vehicle_id", vids)
          .in("action", [
            "work_started",
            "work_completed",
            "started",
            "completed",
            "on_hold",
          ])
          .order("created_at", { ascending: true })
      : { data: [] };
    const { data: pays } = await supabase
      .from("payments")
      .select(
        "*,vehicle:vehicles!payments_vehicle_id_fkey(vehicle_number,customer_name),collector:users!payments_collected_by_fkey(full_name)",
      )
      .gte("created_at", f0)
      .lte("created_at", t0)
      .order("created_at", { ascending: false });
    const deptDone = (v, d) =>
      v.work_stages?.[0]?.[`${d}_required`]
        ? v.work_stages[0][`${d}_status`] === "completed"
          ? "Yes"
          : "No"
        : "N/A";
    sheet(
      (veh || []).map((v) => {
        const e = v.entry_time ? new Date(toZ(v.entry_time)) : null;
        const x = v.updated_at ? new Date(toZ(v.updated_at)) : null;
        const exp = v.expected_completion_time
          ? new Date(toZ(v.expected_completion_time))
          : null;
        const tat = e && x ? Math.round((x - e) / 60000) : null;
        return {
          "Vehicle No": v.vehicle_number,
          "Customer Name": v.customer_name || "",
          "Customer Phone": v.customer_phone || "",
          Model: v.model || "",
          "Odometer (km)": v.odometer_reading || "",
          "Fuel Level": v.fuel_level || "",
          "Service Type": v.service_type?.replace(/_/g, " ") || "",
          Priority: v.priority || "normal",
          Advisor: v.advisor?.full_name || "",
          "Job Code": v.job_code || "",
          "Part Amount": v.part_amount || "",
          "Entry Time": e
            ? e.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
            : "",
          "Exit Time": x
            ? x.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
            : "",
          "TAT (mins)": tat,
          "TAT (hrs)": tat ? (tat / 60).toFixed(1) : "",
          "Bill Amount": v.bill_amount || 0,
          "Total Paid": v.total_paid || 0,
          "Credit Amount": v.credit_amount || 0,
          "Payment Status": v.payment_status || "",
          "Credit Guaranteed By": v.credit_guaranteed_by || "",
          "SLA Breached": exp && x ? (x > exp ? "YES" : "NO") : "—",
          Mechanic: deptDone(v, "mechanic"),
          Painter: deptDone(v, "painter"),
          Denter: deptDone(v, "denter"),
          Electrician: deptDone(v, "electrician"),
          "3M": deptDone(v, "three_m"),
          Alignment: deptDone(v, "alignment_balancing"),
          Washing: deptDone(v, "washing"),
        };
      }),
      "Vehicle Summary",
    );
    const hm = {};
    (hist || []).forEach((h) => {
      const vId = h.vehicle_id;
      const d = h.stage;
      if (!DEPT_KEYS.includes(d)) return;
      if (!hm[vId]) hm[vId] = {};
      if (!hm[vId][d]) hm[vId][d] = { s: null, e: null, hold: 0, worker: "" };
      const a = h.action;
      const t = new Date(toZ(h.created_at));
      if ((a === "started" || a === "work_started") && !hm[vId][d].s) {
        hm[vId][d].s = t;
        hm[vId][d].worker = h.user?.full_name || "";
      }
      if (a === "completed" || a === "work_completed") hm[vId][d].e = t;
      if (a === "on_hold") hm[vId][d].hold++;
    });
    const dRows = [];
    (veh || []).forEach((v) => {
      const ws = v.work_stages?.[0];
      if (!ws) return;
      DEPT_KEYS.forEach((d) => {
        if (!ws[`${d}_required`]) return;
        const lg = hm[v.id]?.[d];
        const dur = lg?.s && lg?.e ? Math.round((lg.e - lg.s) / 60000) : null;
        dRows.push({
          "Vehicle No": v.vehicle_number,
          Customer: v.customer_name || "",
          Model: v.model || "",
          Department: STAGE_META[d]?.label || d,
          Status: ws[`${d}_status`] || "",
          Worker: lg?.worker || "",
          "Start Time": lg?.s
            ? lg.s.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
            : "",
          "End Time": lg?.e
            ? lg.e.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
            : "",
          "Duration (mins)": dur,
          "On Hold": lg?.hold || 0,
        });
      });
    });
    sheet(dRows, "Dept Work Log");
    sheet(
      (pays || []).map((p) => ({
        "Vehicle No": p.vehicle?.vehicle_number || "",
        Customer: p.vehicle?.customer_name || "",
        Amount: p.amount || 0,
        Method: p.payment_method || "",
        "Collected By": p.collector?.full_name || "",
        "Transaction ID": p.transaction_id || "",
        Time: new Date(toZ(p.created_at)).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        }),
      })),
      "Payments",
    );
    XLSX.writeFile(wb, `Operations_${fromDate}_to_${toDate}.xlsx`);
  } else if (reportType === "washing") {
    const { data: wd } = await supabase
      .from("washing_details")
      .select(
        "*,vehicle:vehicles!washing_details_vehicle_id_fkey(vehicle_number,customer_name,model,work_stages(*),deleted_at)",
      )
      .gte("created_at", f0)
      .lte("created_at", t0);
    const wdFiltered = (wd || []).filter((w) => !w.vehicle?.deleted_at);
    const vids2 = wdFiltered.map((w) => w.vehicle_id);
    const { data: wh } = vids2.length
      ? await supabase
          .from("vehicle_history")
          .select(
            "vehicle_id,action,created_at,user:users!vehicle_history_user_id_fkey(full_name)",
          )
          .eq("stage", "washing")
          .in("vehicle_id", vids2)
          .order("created_at", { ascending: true })
      : { data: [] };
    const whm = {};
    (wh || []).forEach((h) => {
      if (!whm[h.vehicle_id]) whm[h.vehicle_id] = {};
      const t = new Date(toZ(h.created_at));
      const a = h.action;
      if ((a === "started" || a === "work_started") && !whm[h.vehicle_id].s) {
        whm[h.vehicle_id].s = t;
        whm[h.vehicle_id].worker = h.user?.full_name || "";
      }
      if (a === "completed" || a === "work_completed") whm[h.vehicle_id].e = t;
    });
    sheet(
      wdFiltered.map((w) => {
        const v = w.vehicle;
        const ws = v?.work_stages?.[0];
        const lg = whm[w.vehicle_id];
        const dur = lg?.s && lg?.e ? Math.round((lg.e - lg.s) / 60000) : null;
        return {
          "Vehicle No": v?.vehicle_number || "",
          Customer: v?.customer_name || "",
          Model: v?.model || "",
          "Slot Date": w.slot_date || "",
          "Slot Time": w.slot || "",
          "Wash Types": (w.washing_types || []).join(", "),
          Status: ws?.washing_status || "",
          Worker: lg?.worker || "",
          Start: lg?.s
            ? lg.s.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
            : "",
          End: lg?.e
            ? lg.e.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
            : "",
          "Duration (mins)": dur,
        };
      }) || [{ note: "No data" }],
      "Washing",
    );
    XLSX.writeFile(wb, `Washing_${fromDate}_to_${toDate}.xlsx`);
  } else if (reportType === "special_work") {
    const { data: tm } = await supabase
      .from("three_m_details")
      .select(
        "*,vehicle:vehicles!three_m_details_vehicle_id_fkey(vehicle_number,customer_name,model,deleted_at)",
      )
      .gte("created_at", f0)
      .lte("created_at", t0);
    sheet(
      (tm || [])
        .filter((t) => !t.vehicle?.deleted_at)
        .map((t) => ({
          "Vehicle No": t.vehicle?.vehicle_number || "",
          Customer: t.vehicle?.customer_name || "",
          Model: t.vehicle?.model || "",
          Assigned: (t.work_types || []).join(", "),
          Completed: (t.completed_types || []).join(", "),
          "Completion %":
            t.work_types?.length > 0
              ? Math.round(
                  ((t.completed_types?.length || 0) / t.work_types.length) *
                    100,
                ) + "%"
              : "0%",
        })),
      "3M Work",
    );
    const { data: al } = await supabase
      .from("alignment_details")
      .select(
        "*,vehicle:vehicles!alignment_details_vehicle_id_fkey(vehicle_number,customer_name,model,deleted_at),worker:users!alignment_details_created_by_fkey(full_name)",
      )
      .gte("created_at", f0)
      .lte("created_at", t0);
    sheet(
      (al || [])
        .filter((a) => !a.vehicle?.deleted_at)
        .map((a) => ({
          "Vehicle No": a.vehicle?.vehicle_number || "",
          Customer: a.vehicle?.customer_name || "",
          Model: a.vehicle?.model || "",
          Worker: a.worker?.full_name || "",
          "Work Types": Array.isArray(a.work_types)
            ? a.work_types.map((w) => w.type?.replace(/_/g, " ")).join(", ")
            : "",
        })),
      "Alignment",
    );
    XLSX.writeFile(wb, `SpecialWork_${fromDate}_to_${toDate}.xlsx`);
  } else if (reportType === "productivity") {
    const { data: veh } = await supabase
      .from("vehicles")
      .select(
        "id,vehicle_number,bill_amount,credit_amount,advisor_id,work_stages(*)",
      )
      .eq("current_stage", "completed")
      .gte("updated_at", f0)
      .lte("updated_at", t0)
      .is("deleted_at", null);
    const { data: us } = await supabase
      .from("users")
      .select("id,full_name,role")
      .eq("is_active", true);
    const { data: hist } = await supabase
      .from("vehicle_history")
      .select("vehicle_id,stage,action,created_at")
      .gte("created_at", f0)
      .lte("created_at", t0)
      .in("action", [
        "started",
        "work_started",
        "completed",
        "work_completed",
        "on_hold",
      ])
      .order("created_at", { ascending: true });
    const hm = {};
    (hist || []).forEach((h) => {
      const d = h.stage;
      if (!DEPT_KEYS.includes(d)) return;
      const vId = h.vehicle_id;
      if (!hm[vId]) hm[vId] = {};
      if (!hm[vId][d]) hm[vId][d] = { s: null, e: null, hold: 0 };
      const t = new Date(toZ(h.created_at));
      const a = h.action;
      if ((a === "started" || a === "work_started") && !hm[vId][d].s)
        hm[vId][d].s = t;
      if (a === "completed" || a === "work_completed") hm[vId][d].e = t;
      if (a === "on_hold") hm[vId][d].hold++;
    });
    sheet(
      (us || [])
        .filter((u) => u.role === "advisor")
        .map((a) => {
          const avs = (veh || []).filter((v) => v.advisor_id === a.id);
          const rev = avs.reduce(
            (s, v) => s + (parseFloat(v.bill_amount) || 0),
            0,
          );
          const cred = avs.reduce(
            (s, v) => s + (parseFloat(v.credit_amount) || 0),
            0,
          );
          return {
            Advisor: a.full_name,
            Completed: avs.length,
            Revenue: rev,
            "Credit Given": cred,
            "Avg Bill": avs.length ? Math.round(rev / avs.length) : 0,
            "Credit Rate %":
              rev > 0 ? Math.round((cred / (rev + cred)) * 100) : 0,
          };
        }),
      "Advisor Productivity",
    );
    sheet(
      DEPT_KEYS.map((d) => {
        const done = (veh || []).filter(
          (v) =>
            v.work_stages?.[0]?.[`${d}_required`] &&
            v.work_stages[0][`${d}_status`] === "completed",
        );
        const tats = done
          .map((v) => {
            const lg = hm[v.id]?.[d];
            if (!lg?.s || !lg?.e) return null;
            return (lg.e - lg.s) / 60000;
          })
          .filter((t) => t && t > 0 && t < 1440);
        const avg = tats.length
          ? tats.reduce((a, b) => a + b, 0) / tats.length
          : null;
        const hold = done.reduce((s, v) => s + (hm[v.id]?.[d]?.hold || 0), 0);
        return {
          Department: STAGE_META[d]?.label,
          Completed: done.length,
          "Avg TAT (mins)": avg ? Math.round(avg) : "",
          "Avg TAT (hrs)": avg ? (avg / 60).toFixed(1) : "",
          "On-Hold Events": hold,
        };
      }),
      "Dept Productivity",
    );
    XLSX.writeFile(wb, `StaffProductivity_${fromDate}_to_${toDate}.xlsx`);
  } else if (reportType === "credit") {
    const { data: cv } = await supabase
      .from("vehicles")
      .select(
        "vehicle_number,customer_name,customer_phone,bill_amount,total_paid,credit_amount,credit_guaranteed_by,entry_time,current_stage,payment_status",
      )
      .gt("credit_amount", 0)
      .is("deleted_at", null)
      .order("entry_time", { ascending: false });
    const today = new Date();
    sheet(
      (cv || []).map((v) => {
        const e = v.entry_time ? new Date(toZ(v.entry_time)) : null;
        return {
          "Vehicle No": v.vehicle_number,
          Customer: v.customer_name || "",
          Phone: v.customer_phone || "",
          "Visit Date": e
            ? e.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })
            : "",
          Bill: v.bill_amount || 0,
          Paid: v.total_paid || 0,
          "Credit Outstanding": v.credit_amount || 0,
          "Guaranteed By": v.credit_guaranteed_by || "",
          Stage: v.current_stage || "",
          "Payment Status": v.payment_status || "",
          "Days Outstanding": e ? Math.floor((today - e) / 86400000) : "",
        };
      }),
      "Credit Outstanding",
    );
    XLSX.writeFile(
      wb,
      `CreditOutstanding_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  } else if (reportType === "front_checkup") {
    const { data: veh } = await supabase
      .from("vehicles")
      .select(
        "id, vehicle_number, customer_name, model, entry_time, fc_completed, fc_cancelled, fc_skip_reason, current_stage",
      )
      .gte("entry_time", f0)
      .lte("entry_time", t0)
      .is("deleted_at", null);
    const vids = (veh || []).map((v) => v.id);
    const { data: details } = vids.length
      ? await supabase
          .from("front_checkup_details")
          .select("vehicle_id, work_1_by, work_2_by, work_3_by")
          .in("vehicle_id", vids)
      : { data: [] };
    const { data: fcUsers } = await supabase
      .from("users")
      .select("id, full_name")
      .eq("role", "front_checkup");
    const userMap = {};
    (fcUsers || []).forEach((u) => {
      userMap[u.id] = u.full_name;
    });
    const detailMap = {};
    (details || []).forEach((d) => {
      detailMap[d.vehicle_id] = d;
    });
    sheet(
      (veh || []).map((v) => {
        const fc = detailMap[v.id];
        const status = v.fc_completed
          ? "Completed"
          : v.fc_cancelled
            ? "Cancelled"
            : v.fc_skip_reason
              ? "Skipped"
              : "Pending";
        return {
          "Vehicle No": v.vehicle_number,
          "Customer Name": v.customer_name || "",
          Model: v.model || "",
          "Entry Time": v.entry_time
            ? new Date(v.entry_time).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              })
            : "",
          "FC Status": status,
          "Work 1 By": fc ? userMap[fc.work_1_by] || "" : "",
          "Work 2 By": fc ? userMap[fc.work_2_by] || "" : "",
          "Work 3 By": fc ? userMap[fc.work_3_by] || "" : "",
          "Skip Reason": v.fc_skip_reason || "",
          "Current Stage": v.current_stage || "",
        };
      }),
      "FC Vehicle Log",
    );
    // Staff summary sheet
    const staffSummary = {};
    (fcUsers || []).forEach((u) => {
      staffSummary[u.id] = {
        Name: u.full_name,
        "Work 1": 0,
        "Work 2": 0,
        "Work 3": 0,
        Total: 0,
      };
    });
    (details || []).forEach((d) => {
      if (d.work_1_by && staffSummary[d.work_1_by]) {
        staffSummary[d.work_1_by]["Work 1"]++;
        staffSummary[d.work_1_by].Total++;
      }
      if (d.work_2_by && staffSummary[d.work_2_by]) {
        staffSummary[d.work_2_by]["Work 2"]++;
        staffSummary[d.work_2_by].Total++;
      }
      if (d.work_3_by && staffSummary[d.work_3_by]) {
        staffSummary[d.work_3_by]["Work 3"]++;
        staffSummary[d.work_3_by].Total++;
      }
    });
    sheet(
      Object.values(staffSummary).sort((a, b) => b.Total - a.Total),
      "FC Staff Summary",
    );
    XLSX.writeFile(wb, `FrontCheckup_${fromDate}_to_${toDate}.xlsx`);
  } else if (reportType === "spare_requirement") {
    const { data: orders } = await supabase
      .from("part_orders")
      .select(
        "*,vehicle:vehicles!part_orders_vehicle_id_fkey(vehicle_number,model)",
      )
      .gte("requested_at", f0)
      .lte("requested_at", t0)
      .order("requested_at", { ascending: false });
    const oids = (orders || []).map((o) => o.id);
    const { data: items } = oids.length
      ? await supabase
          .from("part_order_items")
          .select("*,part:parts_catalog(name)")
          .in("order_id", oids)
      : { data: [] };
    const itemsByOrder = {};
    (items || []).forEach((it) => {
      if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = [];
      itemsByOrder[it.order_id].push(it);
    });
    const rows = (orders || []).map((o) => ({
      "Vehicle No": o.vehicle?.vehicle_number || "",
      Model: o.vehicle?.model || "",
      Requested: new Date(toZ(o.requested_at)).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      }),
      Stage: o.requested_stage || "",
      Status: o.status,
      Items: (itemsByOrder[o.id] || [])
        .map(
          (it) =>
            `${it.custom_part_name || it.part?.name || "Unknown"} x${it.quantity}`,
        )
        .join(", "),
    }));
    const partCounts = {};
    (items || []).forEach((it) => {
      const key = it.custom_part_name || it.part?.name || "Unknown";
      partCounts[key] = (partCounts[key] || 0) + it.quantity;
    });
    const summaryRows = Object.entries(partCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, qty]) => ({ Part: name, "Total Requested": qty }));
    sheet(rows, "Spare Requests");
    sheet(summaryRows, "Most Requested Parts");
    XLSX.writeFile(wb, `Spare_Requirement_${fromDate}_to_${toDate}.xlsx`);
  } else if (reportType === "force_pdi") {
    const { data: hist } = await supabase
      .from("vehicle_history")
      .select(
        "target_team_id,target_role,target_user_id,*,user:users!vehicle_history_user_id_fkey(full_name),vehicle:vehicles!vehicle_history_vehicle_id_fkey(vehicle_number,customer_name,model)",
      )
      .eq("action", "force_completed")
      .gte("created_at", f0)
      .lte("created_at", t0)
      .order("created_at", { ascending: false });
    const { data: deptHist } = await supabase
      .from("vehicle_history")
      .select(
        "*,user:users!vehicle_history_user_id_fkey(full_name),vehicle:vehicles!vehicle_history_vehicle_id_fkey(vehicle_number)",
      )
      .in("action", ["force_completed", "work_cancelled"])
      .gte("created_at", f0)
      .lte("created_at", t0)
      .order("created_at", { ascending: true });
    const { data: veh } = await supabase
      .from("vehicles")
      .select("id,vehicle_number,customer_name,model,entry_time,work_stages(*)")
      .gte("entry_time", f0)
      .lte("entry_time", t0)
      .is("deleted_at", null);
    const { data: acctHist } = await supabase
      .from("vehicle_history")
      .select(
        "vehicle_id,stage,action,created_at,user:users!vehicle_history_user_id_fkey(full_name)",
      )
      .gte("created_at", f0)
      .lte("created_at", t0)
      .in("action", [
        "started",
        "work_started",
        "completed",
        "work_completed",
        "on_hold",
        "force_completed",
        "work_cancelled",
      ])
      .order("created_at", { ascending: true });
    const { data: teamsData } = await supabase
      .from("teams")
      .select("id,name,role");
    sheet(
      (hist || []).map((h) => ({
        "Vehicle No": h.vehicle?.vehicle_number || "",
        Customer: h.vehicle?.customer_name || "",
        Model: h.vehicle?.model || "",
        "Force PDI By": h.user?.full_name || "",
        Summary: h.new_value || "",
        "Departments Not Updated": h.notes || "",
        Time: new Date(toZ(h.created_at)).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        }),
      })),
      "Force PDI Summary",
    );
    sheet(
      (deptHist || []).map((h) => ({
        "Vehicle No": h.vehicle?.vehicle_number || "",
        Department: h.stage || "",
        Action:
          h.action === "force_completed" ? "Force Completed" : "Cancelled",
        "By Advisor": h.user?.full_name || "",
        Notes: h.notes || "",
        Time: new Date(toZ(h.created_at)).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        }),
      })),
      "Dept Actions",
    );
    const summaryRows = [];
    ["mechanic", "denter", "electrician", "painter"].forEach((dept) => {
      const deptTeams = (teamsData || []).filter((t) => t.role === dept);
      const affectedForDept = (deptHist || []).filter((h) => h.stage === dept);
      deptTeams.forEach((team) => {
        const teamVehicleNums = (veh || [])
          .filter((v) => v.work_stages?.[0]?.[`${dept}_team_id`] === team.id)
          .map((v) => v.vehicle_number);
        const unique = [
          ...new Set(
            affectedForDept
              .filter((h) =>
                teamVehicleNums.includes(h.vehicle?.vehicle_number),
              )
              .map((h) => h.vehicle?.vehicle_number)
              .filter(Boolean),
          ),
        ];
        if (!unique.length) return;
        summaryRows.push({
          "Team / Department": team.name,
          Role: STAGE_META[dept]?.label || dept,
          "Vehicles with Force PDI": unique.join(", "),
          Count: unique.length,
        });
      });
    });
    ["washing", "three_m", "alignment_balancing"].forEach((dept) => {
      const unique = [
        ...new Set(
          (deptHist || [])
            .filter((h) => h.stage === dept)
            .map((h) => h.vehicle?.vehicle_number)
            .filter(Boolean),
        ),
      ];
      if (!unique.length) return;
      summaryRows.push({
        "Team / Department": STAGE_META[dept]?.label || dept,
        Role: STAGE_META[dept]?.label || dept,
        "Vehicles with Force PDI": unique.join(", "),
        Count: unique.length,
      });
    });
    if (summaryRows.length)
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(summaryRows),
        "Dept Force PDI Summary",
      );
    const hm = {};
    (acctHist || []).forEach((h) => {
      const key = `${h.vehicle_id}__${h.stage}`;
      if (!hm[key])
        hm[key] = {
          s: null,
          e: null,
          hold: 0,
          worker: "",
          forceCompleted: false,
          cancelled: false,
        };
      const t = new Date(toZ(h.created_at));
      const a = h.action;
      if ((a === "started" || a === "work_started") && !hm[key].s) {
        hm[key].s = t;
        hm[key].worker = h.user?.full_name || "";
      }
      if (a === "completed" || a === "work_completed") hm[key].e = t;
      if (a === "on_hold") hm[key].hold++;
      if (a === "force_completed") hm[key].forceCompleted = true;
      if (a === "work_cancelled") hm[key].cancelled = true;
    });
    ["mechanic", "denter", "electrician"].forEach((dept) => {
      (teamsData || [])
        .filter((t) => t.role === dept)
        .forEach((team) => {
          const deptVehicles = (veh || []).filter(
            (v) => v.work_stages?.[0]?.[`${dept}_required`],
          );
          const rows = [];
          deptVehicles
            .filter((v) => v.work_stages?.[0]?.[`${dept}_team_id`] === team.id)
            .forEach((v) => {
              const ws = v.work_stages?.[0];
              const key = `${v.id}__${dept}`;
              const lg = hm[key] || {};
              const dur =
                lg.s && lg.e ? Math.round((lg.e - lg.s) / 60000) : null;
              const status = ws?.[`${dept}_status`] || "not_started";
              rows.push({
                "Vehicle No": v.vehicle_number,
                Customer: v.customer_name || "",
                Model: v.model || "",
                Team: team.name,
                Worker: lg.worker || "",
                Status: status,
                "Start Time": lg.s
                  ? lg.s.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
                  : "Not started",
                "End Time": lg.e
                  ? lg.e.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
                  : "—",
                "TAT (mins)": dur || "",
                "On Hold Count": lg.hold || 0,
                "Force Completed": lg.forceCompleted ? "YES" : "No",
                "Work Cancelled": lg.cancelled ? "YES" : "No",
                Missed: status !== "completed" ? "YES" : "No",
              });
            });
          deptVehicles
            .filter((v) => !v.work_stages?.[0]?.[`${dept}_team_id`])
            .forEach((v) => {
              const ws = v.work_stages?.[0];
              const key = `${v.id}__${dept}`;
              const lg = hm[key] || {};
              rows.push({
                "Vehicle No": v.vehicle_number,
                Customer: v.customer_name || "",
                Model: v.model || "",
                Team: "UNASSIGNED",
                Worker: lg.worker || "",
                Status: ws?.[`${dept}_status`] || "not_started",
                "Start Time": lg.s
                  ? lg.s.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
                  : "Not started",
                "End Time": "—",
                "TAT (mins)": "",
                "On Hold Count": lg.hold || 0,
                "Force Completed": lg.forceCompleted ? "YES" : "No",
                "Work Cancelled": lg.cancelled ? "YES" : "No",
                Missed: "YES",
              });
            });
          if (rows.length)
            XLSX.utils.book_append_sheet(
              wb,
              XLSX.utils.json_to_sheet(rows),
              `${STAGE_META[dept]?.label} - ${team.name}`.slice(0, 31),
            );
        });
    });
    ["painter", "washing", "three_m", "alignment_balancing"].forEach((dept) => {
      const deptVehicles = (veh || []).filter(
        (v) => v.work_stages?.[0]?.[`${dept}_required`],
      );
      if (!deptVehicles.length) return;
      const rows = deptVehicles.map((v) => {
        const ws = v.work_stages?.[0];
        const key = `${v.id}__${dept}`;
        const lg = hm[key] || {};
        const dur = lg.s && lg.e ? Math.round((lg.e - lg.s) / 60000) : null;
        const status = ws?.[`${dept}_status`] || "not_started";
        return {
          "Vehicle No": v.vehicle_number,
          Customer: v.customer_name || "",
          Model: v.model || "",
          Worker: lg.worker || "",
          Status: status,
          "Start Time": lg.s
            ? lg.s.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
            : "Not started",
          "End Time": lg.e
            ? lg.e.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
            : "—",
          "TAT (mins)": dur || "",
          "On Hold Count": lg.hold || 0,
          "Force Completed": lg.forceCompleted ? "YES" : "No",
          "Work Cancelled": lg.cancelled ? "YES" : "No",
          Missed: status !== "completed" ? "YES" : "No",
        };
      });
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(rows),
        STAGE_META[dept]?.label?.slice(0, 31) || dept,
      );
    });
    XLSX.writeFile(wb, `ForcePDI_${fromDate}_to_${toDate}.xlsx`);
  }
}

// ─── OVERVIEW TAB ─────────────────────────────────────────────────────────────
function OverviewTab({
  T,
  derived,
  vehicles,
  todayPayments,
  creditVehicles,
  onVehiclePress,
  onQuickView,
}) {
  const {
    activeVehicles,
    todayEntries,
    todayEntriesVehicles,
    todayCompleted,
    overdue,
    vipUrgent,
    complaintVehicles,
    stuckVehicles,
    pendingPDI,
    pendingBilling,
    pendingPayment,
    readyForExit,
    todayCollection,
    totalOutstandingCredit,
    deptCounts,
    deptVehicles,
  } = derived;
  const [expanded, setExpanded] = useState({});
  const toggle = (key) => setExpanded((p) => ({ ...p, [key]: !p[key] }));
  const ageColor = (d) => (d > 60 ? T.red : d > 30 ? T.amber : T.green);
  const ageBg = (d) =>
    d > 60 ? T.redLight : d > 30 ? T.amberLight : T.greenLight;
  const ageLabel = (d) =>
    d > 60 ? "60+ days" : d > 30 ? "31–60 days" : "0–30 days";

  const CollapsibleAlert = ({ id, title, list, color, borderColor }) => {
    const open = expanded[id];
    return (
      <Bx
        T={T}
        style={{ marginBottom: 12, borderLeft: `4px solid ${borderColor}` }}
      >
        <div
          onClick={() => toggle(id)}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
            marginBottom: open ? 10 : 0,
          }}
        >
          <SecTitle
            T={T}
            style={{ marginBottom: 0, borderBottom: "none", paddingBottom: 0 }}
          >
            {title}
          </SecTitle>
          <span style={{ fontSize: 12, color: T.textMuted, paddingBottom: 8 }}>
            {open ? "▲ Hide" : "▼ Show"}
          </span>
        </div>
        {open &&
          list.map((v) => (
            <AlertRow
              key={v.id}
              T={T}
              v={v}
              color={color}
              onPress={() => onVehiclePress(v)}
            />
          ))}
      </Bx>
    );
  };

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6,1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <KPI
          T={T}
          label="Active"
          value={activeVehicles.length}
          icon="🚗"
          color={T.blue}
          onClick={() =>
            activeVehicles.length > 0 &&
            onQuickView("🚗 Active Vehicles", activeVehicles)
          }
        />
        <KPI
          T={T}
          label="Today's Entry"
          value={todayEntries}
          icon="📥"
          color={T.purple}
          onClick={() =>
            todayEntriesVehicles.length > 0 &&
            onQuickView("📥 Today's Entries", todayEntriesVehicles)
          }
        />
        <KPI
          T={T}
          label="Completed Today"
          value={todayCompleted.length}
          icon="✅"
          color={T.green}
          onClick={() =>
            todayCompleted.length > 0 &&
            onQuickView("✅ Completed Today", todayCompleted)
          }
        />
        <KPI
          T={T}
          label="Overdue"
          value={overdue.length}
          icon="⏰"
          color={overdue.length > 0 ? T.red : T.green}
          onClick={() =>
            overdue.length > 0 && onQuickView("⏰ Overdue", overdue)
          }
        />
        <KPI
          T={T}
          label="Today's Collection"
          value={`₹${(todayCollection / 1000).toFixed(1)}k`}
          icon="💰"
          color={T.green}
          onClick={() =>
            onQuickView(
              "💰 Today's Payments — " +
                todayPayments.filter((p) => p.payment_method !== "credit")
                  .length +
                " transactions",
              todayPayments.map((p) => ({ ...p, _isPayment: true })),
            )
          }
        />
        <KPI
          T={T}
          label="Credit Outstanding"
          value={`₹${(totalOutstandingCredit / 1000).toFixed(1)}k`}
          icon="📋"
          color={totalOutstandingCredit > 0 ? T.amber : T.green}
          onClick={() =>
            derived.creditGroups.length > 0 &&
            onQuickView(
              "📋 Credit Outstanding — " +
                derived.creditGroups.length +
                " vehicles",
              derived.creditGroups
                .map((g) => ({
                  ...g.visits[0],
                  priority: g.visits[0]?.priority ?? "normal",
                  work_stages: [],
                }))
                .filter(Boolean),
            )
          }
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <Bx T={T}>
          <SecTitle T={T}>Pipeline Status</SecTitle>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5,1fr)",
              gap: 10,
            }}
          >
            {[
              {
                label: "PDI",
                count: pendingPDI.length,
                color: T.green,
                list: pendingPDI,
                icon: "✅",
              },
              {
                label: "Billing",
                count: pendingBilling.length,
                color: T.blue,
                list: pendingBilling,
                icon: "🧾",
              },
              {
                label: "Payment",
                count: pendingPayment.length,
                color: T.cyan,
                list: pendingPayment,
                icon: "💳",
              },
              {
                label: "Exit",
                count: readyForExit.length,
                color: T.green,
                list: readyForExit,
                icon: "🚪",
              },
              {
                label: "Stuck",
                count: stuckVehicles.length,
                color: stuckVehicles.length > 0 ? T.red : T.green,
                list: stuckVehicles,
                icon: "🔴",
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  textAlign: "center",
                  background: item.color + "18",
                  border: `1px solid ${item.color}44`,
                  borderRadius: 8,
                  padding: "12px 4px",
                  cursor: item.list.length > 0 ? "pointer" : "default",
                  transition: "transform 0.1s",
                }}
                onClick={() =>
                  item.list.length > 0 &&
                  onQuickView(`${item.icon} ${item.label}`, item.list)
                }
                onMouseEnter={(e) =>
                  item.list.length > 0 &&
                  (e.currentTarget.style.transform = "translateY(-2px)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "translateY(0)")
                }
              >
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: item.color,
                    fontFamily: "'DM Mono',monospace",
                  }}
                >
                  {item.count}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: T.textSecondary,
                    fontWeight: 700,
                    marginTop: 3,
                  }}
                >
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </Bx>
        <Bx T={T}>
          <SecTitle T={T}>Department Load</SecTitle>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 8,
            }}
          >
            {DEPT_KEYS.map((dept) => {
              const dm = STAGE_META[dept];
              const n = deptCounts[dept];
              const list = deptVehicles[dept] || [];
              return (
                <div
                  key={dept}
                  style={{
                    textAlign: "center",
                    background: T.surfaceElevated,
                    borderRadius: 8,
                    padding: "9px 4px",
                    border:
                      n > 0
                        ? `1px solid ${dm.color}44`
                        : `1px solid ${T.border}`,
                    cursor: n > 0 ? "pointer" : "default",
                    transition: "transform 0.1s",
                  }}
                  onClick={() =>
                    n > 0 && onQuickView(`${dm.icon} ${dm.label}`, list)
                  }
                  onMouseEnter={(e) =>
                    n > 0 &&
                    (e.currentTarget.style.transform = "translateY(-2px)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = "translateY(0)")
                  }
                >
                  <div style={{ fontSize: 15 }}>{dm.icon}</div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: n > 0 ? dm.color : T.textMuted,
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    {n}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: T.textMuted,
                      fontWeight: 700,
                    }}
                  >
                    {dm.label.split(" ")[0]}
                  </div>
                </div>
              );
            })}
          </div>
        </Bx>
      </div>

      {overdue.length > 0 && (
        <CollapsibleAlert
          id="overdue"
          title={`⏰ Overdue (${overdue.length})`}
          list={overdue}
          color={T.red}
          borderColor={T.red}
        />
      )}
      {vipUrgent.length > 0 && (
        <CollapsibleAlert
          id="vip"
          title={`🔥 VIP / Urgent (${vipUrgent.length})`}
          list={vipUrgent}
          color={T.amber}
          borderColor={T.amber}
        />
      )}
      {stuckVehicles.length > 0 && (
        <CollapsibleAlert
          id="stuck"
          title={`🔴 Stuck — No Work Started (${stuckVehicles.length})`}
          list={stuckVehicles}
          color={T.red}
          borderColor={T.red}
        />
      )}
      {complaintVehicles.length > 0 && (
        <CollapsibleAlert
          id="complaints"
          title={`⚠️ Complaints (${complaintVehicles.length})`}
          list={complaintVehicles}
          color={T.amber}
          borderColor={T.amber}
        />
      )}
      {todayCompleted.length > 0 && (
        <CollapsibleAlert
          id="completed"
          title={`✅ Completed Today (${todayCompleted.length})`}
          list={todayCompleted}
          color={T.green}
          borderColor={T.green}
        />
      )}

      {derived.creditGroups.length > 0 && (
        <Bx T={T} style={{ borderLeft: `4px solid ${T.amber}` }}>
          <div
            onClick={() => toggle("creditAge")}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
              marginBottom: expanded.creditAge ? 10 : 0,
            }}
          >
            <SecTitle
              T={T}
              style={{
                marginBottom: 0,
                borderBottom: "none",
                paddingBottom: 0,
              }}
            >
              📋 Credit Outstanding — Ageing ({derived.creditGroups.length}{" "}
              vehicles)
            </SecTitle>
            <span
              style={{ fontSize: 12, color: T.textMuted, paddingBottom: 8 }}
            >
              {expanded.creditAge ? "▲ Hide" : "▼ Show"}
            </span>
          </div>
          {expanded.creditAge && (
            <div>
              {(() => {
                const today = new Date();
                const b0 = derived.creditGroups.filter(
                  (g) =>
                    Math.floor(
                      (today - new Date(toZ(g.visits[0]?.entry_time))) /
                        86400000,
                    ) <= 30,
                );
                const b30 = derived.creditGroups.filter((g) => {
                  const d = Math.floor(
                    (today - new Date(toZ(g.visits[0]?.entry_time))) / 86400000,
                  );
                  return d > 30 && d <= 60;
                });
                const b60 = derived.creditGroups.filter(
                  (g) =>
                    Math.floor(
                      (today - new Date(toZ(g.visits[0]?.entry_time))) /
                        86400000,
                    ) > 60,
                );
                return (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3,1fr)",
                      gap: 10,
                      marginBottom: 14,
                    }}
                  >
                    {[
                      [b0, "0–30 days", T.green, T.greenLight],
                      [b30, "31–60 days", T.amber, T.amberLight],
                      [b60, "60+ days", T.red, T.redLight],
                    ].map(([bkt, label, c, bg]) => (
                      <div
                        key={label}
                        style={{
                          textAlign: "center",
                          background: bg,
                          borderRadius: 8,
                          padding: "10px 8px",
                          border: `1px solid ${c}44`,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 800,
                            color: c,
                            fontFamily: "'DM Mono',monospace",
                          }}
                        >
                          {bkt.length}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: c,
                            fontWeight: 700,
                            marginTop: 2,
                          }}
                        >
                          {label}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            fontFamily: "'DM Mono',monospace",
                            color: c,
                            marginTop: 2,
                          }}
                        >
                          {fmt(bkt.reduce((s, g) => s + g.total_credit, 0))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
              {derived.creditGroups.map((group) => {
                const today = new Date();
                const oldestVisit = group.visits[group.visits.length - 1];
                const days = oldestVisit?.entry_time
                  ? Math.floor(
                      (today - new Date(toZ(oldestVisit.entry_time))) /
                        86400000,
                    )
                  : 0;
                return (
                  <div
                    key={group.vehicle_number}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "9px 12px",
                      background: T.surfaceElevated,
                      borderRadius: 6,
                      marginBottom: 5,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: 14,
                          fontFamily: "'DM Mono',monospace",
                          color: T.text,
                        }}
                      >
                        {group.vehicle_number}
                      </span>
                      <span style={{ fontSize: 13, color: T.textSecondary }}>
                        {group.customer_name || "—"}
                      </span>
                      <span style={{ fontSize: 12, color: T.textSecondary }}>
                        {group.customer_phone || "—"}
                      </span>
                      <Chip
                        color={ageColor(days)}
                        bg={ageBg(days)}
                        style={{ fontSize: 10 }}
                      >
                        {ageLabel(days)} ({days}d)
                      </Chip>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span style={{ fontSize: 13, color: T.textMuted }}>
                        {group.visits.length} visit
                        {group.visits.length !== 1 ? "s" : ""}
                      </span>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: 15,
                          color: ageColor(days),
                          fontFamily: "'DM Mono',monospace",
                        }}
                      >
                        {fmt(group.total_credit)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Bx>
      )}
    </div>
  );
}

function AlertRow({ T, v, color, onPress }) {
  const meta = STAGE_META[v.current_stage];
  return (
    <div
      onClick={onPress}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "9px 12px",
        background: T.surfaceElevated,
        borderRadius: 6,
        cursor: "pointer",
        marginBottom: 5,
        transition: "background 0.1s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = T.border)}
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = T.surfaceElevated)
      }
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            fontWeight: 800,
            color: T.text,
            fontSize: 14,
            fontFamily: "'DM Mono',monospace",
          }}
        >
          {v.vehicle_number}
        </span>
        {v.model && (
          <Chip color={T.blue} bg={T.blueLight}>
            {v.model}
          </Chip>
        )}
        {v.priority !== "normal" && (
          <Chip
            color={v.priority === "vip" ? T.purple : T.red}
            bg={v.priority === "vip" ? T.purpleLight : T.redLight}
          >
            {v.priority.toUpperCase()}
          </Chip>
        )}
        <span style={{ fontSize: 13, color: T.textSecondary }}>
          {v.customer_name || "—"}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 12, color: T.textSecondary }}>
          {meta?.icon} {meta?.label}
        </span>
        {v.expected_completion_time && (
          <span style={{ fontSize: 12, color, fontWeight: 700 }}>
            ⏰ {formatIST(v.expected_completion_time)}
          </span>
        )}
      </div>
    </div>
  );
}

const SPARE_SLOTS = [
  "09:30-10:30",
  "10:30-11:30",
  "11:30-12:30",
  "12:30-01:30",
  "02:30-03:30",
  "03:30-04:30",
  "04:30-05:30",
  "05:30-06:30",
];

function WashingFloorView({ T, vehicles }) {
  const [washingDetails, setWashingDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [washDate, setWashDate] = useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("washing_details").select("*");
      setWashingDetails(data || []);
      setLoading(false);
    })();
  }, []);

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const dayOffset = (n) => {
    const d = new Date(Date.now() + n * 86400000);
    return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  };
  const dayName = (d) =>
    new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" });
  const washDates = Array.from({ length: 8 }, (_, i) => dayOffset(i - 1));

  const washMap = {};
  washingDetails.forEach((w) => {
    washMap[w.vehicle_id] = w;
  });
  const washVehicles = vehicles.filter(
    (v) => v.work_stages?.[0]?.washing_required,
  );
  const bySlot = {};
  washVehicles.forEach((v) => {
    const w = washMap[v.id];
    if (!w?.slot || w.slot_date !== washDate) return;
    (bySlot[w.slot] = bySlot[w.slot] || []).push(v);
  });
  const noSlot = washVehicles.filter((v) => {
    const w = washMap[v.id];
    return (
      !w?.slot &&
      v.work_stages?.[0]?.washing_status !== "completed" &&
      washDate === today
    );
  });

  const to24 = (t) => {
    const [h, m] = t.trim().split(":").map(Number);
    return h >= 1 && h <= 8
      ? `${String(h + 12).padStart(2, "0")}:${String(m).padStart(2, "0")}`
      : t;
  };
  const nowTime = new Date().toLocaleTimeString("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  if (loading)
    return <div style={{ padding: 20, color: T.textMuted }}>Loading...</div>;

  return (
    <div>
      {/* Date strip — mirrors mobile's 8-day chip row */}
      <div
        style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto" }}
      >
        {washDates.map((d2) => {
          const on = d2 === washDate;
          const isToday2 = d2 === today;
          const slotCount = washingDetails.filter(
            (w) => w.slot_date === d2 && w.slot,
          ).length;
          return (
            <div
              key={d2}
              onClick={() => setWashDate(d2)}
              style={{
                cursor: "pointer",
                minWidth: 56,
                padding: "8px 10px",
                borderRadius: 10,
                textAlign: "center",
                background: on ? T.cyan : T.surface,
                border: `1px solid ${on ? T.cyan : T.border}`,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: on ? "rgba(255,255,255,0.7)" : T.textMuted,
                }}
              >
                {isToday2 ? "TODAY" : dayName(d2)}
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: on ? "#fff" : T.text,
                }}
              >
                {parseInt(d2.split("-")[2])}
              </div>
              {slotCount > 0 && (
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    color: on ? "#fff" : T.cyan,
                    marginTop: 2,
                  }}
                >
                  {slotCount}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {noSlot.length > 0 && (
        <Bx
          T={T}
          style={{ borderLeft: `4px solid ${T.amber}`, marginBottom: 14 }}
        >
          <div
            style={{
              fontWeight: 700,
              color: T.amber,
              fontSize: 13,
              marginBottom: 8,
            }}
          >
            ⚠️ No Slot Assigned ({noSlot.length})
          </div>
          {noSlot.map((v) => (
            <div
              key={v.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 8px",
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 13, color: T.text }}>
                {v.vehicle_number}
              </span>
              <span style={{ fontSize: 11, color: T.textSecondary }}>
                {v.customer_name || "—"}
              </span>
            </div>
          ))}
        </Bx>
      )}

      {SPARE_SLOTS.map((slot) => {
        const sv = bySlot[slot] || [];
        const [sa, sb] = slot.split("-");
        const isCur =
          washDate === today && nowTime >= to24(sa) && nowTime < to24(sb);
        const isPast = washDate === today && nowTime >= to24(sb);
        if (sv.length === 0 && isPast) return null;
        return (
          <Bx
            T={T}
            key={slot}
            style={{
              borderLeft: `3px solid ${
                isCur ? T.amber : isPast ? T.textMuted : T.cyan
              }`,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: sv.length > 0 ? 8 : 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 700, color: T.text, fontSize: 13 }}>
                  🕐 {slot}
                </span>
                {isCur && (
                  <Chip color={T.amber} bg={T.amberLight}>
                    NOW
                  </Chip>
                )}
              </div>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: sv.length >= 3 ? T.red : sv.length ? T.amber : T.green,
                }}
              >
                {sv.length}/3
              </span>
            </div>
            {sv.map((v) => {
              const ws = v.work_stages?.[0];
              const done = ws?.washing_status === "completed";
              return (
                <div
                  key={v.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 8px",
                    opacity: done ? 0.5 : 1,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: 13,
                      fontFamily: "'DM Mono',monospace",
                      color: T.text,
                    }}
                  >
                    {v.vehicle_number}
                  </span>
                  <span style={{ fontSize: 11, color: T.textSecondary }}>
                    {done ? "✅ Done" : v.customer_name || "—"}
                  </span>
                </div>
              );
            })}
          </Bx>
        );
      })}
    </div>
  );
}

// ─── FLOOR TAB ────────────────────────────────────────────────────────────────
function FloorTab({ T, vehicles, derived, onVehiclePress }) {
  const [view, setView] = useState("stage");
  const [expanded, setExpanded] = useState({});
  const PREVIEW = 5;
  const active = vehicles.filter((v) => v.current_stage !== "completed");
  const STAGE_ORDER = [
    "front_checkup",
    "advisor_review",
    "pending",
    "mechanic",
    "painter",
    "denter",
    "electrician",
    "three_m",
    "alignment_balancing",
    "washing",
    "pdi",
    "billing",
    "payment",
    "ready_for_exit",
  ];
  const stageGroups = {};
  STAGE_ORDER.forEach((s) => {
    let list;
    if (DEPT_KEYS.includes(s)) {
      list = active.filter((v) => {
        const ws = v.work_stages?.[0];
        if (!ws?.[`${s}_required`]) return false;
        const st = ws[`${s}_status`];
        return st === "in_progress" || st === "not_started" || st === "on_hold";
      });
    } else {
      list = active.filter((v) => v.current_stage === s);
    }
    if (list.length > 0) stageGroups[s] = list;
  });

  const VRow = ({ v }) => (
    <div
      onClick={() => onVehiclePress(v)}
      style={{
        padding: "8px 10px",
        background: T.surfaceElevated,
        borderRadius: 6,
        marginBottom: 5,
        cursor: "pointer",
        transition: "background 0.1s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = T.border)}
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = T.surfaceElevated)
      }
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontWeight: 800,
              fontSize: 13,
              fontFamily: "'DM Mono',monospace",
              color: T.text,
            }}
          >
            {v.vehicle_number}
          </span>
          {v.model && (
            <Chip color={T.blue} bg={T.blueLight} style={{ fontSize: 10 }}>
              {v.model}
            </Chip>
          )}
          {v.priority !== "normal" && (
            <Chip
              color={v.priority === "vip" ? T.purple : T.red}
              bg={v.priority === "vip" ? T.purpleLight : T.redLight}
              style={{ fontSize: 10 }}
            >
              {v.priority.toUpperCase()}
            </Chip>
          )}
        </div>
        <span style={{ fontSize: 10, color: T.textMuted, flexShrink: 0 }}>
          {formatIST(v.entry_time)}
        </span>
      </div>
      {v.customer_name && (
        <div style={{ fontSize: 11, color: T.textSecondary, marginTop: 2 }}>
          {v.customer_name}
        </div>
      )}
      {v.work_stages?.[0] && <WorkBadges T={T} ws={v.work_stages[0]} />}
    </div>
  );

  const ExpandBtn = ({ id, total }) => (
    <button
      onClick={() => setExpanded((p) => ({ ...p, [id]: !p[id] }))}
      style={{
        width: "100%",
        marginTop: 4,
        padding: "7px",
        background: "none",
        border: `1px dashed ${T.border}`,
        borderRadius: 6,
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 700,
        color: T.textSecondary,
        fontFamily: "inherit",
      }}
    >
      {expanded[id] ? "▲ Show less" : `▼ View all ${total} vehicles`}
    </button>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          ["stage", "By Stage"],
          ["team", "By Team"],
          ["advisor", "By Advisor"],
          ["washing", "Washing View"],
        ].map(([k, l]) => (
          <Btn
            key={k}
            T={T}
            v={view === k ? "primary" : "secondary"}
            onClick={() => setView(k)}
          >
            {l}
          </Btn>
        ))}
      </div>
      {view === "stage" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 14,
          }}
        >
          {Object.entries(stageGroups).map(([stage, svs]) => {
            const dm = STAGE_META[stage];
            const exp = expanded[stage];
            const shown = exp ? svs : svs.slice(0, PREVIEW);
            return (
              <Bx
                T={T}
                key={stage}
                style={{ borderTop: `3px solid ${dm.color}` }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <span style={{ fontSize: 15 }}>{dm.icon}</span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: T.text,
                      flex: 1,
                      fontSize: 13,
                    }}
                  >
                    {dm.label}
                  </span>
                  <Chip color={dm.color} bg={dm.color + "22"}>
                    {svs.length}
                  </Chip>
                  {DEPT_KEYS.includes(stage) && (
                    <Chip
                      color={T.purple}
                      bg={T.purpleLight}
                      style={{ fontSize: 9 }}
                    >
                      PARALLEL
                    </Chip>
                  )}
                </div>
                {shown.map((v) => (
                  <VRow key={v.id} v={v} />
                ))}
                {svs.length > PREVIEW && (
                  <ExpandBtn id={stage} total={svs.length} />
                )}
              </Bx>
            );
          })}
        </div>
      )}
      {view === "team" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 14,
          }}
        >
          {derived.teamLoads
            .filter((t) => t.activeVehicles.length > 0)
            .map((team) => {
              const dm = STAGE_META[team.role] || {
                color: T.blue,
                icon: "👥",
                label: team.role,
              };
              const exp = expanded[team.id];
              const shown = exp
                ? team.activeVehicles
                : team.activeVehicles.slice(0, PREVIEW);
              return (
                <Bx
                  T={T}
                  key={team.id}
                  style={{ borderTop: `3px solid ${dm.color}` }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{dm.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{ fontWeight: 700, color: T.text, fontSize: 13 }}
                      >
                        {team.name}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: dm.color,
                          fontWeight: 700,
                        }}
                      >
                        {dm.label}
                      </div>
                    </div>
                    <Chip color={dm.color} bg={dm.color + "22"}>
                      {team.activeVehicles.length}
                    </Chip>
                  </div>
                  {shown.map((v) => (
                    <VRow key={v.id} v={v} />
                  ))}
                  {team.activeVehicles.length > PREVIEW && (
                    <ExpandBtn
                      id={team.id}
                      total={team.activeVehicles.length}
                    />
                  )}
                </Bx>
              );
            })}
        </div>
      )}
      {view === "advisor" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 14,
          }}
        >
          {derived.advisorLoads
            .filter((a) => a.activeVehicles.length > 0)
            .map((advisor) => {
              const exp = expanded[advisor.id];
              const shown = exp
                ? advisor.activeVehicles
                : advisor.activeVehicles.slice(0, PREVIEW);
              return (
                <Bx
                  T={T}
                  key={advisor.id}
                  style={{ borderTop: `3px solid ${T.blue}` }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>👤</span>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{ fontWeight: 700, color: T.text, fontSize: 13 }}
                      >
                        {advisor.full_name}
                      </div>
                    </div>
                    <Chip color={T.blue} bg={T.blueLight}>
                      {advisor.activeVehicles.length}
                    </Chip>
                  </div>
                  {shown.map((v) => (
                    <VRow key={v.id} v={v} />
                  ))}
                  {advisor.activeVehicles.length > PREVIEW && (
                    <ExpandBtn
                      id={advisor.id}
                      total={advisor.activeVehicles.length}
                    />
                  )}
                </Bx>
              );
            })}
        </div>
      )}
      {view === "washing" && <WashingFloorView T={T} vehicles={active} />}
    </div>
  );
}

// ─── FINANCE TAB ──────────────────────────────────────────────────────────────
function FinanceTab({
  T,
  derived,
  todayPayments,
  allPayments,
  creditVehicles,
}) {
  const [sub, setSub] = useState("today");
  const [search, setSearch] = useState("");
  const [df, setDf] = useState("");
  const [dt, setDt] = useState("");
  const [mf, setMf] = useState("all");
  const { todayCollection, totalOutstandingCredit, creditGroups } = derived;
  const realP = todayPayments.filter((p) => p.payment_method !== "credit");
  const byMethod = {};
  ["cash", "upi", "card", "bank_transfer"].forEach((m) => {
    if (m === "upi")
      byMethod[m] = realP
        .filter((p) => p.payment_method?.startsWith("upi_"))
        .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    else
      byMethod[m] = realP
        .filter((p) => p.payment_method === m)
        .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  });
  const filtAll =
    mf === "outstanding"
      ? []
      : allPayments.filter((p) => {
          const m =
            !search.trim() ||
            (p.vehicle?.vehicle_number || "")
              .toLowerCase()
              .includes(search.toLowerCase()) ||
            (p.vehicle?.customer_name || "")
              .toLowerCase()
              .includes(search.toLowerCase());
          const fd =
            !df || new Date(toZ(p.created_at)) >= new Date(df + "T00:00:00");
          const td =
            !dt || new Date(toZ(p.created_at)) <= new Date(dt + "T23:59:59");
          const fm =
            mf === "all" ||
            (mf === "upi"
              ? p.payment_method?.startsWith("upi_")
              : p.payment_method === mf);
          return m && fd && td && fm;
        });
  const filtOut = (creditVehicles || []).filter(
    (v) =>
      !search.trim() ||
      (v.vehicle_number || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.customer_name || "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <Bx T={T}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: T.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 8,
            }}
          >
            Today's Collection
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 800,
              color: T.green,
              fontFamily: "'DM Mono',monospace",
            }}
          >
            {fmt(todayCollection)}
          </div>
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 5 }}>
            {todayPayments.filter((p) => p.payment_method !== "credit").length}{" "}
            transactions
          </div>
        </Bx>
        <Bx T={T}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: T.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 8,
            }}
          >
            Credit Outstanding
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 800,
              color: T.amber,
              fontFamily: "'DM Mono',monospace",
            }}
          >
            {fmt(totalOutstandingCredit)}
          </div>
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 5 }}>
            {creditGroups.length} vehicles
          </div>
        </Bx>
      </div>
      <Bx T={T} style={{ marginBottom: 18 }}>
        <SecTitle T={T}>Today by Method</SecTitle>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 12,
          }}
        >
          {[
            ["cash", "Cash", "💵", T.green],
            ["upi", "UPI (all)", "📱", T.blue],
            ["card", "Card", "💳", T.purple],
            ["bank_transfer", "Bank", "🏦", T.cyan],
          ].map(([k, l, ic, c]) => (
            <div
              key={k}
              style={{
                textAlign: "center",
                padding: "12px 8px",
                background: byMethod[k] > 0 ? c + "18" : T.surfaceElevated,
                borderRadius: 8,
                border: `1px solid ${byMethod[k] > 0 ? c + "44" : T.border}`,
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 4 }}>{ic}</div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: byMethod[k] > 0 ? c : T.textMuted,
                  fontFamily: "'DM Mono',monospace",
                }}
              >
                {fmt(byMethod[k])}
              </div>
              <div
                style={{ fontSize: 11, color: T.textMuted, fontWeight: 700 }}
              >
                {l}
              </div>
            </div>
          ))}
        </div>
      </Bx>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[
          ["today", "Today's Transactions"],
          ["credit", "Credit Ledger"],
          ["all", "All Transactions"],
        ].map(([k, l]) => (
          <Btn
            key={k}
            T={T}
            v={sub === k ? "primary" : "secondary"}
            onClick={() => setSub(k)}
          >
            {l}
          </Btn>
        ))}
      </div>
      {sub === "today" && (
        <Bx T={T}>
          {todayPayments.length === 0 ? (
            <Empty T={T} icon="💳" text="No transactions today" />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {[
                      "Vehicle",
                      "Customer",
                      "Amount",
                      "Method",
                      "Collected By",
                      "Time",
                      "Guarantor",
                    ].map((h) => (
                      <TH key={h} T={T}>
                        {h}
                      </TH>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {todayPayments.map((p) => (
                    <tr
                      key={p.id}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = T.surfaceElevated)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <TD T={T}>
                        <span
                          style={{
                            fontWeight: 800,
                            fontFamily: "'DM Mono',monospace",
                            color: T.text,
                          }}
                        >
                          {p.vehicle?.vehicle_number || "—"}
                        </span>
                      </TD>
                      <TD T={T} style={{ color: T.textSecondary }}>
                        {p.vehicle?.customer_name || "—"}
                      </TD>
                      <TD T={T}>
                        <span
                          style={{
                            fontWeight: 800,
                            color:
                              p.payment_method === "credit" ? T.amber : T.green,
                            fontFamily: "'DM Mono',monospace",
                          }}
                        >
                          {p.payment_method === "credit" ? "−" : "+"}
                          {fmt(p.amount)}
                        </span>
                      </TD>
                      <TD T={T}>
                        <Chip color={T.blue} bg={T.blueLight}>
                          {p.payment_method === "bank_transfer"
                            ? "Bank"
                            : p.payment_method}
                        </Chip>
                      </TD>
                      <TD T={T} style={{ color: T.textSecondary }}>
                        {p.collector?.full_name || "—"}
                      </TD>
                      <TD T={T} style={{ color: T.textMuted, fontSize: 11 }}>
                        {formatIST(p.created_at)}
                      </TD>
                      <TD T={T} style={{ color: T.amber, fontSize: 11 }}>
                        {p.vehicle?.credit_guaranteed_by || "—"}
                      </TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Bx>
      )}
      {sub === "credit" && (
        <div>
          {creditGroups.length === 0 ? (
            <Empty T={T} icon="✅" text="No outstanding credits" />
          ) : (
            <>
              <Bx
                T={T}
                style={{
                  marginBottom: 12,
                  background: T.amberLight,
                  border: `1px solid ${T.amber}44`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontWeight: 700, color: T.amber }}>
                    📋 Total Outstanding
                  </span>
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: T.amber,
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    {fmt(totalOutstandingCredit)}
                  </span>
                </div>
              </Bx>
              {creditGroups.map((g) => (
                <CreditRow key={g.vehicle_number} T={T} group={g} />
              ))}
            </>
          )}
        </div>
      )}
      {sub === "all" && (
        <div>
          <Bx T={T} style={{ marginBottom: 12 }}>
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 10,
                flexWrap: "wrap",
              }}
            >
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search vehicle, customer..."
                style={{
                  flex: "1 1 180px",
                  padding: "7px 12px",
                  border: `1px solid ${T.border}`,
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: "inherit",
                  background: T.surface,
                  color: T.text,
                  outline: "none",
                }}
              />
              <input
                type="date"
                value={df}
                onChange={(e) => setDf(e.target.value)}
                style={{
                  padding: "7px 10px",
                  border: `1px solid ${T.border}`,
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: "inherit",
                  background: T.surface,
                  color: T.text,
                }}
              />
              <input
                type="date"
                value={dt}
                onChange={(e) => setDt(e.target.value)}
                style={{
                  padding: "7px 10px",
                  border: `1px solid ${T.border}`,
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: "inherit",
                  background: T.surface,
                  color: T.text,
                }}
              />
              {(df || dt) && (
                <Btn
                  T={T}
                  v="ghost"
                  onClick={() => {
                    setDf("");
                    setDt("");
                  }}
                >
                  ✕
                </Btn>
              )}
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {[
                ["all", "All"],
                ["cash", "Cash"],
                ["upi", "UPI (all)"],
                ["upi_phonepe", "PhonePe"],
                ["upi_gpay", "GPay"],
                ["upi_icici", "ICICI UPI"],
                ["card", "Card"],
                ["bank_transfer", "Bank"],
                ["credit", "Credit Given"],
                ["outstanding", "📋 Outstanding"],
              ].map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setMf(m)}
                  style={{
                    padding: "4px 11px",
                    borderRadius: 20,
                    border: `1px solid ${mf === m ? "#f59e0b" : T.border}`,
                    background: mf === m ? "#f59e0b" : T.surface,
                    color: mf === m ? "#fff" : T.textSecondary,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </Bx>
          <Bx T={T} style={{ marginBottom: 12, background: T.surfaceElevated }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                textAlign: "center",
                gap: 10,
                padding: "4px 0",
              }}
            >
              {mf === "outstanding" ? (
                <>
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: T.textMuted,
                        textTransform: "uppercase",
                        marginBottom: 4,
                      }}
                    >
                      Outstanding
                    </div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: T.amber,
                        fontFamily: "'DM Mono',monospace",
                      }}
                    >
                      {fmt(
                        filtOut.reduce(
                          (s, v) => s + (parseFloat(v.credit_amount) || 0),
                          0,
                        ),
                      )}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: T.textMuted,
                        textTransform: "uppercase",
                        marginBottom: 4,
                      }}
                    >
                      Vehicles
                    </div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: T.text,
                        fontFamily: "'DM Mono',monospace",
                      }}
                    >
                      {filtOut.length}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: T.textMuted,
                        textTransform: "uppercase",
                        marginBottom: 4,
                      }}
                    >
                      Avg Per Vehicle
                    </div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: T.amber,
                        fontFamily: "'DM Mono',monospace",
                      }}
                    >
                      {filtOut.length > 0
                        ? fmt(
                            filtOut.reduce(
                              (s, v) => s + (parseFloat(v.credit_amount) || 0),
                              0,
                            ) / filtOut.length,
                          )
                        : "—"}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: T.textMuted,
                        textTransform: "uppercase",
                        marginBottom: 4,
                      }}
                    >
                      Collected
                    </div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: T.green,
                        fontFamily: "'DM Mono',monospace",
                      }}
                    >
                      {fmt(
                        filtAll
                          .filter((p) => p.payment_method !== "credit")
                          .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0),
                      )}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: T.textMuted,
                        textTransform: "uppercase",
                        marginBottom: 4,
                      }}
                    >
                      Credit Given
                    </div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: T.amber,
                        fontFamily: "'DM Mono',monospace",
                      }}
                    >
                      {fmt(
                        filtAll
                          .filter((p) => p.payment_method === "credit")
                          .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0),
                      )}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: T.textMuted,
                        textTransform: "uppercase",
                        marginBottom: 4,
                      }}
                    >
                      Transactions
                    </div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: T.text,
                        fontFamily: "'DM Mono',monospace",
                      }}
                    >
                      {filtAll.length}
                    </div>
                  </div>
                </>
              )}
            </div>
          </Bx>
          {mf === "outstanding" ? (
            filtOut.length === 0 ? (
              <Empty T={T} icon="✅" text="No outstanding credits" />
            ) : (
              <Bx T={T}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {[
                          "Vehicle",
                          "Customer",
                          "Phone",
                          "Bill",
                          "Paid",
                          "Credit",
                          "Guaranteed By",
                          "Date",
                        ].map((h) => (
                          <TH key={h} T={T}>
                            {h}
                          </TH>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtOut.map((v) => (
                        <tr
                          key={v.id}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              T.surfaceElevated)
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <TD T={T}>
                            <span
                              style={{
                                fontWeight: 800,
                                fontFamily: "'DM Mono',monospace",
                                color: T.text,
                              }}
                            >
                              {v.vehicle_number}
                            </span>
                          </TD>
                          <TD T={T} style={{ color: T.textSecondary }}>
                            {v.customer_name || "—"}
                          </TD>
                          <TD T={T} style={{ color: T.textSecondary }}>
                            {v.customer_phone || "—"}
                          </TD>
                          <TD T={T}>
                            <span style={{ fontFamily: "'DM Mono',monospace" }}>
                              {fmt(v.bill_amount)}
                            </span>
                          </TD>
                          <TD T={T}>
                            <span
                              style={{
                                fontFamily: "'DM Mono',monospace",
                                color: T.green,
                              }}
                            >
                              {fmt(v.total_paid)}
                            </span>
                          </TD>
                          <TD T={T}>
                            <span
                              style={{
                                fontFamily: "'DM Mono',monospace",
                                color: T.amber,
                                fontWeight: 800,
                              }}
                            >
                              {fmt(v.credit_amount)}
                            </span>
                          </TD>
                          <TD T={T} style={{ color: T.amber }}>
                            {v.credit_guaranteed_by || "—"}
                          </TD>
                          <TD
                            T={T}
                            style={{ color: T.textMuted, fontSize: 11 }}
                          >
                            {formatIST(v.entry_time)}
                          </TD>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Bx>
            )
          ) : filtAll.length === 0 ? (
            <Empty T={T} icon="🔍" text="No transactions found" />
          ) : (
            <Bx T={T}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {[
                        "Vehicle",
                        "Customer",
                        "Amount",
                        "Method",
                        "By",
                        "Time",
                      ].map((h) => (
                        <TH key={h} T={T}>
                          {h}
                        </TH>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtAll.map((p) => (
                      <tr
                        key={p.id}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = T.surfaceElevated)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <TD T={T}>
                          <span
                            style={{
                              fontWeight: 800,
                              fontFamily: "'DM Mono',monospace",
                              color: T.text,
                            }}
                          >
                            {p.vehicle?.vehicle_number || "—"}
                          </span>
                        </TD>
                        <TD T={T} style={{ color: T.textSecondary }}>
                          {p.vehicle?.customer_name || "—"}
                        </TD>
                        <TD T={T}>
                          <span
                            style={{
                              fontWeight: 800,
                              color:
                                p.payment_method === "credit"
                                  ? T.amber
                                  : T.green,
                              fontFamily: "'DM Mono',monospace",
                            }}
                          >
                            {p.payment_method === "credit" ? "−" : "+"}
                            {fmt(p.amount)}
                          </span>
                        </TD>
                        <TD T={T}>
                          <Chip color={T.blue} bg={T.blueLight}>
                            {p.payment_method === "bank_transfer"
                              ? "Bank"
                              : p.payment_method}
                          </Chip>
                        </TD>
                        <TD T={T} style={{ color: T.textSecondary }}>
                          {p.collector?.full_name || "—"}
                        </TD>
                        <TD T={T} style={{ color: T.textMuted, fontSize: 11 }}>
                          {formatIST(p.created_at)}
                        </TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Bx>
          )}
        </div>
      )}
    </div>
  );
}

function CreditRow({ T, group }) {
  const [exp, setExp] = useState(false);
  return (
    <Bx
      T={T}
      style={{
        marginBottom: 8,
        border: `1px solid ${T.amber}44`,
        cursor: "pointer",
      }}
      onClick={() => setExp(!exp)}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <span
            style={{
              fontWeight: 800,
              fontSize: 15,
              fontFamily: "'DM Mono',monospace",
              color: T.text,
            }}
          >
            {group.vehicle_number}
          </span>
          <span
            style={{ fontSize: 13, color: T.textSecondary, marginLeft: 12 }}
          >
            {group.customer_name} • {group.customer_phone}
          </span>
          <span style={{ fontSize: 11, color: T.textMuted, marginLeft: 10 }}>
            {group.visits.length} visit(s)
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: T.amber,
              fontFamily: "'DM Mono',monospace",
            }}
          >
            {fmt(group.total_credit)}
          </span>
          <span style={{ color: T.textMuted }}>{exp ? "▲" : "▼"}</span>
        </div>
      </div>
      {exp && (
        <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
          {group.visits.map((v) => (
            <div
              key={v.id}
              style={{
                background: T.surfaceElevated,
                borderRadius: 6,
                padding: "8px 12px",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                  Bill: {fmt(v.bill_amount)}
                </span>
                <span
                  style={{ fontSize: 11, color: T.textMuted, marginLeft: 10 }}
                >
                  {formatIST(v.entry_time)}
                </span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.amber }}>
                Credit: {fmt(v.credit_amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Bx>
  );
}

// ─── STAFF & TEAMS: OVERVIEW SUB-TAB ───────────────────────────────────────────
// Read-only live snapshot (roleGroups is derived from active users only) —
// "Manage" jumps into the same EditTeamDlg used by the Teams sub-tab.
function TeamOverview({ T, derived, vehicles, onManageTeam }) {
  const { roleGroups } = derived;
  const active = vehicles.filter((v) => v.current_stage !== "completed");
  return (
    <div>
      <SecTitle T={T}>Departments</SecTitle>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 14,
        }}
      >
        {Object.entries(roleGroups).map(
          ([role, { members, roleTeams, unassignedMembers }]) => {
            const dm = STAGE_META[role] || {
              label: ROLE_LABELS[role] || role,
              icon: "👤",
              color: T.textMuted,
            };
            return (
              <Bx
                T={T}
                key={role}
                style={{ borderTop: `3px solid ${dm.color}` }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 10,
                    paddingBottom: 8,
                    borderBottom: `1px solid ${T.border}`,
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: dm.color + "20",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 15,
                      flexShrink: 0,
                    }}
                  >
                    {dm.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{ fontWeight: 700, color: T.text, fontSize: 13 }}
                    >
                      {ROLE_LABELS[role] || role}
                    </div>
                    <div
                      style={{ fontSize: 11, color: dm.color, fontWeight: 700 }}
                    >
                      {members.length} member{members.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                {roleTeams.map((team) => {
                  const tm = members.filter((m) => m.team_id === team.id);
                  const ta = active.filter(
                    (v) =>
                      v.work_stages?.[0]?.[`${role}_team_id`] === team.id &&
                      v.work_stages[0][`${role}_status`] !== "completed",
                  );
                  return (
                    <div
                      key={team.id}
                      style={{
                        background: dm.color + "10",
                        border: `1px solid ${dm.color}33`,
                        borderRadius: 8,
                        padding: 9,
                        marginBottom: 7,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 5,
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            color: dm.color,
                            fontSize: 12,
                          }}
                        >
                          👥 {team.name}
                        </span>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Chip color={dm.color} bg={dm.color + "20"}>
                            {ta.length} vehicles
                          </Chip>
                          <button
                            onClick={() => onManageTeam(team)}
                            style={{
                              background: "none",
                              border: `1px solid ${dm.color}55`,
                              borderRadius: 5,
                              cursor: "pointer",
                              padding: "2px 7px",
                              color: dm.color,
                              fontSize: 10,
                              fontWeight: 700,
                              fontFamily: "inherit",
                            }}
                          >
                            Manage
                          </button>
                        </div>
                      </div>
                      <div
                        style={{ display: "flex", flexWrap: "wrap", gap: 4 }}
                      >
                        {tm.map((m) => (
                          <Chip
                            key={m.id}
                            color={T.textSecondary}
                            bg={T.surfaceElevated}
                          >
                            {m.full_name}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {unassignedMembers.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {unassignedMembers.map((m) => (
                      <Chip
                        key={m.id}
                        color={T.textSecondary}
                        bg={T.surfaceElevated}
                      >
                        {m.full_name}
                      </Chip>
                    ))}
                  </div>
                )}
              </Bx>
            );
          },
        )}
      </div>
    </div>
  );
}

// ─── REPORTS TAB ──────────────────────────────────────────────────────────────
function ReportsTab({
  T,
  derived,
  users,
  reportData,
  reportLoading,
  fetchReportData,
}) {
  const [preset, setPreset] = useState("today");
  const [cf, setCf] = useState("");
  const [ct, setCt] = useState("");
  const [dling, setDling] = useState(null);

  useEffect(() => {
    const { from, to } = dateRange("today", "", "");
    fetchReportData(from, to);
  }, [fetchReportData]);

  const setP = (p) => {
    setPreset(p);
    if (p !== "custom") {
      const { from, to } = dateRange(p, "", "");
      fetchReportData(from, to);
    }
  };
  const apply = () => {
    if (cf && ct) fetchReportData(cf, ct);
  };
  const dl = async (type) => {
    setDling(type);
    try {
      const { from, to } = dateRange(preset, cf, ct);
      await exportToExcel(type, from, to);
    } catch (e) {
      alert("Export failed: " + e.message);
    } finally {
      setDling(null);
    }
  };

  const { from: af, to: at } = dateRange(preset, cf, ct);
  const veh = reportData.vehicles || [];
  const realP = (reportData.payments || []).filter(
    (p) => p.payment_method !== "credit",
  );
  const credP = (reportData.payments || []).filter(
    (p) => p.payment_method === "credit",
  );
  const rev = realP.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const cred = credP.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const avgB = veh.length
    ? veh.reduce((s, v) => s + (parseFloat(v.bill_amount) || 0), 0) / veh.length
    : 0;
  const tats = veh
    .filter((v) => v.entry_time && v.updated_at)
    .map(
      (v) =>
        (new Date(toZ(v.updated_at)) - new Date(toZ(v.entry_time))) / 60000,
    )
    .filter((t) => t > 0);
  const avgT = tats.length ? tats.reduce((a, b) => a + b, 0) / tats.length : 0;
  const slaBr = veh.filter(
    (v) =>
      v.expected_completion_time &&
      new Date(toZ(v.updated_at)) > new Date(toZ(v.expected_completion_time)),
  ).length;
  const bm = {};
  ["cash", "upi", "card", "bank_transfer"].forEach((m) => {
    if (m === "upi")
      bm[m] = realP
        .filter((p) => p.payment_method?.startsWith("upi_"))
        .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    else
      bm[m] = realP
        .filter((p) => p.payment_method === m)
        .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  });
  const sb = {};
  veh.forEach((v) => {
    if (v.service_type) sb[v.service_type] = (sb[v.service_type] || 0) + 1;
  });
  const db = {};
  veh.forEach((v) => {
    const raw = v.updated_at || v.entry_time;
    const d = new Date(toZ(raw)).toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
    if (!db[d]) db[d] = { n: 0, r: 0 };
    db[d].n++;
    db[d].r += parseFloat(v.bill_amount) || 0;
  });
  const de = Object.entries(db).sort((a, b) => b[0].localeCompare(a[0]));
  const mx = Math.max(...de.map(([, v]) => v.n), 1);

  const DOWNLOADS = [
    {
      type: "operations",
      label: "📊 Daily Operations",
      desc: "Vehicle summary, dept log, payments",
      usesDateRange: true,
    },
    {
      type: "washing",
      label: "💧 Washing Report",
      desc: "Slot-wise data, timings, workers",
      usesDateRange: true,
    },
    {
      type: "special_work",
      label: "✨ Special Work",
      desc: "3M + alignment details",
      usesDateRange: true,
    },
    {
      type: "productivity",
      label: "👥 Staff Productivity",
      desc: "Advisor perf + dept TAT",
      usesDateRange: true,
    },
    {
      type: "credit",
      label: "📋 Credit Outstanding",
      desc: "Always exports current full balance",
      usesDateRange: false,
    },
    {
      type: "force_pdi",
      label: "⚡ Force PDI Report",
      desc: "All force PDI actions with dept details",
      usesDateRange: true,
    },
    {
      type: "front_checkup",
      label: "🔍 Front Checkup Report",
      desc: "FC completions, skips, staff assignments",
      usesDateRange: true,
    },
    {
      type: "spare_requirement",
      label: "🔧 Front Checkup Spare Requirement",
      desc: "Parts requested, status, and most-requested items",
      usesDateRange: true,
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 14,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {[
          ["today", "Today"],
          ["yesterday", "Yesterday"],
          ["7days", "7 Days"],
          ["30days", "30 Days"],
          ["custom", "Custom"],
        ].map(([k, l]) => (
          <Btn
            key={k}
            T={T}
            v={preset === k ? "primary" : "secondary"}
            onClick={() => setP(k)}
          >
            {l}
          </Btn>
        ))}
        {preset === "custom" && (
          <>
            <input
              type="date"
              value={cf}
              onChange={(e) => setCf(e.target.value)}
              style={{
                padding: "7px 10px",
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                fontSize: 13,
                fontFamily: "inherit",
                background: T.surface,
                color: T.text,
              }}
            />
            <span style={{ color: T.textMuted }}>→</span>
            <input
              type="date"
              value={ct}
              onChange={(e) => setCt(e.target.value)}
              style={{
                padding: "7px 10px",
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                fontSize: 13,
                fontFamily: "inherit",
                background: T.surface,
                color: T.text,
              }}
            />
            <Btn T={T} v="success" onClick={apply} disabled={!cf || !ct}>
              Apply
            </Btn>
          </>
        )}
        <span style={{ fontSize: 11, color: T.textMuted, marginLeft: 8 }}>
          📅 {af === at ? af : `${af} → ${at}`}
        </span>
      </div>
      <Bx T={T} style={{ marginBottom: 20, borderLeft: "4px solid #f59e0b" }}>
        <SecTitle T={T}>📥 Download Excel Reports</SecTitle>
        <div
          style={{
            marginBottom: 10,
            padding: "6px 10px",
            background: T.accentBg,
            borderRadius: 6,
            border: "1px solid #f59e0b44",
            fontSize: 12,
            color: "#f59e0b",
            fontWeight: 600,
          }}
        >
          📅 Active range:{" "}
          <span style={{ fontFamily: "'DM Mono',monospace" }}>
            {af === at ? af : `${af} → ${at}`}
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2,1fr)",
            gap: 10,
          }}
        >
          {DOWNLOADS.map(({ type, label, desc, usesDateRange }) => (
            <div
              key={type}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "11px 14px",
                background: T.surfaceElevated,
                borderRadius: 8,
                border: `1px solid ${T.border}`,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>
                  {label}
                </div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                  {desc}
                </div>
                {usesDateRange && (
                  <div
                    style={{
                      fontSize: 10,
                      color: "#f59e0b",
                      fontWeight: 600,
                      marginTop: 3,
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    📅 {af === at ? af : `${af} → ${at}`}
                  </div>
                )}
                {!usesDateRange && (
                  <div
                    style={{ fontSize: 10, color: T.textMuted, marginTop: 3 }}
                  >
                    ⚠️ Always exports full current balance
                  </div>
                )}
              </div>
              <Btn
                T={T}
                v="secondary"
                sz="sm"
                onClick={() => dl(type)}
                disabled={dling === type}
              >
                {dling === type ? "⏳" : "⬇️"} Export
              </Btn>
            </div>
          ))}
        </div>
      </Bx>
      {reportLoading ? (
        <div style={{ textAlign: "center", padding: 60, color: T.textMuted }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
          <div style={{ fontSize: 14 }}>Loading report data...</div>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6,1fr)",
              gap: 12,
              marginBottom: 18,
            }}
          >
            {[
              {
                label: "Completed",
                value: veh.length,
                color: T.green,
                icon: "✅",
              },
              { label: "Revenue", value: fmt(rev), color: T.green, icon: "💰" },
              {
                label: "Avg Bill",
                value: avgB > 0 ? fmt(avgB) : "—",
                color: T.blue,
                icon: "🧾",
              },
              {
                label: "Avg TAT",
                value: fmtMins(avgT),
                color: T.cyan,
                icon: "⏱️",
              },
              {
                label: "Credit Given",
                value: fmt(cred),
                color: T.amber,
                icon: "📋",
              },
              {
                label: "SLA Breached",
                value: slaBr,
                color: slaBr > 0 ? T.red : T.green,
                icon: "⚠️",
              },
            ].map((k) => (
              <KPI key={k.label} T={T} {...k} />
            ))}
          </div>
          {rev > 0 && (
            <Bx T={T} style={{ marginBottom: 14 }}>
              <SecTitle T={T}>Revenue by Method</SecTitle>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4,1fr)",
                  gap: 12,
                }}
              >
                {[
                  ["cash", "Cash", "💵", T.green],
                  ["upi", "UPI (all)", "📱", T.blue],
                  ["card", "Card", "💳", T.purple],
                  ["bank_transfer", "Bank", "🏦", T.cyan],
                ].map(([k, l, ic, c]) => (
                  <div
                    key={k}
                    style={{
                      textAlign: "center",
                      padding: 12,
                      background: bm[k] > 0 ? c + "15" : T.surfaceElevated,
                      borderRadius: 8,
                      border: `1px solid ${bm[k] > 0 ? c + "44" : T.border}`,
                    }}
                  >
                    <div style={{ fontSize: 16, marginBottom: 4 }}>{ic}</div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: bm[k] > 0 ? c : T.textMuted,
                        fontFamily: "'DM Mono',monospace",
                      }}
                    >
                      {fmt(bm[k])}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: T.textMuted,
                        fontWeight: 700,
                      }}
                    >
                      {l}
                    </div>
                  </div>
                ))}
              </div>
            </Bx>
          )}
          {de.length > 1 && (
            <Bx T={T} style={{ marginBottom: 14 }}>
              <SecTitle T={T}>Daily Breakdown</SecTitle>
              {de.map(([date, d]) => {
                const p = Math.round((d.n / mx) * 100);
                return (
                  <div
                    key={date}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 7,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: T.textSecondary,
                        fontFamily: "'DM Mono',monospace",
                        width: 88,
                        flexShrink: 0,
                      }}
                    >
                      {date}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        background: T.surfaceElevated,
                        borderRadius: 4,
                        height: 7,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${p}%`,
                          height: "100%",
                          background: "#f59e0b",
                          borderRadius: 4,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: T.text,
                        width: 72,
                        textAlign: "right",
                      }}
                    >
                      {d.n} vehicles
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: T.green,
                        fontFamily: "'DM Mono',monospace",
                        width: 80,
                        textAlign: "right",
                      }}
                    >
                      {fmt(d.r)}
                    </span>
                  </div>
                );
              })}
            </Bx>
          )}
          {Object.keys(sb).length > 0 && (
            <Bx T={T} style={{ marginBottom: 14 }}>
              <SecTitle T={T}>By Service Type</SecTitle>
              {Object.entries(sb)
                .sort((a, b) => b[1] - a[1])
                .map(([type, n]) => {
                  const total = Object.values(sb).reduce((a, b) => a + b, 0);
                  const p = Math.round((n / total) * 100);
                  return (
                    <div key={type} style={{ marginBottom: 9 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 3,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: T.text,
                            textTransform: "capitalize",
                          }}
                        >
                          {type.replace(/_/g, " ")}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: T.textSecondary,
                          }}
                        >
                          {n} ({p}%)
                        </span>
                      </div>
                      <div
                        style={{
                          height: 5,
                          background: T.surfaceElevated,
                          borderRadius: 3,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${p}%`,
                            height: "100%",
                            background: T.blue,
                            borderRadius: 3,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </Bx>
          )}
          {veh.length > 0 &&
            (() => {
              const advStats = users
                .filter((u) => u.role === "advisor")
                .map((a) => {
                  const avs = veh.filter((v) => v.advisor_id === a.id);
                  const r = avs.reduce(
                    (s, v) => s + (parseFloat(v.bill_amount) || 0),
                    0,
                  );
                  const c = avs.reduce(
                    (s, v) => s + (parseFloat(v.credit_amount) || 0),
                    0,
                  );
                  const act = derived.activeVehicles.filter(
                    (v) => v.advisor_id === a.id,
                  ).length;
                  return {
                    ...a,
                    done: avs.length,
                    r,
                    c,
                    avg: avs.length ? r / avs.length : 0,
                    cr: r > 0 ? Math.round((c / (r + c)) * 100) : 0,
                    act,
                  };
                })
                .filter((a) => a.done > 0 || a.act > 0)
                .sort((a, b) => b.done - a.done);
              if (!advStats.length) return null;
              return (
                <Bx T={T} style={{ marginBottom: 14 }}>
                  <SecTitle T={T}>Staff Productivity</SecTitle>
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr>
                          {[
                            "Advisor",
                            "Completed",
                            "Revenue",
                            "Avg Bill",
                            "Credit Given",
                            "Credit Rate",
                            "Active Now",
                          ].map((h) => (
                            <TH key={h} T={T}>
                              {h}
                            </TH>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {advStats.map((a) => (
                          <tr
                            key={a.id}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background =
                                T.surfaceElevated)
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "transparent")
                            }
                          >
                            <TD T={T}>
                              <span style={{ fontWeight: 700 }}>
                                {a.full_name}
                              </span>
                            </TD>
                            <TD T={T}>
                              <span
                                style={{
                                  fontFamily: "'DM Mono',monospace",
                                  fontWeight: 800,
                                  color: T.green,
                                }}
                              >
                                {a.done}
                              </span>
                            </TD>
                            <TD T={T}>
                              <span
                                style={{
                                  fontFamily: "'DM Mono',monospace",
                                  color: T.green,
                                }}
                              >
                                {fmt(a.r)}
                              </span>
                            </TD>
                            <TD T={T}>
                              <span
                                style={{ fontFamily: "'DM Mono',monospace" }}
                              >
                                {a.avg > 0 ? fmt(a.avg) : "—"}
                              </span>
                            </TD>
                            <TD T={T}>
                              <span
                                style={{
                                  fontFamily: "'DM Mono',monospace",
                                  color: T.amber,
                                }}
                              >
                                {fmt(a.c)}
                              </span>
                            </TD>
                            <TD T={T}>
                              <Chip
                                color={a.cr > 20 ? T.red : T.green}
                                bg={a.cr > 20 ? T.redLight : T.greenLight}
                              >
                                {a.cr}%
                              </Chip>
                            </TD>
                            <TD T={T}>
                              <Chip color={T.blue} bg={T.blueLight}>
                                {a.act}
                              </Chip>
                            </TD>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Bx>
              );
            })()}
          {veh.length > 0 && (
            <Bx T={T}>
              <SecTitle T={T}>Completed Vehicles ({veh.length})</SecTitle>
              <div
                style={{ overflowX: "auto", maxHeight: 480, overflowY: "auto" }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {[
                        "#",
                        "Vehicle No",
                        "Customer Name",
                        "Phone",
                        "Model",
                        "Odometer",
                        "Service",
                        "Priority",
                        "Advisor",
                        "Entry",
                        "Exit",
                        "TAT",
                        "Bill",
                        "Paid",
                        "Credit",
                        "Payment",
                        "Guaranteed By",
                        "SLA",
                      ].map((h) => (
                        <TH key={h} T={T}>
                          {h}
                        </TH>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {veh.map((v, i) => {
                      const e = v.entry_time
                        ? new Date(toZ(v.entry_time))
                        : null;
                      const x = v.updated_at
                        ? new Date(toZ(v.updated_at))
                        : null;
                      const exp = v.expected_completion_time
                        ? new Date(toZ(v.expected_completion_time))
                        : null;
                      const tat = e && x ? Math.round((x - e) / 60000) : null;
                      const sla =
                        exp && x ? (
                          x > exp ? (
                            <Chip color={T.red} bg={T.redLight}>
                              Breached
                            </Chip>
                          ) : (
                            <Chip color={T.green} bg={T.greenLight}>
                              On Time
                            </Chip>
                          )
                        ) : (
                          <span style={{ color: T.textMuted }}>—</span>
                        );
                      return (
                        <tr
                          key={v.id}
                          onMouseEnter={(e2) =>
                            (e2.currentTarget.style.background =
                              T.surfaceElevated)
                          }
                          onMouseLeave={(e2) =>
                            (e2.currentTarget.style.background = "transparent")
                          }
                        >
                          <TD
                            T={T}
                            style={{
                              color: T.textMuted,
                              fontFamily: "'DM Mono',monospace",
                              fontSize: 11,
                            }}
                          >
                            {i + 1}
                          </TD>
                          <TD T={T}>
                            <span
                              style={{
                                fontWeight: 800,
                                fontFamily: "'DM Mono',monospace",
                                color: T.text,
                              }}
                            >
                              {v.vehicle_number}
                            </span>
                          </TD>
                          <TD T={T}>{v.customer_name || "—"}</TD>
                          <TD T={T} style={{ color: T.textSecondary }}>
                            {v.customer_phone || "—"}
                          </TD>
                          <TD T={T}>
                            {v.model ? (
                              <Chip color={T.blue} bg={T.blueLight}>
                                {v.model}
                              </Chip>
                            ) : (
                              "—"
                            )}
                          </TD>
                          <TD
                            T={T}
                            style={{
                              color: T.textSecondary,
                              fontFamily: "'DM Mono',monospace",
                            }}
                          >
                            {v.odometer_reading
                              ? `${v.odometer_reading} km`
                              : "—"}
                          </TD>
                          <TD
                            T={T}
                            style={{
                              textTransform: "capitalize",
                              fontSize: 11,
                            }}
                          >
                            {v.service_type?.replace(/_/g, " ") || "—"}
                          </TD>
                          <TD T={T}>
                            {v.priority !== "normal" ? (
                              <Chip
                                color={v.priority === "vip" ? T.purple : T.red}
                                bg={
                                  v.priority === "vip"
                                    ? T.purpleLight
                                    : T.redLight
                                }
                              >
                                {v.priority.toUpperCase()}
                              </Chip>
                            ) : (
                              <span
                                style={{ color: T.textMuted, fontSize: 11 }}
                              >
                                Normal
                              </span>
                            )}
                          </TD>
                          <TD
                            T={T}
                            style={{ color: T.textSecondary, fontSize: 11 }}
                          >
                            {v.advisor?.full_name || "—"}
                          </TD>
                          <TD
                            T={T}
                            style={{ color: T.textMuted, fontSize: 10 }}
                          >
                            {formatIST(v.entry_time)}
                          </TD>
                          <TD
                            T={T}
                            style={{ color: T.textMuted, fontSize: 10 }}
                          >
                            {formatIST(v.updated_at)}
                          </TD>
                          <TD
                            T={T}
                            style={{
                              fontFamily: "'DM Mono',monospace",
                              fontSize: 11,
                            }}
                          >
                            {tat ? fmtMins(tat) : "—"}
                          </TD>
                          <TD T={T}>
                            {v.bill_amount > 0 ? (
                              <span
                                style={{
                                  fontFamily: "'DM Mono',monospace",
                                  fontWeight: 800,
                                  color: T.green,
                                  fontSize: 12,
                                }}
                              >
                                {fmt(v.bill_amount)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TD>
                          <TD T={T}>
                            {v.total_paid > 0 ? (
                              <span
                                style={{
                                  fontFamily: "'DM Mono',monospace",
                                  color: T.green,
                                  fontSize: 12,
                                }}
                              >
                                {fmt(v.total_paid)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TD>
                          <TD T={T}>
                            {v.credit_amount > 0 ? (
                              <span
                                style={{
                                  fontFamily: "'DM Mono',monospace",
                                  fontWeight: 800,
                                  color: T.amber,
                                  fontSize: 12,
                                }}
                              >
                                {fmt(v.credit_amount)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TD>
                          <TD T={T}>
                            {v.payment_status ? (
                              <Chip
                                color={
                                  v.payment_status === "paid"
                                    ? T.green
                                    : v.payment_status === "credit"
                                      ? T.amber
                                      : T.blue
                                }
                                bg={
                                  v.payment_status === "paid"
                                    ? T.greenLight
                                    : v.payment_status === "credit"
                                      ? T.amberLight
                                      : T.blueLight
                                }
                              >
                                {v.payment_status}
                              </Chip>
                            ) : (
                              "—"
                            )}
                          </TD>
                          <TD T={T} style={{ color: T.amber, fontSize: 11 }}>
                            {v.credit_guaranteed_by || "—"}
                          </TD>
                          <TD T={T}>{sla}</TD>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Bx>
          )}
          {veh.length === 0 && (
            <Empty
              T={T}
              icon="📊"
              text="No completed vehicles in this date range"
            />
          )}
          <FrontCheckupReport T={T} from={af} to={at} />
        </>
      )}
    </div>
  );
}

// ─── FRONT CHECKUP REPORT ─────────────────────────────────────────────────────
function FrontCheckupReport({ T, from, to }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!from || !to) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const fromUTC = new Date(from + "T00:00:00+05:30").toISOString();
        const toUTC = new Date(to + "T23:59:59+05:30").toISOString();
        const [vehiclesRes, detailsRes, usersRes] = await Promise.all([
          supabase
            .from("vehicles")
            .select(
              "id, vehicle_number, customer_name, model, entry_time, fc_completed, fc_cancelled, fc_skip_reason, current_stage",
            )
            .gte("entry_time", fromUTC)
            .lte("entry_time", toUTC)
            .is("deleted_at", null),
          supabase
            .from("front_checkup_details")
            .select("vehicle_id, work_1_by, work_2_by, work_3_by"),
          supabase
            .from("users")
            .select("id, full_name")
            .eq("role", "front_checkup"),
        ]);
        if (cancelled) return;
        const vehicles = vehiclesRes.data || [];
        const details = detailsRes.data || [];
        const fcUsers = usersRes.data || [];
        const detailMap = {};
        details.forEach((d) => {
          detailMap[d.vehicle_id] = d;
        });
        const userMap = {};
        fcUsers.forEach((u) => {
          userMap[u.id] = u.full_name;
        });
        const rows = vehicles.map((v) => ({
          ...v,
          fc: detailMap[v.id] || null,
        }));
        const total = rows.length;
        const completed = rows.filter((r) => r.fc_completed).length;
        const skipped = rows.filter(
          (r) => r.fc_skip_reason && !r.fc_completed,
        ).length;
        const pending = rows.filter(
          (r) =>
            !r.fc_completed &&
            !r.fc_skip_reason &&
            r.current_stage === "front_checkup",
        ).length;
        const skipMap = {};
        rows
          .filter((r) => r.fc_skip_reason)
          .forEach((r) => {
            skipMap[r.fc_skip_reason] = (skipMap[r.fc_skip_reason] || 0) + 1;
          });
        const staffMap = {};
        fcUsers.forEach((u) => {
          staffMap[u.id] = { name: u.full_name, w1: 0, w2: 0, w3: 0, total: 0 };
        });
        details.forEach((d) => {
          if (d.work_1_by && staffMap[d.work_1_by]) {
            staffMap[d.work_1_by].w1++;
            staffMap[d.work_1_by].total++;
          }
          if (d.work_2_by && staffMap[d.work_2_by]) {
            staffMap[d.work_2_by].w2++;
            staffMap[d.work_2_by].total++;
          }
          if (d.work_3_by && staffMap[d.work_3_by]) {
            staffMap[d.work_3_by].w3++;
            staffMap[d.work_3_by].total++;
          }
        });
        const staffStats = Object.values(staffMap).sort(
          (a, b) => b.total - a.total,
        );
        setData({
          rows,
          total,
          completed,
          skipped,
          pending,
          skipMap,
          staffStats,
          userMap,
        });
      } catch (e) {
        console.error("FrontCheckupReport fetch error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  return (
    <Bx T={T} style={{ marginTop: 14, borderLeft: "4px solid #8B5CF6" }}>
      <SecTitle T={T}>🔍 Front Checkup Report</SecTitle>

      {loading ? (
        <div style={{ textAlign: "center", padding: 32, color: T.textMuted }}>
          ⏳ Loading front checkup data...
        </div>
      ) : !data ? null : (
        <>
          {/* KPI Row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 12,
              marginBottom: 16,
            }}
          >
            {[
              {
                label: "Total Entries",
                value: data.total,
                color: T.blue,
                icon: "🚗",
              },
              {
                label: "FC Completed",
                value: data.completed,
                color: T.green,
                icon: "✅",
              },
              {
                label: "Skipped",
                value: data.skipped,
                color: T.amber,
                icon: "⏭️",
              },
              {
                label: "Still Pending",
                value: data.pending,
                color: T.red,
                icon: "⏳",
              },
            ].map((k) => (
              <KPI key={k.label} T={T} {...k} />
            ))}
          </div>

          {/* Staff Productivity */}
          {data.staffStats.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: T.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: 8,
                }}
              >
                Staff Productivity
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {[
                        "Staff Member",
                        "Work 1",
                        "Work 2",
                        "Work 3",
                        "Total Assignments",
                      ].map((h) => (
                        <TH key={h} T={T}>
                          {h}
                        </TH>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.staffStats.map((s) => (
                      <tr
                        key={s.name}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = T.surfaceElevated)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <TD T={T}>
                          <span style={{ fontWeight: 700 }}>{s.name}</span>
                        </TD>
                        <TD T={T}>
                          <Chip color={T.blue} bg={T.blueLight}>
                            {s.w1}
                          </Chip>
                        </TD>
                        <TD T={T}>
                          <Chip color={T.blue} bg={T.blueLight}>
                            {s.w2}
                          </Chip>
                        </TD>
                        <TD T={T}>
                          <Chip color={T.blue} bg={T.blueLight}>
                            {s.w3}
                          </Chip>
                        </TD>
                        <TD T={T}>
                          <span
                            style={{
                              fontWeight: 800,
                              color: T.green,
                              fontFamily: "'DM Mono',monospace",
                            }}
                          >
                            {s.total}
                          </span>
                        </TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Skip Reason Breakdown */}
          {Object.keys(data.skipMap).length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: T.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: 8,
                }}
              >
                Skip Reasons
              </div>
              {Object.entries(data.skipMap)
                .sort((a, b) => b[1] - a[1])
                .map(([reason, count]) => {
                  const total = Object.values(data.skipMap).reduce(
                    (a, b) => a + b,
                    0,
                  );
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={reason} style={{ marginBottom: 8 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 3,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: T.text,
                          }}
                        >
                          {reason}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: T.textMuted,
                          }}
                        >
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div
                        style={{
                          height: 5,
                          background: T.surfaceElevated,
                          borderRadius: 3,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: "100%",
                            background: "#f59e0b",
                            borderRadius: 3,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Vehicle Log */}
          {data.rows.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: T.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: 8,
                }}
              >
                Vehicle Log ({data.rows.length})
              </div>
              <div
                style={{ overflowX: "auto", maxHeight: 400, overflowY: "auto" }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {[
                        "#",
                        "Vehicle No",
                        "Customer",
                        "Model",
                        "Entry Time",
                        "FC Status",
                        "Work 1",
                        "Work 2",
                        "Work 3",
                        "Skip Reason",
                      ].map((h) => (
                        <TH key={h} T={T}>
                          {h}
                        </TH>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((v, i) => {
                      const fcStatus = v.fc_completed
                        ? {
                            label: "Completed",
                            color: T.green,
                            bg: T.greenLight,
                          }
                        : v.fc_cancelled
                          ? { label: "Cancelled", color: T.red, bg: T.redLight }
                          : v.fc_skip_reason
                            ? {
                                label: "Skipped",
                                color: T.amber,
                                bg: T.amberLight,
                              }
                            : {
                                label: "Pending",
                                color: T.textMuted,
                                bg: T.surfaceElevated,
                              };
                      return (
                        <tr
                          key={v.id}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              T.surfaceElevated)
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <TD
                            T={T}
                            style={{ color: T.textMuted, fontSize: 11 }}
                          >
                            {i + 1}
                          </TD>
                          <TD T={T}>
                            <span
                              style={{
                                fontWeight: 800,
                                fontFamily: "'DM Mono',monospace",
                              }}
                            >
                              {v.vehicle_number}
                            </span>
                          </TD>
                          <TD T={T}>{v.customer_name || "—"}</TD>
                          <TD T={T}>
                            {v.model ? (
                              <Chip color={T.blue} bg={T.blueLight}>
                                {v.model}
                              </Chip>
                            ) : (
                              "—"
                            )}
                          </TD>
                          <TD
                            T={T}
                            style={{ fontSize: 11, color: T.textMuted }}
                          >
                            {formatIST(v.entry_time)}
                          </TD>
                          <TD T={T}>
                            <Chip color={fcStatus.color} bg={fcStatus.bg}>
                              {fcStatus.label}
                            </Chip>
                          </TD>
                          <TD T={T} style={{ fontSize: 11 }}>
                            {v.fc ? data.userMap[v.fc.work_1_by] || "—" : "—"}
                          </TD>
                          <TD T={T} style={{ fontSize: 11 }}>
                            {v.fc ? data.userMap[v.fc.work_2_by] || "—" : "—"}
                          </TD>
                          <TD T={T} style={{ fontSize: 11 }}>
                            {v.fc ? data.userMap[v.fc.work_3_by] || "—" : "—"}
                          </TD>
                          <TD T={T} style={{ fontSize: 11, color: T.amber }}>
                            {v.fc_skip_reason || "—"}
                          </TD>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </Bx>
  );
}

// ─── TEAM TAB ─────────────────────────────────────────────────────────────────
function TeamTab({ T, users, teams, onRefresh, derived, vehicles }) {
  const [sub, setSub] = useState("overview");
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editTeam, setEditTeam] = useState(null);
  const [srch, setSrch] = useState("");
  const [rf, setRf] = useState("all");

  const filtU = users.filter((u) => {
    const m =
      !srch.trim() ||
      u.full_name?.toLowerCase().includes(srch.toLowerCase()) ||
      u.phone?.includes(srch);
    return m && (rf === "all" || u.role === rf);
  });
  const toggle = async (u) => {
    if (!confirm(`${u.is_active ? "Deactivate" : "Activate"} ${u.full_name}?`))
      return;
    await supabase
      .from("users")
      .update({ is_active: !u.is_active })
      .eq("id", u.id);
    onRefresh();
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {[
          ["overview", "🏭 Overview"],
          ["users", "👥 Users"],
          ["teams", "🏢 Teams"],
        ].map(([k, l]) => (
          <Btn
            key={k}
            T={T}
            v={sub === k ? "primary" : "secondary"}
            onClick={() => setSub(k)}
          >
            {l}
          </Btn>
        ))}
      </div>
      {sub === "overview" && (
        <TeamOverview
          T={T}
          derived={derived}
          vehicles={vehicles}
          onManageTeam={(team) => setEditTeam(team)}
        />
      )}
      {sub === "users" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                value={srch}
                onChange={(e) => setSrch(e.target.value)}
                placeholder="Search name or phone..."
                style={{
                  padding: "7px 12px",
                  border: `1px solid ${T.border}`,
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: "inherit",
                  background: T.surface,
                  color: T.text,
                  outline: "none",
                  width: 210,
                }}
              />
              <select
                value={rf}
                onChange={(e) => setRf(e.target.value)}
                style={{
                  padding: "7px 12px",
                  border: `1px solid ${T.border}`,
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: "inherit",
                  background: T.surface,
                  color: T.text,
                  cursor: "pointer",
                }}
              >
                <option value="all">All Roles</option>
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r] || r}
                  </option>
                ))}
              </select>
            </div>
            <Btn T={T} v="primary" onClick={() => setShowAddUser(true)}>
              + Add User
            </Btn>
          </div>
          <Bx T={T}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {[
                      "Name",
                      "Phone",
                      "Role",
                      "Team",
                      "Auth",
                      "Status",
                      "Actions",
                    ].map((h) => (
                      <TH key={h} T={T}>
                        {h}
                      </TH>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtU.map((u) => {
                    const team = teams.find((t) => t.id === u.team_id);
                    return (
                      <tr
                        key={u.id}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = T.surfaceElevated)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <TD T={T}>
                          <span style={{ fontWeight: 700 }}>{u.full_name}</span>
                        </TD>
                        <TD T={T} style={{ fontFamily: "'DM Mono',monospace" }}>
                          {u.phone}
                        </TD>
                        <TD T={T}>
                          <Chip color={T.blue} bg={T.blueLight}>
                            {ROLE_LABELS[u.role] || u.role}
                          </Chip>
                        </TD>
                        <TD
                          T={T}
                          style={{ color: T.textSecondary, fontSize: 12 }}
                        >
                          {team?.name || "—"}
                        </TD>
                        <TD T={T}>
                          <Chip
                            color={u.auth_id ? T.green : T.amber}
                            bg={u.auth_id ? T.greenLight : T.amberLight}
                          >
                            {u.auth_id ? "✅ Linked" : "⚠️ Legacy"}
                          </Chip>
                        </TD>
                        <TD T={T}>
                          <Chip
                            color={u.is_active ? T.green : T.red}
                            bg={u.is_active ? T.greenLight : T.redLight}
                          >
                            {u.is_active ? "Active" : "Inactive"}
                          </Chip>
                        </TD>
                        <TD T={T}>
                          <div style={{ display: "flex", gap: 5 }}>
                            <Btn
                              T={T}
                              v="ghost"
                              sz="sm"
                              onClick={() => setEditUser(u)}
                            >
                              Edit
                            </Btn>
                            <Btn
                              T={T}
                              v={u.is_active ? "danger" : "success"}
                              sz="sm"
                              onClick={() => toggle(u)}
                            >
                              {u.is_active ? "Deactivate" : "Activate"}
                            </Btn>
                          </div>
                        </TD>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtU.length === 0 && (
                <Empty T={T} icon="👤" text="No users found" />
              )}
            </div>
          </Bx>
        </div>
      )}
      {sub === "teams" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 12,
            }}
          >
            <Btn T={T} v="primary" onClick={() => setShowAddTeam(true)}>
              + Create Team
            </Btn>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 14,
            }}
          >
            {teams.map((team) => {
              const dm = STAGE_META[team.role] || { icon: "👥", color: T.blue };
              const mems = users.filter((u) => u.team_id === team.id);
              return (
                <Bx
                  T={T}
                  key={team.id}
                  style={{ borderTop: `3px solid ${dm.color}` }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <div
                        style={{ fontWeight: 800, fontSize: 14, color: T.text }}
                      >
                        {team.name}
                      </div>
                      <Chip
                        color={dm.color}
                        bg={dm.color + "20"}
                        style={{ marginTop: 4 }}
                      >
                        {dm.icon} {ROLE_LABELS[team.role] || team.role}
                      </Chip>
                    </div>
                    <Btn
                      T={T}
                      v="ghost"
                      sz="sm"
                      onClick={() => setEditTeam(team)}
                    >
                      Edit
                    </Btn>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: T.textMuted,
                      marginBottom: 7,
                    }}
                  >
                    {mems.length} member{mems.length !== 1 ? "s" : ""}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {mems.map((m) => (
                      <Chip
                        key={m.id}
                        color={T.textSecondary}
                        bg={T.surfaceElevated}
                      >
                        {m.full_name}
                      </Chip>
                    ))}
                    {mems.length === 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          color: T.textMuted,
                          fontStyle: "italic",
                        }}
                      >
                        No members
                      </span>
                    )}
                  </div>
                </Bx>
              );
            })}
          </div>
          {teams.length === 0 && <Empty T={T} icon="🏢" text="No teams yet" />}
        </div>
      )}
      {showAddUser && (
        <AddUserDlg
          T={T}
          onClose={() => setShowAddUser(false)}
          onSuccess={() => {
            setShowAddUser(false);
            onRefresh();
          }}
        />
      )}
      {showAddTeam && (
        <AddTeamDlg
          T={T}
          onClose={() => setShowAddTeam(false)}
          onSuccess={() => {
            setShowAddTeam(false);
            onRefresh();
          }}
        />
      )}
      {editUser && (
        <EditUserDlg
          T={T}
          user={editUser}
          onClose={() => setEditUser(null)}
          onSuccess={() => {
            setEditUser(null);
            onRefresh();
          }}
        />
      )}
      {editTeam && (
        <EditTeamDlg
          T={T}
          team={editTeam}
          users={users}
          onClose={() => setEditTeam(null)}
          onSuccess={() => {
            setEditTeam(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

function AddUserDlg({ T, onClose, onSuccess }) {
  const [f, setF] = useState({
    full_name: "",
    phone: "",
    password: "",
    role: "gateman",
    email: "",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const upd = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const go = async () => {
    if (!f.full_name.trim() || !f.phone.trim() || !f.password.trim()) {
      setErr("Name, phone and password are required");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      // Refresh first to ensure token is not stale
      await supabase.auth.refreshSession();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired — please log in again");
      const { data, error: fe } = await supabase.functions.invoke(
        "create-user",
        {
          body: {
            full_name: f.full_name,
            phone: f.phone,
            password: f.password,
            role: f.role,
          },
        },
      );
      if (fe || data?.error)
        throw new Error(fe?.message || data?.error || "Failed");
      if (f.email.trim()) {
        await supabase
          .from("users")
          .update({ email: f.email.trim() })
          .eq("phone", f.phone);
      }
      onSuccess();
    } catch (e) {
      setErr(e.message);
      setLoading(false);
    }
  };
  return (
    <Dlg T={T} open={true} onClose={onClose} title="Add New User">
      <Inp
        T={T}
        label="Full Name"
        value={f.full_name}
        onChange={(v) => upd("full_name", v)}
        required
      />
      <Inp
        T={T}
        label="Phone (login)"
        value={f.phone}
        onChange={(v) => upd("phone", v)}
        required
      />
      <Inp
        T={T}
        label="Email (for Google login)"
        value={f.email}
        onChange={(v) => upd("email", v)}
        placeholder="staff@gmail.com"
      />
      <Inp
        T={T}
        label="Password"
        value={f.password}
        onChange={(v) => upd("password", v)}
        required
      />
      <Sel
        T={T}
        label="Role"
        value={f.role}
        onChange={(v) => upd("role", v)}
        options={ALL_ROLES.map((r) => ({
          value: r,
          label: ROLE_LABELS[r] || r,
        }))}
      />
      {err && (
        <div
          style={{
            background: T.redLight,
            color: T.red,
            padding: "9px 12px",
            borderRadius: 6,
            fontSize: 13,
            marginBottom: 12,
          }}
        >
          {err}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <Btn
          T={T}
          v="secondary"
          onClick={onClose}
          style={{ flex: 1, justifyContent: "center" }}
        >
          Cancel
        </Btn>
        <Btn
          T={T}
          v="primary"
          onClick={go}
          disabled={loading}
          style={{ flex: 2, justifyContent: "center" }}
        >
          {loading ? "Adding..." : "Add User"}
        </Btn>
      </div>
    </Dlg>
  );
}

// ─── EDIT USER DIALOG (expanded) ─────────────────────────────────────────────
// Drop-in replacement for the existing EditUserDlg in owner_v2.js
// Tabs: Basic | Personal | Documents | Emergency

function EditUserDlg({ T, user, onClose, onSuccess }) {
  const [tab, setTab] = useState("basic");
  const [f, setF] = useState({
    // Basic
    full_name: user.full_name || "",
    phone: user.phone || "",
    email: user.email || "",
    password: "",
    role: user.role || "",
    // Personal
    date_of_birth: user.date_of_birth || "",
    blood_group: user.blood_group || "",
    date_of_joining: user.date_of_joining || "",
    current_address: user.current_address || "",
    permanent_address: user.permanent_address || "",
    notes: user.notes || "",
    // Documents
    aadhar_number: user.aadhar_number || "",
    pan_number: user.pan_number || "",
    dl_number: user.dl_number || "",
    dl_expiry: user.dl_expiry || "",
    // Emergency
    emergency_contact_name: user.emergency_contact_name || "",
    emergency_contact_phone: user.emergency_contact_phone || "",
    emergency_contact_relation: user.emergency_contact_relation || "",
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState({});
  const [photoUrls, setPhotoUrls] = useState({
    profile_photo_url: user.profile_photo_url || null,
    aadhar_front_url: user.aadhar_front_url || null,
    aadhar_back_url: user.aadhar_back_url || null,
    pan_front_url: user.pan_front_url || null,
    pan_back_url: user.pan_back_url || null,
    dl_front_url: user.dl_front_url || null,
    dl_back_url: user.dl_back_url || null,
  });
  const [err, setErr] = useState("");

  const upd = (k, v) => setF((p) => ({ ...p, [k]: v }));

  // ─── Upload a document photo to Supabase Storage ───────────────────────────
  const uploadPhoto = async (field, file) => {
    if (!file) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${field}.${ext}`;
    setUploading((p) => ({ ...p, [field]: true }));
    try {
      const { error: upErr } = await supabase.storage
        .from("staff-documents")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      // Get signed URL (1 year expiry)
      const { data: signed } = await supabase.storage
        .from("staff-documents")
        .createSignedUrl(path, 60 * 60 * 24 * 365);

      // Save URL to users table immediately
      await supabase
        .from("users")
        .update({
          [field]: signed.signedUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      setPhotoUrls((p) => ({ ...p, [field]: signed.signedUrl }));
    } catch (e) {
      alert("Upload failed: " + e.message);
    } finally {
      setUploading((p) => ({ ...p, [field]: false }));
    }
  };

  // ─── Save all text fields ──────────────────────────────────────────────────
  const go = async () => {
    if (!f.full_name.trim()) {
      setErr("Name required");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      await supabase.auth.refreshSession();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired — please log in again");

      // Update auth fields via Edge Function
      const { data, error: fe } = await supabase.functions.invoke(
        "create-user",
        {
          body: {
            action: "update",
            user_id: user.id,
            full_name: f.full_name,
            phone: f.phone,
            password: f.password || null,
            role: f.role,
          },
        },
      );
      if (fe || data?.error)
        throw new Error(fe?.message || data?.error || "Failed");

      // Update all extended fields directly
      await supabase
        .from("users")
        .update({
          email: f.email || null,
          date_of_birth: f.date_of_birth || null,
          blood_group: f.blood_group || null,
          date_of_joining: f.date_of_joining || null,
          current_address: f.current_address || null,
          permanent_address: f.permanent_address || null,
          notes: f.notes || null,
          aadhar_number: f.aadhar_number || null,
          pan_number: f.pan_number || null,
          dl_number: f.dl_number || null,
          dl_expiry: f.dl_expiry || null,
          emergency_contact_name: f.emergency_contact_name || null,
          emergency_contact_phone: f.emergency_contact_phone || null,
          emergency_contact_relation: f.emergency_contact_relation || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      onSuccess();
    } catch (e) {
      setErr(e.message);
      setLoading(false);
    }
  };

  // ─── Photo upload widget ───────────────────────────────────────────────────
  const PhotoField = ({ field, label }) => (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: T.textSecondary,
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {photoUrls[field] ? (
          <a href={photoUrls[field]} target="_blank" rel="noreferrer">
            <img
              src={photoUrls[field]}
              alt={label}
              style={{
                width: 80,
                height: 56,
                objectFit: "cover",
                borderRadius: 6,
                border: `1px solid ${T.border}`,
                cursor: "pointer",
              }}
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </a>
        ) : (
          <div
            style={{
              width: 80,
              height: 56,
              borderRadius: 6,
              border: `1px dashed ${T.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              color: T.textMuted,
              background: T.surface,
            }}
          >
            No photo
          </div>
        )}
        <label style={{ cursor: "pointer" }}>
          <div
            style={{
              padding: "7px 14px",
              borderRadius: 6,
              border: `1px solid ${T.border}`,
              fontSize: 12,
              fontWeight: 600,
              color: T.text,
              background: T.surface,
              cursor: "pointer",
            }}
          >
            {uploading[field]
              ? "Uploading..."
              : photoUrls[field]
                ? "Replace"
                : "Upload"}
          </div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            style={{ display: "none" }}
            disabled={uploading[field]}
            onChange={(e) => uploadPhoto(field, e.target.files[0])}
          />
        </label>
      </div>
    </div>
  );

  const TABS = [
    { key: "basic", label: "👤 Basic" },
    { key: "personal", label: "📋 Personal" },
    { key: "documents", label: "🪪 Documents" },
    { key: "emergency", label: "🚨 Emergency" },
  ];

  const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  return (
    <Dlg
      T={T}
      open={true}
      onClose={onClose}
      title={`Edit — ${user.full_name}`}
      wide={true}
    >
      {/* Auth status */}
      <div
        style={{
          padding: "7px 12px",
          borderRadius: 6,
          fontSize: 12,
          marginBottom: 14,
          background: user.auth_id ? T.greenLight : T.amberLight,
          color: user.auth_id ? T.green : T.amber,
        }}
      >
        {user.auth_id
          ? "✅ Linked to Supabase Auth"
          : "⚠️ No Auth linked — password only updates local record"}
      </div>

      {/* Tab switcher */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 20,
          borderBottom: `1px solid ${T.border}`,
          paddingBottom: 0,
        }}
      >
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "inherit",
              border: "none",
              borderBottom:
                tab === key ? `2px solid ${T.blue}` : "2px solid transparent",
              background: "transparent",
              color: tab === key ? T.blue : T.textSecondary,
              cursor: "pointer",
              marginBottom: -1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── BASIC TAB ── */}
      {tab === "basic" && (
        <div>
          {/* Profile photo */}
          <PhotoField field="profile_photo_url" label="Profile Photo" />
          <Inp
            T={T}
            label="Full Name"
            value={f.full_name}
            onChange={(v) => upd("full_name", v)}
            required
          />
          <Inp
            T={T}
            label="Phone"
            value={f.phone}
            onChange={(v) => upd("phone", v)}
          />
          <Inp
            T={T}
            label="Email (for Google login)"
            value={f.email}
            onChange={(v) => upd("email", v)}
            placeholder="staff@gmail.com"
          />
          <Inp
            T={T}
            label="New Password (leave blank to keep)"
            value={f.password}
            onChange={(v) => upd("password", v)}
            placeholder="Leave blank to keep"
          />
          <Sel
            T={T}
            label="Role"
            value={f.role}
            onChange={(v) => upd("role", v)}
            options={ALL_ROLES.map((r) => ({
              value: r,
              label: ROLE_LABELS[r] || r,
            }))}
          />
        </div>
      )}

      {/* ── PERSONAL TAB ── */}
      {tab === "personal" && (
        <div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.textSecondary,
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                Date of Birth
              </div>
              <input
                type="date"
                value={f.date_of_birth}
                onChange={(e) => upd("date_of_birth", e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: `1px solid ${T.border}`,
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: "inherit",
                  background: T.surface,
                  color: T.text,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.textSecondary,
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                Date of Joining
              </div>
              <input
                type="date"
                value={f.date_of_joining}
                onChange={(e) => upd("date_of_joining", e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: `1px solid ${T.border}`,
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: "inherit",
                  background: T.surface,
                  color: T.text,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <Sel
              T={T}
              label="Blood Group"
              value={f.blood_group}
              onChange={(v) => upd("blood_group", v)}
              options={[
                { value: "", label: "— Select —" },
                ...BLOOD_GROUPS.map((b) => ({ value: b, label: b })),
              ]}
            />
          </div>
          <div style={{ marginTop: 4 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: T.textSecondary,
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              Current Address
            </div>
            <textarea
              value={f.current_address}
              onChange={(e) => upd("current_address", e.target.value)}
              rows={2}
              placeholder="Current residential address"
              style={{
                width: "100%",
                padding: "8px 10px",
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                fontSize: 13,
                fontFamily: "inherit",
                background: T.surface,
                color: T.text,
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ marginTop: 8 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: T.textSecondary,
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              Permanent Address
            </div>
            <textarea
              value={f.permanent_address}
              onChange={(e) => upd("permanent_address", e.target.value)}
              rows={2}
              placeholder="Permanent / native address"
              style={{
                width: "100%",
                padding: "8px 10px",
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                fontSize: 13,
                fontFamily: "inherit",
                background: T.surface,
                color: T.text,
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ marginTop: 8 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: T.textSecondary,
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              Notes
            </div>
            <textarea
              value={f.notes}
              onChange={(e) => upd("notes", e.target.value)}
              rows={2}
              placeholder="Any notes about this staff member"
              style={{
                width: "100%",
                padding: "8px 10px",
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                fontSize: 13,
                fontFamily: "inherit",
                background: T.surface,
                color: T.text,
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>
      )}

      {/* ── DOCUMENTS TAB ── */}
      {tab === "documents" && (
        <div>
          {/* Aadhar */}
          <div
            style={{
              marginBottom: 20,
              padding: 14,
              borderRadius: 8,
              border: `1px solid ${T.border}`,
              background: T.surface,
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: 13,
                color: T.text,
                marginBottom: 12,
              }}
            >
              🪪 Aadhar Card
            </div>
            <Inp
              T={T}
              label="Aadhar Number"
              value={f.aadhar_number}
              onChange={(v) => upd("aadhar_number", v)}
              placeholder="12-digit Aadhar number"
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginTop: 8,
              }}
            >
              <PhotoField field="aadhar_front_url" label="Front Side" />
              <PhotoField field="aadhar_back_url" label="Back Side" />
            </div>
          </div>

          {/* PAN */}
          <div
            style={{
              marginBottom: 20,
              padding: 14,
              borderRadius: 8,
              border: `1px solid ${T.border}`,
              background: T.surface,
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: 13,
                color: T.text,
                marginBottom: 12,
              }}
            >
              🗂 PAN Card
            </div>
            <Inp
              T={T}
              label="PAN Number"
              value={f.pan_number}
              onChange={(v) => upd("pan_number", v)}
              placeholder="e.g. ABCDE1234F"
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginTop: 8,
              }}
            >
              <PhotoField field="pan_front_url" label="Front Side" />
              <PhotoField field="pan_back_url" label="Back Side" />
            </div>
          </div>

          {/* Driving License */}
          <div
            style={{
              padding: 14,
              borderRadius: 8,
              border: `1px solid ${T.border}`,
              background: T.surface,
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: 13,
                color: T.text,
                marginBottom: 12,
              }}
            >
              🚗 Driving License
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <Inp
                T={T}
                label="DL Number"
                value={f.dl_number}
                onChange={(v) => upd("dl_number", v)}
                placeholder="e.g. MH0120200012345"
              />
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.textSecondary,
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                  }}
                >
                  Expiry Date
                </div>
                <input
                  type="date"
                  value={f.dl_expiry}
                  onChange={(e) => upd("dl_expiry", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: `1px solid ${T.border}`,
                    borderRadius: 6,
                    fontSize: 13,
                    fontFamily: "inherit",
                    background: T.surface,
                    color: T.text,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginTop: 12,
              }}
            >
              <PhotoField field="dl_front_url" label="Front Side" />
              <PhotoField field="dl_back_url" label="Back Side" />
            </div>
            {/* DL expiry warning */}
            {f.dl_expiry &&
              new Date(f.dl_expiry) <
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "8px 12px",
                    borderRadius: 6,
                    background: T.amberLight,
                    color: T.amber,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  ⚠️ Driving license{" "}
                  {new Date(f.dl_expiry) < new Date()
                    ? "has expired"
                    : "expires within 30 days"}{" "}
                  — renewal needed
                </div>
              )}
          </div>
        </div>
      )}

      {/* ── EMERGENCY TAB ── */}
      {tab === "emergency" && (
        <div>
          <div
            style={{
              padding: 14,
              borderRadius: 8,
              border: `1px solid ${T.border}`,
              background: T.surface,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: 13,
                color: T.text,
                marginBottom: 12,
              }}
            >
              🚨 Emergency Contact
            </div>
            <Inp
              T={T}
              label="Contact Name"
              value={f.emergency_contact_name}
              onChange={(v) => upd("emergency_contact_name", v)}
              placeholder="Full name"
            />
            <Inp
              T={T}
              label="Contact Phone"
              value={f.emergency_contact_phone}
              onChange={(v) => upd("emergency_contact_phone", v)}
              placeholder="10-digit mobile"
            />
            <Sel
              T={T}
              label="Relationship"
              value={f.emergency_contact_relation}
              onChange={(v) => upd("emergency_contact_relation", v)}
              options={[
                { value: "", label: "— Select —" },
                { value: "father", label: "Father" },
                { value: "mother", label: "Mother" },
                { value: "spouse", label: "Spouse" },
                { value: "brother", label: "Brother" },
                { value: "sister", label: "Sister" },
                { value: "son", label: "Son" },
                { value: "daughter", label: "Daughter" },
                { value: "friend", label: "Friend" },
                { value: "other", label: "Other" },
              ]}
            />
          </div>
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: T.blueLight,
              fontSize: 12,
              color: T.blue,
            }}
          >
            ℹ️ This contact will be reached in case of a medical emergency or
            accident at the workplace.
          </div>
        </div>
      )}

      {/* Error */}
      {err && (
        <div
          style={{
            background: T.redLight,
            color: T.red,
            padding: "9px 12px",
            borderRadius: 6,
            fontSize: 13,
            marginTop: 14,
            marginBottom: 4,
          }}
        >
          {err}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <Btn
          T={T}
          v="secondary"
          onClick={onClose}
          style={{ flex: 1, justifyContent: "center" }}
        >
          Cancel
        </Btn>
        <Btn
          T={T}
          v="primary"
          onClick={go}
          disabled={loading}
          style={{ flex: 2, justifyContent: "center" }}
        >
          {loading ? "Saving..." : "Save Changes"}
        </Btn>
      </div>
    </Dlg>
  );
}

function AddTeamDlg({ T, onClose, onSuccess }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("mechanic");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const go = async () => {
    if (!name.trim()) {
      setErr("Team name required");
      return;
    }
    setLoading(true);
    try {
      const { error: e } = await supabase
        .from("teams")
        .insert([{ name: name.trim(), role }]);
      if (e) throw e;
      onSuccess();
    } catch (e) {
      setErr(e.message);
      setLoading(false);
    }
  };
  return (
    <Dlg
      T={T}
      open={true}
      onClose={onClose}
      title="Create New Team"
      width={420}
    >
      <Inp
        T={T}
        label="Team Name"
        value={name}
        onChange={setName}
        required
        placeholder="e.g. Team Alpha"
      />
      <Sel
        T={T}
        label="Department"
        value={role}
        onChange={setRole}
        options={TEAM_ROLES.map((r) => ({
          value: r,
          label: ROLE_LABELS[r] || r,
        }))}
      />
      {err && (
        <div
          style={{
            background: T.redLight,
            color: T.red,
            padding: "9px 12px",
            borderRadius: 6,
            fontSize: 13,
            marginBottom: 12,
          }}
        >
          {err}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <Btn
          T={T}
          v="secondary"
          onClick={onClose}
          style={{ flex: 1, justifyContent: "center" }}
        >
          Cancel
        </Btn>
        <Btn
          T={T}
          v="primary"
          onClick={go}
          disabled={loading}
          style={{ flex: 2, justifyContent: "center" }}
        >
          {loading ? "Creating..." : "Create Team"}
        </Btn>
      </div>
    </Dlg>
  );
}

function EditTeamDlg({ T, team, users, onClose, onSuccess }) {
  const [name, setName] = useState(team.name);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const members = users.filter((u) => u.team_id === team.id);
  const avail = users.filter(
    (u) => u.role === team.role && u.team_id !== team.id && u.is_active,
  );
  const saveName = async () => {
    if (!name.trim()) {
      setErr("Name required");
      return;
    }
    setLoading(true);
    try {
      const { error: e } = await supabase
        .from("teams")
        .update({ name: name.trim() })
        .eq("id", team.id);
      if (e) throw e;
      onSuccess();
    } catch (e) {
      setErr(e.message);
      setLoading(false);
    }
  };
  const add = async (uid) => {
    await supabase.from("users").update({ team_id: team.id }).eq("id", uid);
    onSuccess();
  };
  const rem = async (uid) => {
    if (!confirm("Remove from team?")) return;
    await supabase.from("users").update({ team_id: null }).eq("id", uid);
    onSuccess();
  };
  const del = async () => {
    if (members.length > 0) {
      alert("Remove all members first");
      return;
    }
    if (!confirm(`Delete "${team.name}"?`)) return;
    await supabase.from("teams").delete().eq("id", team.id);
    onSuccess();
  };
  return (
    <Dlg
      T={T}
      open={true}
      onClose={onClose}
      title={`Edit — ${team.name}`}
      width={560}
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            flex: 1,
            padding: "8px 12px",
            border: `1px solid ${T.border}`,
            borderRadius: 6,
            fontSize: 14,
            fontFamily: "inherit",
            background: T.surface,
            color: T.text,
          }}
        />
        <Btn T={T} v="secondary" onClick={saveName} disabled={loading}>
          Save Name
        </Btn>
        <Btn T={T} v="danger" onClick={del}>
          Delete
        </Btn>
      </div>
      {err && (
        <div
          style={{
            background: T.redLight,
            color: T.red,
            padding: "8px 12px",
            borderRadius: 6,
            fontSize: 12,
            marginBottom: 12,
          }}
        >
          {err}
        </div>
      )}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: T.textMuted,
            textTransform: "uppercase",
            marginBottom: 7,
          }}
        >
          Members ({members.length})
        </div>
        {members.length === 0 ? (
          <div
            style={{ fontSize: 13, color: T.textMuted, fontStyle: "italic" }}
          >
            No members
          </div>
        ) : (
          members.map((m) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "7px 12px",
                background: T.surfaceElevated,
                borderRadius: 6,
                marginBottom: 5,
              }}
            >
              <div>
                <span style={{ fontWeight: 600, color: T.text }}>
                  {m.full_name}
                </span>
                <span
                  style={{ fontSize: 11, color: T.textMuted, marginLeft: 10 }}
                >
                  {m.phone}
                </span>
              </div>
              <Btn T={T} v="danger" sz="sm" onClick={() => rem(m.id)}>
                Remove
              </Btn>
            </div>
          ))
        )}
      </div>
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: T.textMuted,
            textTransform: "uppercase",
            marginBottom: 7,
          }}
        >
          Add Members
        </div>
        {avail.length === 0 ? (
          <div
            style={{ fontSize: 13, color: T.textMuted, fontStyle: "italic" }}
          >
            No available {ROLE_LABELS[team.role]} users
          </div>
        ) : (
          avail.map((u) => (
            <div
              key={u.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "7px 12px",
                background: T.greenLight,
                borderRadius: 6,
                marginBottom: 5,
              }}
            >
              <span style={{ fontWeight: 600, color: T.text }}>
                {u.full_name}
              </span>
              <Btn T={T} v="success" sz="sm" onClick={() => add(u.id)}>
                + Add
              </Btn>
            </div>
          ))
        )}
      </div>
    </Dlg>
  );
}

// ─── SEARCH MODAL ─────────────────────────────────────────────────────────────
function SearchModal({ T, onClose, onSelect }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from("vehicles")
        .select("*,work_stages(*)")
        .or(
          `vehicle_number.ilike.%${q}%,customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%`,
        )
        .is("deleted_at", null)
        .order("entry_time", { ascending: false })
        .limit(20);
      setResults(data || []);
      setLoading(false);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <Dlg
      T={T}
      open={true}
      onClose={onClose}
      title="Search Vehicles"
      width={640}
    >
      <input
        ref={ref}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Vehicle number, customer name, phone..."
        autoCapitalize="characters"
        style={{
          width: "100%",
          padding: "10px 14px",
          border: "2px solid #f59e0b",
          borderRadius: 8,
          fontSize: 15,
          fontFamily: "inherit",
          background: T.surface,
          color: T.text,
          outline: "none",
          marginBottom: 12,
          boxSizing: "border-box",
        }}
      />
      {loading && (
        <div style={{ textAlign: "center", padding: 20, color: T.textMuted }}>
          Searching...
        </div>
      )}
      {!loading && q.length >= 2 && results.length === 0 && (
        <Empty T={T} icon="🔍" text={`No vehicles found for "${q}"`} />
      )}
      {results.map((v) => {
        const meta = STAGE_META[v.current_stage] || {
          icon: "🚗",
          color: T.blue,
          label: v.current_stage,
        };
        return (
          <div
            key={v.id}
            onClick={() => {
              onSelect(v);
              onClose();
            }}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "11px 14px",
              borderRadius: 8,
              border: `1px solid ${T.border}`,
              borderLeft: `3px solid ${meta.color}`,
              marginBottom: 7,
              cursor: "pointer",
              background: T.surface,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = T.surfaceElevated)
            }
            onMouseLeave={(e) => (e.currentTarget.style.background = T.surface)}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 15,
                    fontFamily: "'DM Mono',monospace",
                    color: T.text,
                  }}
                >
                  {v.vehicle_number}
                </span>
                {v.model && (
                  <Chip color={T.blue} bg={T.blueLight}>
                    {v.model}
                  </Chip>
                )}
                {v.priority !== "normal" && (
                  <Chip
                    color={v.priority === "vip" ? T.purple : T.red}
                    bg={v.priority === "vip" ? T.purpleLight : T.redLight}
                  >
                    {v.priority.toUpperCase()}
                  </Chip>
                )}
              </div>
              <div style={{ fontSize: 13, color: T.textSecondary }}>
                {v.customer_name || "—"} • {v.customer_phone || "—"}
              </div>
              {v.work_stages?.[0] && <WorkBadges T={T} ws={v.work_stages[0]} />}
            </div>
            <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 14 }}>
              <Chip color={meta.color} bg={meta.color + "22"}>
                {meta.icon} {meta.label}
              </Chip>
              <div style={{ fontSize: 10, color: T.textMuted, marginTop: 5 }}>
                {formatIST(v.entry_time)}
              </div>
            </div>
          </div>
        );
      })}
    </Dlg>
  );
}

// ─── CONFIG OPTIONS HOOK ──────────────────────────────────────────────────────
function useConfigCategory(category) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("config_options")
          .select("key, label, color, bg_color, sort_order")
          .eq("category", category)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });
        if (error) throw error;
        if (isMounted && data && data.length > 0) setRows(data);
      } catch (e) {
        console.error(`Error fetching config category "${category}":`, e);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [category]);
  return rows;
}

const CONFIG_CATEGORY_LABELS = {
  leave_type: "Leave Types",
  vehicle_model: "Vehicle Models",
  fuel_level: "Fuel Levels",
  skip_reason: "Skip Reasons",
  priority: "Priority Levels",
  stage: "Stages (Front Checkup)",
  time_slot: "Booking Time Slots",
  department: "Departments",
  workflow_stage: "Workflow Stages",
  alignment_work_type: "Alignment Work Types",
  tyre_position: "Tyre Positions",
  three_m_work_type: "3M Work Types",
  washing_work_type: "Washing Work Types",
  washing_slot: "Washing Bay Slots",
  vehicle_service_type: "Vehicle Service Types",
  booking_status: "Booking Statuses",
  booking_service_type: "Booking Service Types",
  deletion_reason: "Deletion Reasons",
};

// Groups the flat config-category sidebar into collapsible sections.
// Layout/navigation only — does not change what categories exist or how they load.
const CONFIG_GROUPS = [
  {
    name: "Booking & Scheduling",
    icon: "📅",
    keys: ["time_slot", "booking_status", "booking_service_type"],
  },
  {
    name: "Vehicle Intake",
    icon: "🚗",
    keys: [
      "vehicle_model",
      "fuel_level",
      "priority",
      "vehicle_service_type",
      "skip_reason",
    ],
  },
  {
    name: "Workshop Workflow",
    icon: "🔧",
    keys: ["stage", "workflow_stage", "department"],
  },
  {
    name: "Department Work Types",
    icon: "🛠️",
    keys: [
      "alignment_work_type",
      "tyre_position",
      "three_m_work_type",
      "washing_work_type",
      "washing_slot",
    ],
  },
  {
    name: "Admin & HR",
    icon: "🗂️",
    keys: ["leave_type", "deletion_reason"],
  },
  {
    name: "Catalog & Templates",
    icon: "📦",
    keys: ["__templates__", "__parts_catalog__"],
  },
];

// ─── BOOKINGS TAB ─────────────────────────────────────────────────────────────
const DEFAULT_BOOKING_STATUS_COLORS = {
  pending: { color: "#D97706", bg: "#FEF3C7" },
  confirmed: { color: "#1D4ED8", bg: "#DBEAFE" },
  arrived: { color: "#065F46", bg: "#D1FAE5" },
  completed: { color: "#475569", bg: "#F1F5F9" },
  cancelled: { color: "#991B1B", bg: "#FEE2E2" },
  no_show: { color: "#374151", bg: "#F3F4F6" },
};
const DEFAULT_BOOKING_SVC_LABELS = {
  first_free_service: "1st Free Service",
  second_free_service: "2nd Free Service",
  third_free_service: "3rd Free Service",
  scheduled_minor: "Scheduled Minor",
  scheduled_major: "Scheduled Major",
  running_repair: "Running Repair",
  customer_complaint: "Customer Complaint",
};
const DEFAULT_BOOKING_TIME_LABELS = {
  "09:00-11:00": "9–11 AM",
  "11:00-13:00": "11–1 PM",
  "14:00-16:00": "2–4 PM",
  "16:00-18:00": "4–6 PM",
};

function BookingsTab({ T, bookings }) {
  const statusRows = useConfigCategory("booking_status");
  const bookingStatusColors = statusRows
    ? Object.fromEntries(
        statusRows.map((r) => [r.key, { color: r.color, bg: r.bg_color }]),
      )
    : DEFAULT_BOOKING_STATUS_COLORS;
  const svcRows = useConfigCategory("booking_service_type");
  const bookingSvcLabels = svcRows
    ? Object.fromEntries(svcRows.map((r) => [r.key, r.label]))
    : DEFAULT_BOOKING_SVC_LABELS;
  const timeRows = useConfigCategory("time_slot");
  const bookingTimeLabels = timeRows
    ? Object.fromEntries(timeRows.map((r) => [r.key, r.label]))
    : DEFAULT_BOOKING_TIME_LABELS;

  const [viewDate, setViewDate] = useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
  );

  const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const fmtDate = (d) => {
    if (!d) return "—";
    const [y, m, dy] = d.split("-");
    return `${dy} ${MONTHS[parseInt(m) - 1]}`;
  };
  const navDate = (delta) => {
    const d = new Date(viewDate + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setViewDate(d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }));
  };

  const todayIST = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const tomIST = new Date(Date.now() + 86400000).toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const yestIST = new Date(Date.now() - 86400000).toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });

  const dayBookings = bookings
    .filter((b) => b.preferred_date === viewDate)
    .sort((a, b) =>
      (a.preferred_time || "z").localeCompare(b.preferred_time || "z"),
    );

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    const k = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const day = d.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
    });
    return {
      date: k,
      day,
      count: bookings.filter((b) => b.preferred_date === k).length,
    };
  });
  const maxDay = Math.max(...last7.map((d) => d.count), 1);

  const counts = {
    pending: dayBookings.filter((b) => b.status === "pending").length,
    confirmed: dayBookings.filter((b) => b.status === "confirmed").length,
    arrived: dayBookings.filter((b) => b.status === "arrived").length,
    cancelled: dayBookings.filter((b) =>
      ["cancelled", "no_show"].includes(b.status),
    ).length,
  };

  const exportBookingsExcel = () => {
    const rows = dayBookings.map((b, i) => ({
      Sr: i + 1,
      "Time Slot":
        bookingTimeLabels[b.preferred_time] || b.preferred_time || "Any time",
      "Vehicle No": b.vehicle_number,
      "Customer Name": b.customer_name || "—",
      Model: b.model || "—",
      "Service Type":
        bookingSvcLabels[b.service_type] ||
        b.service_type?.replace(/_/g, " ") ||
        "—",
      Phone: b.customer_phone || "—",
      Status: b.status,
      "Ref No": b.ref_number || "—",
      Notes: "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 4 },
      { wch: 14 },
      { wch: 14 },
      { wch: 20 },
      { wch: 14 },
      { wch: 22 },
      { wch: 13 },
      { wch: 11 },
      { wch: 18 },
      { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bookings");
    XLSX.writeFile(wb, `Bookings_${viewDate}.xlsx`);
  };

  return (
    <div>
      {/* Global KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <KPI
          T={T}
          label="Total Bookings"
          value={bookings.length}
          icon="🗓"
          color={T.blue}
        />
        <KPI
          T={T}
          label="Pending Confirm"
          value={bookings.filter((b) => b.status === "pending").length}
          icon="⏳"
          color={T.amber}
        />
        <KPI
          T={T}
          label="Confirmed"
          value={bookings.filter((b) => b.status === "confirmed").length}
          icon="✅"
          color={T.blue}
        />
        <KPI
          T={T}
          label="Arrived Today"
          value={
            bookings.filter(
              (b) => b.status === "arrived" && b.preferred_date === todayIST,
            ).length
          }
          icon="🚗"
          color={T.green}
        />
      </div>

      {/* 7-day bar chart */}
      <Bx T={T} style={{ marginBottom: 18 }}>
        <SecTitle T={T}>Bookings — Last 7 Days</SecTitle>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 8,
            height: 90,
          }}
        >
          {last7.map((d) => (
            <div
              key={d.date}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                cursor: "pointer",
              }}
              onClick={() => setViewDate(d.date)}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: T.text }}>
                {d.count || ""}
              </div>
              <div
                style={{
                  width: "100%",
                  borderRadius: 4,
                  background:
                    d.date === viewDate
                      ? "#f59e0b"
                      : d.date === todayIST
                        ? "#fcd34d"
                        : "#cbd5e1",
                  height: `${Math.max((d.count / maxDay) * 64, 4)}px`,
                  transition: "height 0.3s",
                }}
              />
              <div
                style={{
                  fontSize: 10,
                  color: d.date === todayIST ? T.amber : T.textMuted,
                  fontWeight: d.date === todayIST ? 700 : 400,
                }}
              >
                {d.day}
              </div>
            </div>
          ))}
        </div>
      </Bx>

      {/* Date nav */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
        }}
      >
        <button
          onClick={() => navDate(-1)}
          style={{
            padding: "7px 12px",
            border: `1px solid ${T.border}`,
            background: T.surface,
            borderRadius: 7,
            cursor: "pointer",
            fontWeight: 700,
            color: T.textSecondary,
            fontFamily: "inherit",
          }}
        >
          ←
        </button>
        <div style={{ flex: 1, display: "flex", gap: 6 }}>
          {[
            [`Yesterday — ${fmtDate(yestIST)}`, yestIST],
            [`Today — ${fmtDate(todayIST)}`, todayIST],
            [`Tomorrow — ${fmtDate(tomIST)}`, tomIST],
          ].map(([lbl, d]) => (
            <button
              key={d}
              onClick={() => setViewDate(d)}
              style={{
                flex: 1,
                padding: "7px 6px",
                border: `1.5px solid ${viewDate === d ? "#f59e0b" : T.border}`,
                background: viewDate === d ? "#fffbeb" : T.surface,
                borderRadius: 7,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
                color: viewDate === d ? "#92400e" : T.textSecondary,
                fontFamily: "inherit",
              }}
            >
              {lbl}
            </button>
          ))}
        </div>
        <Btn
          T={T}
          v="secondary"
          sz="sm"
          onClick={exportBookingsExcel}
          disabled={dayBookings.length === 0}
        >
          ⬇️ Export Excel
        </Btn>
        <input
          type="date"
          value={viewDate}
          onChange={(e) => setViewDate(e.target.value)}
          style={{
            padding: "7px 10px",
            border: `1px solid ${T.border}`,
            borderRadius: 7,
            fontSize: 12,
            background: T.surface,
            color: T.text,
            cursor: "pointer",
          }}
        />
        <button
          onClick={() => navDate(1)}
          style={{
            padding: "7px 12px",
            border: `1px solid ${T.border}`,
            background: T.surface,
            borderRadius: 7,
            cursor: "pointer",
            fontWeight: 700,
            color: T.textSecondary,
            fontFamily: "inherit",
          }}
        >
          →
        </button>
      </div>

      {/* Status counts for selected date */}
      {dayBookings.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 8,
            marginBottom: 14,
          }}
        >
          {[
            ["Pending", counts.pending, "#D97706", "#FEF3C7"],
            ["Confirmed", counts.confirmed, "#1D4ED8", "#DBEAFE"],
            ["Arrived", counts.arrived, "#065F46", "#D1FAE5"],
            ["Cancelled", counts.cancelled, "#991B1B", "#FEE2E2"],
          ].map(([l, n, c, bg]) => (
            <div
              key={l}
              style={{
                background: bg,
                borderRadius: 8,
                padding: "10px 12px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: c,
                  fontFamily: "'DM Mono',monospace",
                }}
              >
                {n}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: c,
                  textTransform: "uppercase",
                  letterSpacing: "0.3px",
                  marginTop: 2,
                }}
              >
                {l}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking list */}
      {dayBookings.length === 0 ? (
        <Empty T={T} icon="🗓" text={`No bookings for ${fmtDate(viewDate)}`} />
      ) : (
        dayBookings.map((b) => {
          const sc = bookingStatusColors[b.status] || {
            color: T.textMuted,
            bg: T.surfaceElevated,
          };
          return (
            <div
              key={b.id}
              style={{
                background: T.surface,
                borderRadius: 10,
                border: `1px solid ${T.border}`,
                borderLeft: `3px solid ${sc.color}`,
                padding: "12px 16px",
                marginBottom: 8,
                boxShadow: T.shadow,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 6,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: 14,
                      fontFamily: "'DM Mono',monospace",
                      color: T.text,
                    }}
                  >
                    {b.vehicle_number}
                  </span>
                  {b.model && (
                    <Chip color={T.blue} bg={T.blueLight}>
                      {b.model}
                    </Chip>
                  )}
                  <Chip color={sc.color} bg={sc.bg}>
                    {b.status}
                  </Chip>
                  {b.ref_number && (
                    <span
                      style={{
                        fontSize: 10,
                        color: T.textMuted,
                        fontFamily: "'DM Mono',monospace",
                      }}
                    >
                      {b.ref_number}
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: T.textSecondary,
                  }}
                >
                  {bookingTimeLabels[b.preferred_time] ||
                    b.preferred_time ||
                    "Any time"}
                </span>
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: T.textSecondary,
                  marginBottom: b.issue_description ? 4 : 0,
                }}
              >
                {b.customer_name || "—"} · {b.customer_phone || "—"}
                {b.service_type &&
                  ` · ${bookingSvcLabels[b.service_type] || b.service_type.replace(/_/g, " ")}`}
              </div>
              {b.issue_description && (
                <div
                  style={{
                    fontSize: 12,
                    color: T.textMuted,
                    fontStyle: "italic",
                  }}
                >
                  "{b.issue_description}"
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── TEMPLATES TAB ────────────────────────────────────────────────────────────
const BOOKING_SVC_TYPES = [
  { key: "first_free_service", label: "1st Free Service" },
  { key: "second_free_service", label: "2nd Free Service" },
  { key: "third_free_service", label: "3rd Free Service" },
  { key: "scheduled_minor", label: "Scheduled Minor" },
  { key: "scheduled_major", label: "Scheduled Major" },
  { key: "running_repair", label: "Running Repair" },
  { key: "customer_complaint", label: "Customer Complaint" },
  { key: "warranty", label: "🛡️ Warranty" },
  { key: "accident", label: "🚨 Accident" },
];

const DEPT_LIST = [
  { key: "mechanic", label: "🔧 Mechanic", type: "work_items" },
  { key: "painter", label: "🎨 Painter", type: "work_items" },
  { key: "denter", label: "🔨 Denter", type: "work_items" },
  { key: "electrician", label: "⚡ Electrician", type: "work_items" },
  { key: "three_m", label: "✨ 3M Work", type: "toggle" },
  { key: "alignment_balancing", label: "⚖️ Alignment", type: "toggle" },
  { key: "washing", label: "💧 Washing", type: "washing" },
];

function TemplatesTab({ T }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editTemplate, setEditTemplate] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("service_templates")
      .select("*")
      .order("sort_order", { ascending: true });
    setTemplates(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleActive = async (t) => {
    await supabase
      .from("service_templates")
      .update({ is_active: !t.is_active })
      .eq("id", t.id);
    load();
  };

  if (loading)
    return (
      <div style={{ textAlign: "center", padding: 60, color: T.textMuted }}>
        Loading templates...
      </div>
    );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
            Service Templates
          </div>
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
            Auto-fill departments and work items when advisor selects a service
            type.
          </div>
        </div>
        <Btn T={T} v="primary" onClick={() => setShowAdd(true)}>
          + Add Template
        </Btn>
      </div>

      <div
        style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 8,
          boxShadow: T.shadow,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Name", "Service Type", "Departments", "Active", "Actions"].map(
                (h) => (
                  <TH key={h} T={T}>
                    {h}
                  </TH>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr
                key={t.id}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = T.surfaceElevated)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <TD T={T}>
                  <div style={{ fontWeight: 700, color: T.text }}>{t.name}</div>
                  <div
                    style={{
                      fontSize: 10,
                      color: T.textMuted,
                      marginTop: 1,
                    }}
                  >
                    Sort: {t.sort_order}
                  </div>
                </TD>
                <TD T={T}>
                  {t.service_type ? (
                    <Chip color={T.blue} bg={T.blueLight}>
                      {BOOKING_SVC_TYPES.find((s) => s.key === t.service_type)
                        ?.label || t.service_type}
                    </Chip>
                  ) : (
                    <span style={{ color: T.textMuted, fontSize: 12 }}>—</span>
                  )}
                </TD>
                <TD T={T}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {(t.departments || []).map((d) => {
                      const dept = DEPT_LIST.find((dl) => dl.key === d.key);
                      const count =
                        (d.workItems?.length || 0) +
                        (d.customWork?.length || 0) +
                        (d.washingTypes?.length || 0);
                      return (
                        <Chip
                          key={d.key}
                          color={T.textSecondary}
                          bg={T.surfaceElevated}
                        >
                          {dept?.label || d.key}
                          {count > 0 ? ` (${count})` : ""}
                        </Chip>
                      );
                    })}
                  </div>
                </TD>
                <TD T={T}>
                  <div
                    onClick={() => toggleActive(t)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      cursor: "pointer",
                      padding: "3px 8px",
                      borderRadius: 12,
                      background: t.is_active ? T.greenLight : T.redLight,
                      border: `1px solid ${
                        t.is_active ? T.green + "44" : T.red + "44"
                      }`,
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: t.is_active ? T.green : T.red,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: t.is_active ? T.green : T.red,
                      }}
                    >
                      {t.is_active ? "Active" : "Hidden"}
                    </span>
                  </div>
                </TD>
                <TD T={T}>
                  <Btn
                    T={T}
                    v="ghost"
                    sz="sm"
                    onClick={() => setEditTemplate(t)}
                  >
                    Edit
                  </Btn>
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
        {templates.length === 0 && (
          <Empty
            T={T}
            icon="📋"
            text="No templates yet"
            sub="Add a template to enable auto-fill for advisors"
          />
        )}
      </div>

      {showAdd && (
        <TemplateDlg
          T={T}
          onClose={() => setShowAdd(false)}
          onSuccess={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}
      {editTemplate && (
        <TemplateDlg
          T={T}
          template={editTemplate}
          onClose={() => setEditTemplate(null)}
          onSuccess={() => {
            setEditTemplate(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function TemplateDlg({ T, template, onClose, onSuccess }) {
  const isEdit = !!template;
  const [name, setName] = useState(template?.name || "");
  const [serviceType, setServiceType] = useState(template?.service_type || "");
  const [isActive, setIsActive] = useState(template?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState(
    template?.sort_order?.toString() || "99",
  );
  const [deptConfigs, setDeptConfigs] = useState(() => {
    const m = {};
    (template?.departments || []).forEach((d) => {
      m[d.key] = { ...d };
    });
    return m;
  });
  const [alignmentOptions, setAlignmentOptions] = useState([]);
  const [washingOptions, setWashingOptions] = useState([]);
  const [threeMOptions, setThreeMOptions] = useState([]);
  const [workItemsByDept, setWorkItemsByDept] = useState({});
  const [customInputs, setCustomInputs] = useState({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const [cfgRes, wiRes] = await Promise.all([
        supabase
          .from("config_options")
          .select("*")
          .in("category", [
            "alignment_work_type",
            "washing_work_type",
            "three_m_work_type",
          ])
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("department_work_items")
          .select("*")
          .eq("is_active", true)
          .order("sort_order"),
      ]);
      const cfg = cfgRes.data || [];
      setAlignmentOptions(
        cfg.filter((c) => c.category === "alignment_work_type"),
      );
      setWashingOptions(cfg.filter((c) => c.category === "washing_work_type"));
      setThreeMOptions(cfg.filter((c) => c.category === "three_m_work_type"));
      const byDept = {};
      (wiRes.data || []).forEach((item) => {
        if (!byDept[item.department]) byDept[item.department] = [];
        byDept[item.department].push(item);
      });
      setWorkItemsByDept(byDept);
    })();
  }, []);

  const toggleDept = (key) => {
    setDeptConfigs((prev) => {
      if (prev[key]) {
        const u = { ...prev };
        delete u[key];
        return u;
      }
      const dept = DEPT_LIST.find((d) => d.key === key);
      if (dept.type === "work_items")
        return { ...prev, [key]: { key, workItems: [], customWork: [] } };
      if (dept.type === "toggle")
        return { ...prev, [key]: { key, workItems: [], customWork: [] } };
      if (dept.type === "washing")
        return { ...prev, [key]: { key, washingTypes: [], noSlot: false } };
      return prev;
    });
  };

  const toggleWorkItem = (deptKey, item) => {
    setDeptConfigs((prev) => {
      const cfg = { ...prev[deptKey] };
      const list = cfg.workItems || [];
      cfg.workItems = list.includes(item)
        ? list.filter((i) => i !== item)
        : [...list, item];
      return { ...prev, [deptKey]: cfg };
    });
  };

  const toggleWashingType = (item) => {
    setDeptConfigs((prev) => {
      const cfg = { ...prev["washing"] };
      const list = cfg.washingTypes || [];
      cfg.washingTypes = list.includes(item)
        ? list.filter((i) => i !== item)
        : [...list, item];
      return { ...prev, washing: cfg };
    });
  };

  const addCustomWork = (deptKey) => {
    const val = (customInputs[deptKey] || "").trim();
    if (!val) return;
    setDeptConfigs((prev) => {
      const cfg = { ...prev[deptKey] };
      cfg.customWork = [...(cfg.customWork || []), val];
      return { ...prev, [deptKey]: cfg };
    });
    setCustomInputs((prev) => ({ ...prev, [deptKey]: "" }));
  };

  const removeCustomWork = (deptKey, idx) => {
    setDeptConfigs((prev) => {
      const cfg = { ...prev[deptKey] };
      cfg.customWork = (cfg.customWork || []).filter((_, i) => i !== idx);
      return { ...prev, [deptKey]: cfg };
    });
  };

  const save = async () => {
    if (!name.trim()) {
      setErr("Template name is required");
      return;
    }
    if (!serviceType) {
      setErr("Service type is required");
      return;
    }
    const departments = DEPT_LIST.filter((d) => deptConfigs[d.key]).map(
      (d) => deptConfigs[d.key],
    );
    if (departments.length === 0) {
      setErr("Select at least one department");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      if (isEdit) {
        const { error } = await supabase
          .from("service_templates")
          .update({
            name: name.trim(),
            service_type: serviceType,
            departments,
            is_active: isActive,
            sort_order: parseInt(sortOrder) || 99,
            updated_at: new Date().toISOString(),
          })
          .eq("id", template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("service_templates").insert([
          {
            name: name.trim(),
            service_type: serviceType,
            departments,
            is_active: isActive,
            sort_order: parseInt(sortOrder) || 99,
          },
        ]);
        if (error) throw error;
      }
      onSuccess();
    } catch (e) {
      setErr(e.message);
      setLoading(false);
    }
  };

  return (
    <Dlg
      T={T}
      open={true}
      onClose={onClose}
      title={isEdit ? `Edit — ${template.name}` : "New Service Template"}
      width={660}
    >
      {/* Basic info row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Inp
          T={T}
          label="Template Name"
          value={name}
          onChange={setName}
          placeholder="e.g. 1st Free Service"
          required
        />
        <Inp
          T={T}
          label="Sort Order"
          value={sortOrder}
          onChange={setSortOrder}
          type="number"
          placeholder="99"
        />
        <div>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 700,
              color: T.textSecondary,
              marginBottom: 5,
              textTransform: "uppercase",
              letterSpacing: "0.4px",
            }}
          >
            Status
          </label>
          <div
            onClick={() => setIsActive(!isActive)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              padding: "8px 12px",
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              background: isActive ? T.greenLight : T.surfaceElevated,
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                border: `2px solid ${isActive ? T.green : T.border}`,
                background: isActive ? T.green : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {isActive && (
                <span style={{ color: "white", fontSize: 10, fontWeight: 800 }}>
                  ✓
                </span>
              )}
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: isActive ? T.green : T.textMuted,
              }}
            >
              {isActive ? "Active" : "Hidden"}
            </span>
          </div>
        </div>
      </div>

      {/* Service type */}
      <div style={{ marginBottom: 20 }}>
        <label
          style={{
            display: "block",
            fontSize: 11,
            fontWeight: 700,
            color: T.textSecondary,
            marginBottom: 5,
            textTransform: "uppercase",
            letterSpacing: "0.4px",
          }}
        >
          Service Type <span style={{ color: T.red }}>*</span>
        </label>
        <select
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value)}
          style={{
            width: "100%",
            padding: "9px 12px",
            border: `1px solid ${T.border}`,
            borderRadius: 6,
            fontSize: 13,
            color: T.text,
            background: T.surface,
            outline: "none",
            fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          <option value="">Select service type…</option>
          {BOOKING_SVC_TYPES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Departments */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: T.textSecondary,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: 10,
          borderBottom: "2px solid #f59e0b",
          paddingBottom: 6,
        }}
      >
        Departments
      </div>

      {DEPT_LIST.map((dept) => {
        const isOn = !!deptConfigs[dept.key];
        const cfg = deptConfigs[dept.key] || {};
        const options =
          dept.key === "alignment_balancing"
            ? alignmentOptions
            : dept.key === "three_m"
              ? threeMOptions
              : [];
        const deptWorkItems = workItemsByDept[dept.key] || [];
        const totalItems =
          (cfg.workItems?.length || 0) +
          (cfg.customWork?.length || 0) +
          (cfg.washingTypes?.length || 0);

        return (
          <div key={dept.key} style={{ marginBottom: 8 }}>
            {/* Dept toggle header */}
            <div
              onClick={() => toggleDept(dept.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderRadius: isOn ? "8px 8px 0 0" : 8,
                border: `1.5px solid ${isOn ? "#f59e0b" : T.border}`,
                background: isOn ? "#FFFBEB" : T.surface,
                cursor: "pointer",
                userSelect: "none",
                transition: "all 0.12s",
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  border: `2px solid ${isOn ? "#f59e0b" : T.border}`,
                  background: isOn ? "#f59e0b" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {isOn && (
                  <span
                    style={{ color: "white", fontSize: 10, fontWeight: 800 }}
                  >
                    ✓
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: isOn ? "#92400e" : T.text,
                }}
              >
                {dept.label}
              </span>
              {isOn && totalItems > 0 && (
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 11,
                    color: "#92400e",
                    fontWeight: 600,
                  }}
                >
                  {totalItems} item{totalItems !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Dept config panel */}
            {isOn && (
              <div
                style={{
                  border: "1.5px solid #f59e0b",
                  borderTop: "none",
                  borderRadius: "0 0 8px 8px",
                  padding: 14,
                  background: "#FFFBEB",
                }}
              >
                {/* work_items: mechanic/painter/denter/electrician */}
                {dept.type === "work_items" && (
                  <>
                    {/* Already added items — removable tags */}
                    {[...(cfg.workItems || []), ...(cfg.customWork || [])]
                      .length > 0 && (
                      <>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: T.textSecondary,
                            marginBottom: 8,
                            textTransform: "uppercase",
                            letterSpacing: "0.3px",
                          }}
                        >
                          Added to Template
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 6,
                            marginBottom: 12,
                          }}
                        >
                          {(cfg.workItems || []).map((item, idx) => (
                            <div
                              key={`wi-${idx}`}
                              style={{
                                padding: "4px 10px",
                                borderRadius: 20,
                                background: "#f59e0b",
                                border: "1.5px solid #f59e0b",
                                fontSize: 12,
                                fontWeight: 600,
                                color: "white",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              {item}
                              <span
                                onClick={() =>
                                  setDeptConfigs((prev) => {
                                    const c = { ...prev[dept.key] };
                                    c.workItems = (c.workItems || []).filter(
                                      (_, i) => i !== idx,
                                    );
                                    return { ...prev, [dept.key]: c };
                                  })
                                }
                                style={{
                                  cursor: "pointer",
                                  fontWeight: 800,
                                  opacity: 0.8,
                                }}
                              >
                                ✕
                              </span>
                            </div>
                          ))}
                          {(cfg.customWork || []).map((item, idx) => (
                            <div
                              key={`cw-${idx}`}
                              style={{
                                padding: "4px 10px",
                                borderRadius: 20,
                                background: "#E0E7FF",
                                border: "1.5px solid #818CF8",
                                fontSize: 12,
                                fontWeight: 600,
                                color: "#3730A3",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              {item}
                              <span
                                onClick={() => removeCustomWork(dept.key, idx)}
                                style={{
                                  cursor: "pointer",
                                  fontWeight: 800,
                                  color: "#6366F1",
                                }}
                              >
                                ✕
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Unselected predefined items — click to add */}
                    {deptWorkItems.filter(
                      (item) => !(cfg.workItems || []).includes(item.label),
                    ).length > 0 && (
                      <>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: T.textSecondary,
                            marginBottom: 8,
                            textTransform: "uppercase",
                            letterSpacing: "0.3px",
                          }}
                        >
                          Quick Add
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 6,
                            marginBottom: 12,
                          }}
                        >
                          {deptWorkItems
                            .filter(
                              (item) =>
                                !(cfg.workItems || []).includes(item.label),
                            )
                            .map((item) => (
                              <div
                                key={item.id}
                                onClick={() =>
                                  toggleWorkItem(dept.key, item.label)
                                }
                                style={{
                                  padding: "4px 12px",
                                  borderRadius: 20,
                                  cursor: "pointer",
                                  border: `1.5px solid ${T.border}`,
                                  background: T.surface,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: T.textSecondary,
                                  userSelect: "none",
                                  transition: "all 0.1s",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.borderColor = "#f59e0b";
                                  e.currentTarget.style.color = "#92400e";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderColor = T.border;
                                  e.currentTarget.style.color = T.textSecondary;
                                }}
                              >
                                + {item.label}
                              </div>
                            ))}
                        </div>
                      </>
                    )}

                    {/* Custom text input */}
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        value={customInputs[dept.key] || ""}
                        onChange={(e) =>
                          setCustomInputs((prev) => ({
                            ...prev,
                            [dept.key]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustomWork(dept.key);
                          }
                        }}
                        placeholder="Add custom work item…"
                        style={{
                          flex: 1,
                          padding: "7px 10px",
                          border: `1px solid ${T.border}`,
                          borderRadius: 6,
                          fontSize: 13,
                          fontFamily: "inherit",
                          background: T.surface,
                          color: T.text,
                          outline: "none",
                        }}
                      />
                      <Btn
                        T={T}
                        v="secondary"
                        sz="sm"
                        onClick={() => addCustomWork(dept.key)}
                      >
                        + Add
                      </Btn>
                    </div>
                  </>
                )}

                {/* toggle: alignment / 3M */}
                {dept.type === "toggle" && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {options.length === 0 && (
                      <span style={{ fontSize: 12, color: T.textMuted }}>
                        Loading options…
                      </span>
                    )}
                    {options.map((opt) => {
                      const sel = (cfg.workItems || []).includes(opt.key);
                      return (
                        <div
                          key={opt.key}
                          onClick={() => toggleWorkItem(dept.key, opt.key)}
                          style={{
                            padding: "4px 12px",
                            borderRadius: 20,
                            cursor: "pointer",
                            border: `1.5px solid ${sel ? "#f59e0b" : T.border}`,
                            background: sel ? "#f59e0b" : T.surface,
                            fontSize: 12,
                            fontWeight: 600,
                            color: sel ? "white" : T.textSecondary,
                            userSelect: "none",
                          }}
                        >
                          {opt.label}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* washing */}
                {dept.type === "washing" && (
                  <>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: T.textSecondary,
                        marginBottom: 8,
                        textTransform: "uppercase",
                      }}
                    >
                      Washing Types
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        marginBottom: 12,
                      }}
                    >
                      {washingOptions.map((opt) => {
                        const sel = (cfg.washingTypes || []).includes(opt.key);
                        return (
                          <div
                            key={opt.key}
                            onClick={() => toggleWashingType(opt.key)}
                            style={{
                              padding: "4px 12px",
                              borderRadius: 20,
                              cursor: "pointer",
                              border: `1.5px solid ${
                                sel ? "#f59e0b" : T.border
                              }`,
                              background: sel ? "#f59e0b" : T.surface,
                              fontSize: 12,
                              fontWeight: 600,
                              color: sel ? "white" : T.textSecondary,
                              userSelect: "none",
                            }}
                          >
                            {opt.label}
                          </div>
                        );
                      })}
                    </div>
                    <div
                      onClick={() =>
                        setDeptConfigs((prev) => ({
                          ...prev,
                          washing: {
                            ...prev.washing,
                            noSlot: !prev.washing?.noSlot,
                          },
                        }))
                      }
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                        padding: "6px 12px",
                        border: `1px solid ${
                          cfg.noSlot ? "#f59e0b" : T.border
                        }`,
                        borderRadius: 6,
                        background: cfg.noSlot ? "#FFFBEB" : T.surface,
                        userSelect: "none",
                      }}
                    >
                      <div
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 3,
                          border: `2px solid ${
                            cfg.noSlot ? "#f59e0b" : T.border
                          }`,
                          background: cfg.noSlot ? "#f59e0b" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {cfg.noSlot && (
                          <span
                            style={{
                              color: "white",
                              fontSize: 9,
                              fontWeight: 800,
                            }}
                          >
                            ✓
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: cfg.noSlot ? "#92400e" : T.textSecondary,
                        }}
                      >
                        No slot (add to washing queue without a time slot)
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      {err && (
        <div
          style={{
            background: T.redLight,
            color: T.red,
            padding: "9px 12px",
            borderRadius: 6,
            fontSize: 13,
            marginBottom: 12,
            border: `1px solid ${T.red}44`,
            marginTop: 12,
          }}
        >
          {err}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <Btn
          T={T}
          v="secondary"
          onClick={onClose}
          style={{ flex: 1, justifyContent: "center" }}
        >
          Cancel
        </Btn>
        <Btn
          T={T}
          v="primary"
          onClick={save}
          disabled={loading}
          style={{ flex: 2, justifyContent: "center" }}
        >
          {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Template"}
        </Btn>
      </div>
    </Dlg>
  );
}

function PartsCatalogTab({ T }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [category, setCategory] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("parts_catalog")
      .select("*")
      .order("sort_order", { ascending: true });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const addPart = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from("parts_catalog").insert([
      {
        name: name.trim(),
        part_number: partNumber.trim() || null,
        category: category.trim() || null,
        is_active: true,
      },
    ]);
    if (error) {
      alert("Failed to add part: " + error.message);
      return;
    }
    setName("");
    setPartNumber("");
    setCategory("");
    setShowAdd(false);
    load();
  };

  const toggleActive = async (row) => {
    const { error } = await supabase
      .from("parts_catalog")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    if (error) {
      alert("Failed to update part: " + error.message);
      return;
    }
    load();
  };

  if (loading)
    return <div style={{ padding: 20, color: T.textMuted }}>Loading...</div>;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <SecTitle T={T}>Parts Catalog</SecTitle>
        <Btn T={T} v="primary" onClick={() => setShowAdd(!showAdd)}>
          + Add Part
        </Btn>
      </div>
      {showAdd && (
        <Bx T={T} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Part name"
              style={{
                flex: 1,
                minWidth: 160,
                padding: "8px 10px",
                borderRadius: 6,
                border: `1px solid ${T.border}`,
                background: T.surfaceElevated,
                color: T.text,
              }}
            />
            <input
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              placeholder="Part number (optional)"
              style={{
                flex: 1,
                minWidth: 160,
                padding: "8px 10px",
                borderRadius: 6,
                border: `1px solid ${T.border}`,
                background: T.surfaceElevated,
                color: T.text,
              }}
            />
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category (optional)"
              style={{
                flex: 1,
                minWidth: 160,
                padding: "8px 10px",
                borderRadius: 6,
                border: `1px solid ${T.border}`,
                background: T.surfaceElevated,
                color: T.text,
              }}
            />
            <Btn T={T} v="primary" onClick={addPart}>
              Save
            </Btn>
          </div>
        </Bx>
      )}
      <div style={{ display: "grid", gap: 8 }}>
        {rows.map((p) => (
          <Bx
            T={T}
            key={p.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: T.text, fontSize: 13 }}>
                {p.name}
              </div>
              <div style={{ fontSize: 11, color: T.textSecondary }}>
                {p.part_number || "No part #"} · {p.category || "Uncategorized"}
              </div>
            </div>
            <Chip
              color={p.is_active ? T.green : T.textMuted}
              bg={p.is_active ? T.greenLight : T.surfaceElevated}
              style={{ cursor: "pointer" }}
              onClick={() => toggleActive(p)}
            >
              {p.is_active ? "Active" : "Inactive"}
            </Chip>
          </Bx>
        ))}
        {rows.length === 0 && (
          <div style={{ padding: 20, color: T.textMuted, textAlign: "center" }}>
            No parts in catalog yet.
          </div>
        )}
      </div>
    </div>
  );
}

function PartsCatalogPanel({ T }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [category, setCategory] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("parts_catalog")
      .select("*")
      .order("sort_order", { ascending: true });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const addPart = async () => {
    if (!name.trim()) return;
    await supabase.from("parts_catalog").insert([
      {
        name: name.trim(),
        part_number: partNumber.trim() || null,
        category: category.trim() || null,
        is_active: true,
      },
    ]);
    setName("");
    setPartNumber("");
    setCategory("");
    setShowAdd(false);
    load();
  };

  const toggleActive = async (row) => {
    await supabase
      .from("parts_catalog")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    load();
  };

  if (loading)
    return <div style={{ padding: 20, color: T.textMuted }}>Loading...</div>;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <SecTitle T={T}>Parts Catalog</SecTitle>
        <Btn T={T} v="primary" onClick={() => setShowAdd(!showAdd)}>
          + Add Part
        </Btn>
      </div>
      {showAdd && (
        <Bx T={T} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Part name"
              style={{
                flex: 1,
                minWidth: 160,
                padding: "8px 10px",
                borderRadius: 6,
                border: `1px solid ${T.border}`,
                background: T.surfaceElevated,
                color: T.text,
              }}
            />
            <input
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              placeholder="Part number (optional)"
              style={{
                flex: 1,
                minWidth: 160,
                padding: "8px 10px",
                borderRadius: 6,
                border: `1px solid ${T.border}`,
                background: T.surfaceElevated,
                color: T.text,
              }}
            />
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category (optional)"
              style={{
                flex: 1,
                minWidth: 160,
                padding: "8px 10px",
                borderRadius: 6,
                border: `1px solid ${T.border}`,
                background: T.surfaceElevated,
                color: T.text,
              }}
            />
            <Btn T={T} v="primary" onClick={addPart}>
              Save
            </Btn>
          </div>
        </Bx>
      )}
      <div style={{ display: "grid", gap: 8 }}>
        {rows.map((p) => (
          <Bx
            T={T}
            key={p.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: T.text, fontSize: 13 }}>
                {p.name}
              </div>
              <div style={{ fontSize: 11, color: T.textSecondary }}>
                {p.part_number || "No part #"} · {p.category || "Uncategorized"}
              </div>
            </div>
            <Chip
              color={p.is_active ? T.green : T.textMuted}
              bg={p.is_active ? T.greenLight : T.surfaceElevated}
              style={{ cursor: "pointer" }}
              onClick={() => toggleActive(p)}
            >
              {p.is_active ? "Active" : "Inactive"}
            </Chip>
          </Bx>
        ))}
        {rows.length === 0 && (
          <div style={{ padding: 20, color: T.textMuted, textAlign: "center" }}>
            No parts in catalog yet.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CONFIG TAB ───────────────────────────────────────────────────────────────
function ConfigTab({ T }) {
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());

  const toggleGroup = (name) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("config_options")
      .select("*")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });
    setAllRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const g = {};
    allRows.forEach((r) => {
      if (!g[r.category]) g[r.category] = [];
      g[r.category].push(r);
    });
    return g;
  }, [allRows]);

  const categories = useMemo(
    () => [...Object.keys(grouped).sort(), "__parts_catalog__"],
    [grouped],
  );

  useEffect(() => {
    if (!selectedCat && categories.length > 0) setSelectedCat(categories[0]);
  }, [categories, selectedCat]);

  useEffect(() => {
    if (!selectedCat) return;
    const group = CONFIG_GROUPS.find((g) => g.keys.includes(selectedCat));
    if (group) {
      setExpandedGroups((prev) => {
        if (prev.has(group.name)) return prev;
        const next = new Set(prev);
        next.add(group.name);
        return next;
      });
    }
  }, [selectedCat]);

  const currentList = selectedCat ? grouped[selectedCat] || [] : [];
  const isPartsCatalog = selectedCat === "__parts_catalog__";

  // Buckets every sidebar entry (categories + special entries) into CONFIG_GROUPS.
  // Anything not covered by CONFIG_GROUPS (e.g. a brand-new category) falls into "Other"
  // so it's never silently hidden.
  const sidebarGroups = useMemo(() => {
    const allKeys = ["__templates__", ...categories];
    const itemsByGroup = new Map(CONFIG_GROUPS.map((g) => [g.name, []]));
    const other = [];
    allKeys.forEach((key) => {
      const group = CONFIG_GROUPS.find((g) => g.keys.includes(key));
      if (group) itemsByGroup.get(group.name).push(key);
      else other.push(key);
    });
    const result = CONFIG_GROUPS.map((g) => ({
      name: g.name,
      icon: g.icon,
      items: itemsByGroup.get(g.name),
    })).filter((g) => g.items.length > 0);
    if (other.length > 0) result.push({ name: "Other", icon: "📁", items: other });
    return result;
  }, [categories]);

  const renderCategoryItem = (key) => {
    const sel = selectedCat === key;
    const isTemplates = key === "__templates__";
    const isParts = key === "__parts_catalog__";
    const active = (grouped[key] || []).filter((r) => r.is_active).length;
    const total = (grouped[key] || []).length;
    const label = isTemplates
      ? "📋 Service Templates"
      : isParts
        ? "🧰 Parts Catalog"
        : CONFIG_CATEGORY_LABELS[key] || key.replace(/_/g, " ");
    return (
      <div
        key={key}
        onClick={() => setSelectedCat(key)}
        style={{
          padding: "10px 14px",
          cursor: "pointer",
          background: sel ? T.accentBg : "transparent",
          borderLeft: `3px solid ${sel ? "#f59e0b" : "transparent"}`,
          borderBottom: `1px solid ${T.border}`,
        }}
        onMouseEnter={(e) => {
          if (!sel) e.currentTarget.style.background = T.surfaceElevated;
        }}
        onMouseLeave={(e) => {
          if (!sel) e.currentTarget.style.background = "transparent";
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: sel ? "#92400e" : T.text,
          }}
        >
          {label}
        </div>
        {isTemplates ? (
          <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>
            Advisor auto-fill
          </div>
        ) : (
          !isParts && (
            <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>
              {active}/{total} active
            </div>
          )
        )}
      </div>
    );
  };

  const toggleActive = async (row) => {
    await supabase
      .from("config_options")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    load();
  };

  const moveRow = async (row, dir) => {
    const list = grouped[row.category] || [];
    const idx = list.findIndex((r) => r.id === row.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= list.length) return;
    const swap = list[swapIdx];
    await Promise.all([
      supabase
        .from("config_options")
        .update({ sort_order: swap.sort_order })
        .eq("id", row.id),
      supabase
        .from("config_options")
        .update({ sort_order: row.sort_order })
        .eq("id", swap.id),
    ]);
    load();
  };

  if (loading)
    return (
      <div style={{ textAlign: "center", padding: 60, color: T.textMuted }}>
        Loading config...
      </div>
    );

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
      {/* Category sidebar */}
      <div
        style={{
          width: 220,
          flexShrink: 0,
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: T.shadow,
        }}
      >
        <div
          style={{
            padding: "12px 14px",
            borderBottom: `1px solid ${T.border}`,
            fontSize: 10,
            fontWeight: 800,
            color: T.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Categories ({categories.length + 1})
        </div>

        {sidebarGroups.map((group) => {
          const isOpen = expandedGroups.has(group.name);
          return (
            <div key={group.name}>
              <div
                onClick={() => toggleGroup(group.name)}
                style={{
                  padding: "9px 14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: T.surfaceElevated,
                  borderBottom: `1px solid ${T.border}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = T.accentBg;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = T.surfaceElevated;
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.text,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>{group.icon}</span>
                  <span>{group.name}</span>
                  <span style={{ color: T.textMuted, fontWeight: 500 }}>
                    ({group.items.length})
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    color: T.textMuted,
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.15s",
                  }}
                >
                  ▼
                </span>
              </div>
              {isOpen && group.items.map((key) => renderCategoryItem(key))}
            </div>
          );
        })}
      </div>

      {/* Options panel */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {!selectedCat ? (
          <Empty T={T} icon="⚙️" text="Select a category" />
        ) : selectedCat === "__templates__" ? (
          <TemplatesTab T={T} />
        ) : isPartsCatalog ? (
          <PartsCatalogPanel T={T} />
        ) : (
          <div
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              boxShadow: T.shadow,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 18px",
                borderBottom: `2px solid #f59e0b`,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: T.text,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {CONFIG_CATEGORY_LABELS[selectedCat] || selectedCat}
                </div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                  category key:{" "}
                  <span style={{ fontFamily: "'DM Mono',monospace" }}>
                    {selectedCat}
                  </span>
                </div>
              </div>
              <Btn T={T} v="primary" sz="sm" onClick={() => setShowAdd(true)}>
                + Add Option
              </Btn>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {[
                      "Order",
                      "Key",
                      "Label",
                      "Color",
                      "Bg Color",
                      "Active",
                      "Actions",
                    ].map((h) => (
                      <TH key={h} T={T}>
                        {h}
                      </TH>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentList.map((row, idx) => (
                    <tr
                      key={row.id}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = T.surfaceElevated)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <TD T={T}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            onClick={() => moveRow(row, -1)}
                            disabled={idx === 0}
                            style={{
                              background: "none",
                              border: `1px solid ${T.border}`,
                              borderRadius: 4,
                              cursor: idx === 0 ? "not-allowed" : "pointer",
                              padding: "2px 6px",
                              color: idx === 0 ? T.textMuted : T.textSecondary,
                              fontSize: 11,
                              fontFamily: "inherit",
                            }}
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveRow(row, 1)}
                            disabled={idx === currentList.length - 1}
                            style={{
                              background: "none",
                              border: `1px solid ${T.border}`,
                              borderRadius: 4,
                              cursor:
                                idx === currentList.length - 1
                                  ? "not-allowed"
                                  : "pointer",
                              padding: "2px 6px",
                              color:
                                idx === currentList.length - 1
                                  ? T.textMuted
                                  : T.textSecondary,
                              fontSize: 11,
                              fontFamily: "inherit",
                            }}
                          >
                            ↓
                          </button>
                        </div>
                      </TD>
                      <TD T={T}>
                        <span
                          style={{
                            fontFamily: "'DM Mono',monospace",
                            fontSize: 12,
                            color: T.textSecondary,
                          }}
                        >
                          {row.key}
                        </span>
                      </TD>
                      <TD T={T}>
                        <span style={{ fontWeight: 600 }}>{row.label}</span>
                      </TD>
                      <TD T={T}>
                        {row.color ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <div
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: 4,
                                background: row.color,
                                border: `1px solid ${T.border}`,
                                flexShrink: 0,
                              }}
                            />
                            <span
                              style={{
                                fontFamily: "'DM Mono',monospace",
                                fontSize: 11,
                                color: T.textSecondary,
                              }}
                            >
                              {row.color}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: T.textMuted, fontSize: 11 }}>
                            —
                          </span>
                        )}
                      </TD>
                      <TD T={T}>
                        {row.bg_color ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <div
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: 4,
                                background: row.bg_color,
                                border: `1px solid ${T.border}`,
                                flexShrink: 0,
                              }}
                            />
                            <span
                              style={{
                                fontFamily: "'DM Mono',monospace",
                                fontSize: 11,
                                color: T.textSecondary,
                              }}
                            >
                              {row.bg_color}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: T.textMuted, fontSize: 11 }}>
                            —
                          </span>
                        )}
                      </TD>
                      <TD T={T}>
                        <div
                          onClick={() => toggleActive(row)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            cursor: "pointer",
                            padding: "3px 8px",
                            borderRadius: 12,
                            background: row.is_active
                              ? T.greenLight
                              : T.redLight,
                            border: `1px solid ${
                              row.is_active ? T.green + "44" : T.red + "44"
                            }`,
                          }}
                        >
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: row.is_active ? T.green : T.red,
                            }}
                          />
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: row.is_active ? T.green : T.red,
                            }}
                          >
                            {row.is_active ? "Active" : "Hidden"}
                          </span>
                        </div>
                      </TD>
                      <TD T={T}>
                        <Btn
                          T={T}
                          v="ghost"
                          sz="sm"
                          onClick={() => setEditRow(row)}
                        >
                          Edit
                        </Btn>
                      </TD>
                    </tr>
                  ))}
                </tbody>
              </table>
              {currentList.length === 0 && (
                <Empty T={T} icon="📋" text="No options in this category" />
              )}
            </div>
          </div>
        )}
      </div>

      {showAdd && (
        <ConfigOptionDlg
          T={T}
          category={selectedCat}
          onClose={() => setShowAdd(false)}
          onSuccess={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}
      {editRow && (
        <ConfigOptionDlg
          T={T}
          row={editRow}
          category={selectedCat}
          onClose={() => setEditRow(null)}
          onSuccess={() => {
            setEditRow(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ConfigOptionDlg({ T, row, category, onClose, onSuccess }) {
  const isEdit = !!row;
  const [key, setKey] = useState(row?.key || "");
  const [label, setLabel] = useState(row?.label || "");
  const [color, setColor] = useState(row?.color || "");
  const [bgColor, setBgColor] = useState(row?.bg_color || "");
  const [sortOrder, setSortOrder] = useState(
    row?.sort_order?.toString() || "99",
  );
  const [isActive, setIsActive] = useState(row?.is_active ?? true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    if (!label.trim()) {
      setErr("Label is required");
      return;
    }
    if (!isEdit && !key.trim()) {
      setErr("Key is required");
      return;
    }
    if (!isEdit && !/^[a-z0-9_]+$/.test(key.trim())) {
      setErr("Key must be lowercase letters, numbers, and underscores only");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      if (isEdit) {
        const { error } = await supabase
          .from("config_options")
          .update({
            label: label.trim(),
            color: color.trim() || null,
            bg_color: bgColor.trim() || null,
            sort_order: parseInt(sortOrder) || 99,
            is_active: isActive,
          })
          .eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("config_options").insert([
          {
            category,
            key: key.trim(),
            label: label.trim(),
            color: color.trim() || null,
            bg_color: bgColor.trim() || null,
            sort_order: parseInt(sortOrder) || 99,
            is_active: isActive,
          },
        ]);
        if (error) throw error;
      }
      onSuccess();
    } catch (e) {
      setErr(e.message);
      setLoading(false);
    }
  };

  return (
    <Dlg
      T={T}
      open={true}
      onClose={onClose}
      title={
        isEdit
          ? `Edit — ${row.label}`
          : `Add to ${CONFIG_CATEGORY_LABELS[category] || category}`
      }
      width={460}
    >
      {!isEdit ? (
        <Inp
          T={T}
          label="Key (unique, snake_case)"
          value={key}
          onChange={setKey}
          placeholder="e.g. nexon_ev"
          required
        />
      ) : (
        <div
          style={{
            marginBottom: 14,
            padding: "8px 12px",
            background: T.surfaceElevated,
            borderRadius: 6,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: T.textMuted,
              textTransform: "uppercase",
              marginBottom: 3,
            }}
          >
            Key (read-only)
          </div>
          <div
            style={{
              fontFamily: "'DM Mono',monospace",
              fontSize: 13,
              color: T.text,
            }}
          >
            {row.key}
          </div>
        </div>
      )}
      <Inp
        T={T}
        label="Label (display text)"
        value={label}
        onChange={setLabel}
        placeholder="e.g. Nexon EV"
        required
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 700,
              color: T.textSecondary,
              marginBottom: 5,
              textTransform: "uppercase",
              letterSpacing: "0.4px",
            }}
          >
            Color (text)
          </label>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="color"
              value={color || "#6B7280"}
              onChange={(e) => setColor(e.target.value)}
              style={{
                width: 36,
                height: 36,
                padding: 2,
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                cursor: "pointer",
                background: T.surface,
              }}
            />
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#6B7280"
              style={{
                flex: 1,
                padding: "8px 10px",
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                fontSize: 12,
                fontFamily: "'DM Mono',monospace",
                background: T.surface,
                color: T.text,
                outline: "none",
              }}
            />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 700,
              color: T.textSecondary,
              marginBottom: 5,
              textTransform: "uppercase",
              letterSpacing: "0.4px",
            }}
          >
            Bg Color
          </label>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="color"
              value={bgColor || "#F3F4F6"}
              onChange={(e) => setBgColor(e.target.value)}
              style={{
                width: 36,
                height: 36,
                padding: 2,
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                cursor: "pointer",
                background: T.surface,
              }}
            />
            <input
              type="text"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              placeholder="#F3F4F6"
              style={{
                flex: 1,
                padding: "8px 10px",
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                fontSize: 12,
                fontFamily: "'DM Mono',monospace",
                background: T.surface,
                color: T.text,
                outline: "none",
              }}
            />
          </div>
        </div>
      </div>
      {label && (
        <div
          style={{
            marginBottom: 14,
            padding: "8px 12px",
            background: T.surfaceElevated,
            borderRadius: 6,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: T.textMuted,
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Preview
          </div>
          <Chip
            color={color || T.textSecondary}
            bg={bgColor || T.surfaceElevated}
          >
            {label}
          </Chip>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Inp
          T={T}
          label="Sort Order"
          value={sortOrder}
          onChange={setSortOrder}
          type="number"
          placeholder="99"
        />
        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 700,
              color: T.textSecondary,
              marginBottom: 5,
              textTransform: "uppercase",
              letterSpacing: "0.4px",
            }}
          >
            Status
          </label>
          <div
            onClick={() => setIsActive(!isActive)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              padding: "8px 12px",
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              background: isActive ? T.greenLight : T.surfaceElevated,
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                border: `2px solid ${isActive ? T.green : T.border}`,
                background: isActive ? T.green : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {isActive && (
                <span style={{ color: "white", fontSize: 10, fontWeight: 800 }}>
                  ✓
                </span>
              )}
            </div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: isActive ? T.green : T.textMuted,
              }}
            >
              {isActive ? "Active (shows in app)" : "Hidden (not shown)"}
            </span>
          </div>
        </div>
      </div>
      {err && (
        <div
          style={{
            background: T.redLight,
            color: T.red,
            padding: "9px 12px",
            borderRadius: 6,
            fontSize: 13,
            marginBottom: 12,
          }}
        >
          {err}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <Btn
          T={T}
          v="secondary"
          onClick={onClose}
          style={{ flex: 1, justifyContent: "center" }}
        >
          Cancel
        </Btn>
        <Btn
          T={T}
          v="primary"
          onClick={save}
          disabled={loading}
          style={{ flex: 2, justifyContent: "center" }}
        >
          {loading ? "Saving..." : isEdit ? "Save Changes" : "Add Option"}
        </Btn>
      </div>
    </Dlg>
  );
}

// ─── ATTENDANCE TAB ───────────────────────────────────────────────────────────
function AttendanceTab({
  T,
  users,
  attendanceLogs,
  leaveApplications,
  activeToken,
  onRefresh,
}) {
  const [sub, setSub] = useState("board");
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [regenerating, setRegenerating] = useState(false);
  const [histUser, setHistUser] = useState("");
  const [histFrom, setHistFrom] = useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
  );
  const [histTo, setHistTo] = useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
  );
  const [histLogs, setHistLogs] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [reviewModal, setReviewModal] = useState(null);

  // Generate QR from active token
  useEffect(() => {
    if (!activeToken?.token) return;
    QRCode.toDataURL(activeToken.token, {
      width: 400,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    }).then(setQrDataUrl);
  }, [activeToken?.token]);

  const regenerateToken = async () => {
    if (
      !confirm("Regenerate QR code? The old QR will stop working immediately.")
    )
      return;
    setRegenerating(true);
    try {
      // Deactivate all old tokens
      await supabase
        .from("attendance_tokens")
        .update({ is_active: false })
        .eq("is_active", true);
      // Insert new active token
      await supabase.from("attendance_tokens").insert([
        {
          is_active: true,
          token: crypto.randomUUID(), // add this
        },
      ]);
      onRefresh();
    } catch (e) {
      alert("Failed to regenerate: " + e.message);
    } finally {
      setRegenerating(false);
    }
  };

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `sheetal-attendance-qr-${new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })}.png`;
    a.click();
  };

  const printQR = () => {
    if (!qrDataUrl) return;
    const win = window.open("", "_blank");
    win.document.write(`
      <html>
        <head>
          <title>Sheetal Automobiles — Attendance QR</title>
          <style>
            body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; background: #fff; }
            img { width: 320px; height: 320px; }
            h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 8px; }
            p { font-size: 14px; color: #475569; margin-top: 8px; }
            .date { font-size: 12px; color: #94a3b8; margin-top: 4px; }
            @media print { body { -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body onload="window.print()">
          <h1>📷 Sheetal Automobiles</h1>
          <p>Scan to mark attendance</p>
          <img src="${qrDataUrl}" />
          <p class="date">Generated: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
        </body>
      </html>
    `);
    win.document.close();
  };

  // ── Build live board from today's logs ──────────────────────────────────────
  const activeUsers = users.filter((u) => u.is_active && u.role !== "owner");
  const userPunchMap = {};
  attendanceLogs.forEach((log) => {
    const uid = log.user_id;
    if (!userPunchMap[uid]) userPunchMap[uid] = [];
    userPunchMap[uid].push(log);
  });

  const boardRows = activeUsers.map((u) => {
    const punches = userPunchMap[u.id] || [];
    const lastPunch = punches[punches.length - 1] || null;
    const isIn = lastPunch?.type === "in";
    const firstIn = punches.find((p) => p.type === "in");
    const totalMins = (() => {
      let total = 0;
      let lastIn = null;
      for (const p of punches) {
        if (p.type === "in") lastIn = new Date(toZ(p.punch_time));
        else if (p.type === "out" && lastIn) {
          total += (new Date(toZ(p.punch_time)) - lastIn) / 60000;
          lastIn = null;
        }
      }
      if (isIn && lastIn) total += (Date.now() - lastIn) / 60000;
      return Math.round(total);
    })();
    return { ...u, punches, lastPunch, isIn, firstIn, totalMins };
  });

  const presentCount = boardRows.filter((r) => r.punches.length > 0).length;
  const currentlyIn = boardRows.filter((r) => r.isIn).length;
  const pendingLeaves = leaveApplications.filter(
    (l) => l.status === "pending",
  ).length;

  // ── History fetch ────────────────────────────────────────────────────────────
  const fetchHistory = async () => {
    if (!histUser) return;
    setHistLoading(true);
    const { data } = await supabase
      .from("attendance_logs")
      .select("*")
      .eq("user_id", histUser)
      .gte("punch_time", histFrom + "T00:00:00+05:30")
      .lte("punch_time", histTo + "T23:59:59+05:30")
      .order("punch_time", { ascending: true });
    setHistLogs(data || []);
    setHistLoading(false);
  };

  const exportAttendanceCSV = () => {
    if (!histLogs.length) return;
    const rows = [
      ["Date", "Time", "Type", "Location", "Within Range", "QR Verified"],
    ];
    histLogs.forEach((l) => {
      const d = new Date(toZ(l.punch_time));
      rows.push([
        d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
        d.toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour12: true,
        }),
        l.type,
        l.location_source || "—",
        l.within_range ? "Yes" : "No",
        l.qr_verified ? "Yes" : "No",
      ]);
    });
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const userName = users.find((u) => u.id === histUser)?.full_name || "staff";
    a.download = `attendance_${userName}_${histFrom}_to_${histTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Leave review ─────────────────────────────────────────────────────────────
  const ReviewModal = ({ app }) => {
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);

    const decide = async (status) => {
      setLoading(true);
      try {
        await supabase
          .from("leave_applications")
          .update({
            status,
            review_note: note.trim() || null,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", app.id);
        setReviewModal(null);
        onRefresh();
      } catch (e) {
        alert("Failed: " + e.message);
      } finally {
        setLoading(false);
      }
    };

    const typeColors = {
      sick: [T.red, T.redLight],
      casual: [T.blue, T.blueLight],
      personal: [T.purple, T.purpleLight],
    };
    const [tc, tbg] = typeColors[app.leave_type] || [
      T.textMuted,
      T.surfaceElevated,
    ];

    return (
      <Dlg
        T={T}
        open
        title={`Leave Request — ${app.user?.full_name}`}
        onClose={() => setReviewModal(null)}
        width={480}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            marginBottom: 16,
          }}
        >
          {[
            ["Employee", app.user?.full_name || "—"],
            ["Role", app.user?.role || "—"],
            ["From", app.from_date],
            ["To", app.to_date],
            [
              "Days",
              (() => {
                const d =
                  (new Date(app.to_date) - new Date(app.from_date)) / 86400000 +
                  1;
                return `${d} day${d !== 1 ? "s" : ""}`;
              })(),
            ],
            ["Applied", formatIST(app.created_at)],
          ].map(([l, v]) => (
            <div
              key={l}
              style={{
                background: T.surfaceElevated,
                borderRadius: 6,
                padding: "8px 12px",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: T.textMuted,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  marginBottom: 2,
                }}
              >
                {l}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                {v}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 14 }}>
          <Chip color={tc} bg={tbg}>
            {app.leave_type?.toUpperCase()}
          </Chip>
        </div>
        {app.reason && (
          <div
            style={{
              background: T.blueLight,
              border: `1px solid ${T.blue}33`,
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: T.blue,
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Reason
            </div>
            <div style={{ fontSize: 13, color: T.text }}>{app.reason}</div>
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 700,
              color: T.textSecondary,
              marginBottom: 5,
              textTransform: "uppercase",
            }}
          >
            Review Note (Optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note for the employee..."
            rows={2}
            style={{
              width: "100%",
              padding: "9px 12px",
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              fontSize: 13,
              color: T.text,
              background: T.surface,
              fontFamily: "inherit",
              resize: "vertical",
              boxSizing: "border-box",
              outline: "none",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn
            T={T}
            v="secondary"
            onClick={() => setReviewModal(null)}
            style={{ flex: 1, justifyContent: "center" }}
          >
            Cancel
          </Btn>
          <Btn
            T={T}
            v="danger"
            onClick={() => decide("rejected")}
            disabled={loading}
            style={{ flex: 1, justifyContent: "center" }}
          >
            ✕ Reject
          </Btn>
          <Btn
            T={T}
            v="success"
            onClick={() => decide("approved")}
            disabled={loading}
            style={{ flex: 2, justifyContent: "center" }}
          >
            ✓ Approve
          </Btn>
        </div>
      </Dlg>
    );
  };

  return (
    <div>
      {/* ── QR Section ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 20,
          marginBottom: 24,
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 10,
          padding: 20,
          boxShadow: T.shadow,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Attendance QR"
              style={{
                width: 180,
                height: 180,
                borderRadius: 8,
                border: `1px solid ${T.border}`,
              }}
            />
          ) : (
            <div
              style={{
                width: 180,
                height: 180,
                background: T.surfaceElevated,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `1px solid ${T.border}`,
              }}
            >
              <span style={{ fontSize: 13, color: T.textMuted }}>
                No active QR
              </span>
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <Btn
              T={T}
              v="secondary"
              sz="sm"
              onClick={downloadQR}
              disabled={!qrDataUrl}
            >
              ⬇️ Download
            </Btn>
            <Btn
              T={T}
              v="secondary"
              sz="sm"
              onClick={printQR}
              disabled={!qrDataUrl}
            >
              🖨️ Print
            </Btn>
          </div>
          <Btn
            T={T}
            v="danger"
            sz="sm"
            onClick={regenerateToken}
            disabled={regenerating}
          >
            {regenerating ? "Regenerating..." : "🔄 Regenerate QR"}
          </Btn>
          {activeToken && (
            <div
              style={{ fontSize: 10, color: T.textMuted, textAlign: "center" }}
            >
              Active since
              <br />
              {formatIST(activeToken.created_at)}
            </div>
          )}
        </div>
        <div>
          <SecTitle T={T}>📷 Attendance QR</SecTitle>
          <p
            style={{
              fontSize: 13,
              color: T.textSecondary,
              marginBottom: 16,
              lineHeight: 1.6,
            }}
          >
            Print this QR and post it at the workshop entrance. Workers scan it
            from the 📷 Attendance button in their dashboard to mark in/out. GPS
            verifies they are within 100m of the workshop.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
            }}
          >
            {[
              {
                label: "Present Today",
                value: presentCount,
                color: T.green,
                icon: "✅",
              },
              {
                label: "Currently In",
                value: currentlyIn,
                color: T.blue,
                icon: "🟢",
              },
              {
                label: "Absent Today",
                value: activeUsers.length - presentCount,
                color: T.red,
                icon: "❌",
              },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: s.color + "18",
                  border: `1px solid ${s.color}44`,
                  borderRadius: 8,
                  padding: "12px 14px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: s.color,
                    fontFamily: "'DM Mono',monospace",
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: s.color,
                    fontWeight: 700,
                    marginTop: 3,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sub tabs ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {[
          ["board", "📋 Live Board"],
          [
            "leave",
            `🏖️ Leave Approvals${pendingLeaves > 0 ? ` (${pendingLeaves})` : ""}`,
          ],
          ["history", "📅 History & Export"],
        ].map(([k, l]) => (
          <Btn
            key={k}
            T={T}
            v={sub === k ? "primary" : "secondary"}
            onClick={() => setSub(k)}
          >
            {l}
          </Btn>
        ))}
      </div>

      {/* ── Live Board ── */}
      {sub === "board" && (
        <Bx T={T}>
          <SecTitle T={T}>
            Today's Attendance —{" "}
            {new Date().toLocaleDateString("en-IN", {
              timeZone: "Asia/Kolkata",
              weekday: "long",
              day: "2-digit",
              month: "long",
            })}
          </SecTitle>
          {boardRows.length === 0 ? (
            <Empty T={T} icon="👥" text="No active staff" />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {[
                      "Staff",
                      "Role",
                      "Status",
                      "First In",
                      "Last Punch",
                      "Hours Today",
                      "Punches",
                      "GPS",
                    ].map((h) => (
                      <TH key={h} T={T}>
                        {h}
                      </TH>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {boardRows
                    .sort((a, b) => {
                      if (a.isIn && !b.isIn) return -1;
                      if (!a.isIn && b.isIn) return 1;
                      if (a.punches.length && !b.punches.length) return -1;
                      if (!a.punches.length && b.punches.length) return 1;
                      return (a.full_name || "").localeCompare(
                        b.full_name || "",
                      );
                    })
                    .map((row) => {
                      const statusColor = row.isIn
                        ? T.green
                        : row.punches.length > 0
                          ? T.amber
                          : T.red;
                      const statusBg = row.isIn
                        ? T.greenLight
                        : row.punches.length > 0
                          ? T.amberLight
                          : T.redLight;
                      const statusLabel = row.isIn
                        ? "In Workshop"
                        : row.punches.length > 0
                          ? "Left"
                          : "Absent";
                      const hrs = Math.floor(row.totalMins / 60);
                      const mins = row.totalMins % 60;
                      const hoursStr =
                        row.totalMins > 0 ? `${hrs}h ${mins}m` : "—";
                      const lastGPS = row.lastPunch?.within_range;
                      return (
                        <tr
                          key={row.id}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              T.surfaceElevated)
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <TD T={T}>
                            <span style={{ fontWeight: 700 }}>
                              {row.full_name}
                            </span>
                          </TD>
                          <TD T={T}>
                            <Chip color={T.blue} bg={T.blueLight}>
                              {ROLE_LABELS[row.role] || row.role}
                            </Chip>
                          </TD>
                          <TD T={T}>
                            <Chip color={statusColor} bg={statusBg}>
                              {statusLabel}
                            </Chip>
                          </TD>
                          <TD
                            T={T}
                            style={{ color: T.textSecondary, fontSize: 12 }}
                          >
                            {row.firstIn
                              ? formatIST(row.firstIn.punch_time)
                              : "—"}
                          </TD>
                          <TD
                            T={T}
                            style={{ color: T.textSecondary, fontSize: 12 }}
                          >
                            {row.lastPunch
                              ? formatIST(row.lastPunch.punch_time)
                              : "—"}
                          </TD>
                          <TD T={T}>
                            <span
                              style={{
                                fontFamily: "'DM Mono',monospace",
                                fontWeight: 700,
                                color:
                                  row.totalMins > 0 ? T.green : T.textMuted,
                              }}
                            >
                              {hoursStr}
                            </span>
                          </TD>
                          <TD
                            T={T}
                            style={{ color: T.textMuted, fontSize: 12 }}
                          >
                            {row.punches.length}
                          </TD>
                          <TD T={T}>
                            {row.lastPunch ? (
                              <Chip
                                color={lastGPS ? T.green : T.amber}
                                bg={lastGPS ? T.greenLight : T.amberLight}
                              >
                                {lastGPS ? "✅ In Range" : "⚠️ Out of Range"}
                              </Chip>
                            ) : (
                              <span style={{ color: T.textMuted }}>—</span>
                            )}
                          </TD>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </Bx>
      )}

      {/* ── Leave Approvals ── */}
      {sub === "leave" && (
        <div>
          {/* Pending */}
          <div style={{ marginBottom: 24 }}>
            <SecTitle T={T}>⏳ Pending Approvals ({pendingLeaves})</SecTitle>
            {leaveApplications.filter((l) => l.status === "pending").length ===
            0 ? (
              <Empty T={T} icon="✅" text="No pending leave requests" />
            ) : (
              leaveApplications
                .filter((l) => l.status === "pending")
                .map((app) => {
                  const days =
                    (new Date(app.to_date) - new Date(app.from_date)) /
                      86400000 +
                    1;
                  const typeColors = {
                    sick: [T.red, T.redLight],
                    casual: [T.blue, T.blueLight],
                    personal: [T.purple, T.purpleLight],
                  };
                  const [tc, tbg] = typeColors[app.leave_type] || [
                    T.textMuted,
                    T.surfaceElevated,
                  ];
                  return (
                    <div
                      key={app.id}
                      style={{
                        background: T.surface,
                        border: `1px solid ${T.border}`,
                        borderRadius: 10,
                        padding: "14px 18px",
                        marginBottom: 10,
                        boxShadow: T.shadow,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 6,
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 800,
                              fontSize: 14,
                              color: T.text,
                            }}
                          >
                            {app.user?.full_name}
                          </span>
                          <Chip color={T.blue} bg={T.blueLight}>
                            {ROLE_LABELS[app.user?.role] || app.user?.role}
                          </Chip>
                          <Chip color={tc} bg={tbg}>
                            {app.leave_type?.toUpperCase()}
                          </Chip>
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: T.textSecondary,
                            marginBottom: 4,
                          }}
                        >
                          📅 {app.from_date} → {app.to_date} · {days} day
                          {days !== 1 ? "s" : ""}
                        </div>
                        {app.reason && (
                          <div
                            style={{
                              fontSize: 12,
                              color: T.textMuted,
                              fontStyle: "italic",
                            }}
                          >
                            "{app.reason}"
                          </div>
                        )}
                        <div
                          style={{
                            fontSize: 11,
                            color: T.textMuted,
                            marginTop: 4,
                          }}
                        >
                          Applied {formatIST(app.created_at)}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexShrink: 0,
                          marginLeft: 16,
                        }}
                      >
                        <Btn
                          T={T}
                          v="ghost"
                          sz="sm"
                          onClick={() => setReviewModal(app)}
                        >
                          Review
                        </Btn>
                        <Btn
                          T={T}
                          v="danger"
                          sz="sm"
                          onClick={async () => {
                            await supabase
                              .from("leave_applications")
                              .update({
                                status: "rejected",
                                reviewed_at: new Date().toISOString(),
                              })
                              .eq("id", app.id);
                            onRefresh();
                          }}
                        >
                          ✕ Reject
                        </Btn>
                        <Btn
                          T={T}
                          v="success"
                          sz="sm"
                          onClick={async () => {
                            await supabase
                              .from("leave_applications")
                              .update({
                                status: "approved",
                                reviewed_at: new Date().toISOString(),
                              })
                              .eq("id", app.id);
                            onRefresh();
                          }}
                        >
                          ✓ Approve
                        </Btn>
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          {/* History of decisions */}
          <div>
            <SecTitle T={T}>📋 All Leave Applications</SecTitle>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {[
                      "Employee",
                      "Type",
                      "From",
                      "To",
                      "Days",
                      "Reason",
                      "Status",
                      "Review Note",
                      "Applied",
                    ].map((h) => (
                      <TH key={h} T={T}>
                        {h}
                      </TH>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaveApplications.map((app) => {
                    const days =
                      (new Date(app.to_date) - new Date(app.from_date)) /
                        86400000 +
                      1;
                    const statusMap = {
                      pending: [T.amber, T.amberLight],
                      approved: [T.green, T.greenLight],
                      rejected: [T.red, T.redLight],
                    };
                    const [sc, sbg] = statusMap[app.status] || [
                      T.textMuted,
                      T.surfaceElevated,
                    ];
                    const typeColors = {
                      sick: [T.red, T.redLight],
                      casual: [T.blue, T.blueLight],
                      personal: [T.purple, T.purpleLight],
                    };
                    const [tc, tbg] = typeColors[app.leave_type] || [
                      T.textMuted,
                      T.surfaceElevated,
                    ];
                    return (
                      <tr
                        key={app.id}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = T.surfaceElevated)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <TD T={T}>
                          <span style={{ fontWeight: 700 }}>
                            {app.user?.full_name}
                          </span>
                        </TD>
                        <TD T={T}>
                          <Chip color={tc} bg={tbg}>
                            {app.leave_type}
                          </Chip>
                        </TD>
                        <TD
                          T={T}
                          style={{ fontSize: 12, color: T.textSecondary }}
                        >
                          {app.from_date}
                        </TD>
                        <TD
                          T={T}
                          style={{ fontSize: 12, color: T.textSecondary }}
                        >
                          {app.to_date}
                        </TD>
                        <TD T={T} style={{ fontFamily: "'DM Mono',monospace" }}>
                          {days}
                        </TD>
                        <TD
                          T={T}
                          style={{
                            fontSize: 12,
                            color: T.textMuted,
                            maxWidth: 180,
                          }}
                        >
                          {app.reason || "—"}
                        </TD>
                        <TD T={T}>
                          <Chip color={sc} bg={sbg}>
                            {app.status}
                          </Chip>
                        </TD>
                        <TD T={T} style={{ fontSize: 12, color: T.textMuted }}>
                          {app.review_note || "—"}
                        </TD>
                        <TD T={T} style={{ fontSize: 11, color: T.textMuted }}>
                          {formatIST(app.created_at)}
                        </TD>
                      </tr>
                    );
                  })}
                  {leaveApplications.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        style={{
                          textAlign: "center",
                          padding: 32,
                          color: T.textMuted,
                        }}
                      >
                        No leave applications yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── History & Export ── */}
      {sub === "history" && (
        <div>
          <Bx T={T} style={{ marginBottom: 20 }}>
            <SecTitle T={T}>Search Attendance History</SecTitle>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 150px 150px auto auto",
                gap: 12,
                alignItems: "flex-end",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.textSecondary,
                    marginBottom: 5,
                    textTransform: "uppercase",
                  }}
                >
                  Staff Member
                </label>
                <select
                  value={histUser}
                  onChange={(e) => setHistUser(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: `1px solid ${T.border}`,
                    borderRadius: 6,
                    fontSize: 14,
                    color: T.text,
                    background: T.surface,
                    outline: "none",
                    fontFamily: "inherit",
                    cursor: "pointer",
                  }}
                >
                  <option value="">Select staff member…</option>
                  {users
                    .filter((u) => u.is_active && u.role !== "owner")
                    .sort((a, b) =>
                      (a.full_name || "").localeCompare(b.full_name || ""),
                    )
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({ROLE_LABELS[u.role] || u.role})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.textSecondary,
                    marginBottom: 5,
                    textTransform: "uppercase",
                  }}
                >
                  From
                </label>
                <input
                  type="date"
                  value={histFrom}
                  onChange={(e) => setHistFrom(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 10px",
                    border: `1px solid ${T.border}`,
                    borderRadius: 6,
                    fontSize: 13,
                    background: T.surface,
                    color: T.text,
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.textSecondary,
                    marginBottom: 5,
                    textTransform: "uppercase",
                  }}
                >
                  To
                </label>
                <input
                  type="date"
                  value={histTo}
                  onChange={(e) => setHistTo(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 10px",
                    border: `1px solid ${T.border}`,
                    borderRadius: 6,
                    fontSize: 13,
                    background: T.surface,
                    color: T.text,
                  }}
                />
              </div>
              <Btn
                T={T}
                v="primary"
                onClick={fetchHistory}
                disabled={!histUser || histLoading}
              >
                {histLoading ? "Loading..." : "Search"}
              </Btn>
              <Btn
                T={T}
                v="secondary"
                onClick={exportAttendanceCSV}
                disabled={!histLogs.length}
              >
                ⬇️ Export CSV
              </Btn>
            </div>
          </Bx>

          {histLogs.length > 0 &&
            (() => {
              // Calculate daily summary
              const dayMap = {};
              histLogs.forEach((l) => {
                const d = new Date(toZ(l.punch_time)).toLocaleDateString(
                  "en-CA",
                  { timeZone: "Asia/Kolkata" },
                );
                if (!dayMap[d]) dayMap[d] = { punches: [], totalMins: 0 };
                dayMap[d].punches.push(l);
              });
              Object.values(dayMap).forEach((day) => {
                let lastIn = null;
                day.punches.forEach((p) => {
                  if (p.type === "in") lastIn = new Date(toZ(p.punch_time));
                  else if (p.type === "out" && lastIn) {
                    day.totalMins +=
                      (new Date(toZ(p.punch_time)) - lastIn) / 60000;
                    lastIn = null;
                  }
                });
              });
              const totalDays = Object.keys(dayMap).length;
              const totalMinsAll = Object.values(dayMap).reduce(
                (s, d) => s + d.totalMins,
                0,
              );
              const avgMins = totalDays > 0 ? totalMinsAll / totalDays : 0;

              return (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 12,
                      marginBottom: 20,
                    }}
                  >
                    {[
                      {
                        label: "Days Present",
                        value: totalDays,
                        color: T.green,
                      },
                      {
                        label: "Total Hours",
                        value: `${Math.floor(totalMinsAll / 60)}h ${Math.round(totalMinsAll % 60)}m`,
                        color: T.blue,
                      },
                      {
                        label: "Avg Hours/Day",
                        value: `${Math.floor(avgMins / 60)}h ${Math.round(avgMins % 60)}m`,
                        color: T.purple,
                      },
                    ].map((s) => (
                      <div
                        key={s.label}
                        style={{
                          background: T.surface,
                          border: `1px solid ${T.border}`,
                          borderRadius: 10,
                          padding: "14px 16px",
                          boxShadow: T.shadow,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: T.textMuted,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            marginBottom: 5,
                          }}
                        >
                          {s.label}
                        </div>
                        <div
                          style={{
                            fontSize: 26,
                            fontWeight: 800,
                            color: s.color,
                            fontFamily: "'DM Mono',monospace",
                          }}
                        >
                          {s.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Bx T={T}>
                    <SecTitle T={T}>
                      Punch Log ({histLogs.length} records)
                    </SecTitle>
                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{ width: "100%", borderCollapse: "collapse" }}
                      >
                        <thead>
                          <tr>
                            {[
                              "Date",
                              "Time",
                              "Type",
                              "Location Source",
                              "Within Range",
                              "QR Verified",
                            ].map((h) => (
                              <TH key={h} T={T}>
                                {h}
                              </TH>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {histLogs.map((l, idx) => {
                            const d = new Date(toZ(l.punch_time));
                            const isIn = l.type === "in";
                            return (
                              <tr
                                key={l.id}
                                style={{
                                  background:
                                    idx % 2 === 0
                                      ? "transparent"
                                      : T.surfaceElevated,
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.background = T.border)
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.background =
                                    idx % 2 === 0
                                      ? "transparent"
                                      : T.surfaceElevated)
                                }
                              >
                                <TD
                                  T={T}
                                  style={{
                                    color: T.textSecondary,
                                    fontSize: 12,
                                  }}
                                >
                                  {d.toLocaleDateString("en-IN", {
                                    timeZone: "Asia/Kolkata",
                                    weekday: "short",
                                    day: "2-digit",
                                    month: "short",
                                  })}
                                </TD>
                                <TD
                                  T={T}
                                  style={{
                                    fontFamily: "'DM Mono',monospace",
                                    fontSize: 13,
                                  }}
                                >
                                  {d.toLocaleTimeString("en-IN", {
                                    timeZone: "Asia/Kolkata",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                  })}
                                </TD>
                                <TD T={T}>
                                  <Chip
                                    color={isIn ? T.green : T.amber}
                                    bg={isIn ? T.greenLight : T.amberLight}
                                  >
                                    {isIn ? "🟢 In" : "🔴 Out"}
                                  </Chip>
                                </TD>
                                <TD
                                  T={T}
                                  style={{
                                    fontSize: 12,
                                    color: T.textSecondary,
                                  }}
                                >
                                  {l.location_source || "—"}
                                </TD>
                                <TD T={T}>
                                  <Chip
                                    color={l.within_range ? T.green : T.red}
                                    bg={
                                      l.within_range ? T.greenLight : T.redLight
                                    }
                                  >
                                    {l.within_range ? "✅ Yes" : "❌ No"}
                                  </Chip>
                                </TD>
                                <TD T={T}>
                                  <Chip
                                    color={l.qr_verified ? T.green : T.amber}
                                    bg={
                                      l.qr_verified
                                        ? T.greenLight
                                        : T.amberLight
                                    }
                                  >
                                    {l.qr_verified ? "✅ Yes" : "⚠️ No"}
                                  </Chip>
                                </TD>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Bx>
                </>
              );
            })()}

          {histLogs.length === 0 && histUser && !histLoading && (
            <Empty
              T={T}
              icon="📅"
              text="No attendance records found for this range"
            />
          )}
          {!histUser && (
            <Empty
              T={T}
              icon="👤"
              text="Select a staff member to view history"
            />
          )}
        </div>
      )}

      {reviewModal && <ReviewModal app={reviewModal} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CallingTab — Owner view of telecalling logs
// Drop into owner_v2.js as a component, then wire up in OwnerDashboard.
//
// INTEGRATION STEPS (4 changes in owner_v2.js):
//
// 1. In fetchAll(), add to the Promise.all array:
//      supabase
//        .from("call_logs")
//        .select("*, caller:users!call_logs_called_by_fkey(full_name, role)")
//        .order("called_at", { ascending: false })
//        .limit(500),
//    Add result variable: clRes
//    Add state setter: setCallLogs(clRes.data || []);
//    Add useState: const [callLogs, setCallLogs] = useState([]);
//
// 2. In TABS array, add:
//      { key: "calling", icon: "📲", label: "Calling", alert: null },
//
// 3. In the tab render section, add:
//      {tab === "calling" && (
//        <CallingTab T={T} callLogs={callLogs} users={users} />
//      )}
//
// 4. In the realtime channel, add:
//      .on("postgres_changes",
//        { event: "INSERT", schema: "public", table: "call_logs" },
//        () => fetchAll(false),
//      )
// ─────────────────────────────────────────────────────────────────────────────

// ─── CALL STATUS COLOURS ─────────────────────────────────────────────────────
const CALL_STATUS_COLORS = {
  answered: { color: "#065F46", bg: "#D1FAE5", border: "#6EE7B7" },
  not_answered: { color: "#92400E", bg: "#FEF3C7", border: "#FDE68A" },
  not_reachable: { color: "#1E40AF", bg: "#DBEAFE", border: "#BFDBFE" },
  wrong_number: { color: "#991B1B", bg: "#FEE2E2", border: "#FECACA" },
  number_busy: { color: "#6B21A8", bg: "#F3E8FF", border: "#D8B4FE" },
  switched_off: { color: "#374151", bg: "#F3F4F6", border: "#E5E7EB" },
};

function CallingTab({ T, callLogs, users }) {
  const todayIST = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });

  // ── Filters ───────────────────────────────────────────────────────────────
  const [preset, setPreset] = useState("7days"); // changed from "today"
  const [customFrom, setCustomFrom] = useState(todayIST);
  const [customTo, setCustomTo] = useState(todayIST);
  const [callerFilter, setCallerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // ── Config labels (loaded once) ───────────────────────────────────────────
  const [callStatuses, setCallStatuses] = useState([]);
  const [callReasons, setCallReasons] = useState([]);

  useEffect(() => {
    Promise.all([
      supabase
        .from("config_options")
        .select("key,label")
        .eq("category", "call_status")
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("config_options")
        .select("key,label")
        .eq("category", "call_reason")
        .eq("is_active", true)
        .order("sort_order"),
    ]).then(([sr, rr]) => {
      setCallStatuses(sr.data || []);
      setCallReasons(rr.data || []);
    });
  }, []);

  const statusLabel = (key) =>
    callStatuses.find((s) => s.key === key)?.label || key || "—";
  const reasonLabel = (key) =>
    callReasons.find((r) => r.key === key)?.label || key || "—";
  const statusColors = (key) =>
    CALL_STATUS_COLORS[key] || {
      color: T.textMuted,
      bg: T.surfaceElevated,
      border: T.border,
    };

  // ── Date window ───────────────────────────────────────────────────────────
  const { fromDate, toDate } = useMemo(() => {
    if (preset === "all") return { fromDate: "", toDate: "" }; // added
    if (preset === "today") return { fromDate: todayIST, toDate: todayIST };
    if (preset === "7days") {
      const d = new Date(Date.now() - 6 * 86400000);
      return {
        fromDate: d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
        toDate: todayIST,
      };
    }
    if (preset === "30days") {
      const d = new Date(Date.now() - 29 * 86400000);
      return {
        fromDate: d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
        toDate: todayIST,
      };
    }
    return { fromDate: customFrom, toDate: customTo };
  }, [preset, customFrom, customTo, todayIST]);

  // ── Filter logs ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return callLogs.filter((l) => {
      const logDate = (l.called_at || "").substring(0, 10);
      if (fromDate && logDate < fromDate) return false; // guarded
      if (toDate && logDate > toDate) return false; // guarded
      if (callerFilter !== "all" && l.called_by !== callerFilter) return false;
      if (statusFilter !== "all" && l.call_status !== statusFilter)
        return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          (l.vehicle_number || "").toLowerCase().includes(q) ||
          (l.customer_name || "").toLowerCase().includes(q) ||
          (l.customer_phone || "").includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [callLogs, fromDate, toDate, callerFilter, statusFilter, search]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalCalls = filtered.length;
  const answered = filtered.filter((l) => l.call_status === "answered").length;
  const notAnswered = filtered.filter(
    (l) => l.call_status !== "answered",
  ).length;
  const answerRate =
    totalCalls > 0 ? Math.round((answered / totalCalls) * 100) : 0;

  // ── Per-caller breakdown ──────────────────────────────────────────────────
  const callerStats = useMemo(() => {
    const map = {};
    filtered.forEach((l) => {
      const id = l.called_by || "unknown";
      const name = l.caller?.full_name || "Unknown";
      if (!map[id]) map[id] = { id, name, total: 0, answered: 0, reasons: {} };
      map[id].total++;
      if (l.call_status === "answered") map[id].answered++;
      if (l.reason_key)
        map[id].reasons[l.reason_key] =
          (map[id].reasons[l.reason_key] || 0) + 1;
    });
    return Object.values(map)
      .map((s) => ({
        ...s,
        notAnswered: s.total - s.answered,
        rate: s.total > 0 ? Math.round((s.answered / s.total) * 100) : 0,
        topReason:
          Object.entries(s.reasons).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  // ── Receptionist users for filter ─────────────────────────────────────────
  const receptionists = useMemo(
    () => users.filter((u) => u.role === "receptionist" && u.is_active),
    [users],
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Date range selector ── */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {[
          ["all", "All Time"], // added
          ["today", "Today"],
          ["7days", "7 Days"],
          ["30days", "30 Days"],
          ["custom", "Custom"],
        ].map(([k, l]) => (
          <Btn
            key={k}
            T={T}
            v={preset === k ? "primary" : "secondary"}
            onClick={() => setPreset(k)}
          >
            {l}
          </Btn>
        ))}
        {preset === "custom" && (
          <>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              style={{
                padding: "7px 10px",
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                fontSize: 13,
                background: T.surface,
                color: T.text,
              }}
            />
            <span style={{ color: T.textMuted }}>→</span>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              onChange={(e) => setCustomTo(e.target.value)}
              style={{
                padding: "7px 10px",
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                fontSize: 13,
                background: T.surface,
                color: T.text,
              }}
            />
          </>
        )}
        {/* updated date label */}
        <span style={{ fontSize: 11, color: T.textMuted, marginLeft: 4 }}>
          {preset === "all"
            ? "📅 All time"
            : `📅 ${fromDate === toDate ? fromDate : `${fromDate} → ${toDate}`}`}
        </span>
      </div>

      {/* ── KPI strip ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <KPI
          T={T}
          label="Total Calls"
          value={totalCalls}
          icon="📲"
          color={T.blue}
        />
        <KPI
          T={T}
          label="Answered"
          value={answered}
          icon="✅"
          color={T.green}
        />
        <KPI
          T={T}
          label="Not Answered"
          value={notAnswered}
          icon="📵"
          color={T.amber}
        />
        <KPI
          T={T}
          label="Answer Rate"
          value={`${answerRate}%`}
          icon="📊"
          color={
            answerRate >= 70 ? T.green : answerRate >= 40 ? T.amber : T.red
          }
        />
      </div>

      {/* ── Per-caller breakdown ── */}
      {callerStats.length > 0 && (
        <Bx T={T} style={{ marginBottom: 20 }}>
          <SecTitle T={T}>Per-Caller Breakdown</SecTitle>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {[
                    "Receptionist",
                    "Calls Made",
                    "Answered",
                    "Not Answered",
                    "Answer Rate",
                    "Top Reason",
                  ].map((h) => (
                    <TH key={h} T={T}>
                      {h}
                    </TH>
                  ))}
                </tr>
              </thead>
              <tbody>
                {callerStats.map((s) => (
                  <tr
                    key={s.id}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = T.surfaceElevated)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <TD T={T}>
                      <span style={{ fontWeight: 700 }}>{s.name}</span>
                    </TD>
                    <TD T={T}>
                      <span
                        style={{
                          fontFamily: "'DM Mono',monospace",
                          fontWeight: 800,
                          color: T.blue,
                        }}
                      >
                        {s.total}
                      </span>
                    </TD>
                    <TD T={T}>
                      <span
                        style={{
                          fontFamily: "'DM Mono',monospace",
                          color: T.green,
                          fontWeight: 700,
                        }}
                      >
                        {s.answered}
                      </span>
                    </TD>
                    <TD T={T}>
                      <span
                        style={{
                          fontFamily: "'DM Mono',monospace",
                          color: T.amber,
                          fontWeight: 700,
                        }}
                      >
                        {s.notAnswered}
                      </span>
                    </TD>
                    <TD T={T}>
                      <Chip
                        color={
                          s.rate >= 70
                            ? T.green
                            : s.rate >= 40
                              ? T.amber
                              : T.red
                        }
                        bg={
                          s.rate >= 70
                            ? T.greenLight
                            : s.rate >= 40
                              ? T.amberLight
                              : T.redLight
                        }
                      >
                        {s.rate}%
                      </Chip>
                    </TD>
                    <TD T={T} style={{ color: T.textSecondary, fontSize: 12 }}>
                      {s.topReason ? reasonLabel(s.topReason) : "—"}
                    </TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Bx>
      )}

      {/* ── Filters row ── */}
      <Bx T={T} style={{ marginBottom: 14 }}>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 200px" }}>
            <span
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 13,
                color: T.textMuted,
              }}
            >
              🔍
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vehicle, customer, phone…"
              style={{
                width: "100%",
                padding: "8px 10px 8px 30px",
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                fontSize: 13,
                fontFamily: "inherit",
                background: T.surface,
                color: T.text,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Caller filter */}
          <select
            value={callerFilter}
            onChange={(e) => setCallerFilter(e.target.value)}
            style={{
              padding: "8px 10px",
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              fontSize: 13,
              fontFamily: "inherit",
              background: T.surface,
              color: T.text,
              cursor: "pointer",
            }}
          >
            <option value="all">All Callers</option>
            {receptionists.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "8px 10px",
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              fontSize: 13,
              fontFamily: "inherit",
              background: T.surface,
              color: T.text,
              cursor: "pointer",
            }}
          >
            <option value="all">All Statuses</option>
            {callStatuses.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>

          {(search || callerFilter !== "all" || statusFilter !== "all") && (
            <Btn
              T={T}
              v="ghost"
              onClick={() => {
                setSearch("");
                setCallerFilter("all");
                setStatusFilter("all");
              }}
              style={{ color: T.red }}
            >
              ✕ Clear
            </Btn>
          )}

          <span
            style={{
              fontSize: 12,
              color: T.textMuted,
              marginLeft: "auto",
              fontWeight: 600,
            }}
          >
            {filtered.length} call{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </Bx>

      {/* ── Log list ── */}
      {filtered.length === 0 ? (
        <Empty T={T} icon="📲" text="No calls found" />
      ) : (
        <Bx T={T}>
          <div style={{ overflowX: "auto", maxHeight: 560, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {[
                    "Vehicle",
                    "Customer",
                    "Phone",
                    "Status",
                    "Reason",
                    "Notes",
                    "Called By",
                    "Time",
                  ].map((h) => (
                    <TH key={h} T={T}>
                      {h}
                    </TH>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => {
                  const sc = statusColors(l.call_status);
                  return (
                    <tr
                      key={l.id}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = T.surfaceElevated)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <TD T={T}>
                        <span
                          style={{
                            fontWeight: 800,
                            fontFamily: "'DM Mono',monospace",
                            color: T.text,
                            letterSpacing: "0.5px",
                          }}
                        >
                          {l.vehicle_number || "—"}
                        </span>
                      </TD>
                      <TD T={T} style={{ fontWeight: 600 }}>
                        {l.customer_name || "—"}
                      </TD>
                      <TD
                        T={T}
                        style={{
                          fontFamily: "'DM Mono',monospace",
                          fontSize: 12,
                          color: T.textSecondary,
                        }}
                      >
                        {l.customer_phone || "—"}
                      </TD>
                      <TD T={T}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "2px 9px",
                            borderRadius: 20,
                            background: sc.bg,
                            border: `1px solid ${sc.border}`,
                            fontSize: 11,
                            fontWeight: 700,
                            color: sc.color,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {statusLabel(l.call_status)}
                        </span>
                      </TD>
                      <TD
                        T={T}
                        style={{ fontSize: 12, color: T.textSecondary }}
                      >
                        {reasonLabel(l.reason_key)}
                      </TD>
                      <TD
                        T={T}
                        style={{
                          fontSize: 12,
                          color: T.textMuted,
                          maxWidth: 200,
                          wordBreak: "break-word",
                        }}
                      >
                        {l.notes || "—"}
                      </TD>
                      <TD
                        T={T}
                        style={{ fontSize: 12, color: T.textSecondary }}
                      >
                        {l.caller?.full_name || "—"}
                      </TD>
                      <TD
                        T={T}
                        style={{
                          fontSize: 11,
                          color: T.textMuted,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatIST(l.called_at)}
                      </TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Bx>
      )}
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
function OwnerDashboard({ user, onLogout }) {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem("ownerDarkMode") === "true";
    } catch {
      return false;
    }
  });
  const T = useMemo(() => makeTheme(dark), [dark]);
  const toggleDark = () =>
    setDark((d) => {
      const n = !d;
      try {
        localStorage.setItem("ownerDarkMode", String(n));
      } catch {}
      return n;
    });

  const [tab, setTab] = useState("overview");
  const [vehicles, setVehicles] = useState([]);
  const [creditVehicles, setCreditVehicles] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [todayPayments, setTodayPayments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [leaveApplications, setLeaveApplications] = useState([]);
  const [activeToken, setActiveToken] = useState(null);
  const [callLogs, setCallLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selVehicle, setSelVehicle] = useState(null);
  const [quickView, setQuickView] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [reportData, setReportData] = useState({
    vehicles: [],
    payments: [],
    history: [],
  });
  const [reportLoading, setReportLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // CHANGE 3: bookings fetch added
  const fetchAll = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setLoadError(null);
    try {
      const ts = getISTMidnightUTC();
      const [vr, tp, ap, cr, tr, ur, br, atRes, lvRes, tkRes, clRes] =
        await withTimeout(Promise.all([
          supabase
            .from("vehicles")
            .select(
              "*,work_stages(*),customer_complaints(*),advisor:users!vehicles_advisor_id_fkey(full_name)",
            )
            .or(`current_stage.neq.completed,entry_time.gte.${ts}`)
            .is("deleted_at", null)
            .order("entry_time", { ascending: false }),
          supabase
            .from("payments")
            .select(
              "*,vehicle:vehicles!payments_vehicle_id_fkey(vehicle_number,customer_name,model,credit_guaranteed_by),collector:users!payments_collected_by_fkey(full_name)",
            )
            .gte("created_at", ts)
            .order("created_at", { ascending: false }),
          supabase
            .from("payments")
            .select(
              "*,vehicle:vehicles!payments_vehicle_id_fkey(vehicle_number,customer_name,model,credit_guaranteed_by),collector:users!payments_collected_by_fkey(full_name)",
            )
            .order("created_at", { ascending: false }),
          supabase
            .from("vehicles")
            .select(
              "id,vehicle_number,customer_name,customer_phone,bill_amount,total_paid,credit_amount,credit_guaranteed_by,entry_time,current_stage,payment_status",
            )
            .gt("credit_amount", 0)
            .is("deleted_at", null)
            .order("entry_time", { ascending: false }),
          supabase.from("teams").select("*").order("name"),
          supabase
            .from("users")
            .select(
              "id,full_name,role,team_id,is_active,phone,auth_id,email,date_of_birth,blood_group,date_of_joining,current_address,permanent_address,notes,aadhar_number,aadhar_front_url,aadhar_back_url,pan_number,pan_front_url,pan_back_url,dl_number,dl_expiry,dl_front_url,dl_back_url,emergency_contact_name,emergency_contact_phone,emergency_contact_relation,profile_photo_url",
            )
            .order("full_name"),
          supabase
            .from("bookings")
            .select("*")
            .order("preferred_date", { ascending: false })
            .order("preferred_time", { ascending: true }),
          supabase
            .from("attendance_logs")
            .select(
              "*, user:users!attendance_logs_user_id_fkey(full_name,role)",
            )
            .gte("punch_time", getISTMidnightUTC())
            .order("punch_time", { ascending: true }),
          supabase
            .from("leave_applications")
            .select(
              "*, user:users!leave_applications_user_id_fkey(full_name,role)",
            )
            .order("created_at", { ascending: false }),
          supabase
            .from("attendance_tokens")
            .select("*")
            .eq("is_active", true)
            .maybeSingle(),
          supabase
            .from("call_logs")
            .select("*, caller:users!call_logs_called_by_fkey(full_name, role)")
            .order("called_at", { ascending: false })
            .limit(500),
        ]));
      setVehicles(vr.data || []);
      setTodayPayments(tp.data || []);
      setAllPayments(ap.data || []);
      setCreditVehicles(cr.data || []);
      setTeams(tr.data || []);
      setUsers(ur.data || []);
      setBookings(br.data || []);
      setAttendanceLogs(atRes.data || []);
      setLeaveApplications(lvRes.data || []);
      setActiveToken(tkRes.data || null);
      setCallLogs(clRes.data || []);
    } catch (e) {
      console.error(e);
      if (showLoader) setLoadError(e.message || "Failed to load dashboard data.");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  const fetchReport = useCallback(async (from, to) => {
    setReportLoading(true);
    try {
      const f0 = from + "T00:00:00+05:30";
      const t0 = to + "T23:59:59+05:30";
      const [vr, pr, hr] = await Promise.all([
        supabase
          .from("vehicles")
          .select(
            "id,vehicle_number,customer_name,customer_phone,model,odometer_reading,service_type,bill_amount,credit_amount,total_paid,entry_time,updated_at,expected_completion_time,priority,payment_status,credit_guaranteed_by,advisor_id,work_stages(*),advisor:users!vehicles_advisor_id_fkey(full_name)",
          )
          .eq("current_stage", "completed")
          .gte("updated_at", f0)
          .lte("updated_at", t0)
          .is("deleted_at", null)
          .order("updated_at", { ascending: false }),
        supabase
          .from("payments")
          .select(
            "*,vehicle:vehicles!payments_vehicle_id_fkey(vehicle_number,customer_name)",
          )
          .gte("created_at", f0)
          .lte("created_at", t0)
          .order("created_at", { ascending: false }),
        supabase
          .from("vehicle_history")
          .select("vehicle_id,stage,action,created_at")
          .gte("created_at", f0)
          .lte("created_at", t0)
          .in("action", [
            "started",
            "completed",
            "on_hold",
            "work_started",
            "work_completed",
          ])
          .order("created_at", { ascending: true }),
      ]);
      setReportData({
        vehicles: vr.data || [],
        payments: pr.data || [],
        history: hr.data || [],
      });
    } catch (e) {
      console.error(e);
    } finally {
      setReportLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchAll();
    const ch = supabase
      .channel("owner-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicles" },
        () => fetchAll(false),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => fetchAll(false),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "call_logs" },
        () => fetchAll(false),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => fetchAll(false),
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user, fetchAll]);

  // CHANGE 4: bookings added to derived + todayBookingsPending
  const derived = useMemo(() => {
    const now = new Date();
    const istToday = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
    const active = vehicles.filter(
      (v) =>
        v.current_stage !== "completed" && v.current_stage !== "ready_for_exit",
    );
    const todayEntries = vehicles.filter(
      (v) =>
        v.entry_time &&
        new Date(toZ(v.entry_time)).toLocaleDateString("en-CA", {
          timeZone: "Asia/Kolkata",
        }) === istToday,
    ).length;
    const todayCompleted = vehicles.filter((v) => {
      if (v.current_stage !== "completed") return false;
      const raw = v.updated_at || v.entry_time;
      if (!raw) return false;
      return (
        new Date(toZ(raw)).toLocaleDateString("en-CA", {
          timeZone: "Asia/Kolkata",
        }) === istToday
      );
    });
    const overdue = active.filter(
      (v) =>
        v.expected_completion_time &&
        now > new Date(toZ(v.expected_completion_time)),
    );
    const vipUrgent = active.filter(
      (v) => v.priority === "vip" || v.priority === "urgent",
    );
    const complaintVehicles = active.filter(
      (v) => v.customer_complaints && v.customer_complaints.length > 0,
    );
    const stuck = active.filter((v) => {
      if (v.current_stage !== "pending") return false;
      const ws = v.work_stages?.[0];
      if (!ws) return true;
      return !DEPT_KEYS.some(
        (k) =>
          ws[`${k}_status`] === "in_progress" ||
          ws[`${k}_status`] === "on_hold",
      );
    });
    const pendingPDI = vehicles.filter((v) => v.current_stage === "pdi");
    const pendingBilling = vehicles.filter(
      (v) => v.current_stage === "billing",
    );
    const pendingPayment = vehicles.filter(
      (v) => v.current_stage === "payment",
    );
    const readyForExit = vehicles.filter(
      (v) => v.current_stage === "ready_for_exit",
    );
    const realP = todayPayments.filter((p) => p.payment_method !== "credit");
    const todayCollection = realP.reduce(
      (s, p) => s + (parseFloat(p.amount) || 0),
      0,
    );
    const byMethod = {};
    ["cash", "upi", "card", "bank_transfer"].forEach((m) => {
      if (m === "upi")
        byMethod[m] = realP
          .filter((p) => p.payment_method?.startsWith("upi_"))
          .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
      else
        byMethod[m] = realP
          .filter((p) => p.payment_method === m)
          .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    });
    const cmap = {};
    (creditVehicles || []).forEach((v) => {
      if ((parseFloat(v.credit_amount) || 0) <= 0) return;
      const vn = v.vehicle_number;
      if (!cmap[vn])
        cmap[vn] = {
          vehicle_number: vn,
          customer_name: v.customer_name,
          customer_phone: v.customer_phone,
          total_credit: 0,
          visits: [],
        };
      cmap[vn].visits.push(v);
      cmap[vn].total_credit += parseFloat(v.credit_amount) || 0;
    });
    const creditGroups = Object.values(cmap).sort(
      (a, b) => b.total_credit - a.total_credit,
    );
    const totalOutstandingCredit = creditGroups.reduce(
      (s, g) => s + g.total_credit,
      0,
    );
    const deptCounts = {};
    const deptVehicles = {};
    DEPT_KEYS.forEach((d) => {
      const list = active.filter((v) => {
        const ws = v.work_stages?.[0];
        return ws?.[`${d}_required`] && ws?.[`${d}_status`] !== "completed";
      });
      deptCounts[d] = list.length;
      deptVehicles[d] = list;
    });
    const todayEntriesVehicles = vehicles.filter(
      (v) =>
        v.entry_time &&
        new Date(toZ(v.entry_time)).toLocaleDateString("en-CA", {
          timeZone: "Asia/Kolkata",
        }) === istToday,
    );
    const advisorLoads = users
      .filter((u) => u.role === "advisor" || u.role === "body_shop_advisor")
      .map((a) => ({
        ...a,
        activeVehicles: active.filter((v) => v.advisor_id === a.id),
      }));
    const teamLoads = teams.map((t) => ({
      ...t,
      activeVehicles: active.filter((v) => {
        const ws = v.work_stages?.[0];
        return (
          ws?.[`${t.role}_team_id`] === t.id &&
          ws?.[`${t.role}_status`] !== "completed"
        );
      }),
      members: users.filter((u) => u.team_id === t.id),
    }));
    const roleGroups = {};
    ALL_ROLES.filter((r) => r !== "owner").forEach((role) => {
      const mems = users.filter((u) => u.role === role && u.is_active);
      if (!mems.length) return;
      const rt = TEAM_ROLES.includes(role)
        ? teams.filter((t) => t.role === role)
        : [];
      const um = TEAM_ROLES.includes(role)
        ? mems.filter(
            (m) => !m.team_id || !teams.find((t) => t.id === m.team_id),
          )
        : mems;
      roleGroups[role] = {
        members: mems,
        roleTeams: rt,
        unassignedMembers: um,
      };
    });
    // CHANGE 4: bookings pending count for today
    const todayBookingsPending = bookings.filter(
      (b) =>
        b.preferred_date === istToday &&
        ["pending", "confirmed"].includes(b.status),
    ).length;
    return {
      activeVehicles: active,
      todayEntries,
      todayCompleted,
      todayEntriesVehicles,
      overdue,
      vipUrgent,
      complaintVehicles,
      stuckVehicles: stuck,
      pendingPDI,
      pendingBilling,
      pendingPayment,
      readyForExit,
      todayCollection,
      byMethod,
      totalOutstandingCredit,
      creditGroups,
      deptCounts,
      deptVehicles,
      advisorLoads,
      teamLoads,
      roleGroups,
      todayBookingsPending,
    };
  }, [vehicles, todayPayments, teams, users, creditVehicles, bookings]); // CHANGE 4: bookings in deps

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: dark ? "#0f172a" : "#f8fafc",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            border: `4px solid ${dark ? "#334155" : "#e2e8f0"}`,
            borderTop: "4px solid #f59e0b",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <div style={{ fontSize: 14, color: "#94a3b8", fontWeight: 500 }}>
          Loading Dashboard...
        </div>
        <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
      </div>
    );

  if (loadError)
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: dark ? "#0f172a" : "#f8fafc",
          flexDirection: "column",
          gap: 14,
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 32 }}>⚠️</div>
        <div style={{ fontSize: 15, color: dark ? "#f1f5f9" : "#0f172a", fontWeight: 700 }}>
          Couldn't load dashboard data
        </div>
        <div style={{ fontSize: 13, color: "#94a3b8", maxWidth: 360 }}>
          {loadError}
        </div>
        <button
          onClick={() => fetchAll()}
          style={{
            marginTop: 6,
            padding: "9px 20px",
            background: "#f59e0b",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          🔄 Retry
        </button>
      </div>
    );

  // CHANGE 4: Bookings tab added with todayBookingsPending alert
  const TABS = [
    {
      key: "overview",
      icon: "🏠",
      label: "Overview",
      alert: derived.overdue.length + derived.stuckVehicles.length,
    },
    {
      key: "floor",
      icon: "🏭",
      label: "Floor",
      alert: derived.activeVehicles.length,
    },
    { key: "finance", icon: "💰", label: "Finance", alert: null },
    {
      key: "bookings",
      icon: "🗓",
      label: "Bookings",
      alert: derived.todayBookingsPending,
    },
    { key: "reports", icon: "📊", label: "Reports", alert: null },
    { key: "team", icon: "⚙️", label: "Staff & Teams", alert: null },
    { key: "calling", icon: "📲", label: "Calling", alert: null },
    {
      key: "attendance",
      icon: "📋",
      label: "Attendance",
      alert:
        leaveApplications.filter((l) => l.status === "pending").length || null,
    },
    { key: "config", icon: "🔧", label: "Config", alert: null },
  ];

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: T.bg,
        fontFamily: "'DM Sans',sans-serif",
        color: T.text,
      }}
    >
      <style>
        {FONT}
        {`*{box-sizing:border-box;} ::-webkit-scrollbar{width:5px;height:5px;} ::-webkit-scrollbar-track{background:${T.surfaceElevated};} ::-webkit-scrollbar-thumb{background:${T.borderStrong};border-radius:3px;} input[type="date"]::-webkit-calendar-picker-indicator{cursor:pointer;filter:${dark ? "invert(0.7)" : "none"};} select option{background:${T.surface};color:${T.text};}`}
      </style>

      {/* Sidebar */}
      <div
        style={{
          width: collapsed ? 60 : 216,
          background: "#0f172a",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          transition: "width 0.2s",
          overflow: "hidden",
          height: "100vh",
          zIndex: 100,
        }}
      >
        <div
          style={{
            padding: collapsed ? "16px 12px" : "16px 14px",
            borderBottom: "1px solid #1e293b",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              overflow: "hidden",
              flexShrink: 0,
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={logo}
              alt="Sheetal"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
          {!collapsed && (
            <div>
              <div style={{ color: "#f8fafc", fontWeight: 800, fontSize: 12 }}>
                Sheetal
              </div>
              <div style={{ color: "#64748b", fontSize: 10 }}>
                Service Center
              </div>
            </div>
          )}
        </div>
        <nav style={{ flex: 1, padding: "8px 5px", overflowY: "auto" }}>
          {TABS.map((t) => {
            const a = tab === t.key;
            return (
              <div
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: collapsed ? "9px 13px" : "9px 11px",
                  borderRadius: 7,
                  cursor: "pointer",
                  marginBottom: 2,
                  background: a ? "rgba(245,158,11,0.18)" : "transparent",
                  borderLeft: a ? "3px solid #f59e0b" : "3px solid transparent",
                  transition: "all 0.12s",
                }}
                onMouseEnter={(e) => {
                  if (!a) e.currentTarget.style.background = "#1e293b";
                }}
                onMouseLeave={(e) => {
                  if (!a) e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>{t.icon}</span>
                {!collapsed && (
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: a ? 700 : 500,
                      color: a ? "#f59e0b" : "#94a3b8",
                      flex: 1,
                    }}
                  >
                    {t.label}
                  </span>
                )}
                {!collapsed && t.alert > 0 && (
                  <span
                    style={{
                      background: "#dc2626",
                      color: "#fff",
                      borderRadius: 10,
                      padding: "1px 6px",
                      fontSize: 10,
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {t.alert}
                  </span>
                )}
              </div>
            );
          })}
        </nav>
        <div style={{ padding: "8px 5px", borderTop: "1px solid #1e293b" }}>
          <div
            onClick={() => setCollapsed(!collapsed)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "8px 11px",
              borderRadius: 7,
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#1e293b")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <span style={{ fontSize: 13, flexShrink: 0, color: "#64748b" }}>
              {collapsed ? "→" : "←"}
            </span>
            {!collapsed && (
              <span style={{ fontSize: 12, color: "#64748b" }}>Collapse</span>
            )}
          </div>
          <div
            onClick={onLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "8px 11px",
              borderRadius: 7,
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#1e293b")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <span style={{ fontSize: 14, flexShrink: 0 }}>🚪</span>
            {!collapsed && (
              <span style={{ fontSize: 13, fontWeight: 500, color: "#f87171" }}>
                Logout
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        <div
          style={{
            background: T.surface,
            borderBottom: `1px solid ${T.border}`,
            padding: "10px 22px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
            position: "sticky",
            top: 0,
            zIndex: 50,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: T.textMuted,
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              Sheetal Automobiles
            </div>
            <div style={{ fontSize: 19, fontWeight: 800, color: T.text }}>
              {TABS.find((t) => t.key === tab)?.label}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 10px",
                background: T.greenLight,
                borderRadius: 20,
                border: `1px solid ${T.green}44`,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: T.green,
                }}
              />
              <span style={{ fontSize: 10, fontWeight: 800, color: T.green }}>
                LIVE
              </span>
            </div>
            <button
              onClick={toggleDark}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: `1px solid ${T.border}`,
                background: T.surfaceElevated,
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "inherit",
                color: T.text,
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 600,
              }}
            >
              {dark ? "☀️ Light" : "🌙 Dark"}
            </button>
            <Btn
              T={T}
              v="secondary"
              sz="sm"
              onClick={() => setShowSearch(true)}
            >
              🔍 Search
            </Btn>
            <span
              style={{ fontSize: 13, color: T.textSecondary, fontWeight: 600 }}
            >
              {user?.full_name}
            </span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 22 }}>
          {tab === "overview" && (
            <OverviewTab
              T={T}
              derived={derived}
              vehicles={vehicles}
              todayPayments={todayPayments}
              creditVehicles={creditVehicles}
              onVehiclePress={setSelVehicle}
              onQuickView={(title, vlist) =>
                setQuickView({ title, vehicles: vlist })
              }
            />
          )}
          {tab === "floor" && (
            <FloorTab
              T={T}
              vehicles={vehicles}
              derived={derived}
              onVehiclePress={setSelVehicle}
            />
          )}
          {tab === "finance" && (
            <FinanceTab
              T={T}
              derived={derived}
              todayPayments={todayPayments}
              allPayments={allPayments}
              creditVehicles={creditVehicles}
            />
          )}
          {tab === "bookings" && <BookingsTab T={T} bookings={bookings} />}
          {tab === "reports" && (
            <ReportsTab
              T={T}
              derived={derived}
              users={users}
              reportData={reportData}
              reportLoading={reportLoading}
              fetchReportData={fetchReport}
            />
          )}
          {tab === "team" && (
            <TeamTab
              T={T}
              users={users}
              teams={teams}
              onRefresh={fetchAll}
              derived={derived}
              vehicles={vehicles}
            />
          )}
          {tab === "calling" && (
            <CallingTab T={T} callLogs={callLogs} users={users} />
          )}
          {tab === "attendance" && (
            <AttendanceTab
              T={T}
              users={users}
              attendanceLogs={attendanceLogs}
              leaveApplications={leaveApplications}
              activeToken={activeToken}
              onRefresh={fetchAll}
            />
          )}
          {tab === "config" && <ConfigTab T={T} />}
        </div>
      </div>

      {selVehicle && (
        <VehicleDetailModal
          T={T}
          vehicle={selVehicle}
          users={users}
          teams={teams}
          onClose={() => setSelVehicle(null)}
        />
      )}
      {quickView && (
        <QuickViewModal
          T={T}
          title={quickView.title}
          vehicles={quickView.vehicles}
          onVehiclePress={setSelVehicle}
          onClose={() => setQuickView(null)}
        />
      )}
      {showSearch && (
        <SearchModal
          T={T}
          onClose={() => setShowSearch(false)}
          onSelect={(v) => {
            setSelVehicle(v);
            setShowSearch(false);
          }}
        />
      )}
    </div>
  );
}

export default OwnerDashboard;
