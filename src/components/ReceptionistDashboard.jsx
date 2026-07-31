import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "../lib/supabase";
import * as XLSX from "xlsx";

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
  red: "#DC2626",
  redLight: "#FEE2E2",
  purple: "#7C3AED",
  purpleLight: "#EDE9FE",
  shadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd: "0 4px 8px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)",
  shadowLg: "0 20px 40px rgba(0,0,0,0.16), 0 8px 16px rgba(0,0,0,0.08)",
};

const STATUS = {
  pending: {
    label: "Pending",
    color: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
    dot: "#F59E0B",
  },
  confirmed: {
    label: "Confirmed",
    color: "#1D4ED8",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    dot: "#3B82F6",
  },
  arrived: {
    label: "Arrived",
    color: "#065F46",
    bg: "#ECFDF5",
    border: "#A7F3D0",
    dot: "#10B981",
  },
  completed: {
    label: "Completed",
    color: "#475569",
    bg: "#F8FAFC",
    border: "#E2E8F0",
    dot: "#94A3B8",
  },
  cancelled: {
    label: "Cancelled",
    color: "#991B1B",
    bg: "#FFF5F5",
    border: "#FECACA",
    dot: "#EF4444",
  },
  no_show: {
    label: "No Show",
    color: "#374151",
    bg: "#F9FAFB",
    border: "#E5E7EB",
    dot: "#9CA3AF",
  },
  rescheduled: {
    label: "Rescheduled",
    color: "#7C3AED",
    bg: "#EDE9FE",
    border: "#C4B5FD",
    dot: "#7C3AED",
  },
};

const SVC = {
  first_free_service: "1st Free Service",
  second_free_service: "2nd Free Service",
  third_free_service: "3rd Free Service",
  scheduled_minor: "Scheduled Minor",
  scheduled_major: "Scheduled Major",
  running_repair: "Running Repair",
  customer_complaint: "Customer Complaint",
};

const TIME_LABELS = {
  "09:00-11:00": "9-11 AM",
  "09:30-11:00": "9:30-11 AM", // BookingPage uses this format
  "11:00-13:00": "11 AM-1 PM",
  "14:00-16:00": "2-4 PM",
  "16:00-18:00": "4-6 PM",
};
const TIME_SLOTS = Object.keys(TIME_LABELS);
const MODELS = [
  "Safari 2.0",
  "Harrier",
  "Curvv",
  "Sierra",
  "Nexon",
  "Punch",
  "Altroz",
  "Tigor",
  "Tiago",
  "Safari",
  "Hexa",
  "Manza",
  "Zest",
  "Bolt",
  "Indica Vista",
  "Indigo",
  "Indica",
  "Nano",
];

// Helpers
const todayIST = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const tomorrowIST = () => {
  const d = new Date(Date.now() + 86400000);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
};
const yesterdayIST = () => {
  const d = new Date(Date.now() - 86400000);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
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
const fmtDate = (d) => {
  if (!d) return "—";
  const [, m, dy] = d.split("-");
  const mo = [
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
  return `${parseInt(dy)} ${mo[parseInt(m) - 1]}`;
};
const fmtDateFull = (d) => {
  if (!d) return "—";
  const [y, m, dy] = d.split("-");
  const mo = [
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
  return `${parseInt(dy)} ${mo[parseInt(m) - 1]} ${y}`;
};
const fmtIST = (s) => {
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
const fmtTimeOnly = (s) => {
  if (!s) return "—";
  return new Date(toZ(s)).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};
const fmtHHMM = (t) => {
  if (!t) return "";
  // Handle full ISO timestamp
  if (t.includes("T") || t.includes("Z") || t.includes("+"))
    return fmtTimeOnly(t);
  // Handle "HH:MM" or "HH:MM:SS"
  const parts = t.split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return t;
  const ampm = h >= 12 ? "pm" : "am";
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
};
const shiftDate = (d, delta) => {
  const dt = new Date(d + "T12:00:00");
  dt.setDate(dt.getDate() + delta);
  return dt.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
};
const isSaturday = (s) => {
  if (!s) return false;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).getDay() === 6;
};

// Parse contact_person field — format: "Ref: Gokul | Filled by: Pawan (9876543210)"
const parseContactPerson = (cp) => {
  if (!cp) return { ref: null, filledBy: null };
  const ref = cp.match(/Ref:\s*([^|]+)/)?.[1]?.trim() || null;
  const filledByExplicit =
    cp.match(/Filled by:\s*([^|]+)/)?.[1]?.trim() || null;
  // NewBookingModal stores "Ref: Gokul | Rohini Sharma" — second segment after pipe with no prefix = receptionist
  const segments = cp.split("|").map((s) => s.trim());
  let filledBy = filledByExplicit;
  if (!filledBy && segments.length >= 2) {
    const last = segments[segments.length - 1];
    if (!last.startsWith("Ref:") && !last.startsWith("Filled by:"))
      filledBy = last;
  }
  // Entirely plain name = receptionist (no pipe, no prefix)
  if (!ref && !filledBy && !cp.includes("|"))
    return { ref: null, filledBy: cp.trim() };
  return { ref, filledBy };
};

// API
async function sendWA(phone, template, params) {
  if (!phone) return;
  try {
    await supabase.functions.invoke("send-whatsapp", {
      body: { to: phone, template, params },
    });
  } catch (e) {
    console.warn("WA:", e);
  }
}
async function logAct(bookingId, userId, type, notes = "", extra = {}) {
  const { error } = await supabase.from("booking_activities").insert([
    {
      booking_id: bookingId,
      user_id: userId,
      activity_type: type,
      notes,
      ...extra,
    },
  ]);
  if (error) console.error("logAct:", error);
}

// ─── Primitive UI ─────────────────────────────────────────────────────────────
const Chip = ({ color, bg, border, children, style = {} }) => (
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
      border: border ? `1px solid ${border}` : "none",
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </span>
);

const StatusBadge = ({ status }) => {
  const s = STATUS[status] || {
    label: status,
    color: C.textMuted,
    bg: C.raised,
    border: C.border,
    dot: C.borderStr,
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 9px",
        borderRadius: 20,
        background: s.bg,
        border: `1px solid ${s.border}`,
        fontSize: 11,
        fontWeight: 700,
        color: s.color,
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: s.dot,
          flexShrink: 0,
        }}
      />
      {s.label}
    </span>
  );
};

const Btn = ({
  children,
  onClick,
  v = "primary",
  sz = "md",
  disabled = false,
  style = {},
}) => {
  const vs = {
    primary: { bg: C.amber, color: "#fff", border: C.amber },
    secondary: { bg: C.surface, color: C.textSec, border: C.border },
    danger: { bg: C.red, color: "#fff", border: C.red },
    ghost: { bg: "transparent", color: C.textSec, border: "transparent" },
    success: { bg: C.green, color: "#fff", border: C.green },
    blue: { bg: C.blue, color: "#fff", border: C.blue },
    amber_outline: { bg: C.amberLight, color: C.amberDark, border: "#FDE68A" },
    red_soft: { bg: "#FFF1F2", color: C.red, border: "#FECACA" },
    green_soft: { bg: C.greenLight, color: C.green, border: "#6EE7B7" },
    purple_soft: { bg: C.purpleLight, color: C.purple, border: "#C4B5FD" },
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
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
              {title}
            </div>
            {subtitle && (
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                {subtitle}
              </div>
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
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>
          {children}
        </div>
      </div>
    </div>
  );
};

const SectionBox = ({ icon, label, children }) => (
  <div
    style={{
      background: C.raised,
      borderRadius: 9,
      padding: "14px 16px",
      marginBottom: 12,
      border: `1px solid ${C.border}`,
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

function FocusInput({
  value,
  onChange,
  placeholder,
  type = "text",
  mono = false,
  maxLength,
  inputMode,
  errored = false,
  style = {},
}) {
  const [f, setF] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      inputMode={inputMode}
      style={{
        width: "100%",
        padding: "9px 12px",
        border: `1.5px solid ${errored ? C.red : f ? C.amber : C.border}`,
        borderRadius: 7,
        fontSize: 14,
        color: C.text,
        background: C.surface,
        outline: "none",
        fontFamily: mono ? "'DM Mono',monospace" : "inherit",
        letterSpacing: mono ? "0.8px" : "normal",
        boxSizing: "border-box",
        transition: "border-color 0.15s",
        boxShadow: f ? "0 0 0 3px rgba(245,158,11,0.1)" : "none",
        ...style,
      }}
      onFocus={() => setF(true)}
      onBlur={() => setF(false)}
    />
  );
}

function FocusSelect({ value, onChange, options, errored = false }) {
  const [f, setF] = useState(false);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "9px 12px",
        border: `1.5px solid ${errored ? C.red : f ? C.amber : C.border}`,
        borderRadius: 7,
        fontSize: 14,
        color: C.text,
        background: C.surface,
        outline: "none",
        fontFamily: "inherit",
        cursor: "pointer",
        boxSizing: "border-box",
        appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
        paddingRight: 36,
      }}
      onFocus={() => setF(true)}
      onBlur={() => setF(false)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

const Empty = ({ icon, text, sub }) => (
  <div
    style={{ textAlign: "center", padding: "52px 24px", color: C.textMuted }}
  >
    <div style={{ fontSize: 42, marginBottom: 12 }}>{icon}</div>
    <div
      style={{
        fontSize: 15,
        fontWeight: 600,
        color: C.textSec,
        marginBottom: 6,
      }}
    >
      {text}
    </div>
    {sub && <div style={{ fontSize: 13 }}>{sub}</div>}
  </div>
);

// ─── BOOKING CARD — status-aware details ──────────────────────────────────────
function BookingCard({
  booking: b,
  user,
  onAction,
  showDate = false,
  activityMeta = null,
}) {
  const st = STATUS[b.status] || {};
  const canAct = ["pending", "confirmed", "no_show"].includes(b.status);
  const { ref: referral, filledBy } = parseContactPerson(b.contact_person);

  // activityMeta: { confirmedBy, confirmedAt, arrivedAt, cancelledBy, cancelledAt, cancelReason, callDoneAt, callDoneBy }
  const meta = activityMeta || {};

  return (
    <div
      style={{
        background: C.surface,
        borderRadius: 10,
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${st.dot || C.borderStr}`,
        padding: "14px 16px",
        marginBottom: 8,
        boxShadow: C.shadow,
        transition: "box-shadow 0.15s,transform 0.1s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = C.shadowMd;
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = C.shadow;
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Row 1: VN + status + time */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 7,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontWeight: 800,
              fontSize: 14.5,
              fontFamily: "'DM Mono',monospace",
              color: C.text,
              letterSpacing: "0.8px",
            }}
          >
            {b.vehicle_number}
          </span>
          {b.model && (
            <Chip color={C.blue} bg={C.blueLight} border="#BFDBFE">
              {b.model}
            </Chip>
          )}
          <StatusBadge status={b.status} />
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {b.status === "arrived" && b.arrived_at ? (
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textSec }}>
              {fmtTimeOnly(b.arrived_at)}
            </div>
          ) : b.status === "confirmed" && b.confirmed_time ? (
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textSec }}>
              {fmtHHMM(b.confirmed_time)}
            </div>
          ) : b.preferred_time ? (
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textSec }}>
              {TIME_LABELS[b.preferred_time]}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: C.textMuted }}>Any time</div>
          )}
          {showDate && (
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
              {fmtDate(b.preferred_date)}
            </div>
          )}
        </div>
      </div>

      {/* Row 2: customer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
          {b.customer_name || "—"}
        </span>
        {b.customer_phone && (
          <>
            <span style={{ color: C.border }}>·</span>
            <a
              href={`tel:${b.customer_phone}`}
              style={{
                fontSize: 13,
                color: C.blue,
                textDecoration: "none",
                fontFamily: "'DM Mono',monospace",
                letterSpacing: "0.3px",
              }}
            >
              {b.customer_phone}
            </a>
          </>
        )}
        {b.service_type && (
          <>
            <span style={{ color: C.border }}>·</span>
            <span style={{ fontSize: 12, color: C.textSec }}>
              {SVC[b.service_type] || b.service_type}
            </span>
          </>
        )}
        {b.ref_number && (
          <span
            style={{
              fontSize: 10,
              color: C.textMuted,
              fontFamily: "'DM Mono',monospace",
              marginLeft: "auto",
            }}
          >
            {b.ref_number}
          </span>
        )}
      </div>

      {b.rescheduled_from && (
        <div
          style={{
            fontSize: 11,
            color: C.purple,
            background: C.purpleLight,
            padding: "5px 10px",
            borderRadius: 6,
            marginBottom: 6,
            border: `1px solid #C4B5FD`,
            fontWeight: 600,
          }}
        >
          ↻ Rescheduled booking
        </div>
      )}
      {b.status === "rescheduled" && (
        <div
          style={{
            fontSize: 11,
            color: "#7C3AED",
            background: "#EDE9FE",
            padding: "5px 10px",
            borderRadius: 6,
            marginBottom: 6,
            border: `1px solid #C4B5FD`,
            fontWeight: 600,
          }}
        >
          ↻ This booking was rescheduled — see new booking
        </div>
      )}
      {b.issue_description && (
        <div
          style={{
            fontSize: 12,
            color: C.textSec,
            background: "#FAFAFA",
            padding: "6px 10px",
            borderRadius: 6,
            marginBottom: 8,
            fontStyle: "italic",
            border: `1px solid ${C.border}`,
          }}
        >
          "{b.issue_description}"
        </div>
      )}

      {/* ── Compact activity log on card ── */}
      {(() => {
        // Build ordered event lines relevant to this booking's status
        const events = [];

        // Referral / source
        if (referral || filledBy) {
          const src = [
            referral ? "Ref: " + referral : null,
            filledBy ? "Via: " + filledBy : null,
          ]
            .filter(Boolean)
            .join("  ·  ");
          events.push({ label: null, value: src });
        }

        // Confirmation — b.confirmed_at is set by receptionist Call Done
        // meta.confirmedAt is from booking_activities (call_done or confirmed event)
        if (["confirmed", "arrived", "completed"].includes(b.status)) {
          const confTime = fmtTimeOnly(
            b.confirmed_at || meta.confirmedAt || null,
          );
          const by = meta.confirmedBy || null;
          if (by || confTime) {
            let line = "Confirmed";
            if (by) line += " by " + by;
            if (confTime) line += " at " + confTime;
            events.push({ label: null, value: line });
          }
        }

        // Arrival
        if (["arrived", "completed"].includes(b.status) && b.arrived_at) {
          events.push({
            label: null,
            value: "Arrived at " + fmtTimeOnly(b.arrived_at),
          });
        }

        // Cancellation
        if (b.status === "cancelled") {
          if (meta.cancelledBy || meta.cancelledAt) {
            let line = "Cancelled";
            if (meta.cancelledBy) line += " by " + meta.cancelledBy;
            if (meta.cancelledAt)
              line += " at " + fmtTimeOnly(meta.cancelledAt);
            events.push({ label: null, value: line });
          }
          if (meta.cancelReason && meta.cancelReason !== "Booking cancelled") {
            events.push({ label: "Reason", value: meta.cancelReason });
          }
        }

        if (!events.length) return null;
        return (
          <div
            style={{
              paddingTop: 7,
              marginBottom: 7,
              borderTop: `1px dashed ${C.border}`,
            }}
          >
            {events.map((e, i) => (
              <div
                key={i}
                style={{
                  fontSize: 11.5,
                  color: C.textMuted,
                  lineHeight: 1.7,
                  display: "flex",
                  gap: 4,
                }}
              >
                {e.label && (
                  <span
                    style={{
                      color: C.textMuted,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {e.label}:
                  </span>
                )}
                <span>{e.value}</span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Actions */}
      {(canAct || b.status === "arrived") && (
        <div
          style={{
            display: "flex",
            gap: 5,
            flexWrap: "wrap",
            paddingTop: 8,
            borderTop: `1px solid ${C.border}`,
            marginTop: 4,
          }}
        >
          {canAct && (
            <Btn
              v="secondary"
              sz="sm"
              onClick={() => onAction("reschedule", b)}
            >
              Reschedule
            </Btn>
          )}
          {canAct && (
            <Btn
              v="ghost"
              sz="sm"
              onClick={() => onAction("edit", b)}
              style={{ color: C.blue, border: `1px solid ${C.border}` }}
            >
              Edit
            </Btn>
          )}
          {["pending", "no_show"].includes(b.status) && (
            <Btn
              v="amber_outline"
              sz="sm"
              onClick={() => onAction("no_answer", b)}
            >
              No Answer
            </Btn>
          )}
          {["pending", "confirmed"].includes(b.status) && (
            <Btn
              v="green_soft"
              sz="sm"
              onClick={() => onAction("call_done", b)}
            >
              Call Done
            </Btn>
          )}
          {canAct && (
            <Btn v="red_soft" sz="sm" onClick={() => onAction("cancel", b)}>
              Cancel
            </Btn>
          )}
          {b.status === "arrived" && (
            <span
              style={{
                fontSize: 12,
                color: C.green,
                fontWeight: 700,
                alignSelf: "center",
              }}
            >
              In workshop
            </span>
          )}
          <Btn
            v="ghost"
            sz="sm"
            onClick={() => onAction("note", b)}
            style={{ color: C.textSec, border: `1px solid ${C.border}` }}
          >
            Note
          </Btn>
          <Btn
            v="ghost"
            sz="sm"
            onClick={() => onAction("view", b)}
            style={{
              marginLeft: "auto",
              color: C.textSec,
              border: `1px solid ${C.border}`,
            }}
          >
            Details
          </Btn>
        </div>
      )}
      {!canAct && b.status !== "arrived" && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            paddingTop: 8,
            borderTop: `1px solid ${C.border}`,
            marginTop: 4,
          }}
        >
          <Btn
            v="ghost"
            sz="sm"
            onClick={() => onAction("note", b)}
            style={{ color: C.textSec, border: `1px solid ${C.border}` }}
          >
            Note
          </Btn>
          <Btn
            v="ghost"
            sz="sm"
            onClick={() => onAction("view", b)}
            style={{ color: C.textSec, border: `1px solid ${C.border}` }}
          >
            Details
          </Btn>
        </div>
      )}
    </div>
  );
}

// ─── CALL DONE MODAL ──────────────────────────────────────────────────────────
function CallDoneModal({ booking, user, onClose, onSave }) {
  const [notes, setNotes] = useState("");
  const [confirm, setConfirm] = useState(booking.status === "pending");
  const [confirmedTime, setConfirmedTime] = useState(
    booking.confirmed_time || "",
  );
  const [loading, setLoading] = useState(false);
  const [nf, setNf] = useState(false);

  const save = async () => {
    setLoading(true);
    if (confirm && booking.status === "pending") {
      await supabase
        .from("bookings")
        .update({
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
          confirmed_by: user.id,
          ...(confirmedTime ? { confirmed_time: confirmedTime } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id);
    } else if (confirmedTime && booking.status === "confirmed") {
      // Update confirmed_time even if already confirmed
      await supabase
        .from("bookings")
        .update({
          confirmed_time: confirmedTime,
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id);
    }
    await logAct(
      booking.id,
      user.id,
      "call_done",
      notes.trim() || "Call completed",
    );
    setLoading(false);
    onSave();
  };

  return (
    <Dlg
      open={true}
      onClose={onClose}
      title="Call Done"
      subtitle={`${booking.vehicle_number} · ${booking.customer_name || "—"}`}
      width={420}
    >
      {booking.status === "pending" && (
        <div
          onClick={() => setConfirm(!confirm)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 8,
            border: `1.5px solid ${confirm ? "#86EFAC" : C.border}`,
            background: confirm ? "#F0FDF4" : C.surface,
            cursor: "pointer",
            marginBottom: 12,
            userSelect: "none",
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              border: `2px solid ${confirm ? "#22C55E" : C.textMuted}`,
              background: confirm ? "#22C55E" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {confirm && (
              <span style={{ color: "white", fontSize: 11, fontWeight: 800 }}>
                ✓
              </span>
            )}
          </div>
          <span style={{ fontSize: 13, color: C.text }}>
            Mark booking as <strong>Confirmed</strong>
          </span>
        </div>
      )}
      {(confirm || booking.status === "confirmed") && (
        <div style={{ marginBottom: 14 }}>
          <FieldLabel>Confirmed Arrival Time</FieldLabel>
          <input
            type="time"
            value={confirmedTime}
            onChange={(e) => setConfirmedTime(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px",
              border: `1.5px solid ${C.border}`,
              borderRadius: 7,
              fontSize: 14,
              color: C.text,
              background: C.surface,
              outline: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
            onFocus={(e) => (e.target.style.borderColor = C.amber)}
            onBlur={(e) => (e.target.style.borderColor = C.border)}
          />
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
            Exact time customer will arrive — shown on the card
          </div>
        </div>
      )}
      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Notes (optional)</FieldLabel>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Customer asked to check AC also…"
          rows={2}
          style={{
            width: "100%",
            padding: "9px 12px",
            border: `1.5px solid ${nf ? C.amber : C.border}`,
            borderRadius: 7,
            fontSize: 14,
            color: C.text,
            background: C.surface,
            outline: "none",
            fontFamily: "inherit",
            resize: "vertical",
            boxSizing: "border-box",
          }}
          onFocus={() => setNf(true)}
          onBlur={() => setNf(false)}
        />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn
          v="secondary"
          onClick={onClose}
          style={{ flex: 1, justifyContent: "center" }}
        >
          Cancel
        </Btn>
        <Btn
          v="success"
          onClick={save}
          disabled={loading}
          style={{ flex: 2, justifyContent: "center" }}
        >
          {loading ? "Saving…" : "Mark Call Done"}
        </Btn>
      </div>
    </Dlg>
  );
}

// ─── Summary Strip ────────────────────────────────────────────────────────────
function SummaryStrip({ bookings, activeFilter, onFilter }) {
  const c = {
    // total excludes rescheduled — those are historical, not active for this date
    total: bookings.filter((b) => b.status !== "rescheduled").length,
    pending: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    arrived: bookings.filter((b) => b.status === "arrived").length,
    completed: bookings.filter((b) => b.status === "completed").length,
    cancelled: bookings.filter((b) =>
      ["cancelled", "no_show"].includes(b.status),
    ).length,
    rescheduled: bookings.filter((b) => b.status === "rescheduled").length,
  };
  const chips = [
    {
      key: "all",
      label: "All",
      count: c.total,
      color: C.text,
      bg: C.raised,
      border: C.border,
    },
    {
      key: "pending",
      label: "Pending",
      count: c.pending,
      color: "#D97706",
      bg: "#FFFBEB",
      border: "#FDE68A",
    },
    {
      key: "confirmed",
      label: "Confirmed",
      count: c.confirmed,
      color: C.blue,
      bg: C.blueLight,
      border: "#BFDBFE",
    },
    {
      key: "arrived",
      label: "Arrived",
      count: c.arrived,
      color: C.green,
      bg: C.greenLight,
      border: "#6EE7B7",
    },
    {
      key: "completed",
      label: "Done",
      count: c.completed,
      color: "#0F766E",
      bg: "#CCFBF1",
      border: "#5EEAD4",
    },
    {
      key: "rescheduled",
      label: "Rescheduled",
      count: c.rescheduled,
      color: "#7C3AED",
      bg: "#EDE9FE",
      border: "#C4B5FD",
    },
    {
      key: "cancelled",
      label: "Cancelled",
      count: c.cancelled,
      color: C.red,
      bg: C.redLight,
      border: "#FECACA",
    },
  ];
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      {chips.map(({ key, label, count, color, bg, border }) => {
        const isActive = activeFilter === key;
        return (
          <button
            key={key}
            onClick={() => onFilter(isActive ? "all" : key)}
            style={{
              flex: 1,
              background: isActive ? color : bg,
              borderRadius: 8,
              padding: "10px 8px",
              textAlign: "center",
              border: `${isActive ? "2px" : "1px"} solid ${isActive ? color : border}`,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s",
              boxShadow: isActive ? `0 2px 8px ${color}44` : "none",
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: isActive ? "#fff" : color,
                fontFamily: "'DM Mono',monospace",
                lineHeight: 1,
              }}
            >
              {count}
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: isActive ? "rgba(255,255,255,0.85)" : color,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginTop: 3,
              }}
            >
              {label}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Date Nav ─────────────────────────────────────────────────────────────────
function DateNav({ viewDate, onDateChange }) {
  const t = todayIST(),
    tom = tomorrowIST(),
    yest = yesterdayIST();
  const NavBtn = ({ dir }) => (
    <button
      onClick={() => onDateChange(shiftDate(viewDate, dir === -1 ? -1 : 1))}
      style={{
        width: 34,
        height: 34,
        border: `1px solid ${C.border}`,
        background: C.surface,
        borderRadius: 7,
        cursor: "pointer",
        fontWeight: 700,
        color: C.textSec,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {dir === -1 ? "←" : "→"}
    </button>
  );
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
      }}
    >
      <NavBtn dir={-1} />
      <div style={{ flex: 1, display: "flex", gap: 6 }}>
        {[
          [yest, "Yesterday"],
          [t, "Today"],
          [tom, "Tomorrow"],
        ].map(([d, lbl]) => (
          <button
            key={d}
            onClick={() => onDateChange(d)}
            style={{
              flex: 1,
              padding: "7px 6px",
              border: `1.5px solid ${viewDate === d ? C.amber : C.border}`,
              background: viewDate === d ? C.amberLight : C.surface,
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
              color: viewDate === d ? C.amberDark : C.textSec,
              transition: "all 0.12s",
            }}
          >
            <div>{lbl}</div>
            <div style={{ fontSize: 10, opacity: 0.65, marginTop: 1 }}>
              {fmtDate(d)}
            </div>
          </button>
        ))}
      </div>
      <input
        type="date"
        value={viewDate}
        onChange={(e) => onDateChange(e.target.value)}
        style={{
          padding: "7px 10px",
          border: `1px solid ${C.border}`,
          borderRadius: 7,
          fontSize: 12,
          background: C.surface,
          color: C.text,
          cursor: "pointer",
        }}
      />
      <NavBtn dir={1} />
    </div>
  );
}

// ─── Receptionist Daily Strip ─────────────────────────────────────────────────
function DailyStrip({ bookings, user }) {
  const today = todayIST();
  const expectedToday = bookings.filter(
    (b) =>
      (b.preferred_date || "").substring(0, 10) === today &&
      b.status !== "rescheduled",
  ).length;
  const arrivedToday = bookings.filter(
    (b) =>
      (b.preferred_date || "").substring(0, 10) === today &&
      ["arrived", "completed"].includes(b.status),
  ).length;
  // Registered by me today: contact_person contains my name AND created_at is today
  const myName = (user?.full_name || "").toLowerCase().trim();
  const registeredToday = bookings.filter((b) => {
    if (!b.created_at) return false;
    const createdDate = new Date(toZ(b.created_at)).toLocaleDateString(
      "en-CA",
      { timeZone: "Asia/Kolkata" },
    );
    if (createdDate !== today) return false;
    if (!b.contact_person) return false;
    // Match if receptionist's name appears anywhere in contact_person
    const cp = b.contact_person.toLowerCase();
    const firstName = myName.split(" ")[0];
    return (
      cp.includes(myName) || (firstName.length > 2 && cp.includes(firstName))
    );
  }).length;

  const doneToday = bookings.filter(
    (b) =>
      (b.preferred_date || "").substring(0, 10) === today &&
      b.status === "completed",
  ).length;

  const items = [
    {
      label: "Expected Today",
      value: expectedToday,
      color: C.blue,
      bg: C.blueLight,
      border: "#BFDBFE",
    },
    {
      label: "Arrived / Done",
      value: `${arrivedToday} / ${doneToday}`,
      color: C.green,
      bg: C.greenLight,
      border: "#6EE7B7",
    },
    {
      label: "Registered by Me",
      value: registeredToday,
      color: C.purple,
      bg: C.purpleLight,
      border: "#C4B5FD",
    },
  ];

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      {items.map(({ label, value, color, bg, border }) => (
        <div
          key={label}
          style={{
            flex: 1,
            background: bg,
            border: `1px solid ${border}`,
            borderRadius: 9,
            padding: "11px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              color,
              fontFamily: "'DM Mono',monospace",
              lineHeight: 1,
            }}
          >
            {value}
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color,
              textTransform: "uppercase",
              letterSpacing: "0.4px",
              lineHeight: 1.4,
            }}
          >
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── SCHEDULE TAB ─────────────────────────────────────────────────────────────
function ScheduleTab({
  bookings,
  user,
  viewDate,
  onDateChange,
  onAction,
  activityMap,
}) {
  const t = todayIST();
  const [statusFilter, setStatusFilter] = useState("all");
  useEffect(() => {
    setStatusFilter("all");
  }, [viewDate]);

  const dayBks = bookings
    .filter((b) => (b.preferred_date || "").substring(0, 10) === viewDate)
    .sort((a, b) =>
      (a.preferred_time || "z").localeCompare(b.preferred_time || "z"),
    );
  const filteredBks =
    statusFilter === "all"
      ? dayBks.filter((b) => b.status !== "rescheduled") // hide rescheduled from "all" — use filter chip to see them
      : statusFilter === "cancelled"
        ? dayBks.filter((b) => ["cancelled", "no_show"].includes(b.status))
        : dayBks.filter((b) => b.status === statusFilter);
  const dateLabel =
    viewDate === t
      ? "Today"
      : viewDate === tomorrowIST()
        ? "Tomorrow"
        : fmtDateFull(viewDate);

  return (
    <div>
      <DateNav viewDate={viewDate} onDateChange={onDateChange} />
      {viewDate === t && <DailyStrip bookings={bookings} user={user} />}
      {dayBks.length > 0 && (
        <SummaryStrip
          bookings={dayBks}
          activeFilter={statusFilter}
          onFilter={setStatusFilter}
        />
      )}
      {statusFilter !== "all" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
            padding: "7px 12px",
            background: C.amberLight,
            borderRadius: 8,
            border: `1px solid ${C.amberDark}22`,
            fontSize: 12,
            fontWeight: 700,
            color: C.amberDark,
          }}
        >
          <span>
            🔍 Showing only: {STATUS[statusFilter]?.label || statusFilter}
          </span>
          <button
            onClick={() => setStatusFilter("all")}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: C.amberDark,
              fontWeight: 800,
              fontSize: 14,
              padding: "0 4px",
            }}
          >
            ✕
          </button>
        </div>
      )}
      {dayBks.length === 0 ? (
        <Empty
          icon="📅"
          text={`No bookings for ${dateLabel}`}
          sub="Open the Booking Page link to schedule a new appointment"
        />
      ) : filteredBks.length === 0 ? (
        <Empty
          icon="🔍"
          text={`No ${STATUS[statusFilter]?.label || statusFilter} bookings for ${dateLabel}`}
          sub="Click a different filter above or clear it"
        />
      ) : (
        <>
          {TIME_SLOTS.map((slot) => {
            const slotBks = filteredBks.filter(
              (b) => b.preferred_time === slot,
            );
            if (!slotBks.length) return null;
            return (
              <div key={slot} style={{ marginBottom: 20 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: C.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.6px",
                    }}
                  >
                    {TIME_LABELS[slot]}
                  </span>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                  <span
                    style={{
                      background: C.raised,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      padding: "2px 8px",
                      fontSize: 10,
                      fontWeight: 700,
                      color: C.textSec,
                    }}
                  >
                    {slotBks.length}
                  </span>
                </div>
                {slotBks.map((b) => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    user={user}
                    onAction={onAction}
                    activityMeta={activityMap[b.id]}
                  />
                ))}
              </div>
            );
          })}
          {(() => {
            const noSlot = filteredBks.filter((b) => !b.preferred_time);
            if (!noSlot.length) return null;
            return (
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: C.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.6px",
                    }}
                  >
                    No Time Preference
                  </span>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                  <span
                    style={{
                      background: C.raised,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      padding: "2px 8px",
                      fontSize: 10,
                      fontWeight: 700,
                      color: C.textSec,
                    }}
                  >
                    {noSlot.length}
                  </span>
                </div>
                {noSlot.map((b) => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    user={user}
                    onAction={onAction}
                    activityMeta={activityMap[b.id]}
                  />
                ))}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

// ─── ALL BOOKINGS TAB ─────────────────────────────────────────────────────────
function AllBookingsTab({ bookings, user, onAction, activityMap }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sfocus, setSfocus] = useState(false);
  const filtered = useMemo(() => {
    let bs = [...bookings];
    if (search.trim()) {
      const q = search.toLowerCase();
      bs = bs.filter((b) =>
        `${b.vehicle_number} ${b.customer_name || ""} ${b.customer_phone || ""}`
          .toLowerCase()
          .includes(q),
      );
    }
    if (status !== "all") bs = bs.filter((b) => b.status === status);
    if (from)
      bs = bs.filter((b) => (b.preferred_date || "").substring(0, 10) >= from);
    if (to)
      bs = bs.filter((b) => (b.preferred_date || "").substring(0, 10) <= to);
    if (status === "all") bs = bs.filter((b) => b.status !== "rescheduled");
    return bs.sort(
      (a, b) =>
        (b.preferred_date || "")
          .substring(0, 10)
          .localeCompare((a.preferred_date || "").substring(0, 10)) ||
        (a.preferred_time || "z").localeCompare(b.preferred_time || "z"),
    );
  }, [bookings, search, status, from, to]);
  return (
    <div>
      <div
        style={{
          background: C.surface,
          borderRadius: 10,
          padding: "14px 16px",
          marginBottom: 14,
          boxShadow: C.shadow,
          border: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 200px", position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 11,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 14,
                color: C.textMuted,
              }}
            >
              🔍
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vehicle, name, phone…"
              style={{
                width: "100%",
                padding: "8px 12px 8px 34px",
                border: `1.5px solid ${sfocus ? C.amber : C.border}`,
                borderRadius: 7,
                fontSize: 13,
                fontFamily: "inherit",
                background: C.surface,
                color: C.text,
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={() => setSfocus(true)}
              onBlur={() => setSfocus(false)}
            />
          </div>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            style={{
              padding: "8px 10px",
              border: `1px solid ${C.border}`,
              borderRadius: 7,
              fontSize: 12,
              background: C.surface,
              color: C.text,
            }}
          />
          <span
            style={{ color: C.textMuted, alignSelf: "center", fontSize: 12 }}
          >
            →
          </span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={{
              padding: "8px 10px",
              border: `1px solid ${C.border}`,
              borderRadius: 7,
              fontSize: 12,
              background: C.surface,
              color: C.text,
            }}
          />
          {(from || to || search) && (
            <Btn
              v="ghost"
              sz="sm"
              onClick={() => {
                setFrom("");
                setTo("");
                setSearch("");
              }}
              style={{ color: C.red }}
            >
              ✕ Clear
            </Btn>
          )}
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {[
            "all",
            "pending",
            "confirmed",
            "arrived",
            "completed",
            "rescheduled",
            "cancelled",
            "no_show",
          ].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              style={{
                padding: "4px 12px",
                borderRadius: 20,
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 12,
                fontWeight: 700,
                transition: "all 0.12s",
                border: `1px solid ${status === s ? C.amber : C.border}`,
                background: status === s ? C.amber : C.surface,
                color: status === s ? "#fff" : C.textSec,
              }}
            >
              {s === "all" ? "All" : STATUS[s]?.label || s}
              {s !== "all" &&
                ` (${s === "cancelled" ? bookings.filter((b) => ["cancelled", "no_show"].includes(b.status)).length : bookings.filter((b) => b.status === s).length})`}
            </button>
          ))}
        </div>
      </div>
      <div
        style={{
          fontSize: 12,
          color: C.textMuted,
          marginBottom: 10,
          fontWeight: 600,
        }}
      >
        {filtered.length} booking{filtered.length !== 1 ? "s" : ""} found
      </div>
      {filtered.length === 0 ? (
        <Empty
          icon="🔍"
          text="No bookings match"
          sub="Try adjusting the filters"
        />
      ) : (
        filtered.map((b) => (
          <BookingCard
            key={b.id}
            booking={b}
            user={user}
            onAction={onAction}
            showDate={true}
            activityMeta={activityMap[b.id]}
          />
        ))
      )}
    </div>
  );
}

// ─── CALL QUEUE TAB ───────────────────────────────────────────────────────────
function CallQueueTab({ bookings, user, onAction, activityMap }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [sfocus, setSfocus] = useState(false);

  useEffect(() => {
    supabase
      .from("booking_activities")
      .select("booking_id,created_at,activity_type,notes")
      .in("activity_type", ["no_answer", "rescheduled", "call_done"])
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error);
        setActivities(data || []);
        setLoading(false);
      });
  }, [bookings]);

  const actByBooking = {};
  activities.forEach((a) => {
    if (!actByBooking[a.booking_id]) actByBooking[a.booking_id] = [];
    actByBooking[a.booking_id].push(a);
  });

  const today = todayIST(),
    tomorrow = tomorrowIST();

  // Section 1: Tomorrow confirmed — highest priority (reminder calls)
  const tomorrowConfirmed = bookings
    .filter(
      (b) =>
        b.status === "confirmed" &&
        b.status !== "rescheduled" &&
        (b.preferred_date || "").substring(0, 10) === tomorrow,
    )
    .sort((a, b) =>
      (a.preferred_time || "z").localeCompare(b.preferred_time || "z"),
    );

  // Section 2: Pending — first call needed (no call_done or no_answer yet)
  const unconfirmed = bookings
    .filter((b) => {
      if (b.status !== "pending") return false;
      if ((b.preferred_date || "").substring(0, 10) < today) return false;
      const bkActs = actByBooking[b.id] || [];
      // Exclude if call_done already logged — call is complete
      if (bkActs.some((a) => a.activity_type === "call_done")) return false;
      // Exclude if no_answer already logged — goes to Callbacks section
      return !bkActs.some((a) => a.activity_type === "no_answer");
    })
    .sort(
      (a, b) =>
        (a.preferred_date || "").localeCompare(b.preferred_date || "") ||
        (a.preferred_time || "z").localeCompare(b.preferred_time || "z"),
    );

  // Section 3: No-answer callbacks — most recent tracked activity is no_answer
  const callbacks = bookings
    .filter((b) => {
      if (!["pending", "confirmed"].includes(b.status)) return false;
      // Skip if call_done has been logged — call is complete
      const bkActs = actByBooking[b.id] || [];
      if (!bkActs.length) return false;
      if (bkActs.some((a) => a.activity_type === "call_done")) return false;
      return (
        bkActs.some((a) => a.activity_type === "no_answer") &&
        bkActs[0].activity_type === "no_answer"
      );
    })
    .sort((a, b) => {
      const aT =
        (actByBooking[a.id] || []).find((x) => x.activity_type === "no_answer")
          ?.created_at || "";
      const bT =
        (actByBooking[b.id] || []).find((x) => x.activity_type === "no_answer")
          ?.created_at || "";
      return aT.localeCompare(bT);
    });

  // Section 4: No-show follow-up
  const missed = bookings
    .filter((b) => b.status === "no_show" && !b.vehicle_id)
    .sort((a, b) =>
      (a.preferred_date || "").localeCompare(b.preferred_date || ""),
    );

  const applySearch = (list) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((b) =>
      `${b.vehicle_number} ${b.customer_name || ""} ${b.customer_phone || ""}`
        .toLowerCase()
        .includes(q),
    );
  };

  const sections = [
    {
      key: "tomorrow",
      label: "Tomorrow",
      count: tomorrowConfirmed.length,
      color: C.blue,
      icon: "🔵",
    },
    {
      key: "first",
      label: "First Call",
      count: unconfirmed.length,
      color: C.red,
      icon: "🔴",
    },
    {
      key: "callback",
      label: "Callback",
      count: callbacks.length,
      color: C.amberDark,
      icon: "🟡",
    },
    {
      key: "missed",
      label: "Missed",
      count: missed.length,
      color: "#374151",
      icon: "⚫",
    },
  ];
  const totalQueue =
    tomorrowConfirmed.length +
    unconfirmed.length +
    callbacks.length +
    missed.length;

  const SectionHeader = ({ icon, title, count, color, bg, border, desc }) => (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 10,
        padding: "12px 16px",
        marginBottom: 12,
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 3,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 800, color }}>{title}</span>
          <span
            style={{
              background: color + "22",
              color,
              borderRadius: 10,
              padding: "1px 8px",
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            {count}
          </span>
        </div>
        <div style={{ fontSize: 12, color: C.textSec }}>{desc}</div>
      </div>
    </div>
  );

  if (loading)
    return (
      <div style={{ textAlign: "center", padding: 48, color: C.textMuted }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>Loading call
        queue…
      </div>
    );

  return (
    <div>
      <div
        style={{
          background: C.surface,
          borderRadius: 10,
          padding: "14px 16px",
          marginBottom: 16,
          boxShadow: C.shadow,
          border: `1px solid ${C.border}`,
        }}
      >
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 11,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 14,
                color: C.textMuted,
              }}
            >
              🔍
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vehicle, name, phone…"
              style={{
                width: "100%",
                padding: "8px 12px 8px 34px",
                border: `1.5px solid ${sfocus ? C.amber : C.border}`,
                borderRadius: 7,
                fontSize: 13,
                fontFamily: "inherit",
                background: C.surface,
                color: C.text,
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={() => setSfocus(true)}
              onBlur={() => setSfocus(false)}
            />
          </div>
          {search && (
            <Btn
              v="ghost"
              sz="sm"
              onClick={() => setSearch("")}
              style={{ color: C.red }}
            >
              ✕
            </Btn>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            onClick={() => setSectionFilter("all")}
            style={{
              padding: "4px 14px",
              borderRadius: 20,
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: 700,
              border: `1px solid ${sectionFilter === "all" ? C.amber : C.border}`,
              background: sectionFilter === "all" ? C.amber : C.surface,
              color: sectionFilter === "all" ? "#fff" : C.textSec,
            }}
          >
            All ({totalQueue})
          </button>
          {sections.map(({ key, label, count, color, icon }) => (
            <button
              key={key}
              onClick={() =>
                setSectionFilter(sectionFilter === key ? "all" : key)
              }
              style={{
                padding: "4px 14px",
                borderRadius: 20,
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 12,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 5,
                border: `1px solid ${sectionFilter === key ? color : C.border}`,
                background: sectionFilter === key ? color + "18" : C.surface,
                color: sectionFilter === key ? color : C.textSec,
              }}
            >
              <span>{icon}</span>
              {label} ({count})
            </button>
          ))}
        </div>
      </div>

      {totalQueue === 0 && !search ? (
        <Empty
          icon="🎉"
          text="All caught up!"
          sub="No pending calls right now"
        />
      ) : (
        <>
          {(sectionFilter === "all" || sectionFilter === "tomorrow") &&
            (() => {
              const list = applySearch(tomorrowConfirmed);
              if (!list.length) return null;
              return (
                <div style={{ marginBottom: 28 }}>
                  <SectionHeader
                    icon="🔵"
                    title="Tomorrow's Reminders"
                    count={list.length}
                    color={C.blue}
                    bg={C.blueLight}
                    border="#BFDBFE"
                    desc={`Confirmed for ${fmtDateFull(tomorrow)} — call to remind and confirm arrival.`}
                  />
                  {list.map((b) => (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      user={user}
                      onAction={onAction}
                      showDate={false}
                      activityMeta={activityMap[b.id]}
                    />
                  ))}
                </div>
              );
            })()}

          {(sectionFilter === "all" || sectionFilter === "first") &&
            (() => {
              const list = applySearch(unconfirmed);
              if (!list.length) return null;
              return (
                <div style={{ marginBottom: 28 }}>
                  <SectionHeader
                    icon="🔴"
                    title="First Call Needed"
                    count={list.length}
                    color={C.red}
                    bg={C.redLight}
                    border="#FECACA"
                    desc="Pending bookings not yet called — call to confirm appointment."
                  />
                  {list.map((b) => (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      user={user}
                      onAction={onAction}
                      showDate={true}
                      activityMeta={activityMap[b.id]}
                    />
                  ))}
                </div>
              );
            })()}

          {(sectionFilter === "all" || sectionFilter === "callback") &&
            (() => {
              const list = applySearch(callbacks);
              if (!list.length) return null;
              return (
                <div style={{ marginBottom: 28 }}>
                  <SectionHeader
                    icon="🟡"
                    title="No-Answer — Retry"
                    count={list.length}
                    color={C.amberDark}
                    bg={C.amberLight}
                    border="#FDE68A"
                    desc="Previously called with no answer. Oldest attempts shown first."
                  />
                  {list.map((b) => {
                    const la = (actByBooking[b.id] || []).find(
                      (a) => a.activity_type === "no_answer",
                    );
                    return (
                      <div key={b.id}>
                        {la && (
                          <div
                            style={{
                              fontSize: 11,
                              color: C.textMuted,
                              fontWeight: 700,
                              marginBottom: 4,
                              paddingLeft: 4,
                            }}
                          >
                            📵 Last attempt: {fmtIST(la.created_at)}
                          </div>
                        )}
                        <BookingCard
                          booking={b}
                          user={user}
                          onAction={onAction}
                          showDate={true}
                          activityMeta={activityMap[b.id]}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })()}

          {(sectionFilter === "all" || sectionFilter === "missed") &&
            (() => {
              const list = applySearch(missed);
              if (!list.length) return null;
              return (
                <div style={{ marginBottom: 28 }}>
                  <SectionHeader
                    icon="⚫"
                    title="Missed — Follow Up"
                    count={list.length}
                    color="#374151"
                    bg="#F9FAFB"
                    border="#E5E7EB"
                    desc="Bookings where customer didn't arrive. Call to reschedule or cancel."
                  />
                  {list.map((b) => (
                    <div key={b.id}>
                      <div
                        style={{
                          fontSize: 11,
                          color: C.textMuted,
                          fontWeight: 700,
                          marginBottom: 4,
                          paddingLeft: 4,
                        }}
                      >
                        📅 Was scheduled: {fmtDateFull(b.preferred_date)}
                        {b.preferred_time
                          ? `  ${TIME_LABELS[b.preferred_time] || b.preferred_time}`
                          : ""}
                      </div>
                      <BookingCard
                        booking={b}
                        user={user}
                        onAction={onAction}
                        showDate={false}
                        activityMeta={activityMap[b.id]}
                      />
                    </div>
                  ))}
                </div>
              );
            })()}

          {search &&
            applySearch([
              ...tomorrowConfirmed,
              ...unconfirmed,
              ...callbacks,
              ...missed,
            ]).length === 0 && (
              <Empty
                icon="🔍"
                text="No results"
                sub={`No bookings match "${search}" in the current queue`}
              />
            )}
        </>
      )}
    </div>
  );
}

// ─── STATS TAB ────────────────────────────────────────────────────────────────
function StatsTab({ bookings, user }) {
  const t = todayIST();
  const [period, setPeriod] = useState("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [scope, setScope] = useState("all");
  const [myBookingIds, setMyBookingIds] = useState(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    if (scope !== "mine" || myBookingIds !== null) return;
    supabase
      .from("booking_activities")
      .select("booking_id")
      .eq("user_id", user.id)
      .then(({ data }) =>
        setMyBookingIds([...new Set((data || []).map((a) => a.booking_id))]),
      );
  }, [scope, user.id, myBookingIds]);

  const scopedBookings = useMemo(() => {
    if (scope === "all") return bookings;
    if (!myBookingIds) return [];
    return bookings.filter((b) => myBookingIds.includes(b.id));
  }, [bookings, scope, myBookingIds]);

  const bks = useMemo(() => {
    if (period === "all") return scopedBookings;
    if (period === "today")
      return scopedBookings.filter(
        (b) => (b.preferred_date || "").substring(0, 10) === t,
      );
    const from =
      period === "7d"
        ? shiftDate(t, -6)
        : period === "30d"
          ? shiftDate(t, -29)
          : customFrom;
    const to2 = period === "custom" ? customTo : t;
    return scopedBookings.filter((b) => {
      const d = (b.preferred_date || "").substring(0, 10);
      return (!from || d >= from) && (!to2 || d <= to2);
    });
  }, [scopedBookings, period, customFrom, customTo, t]);

  const activeBks = bks.filter((b) => b.status !== "rescheduled");
  const total = activeBks.length,
    pending = activeBks.filter((b) => b.status === "pending").length,
    confirmed = activeBks.filter((b) =>
      ["confirmed", "arrived", "completed"].includes(b.status),
    ).length,
    arrived = activeBks.filter((b) =>
      ["arrived", "completed"].includes(b.status),
    ).length,
    cancelled = activeBks.filter((b) => b.status === "cancelled").length,
    noshow = activeBks.filter((b) => b.status === "no_show").length;
  const convRate = total ? Math.round((arrived / total) * 100) : 0,
    noshowRate = total ? Math.round((noshow / total) * 100) : 0;
  const myName = (user?.full_name || "").toLowerCase().trim();
  const firstName = myName.split(" ")[0];
  const registeredByMe = bks.filter((b) => {
    if (!b.contact_person) return false;
    const cp = b.contact_person.toLowerCase();
    return (
      cp.includes(myName) || (firstName.length > 2 && cp.includes(firstName))
    );
  }).length;

  const svcMap = {};
  bks.forEach((b) => {
    if (b.service_type)
      svcMap[b.service_type] = (svcMap[b.service_type] || 0) + 1;
  });
  const svcEntries = Object.entries(svcMap).sort((a, b) => b[1] - a[1]);

  const chartEnd = period === "custom" && customTo ? customTo : t;
  const chartStart = shiftDate(chartEnd, -6);
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(
      new Date(chartEnd + "T12:00:00").getTime() - (6 - i) * 86400000,
    );
    const k = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const day = d.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
    });
    const src =
      scope === "all"
        ? bookings
        : bookings.filter((b) => myBookingIds?.includes(b.id));
    const db = src.filter(
      (b) => (b.preferred_date || "").substring(0, 10) === k,
    );
    return {
      date: k,
      day,
      total: db.length,
      pending: db.filter((b) => b.status === "pending").length,
      confirmed: db.filter((b) => b.status === "confirmed").length,
      arrived: db.filter((b) => ["arrived", "completed"].includes(b.status))
        .length,
      cancelled: db.filter((b) => ["cancelled", "no_show"].includes(b.status))
        .length,
    };
  });
  const maxDay = Math.max(...last7.map((d) => d.total), 1);
  const periodLabel = {
    all: "All Time",
    today: "Today",
    "7d": "Last 7 Days",
    "30d": "Last 30 Days",
    custom: "Custom Range",
  }[period];
  const scopeLabel =
    scope === "all"
      ? "All Receptionists"
      : `My Activity (${user?.full_name || "You"})`;
  const loadingMine = scope === "mine" && myBookingIds === null;

  const Card = ({ children, style = {} }) => (
    <div
      style={{
        background: C.surface,
        borderRadius: 10,
        padding: "18px 20px",
        marginBottom: 14,
        boxShadow: C.shadow,
        border: `1px solid ${C.border}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
  const CardTitle = ({ children }) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: `2px solid ${C.amber}`,
        paddingBottom: 8,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: C.textSec,
          textTransform: "uppercase",
          letterSpacing: "0.6px",
        }}
      >
        {children}
      </div>
    </div>
  );

  return (
    <div>
      <div
        style={{
          background: C.surface,
          borderRadius: 10,
          padding: "14px 16px",
          marginBottom: 14,
          boxShadow: C.shadow,
          border: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: C.textSec,
            textTransform: "uppercase",
            letterSpacing: "0.6px",
            marginBottom: 10,
          }}
        >
          View
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            ["all", "🏢 All Receptionists"],
            ["mine", "👤 My Activity"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setScope(key)}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: 8,
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: 700,
                border: `2px solid ${scope === key ? C.amber : C.border}`,
                background: scope === key ? C.amberLight : C.surface,
                color: scope === key ? C.amberDark : C.textSec,
                transition: "all 0.15s",
                boxShadow: scope === key ? `0 2px 8px ${C.amber}44` : "none",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {scope === "mine" && (
          <div
            style={{
              marginTop: 10,
              padding: "8px 12px",
              background: C.amberLight,
              borderRadius: 7,
              fontSize: 12,
              color: C.amberDark,
              fontWeight: 600,
            }}
          >
            📊 Showing bookings where you have logged any activity (confirmed,
            rescheduled, noted, etc.)
          </div>
        )}
      </div>
      <div
        style={{
          background: C.surface,
          borderRadius: 10,
          padding: "14px 16px",
          marginBottom: 14,
          boxShadow: C.shadow,
          border: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: C.textSec,
            textTransform: "uppercase",
            letterSpacing: "0.6px",
            marginBottom: 10,
          }}
        >
          Date Period
        </div>
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginBottom: period === "custom" ? 12 : 0,
          }}
        >
          {[
            ["all", "All Time"],
            ["today", "Today"],
            ["7d", "Last 7 Days"],
            ["30d", "Last 30 Days"],
            ["custom", "Custom"],
          ].map(([key, lbl]) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              style={{
                padding: "5px 14px",
                borderRadius: 20,
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 12,
                fontWeight: 700,
                transition: "all 0.12s",
                border: `1px solid ${period === key ? C.amber : C.border}`,
                background: period === key ? C.amber : C.surface,
                color: period === key ? "#fff" : C.textSec,
              }}
            >
              {lbl}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 12, color: C.textSec, fontWeight: 600 }}>
              From
            </span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              style={{
                padding: "6px 10px",
                border: `1px solid ${C.border}`,
                borderRadius: 7,
                fontSize: 12,
                background: C.surface,
                color: C.text,
              }}
            />
            <span style={{ fontSize: 12, color: C.textSec }}>→</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              style={{
                padding: "6px 10px",
                border: `1px solid ${C.border}`,
                borderRadius: 7,
                fontSize: 12,
                background: C.surface,
                color: C.text,
              }}
            />
            {(customFrom || customTo) && (
              <button
                onClick={() => {
                  setCustomFrom("");
                  setCustomTo("");
                }}
                style={{
                  padding: "6px 10px",
                  border: `1px solid ${C.border}`,
                  borderRadius: 7,
                  background: C.surface,
                  cursor: "pointer",
                  fontSize: 12,
                  color: C.red,
                  fontFamily: "inherit",
                  fontWeight: 600,
                }}
              >
                ✕ Clear
              </button>
            )}
          </div>
        )}
      </div>
      {loadingMine ? (
        <div style={{ textAlign: "center", padding: 48, color: C.textMuted }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>Loading your
          activity…
        </div>
      ) : (
        <>
          <div
            style={{
              fontSize: 12,
              color: C.textMuted,
              fontWeight: 600,
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>📊</span>
            <span>
              {scopeLabel} · {periodLabel} · {total} booking
              {total !== 1 ? "s" : ""}
            </span>
            <Btn
              v="ghost"
              sz="sm"
              onClick={() => setShowReport(true)}
              style={{
                marginLeft: "auto",
                color: C.green,
                border: `1px solid #6EE7B7`,
                background: C.greenLight,
              }}
            >
              Export Report
            </Btn>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 12,
              marginBottom: 14,
            }}
          >
            {[
              {
                icon: "📅",
                label: "Total Bookings",
                value: total,
                color: C.text,
                sub: periodLabel,
              },
              {
                icon: "✅",
                label: "Conversion Rate",
                value: `${convRate}%`,
                color: C.green,
                sub: `${arrived} of ${total} arrived`,
              },
              {
                icon: "⚫",
                label: "No-show Rate",
                value: `${noshowRate}%`,
                color: noshow > 0 ? C.red : C.green,
                sub: `${noshow} no-show event${noshow !== 1 ? "s" : ""}`,
              },
              {
                icon: "📋",
                label: "Registered by Me",
                value: registeredByMe,
                color: C.blue,
                sub: "Internal bookings I created",
              },
            ].map((k) => (
              <div
                key={k.label}
                style={{
                  background: C.surface,
                  borderRadius: 10,
                  padding: "16px 18px",
                  boxShadow: C.shadow,
                  border: `1px solid ${C.border}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: C.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {k.label}
                  </div>
                  <span style={{ fontSize: 18 }}>{k.icon}</span>
                </div>
                <div
                  style={{
                    fontSize: 30,
                    fontWeight: 800,
                    color: k.color,
                    fontFamily: "'DM Mono',monospace",
                    lineHeight: 1,
                  }}
                >
                  {k.value}
                </div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>
                  {k.sub}
                </div>
              </div>
            ))}
          </div>
          <Card>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: C.textSec,
                  textTransform: "uppercase",
                  letterSpacing: "0.6px",
                  borderBottom: `2px solid ${C.amber}`,
                  paddingBottom: 8,
                  flex: 1,
                  marginRight: 20,
                }}
              >
                Daily Bookings — {fmtDate(chartStart)} → {fmtDate(chartEnd)}
                {scope === "mine" && (
                  <span
                    style={{
                      fontSize: 10,
                      color: C.amber,
                      fontWeight: 500,
                      marginLeft: 8,
                    }}
                  >
                    · My Activity
                  </span>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  fontSize: 10,
                  flexShrink: 0,
                  paddingTop: 2,
                }}
              >
                {[
                  ["#FDE68A", "Pending"],
                  ["#93C5FD", "Confirmed"],
                  ["#6EE7B7", "Arrived"],
                  ["#FCA5A5", "Cancelled"],
                ].map(([c, l]) => (
                  <span
                    key={l}
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        background: c,
                        display: "inline-block",
                      }}
                    />
                    <span style={{ color: C.textMuted, fontWeight: 600 }}>
                      {l}
                    </span>
                  </span>
                ))}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 8,
                height: 110,
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
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: d.total > 0 ? C.text : "transparent",
                    }}
                  >
                    {d.total}
                  </div>
                  <div
                    style={{
                      width: "100%",
                      display: "flex",
                      flexDirection: "column-reverse",
                      borderRadius: 5,
                      overflow: "hidden",
                      height: `${Math.max((d.total / maxDay) * 84, d.total > 0 ? 6 : 3)}px`,
                      background: C.raised,
                    }}
                  >
                    {d.arrived > 0 && (
                      <div
                        style={{
                          height: `${(d.arrived / d.total) * 100}%`,
                          background: "#6EE7B7",
                          minHeight: 2,
                        }}
                      />
                    )}
                    {d.confirmed > 0 && (
                      <div
                        style={{
                          height: `${(d.confirmed / d.total) * 100}%`,
                          background: "#93C5FD",
                          minHeight: 2,
                        }}
                      />
                    )}
                    {d.cancelled > 0 && (
                      <div
                        style={{
                          height: `${(d.cancelled / d.total) * 100}%`,
                          background: "#FCA5A5",
                          minHeight: 2,
                        }}
                      />
                    )}
                    {d.pending > 0 && (
                      <div
                        style={{
                          height: `${(d.pending / d.total) * 100}%`,
                          background: "#FDE68A",
                          minHeight: 2,
                        }}
                      />
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: d.date === t ? 700 : 400,
                      color: d.date === t ? C.amber : C.textMuted,
                    }}
                  >
                    {d.day}
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardTitle>
              Booking Funnel{" "}
              <span
                style={{ fontSize: 10, color: C.textMuted, fontWeight: 500 }}
              >
                ({periodLabel} · {scopeLabel})
              </span>
            </CardTitle>
            {[
              ["Total Received", total, 1, "#94A3B8"],
              ["Pending", pending, pending / Math.max(total, 1), "#D97706"],
              ["Confirmed", confirmed, confirmed / Math.max(total, 1), C.blue],
              [
                "Arrived / Completed",
                arrived,
                arrived / Math.max(total, 1),
                C.green,
              ],
              ["Cancelled", cancelled, cancelled / Math.max(total, 1), C.red],
              ["No-show", noshow, noshow / Math.max(total, 1), "#6B7280"],
            ].map(([l, n, pct, c]) => (
              <div
                key={l}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: C.textSec,
                    width: 150,
                    flexShrink: 0,
                  }}
                >
                  {l}
                </span>
                <div
                  style={{
                    flex: 1,
                    background: C.raised,
                    borderRadius: 4,
                    height: 7,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.round(pct * 100)}%`,
                      height: "100%",
                      background: c,
                      borderRadius: 4,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: c,
                    width: 28,
                    textAlign: "right",
                  }}
                >
                  {n}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: C.textMuted,
                    width: 36,
                    textAlign: "right",
                  }}
                >
                  {total > 0 ? `${Math.round(pct * 100)}%` : "—"}
                </span>
              </div>
            ))}
          </Card>
          {svcEntries.length > 0 && (
            <Card>
              <CardTitle>By Service Type</CardTitle>
              {svcEntries.map(([type, n]) => (
                <div key={type} style={{ marginBottom: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{ fontSize: 13, fontWeight: 600, color: C.text }}
                    >
                      {SVC[type] || type}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: C.textSec,
                      }}
                    >
                      {n} ({total > 0 ? Math.round((n / total) * 100) : 0}%)
                    </span>
                  </div>
                  <div
                    style={{
                      height: 5,
                      background: C.raised,
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.round((n / svcEntries[0][1]) * 100)}%`,
                        height: "100%",
                        background: C.blue,
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              ))}
            </Card>
          )}
          {total === 0 && (
            <Empty
              icon="📊"
              text={
                scope === "mine"
                  ? "No activity recorded for you yet"
                  : `No bookings for ${periodLabel.toLowerCase()}`
              }
              sub={
                scope === "mine"
                  ? "Your activity will appear here once you confirm, reschedule, or add notes to bookings"
                  : period === "custom"
                    ? "Try a different date range"
                    : "Stats will appear once bookings are recorded"
              }
            />
          )}
        </>
      )}
      {showReport && (
        <BookingReportModal
          bookings={bookings}
          user={user}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}

// ─── BOOKING REPORT MODAL ─────────────────────────────────────────────────────
function BookingReportModal({ bookings, user, onClose }) {
  const [dateMode, setDateMode] = useState("tomorrow");
  const [customFrom, setCustomFrom] = useState(tomorrowIST());
  const [customTo, setCustomTo] = useState(tomorrowIST());
  const [emailTo, setEmailTo] = useState("");
  const [exporting, setExporting] = useState(false);
  const [ef, setEf] = useState(false);
  const t = todayIST(),
    tom = tomorrowIST(),
    dayAfter = shiftDate(t, 2);
  const { fromDate, toDate, modeLabel } = useMemo(() => {
    if (dateMode === "today")
      return { fromDate: t, toDate: t, modeLabel: "Today" };
    if (dateMode === "tomorrow")
      return { fromDate: tom, toDate: tom, modeLabel: "Tomorrow" };
    if (dateMode === "day_after")
      return {
        fromDate: dayAfter,
        toDate: dayAfter,
        modeLabel: fmtDateFull(dayAfter),
      };
    return {
      fromDate: customFrom,
      toDate: customTo,
      modeLabel:
        customFrom === customTo
          ? fmtDateFull(customFrom)
          : `${fmtDateFull(customFrom)} → ${fmtDateFull(customTo)}`,
    };
  }, [dateMode, customFrom, customTo, t, tom, dayAfter]);
  const filtered = useMemo(() => {
    if (!fromDate) return bookings;
    return bookings.filter((b) => {
      const d = (b.preferred_date || "").substring(0, 10);
      return d >= fromDate && d <= (toDate || fromDate);
    });
  }, [bookings, fromDate, toDate]);
  const total = filtered.length,
    arrived = filtered.filter((b) =>
      ["arrived", "completed"].includes(b.status),
    ).length,
    cancelled = filtered.filter((b) => b.status === "cancelled").length,
    noshow = filtered.filter((b) => b.status === "no_show").length,
    pending = filtered.filter((b) => b.status === "pending").length,
    confirmed = filtered.filter((b) => b.status === "confirmed").length,
    convRate = total ? Math.round((arrived / total) * 100) : 0;
  const generateFilename = () =>
    `Sheetal_Bookings_${modeLabel
      .replace(/\s+/g, "_")
      .replace(/→/g, "to")
      .replace(/[^a-zA-Z0-9_]/g, "")}.xlsx`;
  const buildWorkbook = () => {
    const wb = XLSX.utils.book_new();
    const summaryRows = [
      ["Sheetal Automobiles — Booking Report"],
      [`Date: ${modeLabel}`],
      [
        `Generated: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}   |   By: ${user?.full_name || "—"}`,
      ],
      [],
      ["Metric", "Count", "%"],
      ["Total", total, "100%"],
      [
        "Pending",
        pending,
        total ? `${Math.round((pending / total) * 100)}%` : "—",
      ],
      [
        "Confirmed",
        confirmed,
        total ? `${Math.round((confirmed / total) * 100)}%` : "—",
      ],
      [
        "Arrived",
        arrived,
        total ? `${Math.round((arrived / total) * 100)}%` : "—",
      ],
      [
        "Cancelled",
        cancelled,
        total ? `${Math.round((cancelled / total) * 100)}%` : "—",
      ],
      [
        "No Show",
        noshow,
        total ? `${Math.round((noshow / total) * 100)}%` : "—",
      ],
      [],
      ["Conversion Rate", `${convRate}%`, ""],
    ];
    const svcMap = {};
    filtered.forEach((b) => {
      if (b.service_type)
        svcMap[b.service_type] = (svcMap[b.service_type] || 0) + 1;
    });
    if (Object.keys(svcMap).length) {
      summaryRows.push([], ["Service Breakdown", ""]);
      Object.entries(svcMap)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, n]) =>
          summaryRows.push([
            SVC[type] || type,
            n,
            total ? `${Math.round((n / total) * 100)}%` : "—",
          ]),
        );
    }
    const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
    ws1["!cols"] = [{ wch: 30 }, { wch: 12 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Summary");
    const headers = [
      "Ref Number",
      "Vehicle Number",
      "Customer Name",
      "Phone",
      "Model",
      "Service Type",
      "Date",
      "Time",
      "Status",
      "Issue",
      "Referral / Via",
      "Created At",
    ];
    const rows = [...filtered]
      .sort(
        (a, b) =>
          (a.preferred_date || "").localeCompare(b.preferred_date || "") ||
          (a.preferred_time || "z").localeCompare(b.preferred_time || "z"),
      )
      .map((b) => [
        b.ref_number || "—",
        b.vehicle_number || "—",
        b.customer_name || "—",
        b.customer_phone || "—",
        b.model || "—",
        SVC[b.service_type] || b.service_type || "—",
        b.preferred_date || "—",
        TIME_LABELS[b.preferred_time] || b.preferred_time || "No preference",
        STATUS[b.status]?.label || b.status || "—",
        b.issue_description || "",
        b.contact_person || "Online Form",
        b.created_at
          ? new Date(b.created_at).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
            })
          : "—",
      ]);
    const ws2 = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws2["!cols"] = [
      { wch: 18 },
      { wch: 14 },
      { wch: 22 },
      { wch: 14 },
      { wch: 14 },
      { wch: 20 },
      { wch: 14 },
      { wch: 16 },
      { wch: 12 },
      { wch: 30 },
      { wch: 24 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, ws2, "Bookings");
    return wb;
  };
  const handleDownload = () => {
    setExporting(true);
    try {
      XLSX.writeFile(buildWorkbook(), generateFilename());
    } catch (e) {
      console.error(e);
      alert("Export failed.");
    } finally {
      setExporting(false);
    }
  };
  const handleEmail = () => {
    const lines = [
      `Booking Report — ${modeLabel}`,
      `By: ${user?.full_name || "Receptionist"}`,
      `On: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
      "",
      `Total: ${total}  |  Pending: ${pending}  |  Confirmed: ${confirmed}`,
      `Arrived: ${arrived}  |  Cancelled: ${cancelled}  |  No Show: ${noshow}`,
      ``,
      `Conversion Rate: ${convRate}%`,
      ``,
      `Download Excel from Receptionist Dashboard (Stats → Export) for full list.`,
      "",
      "Sheetal Automobiles, Malegaon — Tata Motors Authorized Service Center",
    ];
    window.location.href = `mailto:${emailTo.trim()}?subject=${encodeURIComponent(`Sheetal Bookings — ${modeLabel}`)}&body=${encodeURIComponent(lines.join("\n"))}`;
  };
  return (
    <Dlg
      open={true}
      onClose={onClose}
      title="📤 Export Booking Report"
      subtitle="Select date range, then download or email"
      width={500}
    >
      <div
        style={{
          background: C.raised,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "14px 16px",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: C.textSec,
            textTransform: "uppercase",
            letterSpacing: "0.6px",
            marginBottom: 12,
          }}
        >
          📅 Select Date
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: 8,
            marginBottom: dateMode === "custom" ? 12 : 0,
          }}
        >
          {[
            ["today", "Today", fmtDate(t)],
            ["tomorrow", "Tomorrow", fmtDate(tom)],
            ["day_after", "Day After", fmtDate(dayAfter)],
            ["custom", "Custom", "Pick dates"],
          ].map(([key, label, sub]) => (
            <button
              key={key}
              onClick={() => setDateMode(key)}
              style={{
                padding: "9px 6px",
                borderRadius: 8,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "center",
                border: `1.5px solid ${dateMode === key ? C.amber : C.border}`,
                background: dateMode === key ? C.amberLight : C.surface,
                transition: "all 0.12s",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: dateMode === key ? C.amberDark : C.text,
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: dateMode === key ? C.amberDark : C.textMuted,
                  marginTop: 2,
                }}
              >
                {sub}
              </div>
            </button>
          ))}
        </div>
        {dateMode === "custom" && (
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 12, color: C.textSec, fontWeight: 600 }}>
              From
            </span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              style={{
                padding: "7px 10px",
                border: `1px solid ${C.border}`,
                borderRadius: 7,
                fontSize: 12,
                background: C.surface,
                color: C.text,
                flex: 1,
              }}
            />
            <span style={{ fontSize: 12, color: C.textSec }}>→</span>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              onChange={(e) => setCustomTo(e.target.value)}
              style={{
                padding: "7px 10px",
                border: `1px solid ${C.border}`,
                borderRadius: 7,
                fontSize: 12,
                background: C.surface,
                color: C.text,
                flex: 1,
              }}
            />
          </div>
        )}
      </div>
      <div
        style={{
          background: C.raised,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "14px 16px",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: C.textSec,
            textTransform: "uppercase",
            letterSpacing: "0.6px",
            marginBottom: 10,
          }}
        >
          Preview — {modeLabel}
        </div>
        {total === 0 ? (
          <div
            style={{
              fontSize: 13,
              color: C.textMuted,
              textAlign: "center",
              padding: "12px 0",
            }}
          >
            No bookings in this range
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6,1fr)",
              gap: 6,
            }}
          >
            {[
              { l: "Total", v: total, c: C.text },
              { l: "Pending", v: pending, c: "#D97706" },
              { l: "Confirmed", v: confirmed, c: C.blue },
              { l: "Arrived", v: arrived, c: C.green },
              { l: "Cancelled", v: cancelled, c: C.red },
              { l: "No Show", v: noshow, c: C.textSec },
            ].map(({ l, v, c }) => (
              <div
                key={l}
                style={{
                  textAlign: "center",
                  background: C.surface,
                  borderRadius: 6,
                  padding: "7px 3px",
                  border: `1px solid ${C.border}`,
                }}
              >
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    color: c,
                    fontFamily: "'DM Mono',monospace",
                    lineHeight: 1,
                  }}
                >
                  {v}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: C.textMuted,
                    textTransform: "uppercase",
                    marginTop: 3,
                  }}
                >
                  {l}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div
        style={{
          background: C.greenLight,
          border: `1px solid #6EE7B7`,
          borderRadius: 10,
          padding: "14px 16px",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#065F46",
            marginBottom: 4,
          }}
        >
          📥 Download Excel
        </div>
        <div style={{ fontSize: 12, color: "#047857", marginBottom: 10 }}>
          Two sheets: summary + full bookings list. "Referral / Via" column
          shows who referred and who filled.
        </div>
        <Btn
          v="success"
          onClick={handleDownload}
          disabled={exporting || total === 0}
          style={{ width: "100%", justifyContent: "center" }}
        >
          {exporting
            ? "Generating…"
            : total === 0
              ? "No bookings to export"
              : `📊 Download ${generateFilename()}`}
        </Btn>
      </div>
      <div
        style={{
          background: C.blueLight,
          border: `1px solid #93C5FD`,
          borderRadius: 10,
          padding: "14px 16px",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#1E40AF",
            marginBottom: 4,
          }}
        >
          📧 Email Summary to Owner
        </div>
        <div style={{ fontSize: 12, color: "#1D4ED8", marginBottom: 10 }}>
          Opens your mail app pre-filled with a text summary.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
            placeholder="owner@email.com"
            type="email"
            style={{
              flex: 1,
              padding: "9px 12px",
              border: `1.5px solid ${ef ? C.blue : "#BFDBFE"}`,
              borderRadius: 7,
              fontSize: 14,
              color: C.text,
              background: C.surface,
              outline: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
            onFocus={() => setEf(true)}
            onBlur={() => setEf(false)}
            onKeyDown={(e) =>
              e.key === "Enter" && emailTo.trim() && handleEmail()
            }
          />
          <Btn
            v="blue"
            onClick={handleEmail}
            disabled={!emailTo.trim() || total === 0}
            style={{ flexShrink: 0 }}
          >
            Send →
          </Btn>
        </div>
        <div style={{ fontSize: 11, color: "#3B82F6", marginTop: 6 }}>
          Opens your device's mail app — you confirm and send.
        </div>
      </div>
    </Dlg>
  );
}

// ─── NOTE MODAL ───────────────────────────────────────────────────────────────
function NoteModal({ booking, user, onClose, onSave }) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [nf, setNf] = useState(false);
  const save = async () => {
    if (!note.trim()) return;
    setLoading(true);
    await logAct(booking.id, user.id, "note_added", note.trim());
    onSave();
  };
  return (
    <Dlg
      open={true}
      onClose={onClose}
      title="📝 Add Note"
      subtitle={`${booking.vehicle_number} · ${booking.customer_name || "—"}`}
      width={420}
    >
      <div style={{ marginBottom: 18 }}>
        <FieldLabel required>Note</FieldLabel>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Customer said they'll arrive 30 mins late…"
          rows={3}
          autoFocus
          style={{
            width: "100%",
            padding: "9px 12px",
            border: `1.5px solid ${nf ? C.amber : C.border}`,
            borderRadius: 7,
            fontSize: 14,
            color: C.text,
            background: C.surface,
            outline: "none",
            fontFamily: "inherit",
            resize: "vertical",
            boxSizing: "border-box",
          }}
          onFocus={() => setNf(true)}
          onBlur={() => setNf(false)}
        />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn
          v="secondary"
          onClick={onClose}
          style={{ flex: 1, justifyContent: "center" }}
        >
          Cancel
        </Btn>
        <Btn
          v="primary"
          onClick={save}
          disabled={!note.trim() || loading}
          style={{ flex: 2, justifyContent: "center" }}
        >
          {loading ? "Saving…" : "Save Note"}
        </Btn>
      </div>
    </Dlg>
  );
}

// ─── RESCHEDULE MODAL ─────────────────────────────────────────────────────────
function RescheduleModal({ booking, user, onClose, onSave }) {
  const [newDate, setNewDate] = useState(tomorrowIST());
  const [newTime, setNewTime] = useState(booking.preferred_time || "");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [nf, setNf] = useState(false);
  const [dateWarn, setDateWarn] = useState(null);
  const [err, setErr] = useState("");
  const save = async () => {
    if (!newDate) return;
    if (isSaturday(newDate)) {
      setDateWarn("saturday");
      return;
    }
    setLoading(true);
    try {
      // Step 1: Generate ref for the new booking
      const ist = new Date(Date.now() + 5.5 * 3600000);
      const newRef = `BK-${ist.getUTCFullYear()}${String(ist.getUTCMonth() + 1).padStart(2, "0")}${String(ist.getUTCDate()).padStart(2, "0")}-${String(Math.floor(1000 + Math.random() * 9000))}`;

      // Step 2: Create new booking — copy all details, new date/time, link back via rescheduled_from
      const { data: newBooking, error: insertErr } = await supabase
        .from("bookings")
        .insert([
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
        ])
        .select("id")
        .single();

      if (insertErr) throw insertErr;

      // Step 3: Mark original booking as rescheduled
      const { error: updateErr } = await supabase
        .from("bookings")
        .update({ status: "rescheduled", updated_at: new Date().toISOString() })
        .eq("id", booking.id);

      if (updateErr) throw updateErr;

      // Step 4: Log activity on original booking
      const reason =
        notes ||
        `Rescheduled to ${fmtDateFull(newDate)}${newTime ? " (" + TIME_LABELS[newTime] + ")" : ""}. New ref: ${newRef}`;
      await logAct(booking.id, user.id, "rescheduled", reason, {
        old_date: booking.preferred_date,
        new_date: newDate,
      });

      // Step 5: WhatsApp to customer
      if (booking.customer_phone) {
        await sendWA(booking.customer_phone, "booking_rescheduled", [
          booking.customer_name || "Customer",
          booking.model || "your vehicle",
          booking.vehicle_number,
          fmtDateFull(newDate),
          newTime ? TIME_LABELS[newTime] : "As per availability",
          newRef,
          user.full_name || "our team",
          user.phone || "+91 90113 75450",
        ]);
      }

      onSave();
    } catch (e) {
      console.error("Reschedule failed:", e);
      setErr("Something went wrong. Please try again.");
    }
    setLoading(false);
  };
  return (
    <Dlg
      open={true}
      onClose={onClose}
      title="Reschedule Appointment"
      subtitle={`${booking.vehicle_number} · ${booking.customer_name}`}
      width={440}
    >
      <div
        style={{
          background: C.raised,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 16,
          fontSize: 13,
          color: C.textSec,
        }}
      >
        Currently: <strong>{fmtDateFull(booking.preferred_date)}</strong>
        {booking.preferred_time
          ? ` · ${TIME_LABELS[booking.preferred_time]}`
          : ""}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <div>
          <FieldLabel required>New Date</FieldLabel>
          <input
            type="date"
            value={newDate}
            min={todayIST()}
            onChange={(e) => {
              setNewDate(e.target.value);
              setDateWarn(isSaturday(e.target.value) ? "saturday" : null);
            }}
            style={{
              width: "100%",
              padding: "9px 12px",
              border: `1px solid ${dateWarn ? C.amber : C.border}`,
              borderRadius: 7,
              fontSize: 14,
              color: C.text,
              background: C.surface,
              outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => (e.target.style.borderColor = C.amber)}
            onBlur={(e) =>
              (e.target.style.borderColor = dateWarn ? C.amber : C.border)
            }
          />
          {dateWarn === "saturday" && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 5,
                marginTop: 5,
                padding: "6px 10px",
                background: C.amberLight,
                border: `1px solid #FDE68A`,
                borderRadius: 6,
                fontSize: 11,
                color: C.amberDark,
                fontWeight: 600,
              }}
            >
              🔒 Closed Saturdays — please pick a different day
            </div>
          )}
        </div>
        <div>
          <FieldLabel>New Time</FieldLabel>
          <FocusSelect
            value={newTime}
            onChange={setNewTime}
            options={[
              { value: "", label: "No preference" },
              { value: "09:00-11:00", label: "Morning (9–11 AM)" },
              { value: "11:00-13:00", label: "Mid-Day (11 AM–1 PM)" },
              { value: "14:00-16:00", label: "Afternoon (2–4 PM)" },
              { value: "16:00-18:00", label: "Evening (4–6 PM)" },
            ]}
          />
        </div>
      </div>
      <div style={{ marginBottom: 18 }}>
        <FieldLabel>Reason (optional)</FieldLabel>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Customer requested reschedule"
          style={{
            width: "100%",
            padding: "9px 12px",
            border: `1.5px solid ${nf ? C.amber : C.border}`,
            borderRadius: 7,
            fontSize: 14,
            color: C.text,
            background: C.surface,
            outline: "none",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
          onFocus={() => setNf(true)}
          onBlur={() => setNf(false)}
        />
      </div>
      {err && (
        <div
          style={{
            background: C.redLight,
            color: C.red,
            padding: "8px 12px",
            borderRadius: 7,
            fontSize: 13,
            marginBottom: 12,
            border: "1px solid #FECACA",
          }}
        >
          {err}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <Btn
          v="secondary"
          onClick={onClose}
          style={{ flex: 1, justifyContent: "center" }}
        >
          Cancel
        </Btn>
        <Btn
          v="primary"
          onClick={save}
          disabled={!newDate || loading || dateWarn === "saturday"}
          style={{ flex: 2, justifyContent: "center" }}
        >
          {loading ? "Saving…" : "Save Reschedule"}
        </Btn>
      </div>
    </Dlg>
  );
}

// ─── CANCEL MODAL ─────────────────────────────────────────────────────────────
function CancelModal({ booking, user, onClose, onSave }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [rf, setRf] = useState(false);
  const [notifyCustomer, setNotifyCustomer] = useState(
    !!booking.customer_phone,
  );
  const save = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", booking.id);
    if (!error) {
      await logAct(
        booking.id,
        user.id,
        "cancelled",
        reason || "Booking cancelled",
      );
      if (notifyCustomer && booking.customer_phone)
        await sendWA(booking.customer_phone, "booking_cancelled", [
          booking.customer_name || "Customer",
          booking.model || "your vehicle",
          booking.vehicle_number,
          booking.ref_number || "—",
        ]);
      onSave();
    }
    setLoading(false);
  };
  return (
    <Dlg
      open={true}
      onClose={onClose}
      title="Cancel Booking"
      subtitle={`${booking.vehicle_number} · ${booking.customer_name}`}
      width={420}
    >
      <div
        style={{
          background: C.redLight,
          border: "1px solid #FECACA",
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 16,
          fontSize: 13,
          color: C.red,
          fontWeight: 600,
        }}
      >
        ⚠️ This will cancel the booking. Action is logged
        {booking.customer_phone
          ? " and customer will be notified if WhatsApp is enabled below."
          : ""}
      </div>
      <div
        onClick={() =>
          booking.customer_phone && setNotifyCustomer(!notifyCustomer)
        }
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          borderRadius: 8,
          border: `1.5px solid ${notifyCustomer && booking.customer_phone ? "#86EFAC" : C.border}`,
          background:
            notifyCustomer && booking.customer_phone ? "#F0FDF4" : C.surface,
          cursor: booking.customer_phone ? "pointer" : "not-allowed",
          opacity: booking.customer_phone ? 1 : 0.5,
          marginBottom: 16,
          userSelect: "none",
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            border: `2px solid ${notifyCustomer && booking.customer_phone ? "#22C55E" : C.textMuted}`,
            background:
              notifyCustomer && booking.customer_phone
                ? "#22C55E"
                : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {notifyCustomer && booking.customer_phone && (
            <span style={{ color: "white", fontSize: 11, fontWeight: 800 }}>
              ✓
            </span>
          )}
        </div>
        <span
          style={{
            fontSize: 13,
            color: booking.customer_phone ? C.text : C.textMuted,
          }}
        >
          📱 Send cancellation WhatsApp to{" "}
          {booking.customer_phone || "— no phone on file"}
        </span>
      </div>
      <div style={{ marginBottom: 18 }}>
        <FieldLabel>Cancellation Reason (optional)</FieldLabel>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Customer called to cancel"
          style={{
            width: "100%",
            padding: "9px 12px",
            border: `1.5px solid ${rf ? C.red : C.border}`,
            borderRadius: 7,
            fontSize: 14,
            color: C.text,
            background: C.surface,
            outline: "none",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
          onFocus={() => setRf(true)}
          onBlur={() => setRf(false)}
        />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn
          v="secondary"
          onClick={onClose}
          style={{ flex: 1, justifyContent: "center" }}
        >
          Back
        </Btn>
        <Btn
          v="danger"
          onClick={save}
          disabled={loading}
          style={{ flex: 2, justifyContent: "center" }}
        >
          {loading ? "Cancelling…" : "Cancel Booking"}
        </Btn>
      </div>
    </Dlg>
  );
}

// ─── DETAIL MODAL ─────────────────────────────────────────────────────────────
function DetailModal({ booking: b, onClose }) {
  const [acts, setActs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase
      .from("booking_activities")
      .select("*,user:users!booking_activities_user_id_fkey(full_name)")
      .eq("booking_id", b.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setActs(data || []);
        setLoading(false);
      });
  }, [b.id]);
  const ACT = {
    confirmed: "✅ Confirmed",
    cancelled: "Cancelled",
    rescheduled: "Rescheduled",
    no_answer: "No Answer",
    call_done: "Call Done",
    note_added: "Note",
    arrived: "🚗 Arrived",
    completed: "🎉 Completed",
    no_show: "⚫ No Show",
    created: "📋 Created",
    edited: "Edited",
  };
  const { ref: referral, filledBy } = parseContactPerson(b.contact_person);
  const rows = [
    ["Customer", b.customer_name || "—"],
    ["Phone", b.customer_phone || "—"],
    ["Vehicle", b.vehicle_number],
    ["Model", b.model || "—"],
    ["Service", SVC[b.service_type] || b.service_type || "—"],
    ["Date", fmtDateFull(b.preferred_date)],
    ["Time", b.preferred_time ? TIME_LABELS[b.preferred_time] : "Any time"],
    ["Status", <StatusBadge status={b.status} />],
    ...(b.ref_number ? [["Reference", b.ref_number]] : []),
    ...(b.issue_description ? [["Issue", b.issue_description]] : []),
    ...(referral ? [["Referred by", referral]] : []),
    ...(filledBy ? [["Booked via", filledBy]] : []),
    ...(b.rescheduled_from
      ? [["Rescheduled From", "Original booking — see Ref for trace"]]
      : []),
  ];
  const displayActs = acts.filter((a) => !a.notes?.startsWith("Auto:"));
  return (
    <Dlg
      open={true}
      onClose={onClose}
      title="📋 Booking Details"
      subtitle={`${b.vehicle_number} · ${b.ref_number || ""}`}
      width={600}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 20,
        }}
      >
        {rows.map(([k, v]) => (
          <div
            key={k}
            style={{
              background: C.raised,
              borderRadius: 7,
              padding: "9px 12px",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: C.textMuted,
                fontWeight: 700,
                textTransform: "uppercase",
                marginBottom: 3,
              }}
            >
              {k}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
              {v}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: C.textSec,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          borderBottom: `2px solid ${C.amber}`,
          paddingBottom: 8,
          marginBottom: 12,
        }}
      >
        Activity Log
      </div>
      {loading ? (
        <div style={{ textAlign: "center", padding: 20, color: C.textMuted }}>
          Loading…
        </div>
      ) : displayActs.length === 0 ? (
        <Empty icon="📭" text="No activity recorded yet" />
      ) : (
        <div style={{ maxHeight: 280, overflowY: "auto" }}>
          {displayActs.map((a, idx) => (
            <div
              key={a.id}
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
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: C.amber,
                    marginTop: 5,
                  }}
                />
                {idx < displayActs.length - 1 && (
                  <div
                    style={{
                      width: 1,
                      flex: 1,
                      background: C.border,
                      marginTop: 2,
                      minHeight: 14,
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  flex: 1,
                  background: C.raised,
                  borderRadius: 7,
                  padding: "8px 12px",
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
                    style={{ fontSize: 12, fontWeight: 700, color: C.text }}
                  >
                    {ACT[a.activity_type] || a.activity_type}
                  </span>
                  <span style={{ fontSize: 10, color: C.textMuted }}>
                    {fmtIST(a.created_at)}
                  </span>
                </div>
                {a.user && (
                  <div style={{ fontSize: 11, color: C.textSec }}>
                    👤 {a.user.full_name}
                  </div>
                )}
                {a.notes && (
                  <div style={{ fontSize: 11, color: C.textSec, marginTop: 1 }}>
                    {a.notes}
                  </div>
                )}
                {a.old_date && a.new_date && (
                  <div style={{ fontSize: 11, color: C.textSec, marginTop: 1 }}>
                    {fmtDateFull(a.old_date)} → {fmtDateFull(a.new_date)}
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

// ─── NEW BOOKING MODAL ─────────────────────────────────────────────────────────
// Simplified: receptionist fills customer details + referral. Their name is set automatically.
function NewBookingModal({ user, onClose, onSuccess }) {
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [model, setModel] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [preferredDate, setPreferredDate] = useState(todayIST());
  const [dateWarn, setDateWarn] = useState(null);
  const [preferredTime, setPreferredTime] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [referralPerson, setReferralPerson] = useState("");
  const [notes, setNotes] = useState("");
  const [lookupResults, setLookupResults] = useState([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const [existingBooking, setExistingBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (vehicleNumber.trim().length < 4) {
      setLookupResults([]);
      setExistingBooking(null);
      return;
    }
    const timer = setTimeout(async () => {
      setLookupLoading(true);
      try {
        const [{ data: vData }, { data: bData }] = await Promise.all([
          supabase
            .from("vehicle_records")
            .select(
              "vehicle_number,customer_name,customer_phone,model,visit_count",
            )
            .ilike("vehicle_number", `%${vehicleNumber.trim()}%`)
            .limit(4),
          supabase
            .from("bookings")
            .select("preferred_date,ref_number,status")
            .eq("vehicle_number", vehicleNumber.trim().toUpperCase())
            .in("status", ["pending", "confirmed", "arrived"])
            .order("preferred_date", { ascending: true })
            .limit(1)
            .maybeSingle(),
        ]);
        setLookupResults(vData || []);
        setExistingBooking(bData || null);
      } catch (e) {
        console.error(e);
      } finally {
        setLookupLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [vehicleNumber]);

  const applyLookup = (rec) => {
    setVehicleNumber(rec.vehicle_number);
    setCustomerName(rec.customer_name || "");
    setCustomerPhone(rec.customer_phone || "");
    setModel(rec.model || "");
    setLookupResults([]);
    setAutoFilled(true);
  };

  const generateRef = () => {
    const ist = new Date(Date.now() + 5.5 * 3600000);
    return `BK-${ist.getUTCFullYear()}${String(ist.getUTCMonth() + 1).padStart(2, "0")}${String(ist.getUTCDate()).padStart(2, "0")}-${String(Math.floor(1000 + Math.random() * 9000))}`;
  };

  const submit = async () => {
    const fe = {};
    if (!vehicleNumber.trim()) fe.vehicleNumber = true;
    if (!customerName.trim()) fe.customerName = true;
    if (!preferredDate) fe.preferredDate = true;
    else if (isSaturday(preferredDate)) fe.preferredDate = true;
    setFieldErrors(fe);
    if (Object.keys(fe).length > 0) {
      setErr(
        isSaturday(preferredDate)
          ? "We're closed on Saturdays — please pick another day"
          : "Vehicle number, customer name and date are required",
      );
      return;
    }
    setLoading(true);
    setErr("");
    // contact_person = "Ref: Gokul" or just receptionist name if no referral
    const contactParts = [];
    if (referralPerson.trim())
      contactParts.push(`Ref: ${referralPerson.trim()}`);
    contactParts.push(user?.full_name || "Receptionist");
    try {
      const ref = generateRef();
      const { error } = await supabase.from("bookings").insert([
        {
          vehicle_number: vehicleNumber.trim().toUpperCase(),
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim() || null,
          model: model || null,
          service_type: serviceType || null,
          preferred_date: preferredDate,
          preferred_time: preferredTime || null,
          issue_description: issueDescription.trim() || null,
          contact_person: contactParts.join(" | "),
          notes: notes.trim() || null,
          ref_number: ref,
          status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
      if (error) throw error;
      if (customerPhone.trim())
        await sendWA(customerPhone.trim(), "booking_received", [
          customerName.trim() || "Customer",
          model || "your vehicle",
          vehicleNumber.trim().toUpperCase(),
          fmtDateFull(preferredDate),
          ref,
        ]);
      onSuccess();
    } catch (e) {
      setErr(e.message || "Failed to create booking");
      setLoading(false);
    }
  };

  return (
    <Dlg
      open={true}
      onClose={onClose}
      title="📋 New Booking"
      subtitle={`Registering as: ${user?.full_name || "You"}`}
      width={580}
    >
      <SectionBox icon="🚗" label="Vehicle">
        <FieldLabel required>Vehicle Number</FieldLabel>
        <div style={{ position: "relative", marginBottom: 4 }}>
          <FocusInput
            value={vehicleNumber}
            onChange={(v) => {
              setVehicleNumber(v.toUpperCase());
              setAutoFilled(false);
              setExistingBooking(null);
            }}
            placeholder="MH12AB1234"
            mono
            errored={fieldErrors.vehicleNumber}
          />
          {lookupLoading && (
            <div
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 11,
                color: C.textMuted,
              }}
            >
              Searching…
            </div>
          )}
          {lookupResults.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                zIndex: 50,
                boxShadow: C.shadowMd,
                overflow: "hidden",
              }}
            >
              {lookupResults.map((rec) => (
                <div
                  key={rec.vehicle_number}
                  onClick={() => applyLookup(rec)}
                  style={{
                    padding: "10px 14px",
                    cursor: "pointer",
                    borderBottom: `1px solid ${C.border}`,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = C.raised)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 2,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 800,
                        fontFamily: "'DM Mono',monospace",
                        fontSize: 13,
                        color: C.text,
                        letterSpacing: "0.8px",
                      }}
                    >
                      {rec.vehicle_number}
                    </span>
                    <Chip color={C.blue} bg={C.blueLight} border="#BFDBFE">
                      {rec.visit_count} visit{rec.visit_count !== 1 ? "s" : ""}
                    </Chip>
                  </div>
                  <div style={{ fontSize: 12, color: C.textSec }}>
                    {rec.customer_name || "—"} · {rec.customer_phone || "—"}
                    {rec.model ? ` · ${rec.model}` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {autoFilled && (
          <div
            style={{
              fontSize: 11,
              color: C.green,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            ✅ Auto-filled from visit history
          </div>
        )}
        {existingBooking && (
          <div
            style={{
              background: "#EFF6FF",
              border: "1px solid #BFDBFE",
              borderRadius: 8,
              padding: "10px 14px",
              marginTop: 8,
              fontSize: 13,
              color: "#1e40af",
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 3 }}>
              ℹ️ Active booking already exists
            </div>
            <div>
              Status: <strong>{existingBooking.status}</strong>
              {existingBooking.preferred_date
                ? ` · ${fmtDateFull(existingBooking.preferred_date)}`
                : ""}
              {existingBooking.ref_number
                ? ` (${existingBooking.ref_number})`
                : ""}
            </div>
            <div style={{ fontSize: 12, color: "#1d4ed8", marginTop: 3 }}>
              You can still create a new booking below.
            </div>
          </div>
        )}
      </SectionBox>

      <SectionBox icon="👤" label="Customer">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div>
            <FieldLabel required>Customer Name</FieldLabel>
            <FocusInput
              value={customerName}
              onChange={setCustomerName}
              placeholder="Full name"
              errored={fieldErrors.customerName}
            />
          </div>
          <div>
            <FieldLabel>Phone Number</FieldLabel>
            <FocusInput
              value={customerPhone}
              onChange={setCustomerPhone}
              placeholder="9876543210"
              inputMode="numeric"
              maxLength={10}
            />
          </div>
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          <div>
            <FieldLabel>Vehicle Model</FieldLabel>
            <FocusSelect
              value={model}
              onChange={setModel}
              options={[
                { value: "", label: "Select model" },
                ...MODELS.map((m) => ({ value: m, label: m })),
              ]}
            />
          </div>
          <div>
            <FieldLabel>Service Type</FieldLabel>
            <FocusSelect
              value={serviceType}
              onChange={setServiceType}
              options={[
                { value: "", label: "Not specified" },
                ...Object.entries(SVC).map(([k, v]) => ({
                  value: k,
                  label: v,
                })),
              ]}
            />
          </div>
        </div>
      </SectionBox>

      <SectionBox icon="📅" label="Appointment">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div>
            <FieldLabel required>Preferred Date</FieldLabel>
            <input
              type="date"
              value={preferredDate}
              min={todayIST()}
              onChange={(e) => {
                setPreferredDate(e.target.value);
                setDateWarn(isSaturday(e.target.value) ? "saturday" : null);
                if (fieldErrors.preferredDate)
                  setFieldErrors((f) => ({ ...f, preferredDate: false }));
              }}
              style={{
                width: "100%",
                padding: "9px 12px",
                border: `1.5px solid ${fieldErrors.preferredDate ? C.red : C.border}`,
                borderRadius: 7,
                fontSize: 14,
                color: C.text,
                background: C.surface,
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = C.amber)}
              onBlur={(e) =>
                (e.target.style.borderColor = fieldErrors.preferredDate
                  ? C.red
                  : C.border)
              }
            />
            {dateWarn === "saturday" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 5,
                  marginTop: 5,
                  padding: "6px 10px",
                  background: C.amberLight,
                  border: `1px solid #FDE68A`,
                  borderRadius: 6,
                  fontSize: 11,
                  color: C.amberDark,
                  fontWeight: 600,
                }}
              >
                🔒 Closed Saturdays — please pick a different day
              </div>
            )}
          </div>
          <div>
            <FieldLabel>Preferred Time</FieldLabel>
            <FocusSelect
              value={preferredTime}
              onChange={setPreferredTime}
              options={[
                { value: "", label: "No preference" },
                { value: "09:00-11:00", label: "Morning (9–11 AM)" },
                { value: "11:00-13:00", label: "Mid-Day (11 AM–1 PM)" },
                { value: "14:00-16:00", label: "Afternoon (2–4 PM)" },
                { value: "16:00-18:00", label: "Evening (4–6 PM)" },
              ]}
            />
          </div>
        </div>
        <div>
          <FieldLabel>Issue / Complaint</FieldLabel>
          <textarea
            value={issueDescription}
            onChange={(e) => setIssueDescription(e.target.value)}
            placeholder="What does the customer report?"
            rows={2}
            style={{
              width: "100%",
              padding: "9px 12px",
              border: `1.5px solid ${C.border}`,
              borderRadius: 7,
              fontSize: 14,
              color: C.text,
              background: C.surface,
              outline: "none",
              fontFamily: "inherit",
              resize: "vertical",
              boxSizing: "border-box",
            }}
            onFocus={(e) => (e.target.style.borderColor = C.amber)}
            onBlur={(e) => (e.target.style.borderColor = C.border)}
          />
        </div>
      </SectionBox>

      <SectionBox icon="👥" label="Referral">
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          <div>
            <FieldLabel>Referred by (Sheetal Staff)</FieldLabel>
            <FocusInput
              value={referralPerson}
              onChange={setReferralPerson}
              placeholder="e.g. Gokul"
            />
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
              Who at Sheetal referred this customer?
            </div>
          </div>
          <div>
            <FieldLabel>Internal Note</FieldLabel>
            <FocusInput
              value={notes}
              onChange={setNotes}
              placeholder="Any internal note…"
            />
          </div>
        </div>
        <div
          style={{
            marginTop: 10,
            padding: "8px 12px",
            background: C.raised,
            borderRadius: 7,
            fontSize: 12,
            color: C.textSec,
            border: `1px solid ${C.border}`,
          }}
        >
          📋 This booking will be registered under{" "}
          <strong>{user?.full_name || "You"}</strong>
        </div>
      </SectionBox>

      {err && (
        <div
          style={{
            background: C.redLight,
            color: C.red,
            padding: "9px 12px",
            borderRadius: 7,
            fontSize: 13,
            marginBottom: 12,
            border: "1px solid #FECACA",
            fontWeight: 600,
          }}
        >
          {err}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <Btn
          v="secondary"
          onClick={onClose}
          style={{ flex: 1, justifyContent: "center" }}
        >
          Cancel
        </Btn>
        <Btn
          v="primary"
          onClick={submit}
          disabled={loading}
          style={{ flex: 2, justifyContent: "center" }}
        >
          {loading ? "Creating…" : "📋 Create Booking"}
        </Btn>
      </div>
    </Dlg>
  );
}

// ─── EDIT MODAL ───────────────────────────────────────────────────────────────
function EditModal({ booking: b, user, onClose, onSave }) {
  const [vehicleNumber, setVehicleNumber] = useState(b.vehicle_number || "");
  const [customerName, setCustomerName] = useState(b.customer_name || "");
  const [customerPhone, setCustomerPhone] = useState(b.customer_phone || "");
  const [model, setModel] = useState(b.model || "");
  const [serviceType, setServiceType] = useState(b.service_type || "");
  const [preferredDate, setPreferredDate] = useState(b.preferred_date || "");
  const [preferredTime, setPreferredTime] = useState(b.preferred_time || "");
  const [issueDescription, setIssueDescription] = useState(
    b.issue_description || "",
  );
  const [notes, setNotes] = useState(b.notes || "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const save = async () => {
    if (!vehicleNumber.trim()) {
      setErr("Vehicle number is required");
      return;
    }
    if (!customerName.trim()) {
      setErr("Customer name is required");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          vehicle_number: vehicleNumber.trim().toUpperCase(),
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim() || null,
          model: model || null,
          service_type: serviceType || null,
          preferred_date: preferredDate || null,
          preferred_time: preferredTime || null,
          issue_description: issueDescription.trim() || null,
          notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", b.id);
      if (error) throw error;
      const changes = [];
      if (vehicleNumber.trim().toUpperCase() !== b.vehicle_number)
        changes.push(
          `VN: ${b.vehicle_number} → ${vehicleNumber.trim().toUpperCase()}`,
        );
      if (customerName.trim() !== (b.customer_name || ""))
        changes.push(`Name: ${b.customer_name} → ${customerName.trim()}`);
      if (customerPhone.trim() !== (b.customer_phone || ""))
        changes.push("Phone updated");
      if (model !== (b.model || ""))
        changes.push(`Model: ${b.model || "—"} → ${model || "—"}`);
      if (serviceType !== (b.service_type || ""))
        changes.push(
          `Service: ${SVC[b.service_type] || "—"} → ${SVC[serviceType] || "—"}`,
        );
      if (preferredDate !== (b.preferred_date || ""))
        changes.push(
          `Date: ${fmtDateFull(b.preferred_date)} → ${fmtDateFull(preferredDate)}`,
        );
      if (preferredTime !== (b.preferred_time || ""))
        changes.push("Time slot updated");
      if (issueDescription.trim() !== (b.issue_description || ""))
        changes.push("Issue description updated");
      await logAct(
        b.id,
        user.id,
        "edited",
        changes.length > 0 ? changes.join(", ") : "Booking details updated",
      );
      onSave();
    } catch (e) {
      setErr(e.message || "Failed to update booking");
      setLoading(false);
    }
  };
  return (
    <Dlg
      open={true}
      onClose={onClose}
      title="Edit Booking"
      subtitle={`${b.vehicle_number} · ${b.customer_name || "—"}${b.ref_number ? " · " + b.ref_number : ""}`}
      width={580}
    >
      <SectionBox icon="🚗" label="Vehicle">
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          <div>
            <FieldLabel required>Vehicle Number</FieldLabel>
            <FocusInput
              value={vehicleNumber}
              onChange={(v) => setVehicleNumber(v.toUpperCase())}
              placeholder="MH12AB1234"
              mono
            />
          </div>
          <div>
            <FieldLabel>Model</FieldLabel>
            <FocusSelect
              value={model}
              onChange={setModel}
              options={[
                { value: "", label: "Select model" },
                ...MODELS.map((m) => ({ value: m, label: m })),
              ]}
            />
          </div>
        </div>
      </SectionBox>
      <SectionBox icon="👤" label="Customer Details">
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          <div>
            <FieldLabel required>Customer Name</FieldLabel>
            <FocusInput
              value={customerName}
              onChange={setCustomerName}
              placeholder="Full name"
            />
          </div>
          <div>
            <FieldLabel>Phone Number</FieldLabel>
            <FocusInput
              value={customerPhone}
              onChange={setCustomerPhone}
              placeholder="9876543210"
              inputMode="numeric"
              maxLength={10}
            />
          </div>
        </div>
      </SectionBox>
      <SectionBox icon="📅" label="Appointment">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div>
            <FieldLabel>Service Type</FieldLabel>
            <FocusSelect
              value={serviceType}
              onChange={setServiceType}
              options={[
                { value: "", label: "Not specified" },
                ...Object.entries(SVC).map(([k, v]) => ({
                  value: k,
                  label: v,
                })),
              ]}
            />
          </div>
          <div>
            <FieldLabel>Preferred Date</FieldLabel>
            <input
              type="date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                border: `1.5px solid ${C.border}`,
                borderRadius: 7,
                fontSize: 14,
                color: C.text,
                background: C.surface,
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = C.amber)}
              onBlur={(e) => (e.target.style.borderColor = C.border)}
            />
          </div>
          <div>
            <FieldLabel>Preferred Time</FieldLabel>
            <FocusSelect
              value={preferredTime}
              onChange={setPreferredTime}
              options={[
                { value: "", label: "No preference" },
                { value: "09:00-11:00", label: "Morning (9–11 AM)" },
                { value: "11:00-13:00", label: "Mid-Day (11 AM–1 PM)" },
                { value: "14:00-16:00", label: "Afternoon (2–4 PM)" },
                { value: "16:00-18:00", label: "Evening (4–6 PM)" },
              ]}
            />
          </div>
        </div>
        <div>
          <FieldLabel>Issue / Complaint</FieldLabel>
          <textarea
            value={issueDescription}
            onChange={(e) => setIssueDescription(e.target.value)}
            placeholder="What does the customer say is the problem?"
            rows={2}
            style={{
              width: "100%",
              padding: "9px 12px",
              border: `1.5px solid ${C.border}`,
              borderRadius: 7,
              fontSize: 14,
              color: C.text,
              background: C.surface,
              outline: "none",
              fontFamily: "inherit",
              resize: "vertical",
              boxSizing: "border-box",
            }}
            onFocus={(e) => (e.target.style.borderColor = C.amber)}
            onBlur={(e) => (e.target.style.borderColor = C.border)}
          />
        </div>
      </SectionBox>
      <SectionBox icon="📝" label="Internal Note">
        <FocusInput
          value={notes}
          onChange={setNotes}
          placeholder="Any internal note…"
        />
      </SectionBox>
      {err && (
        <div
          style={{
            background: C.redLight,
            color: C.red,
            padding: "9px 12px",
            borderRadius: 7,
            fontSize: 13,
            marginBottom: 12,
            border: "1px solid #FECACA",
            fontWeight: 600,
          }}
        >
          {err}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <Btn
          v="secondary"
          onClick={onClose}
          style={{ flex: 1, justifyContent: "center" }}
        >
          Cancel
        </Btn>
        <Btn
          v="blue"
          onClick={save}
          disabled={loading}
          style={{ flex: 2, justifyContent: "center" }}
        >
          {loading ? "Saving…" : "Save Changes"}
        </Btn>
      </div>
    </Dlg>
  );
}

// ─── TELECALLING TAB ──────────────────────────────────────────────────────────
const CALL_STATUS_COLORS = {
  answered: { color: "#065F46", bg: "#D1FAE5", border: "#6EE7B7" },
  not_answered: { color: "#92400E", bg: "#FEF3C7", border: "#FDE68A" },
  not_reachable: { color: "#1E40AF", bg: "#DBEAFE", border: "#BFDBFE" },
  wrong_number: { color: "#991B1B", bg: "#FEE2E2", border: "#FECACA" },
  number_busy: { color: "#6B21A8", bg: "#F3E8FF", border: "#D8B4FE" },
  switched_off: { color: "#374151", bg: "#F3F4F6", border: "#E5E7EB" },
};

function TelecallingTab({ user }) {
  const today = todayIST();

  // Config options from DB
  const [callReasons, setCallReasons] = useState([]);
  const [callStatuses, setCallStatuses] = useState([]);

  // Log call form
  const [vn, setVn] = useState("");
  const [customerName, setCName] = useState("");
  const [customerPhone, setCPhone] = useState("");
  const [model, setModel] = useState("");
  const [lastService, setLastSvc] = useState(null);
  const [visitCount, setVCount] = useState(null);
  const [callStatus, setCallStatus] = useState("");
  const [reasonKey, setReasonKey] = useState("");
  const [notes, setNotes] = useState("");
  const [vnLookupLoading, setVLL] = useState(false);
  const [vnFound, setVnFound] = useState(null); // true | false | null
  const [formErr, setFormErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Log list
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [searchVn, setSearchVn] = useState("");
  const [filterFrom, setFilterFrom] = useState(todayIST());
  const [filterTo, setFilterTo] = useState(todayIST());
  const [filterStatus, setFilterStatus] = useState("");
  const [sfocus, setSfocus] = useState(false);

  const [filterReason, setFilterReason] = useState("");

  // VN lookup timer
  const vnTimer = useRef(null);

  // Load config options
  useEffect(() => {
    supabase
      .from("config_options")
      .select("key,label,sort_order")
      .eq("category", "call_reason")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setCallReasons(data || []));
    supabase
      .from("config_options")
      .select("key,label,sort_order")
      .eq("category", "call_status")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setCallStatuses(data || []));
  }, []);

  // Load logs
  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    let q = supabase
      .from("call_logs")
      .select("*,caller:users!call_logs_called_by_fkey(full_name)")
      .order("called_at", { ascending: false })
      .limit(200);
    if (filterFrom) q = q.gte("called_at", filterFrom + "T00:00:00+05:30");
    if (filterTo) q = q.lte("called_at", filterTo + "T23:59:59+05:30");
    if (filterReason) q = q.eq("reason_key", filterReason);
    if (searchVn.trim()) {
      const s = searchVn.trim();
      if (/^\d+$/.test(s)) {
        q = q.ilike("customer_phone", `%${s}%`);
      } else {
        q = q.ilike("vehicle_number", `%${s}%`);
      }
    }
    if (filterStatus) q = q.eq("call_status", filterStatus);
    const { data } = await q;
    setLogs(data || []);
    setLogsLoading(false);
  }, [filterFrom, filterTo, searchVn, filterStatus, filterReason]);
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Real-time: refresh log list when any call is logged
  useEffect(() => {
    const ch = supabase
      .channel("telecalling-rt")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "call_logs" },
        () => fetchLogs(),
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchLogs]);

  // VN lookup
  const handleVN = (val) => {
    const v = val
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 10);
    setVn(v);
    setVnFound(null);
    setCName("");
    setCPhone("");
    setModel("");
    setLastSvc(null);
    setVCount(null);
    if (vnTimer.current) clearTimeout(vnTimer.current);
    if (v.length >= 4) {
      vnTimer.current = setTimeout(async () => {
        setVLL(true);
        // Try vehicle_records first (master data)
        const { data: vr } = await supabase
          .from("vehicle_records")
          .select(
            "customer_name,customer_phone,model,last_service_date,visit_count",
          )
          .eq("vehicle_number", v)
          .maybeSingle();
        if (vr) {
          setCName(vr.customer_name || "");
          setCPhone(vr.customer_phone || "");
          setModel(vr.model || "");
          setLastSvc(vr.last_service_date);
          setVCount(vr.visit_count);
          setVnFound(true);
        } else {
          // Fallback: check bookings table for any history
          const { data: bk } = await supabase
            .from("bookings")
            .select("customer_name,customer_phone,model")
            .eq("vehicle_number", v)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (bk) {
            setCName(bk.customer_name || "");
            setCPhone(bk.customer_phone || "");
            setModel(bk.model || "");
            setLastSvc(null);
            setVCount(null);
            setVnFound(true);
          } else {
            setVnFound(false);
          }
        }
        setVLL(false);
      }, 500);
    }
  };

  const resetForm = () => {
    setVn("");
    setCName("");
    setCPhone("");
    setModel("");
    setLastSvc(null);
    setVCount(null);
    setCallStatus("");
    setReasonKey("");
    setNotes("");
    setVnFound(null);
    setFormErr("");
    setSaved(false);
  };

  const handleSave = async () => {
    if (!vn.trim()) {
      setFormErr("Vehicle number is required");
      return;
    }
    if (!customerName.trim()) {
      setFormErr("Customer name is required");
      return;
    }
    if (!callStatus) {
      setFormErr("Call status is required");
      return;
    }
    if (!reasonKey) {
      setFormErr("Reason is required");
      return;
    }
    setSaving(true);
    setFormErr("");
    try {
      const { error } = await supabase.from("call_logs").insert([
        {
          vehicle_number: vn.trim().toUpperCase(),
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim() || null,
          called_by: user.id,
          call_status: callStatus,
          reason_key: reasonKey,
          notes: notes.trim() || null,
          called_at: new Date().toISOString(),
        },
      ]);
      if (error) throw error;

      // Upsert into vehicle_records — keep master data fresh
      await supabase.from("vehicle_records").upsert(
        {
          vehicle_number: vn.trim().toUpperCase(),
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim() || null,
          model: model.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "vehicle_number", ignoreDuplicates: false },
      );

      setSaved(true);
      fetchLogs();
      setTimeout(() => resetForm(), 1500);
    } catch (e) {
      setFormErr(e.message || "Failed to save");
    }
    setSaving(false);
  };

  // Stats for today
  const todayLogs = logs.filter(
    (l) => (l.called_at || "").substring(0, 10) === today,
  );
  const totalToday = todayLogs.length;
  const answeredToday = todayLogs.filter(
    (l) => l.call_status === "answered",
  ).length;

  // Label helpers
  const statusLabel = (key) =>
    callStatuses.find((s) => s.key === key)?.label || key;
  const reasonLabel = (key) =>
    callReasons.find((r) => r.key === key)?.label || key;
  const statusColors = (key) =>
    CALL_STATUS_COLORS[key] || {
      color: C.textSec,
      bg: C.raised,
      border: C.border,
    };

  return (
    <div>
      {/* ── Today's summary strip ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          {
            label: "Calls Today",
            value: totalToday,
            color: C.blue,
            bg: C.blueLight,
            border: "#BFDBFE",
          },
          {
            label: "Answered",
            value: answeredToday,
            color: C.green,
            bg: C.greenLight,
            border: "#6EE7B7",
          },
          {
            label: "Not Answered",
            value: totalToday - answeredToday,
            color: "#D97706",
            bg: "#FFFBEB",
            border: "#FDE68A",
          },
        ].map(({ label, value, color, bg, border }) => (
          <div
            key={label}
            style={{
              flex: 1,
              background: bg,
              border: `1px solid ${border}`,
              borderRadius: 9,
              padding: "11px 14px",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color,
                fontFamily: "'DM Mono',monospace",
                lineHeight: 1,
              }}
            >
              {value}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color,
                textTransform: "uppercase",
                letterSpacing: "0.4px",
                lineHeight: 1.4,
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Log a Call form ── */}
      <div
        style={{
          background: C.surface,
          borderRadius: 10,
          padding: "18px 20px",
          marginBottom: 16,
          boxShadow: C.shadow,
          border: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: C.textSec,
            textTransform: "uppercase",
            letterSpacing: "0.7px",
            marginBottom: 14,
          }}
        >
          Log a Call
        </div>

        {/* VN */}
        <div style={{ marginBottom: 12 }}>
          <FieldLabel required>Vehicle Number</FieldLabel>
          <div style={{ position: "relative" }}>
            <input
              value={vn}
              onChange={(e) => handleVN(e.target.value)}
              placeholder="MH12AB1234"
              maxLength={10}
              style={{
                width: "100%",
                padding: "9px 12px",
                border: `1.5px solid ${vnFound === false ? C.amber : vnFound === true ? "#22C55E" : C.border}`,
                borderRadius: 7,
                fontSize: 14,
                color: C.text,
                background: C.surface,
                outline: "none",
                fontFamily: "'DM Mono',monospace",
                letterSpacing: "0.8px",
                textTransform: "uppercase",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = C.amber)}
              onBlur={(e) =>
                (e.target.style.borderColor =
                  vnFound === false
                    ? C.amber
                    : vnFound === true
                      ? "#22C55E"
                      : C.border)
              }
            />
            {vnLookupLoading && (
              <div
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 11,
                  color: C.textMuted,
                }}
              >
                Searching…
              </div>
            )}
            {vnFound === true && !vnLookupLoading && (
              <div
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 11,
                  color: C.green,
                  fontWeight: 600,
                }}
              >
                ✓ Found
              </div>
            )}
            {vnFound === false && !vnLookupLoading && (
              <div
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 11,
                  color: "#D97706",
                  fontWeight: 600,
                }}
              >
                New vehicle
              </div>
            )}
          </div>
          {vnFound === true && lastService && (
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
              Last service: {fmtDateFull(lastService)} · {visitCount} visit
              {visitCount !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Customer details */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <div>
            <FieldLabel required>Customer Name</FieldLabel>
            <FocusInput
              value={customerName}
              onChange={setCName}
              placeholder="Full name"
            />
          </div>
          <div>
            <FieldLabel>Phone</FieldLabel>
            <FocusInput
              value={customerPhone}
              onChange={setCPhone}
              placeholder="9876543210"
              inputMode="numeric"
              maxLength={10}
            />
          </div>
          <div>
            <FieldLabel>Model</FieldLabel>
            <FocusInput
              value={model}
              onChange={setModel}
              placeholder="e.g. Nexon"
            />
          </div>
        </div>

        {/* Call details */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <div>
            <FieldLabel required>Call Status</FieldLabel>
            <FocusSelect
              value={callStatus}
              onChange={setCallStatus}
              errored={!callStatus && !!formErr}
              options={[
                { value: "", label: "Select status" },
                ...callStatuses.map((s) => ({ value: s.key, label: s.label })),
              ]}
            />
          </div>
          <div>
            <FieldLabel required>Reason for Call</FieldLabel>
            <FocusSelect
              value={reasonKey}
              onChange={setReasonKey}
              errored={!reasonKey && !!formErr}
              options={[
                { value: "", label: "Select reason" },
                ...callReasons.map((r) => ({ value: r.key, label: r.label })),
              ]}
            />
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 14 }}>
          <FieldLabel>Notes</FieldLabel>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional details about the call…"
            rows={2}
            style={{
              width: "100%",
              padding: "9px 12px",
              border: `1.5px solid ${C.border}`,
              borderRadius: 7,
              fontSize: 14,
              color: C.text,
              background: C.surface,
              outline: "none",
              fontFamily: "inherit",
              resize: "vertical",
              boxSizing: "border-box",
            }}
            onFocus={(e) => (e.target.style.borderColor = C.amber)}
            onBlur={(e) => (e.target.style.borderColor = C.border)}
          />
        </div>

        {formErr && (
          <div
            style={{
              background: C.redLight,
              color: C.red,
              padding: "8px 12px",
              borderRadius: 7,
              fontSize: 13,
              marginBottom: 12,
              border: "1px solid #FECACA",
              fontWeight: 600,
            }}
          >
            {formErr}
          </div>
        )}
        {saved && (
          <div
            style={{
              background: C.greenLight,
              color: C.green,
              padding: "8px 12px",
              borderRadius: 7,
              fontSize: 13,
              marginBottom: 12,
              border: "1px solid #6EE7B7",
              fontWeight: 600,
            }}
          >
            ✓ Call logged successfully
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <Btn
            v="secondary"
            onClick={resetForm}
            style={{ flex: 1, justifyContent: "center" }}
          >
            Clear
          </Btn>
          <Btn
            v="success"
            onClick={handleSave}
            disabled={saving || saved}
            style={{ flex: 2, justifyContent: "center" }}
          >
            {saving ? "Saving…" : saved ? "Saved!" : "Log Call"}
          </Btn>
        </div>
      </div>

      {/* ── Call history ── */}
      <div
        style={{
          background: C.surface,
          borderRadius: 10,
          padding: "14px 16px",
          marginBottom: 14,
          boxShadow: C.shadow,
          border: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div style={{ position: "relative", flex: "1 1 180px" }}>
            <span
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 13,
                color: C.textMuted,
              }}
            >
              🔍
            </span>
            <input
              value={searchVn}
              onChange={(e) => setSearchVn(e.target.value.toUpperCase())}
              placeholder="Vehicle number or phone…"
              style={{
                width: "100%",
                padding: "8px 10px 8px 30px",
                border: `1.5px solid ${sfocus ? C.amber : C.border}`,
                borderRadius: 7,
                fontSize: 13,
                fontFamily: "'DM Mono',monospace",
                background: C.surface,
                color: C.text,
                outline: "none",
                boxSizing: "border-box",
                letterSpacing: "0.5px",
              }}
              onFocus={() => setSfocus(true)}
              onBlur={() => setSfocus(false)}
            />
          </div>
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            style={{
              padding: "8px 10px",
              border: `1px solid ${C.border}`,
              borderRadius: 7,
              fontSize: 12,
              background: C.surface,
              color: C.text,
            }}
          />
          <span style={{ fontSize: 12, color: C.textMuted }}>→</span>
          <input
            type="date"
            value={filterTo}
            min={filterFrom}
            onChange={(e) => setFilterTo(e.target.value)}
            style={{
              padding: "8px 10px",
              border: `1px solid ${C.border}`,
              borderRadius: 7,
              fontSize: 12,
              background: C.surface,
              color: C.text,
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ flex: "1 1 160px" }}>
            <FocusSelect
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { value: "", label: "All statuses" },
                ...callStatuses.map((s) => ({ value: s.key, label: s.label })),
              ]}
            />
          </div>
          <div style={{ flex: "1 1 160px" }}>
            <FocusSelect
              value={filterReason}
              onChange={setFilterReason}
              options={[
                { value: "", label: "All reasons" },
                ...callReasons.map((r) => ({ value: r.key, label: r.label })),
              ]}
            />
          </div>
          {(searchVn ||
            filterStatus ||
            filterReason ||
            filterFrom ||
            filterTo) && (
            <Btn
              v="ghost"
              sz="sm"
              onClick={() => {
                setSearchVn("");
                setFilterStatus("");
                setFilterReason("");
                setFilterFrom(todayIST());
                setFilterTo(todayIST());
              }}
              style={{ color: C.red }}
            >
              ✕ Clear
            </Btn>
          )}
        </div>
      </div>

      {logsLoading ? (
        <div style={{ textAlign: "center", padding: 40, color: C.textMuted }}>
          <div
            style={{
              width: 28,
              height: 28,
              border: `3px solid ${C.border}`,
              borderTop: `3px solid ${C.amber}`,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 10px",
            }}
          />
          Loading call logs…
        </div>
      ) : logs.length === 0 ? (
        <Empty
          icon="📲"
          text={
            searchVn ? "No calls found for this vehicle" : "No calls logged yet"
          }
          sub={
            searchVn
              ? `No call history for ${searchVn}`
              : "Use the form above to log your first call"
          }
        />
      ) : (
        <div>
          <div
            style={{
              fontSize: 12,
              color: C.textMuted,
              marginBottom: 10,
              fontWeight: 600,
            }}
          >
            {logs.length} call{logs.length !== 1 ? "s" : ""} found
          </div>
          <div style={{ maxHeight: 560, overflowY: "auto", borderRadius: 8 }}>
            {logs.map((log) => {
              const sc = statusColors(log.call_status);
              return (
                <div
                  key={log.id}
                  style={{
                    background: C.surface,
                    borderRadius: 9,
                    border: `1px solid ${C.border}`,
                    borderLeft: `3px solid ${sc.border}`,
                    padding: "12px 16px",
                    marginBottom: 7,
                    boxShadow: C.shadow,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 5,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: 13.5,
                          fontFamily: "'DM Mono',monospace",
                          color: C.text,
                          letterSpacing: "0.8px",
                        }}
                      >
                        {log.vehicle_number}
                      </span>
                      <span
                        style={{ fontSize: 12, fontWeight: 600, color: C.text }}
                      >
                        {log.customer_name || "—"}
                      </span>
                      {log.customer_phone && (
                        <span
                          style={{
                            fontSize: 12,
                            color: C.blue,
                            fontFamily: "'DM Mono',monospace",
                          }}
                        >
                          {log.customer_phone}
                        </span>
                      )}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 11, color: C.textMuted }}>
                        {fmtIST(log.called_at)}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 9px",
                        borderRadius: 20,
                        background: sc.bg,
                        border: `1px solid ${sc.border}`,
                        color: sc.color,
                      }}
                    >
                      {statusLabel(log.call_status)}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: C.textMuted,
                        background: C.raised,
                        padding: "2px 9px",
                        borderRadius: 20,
                        border: `1px solid ${C.border}`,
                      }}
                    >
                      {reasonLabel(log.reason_key)}
                    </span>
                    {log.caller?.full_name && (
                      <span style={{ fontSize: 11, color: C.textMuted }}>
                        by {log.caller.full_name}
                      </span>
                    )}
                  </div>
                  {log.notes && (
                    <div
                      style={{
                        fontSize: 12,
                        color: C.textSec,
                        marginTop: 6,
                        paddingTop: 6,
                        borderTop: `1px dashed ${C.border}`,
                      }}
                    >
                      {log.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
const TABS = [
  { key: "schedule", label: "Schedule", icon: "📅" },
  { key: "all", label: "All Bookings", icon: "📋" },
  { key: "callqueue", label: "Call Queue", icon: "📞" },
  { key: "telecalling", label: "Telecalling", icon: "📲" },
  { key: "stats", label: "Stats", icon: "📊" },
];

function ReceptionistDashboard({ user, onLogout }) {
  const [tab, setTab] = useState("schedule");
  const [bookings, setBks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [viewDate, setVD] = useState(todayIST());
  const [modal, setModal] = useState(null);
  const [showNewBooking, setShowNewBooking] = useState(false);

  // Activity meta for status-specific card details
  // Fetches latest relevant activity per booking for confirmed/arrived/cancelled
  const [activityMap, setActivityMap] = useState({});

  const fetchAll = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await withTimeout(
        supabase
          .from("bookings")
          .select("*")
          .order("preferred_date", { ascending: false })
          .order("preferred_time", { ascending: true }),
      );
      if (error) throw error;
      setBks(data || []);
    } catch (e) {
      console.error("[Receptionist]", e);
      if (showLoader) setLoadError(e.message || "Failed to load bookings.");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  // Fetch activity meta for cards — confirmed/arrived/cancelled details
  const fetchActivityMeta = useCallback(async () => {
    const { data } = await supabase
      .from("booking_activities")
      .select(
        "booking_id,activity_type,created_at,notes,user:users!booking_activities_user_id_fkey(full_name)",
      )
      .in("activity_type", ["confirmed", "arrived", "cancelled", "call_done"])
      .order("created_at", { ascending: false });
    if (!data) return;
    const map = {};
    data.forEach((a) => {
      if (!map[a.booking_id]) map[a.booking_id] = {};
      const m = map[a.booking_id];
      if (a.activity_type === "confirmed" && !m.confirmedBy) {
        m.confirmedBy = a.user?.full_name || null;
        m.confirmedAt = a.created_at;
      }
      // call_done by receptionist — use as confirmedBy/confirmedAt if no advisor "confirmed" activity exists
      if (a.activity_type === "call_done") {
        m.callDoneAt = a.created_at;
        m.callDoneBy = a.user?.full_name || null;
        if (!m.confirmedBy) {
          m.confirmedBy = a.user?.full_name || null;
          m.confirmedAt = a.created_at;
        }
      }
      if (a.activity_type === "arrived" && !m.arrivedAt) {
        m.arrivedAt = a.created_at;
      }
      if (a.activity_type === "cancelled" && !m.cancelledBy) {
        m.cancelledBy = a.user?.full_name || null;
        m.cancelledAt = a.created_at;
        m.cancelReason = a.notes || null;
      }
    });
    setActivityMap(map);
  }, []);

  useEffect(() => {
    fetchAll();
    fetchActivityMeta();
    const ch = supabase
      .channel("receptionist-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => fetchAll(false),
      )
      .subscribe();
    const ch2 = supabase
      .channel("receptionist-acts-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "booking_activities" },
        () => fetchActivityMeta(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
      supabase.removeChannel(ch2);
    };
  }, [fetchAll, fetchActivityMeta]);

  const handleAction = async (type, booking) => {
    if (
      ["view", "reschedule", "cancel", "edit", "note", "call_done"].includes(
        type,
      )
    ) {
      setModal({ type, booking });
      return;
    }
    if (type === "no_answer") {
      await logAct(
        booking.id,
        user.id,
        "no_answer",
        "No answer — will follow up",
      );
      fetchAll(false);
      return;
    }
    if (type === "no_show") {
      await supabase
        .from("bookings")
        .update({ status: "no_show", updated_at: new Date().toISOString() })
        .eq("id", booking.id);
      await logAct(booking.id, user.id, "no_show", "Marked as no-show");
      fetchAll(false);
    }
  };

  const afterAction = () => {
    setModal(null);
    fetchAll(false);
    fetchActivityMeta();
  };

  const todayBks = bookings.filter(
    (b) => (b.preferred_date || "").substring(0, 10) === todayIST(),
  );
  const pendingToday = todayBks.filter((b) =>
    ["pending", "confirmed"].includes(b.status),
  ).length;
  const pendingCallQueue = bookings.filter(
    (b) =>
      b.status === "pending" &&
      (b.preferred_date || "").substring(0, 10) >= todayIST(),
  ).length;

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: C.bg,
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: `4px solid ${C.border}`,
            borderTop: `4px solid ${C.amber}`,
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <div style={{ fontSize: 14, color: C.textMuted, fontWeight: 500 }}>
          Loading bookings…
        </div>
        <style>
          {
            "@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}"
          }
        </style>
      </div>
    );

  if (loadError)
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: C.bg, flexDirection: "column", gap: 14, padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 32 }}>⚠️</div>
        <div style={{ fontSize: 15, color: C.text, fontWeight: 700 }}>Couldn't load bookings</div>
        <div style={{ fontSize: 13, color: C.textMuted, maxWidth: 360 }}>{loadError}</div>
        <button
          onClick={() => fetchAll()}
          style={{ marginTop: 6, padding: "9px 20px", background: C.amber, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
        >
          🔄 Retry
        </button>
      </div>
    );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        fontFamily: "'DM Sans',sans-serif",
        color: C.text,
      }}
    >
      <style>
        {FONT}
        {`*{box-sizing:border-box} ::-webkit-scrollbar{width:5px;height:5px} ::-webkit-scrollbar-track{background:${C.raised}} ::-webkit-scrollbar-thumb{background:${C.borderStr};border-radius:3px} input[type="date"]::-webkit-calendar-picker-indicator{cursor:pointer} select option{background:${C.surface}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}`}
      </style>

      {/* Header */}
      <div
        style={{
          background: `linear-gradient(135deg,${C.navy} 0%,${C.navyMid} 100%)`,
          padding: "0 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          height: 60,
          flexShrink: 0,
          boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: C.amber,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 17,
              fontWeight: 900,
              color: C.navy,
            }}
          >
            S
          </div>
          <div>
            <div style={{ color: "#F8FAFC", fontWeight: 800, fontSize: 14 }}>
              Sheetal Automobiles
            </div>
            <div
              style={{
                color: "#64748B",
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.2px",
              }}
            >
              Receptionist · Booking Management
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {pendingToday > 0 && (
            <div
              style={{
                background: "rgba(239,68,68,0.14)",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 20,
                padding: "4px 12px",
                fontSize: 11,
                fontWeight: 800,
                color: "#F87171",
              }}
            >
              {pendingToday} pending today
            </div>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 10px",
              background: "rgba(16,185,129,0.12)",
              borderRadius: 20,
              border: "1px solid rgba(16,185,129,0.2)",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#10B981",
                animation: "pulse 2s infinite",
              }}
            />
            <span style={{ fontSize: 10, fontWeight: 800, color: "#10B981" }}>
              LIVE
            </span>
          </div>
          <Btn v="primary" onClick={() => setShowNewBooking(true)}>
            📋 New Booking
          </Btn>
          <span
            style={{
              fontSize: 13,
              color: "#94A3B8",
              fontWeight: 600,
              borderLeft: "1px solid #334155",
              paddingLeft: 10,
            }}
          >
            {user?.full_name}
          </span>
          <button
            onClick={onLogout}
            style={{
              background: "none",
              border: "1px solid #334155",
              borderRadius: 6,
              color: "#F87171",
              cursor: "pointer",
              padding: "5px 10px",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "inherit",
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div
        style={{
          background: C.surface,
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          padding: "0 24px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        {TABS.map((t) => {
          const isActive = tab === t.key;
          const badge =
            t.key === "schedule"
              ? pendingToday
              : t.key === "callqueue"
                ? pendingCallQueue
                : 0;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "13px 18px",
                border: "none",
                borderBottom: `2.5px solid ${isActive ? C.amber : "transparent"}`,
                background: "none",
                color: isActive ? C.amber : C.textSec,
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "inherit",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.12s",
              }}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {badge > 0 && (
                <span
                  style={{
                    background: isActive ? C.amber : C.redLight,
                    color: isActive ? "#fff" : C.red,
                    borderRadius: 10,
                    padding: "1px 7px",
                    fontSize: 10,
                    fontWeight: 800,
                  }}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            fontSize: 11,
            color: C.textMuted,
            fontWeight: 600,
            paddingRight: 4,
          }}
        >
          {fmtDateFull(todayIST())}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 24px" }}>
        {tab === "schedule" && (
          <ScheduleTab
            bookings={bookings}
            user={user}
            viewDate={viewDate}
            onDateChange={setVD}
            onAction={handleAction}
            activityMap={activityMap}
          />
        )}
        {tab === "all" && (
          <AllBookingsTab
            bookings={bookings}
            user={user}
            onAction={handleAction}
            activityMap={activityMap}
          />
        )}
        {tab === "callqueue" && (
          <CallQueueTab
            bookings={bookings}
            user={user}
            onAction={handleAction}
            activityMap={activityMap}
          />
        )}
        {tab === "stats" && <StatsTab bookings={bookings} user={user} />}
        {tab === "telecalling" && <TelecallingTab user={user} />}
      </div>

      {/* Modals */}
      {showNewBooking && (
        <NewBookingModal
          user={user}
          onClose={() => setShowNewBooking(false)}
          onSuccess={() => {
            setShowNewBooking(false);
            fetchAll(false);
            fetchActivityMeta();
          }}
        />
      )}
      {modal?.type === "note" && (
        <NoteModal
          booking={modal.booking}
          user={user}
          onClose={() => setModal(null)}
          onSave={afterAction}
        />
      )}
      {modal?.type === "view" && (
        <DetailModal booking={modal.booking} onClose={() => setModal(null)} />
      )}
      {modal?.type === "reschedule" && (
        <RescheduleModal
          booking={modal.booking}
          user={user}
          onClose={() => setModal(null)}
          onSave={afterAction}
        />
      )}
      {modal?.type === "edit" && (
        <EditModal
          booking={modal.booking}
          user={user}
          onClose={() => setModal(null)}
          onSave={afterAction}
        />
      )}
      {modal?.type === "cancel" && (
        <CancelModal
          booking={modal.booking}
          user={user}
          onClose={() => setModal(null)}
          onSave={afterAction}
        />
      )}
      {modal?.type === "call_done" && (
        <CallDoneModal
          booking={modal.booking}
          user={user}
          onClose={() => setModal(null)}
          onSave={afterAction}
        />
      )}

      <style>{"@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}"}</style>
    </div>
  );
}

export default ReceptionistDashboard;
