import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  primary: "#1E293B", // slate — header, matching all dashboards
  primaryHover: "#334155",
  bg: "#F1F5F9",
  surface: "#FFFFFF",
  surfaceEl: "#F8FAFC", // elevated / alt row bg
  border: "#E2E8F0",
  shadow: "0 1px 3px rgba(0,0,0,0.08)",
  shadowMd: "0 4px 6px rgba(0,0,0,0.07)",
  shadowLg: "0 10px 20px rgba(0,0,0,0.1)",
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
  orange: "#F97316",
  orangeLight: "#FFF7ED",
};

const FONT = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');`;

// ─── Constants ────────────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", icon: "💵" },
  { value: "upi_phonepe", label: "PhonePe", icon: "💜" },
  { value: "upi_gpay", label: "Google Pay", icon: "🟢" },
  { value: "upi_icici", label: "ICICI UPI", icon: "🔴" },
  { value: "upi_other", label: "Other UPI", icon: "📱" },
  { value: "card", label: "Card", icon: "💳" },
  { value: "bank_transfer", label: "Bank Transfer", icon: "🏦" },
  { value: "credit", label: "Credit (Pay Later)", icon: "📋" },
];
const METHOD_NEEDS_TXN = [
  "card",
  "upi_phonepe",
  "upi_gpay",
  "upi_icici",
  "upi_other",
  "bank_transfer",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
// FIX 1: toZ — Supabase returns timestamps without "Z", JS treats as local without it
const toZ = (s) =>
  !s ? null : String(s).includes("Z") || String(s).includes("+") ? s : s + "Z";

// FIX 2: formatIST uses toZ fix
const formatIST = (s) => {
  if (!s) return "—";
  return new Date(toZ(s)).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatISTShort = (s) => {
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

const fmtINR = (n) =>
  `₹${(parseFloat(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

// FIX 3: IST midnight UTC (was using setHours which uses local TZ)
const getISTMidnightUTC = () => {
  const off = 5.5 * 3600000;
  const istNow = new Date(Date.now() + off);
  istNow.setUTCHours(0, 0, 0, 0);
  return new Date(istNow.getTime() - off).toISOString();
};

const methodLabel = (v) =>
  PAYMENT_METHODS.find((m) => m.value === v)?.label || v;
const methodIcon = (v) =>
  PAYMENT_METHODS.find((m) => m.value === v)?.icon || "💰";

const PRIORITY_ORDER = { vip: 0, urgent: 1, normal: 2 };

const timeInWorkshop = (entryTime) => {
  if (!entryTime) return "—";
  const diff = Date.now() - new Date(toZ(entryTime)).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 0) return "—";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m > 0 ? ` ${m}m` : ""}`;
};

const creditAgeDays = (visits) => {
  const oldest = visits.reduce((d, v) => {
    const vd = new Date(toZ(v.entry_time));
    return vd < d ? vd : d;
  }, new Date());
  return Math.floor((Date.now() - oldest.getTime()) / 86400000);
};

const creditAgeStyle = (days) => {
  if (days >= 30)
    return { color: C.red, bg: C.redLight, label: `${days}d overdue` };
  if (days >= 7)
    return { color: C.amber, bg: C.amberLight, label: `${days}d outstanding` };
  return { color: C.green, bg: C.greenLight, label: `${days}d old` };
};

// ─── Shared Primitives ────────────────────────────────────────────────────────
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

const Btn = ({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  style = {},
}) => {
  const vs = {
    primary: { bg: C.amber, color: "#fff", border: C.amber },
    success: { bg: C.green, color: "#fff", border: C.green },
    secondary: { bg: C.surfaceEl, color: C.text, border: C.border },
    danger: { bg: C.red, color: "#fff", border: C.red },
    ghost: { bg: "transparent", color: C.textSec, border: C.border },
  };
  const v = vs[variant] || vs.primary;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? C.surfaceEl : v.bg,
        color: disabled ? C.textMuted : v.color,
        border: `1px solid ${disabled ? C.border : v.border}`,
        borderRadius: 8,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        opacity: disabled ? 0.6 : 1,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "9px 18px",
        fontSize: 14,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </button>
  );
};

const AmountBox = ({ label, amount, color, border, text }) => (
  <div
    style={{
      padding: "14px 16px",
      backgroundColor: color,
      borderRadius: 10,
      border: `2px solid ${border}`,
      textAlign: "center",
    }}
  >
    <div
      style={{
        fontSize: 11,
        color: C.textMuted,
        fontWeight: 700,
        marginBottom: 4,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: 22,
        fontWeight: 800,
        color: text,
        fontFamily: "'DM Mono',monospace",
      }}
    >
      {fmtINR(amount)}
    </div>
  </div>
);

const InfoRow = ({ label, value }) => (
  <div style={{ display: "flex", gap: 8, fontSize: 13 }}>
    <span style={{ color: C.textMuted, minWidth: 90 }}>{label}:</span>
    <span style={{ color: C.text, fontWeight: 500 }}>{value}</span>
  </div>
);

const ModelBadge = ({ model, small }) => (
  <span
    style={{
      backgroundColor: C.purpleLight,
      color: C.purple,
      padding: small ? "2px 8px" : "3px 10px",
      borderRadius: 6,
      fontSize: small ? 11 : 12,
      fontWeight: 600,
    }}
  >
    {model}
  </span>
);

const PriorityBadge = ({ priority, small }) => {
  const isVip = priority === "vip";
  return (
    <span
      style={{
        padding: small ? "2px 8px" : "3px 10px",
        backgroundColor: isVip ? C.purpleLight : C.redLight,
        color: isVip ? C.purple : C.red,
        borderRadius: 6,
        fontSize: small ? 11 : 12,
        fontWeight: 600,
        textTransform: "uppercase",
      }}
    >
      {priority}
    </span>
  );
};

const EmptyState = ({ icon, title, subtitle }) => (
  <div
    style={{
      textAlign: "center",
      padding: "72px 0",
      color: C.textMuted,
      backgroundColor: C.surface,
      borderRadius: 12,
      border: `1px solid ${C.border}`,
    }}
  >
    <div style={{ fontSize: 48, marginBottom: 14 }}>{icon}</div>
    <div
      style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 6 }}
    >
      {title}
    </div>
    {subtitle && <div style={{ fontSize: 13 }}>{subtitle}</div>}
  </div>
);

const SecHead = ({ title, color = C.amber }) => (
  <div
    style={{
      fontSize: 11,
      fontWeight: 800,
      color: C.textMuted,
      textTransform: "uppercase",
      letterSpacing: "0.6px",
      marginBottom: 12,
      paddingBottom: 7,
      borderBottom: `2px solid ${color}`,
    }}
  >
    {title}
  </div>
);

// Modal overlay + shell — reused by all modals
const Overlay = ({ children, onClose, maxWidth = 580 }) => (
  <>
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 1000,
        backdropFilter: "blur(2px)",
      }}
    />
    <div
      style={{
        position: "fixed",
        top: "3vh",
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(" + maxWidth + "px,96vw)",
        maxHeight: "94vh",
        zIndex: 1001,
        display: "flex",
        flexDirection: "column",
        background: C.surface,
        borderRadius: 14,
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        border: `1px solid ${C.border}`,
        overflow: "hidden",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  </>
);

const ModalHead = ({ title, subtitle, onClose }) => (
  <div
    style={{
      background: C.primary,
      padding: "16px 24px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      flexShrink: 0,
    }}
  >
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>
        {title}
      </div>
      {subtitle && (
        <div
          style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}
        >
          {subtitle}
        </div>
      )}
    </div>
    <button
      onClick={onClose}
      style={{
        background: "rgba(255,255,255,0.1)",
        border: "1px solid rgba(255,255,255,0.2)",
        borderRadius: 7,
        width: 34,
        height: 34,
        color: "rgba(255,255,255,0.8)",
        fontSize: 14,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      ✕
    </button>
  </div>
);

const LabelText = ({ children }) => (
  <div
    style={{
      fontSize: 12,
      fontWeight: 700,
      color: C.textSec,
      textTransform: "uppercase",
      letterSpacing: "0.4px",
      marginBottom: 7,
    }}
  >
    {children}
  </div>
);

const StyledInput = ({ as, style, ...props }) => {
  const base = {
    width: "100%",
    padding: "10px 12px",
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    fontSize: 14,
    boxSizing: "border-box",
    fontFamily: "inherit",
    outline: "none",
    color: C.text,
    backgroundColor: C.surface,
    ...style,
  };
  return as === "textarea" ? (
    <textarea style={{ ...base, resize: "vertical" }} {...props} />
  ) : (
    <input
      style={base}
      {...props}
      onFocus={(e) => (e.target.style.borderColor = C.amber)}
      onBlur={(e) => (e.target.style.borderColor = C.border)}
    />
  );
};

const SelectInput = ({ style, ...props }) => (
  <select
    style={{
      width: "100%",
      padding: "10px 12px",
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      fontSize: 14,
      boxSizing: "border-box",
      backgroundColor: C.surface,
      color: C.text,
      cursor: "pointer",
      fontFamily: "inherit",
      ...style,
    }}
    {...props}
  />
);

const OptionCard = ({ children, selected, onClick }) => (
  <label
    onClick={onClick}
    style={{
      display: "flex",
      alignItems: "center",
      padding: 14,
      backgroundColor: selected ? C.amberLight : C.surfaceEl,
      border: `2px solid ${selected ? C.amber : C.border}`,
      borderRadius: 10,
      cursor: "pointer",
      color: C.text,
      transition: "all 0.15s",
    }}
  >
    {children}
  </label>
);
// ─── PaymentFormModal ─────────────────────────────────────────────────────────
// FIX 4: receives `user` prop instead of calling getCurrentUser()
function PaymentFormModal({ vehicle, user, onClose, onSuccess }) {
  const [payType, setPayType] = useState("full");
  const [fullMethod, setFullMethod] = useState("cash");
  const [fullTxnId, setFullTxnId] = useState("");
  const [partialLines, setPartialLines] = useState([
    { method: "cash", amount: "", txnId: "" },
  ]);
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");
  const [guaranteedBy, setGuaranteedBy] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmStep, setConfirmStep] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const bill = parseFloat(vehicle.bill_amount) || 0;
  const alreadyPaid = parseFloat(vehicle.total_paid) || 0;
  const previousCredit = parseFloat(vehicle.previous_credit) || 0;
  const discountAmount = Math.min(parseFloat(discount) || 0, bill);
  const currentOutstanding = bill - alreadyPaid - discountAmount;
  const totalOutstanding = currentOutstanding + previousCredit;

  const addLine = () =>
    setPartialLines((p) => [...p, { method: "cash", amount: "", txnId: "" }]);
  const removeLine = (i) =>
    setPartialLines((p) => p.filter((_, idx) => idx !== i));
  const updateLine = (i, field, val) =>
    setPartialLines((p) =>
      p.map((l, idx) => (idx === i ? { ...l, [field]: val } : l)),
    );

  const partialTotal = partialLines.reduce(
    (s, l) => s + (parseFloat(l.amount) || 0),
    0,
  );
  const partialCredit = partialLines
    .filter((l) => l.method === "credit")
    .reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const hasAnyCredit =
    (payType === "full" && fullMethod === "credit") ||
    (payType === "partial" && partialCredit > 0);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      // ── Validation ──
      if (payType === "full") {
        if (METHOD_NEEDS_TXN.includes(fullMethod) && !fullTxnId.trim())
          throw new Error(`Transaction ID required for ${fullMethod}`);
      } else {
        if (!partialLines.length)
          throw new Error("Add at least one payment line");
        for (const l of partialLines) {
          if (!l.amount || parseFloat(l.amount) <= 0)
            throw new Error("All amounts must be > 0");
          if (METHOD_NEEDS_TXN.includes(l.method) && !l.txnId.trim())
            throw new Error(`Transaction ID required for ${l.method}`);
        }
        if (Math.abs(partialTotal - totalOutstanding) > 0.01)
          throw new Error(
            `Lines must sum to ${fmtINR(totalOutstanding)}. Got ${fmtINR(partialTotal)}`,
          );
      }
      if (hasAnyCredit && !guaranteedBy.trim())
        throw new Error("Employee guarantee required when giving credit");

      // ── Build payment rows ──
      let paymentRows = [],
        newCreditAmount = 0,
        collectedAmount = 0;
      if (payType === "full") {
        if (fullMethod === "credit") {
          paymentRows.push({
            vehicle_id: vehicle.id,
            amount: totalOutstanding,
            payment_method: "credit",
            transaction_id: null,
            collected_by: user?.id,
            notes,
          });
          newCreditAmount = totalOutstanding;
          collectedAmount = alreadyPaid;
        } else {
          paymentRows.push({
            vehicle_id: vehicle.id,
            amount: totalOutstanding,
            payment_method: fullMethod,
            transaction_id: fullTxnId || null,
            collected_by: user?.id,
            notes,
          });
          collectedAmount = alreadyPaid + totalOutstanding;
          newCreditAmount = 0;
        }
      } else {
        for (const l of partialLines)
          paymentRows.push({
            vehicle_id: vehicle.id,
            amount: parseFloat(l.amount),
            payment_method: l.method,
            transaction_id: l.txnId || null,
            collected_by: user?.id,
            notes: notes || null,
          });
        collectedAmount = alreadyPaid + (partialTotal - partialCredit);
        newCreditAmount =
          (parseFloat(vehicle.credit_amount) || 0) + partialCredit;
      }

      // ── payment_status ──
      const hasCredit = newCreditAmount > 0;
      let paymentStatus = "paid";
      if (hasCredit && collectedAmount > 0) paymentStatus = "partial";
      else if (hasCredit && collectedAmount === 0) paymentStatus = "credit";

      const { error: pErr } = await supabase
        .from("payments")
        .insert(paymentRows);
      if (pErr) throw pErr;

      // Smart routing: if in payment → ready_for_exit; else stay
      const nextStage =
        vehicle.current_stage === "payment"
          ? "ready_for_exit"
          : vehicle.current_stage;
      const { error: vErr } = await supabase
        .from("vehicles")
        .update({
          current_stage: nextStage,
          current_status: "pending",
          payment_status: paymentStatus,
          total_paid: collectedAmount,
          credit_amount: newCreditAmount,
          credit_guaranteed_by: hasAnyCredit ? guaranteedBy.trim() : null,
          discount_amount: discountAmount > 0 ? discountAmount : null,
          payment_received_at: new Date().toISOString(),
          payment_received_by: user?.id,
        })
        .eq("id", vehicle.id);
      if (vErr) throw vErr;

      const summary =
        payType === "full"
          ? `${fmtINR(totalOutstanding)} via ${methodLabel(fullMethod)}${discountAmount > 0 ? ` | Discount: ${fmtINR(discountAmount)}` : ""}${hasAnyCredit ? ` | Guaranteed by: ${guaranteedBy}` : ""}`
          : partialLines
              .map((l) => `${fmtINR(l.amount)} via ${methodLabel(l.method)}`)
              .join(", ") +
            (discountAmount > 0
              ? ` | Discount: ${fmtINR(discountAmount)}`
              : "") +
            (hasAnyCredit ? ` | Guaranteed by: ${guaranteedBy}` : "");

      await supabase.from("vehicle_history").insert([
        {
          vehicle_id: vehicle.id,
          user_id: user?.id || null,
          stage: "payment",
          action: "payment_received",
          new_value: summary,
          notes: notes || null,
        },
      ]);

      setSuccessMsg(
        `✅ Payment processed — vehicle moved to ${nextStage.replace(/_/g, " ")}${hasCredit ? `. Credit pending: ${fmtINR(newCreditAmount)}` : ""}`,
      );
      setTimeout(onSuccess, 1800);
    } catch (e) {
      setError(e.message || "Failed to process payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Overlay onClose={onClose} maxWidth={600}>
      <ModalHead
        title="💳 Process Payment"
        subtitle={`${vehicle.vehicle_number} · ${vehicle.customer_name}`}
        onClose={onClose}
      />
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        {/* Amount summary */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: previousCredit > 0 ? 12 : 24,
          }}
        >
          <AmountBox
            label="Current Bill"
            amount={bill}
            color={C.blueLight}
            border={C.blue + "44"}
            text={C.blue}
          />
          <AmountBox
            label="Total Outstanding"
            amount={totalOutstanding}
            color={previousCredit > 0 ? C.orangeLight : C.amberLight}
            border={previousCredit > 0 ? C.orange : C.amber}
            text={previousCredit > 0 ? "#9a3412" : C.amber}
          />
        </div>
        {previousCredit > 0 && (
          <div
            style={{
              padding: "10px 14px",
              backgroundColor: C.amberLight,
              border: `1px solid ${C.amber}44`,
              borderRadius: 8,
              marginBottom: 20,
              fontSize: 13,
              color: "#92400e",
            }}
          >
            ⚠️ Includes <strong>{fmtINR(previousCredit)}</strong> from previous
            visit(s). Current bill: <strong>{fmtINR(bill)}</strong>
          </div>
        )}

        {/* Discount */}
        <div style={{ marginBottom: 20 }}>
          <LabelText>Discount (Optional)</LabelText>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 13,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 18,
                color: C.textMuted,
                fontWeight: 700,
              }}
            >
              ₹
            </span>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="0"
              min="0"
              max={bill}
              style={{
                width: "100%",
                padding: "11px 11px 11px 34px",
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 700,
                color: C.text,
                background: C.surface,
                outline: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = C.green)}
              onBlur={(e) => (e.target.style.borderColor = C.border)}
            />
          </div>
          {discountAmount > 0 && (
            <div
              style={{
                marginTop: 6,
                padding: "6px 12px",
                background: C.greenLight,
                borderRadius: 6,
                border: `1px solid ${C.green}44`,
                fontSize: 13,
                color: C.green,
                fontWeight: 600,
              }}
            >
              ✅ Discount {fmtINR(discountAmount)} applied — new outstanding:{" "}
              {fmtINR(totalOutstanding)}
            </div>
          )}
        </div>

        {/* Full / Partial */}
        <div style={{ marginBottom: 20 }}>
          <LabelText>Payment Type</LabelText>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            {[
              {
                v: "full",
                label: "✅ Full Payment",
                sub: `Pay ${fmtINR(totalOutstanding)}`,
              },
              {
                v: "partial",
                label: "⚡ Partial / Split",
                sub: "Split across methods",
              },
            ].map((opt) => (
              <OptionCard
                key={opt.v}
                selected={payType === opt.v}
                onClick={() => setPayType(opt.v)}
              >
                <input
                  type="radio"
                  name="payType"
                  value={opt.v}
                  checked={payType === opt.v}
                  onChange={() => setPayType(opt.v)}
                  style={{ marginRight: 10 }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>
                    {opt.sub}
                  </div>
                </div>
              </OptionCard>
            ))}
          </div>
        </div>

        {/* Full — method selector */}
        {payType === "full" && (
          <>
            <div style={{ marginBottom: 16 }}>
              <LabelText>Payment Method</LabelText>
              <div style={{ display: "grid", gap: 8 }}>
                {PAYMENT_METHODS.map((m) => (
                  <OptionCard
                    key={m.value}
                    selected={fullMethod === m.value}
                    onClick={() => setFullMethod(m.value)}
                  >
                    <input
                      type="radio"
                      name="fullMethod"
                      value={m.value}
                      checked={fullMethod === m.value}
                      onChange={() => setFullMethod(m.value)}
                      style={{ marginRight: 10 }}
                    />
                    <span style={{ fontSize: 20, marginRight: 10 }}>
                      {m.icon}
                    </span>
                    <span style={{ fontWeight: 600 }}>{m.label}</span>
                    {m.value === "credit" && (
                      <span
                        style={{
                          marginLeft: "auto",
                          fontSize: 11,
                          color: C.red,
                          backgroundColor: C.redLight,
                          padding: "2px 8px",
                          borderRadius: 4,
                        }}
                      >
                        Vehicle exits, owes money
                      </span>
                    )}
                  </OptionCard>
                ))}
              </div>
            </div>
            {METHOD_NEEDS_TXN.includes(fullMethod) && (
              <div style={{ marginBottom: 16 }}>
                <LabelText>Transaction ID *</LabelText>
                <StyledInput
                  value={fullTxnId}
                  onChange={(e) => setFullTxnId(e.target.value)}
                  placeholder="Enter transaction / reference ID"
                />
              </div>
            )}
          </>
        )}

        {/* Partial — split lines */}
        {payType === "partial" && (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <LabelText>Split Payment Lines</LabelText>
              <Btn
                variant="ghost"
                onClick={addLine}
                style={{ fontSize: 13, padding: "5px 12px" }}
              >
                + Add Line
              </Btn>
            </div>
            {partialLines.map((line, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 130px auto",
                  gap: 10,
                  alignItems: "flex-start",
                  marginBottom: 10,
                  padding: 14,
                  backgroundColor: C.surfaceEl,
                  borderRadius: 10,
                  border: `1px solid ${C.border}`,
                }}
              >
                <div>
                  <SelectInput
                    value={line.method}
                    onChange={(e) => updateLine(i, "method", e.target.value)}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.icon} {m.label}
                      </option>
                    ))}
                  </SelectInput>
                  {METHOD_NEEDS_TXN.includes(line.method) && (
                    <StyledInput
                      style={{ marginTop: 6 }}
                      value={line.txnId}
                      onChange={(e) => updateLine(i, "txnId", e.target.value)}
                      placeholder="Transaction ID"
                    />
                  )}
                </div>
                <StyledInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.amount}
                  onChange={(e) => updateLine(i, "amount", e.target.value)}
                  placeholder="Amount"
                />
                {partialLines.length > 1 && (
                  <button
                    onClick={() => removeLine(i)}
                    style={{
                      padding: "8px 12px",
                      background: C.redLight,
                      color: C.red,
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 16,
                      marginTop: 2,
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <div
              style={{
                padding: "12px 16px",
                backgroundColor:
                  Math.abs(partialTotal - totalOutstanding) < 0.01
                    ? C.greenLight
                    : C.amberLight,
                borderRadius: 8,
                border: `1px solid ${Math.abs(partialTotal - totalOutstanding) < 0.01 ? C.green : C.amber}44`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 14,
                }}
              >
                <span>Sum of lines:</span>
                <span style={{ fontWeight: 700 }}>{fmtINR(partialTotal)}</span>
              </div>
              {partialCredit > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    marginTop: 4,
                  }}
                >
                  <span style={{ color: C.red }}>Credit portion:</span>
                  <span style={{ fontWeight: 700, color: C.red }}>
                    {fmtINR(partialCredit)}
                  </span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  marginTop: 4,
                }}
              >
                <span style={{ color: C.textMuted }}>
                  Must equal outstanding:
                </span>
                <span style={{ fontWeight: 600, color: C.textMuted }}>
                  {fmtINR(totalOutstanding)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Guarantor */}
        {hasAnyCredit && (
          <div
            style={{
              marginBottom: 20,
              padding: "16px 20px",
              backgroundColor: C.amberLight,
              borderRadius: 12,
              border: `2px solid ${C.amber}`,
            }}
          >
            <LabelText>
              👤 Employee Guarantee <span style={{ color: C.red }}>*</span>
            </LabelText>
            <div style={{ fontSize: 12, color: "#92400e", marginBottom: 10 }}>
              Credit cannot be issued without an employee taking responsibility.
              This name will be recorded.
            </div>
            <StyledInput
              value={guaranteedBy}
              onChange={(e) => setGuaranteedBy(e.target.value)}
              placeholder="Full name of guaranteeing employee..."
              style={{ backgroundColor: C.surface, borderColor: C.amber }}
            />
          </div>
        )}

        {/* Notes */}
        <div style={{ marginBottom: 20 }}>
          <LabelText>Notes (Optional)</LabelText>
          <StyledInput
            as="textarea"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes..."
          />
        </div>

        {error && (
          <div
            style={{
              backgroundColor: C.redLight,
              color: C.red,
              padding: "10px 14px",
              borderRadius: 8,
              marginBottom: 14,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {/* ── Confirm step ── */}
        {confirmStep && !successMsg && (
          <div
            style={{
              backgroundColor: C.surfaceEl,
              borderRadius: 12,
              padding: 18,
              marginBottom: 14,
              border: `2px solid ${C.green}44`,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: C.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: 12,
              }}
            >
              Confirm Payment Details
            </div>
            {[
              ["Vehicle", vehicle.vehicle_number],
              ["Customer", vehicle.customer_name || "—"],
              ["Amount", fmtINR(totalOutstanding)],
              [
                "Method",
                payType === "full"
                  ? methodLabel(fullMethod)
                  : `Split (${partialLines.length} lines)`,
              ],
              ...(discountAmount > 0
                ? [["Discount", fmtINR(discountAmount)]]
                : []),
              ...(hasAnyCredit ? [["Guaranteed by", guaranteedBy]] : []),
              ...(vehicle.current_stage === "payment"
                ? [["Action", "Vehicle → Ready for Exit"]]
                : [["Action", "Bill saved (vehicle stays in current stage)"]]),
            ].map(([label, val]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  marginBottom: 6,
                }}
              >
                <span style={{ color: C.textMuted, fontWeight: 600 }}>
                  {label}
                </span>
                <span style={{ color: C.text, fontWeight: 700 }}>{val}</span>
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <Btn
                variant="secondary"
                onClick={() => setConfirmStep(false)}
                style={{ flex: 1, justifyContent: "center" }}
              >
                ← Go Back
              </Btn>
              <Btn
                variant="success"
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  flex: 2,
                  justifyContent: "center",
                  padding: 14,
                  fontSize: 15,
                }}
              >
                {loading ? "Processing..." : "✓ Confirm & Process"}
              </Btn>
            </div>
          </div>
        )}
        {/* Success state */}
        {successMsg && (
          <div
            style={{
              backgroundColor: C.greenLight,
              border: `1px solid ${C.green}44`,
              borderRadius: 10,
              padding: "18px 20px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>
              {successMsg}
            </div>
          </div>
        )}
        {/* Initial confirm button */}
        {!confirmStep && !successMsg && (
          <Btn
            variant="success"
            onClick={() => {
              setError("");
              setConfirmStep(true);
            }}
            disabled={
              loading ||
              (payType === "partial" &&
                Math.abs(partialTotal - totalOutstanding) > 0.01)
            }
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "14px",
              fontSize: 15,
            }}
          >
            Review & Confirm — {fmtINR(totalOutstanding)}
          </Btn>
        )}
      </div>
    </Overlay>
  );
}
// ─── CashierBillOverrideModal ──────────────────────────────────────────────────
// Lets the cashier enter a bill amount for a vehicle that hasn't reached
// Billing yet, bypassing that department. Only writes bill_amount +
// override-audit columns; current_stage is left untouched. On success, the
// caller opens the normal, unmodified PaymentFormModal for the same vehicle.
function CashierBillOverrideModal({ vehicle, user, onClose, onSuccess }) {
  const [amount, setAmount] = useState(
    vehicle.bill_amount ? String(vehicle.bill_amount) : "",
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const stageLabel =
    PIPELINE_STAGE_LABELS[vehicle.current_stage] ||
    (vehicle.current_stage || "").replace(/_/g, " ");

  const handleSubmit = async () => {
    setError("");
    const billAmount = parseFloat(amount);
    if (!billAmount || billAmount <= 0) {
      setError("Enter a bill amount greater than 0");
      return;
    }
    setLoading(true);
    try {
      const nowIso = new Date().toISOString();
      const { error: vErr } = await supabase
        .from("vehicles")
        .update({
          bill_amount: billAmount,
          bill_generated_at: nowIso,
          bill_generated_by: user?.id || null,
          billed_by_cashier_override: true,
          billed_by_cashier_override_by: user?.id || null,
          billed_by_cashier_override_at: nowIso,
        })
        .eq("id", vehicle.id);
      if (vErr) throw vErr;

      await supabase.from("vehicle_history").insert([
        {
          vehicle_id: vehicle.id,
          user_id: user?.id || null,
          stage: "billing",
          action: "bill_generated_cashier_override",
          new_value: `${fmtINR(billAmount)} — entered by cashier, billing department bypassed`,
          notes: notes || null,
        },
      ]);

      onSuccess({
        ...vehicle,
        bill_amount: billAmount,
        bill_generated_at: nowIso,
        bill_generated_by: user?.id || null,
        billed_by_cashier_override: true,
        billed_by_cashier_override_by: user?.id || null,
        billed_by_cashier_override_at: nowIso,
      });
    } catch (e) {
      setError(e.message || "Failed to save bill amount");
      setLoading(false);
    }
  };

  return (
    <Overlay onClose={onClose} maxWidth={480}>
      <ModalHead
        title="⚡ Enter Bill — Cashier Override"
        subtitle={`${vehicle.vehicle_number} · ${vehicle.customer_name || "—"}`}
        onClose={onClose}
      />
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        <div
          style={{
            backgroundColor: C.amberLight,
            border: `1px solid ${C.amber}44`,
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 20,
            fontSize: 12,
            color: "#92400e",
          }}
        >
          This vehicle is still at <strong>{stageLabel}</strong>, not yet at
          Billing. Entering a bill here skips the billing department — it will
          be flagged for their review.
        </div>

        <div style={{ marginBottom: 20 }}>
          <LabelText>Bill Amount (₹)</LabelText>
          <StyledInput
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            autoFocus
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <LabelText>Notes (Optional)</LabelText>
          <StyledInput
            as="textarea"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Why is this being billed early..."
          />
        </div>

        {error && (
          <div
            style={{
              backgroundColor: C.redLight,
              color: C.red,
              padding: "10px 14px",
              borderRadius: 8,
              marginBottom: 14,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        <Btn
          variant="success"
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%",
            justifyContent: "center",
            padding: "14px",
            fontSize: 15,
          }}
        >
          {loading ? "Saving..." : "Continue to Payment →"}
        </Btn>
      </div>
    </Overlay>
  );
}
// ─── CreditCollectionModal ────────────────────────────────────────────────────
// FIX 4: receives `user` prop — no localStorage
function CreditCollectionModal({ group, user, onClose, onSuccess }) {
  const creditPending = group.total_credit;
  const [collectType, setCollectType] = useState("full");
  const [method, setMethod] = useState("cash");
  const [amount, setAmount] = useState(creditPending.toFixed(2));
  const [txnId, setTxnId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleCollect = async () => {
    setError("");
    const collectAmount = parseFloat(amount) || 0;
    if (collectAmount <= 0) {
      setError("Amount must be > 0");
      return;
    }
    if (collectAmount > creditPending + 0.01) {
      setError(`Cannot collect more than ${fmtINR(creditPending)}`);
      return;
    }
    if (METHOD_NEEDS_TXN.includes(method) && !txnId.trim()) {
      setError("Transaction ID required");
      return;
    }
    setLoading(true);
    try {
      // Deduct from visits oldest-first
      let remaining = collectAmount;
      const sortedVisits = [...group.visits].sort(
        (a, b) => new Date(toZ(a.entry_time)) - new Date(toZ(b.entry_time)),
      );
      const updates = [];
      for (const visit of sortedVisits) {
        if (remaining <= 0) break;
        const visitCredit = parseFloat(visit.credit_amount) || 0;
        if (visitCredit <= 0) continue;
        const deduct = Math.min(remaining, visitCredit);
        const newCredit = Math.round((visitCredit - deduct) * 100) / 100;
        const newPaid =
          Math.round(((parseFloat(visit.total_paid) || 0) + deduct) * 100) /
          100;
        updates.push({
          id: visit.id,
          credit_amount: newCredit,
          total_paid: newPaid,
          payment_status: newCredit <= 0.01 ? "paid" : "partial",
        });
        remaining = Math.round((remaining - deduct) * 100) / 100;
      }
      // Insert one payment row per affected visit (proportional to amount deducted)
      const paymentRows = updates.map((u) => {
        const visitCredit = parseFloat(
          sortedVisits.find((v) => v.id === u.id)?.credit_amount || 0,
        );
        const deducted = visitCredit - u.credit_amount;
        return {
          vehicle_id: u.id,
          amount: deducted,
          payment_method: method,
          transaction_id: txnId || null,
          collected_by: user?.id,
          notes: notes || null,
        };
      });
      const { error: pErr } = await supabase
        .from("payments")
        .insert(paymentRows);
      if (pErr) throw pErr;
      for (const u of updates) {
        const { error: vErr } = await supabase
          .from("vehicles")
          .update({
            credit_amount: u.credit_amount,
            total_paid: u.total_paid,
            payment_status: u.payment_status,
          })
          .eq("id", u.id);
        if (vErr) throw vErr;
      }
      // Log history on all affected visits
      await supabase.from("vehicle_history").insert(
        updates.map((u) => {
          const visitCredit = parseFloat(
            sortedVisits.find((v) => v.id === u.id)?.credit_amount || 0,
          );
          const deducted = visitCredit - u.credit_amount;
          return {
            vehicle_id: u.id,
            user_id: user?.id || null,
            stage: "payment",
            action: "credit_collected",
            new_value: `Credit collected: ${fmtINR(deducted)} via ${methodLabel(method)}. Remaining on this visit: ${fmtINR(u.credit_amount)}`,
            notes: notes || null,
          };
        }),
      );
      setSuccessMsg(
        `✅ Collected ${fmtINR(collectAmount)} — Remaining: ${fmtINR(Math.max(0, creditPending - collectAmount))}`,
      );
      setTimeout(onSuccess, 1800);
    } catch (e) {
      setError(e.message || "Failed to collect credit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Overlay onClose={onClose} maxWidth={480}>
      <ModalHead
        title="💰 Collect Credit"
        subtitle={`${group.vehicle_number} · ${group.customer_name}`}
        onClose={onClose}
      />
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <AmountBox
            label="Credit Outstanding"
            amount={creditPending}
            color={C.orangeLight}
            border={C.orange}
            text="#9a3412"
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <LabelText>Collection Type</LabelText>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            {[
              {
                v: "full",
                label: "✅ Full Credit",
                sub: fmtINR(creditPending),
              },
              { v: "partial", label: "⚡ Partial", sub: "Collect part now" },
            ].map((opt) => (
              <OptionCard
                key={opt.v}
                selected={collectType === opt.v}
                onClick={() => {
                  setCollectType(opt.v);
                  if (opt.v === "full") setAmount(creditPending.toFixed(2));
                }}
              >
                <input
                  type="radio"
                  name="collectType"
                  value={opt.v}
                  checked={collectType === opt.v}
                  onChange={() => {}}
                  style={{ marginRight: 8 }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>
                    {opt.sub}
                  </div>
                </div>
              </OptionCard>
            ))}
          </div>
        </div>
        {collectType === "partial" && (
          <div style={{ marginBottom: 16 }}>
            <LabelText>Amount to Collect</LabelText>
            <StyledInput
              type="number"
              min="0"
              max={creditPending}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
            />
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <LabelText>Payment Method</LabelText>
          <div style={{ display: "grid", gap: 8 }}>
            {PAYMENT_METHODS.filter((m) => m.value !== "credit").map((m) => (
              <OptionCard
                key={m.value}
                selected={method === m.value}
                onClick={() => setMethod(m.value)}
              >
                <input
                  type="radio"
                  name="creditMethod"
                  value={m.value}
                  checked={method === m.value}
                  onChange={() => {}}
                  style={{ marginRight: 10 }}
                />
                <span style={{ fontSize: 18, marginRight: 8 }}>{m.icon}</span>
                <span style={{ fontWeight: 600 }}>{m.label}</span>
              </OptionCard>
            ))}
          </div>
        </div>
        {METHOD_NEEDS_TXN.includes(method) && (
          <div style={{ marginBottom: 16 }}>
            <LabelText>Transaction ID *</LabelText>
            <StyledInput
              value={txnId}
              onChange={(e) => setTxnId(e.target.value)}
              placeholder="Transaction / reference ID"
            />
          </div>
        )}
        <div style={{ marginBottom: 20 }}>
          <LabelText>Notes (Optional)</LabelText>
          <StyledInput
            as="textarea"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes..."
          />
        </div>
        {error && (
          <div
            style={{
              backgroundColor: C.redLight,
              color: C.red,
              padding: "10px 14px",
              borderRadius: 8,
              marginBottom: 14,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}
        {successMsg ? (
          <div
            style={{
              backgroundColor: C.greenLight,
              border: `1px solid ${C.green}44`,
              borderRadius: 10,
              padding: "18px 20px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>
              {successMsg}
            </div>
          </div>
        ) : (
          <Btn
            variant="primary"
            onClick={handleCollect}
            disabled={loading}
            style={{
              width: "100%",
              justifyContent: "center",
              padding: 14,
              fontSize: 15,
            }}
          >
            {loading
              ? "Processing..."
              : `✓ Collect ${fmtINR(parseFloat(amount) || 0)}`}
          </Btn>
        )}
      </div>
    </Overlay>
  );
}

// ─── CreditStatementModal ─────────────────────────────────────────────────────
function CreditStatementModal({ group, onClose }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const ids = group.visits.map((v) => v.id);
      const { data: payments } = await supabase
        .from("payments")
        .select("*, collector:users!payments_collected_by_fkey(full_name)")
        .in("vehicle_id", ids)
        .order("created_at", { ascending: true });
      const statement = [];
      group.visits.forEach((v) =>
        statement.push({
          type: "bill",
          date: v.entry_time,
          amount: parseFloat(v.bill_amount) || 0,
          label: "Bill",
          id: `bill-${v.id}`,
        }),
      );
      (payments || []).forEach((p) =>
        statement.push({
          type: p.payment_method === "credit" ? "credit_given" : "payment",
          date: p.created_at,
          amount: parseFloat(p.amount) || 0,
          label:
            p.payment_method === "credit"
              ? "Credit Given"
              : `Payment — ${methodLabel(p.payment_method)}`,
          sub: p.transaction_id ? `TXN: ${p.transaction_id}` : null,
          collector: p.collector?.full_name,
          notes: p.notes,
          id: p.id,
        }),
      );
      statement.sort((a, b) => new Date(toZ(a.date)) - new Date(toZ(b.date)));
      let balance = 0;
      statement.forEach((e) => {
        if (e.type === "bill" || e.type === "credit_given") balance += e.amount;
        else balance -= e.amount;
        e.runningBalance = balance;
      });
      setEntries(statement);
      setLoading(false);
    })();
  }, []);

  const totalBilled = group.visits.reduce(
    (s, v) => s + (parseFloat(v.bill_amount) || 0),
    0,
  );
  const totalCollected = group.visits.reduce(
    (s, v) => s + (parseFloat(v.total_paid) || 0),
    0,
  );
  const guarantors = [
    ...new Set(group.visits.map((v) => v.credit_guaranteed_by).filter(Boolean)),
  ];

  return (
    <Overlay onClose={onClose} maxWidth={680}>
      <ModalHead
        title={`📅 ${group.vehicle_number} — Statement`}
        subtitle={`${group.customer_name} · ${group.customer_phone}`}
        onClose={onClose}
      />
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <AmountBox
            label="Total Billed"
            amount={totalBilled}
            color={C.blueLight}
            border={C.blue + "44"}
            text={C.blue}
          />
          <AmountBox
            label="Total Collected"
            amount={totalCollected}
            color={C.greenLight}
            border={C.green + "44"}
            text={C.green}
          />
          <AmountBox
            label="Outstanding"
            amount={group.total_credit}
            color={C.orangeLight}
            border={C.orange}
            text="#9a3412"
          />
        </div>
        {guarantors.length > 0 && (
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: C.amberLight,
              borderRadius: 8,
              border: `1px solid ${C.amber}44`,
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>
              👤 Guaranteed by:
            </span>
            {guarantors.map((g, i) => (
              <span
                key={i}
                style={{
                  padding: "3px 12px",
                  backgroundColor: C.surface,
                  color: "#92400e",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  border: `1px solid ${C.amber}`,
                }}
              >
                {g}
              </span>
            ))}
          </div>
        )}
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: C.textMuted }}>
            Loading...
          </div>
        ) : (
          <>
            <SecHead
              title={`Transaction History (${entries.length} entries)`}
            />
            <div style={{ position: "relative", paddingLeft: 20 }}>
              <div
                style={{
                  position: "absolute",
                  left: 7,
                  top: 12,
                  bottom: 12,
                  width: 2,
                  backgroundColor: C.border,
                }}
              />
              {entries.map((entry, idx) => {
                const dotColor =
                  entry.type === "bill"
                    ? C.red
                    : entry.type === "credit_given"
                      ? C.amber
                      : C.green;
                const rowBg =
                  entry.type === "bill"
                    ? C.redLight
                    : entry.type === "credit_given"
                      ? C.amberLight
                      : C.greenLight;
                const rowBorder =
                  entry.type === "bill"
                    ? C.red + "44"
                    : entry.type === "credit_given"
                      ? C.amber + "44"
                      : C.green + "44";
                return (
                  <div
                    key={entry.id}
                    style={{
                      position: "relative",
                      marginBottom: idx < entries.length - 1 ? 12 : 0,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: -16,
                        top: 14,
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        backgroundColor: dotColor,
                        border: "2px solid white",
                        boxShadow: `0 0 0 2px ${dotColor}40`,
                      }}
                    />
                    <div
                      style={{
                        padding: "12px 16px",
                        backgroundColor: rowBg,
                        borderRadius: 10,
                        border: `1px solid ${rowBorder}`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: C.text,
                            }}
                          >
                            {entry.label}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: C.textMuted,
                              marginTop: 3,
                            }}
                          >
                            📅 {formatIST(entry.date)}
                          </div>
                          {entry.sub && (
                            <div
                              style={{
                                fontSize: 12,
                                color: C.textMuted,
                                marginTop: 2,
                              }}
                            >
                              {entry.sub}
                            </div>
                          )}
                          {entry.collector && (
                            <div
                              style={{
                                fontSize: 12,
                                color: C.textSec,
                                marginTop: 2,
                              }}
                            >
                              👤 {entry.collector}
                            </div>
                          )}
                          {entry.notes && (
                            <div
                              style={{
                                fontSize: 12,
                                color: C.textMuted,
                                marginTop: 2,
                                fontStyle: "italic",
                              }}
                            >
                              📝 {entry.notes}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: "right", marginLeft: 16 }}>
                          <div
                            style={{
                              fontSize: 16,
                              fontWeight: 800,
                              color:
                                entry.type === "payment" ? C.green : "#9a3412",
                            }}
                          >
                            {entry.type === "payment" ? "−" : "+"}
                            {fmtINR(entry.amount)}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: C.textMuted,
                              marginTop: 3,
                            }}
                          >
                            Balance:{" "}
                            <span
                              style={{
                                fontWeight: 700,
                                color:
                                  entry.runningBalance > 0.01
                                    ? "#9a3412"
                                    : C.green,
                              }}
                            >
                              {fmtINR(entry.runningBalance)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              style={{
                marginTop: 20,
                padding: "16px 20px",
                backgroundColor:
                  group.total_credit > 0.01 ? C.amberLight : C.greenLight,
                borderRadius: 10,
                border: `2px solid ${group.total_credit > 0.01 ? C.amber : C.green}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>
                {group.total_credit > 0.01
                  ? "⚠️ Outstanding Balance"
                  : "✅ Fully Cleared"}
              </span>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 22,
                  color: group.total_credit > 0.01 ? "#9a3412" : C.green,
                }}
              >
                {fmtINR(group.total_credit)}
              </span>
            </div>
          </>
        )}
      </div>
    </Overlay>
  );
}

// ─── VehicleDetailsModal ──────────────────────────────────────────────────────
function VehicleDetailsModal({ vehicle, onClose, onPayment }) {
  const [history, setHistory] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const bill = parseFloat(vehicle.bill_amount) || 0;
  const paid = parseFloat(vehicle.total_paid) || 0;
  const credit = parseFloat(vehicle.credit_amount) || 0;

  useEffect(() => {
    Promise.all([
      supabase
        .from("vehicle_history")
        .select("*, user:users!vehicle_history_user_id_fkey(full_name)")
        .eq("vehicle_id", vehicle.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("payments")
        .select("*, collector:users!payments_collected_by_fkey(full_name)")
        .eq("vehicle_id", vehicle.id)
        .order("created_at", { ascending: false }),
    ]).then(([h, p]) => {
      setHistory(h.data || []);
      setPayments(p.data || []);
      setLoading(false);
    });
  }, [vehicle.id]);

  return (
    <Overlay onClose={onClose} maxWidth={860}>
      <ModalHead
        title={`🚗 ${vehicle.vehicle_number}`}
        subtitle={`${vehicle.customer_name} · ${vehicle.customer_phone}`}
        onClose={onClose}
      />
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <AmountBox
            label="Total Bill"
            amount={bill}
            color={C.blueLight}
            border={C.blue + "44"}
            text={C.blue}
          />
          <AmountBox
            label="Total Paid"
            amount={paid}
            color={C.greenLight}
            border={C.green + "44"}
            text={C.green}
          />
          <AmountBox
            label="Credit Pending"
            amount={credit}
            color={C.amberLight}
            border={C.amber}
            text="#92400e"
          />
        </div>
        <div
          style={{
            marginBottom: 16,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <Btn variant="success" onClick={onPayment}>
            💳 Process Payment
          </Btn>
        </div>
        {loading ? (
          <div style={{ textAlign: "center", padding: 32, color: C.textMuted }}>
            Loading...
          </div>
        ) : (
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}
          >
            <div>
              <SecHead
                title={`Payments (${payments.length})`}
                color={C.green}
              />
              {payments.length === 0 ? (
                <div
                  style={{
                    fontSize: 13,
                    color: C.textMuted,
                    fontStyle: "italic",
                  }}
                >
                  No payments yet
                </div>
              ) : (
                payments.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      padding: "10px 14px",
                      backgroundColor: C.surfaceEl,
                      borderRadius: 8,
                      border: `1px solid ${C.border}`,
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 13 }}>
                        {methodIcon(p.payment_method)}{" "}
                        {methodLabel(p.payment_method)}
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          color:
                            p.payment_method === "credit" ? "#9a3412" : C.green,
                        }}
                      >
                        {fmtINR(p.amount)}
                      </span>
                    </div>
                    {p.collector && (
                      <div
                        style={{
                          fontSize: 12,
                          color: C.textMuted,
                          marginTop: 3,
                        }}
                      >
                        👤 {p.collector.full_name}
                      </div>
                    )}
                    <div
                      style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}
                    >
                      {formatISTShort(p.created_at)}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div>
              <SecHead
                title={`Timeline (${history.length})`}
                color={C.purple}
              />
              <div
                style={{
                  maxHeight: 360,
                  overflowY: "auto",
                  display: "grid",
                  gap: 8,
                }}
              >
                {history.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: "10px 14px",
                      backgroundColor: C.surfaceEl,
                      borderRadius: 8,
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: C.text,
                        textTransform: "capitalize",
                      }}
                    >
                      {item.stage?.replace(/_/g, " ")} —{" "}
                      {item.action?.replace(/_/g, " ")}
                    </div>
                    {item.user && (
                      <div style={{ fontSize: 12, color: C.textMuted }}>
                        👤 {item.user.full_name}
                      </div>
                    )}
                    {item.new_value && (
                      <div
                        style={{ fontSize: 12, color: C.textSec, marginTop: 3 }}
                      >
                        {item.new_value}
                      </div>
                    )}
                    <div
                      style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}
                    >
                      {formatISTShort(item.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Overlay>
  );
}
// ─── Tab: Pending Payments ────────────────────────────────────────────────────
function VehiclePaymentCard({ vehicle, onPayment, onDetails }) {
  const bill = parseFloat(vehicle.bill_amount) || 0;
  const previousCredit = parseFloat(vehicle.previous_credit) || 0;
  const totalOutstanding = bill + previousCredit;
  const status = vehicle.payment_status || "unpaid";
  const statusMap = {
    unpaid: [C.redLight, C.red, "Unpaid"],
    partial: [C.amberLight, C.amber, "Partial"],
    credit: [C.purpleLight, C.purple, "Credit"],
    paid: [C.greenLight, C.green, "Paid"],
  };
  const [sBg, sCol, sLabel] = statusMap[status] || statusMap.unpaid;
  const priority = vehicle.priority || "normal";
  const leftColor =
    priority === "vip" ? C.purple : priority === "urgent" ? C.red : C.amber;

  return (
    <div
      style={{
        padding: "20px 24px",
        backgroundColor: C.surface,
        borderRadius: 12,
        border: `1px solid ${C.border}`,
        borderLeft: `4px solid ${leftColor}`,
        boxShadow: C.shadow,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ flex: 1 }}>
          {/* Header row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 20,
                fontWeight: 900,
                fontFamily: "'DM Mono',monospace",
                color: C.text,
              }}
            >
              {vehicle.vehicle_number}
            </span>
            {vehicle.model && <ModelBadge model={vehicle.model} />}
            {priority !== "normal" && <PriorityBadge priority={priority} />}
            <Chip color={sCol} bg={sBg}>
              {sLabel}
            </Chip>
            {previousCredit > 0 && (
              <Chip color={C.amber} bg={C.amberLight}>
                ⚠️ Prev. Credit {fmtINR(previousCredit)}
              </Chip>
            )}
          </div>
          {/* Info grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6px 24px",
              marginBottom: 16,
            }}
          >
            <InfoRow label="Customer" value={vehicle.customer_name || "—"} />
            <InfoRow label="Phone" value={vehicle.customer_phone || "—"} />
            <InfoRow
              label="Bill Generated"
              value={formatISTShort(vehicle.bill_generated_at)}
            />
            <InfoRow label="Entry" value={formatISTShort(vehicle.entry_time)} />
          </div>
          {/* Amount boxes */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <AmountBox
              label="Current Bill"
              amount={bill}
              color={C.blueLight}
              border={C.blue + "44"}
              text={C.blue}
            />
            <div
              style={{
                padding: "14px 16px",
                borderRadius: 10,
                textAlign: "center",
                backgroundColor:
                  previousCredit > 0 ? C.orangeLight : C.amberLight,
                border: `2px solid ${previousCredit > 0 ? C.orange : C.amber}`,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: C.textMuted,
                  fontWeight: 700,
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Total Outstanding
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#9a3412",
                  fontFamily: "'DM Mono',monospace",
                }}
              >
                {fmtINR(totalOutstanding)}
              </div>
              {previousCredit > 0 && (
                <div style={{ marginTop: 6, fontSize: 11, color: "#b45309" }}>
                  {fmtINR(bill)} current + {fmtINR(previousCredit)} prev.
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Actions */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginLeft: 24,
          }}
        >
          <Btn variant="success" onClick={onPayment}>
            💳 Process Payment
          </Btn>
          <Btn variant="secondary" onClick={onDetails}>
            📄 View Details
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Vehicles (merged "At Cashier" + "Other Vehicles") ───────────────────
const PIPELINE_STAGE_LABELS = {
  billing: "🧾 Billing",
  pdi: "🔍 PDI",
  washing: "💧 Washing",
  alignment_balancing: "⚖️ Alignment",
  three_m: "✨ 3M",
  electrician: "⚡ Electrician",
  denter: "🔨 Denter",
  painter: "🎨 Painter",
  mechanic: "🔧 Mechanic",
  advisor_review: "👔 Advisor",
  front_checkup: "🔍 Front Checkup",
  pending: "⏳ Pending",
};
const PIPELINE_STAGE_ORDER = [
  "billing",
  "pdi",
  "washing",
  "alignment_balancing",
  "three_m",
  "electrician",
  "denter",
  "painter",
  "mechanic",
  "advisor_review",
  "front_checkup",
  "pending",
];

function VehiclesTab({
  pendingVehicles,
  pipelineVehicles,
  onPayment,
  onDetails,
  onOverridePay,
}) {
  const [search, setSearch] = useState("");
  const [otherExpanded, setOtherExpanded] = useState(false);

  const matchesSearch = (v) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      v.vehicle_number?.toLowerCase().includes(q) ||
      v.customer_name?.toLowerCase().includes(q) ||
      v.customer_phone?.includes(q)
    );
  };

  const atCashier = pendingVehicles
    .filter(matchesSearch)
    .sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority || "normal"] ?? 2;
      const pb = PRIORITY_ORDER[b.priority || "normal"] ?? 2;
      if (pa !== pb) return pa - pb;
      return new Date(toZ(a.entry_time)) - new Date(toZ(b.entry_time));
    });

  // Dedupe: a vehicle can be in both queries (e.g. billing-stage with a bill already
  // generated) — once it's shown in "At Cashier" it shouldn't also appear below.
  const pendingIds = new Set(pendingVehicles.map((v) => v.id));
  const other = pipelineVehicles
    .filter((v) => !pendingIds.has(v.id))
    .filter(matchesSearch);

  const grouped = {};
  other.forEach((v) => {
    const s = v.current_stage;
    if (!grouped[s]) grouped[s] = [];
    grouped[s].push(v);
  });
  const stages = PIPELINE_STAGE_ORDER.filter((s) => grouped[s]?.length > 0);

  const isSearching = search.trim().length > 0;
  const otherVisible = otherExpanded || isSearching;

  if (!pendingVehicles.length && !pipelineVehicles.length)
    return (
      <EmptyState
        icon="✅"
        title="No active vehicles"
        subtitle="All clear!"
      />
    );

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search vehicle, customer, phone..."
          style={{
            flex: 1,
            maxWidth: 340,
            padding: "8px 14px",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            fontSize: 14,
            color: C.text,
            background: C.surface,
            outline: "none",
            fontFamily: "inherit",
          }}
          onFocus={(e) => (e.target.style.borderColor = C.amber)}
          onBlur={(e) => (e.target.style.borderColor = C.border)}
        />
        {pendingVehicles.some(
          (v) => v.priority === "vip" || v.priority === "urgent",
        ) && (
          <span
            style={{ fontSize: 12, color: C.textMuted, fontStyle: "italic" }}
          >
            👑 VIP & urgent sorted first
          </span>
        )}
      </div>

      {/* ── At Cashier — always expanded ── */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>
            💳 At Cashier
          </span>
          <Chip color={C.amber} bg={C.amberLight}>
            {atCashier.length}
          </Chip>
        </div>
        {atCashier.length === 0 ? (
          <EmptyState
            icon={isSearching ? "🔍" : "✅"}
            title={isSearching ? "No results" : "No pending payments"}
            subtitle={
              isSearching
                ? `No match for "${search}"`
                : "All vehicles processed!"
            }
          />
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {atCashier.map((v) => (
              <VehiclePaymentCard
                key={v.id}
                vehicle={v}
                onPayment={() => onPayment(v)}
                onDetails={() => onDetails(v)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Other Vehicles — collapsible, auto-expands while searching ── */}
      <div>
        <div
          onClick={() => setOtherExpanded((p) => !p)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: otherVisible ? 14 : 0,
            cursor: "pointer",
            padding: "10px 4px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>
              🔜 Other Vehicles
            </span>
            <Chip color={C.textMuted} bg={C.surfaceEl}>
              {other.length}
            </Chip>
          </div>
          <span style={{ fontSize: 13, color: C.textMuted }}>
            {otherVisible ? "▲ Collapse" : "▼ Expand"}
          </span>
        </div>
        {otherVisible &&
          (other.length === 0 ? (
            <EmptyState
              icon={isSearching ? "🔍" : "🔜"}
              title={isSearching ? "No results" : "No other active vehicles"}
              subtitle={
                isSearching ? `No match for "${search}"` : "All clear!"
              }
            />
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {stages.map((stage) => (
                <div
                  key={stage}
                  style={{
                    backgroundColor: C.surface,
                    borderRadius: 12,
                    padding: "18px 20px",
                    border:
                      stage === "billing"
                        ? `2px solid ${C.blue}44`
                        : `1px solid ${C.border}`,
                    boxShadow: C.shadow,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 14,
                    }}
                  >
                    <span
                      style={{ fontSize: 15, fontWeight: 700, color: C.text }}
                    >
                      {PIPELINE_STAGE_LABELS[stage] || stage.replace(/_/g, " ")}
                    </span>
                    <Chip
                      color={stage === "billing" ? C.blue : C.textMuted}
                      bg={stage === "billing" ? C.blueLight : C.surfaceEl}
                    >
                      {grouped[stage].length}
                    </Chip>
                    {stage === "billing" && (
                      <span
                        style={{ fontSize: 12, color: C.blue, fontWeight: 500 }}
                      >
                        Next for payment
                      </span>
                    )}
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {grouped[stage].map((v) => (
                      <div
                        key={v.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "11px 14px",
                          backgroundColor: C.surfaceEl,
                          borderRadius: 8,
                          border: `1px solid ${C.border}`,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 800,
                              color: C.text,
                              fontSize: 15,
                              fontFamily: "'DM Mono',monospace",
                            }}
                          >
                            {v.vehicle_number}
                          </span>
                          {v.model && <ModelBadge model={v.model} small />}
                          {v.priority !== "normal" && (
                            <PriorityBadge priority={v.priority} small />
                          )}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 20,
                          }}
                        >
                          <span style={{ fontSize: 13, color: C.textSec }}>
                            {v.customer_name}
                          </span>
                          {v.bill_amount && (
                            <span
                              style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: C.blue,
                                fontFamily: "'DM Mono',monospace",
                              }}
                            >
                              {fmtINR(v.bill_amount)}
                            </span>
                          )}
                          {(() => {
                            const t = timeInWorkshop(v.entry_time);
                            const mins = v.entry_time
                              ? Math.floor(
                                  (Date.now() -
                                    new Date(toZ(v.entry_time)).getTime()) /
                                    60000,
                                )
                              : 0;
                            const col =
                              mins >= 480
                                ? C.red
                                : mins >= 240
                                  ? C.amber
                                  : C.textMuted;
                            return (
                              <span
                                style={{
                                  fontSize: 12,
                                  color: col,
                                  fontWeight: mins >= 240 ? 700 : 400,
                                }}
                              >
                                ⏱ {t}
                              </span>
                            );
                          })()}
                          <Btn
                            variant="secondary"
                            onClick={() => onOverridePay(v)}
                            style={{ fontSize: 12, padding: "6px 12px" }}
                          >
                            💳 Take Payment
                          </Btn>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}

// ─── Tab: Credit Ledger ───────────────────────────────────────────────────────
function CreditSummaryCard({ group, onCollect, onStatement }) {
  const guarantors = [
    ...new Set(group.visits.map((v) => v.credit_guaranteed_by).filter(Boolean)),
  ];
  return (
    <div
      style={{
        backgroundColor: C.surface,
        borderRadius: 12,
        border: `2px solid ${C.amber}44`,
        padding: "18px 22px",
        boxShadow: C.shadow,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ flex: 1 }}>
          {(() => {
            const days = creditAgeDays(group.visits);
            const age = creditAgeStyle(days);
            return (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 10,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: 19,
                    fontWeight: 900,
                    fontFamily: "'DM Mono',monospace",
                    color: C.text,
                  }}
                >
                  {group.vehicle_number}
                </span>
                <Chip color={C.purple} bg={C.purpleLight}>
                  {group.visits.length} visit
                  {group.visits.length !== 1 ? "s" : ""}
                </Chip>
                <Chip color={age.color} bg={age.bg}>
                  ⏰ {age.label}
                </Chip>
              </div>
            );
          })()}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "4px 24px",
              marginBottom: guarantors.length > 0 ? 10 : 0,
            }}
          >
            <InfoRow label="Customer" value={group.customer_name || "—"} />
            <InfoRow label="Phone" value={group.customer_phone || "—"} />
          </div>
          {guarantors.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 8,
              }}
            >
              <span
                style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}
              >
                👤 Guaranteed by:
              </span>
              {guarantors.map((g, i) => (
                <Chip key={i} color="#92400e" bg={C.amberLight}>
                  {g}
                </Chip>
              ))}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right", marginLeft: 22 }}>
          <div
            style={{
              fontSize: 10,
              color: C.textMuted,
              fontWeight: 700,
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            Outstanding
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: "#9a3412",
              fontFamily: "'DM Mono',monospace",
            }}
          >
            {fmtINR(group.total_credit)}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <Btn
          variant="primary"
          onClick={onCollect}
          style={{ fontSize: 13, padding: "7px 14px" }}
        >
          💰 Collect Credit
        </Btn>
        <Btn
          variant="secondary"
          onClick={onStatement}
          style={{ fontSize: 13, padding: "7px 14px" }}
        >
          📅 View Statement
        </Btn>
      </div>
    </div>
  );
}

function CreditLedgerTab({ groups, onCollect, onStatement }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("amount"); // "amount" | "oldest" | "newest"
  const totalCredit = groups.reduce((s, g) => s + g.total_credit, 0);

  const filtered = groups
    .filter((g) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        g.vehicle_number?.toLowerCase().includes(q) ||
        g.customer_name?.toLowerCase().includes(q) ||
        g.customer_phone?.includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "amount") return b.total_credit - a.total_credit;
      if (sortBy === "oldest")
        return creditAgeDays(b.visits) - creditAgeDays(a.visits);
      if (sortBy === "newest")
        return creditAgeDays(a.visits) - creditAgeDays(b.visits);
      return 0;
    });

  if (!groups.length)
    return (
      <EmptyState
        icon="✅"
        title="No outstanding credits"
        subtitle="All credits cleared!"
      />
    );

  return (
    <div>
      {/* Summary banner */}
      <div
        style={{
          backgroundColor: C.amberLight,
          border: `2px solid ${C.amber}44`,
          borderRadius: 12,
          padding: "14px 22px",
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <span style={{ fontWeight: 700, color: "#92400e", fontSize: 15 }}>
            📋 Total Outstanding Credit
          </span>
          <span style={{ marginLeft: 14, fontSize: 13, color: "#b45309" }}>
            {groups.length} vehicle{groups.length !== 1 ? "s" : ""}
            {groups.filter((g) => creditAgeDays(g.visits) >= 30).length > 0 && (
              <span style={{ marginLeft: 10, color: C.red, fontWeight: 700 }}>
                · {groups.filter((g) => creditAgeDays(g.visits) >= 30).length}{" "}
                overdue 30+ days
              </span>
            )}
          </span>
        </div>
        <span
          style={{
            fontWeight: 800,
            color: "#9a3412",
            fontSize: 26,
            fontFamily: "'DM Mono',monospace",
          }}
        >
          {fmtINR(totalCredit)}
        </span>
      </div>
      {/* Search + sort bar */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
          alignItems: "center",
        }}
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search vehicle, customer, phone..."
          style={{
            flex: 1,
            maxWidth: 340,
            padding: "8px 14px",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            fontSize: 14,
            color: C.text,
            background: C.surface,
            outline: "none",
            fontFamily: "inherit",
          }}
          onFocus={(e) => (e.target.style.borderColor = C.amber)}
          onBlur={(e) => (e.target.style.borderColor = C.border)}
        />
        <div style={{ display: "flex", gap: 6 }}>
          {[
            ["amount", "₹ Highest"],
            ["oldest", "⏰ Oldest"],
            ["newest", "🕐 Newest"],
          ].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setSortBy(v)}
              style={{
                padding: "7px 14px",
                border: `1px solid ${sortBy === v ? C.amber : C.border}`,
                borderRadius: 8,
                background: sortBy === v ? C.amberLight : C.surface,
                color: sortBy === v ? C.amber : C.textSec,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No results"
          subtitle={`No match for "${search}"`}
        />
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {filtered.map((g) => (
            <CreditSummaryCard
              key={g.vehicle_number}
              group={g}
              onCollect={() => onCollect(g)}
              onStatement={() => onStatement(g)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
// ─── Tab: Collections Report ──────────────────────────────────────────────────
function CollectionsReportTab({ payments }) {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");

  const filtered = payments.filter((p) => {
    const matchSearch =
      !search.trim() ||
      p.vehicle?.vehicle_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.vehicle?.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.vehicle?.customer_phone?.includes(search) ||
      p.transaction_id?.toLowerCase().includes(search.toLowerCase());
    const pDate = new Date(toZ(p.created_at));
    const matchFrom =
      !dateFrom || pDate >= new Date(dateFrom + "T00:00:00+05:30");
    const matchTo = !dateTo || pDate <= new Date(dateTo + "T23:59:59+05:30");
    const matchMethod =
      methodFilter === "all" || p.payment_method === methodFilter;
    return matchSearch && matchFrom && matchTo && matchMethod;
  });

  const realCollections = filtered.filter((p) => p.payment_method !== "credit");
  const creditGiven = filtered.filter((p) => p.payment_method === "credit");
  const totalCollected = realCollections.reduce(
    (s, p) => s + parseFloat(p.amount || 0),
    0,
  );
  const totalCreditGiven = creditGiven.reduce(
    (s, p) => s + parseFloat(p.amount || 0),
    0,
  );
  const byMethod = {};
  PAYMENT_METHODS.filter((m) => m.value !== "credit").forEach((m) => {
    byMethod[m.value] = realCollections
      .filter((p) => p.payment_method === m.value)
      .reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  });
  const hasFilters = search || dateFrom || dateTo || methodFilter !== "all";

  return (
    <div>
      {/* Filter bar */}
      <div
        style={{
          backgroundColor: C.surface,
          borderRadius: 12,
          padding: "18px 22px",
          marginBottom: 20,
          border: `1px solid ${C.border}`,
          display: "grid",
          gridTemplateColumns: "1fr 150px 150px 170px auto",
          gap: 12,
          alignItems: "flex-end",
          boxShadow: C.shadow,
        }}
      >
        <div>
          <LabelText>🔍 Search</LabelText>
          <StyledInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Vehicle, customer, TXN ID..."
          />
        </div>
        <div>
          <LabelText>From</LabelText>
          <StyledInput
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <LabelText>To</LabelText>
          <StyledInput
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <div>
          <LabelText>Method</LabelText>
          <SelectInput
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
          >
            <option value="all">All Methods</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.icon} {m.label}
              </option>
            ))}
          </SelectInput>
        </div>
        {hasFilters && (
          <Btn
            variant="danger"
            onClick={() => {
              setSearch("");
              setDateFrom("");
              setDateTo("");
              setMethodFilter("all");
            }}
            style={{ fontSize: 13, padding: "8px 14px" }}
          >
            ✕ Clear
          </Btn>
        )}
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            backgroundColor: C.surface,
            borderRadius: 12,
            padding: 20,
            border: `2px solid ${C.green}44`,
            boxShadow: C.shadow,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: C.textMuted,
              fontWeight: 700,
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Total Collected{hasFilters ? " (filtered)" : ""}
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: C.green,
              fontFamily: "'DM Mono',monospace",
            }}
          >
            {fmtINR(totalCollected)}
          </div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
            {realCollections.length} transactions
          </div>
        </div>
        <div
          style={{
            backgroundColor: C.surface,
            borderRadius: 12,
            padding: 20,
            border: `2px solid ${C.amber}44`,
            boxShadow: C.shadow,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: C.textMuted,
              fontWeight: 700,
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Credit Given
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: "#9a3412",
              fontFamily: "'DM Mono',monospace",
            }}
          >
            {fmtINR(totalCreditGiven)}
          </div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
            {creditGiven.length} transactions
          </div>
        </div>
        <div
          style={{
            backgroundColor: C.surface,
            borderRadius: 12,
            padding: "16px 20px",
            border: `1px solid ${C.border}`,
            boxShadow: C.shadow,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: C.textMuted,
              fontWeight: 700,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            By Method
          </div>
          <div style={{ display: "grid", gap: 5 }}>
            {PAYMENT_METHODS.filter(
              (m) => m.value !== "credit" && byMethod[m.value] > 0,
            ).map((m) => (
              <div
                key={m.value}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                }}
              >
                <span style={{ color: C.textSec }}>
                  {m.icon} {m.label}
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    color: C.text,
                    fontFamily: "'DM Mono',monospace",
                  }}
                >
                  {fmtINR(byMethod[m.value])}
                </span>
              </div>
            ))}
            {!Object.values(byMethod).some((v) => v > 0) && (
              <span style={{ fontSize: 13, color: C.textMuted }}>
                No collections
              </span>
            )}
          </div>
        </div>
        {/* Cashier breakdown */}
        <div
          style={{
            backgroundColor: C.surface,
            borderRadius: 12,
            padding: "16px 20px",
            border: `1px solid ${C.border}`,
            boxShadow: C.shadow,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: C.textMuted,
              fontWeight: 700,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            By Cashier
          </div>
          <div style={{ display: "grid", gap: 5 }}>
            {Object.entries(
              realCollections.reduce((acc, p) => {
                const name = p.collector?.full_name || "Unknown";
                acc[name] = (acc[name] || 0) + parseFloat(p.amount || 0);
                return acc;
              }, {}),
            )
              .sort((a, b) => b[1] - a[1])
              .map(([name, amt]) => (
                <div
                  key={name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: C.textSec }}>👤 {name}</span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: C.text,
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    {fmtINR(amt)}
                  </span>
                </div>
              ))}
            {realCollections.length === 0 && (
              <span style={{ fontSize: 13, color: C.textMuted }}>
                No collections
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Transactions table */}
      <div
        style={{
          backgroundColor: C.surface,
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          overflow: "hidden",
          boxShadow: C.shadow,
        }}
      >
        <div
          style={{
            padding: "14px 22px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
            Transaction History
          </span>
          <span style={{ fontSize: 13, color: C.textMuted }}>
            {filtered.length} records
          </span>
        </div>
        {filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "52px 0",
              color: C.textMuted,
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              No transactions found
            </div>
            {hasFilters && (
              <div style={{ fontSize: 13, marginTop: 5 }}>
                Try adjusting filters
              </div>
            )}
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "140px 1fr 150px 120px 140px 120px",
                padding: "10px 22px",
                backgroundColor: C.surfaceEl,
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              {[
                "Date & Time",
                "Vehicle / Customer",
                "Method",
                "Amount",
                "Transaction ID",
                "Collected By",
              ].map((h) => (
                <div
                  key={h}
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: C.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {h}
                </div>
              ))}
            </div>
            <div style={{ maxHeight: 520, overflowY: "auto" }}>
              {filtered.map((p, idx) => {
                const isCredit = p.payment_method === "credit";
                const d = new Date(toZ(p.created_at));
                return (
                  <div
                    key={p.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "140px 1fr 150px 120px 140px 120px",
                      padding: "13px 22px",
                      backgroundColor: isCredit
                        ? C.amberLight
                        : idx % 2 === 0
                          ? C.surface
                          : C.surfaceEl,
                      borderBottom: `1px solid ${C.border}88`,
                    }}
                  >
                    <div style={{ fontSize: 12, color: C.textSec }}>
                      {d.toLocaleDateString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                      <div style={{ color: C.textMuted }}>
                        {d.toLocaleTimeString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: C.text,
                          fontFamily: "'DM Mono',monospace",
                        }}
                      >
                        {p.vehicle?.vehicle_number || "—"}
                      </div>
                      <div style={{ fontSize: 12, color: C.textSec }}>
                        {p.vehicle?.customer_name || "—"}
                      </div>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span style={{ fontSize: 16 }}>
                        {methodIcon(p.payment_method)}
                      </span>
                      <span style={{ fontSize: 13, color: C.textSec }}>
                        {isCredit
                          ? "Credit Given"
                          : methodLabel(p.payment_method)}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: isCredit ? "#9a3412" : C.green,
                        fontFamily: "'DM Mono',monospace",
                      }}
                    >
                      {isCredit ? "−" : "+"}
                      {fmtINR(p.amount)}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: C.textMuted,
                        wordBreak: "break-all",
                      }}
                    >
                      {p.transaction_id || (
                        <span style={{ color: C.border }}>—</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: C.textSec }}>
                      {isCredit ? (
                        <>
                          <div style={{ color: C.textMuted }}>Recorded by:</div>
                          <div style={{ fontWeight: 600 }}>
                            {p.collector?.full_name || "—"}
                          </div>
                          {p.vehicle?.credit_guaranteed_by && (
                            <div
                              style={{
                                marginTop: 3,
                                color: "#92400e",
                                fontWeight: 700,
                                fontSize: 11,
                              }}
                            >
                              🤝 {p.vehicle.credit_guaranteed_by}
                            </div>
                          )}
                        </>
                      ) : (
                        p.collector?.full_name || "—"
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main CashierDashboard ────────────────────────────────────────────────────
// FIX 4: receives `user` prop — no more getCurrentUser()
function CashierDashboard({ user, onLogout }) {
  const [tab, setTab] = useState("vehicles");
  const [pendingVehicles, setPendingVehicles] = useState([]);
  const [pipelineVehicles, setPipelineVehicles] = useState([]);
  const [creditGroups, setCreditGroups] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [todayPayments, setTodayPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedCredit, setSelectedCredit] = useState(null);
  const [modal, setModal] = useState(null); // "payment"|"details"|"credit"|"statement"|"billOverride"

  // FIX 5: showLoader param — realtime uses fetchData(false)
  const fetchData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setLoadError(null);
    try {
      // FIX 6: IST midnight UTC — was setHours (local TZ)
      const todayStartUTC = getISTMidnightUTC();

      const [pendingRes, pipelineRes, creditRes, todayPayRes, allPayRes] =
        await withTimeout(Promise.all([
          // ① Pending payment — bill generated, not yet collected
          // FIX 7: .is("deleted_at", null) on all vehicle queries
          supabase
            .from("vehicles")
            .select("*")
            .not("bill_amount", "is", null)
            .gt("bill_amount", 0)
            .not("payment_status", "in", '("paid","credit")')
            .not("current_stage", "in", '("ready_for_exit","completed")')
            .is("deleted_at", null)
            .order("entry_time", { ascending: false }),

          // ② Pipeline — all active (not payment/exit/completed)
          supabase
            .from("vehicles")
            .select("*")
            .not(
              "current_stage",
              "in",
              '("payment","ready_for_exit","completed")',
            )
            .is("deleted_at", null)
            .order("entry_time", { ascending: false }),

          // ③ Credit vehicles — any with outstanding credit
          supabase
            .from("vehicles")
            .select(
              "id,vehicle_number,customer_name,customer_phone,bill_amount,total_paid,credit_amount,credit_guaranteed_by,entry_time,updated_at,payment_status",
            )
            .gt("credit_amount", 0)
            .is("deleted_at", null),

          // ④ Today's payments (IST)
          supabase
            .from("payments")
            .select("*")
            .gte("created_at", todayStartUTC)
            .neq("payment_method", "credit"),

          // ⑤ All payments for collections report
          supabase
            .from("payments")
            .select(
              "*, vehicle:vehicles!payments_vehicle_id_fkey(vehicle_number,customer_name,customer_phone,model,credit_guaranteed_by), collector:users!payments_collected_by_fkey(full_name)",
            )
            .order("created_at", { ascending: false }),
        ]));

      // Enrich pending AND pipeline vehicles with previous credit — single batch query.
      // Pipeline vehicles need this too: the cashier bill-override path (PipelineTab →
      // CashierBillOverrideModal → PaymentFormModal) reads vehicle.previous_credit directly
      // off whichever list the vehicle came from, and previously only pendingVehicles got
      // this enrichment — silently dropping previous credit for any vehicle billed via override.
      const pendingList = pendingRes.data || [];
      const pipelineList = pipelineRes.data || [];
      let enriched = pendingList.map((v) => ({ ...v, previous_credit: 0 }));
      let enrichedPipeline = pipelineList.map((v) => ({
        ...v,
        previous_credit: 0,
      }));
      if (pendingList.length > 0 || pipelineList.length > 0) {
        const vehicleNumbers = [
          ...new Set(
            [...pendingList, ...pipelineList].map((v) => v.vehicle_number),
          ),
        ];
        const activeIds = new Set(
          [...pendingList, ...pipelineList].map((v) => v.id),
        );
        const { data: prevCreditRows } = await withTimeout(
          supabase
            .from("vehicles")
            .select("id,vehicle_number,credit_amount")
            .in("vehicle_number", vehicleNumbers)
            .gt("credit_amount", 0)
            .is("deleted_at", null),
        );
        // Build vehicle_number → total previous credit map (exclude current visit IDs)
        const prevCreditMap = {};
        (prevCreditRows || []).forEach((r) => {
          if (activeIds.has(r.id)) return; // skip current visit(s)
          const vn = r.vehicle_number;
          prevCreditMap[vn] =
            (prevCreditMap[vn] || 0) + (parseFloat(r.credit_amount) || 0);
        });
        enriched = pendingList.map((v) => ({
          ...v,
          previous_credit: prevCreditMap[v.vehicle_number] || 0,
        }));
        enrichedPipeline = pipelineList.map((v) => ({
          ...v,
          previous_credit: prevCreditMap[v.vehicle_number] || 0,
        }));
      }
      // Group credit vehicles by vehicle_number
      const grouped = {};
      (creditRes.data || []).forEach((v) => {
        const vn = v.vehicle_number;
        if (!grouped[vn])
          grouped[vn] = {
            vehicle_number: vn,
            customer_name: v.customer_name,
            customer_phone: v.customer_phone,
            total_credit: 0,
            visits: [],
          };
        grouped[vn].total_credit += parseFloat(v.credit_amount) || 0;
        grouped[vn].visits.push(v);
      });

      setPendingVehicles(enriched);
      setPipelineVehicles(enrichedPipeline);
      setCreditGroups(
        Object.values(grouped).sort((a, b) => b.total_credit - a.total_credit),
      );
      setTodayPayments(todayPayRes.data || []);
      setAllPayments(allPayRes.data || []);
    } catch (e) {
      console.error("CashierDashboard fetchData error:", e);
      if (showLoader) setLoadError(e.message || "Failed to load dashboard data.");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchData();
    // FIX 8: ADD realtime subscription (was missing entirely)
    const ch = supabase
      .channel("cashier-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicles" },
        () => fetchData(false),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => fetchData(false),
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user, fetchData]);

  const todayCollection = todayPayments.reduce(
    (s, p) => s + parseFloat(p.amount || 0),
    0,
  );
  const totalCredit = creditGroups.reduce((s, g) => s + g.total_credit, 0);

  const closeModal = () => {
    setSelectedVehicle(null);
    setSelectedCredit(null);
    setModal(null);
  };
  const onSuccess = () => {
    closeModal();
    fetchData();
  };

  // Dedupe for the tab badge count — pendingVehicles and pipelineVehicles overlap
  // (e.g. a billing-stage vehicle that already has a bill generated).
  const pendingIdSet = new Set(pendingVehicles.map((v) => v.id));
  const totalVehiclesCount =
    pendingVehicles.length +
    pipelineVehicles.filter((v) => !pendingIdSet.has(v.id)).length;

  const TABS = [
    {
      id: "vehicles",
      label: "🚗 Vehicles",
      count: totalVehiclesCount,
    },
    { id: "credit", label: "📋 Credit Ledger", count: creditGroups.length },
    { id: "collections", label: "📊 Collections Report", count: null },
  ];

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
          fontFamily: "'DM Sans',sans-serif",
        }}
      >
        <style>
          {FONT}
          {`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}
        </style>
        <div
          style={{
            width: 40,
            height: 40,
            border: `3px solid ${C.border}`,
            borderTop: `3px solid ${C.amber}`,
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <div style={{ fontSize: 13, color: C.textMuted, fontWeight: 600 }}>
          Loading cashier data...
        </div>
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
        backgroundColor: C.bg,
        fontFamily: "'DM Sans',sans-serif",
        color: C.text,
      }}
    >
      <style>
        {FONT}
        {`*{box-sizing:border-box;} ::-webkit-scrollbar{width:5px;} ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px;}`}
      </style>

      {/* ── HEADER (slate — matches all dashboards) ── */}
      <div
        style={{
          background: C.primary,
          padding: "0 40px",
          height: 64,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 50,
          boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              background: C.amber,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              color: "#fff",
              fontSize: 15,
            }}
          >
            S
          </div>
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "rgba(255,255,255,0.45)",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
              }}
            >
              Sheetal Automobiles
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
              Cashier Dashboard
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 12px",
              background: "rgba(16,185,129,0.15)",
              borderRadius: 20,
              border: "1px solid rgba(16,185,129,0.3)",
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
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: C.green,
                letterSpacing: "0.5px",
              }}
            >
              LIVE
            </span>
          </div>
          <span
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.7)",
              fontWeight: 600,
            }}
          >
            👤 {user?.full_name}
          </span>
          <button
            onClick={onLogout}
            style={{
              padding: "6px 14px",
              background: "rgba(239,68,68,0.15)",
              color: "#F87171",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 7,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "inherit",
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{ padding: "28px 40px", maxWidth: 1200, margin: "0 auto" }}>
        {/* Stat cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 16,
            marginBottom: 28,
          }}
        >
          {[
            {
              label: "Pending Payments",
              value: pendingVehicles.length,
              color: C.red,
              icon: "💳",
            },
            {
              label: "Today's Collection",
              value: fmtINR(todayCollection),
              color: C.green,
              icon: "📊",
            },
            {
              label: "Credit Outstanding",
              value: fmtINR(totalCredit),
              color: C.amber,
              icon: "📋",
            },
            {
              label: "Vehicles in Pipeline",
              value: pipelineVehicles.length,
              color: C.blue,
              icon: "🔜",
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: "16px 18px",
                boxShadow: C.shadow,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 5,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: C.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {s.label}
                </span>
                <span style={{ fontSize: 18 }}>{s.icon}</span>
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

        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            gap: 4,
            backgroundColor: C.surface,
            padding: 6,
            borderRadius: 12,
            boxShadow: C.shadow,
            marginBottom: 24,
            width: "fit-content",
            border: `1px solid ${C.border}`,
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "10px 20px",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
                fontFamily: "inherit",
                transition: "all 0.15s",
                backgroundColor: tab === t.id ? C.primary : "transparent",
                color: tab === t.id ? "#fff" : C.textMuted,
              }}
            >
              {t.label}
              {t.count !== null && (
                <span
                  style={{
                    marginLeft: 8,
                    backgroundColor:
                      tab === t.id ? "rgba(255,255,255,0.2)" : C.surfaceEl,
                    color: tab === t.id ? "#fff" : C.textSec,
                    borderRadius: 12,
                    padding: "2px 8px",
                    fontSize: 12,
                  }}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "vehicles" && (
          <VehiclesTab
            pendingVehicles={pendingVehicles}
            pipelineVehicles={pipelineVehicles}
            onPayment={(v) => {
              setSelectedVehicle(v);
              setModal("payment");
            }}
            onDetails={(v) => {
              setSelectedVehicle(v);
              setModal("details");
            }}
            onOverridePay={(v) => {
              setSelectedVehicle(v);
              setModal("billOverride");
            }}
          />
        )}
        {tab === "credit" && (
          <CreditLedgerTab
            groups={creditGroups}
            onCollect={(g) => {
              setSelectedCredit(g);
              setModal("credit");
            }}
            onStatement={(g) => {
              setSelectedCredit(g);
              setModal("statement");
            }}
          />
        )}
        {tab === "collections" && (
          <CollectionsReportTab payments={allPayments} />
        )}
      </div>

      {/* Modals — FIX 4: pass user down to modals that write to DB */}
      {modal === "billOverride" && selectedVehicle && (
        <CashierBillOverrideModal
          vehicle={selectedVehicle}
          user={user}
          onClose={closeModal}
          onSuccess={(updatedVehicle) => {
            setSelectedVehicle(updatedVehicle);
            setModal("payment");
          }}
        />
      )}
      {modal === "payment" && selectedVehicle && (
        <PaymentFormModal
          vehicle={selectedVehicle}
          user={user}
          onClose={closeModal}
          onSuccess={onSuccess}
        />
      )}
      {modal === "details" && selectedVehicle && (
        <VehicleDetailsModal
          vehicle={selectedVehicle}
          onClose={closeModal}
          onPayment={() => setModal("payment")}
        />
      )}
      {modal === "credit" && selectedCredit && (
        <CreditCollectionModal
          group={selectedCredit}
          user={user}
          onClose={closeModal}
          onSuccess={onSuccess}
        />
      )}
      {modal === "statement" && selectedCredit && (
        <CreditStatementModal group={selectedCredit} onClose={closeModal} />
      )}
    </div>
  );
}

export default CashierDashboard;
