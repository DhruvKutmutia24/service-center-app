import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

// ─── Constants ────────────────────────────────────────────────────────────────
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

const SERVICE_TYPES = [
  { value: "first_free_service", label: "1st Free Service" },
  { value: "second_free_service", label: "2nd Free Service" },
  { value: "third_free_service", label: "3rd Free Service" },
  { value: "scheduled_minor", label: "Scheduled Service — Minor" },
  { value: "scheduled_major", label: "Scheduled Service — Major" },
  { value: "running_repair", label: "Running Repair" },
  { value: "customer_complaint", label: "Customer Complaint" },
];

const TIME_SLOTS = [
  { value: "", label: "No preference", display: "Any time" },
  {
    value: "09:30-11:00",
    label: "Morning  — 9:30 to 11:00 AM",
    display: "9:30 – 11:00 AM",
  },
  {
    value: "11:00-13:00",
    label: "Mid-Day  — 11:00 AM to 1:00 PM",
    display: "11:00 AM – 1:00 PM",
  },
];

const RECEPTION_PHONE = "+91 90113 75450";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const todayIST = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const tomorrowIST = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  );
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("en-CA");
};

const nowIST = () =>
  new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

const formatVN = (v) =>
  v
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
const isValidPhone = (p) => /^\d{10}$/.test(p.trim());

const fmtDate = (d) => {
  if (!d) return "";
  const [y, m, day] = d.split("-");
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
  return `${day} ${months[parseInt(m) - 1]} ${y}`;
};

const genRef = () => {
  const d = new Date()
    .toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
    .replace(/-/g, "");
  return `BK-${d}-${Math.floor(Math.random() * 9000 + 1000)}`;
};

const dayOfWeek = (s) => {
  if (!s) return -1;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
};
const isSaturday = (s) => dayOfWeek(s) === 6;

// ─── WhatsApp ─────────────────────────────────────────────────────────────────
const sendBookingReceivedWA = async (
  phone,
  name,
  model,
  vehicleNumber,
  date,
  ref,
) => {
  try {
    await supabase.functions.invoke("send-whatsapp", {
      body: {
        to: phone,
        template: "booking_received",
        params: [
          name,
          model || "your vehicle",
          vehicleNumber,
          fmtDate(date),
          ref,
        ],
      },
    });
  } catch (e) {
    console.error("WA notify failed:", e);
  }
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#0f172a",
  surface: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  sub: "#475569",
  muted: "#94a3b8",
  amber: "#f59e0b",
  amberLt: "#fffbeb",
  amberBd: "#fde68a",
  green: "#10b981",
  greenLt: "#f0fdf4",
  greenBd: "#86efac",
  red: "#ef4444",
  redLt: "#fef2f2",
  blue: "#2563eb",
  blueLt: "#eff6ff",
  blueBd: "#bfdbfe",
};

const S = {
  page: {
    minHeight: "100vh",
    background: `linear-gradient(160deg,${C.bg} 0%,#1e293b 55%,#1e3a5f 100%)`,
    fontFamily: "'DM Sans','Segoe UI',sans-serif",
    padding: "0 0 60px",
  },
  header: {
    padding: "28px 20px 24px",
    textAlign: "center",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: C.surface,
    margin: "0 auto 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
    fontSize: 24,
    fontWeight: 900,
    color: C.bg,
  },
  brand: { fontSize: 20, fontWeight: 800, color: "#f8fafc", margin: "0 0 4px" },
  sub: { fontSize: 12, color: C.muted, margin: 0, letterSpacing: "0.3px" },
  pageTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: C.amber,
    margin: "12px 0 0",
    letterSpacing: "0.3px",
  },
  card: {
    background: C.surface,
    borderRadius: 14,
    padding: "24px 20px",
    marginBottom: 14,
    boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 800,
    color: C.sub,
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    marginBottom: 16,
    display: "flex",
    alignItems: "center",
    gap: 7,
  },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    color: C.sub,
    marginBottom: 6,
  },
  required: { color: C.red },
  optional: { color: C.muted, fontWeight: 500, fontSize: 11 },
  input: {
    width: "100%",
    padding: "12px 14px",
    border: `1.5px solid ${C.border}`,
    borderRadius: 8,
    fontSize: 15,
    color: C.text,
    background: C.surface,
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  },
  inputFocus: {
    borderColor: C.amber,
    boxShadow: "0 0 0 3px rgba(245,158,11,0.10)",
  },
  inputPrefilled: { background: C.greenLt, borderColor: C.green },
  inputError: { border: `1.5px solid ${C.red}` },
  inputMono: {
    fontFamily: "'DM Mono','Courier New',monospace",
    letterSpacing: "1px",
    textTransform: "uppercase",
  },
  select: {
    width: "100%",
    padding: "12px 14px",
    border: `1.5px solid ${C.border}`,
    borderRadius: 8,
    fontSize: 15,
    color: C.text,
    background: C.surface,
    outline: "none",
    fontFamily: "inherit",
    cursor: "pointer",
    appearance: "none",
    WebkitAppearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    paddingRight: 40,
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    padding: "12px 14px",
    border: `1.5px solid ${C.border}`,
    borderRadius: 8,
    fontSize: 14,
    color: C.text,
    background: C.surface,
    outline: "none",
    fontFamily: "inherit",
    resize: "vertical",
    minHeight: 80,
    boxSizing: "border-box",
  },
  inputGroup: {
    display: "flex",
    alignItems: "stretch",
    border: `1.5px solid ${C.border}`,
    borderRadius: 8,
    overflow: "hidden",
  },
  inputGroupAddon: {
    background: "#f8fafc",
    padding: "12px 12px",
    fontSize: 13,
    fontWeight: 700,
    color: C.sub,
    borderRight: `1px solid ${C.border}`,
    whiteSpace: "nowrap",
    display: "flex",
    alignItems: "center",
  },
  inputGroupInput: {
    flex: 1,
    padding: "12px 14px",
    border: "none",
    outline: "none",
    fontSize: 15,
    color: C.text,
    background: "transparent",
    fontFamily: "inherit",
    minWidth: 0,
  },
  btn: {
    width: "100%",
    padding: "15px",
    background: C.amber,
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 800,
    cursor: "pointer",
    fontFamily: "inherit",
    letterSpacing: "0.3px",
  },
  btnDisabled: { background: "#cbd5e1", cursor: "not-allowed" },
  err: { color: "#dc2626", fontSize: 12, marginTop: 5 },
  hint: { color: C.muted, fontSize: 11, marginTop: 4, lineHeight: 1.5 },
  warnBox: {
    background: C.amberLt,
    border: `1px solid ${C.amberBd}`,
    borderRadius: 8,
    padding: "9px 13px",
    marginTop: 6,
    fontSize: 12,
    color: "#92400e",
    fontWeight: 600,
    lineHeight: 1.5,
    display: "flex",
    alignItems: "flex-start",
    gap: 6,
  },
  // Confirmation
  confCard: {
    background: C.surface,
    borderRadius: 14,
    padding: "36px 24px",
    textAlign: "center",
    boxShadow: "0 2px 20px rgba(0,0,0,0.15)",
  },
  confIcon: { fontSize: 52, marginBottom: 16 },
  confTitle: {
    fontSize: 22,
    fontWeight: 800,
    color: C.text,
    margin: "0 0 8px",
  },
  confSub: { fontSize: 14, color: C.sub, margin: "0 0 24px", lineHeight: 1.6 },
  confRef: {
    background: "#f1f5f9",
    borderRadius: 8,
    padding: "12px 16px",
    fontFamily: "'DM Mono',monospace",
    fontSize: 16,
    fontWeight: 700,
    color: C.text,
    marginBottom: 6,
    letterSpacing: "1.5px",
  },
  confTimestamp: { fontSize: 11, color: C.muted, marginBottom: 20 },
  confDetail: {
    background: "#f8fafc",
    borderRadius: 10,
    padding: "16px",
    textAlign: "left",
    marginBottom: 20,
  },
  confRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "5px 0",
    fontSize: 13,
  },
  confKey: { color: C.sub, fontWeight: 600 },
  confVal: {
    color: C.text,
    fontWeight: 700,
    textAlign: "right",
    maxWidth: "60%",
  },
  noteBox: {
    background: C.amberLt,
    border: `1px solid ${C.amberBd}`,
    borderRadius: 8,
    padding: "12px 14px",
    fontSize: 13,
    color: "#92400e",
    lineHeight: 1.6,
  },
};

// ─── useIsMobile ──────────────────────────────────────────────────────────────
function useIsMobile(bp = 480) {
  const [v, setV] = useState(
    typeof window !== "undefined" ? window.innerWidth <= bp : false,
  );
  useEffect(() => {
    const h = () => setV(window.innerWidth <= bp);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return v;
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ value, onChange, label }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
        userSelect: "none",
        marginBottom: 4,
      }}
    >
      <div
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          position: "relative",
          background: value ? C.amber : "#cbd5e1",
          transition: "background 0.2s",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 3,
            left: value ? 23 : 3,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            transition: "left 0.2s",
          }}
        />
      </div>
      <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
        {label}
      </span>
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, required, optional, error, hint, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={S.label}>
        {label}
        {required && <span style={S.required}> *</span>}
        {optional && <span style={S.optional}> (optional)</span>}
      </label>
      {children}
      {hint && !error && (
        <div
          style={{
            ...S.hint,
            ...(typeof hint === "string" && hint.startsWith("✓")
              ? { color: C.green, fontWeight: 600 }
              : {}),
          }}
        >
          {hint}
        </div>
      )}
      {error && <div style={S.err}>⚠ {error}</div>}
    </div>
  );
}

// ─── BookingPage ──────────────────────────────────────────────────────────────
export default function BookingPage() {
  const isMobile = useIsMobile();
  const row2 = isMobile
    ? { display: "flex", flexDirection: "column", gap: 0 }
    : { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };

  // ── Form state ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    vehicle_number: "",
    // Vehicle owner's details (always sent to WhatsApp)
    owner_name: "",
    owner_phone: "",
    model: "",
    // Person filling the form (only captured when NOT the owner)
    filler_name: "",
    filler_phone: "",
    // Referral — who at Sheetal referred this customer
    referral_person: "",
    // Service
    service_type: "",
    issue_description: "",
    preferred_date: "",
    preferred_time: "",
    odometer_reading: "",
  });

  const [isOwner, setIsOwner] = useState(true); // "Are you the vehicle owner?"
  const [errors, setErrors] = useState({});
  const [focus, setFocus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(null);
  const [dateWarning, setDateWarning] = useState(null);
  const [existingBooking, setExisting] = useState(null); // duplicate detection
  const vnTimer = useRef(null);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  // ── VN + duplicate check ───────────────────────────────────────────────────
  const checkDuplicate = async (vn) => {
    const { data } = await supabase
      .from("bookings")
      .select("preferred_date, ref_number, status")
      .eq("vehicle_number", vn)
      .in("status", ["pending", "confirmed", "arrived"])
      .order("preferred_date", { ascending: true })
      .limit(1)
      .maybeSingle();
    setExisting(data || null);
  };

  const handleVN = (raw) => {
    const vn = formatVN(raw);
    setForm((f) => ({ ...f, vehicle_number: vn }));
    setExisting(null);
    clearTimeout(vnTimer.current);
    if (vn.length >= 4)
      vnTimer.current = setTimeout(() => checkDuplicate(vn), 600);
  };

  // ── Toggle: switching between owner / non-owner ────────────────────────────
  const handleIsOwner = (val) => {
    setIsOwner(val);
    // When switching back to "I am the owner", clear filler fields
    if (val) setForm((f) => ({ ...f, filler_name: "", filler_phone: "" }));
  };

  // ── Date ──────────────────────────────────────────────────────────────────
  const handleDateChange = (val) => {
    set("preferred_date")(val);
    setErrors((e) => ({ ...e, preferred_date: undefined }));
    if (!val) {
      setDateWarning(null);
      return;
    }
    if (val <= todayIST()) setDateWarning("today");
    else if (isSaturday(val)) setDateWarning("saturday");
    else setDateWarning(null);
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.vehicle_number || form.vehicle_number.length < 4)
      e.vehicle_number = "Enter a valid vehicle number";

    // Owner details — always required
    if (!form.owner_name.trim()) e.owner_name = "Name is required";
    if (!form.owner_phone.trim()) e.owner_phone = "Phone number is required";
    else if (!isValidPhone(form.owner_phone))
      e.owner_phone = "Enter a valid 10-digit mobile number";

    // Filler details — only required when NOT the owner
    if (!isOwner && !form.filler_name.trim())
      e.filler_name = "Your name is required";

    if (!form.service_type) e.service_type = "Please select a service type";
    if (!form.model) e.model = "Please select a vehicle model";

    if (!form.preferred_date) {
      e.preferred_date = "Please pick a preferred date";
    } else if (form.preferred_date <= todayIST()) {
      e.preferred_date = "Bookings open from tomorrow onwards";
    } else if (isSaturday(form.preferred_date)) {
      e.preferred_date = "We're closed on Saturdays — please pick another day";
    }

    if (form.odometer_reading && isNaN(parseInt(form.odometer_reading)))
      e.odometer_reading = "Enter a valid number";

    return e;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setSubmitting(true);
    setErrors({});

    const ref = genRef();
    const timestamp = nowIST();

    // Build contact_person string for internal use:
    // Encodes both referral and filler info so receptionist sees everything
    const parts = [];
    if (form.referral_person.trim())
      parts.push(`Ref: ${form.referral_person.trim()}`);
    if (!isOwner && form.filler_name.trim()) {
      const fillerStr = form.filler_phone.trim()
        ? `${form.filler_name.trim()} (${form.filler_phone.trim()})`
        : form.filler_name.trim();
      parts.push(`Filled by: ${fillerStr}`);
    }
    const contactPerson = parts.length ? parts.join(" | ") : null;

    const { error } = await supabase.from("bookings").insert([
      {
        vehicle_number: form.vehicle_number,
        customer_name: form.owner_name.trim(), // always the vehicle owner
        customer_phone: form.owner_phone.trim(), // always the vehicle owner
        model: form.model || null,
        service_type: form.service_type,
        issue_description: form.issue_description.trim() || null,
        preferred_date: form.preferred_date,
        preferred_time: form.preferred_time || null,
        odometer_reading: form.odometer_reading
          ? parseInt(form.odometer_reading)
          : null,
        contact_person: contactPerson,
        status: "pending",
        ref_number: ref,
      },
    ]);

    if (error) {
      setErrors({
        submit: "Something went wrong. Please try again or call us directly.",
      });
      setSubmitting(false);
      return;
    }

    // WhatsApp always to owner
    sendBookingReceivedWA(
      form.owner_phone.trim(),
      form.owner_name.trim(),
      form.model,
      form.vehicle_number,
      form.preferred_date,
      ref,
    );

    setConfirmed({
      ref,
      timestamp,
      ownerName: form.owner_name.trim(),
      vehicle: form.vehicle_number,
      model: form.model,
      date: form.preferred_date,
      time: form.preferred_time,
      service:
        SERVICE_TYPES.find((s) => s.value === form.service_type)?.label ||
        form.service_type,
      odometer: form.odometer_reading
        ? `${parseInt(form.odometer_reading).toLocaleString("en-IN")} km`
        : null,
      referral: form.referral_person.trim() || null,
      fillerName: !isOwner ? form.filler_name.trim() : null,
    });
    setSubmitting(false);
  };

  const inp = (key, extra = {}) => ({
    ...S.input,
    ...(focus === key ? S.inputFocus : {}),
    ...(errors[key] ? S.inputError : {}),
    ...extra,
  });

  // ── Confirmation ───────────────────────────────────────────────────────────
  if (confirmed) {
    const details = [
      ["Vehicle", confirmed.vehicle],
      confirmed.model && ["Model", confirmed.model],
      ["Date", fmtDate(confirmed.date)],
      [
        "Time",
        confirmed.time
          ? TIME_SLOTS.find((t) => t.value === confirmed.time)?.display ||
            confirmed.time
          : "Any time",
      ],
      ["Service", confirmed.service],
      confirmed.odometer && ["Odometer", confirmed.odometer],
      confirmed.referral && ["Referred by", confirmed.referral],
      confirmed.fillerName && ["Booked by", confirmed.fillerName],
    ].filter(Boolean);

    return (
      <div style={S.page}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap'); *{box-sizing:border-box;margin:0;padding:0;} body{background:#0f172a}`}</style>
        <div style={S.header}>
          <div style={S.logoBadge}>S</div>
          <p style={S.brand}>Sheetal Automobiles</p>
          <p style={S.sub}>Tata Motors Authorized Service Center</p>
        </div>
        <div style={{ maxWidth: 440, margin: "0 auto", padding: "24px 16px" }}>
          <div style={S.confCard}>
            <div style={S.confIcon}>✅</div>
            <h2 style={S.confTitle}>Booking Request Received!</h2>
            <p style={S.confSub}>
              Thank you, {confirmed.ownerName.split(" ")[0]}!<br />
              Our team will call you to confirm your appointment.
            </p>
            <div style={S.confRef}>REF: {confirmed.ref}</div>
            <div style={S.confTimestamp}>
              Submitted on {confirmed.timestamp}
            </div>
            <div style={S.confDetail}>
              {details.map(([k, v]) => (
                <div key={k} style={S.confRow}>
                  <span style={S.confKey}>{k}</span>
                  <span style={S.confVal}>{v}</span>
                </div>
              ))}
            </div>
            <div style={S.noteBox}>
              📍 <strong>Sheetal Automobiles</strong>
              <br />
              Tata Motors Authorized Service Center, Malegaon
              <br />
              <br />
              📞 <strong>{RECEPTION_PHONE}</strong>
              <br />
              <br />
              Please save your reference number. Our team will confirm your
              appointment shortly.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Min / max date ─────────────────────────────────────────────────────────
  const minDate = tomorrowIST();
  const maxDate = (() => {
    const d = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
    );
    d.setDate(d.getDate() + 31);
    return d.toLocaleDateString("en-CA");
  })();

  // ── Form render ────────────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;} body{background:#0f172a;margin:0;}
        input,select,textarea{-webkit-appearance:none;}
        input[type="date"]::-webkit-calendar-picker-indicator{cursor:pointer;}
        select{-webkit-appearance:none;-moz-appearance:none;}
      `}</style>

      <div style={S.header}>
        <div style={S.logoBadge}>S</div>
        <h1 style={S.brand}>Sheetal Automobiles</h1>
        <p style={S.sub}>Tata Motors Authorized Service Center · Malegaon</p>
        <p style={S.pageTitle}>🗓 Book a Service Appointment</p>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px 0" }}>
        {/* ── Vehicle Details ── */}
        <div style={S.card}>
          <div style={S.sectionTitle}>
            <span>🚗</span> Vehicle Details
          </div>

          <Field label="Vehicle Number" required error={errors.vehicle_number}>
            <input
              value={form.vehicle_number}
              onChange={(e) => handleVN(e.target.value)}
              placeholder="e.g. MH12AB1234"
              maxLength={10}
              style={inp("vehicle_number", S.inputMono)}
              onFocus={() => setFocus("vehicle_number")}
              onBlur={() => setFocus(null)}
            />
          </Field>

          {/* Duplicate booking banner */}
          {existingBooking && (
            <div
              style={{
                background: C.blueLt,
                border: `1px solid ${C.blueBd}`,
                borderRadius: 9,
                padding: "12px 14px",
                marginBottom: 14,
                fontSize: 13,
                color: "#1e40af",
                lineHeight: 1.6,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                ℹ️ Active booking already exists for this vehicle
              </div>
              <div style={{ marginBottom: 8 }}>
                There is a <strong>{existingBooking.status}</strong> booking
                {existingBooking.preferred_date
                  ? ` for ${fmtDate(existingBooking.preferred_date)}`
                  : ""}
                {existingBooking.ref_number
                  ? ` (Ref: ${existingBooking.ref_number})`
                  : ""}
                .
              </div>
              <div style={{ fontSize: 12, color: "#1d4ed8" }}>
                To reschedule it, call us at <strong>{RECEPTION_PHONE}</strong>.
                Or continue below to submit a new request.
              </div>
            </div>
          )}

          {/* "Are you the vehicle owner?" toggle */}
          <div style={{ marginBottom: 16 }}>
            <Toggle
              value={isOwner}
              onChange={handleIsOwner}
              label="I am the vehicle owner"
            />
            <div
              style={{
                fontSize: 12,
                color: C.muted,
                marginTop: 4,
                paddingLeft: 54,
              }}
            >
              {isOwner
                ? "Fill in your name and contact number below."
                : "Fill in the owner's details below, then your own."}
            </div>
          </div>

          {/* Owner details — label changes based on toggle */}
          <div style={row2}>
            <Field
              label={isOwner ? "Your Name" : "Vehicle Owner's Name"}
              required
              error={errors.owner_name}
            >
              <input
                value={form.owner_name}
                onChange={(e) => set("owner_name")(e.target.value)}
                placeholder="Full name"
                style={inp("owner_name")}
                onFocus={() => setFocus("owner_name")}
                onBlur={() => setFocus(null)}
              />
            </Field>

            <Field
              label={isOwner ? "Mobile Number" : "Owner's Mobile Number"}
              required
              error={errors.owner_phone}
              hint={
                form.owner_phone.length > 0 &&
                form.owner_phone.length < 10 &&
                !errors.owner_phone
                  ? `${10 - form.owner_phone.length} more digit${10 - form.owner_phone.length === 1 ? "" : "s"} needed`
                  : form.owner_phone.length === 10 && !errors.owner_phone
                    ? "✓ Looks good"
                    : null
              }
            >
              <input
                value={form.owner_phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                  set("owner_phone")(val);
                  if (errors.owner_phone)
                    setErrors((e) => ({ ...e, owner_phone: undefined }));
                }}
                placeholder="10-digit mobile number"
                type="tel"
                inputMode="numeric"
                style={{
                  ...inp("owner_phone"),
                  ...(form.owner_phone.length === 10 && !errors.owner_phone
                    ? S.inputPrefilled
                    : {}),
                }}
                onFocus={() => setFocus("owner_phone")}
                onBlur={() => {
                  setFocus(null);
                  if (
                    form.owner_phone.length > 0 &&
                    form.owner_phone.length < 10
                  )
                    setErrors((e) => ({
                      ...e,
                      owner_phone: "Enter a valid 10-digit mobile number",
                    }));
                }}
              />
            </Field>
          </div>

          {/* Filler details — only when NOT the owner */}
          {!isOwner && (
            <div
              style={{
                background: "#f8fafc",
                borderRadius: 9,
                padding: "14px",
                marginBottom: 4,
                border: `1px solid ${C.border}`,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.sub,
                  textTransform: "uppercase",
                  letterSpacing: "0.6px",
                  marginBottom: 12,
                }}
              >
                Your Details (Person Filling This Form)
              </div>
              <div style={row2}>
                <Field label="Your Name" required error={errors.filler_name}>
                  <input
                    value={form.filler_name}
                    onChange={(e) => set("filler_name")(e.target.value)}
                    placeholder="Full name"
                    style={inp("filler_name")}
                    onFocus={() => setFocus("filler_name")}
                    onBlur={() => setFocus(null)}
                  />
                </Field>
                <Field label="Your Mobile" optional>
                  <input
                    value={form.filler_phone}
                    onChange={(e) =>
                      set("filler_phone")(
                        e.target.value.replace(/\D/g, "").slice(0, 10),
                      )
                    }
                    placeholder="10-digit number"
                    type="tel"
                    inputMode="numeric"
                    style={inp("filler_phone")}
                    onFocus={() => setFocus("filler_phone")}
                    onBlur={() => setFocus(null)}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* Vehicle Model */}
          <Field label="Vehicle Model" required error={errors.model}>
            <select
              value={form.model}
              onChange={(e) => set("model")(e.target.value)}
              style={{
                ...S.select,
                ...(errors.model ? S.inputError : {}),
                fontSize: 15,
              }}
            >
              <option value="">Select model</option>
              {TATA_MODELS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>

          {/* Odometer */}
          <Field
            label="Odometer Reading"
            optional
            error={errors.odometer_reading}
          >
            <div
              style={{
                ...S.inputGroup,
                ...(errors.odometer_reading ? { borderColor: C.red } : {}),
                ...(focus === "odometer"
                  ? {
                      borderColor: C.amber,
                      boxShadow: "0 0 0 3px rgba(245,158,11,0.10)",
                    }
                  : {}),
              }}
            >
              <input
                value={form.odometer_reading}
                onChange={(e) =>
                  set("odometer_reading")(e.target.value.replace(/\D/g, ""))
                }
                placeholder="e.g. 15000"
                type="tel"
                inputMode="numeric"
                style={S.inputGroupInput}
                onFocus={() => setFocus("odometer")}
                onBlur={() => setFocus(null)}
              />
              <span style={S.inputGroupAddon}>km</span>
            </div>
          </Field>
        </div>

        {/* ── Service Details ── */}
        <div style={S.card}>
          <div style={S.sectionTitle}>
            <span>🔧</span> Service Details
          </div>

          <Field label="Type of Service" required error={errors.service_type}>
            <select
              value={form.service_type}
              onChange={(e) => set("service_type")(e.target.value)}
              style={{
                ...S.select,
                ...(errors.service_type ? S.inputError : {}),
              }}
            >
              <option value="">Select service type</option>
              {SERVICE_TYPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Issue / Additional Notes"
            optional
            hint="Briefly describe the problem or any specific work needed."
          >
            <textarea
              value={form.issue_description}
              onChange={(e) => set("issue_description")(e.target.value)}
              placeholder="e.g. AC not cooling, engine noise at startup..."
              style={{
                ...S.textarea,
                ...(focus === "issue" ? S.inputFocus : {}),
              }}
              onFocus={() => setFocus("issue")}
              onBlur={() => setFocus(null)}
              rows={3}
            />
          </Field>
        </div>

        {/* ── Appointment ── */}
        <div style={S.card}>
          <div style={S.sectionTitle}>
            <span>📅</span> Preferred Appointment
          </div>

          <div style={row2}>
            <Field
              label="Preferred Date"
              required
              error={errors.preferred_date}
            >
              <input
                type="date"
                value={form.preferred_date}
                min={minDate}
                max={maxDate}
                onChange={(e) => handleDateChange(e.target.value)}
                style={inp("preferred_date")}
                onFocus={() => setFocus("preferred_date")}
                onBlur={() => setFocus(null)}
              />
              {!errors.preferred_date && dateWarning === "today" && (
                <div style={S.warnBox}>
                  <span>⚠️</span>
                  <span>
                    Bookings open from tomorrow onwards — today's slots are not
                    available.
                  </span>
                </div>
              )}
              {!errors.preferred_date && dateWarning === "saturday" && (
                <div style={S.warnBox}>
                  <span>🔒</span>
                  <span>
                    We're closed on Saturdays. Please pick a weekday (Mon–Fri)
                    or Sunday.
                  </span>
                </div>
              )}
            </Field>

            <Field label="Preferred Time" optional>
              <select
                value={form.preferred_time}
                onChange={(e) => set("preferred_time")(e.target.value)}
                style={S.select}
              >
                {TIME_SLOTS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label.split("—")[0].trim()}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div
            style={{
              background: "#f8fafc",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 12,
              color: C.sub,
              lineHeight: 1.6,
            }}
          >
            ℹ️ This is a <strong>request</strong> — our team will call you to
            confirm. Service hours: Mon–Fri & Sun, 9:30 AM – 6:30 PM.
          </div>
        </div>

        {/* ── Referral ── */}
        <div style={S.card}>
          <div style={S.sectionTitle}>
            <span>👤</span> Referral
          </div>
          <Field
            label="Referred by (Sheetal Staff)"
            optional
            hint="Name of the Sheetal team member who referred you, if any."
          >
            <input
              value={form.referral_person}
              onChange={(e) => set("referral_person")(e.target.value)}
              placeholder="e.g. Gokul"
              style={inp("referral_person")}
              onFocus={() => setFocus("referral_person")}
              onBlur={() => setFocus(null)}
            />
          </Field>
        </div>

        {/* ── Error + Submit ── */}
        {errors.submit && (
          <div
            style={{
              background: C.redLt,
              border: "1px solid #fca5a5",
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 14,
              color: "#dc2626",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            ⚠️ {errors.submit}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{ ...S.btn, ...(submitting ? S.btnDisabled : {}) }}
        >
          {submitting ? "⏳ Submitting..." : "📋 Request Appointment →"}
        </button>

        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            color: C.muted,
            marginTop: 16,
            lineHeight: 1.6,
          }}
        >
          By submitting, you agree to be contacted by Sheetal Automobiles
          regarding your service appointment.
        </p>
      </div>
    </div>
  );
}
