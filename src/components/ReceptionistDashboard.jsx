import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";

// ─── Constants ────────────────────────────────────────────────────────────────
const FONT = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=DM+Mono:wght@400;500&display=swap');`;

const C = {
  primary: "#1E293B",
  bg: "#F1F5F9",
  surface: "#FFFFFF",
  surfaceEl: "#F8FAFC",
  border: "#E2E8F0",
  borderStr: "#CBD5E1",
  text: "#0F172A",
  textSec: "#475569",
  textMuted: "#94A3B8",
  amber: "#F59E0B",
  amberLight: "#FEF3C7",
  green: "#10B981",
  greenLight: "#D1FAE5",
  red: "#EF4444",
  redLight: "#FEE2E2",
  blue: "#3B82F6",
  blueLight: "#EFF6FF",
  purple: "#7C3AED",
  purpleLight: "#EDE9FE",
  cyan: "#0891B2",
  cyanLight: "#ECFEFF",
  shadow: "0 1px 3px rgba(0,0,0,0.08)",
  shadowMd: "0 4px 6px rgba(0,0,0,0.07)",
};

const STATUS_MAP = {
  pending: {
    label: "Pending",
    color: "#D97706",
    bg: "#FEF3C7",
    border: "#F59E0B",
  },
  confirmed: {
    label: "Confirmed",
    color: "#1D4ED8",
    bg: "#DBEAFE",
    border: "#3B82F6",
  },
  arrived: {
    label: "Arrived",
    color: "#065F46",
    bg: "#D1FAE5",
    border: "#10B981",
  },
  completed: {
    label: "Completed",
    color: "#475569",
    bg: "#F1F5F9",
    border: "#94A3B8",
  },
  cancelled: {
    label: "Cancelled",
    color: "#991B1B",
    bg: "#FEE2E2",
    border: "#EF4444",
  },
  no_show: {
    label: "No Show",
    color: "#374151",
    bg: "#F3F4F6",
    border: "#9CA3AF",
  },
};

const SERVICE_LABELS = {
  regular_service: "Regular Service",
  warranty: "Warranty",
  accident: "Accident Repair",
  paid_service: "Paid Repair",
  inspection: "Inspection",
  other: "Other",
};

const TIME_LABELS = {
  "09:00-11:00": "9–11 AM",
  "11:00-13:00": "11 AM–1 PM",
  "14:00-16:00": "2–4 PM",
  "16:00-18:00": "4–6 PM",
};

const TATA_MODELS = [
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
const TIME_SLOTS = ["09:00-11:00", "11:00-13:00", "14:00-16:00", "16:00-18:00"];
const TABS = ["Today", "By Date", "All Bookings", "Follow-ups", "Stats"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toZ = (s) =>
  !s ? null : String(s).includes("Z") || String(s).includes("+") ? s : s + "Z";
const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const tomorrow = () => {
  const d = new Date(Date.now() + 86400000);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
};

const formatDate = (d) => {
  if (!d) return "—";
  const [y, m, dy] = d.split("-");
  const months = [
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
  return `${dy} ${months[parseInt(m) - 1]} ${y}`;
};
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
const dayDiff = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00+05:30");
  return Math.floor((Date.now() - d.getTime()) / 86400000);
};

// ─── WhatsApp Helper ──────────────────────────────────────────────────────────
async function sendWhatsApp(phone, template, params) {
  if (!phone) return;
  try {
    await supabase.functions.invoke("send-whatsapp", {
      body: { phone, template, params },
    });
  } catch (e) {
    console.warn("WhatsApp send failed:", e);
    // Silently fail — WhatsApp is bonus, not critical
  }
}

// ─── Log Activity ─────────────────────────────────────────────────────────────
async function logActivity(bookingId, userId, type, notes = "", extra = {}) {
  await supabase.from("booking_activities").insert([
    {
      booking_id: bookingId,
      user_id: userId,
      activity_type: type,
      notes,
      ...extra,
    },
  ]);
}

// ─── Primitive UI ─────────────────────────────────────────────────────────────
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
      ...style,
    }}
  >
    {children}
  </span>
);

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
    ghost: { bg: "transparent", color: C.textSec, border: C.border },
    success: { bg: C.green, color: "#fff", border: C.green },
    blue: { bg: C.blue, color: "#fff", border: C.blue },
    info: { bg: C.blueLight, color: C.blue, border: "#93c5fd" },
  };
  const ss = {
    sm: { padding: "5px 10px", fontSize: 12 },
    md: { padding: "8px 14px", fontSize: 13 },
    lg: { padding: "11px 22px", fontSize: 14 },
  };
  const s = vs[v] || vs.secondary;
  const p = ss[sz] || ss.md;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? C.surfaceEl : s.bg,
        color: disabled ? C.textMuted : s.color,
        border: `1px solid ${disabled ? C.border : s.border}`,
        borderRadius: 6,
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

const Inp = ({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  style = {},
  autoFocus = false,
}) => (
  <div style={{ marginBottom: 14, ...style }}>
    {label && (
      <label
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 700,
          color: C.textSec,
          marginBottom: 5,
          textTransform: "uppercase",
          letterSpacing: "0.4px",
        }}
      >
        {label}
        {required && <span style={{ color: C.red }}> *</span>}
      </label>
    )}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      style={{
        width: "100%",
        padding: "9px 12px",
        border: `1px solid ${C.border}`,
        borderRadius: 6,
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
  </div>
);

const Sel = ({ label, value, onChange, options, style = {} }) => (
  <div style={{ marginBottom: 14, ...style }}>
    {label && (
      <label
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 700,
          color: C.textSec,
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
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        fontSize: 14,
        color: C.text,
        background: C.surface,
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

const Dlg = ({ open, onClose, title, children, width = 520 }) => {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
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
          background: C.surface,
          borderRadius: 12,
          width: "100%",
          maxWidth: width,
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
          border: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 20px",
            borderBottom: `1px solid ${C.border}`,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 20,
              color: C.textMuted,
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

const Empty = ({ icon, text, sub }) => (
  <div
    style={{ textAlign: "center", padding: "44px 20px", color: C.textMuted }}
  >
    <div style={{ fontSize: 36, marginBottom: 10 }}>{icon}</div>
    <div
      style={{
        fontSize: 14,
        fontWeight: 600,
        marginBottom: 4,
        color: C.textSec,
      }}
    >
      {text}
    </div>
    {sub && <div style={{ fontSize: 12 }}>{sub}</div>}
  </div>
);

const StatusBadge = ({ status }) => {
  const s = STATUS_MAP[status] || {
    label: status,
    color: C.textMuted,
    bg: C.surfaceEl,
  };
  return (
    <Chip color={s.color} bg={s.bg}>
      {s.label}
    </Chip>
  );
};

// ─── Booking Card ─────────────────────────────────────────────────────────────
function BookingCard({ booking: b, user, onAction, showDate = false }) {
  const st = STATUS_MAP[b.status] || {};
  const canAct = ["pending", "confirmed"].includes(b.status);

  return (
    <div
      style={{
        background: C.surface,
        borderRadius: 10,
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${st.border || C.border}`,
        padding: "14px 16px",
        marginBottom: 10,
        boxShadow: C.shadow,
      }}
    >
      {/* Row 1: VN + badges + time */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 8,
          gap: 10,
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
              fontSize: 14,
              fontFamily: "'DM Mono',monospace",
              color: C.text,
            }}
          >
            {b.vehicle_number}
          </span>
          {b.model && (
            <Chip color={C.blue} bg={C.blueLight}>
              {b.model}
            </Chip>
          )}
          {b.visit_count > 1 && (
            <Chip color={C.green} bg={C.greenLight}>
              {b.visit_count}th visit
            </Chip>
          )}
          <StatusBadge status={b.status} />
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {b.preferred_time && (
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textSec }}>
              {TIME_LABELS[b.preferred_time] || b.preferred_time}
            </div>
          )}
          {showDate && (
            <div style={{ fontSize: 11, color: C.textMuted }}>
              {formatDate(b.preferred_date)}
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Customer info */}
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
            <span style={{ color: C.textMuted }}>·</span>
            <a
              href={`tel:${b.customer_phone}`}
              style={{
                fontSize: 13,
                color: C.blue,
                textDecoration: "none",
                fontFamily: "'DM Mono',monospace",
              }}
            >
              {b.customer_phone}
            </a>
          </>
        )}
        {b.service_type && (
          <>
            <span style={{ color: C.textMuted }}>·</span>
            <span style={{ fontSize: 12, color: C.textSec }}>
              {SERVICE_LABELS[b.service_type] || b.service_type}
            </span>
          </>
        )}
      </div>

      {/* Issue description */}
      {b.issue_description && (
        <div
          style={{
            fontSize: 12,
            color: C.textSec,
            background: C.surfaceEl,
            padding: "6px 10px",
            borderRadius: 6,
            marginBottom: 8,
            fontStyle: "italic",
          }}
        >
          "{b.issue_description}"
        </div>
      )}

      {/* Actions */}
      {canAct && (
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}
        >
          {b.status === "pending" && (
            <Btn v="blue" sz="sm" onClick={() => onAction("confirm", b)}>
              ✅ Confirm
            </Btn>
          )}
          {canAct && (
            <Btn
              v="secondary"
              sz="sm"
              onClick={() => onAction("reschedule", b)}
            >
              📅 Reschedule
            </Btn>
          )}
          {b.status === "pending" && (
            <Btn
              v="ghost"
              sz="sm"
              onClick={() => onAction("no_answer", b)}
              style={{ color: C.amber, borderColor: "#fde68a" }}
            >
              📵 No Answer
            </Btn>
          )}
          {b.status === "confirmed" && (
            <Btn
              v="ghost"
              sz="sm"
              onClick={() => onAction("no_show", b)}
              style={{ color: C.textSec }}
            >
              ⚫ No-show
            </Btn>
          )}
          <Btn
            v="ghost"
            sz="sm"
            onClick={() => onAction("cancel", b)}
            style={{ color: C.red, borderColor: "#fca5a5" }}
          >
            ✗ Cancel
          </Btn>
          <Btn
            v="ghost"
            sz="sm"
            onClick={() => onAction("view", b)}
            style={{ marginLeft: "auto" }}
          >
            📋 View
          </Btn>
        </div>
      )}
      {!canAct && b.status !== "arrived" && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Btn v="ghost" sz="sm" onClick={() => onAction("view", b)}>
            📋 View
          </Btn>
        </div>
      )}
      {b.status === "arrived" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 12, color: C.green, fontWeight: 700 }}>
            🚗 Vehicle is in the workshop
          </div>
          <Btn
            v="ghost"
            sz="sm"
            onClick={() => onAction("view", b)}
            style={{ marginLeft: "auto" }}
          >
            📋 View
          </Btn>
        </div>
      )}
    </div>
  );
}

// ─── Summary chips row ────────────────────────────────────────────────────────
function SummaryRow({ bookings }) {
  const counts = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    arrived: bookings.filter((b) => b.status === "arrived").length,
    cancelled: bookings.filter((b) =>
      ["cancelled", "no_show"].includes(b.status),
    ).length,
  };
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5,1fr)",
        gap: 8,
        marginBottom: 16,
      }}
    >
      {[
        ["Total", counts.total, C.text, C.surfaceEl],
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
              letterSpacing: "0.4px",
              marginTop: 2,
            }}
          >
            {l}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Reschedule Modal ─────────────────────────────────────────────────────────
function RescheduleModal({ booking, user, onClose, onSave }) {
  const [newDate, setNewDate] = useState(booking.preferred_date || "");
  const [newTime, setNewTime] = useState(booking.preferred_time || "");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!newDate) return;
    setLoading(true);
    const { error } = await supabase
      .from("bookings")
      .update({
        preferred_date: newDate,
        preferred_time: newTime || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.id);

    if (!error) {
      await logActivity(
        booking.id,
        user.id,
        "rescheduled",
        notes ||
          `Rescheduled to ${formatDate(newDate)}${newTime ? " at " + (TIME_LABELS[newTime] || newTime) : ""}`,
        {
          old_date: booking.preferred_date,
          new_date: newDate,
          old_time: booking.preferred_time || null,
          new_time: newTime || null,
        },
      );
      onSave();
    }
    setLoading(false);
  };

  const minDate = today();
  const maxDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toLocaleDateString("en-CA");
  })();

  return (
    <Dlg
      open={true}
      onClose={onClose}
      title={`📅 Reschedule — ${booking.vehicle_number}`}
      width={440}
    >
      <div
        style={{
          background: C.surfaceEl,
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 16,
          fontSize: 13,
          color: C.textSec,
        }}
      >
        <strong>{booking.customer_name}</strong> · Current:{" "}
        {formatDate(booking.preferred_date)}{" "}
        {booking.preferred_time
          ? `at ${TIME_LABELS[booking.preferred_time] || booking.preferred_time}`
          : ""}
      </div>
      <Inp
        label="New Date"
        type="date"
        value={newDate}
        onChange={setNewDate}
        required
      />
      <Sel
        label="New Time Slot"
        value={newTime}
        onChange={setNewTime}
        options={[
          { value: "", label: "No preference (any time)" },
          { value: "09:00-11:00", label: "Morning (9–11 AM)" },
          { value: "11:00-13:00", label: "Mid-Day (11 AM–1 PM)" },
          { value: "14:00-16:00", label: "Afternoon (2–4 PM)" },
          { value: "16:00-18:00", label: "Evening (4–6 PM)" },
        ]}
      />
      <Inp
        label="Internal Note (optional)"
        value={notes}
        onChange={setNotes}
        placeholder="e.g. Customer requested reschedule, traveling"
      />
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
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
          disabled={!newDate || loading}
          style={{ flex: 2, justifyContent: "center" }}
        >
          {loading ? "Saving…" : "Save Reschedule"}
        </Btn>
      </div>
    </Dlg>
  );
}

// ─── Cancel Modal ─────────────────────────────────────────────────────────────
function CancelModal({ booking, user, onClose, onSave }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", booking.id);
    if (!error) {
      await logActivity(
        booking.id,
        user.id,
        "cancelled",
        reason || "Booking cancelled",
      );
      onSave();
    }
    setLoading(false);
  };

  return (
    <Dlg
      open={true}
      onClose={onClose}
      title={`✗ Cancel Booking — ${booking.vehicle_number}`}
      width={420}
    >
      <div
        style={{
          background: C.redLight,
          border: `1px solid #fca5a5`,
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 16,
          fontSize: 13,
          color: C.red,
          fontWeight: 600,
        }}
      >
        This will cancel the booking for {booking.customer_name}. This action is
        logged.
      </div>
      <Inp
        label="Reason (optional)"
        value={reason}
        onChange={setReason}
        placeholder="e.g. Customer called to cancel"
      />
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
          {loading ? "Cancelling…" : "Yes, Cancel Booking"}
        </Btn>
      </div>
    </Dlg>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({ booking, user, onClose, onSave }) {
  const [notes, setNotes] = useState("");
  const [sendWA, setSendWA] = useState(!!booking.customer_phone);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("bookings")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.id);
    if (!error) {
      await logActivity(
        booking.id,
        user.id,
        "confirmed",
        notes || "Booking confirmed via call",
      );
      if (sendWA && booking.customer_phone) {
        await sendWhatsApp(booking.customer_phone, "booking_confirmed", [
          booking.customer_name || "Customer",
          formatDate(booking.preferred_date),
          booking.preferred_time
            ? TIME_LABELS[booking.preferred_time] || booking.preferred_time
            : "Flexible",
          booking.vehicle_number,
          SERVICE_LABELS[booking.service_type] ||
            booking.service_type ||
            "Service",
        ]);
      }
      onSave();
    }
    setLoading(false);
  };

  return (
    <Dlg
      open={true}
      onClose={onClose}
      title={`✅ Confirm Booking — ${booking.vehicle_number}`}
      width={440}
    >
      <div
        style={{
          background: C.blueLight,
          border: `1px solid #93c5fd`,
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 16,
          fontSize: 13,
          color: C.blue,
        }}
      >
        <strong>{booking.customer_name}</strong> ·{" "}
        {formatDate(booking.preferred_date)} ·{" "}
        {booking.preferred_time
          ? TIME_LABELS[booking.preferred_time] || booking.preferred_time
          : "Any time"}
        <br />
        <span style={{ color: C.textSec }}>
          {SERVICE_LABELS[booking.service_type] || booking.service_type}
        </span>
      </div>
      <Inp
        label="Call Note (optional)"
        value={notes}
        onChange={setNotes}
        placeholder="e.g. Customer confirmed, will arrive by 10 AM"
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
          padding: "10px 14px",
          background: booking.customer_phone ? "#f0fdf4" : "#f8fafc",
          borderRadius: 8,
          border: `1px solid ${booking.customer_phone ? "#86efac" : C.border}`,
        }}
      >
        <input
          type="checkbox"
          id="sendWA"
          checked={sendWA}
          onChange={(e) => setSendWA(e.target.checked)}
          disabled={!booking.customer_phone}
          style={{ width: 16, height: 16, cursor: "pointer" }}
        />
        <label
          htmlFor="sendWA"
          style={{
            fontSize: 13,
            cursor: "pointer",
            color: booking.customer_phone ? C.text : C.textMuted,
          }}
        >
          📱 Send WhatsApp confirmation to{" "}
          {booking.customer_phone || "— no phone on file"}
        </label>
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
          {loading ? "Confirming…" : "✅ Confirm Booking"}
        </Btn>
      </div>
    </Dlg>
  );
}

// ─── Booking Detail Modal ─────────────────────────────────────────────────────
function BookingDetailModal({ booking: b, onClose }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("booking_activities")
      .select("*,user:users!booking_activities_user_id_fkey(full_name)")
      .eq("booking_id", b.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setActivities(data || []);
        setLoading(false);
      });
  }, [b.id]);

  const ACT_LABELS = {
    confirmed: "✅ Confirmed",
    cancelled: "✗ Cancelled",
    rescheduled: "📅 Rescheduled",
    no_answer: "📵 No Answer",
    callback_requested: "📞 Callback Requested",
    note_added: "📝 Note",
    arrived: "🚗 Arrived",
    completed: "🎉 Completed",
    no_show: "⚫ No Show",
    created: "📋 Created",
  };

  return (
    <Dlg
      open={true}
      onClose={onClose}
      title={`📋 ${b.vehicle_number} — Booking Detail`}
      width={600}
    >
      {/* Core info grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 16,
        }}
      >
        {[
          ["Customer", b.customer_name || "—"],
          ["Phone", b.customer_phone || "—"],
          ["Vehicle", b.vehicle_number],
          ["Model", b.model || "—"],
          ["Service", SERVICE_LABELS[b.service_type] || b.service_type || "—"],
          ["Preferred Date", formatDate(b.preferred_date)],
          [
            "Time",
            b.preferred_time
              ? TIME_LABELS[b.preferred_time] || b.preferred_time
              : "Any time",
          ],
          ["Status", <StatusBadge status={b.status} />],
          b.assigned_advisor && [
            "Advisor",
            b.assigned_advisor?.full_name || "—",
          ],
          b.issue_description && ["Issue", b.issue_description],
        ]
          .filter(Boolean)
          .map(([k, v]) => (
            <div
              key={k}
              style={{
                background: C.surfaceEl,
                borderRadius: 6,
                padding: "8px 12px",
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

      {/* Activity timeline */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: C.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: 10,
          borderBottom: `2px solid ${C.amber}`,
          paddingBottom: 6,
        }}
      >
        Activity Log
      </div>
      {loading ? (
        <div style={{ textAlign: "center", padding: 20, color: C.textMuted }}>
          Loading…
        </div>
      ) : activities.length === 0 ? (
        <Empty icon="📭" text="No activity yet" />
      ) : (
        <div style={{ maxHeight: 280, overflowY: "auto" }}>
          {activities.map((a, idx) => (
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
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: C.amber,
                    marginTop: 4,
                  }}
                />
                {idx < activities.length - 1 && (
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
                  background: C.surfaceEl,
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
                    style={{ fontSize: 12, fontWeight: 700, color: C.text }}
                  >
                    {ACT_LABELS[a.activity_type] || a.activity_type}
                  </span>
                  <span style={{ fontSize: 10, color: C.textMuted }}>
                    {formatIST(a.created_at)}
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
                    {formatDate(a.old_date)} → {formatDate(a.new_date)}
                    {a.old_time || a.new_time
                      ? ` · ${a.old_time || "Any"}→${a.new_time || "Any"}`
                      : ""}
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

// ─── New Booking Modal (receptionist creates manually) ────────────────────────
function NewBookingModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({
    vehicle_number: "",
    customer_name: "",
    customer_phone: "",
    model: "",
    service_type: "",
    issue_description: "",
    preferred_date: "",
    preferred_time: "",
  });
  const [vnStatus, setVnStatus] = useState(null);
  const [sendWA, setSendWA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const lookupVN = useCallback(async (vn) => {
    if (vn.length < 4) return;
    setVnStatus("loading");
    const { data } = await supabase
      .from("vehicle_records")
      .select("customer_name,customer_phone,model,visit_count")
      .eq("vehicle_number", vn.toUpperCase())
      .maybeSingle();
    if (data) {
      setForm((f) => ({
        ...f,
        customer_name: data.customer_name || f.customer_name,
        customer_phone: data.customer_phone || f.customer_phone,
        model: data.model || f.model,
      }));
      setVnStatus("found");
    } else {
      setVnStatus("new");
    }
  }, []);

  useEffect(() => {
    if (form.vehicle_number.length >= 4) {
      const t = setTimeout(() => lookupVN(form.vehicle_number), 400);
      return () => clearTimeout(t);
    } else {
      setVnStatus(null);
    }
  }, [form.vehicle_number]);

  const validate = () => {
    const e = {};
    if (form.vehicle_number.length < 4)
      e.vehicle_number = "Enter a valid vehicle number";
    if (!form.customer_name.trim()) e.customer_name = "Name is required";
    if (!form.service_type) e.service_type = "Select a service type";
    if (!form.preferred_date) e.preferred_date = "Select a date";
    return e;
  };

  const save = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .insert([
        {
          vehicle_number: form.vehicle_number.toUpperCase(),
          customer_name: form.customer_name.trim(),
          customer_phone: form.customer_phone.trim() || null,
          model: form.model || null,
          service_type: form.service_type,
          issue_description: form.issue_description.trim() || null,
          preferred_date: form.preferred_date,
          preferred_time: form.preferred_time || null,
          status: "pending",
        },
      ])
      .select("id")
      .single();

    if (!error && data) {
      await logActivity(
        data.id,
        user.id,
        "created",
        `Booking created by ${user.full_name}`,
      );
      if (sendWA && form.customer_phone) {
        await sendWhatsApp(form.customer_phone, "booking_received", [
          form.customer_name.trim(),
          form.vehicle_number.toUpperCase(),
          formatDate(form.preferred_date),
          SERVICE_LABELS[form.service_type] || form.service_type,
        ]);
      }
      onSave();
    }
    setLoading(false);
  };

  const today2 = today();
  const maxDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toLocaleDateString("en-CA");
  })();

  return (
    <Dlg open={true} onClose={onClose} title="📋 New Booking" width={540}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {/* VN */}
        <div style={{ gridColumn: "1/-1" }}>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 700,
              color: C.textSec,
              marginBottom: 5,
              textTransform: "uppercase",
              letterSpacing: "0.4px",
            }}
          >
            Vehicle Number *
          </label>
          <div style={{ position: "relative" }}>
            <input
              value={form.vehicle_number}
              onChange={(e) => {
                const v = e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "")
                  .slice(0, 10);
                set("vehicle_number", v);
                setVnStatus(null);
              }}
              placeholder="e.g. MH40AB1234"
              maxLength={10}
              style={{
                width: "100%",
                padding: "9px 44px 9px 12px",
                border: `1px solid ${errors.vehicle_number ? C.red : C.border}`,
                borderRadius: 6,
                fontSize: 14,
                color: C.text,
                background: C.surface,
                outline: "none",
                fontFamily: "'DM Mono',monospace",
                letterSpacing: 1,
                textTransform: "uppercase",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = C.amber)}
              onBlur={(e) =>
                (e.target.style.borderColor = errors.vehicle_number
                  ? C.red
                  : C.border)
              }
            />
            <span
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 16,
              }}
            >
              {vnStatus === "loading"
                ? "⏳"
                : vnStatus === "found"
                  ? "✅"
                  : vnStatus === "new"
                    ? "🆕"
                    : ""}
            </span>
          </div>
          {vnStatus === "found" && (
            <div
              style={{
                fontSize: 12,
                color: C.green,
                fontWeight: 600,
                marginTop: 4,
              }}
            >
              ✅ Known vehicle — details filled
            </div>
          )}
          {errors.vehicle_number && (
            <div style={{ color: C.red, fontSize: 12, marginTop: 4 }}>
              ⚠ {errors.vehicle_number}
            </div>
          )}
        </div>

        <Inp
          label="Customer Name"
          required
          value={form.customer_name}
          onChange={(v) => set("customer_name", v)}
          placeholder="Full name"
          style={{ gridColumn: "1", marginBottom: 0 }}
        />
        <Inp
          label="Mobile Number"
          value={form.customer_phone}
          onChange={(v) =>
            set("customer_phone", v.replace(/\D/g, "").slice(0, 10))
          }
          placeholder="10-digit"
          style={{ gridColumn: "2", marginBottom: 0 }}
        />
      </div>

      <div style={{ height: 14 }} />
      <Sel
        label="Model"
        value={form.model}
        onChange={(v) => set("model", v)}
        options={[
          { value: "", label: "Select model (optional)" },
          ...TATA_MODELS.map((m) => ({ value: m, label: m })),
        ]}
      />
      <Sel
        label="Service Type"
        required
        value={form.service_type}
        onChange={(v) => set("service_type", v)}
        options={[
          { value: "", label: "Select service type" },
          ...Object.entries(SERVICE_LABELS).map(([k, v]) => ({
            value: k,
            label: v,
          })),
        ]}
      />
      {errors.service_type && (
        <div
          style={{
            color: C.red,
            fontSize: 12,
            marginTop: -10,
            marginBottom: 10,
          }}
        >
          ⚠ {errors.service_type}
        </div>
      )}
      <Inp
        label="Issue Description"
        value={form.issue_description}
        onChange={(v) => set("issue_description", v)}
        placeholder="Brief description (optional)"
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 700,
              color: C.textSec,
              marginBottom: 5,
              textTransform: "uppercase",
              letterSpacing: "0.4px",
            }}
          >
            Preferred Date *
          </label>
          <input
            type="date"
            value={form.preferred_date}
            min={today2}
            max={maxDate}
            onChange={(e) => set("preferred_date", e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px",
              border: `1px solid ${errors.preferred_date ? C.red : C.border}`,
              borderRadius: 6,
              fontSize: 14,
              color: C.text,
              background: C.surface,
              outline: "none",
              fontFamily: "inherit",
            }}
            onFocus={(e) => (e.target.style.borderColor = C.amber)}
            onBlur={(e) =>
              (e.target.style.borderColor = errors.preferred_date
                ? C.red
                : C.border)
            }
          />
          {errors.preferred_date && (
            <div style={{ color: C.red, fontSize: 12, marginTop: 4 }}>
              ⚠ {errors.preferred_date}
            </div>
          )}
        </div>
        <Sel
          label="Time Slot"
          value={form.preferred_time}
          onChange={(v) => set("preferred_time", v)}
          options={[
            { value: "", label: "Any time" },
            ...TIME_SLOTS.map((t) => ({
              value: t,
              label: TIME_LABELS[t] || t,
            })),
          ]}
          style={{ marginBottom: 0 }}
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          margin: "14px 0",
          padding: "10px 14px",
          background: form.customer_phone ? "#f0fdf4" : "#f8fafc",
          borderRadius: 8,
          border: `1px solid ${form.customer_phone ? "#86efac" : C.border}`,
        }}
      >
        <input
          type="checkbox"
          id="nba-wa"
          checked={sendWA && !!form.customer_phone}
          onChange={(e) => setSendWA(e.target.checked)}
          disabled={!form.customer_phone}
          style={{ width: 16, height: 16, cursor: "pointer" }}
        />
        <label
          htmlFor="nba-wa"
          style={{
            fontSize: 13,
            cursor: "pointer",
            color: form.customer_phone ? C.text : C.textMuted,
          }}
        >
          📱 Send WhatsApp "booking received" message
        </label>
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
          disabled={loading}
          style={{ flex: 2, justifyContent: "center" }}
        >
          {loading ? "Creating…" : "📋 Create Booking"}
        </Btn>
      </div>
    </Dlg>
  );
}

// ─── Today / By Date Tab ──────────────────────────────────────────────────────
function DateTab({ bookings, user, viewDate, onDateChange, onAction }) {
  const t = today();
  const tom = tomorrow();
  const filt = bookings
    .filter((b) => b.preferred_date === viewDate)
    .sort((a, b) =>
      (a.preferred_time || "z").localeCompare(b.preferred_time || "z"),
    );

  const navDate = (delta) => {
    const d = new Date(viewDate + "T12:00:00");
    d.setDate(d.getDate() + delta);
    onDateChange(d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }));
  };

  return (
    <div>
      {/* Date navigation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <button
          onClick={() => navDate(-1)}
          style={{
            padding: "7px 12px",
            border: `1px solid ${C.border}`,
            background: C.surface,
            borderRadius: 7,
            cursor: "pointer",
            fontWeight: 700,
            color: C.textSec,
          }}
        >
          ←
        </button>
        <div style={{ flex: 1, display: "flex", gap: 6 }}>
          {[
            [
              "Yesterday",
              new Date(Date.now() - 86400000).toLocaleDateString("en-CA", {
                timeZone: "Asia/Kolkata",
              }),
            ],
            [`Today — ${formatDate(t)}`, t],
            [`Tomorrow — ${formatDate(tom)}`, tom],
          ].map(([lbl, d]) => (
            <button
              key={d}
              onClick={() => onDateChange(d)}
              style={{
                flex: 1,
                padding: "7px 6px",
                border: `1.5px solid ${viewDate === d ? C.amber : C.border}`,
                background: viewDate === d ? "#fffbeb" : C.surface,
                borderRadius: 7,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
                color: viewDate === d ? "#92400e" : C.textSec,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {lbl}
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
        <button
          onClick={() => navDate(1)}
          style={{
            padding: "7px 12px",
            border: `1px solid ${C.border}`,
            background: C.surface,
            borderRadius: 7,
            cursor: "pointer",
            fontWeight: 700,
            color: C.textSec,
          }}
        >
          →
        </button>
      </div>

      {filt.length > 0 && <SummaryRow bookings={filt} />}
      {filt.length === 0 ? (
        <Empty
          icon="📅"
          text={`No bookings for ${formatDate(viewDate)}`}
          sub="Try a different date or create a new booking"
        />
      ) : (
        filt.map((b) => (
          <BookingCard
            key={b.id}
            booking={b}
            user={user}
            onAction={onAction}
            showDate={false}
          />
        ))
      )}
    </div>
  );
}

// ─── All Bookings Tab ─────────────────────────────────────────────────────────
function AllBookingsTab({ bookings, user, onAction }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    let bs = [...bookings];
    if (search.trim()) {
      const q = search.toLowerCase();
      bs = bs.filter((b) =>
        (b.vehicle_number + b.customer_name + b.customer_phone)
          .toLowerCase()
          .includes(q),
      );
    }
    if (status !== "all") bs = bs.filter((b) => b.status === status);
    if (from) bs = bs.filter((b) => b.preferred_date >= from);
    if (to) bs = bs.filter((b) => b.preferred_date <= to);
    return bs.sort(
      (a, b) =>
        b.preferred_date.localeCompare(a.preferred_date) ||
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
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vehicle number, name, phone…"
            style={{
              flex: "1 1 200px",
              padding: "8px 12px",
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              fontSize: 13,
              fontFamily: "inherit",
              background: C.surface,
              color: C.text,
              outline: "none",
            }}
            onFocus={(e) => (e.target.style.borderColor = C.amber)}
            onBlur={(e) => (e.target.style.borderColor = C.border)}
          />
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            style={{
              padding: "8px 10px",
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              fontSize: 13,
              background: C.surface,
              color: C.text,
            }}
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={{
              padding: "8px 10px",
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              fontSize: 13,
              background: C.surface,
              color: C.text,
            }}
          />
          {(from || to || search) && (
            <button
              onClick={() => {
                setFrom("");
                setTo("");
                setSearch("");
              }}
              style={{
                padding: "8px 12px",
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                background: C.surface,
                cursor: "pointer",
                fontSize: 13,
                color: C.textSec,
              }}
            >
              ✕ Clear
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            "all",
            "pending",
            "confirmed",
            "arrived",
            "completed",
            "cancelled",
            "no_show",
          ].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              style={{
                padding: "4px 12px",
                borderRadius: 16,
                border: `1px solid ${status === s ? C.amber : C.border}`,
                background: status === s ? C.amber : C.surface,
                color: status === s ? "#fff" : C.textSec,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {s === "all" ? "All" : STATUS_MAP[s]?.label || s}{" "}
              {s !== "all" &&
                `(${bookings.filter((b) => b.status === s).length})`}
            </button>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>
        {filtered.length} booking{filtered.length !== 1 ? "s" : ""} found
      </div>
      {filtered.length === 0 ? (
        <Empty
          icon="🔍"
          text="No bookings match"
          sub="Try adjusting your filters"
        />
      ) : (
        filtered.map((b) => (
          <BookingCard
            key={b.id}
            booking={b}
            user={user}
            onAction={onAction}
            showDate={true}
          />
        ))
      )}
    </div>
  );
}

// ─── Follow-ups Tab ───────────────────────────────────────────────────────────
function FollowUpsTab({ bookings, user, onAction }) {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    supabase
      .from("booking_activities")
      .select("booking_id,created_at")
      .eq("activity_type", "no_answer")
      .order("created_at", { ascending: false })
      .then(({ data }) => setActivities(data || []));
  }, [bookings]);

  const noAnswerIds = new Set(activities.map((a) => a.booking_id));
  const pending = bookings
    .filter(
      (b) =>
        ["pending", "confirmed"].includes(b.status) && noAnswerIds.has(b.id),
    )
    .sort((a, b) => {
      const aLast =
        activities.filter((x) => x.booking_id === a.id)[0]?.created_at || "";
      const bLast =
        activities.filter((x) => x.booking_id === b.id)[0]?.created_at || "";
      return aLast.localeCompare(bLast); // oldest no-answer first
    });

  return (
    <div>
      <div
        style={{
          background: C.amberLight || "#FEF3C7",
          border: `1px solid ${C.amber}44`,
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 16,
          fontSize: 13,
          color: "#92400e",
          fontWeight: 600,
        }}
      >
        📵 These bookings had no-answer calls. Oldest attempts shown first —
        call them again.
      </div>
      {pending.length === 0 ? (
        <Empty
          icon="🎉"
          text="No pending follow-ups"
          sub="All bookings have been reached"
        />
      ) : (
        pending.map((b) => {
          const lastAttempt = activities.filter(
            (a) => a.booking_id === b.id,
          )[0];
          return (
            <div key={b.id}>
              {lastAttempt && (
                <div
                  style={{
                    fontSize: 11,
                    color: C.textMuted,
                    fontWeight: 700,
                    marginBottom: 4,
                    paddingLeft: 4,
                  }}
                >
                  📵 Last attempt: {formatIST(lastAttempt.created_at)}
                </div>
              )}
              <BookingCard
                booking={b}
                user={user}
                onAction={onAction}
                showDate={true}
              />
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Stats Tab ────────────────────────────────────────────────────────────────
function StatsTab({ bookings }) {
  const total = bookings.length;
  const confirmed = bookings.filter((b) =>
    ["confirmed", "arrived", "completed"].includes(b.status),
  ).length;
  const arrived = bookings.filter((b) =>
    ["arrived", "completed"].includes(b.status),
  ).length;
  const noshow = bookings.filter((b) => b.status === "no_show").length;
  const cancelled = bookings.filter((b) => b.status === "cancelled").length;
  const pending = bookings.filter((b) => b.status === "pending").length;
  const convRate = total ? Math.round((arrived / total) * 100) : 0;
  const noshowRate = total ? Math.round((noshow / total) * 100) : 0;

  // Service type breakdown
  const svcMap = {};
  bookings.forEach((b) => {
    if (b.service_type)
      svcMap[b.service_type] = (svcMap[b.service_type] || 0) + 1;
  });
  const svcEntries = Object.entries(svcMap).sort((a, b) => b[1] - a[1]);
  const maxSvc = Math.max(...svcEntries.map(([, n]) => n), 1);

  // This week bookings by day
  const today2 = today();
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    const k = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    return {
      date: k,
      day: d.toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "short",
      }),
      count: bookings.filter((b) => b.preferred_date === k).length,
    };
  });
  const maxDay = Math.max(...last7.map((d) => d.count), 1);

  const KPI = ({ label, value, color, sub }) => (
    <div
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
          fontSize: 11,
          fontWeight: 700,
          color: C.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
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
      {sub && (
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <KPI
          label="Total Bookings"
          value={total}
          color={C.text}
          sub="All time"
        />
        <KPI
          label="Conversion Rate"
          value={`${convRate}%`}
          color={C.green}
          sub={`${arrived} arrived of ${total}`}
        />
        <KPI
          label="No-show Rate"
          value={`${noshowRate}%`}
          color={noshow > 0 ? C.red : C.green}
          sub={`${noshow} no-show`}
        />
      </div>

      {/* Funnel */}
      <div
        style={{
          background: C.surface,
          borderRadius: 10,
          padding: "18px",
          marginBottom: 16,
          boxShadow: C.shadow,
          border: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: C.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            marginBottom: 14,
            borderBottom: `2px solid ${C.amber}`,
            paddingBottom: 6,
          }}
        >
          Booking Funnel
        </div>
        {[
          ["Received", total, 1, "#94a3b8"],
          ["Pending", pending, pending / Math.max(total, 1), C.amber],
          ["Confirmed", confirmed, confirmed / Math.max(total, 1), C.blue],
          ["Arrived", arrived, arrived / Math.max(total, 1), C.green],
          ["Cancelled", cancelled, cancelled / Math.max(total, 1), C.red],
          ["No-show", noshow, noshow / Math.max(total, 1), "#6b7280"],
        ].map(([l, n, pct, c]) => (
          <div
            key={l}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: C.textSec,
                width: 80,
                flexShrink: 0,
              }}
            >
              {l}
            </span>
            <div
              style={{
                flex: 1,
                background: C.surfaceEl,
                borderRadius: 4,
                height: 8,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.round(pct * 100)}%`,
                  height: "100%",
                  background: c,
                  borderRadius: 4,
                  transition: "width 0.3s",
                }}
              />
            </div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: c,
                width: 30,
                textAlign: "right",
              }}
            >
              {n}
            </span>
          </div>
        ))}
      </div>

      {/* Last 7 days */}
      <div
        style={{
          background: C.surface,
          borderRadius: 10,
          padding: "18px",
          marginBottom: 16,
          boxShadow: C.shadow,
          border: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: C.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            marginBottom: 14,
            borderBottom: `2px solid ${C.amber}`,
            paddingBottom: 6,
          }}
        >
          Bookings — Last 7 Days
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 8,
            height: 80,
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
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>
                {d.count || ""}
              </div>
              <div
                style={{
                  width: "100%",
                  borderRadius: 4,
                  background: d.date === today2 ? C.amber : "#cbd5e1",
                  height: `${Math.max((d.count / maxDay) * 60, 4)}px`,
                  transition: "height 0.3s",
                }}
              />
              <div style={{ fontSize: 10, color: C.textMuted }}>{d.day}</div>
            </div>
          ))}
        </div>
      </div>

      {/* By Service Type */}
      {svcEntries.length > 0 && (
        <div
          style={{
            background: C.surface,
            borderRadius: 10,
            padding: "18px",
            boxShadow: C.shadow,
            border: `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: C.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 14,
              borderBottom: `2px solid ${C.amber}`,
              paddingBottom: 6,
            }}
          >
            By Service Type
          </div>
          {svcEntries.map(([type, n]) => (
            <div key={type} style={{ marginBottom: 8 }}>
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
                    color: C.text,
                    textTransform: "capitalize",
                  }}
                >
                  {SERVICE_LABELS[type] || type}
                </span>
                <span
                  style={{ fontSize: 12, fontWeight: 700, color: C.textSec }}
                >
                  {n} ({Math.round((n / total) * 100)}%)
                </span>
              </div>
              <div
                style={{
                  height: 5,
                  background: C.surfaceEl,
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.round((n / maxSvc) * 100)}%`,
                    height: "100%",
                    background: C.blue,
                    borderRadius: 3,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
function ReceptionistDashboard({ user, onLogout }) {
  const [tab, setTab] = useState(0);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(today());
  const [modal, setModal] = useState(null); // null | { type, booking }
  const [showNew, setShowNew] = useState(false);

  const fetchAll = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    const { data } = await supabase
      .from("bookings")
      .select(
        "*,assigned_advisor:users!bookings_assigned_advisor_id_fkey(full_name),vehicle_rec:vehicle_records!bookings_vehicle_number_fkey(visit_count)",
      )
      .order("preferred_date", { ascending: false })
      .order("preferred_time", { ascending: true });
    // Enrich with visit_count from vehicle_records
    setBookings(
      (data || []).map((b) => ({
        ...b,
        visit_count: b.vehicle_rec?.visit_count || 1,
      })),
    );
    if (showLoader) setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const ch = supabase
      .channel("receptionist-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => fetchAll(false),
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchAll]);

  const handleAction = async (type, booking) => {
    if (type === "view") {
      setModal({ type: "view", booking });
      return;
    }
    if (type === "confirm") {
      setModal({ type: "confirm", booking });
      return;
    }
    if (type === "reschedule") {
      setModal({ type: "reschedule", booking });
      return;
    }
    if (type === "cancel") {
      setModal({ type: "cancel", booking });
      return;
    }

    if (type === "no_answer") {
      await logActivity(
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
      await logActivity(booking.id, user.id, "no_show", "Marked as no-show");
      fetchAll(false);
    }
  };

  const closeModal = () => setModal(null);
  const afterAction = () => {
    setModal(null);
    fetchAll(false);
  };

  const todayBookings = bookings.filter((b) => b.preferred_date === today());

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
          Loading Bookings…
        </div>
        <style>{`@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}`}</style>
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
        {`*{box-sizing:border-box;} ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:${C.surfaceEl}} ::-webkit-scrollbar-thumb{background:${C.borderStr};border-radius:3px} input[type="date"]::-webkit-calendar-picker-indicator{cursor:pointer}`}
      </style>

      {/* Header */}
      <div
        style={{
          background: C.primary,
          padding: "0 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          height: 56,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              overflow: "hidden",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 900,
              color: C.primary,
              flexShrink: 0,
            }}
          >
            S
          </div>
          <div>
            <div style={{ color: "#f8fafc", fontWeight: 800, fontSize: 13 }}>
              Sheetal Automobiles
            </div>
            <div style={{ color: "#64748b", fontSize: 10 }}>
              Reception · Booking Management
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Today count chip */}
          {todayBookings.filter((b) =>
            ["pending", "confirmed"].includes(b.status),
          ).length > 0 && (
            <div
              style={{
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 12,
                padding: "3px 10px",
                fontSize: 11,
                fontWeight: 800,
                color: "#f87171",
              }}
            >
              {
                todayBookings.filter((b) =>
                  ["pending", "confirmed"].includes(b.status),
                ).length
              }{" "}
              pending today
            </div>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 10px",
              background: "rgba(16,185,129,0.15)",
              borderRadius: 12,
              border: "1px solid rgba(16,185,129,0.2)",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: C.green,
              }}
            />
            <span style={{ fontSize: 10, fontWeight: 800, color: C.green }}>
              LIVE
            </span>
          </div>
          <Btn v="primary" sz="sm" onClick={() => setShowNew(true)}>
            + New Booking
          </Btn>
          <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>
            {user?.full_name}
          </span>
          <button
            onClick={onLogout}
            style={{
              background: "none",
              border: "1px solid #334155",
              borderRadius: 6,
              color: "#f87171",
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

      {/* Tab bar */}
      <div
        style={{
          background: C.surface,
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          padding: "0 20px",
          gap: 0,
          overflowX: "auto",
        }}
      >
        {TABS.map((t, i) => {
          let badge = null;
          if (i === 0)
            badge = todayBookings.filter((b) =>
              ["pending", "confirmed", "arrived"].includes(b.status),
            ).length;
          if (i === 3)
            badge = bookings.filter((b) =>
              ["pending", "confirmed"].includes(b.status),
            ).length; // follow-ups count shown in All
          return (
            <button
              key={t}
              onClick={() => {
                setTab(i);
                if (i === 0 || i === 1) setViewDate(today());
              }}
              style={{
                padding: "13px 18px",
                border: "none",
                borderBottom: `2px solid ${tab === i ? C.amber : "transparent"}`,
                background: "none",
                color: tab === i ? C.amber : C.textSec,
                fontWeight: tab === i ? 700 : 500,
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "inherit",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {t}
              {badge > 0 && (
                <span
                  style={{
                    background: tab === i ? C.amber : "#e2e8f0",
                    color: tab === i ? "#fff" : C.textSec,
                    borderRadius: 10,
                    padding: "1px 6px",
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
      </div>

      {/* Content */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: 20 }}>
        {tab === 0 && (
          <DateTab
            bookings={bookings}
            user={user}
            viewDate={viewDate}
            onDateChange={setViewDate}
            onAction={handleAction}
          />
        )}
        {tab === 1 && (
          <DateTab
            bookings={bookings}
            user={user}
            viewDate={viewDate}
            onDateChange={setViewDate}
            onAction={handleAction}
          />
        )}
        {tab === 2 && (
          <AllBookingsTab
            bookings={bookings}
            user={user}
            onAction={handleAction}
          />
        )}
        {tab === 3 && (
          <FollowUpsTab
            bookings={bookings}
            user={user}
            onAction={handleAction}
          />
        )}
        {tab === 4 && <StatsTab bookings={bookings} />}
      </div>

      {/* Modals */}
      {modal?.type === "view" && (
        <BookingDetailModal booking={modal.booking} onClose={closeModal} />
      )}
      {modal?.type === "confirm" && (
        <ConfirmModal
          booking={modal.booking}
          user={user}
          onClose={closeModal}
          onSave={afterAction}
        />
      )}
      {modal?.type === "reschedule" && (
        <RescheduleModal
          booking={modal.booking}
          user={user}
          onClose={closeModal}
          onSave={afterAction}
        />
      )}
      {modal?.type === "cancel" && (
        <CancelModal
          booking={modal.booking}
          user={user}
          onClose={closeModal}
          onSave={afterAction}
        />
      )}
      {showNew && (
        <NewBookingModal
          user={user}
          onClose={() => setShowNew(false)}
          onSave={() => {
            setShowNew(false);
            fetchAll(false);
          }}
        />
      )}
    </div>
  );
}

export default ReceptionistDashboard;
