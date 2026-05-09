import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#f8fafc",
  surface: "#ffffff",
  surfaceElevated: "#f1f5f9",
  border: "#e2e8f0",
  text: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#94a3b8",
  accent: "#f59e0b",
  accentLight: "#fef3c7",
  green: "#059669",
  greenLight: "#ecfdf5",
  red: "#dc2626",
  redLight: "#fef2f2",
  blue: "#2563eb",
  blueLight: "#eff6ff",
  purple: "#7c3aed",
  purpleLight: "#f5f3ff",
  cyan: "#0891b2",
  cyanLight: "#ecfeff",
  amber: "#d97706",
  amberLight: "#fffbeb",
  shadow: "0 1px 3px rgba(0,0,0,0.08)",
  shadowMd: "0 4px 6px rgba(0,0,0,0.07)",
  shadowLg: "0 10px 20px rgba(0,0,0,0.1)",
};

const FONT = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');`;

// ─── Constants ────────────────────────────────────────────────────────────────
const DEPT_KEYS = [
  "mechanic",
  "painter",
  "denter",
  "electrician",
  "three_m",
  "alignment_balancing",
  "tyre_fitting",
  "washing",
];
const DEPT_META = {
  mechanic: { label: "Mechanic", icon: "🔧", color: C.amber },
  painter: { label: "Painter", icon: "🎨", color: C.purple },
  denter: { label: "Denter", icon: "🔨", color: C.cyan },
  electrician: { label: "Electrician", icon: "⚡", color: "#ea580c" },
  three_m: { label: "3M Work", icon: "✨", color: C.purple },
  alignment_balancing: {
    label: "Alignment & Balancing",
    icon: "⚖️",
    color: "#db2777",
  },
  tyre_fitting: { label: "Tyre Fitting", icon: "🛞", color: "#65a30d" },
  washing: { label: "Washing", icon: "💧", color: C.cyan },
};

const THREE_M_LABELS = {
  paint_protection: "Paint Protection",
  surface_refinance: "Surface Refinance",
  ceramic_coat: "Ceramic Coat",
  teflon_coat: "Teflon Coat",
  sun_film_application: "Sun Film Application",
  windshield_protector: "Windshield Protector",
  under_body_coat: "Under Body Coat",
  anti_rust_treatment: "Anti Rust Treatment",
  interior_detailing: "Interior Detailing",
  // Mobile dashboard keys (different set)
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
  new_tyre_fitting: "New Tyre Fitting",
  old_tyre_fitting: "Old Tyre Fitting",
  nitrogen: "Nitrogen",
  puncture: "Tyre Puncture",
  tyre_rotation: "Tyre Rotation",
  tyre_side_change: "Tyre Side Change",
  tyre_swap: "Tyre Swap",
  wheel_rim_fitting: "Wheel Rim Fitting",
  rim_straightening: "Rim Straightening",
  steering_calibration: "Steering Laptop Calibration",
};

const TYRE_POS = {
  FR: "Front Right",
  FL: "Front Left",
  RR: "Rear Right",
  RL: "Rear Left",
  SP: "Stepney",
};

const WASHING_LABELS = {
  top_wash: "Top Wash",
  full_wash: "Full Wash",
  half_cleaning: "Half Cleaning",
  sunroof_greasing: "Sunroof Greasing",
  outer_fiber_polish: "Outer Fiber Polish",
  tar_cleaning: "Tar Cleaning",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toZ = (s) =>
  !s ? null : String(s).includes("Z") || String(s).includes("+") ? s : s + "Z";
const getISTMidnightUTC = () => {
  const off = 5.5 * 3600000;
  const istNow = new Date(Date.now() + off);
  istNow.setUTCHours(0, 0, 0, 0);
  return new Date(istNow.getTime() - off).toISOString();
};
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

// ─── Primitive UI ─────────────────────────────────────────────────────────────
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
    primary: { bg: C.accent, color: "#fff", border: C.accent },
    secondary: { bg: C.surfaceElevated, color: C.text, border: C.border },
    success: { bg: C.green, color: "#fff", border: C.green },
    ghost: { bg: "transparent", color: C.textSecondary, border: C.border },
  };
  const v = vs[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? C.surfaceElevated : v.bg,
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

// ─── Work Receipt Table ───────────────────────────────────────────────────────
// Every work item = one row, consistent height, receipt-style

const statusColor = (s) =>
  ({
    completed: [C.green, C.greenLight],
    in_progress: [C.amber, C.amberLight],
    on_hold: [C.red, C.redLight],
    not_started: [C.textMuted, C.surfaceElevated],
  })[s] || [C.textMuted, C.surfaceElevated];

function WorkReceipt({ ws, threeM, washing, alignment, users, teams }) {
  if (!ws) return null;
  const userMap = Object.fromEntries(
    (users || []).map((u) => [u.id, u.full_name]),
  );
  const teamMap = Object.fromEntries((teams || []).map((t) => [t.id, t.name]));
  const rows = [];

  // ── Regular depts ──────────────────────────────────────────────────────────
  DEPT_KEYS.filter(
    (d) =>
      ws[`${d}_required`] &&
      !["three_m", "alignment_balancing", "washing"].includes(d),
  ).forEach((dept) => {
    const dm = DEPT_META[dept];
    const status = ws[`${dept}_status`] || "not_started";
    const teamId = ws[`${dept}_team_id`];
    const lockId = ws[`${dept}_locked_by`];
    const [sc, sbg] = statusColor(status);
    const who =
      teamId && teamMap[teamId]
        ? `👥 ${teamMap[teamId]}`
        : lockId && userMap[lockId]
          ? `👤 ${userMap[lockId]}`
          : null;
    rows.push({
      key: dept,
      icon: dm.icon,
      name: dm.label,
      detail: who,
      status,
      sc,
      sbg,
      subRows: [],
    });
  });

  // ── 3M ─────────────────────────────────────────────────────────────────────
  if (ws.three_m_required) {
    const assigned = threeM?.work_types || [];
    const completed = threeM?.completed_types || [];
    const [sc, sbg] = statusColor(ws.three_m_status || "not_started");
    const sub = assigned.map((t) => ({
      icon: completed.includes(t) ? "✅" : "⏳",
      text: THREE_M_LABELS[t] || t.replace(/_/g, " "),
      done: completed.includes(t),
    }));
    rows.push({
      key: "three_m",
      icon: "✨",
      name: "3M Work",
      detail:
        assigned.length > 0
          ? `${completed.length}/${assigned.length} completed`
          : "No types recorded",
      status: ws.three_m_status || "not_started",
      sc,
      sbg,
      subRows: sub,
    });
  }

  // ── Alignment ──────────────────────────────────────────────────────────────
  if (ws.alignment_balancing_required) {
    const wts = alignment?.work_types || [];
    const [sc, sbg] = statusColor(
      ws.alignment_balancing_status || "not_started",
    );
    const sub = wts.map((wt) => {
      const label = ALIGNMENT_LABELS[wt.type] || wt.type.replace(/_/g, " ");

      // Wheel balancing — count + weight type headline, per-tyre values as sub-detail
      if (
        wt.type === "wheel_balancing" &&
        wt.tyres &&
        typeof wt.tyres === "object" &&
        !Array.isArray(wt.tyres)
      ) {
        const entries = Object.entries(wt.tyres).filter(
          ([, v]) => (parseFloat(v) || 0) > 0,
        );
        const count = entries.length;
        const total = entries.reduce((s, [, v]) => s + (parseFloat(v) || 0), 0);
        const weightType =
          wt.weight_type === "sticker" ? "🏷️ Sticker" : "📎 Clip";
        const perTyre = entries
          .map(([pos, val]) => `${pos}(${TYRE_POS[pos] || pos}): ${val}g`)
          .join("  ·  ");
        return {
          icon: "⚖️",
          text: label,
          headline: `${count} tyre${count !== 1 ? "s" : ""} · ${weightType} · Total: ${total}g`,
          subDetail: perTyre,
        };
      }

      // Tyre positions + optional company
      if (Array.isArray(wt.tyres) && wt.tyres.length > 0) {
        const posNames = wt.tyres
          .map((p) => `${p} (${TYRE_POS[p] || p})`)
          .join("  ·  ");
        const icons = {
          new_tyre_fitting: "🛞",
          old_tyre_fitting: "🔄",
          nitrogen: "💨",
          puncture: "📍",
          tyre_side_change: "↔️",
          tyre_rotation: "🔃",
          wheel_rim_fitting: "⭕",
          rim_straightening: "⭕",
        };
        return {
          icon: icons[wt.type] || "⚙️",
          text: label,
          headline: posNames,
          subDetail: wt.company ? `Brand: ${wt.company}` : null,
        };
      }

      // Simple (tyre_alignment, tyre_rotation, steering_calibration)
      return { icon: "✅", text: label, headline: null, subDetail: null };
    });
    const alignWorker = alignment?.created_by
      ? userMap[alignment.created_by]
      : null;
    rows.push({
      key: "alignment",
      icon: "⚖️",
      name: "Alignment & Balancing",
      detail: [
        alignWorker ? `👤 ${alignWorker}` : null,
        wts.length > 0
          ? `${wts.length} work type${wts.length !== 1 ? "s" : ""}`
          : "No details recorded",
      ]
        .filter(Boolean)
        .join("  ·  "),
      status: ws.alignment_balancing_status || "not_started",
      sc,
      sbg,
      subRows: sub,
    });
  }

  // ── Washing ────────────────────────────────────────────────────────────────
  if (ws.washing_required) {
    const types = washing?.washing_types || [];
    const [sc, sbg] = statusColor(ws.washing_status || "not_started");
    const washSubRows = types.map((t) => ({
      icon: "💧",
      text: WASHING_LABELS[t] || t.replace(/_/g, " "),
      done: ws.washing_status === "completed",
    }));
    const slotMeta = [
      washing?.slot ? `🕐 ${washing.slot}` : null,
      washing?.slot_date ? `📅 ${washing.slot_date}` : null,
    ]
      .filter(Boolean)
      .join("  ·  ");
    rows.push({
      key: "washing",
      icon: "💧",
      name: "Washing",
      detail:
        [
          slotMeta,
          types.length > 0
            ? `${types.length} wash type${types.length !== 1 ? "s" : ""}`
            : null,
        ]
          .filter(Boolean)
          .join("  ·  ") || "No details recorded",
      status: ws.washing_status || "not_started",
      sc,
      sbg,
      subRows: washSubRows,
    });
  }

  if (!rows.length)
    return (
      <div
        style={{
          fontSize: 13,
          color: C.textMuted,
          fontStyle: "italic",
          padding: "12px 0",
        }}
      >
        No work assigned
      </div>
    );

  return (
    <div
      style={{
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {/* Table header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "32px 1fr 1fr 90px",
          gap: 0,
          padding: "7px 14px",
          background: C.surfaceElevated,
          borderBottom: `2px solid ${C.border}`,
        }}
      >
        <div />
        {["DEPARTMENT / WORK", "DETAILS", "STATUS"].map((h) => (
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

      {rows.map((row, ri) => (
        <div key={row.key}>
          {/* Main row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "32px 1fr 1fr 90px",
              gap: 0,
              padding: "10px 14px",
              borderBottom:
                ri < rows.length - 1 || row.subRows.length > 0
                  ? `1px solid ${C.border}`
                  : "none",
              alignItems: "start",
            }}
          >
            <div style={{ fontSize: 15, paddingTop: 1 }}>{row.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
              {row.name}
            </div>
            <div
              style={{ fontSize: 12, color: C.textSecondary, paddingRight: 8 }}
            >
              {row.detail || "—"}
            </div>
            <div>
              <Chip color={row.sc} bg={row.sbg} style={{ fontSize: 10 }}>
                {(row.status || "").replace(/_/g, " ") || "—"}
              </Chip>
            </div>
          </div>

          {/* Sub rows (3M types, alignment work types) */}
          {row.subRows.map((sub, si) => (
            <div
              key={si}
              style={{
                display: "grid",
                gridTemplateColumns: "32px 1fr 1fr 90px",
                gap: 0,
                padding: "7px 14px 7px 46px",
                background: C.surfaceElevated + "88",
                borderBottom:
                  si < row.subRows.length - 1
                    ? `1px solid ${C.border}88`
                    : ri < rows.length - 1
                      ? `1px solid ${C.border}`
                      : "none",
                alignItems: "start",
              }}
            >
              <div style={{ fontSize: 13 }}>{sub.icon}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
                  {sub.text}
                </div>
                {/* Wheel balancing — headline: count + type + total */}
                {sub.headline && (
                  <div
                    style={{
                      fontSize: 11,
                      color: C.amber,
                      fontWeight: 700,
                      marginTop: 2,
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    {sub.headline}
                  </div>
                )}
                {/* Per-tyre values — secondary detail */}
                {sub.subDetail && (
                  <div
                    style={{
                      fontSize: 11,
                      color: C.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    {sub.subDetail}
                  </div>
                )}
                {/* 3M done/pending */}
                {sub.done !== undefined && (
                  <div
                    style={{
                      fontSize: 10,
                      color: sub.done ? C.green : C.amber,
                      fontWeight: 700,
                      marginTop: 2,
                    }}
                  >
                    {sub.done ? "completed" : "pending"}
                  </div>
                )}
              </div>
              <div />
              <div />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Bill Modal ───────────────────────────────────────────────────────────────
function BillModal({ vehicle, currentUser, onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const total = parseFloat(amount);
    if (isNaN(total) || total <= 0) {
      setError("Enter a valid bill amount");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { error: ve } = await supabase
        .from("vehicles")
        .update({
          current_stage: "payment",
          current_status: "pending",
          bill_amount: total,
          bill_generated_at: new Date().toISOString(),
          bill_generated_by: currentUser?.id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", vehicle.id);
      if (ve) throw ve;

      await supabase.from("vehicle_history").insert([
        {
          vehicle_id: vehicle.id,
          user_id: currentUser?.id || null,
          stage: "billing",
          action: "bill_generated",
          new_value: `Bill Amount: ₹${total.toLocaleString("en-IN")}`,
          notes: notes || null,
        },
      ]);
      onSuccess();
    } catch (e) {
      setError(e.message || "Failed to generate bill");
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.surface,
          borderRadius: 12,
          width: "100%",
          maxWidth: 440,
          boxShadow: C.shadowLg,
          border: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            padding: "16px 22px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: C.text }}>
              💰 Enter Bill Amount
            </div>
            <div style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>
              {vehicle.vehicle_number} — {vehicle.customer_name || "Customer"}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 20,
              color: C.textMuted,
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: 22 }}>
          <div
            style={{
              fontSize: 12,
              color: C.textSecondary,
              marginBottom: 6,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.4px",
            }}
          >
            Bill Amount (₹) *
          </div>
          <div style={{ position: "relative", marginBottom: 14 }}>
            <span
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 20,
                color: C.textMuted,
                fontWeight: 700,
              }}
            >
              ₹
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              autoFocus
              style={{
                width: "100%",
                padding: "13px 13px 13px 38px",
                border: `2px solid ${C.border}`,
                borderRadius: 8,
                fontSize: 24,
                fontWeight: 800,
                color: C.text,
                background: C.surface,
                outline: "none",
                fontFamily: "'DM Mono',monospace",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = C.accent)}
              onBlur={(e) => (e.target.style.borderColor = C.border)}
            />
          </div>
          {amount && parseFloat(amount) > 0 && (
            <div
              style={{
                padding: "8px 14px",
                background: C.greenLight,
                borderRadius: 7,
                border: `1px solid ${C.green}44`,
                marginBottom: 14,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: C.green }}>
                {fmtINR(parseFloat(amount))}
              </span>
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 12,
                color: C.textSecondary,
                marginBottom: 6,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.4px",
              }}
            >
              Notes (Optional)
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
              style={{
                width: "100%",
                padding: "9px 12px",
                border: `1px solid ${C.border}`,
                borderRadius: 7,
                fontSize: 14,
                color: C.text,
                background: C.surface,
                outline: "none",
                fontFamily: "inherit",
                resize: "vertical",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = C.accent)}
              onBlur={(e) => (e.target.style.borderColor = C.border)}
            />
          </div>
          {error && (
            <div
              style={{
                background: C.redLight,
                color: C.red,
                padding: "9px 12px",
                borderRadius: 7,
                fontSize: 13,
                marginBottom: 14,
              }}
            >
              {error}
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <Btn
              variant="secondary"
              onClick={onClose}
              style={{ flex: 1, justifyContent: "center" }}
            >
              Cancel
            </Btn>
            <Btn
              variant="success"
              onClick={handleSubmit}
              disabled={loading || !amount || parseFloat(amount) <= 0}
              style={{ flex: 2, justifyContent: "center" }}
            >
              {loading ? "Generating..." : "✓ Generate & Send to Payment"}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Vehicle Detail Modal ─────────────────────────────────────────────────────
function VehicleDetailModal({
  vehicle,
  extraData,
  users,
  teams,
  currentUser,
  onClose,
  onBillSuccess,
}) {
  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(true);
  const [showBill, setShowBill] = useState(false);

  const ws = vehicle.work_stages?.[0];
  const threeM = extraData?.threeM;
  const washing = extraData?.washing;
  const alignment = extraData?.alignment;
  const complaints = vehicle.customer_complaints || [];
  const isOverdue =
    vehicle.expected_completion_time &&
    new Date() > new Date(toZ(vehicle.expected_completion_time));

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

  const infoItems = [
    {
      label: "Vehicle No",
      value: (
        <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 800 }}>
          {vehicle.vehicle_number}
        </span>
      ),
    },
    { label: "Customer", value: vehicle.customer_name || "—" },
    { label: "Phone", value: vehicle.customer_phone || "—" },
    { label: "Model", value: vehicle.model || "—" },
    {
      label: "Odometer",
      value: vehicle.odometer_reading ? `${vehicle.odometer_reading} km` : "—",
    },
    { label: "Fuel Level", value: vehicle.fuel_level || "—" },
    {
      label: "Service Type",
      value: vehicle.service_type?.replace(/_/g, " ") || "—",
    },
    { label: "Job Code", value: vehicle.job_code || "—" },
    { label: "Priority", value: vehicle.priority || "normal" },
    { label: "Entry Time", value: formatIST(vehicle.entry_time) },
    {
      label: "Expected",
      value: vehicle.expected_completion_time ? (
        <span
          style={{
            color: isOverdue ? C.red : C.text,
            fontWeight: isOverdue ? 700 : 400,
          }}
        >
          {formatIST(vehicle.expected_completion_time)}
          {isOverdue ? " ⚠️" : ""}
        </span>
      ) : (
        "—"
      ),
    },
    vehicle.part_amount > 0 && {
      label: "Parts Amount",
      value: (
        <span
          style={{
            color: C.green,
            fontFamily: "'DM Mono',monospace",
            fontWeight: 700,
          }}
        >
          {fmtINR(vehicle.part_amount)}
        </span>
      ),
    },
  ].filter(Boolean);

  const SecHead = ({ icon, title, color }) => (
    <div
      style={{
        fontSize: 11,
        fontWeight: 800,
        color: C.textMuted,
        textTransform: "uppercase",
        letterSpacing: "0.6px",
        marginBottom: 12,
        paddingBottom: 7,
        borderBottom: `2px solid ${color || C.accent}`,
      }}
    >
      {icon} {title}
    </div>
  );

  return (
    <>
      {/* Overlay — click outside to close */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: 500,
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Modal panel */}
      <div
        style={{
          position: "fixed",
          top: "3vh",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(1120px, 96vw)",
          height: "94vh",
          zIndex: 501,
          display: "flex",
          flexDirection: "column",
          background: C.surface,
          borderRadius: 14,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          border: `1px solid ${C.border}`,
          overflow: "hidden",
        }}
      >
        {/* Sticky header inside modal */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 24px",
            borderBottom: `1px solid ${C.border}`,
            background: C.surface,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={onClose}
              style={{
                background: C.surfaceElevated,
                border: `1px solid ${C.border}`,
                borderRadius: 7,
                cursor: "pointer",
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 700,
                color: C.textSecondary,
                fontFamily: "inherit",
              }}
            >
              ✕ Close
            </button>
            <div>
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
                    fontSize: 19,
                    fontWeight: 900,
                    fontFamily: "'DM Mono',monospace",
                    color: C.text,
                  }}
                >
                  {vehicle.vehicle_number}
                </span>
                {vehicle.model && (
                  <Chip color={C.blue} bg={C.blueLight}>
                    {vehicle.model}
                  </Chip>
                )}
                {vehicle.priority !== "normal" && (
                  <Chip
                    color={vehicle.priority === "vip" ? C.purple : C.red}
                    bg={vehicle.priority === "vip" ? C.purpleLight : C.redLight}
                  >
                    {vehicle.priority.toUpperCase()}
                  </Chip>
                )}
                {isOverdue && (
                  <Chip color={C.red} bg={C.redLight}>
                    ⏰ OVERDUE
                  </Chip>
                )}
              </div>
              <div
                style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}
              >
                {vehicle.customer_name || "—"} · {vehicle.customer_phone || "—"}
              </div>
            </div>
          </div>
          <Btn
            variant="success"
            onClick={() => setShowBill(true)}
            style={{ fontSize: 15, padding: "11px 28px" }}
          >
            💰 Generate Bill
          </Btn>
        </div>

        {/* Scrollable body — two columns */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 340px",
              gap: 20,
            }}
          >
            {/* Left column */}
            <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
              {/* 1. Work Done — FIRST */}
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: 18,
                  boxShadow: C.shadow,
                }}
              >
                <SecHead icon="🔧" title="All Work Done" color={C.accent} />
                <WorkReceipt
                  ws={ws}
                  threeM={threeM}
                  washing={washing}
                  alignment={alignment}
                  users={users}
                  teams={teams}
                />
              </div>

              {/* 2. Vehicle Details — below */}
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: 18,
                  boxShadow: C.shadow,
                }}
              >
                <SecHead icon="🚗" title="Vehicle Details" color={C.blue} />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3,1fr)",
                    gap: 8,
                  }}
                >
                  {infoItems.map(({ label, value }) => (
                    <div
                      key={label}
                      style={{
                        background: C.surfaceElevated,
                        borderRadius: 6,
                        padding: "8px 11px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: C.textMuted,
                          textTransform: "uppercase",
                          marginBottom: 2,
                          letterSpacing: "0.3px",
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: C.text,
                          textTransform: "capitalize",
                        }}
                      >
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
                {vehicle.customer_voice && (
                  <div
                    style={{
                      marginTop: 10,
                      background: C.blueLight,
                      border: `1px solid ${C.blue}33`,
                      borderRadius: 7,
                      padding: "9px 12px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        color: C.blue,
                        textTransform: "uppercase",
                        marginBottom: 3,
                      }}
                    >
                      💬 Customer Voice
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: C.text,
                        fontStyle: "italic",
                      }}
                    >
                      "{vehicle.customer_voice}"
                    </div>
                  </div>
                )}
                {vehicle.job_description && (
                  <div
                    style={{
                      marginTop: 8,
                      background: C.surfaceElevated,
                      borderRadius: 7,
                      padding: "9px 12px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        color: C.textMuted,
                        textTransform: "uppercase",
                        marginBottom: 3,
                      }}
                    >
                      📝 Job Description
                    </div>
                    <div style={{ fontSize: 12, color: C.text }}>
                      {vehicle.job_description}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right column — complaints + timeline */}
            <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
              {/* Complaints */}
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: 18,
                  boxShadow: C.shadow,
                }}
              >
                <SecHead
                  icon="📋"
                  title={`Complaints${complaints.length > 0 ? ` (${complaints.length})` : ""}`}
                  color={C.red}
                />
                {complaints.length === 0 ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: C.textMuted,
                      fontStyle: "italic",
                      textAlign: "center",
                      padding: "14px 0",
                    }}
                  >
                    No complaints recorded
                  </div>
                ) : (
                  complaints.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        padding: "9px 11px",
                        background: c.is_resolved ? C.greenLight : C.amberLight,
                        borderRadius: 7,
                        border: `1px solid ${c.is_resolved ? C.green + "33" : C.amber + "44"}`,
                        marginBottom: 7,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 8,
                        }}
                      >
                        <div>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              color: C.text,
                            }}
                          >
                            #{c.complaint_number}
                          </span>
                          <span
                            style={{
                              fontSize: 12,
                              color: C.textSecondary,
                              marginLeft: 7,
                            }}
                          >
                            {c.complaint_text}
                          </span>
                        </div>
                        <Chip
                          color={c.is_resolved ? C.green : C.amber}
                          bg={c.is_resolved ? C.greenLight : C.amberLight}
                          style={{ flexShrink: 0 }}
                        >
                          {c.is_resolved ? "✅ Resolved" : "⏳ Pending"}
                        </Chip>
                      </div>
                      {c.resolution_notes && (
                        <div
                          style={{
                            fontSize: 10,
                            color: C.textSecondary,
                            marginTop: 4,
                            fontStyle: "italic",
                          }}
                        >
                          Note: {c.resolution_notes}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Timeline */}
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: 18,
                  boxShadow: C.shadow,
                }}
              >
                <SecHead icon="🕐" title="Timeline" color={C.purple} />
                {histLoading ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: 16,
                      color: C.textMuted,
                      fontSize: 12,
                    }}
                  >
                    Loading...
                  </div>
                ) : history.length === 0 ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: C.textMuted,
                      fontStyle: "italic",
                      textAlign: "center",
                      padding: "14px 0",
                    }}
                  >
                    No history
                  </div>
                ) : (
                  history.map((item, idx) => (
                    <div
                      key={item.id}
                      style={{ display: "flex", gap: 9, marginBottom: 3 }}
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
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: C.accent,
                            marginTop: 5,
                          }}
                        />
                        {idx < history.length - 1 && (
                          <div
                            style={{
                              width: 1,
                              flex: 1,
                              background: C.border,
                              marginTop: 2,
                              minHeight: 12,
                            }}
                          />
                        )}
                      </div>
                      <div
                        style={{
                          flex: 1,
                          background: C.surfaceElevated,
                          borderRadius: 5,
                          padding: "6px 10px",
                          marginBottom: 4,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 6,
                            marginBottom: 1,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: C.text,
                              textTransform: "capitalize",
                            }}
                          >
                            {item.stage?.replace(/_/g, " ")} —{" "}
                            {item.action?.replace(/_/g, " ")}
                          </span>
                          <span
                            style={{
                              fontSize: 9,
                              color: C.textMuted,
                              flexShrink: 0,
                            }}
                          >
                            {formatISTShort(item.created_at)}
                          </span>
                        </div>
                        {item.user && (
                          <div style={{ fontSize: 9, color: C.textSecondary }}>
                            👤 {item.user.full_name}
                          </div>
                        )}
                        {item.new_value && (
                          <div
                            style={{
                              fontSize: 9,
                              color: C.textSecondary,
                              marginTop: 1,
                            }}
                          >
                            {item.new_value}
                          </div>
                        )}
                        {item.notes && (
                          <div
                            style={{
                              fontSize: 9,
                              color: C.textMuted,
                              marginTop: 1,
                              fontStyle: "italic",
                            }}
                          >
                            {item.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showBill && (
        <BillModal
          vehicle={vehicle}
          currentUser={currentUser}
          onClose={() => setShowBill(false)}
          onSuccess={() => {
            setShowBill(false);
            onBillSuccess();
          }}
        />
      )}
    </>
  );
}

// ─── Vehicle List Card (compact) ─────────────────────────────────────────────
function VehicleListCard({ vehicle, onViewDetails, onGenerateBill }) {
  const ws = vehicle.work_stages?.[0];
  const isOverdue =
    vehicle.expected_completion_time &&
    new Date() > new Date(toZ(vehicle.expected_completion_time));
  const complaints = vehicle.customer_complaints || [];

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "16px 20px",
        boxShadow: C.shadow,
        borderLeft: `4px solid ${vehicle.priority === "vip" ? C.purple : vehicle.priority === "urgent" ? C.red : C.accent}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        {/* Left */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 6,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontWeight: 900,
                fontSize: 18,
                fontFamily: "'DM Mono',monospace",
                color: C.text,
              }}
            >
              {vehicle.vehicle_number}
            </span>
            {vehicle.model && (
              <Chip color={C.blue} bg={C.blueLight}>
                {vehicle.model}
              </Chip>
            )}
            {vehicle.priority !== "normal" && (
              <Chip
                color={vehicle.priority === "vip" ? C.purple : C.red}
                bg={vehicle.priority === "vip" ? C.purpleLight : C.redLight}
              >
                {vehicle.priority.toUpperCase()}
              </Chip>
            )}
            {isOverdue && (
              <Chip color={C.red} bg={C.redLight}>
                ⏰ OVERDUE
              </Chip>
            )}
            {complaints.length > 0 && (
              <Chip color={C.amber} bg={C.amberLight}>
                📋 {complaints.length} complaint
                {complaints.length !== 1 ? "s" : ""}
              </Chip>
            )}
          </div>
          <div
            style={{
              display: "flex",
              gap: 16,
              fontSize: 13,
              color: C.textSecondary,
              flexWrap: "wrap",
            }}
          >
            <span>👤 {vehicle.customer_name || "—"}</span>
            <span>📞 {vehicle.customer_phone || "—"}</span>
            <span>📅 Entry: {formatISTShort(vehicle.entry_time)}</span>
            {vehicle.service_type && (
              <span>🔧 {vehicle.service_type.replace(/_/g, " ")}</span>
            )}
          </div>
          {/* Work badges */}
          {ws && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 5,
                marginTop: 8,
              }}
            >
              {DEPT_KEYS.filter((d) => ws[`${d}_required`]).map((d) => {
                const dm = DEPT_META[d];
                const st = ws[`${d}_status`];
                const [sc, sbg] = statusColor(st);
                return (
                  <Chip key={d} color={sc} bg={sbg} style={{ fontSize: 10 }}>
                    {dm.icon} {dm.label}
                  </Chip>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            flexShrink: 0,
            marginLeft: 20,
          }}
        >
          <Btn variant="secondary" onClick={onViewDetails}>
            📄 View Details
          </Btn>
          <Btn variant="success" onClick={onGenerateBill}>
            💰 Generate Bill
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Pipeline Section ─────────────────────────────────────────────────────────
function PipelineSection({ pdi, dueToday }) {
  const [pdiOpen, setPdiOpen] = useState(true);
  const [dueTodayOpen, setDueTodayOpen] = useState(true);
  const now = new Date();

  if (pdi.length === 0 && dueToday.length === 0) return null;

  const PipelineCard = ({ vehicle, type }) => {
    const ws = vehicle.work_stages?.[0];
    const isOverdue =
      vehicle.expected_completion_time &&
      now > new Date(toZ(vehicle.expected_completion_time));
    const expTime = vehicle.expected_completion_time;

    // For "due today" cards — show remaining depts that aren't done yet
    const pendingDepts = ws
      ? DEPT_KEYS.filter(
          (d) => ws[`${d}_required`] && ws[`${d}_status`] !== "completed",
        )
      : [];
    const doneDepts = ws
      ? DEPT_KEYS.filter(
          (d) => ws[`${d}_required`] && ws[`${d}_status`] === "completed",
        )
      : [];

    return (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          borderLeft: `3px solid ${type === "pdi" ? C.purple : isOverdue ? C.red : C.cyan}`,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 5,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontWeight: 800,
                fontSize: 15,
                fontFamily: "'DM Mono',monospace",
                color: C.text,
              }}
            >
              {vehicle.vehicle_number}
            </span>
            {vehicle.model && (
              <Chip color={C.blue} bg={C.blueLight}>
                {vehicle.model}
              </Chip>
            )}
            {vehicle.priority !== "normal" && (
              <Chip
                color={vehicle.priority === "vip" ? C.purple : C.red}
                bg={vehicle.priority === "vip" ? C.purpleLight : C.redLight}
              >
                {vehicle.priority.toUpperCase()}
              </Chip>
            )}
            {type === "pdi" && (
              <Chip color={C.purple} bg={C.purpleLight}>
                ✅ In PDI
              </Chip>
            )}
            {isOverdue && (
              <Chip color={C.red} bg={C.redLight}>
                ⏰ OVERDUE
              </Chip>
            )}
          </div>
          <div
            style={{
              display: "flex",
              gap: 14,
              fontSize: 12,
              color: C.textSecondary,
              flexWrap: "wrap",
            }}
          >
            <span>👤 {vehicle.customer_name || "—"}</span>
            {vehicle.advisor && <span>👔 {vehicle.advisor.full_name}</span>}
            {expTime && (
              <span
                style={{ color: isOverdue ? C.red : C.cyan, fontWeight: 600 }}
              >
                🕐 Expected: {formatISTShort(expTime)}
              </span>
            )}
          </div>
          {/* For due-today: show pending depts (what's left) and done depts */}
          {type === "dueToday" && ws && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 5,
                marginTop: 7,
              }}
            >
              {pendingDepts.map((d) => {
                const dm = DEPT_META[d];
                const st = ws[`${d}_status`];
                const stColors = {
                  in_progress: [C.amber, C.amberLight],
                  on_hold: [C.red, C.redLight],
                  not_started: [C.textMuted, C.surfaceElevated],
                };
                const [sc, sbg] = stColors[st] || stColors.not_started;
                return (
                  <Chip key={d} color={sc} bg={sbg} style={{ fontSize: 10 }}>
                    {dm.icon} {dm.label}
                  </Chip>
                );
              })}
              {doneDepts.map((d) => {
                const dm = DEPT_META[d];
                return (
                  <Chip
                    key={d}
                    color={C.green}
                    bg={C.greenLight}
                    style={{ fontSize: 10 }}
                  >
                    ✅ {dm.label}
                  </Chip>
                );
              })}
            </div>
          )}
        </div>
        {/* Stage badge */}
        <div
          style={{
            flexShrink: 0,
            marginLeft: 16,
            fontSize: 11,
            color: C.textMuted,
            fontWeight: 600,
            textAlign: "right",
          }}
        >
          {type === "dueToday" && (
            <div
              style={{ textTransform: "capitalize", color: C.textSecondary }}
            >
              {vehicle.current_stage?.replace(/_/g, " ")}
            </div>
          )}
          <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>
            Entry: {formatISTShort(vehicle.entry_time)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Section 1: In PDI */}
      {pdi.length > 0 && (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            overflow: "hidden",
            boxShadow: C.shadow,
          }}
        >
          <div
            onClick={() => setPdiOpen(!pdiOpen)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "13px 18px",
              cursor: "pointer",
              background: C.purpleLight,
              borderBottom: pdiOpen ? `1px solid ${C.border}` : "none",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#ede9fe")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = C.purpleLight)
            }
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16 }}>✅</span>
              <div>
                <span
                  style={{ fontWeight: 800, fontSize: 13, color: C.purple }}
                >
                  In PDI Right Now
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: C.purple,
                    marginLeft: 8,
                    opacity: 0.8,
                  }}
                >
                  — advisor inspecting, billing next
                </span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  background: C.purple,
                  color: "#fff",
                  borderRadius: 12,
                  padding: "2px 10px",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {pdi.length}
              </span>
              <span style={{ color: C.purple, fontSize: 14 }}>
                {pdiOpen ? "▲" : "▼"}
              </span>
            </div>
          </div>
          {pdiOpen && (
            <div style={{ padding: "12px 14px", display: "grid", gap: 8 }}>
              {pdi.map((v) => (
                <PipelineCard key={v.id} vehicle={v} type="pdi" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Section 2: Due today — still in workshop */}
      {dueToday.length > 0 && (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            overflow: "hidden",
            boxShadow: C.shadow,
          }}
        >
          <div
            onClick={() => setDueTodayOpen(!dueTodayOpen)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "13px 18px",
              cursor: "pointer",
              background: C.cyanLight,
              borderBottom: dueTodayOpen ? `1px solid ${C.border}` : "none",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#cffafe")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = C.cyanLight)
            }
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16 }}>🕐</span>
              <div>
                <span style={{ fontWeight: 800, fontSize: 13, color: C.cyan }}>
                  Expected Today — Still in Workshop
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: C.cyan,
                    marginLeft: 8,
                    opacity: 0.8,
                  }}
                >
                  — advisor set completion time for today
                </span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  background: C.cyan,
                  color: "#fff",
                  borderRadius: 12,
                  padding: "2px 10px",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {dueToday.length}
              </span>
              <span style={{ color: C.cyan, fontSize: 14 }}>
                {dueTodayOpen ? "▲" : "▼"}
              </span>
            </div>
          </div>
          {dueTodayOpen && (
            <div style={{ padding: "12px 14px", display: "grid", gap: 8 }}>
              <div
                style={{
                  fontSize: 11,
                  color: C.textMuted,
                  padding: "4px 2px 6px",
                }}
              >
                Sorted by expected completion time — overdue vehicles shown in
                red
              </div>
              {dueToday.map((v) => (
                <PipelineCard key={v.id} vehicle={v} type="dueToday" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
function BillingDashboard({ user, onLogout }) {
  const [vehicles, setVehicles] = useState([]);
  const [pipeline, setPipeline] = useState({ pdi: [], dueToday: [] }); // new
  const [extraData, setExtraData] = useState({});
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailVehicle, setDetailVehicle] = useState(null);
  const [billTarget, setBillTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const todayStartUTC = getISTMidnightUTC();
      const istNow = new Date();
      // End of today IST = tomorrow IST midnight - 1ms
      const istOff = 5.5 * 3600000;
      const istTodayStart = new Date(istNow.getTime() + istOff);
      istTodayStart.setUTCHours(0, 0, 0, 0);
      const istTodayEnd = new Date(istTodayStart.getTime() + 86400000 - 1);
      const todayEndUTC = new Date(
        istTodayEnd.getTime() - istOff,
      ).toISOString();

      const [vRes, pdiRes, dtRes, usRes, trRes] = await Promise.all([
        // Current billing queue
        supabase
          .from("vehicles")
          .select(
            "*, work_stages(*), customer_complaints(*), advisor:users!vehicles_advisor_id_fkey(full_name)",
          )
          .eq("current_stage", "billing")
          .order("entry_time", { ascending: true }),
        // In PDI right now — minutes away from billing
        supabase
          .from("vehicles")
          .select(
            "id,vehicle_number,customer_name,customer_phone,model,priority,entry_time,expected_completion_time,work_stages(*),advisor:users!vehicles_advisor_id_fkey(full_name)",
          )
          .eq("current_stage", "pdi")
          .order("entry_time", { ascending: true }),
        // Due today — still pending/in workshop but expected_completion_time is today
        supabase
          .from("vehicles")
          .select(
            "id,vehicle_number,customer_name,customer_phone,model,priority,entry_time,expected_completion_time,current_stage,work_stages(*),advisor:users!vehicles_advisor_id_fkey(full_name)",
          )
          .in("current_stage", ["pending", "front_checkup", "advisor_review"])
          .gte("expected_completion_time", todayStartUTC)
          .lte("expected_completion_time", todayEndUTC)
          .order("expected_completion_time", { ascending: true }),
        supabase
          .from("users")
          .select("id,full_name,role,team_id")
          .eq("is_active", true),
        supabase.from("teams").select("*"),
      ]);

      const vList = vRes.data || [];
      setVehicles(vList);
      setPipeline({ pdi: pdiRes.data || [], dueToday: dtRes.data || [] });
      setUsers(usRes.data || []);
      setTeams(trRes.data || []);

      if (vList.length > 0) {
        const ids = vList.map((v) => v.id);
        const [tmRes, wdRes, alRes] = await Promise.all([
          supabase.from("three_m_details").select("*").in("vehicle_id", ids),
          supabase.from("washing_details").select("*").in("vehicle_id", ids),
          supabase.from("alignment_details").select("*").in("vehicle_id", ids),
        ]);
        const extra = {};
        ids.forEach((id) => {
          extra[id] = {};
        });
        (tmRes.data || []).forEach((r) => {
          if (extra[r.vehicle_id]) extra[r.vehicle_id].threeM = r;
        });
        (wdRes.data || []).forEach((r) => {
          if (extra[r.vehicle_id]) extra[r.vehicle_id].washing = r;
        });
        (alRes.data || []).forEach((r) => {
          if (extra[r.vehicle_id]) extra[r.vehicle_id].alignment = r;
        });
        setExtraData(extra);
      }
    } catch (e) {
      console.error("BillingDashboard fetchData error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchData();
    const ch = supabase
      .channel("billing-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicles" },
        fetchData,
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user, fetchData]);

  const handleBillSuccess = () => {
    setBillTarget(null);
    setDetailVehicle(null);
    fetchData();
  };

  // ── List view ───────────────────────────────────────────────────────────────
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const todayCount = vehicles.filter(
    (v) =>
      v.entry_time &&
      new Date(toZ(v.entry_time)).toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
      }) === today,
  ).length;
  const overdueCount = vehicles.filter(
    (v) =>
      v.expected_completion_time &&
      new Date() > new Date(toZ(v.expected_completion_time)),
  ).length;
  const pipelineTotal = pipeline.pdi.length + pipeline.dueToday.length;

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
        <div
          style={{
            width: 44,
            height: 44,
            border: `4px solid ${C.border}`,
            borderTop: `4px solid ${C.accent}`,
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <div style={{ fontSize: 14, color: C.textMuted, fontWeight: 500 }}>
          Loading...
        </div>
        <style>
          {FONT}
          {`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}
        </style>
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
        {`*{box-sizing:border-box;} ::-webkit-scrollbar{width:5px;} ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px;}`}
      </style>

      {/* Header */}
      <div
        style={{
          background: C.surface,
          borderBottom: `1px solid ${C.border}`,
          padding: "13px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 50,
          boxShadow: C.shadow,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              background: C.accent,
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
                color: C.textMuted,
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              Sheetal Automobiles
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>
              Billing Dashboard
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 10px",
              background: C.greenLight,
              borderRadius: 20,
              border: `1px solid ${C.green}44`,
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
          <span
            style={{ fontSize: 13, color: C.textSecondary, fontWeight: 600 }}
          >
            👤 {user?.full_name}
          </span>
          <button
            onClick={onLogout}
            style={{
              padding: "6px 14px",
              background: C.redLight,
              color: C.red,
              border: `1px solid ${C.red}33`,
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

      <div style={{ padding: "22px 32px", maxWidth: 1100, margin: "0 auto" }}>
        {/* Stats — now 5 cards including pipeline */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5,1fr)",
            gap: 12,
            marginBottom: 22,
          }}
        >
          {[
            {
              label: "Ready to Bill",
              value: vehicles.length,
              color: C.blue,
              icon: "💰",
            },
            {
              label: "Today's Entries",
              value: todayCount,
              color: C.accent,
              icon: "📅",
            },
            {
              label: "Overdue",
              value: overdueCount,
              color: overdueCount > 0 ? C.red : C.green,
              icon: "⏰",
            },
            {
              label: "In PDI Now",
              value: pipeline.pdi.length,
              color: pipeline.pdi.length > 0 ? C.purple : C.textMuted,
              icon: "✅",
            },
            {
              label: "Due Today",
              value: pipeline.dueToday.length,
              color: pipeline.dueToday.length > 0 ? C.cyan : C.textMuted,
              icon: "🕐",
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 9,
                padding: "14px 16px",
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
                <span style={{ fontSize: 15 }}>{s.icon}</span>
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

        {/* Current billing queue */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
            gap: 12,
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: C.text,
              flexShrink: 0,
            }}
          >
            💰 Ready for Billing
            {vehicles.length > 0 && (
              <span
                style={{
                  marginLeft: 8,
                  padding: "2px 10px",
                  background: C.blueLight,
                  color: C.blue,
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {vehicles.length}
              </span>
            )}
          </span>
          <input
            type="text"
            placeholder="🔍 Search vehicle number or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              maxWidth: 320,
              padding: "7px 12px",
              border: `1px solid ${C.border}`,
              borderRadius: 7,
              fontSize: 13,
              color: C.text,
              background: C.surface,
              outline: "none",
              fontFamily: "inherit",
            }}
            onFocus={(e) => (e.target.style.borderColor = C.accent)}
            onBlur={(e) => (e.target.style.borderColor = C.border)}
          />
          <button
            onClick={fetchData}
            style={{
              padding: "6px 12px",
              background: "none",
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              color: C.textSecondary,
              fontFamily: "inherit",
              flexShrink: 0,
            }}
          >
            🔄 Refresh
          </button>
        </div>

        {vehicles.length === 0 ? (
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: "48px 20px",
              textAlign: "center",
              boxShadow: C.shadow,
              marginBottom: 22,
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: C.text,
                marginBottom: 5,
              }}
            >
              All Clear
            </div>
            <div style={{ fontSize: 12, color: C.textMuted }}>
              No vehicles pending billing right now
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12, marginBottom: 22 }}>
            {vehicles
              .filter((v) => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                return (
                  v.vehicle_number?.toLowerCase().includes(q) ||
                  v.customer_name?.toLowerCase().includes(q) ||
                  v.customer_phone?.includes(q)
                );
              })
              .map((v) => (
                <VehicleListCard
                  key={v.id}
                  vehicle={v}
                  onViewDetails={() => setDetailVehicle(v)}
                  onGenerateBill={() => setBillTarget(v)}
                />
              ))}
          </div>
        )}

        {/* ── Pipeline sections ─────────────────────────────────────────────── */}
        <PipelineSection pdi={pipeline.pdi} dueToday={pipeline.dueToday} />
      </div>

      {/* Quick bill from list */}
      {billTarget && (
        <BillModal
          vehicle={billTarget}
          currentUser={user}
          onClose={() => setBillTarget(null)}
          onSuccess={handleBillSuccess}
        />
      )}

      {/* Detail modal — overlays the list */}
      {detailVehicle && (
        <VehicleDetailModal
          vehicle={
            vehicles.find((v) => v.id === detailVehicle.id) || detailVehicle
          }
          extraData={extraData[detailVehicle.id]}
          users={users}
          teams={teams}
          currentUser={user}
          onClose={() => setDetailVehicle(null)}
          onBillSuccess={handleBillSuccess}
        />
      )}
    </div>
  );
}

export default BillingDashboard;
