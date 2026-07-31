import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "../lib/supabase";

// ─── Design tokens ──────────────────────────────────────────────────────────
const FONT = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');`;

const C = {
  navy: "#0F172A",
  navyMid: "#1E293B",
  navyLight: "#334155",
  bg: "#F1F5F9",
  surface: "#FFFFFF",
  raised: "#F8FAFC",
  border: "#E2E8F0",
  borderStr: "#CBD5E1",
  text: "#0F172A",
  textSec: "#475569",
  textMuted: "#94A3B8",
  amber: "#F59E0B",
  amberLight: "#FEF3C7",
  amberDark: "#92400E",
  green: "#059669",
  greenLight: "#D1FAE5",
  blue: "#1D4ED8",
  blueLight: "#DBEAFE",
  sky: "#0EA5E9",
  skyLight: "#E0F2FE",
  red: "#DC2626",
  redLight: "#FEE2E2",
  purple: "#7C3AED",
  purpleLight: "#EDE9FE",
  cyan: "#0891B2",
  cyanLight: "#ECFEFF",
  shadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd: "0 4px 8px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)",
  shadowLg: "0 20px 40px rgba(0,0,0,0.16), 0 8px 16px rgba(0,0,0,0.08)",
};

// ─── Department config (mirrors mobile advisor.js) ─────────────────────────
const DEPT_KEYS = [
  "mechanic",
  "painter",
  "denter",
  "electrician",
  "three_m",
  "alignment_balancing",
  "washing",
];
const DEPT_META = {
  mechanic: { label: "Mechanic", icon: "🔧", color: "#F59E0B" },
  painter: { label: "Painter", icon: "🎨", color: "#A855F7" },
  denter: { label: "Denter", icon: "🔨", color: "#14B8A6" },
  electrician: { label: "Electrician", icon: "⚡", color: "#F97316" },
  three_m: { label: "3M Work", icon: "✨", color: "#6366F1" },
  alignment_balancing: {
    label: "Alignment & Balancing",
    icon: "⚖️",
    color: "#EC4899",
  },
  washing: { label: "Washing", icon: "💧", color: "#0891B2" },
};
const THREE_M_LABELS = {
  paint_protection: "Paint Protection",
  surface_refinance: "Surface Refinance",
  underbody: "Underbody",
  silencer_coating: "Silencer Coating",
  floor_lamination: "Floor Lamination",
  headlight_polish: "Head Light Polish",
  ceramic: "Ceramic",
  acdc: "ACDC",
  service_plus: "Service+",
};
const ALIGNMENT_LABELS = {
  tyre_alignment: "Tyre Alignment",
  wheel_balancing: "Wheel Balancing",
  tyre_rotation: "Tyre Rotation",
  tyre_side_change: "Tyre Side Change",
  new_tyre_fitting: "New Tyre Fitting",
  old_tyre_fitting: "Old Tyre Fitting",
  steering_calibration: "Steering Laptop Calibration",
  tyre_puncture: "Tyre Puncture",
  wheel_rim_fitting: "Wheel Rim Fitting",
  rim_straightening: "Rim Straightening",
  nitrogen: "Nitrogen",
  tyre_swap: "Tyre Swap",
};
const TYRE_POS = { FR: "Front Right", FL: "Front Left", RR: "Rear Right", RL: "Rear Left", SP: "Stepney" };
// Departments with no fixed work-type list — cfg.customWork (free text) is their only
// "what work" input and must be persisted here, not silently dropped.
const DEPT_DETAIL_TABLE = {
  mechanic: "mechanic_details",
  painter: "painter_details",
  denter: "denter_details",
  electrician: "electrician_details",
};
// painter_details has no team_id column (confirmed against live schema — mechanic/denter/
// electrician all do). Omit it there rather than erroring on every painter assignment.
function buildDeptDetailPayload(d, vehicleId, cfg, userId) {
  const payload = {
    vehicle_id: vehicleId,
    work_assigned: cfg.customWork?.trim() ? [cfg.customWork.trim()] : [],
    notes: cfg.notes || null,
    created_by: userId,
  };
  if (d !== "painter") payload.team_id = cfg.teamId || null;
  return payload;
}
const WASHING_LABELS = {
  top_wash: "Top Wash",
  full_wash: "Full Wash",
  engine_wash: "Engine Wash",
  interior_vacuum: "Interior Vacuum",
};
const DEFAULT_WASHING_SLOTS = [
  "08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00",
  "12:00-13:00", "14:00-15:00", "15:00-16:00", "16:00-17:00",
];
const DEFAULT_VEHICLE_MODELS = [
  "Safari 2.0", "Harrier", "Curvv", "Sierra", "Nexon", "Punch", "Altroz",
  "Tigor", "Tiago", "Safari", "Hexa", "Manza", "Zest", "Bolt",
  "Indica Vista", "Indigo", "Indica", "Nano",
];
const DEFAULT_SERVICE_TYPES = {
  first_free_service: "1st Free Service",
  second_free_service: "2nd Free Service",
  third_free_service: "3rd Free Service",
  scheduled_minor: "Scheduled Minor",
  scheduled_major: "Scheduled Major",
  running_repair: "Running Repair",
  customer_complaint: "Customer Complaint",
  warranty: "Warranty",
  accident: "Accident",
};
const TIME_LABELS = {
  "09:00-11:00": "9-11 AM",
  "09:30-11:00": "9:30-11 AM",
  "11:00-13:00": "11 AM-1 PM",
  "14:00-16:00": "2-4 PM",
  "16:00-18:00": "4-6 PM",
};
const PIPELINE_STAGE_LABELS = {
  advisor_review: "👔 Needs Assignment",
  pending: "⏳ In Workshop",
  pdi: "🔍 PDI",
  billing: "🧾 Billing",
  payment: "💳 Payment",
};

// ─── Helpers ────────────────────────────────────────────────────────────────
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
const toZ = (s) =>
  !s ? s : /Z$|[+-]\d{2}:?\d{2}$/.test(s) ? s : s.replace(" ", "T") + "Z";
const todayIST = () =>
  new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
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
const fmtDateFull = (d) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
};
const timeInWorkshop = (entryTime) => {
  if (!entryTime) return "—";
  const mins = Math.floor((Date.now() - new Date(toZ(entryTime)).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
};
const validateOdometer = (value) => {
  const n = parseFloat(value);
  if (isNaN(n) || n < 0) return "Odometer must be a positive number";
  if (n > 999999) return "Odometer reading looks too high — please check";
  return null;
};
const validateVehicleNumber = (v) => {
  if (!v || v.trim().length < 8 || v.trim().length > 10)
    return "Vehicle number should be 8-10 characters";
  return null;
};
const validatePhone = (p) => {
  if (!p) return null;
  if (!/^\d{10}$/.test(p.trim())) return "Phone must be exactly 10 digits";
  return null;
};
// "Ref: Gokul | Filled by: Pawan (9876543210)" — free-text, best-effort parse
const parseContactPerson = (cp) => {
  if (!cp) return { ref: null, filledBy: null };
  const ref = cp.match(/Ref:\s*([^|]+)/)?.[1]?.trim() || null;
  const filledByExplicit = cp.match(/Filled by:\s*([^|]+)/)?.[1]?.trim() || null;
  const segments = cp.split("|").map((s) => s.trim());
  let filledBy = filledByExplicit;
  if (!filledBy && segments.length >= 2) {
    const last = segments[segments.length - 1];
    if (!last.startsWith("Ref:") && !last.startsWith("Filled by:")) filledBy = last;
  }
  if (!ref && !filledBy && !cp.includes("|")) return { ref: null, filledBy: cp.trim() };
  return { ref, filledBy };
};
const ordinal = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

async function sendWA(phone, template, params) {
  if (!phone) return;
  try {
    await supabase.functions.invoke("send-whatsapp", {
      body: { to: phone, template, params },
    });
  } catch (e) {
    console.warn("WA send failed:", e);
  }
}
async function logHistory(vehicleId, userId, stage, action, newValue, notes = null) {
  await supabase.from("vehicle_history").insert([
    { vehicle_id: vehicleId, user_id: userId, stage, action, new_value: newValue, notes },
  ]);
}
async function logBookingActivity(bookingId, userId, type, notes = "", extra = {}) {
  await supabase
    .from("booking_activities")
    .insert([{ booking_id: bookingId, user_id: userId, activity_type: type, notes, ...extra }]);
}

// ─── Primitive UI (matches ReceptionistDashboard/CashierDashboard conventions) ──
const Chip = ({ children, color, bg, style = {} }) => (
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
      ...style,
    }}
  >
    {children}
  </span>
);

const Btn = ({ children, onClick, v = "primary", sz = "md", disabled = false, style = {} }) => {
  const vs = {
    primary: { bg: C.navy, color: "#fff", border: C.navy },
    secondary: { bg: C.surface, color: C.textSec, border: C.border },
    danger: { bg: C.red, color: "#fff", border: C.red },
    ghost: { bg: "transparent", color: C.textSec, border: "transparent" },
    success: { bg: C.green, color: "#fff", border: C.green },
    sky: { bg: C.sky, color: "#fff", border: C.sky },
  };
  const ss = {
    sm: { padding: "5px 12px", fontSize: 12, borderRadius: 6 },
    md: { padding: "8px 16px", fontSize: 13, borderRadius: 7 },
    lg: { padding: "11px 24px", fontSize: 14, borderRadius: 8 },
  };
  const s = vs[v] || vs.secondary;
  const p = ss[sz] || ss.md;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? C.raised : s.bg,
        color: disabled ? C.textMuted : s.color,
        border: `1px solid ${disabled ? C.border : s.border}`,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        opacity: disabled ? 0.6 : 1,
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        transition: "all 0.12s",
        ...p,
        ...style,
      }}
    >
      {children}
    </button>
  );
};

const Dlg = ({ open, onClose, title, subtitle, children, width = 540 }) => {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
        backdropFilter: "blur(3px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.surface,
          borderRadius: 14,
          width: "100%",
          maxWidth: width,
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: C.shadowLg,
          border: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            padding: "18px 22px 14px",
            borderBottom: `1px solid ${C.border}`,
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{title}</div>
            {subtitle && (
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{subtitle}</div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: C.raised,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              cursor: "pointer",
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              color: C.textMuted,
              flexShrink: 0,
              marginLeft: 12,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>{children}</div>
      </div>
    </div>
  );
};

// Wider side-panel-style dialog for dense drill-in content (VehicleDetailsModal, DeptDetailSheet)
const SidePanel = ({ open, onClose, title, subtitle, children, width = 640 }) => {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.5)",
        zIndex: 1000,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.surface,
          width: "100%",
          maxWidth: width,
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: C.shadowLg,
          borderLeft: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            padding: "18px 24px 14px",
            borderBottom: `1px solid ${C.border}`,
            flexShrink: 0,
            background: C.navy,
          }}
        >
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>{title}</div>
            {subtitle && (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 3 }}>
                {subtitle}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 6,
              cursor: "pointer",
              width: 30,
              height: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              color: "#fff",
              flexShrink: 0,
              marginLeft: 12,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>{children}</div>
      </div>
    </div>
  );
};

const FieldLabel = ({ children, required }) => (
  <label
    style={{
      display: "block",
      fontSize: 11,
      fontWeight: 700,
      color: C.textSec,
      marginBottom: 5,
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    }}
  >
    {children}
    {required && <span style={{ color: C.red }}> *</span>}
  </label>
);

const inputStyle = (errored) => ({
  width: "100%",
  padding: "9px 12px",
  border: `1px solid ${errored ? C.red : C.border}`,
  borderRadius: 7,
  fontSize: 14,
  color: C.text,
  background: C.surface,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
});

const StyledInput = ({ as, style, errored, ...props }) => {
  const base = { ...inputStyle(errored), ...style };
  return as === "textarea" ? (
    <textarea style={{ ...base, resize: "vertical" }} {...props} />
  ) : (
    <input style={base} {...props} />
  );
};

const SelectInput = ({ style, errored, children, ...props }) => (
  <select style={{ ...inputStyle(errored), cursor: "pointer", ...style }} {...props}>
    {children}
  </select>
);

const SectionBox = ({ icon, label, children, style = {} }) => (
  <div
    style={{
      background: C.raised,
      borderRadius: 9,
      padding: "14px 16px",
      marginBottom: 12,
      border: `1px solid ${C.border}`,
      ...style,
    }}
  >
    <div
      style={{
        fontSize: 11,
        fontWeight: 800,
        color: C.textSec,
        textTransform: "uppercase",
        letterSpacing: "0.7px",
        marginBottom: 12,
        display: "flex",
        alignItems: "center",
        gap: 7,
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </div>
    {children}
  </div>
);

const StepIndicator = ({ currentStep, totalSteps, labels }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
    {Array.from({ length: totalSteps }).map((_, i) => {
      const step = i + 1;
      const active = step === currentStep;
      const done = step < currentStep;
      return (
        <div key={step} style={{ display: "flex", alignItems: "center", flex: i < totalSteps - 1 ? 1 : "none", gap: 6 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: done ? C.green : active ? C.navy : C.raised,
                color: done || active ? "#fff" : C.textMuted,
                border: `1.5px solid ${done ? C.green : active ? C.navy : C.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {done ? "✓" : step}
            </div>
            {labels?.[i] && (
              <span style={{ fontSize: 9, color: active ? C.text : C.textMuted, fontWeight: active ? 700 : 500, whiteSpace: "nowrap" }}>
                {labels[i]}
              </span>
            )}
          </div>
          {i < totalSteps - 1 && (
            <div style={{ flex: 1, height: 2, background: done ? C.green : C.border, marginBottom: labels ? 14 : 0 }} />
          )}
        </div>
      );
    })}
  </div>
);

const Empty = ({ icon, text, sub }) => (
  <div style={{ textAlign: "center", padding: "50px 20px" }}>
    <div style={{ fontSize: 34, marginBottom: 10 }}>{icon}</div>
    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{text}</div>
    {sub && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{sub}</div>}
  </div>
);

const ModelBadge = ({ model }) =>
  model ? (
    <Chip color={C.blue} bg={C.blueLight}>
      {model}
    </Chip>
  ) : null;

const PriorityBadge = ({ priority }) => {
  if (!priority || priority === "normal") return null;
  const isVip = priority === "vip";
  return (
    <Chip color={isVip ? C.purple : C.red} bg={isVip ? C.purpleLight : C.redLight}>
      {priority.toUpperCase()}
    </Chip>
  );
};

const statusColor = (s) =>
  ({
    completed: [C.green, C.greenLight],
    in_progress: [C.amber, C.amberLight],
    on_hold: [C.red, C.redLight],
    not_started: [C.textMuted, C.raised],
  })[s] || [C.textMuted, C.raised];

// ─── Shared config_options cache ────────────────────────────────────────────
// Single fetch + single realtime subscription for the whole dashboard, mirroring
// mobile advisor.js's shared-cache pattern (avoids one query per config-driven hook).
function useConfigOptions() {
  const [rows, setRows] = useState([]);
  const load = useCallback(async () => {
    const { data } = await supabase
      .from("config_options")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    setRows(data || []);
  }, []);
  useEffect(() => {
    load();
    const ch = supabase
      .channel("advisor-config-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "config_options" }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [load]);

  const byCategory = useMemo(() => {
    const g = {};
    rows.forEach((r) => {
      if (!g[r.category]) g[r.category] = [];
      g[r.category].push(r);
    });
    return g;
  }, [rows]);

  const getList = useCallback(
    (category, fallback) => {
      const list = byCategory[category];
      return list && list.length > 0 ? list.map((r) => r.key) : fallback;
    },
    [byCategory],
  );
  const getLabelMap = useCallback(
    (category, fallback) => {
      const list = byCategory[category];
      if (!list || list.length === 0) return fallback;
      const map = {};
      list.forEach((r) => {
        map[r.key] = r.label;
      });
      return map;
    },
    [byCategory],
  );

  return { rows, byCategory, getList, getLabelMap };
}

// ─── WorkBadges — small dept-status chip row for a vehicle card ────────────
function WorkBadges({ ws }) {
  if (!ws) return null;
  const active = DEPT_KEYS.filter((d) => ws[`${d}_required`]);
  if (active.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
      {active.map((d) => {
        const dm = DEPT_META[d];
        const st = ws[`${d}_status`] || "not_started";
        const [sc, sbg] = statusColor(st);
        return (
          <Chip key={d} color={sc} bg={sbg} style={{ fontSize: 10 }}>
            {dm.icon} {dm.label}
          </Chip>
        );
      })}
    </div>
  );
}

// ─── VehicleCard — used in Assign / PDI tabs ───────────────────────────────
function VehicleCard({ vehicle, isBooked, isRevisit, actionLabel, onAction, actionVariant = "primary", secondaryLabel, onSecondary, onDetails }) {
  const complaints = vehicle.customer_complaints || [];
  const leftColor =
    vehicle.priority === "vip" ? C.purple : vehicle.priority === "urgent" ? C.red : C.amber;
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "16px 20px",
        boxShadow: C.shadow,
        borderLeft: `4px solid ${leftColor}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0, cursor: onDetails ? "pointer" : "default" }} onClick={onDetails}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 900, fontSize: 17, fontFamily: "'DM Mono',monospace", color: C.text }}>
              {vehicle.vehicle_number}
            </span>
            <ModelBadge model={vehicle.model} />
            <PriorityBadge priority={vehicle.priority} />
            {isBooked && (
              <Chip color={C.sky} bg={C.skyLight}>
                📅 Booked Today
              </Chip>
            )}
            {isRevisit && (
              <Chip color={C.cyan} bg={C.cyanLight}>
                🔁 Revisit
              </Chip>
            )}
            {complaints.length > 0 && (
              <Chip color={C.amber} bg={C.amberLight}>
                📋 {complaints.length} complaint{complaints.length !== 1 ? "s" : ""}
              </Chip>
            )}
          </div>
          <div style={{ display: "flex", gap: 14, fontSize: 12, color: C.textSec, flexWrap: "wrap" }}>
            <span>👤 {vehicle.customer_name || "—"}</span>
            <span>📞 {vehicle.customer_phone || "—"}</span>
            <span>⏱ {timeInWorkshop(vehicle.entry_time)} in workshop</span>
            {vehicle.service_type && <span>🔧 {vehicle.service_type.replace(/_/g, " ")}</span>}
          </div>
          <WorkBadges ws={vehicle.work_stages?.[0]} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
          {actionLabel && (
            <Btn v={actionVariant} sz="sm" onClick={onAction} style={{ justifyContent: "center" }}>
              {actionLabel}
            </Btn>
          )}
          {secondaryLabel && (
            <Btn v="secondary" sz="sm" onClick={onSecondary} style={{ justifyContent: "center" }}>
              {secondaryLabel}
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── VehicleListItem — compact row, used in All Vehicles ───────────────────
function VehicleListItem({ vehicle, stageLabel, onPress }) {
  return (
    <div
      onClick={onPress}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "11px 14px",
        backgroundColor: C.raised,
        borderRadius: 8,
        border: `1px solid ${C.border}`,
        cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = C.surface)}
      onMouseLeave={(e) => (e.currentTarget.style.background = C.raised)}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontWeight: 800, color: C.text, fontSize: 14, fontFamily: "'DM Mono',monospace" }}>
          {vehicle.vehicle_number}
        </span>
        <ModelBadge model={vehicle.model} />
        <PriorityBadge priority={vehicle.priority} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 12, color: C.textSec }}>{vehicle.customer_name || "—"}</span>
        <Chip color={C.navy} bg={C.raised} style={{ border: `1px solid ${C.border}` }}>
          {stageLabel}
        </Chip>
      </div>
    </div>
  );
}

// ─── Assign tab ─────────────────────────────────────────────────────────────
function AssignTab({ vehicles, bookedTodayIds, recentVisitNums, onAssign, onDetails }) {
  const list = vehicles.filter(
    (v) => v.current_stage === "advisor_review" && v.tag_workshop !== false,
  );
  if (list.length === 0)
    return <Empty icon="✅" text="Nothing to assign" sub="All vehicles have work assigned" />;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {list.map((v) => (
        <VehicleCard
          key={v.id}
          vehicle={v}
          isBooked={bookedTodayIds.has(v.vehicle_number)}
          isRevisit={recentVisitNums.has(v.vehicle_number)}
          actionLabel="📝 Assign Work"
          onAction={() => onAssign(v)}
          onDetails={() => onDetails(v)}
        />
      ))}
    </div>
  );
}

// ─── PDI tab ────────────────────────────────────────────────────────────────
function PDITab({ vehicles, user, onPDI, onReassign, onDetails }) {
  const list = vehicles.filter(
    (v) => v.current_stage === "pdi" && v.advisor_id === user.id,
  );
  if (list.length === 0)
    return <Empty icon="🔍" text="No vehicles awaiting PDI" />;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {list.map((v) => (
        <VehicleCard
          key={v.id}
          vehicle={v}
          actionLabel="🔍 Start PDI"
          onAction={() => onPDI(v)}
          secondaryLabel="🔄 Send Back to Workshop"
          onSecondary={() => onReassign(v)}
          onDetails={() => onDetails(v)}
        />
      ))}
    </div>
  );
}

// ─── All Vehicles tab ───────────────────────────────────────────────────────
function AllVehiclesTab({ vehicles, onDetails }) {
  const [q, setQ] = useState("");
  const filtered = vehicles.filter((v) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      v.vehicle_number?.toLowerCase().includes(s) ||
      v.customer_name?.toLowerCase().includes(s)
    );
  });
  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="🔍 Search vehicle number or customer..."
        style={{ ...inputStyle(false), width: 320, marginBottom: 16 }}
      />
      {filtered.length === 0 ? (
        <Empty icon="🚗" text="No vehicles found" />
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {filtered.map((v) => (
            <VehicleListItem
              key={v.id}
              vehicle={v}
              stageLabel={PIPELINE_STAGE_LABELS[v.current_stage] || (v.current_stage || "").replace(/_/g, " ")}
              onPress={() => onDetails(v)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Offline Job Cards tab ──────────────────────────────────────────────────
function OfflineJobCardsTab({ vehicles, onRefresh }) {
  const list = vehicles.filter((v) => v.is_offline_jobcard && !v.offline_jobcard_opened);
  const markOpened = async (id) => {
    await supabase.from("vehicles").update({ offline_jobcard_opened: true }).eq("id", id);
    onRefresh();
  };
  if (list.length === 0)
    return <Empty icon="📄" text="No offline job cards pending" sub="Paper job cards awaiting entry into the system appear here" />;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {list.map((v) => (
        <VehicleCard
          key={v.id}
          vehicle={v}
          actionLabel="✓ Mark Opened"
          actionVariant="success"
          onAction={() => markOpened(v.id)}
        />
      ))}
    </div>
  );
}

// ─── Departments tab — one section per department, PARALLEL work in `pending` stage ──
const DEPT_ORDER = ["mechanic", "painter", "denter", "electrician", "three_m", "alignment_balancing", "washing"];
function DepartmentsTab({ vehicles, bookedTodayIds, onDetails }) {
  const active = vehicles.filter((v) => v.current_stage === "pending");
  const byDept = {};
  DEPT_ORDER.forEach((d) => {
    byDept[d] = active.filter((v) => {
      const ws = v.work_stages?.[0];
      return ws?.[`${d}_required`] && ws[`${d}_status`] !== "completed";
    });
  });
  const anyDept = DEPT_ORDER.some((d) => byDept[d].length > 0);
  if (!anyDept) return <Empty icon="🔧" text="No vehicles in workshop departments right now" />;
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {DEPT_ORDER.filter((d) => byDept[d].length > 0).map((d) => {
        const dm = DEPT_META[d];
        return (
          <div
            key={d}
            style={{
              background: C.surface,
              borderRadius: 12,
              padding: "16px 20px",
              border: `1px solid ${C.border}`,
              boxShadow: C.shadow,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
                {dm.icon} {dm.label}
              </span>
              <Chip color={dm.color} bg={dm.color + "22"}>
                {byDept[d].length}
              </Chip>
              <Chip color={C.textMuted} bg={C.raised}>
                PARALLEL
              </Chip>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {byDept[d].map((v) => {
                const ws = v.work_stages?.[0];
                const st = ws?.[`${d}_status`] || "not_started";
                const [sc, sbg] = statusColor(st);
                const mins = v.entry_time
                  ? Math.floor((Date.now() - new Date(toZ(v.entry_time)).getTime()) / 60000)
                  : 0;
                const isOld = mins >= 240;
                return (
                  <div
                    key={v.id}
                    onClick={() => onDetails(v)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 14px",
                      backgroundColor: isOld ? C.amberLight : C.raised,
                      borderRadius: 8,
                      border: `1px solid ${isOld ? "#FDE68A" : C.border}`,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontWeight: 800, fontSize: 14, fontFamily: "'DM Mono',monospace", color: C.text }}>
                        {v.vehicle_number}
                      </span>
                      {v.model && <ModelBadge model={v.model} />}
                      {bookedTodayIds.has(v.vehicle_number) && (
                        <Chip color={C.sky} bg={C.skyLight}>
                          📅
                        </Chip>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 12, color: isOld ? C.amberDark : C.textMuted, fontWeight: isOld ? 700 : 400 }}>
                        ⏱ {timeInWorkshop(v.entry_time)}
                      </span>
                      <Chip color={sc} bg={sbg}>
                        {st.replace(/_/g, " ")}
                      </Chip>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── WashingSlotPicker — date + slot combo, reused by AssignWorkModal /
// DepartmentConfigModal / WashingEditModal ──────────────────────────────────
function WashingSlotPicker({ slots, date, onDateChange, slot, onSlotChange, occupancy }) {
  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <FieldLabel>Washing Date</FieldLabel>
        <input
          type="date"
          value={date}
          min={todayIST()}
          onChange={(e) => onDateChange(e.target.value)}
          style={inputStyle(false)}
        />
      </div>
      <FieldLabel>Time Slot</FieldLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
        {slots.map((s) => {
          const count = occupancy?.[s] || 0;
          const full = count >= 3;
          const sel = slot === s;
          return (
            <div
              key={s}
              onClick={() => !full && onSlotChange(s)}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: `1.5px solid ${sel ? C.sky : C.border}`,
                background: sel ? C.skyLight : full ? C.raised : C.surface,
                cursor: full ? "not-allowed" : "pointer",
                opacity: full && !sel ? 0.5 : 1,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: sel ? C.sky : C.text }}>{s}</div>
              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>
                {count}/3 slotted {full ? "· Full" : ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Washing tab ─────────────────────────────────────────────────────────────
// Ports mobile advisor.js's AdvisorWashingTab structure/behavior 1:1 (stat tiles,
// pending-slot warning block, future-slot block, per-slot cards with MINE/OVERDUE/
// IN SLOT/UPCOMING badges) rather than a generic list.
function AdvisorWashingTab({ vehicles, slots, user, onVehiclePress }) {
  const { getLabelMap } = useConfigOptions();
  const washLabelMap = getLabelMap("washing_work_type", null) || WASHING_LABELS;
  const washLabel = (wt) => washLabelMap[wt] || wt.replace(/_/g, " ");

  const today = todayIST();
  const nowHHMM = () => new Date(Date.now() + 5.5 * 3600000).toISOString().slice(11, 16);
  const to24 = (t) => {
    const [h, m] = t.trim().split(":").map(Number);
    if (h >= 1 && h <= 6) return `${String(h + 12).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const allWashingVehicles = vehicles.filter((v) => v.work_stages?.[0]?.washing_required);
  const myVehicleIds = new Set(vehicles.filter((v) => v.advisor_id === user?.id).map((v) => v.id));

  const pendingSlotVehicles = [];
  const vehiclesBySlot = {};
  allWashingVehicles.forEach((v) => {
    const wd = v.washing_details?.[0];
    const ws = v.work_stages?.[0];
    if (!wd) {
      if (ws?.washing_status !== "completed" && myVehicleIds.has(v.id)) pendingSlotVehicles.push(v);
      return;
    }
    if (ws?.washing_status === "completed" && wd.slot_date && wd.slot_date !== today) return;
    if (!wd.slot) {
      if (ws?.washing_status !== "completed" && myVehicleIds.has(v.id)) pendingSlotVehicles.push(v);
      return;
    }
    if (wd.slot_date !== today) return;
    if (!vehiclesBySlot[wd.slot]) vehiclesBySlot[wd.slot] = [];
    vehiclesBySlot[wd.slot].push(v);
  });

  const myWashingVehicles = allWashingVehicles.filter((v) => myVehicleIds.has(v.id));
  const currentTime = nowHHMM();

  const totalOverdue = myWashingVehicles.filter((v) => {
    const wd = v.washing_details?.[0];
    const ws = v.work_stages?.[0];
    if (!wd?.slot || ws?.washing_status === "completed") return false;
    if (wd.slot_date !== today) return false;
    return currentTime >= to24(wd.slot.split("-")[1]);
  }).length;
  const totalInSlot = myWashingVehicles.filter((v) => {
    const wd = v.washing_details?.[0];
    const ws = v.work_stages?.[0];
    if (!wd?.slot || ws?.washing_status === "completed") return false;
    if (wd.slot_date !== today) return false;
    return currentTime < to24(wd.slot.split("-")[1]);
  }).length;
  const totalCompleted = myWashingVehicles.filter((v) => {
    if (v.work_stages?.[0]?.washing_status !== "completed") return false;
    const wd = v.washing_details?.[0];
    const completedDate = wd?.slot_date || (v.updated_at || v.entry_time || "").slice(0, 10);
    return completedDate === today;
  }).length;
  const myPending = pendingSlotVehicles.length;

  const futureVehicles = allWashingVehicles.filter((v) => {
    const wd = v.washing_details?.[0];
    const ws = v.work_stages?.[0];
    if (ws?.washing_status === "completed" || !myVehicleIds.has(v.id)) return false;
    return wd?.slot && wd?.slot_date && wd.slot_date > today;
  });

  const tiles = [
    { label: "No Slot", value: myPending, color: myPending > 0 ? C.amber : C.textMuted, bg: C.amberLight },
    { label: "In Slot", value: totalInSlot, color: totalInSlot > 0 ? C.sky : C.textMuted, bg: C.skyLight },
    { label: "Overdue", value: totalOverdue, color: totalOverdue > 0 ? C.red : C.textMuted, bg: C.redLight },
    { label: "Done", value: totalCompleted, color: totalCompleted > 0 ? C.green : C.textMuted, bg: C.greenLight },
  ];

  const WashTypeChips = ({ v }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
      {(v.washing_details?.[0]?.washing_types || []).map((wt) => (
        <Chip key={wt} color={C.cyan} bg={C.cyanLight}>
          {washLabel(wt)}
        </Chip>
      ))}
    </div>
  );

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {tiles.map((t) => (
          <div key={t.label} style={{ background: t.bg, border: `1px solid ${t.color}44`, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: t.color, fontFamily: "'DM Mono',monospace" }}>{t.value}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: t.color, textTransform: "uppercase", letterSpacing: "0.4px", marginTop: 2 }}>{t.label}</div>
          </div>
        ))}
      </div>

      {pendingSlotVehicles.length > 0 && (
        <div style={{ background: C.amberLight, borderRadius: 12, padding: 14, marginBottom: 14, border: `1.5px dashed ${C.amber}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.amberDark }}>⚠️ Slot Allotment Pending</span>
            <Chip color={C.amberDark} bg="#FDE68A">{pendingSlotVehicles.length}</Chip>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {pendingSlotVehicles.map((v) => (
              <div key={v.id} onClick={() => onVehiclePress(v)} style={{ background: C.surface, padding: 12, borderRadius: 8, borderLeft: `3px solid ${C.amber}`, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "'DM Mono',monospace" }}>{v.vehicle_number}</span>
                    {v.model && <span style={{ fontSize: 11, color: C.blue, fontWeight: 600 }}>{v.model}</span>}
                  </span>
                  <Chip color={C.amber} bg="#FDE68A">NO SLOT</Chip>
                </div>
                <WashTypeChips v={v} />
              </div>
            ))}
          </div>
        </div>
      )}

      {futureVehicles.length > 0 && (
        <div style={{ background: C.blueLight, borderRadius: 12, padding: 14, marginBottom: 14, border: `1.5px solid ${C.blue}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.blue }}>📅 Future Slot Vehicles</span>
            <Chip color={C.blue} bg={C.blueLight}>{futureVehicles.length}</Chip>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {futureVehicles.map((v) => {
              const wd = v.washing_details?.[0];
              return (
                <div key={v.id} onClick={() => onVehiclePress(v)} style={{ background: C.surface, padding: 12, borderRadius: 8, borderLeft: `3px solid ${C.sky}`, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "'DM Mono',monospace" }}>{v.vehicle_number}</span>
                    {v.model && <span style={{ fontSize: 11, color: C.blue, fontWeight: 600 }}>{v.model}</span>}
                  </span>
                  <span style={{ textAlign: "right", fontSize: 11, color: C.blue, fontWeight: 700 }}>
                    <div>📅 {wd?.slot_date}</div>
                    <div style={{ fontWeight: 400 }}>🕐 {wd?.slot}</div>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <SectionBox icon="💧" label="All Washing Slots">
        <div style={{ display: "grid", gap: 10 }}>
          {slots.map((slot) => {
            const slotVehicles = vehiclesBySlot[slot] || [];
            const [startStr, endStr] = slot.split("-");
            const isCurrent = currentTime >= to24(startStr) && currentTime < to24(endStr);
            const isPast = currentTime >= to24(endStr);
            if (slotVehicles.length === 0 && isPast) return null;

            const activeInSlot = slotVehicles.filter((v) => v.work_stages?.[0]?.washing_status !== "completed");
            const completedInSlot = slotVehicles.filter((v) => v.work_stages?.[0]?.washing_status === "completed");

            return (
              <div key={slot} style={{ border: `1px solid ${isCurrent ? C.amber : C.border}`, borderRadius: 10, overflow: "hidden" }}>
                {isCurrent && <div style={{ height: 3, background: C.amber }} />}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, borderBottom: slotVehicles.length > 0 ? `1px solid ${C.border}` : "none" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>🕐 {slot}</span>
                    {isCurrent && <Chip color={C.amberDark} bg="#FDE68A">NOW</Chip>}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: slotVehicles.length >= 3 ? C.red : slotVehicles.length > 0 ? C.amber : C.green }}>
                    {slotVehicles.length}/3
                  </span>
                </div>
                {slotVehicles.length > 0 && (
                  <div style={{ padding: 10, display: "grid", gap: 6 }}>
                    {activeInSlot.map((v) => {
                      const ws = v.work_stages?.[0];
                      const isMyVehicle = myVehicleIds.has(v.id);
                      const isOverdue = isPast && ws?.washing_status !== "completed";
                      return (
                        <div
                          key={v.id}
                          onClick={() => onVehiclePress(v)}
                          style={{
                            background: isMyVehicle ? "#FEFCE8" : C.bg,
                            padding: 12,
                            borderRadius: 8,
                            border: `1px solid ${C.border}`,
                            borderLeft: isMyVehicle ? `3px solid ${C.amber}` : `1px solid ${C.border}`,
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "'DM Mono',monospace" }}>{v.vehicle_number}</span>
                              {v.model && <span style={{ fontSize: 11, color: C.blue, fontWeight: 600 }}>{v.model}</span>}
                              {isMyVehicle && <Chip color={C.sky} bg={C.skyLight}>MINE</Chip>}
                            </span>
                            <Chip
                              color={isOverdue ? C.red : isCurrent ? C.amber : C.textMuted}
                              bg={isOverdue ? C.redLight : isCurrent ? C.amberLight : C.raised}
                            >
                              {isOverdue ? "OVERDUE" : isCurrent ? "IN SLOT" : "UPCOMING"}
                            </Chip>
                          </div>
                          <WashTypeChips v={v} />
                          {ws?.washing_arrived_at && (
                            <div style={{ marginTop: 6 }}>
                              <Chip color={C.green} bg={C.greenLight}>🟢 Arrived at Bay</Chip>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {completedInSlot.map((v) => (
                      <div key={v.id} onClick={() => onVehiclePress(v)} style={{ background: C.bg, padding: 10, borderRadius: 8, opacity: 0.6, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.textSec, fontFamily: "'DM Mono',monospace" }}>{v.vehicle_number}</span>
                        {v.model && <span style={{ fontSize: 11, color: C.blue }}>{v.model}</span>}
                        <Chip color={C.green} bg={C.greenLight}>✓ Done</Chip>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SectionBox>

      {allWashingVehicles.length === 0 && <Empty icon="💧" text="No Washing Assigned" sub="No vehicles with washing in progress" />}
    </div>
  );
}

// ─── Booking status badge ───────────────────────────────────────────────────
const BOOKING_STATUS_META = {
  pending: { label: "Pending", color: "#D97706", bg: "#FFFBEB" },
  confirmed: { label: "Confirmed", color: "#1D4ED8", bg: "#EFF6FF" },
  arrived: { label: "Arrived", color: "#065F46", bg: "#ECFDF5" },
  completed: { label: "Completed", color: "#475569", bg: "#F8FAFC" },
  cancelled: { label: "Cancelled", color: "#991B1B", bg: "#FFF5F5" },
  no_show: { label: "No Show", color: "#374151", bg: "#F9FAFB" },
  rescheduled: { label: "Rescheduled", color: "#7C3AED", bg: "#EDE9FE" },
};
const StatusBadge = ({ status }) => {
  const m = BOOKING_STATUS_META[status] || { label: status, color: C.textMuted, bg: C.raised };
  return (
    <Chip color={m.color} bg={m.bg}>
      {m.label}
    </Chip>
  );
};

// ─── AdvisorBookingCard ─────────────────────────────────────────────────────
function AdvisorBookingCard({ booking, visitCount, onConfirm, onReschedule, onEdit, onCancel }) {
  const { ref, filledBy } = parseContactPerson(booking.contact_person);
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", boxShadow: C.shadow }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 900, fontSize: 16, fontFamily: "'DM Mono',monospace", color: C.text }}>
              {booking.vehicle_number}
            </span>
            <ModelBadge model={booking.model} />
            <StatusBadge status={booking.status} />
            {visitCount > 1 && (
              <Chip color={C.cyan} bg={C.cyanLight}>
                {ordinal(visitCount)} visit
              </Chip>
            )}
          </div>
          <div style={{ display: "flex", gap: 14, fontSize: 12, color: C.textSec, flexWrap: "wrap", marginBottom: 4 }}>
            <span>👤 {booking.customer_name || "—"}</span>
            {booking.customer_phone && (
              <a href={`tel:${booking.customer_phone}`} style={{ color: C.blue, textDecoration: "none" }}>
                📞 {booking.customer_phone}
              </a>
            )}
            <span>📅 {fmtDateFull(booking.preferred_date)}</span>
            <span>🕐 {booking.confirmed_time || TIME_LABELS[booking.preferred_time] || booking.preferred_time || "—"}</span>
          </div>
          {(ref || filledBy) && (
            <div style={{ fontSize: 11, color: C.textMuted }}>
              {ref && <span>Ref: {ref}</span>}
              {ref && filledBy && <span> · </span>}
              {filledBy && <span>Filled by: {filledBy}</span>}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 260 }}>
          {(booking.status === "pending" || booking.status === "confirmed") && (
            <Btn v="success" sz="sm" onClick={() => onConfirm(booking)}>
              {booking.status === "pending" ? "✓ Confirm" : "✏️ Edit Time"}
            </Btn>
          )}
          {(booking.status === "pending" || booking.status === "confirmed") && (
            <Btn v="secondary" sz="sm" onClick={() => onReschedule(booking)}>
              🔄 Reschedule
            </Btn>
          )}
          <Btn v="secondary" sz="sm" onClick={() => onEdit(booking)}>
            ✏️ Edit
          </Btn>
          {booking.status !== "cancelled" && booking.status !== "completed" && (
            <Btn v="danger" sz="sm" onClick={() => onCancel(booking)}>
              ✕ Cancel
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AdvisorBookingsTab ─────────────────────────────────────────────────────
function AdvisorBookingsTab({ bookings, user, visitCounts, onConfirm, onReschedule, onEdit, onCancel }) {
  const [sub, setSub] = useState("enquiry");
  const [date, setDate] = useState(todayIST());

  const enquiry = bookings.filter((b) => b.status === "pending").sort((a, b) => a.preferred_date.localeCompare(b.preferred_date));
  const mine = bookings.filter((b) => b.confirmed_by === user.id && b.preferred_date === date);
  const allForDate = bookings.filter((b) => b.preferred_date === date);

  const list = sub === "enquiry" ? enquiry : sub === "mine" ? mine : allForDate;
  const stats = {
    total: allForDate.length,
    pending: allForDate.filter((b) => b.status === "pending").length,
    confirmed: allForDate.filter((b) => b.status === "confirmed").length,
    arrived: allForDate.filter((b) => b.status === "arrived").length,
  };

  const shiftDate = (delta) => {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          ["enquiry", "📨 Enquiry", enquiry.length],
          ["mine", "👤 My Bookings", null],
          ["all", "📋 All", null],
        ].map(([k, l, count]) => (
          <Btn key={k} v={sub === k ? "primary" : "secondary"} onClick={() => setSub(k)}>
            {l}
            {count !== null && (
              <span style={{ marginLeft: 6, background: sub === k ? "rgba(255,255,255,0.25)" : C.raised, padding: "1px 6px", borderRadius: 10, fontSize: 11 }}>
                {count}
              </span>
            )}
          </Btn>
        ))}
      </div>

      {sub !== "enquiry" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Btn v="secondary" sz="sm" onClick={() => shiftDate(-1)}>
            ← Yesterday
          </Btn>
          <Btn v="secondary" sz="sm" onClick={() => setDate(todayIST())}>
            Today
          </Btn>
          <Btn v="secondary" sz="sm" onClick={() => shiftDate(1)}>
            Tomorrow →
          </Btn>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle(false), width: 170 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{fmtDateFull(date)}</span>
        </div>
      )}

      {sub !== "enquiry" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
          {[
            ["Total", stats.total, C.navy],
            ["Pending", stats.pending, C.amber],
            ["Confirmed", stats.confirmed, C.blue],
            ["Arrived", stats.arrived, C.green],
          ].map(([l, v, c]) => (
            <div key={l} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: "uppercase" }}>{l}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: c, fontFamily: "'DM Mono',monospace" }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {list.length === 0 ? (
        <Empty icon="🗓" text="No bookings here" />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {list.map((b) => (
            <AdvisorBookingCard
              key={b.id}
              booking={b}
              visitCount={visitCounts[b.vehicle_number] || 1}
              onConfirm={onConfirm}
              onReschedule={onReschedule}
              onEdit={onEdit}
              onCancel={onCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AdvisorBookingConfirmModal ─────────────────────────────────────────────
function AdvisorBookingConfirmModal({ booking, user, onClose, onSuccess }) {
  const [time, setTime] = useState(booking.confirmed_time || "");
  const [notes, setNotes] = useState("");
  const [sendWa, setSendWa] = useState(!!booking.customer_phone);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    setErr("");
    setLoading(true);
    try {
      const wasPending = booking.status === "pending";
      const { error } = await supabase
        .from("bookings")
        .update({
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
          confirmed_by: user.id,
          ...(time ? { confirmed_time: time } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id);
      if (error) throw error;
      await logBookingActivity(booking.id, user.id, "call_done", notes.trim() || "Confirmed by advisor");
      if (wasPending && sendWa && booking.customer_phone) {
        await sendWA(booking.customer_phone, "booking_confirmed", [
          booking.customer_name || "Customer",
          booking.model || "your vehicle",
          booking.vehicle_number,
          fmtDateFull(booking.preferred_date),
          time || TIME_LABELS[booking.preferred_time] || "As per availability",
          booking.ref_number || "—",
          user.full_name || "our team",
          user.phone || "",
        ]);
      }
      onSuccess();
    } catch (e) {
      setErr(e.message || "Failed to confirm booking");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dlg open onClose={onClose} title="Confirm Booking" subtitle={`${booking.vehicle_number} · ${booking.customer_name || "—"}`} width={420}>
      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Confirmed Arrival Time</FieldLabel>
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={inputStyle(false)} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Notes (optional)</FieldLabel>
        <StyledInput as="textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Call notes..." />
      </div>
      {booking.customer_phone && (
        <div
          onClick={() => setSendWa(!sendWa)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 8,
            border: `1.5px solid ${sendWa ? "#86EFAC" : C.border}`,
            background: sendWa ? "#F0FDF4" : C.surface,
            cursor: "pointer",
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 13, color: C.text }}>Send WhatsApp confirmation to customer</span>
        </div>
      )}
      {err && (
        <div style={{ background: C.redLight, color: C.red, padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{err}</div>
      )}
      <Btn v="success" onClick={save} disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
        {loading ? "Saving..." : "✓ Confirm Booking"}
      </Btn>
    </Dlg>
  );
}

// ─── AdvisorBookingRescheduleModal ──────────────────────────────────────────
function AdvisorBookingRescheduleModal({ booking, user, onClose, onSuccess }) {
  const [newDate, setNewDate] = useState(todayIST());
  const [newTime, setNewTime] = useState(booking.preferred_time || "");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    if (!newDate) return;
    setErr("");
    setLoading(true);
    try {
      const ist = new Date(Date.now() + 5.5 * 3600000);
      const newRef = `BK-${ist.getUTCFullYear()}${String(ist.getUTCMonth() + 1).padStart(2, "0")}${String(ist.getUTCDate()).padStart(2, "0")}-${String(Math.floor(1000 + Math.random() * 9000))}`;

      const { error: insertErr } = await supabase.from("bookings").insert([
        {
          vehicle_number: booking.vehicle_number,
          customer_name: booking.customer_name,
          customer_phone: booking.customer_phone || null,
          model: booking.model || null,
          service_type: booking.service_type || null,
          issue_description: booking.issue_description || null,
          preferred_date: newDate,
          preferred_time: newTime || null,
          contact_person: booking.contact_person || null,
          odometer_reading: booking.odometer_reading || null,
          ref_number: newRef,
          status: "pending",
          rescheduled_from: booking.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
      if (insertErr) throw insertErr;

      const { error: updateErr } = await supabase
        .from("bookings")
        .update({ status: "rescheduled", updated_at: new Date().toISOString() })
        .eq("id", booking.id);
      if (updateErr) throw updateErr;

      await logBookingActivity(
        booking.id,
        user.id,
        "rescheduled",
        notes || `Rescheduled to ${fmtDateFull(newDate)}. New ref: ${newRef}`,
        { old_date: booking.preferred_date, new_date: newDate },
      );

      if (booking.customer_phone) {
        await sendWA(booking.customer_phone, "booking_rescheduled", [
          booking.customer_name || "Customer",
          booking.model || "your vehicle",
          booking.vehicle_number,
          fmtDateFull(newDate),
          newTime ? TIME_LABELS[newTime] || newTime : "As per availability",
          newRef,
          user.full_name || "our team",
          user.phone || "",
        ]);
      }
      onSuccess();
    } catch (e) {
      setErr(e.message || "Failed to reschedule");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dlg open onClose={onClose} title="Reschedule Appointment" subtitle={`${booking.vehicle_number} · ${booking.customer_name}`} width={440}>
      <div style={{ background: C.raised, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.textSec }}>
        Currently: <strong>{fmtDateFull(booking.preferred_date)}</strong>
        {booking.preferred_time ? ` · ${TIME_LABELS[booking.preferred_time] || booking.preferred_time}` : ""}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div>
          <FieldLabel required>New Date</FieldLabel>
          <input type="date" value={newDate} min={todayIST()} onChange={(e) => setNewDate(e.target.value)} style={inputStyle(false)} />
        </div>
        <div>
          <FieldLabel>New Time</FieldLabel>
          <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} style={inputStyle(false)} />
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <FieldLabel>Notes (optional)</FieldLabel>
        <StyledInput as="textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for reschedule..." />
      </div>
      {err && (
        <div style={{ background: C.redLight, color: C.red, padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{err}</div>
      )}
      <Btn v="primary" onClick={save} disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
        {loading ? "Saving..." : "🔄 Reschedule"}
      </Btn>
    </Dlg>
  );
}

// ─── AdvisorBookingEditModal ─────────────────────────────────────────────────
function AdvisorBookingEditModal({ booking, user, onClose, onSuccess }) {
  const [f, setF] = useState({
    vehicle_number: booking.vehicle_number || "",
    model: booking.model || "",
    customer_name: booking.customer_name || "",
    customer_phone: booking.customer_phone || "",
    service_type: booking.service_type || "",
    issue_description: booking.issue_description || "",
    preferred_date: booking.preferred_date || "",
    preferred_time: booking.preferred_time || "",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const upd = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setErr("");
    const phoneErr = validatePhone(f.customer_phone);
    if (phoneErr) return setErr(phoneErr);
    setLoading(true);
    try {
      const diffs = Object.entries(f)
        .filter(([k, v]) => (booking[k] || "") !== (v || ""))
        .map(([k, v]) => `${k}: "${booking[k] || "—"}" → "${v || "—"}"`);
      const { error } = await supabase
        .from("bookings")
        .update({ ...f, updated_at: new Date().toISOString() })
        .eq("id", booking.id);
      if (error) throw error;
      if (diffs.length > 0) {
        await logBookingActivity(booking.id, user.id, "edited", diffs.join("; "));
      }
      onSuccess();
    } catch (e) {
      setErr(e.message || "Failed to save changes");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dlg open onClose={onClose} title="Edit Booking" subtitle={booking.ref_number} width={520}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div>
          <FieldLabel required>Vehicle Number</FieldLabel>
          <StyledInput value={f.vehicle_number} onChange={(e) => upd("vehicle_number", e.target.value.toUpperCase())} />
        </div>
        <div>
          <FieldLabel>Model</FieldLabel>
          <StyledInput value={f.model} onChange={(e) => upd("model", e.target.value)} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div>
          <FieldLabel>Customer Name</FieldLabel>
          <StyledInput value={f.customer_name} onChange={(e) => upd("customer_name", e.target.value)} />
        </div>
        <div>
          <FieldLabel>Phone</FieldLabel>
          <StyledInput value={f.customer_phone} onChange={(e) => upd("customer_phone", e.target.value)} />
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <FieldLabel>Service Type</FieldLabel>
        <SelectInput value={f.service_type} onChange={(e) => upd("service_type", e.target.value)}>
          <option value="">Select...</option>
          {Object.entries(DEFAULT_SERVICE_TYPES).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </SelectInput>
      </div>
      <div style={{ marginBottom: 10 }}>
        <FieldLabel>Issue / Notes</FieldLabel>
        <StyledInput as="textarea" rows={2} value={f.issue_description} onChange={(e) => upd("issue_description", e.target.value)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div>
          <FieldLabel>Date</FieldLabel>
          <input type="date" value={f.preferred_date} onChange={(e) => upd("preferred_date", e.target.value)} style={inputStyle(false)} />
        </div>
        <div>
          <FieldLabel>Time</FieldLabel>
          <StyledInput value={f.preferred_time} onChange={(e) => upd("preferred_time", e.target.value)} placeholder="HH:MM or slot" />
        </div>
      </div>
      {err && (
        <div style={{ background: C.redLight, color: C.red, padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{err}</div>
      )}
      <Btn v="primary" onClick={save} disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
        {loading ? "Saving..." : "Save Changes"}
      </Btn>
    </Dlg>
  );
}

// ─── AdvisorBookingCancelModal ───────────────────────────────────────────────
function AdvisorBookingCancelModal({ booking, user, onClose, onSuccess }) {
  const [reason, setReason] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(!!booking.customer_phone);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    setErr("");
    setLoading(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", booking.id);
      if (error) throw error;
      await logBookingActivity(booking.id, user.id, "cancelled", reason || "Cancelled by advisor");
      if (notifyCustomer && booking.customer_phone) {
        await sendWA(booking.customer_phone, "booking_cancelled", [
          booking.customer_name || "Customer",
          booking.model || "your vehicle",
          booking.vehicle_number,
          booking.ref_number || "—",
        ]);
      }
      onSuccess();
    } catch (e) {
      setErr(e.message || "Failed to cancel booking");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dlg open onClose={onClose} title="Cancel Booking" subtitle={`${booking.vehicle_number} · ${booking.customer_name}`} width={420}>
      <div style={{ background: C.redLight, border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.red, fontWeight: 600 }}>
        ⚠️ This will cancel the booking. Action is logged.
      </div>
      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Reason (optional)</FieldLabel>
        <StyledInput as="textarea" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      {booking.customer_phone && (
        <div
          onClick={() => setNotifyCustomer(!notifyCustomer)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 8,
            border: `1.5px solid ${notifyCustomer ? "#86EFAC" : C.border}`,
            background: notifyCustomer ? "#F0FDF4" : C.surface,
            cursor: "pointer",
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 13, color: C.text }}>Notify customer via WhatsApp</span>
        </div>
      )}
      {err && (
        <div style={{ background: C.redLight, color: C.red, padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{err}</div>
      )}
      <Btn v="danger" onClick={save} disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
        {loading ? "Cancelling..." : "Cancel Booking"}
      </Btn>
    </Dlg>
  );
}

// ─── LeaveApplicationModal (new — no web equivalent existed before this build) ──
// Writes to leave_applications: user_id, leave_type, from_date, to_date, reason,
// status ("pending"), created_at — same columns OwnerDashboard's review flow reads.
function LeaveApplicationModal({ user, leaveTypes, onClose, onSuccess }) {
  const [leaveType, setLeaveType] = useState(leaveTypes[0]?.key || "casual");
  const [fromDate, setFromDate] = useState(todayIST());
  const [toDate, setToDate] = useState(todayIST());
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const days = Math.max(
    1,
    Math.round((new Date(toDate) - new Date(fromDate)) / 86400000) + 1,
  );

  const save = async () => {
    setErr("");
    if (!fromDate || !toDate) return setErr("Select from and to dates");
    if (new Date(toDate) < new Date(fromDate)) return setErr("To date must be on/after from date");
    setLoading(true);
    try {
      const { error } = await supabase.from("leave_applications").insert([
        {
          user_id: user.id,
          leave_type: leaveType,
          from_date: fromDate,
          to_date: toDate,
          reason: reason.trim() || null,
          status: "pending",
          created_at: new Date().toISOString(),
        },
      ]);
      if (error) throw error;
      setSuccessMsg("✅ Leave application submitted for owner review.");
      setTimeout(onSuccess, 1400);
    } catch (e) {
      setErr(e.message || "Failed to submit leave application");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dlg open onClose={onClose} title="Apply for Leave" width={420}>
      {successMsg ? (
        <div style={{ background: C.greenLight, border: `1px solid ${C.green}44`, borderRadius: 10, padding: "18px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>{successMsg}</div>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 14 }}>
            <FieldLabel required>Leave Type</FieldLabel>
            <SelectInput value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
              {(leaveTypes.length ? leaveTypes : [{ key: "casual", label: "Casual" }, { key: "sick", label: "Sick" }, { key: "personal", label: "Personal" }]).map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </SelectInput>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
            <div>
              <FieldLabel required>From</FieldLabel>
              <input type="date" value={fromDate} min={todayIST()} onChange={(e) => setFromDate(e.target.value)} style={inputStyle(false)} />
            </div>
            <div>
              <FieldLabel required>To</FieldLabel>
              <input type="date" value={toDate} min={fromDate} onChange={(e) => setToDate(e.target.value)} style={inputStyle(false)} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>
            {days} day{days !== 1 ? "s" : ""}
          </div>
          <div style={{ marginBottom: 16 }}>
            <FieldLabel>Reason</FieldLabel>
            <StyledInput as="textarea" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Brief reason for leave..." />
          </div>
          {err && (
            <div style={{ background: C.redLight, color: C.red, padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{err}</div>
          )}
          <Btn v="primary" onClick={save} disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
            {loading ? "Submitting..." : "Submit Application"}
          </Btn>
        </>
      )}
    </Dlg>
  );
}

// ─── VehicleTagBadges ────────────────────────────────────────────────────────
function VehicleTagBadges({ vehicle }) {
  const tags = [
    vehicle.tag_accident && { label: "Accident", color: C.red, bg: C.redLight },
    vehicle.tag_workshop && { label: "Workshop", color: C.blue, bg: C.blueLight },
    vehicle.tag_direct_repair && { label: "Direct Repair", color: C.purple, bg: C.purpleLight },
  ].filter(Boolean);
  if (tags.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {tags.map((t) => (
        <Chip key={t.label} color={t.color} bg={t.bg}>
          🏷️ {t.label}
        </Chip>
      ))}
    </div>
  );
}

// ─── DeptDetailSheet — read-only per-department detail ─────────────────────
function DeptDetailSheet({ vehicle, dept, users, onClose, onAddWork }) {
  const ws = vehicle.work_stages?.[0];
  const dm = DEPT_META[dept];
  const status = ws?.[`${dept}_status`] || "not_started";
  const [sc, sbg] = statusColor(status);
  const teamId = ws?.[`${dept}_team_id`];
  const teamName = users.find((u) => u.team_id === teamId)?.full_name;
  const lockedBy = ws?.[`${dept}_locked_by`];
  const workerName = users.find((u) => u.id === lockedBy)?.full_name;

  const threeM = vehicle.three_m_details?.[0];
  const alignment = vehicle.alignment_details?.[0];
  const washing = vehicle.washing_details?.[0];

  let items = [];
  if (dept === "three_m") {
    const assigned = threeM?.work_types || [];
    const completed = threeM?.completed_types || [];
    items = assigned.map((t) => ({
      label: THREE_M_LABELS[t] || t.replace(/_/g, " "),
      done: completed.includes(t),
    }));
  } else if (dept === "alignment_balancing") {
    const wts = alignment?.work_types || [];
    items = wts.map((wt) => ({
      label: ALIGNMENT_LABELS[wt.type] || wt.type.replace(/_/g, " "),
      detail: Array.isArray(wt.tyres)
        ? wt.tyres.map((p) => TYRE_POS[p] || p).join(", ")
        : wt.company
          ? `Brand: ${wt.company}`
          : null,
    }));
  } else if (dept === "washing") {
    const types = washing?.washing_types || [];
    items = types.map((t) => ({ label: WASHING_LABELS[t] || t.replace(/_/g, " "), done: status === "completed" }));
  }

  const eligible = status === "completed";

  return (
    <SidePanel open onClose={onClose} title={`${dm.icon} ${dm.label}`} subtitle={vehicle.vehicle_number} width={480}>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <Chip color={sc} bg={sbg} style={{ fontSize: 12, padding: "4px 10px" }}>
          {status.replace(/_/g, " ")}
        </Chip>
        {teamName && (
          <span style={{ fontSize: 12, color: C.textSec }}>
            Team: <strong>{teamName}</strong>
          </span>
        )}
        {workerName && (
          <span style={{ fontSize: 12, color: C.textSec }}>
            Locked by: <strong>{workerName}</strong>
          </span>
        )}
      </div>

      {dept === "washing" && (washing?.slot || washing?.slot_date) && (
        <SectionBox icon="🕐" label="Slot">
          <div style={{ fontSize: 13, color: C.text }}>
            {washing?.slot_date} {washing?.slot ? `· ${washing.slot}` : ""}
          </div>
        </SectionBox>
      )}

      {items.length > 0 ? (
        <SectionBox icon="📋" label="Work Items">
          <div style={{ display: "grid", gap: 8 }}>
            {items.map((it, i) => (
              <div key={i} style={{ padding: "8px 10px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{it.label}</span>
                  {it.done !== undefined && <span>{it.done ? "✅" : "⏳"}</span>}
                </div>
                {it.detail && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{it.detail}</div>}
              </div>
            ))}
          </div>
        </SectionBox>
      ) : (
        (dept === "mechanic" || dept === "painter" || dept === "denter" || dept === "electrician") && (
          <div style={{ fontSize: 12, color: C.textMuted, fontStyle: "italic", marginBottom: 16 }}>
            No itemized work log for this department — status only.
          </div>
        )
      )}

      {eligible && onAddWork && (
        <Btn v="secondary" onClick={() => onAddWork(dept)} style={{ width: "100%", justifyContent: "center" }}>
          + Add More Work
        </Btn>
      )}
    </SidePanel>
  );
}

// ─── Shared: load dept-role teams with live workload counts ────────────────
// Dedups what mobile's AssignWorkModal/EditVehicleModal/ReassignWorkModal each
// separately re-fetch.
async function loadTeamsForDept(deptRole, teams, vehicles) {
  const active = vehicles.filter((v) => v.current_stage === "pending");
  return teams
    .filter((t) => t.role === deptRole)
    .map((t) => {
      const load = active.filter((v) => {
        const ws = v.work_stages?.[0];
        return ws?.[`${deptRole}_team_id`] === t.id && ws[`${deptRole}_status`] !== "completed";
      }).length;
      return { ...t, load };
    });
}

function emptyDeptConfig() {
  return {
    enabled: false,
    teamId: "",
    workTypes: [],
    customWork: "",
    tyrePositions: {},
    tyreCompany: "",
    washingDate: todayIST(),
    washingSlot: "",
    complaint: "",
    notes: "",
  };
}

// ─── DepartmentConfigModal — per-department sub-form ───────────────────────
function DepartmentConfigModal({ dept, config, onChange, teams, washingSlots, occupancy, onClose, onSave }) {
  const dm = DEPT_META[dept];
  const cfg = config || emptyDeptConfig(dept);
  const set = (patch) => onChange({ ...cfg, ...patch });

  const workTypeOptions =
    dept === "three_m" ? THREE_M_LABELS : dept === "alignment_balancing" ? ALIGNMENT_LABELS : dept === "washing" ? WASHING_LABELS : null;

  const toggleWorkType = (key) => {
    const has = cfg.workTypes.includes(key);
    set({ workTypes: has ? cfg.workTypes.filter((k) => k !== key) : [...cfg.workTypes, key] });
  };

  const isTyreType = (k) => ["new_tyre_fitting", "old_tyre_fitting", "tyre_puncture", "tyre_rotation", "tyre_side_change", "wheel_rim_fitting", "rim_straightening", "nitrogen", "tyre_swap"].includes(k);

  return (
    <Dlg open onClose={onClose} title={`${dm.icon} ${dm.label} — Configure`} width={520}>
      <div style={{ marginBottom: 14 }}>
        <FieldLabel required>Assign Team</FieldLabel>
        <SelectInput value={cfg.teamId} onChange={(e) => set({ teamId: e.target.value })}>
          <option value="">Select team...</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.load} active)
            </option>
          ))}
        </SelectInput>
      </div>

      {dept === "washing" && (
        <div style={{ marginBottom: 14 }}>
          <WashingSlotPicker
            slots={washingSlots}
            date={cfg.washingDate}
            onDateChange={(v) => set({ washingDate: v })}
            slot={cfg.washingSlot}
            onSlotChange={(v) => set({ washingSlot: v })}
            occupancy={occupancy}
          />
        </div>
      )}

      {workTypeOptions ? (
        <div style={{ marginBottom: 14 }}>
          <FieldLabel>Work Types</FieldLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {Object.entries(workTypeOptions).map(([k, label]) => (
              <div
                key={k}
                onClick={() => toggleWorkType(k)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 7,
                  border: `1.5px solid ${cfg.workTypes.includes(k) ? C.sky : C.border}`,
                  background: cfg.workTypes.includes(k) ? C.skyLight : C.surface,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                <span>{cfg.workTypes.includes(k) ? "☑️" : "☐"}</span>
                <span style={{ color: C.text }}>{label}</span>
              </div>
            ))}
          </div>
          {dept === "alignment_balancing" && cfg.workTypes.some(isTyreType) && (
            <div style={{ marginTop: 10 }}>
              <FieldLabel>Tyre Positions</FieldLabel>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {Object.entries(TYRE_POS).map(([k, label]) => (
                  <div
                    key={k}
                    onClick={() => set({ tyrePositions: { ...cfg.tyrePositions, [k]: !cfg.tyrePositions[k] } })}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: `1.5px solid ${cfg.tyrePositions[k] ? C.sky : C.border}`,
                      background: cfg.tyrePositions[k] ? C.skyLight : C.surface,
                      cursor: "pointer",
                      fontSize: 11,
                    }}
                  >
                    {k} · {label}
                  </div>
                ))}
              </div>
              <StyledInput
                value={cfg.tyreCompany}
                onChange={(e) => set({ tyreCompany: e.target.value })}
                placeholder="Tyre brand / company (optional)"
              />
            </div>
          )}
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <FieldLabel>Work Description</FieldLabel>
          <StyledInput as="textarea" rows={3} value={cfg.customWork} onChange={(e) => set({ customWork: e.target.value })} placeholder="Describe the work to be done..." />
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <FieldLabel>Complaint / Notes for this department (optional)</FieldLabel>
        <StyledInput as="textarea" rows={2} value={cfg.complaint} onChange={(e) => set({ complaint: e.target.value })} />
      </div>

      <Btn
        v="primary"
        onClick={() => onSave({ ...cfg, enabled: true })}
        disabled={!cfg.teamId || (dept === "washing" && !cfg.washingSlot)}
        style={{ width: "100%", justifyContent: "center" }}
      >
        Save {dm.label} Config
      </Btn>
    </Dlg>
  );
}

// ─── AssignWorkModal — 4-step wizard ────────────────────────────────────────
function AssignWorkModal({ vehicle, user, teams, vehicles, washingSlots, vehicleModels, onClose, onSuccess }) {
  const modelOptions = vehicleModels || DEFAULT_VEHICLE_MODELS;
  const [step, setStep] = useState(1);
  const [f, setF] = useState({
    vehicle_number: vehicle.vehicle_number || "",
    model: vehicle.model || "",
    customer_name: vehicle.customer_name || "",
    customer_phone: vehicle.customer_phone || "",
    odometer_reading: vehicle.odometer_reading || "",
    priority: vehicle.priority || "normal",
    is_offline_jobcard: vehicle.is_offline_jobcard || false,
    offline_jobcard_date: vehicle.offline_jobcard_open_date || todayIST(),
    expected_date: vehicle.expected_completion_time ? vehicle.expected_completion_time.slice(0, 10) : todayIST(),
    expected_time: vehicle.expected_completion_time ? vehicle.expected_completion_time.slice(11, 16) : "18:00",
    service_type: vehicle.service_type || "",
  });
  const [complaints, setComplaints] = useState(
    (vehicle.customer_complaints || []).map((c) => ({ text: c.description || c.complaint_text || "", priority: c.priority || "normal" })),
  );
  const [deptConfigs, setDeptConfigs] = useState({});
  const [activeDeptModal, setActiveDeptModal] = useState(null);
  const [deptTeams, setDeptTeams] = useState({});
  const [washOccupancy, setWashOccupancy] = useState({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [templateApplied, setTemplateApplied] = useState(null);
  const hasMountedRef = useRef(false);

  const upd = (k, v) => setF((p) => ({ ...p, [k]: v }));

  // Service-template auto-fill — mirrors mobile advisor.js: picking a service type with a
  // matching active service_templates row pre-fills department configs. Advisor can still
  // edit/override in Step 4. Skips the initial mount so it never clobbers anything on open.
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (!f.service_type) return;
    (async () => {
      const { data: rows } = await supabase
        .from("service_templates")
        .select("*")
        .eq("service_type", f.service_type)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(1);
      const tmpl = rows?.[0];
      if (tmpl?.departments?.length > 0) {
        const newConfigs = {};
        for (const d of tmpl.departments) {
          newConfigs[d.key] = {
            enabled: true,
            teamId: "",
            workTypes: d.key === "washing" ? d.washingTypes || [] : d.workItems || [],
            customWork: (d.customWork || []).join("; "),
            tyrePositions: {},
            tyreCompany: "",
            washingDate: d.slotDate || todayIST(),
            washingSlot: d.slot || "",
            complaint: "",
            notes: null,
          };
        }
        setDeptConfigs(newConfigs);
        setTemplateApplied(tmpl.name);
      } else {
        setTemplateApplied(null);
      }
    })();
  }, [f.service_type]);

  useEffect(() => {
    (async () => {
      const map = {};
      for (const d of DEPT_KEYS) {
        map[d] = await loadTeamsForDept(d, teams, vehicles);
      }
      setDeptTeams(map);
      const active = vehicles.filter((v) => v.current_stage === "pending");
      const occ = {};
      active.forEach((v) => {
        const s = v.washing_details?.[0]?.slot;
        const d = v.washing_details?.[0]?.slot_date;
        if (s && d === todayIST()) occ[s] = (occ[s] || 0) + 1;
      });
      setWashOccupancy(occ);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addComplaint = () => setComplaints((p) => [...p, { text: "", priority: "normal" }]);
  const updComplaint = (i, k, v) => setComplaints((p) => p.map((c, idx) => (idx === i ? { ...c, [k]: v } : c)));
  const removeComplaint = (i) => setComplaints((p) => p.filter((_, idx) => idx !== i));

  const toggleDept = (d) => {
    if (deptConfigs[d]?.enabled) {
      setDeptConfigs((p) => {
        const n = { ...p };
        delete n[d];
        return n;
      });
    } else {
      setActiveDeptModal(d);
    }
  };

  const validateStep1 = () => {
    return validateVehicleNumber(f.vehicle_number) || validatePhone(f.customer_phone) || (f.odometer_reading ? validateOdometer(f.odometer_reading) : null);
  };

  const submit = async () => {
    setErr("");
    const enabledDepts = Object.entries(deptConfigs).filter(([, c]) => c?.enabled);
    if (enabledDepts.length === 0) {
      setErr("Assign at least one department before submitting");
      return;
    }
    setLoading(true);
    try {
      const changed = [];
      if (f.vehicle_number !== vehicle.vehicle_number) changed.push(`vehicle_number: "${vehicle.vehicle_number}" → "${f.vehicle_number}"`);
      if (f.model !== vehicle.model) changed.push(`model: "${vehicle.model || "—"}" → "${f.model}"`);
      if (f.customer_name !== vehicle.customer_name) changed.push(`customer_name: "${vehicle.customer_name || "—"}" → "${f.customer_name}"`);
      if (f.customer_phone !== vehicle.customer_phone) changed.push(`customer_phone: "${vehicle.customer_phone || "—"}" → "${f.customer_phone}"`);

      const expectedISO = f.expected_date && f.expected_time ? `${f.expected_date}T${f.expected_time}:00` : null;

      const { error: vErr } = await supabase
        .from("vehicles")
        .update({
          vehicle_number: f.vehicle_number.trim().toUpperCase(),
          model: f.model || null,
          customer_name: f.customer_name || null,
          customer_phone: f.customer_phone || null,
          odometer_reading: f.odometer_reading ? parseInt(f.odometer_reading) : null,
          priority: f.priority,
          is_offline_jobcard: f.is_offline_jobcard,
          offline_jobcard_open_date: f.is_offline_jobcard ? f.offline_jobcard_date : null,
          offline_jobcard_opened: f.is_offline_jobcard ? false : null,
          expected_completion_time: expectedISO,
          service_type: f.service_type || null,
          advisor_id: user.id,
          current_stage: "pending",
          current_status: "in_progress",
          updated_at: new Date().toISOString(),
        })
        .eq("id", vehicle.id);
      if (vErr) throw vErr;

      if (changed.length > 0) {
        await logHistory(vehicle.id, user.id, "advisor_review", "vehicle_details_corrected", changed.join("; "));
      }

      const validComplaints = complaints.filter((c) => c.text.trim());
      if (validComplaints.length > 0) {
        await supabase.from("customer_complaints").insert(
          validComplaints.map((c) => ({ vehicle_id: vehicle.id, description: c.text.trim(), priority: c.priority })),
        );
      }

      const wsPayload = { vehicle_id: vehicle.id };
      DEPT_KEYS.forEach((d) => {
        const cfg = deptConfigs[d];
        wsPayload[`${d}_required`] = !!cfg?.enabled;
        wsPayload[`${d}_status`] = cfg?.enabled ? "not_started" : null;
        wsPayload[`${d}_team_id`] = cfg?.enabled ? cfg.teamId : null;
      });
      const { error: wsErr } = await supabase.from("work_stages").upsert([wsPayload], { onConflict: "vehicle_id" });
      if (wsErr) throw wsErr;

      if (deptConfigs.three_m?.enabled) {
        await supabase.from("three_m_details").upsert(
          [{ vehicle_id: vehicle.id, work_types: deptConfigs.three_m.workTypes, completed_types: [], created_by: user.id }],
          { onConflict: "vehicle_id" },
        );
      }
      if (deptConfigs.alignment_balancing?.enabled) {
        const cfg = deptConfigs.alignment_balancing;
        const tyres = Object.entries(cfg.tyrePositions).filter(([, on]) => on).map(([k]) => k);
        const workTypesPayload = cfg.workTypes.map((t) => ({ type: t, tyres, company: cfg.tyreCompany || null }));
        await supabase.from("alignment_details").upsert(
          [{ vehicle_id: vehicle.id, work_types: workTypesPayload, created_by: user.id }],
          { onConflict: "vehicle_id" },
        );
      }
      if (deptConfigs.washing?.enabled) {
        const cfg = deptConfigs.washing;
        await supabase.from("washing_details").upsert(
          [{ vehicle_id: vehicle.id, washing_types: cfg.workTypes, slot: cfg.washingSlot, slot_date: cfg.washingDate }],
          { onConflict: "vehicle_id" },
        );
      }
      for (const d of Object.keys(DEPT_DETAIL_TABLE)) {
        const cfg = deptConfigs[d];
        if (!cfg?.enabled) continue;
        await supabase.from(DEPT_DETAIL_TABLE[d]).upsert(
          [buildDeptDetailPayload(d, vehicle.id, cfg, user.id)],
          { onConflict: "vehicle_id" },
        );
      }

      await logHistory(
        vehicle.id,
        user.id,
        "pending",
        "work_assigned",
        enabledDepts.map(([d]) => DEPT_META[d].label).join(", "),
      );

      onSuccess();
    } catch (e) {
      setErr(e.message || "Failed to assign work");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dlg open onClose={onClose} title="Assign Work" subtitle={vehicle.vehicle_number} width={620}>
        <StepIndicator currentStep={step} totalSteps={4} labels={["Vehicle", "Service", "Complaints", "Assign"]} />

        {step === 1 && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <FieldLabel required>Vehicle Number</FieldLabel>
                <StyledInput value={f.vehicle_number} onChange={(e) => upd("vehicle_number", e.target.value.toUpperCase())} errored={!!validateVehicleNumber(f.vehicle_number)} />
              </div>
              <div>
                <FieldLabel>Model</FieldLabel>
                <SelectInput value={f.model} onChange={(e) => upd("model", e.target.value)}>
                  <option value="">Select...</option>
                  {modelOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </SelectInput>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <FieldLabel>Customer Name</FieldLabel>
                <StyledInput value={f.customer_name} onChange={(e) => upd("customer_name", e.target.value)} />
              </div>
              <div>
                <FieldLabel>Phone</FieldLabel>
                <StyledInput value={f.customer_phone} onChange={(e) => upd("customer_phone", e.target.value)} errored={!!validatePhone(f.customer_phone)} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <FieldLabel>Odometer (km)</FieldLabel>
                <StyledInput type="number" value={f.odometer_reading} onChange={(e) => upd("odometer_reading", e.target.value)} errored={f.odometer_reading && !!validateOdometer(f.odometer_reading)} />
              </div>
              <div>
                <FieldLabel>Priority</FieldLabel>
                <SelectInput value={f.priority} onChange={(e) => upd("priority", e.target.value)}>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                  <option value="vip">VIP</option>
                </SelectInput>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <FieldLabel>Expected Completion Date</FieldLabel>
                <input type="date" value={f.expected_date} min={todayIST()} onChange={(e) => upd("expected_date", e.target.value)} style={inputStyle(false)} />
              </div>
              <div>
                <FieldLabel>Expected Time (cap 7 PM)</FieldLabel>
                <input type="time" value={f.expected_time} max="19:00" onChange={(e) => upd("expected_time", e.target.value)} style={inputStyle(false)} />
              </div>
            </div>
            <div
              onClick={() => upd("is_offline_jobcard", !f.is_offline_jobcard)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 8,
                border: `1.5px solid ${f.is_offline_jobcard ? C.sky : C.border}`,
                background: f.is_offline_jobcard ? C.skyLight : C.surface,
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 13, color: C.text }}>📄 This vehicle has an offline (paper) job card</span>
            </div>
            {f.is_offline_jobcard && (
              <div style={{ marginTop: 10 }}>
                <FieldLabel required>Job Card Opened Date</FieldLabel>
                <input
                  type="date"
                  value={f.offline_jobcard_date}
                  onChange={(e) => upd("offline_jobcard_date", e.target.value)}
                  style={inputStyle(false)}
                />
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <FieldLabel required>Service Type</FieldLabel>
            {templateApplied && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: C.raised,
                  border: `1px solid ${C.navy}`,
                  marginBottom: 10,
                  fontSize: 12,
                  color: C.navy,
                }}
              >
                ✨ Template applied: <strong>{templateApplied}</strong> — departments pre-filled, edit in Step 4 if needed
              </div>
            )}
            <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
              {Object.entries(DEFAULT_SERVICE_TYPES).map(([k, label]) => (
                <div
                  key={k}
                  onClick={() => upd("service_type", k)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: `1.5px solid ${f.service_type === k ? C.navy : C.border}`,
                    background: f.service_type === k ? C.raised : C.surface,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${f.service_type === k ? C.navy : C.textMuted}`, background: f.service_type === k ? C.navy : "transparent" }} />
                  <span style={{ fontSize: 13, color: C.text }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <FieldLabel>Customer Complaints</FieldLabel>
            <div style={{ display: "grid", gap: 10, marginBottom: 10 }}>
              {complaints.map((c, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <StyledInput as="textarea" rows={2} value={c.text} onChange={(e) => updComplaint(i, "text", e.target.value)} placeholder="Describe the complaint..." style={{ flex: 1 }} />
                  <SelectInput value={c.priority} onChange={(e) => updComplaint(i, "priority", e.target.value)} style={{ width: 110 }}>
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                  </SelectInput>
                  <Btn v="danger" sz="sm" onClick={() => removeComplaint(i)}>
                    ✕
                  </Btn>
                </div>
              ))}
            </div>
            <Btn v="secondary" onClick={addComplaint}>
              + Add Complaint
            </Btn>
          </div>
        )}

        {step === 4 && (
          <div>
            <FieldLabel required>Assign Departments</FieldLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              {DEPT_KEYS.map((d) => {
                const dm = DEPT_META[d];
                const cfg = deptConfigs[d];
                return (
                  <div
                    key={d}
                    onClick={() => toggleDept(d)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: `1.5px solid ${cfg?.enabled ? dm.color : C.border}`,
                      background: cfg?.enabled ? dm.color + "15" : C.surface,
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ fontSize: 13, color: C.text }}>
                      {dm.icon} {dm.label}
                    </span>
                    {cfg?.enabled ? <span style={{ color: dm.color, fontSize: 14 }}>✓</span> : <span style={{ color: C.textMuted, fontSize: 11 }}>+ configure</span>}
                  </div>
                );
              })}
            </div>
            {err && (
              <div style={{ background: C.redLight, color: C.red, padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{err}</div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          {step > 1 && (
            <Btn v="secondary" onClick={() => setStep(step - 1)} style={{ flex: 1, justifyContent: "center" }}>
              ← Back
            </Btn>
          )}
          {step < 4 ? (
            <Btn
              v="primary"
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !!validateStep1()}
              style={{ flex: 2, justifyContent: "center" }}
            >
              Next →
            </Btn>
          ) : (
            <Btn v="success" onClick={submit} disabled={loading} style={{ flex: 2, justifyContent: "center" }}>
              {loading ? "Submitting..." : "✓ Submit & Assign"}
            </Btn>
          )}
        </div>
      </Dlg>

      {activeDeptModal && (
        <DepartmentConfigModal
          dept={activeDeptModal}
          config={deptConfigs[activeDeptModal]}
          onChange={(cfg) => setDeptConfigs((p) => ({ ...p, [activeDeptModal]: cfg }))}
          teams={deptTeams[activeDeptModal] || []}
          washingSlots={washingSlots}
          occupancy={washOccupancy}
          onClose={() => setActiveDeptModal(null)}
          onSave={(cfg) => {
            setDeptConfigs((p) => ({ ...p, [activeDeptModal]: cfg }));
            setActiveDeptModal(null);
          }}
        />
      )}
    </>
  );
}

// ─── Fallback billing/payment computation shared by PDIModal / ForcePDIModal /
// the in-app Force Complete path — mirrors mobile's auto-fallback logic. ───
function computeCompletionFallback(vehicle) {
  const hasBill = vehicle.bill_amount && parseFloat(vehicle.bill_amount) > 0;
  const alreadyPaid = vehicle.payment_status === "paid" || vehicle.payment_status === "credit";
  return {
    nextStage: hasBill ? (alreadyPaid ? "ready_for_exit" : "payment") : "billing",
    paymentStatusFallback: alreadyPaid ? vehicle.payment_status : "pending",
  };
}

// ─── PDIModal ────────────────────────────────────────────────────────────────
function PDIModal({ vehicle, users, user, onClose, onSuccess }) {
  const ws = vehicle.work_stages?.[0];
  const complaints = vehicle.customer_complaints || [];
  const unresolvedComplaints = complaints.filter((c) => !c.resolved_note);
  const [resolutionNotes, setResolutionNotes] = useState({});
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const activeDepts = DEPT_KEYS.filter((d) => ws?.[`${d}_required`]);

  const submit = async () => {
    setErr("");
    const missing = unresolvedComplaints.filter((c) => !resolutionNotes[c.id]?.trim());
    if (missing.length > 0) {
      setErr("Add a resolution note for every unresolved complaint before proceeding");
      return;
    }
    setLoading(true);
    try {
      for (const c of unresolvedComplaints) {
        await supabase.from("customer_complaints").update({ resolved_note: resolutionNotes[c.id] }).eq("id", c.id);
      }
      const { nextStage } = computeCompletionFallback(vehicle);
      const { error } = await supabase
        .from("vehicles")
        .update({
          current_stage: nextStage,
          current_status: "pending",
          pdi_completed_at: new Date().toISOString(),
          pdi_completed_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", vehicle.id);
      if (error) throw error;
      await logHistory(vehicle.id, user.id, "pdi", "pdi_completed", remarks || "PDI completed", remarks || null);
      onSuccess();
    } catch (e) {
      setErr(e.message || "Failed to complete PDI");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dlg open onClose={onClose} title="🔍 Pre-Delivery Inspection" subtitle={vehicle.vehicle_number} width={560}>
      <SectionBox icon="📋" label="Department Summary">
        <div style={{ display: "grid", gap: 6 }}>
          {activeDepts.length === 0 ? (
            <span style={{ fontSize: 12, color: C.textMuted, fontStyle: "italic" }}>No departments were assigned</span>
          ) : (
            activeDepts.map((d) => {
              const st = ws?.[`${d}_status`] || "not_started";
              const [sc, sbg] = statusColor(st);
              const teamName = users.find((u) => u.team_id === ws?.[`${d}_team_id`])?.full_name;
              return (
                <div key={d} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: C.text }}>
                    {DEPT_META[d].icon} {DEPT_META[d].label} {teamName ? `— ${teamName}` : ""}
                  </span>
                  <Chip color={sc} bg={sbg}>
                    {st.replace(/_/g, " ")}
                  </Chip>
                </div>
              );
            })
          )}
        </div>
      </SectionBox>

      {complaints.length > 0 && (
        <SectionBox icon="📢" label="Complaints — Resolution Required">
          <div style={{ display: "grid", gap: 10 }}>
            {complaints.map((c) => (
              <div key={c.id} style={{ padding: "10px 12px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                <div style={{ fontSize: 13, color: C.text, marginBottom: 6 }}>{c.description}</div>
                {c.resolved_note ? (
                  <div style={{ fontSize: 12, color: C.green }}>✓ Resolved: {c.resolved_note}</div>
                ) : (
                  <StyledInput
                    as="textarea"
                    rows={2}
                    placeholder="Resolution note (required)..."
                    value={resolutionNotes[c.id] || ""}
                    onChange={(e) => setResolutionNotes((p) => ({ ...p, [c.id]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
        </SectionBox>
      )}

      <div style={{ marginBottom: 16 }}>
        <FieldLabel>PDI Remarks (optional)</FieldLabel>
        <StyledInput as="textarea" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      </div>

      {err && (
        <div style={{ background: C.redLight, color: C.red, padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{err}</div>
      )}

      <Btn v="success" onClick={submit} disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
        {loading ? "Saving..." : "✓ Complete PDI"}
      </Btn>
    </Dlg>
  );
}

// ─── WashingEditModal — standalone editor for washing types + slot ─────────
function WashingEditModal({ vehicle, washingSlots, occupancy, user, onClose, onSuccess }) {
  const existing = vehicle.washing_details?.[0];
  const [types, setTypes] = useState(existing?.washing_types || []);
  const [date, setDate] = useState(existing?.slot_date || todayIST());
  const [slot, setSlot] = useState(existing?.slot || "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const toggle = (k) => setTypes((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  const save = async () => {
    setErr("");
    if (!slot) return setErr("Select a time slot");
    setLoading(true);
    try {
      await supabase.from("washing_details").upsert(
        [{ vehicle_id: vehicle.id, washing_types: types, slot, slot_date: date }],
        { onConflict: "vehicle_id" },
      );
      await supabase.from("work_stages").upsert(
        [{ vehicle_id: vehicle.id, washing_required: true, washing_status: existing ? undefined : "not_started" }],
        { onConflict: "vehicle_id" },
      );
      await logHistory(vehicle.id, user.id, "washing", "washing_slot_updated", `${date} · ${slot}`);
      onSuccess();
    } catch (e) {
      setErr(e.message || "Failed to save washing details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dlg open onClose={onClose} title="💧 Edit Washing" subtitle={vehicle.vehicle_number} width={460}>
      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Washing Types</FieldLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {Object.entries(WASHING_LABELS).map(([k, label]) => (
            <div
              key={k}
              onClick={() => toggle(k)}
              style={{
                padding: "8px 10px",
                borderRadius: 7,
                border: `1.5px solid ${types.includes(k) ? C.sky : C.border}`,
                background: types.includes(k) ? C.skyLight : C.surface,
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              {types.includes(k) ? "☑️" : "☐"} {label}
            </div>
          ))}
        </div>
      </div>
      <WashingSlotPicker slots={washingSlots} date={date} onDateChange={setDate} slot={slot} onSlotChange={setSlot} occupancy={occupancy} />
      {err && (
        <div style={{ background: C.redLight, color: C.red, padding: "8px 12px", borderRadius: 8, margin: "12px 0", fontSize: 13 }}>{err}</div>
      )}
      <Btn v="primary" onClick={save} disabled={loading} style={{ width: "100%", justifyContent: "center", marginTop: 16 }}>
        {loading ? "Saving..." : "Save Washing Details"}
      </Btn>
    </Dlg>
  );
}

// ─── DeletionReasonModal — soft delete ──────────────────────────────────────
function DeletionReasonModal({ vehicle, deletionReasons, user, onClose, onSuccess }) {
  const [reason, setReason] = useState(deletionReasons[0]?.key || "");
  const [other, setOther] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    const finalReason = reason === "__other__" ? other.trim() : reason;
    if (!finalReason) return setErr("Select or enter a reason");
    setLoading(true);
    setErr("");
    try {
      await supabase
        .from("vehicles")
        .update({ deleted_at: new Date().toISOString(), deleted_by: user.id, deletion_reason: finalReason })
        .eq("id", vehicle.id);
      await logHistory(vehicle.id, user.id, vehicle.current_stage, "vehicle_deleted", finalReason);
      onSuccess();
    } catch (e) {
      setErr(e.message || "Failed to delete vehicle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dlg open onClose={onClose} title="Delete Vehicle Record" subtitle={vehicle.vehicle_number} width={420}>
      <div style={{ background: C.blueLight, border: `1px solid ${C.blue}33`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: C.blue }}>
        ℹ️ This is a soft delete — the record and its full history are preserved, just hidden from active views.
      </div>
      <div style={{ marginBottom: 14 }}>
        <FieldLabel required>Reason</FieldLabel>
        <SelectInput value={reason} onChange={(e) => setReason(e.target.value)}>
          {deletionReasons.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
          <option value="__other__">Other...</option>
        </SelectInput>
        {reason === "__other__" && (
          <StyledInput value={other} onChange={(e) => setOther(e.target.value)} placeholder="Specify reason..." style={{ marginTop: 8 }} />
        )}
      </div>
      {err && (
        <div style={{ background: C.redLight, color: C.red, padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{err}</div>
      )}
      <Btn v="danger" onClick={save} disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
        {loading ? "Deleting..." : "Delete Vehicle Record"}
      </Btn>
    </Dlg>
  );
}

// ─── ForcePDIModal — per-department force-complete/cancel when a worker never
// responded; jumps the vehicle straight to completed. ──────────────────────
function ForcePDIModal({ vehicle, users, user, onClose, onSuccess }) {
  const ws = vehicle.work_stages?.[0];
  const activeDepts = DEPT_KEYS.filter((d) => ws?.[`${d}_required`] && ws[`${d}_status`] !== "completed");
  const [decisions, setDecisions] = useState(
    Object.fromEntries(activeDepts.map((d) => [d, "force_complete"])),
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    setLoading(true);
    setErr("");
    try {
      const wsPatch = { vehicle_id: vehicle.id };
      const logLines = [];
      activeDepts.forEach((d) => {
        const decision = decisions[d];
        const teamName = users.find((u) => u.team_id === ws?.[`${d}_team_id`])?.full_name;
        if (decision === "force_complete") {
          wsPatch[`${d}_status`] = "completed";
          wsPatch[`${d}_forced_by`] = user.id;
          logLines.push(`${DEPT_META[d].label} force-completed (assigned team${teamName ? ": " + teamName : ""} did not update status)`);
        } else {
          wsPatch[`${d}_required`] = false;
          wsPatch[`${d}_status`] = null;
          logLines.push(`${DEPT_META[d].label} cancelled by advisor`);
        }
      });
      const { error: wsErr } = await supabase.from("work_stages").upsert([wsPatch], { onConflict: "vehicle_id" });
      if (wsErr) throw wsErr;

      const { paymentStatusFallback } = computeCompletionFallback(vehicle);
      const { error: vErr } = await supabase
        .from("vehicles")
        .update({
          current_stage: "completed",
          current_status: "completed",
          payment_status: vehicle.payment_status || paymentStatusFallback,
          updated_at: new Date().toISOString(),
        })
        .eq("id", vehicle.id);
      if (vErr) throw vErr;

      await logHistory(vehicle.id, user.id, "pdi", "force_completed", logLines.join("; "));
      if (vehicle.customer_phone) {
        await sendWA(vehicle.customer_phone, "service_completed", [
          vehicle.customer_name || "Customer",
          vehicle.model || "your vehicle",
          vehicle.vehicle_number,
        ]);
      }
      onSuccess();
    } catch (e) {
      setErr(e.message || "Failed to force-complete");
    } finally {
      setLoading(false);
    }
  };

  if (activeDepts.length === 0) {
    return (
      <Dlg open onClose={onClose} title="Force Complete" width={420}>
        <Empty icon="✅" text="All departments already completed" />
        <Btn v="secondary" onClick={onClose} style={{ width: "100%", justifyContent: "center", marginTop: 12 }}>
          Close
        </Btn>
      </Dlg>
    );
  }

  return (
    <Dlg open onClose={onClose} title="⚠️ Force Complete Departments" subtitle={vehicle.vehicle_number} width={480}>
      <div style={{ background: C.amberLight, border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: C.amberDark }}>
        Use when a worker/team never updated their status. This jumps the vehicle straight to Completed and is logged per department.
      </div>
      <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
        {activeDepts.map((d) => (
          <div key={d} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 }}>
              {DEPT_META[d].icon} {DEPT_META[d].label}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn
                v={decisions[d] === "force_complete" ? "success" : "secondary"}
                sz="sm"
                onClick={() => setDecisions((p) => ({ ...p, [d]: "force_complete" }))}
              >
                ✓ Force Complete
              </Btn>
              <Btn
                v={decisions[d] === "cancel" ? "danger" : "secondary"}
                sz="sm"
                onClick={() => setDecisions((p) => ({ ...p, [d]: "cancel" }))}
              >
                ✕ Cancel Dept
              </Btn>
            </div>
          </div>
        ))}
      </div>
      {err && (
        <div style={{ background: C.redLight, color: C.red, padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{err}</div>
      )}
      <Btn v="danger" onClick={save} disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
        {loading ? "Processing..." : "Confirm & Complete Vehicle"}
      </Btn>
    </Dlg>
  );
}

// ─── ReassignWorkModal — "Send Back to Workshop" from PDI ──────────────────
function ReassignWorkModal({ vehicle, teams, vehicles, washingSlots, user, onClose, onSuccess }) {
  const ws = vehicle.work_stages?.[0];
  const currentDepts = DEPT_KEYS.filter((d) => ws?.[`${d}_required`]);
  const [redoDepts, setRedoDepts] = useState([]);
  const [addDeptConfigs, setAddDeptConfigs] = useState({});
  const [activeDeptModal, setActiveDeptModal] = useState(null);
  const [deptTeams, setDeptTeams] = useState({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const map = {};
      for (const d of DEPT_KEYS) {
        map[d] = await loadTeamsForDept(d, teams, vehicles);
      }
      setDeptTeams(map);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleRedo = (d) => setRedoDepts((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]));
  const toggleAdd = (d) => {
    if (addDeptConfigs[d]?.enabled) {
      setAddDeptConfigs((p) => {
        const n = { ...p };
        delete n[d];
        return n;
      });
    } else {
      setActiveDeptModal(d);
    }
  };
  const newDepts = DEPT_KEYS.filter((d) => !currentDepts.includes(d));

  const save = async () => {
    if (redoDepts.length === 0 && Object.keys(addDeptConfigs).length === 0) {
      setErr("Select at least one department to redo or add");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const wsPatch = { vehicle_id: vehicle.id };
      redoDepts.forEach((d) => {
        wsPatch[`${d}_status`] = "not_started";
      });
      Object.entries(addDeptConfigs).forEach(([d, cfg]) => {
        wsPatch[`${d}_required`] = true;
        wsPatch[`${d}_status`] = "not_started";
        wsPatch[`${d}_team_id`] = cfg.teamId;
      });
      await supabase.from("work_stages").upsert([wsPatch], { onConflict: "vehicle_id" });

      for (const [d, cfg] of Object.entries(addDeptConfigs)) {
        if (d === "three_m") {
          await supabase.from("three_m_details").upsert(
            [{ vehicle_id: vehicle.id, work_types: cfg.workTypes, completed_types: [], created_by: user.id }],
            { onConflict: "vehicle_id" },
          );
        } else if (d === "alignment_balancing") {
          const tyres = Object.entries(cfg.tyrePositions).filter(([, on]) => on).map(([k]) => k);
          await supabase.from("alignment_details").upsert(
            [{ vehicle_id: vehicle.id, work_types: cfg.workTypes.map((t) => ({ type: t, tyres, company: cfg.tyreCompany || null })), created_by: user.id }],
            { onConflict: "vehicle_id" },
          );
        } else if (d === "washing") {
          await supabase.from("washing_details").upsert(
            [{ vehicle_id: vehicle.id, washing_types: cfg.workTypes, slot: cfg.washingSlot, slot_date: cfg.washingDate }],
            { onConflict: "vehicle_id" },
          );
        } else if (DEPT_DETAIL_TABLE[d]) {
          await supabase.from(DEPT_DETAIL_TABLE[d]).upsert(
            [buildDeptDetailPayload(d, vehicle.id, cfg, user.id)],
            { onConflict: "vehicle_id" },
          );
        }
      }

      const { error: vErr } = await supabase
        .from("vehicles")
        .update({ current_stage: "pending", current_status: "in_progress", updated_at: new Date().toISOString() })
        .eq("id", vehicle.id);
      if (vErr) throw vErr;

      const summary = [
        ...redoDepts.map((d) => `${DEPT_META[d].label} sent back for redo`),
        ...Object.keys(addDeptConfigs).map((d) => `${DEPT_META[d].label} newly added`),
      ].join("; ");
      await logHistory(vehicle.id, user.id, "pdi", "sent_back_to_workshop", summary);
      onSuccess();
    } catch (e) {
      setErr(e.message || "Failed to send back to workshop");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dlg open onClose={onClose} title="🔄 Send Back to Workshop" subtitle={vehicle.vehicle_number} width={500}>
        {currentDepts.length > 0 && (
          <SectionBox icon="🔁" label="Mark for Redo">
            <div style={{ display: "grid", gap: 6 }}>
              {currentDepts.map((d) => (
                <div
                  key={d}
                  onClick={() => toggleRedo(d)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    borderRadius: 7,
                    border: `1.5px solid ${redoDepts.includes(d) ? C.amber : C.border}`,
                    background: redoDepts.includes(d) ? C.amberLight : C.surface,
                    cursor: "pointer",
                  }}
                >
                  <span>{redoDepts.includes(d) ? "☑️" : "☐"}</span>
                  <span style={{ fontSize: 13 }}>
                    {DEPT_META[d].icon} {DEPT_META[d].label}
                  </span>
                </div>
              ))}
            </div>
          </SectionBox>
        )}
        {newDepts.length > 0 && (
          <SectionBox icon="➕" label="Add New Department">
            <div style={{ display: "grid", gap: 6 }}>
              {newDepts.map((d) => (
                <div
                  key={d}
                  onClick={() => toggleAdd(d)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 10px",
                    borderRadius: 7,
                    border: `1.5px solid ${addDeptConfigs[d]?.enabled ? C.sky : C.border}`,
                    background: addDeptConfigs[d]?.enabled ? C.skyLight : C.surface,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: 13 }}>
                    {DEPT_META[d].icon} {DEPT_META[d].label}
                  </span>
                  {addDeptConfigs[d]?.enabled ? <span>✓</span> : <span style={{ fontSize: 11, color: C.textMuted }}>+ configure</span>}
                </div>
              ))}
            </div>
          </SectionBox>
        )}
        {err && (
          <div style={{ background: C.redLight, color: C.red, padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{err}</div>
        )}
        <Btn v="primary" onClick={save} disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
          {loading ? "Saving..." : "Send Back to Workshop"}
        </Btn>
      </Dlg>
      {activeDeptModal && (
        <DepartmentConfigModal
          dept={activeDeptModal}
          config={addDeptConfigs[activeDeptModal]}
          onChange={(cfg) => setAddDeptConfigs((p) => ({ ...p, [activeDeptModal]: cfg }))}
          teams={deptTeams[activeDeptModal] || []}
          washingSlots={washingSlots}
          occupancy={{}}
          onClose={() => setActiveDeptModal(null)}
          onSave={(cfg) => {
            setAddDeptConfigs((p) => ({ ...p, [activeDeptModal]: cfg }));
            setActiveDeptModal(null);
          }}
        />
      )}
    </>
  );
}

// ─── EditVehicleModal — full re-edit + advisor reassignment ────────────────
const EDIT_ALLOWED_STAGES = ["advisor_review", "pending", "pdi"];
function EditVehicleModal({ vehicle, users, teams, vehicles, washingSlots, vehicleModels, user, onClose, onSuccess }) {
  const modelOptions = vehicleModels || DEFAULT_VEHICLE_MODELS;
  const editable = EDIT_ALLOWED_STAGES.includes(vehicle.current_stage);
  const advisors = users.filter((u) => u.role === "advisor" && u.is_active);
  const ws = vehicle.work_stages?.[0];

  const [f, setF] = useState({
    vehicle_number: vehicle.vehicle_number || "",
    model: vehicle.model || "",
    customer_name: vehicle.customer_name || "",
    customer_phone: vehicle.customer_phone || "",
    odometer_reading: vehicle.odometer_reading || "",
    priority: vehicle.priority || "normal",
    service_type: vehicle.service_type || "",
    advisor_id: vehicle.advisor_id || user.id,
    is_offline_jobcard: vehicle.is_offline_jobcard || false,
    offline_jobcard_date: vehicle.offline_jobcard_open_date || todayIST(),
  });
  const [deptConfigs, setDeptConfigs] = useState(() => {
    const init = {};
    DEPT_KEYS.forEach((d) => {
      if (ws?.[`${d}_required`]) {
        init[d] = {
          enabled: true,
          teamId: ws[`${d}_team_id`] || "",
          workTypes:
            d === "three_m" ? vehicle.three_m_details?.[0]?.work_types || []
            : d === "alignment_balancing" ? (vehicle.alignment_details?.[0]?.work_types || []).map((w) => w.type)
            : d === "washing" ? vehicle.washing_details?.[0]?.washing_types || []
            : [],
          tyrePositions: {},
          tyreCompany: "",
          washingDate: vehicle.washing_details?.[0]?.slot_date || todayIST(),
          washingSlot: vehicle.washing_details?.[0]?.slot || "",
          customWork: "",
          complaint: "",
          notes: "",
        };
      }
    });
    return init;
  });
  const [activeDeptModal, setActiveDeptModal] = useState(null);
  const [deptTeams, setDeptTeams] = useState({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const upd = (k, v) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    (async () => {
      const map = {};
      for (const d of DEPT_KEYS) map[d] = await loadTeamsForDept(d, teams, vehicles);
      setDeptTeams(map);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleDept = (d) => {
    if (deptConfigs[d]?.enabled) {
      setDeptConfigs((p) => {
        const n = { ...p };
        delete n[d];
        return n;
      });
    } else {
      setActiveDeptModal(d);
    }
  };

  const save = async () => {
    setErr("");
    const vErr1 = validateVehicleNumber(f.vehicle_number);
    const vErr2 = validatePhone(f.customer_phone);
    if (vErr1 || vErr2) return setErr(vErr1 || vErr2);
    setLoading(true);
    try {
      const changed = [];
      Object.entries(f).forEach(([k, v]) => {
        if ((vehicle[k] || "") !== (v || "")) changed.push(`${k}: "${vehicle[k] || "—"}" → "${v || "—"}"`);
      });

      const { error: vE } = await supabase
        .from("vehicles")
        .update({
          vehicle_number: f.vehicle_number.trim().toUpperCase(),
          model: f.model || null,
          customer_name: f.customer_name || null,
          customer_phone: f.customer_phone || null,
          odometer_reading: f.odometer_reading ? parseInt(f.odometer_reading) : null,
          priority: f.priority,
          service_type: f.service_type || null,
          advisor_id: f.advisor_id,
          is_offline_jobcard: f.is_offline_jobcard,
          offline_jobcard_open_date: f.is_offline_jobcard ? f.offline_jobcard_date : null,
          offline_jobcard_opened: f.is_offline_jobcard ? (vehicle.is_offline_jobcard ? vehicle.offline_jobcard_opened : false) : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", vehicle.id);
      if (vE) {
        if (vE.code === "23505") throw new Error("Vehicle number conflict — another active record already uses this number");
        throw vE;
      }

      const wsPayload = { vehicle_id: vehicle.id };
      DEPT_KEYS.forEach((d) => {
        const cfg = deptConfigs[d];
        wsPayload[`${d}_required`] = !!cfg?.enabled;
        if (cfg?.enabled) {
          wsPayload[`${d}_team_id`] = cfg.teamId;
          if (!ws?.[`${d}_required`]) wsPayload[`${d}_status`] = "not_started";
        } else {
          wsPayload[`${d}_status`] = null;
          wsPayload[`${d}_team_id`] = null;
        }
      });
      await supabase.from("work_stages").upsert([wsPayload], { onConflict: "vehicle_id" });

      if (deptConfigs.three_m?.enabled) {
        await supabase.from("three_m_details").upsert(
          [{ vehicle_id: vehicle.id, work_types: deptConfigs.three_m.workTypes, completed_types: vehicle.three_m_details?.[0]?.completed_types || [], created_by: user.id }],
          { onConflict: "vehicle_id" },
        );
      }
      if (deptConfigs.alignment_balancing?.enabled) {
        const cfg = deptConfigs.alignment_balancing;
        const tyres = Object.entries(cfg.tyrePositions).filter(([, on]) => on).map(([k]) => k);
        await supabase.from("alignment_details").upsert(
          [{ vehicle_id: vehicle.id, work_types: cfg.workTypes.map((t) => ({ type: t, tyres, company: cfg.tyreCompany || null })), created_by: user.id }],
          { onConflict: "vehicle_id" },
        );
      }
      if (deptConfigs.washing?.enabled) {
        const cfg = deptConfigs.washing;
        await supabase.from("washing_details").upsert(
          [{ vehicle_id: vehicle.id, washing_types: cfg.workTypes, slot: cfg.washingSlot, slot_date: cfg.washingDate }],
          { onConflict: "vehicle_id" },
        );
      }
      for (const d of Object.keys(DEPT_DETAIL_TABLE)) {
        const cfg = deptConfigs[d];
        if (!cfg?.enabled) continue;
        await supabase.from(DEPT_DETAIL_TABLE[d]).upsert(
          [buildDeptDetailPayload(d, vehicle.id, cfg, user.id)],
          { onConflict: "vehicle_id" },
        );
      }

      if (changed.length > 0) await logHistory(vehicle.id, user.id, vehicle.current_stage, "vehicle_edited", changed.join("; "));
      onSuccess();
    } catch (e) {
      setErr(e.message || "Failed to save changes");
    } finally {
      setLoading(false);
    }
  };

  if (!editable) {
    return (
      <Dlg open onClose={onClose} title="Edit Vehicle" subtitle={vehicle.vehicle_number} width={420}>
        <Empty icon="🔒" text="Not editable at this stage" sub={`Vehicle is at "${(vehicle.current_stage || "").replace(/_/g, " ")}"`} />
        <Btn v="secondary" onClick={onClose} style={{ width: "100%", justifyContent: "center", marginTop: 12 }}>
          Close
        </Btn>
      </Dlg>
    );
  }

  return (
    <>
      <Dlg open onClose={onClose} title="Edit Vehicle" subtitle={vehicle.vehicle_number} width={620}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <FieldLabel required>Vehicle Number</FieldLabel>
            <StyledInput value={f.vehicle_number} onChange={(e) => upd("vehicle_number", e.target.value.toUpperCase())} errored={!!validateVehicleNumber(f.vehicle_number)} />
          </div>
          <div>
            <FieldLabel>Model</FieldLabel>
            <SelectInput value={f.model} onChange={(e) => upd("model", e.target.value)}>
              <option value="">Select...</option>
              {modelOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </SelectInput>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <FieldLabel>Customer Name</FieldLabel>
            <StyledInput value={f.customer_name} onChange={(e) => upd("customer_name", e.target.value)} />
          </div>
          <div>
            <FieldLabel>Phone</FieldLabel>
            <StyledInput value={f.customer_phone} onChange={(e) => upd("customer_phone", e.target.value)} errored={!!validatePhone(f.customer_phone)} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <FieldLabel>Odometer (km)</FieldLabel>
            <StyledInput type="number" value={f.odometer_reading} onChange={(e) => upd("odometer_reading", e.target.value)} errored={f.odometer_reading && !!validateOdometer(f.odometer_reading)} />
          </div>
          <div>
            <FieldLabel>Priority</FieldLabel>
            <SelectInput value={f.priority} onChange={(e) => upd("priority", e.target.value)}>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
              <option value="vip">VIP</option>
            </SelectInput>
          </div>
          <div>
            <FieldLabel>Advisor</FieldLabel>
            <SelectInput value={f.advisor_id} onChange={(e) => upd("advisor_id", e.target.value)}>
              {advisors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name}
                </option>
              ))}
            </SelectInput>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <FieldLabel>Service Type</FieldLabel>
          <SelectInput value={f.service_type} onChange={(e) => upd("service_type", e.target.value)}>
            <option value="">Select...</option>
            {Object.entries(DEFAULT_SERVICE_TYPES).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </SelectInput>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div
            onClick={() => upd("is_offline_jobcard", !f.is_offline_jobcard)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderRadius: 8,
              border: `1.5px solid ${f.is_offline_jobcard ? C.sky : C.border}`,
              background: f.is_offline_jobcard ? C.skyLight : C.surface,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 13, color: C.text }}>📄 This vehicle has an offline (paper) job card</span>
          </div>
          {f.is_offline_jobcard && (
            <div style={{ marginTop: 10 }}>
              <FieldLabel required>Job Card Opened Date</FieldLabel>
              <input
                type="date"
                value={f.offline_jobcard_date}
                onChange={(e) => upd("offline_jobcard_date", e.target.value)}
                style={inputStyle(false)}
              />
            </div>
          )}
        </div>

        <FieldLabel>Departments</FieldLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          {DEPT_KEYS.map((d) => {
            const dm = DEPT_META[d];
            const cfg = deptConfigs[d];
            return (
              <div
                key={d}
                onClick={() => toggleDept(d)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1.5px solid ${cfg?.enabled ? dm.color : C.border}`,
                  background: cfg?.enabled ? dm.color + "15" : C.surface,
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 13, color: C.text }}>
                  {dm.icon} {dm.label}
                </span>
                {cfg?.enabled ? <span style={{ color: dm.color }}>✓</span> : <span style={{ fontSize: 11, color: C.textMuted }}>+ add</span>}
              </div>
            );
          })}
        </div>

        {err && (
          <div style={{ background: C.redLight, color: C.red, padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{err}</div>
        )}
        <Btn v="primary" onClick={save} disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
          {loading ? "Saving..." : "Save Changes"}
        </Btn>
      </Dlg>
      {activeDeptModal && (
        <DepartmentConfigModal
          dept={activeDeptModal}
          config={deptConfigs[activeDeptModal]}
          onChange={(cfg) => setDeptConfigs((p) => ({ ...p, [activeDeptModal]: cfg }))}
          teams={deptTeams[activeDeptModal] || []}
          washingSlots={washingSlots}
          occupancy={{}}
          onClose={() => setActiveDeptModal(null)}
          onSave={(cfg) => {
            setDeptConfigs((p) => ({ ...p, [activeDeptModal]: cfg }));
            setActiveDeptModal(null);
          }}
        />
      )}
    </>
  );
}

// ─── VehicleDetailsModal — the central hub ──────────────────────────────────
function VehicleDetailsModal({ vehicle, users, onClose, onEdit, onDelete, onForceComplete }) {
  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(true);
  const [deptSheet, setDeptSheet] = useState(null);
  const ws = vehicle.work_stages?.[0];
  const complaints = vehicle.customer_complaints || [];
  const activeDepts = DEPT_KEYS.filter((d) => ws?.[`${d}_required`]);
  const allCompleted = activeDepts.length > 0 && activeDepts.every((d) => ws[`${d}_status`] === "completed");

  useEffect(() => {
    supabase
      .from("vehicle_history")
      .select("*, user:users!vehicle_history_user_id_fkey(full_name)")
      .eq("vehicle_id", vehicle.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setHistory(data || []);
        setHistLoading(false);
      });
  }, [vehicle.id]);

  return (
    <>
      <SidePanel open onClose={onClose} title={vehicle.vehicle_number} subtitle={`${vehicle.model || "—"} · ${vehicle.customer_name || "—"}`} width={620}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <ModelBadge model={vehicle.model} />
          <PriorityBadge priority={vehicle.priority} />
          <Chip color={C.navy} bg={C.raised} style={{ border: `1px solid ${C.border}` }}>
            {(vehicle.current_stage || "—").replace(/_/g, " ")}
          </Chip>
          <VehicleTagBadges vehicle={vehicle} />
        </div>

        <SectionBox icon="ℹ️" label="Info">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              ["Customer", vehicle.customer_name || "—"],
              ["Phone", vehicle.customer_phone || "—"],
              ["Odometer", vehicle.odometer_reading ? `${vehicle.odometer_reading} km` : "—"],
              ["Service Type", vehicle.service_type?.replace(/_/g, " ") || "—"],
              ["Entry", formatIST(vehicle.entry_time)],
              ["Expected", formatIST(vehicle.expected_completion_time)],
            ].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: "uppercase" }}>{l}</div>
                <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>
        </SectionBox>

        {complaints.length > 0 && (
          <SectionBox icon="📢" label={`Complaints (${complaints.length})`}>
            <div style={{ display: "grid", gap: 8 }}>
              {complaints.map((c) => (
                <div key={c.id} style={{ padding: "8px 10px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6 }}>
                  <div style={{ fontSize: 12, color: C.text }}>{c.description}</div>
                  {c.resolved_note && <div style={{ fontSize: 11, color: C.green, marginTop: 3 }}>✓ {c.resolved_note}</div>}
                </div>
              ))}
            </div>
          </SectionBox>
        )}

        <SectionBox icon="🔧" label="Departments">
          {activeDepts.length === 0 ? (
            <div style={{ fontSize: 12, color: C.textMuted, fontStyle: "italic" }}>No departments assigned</div>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {activeDepts.map((d) => {
                const st = ws[`${d}_status`] || "not_started";
                const [sc, sbg] = statusColor(st);
                return (
                  <div
                    key={d}
                    onClick={() => setDeptSheet(d)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: C.raised, borderRadius: 6, cursor: "pointer" }}
                  >
                    <span style={{ fontSize: 13, color: C.text }}>
                      {DEPT_META[d].icon} {DEPT_META[d].label}
                    </span>
                    <Chip color={sc} bg={sbg}>
                      {st.replace(/_/g, " ")}
                    </Chip>
                  </div>
                );
              })}
            </div>
          )}
        </SectionBox>

        <SectionBox icon="📜" label="History">
          {histLoading ? (
            <div style={{ fontSize: 12, color: C.textMuted }}>Loading...</div>
          ) : history.length === 0 ? (
            <div style={{ fontSize: 12, color: C.textMuted, fontStyle: "italic" }}>No history yet</div>
          ) : (
            <div style={{ display: "grid", gap: 8, maxHeight: 260, overflowY: "auto" }}>
              {history.map((h) => (
                <div key={h.id} style={{ borderLeft: `2px solid ${C.border}`, paddingLeft: 10 }}>
                  <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{h.action?.replace(/_/g, " ")}</div>
                  <div style={{ fontSize: 11, color: C.textSec, marginTop: 2 }}>{h.new_value}</div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>
                    {h.user?.full_name || "System"} · {formatIST(h.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionBox>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          {["advisor_review", "pending", "pdi"].includes(vehicle.current_stage) && (
            <Btn v="secondary" onClick={() => onEdit(vehicle)}>
              ✏️ Edit
            </Btn>
          )}
          {allCompleted && vehicle.current_stage !== "completed" && (
            <Btn v="secondary" onClick={() => onForceComplete(vehicle)}>
              ⚠️ Force Complete
            </Btn>
          )}
          {!vehicle.deleted_at && (
            <Btn v="danger" onClick={() => onDelete(vehicle)}>
              🗑️ Delete
            </Btn>
          )}
        </div>
      </SidePanel>

      {deptSheet && (
        <DeptDetailSheet vehicle={vehicle} dept={deptSheet} users={users} onClose={() => setDeptSheet(null)} />
      )}
    </>
  );
}

// ─── Main dashboard ─────────────────────────────────────────────────────────
const TABS = [
  { key: "assign", label: "Assign", icon: "📝" },
  { key: "pdi", label: "PDI", icon: "🔍" },
  { key: "departments", label: "Departments", icon: "🔧" },
  { key: "washing", label: "Washing", icon: "💧" },
  { key: "bookings", label: "Bookings", icon: "🗓" },
  { key: "all", label: "All Vehicles", icon: "🚗" },
  { key: "offline", label: "Offline Job Cards", icon: "📄" },
];

export default function AdvisorDashboard({ user, onLogout }) {
  const [tab, setTab] = useState("assign");
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [modal, setModal] = useState(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const { getList, getLabelMap } = useConfigOptions();
  const washingSlots = getList("washing_slot", DEFAULT_WASHING_SLOTS);
  const vehicleModels = getList("vehicle_model", DEFAULT_VEHICLE_MODELS);
  const deletionReasonList = getLabelMap("deletion_reason", null);
  const deletionReasons = deletionReasonList
    ? Object.entries(deletionReasonList).map(([key, label]) => ({ key, label }))
    : [
        { key: "duplicate_entry", label: "Duplicate Entry" },
        { key: "customer_cancelled", label: "Customer Cancelled" },
        { key: "wrong_entry", label: "Wrong Entry" },
      ];
  const leaveTypeList = getLabelMap("leave_type", null);
  const leaveTypes = leaveTypeList
    ? Object.entries(leaveTypeList).map(([key, label]) => ({ key, label }))
    : [{ key: "casual", label: "Casual" }, { key: "sick", label: "Sick" }, { key: "personal", label: "Personal" }];

  const debounceRef = useRef(null);
  const [recentVisitNums, setRecentVisitNums] = useState(new Set());

  const fetchData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setLoadError(null);
    try {
      const off = 5.5 * 3600000;
      const istNow = new Date(Date.now() + off);
      istNow.setUTCHours(0, 0, 0, 0);
      const todayStartUTC = new Date(istNow.getTime() - off);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

      const [vRes, bRes, uRes, tRes, completedRes] = await withTimeout(Promise.all([
        supabase
          .from("vehicles")
          .select(
            "*, work_stages(*), customer_complaints(*), three_m_details(*), alignment_details(*), washing_details(*)",
          )
          .or(`current_stage.neq.completed,entry_time.gte.${todayStartUTC.toISOString()}`)
          .is("deleted_at", null)
          .order("entry_time", { ascending: false }),
        supabase.from("bookings").select("*").order("preferred_date", { ascending: false }).limit(500),
        supabase.from("users").select("id,full_name,role,team_id").eq("is_active", true),
        supabase.from("teams").select("*"),
        supabase
          .from("vehicles")
          .select("vehicle_number")
          .eq("current_stage", "completed")
          .gte("updated_at", thirtyDaysAgo)
          .is("deleted_at", null),
      ]));

      setVehicles(vRes.data || []);
      setBookings(bRes.data || []);
      setUsers(uRes.data || []);
      setTeams(tRes.data || []);
      setRecentVisitNums(new Set((completedRes.data || []).map((v) => v.vehicle_number)));
    } catch (e) {
      console.error("AdvisorDashboard fetchData error:", e);
      if (showLoader) setLoadError(e.message || "Failed to load dashboard data.");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchData();
    const ch = supabase
      .channel("advisor-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicles" }, () => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchData(false), 800);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => fetchData(false))
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
      clearTimeout(debounceRef.current);
    };
  }, [user, fetchData]);

  const bookedTodayIds = useMemo(() => {
    const today = todayIST();
    return new Set(
      bookings.filter((b) => b.preferred_date === today && b.status === "arrived").map((b) => b.vehicle_number),
    );
  }, [bookings]);

  const visitCounts = useMemo(() => {
    const m = {};
    bookings.forEach((b) => {
      m[b.vehicle_number] = (m[b.vehicle_number] || 0) + 1;
    });
    return m;
  }, [bookings]);

  const closeModal = () => {
    setSelectedVehicle(null);
    setSelectedBooking(null);
    setModal(null);
  };
  const onSuccess = () => {
    closeModal();
    fetchData(false);
  };

  const stats = useMemo(() => {
    const toAssign = vehicles.filter((v) => v.current_stage === "advisor_review").length;
    const pdiReady = vehicles.filter((v) => v.current_stage === "pdi" && v.advisor_id === user.id).length;
    const inProgress = vehicles.filter((v) => v.current_stage === "pending").length;
    const noSlot = vehicles.filter(
      (v) => v.work_stages?.[0]?.washing_required && (!v.washing_details?.[0]?.slot || !v.washing_details?.[0]?.slot_date),
    ).length;
    return { toAssign, pdiReady, inProgress, noSlot };
  }, [vehicles, user.id]);

  const tabCounts = {
    assign: stats.toAssign,
    pdi: stats.pdiReady,
    departments: vehicles.filter((v) => v.current_stage === "pending").length,
    washing: vehicles.filter((v) => v.work_stages?.[0]?.washing_required && v.work_stages[0].washing_status !== "completed").length,
    bookings: bookings.filter((b) => b.status === "pending").length,
    all: null,
    offline: vehicles.filter((v) => v.is_offline_jobcard && !v.offline_jobcard_opened).length,
  };

  if (loading)
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: C.bg, flexDirection: "column", gap: 14, fontFamily: "'DM Sans',sans-serif" }}>
        <style>
          {FONT}
          {`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}
        </style>
        <div style={{ width: 40, height: 40, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.sky}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <div style={{ fontSize: 13, color: C.textMuted, fontWeight: 600 }}>Loading advisor dashboard...</div>
      </div>
    );

  if (loadError)
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: C.bg, flexDirection: "column", gap: 14, fontFamily: "'DM Sans',sans-serif", padding: 24, textAlign: "center" }}>
        <style>{FONT}</style>
        <div style={{ fontSize: 32 }}>⚠️</div>
        <div style={{ fontSize: 15, color: C.text, fontWeight: 700 }}>Couldn't load dashboard data</div>
        <div style={{ fontSize: 13, color: C.textMuted, maxWidth: 360 }}>{loadError}</div>
        <button
          onClick={() => fetchData()}
          style={{ marginTop: 6, padding: "9px 20px", background: C.sky, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
        >
          🔄 Retry
        </button>
      </div>
    );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: C.bg, fontFamily: "'DM Sans',sans-serif", color: C.text }}>
      <style>
        {FONT}
        {`*{box-sizing:border-box;} ::-webkit-scrollbar{width:5px;} ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px;}`}
      </style>

      {/* Header */}
      <div style={{ background: C.navy, padding: "0 32px", height: 64, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 50, boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: C.sky, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#fff", fontSize: 15 }}>
            S
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "1.5px" }}>
              Sheetal Automobiles
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>Advisor Dashboard</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>👤 {user?.full_name}</span>
          <button
            onClick={() => setShowLeaveModal(true)}
            style={{ padding: "6px 14px", background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}
          >
            🌴 Leave
          </button>
          <button
            onClick={() => fetchData()}
            style={{ padding: "6px 14px", background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}
          >
            🔄 Refresh
          </button>
          <button
            onClick={onLogout}
            style={{ padding: "6px 14px", background: "rgba(239,68,68,0.15)", color: "#F87171", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
        {/* Quick stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: "To Assign", value: stats.toAssign, color: C.sky, icon: "📝" },
            { label: "PDI Ready", value: stats.pdiReady, color: C.purple, icon: "🔍" },
            { label: "In Progress", value: stats.inProgress, color: C.amber, icon: "🔧" },
            { label: "No Wash Slot", value: stats.noSlot, color: stats.noSlot > 0 ? C.red : C.green, icon: "💧" },
          ].map((s) => (
            <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px", boxShadow: C.shadow }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</span>
                <span style={{ fontSize: 18 }}>{s.icon}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontFamily: "'DM Mono',monospace" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4, backgroundColor: C.surface, padding: 6, borderRadius: 12, boxShadow: C.shadow, marginBottom: 24, width: "fit-content", flexWrap: "wrap", border: `1px solid ${C.border}` }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "9px 16px",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
                fontFamily: "inherit",
                backgroundColor: tab === t.key ? C.navy : "transparent",
                color: tab === t.key ? "#fff" : C.textMuted,
              }}
            >
              {t.icon} {t.label}
              {tabCounts[t.key] !== null && tabCounts[t.key] > 0 && (
                <span style={{ marginLeft: 7, backgroundColor: tab === t.key ? "rgba(255,255,255,0.2)" : C.raised, color: tab === t.key ? "#fff" : C.textSec, borderRadius: 12, padding: "1px 7px", fontSize: 11 }}>
                  {tabCounts[t.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "assign" && (
          <AssignTab
            vehicles={vehicles}
            bookedTodayIds={bookedTodayIds}
            recentVisitNums={recentVisitNums}
            onAssign={(v) => {
              setSelectedVehicle(v);
              setModal("assign");
            }}
            onDetails={(v) => {
              setSelectedVehicle(v);
              setModal("details");
            }}
          />
        )}
        {tab === "pdi" && (
          <PDITab
            vehicles={vehicles}
            user={user}
            onPDI={(v) => {
              setSelectedVehicle(v);
              setModal("pdi");
            }}
            onReassign={(v) => {
              setSelectedVehicle(v);
              setModal("reassign");
            }}
            onDetails={(v) => {
              setSelectedVehicle(v);
              setModal("details");
            }}
          />
        )}
        {tab === "departments" && (
          <DepartmentsTab
            vehicles={vehicles}
            bookedTodayIds={bookedTodayIds}
            onDetails={(v) => {
              setSelectedVehicle(v);
              setModal("details");
            }}
          />
        )}
        {tab === "washing" && (
          <AdvisorWashingTab
            vehicles={vehicles}
            slots={washingSlots}
            user={user}
            onVehiclePress={(v) => {
              setSelectedVehicle(v);
              setModal("washingEdit");
            }}
          />
        )}
        {tab === "bookings" && (
          <AdvisorBookingsTab
            bookings={bookings}
            user={user}
            visitCounts={visitCounts}
            onConfirm={(b) => {
              setSelectedBooking(b);
              setModal("bookingConfirm");
            }}
            onReschedule={(b) => {
              setSelectedBooking(b);
              setModal("bookingReschedule");
            }}
            onEdit={(b) => {
              setSelectedBooking(b);
              setModal("bookingEdit");
            }}
            onCancel={(b) => {
              setSelectedBooking(b);
              setModal("bookingCancel");
            }}
          />
        )}
        {tab === "all" && (
          <AllVehiclesTab
            vehicles={vehicles}
            onDetails={(v) => {
              setSelectedVehicle(v);
              setModal("details");
            }}
          />
        )}
        {tab === "offline" && <OfflineJobCardsTab vehicles={vehicles} onRefresh={() => fetchData(false)} />}
      </div>

      {/* Modals */}
      {modal === "assign" && selectedVehicle && (
        <AssignWorkModal
          vehicle={selectedVehicle}
          user={user}
          teams={teams}
          vehicles={vehicles}
          washingSlots={washingSlots}
          vehicleModels={vehicleModels}
          onClose={closeModal}
          onSuccess={onSuccess}
        />
      )}
      {modal === "details" && selectedVehicle && (
        <VehicleDetailsModal
          vehicle={vehicles.find((v) => v.id === selectedVehicle.id) || selectedVehicle}
          users={users}
          onClose={closeModal}
          onEdit={(v) => {
            setSelectedVehicle(v);
            setModal("edit");
          }}
          onDelete={(v) => {
            setSelectedVehicle(v);
            setModal("delete");
          }}
          onForceComplete={(v) => {
            setSelectedVehicle(v);
            setModal("forcePdi");
          }}
        />
      )}
      {modal === "edit" && selectedVehicle && (
        <EditVehicleModal
          vehicle={selectedVehicle}
          users={users}
          teams={teams}
          vehicles={vehicles}
          washingSlots={washingSlots}
          vehicleModels={vehicleModels}
          user={user}
          onClose={closeModal}
          onSuccess={onSuccess}
        />
      )}
      {modal === "reassign" && selectedVehicle && (
        <ReassignWorkModal
          vehicle={selectedVehicle}
          teams={teams}
          vehicles={vehicles}
          washingSlots={washingSlots}
          user={user}
          onClose={closeModal}
          onSuccess={onSuccess}
        />
      )}
      {modal === "pdi" && selectedVehicle && (
        <PDIModal vehicle={selectedVehicle} users={users} user={user} onClose={closeModal} onSuccess={onSuccess} />
      )}
      {modal === "forcePdi" && selectedVehicle && (
        <ForcePDIModal vehicle={selectedVehicle} users={users} user={user} onClose={closeModal} onSuccess={onSuccess} />
      )}
      {modal === "delete" && selectedVehicle && (
        <DeletionReasonModal vehicle={selectedVehicle} deletionReasons={deletionReasons} user={user} onClose={closeModal} onSuccess={onSuccess} />
      )}
      {modal === "washingEdit" && selectedVehicle && (
        <WashingEditModal vehicle={selectedVehicle} washingSlots={washingSlots} occupancy={{}} user={user} onClose={closeModal} onSuccess={onSuccess} />
      )}
      {modal === "bookingConfirm" && selectedBooking && (
        <AdvisorBookingConfirmModal booking={selectedBooking} user={user} onClose={closeModal} onSuccess={onSuccess} />
      )}
      {modal === "bookingReschedule" && selectedBooking && (
        <AdvisorBookingRescheduleModal booking={selectedBooking} user={user} onClose={closeModal} onSuccess={onSuccess} />
      )}
      {modal === "bookingEdit" && selectedBooking && (
        <AdvisorBookingEditModal booking={selectedBooking} user={user} onClose={closeModal} onSuccess={onSuccess} />
      )}
      {modal === "bookingCancel" && selectedBooking && (
        <AdvisorBookingCancelModal booking={selectedBooking} user={user} onClose={closeModal} onSuccess={onSuccess} />
      )}
      {showLeaveModal && (
        <LeaveApplicationModal user={user} leaveTypes={leaveTypes} onClose={() => setShowLeaveModal(false)} onSuccess={() => setShowLeaveModal(false)} />
      )}
    </div>
  );
}

