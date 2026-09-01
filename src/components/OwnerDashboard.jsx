import { useState, useEffect, useMemo, useCallback, useRef, memo, Fragment } from "react";
import { supabase } from "../lib/supabase";
import logo from "../assets/logo.png";
import * as XLSX from "xlsx";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// "Royal" navy + gold palette (design handoff: design_handoff_owner_dashboard_overview).
// Dark variants keep the same hue relationships as light, just darker/desaturated,
// per the handoff's instruction — light-mode hex values are the ones given exactly.
const makeTheme = (dark) => ({
  sidebar: "#0d1730",
  sidebarHover: dark ? "#232d4d" : "#1a2645",
  sidebarText: "#8b93ab",
  bg: dark ? "#141026" : "#f3ebda",
  surface: dark ? "#1e1a34" : "#fffcf5",
  surfaceElevated: dark ? "#282342" : "#f7f1e6",
  border: dark ? "#3a3450" : "#e6d9bd",
  borderStrong: dark ? "#4d4568" : "#d9d2c2",
  text: dark ? "#f4ecd8" : "#161f38",
  textSecondary: dark ? "#b8ae94" : "#7c7461",
  textMuted: dark ? "#8f8570" : "#918770",
  accent: "#c9781f",
  accentBg: dark ? "#3a2410" : "#faf1de",
  green: dark ? "#2ec476" : "#1fa15e",
  greenLight: dark ? "#0f2e1d" : "#eaf6ef",
  red: dark ? "#c97a63" : "#a4452f",
  redLight: dark ? "#3a1c14" : "#f5dfd8",
  amber: dark ? "#ffab47" : "#f2941a",
  amberLight: dark ? "#3a2410" : "#faf1de",
  statusNotStarted: dark ? "#9c9484" : "#4b463c",
  statusNotAssignedBorder: dark ? "#4d4568" : "#c7bfa8",
  blue: dark ? "#60a5fa" : "#2563eb",
  blueLight: dark ? "#0f1e3d" : "#eff6ff",
  purple: dark ? "#9b7cba" : "#6b4a8a",
  purpleLight: dark ? "#241a38" : "#f2ecf7",
  cyan: dark ? "#22d3ee" : "#0891b2",
  cyanLight: dark ? "#061b24" : "#ecfeff",
  shadow: dark ? "0 1px 3px rgba(0,0,0,0.5)" : "0 1px 2px rgba(22,31,56,.04)",
  shadowMd: dark ? "0 4px 12px rgba(0,0,0,0.6)" : "0 4px 6px rgba(22,31,56,.07)",
  shadowLg: dark
    ? "0 10px 30px rgba(0,0,0,0.7)"
    : "0 10px 15px rgba(22,31,56,.1)",
});

const FONT = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=DM+Mono:wght@400;500&display=swap');`;
const FONT_HEADING = "'Playfair Display',serif";

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
  // Covers the entire accident-repair sub-workflow — the granular step lives
  // in vehicles.bodyshop_stage (see BODYSHOP_STAGE_LABELS), appended by
  // callers that have it (e.g. "Body Shop · Survey") rather than baked in here.
  bodyshop_processing: { label: "Body Shop", icon: "🚘", color: "#7c3aed" },
};

// Mirrors OVERVIEW_BODYSHOP_STAGES' labels for the same 6-step sequence,
// usable outside the Overview tab's module scope (e.g. QuickViewModal).
const BODYSHOP_STAGE_LABELS = {
  pre_quotation: "Pre-Quotation",
  claim_registration: "Claim Registration",
  final_quotation: "Final Quotation",
  survey: "Survey",
  survey_approval: "Survey Approval",
  spare_assessment: "Spare Assessment",
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
  disabled,
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
      disabled={disabled}
      style={{
        width: "100%",
        padding: "9px 12px",
        border: `1px solid ${T.border}`,
        borderRadius: 6,
        fontSize: 14,
        color: disabled ? T.textMuted : T.text,
        background: disabled ? T.surfaceElevated : T.surface,
        outline: "none",
        fontFamily: "inherit",
        boxSizing: "border-box",
        cursor: disabled ? "not-allowed" : "text",
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

// Uniform CSS-grid table primitives — divs, not <table>/<th>/<td>, matching
// Overview drawer table's exact treatment (11px uppercase muted header, 2px
// navy header rule, 1px row dividers, hover tint, no box wrapper) — used
// app-wide so every list in every tab reads the same way. `columns` entries
// are {label, align, onSort, active, dir}.
const TableHeader = ({ T, cols, columns }) => (
  <div style={{ display: "grid", gridTemplateColumns: cols, columnGap: 14, padding: "0 0 10px", borderBottom: `2px solid ${T.text}` }}>
    {columns.map((c, i) => (
      <div
        key={i}
        onClick={c.onSort}
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: T.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.6px",
          textAlign: c.align || "left",
          cursor: c.onSort ? "pointer" : "default",
          userSelect: c.onSort ? "none" : "auto",
        }}
      >
        {c.label}
        {c.active && <span style={{ marginLeft: 4, color: T.accent }}>{c.dir === "asc" ? "▲" : "▼"}</span>}
      </div>
    ))}
  </div>
);
const TableRow = ({ T, cols, onClick, children }) => (
  <div
    onClick={onClick}
    onMouseEnter={(e) => (e.currentTarget.style.background = T.surfaceElevated)}
    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    style={{
      display: "grid",
      gridTemplateColumns: cols,
      columnGap: 14,
      padding: "13px 0",
      borderBottom: `1px solid ${T.border}`,
      alignItems: "center",
      cursor: onClick ? "pointer" : "default",
    }}
  >
    {children}
  </div>
);
const TableFooter = ({ T, cols, children }) => (
  <div style={{ display: "grid", gridTemplateColumns: cols, columnGap: 14, padding: "12px 0 0", borderTop: `2px solid ${T.text}`, marginTop: -1 }}>
    {children}
  </div>
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
                  {v.current_stage === "bodyshop_processing" && v.bodyshop_stage
                    ? ` · ${BODYSHOP_STAGE_LABELS[v.bodyshop_stage] || v.bodyshop_stage}`
                    : ""}
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
  const bodyshopSuffix =
    vehicle.current_stage === "bodyshop_processing" && vehicle.bodyshop_stage
      ? ` · ${BODYSHOP_STAGE_LABELS[vehicle.bodyshop_stage] || vehicle.bodyshop_stage}`
      : "";
  const tokenSuffix = vehicle.daily_token_number ? ` · Token #${vehicle.daily_token_number}` : "";

  // Sub-type of vehicle.service_type — cleared to null on the row whenever
  // its parent choice doesn't apply, so at most one of these three is ever set.
  const freeNumRows = useConfigCategory("free_service_number");
  const schedTypeRows = useConfigCategory("scheduled_service_type");
  const schedIntervalRows = useConfigCategory("scheduled_major_interval");
  const subTypeLabel = vehicle.free_service_number
    ? freeNumRows?.find((r) => r.key === vehicle.free_service_number)?.label || vehicle.free_service_number
    : vehicle.scheduled_service_type
      ? [
          schedTypeRows?.find((r) => r.key === vehicle.scheduled_service_type)?.label || vehicle.scheduled_service_type,
          vehicle.scheduled_major_interval &&
            (schedIntervalRows?.find((r) => r.key === vehicle.scheduled_major_interval)?.label || vehicle.scheduled_major_interval),
        ]
          .filter(Boolean)
          .join(" — ")
      : null;

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
    [
      "Service",
      (vehicle.service_type?.replace(/_/g, " ") || "—") + (subTypeLabel ? ` · ${subTypeLabel}` : ""),
    ],
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
      title={`${meta.icon} ${vehicle.vehicle_number}${tokenSuffix} — ${meta.label}${bodyshopSuffix}`}
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

// ─── Force PDI / Force Exit — shared data source ───────────────────────────────
// Used by both the Excel export (below) and the on-screen By Department / By
// Vehicle views in ReportsTab, so the two never drift out of sync on which
// action names / batch-grouping logic counts as a real Force PDI or Force
// Exit event.
async function fetchForcePdiExitData(fromDate, toDate) {
  const f0 = fromDate + "T00:00:00+05:30";
  const t0 = toDate + "T23:59:59+05:30";

  // Force PDI (advisor) has been logged two ways across app versions:
  //  - current: action='pdi_completed' with new_value prefixed "Force PDI by..."
  //    (a normal, non-forced pdi_completed row has a different prefix, so this
  //    LIKE filter is required to avoid conflating the two)
  //  - legacy (pre ~Jun 2026): action='force_pdi', same event shape.
  // A third variant seen in history, action='force_complete' (stage="completed"),
  // was a separate "Force Complete" feature — confirmed removed from the app —
  // and is deliberately excluded here, not folded in as another spelling.
  const [{ data: pdiCurrent }, { data: pdiLegacy }] = await Promise.all([
    supabase
      .from("vehicle_history")
      .select(
        "vehicle_id,created_at,new_value,notes,user:users!vehicle_history_user_id_fkey(full_name),vehicle:vehicles!vehicle_history_vehicle_id_fkey(vehicle_number,customer_name,model)",
      )
      .eq("action", "pdi_completed")
      .ilike("new_value", "Force PDI by%")
      .gte("created_at", f0)
      .lte("created_at", t0),
    supabase
      .from("vehicle_history")
      .select(
        "vehicle_id,created_at,new_value,notes,user:users!vehicle_history_user_id_fkey(full_name),vehicle:vehicles!vehicle_history_vehicle_id_fkey(vehicle_number,customer_name,model)",
      )
      .eq("action", "force_pdi")
      .gte("created_at", f0)
      .lte("created_at", t0),
  ]);
  const pdiSummary = [...(pdiCurrent || []), ...(pdiLegacy || [])].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );
  // Per-department breakdown rows share the exact same vehicle_id + created_at
  // as their parent summary row — one batch INSERT per Force PDI action, so
  // Postgres' now() is identical across the whole batch. Used both to resolve
  // which team/worker didn't finish, and to exclude any force_completed/
  // work_cancelled rows that actually belong to the removed Force Complete
  // flow instead of a real Force PDI event.
  const pdiBatchKeys = new Set(pdiSummary.map((h) => `${h.vehicle_id}|${h.created_at}`));
  const { data: deptHistRaw } = await supabase
    .from("vehicle_history")
    .select(
      "vehicle_id,created_at,stage,action,target_role,notes,user:users!vehicle_history_user_id_fkey(full_name),vehicle:vehicles!vehicle_history_vehicle_id_fkey(vehicle_number,customer_name,model),target_team:teams!vehicle_history_target_team_id_fkey(name),target_user:users!vehicle_history_target_user_id_fkey(full_name)",
    )
    .in("action", ["force_completed", "work_cancelled"])
    .gte("created_at", f0)
    .lte("created_at", t0)
    .order("created_at", { ascending: true });
  const deptHist = (deptHistRaw || []).filter((h) =>
    pdiBatchKeys.has(`${h.vehicle_id}|${h.created_at}`),
  );
  // Gateman's force-exit: one top-level `force_exited` row (who, and a
  // one-line summary of what was incomplete) plus one `force_exit_incomplete`
  // row per stage/department that wasn't actually done (stage-gated — only
  // roles actually due by the vehicle's stage at exit get a row, except
  // billing/cashier which are always checked regardless of stage) — same
  // summary-event + detail-rows shape as Force PDI above.
  const { data: exitHist } = await supabase
    .from("vehicle_history")
    .select(
      "*,user:users!vehicle_history_user_id_fkey(full_name),vehicle:vehicles!vehicle_history_vehicle_id_fkey(vehicle_number,customer_name,model)",
    )
    .eq("action", "force_exited")
    .gte("created_at", f0)
    .lte("created_at", t0)
    .order("created_at", { ascending: false });
  const { data: exitDetailHist } = await supabase
    .from("vehicle_history")
    .select(
      "*,user:users!vehicle_history_user_id_fkey(full_name),vehicle:vehicles!vehicle_history_vehicle_id_fkey(vehicle_number,customer_name,model),target_team:teams!vehicle_history_target_team_id_fkey(name),target_user:users!vehicle_history_target_user_id_fkey(full_name)",
    )
    .eq("action", "force_exit_incomplete")
    .gte("created_at", f0)
    .lte("created_at", t0)
    .order("created_at", { ascending: true });

  const VEH_COLS =
    "id,vehicle_number,customer_name,model,entry_time,fc_completed,fc_skipped_at,fc_cancelled,advisor_id,bodyshop_advisor_id,pdi_completed_at,bill_amount,payment_status,current_stage,actual_completion_time,work_stages(*)";
  const { data: vehInRange } = await supabase
    .from("vehicles")
    .select(VEH_COLS)
    .gte("entry_time", f0)
    .lte("entry_time", t0)
    .is("deleted_at", null);
  // The By Vehicle view needs every vehicle that had a force event in this
  // window, not just ones that also happened to ENTER in this window (a
  // vehicle can enter on day 1 and get force-exited days later) — fetch
  // whichever force-touched vehicle ids are missing from the entry-range set.
  const veh = vehInRange || [];
  const knownIds = new Set(veh.map((v) => v.id));
  const forceTouchedIds = new Set(
    [...pdiSummary, ...exitHist].map((h) => h.vehicle_id).filter((id) => !knownIds.has(id)),
  );
  if (forceTouchedIds.size > 0) {
    const { data: extraVeh } = await supabase
      .from("vehicles")
      .select(VEH_COLS)
      .in("id", [...forceTouchedIds])
      .is("deleted_at", null);
    veh.push(...(extraVeh || []));
  }

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
  const { data: teamsData } = await supabase.from("teams").select("id,name,role");

  return {
    pdiSummary,
    deptHist,
    exitHist: exitHist || [],
    exitDetailHist: exitDetailHist || [],
    veh,
    acctHist: acctHist || [],
    teamsData: teamsData || [],
  };
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
      .is("voided_at", null)
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
    // Trimmed to exactly the 4 sheets requested — no per-team TAT log, no
    // "Dept Force PDI Summary" rollup. veh/acctHist/teamsData from the shared
    // fetcher aren't needed for these 4 sheets (they exist for the on-screen
    // By Vehicle view instead), so they're left undestructured here.
    const { pdiSummary, deptHist, exitHist, exitDetailHist } =
      await fetchForcePdiExitData(fromDate, toDate);
    sheet(
      pdiSummary.map((h) => ({
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
      "Force PDI by Vehicle",
    );
    sheet(
      (exitHist || []).map((h) => ({
        "Vehicle No": h.vehicle?.vehicle_number || "",
        Customer: h.vehicle?.customer_name || "",
        Model: h.vehicle?.model || "",
        "Force Exit By": h.user?.full_name || "",
        Summary: h.new_value || "",
        Time: new Date(toZ(h.created_at)).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        }),
      })),
      "Force Exit by Vehicle",
    );
    // Department + Stage sheets deliberately merge Force PDI and Force Exit
    // together (who missed the work matters, not which override caught it) —
    // one row per department/team or stage, not per event.
    const isWorkshopDept = (role) => DEPT_KEYS.includes(role);
    const deptGroups = {};
    [...deptHist, ...(exitDetailHist || []).filter((h) => isWorkshopDept(h.target_role || h.stage))].forEach(
      (h) => {
        const deptKey = h.target_role || h.stage;
        const department = STAGE_META[deptKey]?.label || deptKey;
        // No-team depts (painter/three_m/alignment_balancing/washing) still
        // have a worker tracked sometimes (target_user_id) — show that
        // instead of leaving Team blank, so solo-worker depts are just as
        // traceable as team-based ones.
        const team = h.target_team?.name || h.target_user?.full_name || "";
        const key = `${department}|||${team}`;
        if (!deptGroups[key]) deptGroups[key] = { department, team, vehicles: new Set() };
        const vn = h.vehicle?.vehicle_number;
        if (vn) deptGroups[key].vehicles.add(vn);
      },
    );
    sheet(
      Object.values(deptGroups)
        .sort((a, b) => b.vehicles.size - a.vehicles.size)
        .map((g) => ({
          Department: g.department,
          Team: g.team || "—",
          "Vehicles Missed": g.vehicles.size,
          "Vehicle List": [...g.vehicles].sort().join(", "),
        })),
      "Department",
    );
    const stageGroups = {};
    (exitDetailHist || [])
      .filter((h) => !isWorkshopDept(h.target_role || h.stage))
      .forEach((h) => {
        const stage = forceRoleLabel(forceGroupRole(h));
        if (!stageGroups[stage]) stageGroups[stage] = new Set();
        const vn = h.vehicle?.vehicle_number;
        if (vn) stageGroups[stage].add(vn);
      });
    sheet(
      Object.entries(stageGroups)
        .map(([stage, vehicles]) => ({ stage, vehicles }))
        .sort((a, b) => b.vehicles.size - a.vehicles.size)
        .map((g) => ({
          Stage: g.stage,
          "Vehicles Missed": g.vehicles.size,
          "Vehicle List": [...g.vehicles].sort().join(", "),
        })),
      "Stage",
    );
    XLSX.writeFile(wb, `ForcePDI_Exit_${fromDate}_to_${toDate}.xlsx`);
  }
}

// ─── OVERVIEW TAB ─────────────────────────────────────────────────────────────
// Filter-card driven flow table. Stage progress is derived from a single ordered
// current_stage sequence (verified against the live `vehicles_current_stage_check`
// constraint + real production data) so exactly one column is ever "current" per
// vehicle — no more independently-checked timestamp columns disagreeing with
// each other (e.g. Ready for Exit / Completed both lighting up at once).

// Real observed + constraint-confirmed pipeline order. "pending"/"pdi" both fold
// into the single "workshop" slot — current_stage never actually holds an
// individual department name in production despite the constraint allowing it.
// PDI is its own stage, separate from Workshop — "pending" (actual dept work)
// still normalizes to "workshop", but "pdi" (quality check after all depts
// finish) is a distinct, later step: Workshop → PDI → Billing.
const STAGE_SEQUENCE = [
  "front_checkup",
  "advisor_review",
  "workshop",
  "pdi",
  "billing",
  "payment",
  "ready_for_exit",
  "completed",
];
function normalizeStage(currentStage) {
  if (currentStage === "pending") return "workshop";
  return currentStage;
}
function getVehicleStageIndex(v) {
  return STAGE_SEQUENCE.indexOf(normalizeStage(v.current_stage));
}

// "Ready for Exit" and "Completed" are merged into one "Exit" column — the
// vehicle waits (current stage) at Exit from the moment payment is collected
// until the gateman actually processes the exit, at which point it ticks green
// and the whole row is complete. Keeping them as two separate ticks made no
// sense: a vehicle can't be simultaneously "ready to exit" and "already exited".
const OVERVIEW_FLOW_STAGES = [
  { key: "entry", label: "Entry" },
  { key: "front_checkup", label: "Front Checkup" },
  { key: "advisor", label: "Advisor" },
  { key: "workshop", label: "Workshop" },
  { key: "pdi", label: "PDI" },
  { key: "billing", label: "Billing" },
  { key: "cashier", label: "Cashier" },
  { key: "exit", label: "Ready for Delivery" },
];
// Body shop's own 6-stage sub-pipeline (accident/insurance-claim vehicles) —
// live inside vehicles.current_stage = 'bodyshop_processing', tracked by the
// separate `bodyshop_stage` column (see vehicles_bodyshop_stage_check).
// Confirmed against production schema — no per-stage timestamp column exists
// (vehicle_history logs a "bodyshop_stage_advanced" event per transition,
// but "pending count" only needs the vehicle's current bodyshop_stage, not
// history), matching what the Workshop journey's own dot counts need.
const OVERVIEW_BODYSHOP_STAGES = [
  { key: "pre_quotation", label: "Pre-Quotation" },
  { key: "claim_registration", label: "Claim Registration" },
  { key: "final_quotation", label: "Final Quotation" },
  { key: "survey", label: "Survey" },
  { key: "survey_approval", label: "Survey Approval" },
  { key: "spare_assessment", label: "Spare Assessment" },
];
// Column key -> index in STAGE_SEQUENCE. "entry" has no sequence slot (a vehicle
// only appears in this table once it has an entry_time, so it's always done).
const FLOW_COL_SEQ_IDX = {
  front_checkup: 0,
  advisor: 1,
  workshop: 2,
  pdi: 3,
  billing: 4,
  cashier: 5,
  exit: 7,
};
// Group A filter cards ("vehicles currently AT this stage") — distinct question
// from the table's per-column "has this vehicle moved past this stage" done-check.
const FLOW_CARD_STAGE_MATCH = {
  front_checkup: "front_checkup",
  advisor: "advisor_review",
  workshop: "workshop",
  pdi: "pdi",
  billing: "billing",
  cashier: "payment",
  exit: "ready_for_exit",
};

// "At current_stage === payment" undercounts what cashier actually needs to
// track — a vehicle billed (incl. via cashier override) and partially paid
// can still be sitting at PDI or earlier, not yet formally at the "payment"
// stage, but cashier still owes/is owed money on it. This mirrors exactly
// the criteria CashierDashboard.jsx's own "At Cashier" query uses, so the
// two dashboards' counts agree instead of looking like a data bug.
function isAwaitingCashier(v) {
  return (
    parseFloat(v.bill_amount) > 0 &&
    v.payment_status !== "paid" &&
    v.payment_status !== "credit" &&
    !["ready_for_exit", "completed"].includes(v.current_stage)
  );
}

// Order matches the requested Group B card / Workshop-table column order —
// deliberately not reusing the global DEPT_KEYS ordering, which differs and is
// relied on elsewhere.
const OVERVIEW_WORKSHOP_DEPTS = [
  { key: "mechanic", label: "Mechanic" },
  { key: "electrician", label: "Electrician" },
  { key: "denter", label: "Denter" },
  { key: "painter", label: "Painter" },
  { key: "alignment_balancing", label: "Alignment" },
  { key: "washing", label: "Washing" },
  { key: "three_m", label: "3M" },
];
// Each department's "work assigned" lives in its own {dept}_details table,
// under a differently-named column — mechanic/painter/denter/electrician use
// work_assigned, alignment/three_m use work_types, washing uses
// washing_types. Centralized here so the popover fetch below can loop
// generically instead of hand-writing 7 near-identical queries.
const OVERVIEW_DEPT_DETAILS_SOURCE = {
  mechanic: { table: "mechanic_details", workField: "work_assigned" },
  electrician: { table: "electrician_details", workField: "work_assigned" },
  denter: { table: "denter_details", workField: "work_assigned" },
  painter: { table: "painter_details", workField: "work_assigned" },
  alignment_balancing: { table: "alignment_details", workField: "work_types" },
  washing: { table: "washing_details", workField: "washing_types" },
  three_m: { table: "three_m_details", workField: "work_types" },
};

// done: has the vehicle moved past this stage (or, for the terminal "exit"
// column, IS it at that stage — there's nothing further to move past).
// time/start/end: the real timestamp column(s) for Time-type display — a
// separate question from `done`, shown only when Type = Time.
// skipped: front checkup only — done via fc_skipped_at rather than actually
// performed, rendered as a distinct warning color instead of plain green.
function getOverviewFlowStage(v, key, deptHistory) {
  const ws = v.work_stages?.[0];
  if (key === "entry") return { done: !!v.entry_time, time: v.entry_time };

  const seqIdx = FLOW_COL_SEQ_IDX[key];
  const vIdx = getVehicleStageIndex(v);
  const done = vIdx === -1 ? false : seqIdx === 7 ? vIdx === 7 : vIdx > seqIdx;

  switch (key) {
    case "front_checkup": {
      const historyEnd = deptHistory?.[v.id]?.front_checkup?.end;
      return {
        done,
        skipped: !!v.fc_skipped_at,
        time: historyEnd || v.job_card_completed_at || v.fc_skipped_at || v.fc_cancelled_at || null,
      };
    }
    case "advisor":
      return { done, time: ws?.created_at || null };
    case "workshop":
      return {
        done,
        time: v.workshop_completed_at || null,
        start: v.workshop_assigned_at || null,
        end: v.workshop_completed_at || null,
      };
    case "pdi":
      return { done, time: v.pdi_completed_at || null };
    case "billing":
      return { done, time: v.bill_generated_at || null };
    case "cashier":
      return { done, time: v.payment_received_at || null };
    case "exit":
      // Waits (current stage, not yet done) from the moment payment is
      // collected until the vehicle actually physically exits.
      return {
        done,
        time: v.actual_completion_time || v.exit_time || v.updated_at || null,
      };
    default:
      return { done: false, time: null };
  }
}

// not_assigned (dept not required) | not_started (required, no work yet) |
// in_progress (incl. on_hold) | completed
function getOverviewDeptState(v, deptKey) {
  const ws = v.work_stages?.[0];
  if (!ws?.[`${deptKey}_required`]) return "not_assigned";
  const status = ws?.[`${deptKey}_status`];
  if (status === "completed") return "completed";
  if (status === "in_progress" || status === "on_hold") return "in_progress";
  return "not_started";
}

// Single gold accent bar on every card, same everywhere — the number itself no
// longer varies by "meaning" color (was one color per stat, now one color for
// the whole row); which card is active/selected is still shown via the tint.
// Number-left, label-right (stacked to ~2 lines) — deliberately not
// number-on-top-label-below: at 8 cards in a 4-col grid the old stack left a
// tall gap above Vehicle Journey once the Bookings ring (which used to set
// the row's height) got shorter. This layout uses that freed vertical space
// by going bigger on the number instead of leaving it blank.
const FilterCard = ({ T, label, value, active, disabled, sub, onClick, danger }) => {
  // Alarm cards signal via a glowing red border instead of a red number —
  // keeps the big value legible in both themes and reads as "this card
  // needs attention" rather than just coloring a digit.
  const restGlow = danger ? `0 0 12px 0 ${T.red}` : "none";
  const hoverGlow = danger ? `0 0 18px 2px ${T.red}` : "0 2px 6px rgba(22,31,56,.1)";
  return (
    <div
      onClick={!disabled ? onClick : undefined}
      style={{
        background: active ? T.accentBg : T.surface,
        border: `1px solid ${danger ? T.red : active ? T.accent : T.border}`,
        borderRadius: 12,
        padding: "18px 18px",
        minWidth: 0,
        width: "100%",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "box-shadow 0.1s",
        boxShadow: restGlow,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.boxShadow = hoverGlow;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = restGlow;
      }}
    >
      <div
        style={{
          fontSize: 38,
          fontWeight: 700,
          color: disabled ? T.textMuted : T.text,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        {value}
      </div>
      <div style={{ textAlign: "right", minWidth: 0 }}>
        <div
          style={{
            fontSize: 17,
            color: T.textSecondary,
            fontWeight: 700,
            letterSpacing: "0.1px",
            lineHeight: 1.3,
          }}
        >
          {/* One word per line, regardless of how many words the label has —
              keeps every card's label block the same shape instead of some
              wrapping at odd widths and others staying on one line. */}
          {typeof label === "string"
            ? label.split(" ").map((word, i) => <div key={i}>{word}</div>)
            : label}
        </div>
        {sub && (
          <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 3 }}>{sub}</div>
        )}
      </div>
    </div>
  );
};

// At a Glance stat keys that mean "something needs attention" — their card
// value renders in red instead of the default navy, matching Not Accepted/
// Cancelled on the Bookings card beside it.
const OVERVIEW_ALARM_STAT_KEYS = new Set(["stuck", "complaint"]);

// One stepper cell per table column — each cell is exactly as wide as its
// <col>, so the dot (centered within the cell) lines up perfectly under its
// <th> header. The connecting line is drawn as two independent half-segments
// (left half in this cell, right half in this cell) rather than one flex row
// spanning multiple columns, which is what let dots drift out from under
// their headers. A solid green fill reads as calm progress; only the current
// step gets a subtle pulse, matching the ixigo-style tracker direction.
const FLOW_PULSE_KEYFRAMES = `
@keyframes overviewFlowPulse {
  0%, 100% { box-shadow: 0 0 0 0 ${"rgba(220,38,38,0.35)"}; }
  50% { box-shadow: 0 0 0 5px ${"rgba(220,38,38,0)"}; }
}`;

function FlowStepperCell({
  T,
  label,
  isFirst,
  isLast,
  leftDone,
  rightDone,
  done,
  isCurrent,
  isSkippedFlag,
  interactive,
  onHover,
  onLeave,
  onClick,
}) {
  return (
    <div
      style={{ position: "relative", height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}
      onMouseEnter={interactive ? onHover : undefined}
      onMouseLeave={interactive ? onLeave : undefined}
      onClick={
        interactive
          ? (e) => {
              e.stopPropagation();
              onClick(e);
            }
          : undefined
      }
    >
      {/* Plain filled dots, no tick/glyph — a solid color already reads as "done"
          without needing a checkmark, and it keeps the row scannable at a glance
          across many vehicles. Done segments get the same soft glow as the
          aggregate Journey tracker above, so the two read as one design. */}
      {/* Lines overshoot their own cell by half the grid's columnGap (5px of
          the row's 10px gap) so a done→done pair meets seamlessly in the
          middle of the gap instead of leaving a visible break between every
          stage — the gap has no cell of its own to draw a line inside. */}
      {!isFirst && (
        <div
          style={{
            position: "absolute",
            left: -5,
            right: "50%",
            top: "50%",
            marginTop: -1.5,
            height: 3,
            borderRadius: 999,
            background: leftDone ? T.green : T.border,
            boxShadow: leftDone ? `0 0 6px ${T.green}55` : "none",
          }}
        />
      )}
      {!isLast && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            right: -5,
            top: "50%",
            marginTop: -1.5,
            height: 3,
            borderRadius: 999,
            background: rightDone ? T.green : T.border,
            boxShadow: rightDone ? `0 0 6px ${T.green}55` : "none",
          }}
        />
      )}
      <div
        title={isSkippedFlag ? `${label} — skipped` : label}
        style={{
          position: "relative",
          zIndex: 1,
          width: 15,
          height: 15,
          borderRadius: "50%",
          background: isSkippedFlag ? T.amber : done ? T.green : isCurrent ? T.amber : T.statusNotStarted,
          border: `2.5px solid ${isSkippedFlag ? T.amber : done ? T.green : isCurrent ? T.amber : T.statusNotStarted}`,
          boxShadow: isCurrent ? `0 0 0 4px ${T.amber}22` : "none",
          cursor: interactive ? "pointer" : "default",
          animation: isCurrent ? "overviewFlowPulse 1.8s ease-in-out infinite" : "none",
          transition: "all 0.15s",
        }}
      />
    </div>
  );
}

// Trailing timeline column — the vehicle's promised completion time. Red only
// while the vehicle hasn't actually finished its journey yet (exited); once
// it's out, a late promise is history, not an active problem to flag.
function ExpectedCompletionCell({ T, exp, exited }) {
  if (!exp) {
    return <div style={{ fontSize: 12, color: T.textMuted, textAlign: "center", whiteSpace: "nowrap" }}>—</div>;
  }
  const overdue = !exited && new Date(toZ(exp)) < new Date();
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: overdue ? 800 : 400,
        color: overdue ? T.red : T.textSecondary,
        textAlign: "center",
        whiteSpace: "nowrap",
      }}
    >
      {formatIST(exp)}
    </div>
  );
}

// Workshop-type dot: parallel departments, no connecting line, independently
// colored circle. "Not assigned" uses a muted gray rather than literal black —
// black/dark tones are reserved for text.
function DeptStatusDot({ T, state, size = 15, interactive, onHover, onLeave, onClick }) {
  const c = overviewStatusColor(T, state);
  return (
    <div
      title={state.replace(/_/g, " ")}
      onMouseEnter={interactive ? onHover : undefined}
      onMouseLeave={interactive ? onLeave : undefined}
      onClick={
        interactive
          ? (e) => {
              e.stopPropagation();
              onClick(e);
            }
          : undefined
      }
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: c.bg,
        border: `1.5px solid ${c.border}`,
        margin: "0 auto",
        cursor: interactive ? "pointer" : "default",
      }}
    />
  );
}

function WorkshopPreviewPopover({ T, vehicle, deptHistory, type }) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        boxShadow: T.shadowLg,
        padding: 16,
        width: 260,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 800,
          color: T.text,
          paddingBottom: 10,
          marginBottom: 12,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        {vehicle.vehicle_number}
        <span
          style={{
            fontWeight: 600,
            fontFamily: "inherit",
            color: T.textMuted,
            fontSize: 11,
            marginLeft: 8,
            textTransform: "uppercase",
            letterSpacing: "0.4px",
          }}
        >
          Workshop
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        {OVERVIEW_WORKSHOP_DEPTS.map((d) => {
          const state = getOverviewDeptState(vehicle, d.key);
          const hist = deptHistory?.[vehicle.id]?.[d.key];
          return (
            <div
              key={d.key}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}
            >
              {type === "time" ? (
                <div style={{ fontSize: 9, color: T.textSecondary, textAlign: "center" }}>
                  {hist?.start ? formatIST(hist.start) : "—"}
                  {hist?.end ? ` → ${formatIST(hist.end)}` : ""}
                </div>
              ) : (
                <DeptStatusDot T={T} state={state} />
              )}
              <span style={{ fontSize: 9, color: T.textSecondary, textAlign: "center" }}>
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const overviewPopSectionLabel = (T) => ({
  fontSize: 10,
  fontWeight: 800,
  color: T.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.4px",
  marginBottom: 6,
});

const OverviewPopField = ({ T, label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11.5, marginBottom: 6 }}>
    <span style={{ color: T.textMuted, fontWeight: 600, whiteSpace: "nowrap" }}>{label}</span>
    <span style={{ color: T.text, fontWeight: 700, textAlign: "right" }}>{value}</span>
  </div>
);

const OverviewPopHeader = ({ T, vehicle, title }) => (
  <div
    style={{
      fontSize: 13,
      fontWeight: 800,
      color: T.text,
      paddingBottom: 10,
      marginBottom: 12,
      borderBottom: `1px solid ${T.border}`,
    }}
  >
    {vehicle.vehicle_number}
    <span
      style={{
        fontWeight: 600,
        fontFamily: "inherit",
        color: T.textMuted,
        fontSize: 11,
        marginLeft: 8,
        textTransform: "uppercase",
        letterSpacing: "0.4px",
      }}
    >
      {title}
    </span>
  </div>
);

// work_stages has one {dept}_team_id column per department (confirmed
// against the same pattern FloorTab already uses) — resolves it to a team
// name via the `teams` list, or null if that department has no team
// assignment concept (or none assigned yet).
const overviewTeamNameForDept = (teams, vehicle, deptKey) => {
  const teamId = vehicle.work_stages?.[0]?.[`${deptKey}_team_id`];
  if (!teamId) return null;
  return teams?.find((t) => t.id === teamId)?.name || null;
};

// Shared field list for a single department's detail — used by both the
// hover tooltip and the click-pinned popover so hovering one dept dot now
// shows the same real detail (team, assigned/started/completed, work list,
// and — when the work list was touched again after the initial assignment —
// a "Work Added" timestamp) instead of a shallow hover + rich click split.
// "Added work" can only say WHEN the list was updated again, not which items
// changed — vehicle_history's work_assigned event records which departments
// were touched, not a diff of the work items themselves.
function OverviewDeptDetailFields({ T, vehicle, stageKey, deptHistory, deptDetails, workAssignedHistory, teams }) {
  const state = getOverviewDeptState(vehicle, stageKey);
  const hist = deptHistory?.[vehicle.id]?.[stageKey];
  const details = deptDetails?.[vehicle.id]?.[stageKey];
  const team = overviewTeamNameForDept(teams, vehicle, stageKey);
  const wa = workAssignedHistory?.[vehicle.id];
  const assignedTime = wa?.depts?.has(stageKey) ? wa.time : null;
  const deptEvents = (wa?.events || []).filter((ev) => ev.depts.has(stageKey));
  const addedAt = deptEvents.length > 1 ? deptEvents[deptEvents.length - 1].time : null;

  return (
    <>
      <OverviewPopField T={T} label="Status" value={state.replace(/_/g, " ")} />
      {team && <OverviewPopField T={T} label="Team" value={team} />}
      <OverviewPopField T={T} label="Assigned" value={formatIST(assignedTime)} />
      <OverviewPopField T={T} label="Started" value={formatIST(hist?.start)} />
      {addedAt && <OverviewPopField T={T} label="Work Added" value={formatIST(addedAt)} />}
      <OverviewPopField T={T} label="Completed" value={formatIST(hist?.end)} />
      {details?.workItems?.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={overviewPopSectionLabel(T)}>{state === "completed" ? "Work Completed" : "Work Assigned"}</div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, color: T.textSecondary }}>
            {details.workItems.map((w, i) => (
              <li key={i} style={{ marginBottom: 3 }}>
                {typeof w === "string" ? w.replace(/_/g, " ") : JSON.stringify(w)}
              </li>
            ))}
          </ul>
        </div>
      )}
      {details?.notes && (
        <div style={{ marginTop: 10, fontSize: 11.5, color: T.textSecondary, fontStyle: "italic" }}>
          "{details.notes}"
        </div>
      )}
      {state === "not_assigned" && !details?.workItems?.length && (
        <div style={{ fontSize: 11.5, color: T.textMuted, fontStyle: "italic" }}>Not required for this vehicle</div>
      )}
    </>
  );
}

// One popover for every dot in the timeline, not just Workshop — what it
// shows depends on which stage (or, in Workshop-view, which department) was
// clicked. `isDept` distinguishes a department-column dot (Workshop-view
// table) from an overall flow-stage dot (Overall-view table); the same
// vehicle+stageKey pairing can mean either depending on which table view
// triggered it.
function StagePreviewPopover({ T, vehicle, stageKey, isDept, deptHistory, deptDetails, workAssignedHistory, teams }) {
  const wrapStyle = {
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: 12,
    boxShadow: T.shadowLg,
    padding: 16,
    width: 300,
    maxHeight: 340,
    overflowY: "auto",
  };
  const stopClick = (e) => e.stopPropagation();

  if (isDept && stageKey === OVERVIEW_ALL_DEPTS_KEY) {
    return (
      <div style={wrapStyle} onClick={stopClick}>
        <OverviewPopHeader T={T} vehicle={vehicle} title="All Departments" />
        {OVERVIEW_WORKSHOP_DEPTS.map((d) => {
          const state = getOverviewDeptState(vehicle, d.key);
          const team = overviewTeamNameForDept(teams, vehicle, d.key);
          return (
            <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: overviewStatusColor(T, state).bg,
                  border: "1px solid rgba(22,31,56,.14)",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 12.5, color: T.text, fontWeight: 600, flex: 1 }}>{d.label}</span>
              {team && <span style={{ fontSize: 11, color: T.textMuted }}>👥 {team}</span>}
              <span style={{ fontSize: 12.5, color: T.textSecondary, minWidth: 78, textAlign: "right" }}>
                {OVERVIEW_DEPT_STATE_LABEL[state]}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  if (isDept) {
    const dm = OVERVIEW_WORKSHOP_DEPTS.find((d) => d.key === stageKey);
    return (
      <div style={wrapStyle} onClick={stopClick}>
        <OverviewPopHeader T={T} vehicle={vehicle} title={dm?.label || stageKey} />
        <OverviewDeptDetailFields
          T={T}
          vehicle={vehicle}
          stageKey={stageKey}
          deptHistory={deptHistory}
          deptDetails={deptDetails}
          workAssignedHistory={workAssignedHistory}
          teams={teams}
        />
      </div>
    );
  }

  switch (stageKey) {
    case "entry":
      return (
        <div style={wrapStyle} onClick={stopClick}>
          <OverviewPopHeader T={T} vehicle={vehicle} title="Entry" />
          <OverviewPopField T={T} label="Entry Time" value={formatIST(vehicle.entry_time)} />
          <OverviewPopField T={T} label="Model" value={vehicle.model || "—"} />
          <OverviewPopField T={T} label="Customer" value={vehicle.customer_name || "—"} />
          <OverviewPopField T={T} label="Phone" value={vehicle.customer_phone || "—"} />
          <OverviewPopField
            T={T}
            label="Odometer"
            value={vehicle.odometer_reading ? `${Number(vehicle.odometer_reading).toLocaleString("en-IN")} km` : "—"}
          />
        </div>
      );
    case "front_checkup": {
      const complaints = [...(vehicle.customer_complaints || [])].sort(
        (a, b) => (a.complaint_number || 0) - (b.complaint_number || 0),
      );
      const fcTime =
        deptHistory?.[vehicle.id]?.front_checkup?.end ||
        vehicle.job_card_completed_at ||
        vehicle.fc_skipped_at ||
        vehicle.fc_cancelled_at;
      return (
        <div style={wrapStyle} onClick={stopClick}>
          <OverviewPopHeader T={T} vehicle={vehicle} title="Front Checkup" />
          <OverviewPopField
            T={T}
            label={vehicle.fc_skipped_at ? "Skipped At" : "Completed"}
            value={formatIST(fcTime)}
          />
          {complaints.length > 0 ? (
            <div style={{ marginTop: 10 }}>
              <div style={overviewPopSectionLabel(T)}>Work Noted</div>
              {complaints.map((c, i) => (
                <div key={c.id} style={{ fontSize: 11.5, color: T.textSecondary, marginBottom: 4 }}>
                  <b style={{ color: T.text }}>Work {c.complaint_number || i + 1}:</b> {c.complaint_text}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 11.5, color: T.textMuted, fontStyle: "italic", marginTop: 8 }}>No complaints noted</div>
          )}
        </div>
      );
    }
    case "advisor":
      return (
        <div style={wrapStyle} onClick={stopClick}>
          <OverviewPopHeader T={T} vehicle={vehicle} title="Advisor" />
          <OverviewPopField T={T} label="Advisor" value={vehicle.advisor?.full_name || "—"} />
          <OverviewPopField T={T} label="Assigned" value={formatIST(vehicle.work_stages?.[0]?.created_at)} />
          <OverviewPopField T={T} label="Service Type" value={vehicle.service_type ? vehicle.service_type.replace(/_/g, " ") : "—"} />
        </div>
      );
    case "workshop":
      return (
        <div style={wrapStyle} onClick={stopClick}>
          <OverviewPopHeader T={T} vehicle={vehicle} title="Workshop" />
          <OverviewPopField T={T} label="Started" value={formatIST(vehicle.workshop_assigned_at)} />
          <OverviewPopField T={T} label="Completed" value={formatIST(vehicle.workshop_completed_at)} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginTop: 12 }}>
            {OVERVIEW_WORKSHOP_DEPTS.map((d) => (
              <div key={d.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <DeptStatusDot T={T} state={getOverviewDeptState(vehicle, d.key)} />
                <span style={{ fontSize: 9, color: T.textSecondary, textAlign: "center" }}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case "pdi": {
      const resolved = (vehicle.customer_complaints || []).filter((c) => c.is_resolved);
      return (
        <div style={wrapStyle} onClick={stopClick}>
          <OverviewPopHeader T={T} vehicle={vehicle} title="PDI" />
          <OverviewPopField T={T} label="Completed" value={formatIST(vehicle.pdi_completed_at)} />
          {resolved.length > 0 ? (
            <div style={{ marginTop: 10 }}>
              <div style={overviewPopSectionLabel(T)}>Resolution Notes</div>
              {resolved.map((c) => (
                <div key={c.id} style={{ fontSize: 11.5, color: T.textSecondary, marginBottom: 4 }}>
                  <b style={{ color: T.text }}>Work {c.complaint_number}:</b> {c.resolution_notes || "Resolved"}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 11.5, color: T.textMuted, fontStyle: "italic", marginTop: 8 }}>No PDI notes</div>
          )}
        </div>
      );
    }
    case "billing":
      return (
        <div style={wrapStyle} onClick={stopClick}>
          <OverviewPopHeader T={T} vehicle={vehicle} title="Billing" />
          <OverviewPopField T={T} label="Bill Generated" value={formatIST(vehicle.bill_generated_at)} />
          <OverviewPopField T={T} label="Bill Amount" value={vehicle.bill_amount ? fmt(vehicle.bill_amount) : "—"} />
          {vehicle.billed_by_cashier_override && (
            <div style={{ marginTop: 6, fontSize: 10.5, fontWeight: 700, color: T.amber }}>⚡ Cashier override</div>
          )}
        </div>
      );
    case "cashier":
      return (
        <div style={wrapStyle} onClick={stopClick}>
          <OverviewPopHeader T={T} vehicle={vehicle} title="Cashier" />
          <OverviewPopField T={T} label="Payment Received" value={formatIST(vehicle.payment_received_at)} />
          <OverviewPopField T={T} label="Amount Paid" value={vehicle.total_paid ? fmt(vehicle.total_paid) : "—"} />
          <OverviewPopField
            T={T}
            label="Method"
            value={vehicle.payment_method ? vehicle.payment_method.replace(/_/g, " ") : "—"}
          />
          {parseFloat(vehicle.credit_amount) > 0 && (
            <OverviewPopField T={T} label="Credit Outstanding" value={fmt(vehicle.credit_amount)} />
          )}
        </div>
      );
    case "exit":
      return (
        <div style={wrapStyle} onClick={stopClick}>
          <OverviewPopHeader T={T} vehicle={vehicle} title="Exit" />
          <OverviewPopField T={T} label="Exited" value={formatIST(vehicle.actual_completion_time || vehicle.exit_time)} />
        </div>
      );
    default:
      return null;
  }
}

// 4-state status palette (design handoff) — one color language used by every
// dot/ring in the Overview tab: journey dots, department dots, ParallelCluster
// rings, OverviewLegend. Brighter than the old 3-state scheme, and gives
// "not assigned" (dept doesn't apply to this vehicle) its own distinct look
// instead of collapsing it into the same grey as "not started yet".
const overviewStatusColor = (T, state) => {
  switch (state) {
    case "not_assigned":
      return { bg: T.surface, border: T.statusNotAssignedBorder };
    case "in_progress":
      return { bg: T.amber, border: T.amber };
    case "completed":
      return { bg: T.green, border: T.green };
    case "not_started":
    default:
      return { bg: T.statusNotStarted, border: T.statusNotStarted };
  }
};

// Distinct 4th bucket color for "assigned today, not started yet" — separate
// from the dark-grey "not started" (backlog, any age) so the two read as
// different urgency at a glance.
const TODAY_QUEUE_COLOR = "#6b7a99";
const RING_R = 40;
const RING_CIRC = 2 * Math.PI * RING_R;
// SVG conic-style ring built from stroke-dasharray segments (real DOM SVG,
// not a CSS conic-gradient) — used by both the Workshop Departments ring and
// the Bookings ring, so both can flip/hover without repainting a gradient.
const ringSegments = (items) => {
  const total = items.reduce((s, it) => s + it.value, 0) || 1;
  let acc = 0;
  return items.map((it) => {
    const segLen = (Math.max(it.value, 0) / total) * RING_CIRC;
    const dashoffset = -acc;
    acc += segLen;
    return { ...it, dasharray: `${segLen} ${RING_CIRC - segLen}`, dashoffset };
  });
};
// Real booking status values (per CLAUDE.md: pending|confirmed|arrived|
// completed|cancelled|no_show|rescheduled) mapped to the mock's ring colors —
// "no_show" isn't in the mock's sample set, given its own slice rather than
// silently folded into "Cancelled" so it stays visible as real data.
const BOOKING_STATUS_META = {
  pending: { label: "Pending", color: "#8a8171", tint: "#f2efe8" },
  confirmed: { label: "Confirmed", color: "#c9781f", tint: "#faf1de" },
  arrived: { label: "Arrived", color: "#3a4f7a", tint: "#e9edf5" },
  completed: { label: "Completed", color: "#1fa15e", tint: "#eaf6ef" },
  rescheduled: { label: "Rescheduled", color: "#6b4a8a", tint: "#f1eaf3" },
  cancelled: { label: "Cancelled", color: "#a4452f", tint: "#f7e9e6" },
  no_show: { label: "No Show", color: "#8a5a15", tint: "#f5ecd9" },
};

// Hover shows just this — cheap (one map lookup, no complaints/work-item
// processing) — the full StagePreviewPopover above is now only ever built on
// click (popover.pinned), which was the expensive part of every hover.
const OVERVIEW_DEPT_STATE_LABEL = {
  not_assigned: "Not required",
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};
// Sentinel stageKey meaning "show every department's status at once" —
// replaces the removed Workshop-view named chips: hovering the whole
// department dot-cluster (not one dot at a time) now pops this up instead.
const OVERVIEW_ALL_DEPTS_KEY = "__all_departments__";

function QuickStageTooltip({ T, vehicle, stageKey, isDept, deptHistory, deptDetails, workAssignedHistory, teams }) {
  // Individual department dot — hover now shows the same real detail the
  // click-pinned popover used to be the only way to see (team, assigned/
  // started/completed times, work list, work-added flag), per the "I want
  // to see this on hover" ask — no more click-to-expand for one dept.
  if (isDept && stageKey !== OVERVIEW_ALL_DEPTS_KEY) {
    const dm = OVERVIEW_WORKSHOP_DEPTS.find((d) => d.key === stageKey);
    return (
      <div
        style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 10,
          boxShadow: T.shadowLg,
          padding: "10px 13px",
          width: 250,
          maxHeight: 300,
          overflowY: "auto",
        }}
      >
        <OverviewPopHeader T={T} vehicle={vehicle} title={dm?.label || stageKey} />
        <OverviewDeptDetailFields
          T={T}
          vehicle={vehicle}
          stageKey={stageKey}
          deptHistory={deptHistory}
          deptDetails={deptDetails}
          workAssignedHistory={workAssignedHistory}
          teams={teams}
        />
      </div>
    );
  }

  if (isDept && stageKey === OVERVIEW_ALL_DEPTS_KEY) {
    return (
      <div
        style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 8,
          boxShadow: T.shadowLg,
          padding: "9px 12px",
          fontSize: 11.5,
          whiteSpace: "nowrap",
        }}
      >
        <div style={{ fontWeight: 800, color: T.text, marginBottom: 5 }}>{vehicle.vehicle_number}</div>
        {OVERVIEW_WORKSHOP_DEPTS.map((d) => {
          const state = getOverviewDeptState(vehicle, d.key);
          const team = overviewTeamNameForDept(teams, vehicle, d.key);
          return (
            <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: overviewStatusColor(T, state).bg,
                  border: "1px solid rgba(22,31,56,.14)",
                  flexShrink: 0,
                }}
              />
              <span style={{ color: T.textSecondary, flex: 1 }}>{d.label}</span>
              {team && <span style={{ color: T.textMuted }}>👥 {team}</span>}
              <span style={{ color: T.textMuted, minWidth: 68, textAlign: "right" }}>
                {OVERVIEW_DEPT_STATE_LABEL[state]}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  // Only flow-stage (non-dept) dots reach here — individual dept dots return
  // above, and the "all departments" cluster summary returned before that.
  const label = OVERVIEW_FLOW_STAGES.find((s) => s.key === stageKey)?.label || stageKey;
  const time = getOverviewFlowStage(vehicle, stageKey, deptHistory).time;
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        boxShadow: T.shadowLg,
        padding: "8px 12px",
        fontSize: 11.5,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontWeight: 800, color: T.text }}>{vehicle.vehicle_number}</span>
      <span style={{ color: T.textMuted }}> · {label}</span>
      <div style={{ color: T.textSecondary, marginTop: 2 }}>{time ? formatIST(time) : "—"}</div>
    </div>
  );
}

const OverviewLegendItem = ({ swatch, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    {swatch}
    <span>{label}</span>
  </div>
);

const OverviewLegend = ({ T, view }) => {
  return (
    <div
      style={{
        display: "flex",
        gap: 18,
        alignItems: "center",
        flexWrap: "wrap",
        fontSize: 11,
        color: T.textSecondary,
        padding: "0 2px",
        marginBottom: 10,
      }}
    >
      {view === "overall" ? (
        <>
          <OverviewLegendItem
            swatch={<div style={{ width: 14, height: 14, borderRadius: "50%", background: T.statusNotStarted }} />}
            label="Not started"
          />
          <OverviewLegendItem
            swatch={<div style={{ width: 14, height: 14, borderRadius: "50%", background: T.amber }} />}
            label="In Progress"
          />
          <OverviewLegendItem
            swatch={<div style={{ width: 14, height: 14, borderRadius: "50%", background: T.green }} />}
            label="Completed"
          />
          <OverviewLegendItem
            swatch={<div style={{ width: 14, height: 14, borderRadius: "50%", background: T.amber }} />}
            label="Front checkup skipped"
          />
        </>
      ) : view === "workshop" ? (
        <>
          <OverviewLegendItem swatch={<DeptStatusDot T={T} state="not_assigned" size={14} />} label="Not assigned" />
          <OverviewLegendItem swatch={<DeptStatusDot T={T} state="not_started" size={14} />} label="Not started" />
          <OverviewLegendItem swatch={<DeptStatusDot T={T} state="in_progress" size={14} />} label="In progress" />
          <OverviewLegendItem swatch={<DeptStatusDot T={T} state="completed" size={14} />} label="Completed" />
        </>
      ) : (
        // Unified 5-item legend for the drawer table, which shows journey
        // dots (3 states + skipped) and department dots (which can also be
        // "not assigned") side by side — no separate Workshop view anymore,
        // so one legend has to cover both columns' possible states.
        <>
          <OverviewLegendItem swatch={<DeptStatusDot T={T} state="not_assigned" size={14} />} label="Not assigned (dept)" />
          <OverviewLegendItem
            swatch={<div style={{ width: 14, height: 14, borderRadius: "50%", background: T.statusNotStarted }} />}
            label="Not started"
          />
          <OverviewLegendItem
            swatch={<div style={{ width: 14, height: 14, borderRadius: "50%", background: T.amber }} />}
            label="In Progress"
          />
          <OverviewLegendItem
            swatch={<div style={{ width: 14, height: 14, borderRadius: "50%", background: T.green }} />}
            label="Completed"
          />
          <OverviewLegendItem
            swatch={<div style={{ width: 14, height: 14, borderRadius: "50%", background: T.amber }} />}
            label="Front checkup skipped"
          />
        </>
      )}
    </div>
  );
};

const OVERVIEW_POPOVER_W = 300;
const OVERVIEW_POPOVER_H = 260;
// The hover tooltip (QuickStageTooltip) is much shorter than the full click
// popover — reserving the full popover height for it when flipping above the
// dot (not enough room below) left a large empty gap between the tooltip and
// the dot. Pass the real size being positioned instead of always assuming
// the full popover's.
const OVERVIEW_TOOLTIP_W = 220;
const OVERVIEW_TOOLTIP_H = 56;
// Module-level (not a per-render closure) so the hover/click handlers that use
// it can stay referentially stable via useCallback([]) — needed for row-level
// React.memo to actually skip re-rendering the rest of the table on hover.
const computeOverviewPopoverPos = (e, w = OVERVIEW_POPOVER_W, h = OVERVIEW_POPOVER_H) => {
  const rect = e.currentTarget.getBoundingClientRect();
  let left = rect.left;
  let top = rect.bottom + 6;
  if (left + w > window.innerWidth - 12) {
    left = window.innerWidth - w - 12;
  }
  if (top + h > window.innerHeight - 12) {
    top = rect.top - h - 6;
  }
  left = Math.max(12, left);
  top = Math.max(12, top);
  return { top, left };
};

// ─── Flow Rail (Row 2 — sequential main flow) ──────────────────────────────
// ─── Vehicle Journey (Row 2 — main flow, sequential) ───────────────────────
// A calm, always-connected pipeline line (ixigo/booking-tracker style) rather
// than a single-vehicle progress bar — with many vehicles in flight at once,
// there's no single "how far along" position to fill the line to. Instead
// each dot's color carries the live signal (green = clear, amber + pulse =
// vehicles currently waiting here), and the two numbers below every step are
// "queued now" and "cleared today" — reusing the exact same stage-index and
// per-stage timestamp logic as the table's stepper/Time view, so these
// numbers never disagree with what the table itself shows.
function istDateStr(iso) {
  return new Date(new Date(toZ(iso)).getTime() + 5.5 * 3600000).toISOString().slice(0, 10);
}
function isQueuedAtFlowCol(v, key) {
  if (key === "entry") return false;
  if (key === "cashier") return isAwaitingCashier(v);
  const seqIdx = FLOW_COL_SEQ_IDX[key];
  const vIdx = getVehicleStageIndex(v);
  if (vIdx === -1) return false;
  return seqIdx === 7 ? vIdx === 6 : vIdx === seqIdx;
}
// advisor_review is shared by both flows — a vehicle sits there before either
// a Workshop or a Body Shop advisor claims it. `bodyshop_advisor_id` really
// is unused in production (confirmed: 0 rows have it set), but there IS a
// real pre-claim routing signal: `tag_workshop` (set at gateman/front-checkup,
// before any advisor picks the vehicle up) — AdvisorDashboard.jsx already
// filters its own advisor_review queue on `v.tag_workshop !== false`, so an
// unclaimed vehicle with tag_workshop === false is real body-shop volume
// (e.g. tag_accident vehicles) that a blind default-to-workshop was silently
// folding into the Workshop count, showing Body Shop's Advisor stage as 0
// even when accident vehicles were sitting there unclaimed. Once an advisor
// actually claims it, their role is definitive and wins over the tag.
const overviewIsWorkshopAdvisor = (v) => {
  if (v.advisor?.role === "body_shop_advisor") return false;
  if (v.advisor?.role === "advisor") return true;
  return v.tag_workshop !== false;
};
const overviewIsBodyshopAdvisor = (v) => {
  if (v.advisor?.role === "body_shop_advisor") return true;
  if (v.advisor?.role === "advisor") return false;
  return v.tag_workshop === false;
};

// Single-color (gold ring / navy text) nodes throughout — no longer
// status-coded by live/done, per the royal redesign's update log. The
// headline number is how many vehicles are AT that stage right now (not a
// done-today count); clicking any node — including Entry and the renamed
// "Delivery" endpoint — opens the drawer filtered to that stage.
function VehicleJourneyTracker({ T, vehicles, activeFilter, onSelect, mode }) {
  const isBodyshop = mode === "bodyshop";

  const today = todayISTDateStr();
  // Neither "Entry" nor "Exit" is a real queueable current_stage (a vehicle's
  // current_stage is already "front_checkup" the instant it's created — there
  // is no distinct "sitting at entry" state, and "completed" is terminal, not
  // a queue) — isQueuedAtFlowCol correctly returns false/never-matches for
  // both, which is why these two endpoints used to show 0. What's actually
  // meaningful at these two endpoints is throughput: how many vehicles
  // checked in / were gate-exited today — the same numbers already shown by
  // the "Check-ins Today" / "Deliveries Today" stat cards, reused here so
  // the two counts can never disagree.
  const todayEntryCount = vehicles.filter(
    (v) => v.entry_time && istDateStr(v.entry_time) === today,
  ).length;
  const todayExitCount = vehicles.filter(
    (v) => v.current_stage === "completed" && istDateStr(v.updated_at || v.entry_time) === today,
  ).length;

  const stepStats = isBodyshop
    ? [
        // Mirrors the shared advisor_review stage, filtered to the
        // Body Shop Advisor side — the Body Shop flow's own lead-in before
        // Pre-Quotation, same stage the Workshop flow's "Advisor" node
        // now excludes.
        {
          key: "advisor",
          label: "Advisor Review",
          queued: vehicles.filter((v) => v.current_stage === "advisor_review" && overviewIsBodyshopAdvisor(v)).length,
          ftype: "bodyshop",
          filterKey: "advisor",
          filterLabel: "Advisor Review",
        },
        ...OVERVIEW_BODYSHOP_STAGES.map((s) => ({
          ...s,
          queued: vehicles.filter((v) => v.current_stage === "bodyshop_processing" && v.bodyshop_stage === s.key).length,
          ftype: "bodyshop",
          filterKey: s.key,
          filterLabel: s.label,
        })),
      ]
    : [
        ...OVERVIEW_FLOW_STAGES.map((s) =>
          s.key === "entry"
            ? { ...s, queued: todayEntryCount, ftype: "stat", filterKey: "today", filterLabel: "Today's Check‑ins" }
            : {
                ...s,
                queued: vehicles.filter(
                  (v) => isQueuedAtFlowCol(v, s.key) && (s.key !== "advisor" || overviewIsWorkshopAdvisor(v)),
                ).length,
                ftype: "flow",
                filterKey: s.key,
                filterLabel: s.label,
              },
        ),
        // Real gate-exit endpoint — separate from "Ready for Delivery" above,
        // which is vehicles still WAITING to be exited. This is vehicles the
        // gateman has actually processed out today (current_stage advances
        // ready_for_exit -> completed at the moment of exit; confirmed
        // against vehicle_history's "vehicle_exited" gateman action, whose
        // timestamps match vehicles.updated_at to the second).
        { key: "gate_exit", label: "Exit", queued: todayExitCount, ftype: "stat", filterKey: "exitToday", filterLabel: "Vehicles Delivered" },
      ];
  // Once a drawer is open, the main content column shrinks to ~1/3 width —
  // 7 nodes in a row would get crushed. Switch to a vertical list instead,
  // same pattern as the Snapshot section's activeFilter-driven column stack,
  // so the table gets the horizontal (and, since this is much shorter,
  // vertical) space back.
  const compact = !!activeFilter;

  return (
    <div style={{ borderBottom: `1px solid ${T.border}`, paddingBottom: 6, marginBottom: 6 }}>
      {compact ? (
        // Narrow drawer-open column: a plain list. Vertical order alone
        // already reads as a sequence — no rail/marker needed here.
        <div style={{ display: "flex", flexDirection: "column" }}>
          {stepStats.map((s) => {
            const isActive = activeFilter?.type === s.ftype && activeFilter.key === s.filterKey;
            return (
              <div
                key={s.key}
                onClick={() => onSelect(s.ftype, s.filterKey, s.filterLabel)}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  cursor: "pointer",
                  borderRadius: 8,
                  padding: "6px 7px",
                  background: isActive ? T.accentBg : "transparent",
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: isActive ? T.accent : T.text,
                    minWidth: 22,
                  }}
                >
                  {s.queued}
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: isActive ? T.accent : T.text, flex: 1 }}>
                  {s.label}
                </div>
                {!isBodyshop && s.key === "workshop" && (
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.accent }}>▾</div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // Full-width: numbers-only "timeline" — one thin baseline rule under
        // the whole row (a subway-map line, no station dots) carries the
        // sense of sequence instead of circles/arrows; the active node gets
        // a short tick on the line rather than a filled marker.
        <div style={{ paddingTop: 4 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", paddingBottom: 10 }}>
            {stepStats.map((s, i) => {
              const isActive = activeFilter?.type === s.ftype && activeFilter.key === s.filterKey;
              return (
                <Fragment key={s.key}>
                  {i > 0 && (
                    <div style={{ flexShrink: 0, fontSize: 20, fontWeight: 700, color: T.textSecondary, lineHeight: "24px" }}>→</div>
                  )}
                  <div
                    onClick={() => onSelect(s.ftype, s.filterKey, s.filterLabel)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      flex: 1,
                      minWidth: 0,
                      cursor: "pointer",
                      padding: "0 2px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 700,
                        lineHeight: 1,
                        color: isActive ? T.accent : T.text,
                      }}
                    >
                      {s.queued}
                    </div>
                    <div
                      style={{
                        width: isActive ? 86 : 74,
                        height: 3,
                        borderRadius: 1.5,
                        background: isActive ? T.accent : T.textMuted,
                        marginTop: 7,
                        transition: "width .12s,background .12s",
                      }}
                    />
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: isActive ? T.accent : T.text,
                        textAlign: "center",
                        marginTop: isActive ? 5 : 7,
                        lineHeight: 1.25,
                      }}
                    >
                      {s.label}
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </div>
          <div style={{ marginLeft: "1%", marginRight: "1%", height: 1, background: T.border }} />
        </div>
      )}
    </div>
  );
}

// ─── Parallel Cluster (Row 3 — workshop departments) ───────────────────────
// 4-bucket ring (Pending Queue / Today's Queue / In Progress / Completed) —
// "Today's Queue" needs a real assignment timestamp per department, which
// isn't a column anywhere; it's derived from vehicle_history's work_assigned
// event (logged once per Assign Work submission, new_value lists which depts
// were included) via workAssignedHistory, keyed to the LATEST such event per
// vehicle. A dept counts as "assigned today" only if that latest event both
// includes this dept and happened today — so a vehicle that arrived days ago
// but was only just assigned to this dept today correctly shows as today's
// queue, not stale backlog.
function ParallelCluster({ T, vehicles, activeFilter, deptHistory, workAssignedHistory, onSelect }) {
  const today = todayISTDateStr();
  // Same reasoning as VehicleJourneyTracker: once a drawer is open the main
  // column is too narrow for a 7-across grid, so switch to a vertical list.
  const compact = !!activeFilter;

  const deptData = OVERVIEW_WORKSHOP_DEPTS.map((d) => {
    let pendingQueue = 0;
    let todayQueue = 0;
    let inProgress = 0;
    let done = 0;
    vehicles.forEach((v) => {
      const state = getOverviewDeptState(v, d.key);
      if (state === "not_assigned") return;
      if (state === "not_started") {
        const wa = workAssignedHistory?.[v.id];
        const assignedToday = wa?.depts?.has(d.key) && wa.time && istDateStr(wa.time) === today;
        if (assignedToday) todayQueue += 1;
        else pendingQueue += 1;
      } else if (state === "in_progress") {
        inProgress += 1;
      } else if (state === "completed") {
        const end = deptHistory?.[v.id]?.[d.key]?.end;
        if (end && istDateStr(end) === today) done += 1;
      }
    });
    const activeCount = pendingQueue + todayQueue + inProgress;
    const segs = ringSegments([
      { color: T.statusNotStarted, value: pendingQueue },
      { color: TODAY_QUEUE_COLOR, value: todayQueue },
      { color: T.amber, value: inProgress },
      { color: T.green, value: done },
    ]);
    const legend = [
      { label: "Pending Queue", count: pendingQueue, color: T.statusNotStarted },
      { label: "Today's Queue", count: todayQueue, color: TODAY_QUEUE_COLOR },
      { label: "In Progress", count: inProgress, color: T.amber },
      { label: "Completed", count: done, color: T.green },
    ];
    return {
      d,
      pendingQueue,
      todayQueue,
      inProgress,
      done,
      activeCount,
      segs,
      legend,
      isActive: activeFilter?.type === "dept" && activeFilter.key === d.key,
      tooltip: `${d.label} — Pending Queue: ${pendingQueue} · Today's Queue: ${todayQueue} · In Progress: ${inProgress} · Completed: ${done}`,
    };
  });

  return (
    <div style={{ borderBottom: `1px solid ${T.border}`, paddingBottom: 6, marginBottom: 6 }}>
      {compact ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {deptData.map(({ d, activeCount, done, segs, isActive, tooltip }) => (
            <div
              key={d.key}
              title={tooltip}
              onClick={() => onSelect(d.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
                borderRadius: 10,
                padding: "5px 6px",
                background: isActive ? T.accentBg : "transparent",
              }}
            >
              <div style={{ width: 36, height: 36, position: "relative", flexShrink: 0 }}>
                <svg width="36" height="36" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
                  {segs.map((seg, i) => (
                    <circle
                      key={i}
                      cx="50"
                      cy="50"
                      r={RING_R}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={14}
                      strokeDasharray={seg.dasharray}
                      strokeDashoffset={seg.dashoffset}
                    />
                  ))}
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{activeCount}</div>
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: T.text, flex: 1 }}>{d.label}</div>
              <div style={{ fontSize: 11, color: T.textSecondary, fontWeight: 600 }}>{done} done</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${OVERVIEW_WORKSHOP_DEPTS.length}, 1fr)`, gap: 12 }}>
          {deptData.map(({ d, activeCount, segs, legend, isActive, tooltip }) => (
            <div
              key={d.key}
              title={tooltip}
              onClick={() => onSelect(d.key)}
              style={{ cursor: "pointer", perspective: 600, height: 100 }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  transformStyle: "preserve-3d",
                  transition: "transform .5s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "rotateY(180deg)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "rotateY(0deg)")}
              >
                {/* Front — ring + active count */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backfaceVisibility: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 5,
                    borderRadius: 10,
                    padding: "6px 4px",
                    background: isActive ? T.accentBg : "transparent",
                  }}
                >
                  <div style={{ width: 52, height: 52, position: "relative" }}>
                    <svg width="52" height="52" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
                      {segs.map((seg, i) => (
                        <circle
                          key={i}
                          cx="50"
                          cy="50"
                          r={RING_R}
                          fill="none"
                          stroke={seg.color}
                          strokeWidth={11}
                          strokeDasharray={seg.dasharray}
                          strokeDashoffset={seg.dashoffset}
                        />
                      ))}
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{activeCount}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text, textAlign: "center" }}>{d.label}</div>
                </div>
                {/* Back — color-keyed legend with counts */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: 10,
                    padding: "9px 8px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    gap: 5,
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text, textAlign: "center", marginBottom: 2 }}>
                    {d.label}
                  </div>
                  {legend.map((lg) => (
                    <div key={lg.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: T.textSecondary }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: lg.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontWeight: 600 }}>{lg.label}</span>
                      <span style={{ fontWeight: 700, color: T.text }}>{lg.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Advisor & Team Workload ────────────────────────────────────────────────
const ADVISOR_ROLE_LABELS = { advisor: "Workshop Advisor", body_shop_advisor: "Body Shop Advisor" };
const TEAM_ROLE_LABELS = { mechanic: "Mechanic", electrician: "Electrician", denter: "Denter" };
// whiteSpace/flexShrink prevent the pill's text wrapping into 2-3 lines when
// its parent row is squeezed narrow (e.g. the workload column shrinks to
// ~300px once a drawer is open) — a flex child otherwise shrinks below its
// text's natural width before wrapping the text itself.
const WORKLOAD_SEGMENT_STYLE = (T, active) => ({
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
  flexShrink: 0,
  background: active ? T.text : T.surface,
  color: active ? T.accentBg : T.textSecondary,
});

function AdvisorTeamWorkload({ T, vehicles, teams, activeFilter, onSelectAdvisor, onSelectTeam }) {
  const [advisorRole, setAdvisorRole] = useState("advisor");
  const [teamRole, setTeamRole] = useState("mechanic");

  // Which journey stage a vehicle is queued at right now — reuses the same
  // exclusive stage-index model the table/journey tracker already use, so
  // these counts can never disagree with what's shown elsewhere.
  const currentStageKey = (v) => OVERVIEW_FLOW_STAGES.find((s) => isQueuedAtFlowCol(v, s.key))?.key || null;

  const advisorVehicles = useMemo(
    () => vehicles.filter((v) => v.advisor?.role === advisorRole || (!v.advisor?.role && advisorRole === "advisor")),
    [vehicles, advisorRole],
  );
  const advisorNames = useMemo(
    () => [...new Set(advisorVehicles.filter((v) => v.advisor?.full_name).map((v) => v.advisor.full_name))],
    [advisorVehicles],
  );
  const advisorWorkload = useMemo(
    () =>
      advisorNames
        .map((name) => {
          const advVehicles = advisorVehicles.filter((v) => v.advisor?.full_name === name);
          const bucket = (key) => advVehicles.filter((v) => currentStageKey(v) === key).length;
          const readyForDelivery = advVehicles.filter((v) => v.current_stage === "ready_for_exit").length;
          const cols = [
            { label: "Workshop", count: bucket("workshop") },
            { label: "PDI", count: bucket("pdi") },
            { label: "Billing", count: bucket("billing") },
            { label: "Cashier", count: bucket("cashier") },
            { label: "Ready for Delivery", count: readyForDelivery },
          ];
          return { name, count: advVehicles.length, cols };
        })
        .sort((a, b) => b.count - a.count),
    [advisorVehicles, advisorNames],
  );

  const teamList = useMemo(() => teams.filter((t) => t.role === teamRole), [teams, teamRole]);
  // Not date-gated like ParallelCluster's "done today" — `vehicles` here is
  // already scoped to active + today's entries by the main fetch, so this
  // reads as "recently completed, still in the system" without needing a
  // second date filter on top.
  const teamWorkload = useMemo(
    () =>
      teamList.map((team) => {
        const teamVehicles = vehicles.filter((v) => v.work_stages?.[0]?.[`${team.role}_team_id`] === team.id);
        let pendingQueue = 0;
        let inProgress = 0;
        let done = 0;
        teamVehicles.forEach((v) => {
          const state = getOverviewDeptState(v, team.role);
          if (state === "not_started") pendingQueue += 1;
          else if (state === "in_progress") inProgress += 1;
          else if (state === "completed") done += 1;
        });
        const cols = [
          { label: "Pending Queue", count: pendingQueue },
          { label: "In Progress", count: inProgress },
          { label: "Completed", count: done },
        ];
        return { id: team.id, name: team.name, count: pendingQueue + inProgress + done, cols };
      }),
    [teamList, vehicles],
  );

  const advisorCols = ["Workshop", "PDI", "Billing", "Cashier", "Ready for Delivery"];
  const teamCols = ["Pending Queue", "In Progress", "Completed"];

  return (
    <div>
      <div style={{ display: "flex", gap: 44, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 300px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, maxWidth: 420, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>By Advisor</div>
            <div style={{ display: "flex", border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
              {Object.entries(ADVISOR_ROLE_LABELS).map(([r, label]) => (
                <div key={r} onClick={() => setAdvisorRole(r)} style={WORKLOAD_SEGMENT_STYLE(T, advisorRole === r)}>
                  {label}
                </div>
              ))}
            </div>
          </div>
          <div style={{ maxWidth: 560, overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.3fr repeat(5,.85fr) .6fr", columnGap: 8, padding: "0 0 8px", borderBottom: `2px solid ${T.text}` }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: T.textMuted, textTransform: "uppercase" }}>Advisor</div>
              {advisorCols.map((c) => (
                <div key={c} style={{ fontSize: 10.5, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", textAlign: "center" }}>
                  {c}
                </div>
              ))}
              <div style={{ fontSize: 10.5, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", textAlign: "center" }}>Total</div>
            </div>
            {advisorWorkload.map((a) => {
              const isActive = activeFilter?.type === "advisor" && activeFilter.key === a.name;
              return (
                <div
                  key={a.name}
                  onClick={() => onSelectAdvisor(a.name)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.3fr repeat(5,.85fr) .6fr",
                    columnGap: 8,
                    padding: "9px 0",
                    borderBottom: `1px solid ${T.border}`,
                    alignItems: "center",
                    cursor: "pointer",
                    background: isActive ? T.accentBg : "transparent",
                  }}
                >
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>{a.name}</div>
                  {a.cols.map((c) => (
                    <div key={c.label} style={{ fontSize: 13.5, textAlign: "center", color: T.textSecondary }}>
                      {c.count}
                    </div>
                  ))}
                  <div style={{ fontSize: 14.5, fontWeight: 700, textAlign: "center", color: T.text }}>{a.count}</div>
                </div>
              );
            })}
            {advisorWorkload.length === 0 && (
              <div style={{ padding: "16px 0", fontSize: 12.5, color: T.textMuted }}>No {ADVISOR_ROLE_LABELS[advisorRole].toLowerCase()}s with active vehicles.</div>
            )}
          </div>
        </div>
        <div style={{ flex: "1 1 300px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, maxWidth: 420, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>By Team Leader</div>
            <div style={{ display: "flex", border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
              {Object.entries(TEAM_ROLE_LABELS).map(([r, label]) => (
                <div key={r} onClick={() => setTeamRole(r)} style={WORKLOAD_SEGMENT_STYLE(T, teamRole === r)}>
                  {label}
                </div>
              ))}
            </div>
          </div>
          <div style={{ maxWidth: 560, overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.3fr repeat(3,.9fr) .6fr", columnGap: 8, padding: "0 0 8px", borderBottom: `2px solid ${T.text}` }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: T.textMuted, textTransform: "uppercase" }}>Team</div>
              {teamCols.map((c) => (
                <div key={c} style={{ fontSize: 10.5, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", textAlign: "center" }}>
                  {c}
                </div>
              ))}
              <div style={{ fontSize: 10.5, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", textAlign: "center" }}>Total</div>
            </div>
            {teamWorkload.map((t) => {
              const isActive = activeFilter?.type === "team" && activeFilter.key === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => onSelectTeam(t)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.3fr repeat(3,.9fr) .6fr",
                    columnGap: 8,
                    padding: "9px 0",
                    borderBottom: `1px solid ${T.border}`,
                    alignItems: "center",
                    cursor: "pointer",
                    background: isActive ? T.accentBg : "transparent",
                  }}
                >
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>{t.name}</div>
                  {t.cols.map((c) => (
                    <div key={c.label} style={{ fontSize: 13.5, textAlign: "center", color: T.textSecondary }}>
                      {c.count}
                    </div>
                  ))}
                  <div style={{ fontSize: 14.5, fontWeight: 700, textAlign: "center", color: T.text }}>{t.count}</div>
                </div>
              );
            })}
            {teamWorkload.length === 0 && (
              <div style={{ padding: "16px 0", fontSize: 12.5, color: T.textMuted }}>No {TEAM_ROLE_LABELS[teamRole].toLowerCase()} teams configured.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Today's Bookings vs Arrivals ───────────────────────────────────────────
const todayISTDateStr = () => new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
const BOOKING_DAY_OFFSETS = [
  { key: -1, label: "Yesterday" },
  { key: 0, label: "Today" },
  { key: 1, label: "Tomorrow" },
  { key: 2, label: "Day After" },
];

// Single ring + ‹ Today › day switcher, cycling real bookings by preferred_date
// — replaces the old side-by-side Today/Tomorrow number strip. Small (ring
// size 64) when a drawer is open and the panel has to share width, full size
// otherwise, matching the mock's activeFilter-driven resize.
// Shop's effective "day over" cutoff for bookings — 6:30 PM IST. Before this
// (on today), a not-yet-arrived booking is still genuinely "Expected"; once
// the day has closed (today past cutoff, or any earlier day), that same
// count is relabeled "No Show" instead — it stays in the ring the whole
// time, same segment, just changes what it's called and colored once the
// day's over (No Show doesn't move down into the Cancelled tile).
const BOOKING_DAY_CUTOFF_HOUR = 18;
const BOOKING_DAY_CUTOFF_MINUTE = 30;
function isBookingDayClosed(dayDate, todayStr) {
  if (dayDate < todayStr) return true;
  if (dayDate > todayStr) return false;
  const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  return (
    nowIST.getHours() > BOOKING_DAY_CUTOFF_HOUR ||
    (nowIST.getHours() === BOOKING_DAY_CUTOFF_HOUR && nowIST.getMinutes() >= BOOKING_DAY_CUTOFF_MINUTE)
  );
}

const BOOKING_RING_META = {
  checkins: { label: "Check-ins", color: "#1fa15e", tint: "#eaf6ef" },
  expected: { label: "Expected", color: "#c9781f", tint: "#faf1de" },
  noshow: { label: "No Show", color: "#8a5a15", tint: "#f5ecd9" },
};

function BookingsRingPanel({ T, bookings, compact, dayIdx }) {
  const [hoverStatus, setHoverStatus] = useState(null);
  const todayStr = todayISTDateStr();
  const dateFor = (offset) => {
    const d = new Date(new Date(todayStr).getTime() + offset * 86400000);
    return d.toISOString().slice(0, 10);
  };
  const dayDate = dateFor(BOOKING_DAY_OFFSETS[dayIdx].key);
  const dayBookings = useMemo(
    () => bookings.filter((b) => b.preferred_date === dayDate),
    [bookings, dayDate],
  );
  const counts = useMemo(() => {
    const c = {};
    Object.keys(BOOKING_STATUS_META).forEach((k) => (c[k] = 0));
    dayBookings.forEach((b) => {
      if (c[b.status] !== undefined) c[b.status] += 1;
    });
    return c;
  }, [dayBookings]);

  const dayClosed = isBookingDayClosed(dayDate, todayStr);
  const checkins = counts.arrived + counts.completed;
  // Second ring segment is the same count the whole time (pending + confirmed
  // + anything already explicitly marked no_show) — it never leaves the
  // ring, it just relabels from "Expected" to "No Show" once the day closes.
  const secondBucketCount = counts.pending + counts.confirmed + counts.no_show;
  const secondBucketKey = dayClosed ? "noshow" : "expected";
  const total = checkins + secondBucketCount;
  const notAccepted = dayClosed ? 0 : counts.pending;
  const deadCount = counts.cancelled + counts.rescheduled;

  const bucketOrder = ["checkins", secondBucketKey];
  const ringBuckets = { checkins, [secondBucketKey]: secondBucketCount };
  const segs = useMemo(
    () =>
      ringSegments(
        bucketOrder
          .filter((k) => ringBuckets[k] > 0)
          .map((k) => ({ status: k, value: ringBuckets[k], color: BOOKING_RING_META[k].color })),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [checkins, secondBucketKey, secondBucketCount],
  );
  const ringSize = compact ? 40 : 108;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Ring stacked above its own legend (not beside it) so the block stays
          narrow — that's the horizontal room Not Accepted/Cancelled use to
          grow wider. The block is vertically centered and stretches with
          the card, so it fills the same height the card already had. */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ width: ringSize, height: ringSize, position: "relative", flexShrink: 0 }}>
            <svg width={ringSize} height={ringSize} viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
              {segs.map((seg) => (
                <circle
                  key={seg.status}
                  cx="50"
                  cy="50"
                  r={RING_R}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={hoverStatus === seg.status ? 16 : 13}
                  strokeDasharray={seg.dasharray}
                  strokeDashoffset={seg.dashoffset}
                  style={{ opacity: hoverStatus && hoverStatus !== seg.status ? 0.45 : 1, cursor: "pointer", transition: "stroke-width .12s,opacity .12s" }}
                  onMouseEnter={() => setHoverStatus(seg.status)}
                  onMouseLeave={() => setHoverStatus(null)}
                />
              ))}
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ fontSize: compact ? 12 : 22, fontWeight: 700, color: T.text }}>{total}</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
            {bucketOrder.map((k) => {
              const meta = BOOKING_RING_META[k];
              return (
                <div
                  key={k}
                  onMouseEnter={() => setHoverStatus(k)}
                  onMouseLeave={() => setHoverStatus(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    color: T.textSecondary,
                    padding: "4px 5px",
                    borderRadius: 6,
                    cursor: "pointer",
                    transition: "background .1s,transform .1s",
                    background: hoverStatus === k ? meta.tint : "transparent",
                    transform: hoverStatus === k ? "scale(1.05)" : "scale(1)",
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta.label}</span>
                  <b style={{ fontSize: 15, color: T.text, fontWeight: 700 }}>{ringBuckets[k]}</b>
                </div>
              );
            })}
          </div>
        </div>

        {/* Same FilterCard component the At a Glance cards use, so the number
            styling can never drift out of sync — flagged red since both are
            "needs attention" numbers. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minWidth: 0 }}>
          <FilterCard T={T} label="Not Accepted" value={notAccepted} danger />
          <FilterCard T={T} label="Cancelled" value={deadCount} danger />
        </div>
      </div>
    </div>
  );
}

// Extracted + memoized so a hover-triggered popover state change in the parent
// (OverviewTab) doesn't force React to re-run every row's render body — only
// the small popover portal at the bottom needs to update. Before this, every
// mouse-move across the table re-rendered all 50+ rows, which is what made
// hovering feel laggy. Props are all referentially stable across a hover
// (same array/object/Map references, and handleDotHover/Leave/Click are
// useCallback([])-stabilized), so React.memo's default shallow comparison
// correctly skips re-rendering rows the hover didn't touch.
// Exact fr-ratio column layout from the design mock's drawer table (a CSS
// grid of divs, not an HTML <table> — the mock never uses <table>/<th>/<td>).
const OVERVIEW_TABLE_GRID_COLS = "1.4fr 1.2fr 1fr 1.5fr 1.5fr .8fr .8fr";

// Click-to-expand (not hover) for the department dot cluster — the main-row
// dots themselves show nothing on hover or click beyond a pointer cursor;
// clicking the cluster toggles a real `isExpanded` prop (owned by OverviewTab,
// see expandedDeptVehicleId) that opens a full-width panel BELOW the row,
// which stays open until the cluster is clicked again or something else is
// clicked/selected (outside-click closes it — see the effect next to
// expandedDeptVehicleId). Detail on hover now lives entirely inside that
// expanded panel, not on the small dots.
const OVERVIEW_DEPT_HOVER_CSS = `
.ov-dept-expand-panel { max-height: 0; opacity: 0; overflow: hidden; transition: max-height .25s ease, opacity .2s ease; }
.ov-dept-expand-panel.is-open { max-height: 100px !important; opacity: 1 !important; }
`;

// 9px dot + uniform faint navy border, matching the mock's journeyDots/
// deptDots exactly (mock uses one flat border color for every state, not a
// per-state border like the rest of this codebase's DeptStatusDot).
const OverviewMockDot = ({ color, onHover, onLeave, onClick, title, className }) => (
  <span
    title={title}
    className={className}
    onMouseEnter={onHover}
    onMouseLeave={onLeave}
    onClick={onClick}
    style={{
      width: 9,
      height: 9,
      borderRadius: "50%",
      background: color,
      border: "1px solid rgba(22,31,56,.14)",
      cursor: onClick ? "pointer" : "default",
      flexShrink: 0,
    }}
  />
);

const OverviewVehicleRow = memo(function OverviewVehicleRow({
  T,
  v,
  teams,
  deptHistory,
  onVehiclePress,
  onDotHover,
  onDotLeave,
  onDotClick,
  isDeptExpanded,
  onToggleDeptExpand,
}) {
  const stageInfos = OVERVIEW_FLOW_STAGES.map((s) => getOverviewFlowStage(v, s.key, deptHistory));
  const firstIncompleteIdx = stageInfos.findIndex((s) => !s.done);
  const isExited = v.current_stage === "completed" || v.current_stage === "ready_for_exit";
  // Everything after Entry is done once nothing's incomplete — read the last
  // stage's own label ("Ready for Delivery") rather than hardcoding a
  // different word here, so this caption can never drift from the dots above it.
  const currentStage = firstIncompleteIdx === -1 ? OVERVIEW_FLOW_STAGES[OVERVIEW_FLOW_STAGES.length - 1] : OVERVIEW_FLOW_STAGES[firstIncompleteIdx];
  const currentStageColor = firstIncompleteIdx === -1 ? T.green : T.amber;
  const cellBase = { fontSize: 14, color: T.text };

  return (
    <div
      onMouseEnter={(e) => (e.currentTarget.style.background = T.surfaceElevated)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      style={{
        display: "grid",
        gridTemplateColumns: OVERVIEW_TABLE_GRID_COLS,
        columnGap: 14,
        padding: "15px 0",
        borderBottom: `1px solid ${T.border}`,
        alignItems: "center",
      }}
    >
      <div>
        <span
          onClick={() => onVehiclePress(v)}
          style={{ fontSize: 14.5, fontWeight: 700, color: T.text, lineHeight: 1.25, cursor: "pointer" }}
        >
          {v.vehicle_number}
        </span>
        <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 1 }}>{v.model || "—"}</div>
      </div>
      <div style={cellBase}>{v.customer_name || "—"}</div>
      <div style={cellBase}>{v.advisor?.full_name || "—"}</div>

      {/* Journey — dots, plus the vehicle's current stage named underneath so
          the row doesn't require memorizing dot-sequence order at a glance. */}
      <div>
        <div style={{ display: "flex", gap: 5 }}>
          {OVERVIEW_FLOW_STAGES.map((s, i) => {
            const info = stageInfos[i];
            const state = info.done ? "completed" : i === firstIncompleteIdx ? "in_progress" : "not_started";
            return (
              <OverviewMockDot
                key={s.key}
                title={s.label}
                color={overviewStatusColor(T, state).bg}
                onHover={(e) => onDotHover(e, v.id, s.key)}
                onLeave={onDotLeave}
                onClick={(e) => {
                  e.stopPropagation();
                  onDotClick(e, v.id, s.key);
                }}
              />
            );
          })}
        </div>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: currentStageColor, marginTop: 4 }}>{currentStage.label}</div>
      </div>

      {/* Departments — the dots themselves show nothing (no hover, no click
          detail) — clicking anywhere in the cluster just toggles the
          full-width panel below (see ov-dept-expand-panel) open/closed. It
          stays open regardless of mouse position until clicked again or
          something else is clicked/selected (outside-click handled by
          OverviewTab's expandedDeptVehicleId effect). */}
      <div
        className="ov-dept-cluster"
        onClick={() => onToggleDeptExpand(v.id)}
        style={{ display: "flex", gap: 5, flexWrap: "wrap", cursor: "pointer" }}
      >
        {OVERVIEW_WORKSHOP_DEPTS.map((d) => {
          const state = getOverviewDeptState(v, d.key);
          return <OverviewMockDot key={d.key} color={overviewStatusColor(T, state).bg} />;
        })}
      </div>

      <div style={{ fontSize: 13, color: T.textMuted }}>{formatIST(v.entry_time)}</div>
      {/* Exp. Exit — expected time (amber, red if overdue) while active, real
          exit time (green, bold) once the vehicle has actually completed. */}
      {(() => {
        if (v.current_stage === "completed") {
          const t = v.actual_completion_time || v.exit_time || v.updated_at;
          return <div style={{ fontSize: 13, color: T.green, fontWeight: 700 }}>{t ? formatIST(t) : "—"}</div>;
        }
        if (!v.expected_completion_time) {
          return <div style={{ fontSize: 13, color: T.textMuted }}>—</div>;
        }
        const overdue = !isExited && new Date(toZ(v.expected_completion_time)) < new Date();
        return (
          <div style={{ fontSize: 13, color: overdue ? T.red : T.amber, fontWeight: overdue ? 800 : 600 }}>
            {formatIST(v.expected_completion_time)}
          </div>
        );
      })()}

      {/* Full-width expand row — a sibling grid item spanning every column
          (gridColumn: "1 / -1"), opened by clicking the Departments dots
          above. Hovering a department entry HERE shows its rich detail card
          (team/times/work list) via the same popover the dots used to trigger
          directly — that's the only place department detail shows now. */}
      <div className={`ov-dept-expand-panel${isDeptExpanded ? " is-open" : ""}`} style={{ gridColumn: "1 / -1" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px 22px",
            paddingTop: 10,
            marginTop: 2,
            borderTop: `1px dashed ${T.border}`,
          }}
        >
          {OVERVIEW_WORKSHOP_DEPTS.map((d) => {
            const state = getOverviewDeptState(v, d.key);
            const team = overviewTeamNameForDept(teams, v, d.key);
            return (
              <div
                key={d.key}
                onMouseEnter={(e) => onDotHover(e, v.id, d.key, true)}
                onMouseLeave={onDotLeave}
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "default" }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: overviewStatusColor(T, state).bg,
                    border: "1px solid rgba(22,31,56,.14)",
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: T.textSecondary, fontWeight: 600 }}>{d.label}</span>
                {team && <span style={{ color: T.textMuted, fontSize: 10.5 }}>👥 {team}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

// Collapsible-layout headers are plain text (not clickable) until a drawer
// is open, matching the update log: "headers are only interactive/
// collapsible while a filter drawer is open; otherwise sections are always
// expanded."
const overviewOpenOnly = (section) => {
  const o = { snapshot: false, journey: false, departments: false, workload: false };
  if (section) o[section] = true;
  return o;
};
const OVERVIEW_SECTION_OPEN_ALL = { snapshot: true, journey: true, departments: true, workload: true };

// Parses vehicle_history's work_assigned "Depts: mechanic, alignment
// balancing, ..." into real dept keys ("alignment_balancing" etc).
const parseWorkAssignedDepts = (newValue) => {
  const m = /Depts:\s*(.+)$/.exec(newValue || "");
  if (!m) return [];
  return m[1]
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/\s+/g, "_"))
    .filter(Boolean);
};

// Hoisted to module scope (not defined inside OverviewTab's render body) so
// React doesn't treat it as a fresh component type every render — a
// component redefined during render loses all reconciliation identity and
// gets fully torn down/rebuilt on every parent re-render.
// Rounded pill control matching the mock's {{ controls }} chip style —
// label prefix + current value + gold caret, wrapping a real <select> so it
// stays functional instead of the mock's inert click-to-cycle placeholder.
const OverviewControlPill = ({ T, label, value, onChange, children }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 15px",
      borderRadius: 20,
      border: `1px solid ${T.border}`,
      background: T.surface,
      fontSize: 13.5,
      fontWeight: 600,
      color: T.text,
    }}
  >
    <span style={{ color: T.textMuted }}>{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        border: "none",
        background: "transparent",
        font: "inherit",
        color: "inherit",
        cursor: "pointer",
        outline: "none",
        WebkitAppearance: "none",
        appearance: "none",
        padding: 0,
      }}
    >
      {children}
    </select>
    <span style={{ color: T.accent, fontSize: 11 }}>▾</span>
  </div>
);

const OverviewSectionHeader = ({ T, activeFilter, sectionOpen, onToggle, section, kicker, title, subtitle, big, extra }) => (
  <div
    onClick={() => onToggle(section)}
    style={{
      display: "flex",
      alignItems: subtitle ? "flex-start" : "baseline",
      gap: 8,
      cursor: activeFilter ? "pointer" : "default",
      marginBottom: 5,
      flexWrap: "wrap",
    }}
  >
    {activeFilter && (
      <span style={{ fontSize: 12, color: T.accent, fontWeight: 700 }}>
        {sectionOpen[section] ? "▾" : "▸"}
      </span>
    )}
    {/* The "big" greeting (title+subtitle) is a full-width welcome banner —
        once the drawer opens and this column narrows to ~300px it's not
        useful there, just a wide block of text pushing the real content
        (the day switcher / stat cards) down. Drop it entirely in that
        state rather than shrinking it to fit. */}
    {!(big && activeFilter) && (
      <div>
        {kicker ? (
          <span style={{ fontSize: 13, fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "1.5px" }}>
            {title}
          </span>
        ) : (
          <span
            style={{
              fontFamily: FONT_HEADING,
              fontSize: big ? 30 : 19,
              fontWeight: 600,
              color: T.text,
              whiteSpace: big ? "nowrap" : "normal",
            }}
          >
            {title}
          </span>
        )}
        {subtitle && (
          <div style={{ fontSize: 13.5, color: T.textMuted, fontWeight: 500, marginTop: 3 }}>{subtitle}</div>
        )}
      </div>
    )}
    {extra}
  </div>
);

function OverviewTab({ T, derived, vehicles, bookings, teams, onVehiclePress, user }) {
  const firstName = user?.full_name?.trim().split(" ")[0] || "there";
  const {
    activeVehicles,
    todayEntriesVehicles,
    overdue,
    complaintVehicles,
    stuckVehicles,
    todayCompleted,
  } = derived;

  // { type: "stat"|"flow"|"dept"|"advisor"|"team", key, label } | null
  const [activeFilter, setActiveFilter] = useState(null);
  const [sectionOpen, setSectionOpen] = useState(OVERVIEW_SECTION_OPEN_ALL);
  const [bookingDayIdx, setBookingDayIdx] = useState(1); // 0=yesterday,1=today,2=tomorrow,3=day after
  const [journeyMode, setJourneyMode] = useState("workshop"); // workshop | bodyshop
  const [deptHistory, setDeptHistory] = useState(null);
  const [deptHistoryLoading, setDeptHistoryLoading] = useState(false);
  // { vehicleId, stageKey, top, left, pinned } | null — a single shared popover
  // instance for EVERY dot in the timeline (not just Workshop), positioned in JS
  // from the triggering dot's real bounding rect and clamped to the viewport,
  // rather than a per-row CSS-anchored popup that can clip off-screen.
  const [popover, setPopover] = useState(null);
  const popoverRef = useRef(null);
  // Mirrors popover.pinned into a ref so the hover handler can read it without
  // needing `popover` in its own dependency list — keeping the handler
  // referentially stable (see handleDotHover/Leave/Click below).
  const pinnedRef = useRef(false);
  useEffect(() => {
    pinnedRef.current = !!popover?.pinned;
  }, [popover?.pinned]);

  useEffect(() => {
    if (!popover?.pinned) return;
    const onDocClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setPopover(null);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [popover?.pinned]);

  // Which vehicle's department row is expanded (click-to-open, not hover) —
  // a single id, not per-row local state, so opening one automatically closes
  // whichever other row was open (only one expanded row at a time), and only
  // the 2 affected rows re-render via memo's prop diff, not the whole table.
  const [expandedDeptVehicleId, setExpandedDeptVehicleId] = useState(null);
  const handleDeptClusterClick = useCallback((vehicleId) => {
    setExpandedDeptVehicleId((prev) => (prev === vehicleId ? null : vehicleId));
  }, []);
  useEffect(() => {
    if (!expandedDeptVehicleId) return;
    // Closes on any click that isn't inside a cluster (clicking a DIFFERENT
    // row's cluster doesn't hit this branch — that row's own onClick just
    // replaces expandedDeptVehicleId directly) or inside the open panel itself.
    const onDocClick = (e) => {
      if (!e.target.closest?.(".ov-dept-cluster") && !e.target.closest?.(".ov-dept-expand-panel")) {
        setExpandedDeptVehicleId(null);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [expandedDeptVehicleId]);

  // Stable (useCallback([])) so table rows can be wrapped in React.memo and
  // actually skip re-rendering when the popover opens/closes on hover —
  // otherwise every mouse-move over the table forced the entire (50+ row)
  // table to re-render, which is what made hovering feel laggy.
  const handleDotHover = useCallback((e, vehicleId, stageKey, isDept = false) => {
    if (pinnedRef.current) return;
    // Individual department dots now show the full detail card on hover
    // (team/times/work list), so they need the popover's real footprint to
    // clamp correctly — the old flat 220x56 estimate was sized for the
    // one-line flow-stage tooltip only.
    const [w, h] =
      isDept && stageKey === OVERVIEW_ALL_DEPTS_KEY
        ? [OVERVIEW_TOOLTIP_W, 210]
        : isDept
          ? [250, 230]
          : [OVERVIEW_TOOLTIP_W, OVERVIEW_TOOLTIP_H];
    const { top, left } = computeOverviewPopoverPos(e, w, h);
    setPopover({ vehicleId, stageKey, isDept, top, left, pinned: false });
  }, []);
  const handleDotLeave = useCallback(() => {
    setPopover((prev) => (prev?.pinned ? prev : null));
  }, []);
  const handleDotClick = useCallback((e, vehicleId, stageKey, isDept = false) => {
    // Compute the position synchronously, here, from the real event — not
    // inside the setState updater below. React can re-invoke a functional
    // updater later (e.g. Strict Mode's purity check), by which point the
    // synthetic event's currentTarget has already reverted to null, so
    // reading the DOM inside the updater crashes intermittently on click.
    const { top, left } = computeOverviewPopoverPos(e);
    setPopover((prev) => {
      if (prev?.pinned && prev.vehicleId === vehicleId && prev.stageKey === stageKey) return null;
      return { vehicleId, stageKey, isDept, top, left, pinned: true };
    });
  }, []);

  // Load department start/end timestamps from vehicle_history once, eagerly —
  // Workshop Departments (Row 3) needs real completion dates to know which
  // "completed" vehicles finished today vs. days ago, and the per-department
  // popover below needs the same start/end times. work_stages/*_details have
  // no {dept}_started_at/{dept}_completed_at columns (confirmed against live
  // schema); the real signal is vehicle_history rows logged by the
  // assign/complete actions.
  useEffect(() => {
    if (deptHistory !== null || deptHistoryLoading) return;
    const ids = vehicles.map((v) => v.id);
    if (ids.length === 0) {
      setDeptHistory({});
      return;
    }
    setDeptHistoryLoading(true);
    withTimeout(
      supabase
        .from("vehicle_history")
        .select("vehicle_id, stage, action, created_at")
        .in("vehicle_id", ids)
        .in(
          "stage",
          [...OVERVIEW_WORKSHOP_DEPTS.map((d) => d.key), "front_checkup"],
        )
        .in("action", [
          "work_started",
          "work_completed",
          "force_completed",
          // vehicles.job_card_completed_at is a separate, much-later-and-rarer
          // milestone (job card creation) than the actual front checkup — most
          // vehicles never get it set, so it silently undercounts "done today"
          // if used alone. vehicle_history's checkup_* actions are the real,
          // reliably-logged signal for when front checkup itself finished.
          "checkup_completed",
          "checkup_completed_deferred",
          "checkup_skipped",
          "checkup_cancelled",
        ])
        .order("created_at", { ascending: true }),
    )
      .then(({ data, error }) => {
        if (error) throw error;
        const map = {};
        (data || []).forEach((row) => {
          if (!map[row.vehicle_id]) map[row.vehicle_id] = {};
          if (!map[row.vehicle_id][row.stage])
            map[row.vehicle_id][row.stage] = { start: null, end: null };
          const bucket = map[row.vehicle_id][row.stage];
          if (row.action === "work_started" && !bucket.start)
            bucket.start = row.created_at;
          if (
            row.action === "work_completed" ||
            row.action === "force_completed" ||
            row.action === "checkup_completed" ||
            row.action === "checkup_completed_deferred" ||
            row.action === "checkup_skipped" ||
            row.action === "checkup_cancelled"
          ) {
            bucket.end = row.created_at;
            if (!bucket.start) bucket.start = row.created_at;
          }
        });
        setDeptHistory(map);
      })
      .catch((e) => {
        console.error("Overview dept history fetch error:", e);
        setDeptHistory({});
      })
      .finally(() => setDeptHistoryLoading(false));
  }, [deptHistory, deptHistoryLoading, vehicles]);

  // "Work assigned" per department, for the department popover — each dept's
  // detail table has its own column name for this (see
  // OVERVIEW_DEPT_DETAILS_SOURCE), so this fires one lightweight, id-scoped
  // query per table rather than one broad join on the main vehicles fetch.
  const [deptDetails, setDeptDetails] = useState(null);
  useEffect(() => {
    if (deptDetails !== null) return;
    const ids = vehicles.map((v) => v.id);
    if (ids.length === 0) {
      setDeptDetails({});
      return;
    }
    withTimeout(
      Promise.all(
        Object.entries(OVERVIEW_DEPT_DETAILS_SOURCE).map(([deptKey, src]) =>
          supabase
            .from(src.table)
            .select(`vehicle_id, ${src.workField}, notes`)
            .in("vehicle_id", ids)
            .then(({ data, error }) => {
              if (error) throw error;
              return { deptKey, workField: src.workField, rows: data || [] };
            }),
        ),
      ),
    )
      .then((results) => {
        const map = {};
        results.forEach(({ deptKey, workField, rows }) => {
          rows.forEach((row) => {
            if (!map[row.vehicle_id]) map[row.vehicle_id] = {};
            map[row.vehicle_id][deptKey] = { workItems: row[workField] || [], notes: row.notes || null };
          });
        });
        setDeptDetails(map);
      })
      .catch((e) => {
        console.error("Overview dept details fetch error:", e);
        setDeptDetails({});
      });
  }, [deptDetails, vehicles]);

  // "Today's Queue" (Workshop Departments) needs a real per-department
  // assignment timestamp, which isn't a column anywhere — work_assigned is
  // logged once per Assign Work submission (vehicle-level, not per-dept),
  // new_value lists which depts were included. Keep only the LATEST such
  // event per vehicle, since a vehicle can be reassigned later.
  const [workAssignedHistory, setWorkAssignedHistory] = useState(null);
  useEffect(() => {
    if (workAssignedHistory !== null) return;
    const ids = vehicles.map((v) => v.id);
    if (ids.length === 0) {
      setWorkAssignedHistory({});
      return;
    }
    withTimeout(
      supabase
        .from("vehicle_history")
        .select("vehicle_id, new_value, created_at")
        .eq("action", "work_assigned")
        .in("vehicle_id", ids)
        .order("created_at", { ascending: true }),
    )
      .then(({ data, error }) => {
        if (error) throw error;
        const map = {};
        (data || []).forEach((row) => {
          const ev = { depts: new Set(parseWorkAssignedDepts(row.new_value)), time: row.created_at };
          // Ascending order — last write per vehicle_id wins for `depts`/`time`
          // (the popover's "Assigned" field), so those two stay the latest
          // event only. `events` additionally keeps every event so a
          // department's hover card can tell "assigned once" from "work
          // list touched again later" (see OverviewMockDot dept tooltip).
          if (!map[row.vehicle_id]) map[row.vehicle_id] = { events: [] };
          map[row.vehicle_id].depts = ev.depts;
          map[row.vehicle_id].time = ev.time;
          map[row.vehicle_id].events.push(ev);
        });
        setWorkAssignedHistory(map);
      })
      .catch((e) => {
        console.error("Overview work-assigned history fetch error:", e);
        setWorkAssignedHistory({});
      });
  }, [workAssignedHistory, vehicles]);

  const setFilter = (type_, key, label, section) => {
    setActiveFilter((prev) => {
      const same = prev && prev.type === type_ && prev.key === key;
      setSectionOpen(same ? OVERVIEW_SECTION_OPEN_ALL : overviewOpenOnly(section));
      return same ? null : { type: type_, key, label };
    });
  };
  const clearFilter = () => {
    setActiveFilter(null);
    setSectionOpen(OVERVIEW_SECTION_OPEN_ALL);
  };
  const toggleSection = (section) => {
    if (!activeFilter) return;
    setSectionOpen((s) => ({ ...s, [section]: !s[section] }));
  };

  const [sortDir, setSortDir] = useState("desc"); // desc = newest entry first

  // service_type already carries a real "warranty" value (see BOOKING_SVC_TYPES) —
  // this was a disabled "Coming soon" placeholder before; the data was there all along.
  const warrantyVehicles = useMemo(
    () => activeVehicles.filter((v) => v.service_type === "warranty"),
    [activeVehicles],
  );

  // Date-based (due today or earlier), not time-based like Overdue — a vehicle
  // due at 6pm today belongs here even before 6pm, whereas Overdue only flags
  // it once that exact moment has actually passed. The two overlap on purpose.
  const expectedTodayVehicles = useMemo(() => {
    const today = todayISTDateStr();
    return activeVehicles.filter((v) => v.expected_completion_time && istDateStr(v.expected_completion_time) <= today);
  }, [activeVehicles]);

  const filteredVehicles = useMemo(() => {
    let result = vehicles;
    if (activeFilter) {
      const { type: ftype, key } = activeFilter;
      if (ftype === "stat") {
        if (key === "active") result = activeVehicles;
        else if (key === "today") result = todayEntriesVehicles;
        else if (key === "overdue") result = overdue;
        else if (key === "complaint") result = complaintVehicles;
        else if (key === "stuck") result = stuckVehicles;
        else if (key === "warranty") result = warrantyVehicles;
        else if (key === "expectedToday") result = expectedTodayVehicles;
        else if (key === "exitToday") result = todayCompleted;
      } else if (ftype === "flow") {
        if (key === "cashier") result = vehicles.filter(isAwaitingCashier);
        else if (key === "advisor")
          result = vehicles.filter((v) => normalizeStage(v.current_stage) === "advisor_review" && overviewIsWorkshopAdvisor(v));
        else result = vehicles.filter((v) => normalizeStage(v.current_stage) === FLOW_CARD_STAGE_MATCH[key]);
      } else if (ftype === "bodyshop") {
        result =
          key === "advisor"
            ? vehicles.filter((v) => v.current_stage === "advisor_review" && overviewIsBodyshopAdvisor(v))
            : vehicles.filter((v) => v.current_stage === "bodyshop_processing" && v.bodyshop_stage === key);
      } else if (ftype === "dept") {
        // Matches the Workshop Departments tile counts below: a vehicle whose
        // dept work finished days ago (but hasn't moved out of the system yet)
        // no longer belongs to that department's active list.
        const today = todayISTDateStr();
        result = vehicles.filter((v) => {
          const state = getOverviewDeptState(v, key);
          if (state === "not_assigned") return false;
          if (state !== "completed") return true;
          const end = deptHistory?.[v.id]?.[key]?.end;
          return !!end && istDateStr(end) === today;
        });
      } else if (ftype === "advisor") {
        result = vehicles.filter((v) => v.advisor?.full_name === key);
      } else if (ftype === "team") {
        const team = (teams || []).find((t) => t.id === key);
        result = team ? vehicles.filter((v) => v.work_stages?.[0]?.[`${team.role}_team_id`] === team.id) : [];
      }
    }
    result = [...result].sort((a, b) => {
      const ta = a.entry_time ? new Date(a.entry_time).getTime() : 0;
      const tb = b.entry_time ? new Date(b.entry_time).getTime() : 0;
      return sortDir === "desc" ? tb - ta : ta - tb;
    });
    return result;
  }, [
    activeFilter,
    vehicles,
    activeVehicles,
    todayEntriesVehicles,
    overdue,
    complaintVehicles,
    stuckVehicles,
    warrantyVehicles,
    expectedTodayVehicles,
    todayCompleted,
    teams,
    sortDir,
    deptHistory,
  ]);

  const popoverVehicle = popover ? vehicles.find((v) => v.id === popover.vehicleId) : null;

  // Top row: the two "big picture" numbers, each spanning the width of two
  // ordinary cards. Bottom row: the four "needs a closer look" numbers.
  const heroStatDefs = [
    ["On Premises", "active", activeVehicles.length],
    ["Expected Deliveries", "expectedToday", expectedTodayVehicles.length],
  ];
  const statDefs = [
    ["Overdue Vehicles", "overdue", overdue.length],
    ["Vehicle Complaints", "complaint", complaintVehicles.length],
    ["Idle Vehicles", "stuck", stuckVehicles.length],
    ["Warranty Jobs", "warranty", warrantyVehicles.length],
  ];

  const isDeptFilter = activeFilter?.type === "dept";
  const isAdvisorFilter = activeFilter?.type === "advisor";
  const isTeamFilter = activeFilter?.type === "team";
  const selectedTeam = isTeamFilter ? (teams || []).find((t) => t.id === activeFilter.key) : null;

  // Same buckets AdvisorTeamWorkload computes for its table rows — recomputed
  // here for just the one selected advisor/team so the drawer can show a
  // breakdown without threading the whole workload table's state through.
  let advisorDetail = null;
  if (isAdvisorFilter) {
    const advVehicles = vehicles.filter((v) => v.advisor?.full_name === activeFilter.key);
    const stageKeyOf = (v) => OVERVIEW_FLOW_STAGES.find((s) => isQueuedAtFlowCol(v, s.key))?.key || null;
    const bucket = (key) => advVehicles.filter((v) => stageKeyOf(v) === key).length;
    const readyForDelivery = advVehicles.filter((v) => v.current_stage === "ready_for_exit").length;
    const buckets = [
      { label: "Workshop", count: bucket("workshop") },
      { label: "PDI", count: bucket("pdi") },
      { label: "Billing", count: bucket("billing") },
      { label: "Cashier", count: bucket("cashier") },
      { label: "Ready for Delivery", count: readyForDelivery },
    ];
    const total = advVehicles.length;
    advisorDetail = { total, buckets: buckets.map((b) => ({ ...b, pct: total ? (b.count / total) * 100 : 0 })) };
  }
  let teamDetail = null;
  if (isTeamFilter && selectedTeam) {
    const teamVehicles = vehicles.filter((v) => v.work_stages?.[0]?.[`${selectedTeam.role}_team_id`] === selectedTeam.id);
    let pendingQueue = 0;
    let inProgress = 0;
    let done = 0;
    teamVehicles.forEach((v) => {
      const state = getOverviewDeptState(v, selectedTeam.role);
      if (state === "not_started") pendingQueue += 1;
      else if (state === "in_progress") inProgress += 1;
      else if (state === "completed") done += 1;
    });
    const total = pendingQueue + inProgress + done;
    const buckets = [
      { label: "Pending Queue", count: pendingQueue },
      { label: "In Progress", count: inProgress },
      { label: "Completed", count: done },
    ];
    teamDetail = { total, buckets: buckets.map((b) => ({ ...b, pct: total ? (b.count / total) * 100 : 0 })) };
  }

  return (
    <div style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>
      <style>{FLOW_PULSE_KEYFRAMES}</style>
      <style>{OVERVIEW_DEPT_HOVER_CSS}</style>
      <div style={{ flex: activeFilter ? "0.8 1 0" : "1 1 100%", minWidth: 0 }}>
        {/* SECTION: Today's Snapshot & Bookings */}
        <OverviewSectionHeader
          T={T}
          activeFilter={activeFilter}
          sectionOpen={sectionOpen}
          onToggle={toggleSection}
          section="snapshot"
          big
          title={
            <>
              Hey {firstName} 👋
              <span style={{ fontSize: 18, fontWeight: 500, color: T.textMuted }}>
                , here's what's happening in your workshop today!
              </span>
            </>
          }
          extra={
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: activeFilter ? "100%" : 380,
                marginLeft: activeFilter ? 0 : "auto",
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 500, color: T.text }}>Scheduled Bookings</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span
                  onClick={() => setBookingDayIdx((i) => Math.max(0, i - 1))}
                  style={{ cursor: "pointer", color: T.accent, fontWeight: 700, fontSize: 15, padding: "2px 4px" }}
                >
                  ‹
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text, minWidth: 60, textAlign: "center" }}>
                  {BOOKING_DAY_OFFSETS[bookingDayIdx].label}
                </span>
                <span
                  onClick={() => setBookingDayIdx((i) => Math.min(BOOKING_DAY_OFFSETS.length - 1, i + 1))}
                  style={{ cursor: "pointer", color: T.accent, fontWeight: 700, fontSize: 15, padding: "2px 4px" }}
                >
                  ›
                </span>
              </div>
            </div>
          }
        />
        {sectionOpen.snapshot && (
          <div
            style={{
              display: "flex",
              flexDirection: activeFilter ? "column" : "row",
              flexWrap: "nowrap",
              alignItems: "stretch",
              gap: 20,
              marginBottom: 2,
              paddingBottom: 6,
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            <div
              style={{
                flex: "1 1 auto",
                minWidth: 0,
                width: activeFilter ? "100%" : "auto",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {/* Top row: 2 hero cards, each the width of 2 ordinary cards
                  below — a 2-column grid at the same total row width does
                  that automatically, no explicit column-span needed. */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: activeFilter ? "1fr" : "repeat(2,1fr)",
                  gap: 10,
                }}
              >
                {heroStatDefs.map(([label, key, value]) => (
                  <FilterCard
                    key={key}
                    T={T}
                    label={label}
                    value={value}
                    active={activeFilter?.type === "stat" && activeFilter.key === key}
                    onClick={() => setFilter("stat", key, label, "snapshot")}
                  />
                ))}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: activeFilter ? "repeat(2,minmax(0,1fr))" : "repeat(4,1fr)",
                  gap: 10,
                }}
              >
                {statDefs.map(([label, key, value]) => (
                  <FilterCard
                    key={key}
                    T={T}
                    label={label}
                    value={value}
                    danger={OVERVIEW_ALARM_STAT_KEYS.has(key)}
                    active={activeFilter?.type === "stat" && activeFilter.key === key}
                    onClick={() => setFilter("stat", key, label, "snapshot")}
                  />
                ))}
              </div>
            </div>

            {/* Bookings — "Bookings" label moved up into the section header
                above (same row as "Hey Dhruv"), so this box is a plain flex
                sibling of the glance-card grid with nothing pushing its top
                edge down — with the row's alignItems:"stretch", it now starts
                and ends exactly level with the glance cards beside it. */}
            <div
              style={{
                width: activeFilter ? "100%" : 380,
                flexShrink: 0,
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                padding: "12px 16px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <BookingsRingPanel T={T} bookings={bookings} compact={!!activeFilter} dayIdx={bookingDayIdx} />
            </div>
          </div>
        )}

        {/* SECTION: Vehicle Journey */}
        <OverviewSectionHeader
          T={T}
          activeFilter={activeFilter}
          sectionOpen={sectionOpen}
          onToggle={toggleSection}
          section="journey"
          title="Vehicle Journey"
          extra={
            <>
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: "flex",
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  overflow: "hidden",
                  marginLeft: "auto",
                  alignSelf: "center",
                }}
              >
                {[
                  ["workshop", "Workshop"],
                  ["bodyshop", "Body Shop"],
                ].map(([m, label]) => (
                  <div
                    key={m}
                    onClick={() => setJourneyMode(m)}
                    style={{
                      padding: "3px 9px",
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      background: journeyMode === m ? T.text : T.surface,
                      color: journeyMode === m ? T.accentBg : T.textSecondary,
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </>
          }
        />
        {sectionOpen.journey && (
          <VehicleJourneyTracker
            T={T}
            vehicles={vehicles}
            activeFilter={activeFilter}
            mode={journeyMode}
            onSelect={(ftype, key, label) => setFilter(ftype, key, label, "journey")}
          />
        )}

        {/* SECTION: Workshop Departments */}
        <OverviewSectionHeader
          T={T}
          activeFilter={activeFilter}
          sectionOpen={sectionOpen}
          onToggle={toggleSection}
          section="departments"
          title="Workshop Load"
        />
        {sectionOpen.departments && (
          <ParallelCluster
            T={T}
            vehicles={vehicles}
            activeFilter={activeFilter}
            deptHistory={deptHistory}
            workAssignedHistory={workAssignedHistory}
            onSelect={(key) => {
              const label = OVERVIEW_WORKSHOP_DEPTS.find((d) => d.key === key)?.label || key;
              setFilter("dept", key, label, "departments");
            }}
          />
        )}

        {/* SECTION: Advisor & Team Workload */}
        <OverviewSectionHeader
          T={T}
          activeFilter={activeFilter}
          sectionOpen={sectionOpen}
          onToggle={toggleSection}
          section="workload"
          kicker
          title="Staff Workload"
        />
        {sectionOpen.workload && (
          <AdvisorTeamWorkload
            T={T}
            vehicles={vehicles}
            teams={teams || []}
            activeFilter={activeFilter}
            onSelectAdvisor={(name) => setFilter("advisor", name, name, "workload")}
            onSelectTeam={(t) => setFilter("team", t.id, `${t.name} (${TEAM_ROLE_LABELS[t.role] || t.role})`, "workload")}
          />
        )}
      </div>

      {/* DRAWER */}
      {activeFilter && (
        <div style={{ flex: "2.6 1 0", minWidth: 0, borderLeft: `1px solid ${T.border}`, padding: "22px 30px 30px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
            <div style={{ fontFamily: FONT_HEADING, fontSize: 19, fontWeight: 600, color: T.text }}>
              {isAdvisorFilter || isTeamFilter ? activeFilter.label : "Vehicles on Premises"}
            </div>
            <div
              onClick={clearFilter}
              title="Close"
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                border: `1px solid ${T.border}`,
                background: T.surface,
                color: T.textSecondary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = T.surfaceElevated;
                e.currentTarget.style.color = T.red;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = T.surface;
                e.currentTarget.style.color = T.textSecondary;
              }}
            >
              ✕
            </div>
          </div>
          <div style={{ fontSize: 13.5, color: T.textMuted, fontWeight: 600, marginBottom: 16 }}>
            filtered by <b style={{ color: T.accent }}>{activeFilter.label}</b> · {filteredVehicles.length} vehicle(s)
          </div>

          {isDeptFilter && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
              {OVERVIEW_WORKSHOP_DEPTS.map((d) => {
                const sel = activeFilter.key === d.key;
                return (
                  <div
                    key={d.key}
                    onClick={() => setFilter("dept", d.key, d.label, "departments")}
                    style={{
                      padding: "7px 15px",
                      borderRadius: 18,
                      border: `1px solid ${T.border}`,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      background: sel ? T.text : T.surface,
                      color: sel ? T.accentBg : T.textSecondary,
                    }}
                  >
                    {d.label}
                  </div>
                );
              })}
            </div>
          )}

          {(isAdvisorFilter ? advisorDetail : isTeamFilter ? teamDetail : null) && (
            <div style={{ display: "flex", gap: 22, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 22 }}>
              <div>
                <div style={{ fontSize: 34, fontWeight: 700, color: T.text, lineHeight: 1 }}>
                  {(isAdvisorFilter ? advisorDetail : teamDetail).total}
                </div>
                <div style={{ fontSize: 13, color: T.textMuted, fontWeight: 600 }}>total vehicles</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11, flex: 1, minWidth: 260, maxWidth: 460 }}>
                {(isAdvisorFilter ? advisorDetail : teamDetail).buckets.map((b) => (
                  <div key={b.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, fontWeight: 600, color: T.text, marginBottom: 5 }}>
                      <span>{b.label}</span>
                      <span style={{ fontWeight: 700 }}>{b.count}</span>
                    </div>
                    <div style={{ height: 9, borderRadius: 5, background: T.border, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${b.pct}%`, background: isAdvisorFilter ? T.accent : T.purple, borderRadius: 5 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Controls — pill chips matching the mock's {{ controls }} row */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
            <OverviewControlPill T={T} label="Sort" value={sortDir} onChange={setSortDir}>
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </OverviewControlPill>
            {deptHistoryLoading && (
              <span style={{ fontSize: 12, color: T.textMuted }}>Loading department history…</span>
            )}
          </div>

          <OverviewLegend T={T} />

          {/* Table — CSS grid of divs matching the mock exactly (it never uses
              a real <table>); the whole drawer scrolls as one column, only
              this grid gets horizontal scroll below the 680px min-width. */}
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 680 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: OVERVIEW_TABLE_GRID_COLS,
                  columnGap: 14,
                  padding: "0 0 11px",
                  borderBottom: `2px solid ${T.text}`,
                }}
              >
                {["Vehicle", "Customer", "Advisor", "Journey Stage", "Departments", "Entry", "Exp. Exit"].map((label) => (
                  <div
                    key={label}
                    style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "1px" }}
                  >
                    {label}
                  </div>
                ))}
              </div>
              {filteredVehicles.length === 0 && (
                <div style={{ padding: "40px 0", textAlign: "center", color: T.textMuted, fontSize: 14 }}>
                  No vehicles match this filter right now.
                </div>
              )}
              {filteredVehicles.map((v) => (
                <OverviewVehicleRow
                  key={v.id}
                  T={T}
                  v={v}
                  teams={teams}
                  deptHistory={deptHistory}
                  onVehiclePress={onVehiclePress}
                  onDotHover={handleDotHover}
                  onDotLeave={handleDotLeave}
                  onDotClick={handleDotClick}
                  isDeptExpanded={expandedDeptVehicleId === v.id}
                  onToggleDeptExpand={handleDeptClusterClick}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {popover && popoverVehicle && (
        <div ref={popoverRef} style={{ position: "fixed", top: popover.top, left: popover.left, zIndex: 200 }}>
          {popover.pinned ? (
            <StagePreviewPopover
              T={T}
              vehicle={popoverVehicle}
              stageKey={popover.stageKey}
              isDept={popover.isDept}
              deptHistory={deptHistory}
              deptDetails={deptDetails}
              workAssignedHistory={workAssignedHistory}
              teams={teams}
            />
          ) : (
            <QuickStageTooltip
              T={T}
              vehicle={popoverVehicle}
              stageKey={popover.stageKey}
              isDept={popover.isDept}
              deptHistory={deptHistory}
              deptDetails={deptDetails}
              workAssignedHistory={workAssignedHistory}
              teams={teams}
            />
          )}
        </div>
      )}
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

// A single-line dropdown for one filter facet (department/team/advisor) — no
// chip wall, no stacked uppercase label row. The placeholder option ("All
// Departments" etc.) already says what the control is for, so the whole
// toolbar can sit on one compact row instead of three. Active (non-"all")
// selections get an accent outline so a live filter is still obvious at a
// glance even without a chip's color to lean on.
const FloorFacetSelect = ({ T, items, activeId, onChange, allLabel, minWidth = 168 }) => (
  <select
    value={activeId}
    onChange={(e) => onChange(e.target.value)}
    style={{
      padding: "7px 10px",
      border: `1px solid ${activeId !== "all" ? T.accent : T.border}`,
      borderRadius: 7,
      fontSize: 12.5,
      fontWeight: activeId !== "all" ? 700 : 500,
      color: activeId !== "all" ? T.accent : T.text,
      background: activeId !== "all" ? T.accentBg : T.surface,
      outline: "none",
      fontFamily: "inherit",
      cursor: "pointer",
      minWidth,
    }}
  >
    <option value="all">{allLabel}</option>
    {items.map((it) => (
      <option key={it.id} value={it.id}>
        {it.label} ({it.count})
      </option>
    ))}
  </select>
);

// A compact, reusable segmented control — used for Floor/Washing mode (neutral
// style, active segment goes white) and for the date-range presets below
// (colored style, active segment fills solid) via the optional activeColor.
const SegmentedControl = ({ T, options, value, onChange, activeColor, size = "md" }) => (
  <div
    style={{
      display: "inline-flex",
      background: activeColor ? T.surface : T.surfaceElevated,
      border: `1px solid ${T.border}`,
      borderRadius: size === "sm" ? 8 : 9,
      padding: size === "sm" ? 2 : 3,
      gap: 1,
    }}
  >
    {options.map(([k, l]) => {
      const isActive = value === k;
      return (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          style={{
            appearance: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: size === "sm" ? 11.5 : 12.5,
            fontWeight: 700,
            padding: size === "sm" ? "6px 10px" : "7px 14px",
            borderRadius: size === "sm" ? 6 : 7,
            transition: "all 0.12s",
            background: isActive ? activeColor || T.surface : "transparent",
            color: isActive ? (activeColor ? "#fff" : T.text) : T.textSecondary,
            boxShadow: isActive && !activeColor ? T.shadow : "none",
          }}
        >
          {l}
        </button>
      );
    })}
  </div>
);

// Presets resolve to an inclusive IST day range. "includesToday" tells the
// panel below whether live Assigned/In Progress numbers are meaningful — they
// are a snapshot of right now, so they don't exist for a range that's
// entirely in the past (e.g. "Feb 2025"); only Completed does, there.
function resolveFloorDateRange(range) {
  const nowIST = new Date(Date.now() + 5.5 * 3600000);
  const todayStr = nowIST.toISOString().slice(0, 10);
  const dayStart = (d) => `${d}T00:00:00+05:30`;
  const dayEnd = (d) => `${d}T23:59:59.999+05:30`;
  const addDays = (d, n) => new Date(new Date(`${d}T00:00:00+05:30`).getTime() + n * 86400000).toISOString().slice(0, 10);

  if (range.preset === "yesterday") {
    const y = addDays(todayStr, -1);
    return { from: dayStart(y), to: dayEnd(y), includesToday: false, label: "Yesterday" };
  }
  if (range.preset === "week") {
    const from = addDays(todayStr, -6);
    return { from: dayStart(from), to: dayEnd(todayStr), includesToday: true, label: "Last 7 Days" };
  }
  if (range.preset === "month") {
    const from = `${todayStr.slice(0, 7)}-01`;
    return { from: dayStart(from), to: dayEnd(todayStr), includesToday: true, label: "This Month" };
  }
  if (range.preset === "custom" && range.from && range.to) {
    return {
      from: dayStart(range.from),
      to: dayEnd(range.to),
      includesToday: range.to >= todayStr,
      label: range.from === range.to ? range.from : `${range.from} → ${range.to}`,
    };
  }
  if (range.preset === "specificMonth" && range.month) {
    const [y, m] = range.month.split("-").map(Number);
    const from = `${range.month}-01`;
    const to = `${range.month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
    return {
      from: dayStart(from),
      to: dayEnd(to),
      includesToday: to >= todayStr,
      label: new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" }),
    };
  }
  return { from: dayStart(todayStr), to: dayEnd(todayStr), includesToday: true, label: "Today" };
}

const FLOOR_QUICK_RANGES = [
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["week", "7D"],
  ["month", "Month"],
];

// The four common ranges are one click away as a segmented control; Custom
// Range and Specific Month are progressive disclosure behind the calendar
// icon instead of two permanently-visible form fields sitting in the flow.
function FloorDateRangePicker({ T, dateRange, onChange }) {
  const [popOpen, setPopOpen] = useState(false);
  const [monthDraft, setMonthDraft] = useState(dateRange.month || todayISTDateStr().slice(0, 7));
  const [fromDraft, setFromDraft] = useState(dateRange.from || todayISTDateStr());
  const [toDraft, setToDraft] = useState(dateRange.to || todayISTDateStr());
  const isCustomActive = dateRange.preset === "custom" || dateRange.preset === "specificMonth";
  const quickValue = FLOOR_QUICK_RANGES.some(([k]) => k === dateRange.preset) ? dateRange.preset : null;

  const inputStyle = {
    padding: "7px 9px",
    border: `1px solid ${T.border}`,
    borderRadius: 6,
    fontSize: 12.5,
    color: T.text,
    background: T.surface,
    outline: "none",
    fontFamily: "inherit",
    width: "100%",
  };
  const applyStyle = {
    marginTop: 2,
    padding: 7,
    borderRadius: 6,
    border: "none",
    background: T.cyan,
    color: "#fff",
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
  };
  const labelStyle = {
    fontSize: 10.5,
    fontWeight: 700,
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  };

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 6 }}>
      <SegmentedControl
        T={T}
        size="sm"
        activeColor={T.cyan}
        value={quickValue}
        onChange={(k) => onChange({ preset: k })}
        options={FLOOR_QUICK_RANGES}
      />
      <button
        type="button"
        onClick={() => setPopOpen((p) => !p)}
        title="Custom range or specific month"
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          border: `1px solid ${isCustomActive ? T.cyan : T.border}`,
          background: isCustomActive ? T.cyanLight : T.surface,
          color: isCustomActive ? T.cyan : T.textSecondary,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
        }}
      >
        📅
      </button>
      {popOpen && (
        <div
          style={{
            position: "absolute",
            top: 38,
            right: 0,
            zIndex: 5,
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            boxShadow: T.shadowLg,
            padding: 12,
            width: 230,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <label style={labelStyle}>Specific Month</label>
          <input type="month" value={monthDraft} onChange={(e) => setMonthDraft(e.target.value)} style={inputStyle} />
          <button
            type="button"
            style={applyStyle}
            onClick={() => {
              onChange({ preset: "specificMonth", month: monthDraft });
              setPopOpen(false);
            }}
          >
            Apply
          </button>
          <label style={{ ...labelStyle, marginTop: 4 }}>Custom Range</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="date" value={fromDraft} max={toDraft} onChange={(e) => setFromDraft(e.target.value)} style={inputStyle} />
            <input type="date" value={toDraft} min={fromDraft} onChange={(e) => setToDraft(e.target.value)} style={inputStyle} />
          </div>
          <button
            type="button"
            style={applyStyle}
            onClick={() => {
              onChange({ preset: "custom", from: fromDraft, to: toDraft });
              setPopOpen(false);
            }}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

// Same visual language as the Workshop Departments tiles in Overview (Queue →
// In Progress → Done health bar + dot-badge breakdown), reused here so a team
// card and a department tile read as the same idea. When the selected range
// is entirely in the past, Assigned/In Progress don't exist as concepts (they
// are a live snapshot), so the card collapses to a single Completed figure.
// Fixed width, not a stretching grid track — with only 1-2 teams a grid of
// 1fr columns would balloon each card to half the panel's width.
function TeamPerformanceCard({ T, name, assigned, inProgress, completed, includesToday, loading, active, onClick }) {
  const total = includesToday ? assigned + inProgress + completed : completed;
  return (
    <div
      onClick={onClick}
      style={{
        background: active ? T.cyanLight : T.surface,
        border: `1px solid ${T.border}`,
        borderLeft: `3px solid ${active ? T.cyan : T.borderStrong}`,
        borderRadius: 10,
        padding: "9px 12px 10px",
        width: 168,
        flex: "0 0 auto",
        boxShadow: T.shadow,
        cursor: "pointer",
        transition: "all 0.12s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>{name}</span>
        <span style={{ fontSize: 20, fontWeight: 800, color: T.text }}>
          {loading ? "…" : total}
        </span>
      </div>
      {includesToday ? (
        total > 0 ? (
          <>
            <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", background: T.border, marginBottom: 7 }}>
              <span style={{ width: `${(assigned / total) * 100}%`, background: T.borderStrong }} />
              <span style={{ width: `${(inProgress / total) * 100}%`, background: T.accent }} />
              <span style={{ width: `${(completed / total) * 100}%`, background: T.green }} />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 10,
                fontSize: 15,
                fontWeight: 800,
                color: T.textSecondary,
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.borderStrong, flexShrink: 0 }} />
                {assigned}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.accent, flexShrink: 0 }} />
                {inProgress}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, flexShrink: 0 }} />
                {completed}
              </span>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 10.5, color: T.textMuted, fontStyle: "italic" }}>Nothing on the floor</div>
        )
      ) : (
        <div style={{ fontSize: 10.5, color: T.textMuted }}>completed in range</div>
      )}
    </div>
  );
}

// Same dashed-elevated container Overview's Workshop Departments panel uses —
// this is conceptually the same kind of "drill-down performance" surface, so
// it should look like one, not like a plain unstyled block sitting in the deck.
function TeamPerformancePanel({
  T,
  deptLabel,
  teams,
  activeTeamId,
  onSelectTeam,
  perf,
  perfLoading,
  includesToday,
  rangeLabel,
  dateRange,
  onDateRangeChange,
}) {
  return (
    <div
      style={{
        background: T.surfaceElevated,
        border: `1.5px dashed ${T.borderStrong}`,
        borderRadius: 12,
        padding: "12px 14px 14px",
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{deptLabel} Teams</span>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: T.textMuted }}>— {rangeLabel}</span>
        </div>
        <FloorDateRangePicker T={T} dateRange={dateRange} onChange={onDateRangeChange} />
      </div>
      {includesToday && (
        <div style={{ display: "flex", gap: 14, marginBottom: 10, fontSize: 11, color: T.textMuted, fontWeight: 600 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.borderStrong }} />
            Assigned
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.accent }} />
            In Progress
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.green }} />
            Completed
          </span>
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {teams.map((t) => {
          const p = perf[t.id] || { assigned: 0, inProgress: 0, completed: 0 };
          return (
            <TeamPerformanceCard
              key={t.id}
              T={T}
              name={t.name}
              assigned={p.assigned}
              inProgress={p.inProgress}
              completed={p.completed}
              includesToday={includesToday}
              loading={perfLoading}
              active={activeTeamId === String(t.id)}
              onClick={() => onSelectTeam(String(t.id))}
            />
          );
        })}
      </div>
    </div>
  );
}

function FloorTab({ T, vehicles, derived, onVehiclePress }) {
  const active = useMemo(() => vehicles.filter((v) => v.current_stage !== "completed"), [vehicles]);
  // The timeline itself already shows each vehicle's stage, and the team/advisor
  // pills below are the only selector for those two facets — no separate "view"
  // mode or dropdown duplicating what a pill click already does. Team and
  // advisor filters combine (AND), so "Mechanic Team A + Advisor Rahul" is a
  // valid combination instead of one facet blocking the other.
  const [mode, setMode] = useState("table"); // table | washing
  const [teamFilter, setTeamFilter] = useState("all");
  const [advisorFilter, setAdvisorFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [sortDir, setSortDir] = useState("desc");
  const [dateRange, setDateRange] = useState({ preset: "today" });
  const [popover, setPopover] = useState(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!popover?.pinned) return;
    const onDocClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setPopover(null);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [popover?.pinned]);

  const computePopoverPos = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 6;
    if (left + OVERVIEW_POPOVER_W > window.innerWidth - 12) {
      left = window.innerWidth - OVERVIEW_POPOVER_W - 12;
    }
    if (top + OVERVIEW_POPOVER_H > window.innerHeight - 12) {
      top = rect.top - OVERVIEW_POPOVER_H - 6;
    }
    left = Math.max(12, left);
    top = Math.max(12, top);
    return { top, left };
  };
  const handleWorkshopHover = (e, vehicleId) => {
    if (popover?.pinned) return;
    const { top, left } = computePopoverPos(e);
    setPopover({ vehicleId, top, left, pinned: false });
  };
  const handleWorkshopLeave = () => setPopover((prev) => (prev?.pinned ? prev : null));
  const handleWorkshopClick = (e, vehicleId) => {
    // Compute the position synchronously, here, from the real event — not
    // inside the setState updater below. React can re-invoke a functional
    // updater later (e.g. Strict Mode's purity check), by which point the
    // synthetic event's currentTarget has already reverted to null, so
    // reading the DOM inside the updater crashes intermittently on click.
    const { top, left } = computePopoverPos(e);
    setPopover((prev) => {
      if (prev?.pinned && prev.vehicleId === vehicleId) return null;
      return { vehicleId, top, left, pinned: true };
    });
  };

  // Always-visible "who's carrying what" strips — every team/advisor, including
  // idle ones (0 is itself useful information: a free team, an advisor with
  // nothing on their plate). Vehicle numbers ride along as a hover tooltip so
  // the strip conveys real detail without needing its own popover machinery.
  const teamPills = useMemo(
    () =>
      (derived.teamLoads || []).map((t) => {
        const dm = STAGE_META[t.role] || { color: T.blue };
        return {
          id: String(t.id),
          label: t.name,
          count: t.activeVehicles.length,
          color: dm.color,
          vehicleNumbers: t.activeVehicles.map((v) => v.vehicle_number),
        };
      }),
    [derived.teamLoads, T.blue],
  );
  const advisorPills = useMemo(
    () =>
      (derived.advisorLoads || []).map((a) => ({
        id: String(a.id),
        label: a.full_name,
        count: a.activeVehicles.length,
        color: T.blue,
        vehicleNumbers: a.activeVehicles.map((v) => v.vehicle_number),
      })),
    [derived.advisorLoads, T.blue],
  );
  // Department pills — same OVERVIEW_WORKSHOP_DEPTS set Overview's Row 3 uses,
  // since that's also exactly the set of departments that can have a team.
  // Selecting one both filters the table and, when that department actually
  // has teams configured, swaps the Advisor column to show the assigned team.
  const deptPills = useMemo(
    () =>
      OVERVIEW_WORKSHOP_DEPTS.map((d) => {
        const dm = STAGE_META[d.key] || { color: T.blue };
        const inDept = active.filter((v) => getOverviewDeptState(v, d.key) !== "not_assigned");
        return {
          id: d.key,
          label: d.label,
          count: inDept.length,
          color: dm.color,
          vehicleNumbers: inDept.map((v) => v.vehicle_number),
        };
      }),
    [active, T.blue],
  );
  const teamNameById = useMemo(
    () => new Map((derived.teamLoads || []).map((t) => [t.id, t.name])),
    [derived.teamLoads],
  );
  const selectedDeptTeams = useMemo(
    () => (derived.teamLoads || []).filter((t) => t.role === deptFilter),
    [derived.teamLoads, deptFilter],
  );
  const activeDeptKey = deptFilter !== "all" && selectedDeptTeams.length > 0 ? deptFilter : null;

  // A team belongs to exactly one department, so "Mechanic department +
  // Electrician team" is not a valid combination — rather than showing an
  // empty table and leaving the owner to figure out why, drop the stale team
  // filter the moment the department changes out from under it.
  useEffect(() => {
    if (deptFilter === "all" || teamFilter === "all") return;
    const team = (derived.teamLoads || []).find((t) => String(t.id) === teamFilter);
    if (!team || team.role !== deptFilter) setTeamFilter("all");
  }, [deptFilter, teamFilter, derived.teamLoads]);

  const resolvedRange = useMemo(() => resolveFloorDateRange(dateRange), [dateRange]);

  // Live Assigned/In Progress are a snapshot of right now — always computed
  // from current status, never date-scoped (there's no "queue as of Feb 2025").
  const liveTeamCounts = useMemo(() => {
    const map = {};
    if (!activeDeptKey) return map;
    active.forEach((v) => {
      const state = getOverviewDeptState(v, activeDeptKey);
      if (state !== "not_started" && state !== "in_progress") return;
      const teamId = v.work_stages?.[0]?.[`${activeDeptKey}_team_id`];
      if (teamId == null) return;
      if (!map[teamId]) map[teamId] = { assigned: 0, inProgress: 0 };
      if (state === "not_started") map[teamId].assigned += 1;
      else map[teamId].inProgress += 1;
    });
    return map;
  }, [active, activeDeptKey]);

  // Completed-in-range comes from vehicle_history (work_stages has no
  // {dept}_completed_at column). This deliberately does NOT scope by the
  // `vehicles` already loaded in this tab — that list only covers currently
  // active vehicles plus anything that entered today (see OwnerDashboard's
  // top-level fetch), so for any range more than a day or two old, most or
  // all of the matching vehicles have since fully exited and would silently
  // vanish from an `.in("vehicle_id", ids)` filter — this was confirmed live:
  // 93% of a real department's June completions belonged to vehicles no
  // longer in that set. Team attribution is resolved with a second, targeted
  // query against exactly the vehicle ids vehicle_history actually returned.
  const [completedCounts, setCompletedCounts] = useState(null);
  const [completedLoading, setCompletedLoading] = useState(false);
  useEffect(() => {
    if (!activeDeptKey) {
      setCompletedCounts(null);
      return;
    }
    let cancelled = false;
    setCompletedLoading(true);
    withTimeout(
      supabase
        .from("vehicle_history")
        .select("vehicle_id, created_at")
        .eq("stage", activeDeptKey)
        .in("action", ["work_completed", "force_completed"])
        .gte("created_at", resolvedRange.from)
        .lte("created_at", resolvedRange.to)
        .order("created_at", { ascending: false }),
    )
      .then(async ({ data, error }) => {
        if (error) throw error;
        if (cancelled) return;
        const vehicleIds = Array.from(new Set((data || []).map((row) => row.vehicle_id)));
        if (vehicleIds.length === 0) {
          setCompletedCounts({});
          return;
        }
        // A vehicle's team assignment is only known as of now (no historical
        // team-assignment log), so a completion from a while ago is credited
        // to whichever team is currently on record for that department —
        // the same known limitation as before, just no longer compounded by
        // silently dropping vehicles that have since exited.
        const { data: wsRows, error: wsErr } = await withTimeout(
          supabase
            .from("work_stages")
            .select(`vehicle_id, ${activeDeptKey}_team_id`)
            .in("vehicle_id", vehicleIds),
        );
        if (wsErr) throw wsErr;
        if (cancelled) return;
        const counts = {};
        (wsRows || []).forEach((row) => {
          const teamId = row[`${activeDeptKey}_team_id`];
          if (teamId != null) counts[teamId] = (counts[teamId] || 0) + 1;
        });
        setCompletedCounts(counts);
      })
      .catch((e) => {
        console.error("Floor team performance fetch error:", e);
        if (!cancelled) setCompletedCounts({});
      })
      .finally(() => {
        if (!cancelled) setCompletedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeDeptKey, resolvedRange.from, resolvedRange.to]);

  const teamPerf = useMemo(() => {
    const map = {};
    selectedDeptTeams.forEach((t) => {
      map[t.id] = {
        assigned: liveTeamCounts[t.id]?.assigned || 0,
        inProgress: liveTeamCounts[t.id]?.inProgress || 0,
        completed: completedCounts?.[t.id] || 0,
      };
    });
    return map;
  }, [selectedDeptTeams, liveTeamCounts, completedCounts]);

  const onSelectTeamPill = (id) => {
    setTeamFilter((prev) => (prev === id ? "all" : id));
  };

  const filteredVehicles = useMemo(() => {
    let result = active;
    if (teamFilter !== "all") {
      const team = (derived.teamLoads || []).find((t) => String(t.id) === teamFilter);
      const ids = new Set((team?.activeVehicles || []).map((v) => v.id));
      result = result.filter((v) => ids.has(v.id));
    }
    if (advisorFilter !== "all") {
      result = result.filter((v) => v.advisor_id === advisorFilter);
    }
    if (deptFilter !== "all") {
      result = result.filter((v) => getOverviewDeptState(v, deptFilter) !== "not_assigned");
    }
    return [...result].sort((a, b) => {
      const ta = a.entry_time ? new Date(a.entry_time).getTime() : 0;
      const tb = b.entry_time ? new Date(b.entry_time).getTime() : 0;
      return sortDir === "desc" ? tb - ta : ta - tb;
    });
  }, [active, teamFilter, advisorFilter, deptFilter, derived.teamLoads, sortDir]);

  const selectStyle = {
    padding: "7px 10px",
    border: `1px solid ${T.border}`,
    borderRadius: 6,
    fontSize: 13,
    color: T.text,
    background: T.surface,
    outline: "none",
    fontFamily: "inherit",
    cursor: "pointer",
  };

  const popoverVehicle = popover ? active.find((v) => v.id === popover.vehicleId) : null;

  return (
    <div>
      {/* Every control on one compact row — mode, the three filter facets,
          and sort — instead of stacked chip walls. All three facets still
          combine (AND) and still filter the table directly on change; a
          department with configured teams still expands the richer
          TeamPerformancePanel underneath the row. */}
      <Bx T={T} style={{ padding: "12px 18px", marginBottom: 16, borderRadius: 12 }}>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <SegmentedControl
            T={T}
            value={mode}
            onChange={setMode}
            size="sm"
            options={[
              ["table", "Floor View"],
              ["washing", "Washing View"],
            ]}
          />
          <div style={{ width: 1, alignSelf: "stretch", background: T.border }} />
          <FloorFacetSelect T={T} items={deptPills} activeId={deptFilter} onChange={setDeptFilter} allLabel="All Departments" />
          {deptFilter === "all" && (
            <FloorFacetSelect T={T} items={teamPills} activeId={teamFilter} onChange={setTeamFilter} allLabel="All Teams" />
          )}
          <FloorFacetSelect T={T} items={advisorPills} activeId={advisorFilter} onChange={setAdvisorFilter} allLabel="All Advisors" />
          {mode === "table" && (
            <select value={sortDir} onChange={(e) => setSortDir(e.target.value)} style={{ ...selectStyle, marginLeft: "auto" }}>
              <option value="desc">Entry — newest first</option>
              <option value="asc">Entry — oldest first</option>
            </select>
          )}
        </div>

        {deptFilter !== "all" &&
          (activeDeptKey ? (
            <TeamPerformancePanel
              T={T}
              deptLabel={OVERVIEW_WORKSHOP_DEPTS.find((d) => d.key === activeDeptKey)?.label || activeDeptKey}
              teams={selectedDeptTeams}
              activeTeamId={teamFilter}
              onSelectTeam={onSelectTeamPill}
              perf={teamPerf}
              perfLoading={completedLoading}
              includesToday={resolvedRange.includesToday}
              rangeLabel={resolvedRange.label}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
          ) : (
            <div style={{ fontSize: 12, color: T.textMuted, fontStyle: "italic", marginTop: 14 }}>
              No teams are configured for {OVERVIEW_WORKSHOP_DEPTS.find((d) => d.key === deptFilter)?.label || deptFilter}.
            </div>
          ))}
      </Bx>

      {mode === "washing" ? (
        <WashingFloorView T={T} vehicles={active} />
      ) : (
        <>
          <OverviewLegend T={T} view="overall" />

          <style>{FLOW_PULSE_KEYFRAMES}</style>
          {(() => {
            const floorCols = `100px 110px 120px repeat(${OVERVIEW_FLOW_STAGES.length}, minmax(70px,1fr)) 130px`;
            return (
              <div
                style={{
                  border: `1px solid ${T.border}`,
                  borderRadius: 14,
                  boxShadow: T.shadow,
                  overflow: "hidden",
                  background: T.surface,
                }}
              >
                <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: 640 }}>
                  <div style={{ minWidth: 900 }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: floorCols,
                        columnGap: 10,
                        padding: "13px 20px",
                        borderBottom: `1px solid ${T.border}`,
                        position: "sticky",
                        top: 0,
                        zIndex: 2,
                        background: T.surfaceElevated,
                      }}
                    >
                      {[
                        "Entry Time",
                        "Vehicle Number",
                        activeDeptKey ? "Team" : "Advisor Name",
                        ...OVERVIEW_FLOW_STAGES.map((s) => s.label),
                        "Exp. Completion",
                      ].map((label, i) => (
                        <div
                          key={i}
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            color: T.textMuted,
                            textTransform: "uppercase",
                            letterSpacing: "0.7px",
                            textAlign: i >= 3 ? "center" : "left",
                          }}
                        >
                          {label}
                        </div>
                      ))}
                    </div>
                    {filteredVehicles.length === 0 && (
                      <div style={{ padding: 40, textAlign: "center", color: T.textMuted, fontSize: 13 }}>No vehicles match this filter.</div>
                    )}
                    {filteredVehicles.map((v, rowIdx) => {
                      const stageInfos = OVERVIEW_FLOW_STAGES.map((s) => getOverviewFlowStage(v, s.key));
                      const firstIncompleteIdx = stageInfos.findIndex((s) => !s.done);
                      // Faint zebra striping (not a hard band, just enough tint to
                      // guide the eye across a wide row) plus a real hover state —
                      // the two combine additively so a hovered odd row doesn't
                      // look identical to a hovered even one.
                      const baseBg = rowIdx % 2 === 1 ? T.bg : "transparent";
                      return (
                        <div
                          key={v.id}
                          onMouseEnter={(e) => (e.currentTarget.style.background = T.surfaceElevated)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = baseBg)}
                          style={{
                            display: "grid",
                            gridTemplateColumns: floorCols,
                            columnGap: 10,
                            padding: "12px 20px",
                            borderBottom: `1px solid ${T.border}`,
                            alignItems: "center",
                            background: baseBg,
                            transition: "background .1s",
                          }}
                        >
                          <div style={{ fontSize: 12, color: T.textSecondary, whiteSpace: "nowrap" }}>{formatIST(v.entry_time)}</div>
                          <div>
                            <span
                              onClick={() => onVehiclePress(v)}
                              style={{ fontWeight: 700, color: T.blue, cursor: "pointer" }}
                            >
                              {v.vehicle_number}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: T.textSecondary, whiteSpace: "nowrap" }}>
                            {activeDeptKey
                              ? teamNameById.get(v.work_stages?.[0]?.[`${activeDeptKey}_team_id`]) ||
                                v.advisor?.full_name ||
                                "—"
                              : v.advisor?.full_name || "—"}
                          </div>
                          {OVERVIEW_FLOW_STAGES.map((s, i) => {
                            const info = stageInfos[i];
                            const isSkippedFlag = s.key === "front_checkup" && info.done && info.skipped;
                            return (
                              <div key={s.key}>
                                <FlowStepperCell
                                  T={T}
                                  label={s.label}
                                  isFirst={i === 0}
                                  isLast={i === OVERVIEW_FLOW_STAGES.length - 1}
                                  leftDone={i > 0 ? stageInfos[i - 1].done : false}
                                  rightDone={info.done}
                                  done={info.done}
                                  isCurrent={i === firstIncompleteIdx}
                                  isSkippedFlag={isSkippedFlag}
                                  isWorkshopCol={s.key === "workshop"}
                                  onWorkshopHover={(e) => handleWorkshopHover(e, v.id)}
                                  onWorkshopLeave={handleWorkshopLeave}
                                  onWorkshopClick={(e) => handleWorkshopClick(e, v.id)}
                                />
                              </div>
                            );
                          })}
                          <ExpectedCompletionCell
                            T={T}
                            exp={v.expected_completion_time}
                            exited={v.current_stage === "completed" || v.current_stage === "ready_for_exit"}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {popover && popoverVehicle && (
            <div ref={popoverRef} style={{ position: "fixed", top: popover.top, left: popover.left, zIndex: 200 }}>
              <WorkshopPreviewPopover T={T} vehicle={popoverVehicle} deptHistory={null} type="flow" />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── FINANCE TAB ──────────────────────────────────────────────────────────────
// ─── Finance: shared helpers (aging, export) ───────────────────────────────
// Standalone module functions (not component bodies), same pattern as
// todayISTDateStr()/dateRange() above — Date.now() here doesn't trip
// react-hooks/purity since only component/hook render bodies are checked.
function financeCreditAgeDays(group) {
  const oldest = (group.visits || []).reduce((min, v) => {
    if (!v.entry_time) return min;
    const t = new Date(toZ(v.entry_time)).getTime();
    return min === null || t < min ? t : min;
  }, null);
  if (oldest === null) return 0;
  return Math.max(0, Math.floor((Date.now() - oldest) / 86400000));
}
const FINANCE_AGE_BUCKETS = [
  { key: "fresh", label: "0-7 days", colorKey: "green" },
  { key: "aging", label: "8-30 days", colorKey: "amber" },
  { key: "overdue", label: "30+ days", colorKey: "red" },
];
function financeAgeBucketKey(days) {
  if (days <= 7) return "fresh";
  if (days <= 30) return "aging";
  return "overdue";
}
const FINANCE_METHOD_DEFS = [
  { key: "cash", label: "Cash", icon: "💵", colorKey: "green" },
  { key: "upi", label: "UPI", icon: "📱", colorKey: "accent" },
  { key: "card", label: "Card", icon: "💳", colorKey: "purple" },
  { key: "bank_transfer", label: "Bank", icon: "🏦", colorKey: "blue" },
];

// Both export functions take already-computed, already-filtered row arrays —
// "what you download" is built from the exact same data as "what you see",
// never a fresh query that could drift from the on-screen filtered view.
function exportFinanceExcel(sheetName, rows, filenamePrefix, rangeLabel) {
  if (!rows.length) return;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${filenamePrefix}_${rangeLabel}.xlsx`);
}
// Styled to match the royal theme (navy header row, gold rule under the
// title) so a downloaded report still looks like the dashboard it came from.
function exportFinancePdf(title, columns, rows, filenamePrefix, rangeLabel) {
  if (!rows.length) return;
  const doc = new jsPDF({ orientation: columns.length > 5 ? "landscape" : "portrait" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(22, 31, 56);
  doc.text(title, 14, 18);
  doc.setDrawColor(201, 120, 31);
  doc.setLineWidth(0.8);
  doc.line(14, 22, doc.internal.pageSize.getWidth() - 14, 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120, 116, 97);
  doc.text(rangeLabel, 14, 28);
  autoTable(doc, {
    startY: 34,
    head: [columns],
    body: rows,
    headStyles: { fillColor: [22, 31, 56], textColor: [244, 236, 216], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [247, 241, 230] },
    styles: { fontSize: 9, cellPadding: 4 },
  });
  doc.save(`${filenamePrefix}_${rangeLabel}.pdf`);
}

// Small pill-pair export control, reused by every exportable view below.
const FinanceExportButtons = ({ T, onExcel, onPdf, disabled }) => (
  <div style={{ display: "flex", gap: 8 }}>
    <button
      onClick={onExcel}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 13px",
        borderRadius: 16,
        border: `1px solid ${T.border}`,
        background: T.surface,
        color: disabled ? T.textMuted : T.textSecondary,
        fontSize: 12,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontFamily: "inherit",
      }}
    >
      📊 Excel
    </button>
    <button
      onClick={onPdf}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 13px",
        borderRadius: 16,
        border: `1px solid ${T.border}`,
        background: T.surface,
        color: disabled ? T.textMuted : T.textSecondary,
        fontSize: 12,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontFamily: "inherit",
      }}
    >
      📄 PDF
    </button>
  </div>
);

// Reuses the exact ringSegments/RING_R SVG-ring machinery built for
// Overview's Bookings ring — proven code, no new charting library.
// Ring + legend, structured exactly like Overview's BookingsRingPanel (ring
// left, hoverable legend rows right, count in the ring's center) instead of
// a separate ring plus a 4-tile grid plus a "Total" tile — one compact row
// instead of three stacked elements doing overlapping jobs.
function FinanceMethodPanel({ T, byMethod, total }) {
  const [hoverKey, setHoverKey] = useState(null);
  const segs = ringSegments(
    FINANCE_METHOD_DEFS.filter((d) => byMethod[d.key] > 0).map((d) => ({
      key: d.key,
      value: byMethod[d.key],
      color: T[d.colorKey],
    })),
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <div style={{ width: 168, height: 168, position: "relative", flexShrink: 0 }}>
        <svg width="168" height="168" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
          {segs.map((seg) => (
            <circle
              key={seg.key}
              cx="50"
              cy="50"
              r={RING_R}
              fill="none"
              stroke={seg.color}
              strokeWidth={hoverKey === seg.key ? 14 : 11}
              strokeDasharray={seg.dasharray}
              strokeDashoffset={seg.dashoffset}
              style={{ opacity: hoverKey && hoverKey !== seg.key ? 0.45 : 1, cursor: "pointer", transition: "stroke-width .12s,opacity .12s" }}
              onMouseEnter={() => setHoverKey(seg.key)}
              onMouseLeave={() => setHoverKey(null)}
            />
          ))}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: T.text, textAlign: "center", padding: "0 6px" }}>{fmt(total)}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0, flex: 1 }}>
        {FINANCE_METHOD_DEFS.filter((d) => byMethod[d.key] > 0).map((d) => (
          <div
            key={d.key}
            onMouseEnter={() => setHoverKey(d.key)}
            onMouseLeave={() => setHoverKey(null)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              fontSize: 12.5,
              color: T.textSecondary,
              padding: "3px 7px",
              borderRadius: 6,
              cursor: "pointer",
              transition: "background .1s",
              background: hoverKey === d.key ? T[d.colorKey] + "18" : "transparent",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 600 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: T[d.colorKey], flexShrink: 0 }} />
              {d.label}
            </span>
            <b style={{ color: T.text, fontWeight: 700 }}>{fmt(byMethod[d.key])}</b>
          </div>
        ))}
        {total === 0 && <span style={{ fontSize: 12.5, color: T.textMuted }}>No collections yet today</span>}
      </div>
    </div>
  );
}

// Stacked proportional bar for the credit-aging breakdown — same
// ringSegments proportional math as the ring above, just rendered flat.
function FinanceAgingBar({ T, buckets, total }) {
  return (
    <div>
      <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", background: T.surfaceElevated }}>
        {buckets.map((b) =>
          b.amount > 0 ? (
            <div
              key={b.key}
              style={{ width: `${total > 0 ? (b.amount / total) * 100 : 0}%`, background: T[b.colorKey] }}
              title={`${b.label}: ${fmt(b.amount)}`}
            />
          ) : null,
        )}
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 8, flexWrap: "wrap" }}>
        {buckets.map((b) => (
          <div key={b.key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: T[b.colorKey], flexShrink: 0 }} />
            <span style={{ color: T.textSecondary, fontWeight: 600 }}>{b.label}</span>
            <span style={{ color: T.text, fontWeight: 700 }}>{fmt(b.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Bordered card matching Overview's FilterCard — same "looks like a card,
// not a transparent label" treatment, doubling as a click-through to the
// relevant sub-view below (consistent with Overview's click-a-stat pattern).
// Sized to match Overview's FilterCard exactly (8px/12px padding, 23px
// value) — four of these together take less height than the old two
// oversized cards did.
const FinanceStatCard = ({ T, label, value, sub, colorKey, active, onClick }) => (
  <div
    onClick={onClick}
    style={{
      flex: 1,
      minWidth: 0,
      background: active ? T.accentBg : T.surface,
      border: `1px solid ${active ? T.accent : T.border}`,
      borderTop: `4px solid ${T.accent}`,
      borderRadius: 12,
      padding: "8px 12px",
      cursor: "pointer",
    }}
  >
    <div style={{ fontSize: 22, fontWeight: 700, color: T[colorKey], lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 12.5, color: T.textSecondary, fontWeight: 600, marginTop: 4 }}>{label}</div>
    {sub && <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 2 }}>{sub}</div>}
  </div>
);

const FINANCE_TODAY_COLS = "1.3fr 1.3fr 1fr .9fr 1.2fr .9fr .9fr";
const FINANCE_ALL_COLS = "1.3fr 1.3fr 1fr .9fr 1.1fr .9fr";
const FINANCE_OUTSTANDING_COLS = "1.1fr 1.3fr 1fr .8fr .8fr .9fr 1.1fr .9fr";
const FINANCE_CREDIT_COLS = "1.2fr 1.6fr .7fr .8fr 1fr .3fr";

const FINANCE_DATE_PRESETS = [
  ["today", "Today"],
  ["7days", "7 Days"],
  ["30days", "30 Days"],
  ["custom", "Custom"],
];

function FinanceTab({
  T,
  derived,
  todayPayments,
  allPayments,
  creditVehicles,
}) {
  const [sub, setSub] = useState("today");
  const [search, setSearch] = useState("");
  // All Transactions defaults to the last 30 days, not unbounded history —
  // allPayments is fetched with no date cap, and showing every payment ever
  // by default doesn't scale once the shop's been running a while (same
  // "don't default to everything" principle as Overview's Bookings ring
  // defaulting to Today rather than all-time).
  const [datePreset, setDatePreset] = useState("30days");
  const [cf, setCf] = useState("");
  const [ct, setCt] = useState("");
  const [mf, setMf] = useState("all");
  const [sortKey, setSortKey] = useState("time");
  const [sortDir, setSortDir] = useState("desc");
  const [creditSort, setCreditSort] = useState("amount"); // amount | age

  const { todayCollection, totalOutstandingCredit, creditGroups } = derived;
  const realP = todayPayments.filter((p) => p.payment_method !== "credit");
  const byMethod = {};
  FINANCE_METHOD_DEFS.forEach(({ key: m }) => {
    byMethod[m] =
      m === "upi"
        ? realP.filter((p) => p.payment_method?.startsWith("upi_")).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
        : realP.filter((p) => p.payment_method === m).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  });
  // Every total here is the sum of the same 4 tiles shown below it — not a
  // separately-recomputed number — so a mismatch between "Today by Method"
  // and "Today's Collection" is structurally impossible, not coincidental.
  const methodTotal = FINANCE_METHOD_DEFS.reduce((s, d) => s + byMethod[d.key], 0);

  // A CEO glancing at Finance wants more than one point-in-time number —
  // "is today normal" needs a baseline. Month-to-date and a 30-day daily
  // average give that context without a separate chart. Both computed from
  // the same allPayments array the rest of the tab already uses.
  const todayIST = todayISTDateStr();
  const monthStart = `${todayIST.slice(0, 7)}-01`;
  const mtdCollection = allPayments
    .filter((p) => p.payment_method !== "credit" && istDateStr(p.created_at) >= monthStart && istDateStr(p.created_at) <= todayIST)
    .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const { from: d30From, to: d30To } = dateRange("30days", "", "");
  const avgPerDay =
    allPayments
      .filter(
        (p) =>
          p.payment_method !== "credit" &&
          new Date(toZ(p.created_at)) >= new Date(d30From + "T00:00:00") &&
          new Date(toZ(p.created_at)) <= new Date(d30To + "T23:59:59"),
      )
      .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0) / 30;

  const { from: rangeFrom, to: rangeTo } = dateRange(datePreset, cf, ct);
  const rangeLabel = rangeFrom === rangeTo ? rangeFrom : `${rangeFrom}_to_${rangeTo}`;

  const filtAll =
    mf === "outstanding"
      ? []
      : allPayments.filter((p) => {
          const m =
            !search.trim() ||
            (p.vehicle?.vehicle_number || "").toLowerCase().includes(search.toLowerCase()) ||
            (p.vehicle?.customer_name || "").toLowerCase().includes(search.toLowerCase());
          const fd = new Date(toZ(p.created_at)) >= new Date(rangeFrom + "T00:00:00");
          const td = new Date(toZ(p.created_at)) <= new Date(rangeTo + "T23:59:59");
          const fm = mf === "all" || (mf === "upi" ? p.payment_method?.startsWith("upi_") : p.payment_method === mf);
          return m && fd && td && fm;
        });
  // Not useMemo — filtAll is already a fresh array/reference every render
  // (it's built inline above from allPayments.filter()), so memoizing on it
  // would never actually hit cache; a plain sort is just as cheap here.
  const sortedAll = [...filtAll].sort((a, b) => {
    let av, bv;
    if (sortKey === "amount") {
      av = parseFloat(a.amount) || 0;
      bv = parseFloat(b.amount) || 0;
    } else if (sortKey === "vehicle") {
      av = a.vehicle?.vehicle_number || "";
      bv = b.vehicle?.vehicle_number || "";
    } else {
      av = new Date(a.created_at).getTime();
      bv = new Date(b.created_at).getTime();
    }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });
  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };
  // Footer total computed from this same sortedAll/filtAll array — the
  // number on screen and the number in the export are the same variable.
  const allCollected = filtAll.filter((p) => p.payment_method !== "credit").reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const allCreditGiven = filtAll.filter((p) => p.payment_method === "credit").reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

  const filtOut = (creditVehicles || []).filter(
    (v) =>
      !search.trim() ||
      (v.vehicle_number || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.customer_name || "").toLowerCase().includes(search.toLowerCase()),
  );
  const outstandingTotal = filtOut.reduce((s, v) => s + (parseFloat(v.credit_amount) || 0), 0);

  // Aging buckets — must sum to totalOutstandingCredit exactly, since every
  // group.total_credit is bucketed once and only once.
  const creditAgingBuckets = useMemo(
    () =>
      FINANCE_AGE_BUCKETS.map((b) => ({
        ...b,
        amount: creditGroups.reduce((s, g) => (financeAgeBucketKey(financeCreditAgeDays(g)) === b.key ? s + g.total_credit : s), 0),
      })),
    [creditGroups],
  );
  const sortedCreditGroups = useMemo(() => {
    const arr = [...creditGroups];
    if (creditSort === "age") arr.sort((a, b) => financeCreditAgeDays(b) - financeCreditAgeDays(a));
    return arr; // "amount" — already sorted desc by total_credit from `derived`
  }, [creditGroups, creditSort]);

  const exportRowsExcel = () => {
    if (sub === "today") {
      exportFinanceExcel(
        "Today",
        todayPayments.map((p) => ({
          Vehicle: p.vehicle?.vehicle_number || "",
          Customer: p.vehicle?.customer_name || "",
          Amount: p.amount || 0,
          Method: p.payment_method || "",
          "Collected By": p.collector?.full_name || "",
          Time: formatIST(p.created_at),
          Guarantor: p.vehicle?.credit_guaranteed_by || "",
        })),
        "Finance_Today",
        todayISTDateStr(),
      );
    } else if (sub === "credit") {
      exportFinanceExcel(
        "Credit Ledger",
        creditGroups.map((g) => ({
          Vehicle: g.vehicle_number,
          Customer: g.customer_name || "",
          Phone: g.customer_phone || "",
          "Outstanding": g.total_credit,
          "Days Outstanding": financeCreditAgeDays(g),
          Visits: g.visits.length,
        })),
        "Finance_CreditLedger",
        todayISTDateStr(),
      );
    } else if (mf === "outstanding") {
      exportFinanceExcel(
        "Outstanding",
        filtOut.map((v) => ({
          Vehicle: v.vehicle_number,
          Customer: v.customer_name || "",
          Phone: v.customer_phone || "",
          Bill: v.bill_amount || 0,
          Paid: v.total_paid || 0,
          Credit: v.credit_amount || 0,
          "Guaranteed By": v.credit_guaranteed_by || "",
          Date: formatIST(v.entry_time),
        })),
        "Finance_Outstanding",
        rangeLabel,
      );
    } else {
      exportFinanceExcel(
        "Transactions",
        sortedAll.map((p) => ({
          Vehicle: p.vehicle?.vehicle_number || "",
          Customer: p.vehicle?.customer_name || "",
          Amount: p.amount || 0,
          Method: p.payment_method || "",
          By: p.collector?.full_name || "",
          Time: formatIST(p.created_at),
        })),
        "Finance_Transactions",
        rangeLabel,
      );
    }
  };
  const exportRowsPdf = () => {
    if (sub === "today") {
      exportFinancePdf(
        "Today's Transactions",
        ["Vehicle", "Customer", "Amount", "Method", "Collected By", "Time"],
        todayPayments.map((p) => [
          p.vehicle?.vehicle_number || "—",
          p.vehicle?.customer_name || "—",
          fmt(p.amount),
          p.payment_method || "",
          p.collector?.full_name || "—",
          formatIST(p.created_at),
        ]),
        "Finance_Today",
        todayISTDateStr(),
      );
    } else if (sub === "credit") {
      exportFinancePdf(
        "Credit Ledger",
        ["Vehicle", "Customer", "Phone", "Outstanding", "Days Outstanding"],
        creditGroups.map((g) => [g.vehicle_number, g.customer_name || "—", g.customer_phone || "—", fmt(g.total_credit), String(financeCreditAgeDays(g))]),
        "Finance_CreditLedger",
        todayISTDateStr(),
      );
    } else if (mf === "outstanding") {
      exportFinancePdf(
        "Outstanding Credit",
        ["Vehicle", "Customer", "Bill", "Paid", "Credit", "Guaranteed By"],
        filtOut.map((v) => [v.vehicle_number, v.customer_name || "—", fmt(v.bill_amount), fmt(v.total_paid), fmt(v.credit_amount), v.credit_guaranteed_by || "—"]),
        "Finance_Outstanding",
        rangeLabel,
      );
    } else {
      exportFinancePdf(
        "Transactions",
        ["Vehicle", "Customer", "Amount", "Method", "By", "Time"],
        sortedAll.map((p) => [p.vehicle?.vehicle_number || "—", p.vehicle?.customer_name || "—", fmt(p.amount), p.payment_method || "", p.collector?.full_name || "—", formatIST(p.created_at)]),
        "Finance_Transactions",
        rangeLabel,
      );
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 20, marginBottom: 18, alignItems: "stretch", flexWrap: "wrap" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, flex: "1 1 320px", minWidth: 280 }}>
          <FinanceStatCard
            T={T}
            label="Today's Collection"
            value={fmt(todayCollection)}
            sub={`${realP.length} txn${realP.length !== 1 ? "s" : ""}`}
            colorKey="green"
            active={sub === "today"}
            onClick={() => setSub("today")}
          />
          <FinanceStatCard
            T={T}
            label="This Month"
            value={fmt(mtdCollection)}
            sub={new Date(`${monthStart}T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
            colorKey="text"
          />
          <FinanceStatCard
            T={T}
            label="Credit Outstanding"
            value={fmt(totalOutstandingCredit)}
            sub={`${creditGroups.length} vehicle${creditGroups.length !== 1 ? "s" : ""}`}
            colorKey="amber"
            active={sub === "credit"}
            onClick={() => setSub("credit")}
          />
          <FinanceStatCard T={T} label="Avg / Day (30d)" value={fmt(avgPerDay)} sub="baseline for today" colorKey="text" />
        </div>

        <div style={{ width: 320, flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 8 }}>
            Today by Method
          </div>
          <FinanceMethodPanel T={T} byMethod={byMethod} total={methodTotal} />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
          {[
            ["today", "Today's Transactions"],
            ["credit", "Credit Ledger"],
            ["all", "All Transactions"],
          ].map(([k, l]) => (
            <div
              key={k}
              onClick={() => setSub(k)}
              style={{
                padding: "7px 15px",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                background: sub === k ? T.text : T.surface,
                color: sub === k ? T.accentBg : T.textSecondary,
              }}
            >
              {l}
            </div>
          ))}
        </div>
        <FinanceExportButtons
          T={T}
          onExcel={exportRowsExcel}
          onPdf={exportRowsPdf}
          disabled={
            (sub === "today" && todayPayments.length === 0) ||
            (sub === "credit" && creditGroups.length === 0) ||
            (sub === "all" && (mf === "outstanding" ? filtOut.length === 0 : filtAll.length === 0))
          }
        />
      </div>

      {sub === "today" && (
        <div>
          {todayPayments.length === 0 ? (
            <Empty T={T} icon="💳" text="No transactions today" />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 760 }}>
                <TableHeader
                  T={T}
                  cols={FINANCE_TODAY_COLS}
                  columns={[
                    { label: "Vehicle" },
                    { label: "Customer" },
                    { label: "Amount" },
                    { label: "Method" },
                    { label: "Collected By" },
                    { label: "Time" },
                    { label: "Guarantor" },
                  ]}
                />
                {todayPayments.map((p) => (
                  <TableRow key={p.id} T={T} cols={FINANCE_TODAY_COLS}>
                    <div>
                      <span style={{ fontWeight: 700, color: T.text }}>{p.vehicle?.vehicle_number || "—"}</span>
                    </div>
                    <div style={{ color: T.textSecondary }}>{p.vehicle?.customer_name || "—"}</div>
                    <div style={{ fontWeight: 800, color: p.payment_method === "credit" ? T.amber : T.green }}>
                      {p.payment_method === "credit" ? "−" : "+"}
                      {fmt(p.amount)}
                    </div>
                    <div>
                      <Chip color={T.blue} bg={T.blueLight}>
                        {p.payment_method === "bank_transfer" ? "Bank" : p.payment_method}
                      </Chip>
                    </div>
                    <div style={{ color: T.textSecondary }}>{p.collector?.full_name || "—"}</div>
                    <div style={{ color: T.textMuted, fontSize: 11 }}>{formatIST(p.created_at)}</div>
                    <div style={{ color: T.amber, fontSize: 11 }}>{p.vehicle?.credit_guaranteed_by || "—"}</div>
                  </TableRow>
                ))}
                <TableFooter T={T} cols={FINANCE_TODAY_COLS}>
                  <div style={{ fontWeight: 800, color: T.text }}>Total</div>
                  <div />
                  <div style={{ fontWeight: 800, color: T.green }}>{fmt(todayCollection)}</div>
                  <div />
                  <div />
                  <div />
                  <div />
                </TableFooter>
              </div>
            </div>
          )}
        </div>
      )}

      {sub === "credit" && (
        <div>
          {creditGroups.length === 0 ? (
            <Empty T={T} icon="✅" text="No outstanding credits" />
          ) : (
            <>
              <Bx T={T} style={{ marginBottom: 14, background: T.amberLight, border: `1px solid ${T.amber}44` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                  <span style={{ fontWeight: 700, color: T.amber }}>📋 Total Outstanding — by age</span>
                  <span style={{ fontSize: 22, fontWeight: 700, color: T.amber }}>{fmt(totalOutstandingCredit)}</span>
                </div>
                <FinanceAgingBar T={T} buckets={creditAgingBuckets} total={totalOutstandingCredit} />
              </Bx>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: T.textMuted, alignSelf: "center", marginRight: 4 }}>Sort by</span>
                {[
                  ["amount", "Amount"],
                  ["age", "Oldest first"],
                ].map(([k, l]) => (
                  <button
                    key={k}
                    onClick={() => setCreditSort(k)}
                    style={{
                      padding: "4px 11px",
                      borderRadius: 14,
                      border: `1px solid ${creditSort === k ? T.accent : T.border}`,
                      background: creditSort === k ? T.accentBg : T.surface,
                      color: creditSort === k ? T.accent : T.textSecondary,
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <div style={{ overflowX: "auto" }}>
                <div style={{ minWidth: 600 }}>
                  <TableHeader
                    T={T}
                    cols={FINANCE_CREDIT_COLS}
                    columns={[{ label: "Vehicle" }, { label: "Customer" }, { label: "Visits" }, { label: "Age" }, { label: "Outstanding" }, { label: "" }]}
                  />
                  {sortedCreditGroups.map((g) => (
                    <CreditRow key={g.vehicle_number} T={T} group={g} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {sub === "all" && (
        <div>
          <Bx T={T} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
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
              <div style={{ display: "flex", border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
                {FINANCE_DATE_PRESETS.map(([k, l]) => (
                  <div
                    key={k}
                    onClick={() => setDatePreset(k)}
                    style={{
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      background: datePreset === k ? T.text : T.surface,
                      color: datePreset === k ? T.accentBg : T.textSecondary,
                    }}
                  >
                    {l}
                  </div>
                ))}
              </div>
              {datePreset === "custom" && (
                <>
                  <input
                    type="date"
                    value={cf}
                    onChange={(e) => setCf(e.target.value)}
                    style={{ padding: "7px 10px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 13, fontFamily: "inherit", background: T.surface, color: T.text }}
                  />
                  <span style={{ color: T.textMuted }}>→</span>
                  <input
                    type="date"
                    value={ct}
                    onChange={(e) => setCt(e.target.value)}
                    style={{ padding: "7px 10px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 13, fontFamily: "inherit", background: T.surface, color: T.text }}
                  />
                </>
              )}
              <span style={{ fontSize: 11, color: T.textMuted }}>
                📅 {rangeFrom === rangeTo ? rangeFrom : `${rangeFrom} → ${rangeTo}`}
              </span>
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
                    border: `1px solid ${mf === m ? T.accent : T.border}`,
                    background: mf === m ? T.accent : T.surface,
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", textAlign: "center", gap: 10, padding: "4px 0" }}>
              {mf === "outstanding" ? (
                <>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Outstanding</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: T.amber }}>{fmt(outstandingTotal)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Vehicles</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>{filtOut.length}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Avg Per Vehicle</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: T.amber }}>
                      {filtOut.length > 0 ? fmt(outstandingTotal / filtOut.length) : "—"}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Collected</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: T.green }}>{fmt(allCollected)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Credit Given</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: T.amber }}>{fmt(allCreditGiven)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Transactions</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>{filtAll.length}</div>
                  </div>
                </>
              )}
            </div>
          </Bx>

          {mf === "outstanding" ? (
            filtOut.length === 0 ? (
              <Empty T={T} icon="✅" text="No outstanding credits" />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <div style={{ minWidth: 780 }}>
                  <TableHeader
                    T={T}
                    cols={FINANCE_OUTSTANDING_COLS}
                    columns={[
                      { label: "Vehicle" },
                      { label: "Customer" },
                      { label: "Phone" },
                      { label: "Bill" },
                      { label: "Paid" },
                      { label: "Credit" },
                      { label: "Guaranteed By" },
                      { label: "Date" },
                    ]}
                  />
                  {filtOut.map((v) => (
                    <TableRow key={v.id} T={T} cols={FINANCE_OUTSTANDING_COLS}>
                      <div>
                        <span style={{ fontWeight: 700, color: T.text }}>{v.vehicle_number}</span>
                      </div>
                      <div style={{ color: T.textSecondary }}>{v.customer_name || "—"}</div>
                      <div style={{ color: T.textSecondary }}>{v.customer_phone || "—"}</div>
                      <div>{fmt(v.bill_amount)}</div>
                      <div style={{ color: T.green }}>{fmt(v.total_paid)}</div>
                      <div style={{ color: T.amber, fontWeight: 800 }}>{fmt(v.credit_amount)}</div>
                      <div style={{ color: T.amber }}>{v.credit_guaranteed_by || "—"}</div>
                      <div style={{ color: T.textMuted, fontSize: 11 }}>{formatIST(v.entry_time)}</div>
                    </TableRow>
                  ))}
                  <TableFooter T={T} cols={FINANCE_OUTSTANDING_COLS}>
                    <div style={{ fontWeight: 800, color: T.text }}>Total</div>
                    <div />
                    <div />
                    <div />
                    <div />
                    <div style={{ fontWeight: 800, color: T.amber }}>{fmt(outstandingTotal)}</div>
                    <div />
                    <div />
                  </TableFooter>
                </div>
              </div>
            )
          ) : filtAll.length === 0 ? (
            <Empty T={T} icon="🔍" text="No transactions found" />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 700 }}>
                <TableHeader
                  T={T}
                  cols={FINANCE_ALL_COLS}
                  columns={[
                    { label: "Vehicle", onSort: () => toggleSort("vehicle"), active: sortKey === "vehicle", dir: sortDir },
                    { label: "Customer" },
                    { label: "Amount", onSort: () => toggleSort("amount"), active: sortKey === "amount", dir: sortDir },
                    { label: "Method" },
                    { label: "By" },
                    { label: "Time", onSort: () => toggleSort("time"), active: sortKey === "time", dir: sortDir },
                  ]}
                />
                {sortedAll.map((p) => (
                  <TableRow key={p.id} T={T} cols={FINANCE_ALL_COLS}>
                    <div>
                      <span style={{ fontWeight: 700, color: T.text }}>{p.vehicle?.vehicle_number || "—"}</span>
                    </div>
                    <div style={{ color: T.textSecondary }}>{p.vehicle?.customer_name || "—"}</div>
                    <div style={{ fontWeight: 800, color: p.payment_method === "credit" ? T.amber : T.green }}>
                      {p.payment_method === "credit" ? "−" : "+"}
                      {fmt(p.amount)}
                    </div>
                    <div>
                      <Chip color={T.blue} bg={T.blueLight}>
                        {p.payment_method === "bank_transfer" ? "Bank" : p.payment_method}
                      </Chip>
                    </div>
                    <div style={{ color: T.textSecondary }}>{p.collector?.full_name || "—"}</div>
                    <div style={{ color: T.textMuted, fontSize: 11 }}>{formatIST(p.created_at)}</div>
                  </TableRow>
                ))}
                <TableFooter T={T} cols={FINANCE_ALL_COLS}>
                  <div style={{ fontWeight: 800, color: T.text }}>Total</div>
                  <div />
                  <div style={{ fontWeight: 800 }}>
                    <span style={{ color: T.green }}>+{fmt(allCollected)}</span>
                    {allCreditGiven > 0 && <span style={{ color: T.amber, marginLeft: 8 }}>−{fmt(allCreditGiven)}</span>}
                  </div>
                  <div />
                  <div />
                  <div />
                </TableFooter>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CreditRow({ T, group }) {
  const [exp, setExp] = useState(false);
  const ageDays = financeCreditAgeDays(group);
  const bucket = FINANCE_AGE_BUCKETS.find((b) => b.key === financeAgeBucketKey(ageDays));
  return (
    <>
      <TableRow T={T} cols={FINANCE_CREDIT_COLS} onClick={() => setExp(!exp)}>
        <div>
          <span style={{ fontWeight: 700, color: T.text }}>{group.vehicle_number}</span>
        </div>
        <div style={{ color: T.textSecondary, fontSize: 13 }}>
          {group.customer_name} • {group.customer_phone}
        </div>
        <div style={{ color: T.textMuted, fontSize: 12 }}>
          {group.visits.length} visit{group.visits.length !== 1 ? "s" : ""}
        </div>
        <div>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              color: T[bucket.colorKey],
              background: T[bucket.colorKey] + "18",
              border: `1px solid ${T[bucket.colorKey]}44`,
              borderRadius: 10,
              padding: "1px 8px",
              whiteSpace: "nowrap",
            }}
          >
            {ageDays}d
          </span>
        </div>
        <div style={{ fontWeight: 700, color: T.amber }}>{fmt(group.total_credit)}</div>
        <div style={{ textAlign: "right", color: T.textMuted }}>{exp ? "▲" : "▼"}</div>
      </TableRow>
      {exp && (
        <div style={{ padding: "2px 0 12px", display: "grid", gap: 6 }}>
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
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Bill: {fmt(v.bill_amount)}</span>
                <span style={{ fontSize: 11, color: T.textMuted, marginLeft: 10 }}>{formatIST(v.entry_time)}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.amber }}>Credit: {fmt(v.credit_amount)}</span>
            </div>
          ))}
        </div>
      )}
    </>
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

// ─── Force PDI / Force Exit — on-screen views ──────────────────────────────────
const FORCE_ROLE_ORDER = [
  "mechanic",
  "denter",
  "electrician",
  "painter",
  "three_m",
  "alignment_balancing",
  "washing",
  "front_checkup",
  "advisor_review",
  "billing",
  "cashier",
];
// target_role='advisor' covers two very different real cases — no advisor was
// ever assigned (stage='advisor_review') vs an advisor WAS assigned but never
// finished PDI (stage='pdi', target_user_id = that advisor) — previously both
// were merged under one "Advisor / PDI" bucket. Split them, and further split
// the PDI case per advisor (target_user_id is reliably populated there) so a
// specific advisor's PDI misses can be checked directly.
const forceGroupRole = (h) => {
  const role = h.target_role || h.stage;
  if (role === "advisor" && h.stage === "pdi") {
    return h.target_user?.full_name ? `pdi_advisor:${h.target_user.full_name}` : "pdi_advisor:Unassigned";
  }
  if (role === "advisor" && h.stage === "advisor_review") return "advisor_review";
  return role;
};
const forceRoleLabel = (role) => {
  if (role === "advisor_review") return "Advisor Review";
  if (role?.startsWith("pdi_advisor:")) return `PDI - ${role.slice("pdi_advisor:".length)}`;
  if (role === "cashier") return "Cashier / Payment";
  return STAGE_META[role]?.label || (role || "unknown").replace(/_/g, " ");
};

// deptHist (Force PDI's force_completed/work_cancelled) and exitDetailHist
// (Force Exit's force_exit_incomplete) are already each scoped to exactly one
// flow by fetchForcePdiExitData, so which array a row came from is enough to
// label it Force PDI vs Force Exit — no need to re-check the sibling summary
// row's action type.
function buildForceDeptGroups({ deptHist, exitDetailHist }) {
  const rows = [
    ...deptHist.map((h) => ({
      role: forceGroupRole(h),
      vehicleNumber: h.vehicle?.vehicle_number || "",
      customer: h.vehicle?.customer_name || "",
      by: h.user?.full_name || "—",
      team: h.target_team?.name || "",
      worker: h.target_user?.full_name || "",
      type: "Force PDI",
      what: h.action === "force_completed" ? "Force Completed" : "Cancelled",
      time: h.created_at,
      notes: h.notes || "",
    })),
    ...exitDetailHist.map((h) => ({
      role: forceGroupRole(h),
      vehicleNumber: h.vehicle?.vehicle_number || "",
      customer: h.vehicle?.customer_name || "",
      by: h.user?.full_name || "—",
      team: h.target_team?.name || "",
      worker: h.target_user?.full_name || "",
      type: "Force Exit",
      what: h.new_value || "Incomplete at exit",
      time: h.created_at,
      notes: h.notes || "",
    })),
  ];
  const groups = {};
  rows.forEach((r) => {
    const key = r.role || "unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  Object.values(groups).forEach((list) =>
    list.sort((a, b) => new Date(b.time) - new Date(a.time)),
  );
  return groups;
}

function buildForceVehicleRows({ veh, pdiSummary, deptHist, exitHist, exitDetailHist }) {
  const pdiByVehicle = new Map();
  pdiSummary.forEach((h) => {
    if (!pdiByVehicle.has(h.vehicle_id)) pdiByVehicle.set(h.vehicle_id, h);
  });
  const exitByVehicle = new Map();
  exitHist.forEach((h) => {
    if (!exitByVehicle.has(h.vehicle_id)) exitByVehicle.set(h.vehicle_id, h);
  });
  const deptForcedByVehicle = new Map();
  deptHist.forEach((h) => {
    if (!deptForcedByVehicle.has(h.vehicle_id)) deptForcedByVehicle.set(h.vehicle_id, []);
    deptForcedByVehicle.get(h.vehicle_id).push(h);
  });
  const incompleteByVehicle = new Map();
  exitDetailHist.forEach((h) => {
    if (!incompleteByVehicle.has(h.vehicle_id)) incompleteByVehicle.set(h.vehicle_id, []);
    incompleteByVehicle.get(h.vehicle_id).push(h);
  });

  return veh.map((v) => {
    const incompletes = incompleteByVehicle.get(v.id) || [];
    const byRole = (role) => incompletes.find((h) => h.target_role === role);
    const fcExit = byRole("front_checkup");
    const advisorExit = incompletes.find(
      (h) => h.target_role === "advisor" && h.stage === "advisor_review",
    );
    const pdiExit = incompletes.find((h) => h.target_role === "advisor" && h.stage === "pdi");
    const billingExit = byRole("billing");
    const cashierExit = byRole("cashier");
    const deptForced = deptForcedByVehicle.get(v.id) || [];
    const deptExitIncomplete = incompletes.filter((h) => DEPT_KEYS.includes(h.target_role));
    const pdiForced = pdiByVehicle.get(v.id);
    const exitEvent = exitByVehicle.get(v.id);

    return {
      vehicle: v,
      entry: { status: "done", time: v.entry_time },
      frontCheckup: fcExit
        ? { status: "force_exit", by: fcExit.user?.full_name, time: fcExit.created_at }
        : v.fc_completed
          ? { status: "done" }
          : v.fc_skipped_at
            ? { status: "skipped", time: v.fc_skipped_at }
            : v.fc_cancelled
              ? { status: "cancelled" }
              : { status: "pending" },
      advisor: advisorExit
        ? { status: "force_exit", by: advisorExit.user?.full_name, time: advisorExit.created_at }
        : v.advisor_id || v.bodyshop_advisor_id
          ? { status: "done" }
          : { status: "pending" },
      workshop:
        deptForced.length || deptExitIncomplete.length
          ? {
              status: "forced",
              items: [
                ...deptForced.map((h) => ({
                  dept: h.target_role || h.stage,
                  label: h.action === "force_completed" ? "Force Completed" : "Cancelled",
                  by: h.user?.full_name,
                })),
                ...deptExitIncomplete.map((h) => ({
                  dept: h.target_role,
                  label: "Incomplete at exit",
                  by: h.user?.full_name,
                })),
              ],
            }
          : { status: "ok" },
      pdi: pdiExit
        ? { status: "force_exit", by: pdiExit.user?.full_name, time: pdiExit.created_at }
        : pdiForced
          ? { status: "forced", by: pdiForced.user?.full_name, time: pdiForced.created_at }
          : v.pdi_completed_at
            ? { status: "done", time: v.pdi_completed_at }
            : { status: "pending" },
      billing: billingExit
        ? { status: "force_exit", by: billingExit.user?.full_name, time: billingExit.created_at }
        : parseFloat(v.bill_amount) > 0
          ? { status: "done" }
          : { status: "pending" },
      cashier: cashierExit
        ? { status: "force_exit", by: cashierExit.user?.full_name, time: cashierExit.created_at }
        : v.payment_status === "paid" || v.payment_status === "credit"
          ? { status: "done" }
          : { status: "pending" },
      exit: exitEvent
        ? { status: "force_exit", by: exitEvent.user?.full_name, time: exitEvent.created_at }
        : v.current_stage === "completed"
          ? { status: "done", time: v.actual_completion_time }
          : { status: "pending" },
    };
  });
}

const FORCE_DEPT_COLS = "1fr 1.2fr .9fr 1.5fr 1.1fr .9fr 1fr";
const FORCE_STATUS_META = {
  done: { label: "Done", color: "#059669", bg: "#05966922" },
  ok: { label: "OK", color: "#059669", bg: "#05966922" },
  pending: { label: "Pending", color: "#94a3b8", bg: "#94a3b822" },
  skipped: { label: "Skipped", color: "#d97706", bg: "#d9770622" },
  cancelled: { label: "Cancelled", color: "#d97706", bg: "#d9770622" },
  forced: { label: "Force PDI", color: "#dc2626", bg: "#dc262622" },
  force_exit: { label: "Force Exit", color: "#dc2626", bg: "#dc262622" },
};
const ForceStatusChip = ({ status, label }) => {
  const meta = FORCE_STATUS_META[status] || FORCE_STATUS_META.pending;
  return (
    <Chip color={meta.color} bg={meta.bg}>
      {label || meta.label}
    </Chip>
  );
};

function ForceByDepartmentView({ T, data }) {
  const groups = useMemo(() => buildForceDeptGroups(data), [data]);
  const roles = FORCE_ROLE_ORDER.filter((r) => groups[r]?.length > 0);
  const extraRoles = Object.keys(groups)
    .filter((r) => !FORCE_ROLE_ORDER.includes(r))
    .sort((a, b) => forceRoleLabel(a).localeCompare(forceRoleLabel(b)));
  const allRoles = [...roles, ...extraRoles];
  if (allRoles.length === 0) return <Empty T={T} icon="✅" text="No Force PDI or Force Exit events in this range" />;
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {allRoles.map((role) => (
        <Bx T={T} key={role} style={{ padding: 16 }}>
          <SecTitle T={T} action={<Chip color={T.textMuted} bg={T.surfaceElevated}>{groups[role].length}</Chip>}>
            {forceRoleLabel(role)}
          </SecTitle>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 700 }}>
              <TableHeader
                T={T}
                cols={FORCE_DEPT_COLS}
                columns={[{ label: "Vehicle" }, { label: "Customer" }, { label: "Type" }, { label: "What" }, { label: "Team / Worker" }, { label: "Forced By" }, { label: "When" }]}
              />
              {groups[role].map((r, i) => (
                <TableRow key={i} T={T} cols={FORCE_DEPT_COLS}>
                  <div style={{ fontWeight: 700, color: T.text }}>{r.vehicleNumber}</div>
                  <div>{r.customer || "—"}</div>
                  <div>
                    <Chip color={r.type === "Force PDI" ? T.purple : T.red} bg={r.type === "Force PDI" ? T.purple + "22" : T.red + "22"}>
                      {r.type}
                    </Chip>
                  </div>
                  <div style={{ fontSize: 12 }}>{r.what}</div>
                  <div style={{ fontSize: 12 }}>{r.team || r.worker || "—"}</div>
                  <div>{r.by}</div>
                  <div style={{ fontSize: 12, whiteSpace: "nowrap" }}>{formatIST(r.time)}</div>
                </TableRow>
              ))}
            </div>
          </div>
        </Bx>
      ))}
    </div>
  );
}

function ForceJourneyCell({ T, cell, extraLabel }) {
  if (!cell) return <div style={{ textAlign: "center" }}>—</div>;
  const timeStr = cell.time ? formatIST(cell.time) : "";
  return (
    <div style={{ textAlign: "center" }}>
      <div>
        <ForceStatusChip status={cell.status} label={extraLabel} />
      </div>
      {cell.by && (
        <div style={{ fontSize: 10, color: T.textMuted, marginTop: 3 }}>by {cell.by}</div>
      )}
      {timeStr && <div style={{ fontSize: 10, color: T.textMuted, marginTop: 1 }}>{timeStr}</div>}
    </div>
  );
}

const FORCE_VEHICLE_COLS = "1.3fr .9fr 1fr 1fr 1.4fr .9fr .9fr .9fr .9fr";

function ForceByVehicleView({ T, data }) {
  const rows = useMemo(() => buildForceVehicleRows(data), [data]);
  if (rows.length === 0) return <Empty T={T} icon="✅" text="No vehicles in this range" />;
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 900 }}>
        <TableHeader
          T={T}
          cols={FORCE_VEHICLE_COLS}
          columns={[
            { label: "Vehicle" },
            { label: "Entry", align: "center" },
            { label: "Front Checkup", align: "center" },
            { label: "Advisor Review", align: "center" },
            { label: "Workshop", align: "center" },
            { label: "PDI", align: "center" },
            { label: "Billing", align: "center" },
            { label: "Cashier", align: "center" },
            { label: "Exit", align: "center" },
          ]}
        />
        {rows.map((r) => (
          <TableRow key={r.vehicle.id} T={T} cols={FORCE_VEHICLE_COLS}>
            <div style={{ fontWeight: 700, color: T.text, whiteSpace: "nowrap" }}>
              {r.vehicle.vehicle_number}
              <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 500 }}>{r.vehicle.customer_name || "—"}</div>
            </div>
            <ForceJourneyCell T={T} cell={r.entry} />
            <ForceJourneyCell T={T} cell={r.frontCheckup} />
            <ForceJourneyCell T={T} cell={r.advisor} />
            <div style={{ textAlign: "center" }}>
              {r.workshop.status === "ok" ? (
                <ForceStatusChip status="ok" />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "center" }}>
                  {r.workshop.items.map((it, i) => (
                    <div key={i} style={{ fontSize: 10, color: T.textSecondary }}>
                      <b>{forceRoleLabel(it.dept)}</b> — {it.label}
                      {it.by ? ` (${it.by})` : ""}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <ForceJourneyCell T={T} cell={r.pdi} />
            <ForceJourneyCell T={T} cell={r.billing} />
            <ForceJourneyCell T={T} cell={r.cashier} />
            <ForceJourneyCell T={T} cell={r.exit} />
          </TableRow>
        ))}
      </div>
    </div>
  );
}

function exportForceView(view, data, fromDate, toDate) {
  const wb = XLSX.utils.book_new();
  if (view === "department") {
    const groups = buildForceDeptGroups(data);
    Object.entries(groups).forEach(([role, rows]) => {
      const sheetRows = rows.map((r) => ({
        Vehicle: r.vehicleNumber,
        Customer: r.customer,
        Type: r.type,
        What: r.what,
        "Team / Worker": r.team || r.worker || "",
        "Forced By": r.by,
        When: new Date(toZ(r.time)).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        Notes: r.notes,
      }));
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(sheetRows),
        forceRoleLabel(role).slice(0, 31),
      );
    });
  } else {
    const rows = buildForceVehicleRows(data);
    const cellText = (c, label) => {
      if (!c) return "—";
      const base = label || FORCE_STATUS_META[c.status]?.label || c.status;
      const by = c.by ? ` (${c.by})` : "";
      const time = c.time ? ` @ ${new Date(toZ(c.time)).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}` : "";
      return `${base}${by}${time}`;
    };
    const sheetRows = rows.map((r) => ({
      Vehicle: r.vehicle.vehicle_number,
      Customer: r.vehicle.customer_name || "",
      Entry: cellText(r.entry),
      "Front Checkup": cellText(r.frontCheckup),
      "Advisor Review": cellText(r.advisor),
      Workshop:
        r.workshop.status === "ok"
          ? "OK"
          : r.workshop.items.map((it) => `${forceRoleLabel(it.dept)}: ${it.label}${it.by ? ` (${it.by})` : ""}`).join("; "),
      PDI: cellText(r.pdi),
      Billing: cellText(r.billing),
      Cashier: cellText(r.cashier),
      Exit: cellText(r.exit),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetRows), "Vehicle Journey");
  }
  XLSX.writeFile(
    wb,
    `ForcePDI_Exit_${view === "department" ? "ByDept" : "ByVehicle"}_${fromDate}_to_${toDate}.xlsx`,
  );
}

function ForcePdiExitPanel({ T, fromDate, toDate }) {
  const [view, setView] = useState("department");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchForcePdiExitData(fromDate, toDate)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        console.error("ForcePdiExitPanel fetch error:", e);
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromDate, toDate]);

  return (
    <Bx T={T} style={{ padding: 16, marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { key: "department", label: "By Department" },
            { key: "vehicle", label: "By Vehicle" },
          ].map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              style={{
                padding: "6px 14px",
                borderRadius: 7,
                border: `1px solid ${view === v.key ? T.accent : T.border}`,
                background: view === v.key ? T.accentBg : T.surface,
                color: view === v.key ? T.accent : T.textSecondary,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
        <Btn
          T={T}
          v="secondary"
          sz="sm"
          disabled={!data}
          onClick={() => exportForceView(view, data, fromDate, toDate)}
        >
          ⬇️ Export This View
        </Btn>
      </div>
      {loading || !data ? (
        <div style={{ textAlign: "center", padding: 40, color: T.textMuted }}>⏳ Loading…</div>
      ) : view === "department" ? (
        <ForceByDepartmentView T={T} data={data} />
      ) : (
        <ForceByVehicleView T={T} data={data} />
      )}
    </Bx>
  );
}

// ─── REPORTS TAB ──────────────────────────────────────────────────────────────
const REPORTS_COMPLETED_COLS = ".4fr .9fr 1fr .8fr .8fr .8fr .8fr .7fr .8fr .8fr .8fr .6fr .7fr .7fr .7fr .7fr .8fr .7fr";

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
  const [showForceView, setShowForceView] = useState(false);

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
      label: "⚡ Force PDI & Exit Report",
      desc: "Advisor force-PDI + gateman force-exit actions, who did them, and dept details",
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
          <span style={{ fontWeight: 600 }}>
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
              <div style={{ display: "flex", gap: 8 }}>
                {type === "force_pdi" && (
                  <Btn
                    T={T}
                    v={showForceView ? "primary" : "secondary"}
                    sz="sm"
                    onClick={() => setShowForceView((p) => !p)}
                  >
                    👁️ {showForceView ? "Hide" : "View"}
                  </Btn>
                )}
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
            </div>
          ))}
        </div>
        {showForceView && <ForcePdiExitPanel T={T} fromDate={af} toDate={at} />}
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
              const advColsGrid = "1.3fr .9fr 1fr 1fr 1fr .9fr .9fr";
              return (
                <div style={{ marginBottom: 18 }}>
                  <SecTitle T={T}>Staff Productivity</SecTitle>
                  <div style={{ overflowX: "auto" }}>
                    <div style={{ minWidth: 680 }}>
                      <TableHeader
                        T={T}
                        cols={advColsGrid}
                        columns={[
                          { label: "Advisor" },
                          { label: "Completed" },
                          { label: "Revenue" },
                          { label: "Avg Bill" },
                          { label: "Credit Given" },
                          { label: "Credit Rate" },
                          { label: "Active Now" },
                        ]}
                      />
                      {advStats.map((a) => (
                        <TableRow key={a.id} T={T} cols={advColsGrid}>
                          <div style={{ fontWeight: 700, color: T.text }}>{a.full_name}</div>
                          <div style={{ fontWeight: 700, color: T.green }}>{a.done}</div>
                          <div style={{ color: T.green }}>{fmt(a.r)}</div>
                          <div>{a.avg > 0 ? fmt(a.avg) : "—"}</div>
                          <div style={{ color: T.amber }}>{fmt(a.c)}</div>
                          <div>
                            <Chip color={a.cr > 20 ? T.red : T.green} bg={a.cr > 20 ? T.redLight : T.greenLight}>
                              {a.cr}%
                            </Chip>
                          </div>
                          <div>
                            <Chip color={T.blue} bg={T.blueLight}>
                              {a.act}
                            </Chip>
                          </div>
                        </TableRow>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          {veh.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <SecTitle T={T}>Completed Vehicles ({veh.length})</SecTitle>
              <div style={{ overflowX: "auto", maxHeight: 480, overflowY: "auto" }}>
                <div style={{ minWidth: 1700 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: REPORTS_COMPLETED_COLS,
                      columnGap: 12,
                      padding: "0 0 10px",
                      borderBottom: `2px solid ${T.text}`,
                      position: "sticky",
                      top: 0,
                      zIndex: 2,
                      background: T.surface,
                    }}
                  >
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
                      <div key={h} style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.6px" }}>
                        {h}
                      </div>
                    ))}
                  </div>
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
                                                <div
                          onMouseEnter={(e2) => (e2.currentTarget.style.background = T.surfaceElevated)}
                          onMouseLeave={(e2) => (e2.currentTarget.style.background = "transparent")}
                          style={{
                            display: "grid",
                            gridTemplateColumns: REPORTS_COMPLETED_COLS,
                            columnGap: 12,
                            padding: "9px 0",
                            borderBottom: `1px solid ${T.border}`,
                            alignItems: "center",
                            color: T.text,
                            fontSize: 13,
                          }}
                        >
                          <div
                            style={{
                              color: T.textMuted,
                              fontSize: 11,
                            }}
                          >
                            {i + 1}
                          </div>
                          <div>
                            <span
                              style={{
                                fontWeight: 800,
                                color: T.text,
                              }}
                            >
                              {v.vehicle_number}
                            </span>
                          </div>
                          <div>{v.customer_name || "—"}</div>
                          <div style={{ color: T.textSecondary }}>
                            {v.customer_phone || "—"}
                          </div>
                          <div>
                            {v.model ? (
                              <Chip color={T.blue} bg={T.blueLight}>
                                {v.model}
                              </Chip>
                            ) : (
                              "—"
                            )}
                          </div>
                          <div
                            style={{
                              color: T.textSecondary,
                            }}
                          >
                            {v.odometer_reading
                              ? `${v.odometer_reading} km`
                              : "—"}
                          </div>
                          <div
                            style={{
                              textTransform: "capitalize",
                              fontSize: 11,
                            }}
                          >
                            {v.service_type?.replace(/_/g, " ") || "—"}
                          </div>
                          <div>
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
                          </div>
                          <div
                            style={{ color: T.textSecondary, fontSize: 11 }}
                          >
                            {v.advisor?.full_name || "—"}
                          </div>
                          <div
                            style={{ color: T.textMuted, fontSize: 10 }}
                          >
                            {formatIST(v.entry_time)}
                          </div>
                          <div
                            style={{ color: T.textMuted, fontSize: 10 }}
                          >
                            {formatIST(v.updated_at)}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                            }}
                          >
                            {tat ? fmtMins(tat) : "—"}
                          </div>
                          <div>
                            {v.bill_amount > 0 ? (
                              <span
                                style={{
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
                          </div>
                          <div>
                            {v.total_paid > 0 ? (
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: T.green,
                                  fontSize: 12,
                                }}
                              >
                                {fmt(v.total_paid)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </div>
                          <div>
                            {v.credit_amount > 0 ? (
                              <span
                                style={{
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
                          </div>
                          <div>
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
                          </div>
                          <div style={{ color: T.amber, fontSize: 11 }}>
                            {v.credit_guaranteed_by || "—"}
                          </div>
                          <div>{sla}</div>
                                                </div>
                      );
                    })}
                </div>
              </div>
            </div>
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
const FC_STAFF_COLS = "1.4fr .8fr .8fr .8fr 1.2fr";
const FC_LOG_COLS = ".4fr 1fr 1.2fr 1fr 1.1fr .9fr .8fr .8fr .8fr 1fr";

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
                <div style={{ minWidth: 500 }}>
                  <TableHeader
                    T={T}
                    cols={FC_STAFF_COLS}
                    columns={[{ label: "Staff Member" }, { label: "Work 1" }, { label: "Work 2" }, { label: "Work 3" }, { label: "Total Assignments" }]}
                  />
                  {data.staffStats.map((s) => (
                    <TableRow key={s.name} T={T} cols={FC_STAFF_COLS}>
                      <div style={{ fontWeight: 700, color: T.text }}>{s.name}</div>
                      <div>
                        <Chip color={T.blue} bg={T.blueLight}>
                          {s.w1}
                        </Chip>
                      </div>
                      <div>
                        <Chip color={T.blue} bg={T.blueLight}>
                          {s.w2}
                        </Chip>
                      </div>
                      <div>
                        <Chip color={T.blue} bg={T.blueLight}>
                          {s.w3}
                        </Chip>
                      </div>
                      <div style={{ fontWeight: 800, color: T.green }}>{s.total}</div>
                    </TableRow>
                  ))}
                </div>
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
              <div style={{ overflowX: "auto", maxHeight: 400, overflowY: "auto" }}>
                <div style={{ minWidth: 900 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: FC_LOG_COLS,
                      columnGap: 12,
                      padding: "0 0 10px",
                      borderBottom: `2px solid ${T.text}`,
                      position: "sticky",
                      top: 0,
                      zIndex: 2,
                      background: T.surface,
                    }}
                  >
                    {["#", "Vehicle No", "Customer", "Model", "Entry Time", "FC Status", "Work 1", "Work 2", "Work 3", "Skip Reason"].map((h) => (
                      <div key={h} style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.6px" }}>
                        {h}
                      </div>
                    ))}
                  </div>
                  {data.rows.map((v, i) => {
                    const fcStatus = v.fc_completed
                      ? { label: "Completed", color: T.green, bg: T.greenLight }
                      : v.fc_cancelled
                        ? { label: "Cancelled", color: T.red, bg: T.redLight }
                        : v.fc_skip_reason
                          ? { label: "Skipped", color: T.amber, bg: T.amberLight }
                          : { label: "Pending", color: T.textMuted, bg: T.surfaceElevated };
                    return (
                      <TableRow key={v.id} T={T} cols={FC_LOG_COLS}>
                        <div style={{ color: T.textMuted, fontSize: 11 }}>{i + 1}</div>
                        <div style={{ fontWeight: 700, color: T.text }}>{v.vehicle_number}</div>
                        <div>{v.customer_name || "—"}</div>
                        <div>
                          {v.model ? (
                            <Chip color={T.blue} bg={T.blueLight}>
                              {v.model}
                            </Chip>
                          ) : (
                            "—"
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: T.textMuted }}>{formatIST(v.entry_time)}</div>
                        <div>
                          <Chip color={fcStatus.color} bg={fcStatus.bg}>
                            {fcStatus.label}
                          </Chip>
                        </div>
                        <div style={{ fontSize: 11 }}>{v.fc ? data.userMap[v.fc.work_1_by] || "—" : "—"}</div>
                        <div style={{ fontSize: 11 }}>{v.fc ? data.userMap[v.fc.work_2_by] || "—" : "—"}</div>
                        <div style={{ fontSize: 11 }}>{v.fc ? data.userMap[v.fc.work_3_by] || "—" : "—"}</div>
                        <div style={{ fontSize: 11, color: T.amber }}>{v.fc_skip_reason || "—"}</div>
                      </TableRow>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Bx>
  );
}

// ─── TEAM TAB ─────────────────────────────────────────────────────────────────
// Deep indigo + gold — deliberately fixed regardless of light/dark mode, used
// only for the Users list panel below. A distinct "royal" surface rather than
// the standard theme tokens.
const ROYAL = {
  bg: "linear-gradient(160deg, #1b1035 0%, #2a1250 55%, #1b1035 100%)",
  gold: "#d4af37",
  text: "#f3ecff",
  textMuted: "rgba(243,236,255,0.55)",
  line: "rgba(212,175,55,0.18)",
  hover: "rgba(255,255,255,0.045)",
};

function TeamTab({ T, users, setUsers, teams, onRefresh, derived, vehicles }) {
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
  // Patches just this one row in local state instead of calling onRefresh()
  // (which re-fetches the whole dashboard — vehicles, payments, bookings,
  // teams, everything — and was making every single toggle click feel like
  // a full-page reload). The write already succeeded in the DB; there's
  // nothing else on screen that depends on is_active/attendance_required
  // changing, so a local patch is exactly as correct and far faster.
  const patchUser = (id, fields) =>
    setUsers((prev) => prev.map((x) => (x.id === id ? { ...x, ...fields } : x)));
  const toggle = async (u) => {
    if (!confirm(`${u.is_active ? "Deactivate" : "Activate"} ${u.full_name}?`))
      return;
    await supabase
      .from("users")
      .update({ is_active: !u.is_active })
      .eq("id", u.id);
    patchUser(u.id, { is_active: !u.is_active });
  };
  // Mobile app's attendance QR-punch lock reads this column directly — per
  // user, no role-level setting.
  const toggleAttendance = async (u) => {
    await supabase
      .from("users")
      .update({ attendance_required: !u.attendance_required })
      .eq("id", u.id);
    patchUser(u.id, { attendance_required: !u.attendance_required });
  };

  return (
    <div>
      <div
        style={{
          display: "inline-flex",
          gap: 3,
          padding: 4,
          marginBottom: 22,
          background: T.surfaceElevated,
          borderRadius: 11,
          border: `1px solid ${T.border}`,
        }}
      >
        {[
          ["overview", "🏭 Overview"],
          ["users", "👥 Users"],
          ["teams", "🏢 Teams"],
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setSub(k)}
            style={{
              padding: "7px 16px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "inherit",
              color: sub === k ? "#fff" : T.textSecondary,
              background: sub === k ? T.accent : "transparent",
              boxShadow: sub === k ? `0 2px 6px ${T.accent}55` : "none",
              transition: "all 0.15s",
            }}
          >
            {l}
          </button>
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
              marginBottom: 18,
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                value={srch}
                onChange={(e) => setSrch(e.target.value)}
                placeholder="🔍 Search name or phone..."
                style={{
                  padding: "8px 14px",
                  border: `1px solid ${T.border}`,
                  borderRadius: 9,
                  fontSize: 13,
                  fontFamily: "inherit",
                  background: T.surface,
                  color: T.text,
                  outline: "none",
                  width: 220,
                }}
              />
              <select
                value={rf}
                onChange={(e) => setRf(e.target.value)}
                style={{
                  padding: "8px 14px",
                  border: `1px solid ${T.border}`,
                  borderRadius: 9,
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

          {/* No per-row boxes — a single deep panel with a hairline divider
              between people, gold-on-indigo throughout so the whole list
              reads as one elegant surface instead of a stack of cards. */}
          <div
            style={{
              background: ROYAL.bg,
              borderRadius: 16,
              padding: "4px 22px",
              boxShadow: "0 12px 30px rgba(20,10,45,0.35)",
            }}
          >
            {filtU.map((u, i) => {
              const team = teams.find((t) => t.id === u.team_id);
              const initials =
                u.full_name
                  ?.trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase() || "?";
              return (
                <div
                  key={u.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 20,
                    flexWrap: "wrap",
                    padding: "14px 4px",
                    borderBottom: i === filtU.length - 1 ? "none" : `1px solid ${ROYAL.line}`,
                    opacity: u.is_active ? 1 : 0.55,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = ROYAL.hover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Identity */}
                  <div style={{ display: "flex", alignItems: "center", gap: 13, flex: "1 1 220px", minWidth: 0 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: 13,
                        color: "#241243",
                        background: `linear-gradient(135deg, ${ROYAL.gold}, #a9791f)`,
                      }}
                    >
                      {initials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: ROYAL.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {u.full_name}
                      </div>
                      <div style={{ fontSize: 12, color: ROYAL.textMuted, fontWeight: 600 }}>
                        {u.phone}
                      </div>
                    </div>
                  </div>

                  {/* Role + team */}
                  <div style={{ flex: "1 1 160px", minWidth: 130 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: ROYAL.text }}>
                      {ROLE_LABELS[u.role] || u.role}
                    </div>
                    <div style={{ fontSize: 12, color: ROYAL.textMuted }}>{team?.name || "No team"}</div>
                  </div>

                  {/* Status cluster — one dot color language throughout: gold
                      means "fine as-is", dim means "worth a look". */}
                  <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: ROYAL.textMuted }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: u.is_active ? ROYAL.gold : "rgba(243,236,255,0.3)" }} />
                      {u.is_active ? "Active" : "Inactive"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: ROYAL.textMuted }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: u.auth_id ? ROYAL.gold : "rgba(243,236,255,0.3)" }} />
                      {u.auth_id ? "Login linked" : "Legacy account"}
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: ROYAL.textMuted, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={!!u.attendance_required}
                        onChange={() => toggleAttendance(u)}
                        style={{ width: 15, height: 15, cursor: "pointer", accentColor: ROYAL.gold }}
                      />
                      Attendance required
                    </label>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn
                      T={T}
                      v="ghost"
                      sz="sm"
                      onClick={() => setEditUser(u)}
                      style={{ color: ROYAL.gold, borderColor: ROYAL.line, background: "transparent" }}
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
                </div>
              );
            })}
          </div>
          {filtU.length === 0 && <Empty T={T} icon="👤" text="No users found" />}
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
  free_service_number: "Free Service Number",
  scheduled_service_type: "Scheduled Service Type",
  scheduled_major_interval: "Scheduled Major Interval",
  recall_reason: "Recall Reasons",
};

// The 3 new cascade categories only matter once their parent choice is made —
// shown as a caption under the category header so an owner doesn't treat them
// as independent top-level lists a booking/vehicle picks on its own.
const CONFIG_CASCADE_HINTS = {
  free_service_number: "Only applies when Booking Service Type = Free Service.",
  scheduled_service_type: "Only applies when Booking Service Type = Scheduled Service.",
  scheduled_major_interval: "Only applies when Scheduled Service Type = Major.",
  booking_service_type:
    "The 6 hidden legacy options below (1st/2nd/3rd Free Service, Scheduled Minor/Major, Customer Complaint) exist only so historical bookings that used those keys still show a label — see Free Service Number / Scheduled Service Type / Scheduled Major Interval for the current cascade.",
};

// Groups the flat config-category sidebar into collapsible sections.
// Layout/navigation only — does not change what categories exist or how they load.
const CONFIG_GROUPS = [
  {
    name: "Booking & Scheduling",
    icon: "📅",
    keys: [
      "time_slot",
      "booking_status",
      "booking_service_type",
      "free_service_number",
      "scheduled_service_type",
      "scheduled_major_interval",
    ],
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
    name: "PDI & Recalls",
    icon: "🔁",
    keys: ["recall_reason"],
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

// Ring + legend, same structure as Overview's BookingsRingPanel / Finance's
// FinanceMethodPanel — one compact row instead of a 4-tile grid.
function BookingsDayStatusRing({ T, buckets, total }) {
  const [hoverKey, setHoverKey] = useState(null);
  const segs = ringSegments(buckets.filter((b) => b.count > 0).map((b) => ({ key: b.key, value: b.count, color: b.color })));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <div style={{ width: 76, height: 76, position: "relative", flexShrink: 0 }}>
        <svg width="76" height="76" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
          {segs.map((seg) => (
            <circle
              key={seg.key}
              cx="50"
              cy="50"
              r={RING_R}
              fill="none"
              stroke={seg.color}
              strokeWidth={hoverKey === seg.key ? 14 : 11}
              strokeDasharray={seg.dasharray}
              strokeDashoffset={seg.dashoffset}
              style={{ opacity: hoverKey && hoverKey !== seg.key ? 0.45 : 1, cursor: "pointer", transition: "stroke-width .12s,opacity .12s" }}
              onMouseEnter={() => setHoverKey(seg.key)}
              onMouseLeave={() => setHoverKey(null)}
            />
          ))}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{total}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", flex: 1 }}>
        {buckets.map((b) => (
          <div
            key={b.key}
            onMouseEnter={() => setHoverKey(b.key)}
            onMouseLeave={() => setHoverKey(null)}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, cursor: "pointer", padding: "3px 7px", borderRadius: 6, background: hoverKey === b.key ? b.color + "18" : "transparent" }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: b.color, flexShrink: 0 }} />
            <span style={{ color: T.textSecondary, fontWeight: 600 }}>{b.label}</span>
            <b style={{ color: T.text }}>{b.count}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

const BOOKINGS_TABLE_COLS = "64px 84px 1.2fr 1.4fr 1.2fr 100px 90px";

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
  // Day vs Range — stats/table/ring below all read from whichever scope is
  // active instead of always mixing a day-specific list with an all-time total.
  const [mode, setMode] = useState("day");
  const [rangePreset, setRangePreset] = useState("week");
  const [customFrom, setCustomFrom] = useState(viewDate);
  const [customTo, setCustomTo] = useState(viewDate);

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

  // Forward-looking, not backward — an owner checking Bookings cares what's
  // coming up (today + next 6 days) so they can staff/plan for it, not what
  // already happened (that's what Reports is for). This stays independent of
  // the Day/Range scope below — it's always a forward planning strip.
  const next7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() + i * 86400000);
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
  const maxDay = Math.max(...next7.map((d) => d.count), 1);

  const now = new Date(viewDate + "T12:00:00");
  const dow = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + (dow === 0 ? -6 : 1 - dow));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekStartStr = weekStart.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const weekEndStr = weekEnd.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const monthStartStr = monthStart.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const monthEndStr = monthEnd.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const monthLabel = now.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", month: "long", year: "numeric" });

  const { rangeFrom, rangeTo, rangeLabel } =
    rangePreset === "month"
      ? { rangeFrom: monthStartStr, rangeTo: monthEndStr, rangeLabel: monthLabel }
      : rangePreset === "custom"
        ? { rangeFrom: customFrom, rangeTo: customTo, rangeLabel: `${fmtDate(customFrom)} – ${fmtDate(customTo)}` }
        : { rangeFrom: weekStartStr, rangeTo: weekEndStr, rangeLabel: `${fmtDate(weekStartStr)} – ${fmtDate(weekEndStr)}` };

  const rangeBookings = bookings
    .filter((b) => b.preferred_date >= rangeFrom && b.preferred_date <= rangeTo)
    .sort((a, b) =>
      a.preferred_date === b.preferred_date
        ? (a.preferred_time || "z").localeCompare(b.preferred_time || "z")
        : a.preferred_date.localeCompare(b.preferred_date),
    );

  // Everything below — KPIs, ring, table — reads from `scoped`, so switching
  // Day/Range changes what every number on the page means, instead of mixing
  // a day-specific list with an always-all-time total.
  const scoped = mode === "day" ? dayBookings : rangeBookings;
  const scopedLabel = mode === "day" ? fmtDate(viewDate) : rangeLabel;

  const counts = {
    pending: scoped.filter((b) => b.status === "pending").length,
    confirmed: scoped.filter((b) => b.status === "confirmed").length,
    arrived: scoped.filter((b) => b.status === "arrived").length,
    cancelled: scoped.filter((b) =>
      ["cancelled", "no_show"].includes(b.status),
    ).length,
  };
  const statusBuckets = [
    { key: "pending", label: "Pending", count: counts.pending, color: "#D97706" },
    { key: "confirmed", label: "Confirmed", count: counts.confirmed, color: "#1D4ED8" },
    { key: "arrived", label: "Arrived", count: counts.arrived, color: "#065F46" },
    { key: "cancelled", label: "Cancelled", count: counts.cancelled, color: "#991B1B" },
  ];

  // "Did a booking actually turn into a visit" — only counts bookings whose
  // outcome is already decided (arrived/completed vs cancelled/no_show);
  // still-pending or still-confirmed bookings have no outcome yet and would
  // silently drag this toward 100% if included. Scoped to the same Day/Range
  // selection as everything else on the page.
  const resolvedBookings = scoped.filter((b) => ["arrived", "completed", "cancelled", "no_show"].includes(b.status));
  const conversionRate = resolvedBookings.length
    ? Math.round((resolvedBookings.filter((b) => ["arrived", "completed"].includes(b.status)).length / resolvedBookings.length) * 100)
    : 0;
  const conversionColor = conversionRate >= 70 ? T.green : conversionRate >= 40 ? T.amber : T.red;

  const exportBookingsExcel = () => {
    const rows = scoped.map((b, i) => ({
      Sr: i + 1,
      Date: fmtDate(b.preferred_date),
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
      { wch: 12 },
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
    XLSX.writeFile(wb, `Bookings_${mode === "day" ? viewDate : `${rangeFrom}_to_${rangeTo}`}.xlsx`);
  };

  // Line/area graph for the forward-looking Next 7 Days strip — points
  // plotted on a fixed-viewBox path, stretched to fill the panel via
  // preserveAspectRatio="none" so it works at any container width.
  const GRAPH_W = 280;
  const GRAPH_H = 56;
  const GRAPH_PAD = 10;
  const graphStepX = (GRAPH_W - GRAPH_PAD * 2) / (next7.length - 1);
  const graphPoints = next7.map((d, i) => ({
    ...d,
    x: GRAPH_PAD + i * graphStepX,
    y: GRAPH_H - GRAPH_PAD - (d.count / maxDay) * (GRAPH_H - GRAPH_PAD * 2),
  }));
  const graphLinePath = graphPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const graphAreaPath = `${graphLinePath} L${graphPoints[graphPoints.length - 1].x.toFixed(1)},${GRAPH_H} L${graphPoints[0].x.toFixed(1)},${GRAPH_H} Z`;

  const pillStyle = (active) => ({
    padding: "6px 12px",
    border: `1px solid ${active ? T.accent : T.border}`,
    background: active ? T.accentBg : T.surface,
    borderRadius: 16,
    cursor: "pointer",
    fontSize: 11.5,
    fontWeight: 700,
    color: active ? T.accent : T.textSecondary,
    fontFamily: "inherit",
  });

  return (
    <div>
      {/* Day/Range scope switcher — every stat, the ring, and the table
          below read from whichever scope is active here. */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
          {["day", "range"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: "7px 16px",
                border: "none",
                background: mode === m ? T.accent : T.surface,
                color: mode === m ? "#fff" : T.textSecondary,
                fontWeight: 700,
                fontSize: 11.5,
                cursor: "pointer",
                fontFamily: "inherit",
                textTransform: "capitalize",
              }}
            >
              {m}
            </button>
          ))}
        </div>

        {mode === "day" ? (
          <>
            <button
              onClick={() => navDate(-1)}
              style={{ padding: "6px 11px", border: `1px solid ${T.border}`, background: T.surface, borderRadius: 7, cursor: "pointer", fontWeight: 700, color: T.textSecondary, fontFamily: "inherit" }}
            >
              ←
            </button>
            <input
              type="date"
              value={viewDate}
              onChange={(e) => setViewDate(e.target.value)}
              style={{ padding: "6px 10px", border: `1px solid ${T.accent}`, borderRadius: 7, fontSize: 12.5, fontWeight: 700, background: T.accentBg, color: T.text, cursor: "pointer" }}
            />
            <button
              onClick={() => navDate(1)}
              style={{ padding: "6px 11px", border: `1px solid ${T.border}`, background: T.surface, borderRadius: 7, cursor: "pointer", fontWeight: 700, color: T.textSecondary, fontFamily: "inherit" }}
            >
              →
            </button>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                [`Yesterday · ${fmtDate(yestIST)}`, yestIST],
                [`Today · ${fmtDate(todayIST)}`, todayIST],
                [`Tomorrow · ${fmtDate(tomIST)}`, tomIST],
              ].map(([lbl, d]) => (
                <button key={d} onClick={() => setViewDate(d)} style={pillStyle(viewDate === d)}>
                  {lbl}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                ["This Week", "week"],
                ["This Month", "month"],
                ["Custom", "custom"],
              ].map(([lbl, p]) => (
                <button key={p} onClick={() => setRangePreset(p)} style={pillStyle(rangePreset === p)}>
                  {lbl}
                </button>
              ))}
            </div>
            {rangePreset === "custom" && (
              <>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  style={{ padding: "6px 10px", border: `1px solid ${T.accent}`, borderRadius: 7, fontSize: 12.5, fontWeight: 700, background: T.accentBg, color: T.text, cursor: "pointer" }}
                />
                <span style={{ fontSize: 12, color: T.textMuted }}>to</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  style={{ padding: "6px 10px", border: `1px solid ${T.accent}`, borderRadius: 7, fontSize: 12.5, fontWeight: 700, background: T.accentBg, color: T.text, cursor: "pointer" }}
                />
              </>
            )}
            <span style={{ fontSize: 12, fontWeight: 700, color: T.textMuted }}>{rangeLabel}</span>
          </>
        )}

        <Btn T={T} v="secondary" sz="sm" onClick={exportBookingsExcel} disabled={scoped.length === 0} style={{ marginLeft: "auto" }}>
          ⬇️ Export Excel
        </Btn>
      </div>

      {/* Compact KPI strip (left) + Next 7 Days line graph (right). Every
          number here is scoped to the Day/Range selection above — a day
          shows that day's totals/split, a range shows the range's. */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "stretch" }}>
        <div style={{ flex: "1.1", display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
          {[
            ["Total Bookings", scoped.length, "text"],
            ["Conversion Rate", `${conversionRate}%`, null, conversionColor],
            ["Pending Confirm", counts.pending, "amber"],
            ["Confirmed", counts.confirmed, "blue"],
            ["Arrived", counts.arrived, "green"],
          ].map(([label, value, colorKey, overrideColor]) => (
            <div key={label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderTop: `4px solid ${T.accent}`, borderRadius: 12, padding: "7px 10px" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: overrideColor || T[colorKey], lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11, color: T.textSecondary, fontWeight: 600, marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "10px 14px" }}>
          <SecTitle T={T}>Bookings — Next 7 Days</SecTitle>
          <svg width="100%" height={GRAPH_H} viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`} preserveAspectRatio="none" style={{ overflow: "visible", display: "block" }}>
            <defs>
              <linearGradient id="bookingsGraphFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={T.accent} stopOpacity="0.35" />
                <stop offset="100%" stopColor={T.accent} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={graphAreaPath} fill="url(#bookingsGraphFill)" stroke="none" />
            <path d={graphLinePath} fill="none" stroke={T.accent} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {graphPoints.map((p) => (
              <circle
                key={p.date}
                cx={p.x}
                cy={p.y}
                r={p.date === viewDate && mode === "day" ? 4.5 : 3}
                fill={p.date === todayIST ? T.accent : T.surface}
                stroke={T.accent}
                strokeWidth="2"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  setMode("day");
                  setViewDate(p.date);
                }}
              />
            ))}
          </svg>
          <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
            {next7.map((d) => (
              <div
                key={d.date}
                style={{ flex: 1, textAlign: "center", cursor: "pointer" }}
                onClick={() => {
                  setMode("day");
                  setViewDate(d.date);
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: T.text }}>{d.count || ""}</div>
                <div style={{ fontSize: 9.5, color: d.date === todayIST ? T.accent : T.textMuted, fontWeight: d.date === todayIST ? 700 : 400 }}>
                  {d.day}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status breakdown for the selected scope — ring + legend, same
          pattern as Overview's Bookings ring and Finance's method ring,
          instead of 4 flat tiles taking a full row of their own. */}
      {scoped.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <SecTitle T={T}>{scopedLabel} — By Status</SecTitle>
          <BookingsDayStatusRing buckets={statusBuckets} total={scoped.length} T={T} />
        </div>
      )}

      {/* Booking table — the uniform grid pattern used elsewhere (Overview's
          Advisor & Team Workload), with status merged into the row background
          (not just a column chip) so it stays scannable at a glance — the
          thing the plain-table version lost last time. */}
      {scoped.length === 0 ? (
        <Empty T={T} icon="🗓" text={`No bookings for ${scopedLabel}`} />
      ) : (
        <div>
          <TableHeader
            T={T}
            cols={BOOKINGS_TABLE_COLS}
            columns={[
              { label: "Date" },
              { label: "Time" },
              { label: "Vehicle" },
              { label: "Customer" },
              { label: "Service" },
              { label: "Status" },
              { label: "Ref No" },
            ]}
          />
          {scoped.map((b) => {
            const sc = bookingStatusColors[b.status] || { color: T.textMuted, bg: T.surfaceElevated };
            return (
              <div
                key={b.id}
                title={b.issue_description ? `"${b.issue_description}"` : undefined}
                style={{
                  display: "grid",
                  gridTemplateColumns: BOOKINGS_TABLE_COLS,
                  columnGap: 14,
                  alignItems: "center",
                  padding: "10px 10px",
                  marginBottom: 5,
                  borderRadius: 8,
                  borderLeft: `3px solid ${sc.color}`,
                  background: sc.color + "16",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: T.textSecondary }}>{fmtDate(b.preferred_date)}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>
                  {bookingTimeLabels[b.preferred_time] || b.preferred_time || "Any time"}
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text }}>{b.vehicle_number}</div>
                  {b.model && <div style={{ fontSize: 11, color: T.textSecondary }}>{b.model}</div>}
                </div>
                <div>
                  <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{b.customer_name || "—"}</div>
                  <div style={{ fontSize: 11, color: T.textSecondary }}>{b.customer_phone || "—"}</div>
                </div>
                <div style={{ fontSize: 12.5, color: T.textSecondary }}>
                  {bookingSvcLabels[b.service_type] || b.service_type?.replace(/_/g, " ") || "—"}
                </div>
                <div>
                  <Chip color={sc.color} bg="transparent">
                    {b.status}
                  </Chip>
                </div>
                <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 600 }}>{b.ref_number || "—"}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── TEMPLATES TAB ────────────────────────────────────────────────────────────
// Deliberately the OLD booking-service-type key scheme (first_free_service,
// scheduled_minor, etc.), not the new 4-option booking_service_type
// (free_service/scheduled_service/running_repair/breakdown) — the mobile app
// reconstructs an old-style key from the new cascade before querying
// service_templates, so writing a new-scheme key here would silently stop
// matching anything for every advisor's auto-fill. This <select> is a fixed
// list (not free text) specifically so that mistake isn't possible from here.
// "breakdown" is included so a template CAN be created for it, matching the
// handoff note that no template exists yet — deliberately not pre-seeded.
const BOOKING_SVC_TYPES = [
  { key: "first_free_service", label: "1st Free Service" },
  { key: "second_free_service", label: "2nd Free Service" },
  { key: "third_free_service", label: "3rd Free Service" },
  { key: "scheduled_minor", label: "Scheduled Minor" },
  { key: "scheduled_major", label: "Scheduled Major" },
  { key: "breakdown", label: "Breakdown" },
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

const TEMPLATE_COLS = "1.2fr 1.1fr 1.6fr .8fr .7fr";

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
          marginBottom: 16,
          padding: "9px 12px",
          background: T.amberLight,
          border: `1px solid ${T.amber}44`,
          borderRadius: 6,
          fontSize: 12,
          color: T.textSecondary,
        }}
      >
        Service Type below uses the older, specific booking keys (1st/2nd/3rd
        Free Service, Scheduled Minor/Major, etc.) — the app still translates
        an advisor's newer Free Service / Scheduled Service pick back into one
        of these before matching a template, so this list intentionally
        doesn't offer those newer options.
      </div>

      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 640 }}>
          <TableHeader T={T} cols={TEMPLATE_COLS} columns={[{ label: "Name" }, { label: "Service Type" }, { label: "Departments" }, { label: "Active" }, { label: "Actions" }]} />
          {templates.map((t) => (
            <TableRow key={t.id} T={T} cols={TEMPLATE_COLS}>
              <div>
                <div style={{ fontWeight: 700, color: T.text }}>{t.name}</div>
                <div style={{ fontSize: 10, color: T.textMuted, marginTop: 1 }}>Sort: {t.sort_order}</div>
              </div>
              <div>
                {t.service_type ? (
                  <Chip color={T.blue} bg={T.blueLight}>
                    {BOOKING_SVC_TYPES.find((s) => s.key === t.service_type)?.label || t.service_type}
                  </Chip>
                ) : (
                  <span style={{ color: T.textMuted, fontSize: 12 }}>—</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {(t.departments || []).map((d) => {
                  const dept = DEPT_LIST.find((dl) => dl.key === d.key);
                  const count = (d.workItems?.length || 0) + (d.customWork?.length || 0) + (d.washingTypes?.length || 0);
                  return (
                    <Chip key={d.key} color={T.textSecondary} bg={T.surfaceElevated}>
                      {dept?.label || d.key}
                      {count > 0 ? ` (${count})` : ""}
                    </Chip>
                  );
                })}
              </div>
              <div>
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
                    border: `1px solid ${t.is_active ? T.green + "44" : T.red + "44"}`,
                  }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.is_active ? T.green : T.red }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: t.is_active ? T.green : T.red }}>{t.is_active ? "Active" : "Hidden"}</span>
                </div>
              </div>
              <div>
                <Btn T={T} v="ghost" sz="sm" onClick={() => setEditTemplate(t)}>
                  Edit
                </Btn>
              </div>
            </TableRow>
          ))}
        </div>
        {templates.length === 0 && <Empty T={T} icon="📋" text="No templates yet" sub="Add a template to enable auto-fill for advisors" />}
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
const CONFIG_OPTION_COLS = ".7fr 1fr 1.2fr 1.1fr 1.1fr .9fr .7fr";

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
                {CONFIG_CASCADE_HINTS[selectedCat] && (
                  <div style={{ fontSize: 11, color: T.amber, marginTop: 4, maxWidth: 480 }}>
                    {CONFIG_CASCADE_HINTS[selectedCat]}
                  </div>
                )}
              </div>
              <Btn T={T} v="primary" sz="sm" onClick={() => setShowAdd(true)}>
                + Add Option
              </Btn>
            </div>
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 700 }}>
                <TableHeader
                  T={T}
                  cols={CONFIG_OPTION_COLS}
                  columns={[{ label: "Order" }, { label: "Key" }, { label: "Label" }, { label: "Color" }, { label: "Bg Color" }, { label: "Active" }, { label: "Actions" }]}
                />
                {currentList.map((row, idx) => (
                  <TableRow key={row.id} T={T} cols={CONFIG_OPTION_COLS}>
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
                          cursor: idx === currentList.length - 1 ? "not-allowed" : "pointer",
                          padding: "2px 6px",
                          color: idx === currentList.length - 1 ? T.textMuted : T.textSecondary,
                          fontSize: 11,
                          fontFamily: "inherit",
                        }}
                      >
                        ↓
                      </button>
                    </div>
                    <div style={{ fontSize: 12, color: T.textSecondary }}>{row.key}</div>
                    <div style={{ fontWeight: 600 }}>{row.label}</div>
                    <div>
                      {row.color ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 16, height: 16, borderRadius: 4, background: row.color, border: `1px solid ${T.border}`, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, color: T.textSecondary }}>{row.color}</span>
                        </div>
                      ) : (
                        <span style={{ color: T.textMuted, fontSize: 11 }}>—</span>
                      )}
                    </div>
                    <div>
                      {row.bg_color ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 16, height: 16, borderRadius: 4, background: row.bg_color, border: `1px solid ${T.border}`, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, color: T.textSecondary }}>{row.bg_color}</span>
                        </div>
                      ) : (
                        <span style={{ color: T.textMuted, fontSize: 11 }}>—</span>
                      )}
                    </div>
                    <div>
                      <div
                        onClick={() => toggleActive(row)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          cursor: "pointer",
                          padding: "3px 8px",
                          borderRadius: 12,
                          background: row.is_active ? T.greenLight : T.redLight,
                          border: `1px solid ${row.is_active ? T.green + "44" : T.red + "44"}`,
                        }}
                      >
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: row.is_active ? T.green : T.red }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: row.is_active ? T.green : T.red }}>{row.is_active ? "Active" : "Hidden"}</span>
                      </div>
                    </div>
                    <div>
                      <Btn T={T} v="ghost" sz="sm" onClick={() => setEditRow(row)}>
                        Edit
                      </Btn>
                    </div>
                  </TableRow>
                ))}
              </div>
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

  // The 6 pre-restructure booking_service_type rows (first_free_service etc.)
  // are kept only so historical bookings whose service_type still points at
  // them keep resolving a label — real bookings never write these keys again.
  // Editing their label/color/sort here would silently reshape history, so
  // only the active toggle (to bring one back on purpose) stays live.
  const isLockedLegacyRow = isEdit && category === "booking_service_type" && !row.is_active;

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
          .update(
            // Locked legacy rows only ever write is_active — their fields are
            // disabled in the form, but this is the actual enforcement point.
            isLockedLegacyRow
              ? { is_active: isActive }
              : {
                  label: label.trim(),
                  color: color.trim() || null,
                  bg_color: bgColor.trim() || null,
                  sort_order: parseInt(sortOrder) || 99,
                  is_active: isActive,
                },
          )
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
      {isLockedLegacyRow && (
        <div
          style={{
            marginBottom: 14,
            padding: "9px 12px",
            background: T.amberLight,
            border: `1px solid ${T.amber}44`,
            borderRadius: 6,
            fontSize: 12,
            color: T.textSecondary,
          }}
        >
          Retired option — kept only so past bookings that used this key still
          show a label. Editing is locked; use the toggle below only if you
          genuinely want to bring it back into use.
        </div>
      )}
      <Inp
        T={T}
        label="Label (display text)"
        value={label}
        onChange={setLabel}
        placeholder="e.g. Nexon EV"
        required
        disabled={isLockedLegacyRow}
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
              disabled={isLockedLegacyRow}
              style={{
                width: 36,
                height: 36,
                padding: 2,
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                cursor: isLockedLegacyRow ? "not-allowed" : "pointer",
                background: T.surface,
              }}
            />
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#6B7280"
              disabled={isLockedLegacyRow}
              style={{
                flex: 1,
                padding: "8px 10px",
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                fontSize: 12,
                fontFamily: "'DM Mono',monospace",
                background: isLockedLegacyRow ? T.surfaceElevated : T.surface,
                color: isLockedLegacyRow ? T.textMuted : T.text,
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
              disabled={isLockedLegacyRow}
              style={{
                width: 36,
                height: 36,
                padding: 2,
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                cursor: isLockedLegacyRow ? "not-allowed" : "pointer",
                background: T.surface,
              }}
            />
            <input
              type="text"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              placeholder="#F3F4F6"
              disabled={isLockedLegacyRow}
              style={{
                flex: 1,
                padding: "8px 10px",
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                fontSize: 12,
                fontFamily: "'DM Mono',monospace",
                background: isLockedLegacyRow ? T.surfaceElevated : T.surface,
                color: isLockedLegacyRow ? T.textMuted : T.text,
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
          disabled={isLockedLegacyRow}
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
const ATT_BOARD_COLS = "1.2fr .9fr 1fr .9fr .9fr .9fr .7fr 1fr";
const ATT_LEAVE_COLS = "1.1fr .8fr .8fr .8fr .5fr 1.4fr .8fr 1.2fr .9fr";
const ATT_PUNCH_LOG_COLS = "1fr .8fr .8fr 1.2fr 1fr 1fr";

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
              <div style={{ minWidth: 820 }}>
                <TableHeader
                  T={T}
                  cols={ATT_BOARD_COLS}
                  columns={[
                    { label: "Staff" },
                    { label: "Role" },
                    { label: "Status" },
                    { label: "First In" },
                    { label: "Last Punch" },
                    { label: "Hours Today" },
                    { label: "Punches" },
                    { label: "GPS" },
                  ]}
                />
                {boardRows
                  .sort((a, b) => {
                    if (a.isIn && !b.isIn) return -1;
                    if (!a.isIn && b.isIn) return 1;
                    if (a.punches.length && !b.punches.length) return -1;
                    if (!a.punches.length && b.punches.length) return 1;
                    return (a.full_name || "").localeCompare(b.full_name || "");
                  })
                  .map((row) => {
                    const statusColor = row.isIn ? T.green : row.punches.length > 0 ? T.amber : T.red;
                    const statusBg = row.isIn ? T.greenLight : row.punches.length > 0 ? T.amberLight : T.redLight;
                    const statusLabel = row.isIn ? "In Workshop" : row.punches.length > 0 ? "Left" : "Absent";
                    const hrs = Math.floor(row.totalMins / 60);
                    const mins = row.totalMins % 60;
                    const hoursStr = row.totalMins > 0 ? `${hrs}h ${mins}m` : "—";
                    const lastGPS = row.lastPunch?.within_range;
                    return (
                      <TableRow key={row.id} T={T} cols={ATT_BOARD_COLS}>
                        <div style={{ fontWeight: 700, color: T.text }}>{row.full_name}</div>
                        <div>
                          <Chip color={T.blue} bg={T.blueLight}>
                            {ROLE_LABELS[row.role] || row.role}
                          </Chip>
                        </div>
                        <div>
                          <Chip color={statusColor} bg={statusBg}>
                            {statusLabel}
                          </Chip>
                        </div>
                        <div style={{ color: T.textSecondary, fontSize: 12 }}>{row.firstIn ? formatIST(row.firstIn.punch_time) : "—"}</div>
                        <div style={{ color: T.textSecondary, fontSize: 12 }}>{row.lastPunch ? formatIST(row.lastPunch.punch_time) : "—"}</div>
                        <div style={{ fontWeight: 700, color: row.totalMins > 0 ? T.green : T.textMuted }}>{hoursStr}</div>
                        <div style={{ color: T.textMuted, fontSize: 12 }}>{row.punches.length}</div>
                        <div>
                          {row.lastPunch ? (
                            <Chip color={lastGPS ? T.green : T.amber} bg={lastGPS ? T.greenLight : T.amberLight}>
                              {lastGPS ? "✅ In Range" : "⚠️ Out of Range"}
                            </Chip>
                          ) : (
                            <span style={{ color: T.textMuted }}>—</span>
                          )}
                        </div>
                      </TableRow>
                    );
                  })}
              </div>
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
              <div style={{ minWidth: 900 }}>
                <TableHeader
                  T={T}
                  cols={ATT_LEAVE_COLS}
                  columns={[
                    { label: "Employee" },
                    { label: "Type" },
                    { label: "From" },
                    { label: "To" },
                    { label: "Days" },
                    { label: "Reason" },
                    { label: "Status" },
                    { label: "Review Note" },
                    { label: "Applied" },
                  ]}
                />
                {leaveApplications.map((app) => {
                  const days = (new Date(app.to_date) - new Date(app.from_date)) / 86400000 + 1;
                  const statusMap = {
                    pending: [T.amber, T.amberLight],
                    approved: [T.green, T.greenLight],
                    rejected: [T.red, T.redLight],
                  };
                  const [sc, sbg] = statusMap[app.status] || [T.textMuted, T.surfaceElevated];
                  const typeColors = {
                    sick: [T.red, T.redLight],
                    casual: [T.blue, T.blueLight],
                    personal: [T.purple, T.purpleLight],
                  };
                  const [tc, tbg] = typeColors[app.leave_type] || [T.textMuted, T.surfaceElevated];
                  return (
                    <TableRow key={app.id} T={T} cols={ATT_LEAVE_COLS}>
                      <div style={{ fontWeight: 700, color: T.text }}>{app.user?.full_name}</div>
                      <div>
                        <Chip color={tc} bg={tbg}>
                          {app.leave_type}
                        </Chip>
                      </div>
                      <div style={{ fontSize: 12, color: T.textSecondary }}>{app.from_date}</div>
                      <div style={{ fontSize: 12, color: T.textSecondary }}>{app.to_date}</div>
                      <div>{days}</div>
                      <div style={{ fontSize: 12, color: T.textMuted }}>{app.reason || "—"}</div>
                      <div>
                        <Chip color={sc} bg={sbg}>
                          {app.status}
                        </Chip>
                      </div>
                      <div style={{ fontSize: 12, color: T.textMuted }}>{app.review_note || "—"}</div>
                      <div style={{ fontSize: 11, color: T.textMuted }}>{formatIST(app.created_at)}</div>
                    </TableRow>
                  );
                })}
                {leaveApplications.length === 0 && (
                  <div style={{ textAlign: "center", padding: 32, color: T.textMuted }}>No leave applications yet</div>
                )}
              </div>
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
                          }}
                        >
                          {s.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <SecTitle T={T}>
                      Punch Log ({histLogs.length} records)
                    </SecTitle>
                    <div style={{ overflowX: "auto" }}>
                      <div style={{ minWidth: 700 }}>
                        <TableHeader
                          T={T}
                          cols={ATT_PUNCH_LOG_COLS}
                          columns={[{ label: "Date" }, { label: "Time" }, { label: "Type" }, { label: "Location Source" }, { label: "Within Range" }, { label: "QR Verified" }]}
                        />
                        {histLogs.map((l, idx) => {
                          const d = new Date(toZ(l.punch_time));
                          const isIn = l.type === "in";
                          const baseBg = idx % 2 === 0 ? "transparent" : T.surfaceElevated;
                          return (
                            <div
                              key={l.id}
                              onMouseEnter={(e) => (e.currentTarget.style.background = T.border)}
                              onMouseLeave={(e) => (e.currentTarget.style.background = baseBg)}
                              style={{
                                display: "grid",
                                gridTemplateColumns: ATT_PUNCH_LOG_COLS,
                                columnGap: 14,
                                padding: "9px 0",
                                borderBottom: `1px solid ${T.border}`,
                                alignItems: "center",
                                background: baseBg,
                                color: T.text,
                                fontSize: 13,
                              }}
                            >
                              <div style={{ color: T.textSecondary, fontSize: 12 }}>
                                {d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "2-digit", month: "short" })}
                              </div>
                              <div style={{ fontSize: 13 }}>
                                {d.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true })}
                              </div>
                              <div>
                                <Chip color={isIn ? T.green : T.amber} bg={isIn ? T.greenLight : T.amberLight}>
                                  {isIn ? "🟢 In" : "🔴 Out"}
                                </Chip>
                              </div>
                              <div style={{ fontSize: 12, color: T.textSecondary }}>{l.location_source || "—"}</div>
                              <div>
                                <Chip color={l.within_range ? T.green : T.red} bg={l.within_range ? T.greenLight : T.redLight}>
                                  {l.within_range ? "✅ Yes" : "❌ No"}
                                </Chip>
                              </div>
                              <div>
                                <Chip color={l.qr_verified ? T.green : T.amber} bg={l.qr_verified ? T.greenLight : T.amberLight}>
                                  {l.qr_verified ? "✅ Yes" : "⚠️ No"}
                                </Chip>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
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

const CALLING_CALLER_COLS = "1.1fr .9fr .8fr 1fr .9fr 1.2fr";
const CALLING_LOG_COLS = "1fr 1fr .9fr .9fr .9fr 1.3fr .9fr .9fr";

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
            <div style={{ minWidth: 640 }}>
              <TableHeader
                T={T}
                cols={CALLING_CALLER_COLS}
                columns={[{ label: "Receptionist" }, { label: "Calls Made" }, { label: "Answered" }, { label: "Not Answered" }, { label: "Answer Rate" }, { label: "Top Reason" }]}
              />
              {callerStats.map((s) => (
                <TableRow key={s.id} T={T} cols={CALLING_CALLER_COLS}>
                  <div style={{ fontWeight: 700, color: T.text }}>{s.name}</div>
                  <div style={{ fontWeight: 800, color: T.blue }}>{s.total}</div>
                  <div style={{ color: T.green, fontWeight: 700 }}>{s.answered}</div>
                  <div style={{ color: T.amber, fontWeight: 700 }}>{s.notAnswered}</div>
                  <div>
                    <Chip color={s.rate >= 70 ? T.green : s.rate >= 40 ? T.amber : T.red} bg={s.rate >= 70 ? T.greenLight : s.rate >= 40 ? T.amberLight : T.redLight}>
                      {s.rate}%
                    </Chip>
                  </div>
                  <div style={{ color: T.textSecondary, fontSize: 12 }}>{s.topReason ? reasonLabel(s.topReason) : "—"}</div>
                </TableRow>
              ))}
            </div>
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
        <div>
          <div style={{ overflowX: "auto", maxHeight: 560, overflowY: "auto" }}>
            <div style={{ minWidth: 900 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: CALLING_LOG_COLS,
                  columnGap: 14,
                  padding: "0 0 10px",
                  borderBottom: `2px solid ${T.text}`,
                  position: "sticky",
                  top: 0,
                  zIndex: 2,
                  background: T.surface,
                }}
              >
                {["Vehicle", "Customer", "Phone", "Status", "Reason", "Notes", "Called By", "Time"].map((h) => (
                  <div key={h} style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.6px" }}>
                    {h}
                  </div>
                ))}
              </div>
              {filtered.map((l) => {
                const sc = statusColors(l.call_status);
                return (
                  <TableRow key={l.id} T={T} cols={CALLING_LOG_COLS}>
                    <div style={{ fontWeight: 700, color: T.text, letterSpacing: "0.3px" }}>{l.vehicle_number || "—"}</div>
                    <div style={{ fontWeight: 600 }}>{l.customer_name || "—"}</div>
                    <div style={{ fontSize: 12, color: T.textSecondary }}>{l.customer_phone || "—"}</div>
                    <div>
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
                    </div>
                    <div style={{ fontSize: 12, color: T.textSecondary }}>{reasonLabel(l.reason_key)}</div>
                    <div style={{ fontSize: 12, color: T.textMuted, wordBreak: "break-word" }}>{l.notes || "—"}</div>
                    <div style={{ fontSize: 12, color: T.textSecondary }}>{l.caller?.full_name || "—"}</div>
                    <div style={{ fontSize: 11, color: T.textMuted, whiteSpace: "nowrap" }}>{formatIST(l.called_at)}</div>
                  </TableRow>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FOLLOW-UPS TAB ───────────────────────────────────────────────────────────
// "Who do we need to act on" — consolidates several booleans/flags added to
// `vehicles` (offline job cards, warranty work, manual exit, order cancelled,
// EW/AMC/RSA renewals) plus the recalls Cancel Review queue into one home.
// Deliberately its OWN fetch, unbounded by date and independent of the shared
// `vehicles` app state (which is scoped to active-or-touched-today only) —
// a stale unopened job card or an unrenewed AMC from months ago must still
// show up here even though it wouldn't appear anywhere else in the app.
const FOLLOWUP_POLICIES = [
  { key: "extended_warranty", label: "Extended Warranty" },
  { key: "amc", label: "AMC" },
  { key: "rsa", label: "RSA" },
];

const FOLLOWUP_JOBCARD_COLS = "1.3fr 1.5fr 1fr 1fr";
const FOLLOWUP_SIMPLE_COLS = "1.3fr 1.5fr 1.2fr 1fr";
const FOLLOWUP_RECALL_COLS = "1.2fr 1.4fr 1.6fr 1.6fr 1fr";
const FOLLOWUP_RENEWAL_COLS = "1.2fr 1.5fr 1fr 1fr 1.3fr";

const FollowUpSectionHeader = ({ T, icon, title, count, open, onToggle }) => (
  <div
    onClick={onToggle}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      cursor: "pointer",
      padding: "12px 4px",
      borderBottom: `2px solid ${T.text}`,
      marginBottom: open ? 14 : 0,
    }}
  >
    <span style={{ fontSize: 12, color: T.accent, fontWeight: 700 }}>{open ? "▾" : "▸"}</span>
    <span style={{ fontFamily: FONT_HEADING, fontSize: 17, fontWeight: 600, color: T.text }}>
      {icon} {title}
    </span>
    <span
      style={{
        marginLeft: "auto",
        fontSize: 12,
        fontWeight: 700,
        color: count > 0 ? T.accent : T.textMuted,
        background: count > 0 ? T.accentBg : T.surfaceElevated,
        padding: "2px 10px",
        borderRadius: 12,
      }}
    >
      {count}
    </span>
  </div>
);

function FollowUpsTab({ T, user, onDataChanged }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [recalls, setRecalls] = useState([]);
  const [jobcardFilter, setJobcardFilter] = useState("current"); // current | all
  const [renewalFilter, setRenewalFilter] = useState("current"); // current | all
  const [busyId, setBusyId] = useState(null);
  const [sectionOpen, setSectionOpen] = useState({
    offline: true,
    warranty: true,
    manualExit: true,
    orderCancelled: true,
    recalls: true,
    renewals: true,
  });
  const toggleSection = (k) => setSectionOpen((s) => ({ ...s, [k]: !s[k] }));

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [vr, rr] = await withTimeout(
        Promise.all([
          supabase
            .from("vehicles")
            .select(
              "id,vehicle_number,customer_name,customer_phone,current_stage,entry_time," +
                "is_offline_jobcard,offline_jobcard_open_date,offline_jobcard_opened," +
                "is_warranty_work,is_manual_exit,order_cancelled," +
                "extended_warranty_eligible,extended_warranty_renewed,extended_warranty_expiry_date," +
                "amc_eligible,amc_renewed,amc_expiry_date,rsa_eligible,rsa_renewed,rsa_expiry_date",
            )
            .is("deleted_at", null)
            .or(
              [
                "is_offline_jobcard.eq.true",
                "is_warranty_work.eq.true",
                "is_manual_exit.eq.true",
                "order_cancelled.eq.true",
                "and(extended_warranty_eligible.eq.true,extended_warranty_renewed.eq.false)",
                "and(amc_eligible.eq.true,amc_renewed.eq.false)",
                "and(rsa_eligible.eq.true,rsa_renewed.eq.false)",
              ].join(","),
            ),
          supabase
            .from("vehicle_recalls")
            .select(
              "id,vehicle_id,vehicle_number,customer_name,customer_phone,reason,cancel_reason,status,pre_cancel_status,created_at",
            )
            .eq("status", "cancel_review")
            .order("created_at", { ascending: false }),
        ]),
      );
      if (vr.error) throw vr.error;
      if (rr.error) throw rr.error;
      setVehicles(vr.data || []);
      setRecalls(rr.data || []);
    } catch (e) {
      console.error("Follow-ups load error:", e);
      setLoadError(e.message || "Couldn't load follow-ups");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const reload = async () => {
    await load();
    onDataChanged?.();
  };

  const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const in30IST = new Date(Date.now() + 30 * 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const isActiveVehicle = (v) => !["completed", "ready_for_exit"].includes(v.current_stage);

  const offlineJobcards = vehicles.filter((v) => v.is_offline_jobcard && !v.offline_jobcard_opened);
  const offlineJobcardsShown =
    jobcardFilter === "current"
      ? offlineJobcards.filter((v) => !v.offline_jobcard_open_date || v.offline_jobcard_open_date <= todayIST)
      : offlineJobcards;

  const warrantyWork = vehicles.filter((v) => v.is_warranty_work && isActiveVehicle(v));
  const manualExit = vehicles.filter((v) => v.is_manual_exit && isActiveVehicle(v));
  const orderCancelled = vehicles.filter((v) => v.order_cancelled);

  // One row per vehicle × eligible-unrenewed policy — a vehicle behind on 2
  // of 3 policies shows twice, deliberately not collapsed into one row.
  const renewalRows = [];
  vehicles.forEach((v) => {
    FOLLOWUP_POLICIES.forEach((p) => {
      if (v[`${p.key}_eligible`] && !v[`${p.key}_renewed`]) {
        renewalRows.push({ vehicle: v, policy: p, expiry: v[`${p.key}_expiry_date`] });
      }
    });
  });
  renewalRows.sort((a, b) => (a.expiry || "9999-99-99").localeCompare(b.expiry || "9999-99-99"));
  const renewalRowsShown =
    renewalFilter === "current" ? renewalRows.filter((r) => r.expiry && r.expiry <= in30IST) : renewalRows;

  const totalCount =
    offlineJobcards.length + warrantyWork.length + manualExit.length + orderCancelled.length + recalls.length + renewalRows.length;

  const markJobcardOpened = async (v) => {
    setBusyId(v.id);
    try {
      const { error } = await supabase
        .from("vehicles")
        .update({
          offline_jobcard_opened: true,
          offline_jobcard_opened_at: new Date().toISOString(),
          offline_jobcard_opened_by: user?.id || null,
        })
        .eq("id", v.id);
      if (error) throw error;
      await reload();
    } catch (e) {
      alert("Couldn't mark opened: " + e.message);
    } finally {
      setBusyId(null);
    }
  };

  const reviewRecall = async (r, approve) => {
    setBusyId(r.id);
    try {
      const { error: recallErr } = await supabase
        .from("vehicle_recalls")
        .update({
          status: approve ? "cancelled" : r.pre_cancel_status || "pending",
          owner_reviewed_by: user?.id || null,
          owner_reviewed_at: new Date().toISOString(),
        })
        .eq("id", r.id);
      if (recallErr) throw recallErr;
      if (approve) {
        // The recall's ORIGINAL vehicle_id, not any later "arrived" visit —
        // the trigger that flips status to "arrived" creates a new vehicles
        // row on re-entry, but the cancellation applies to the visit that
        // was actually recalled.
        const { error: vehErr } = await supabase
          .from("vehicles")
          .update({ order_cancelled: true })
          .eq("id", r.vehicle_id);
        if (vehErr) throw vehErr;
      }
      await reload();
    } catch (e) {
      alert(`Couldn't ${approve ? "approve" : "reject"}: ` + e.message);
    } finally {
      setBusyId(null);
    }
  };

  if (loading)
    return <div style={{ textAlign: "center", padding: 60, color: T.textMuted }}>Loading follow-ups…</div>;

  if (loadError)
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <div style={{ color: T.red, fontWeight: 700, marginBottom: 10 }}>Couldn't load follow-ups</div>
        <div style={{ color: T.textMuted, fontSize: 13, marginBottom: 16 }}>{loadError}</div>
        <Btn T={T} v="secondary" onClick={load}>
          Retry
        </Btn>
      </div>
    );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: FONT_HEADING, fontSize: 21, fontWeight: 600, color: T.text }}>Follow-ups</div>
          <div style={{ fontSize: 13, color: T.textMuted, marginTop: 2 }}>
            Everything that needs a human to act on, in one place — {totalCount} item{totalCount !== 1 ? "s" : ""} total.
          </div>
        </div>
      </div>

      {/* Offline Job Cards to Open */}
      <FollowUpSectionHeader
        T={T}
        icon="📝"
        title="Offline Job Cards to Open"
        count={offlineJobcards.length}
        open={sectionOpen.offline}
        onToggle={() => toggleSection("offline")}
      />
      {sectionOpen.offline && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {[
              ["current", "🔥 Current"],
              ["all", "All"],
            ].map(([k, lbl]) => (
              <button
                key={k}
                onClick={() => setJobcardFilter(k)}
                style={{
                  padding: "5px 12px",
                  border: `1px solid ${jobcardFilter === k ? T.accent : T.border}`,
                  background: jobcardFilter === k ? T.accentBg : T.surface,
                  borderRadius: 14,
                  cursor: "pointer",
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: jobcardFilter === k ? T.accent : T.textSecondary,
                  fontFamily: "inherit",
                }}
              >
                {lbl}
              </button>
            ))}
          </div>
          {offlineJobcardsShown.length === 0 ? (
            <Empty T={T} icon="✅" text="Nothing to open right now" />
          ) : (
            <div>
              <TableHeader
                T={T}
                cols={FOLLOWUP_JOBCARD_COLS}
                columns={[{ label: "Vehicle" }, { label: "Customer" }, { label: "Open By" }, { label: "Action" }]}
              />
              {offlineJobcardsShown.map((v) => {
                const overdue = v.offline_jobcard_open_date && v.offline_jobcard_open_date < todayIST;
                return (
                  <TableRow key={v.id} T={T} cols={FOLLOWUP_JOBCARD_COLS}>
                    <div style={{ fontWeight: 700, color: T.text }}>{v.vehicle_number}</div>
                    <div style={{ color: T.textSecondary, fontSize: 13 }}>
                      {v.customer_name || "—"}
                      <div style={{ fontSize: 11, color: T.textMuted }}>{v.customer_phone || "—"}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: overdue ? 800 : 600, color: overdue ? T.red : T.textSecondary }}>
                      {v.offline_jobcard_open_date ? formatIST(v.offline_jobcard_open_date) : "No date set"}
                      {overdue && <div style={{ fontSize: 10.5 }}>Overdue</div>}
                    </div>
                    <div>
                      <Btn T={T} v="success" sz="sm" disabled={busyId === v.id} onClick={() => markJobcardOpened(v)}>
                        ✓ Mark Opened
                      </Btn>
                    </div>
                  </TableRow>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Warranty Work */}
      <FollowUpSectionHeader
        T={T}
        icon="⚠️"
        title="Warranty Work"
        count={warrantyWork.length}
        open={sectionOpen.warranty}
        onToggle={() => toggleSection("warranty")}
      />
      {sectionOpen.warranty && (
        <div style={{ marginBottom: 24 }}>
          <FollowUpSimpleList T={T} vehicles={warrantyWork} emptyText="No active warranty-work vehicles" />
        </div>
      )}

      {/* Manual Exit */}
      <FollowUpSectionHeader
        T={T}
        icon="🚪"
        title="Manual Exit"
        count={manualExit.length}
        open={sectionOpen.manualExit}
        onToggle={() => toggleSection("manualExit")}
      />
      {sectionOpen.manualExit && (
        <div style={{ marginBottom: 24 }}>
          <FollowUpSimpleList T={T} vehicles={manualExit} emptyText="No vehicles waiting on a manual exit" />
        </div>
      )}

      {/* Order Cancelled */}
      <FollowUpSectionHeader
        T={T}
        icon="🚫"
        title="Order Cancelled"
        count={orderCancelled.length}
        open={sectionOpen.orderCancelled}
        onToggle={() => toggleSection("orderCancelled")}
      />
      {sectionOpen.orderCancelled && (
        <div style={{ marginBottom: 24 }}>
          <FollowUpSimpleList T={T} vehicles={orderCancelled} emptyText="No cancelled orders" />
        </div>
      )}

      {/* Recalls — Cancel Review */}
      <FollowUpSectionHeader
        T={T}
        icon="🔁"
        title="Recalls — Cancel Review"
        count={recalls.length}
        open={sectionOpen.recalls}
        onToggle={() => toggleSection("recalls")}
      />
      {sectionOpen.recalls && (
        <div style={{ marginBottom: 24 }}>
          {recalls.length === 0 ? (
            <Empty T={T} icon="✅" text="No recalls waiting on a cancel decision" />
          ) : (
            <div>
              <TableHeader
                T={T}
                cols={FOLLOWUP_RECALL_COLS}
                columns={[
                  { label: "Vehicle" },
                  { label: "Customer" },
                  { label: "Recall Reason" },
                  { label: "Cancel Reason" },
                  { label: "Decision" },
                ]}
              />
              {recalls.map((r) => (
                <TableRow key={r.id} T={T} cols={FOLLOWUP_RECALL_COLS}>
                  <div style={{ fontWeight: 700, color: T.text }}>{r.vehicle_number}</div>
                  <div style={{ color: T.textSecondary, fontSize: 13 }}>
                    {r.customer_name || "—"}
                    <div style={{ fontSize: 11, color: T.textMuted }}>{r.customer_phone || "—"}</div>
                  </div>
                  <div style={{ fontSize: 12.5, color: T.textSecondary }}>{r.reason || "—"}</div>
                  <div style={{ fontSize: 12.5, color: T.textSecondary, fontStyle: "italic" }}>{r.cancel_reason || "—"}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn T={T} v="success" sz="sm" disabled={busyId === r.id} onClick={() => reviewRecall(r, true)}>
                      Approve
                    </Btn>
                    <Btn T={T} v="danger" sz="sm" disabled={busyId === r.id} onClick={() => reviewRecall(r, false)}>
                      Reject
                    </Btn>
                  </div>
                </TableRow>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Extended Warranty / AMC / RSA Renewals */}
      <FollowUpSectionHeader
        T={T}
        icon="🛡️"
        title="EW / AMC / RSA Renewals"
        count={renewalRows.length}
        open={sectionOpen.renewals}
        onToggle={() => toggleSection("renewals")}
      />
      {sectionOpen.renewals && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 10 }}>
            Read-only for now — no call-log yet, this is "who to call," not a call tracker.
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {[
              ["current", "Expiring within 30 days"],
              ["all", "All"],
            ].map(([k, lbl]) => (
              <button
                key={k}
                onClick={() => setRenewalFilter(k)}
                style={{
                  padding: "5px 12px",
                  border: `1px solid ${renewalFilter === k ? T.accent : T.border}`,
                  background: renewalFilter === k ? T.accentBg : T.surface,
                  borderRadius: 14,
                  cursor: "pointer",
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: renewalFilter === k ? T.accent : T.textSecondary,
                  fontFamily: "inherit",
                }}
              >
                {lbl}
              </button>
            ))}
          </div>
          {renewalRowsShown.length === 0 ? (
            <Empty T={T} icon="✅" text="Nothing due for renewal" />
          ) : (
            <div>
              <TableHeader
                T={T}
                cols={FOLLOWUP_RENEWAL_COLS}
                columns={[
                  { label: "Vehicle" },
                  { label: "Customer" },
                  { label: "Policy" },
                  { label: "Expiry" },
                  { label: "Last Seen" },
                ]}
              />
              {renewalRowsShown.map(({ vehicle: v, policy, expiry }) => {
                const overdue = expiry && expiry < todayIST;
                const soon = expiry && !overdue && expiry <= in30IST;
                const stageMeta = STAGE_META[v.current_stage];
                return (
                  <TableRow key={`${v.id}-${policy.key}`} T={T} cols={FOLLOWUP_RENEWAL_COLS}>
                    <div style={{ fontWeight: 700, color: T.text }}>{v.vehicle_number}</div>
                    <div style={{ color: T.textSecondary, fontSize: 13 }}>
                      {v.customer_name || "—"}
                      <div style={{ fontSize: 11, color: T.textMuted }}>{v.customer_phone || "—"}</div>
                    </div>
                    <div>
                      <Chip color={T.purple} bg={T.purpleLight}>
                        {policy.label}
                      </Chip>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: overdue || soon ? 800 : 600, color: overdue ? T.red : soon ? T.amber : T.textSecondary }}>
                      {expiry ? formatIST(expiry) : "—"}
                      {overdue && <div style={{ fontSize: 10.5 }}>Lapsed</div>}
                    </div>
                    <div style={{ fontSize: 12, color: T.textMuted }}>
                      {formatIST(v.entry_time)}
                      {stageMeta && <div style={{ fontSize: 10.5 }}>{stageMeta.label}</div>}
                    </div>
                  </TableRow>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Shared read-only list body for the 3 simple boolean-flag sections
// (Warranty Work / Manual Exit / Order Cancelled) — same columns, no actions.
function FollowUpSimpleList({ T, vehicles, emptyText }) {
  if (vehicles.length === 0) return <Empty T={T} icon="✅" text={emptyText} />;
  return (
    <div>
      <TableHeader
        T={T}
        cols={FOLLOWUP_SIMPLE_COLS}
        columns={[{ label: "Vehicle" }, { label: "Customer" }, { label: "Stage" }, { label: "Entry" }]}
      />
      {vehicles.map((v) => {
        const meta = STAGE_META[v.current_stage] || { label: v.current_stage, color: T.textMuted };
        return (
          <TableRow key={v.id} T={T} cols={FOLLOWUP_SIMPLE_COLS}>
            <div style={{ fontWeight: 700, color: T.text }}>{v.vehicle_number}</div>
            <div style={{ color: T.textSecondary, fontSize: 13 }}>
              {v.customer_name || "—"}
              <div style={{ fontSize: 11, color: T.textMuted }}>{v.customer_phone || "—"}</div>
            </div>
            <div>
              <Chip color={meta.color} bg={meta.color + "22"}>
                {meta.label}
              </Chip>
            </div>
            <div style={{ fontSize: 12, color: T.textMuted }}>{formatIST(v.entry_time)}</div>
          </TableRow>
        );
      })}
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

  // Sidebar badge for the Follow-ups tab — a handful of head:true/count-only
  // queries (cheap, no rows pulled) so the badge is accurate even before the
  // tab has ever been opened, same as the other tabs' alert counts. Refreshed
  // after any write inside FollowUpsTab via onDataChanged, not on every
  // fetchAll poll — these numbers don't need live-tick freshness.
  const [followUpsAlertCount, setFollowUpsAlertCount] = useState(0);
  const refreshFollowUpsAlertCount = useCallback(async () => {
    try {
      const [ojc, ww, me, oc, cr, ren] = await Promise.all([
        supabase
          .from("vehicles")
          .select("id", { count: "exact", head: true })
          .eq("is_offline_jobcard", true)
          .eq("offline_jobcard_opened", false)
          .is("deleted_at", null),
        supabase
          .from("vehicles")
          .select("id", { count: "exact", head: true })
          .eq("is_warranty_work", true)
          .not("current_stage", "in", "(completed,ready_for_exit)")
          .is("deleted_at", null),
        supabase
          .from("vehicles")
          .select("id", { count: "exact", head: true })
          .eq("is_manual_exit", true)
          .not("current_stage", "in", "(completed,ready_for_exit)")
          .is("deleted_at", null),
        supabase
          .from("vehicles")
          .select("id", { count: "exact", head: true })
          .eq("order_cancelled", true)
          .is("deleted_at", null),
        supabase.from("vehicle_recalls").select("id", { count: "exact", head: true }).eq("status", "cancel_review"),
        supabase
          .from("vehicles")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null)
          .or(
            [
              "and(extended_warranty_eligible.eq.true,extended_warranty_renewed.eq.false)",
              "and(amc_eligible.eq.true,amc_renewed.eq.false)",
              "and(rsa_eligible.eq.true,rsa_renewed.eq.false)",
            ].join(","),
          ),
      ]);
      setFollowUpsAlertCount(
        (ojc.count || 0) + (ww.count || 0) + (me.count || 0) + (oc.count || 0) + (cr.count || 0) + (ren.count || 0),
      );
    } catch (e) {
      console.error("Follow-ups alert count error:", e);
    }
  }, []);
  useEffect(() => {
    refreshFollowUpsAlertCount();
  }, [refreshFollowUpsAlertCount]);

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
              "*,work_stages(*),customer_complaints(*),advisor:users!vehicles_advisor_id_fkey(full_name,role)",
            )
            // Was `current_stage.neq.completed,entry_time.gte.${ts}` — that
            // silently dropped any vehicle that entered on an earlier day but
            // got completed/gate-exited TODAY (completed rows only matched
            // via entry_time, not their actual completion time), permanently
            // undercounting "Deliveries Today" and the Vehicle Journey Exit
            // node for every multi-day-stay vehicle. updated_at reliably
            // advances at gate-exit (confirmed against vehicle_history's
            // "vehicle_exited" action, whose timestamps match updated_at to
            // the second), so add it as a third OR branch to catch those.
            .or(`current_stage.neq.completed,entry_time.gte.${ts},updated_at.gte.${ts}`)
            .is("deleted_at", null)
            .order("entry_time", { ascending: false }),
          supabase
            .from("payments")
            .select(
              "*,vehicle:vehicles!payments_vehicle_id_fkey(vehicle_number,customer_name,model,credit_guaranteed_by),collector:users!payments_collected_by_fkey(full_name)",
            )
            .is("voided_at", null)
            .gte("created_at", ts)
            .order("created_at", { ascending: false }),
          supabase
            .from("payments")
            .select(
              "*,vehicle:vehicles!payments_vehicle_id_fkey(vehicle_number,customer_name,model,credit_guaranteed_by),collector:users!payments_collected_by_fkey(full_name)",
            )
            .is("voided_at", null)
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
              "id,full_name,role,team_id,is_active,attendance_required,phone,auth_id,email,date_of_birth,blood_group,date_of_joining,current_address,permanent_address,notes,aadhar_number,aadhar_front_url,aadhar_back_url,pan_number,pan_front_url,pan_back_url,dl_number,dl_expiry,dl_front_url,dl_back_url,emergency_contact_name,emergency_contact_phone,emergency_contact_relation,profile_photo_url",
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
          .is("voided_at", null)
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
    { key: "followups", icon: "🔔", label: "Follow-ups", alert: followUpsAlertCount || null },
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
          background: "linear-gradient(180deg,#0d1730 0%,#131f3d 100%)",
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
            borderBottom: "1px solid rgba(255,255,255,.08)",
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
              alt="AutoFlow"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
          {!collapsed && (
            <div>
              <div style={{ color: "#f4ecd8", fontWeight: 600, fontSize: 15, fontFamily: FONT_HEADING, letterSpacing: "0.3px" }}>
                AutoFlow
              </div>
              <div style={{ color: "#8b93ab", fontSize: 9.5, letterSpacing: "1px", textTransform: "uppercase" }}>
                Workshop OS
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
                  background: a ? "rgba(201,120,31,.14)" : "transparent",
                  borderLeft: a ? "2px solid #c9781f" : "2px solid transparent",
                  transition: "all 0.12s",
                }}
                onMouseEnter={(e) => {
                  if (!a) e.currentTarget.style.background = "rgba(255,255,255,.06)";
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
                      color: a ? "#f4ecd8" : "#8b93ab",
                      flex: 1,
                    }}
                  >
                    {t.label}
                  </span>
                )}
                {!collapsed && t.alert > 0 && (
                  <span
                    style={{
                      background: "#c9781f",
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
        <div style={{ padding: "8px 5px", borderTop: "1px solid rgba(255,255,255,.08)" }}>
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
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.06)")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <span style={{ fontSize: 13, flexShrink: 0, color: "#6b7590" }}>
              {collapsed ? "→" : "←"}
            </span>
            {!collapsed && (
              <span style={{ fontSize: 12, color: "#6b7590" }}>Collapse</span>
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
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.06)")}
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
              AutoFlow
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, color: T.text, fontFamily: FONT_HEADING }}>
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
            <div
              title={user?.full_name}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                flexShrink: 0,
                background: "linear-gradient(135deg,#1a2947,#0d1730)",
                color: "#f0b04a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONT_HEADING,
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {(user?.full_name || "?")
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((w) => w[0])
                .join("")
                .toUpperCase()}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 22 }}>
          {tab === "overview" && (
            <OverviewTab
              T={T}
              derived={derived}
              vehicles={vehicles}
              bookings={bookings}
              teams={teams}
              onVehiclePress={setSelVehicle}
              user={user}
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
          {tab === "followups" && (
            <FollowUpsTab T={T} user={user} onDataChanged={refreshFollowUpsAlertCount} />
          )}
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
              setUsers={setUsers}
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
