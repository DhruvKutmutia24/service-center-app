// import { useState, useEffect, useMemo, useCallback, useRef } from "react";
// import { supabase } from "../lib/supabase";
// import * as XLSX from "xlsx";

// // ─── Theme — function of darkMode ─────────────────────────────────────────────
// const makeTheme = (dark) => ({
//   // Sidebar always dark
//   sidebar: "#0f172a",
//   sidebarHover: "#1e293b",
//   sidebarText: "#94a3b8",
//   // Page
//   bg: dark ? "#0f172a" : "#f8fafc",
//   surface: dark ? "#1e293b" : "#ffffff",
//   surfaceElevated: dark ? "#263246" : "#f1f5f9",
//   border: dark ? "#334155" : "#e2e8f0",
//   borderStrong: dark ? "#475569" : "#cbd5e1",
//   // Text — these are what was broken: dark mode needs light text
//   text: dark ? "#f1f5f9" : "#0f172a",
//   textSecondary: dark ? "#94a3b8" : "#475569",
//   textMuted: dark ? "#64748b" : "#94a3b8",
//   // Accent
//   accent: "#f59e0b",
//   accentBg: dark ? "#451a03" : "#fef3c7",
//   // Semantic colors — slightly brighter in dark for contrast
//   green: dark ? "#10b981" : "#059669",
//   greenLight: dark ? "#052e16" : "#ecfdf5",
//   red: dark ? "#f87171" : "#dc2626",
//   redLight: dark ? "#2d0a0a" : "#fef2f2",
//   amber: dark ? "#fbbf24" : "#d97706",
//   amberLight: dark ? "#1c0f00" : "#fffbeb",
//   blue: dark ? "#60a5fa" : "#2563eb",
//   blueLight: dark ? "#0f1e3d" : "#eff6ff",
//   purple: dark ? "#a78bfa" : "#7c3aed",
//   purpleLight: dark ? "#1e0a3c" : "#f5f3ff",
//   cyan: dark ? "#22d3ee" : "#0891b2",
//   cyanLight: dark ? "#061b24" : "#ecfeff",
//   // Shadows
//   shadow: dark ? "0 1px 3px rgba(0,0,0,0.5)" : "0 1px 3px rgba(0,0,0,0.08)",
//   shadowMd: dark ? "0 4px 12px rgba(0,0,0,0.6)" : "0 4px 6px rgba(0,0,0,0.07)",
//   shadowLg: dark
//     ? "0 10px 30px rgba(0,0,0,0.7)"
//     : "0 10px 15px rgba(0,0,0,0.1)",
// });

// const FONT = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=DM+Mono:wght@400;500&display=swap');`;

// // ─── Constants ────────────────────────────────────────────────────────────────
// const DEPT_KEYS = [
//   "mechanic",
//   "painter",
//   "denter",
//   "electrician",
//   "three_m",
//   "alignment_balancing",
//   "tyre_fitting",
//   "washing",
// ];
// const TEAM_ROLES = ["mechanic", "denter", "electrician"];
// const ALL_ROLES = [
//   "mechanic",
//   "painter",
//   "denter",
//   "electrician",
//   "3m",
//   "alignment_balancing",
//   "tyre_fitting",
//   "washing",
//   "gateman",
//   "front_checkup",
//   "billing",
//   "cashier",
//   "advisor",
//   "owner",
// ];
// const ROLE_LABELS = {
//   mechanic: "Mechanic",
//   painter: "Painter",
//   denter: "Denter",
//   electrician: "Electrician",
//   "3m": "3M Work",
//   alignment_balancing: "Alignment",
//   tyre_fitting: "Tyre Fitting",
//   washing: "Washing",
//   gateman: "Gateman",
//   front_checkup: "Front Checkup",
//   billing: "Billing",
//   cashier: "Cashier",
//   advisor: "Advisor",
//   owner: "Owner",
// };

// const STAGE_META = {
//   front_checkup: { label: "Front Checkup", icon: "🔍", color: "#8b5cf6" },
//   advisor_review: { label: "Advisor Review", icon: "👔", color: "#db2777" },
//   pending: { label: "Pending", icon: "⏳", color: "#d97706" },
//   mechanic: { label: "Mechanic", icon: "🔧", color: "#d97706" },
//   painter: { label: "Painter", icon: "🎨", color: "#8b5cf6" },
//   denter: { label: "Denter", icon: "🔨", color: "#0891b2" },
//   electrician: { label: "Electrician", icon: "⚡", color: "#ea580c" },
//   three_m: { label: "3M Work", icon: "✨", color: "#8b5cf6" },
//   alignment_balancing: { label: "Alignment", icon: "⚖️", color: "#db2777" },
//   tyre_fitting: { label: "Tyre Fitting", icon: "🛞", color: "#65a30d" },
//   washing: { label: "Washing", icon: "💧", color: "#0891b2" },
//   pdi: { label: "PDI", icon: "✅", color: "#059669" },
//   billing: { label: "Billing", icon: "🧾", color: "#2563eb" },
//   payment: { label: "Payment", icon: "💳", color: "#059669" },
//   ready_for_exit: { label: "Ready for Exit", icon: "🚪", color: "#059669" },
//   completed: { label: "Completed", icon: "✔️", color: "#64748b" },
// };

// // ─── Helpers ──────────────────────────────────────────────────────────────────
// const getISTMidnightUTC = () => {
//   const off = 5.5 * 3600000;
//   const istNow = new Date(Date.now() + off);
//   istNow.setUTCHours(0, 0, 0, 0);
//   return new Date(istNow.getTime() - off).toISOString();
// };

// const toZ = (s) =>
//   !s ? null : String(s).includes("Z") || String(s).includes("+") ? s : s + "Z";

// const formatIST = (s) => {
//   if (!s) return "—";
//   return new Date(toZ(s)).toLocaleString("en-IN", {
//     timeZone: "Asia/Kolkata",
//     day: "2-digit",
//     month: "short",
//     hour: "2-digit",
//     minute: "2-digit",
//     hour12: true,
//   });
// };

// const fmt = (n) =>
//   `₹${(parseFloat(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
// const fmtMins = (m) =>
//   !m || m <= 0
//     ? "—"
//     : m < 60
//       ? `${Math.round(m)}m`
//       : `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`;

// const dateRange = (preset, cfrom, cto) => {
//   const now = new Date();
//   const off = 5.5 * 3600000;
//   const ist = (d) => new Date(d.getTime() + off).toISOString().split("T")[0];
//   if (preset === "today") return { from: ist(now), to: ist(now) };
//   if (preset === "yesterday") {
//     const y = new Date(now);
//     y.setDate(y.getDate() - 1);
//     return { from: ist(y), to: ist(y) };
//   }
//   if (preset === "7days") {
//     const w = new Date(now);
//     w.setDate(w.getDate() - 6);
//     return { from: ist(w), to: ist(now) };
//   }
//   if (preset === "30days") {
//     const m = new Date(now);
//     m.setDate(m.getDate() - 29);
//     return { from: ist(m), to: ist(now) };
//   }
//   if (preset === "custom") return { from: cfrom, to: cto };
//   return { from: ist(now), to: ist(now) };
// };

// // ─── Primitive UI ─────────────────────────────────────────────────────────────
// const Chip = ({ color, bg, children, style = {} }) => (
//   <span
//     style={{
//       display: "inline-flex",
//       alignItems: "center",
//       padding: "2px 8px",
//       borderRadius: 4,
//       fontSize: 11,
//       fontWeight: 700,
//       color,
//       background: bg,
//       whiteSpace: "nowrap",
//       letterSpacing: "0.2px",
//       ...style,
//     }}
//   >
//     {children}
//   </span>
// );

// const Bx = ({ T, children, style = {}, onClick }) => (
//   <div
//     onClick={onClick}
//     style={{
//       background: T.surface,
//       border: `1px solid ${T.border}`,
//       borderRadius: 8,
//       padding: 20,
//       boxShadow: T.shadow,
//       ...(onClick ? { cursor: "pointer" } : {}),
//       ...style,
//     }}
//     onMouseEnter={(e) =>
//       onClick && (e.currentTarget.style.boxShadow = T.shadowMd)
//     }
//     onMouseLeave={(e) =>
//       onClick && (e.currentTarget.style.boxShadow = T.shadow)
//     }
//   >
//     {children}
//   </div>
// );

// const KPI = ({ T, label, value, icon, color, onClick }) => (
//   <div
//     onClick={onClick}
//     style={{
//       background: T.surface,
//       border: `1px solid ${T.border}`,
//       borderRadius: 8,
//       padding: "16px 18px",
//       boxShadow: T.shadow,
//       cursor: onClick ? "pointer" : "default",
//       minWidth: 0,
//     }}
//     onMouseEnter={(e) =>
//       onClick && (e.currentTarget.style.boxShadow = T.shadowMd)
//     }
//     onMouseLeave={(e) =>
//       onClick && (e.currentTarget.style.boxShadow = T.shadow)
//     }
//   >
//     <div
//       style={{
//         display: "flex",
//         justifyContent: "space-between",
//         alignItems: "center",
//         marginBottom: 8,
//       }}
//     >
//       <span
//         style={{
//           fontSize: 11,
//           fontWeight: 700,
//           color: T.textMuted,
//           textTransform: "uppercase",
//           letterSpacing: "0.5px",
//         }}
//       >
//         {label}
//       </span>
//       <span style={{ fontSize: 16 }}>{icon}</span>
//     </div>
//     <div
//       style={{
//         fontSize: 26,
//         fontWeight: 800,
//         color,
//         fontFamily: "'DM Mono',monospace",
//         lineHeight: 1,
//       }}
//     >
//       {value}
//     </div>
//   </div>
// );

// const Btn = ({
//   T,
//   children,
//   onClick,
//   v = "primary",
//   sz = "md",
//   disabled = false,
//   style = {},
// }) => {
//   const vs = {
//     primary: { bg: "#f59e0b", color: "#fff", border: "#f59e0b" },
//     secondary: { bg: T.surfaceElevated, color: T.text, border: T.border },
//     danger: { bg: T.red, color: "#fff", border: T.red },
//     ghost: { bg: "transparent", color: T.textSecondary, border: T.border },
//     success: { bg: T.green, color: "#fff", border: T.green },
//   };
//   const ss = {
//     sm: { padding: "5px 10px", fontSize: 12 },
//     md: { padding: "8px 14px", fontSize: 13 },
//     lg: { padding: "11px 22px", fontSize: 14 },
//   };
//   const s = vs[v];
//   const p = ss[sz];
//   return (
//     <button
//       onClick={onClick}
//       disabled={disabled}
//       style={{
//         background: disabled ? T.surfaceElevated : s.bg,
//         color: disabled ? T.textMuted : s.color,
//         border: `1px solid ${disabled ? T.border : s.border}`,
//         borderRadius: 6,
//         fontWeight: 600,
//         cursor: disabled ? "not-allowed" : "pointer",
//         fontFamily: "inherit",
//         opacity: disabled ? 0.6 : 1,
//         whiteSpace: "nowrap",
//         display: "inline-flex",
//         alignItems: "center",
//         gap: 6,
//         ...p,
//         ...style,
//       }}
//     >
//       {children}
//     </button>
//   );
// };

// const Inp = ({
//   T,
//   label,
//   value,
//   onChange,
//   type = "text",
//   placeholder,
//   required,
//   style = {},
// }) => (
//   <div style={{ marginBottom: 14, ...style }}>
//     {label && (
//       <label
//         style={{
//           display: "block",
//           fontSize: 11,
//           fontWeight: 700,
//           color: T.textSecondary,
//           marginBottom: 5,
//           textTransform: "uppercase",
//           letterSpacing: "0.4px",
//         }}
//       >
//         {label}
//         {required && <span style={{ color: T.red }}> *</span>}
//       </label>
//     )}
//     <input
//       type={type}
//       value={value}
//       onChange={(e) => onChange(e.target.value)}
//       placeholder={placeholder}
//       style={{
//         width: "100%",
//         padding: "9px 12px",
//         border: `1px solid ${T.border}`,
//         borderRadius: 6,
//         fontSize: 14,
//         color: T.text,
//         background: T.surface,
//         outline: "none",
//         fontFamily: "inherit",
//         boxSizing: "border-box",
//       }}
//       onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
//       onBlur={(e) => (e.target.style.borderColor = T.border)}
//     />
//   </div>
// );

// const Sel = ({ T, label, value, onChange, options, style = {} }) => (
//   <div style={{ marginBottom: 14, ...style }}>
//     {label && (
//       <label
//         style={{
//           display: "block",
//           fontSize: 11,
//           fontWeight: 700,
//           color: T.textSecondary,
//           marginBottom: 5,
//           textTransform: "uppercase",
//           letterSpacing: "0.4px",
//         }}
//       >
//         {label}
//       </label>
//     )}
//     <select
//       value={value}
//       onChange={(e) => onChange(e.target.value)}
//       style={{
//         width: "100%",
//         padding: "9px 12px",
//         border: `1px solid ${T.border}`,
//         borderRadius: 6,
//         fontSize: 14,
//         color: T.text,
//         background: T.surface,
//         outline: "none",
//         fontFamily: "inherit",
//         cursor: "pointer",
//       }}
//     >
//       {options.map((o) => (
//         <option key={o.value} value={o.value}>
//           {o.label}
//         </option>
//       ))}
//     </select>
//   </div>
// );

// const Dlg = ({ T, open, onClose, title, children, width = 520 }) => {
//   if (!open) return null;
//   return (
//     <div
//       onClick={onClose}
//       style={{
//         position: "fixed",
//         inset: 0,
//         background: "rgba(0,0,0,0.6)",
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         zIndex: 1000,
//         padding: 20,
//       }}
//     >
//       <div
//         onClick={(e) => e.stopPropagation()}
//         style={{
//           background: T.surface,
//           borderRadius: 10,
//           width: "100%",
//           maxWidth: width,
//           maxHeight: "90vh",
//           overflow: "hidden",
//           display: "flex",
//           flexDirection: "column",
//           boxShadow: T.shadowLg,
//           border: `1px solid ${T.border}`,
//         }}
//       >
//         <div
//           style={{
//             display: "flex",
//             justifyContent: "space-between",
//             alignItems: "center",
//             padding: "14px 20px",
//             borderBottom: `1px solid ${T.border}`,
//             flexShrink: 0,
//           }}
//         >
//           <span style={{ fontSize: 16, fontWeight: 700, color: T.text }}>
//             {title}
//           </span>
//           <button
//             onClick={onClose}
//             style={{
//               background: "none",
//               border: "none",
//               cursor: "pointer",
//               fontSize: 18,
//               color: T.textMuted,
//               lineHeight: 1,
//               padding: 4,
//             }}
//           >
//             ✕
//           </button>
//         </div>
//         <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
//           {children}
//         </div>
//       </div>
//     </div>
//   );
// };

// const SecTitle = ({ T, children, action }) => (
//   <div
//     style={{
//       display: "flex",
//       justifyContent: "space-between",
//       alignItems: "center",
//       marginBottom: 12,
//       paddingBottom: 8,
//       borderBottom: `2px solid #f59e0b`,
//     }}
//   >
//     <span
//       style={{
//         fontSize: 12,
//         fontWeight: 800,
//         color: T.text,
//         textTransform: "uppercase",
//         letterSpacing: "0.6px",
//       }}
//     >
//       {children}
//     </span>
//     {action}
//   </div>
// );

// const Empty = ({ T, icon, text }) => (
//   <div
//     style={{ textAlign: "center", padding: "36px 20px", color: T.textMuted }}
//   >
//     <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
//     <div style={{ fontSize: 13, fontWeight: 500 }}>{text}</div>
//   </div>
// );

// const WorkBadges = ({ T, ws }) => {
//   if (!ws) return null;
//   const active = DEPT_KEYS.filter((k) => ws[`${k}_required`]);
//   if (!active.length) return null;
//   return (
//     <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 5 }}>
//       {active.map((k) => {
//         const st = ws[`${k}_status`];
//         const map = {
//           completed: [T.green, T.greenLight],
//           in_progress: [T.amber, T.amberLight],
//           on_hold: [T.red, T.redLight],
//           not_started: [T.textMuted, T.surfaceElevated],
//         };
//         const [c, bg] = map[st] || map.not_started;
//         const ic =
//           {
//             completed: "✅",
//             in_progress: "🔄",
//             on_hold: "⏸️",
//             not_started: "⏳",
//           }[st] || "⏳";
//         return (
//           <Chip key={k} color={c} bg={bg} style={{ fontSize: 10 }}>
//             {ic} {STAGE_META[k]?.label?.split(" ")[0]}
//           </Chip>
//         );
//       })}
//     </div>
//   );
// };

// // Table helpers
// const TH = ({ T, children }) => (
//   <th
//     style={{
//       padding: "8px 12px",
//       textAlign: "left",
//       fontSize: 10,
//       fontWeight: 800,
//       color: T.textMuted,
//       textTransform: "uppercase",
//       letterSpacing: "0.5px",
//       whiteSpace: "nowrap",
//       borderBottom: `2px solid ${T.border}`,
//     }}
//   >
//     {children}
//   </th>
// );
// const TD = ({ T, children, style = {} }) => (
//   <td
//     style={{
//       padding: "9px 12px",
//       fontSize: 13,
//       color: T.text,
//       borderBottom: `1px solid ${T.border}`,
//       ...style,
//     }}
//   >
//     {children}
//   </td>
// );

// // ─── Quick View Modal (pipeline list) ─────────────────────────────────────────
// function QuickViewModal({ T, title, vehicles, onVehiclePress, onClose }) {
//   return (
//     <Dlg
//       T={T}
//       open={true}
//       onClose={onClose}
//       title={`${title} — ${vehicles.length} vehicle${vehicles.length !== 1 ? "s" : ""}`}
//       width={680}
//     >
//       {vehicles.length === 0 ? (
//         <Empty T={T} icon="✅" text="No vehicles" />
//       ) : (
//         vehicles.map((v) => {
//           const meta = STAGE_META[v.current_stage] || {
//             icon: "🚗",
//             color: T.blue,
//             label: v.current_stage,
//           };
//           return (
//             <div
//               key={v.id}
//               onClick={() => {
//                 onVehiclePress(v);
//                 onClose();
//               }}
//               style={{
//                 display: "flex",
//                 justifyContent: "space-between",
//                 alignItems: "flex-start",
//                 padding: "12px 14px",
//                 borderRadius: 8,
//                 border: `1px solid ${T.border}`,
//                 borderLeft: `3px solid ${meta.color}`,
//                 marginBottom: 8,
//                 cursor: "pointer",
//                 background: T.surface,
//                 transition: "background 0.1s",
//               }}
//               onMouseEnter={(e) =>
//                 (e.currentTarget.style.background = T.surfaceElevated)
//               }
//               onMouseLeave={(e) =>
//                 (e.currentTarget.style.background = T.surface)
//               }
//             >
//               <div>
//                 <div
//                   style={{
//                     display: "flex",
//                     alignItems: "center",
//                     gap: 8,
//                     marginBottom: 4,
//                   }}
//                 >
//                   <span
//                     style={{
//                       fontWeight: 800,
//                       fontSize: 15,
//                       fontFamily: "'DM Mono',monospace",
//                       color: T.text,
//                     }}
//                   >
//                     {v.vehicle_number}
//                   </span>
//                   {v.model && (
//                     <Chip color={T.blue} bg={T.blueLight}>
//                       {v.model}
//                     </Chip>
//                   )}
//                   {v.priority !== "normal" && (
//                     <Chip
//                       color={v.priority === "vip" ? T.purple : T.red}
//                       bg={v.priority === "vip" ? T.purpleLight : T.redLight}
//                     >
//                       {v.priority.toUpperCase()}
//                     </Chip>
//                   )}
//                 </div>
//                 <div style={{ fontSize: 13, color: T.textSecondary }}>
//                   {v.customer_name || "—"} • {v.customer_phone || "—"}
//                 </div>
//                 {v.work_stages?.[0] && (
//                   <WorkBadges T={T} ws={v.work_stages[0]} />
//                 )}
//               </div>
//               <div
//                 style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}
//               >
//                 <Chip color={meta.color} bg={meta.color + "22"}>
//                   {meta.icon} {meta.label}
//                 </Chip>
//                 <div style={{ fontSize: 11, color: T.textMuted, marginTop: 5 }}>
//                   {formatIST(v.entry_time)}
//                 </div>
//               </div>
//             </div>
//           );
//         })
//       )}
//     </Dlg>
//   );
// }

// // ─── Vehicle Detail Modal ─────────────────────────────────────────────────────
// function VehicleDetailModal({ T, vehicle, users, teams, onClose }) {
//   const [history, setHistory] = useState([]);
//   const [complaints, setComplaints] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     Promise.all([
//       supabase
//         .from("vehicle_history")
//         .select("*,user:users!vehicle_history_user_id_fkey(full_name)")
//         .eq("vehicle_id", vehicle.id)
//         .order("created_at", { ascending: false }),
//       supabase
//         .from("customer_complaints")
//         .select("*")
//         .eq("vehicle_id", vehicle.id)
//         .order("complaint_number", { ascending: true }),
//     ]).then(([h, c]) => {
//       setHistory(h.data || []);
//       setComplaints(c.data || []);
//       setLoading(false);
//     });
//   }, [vehicle.id]);

//   const ws = vehicle.work_stages?.[0];
//   const teamMap = Object.fromEntries((teams || []).map((t) => [t.id, t.name]));
//   const userMap = Object.fromEntries(
//     (users || []).map((u) => [u.id, u.full_name]),
//   );
//   const meta = STAGE_META[vehicle.current_stage] || {
//     label: vehicle.current_stage,
//     icon: "🚗",
//     color: T.blue,
//   };

//   const info = [
//     ["Customer", vehicle.customer_name || "—"],
//     ["Phone", vehicle.customer_phone || "—"],
//     ["Model", vehicle.model || "—"],
//     [
//       "Odometer",
//       vehicle.odometer_reading ? `${vehicle.odometer_reading} km` : "—",
//     ],
//     ["Fuel", vehicle.fuel_level || "—"],
//     ["Priority", vehicle.priority || "normal"],
//     ["Service", vehicle.service_type?.replace(/_/g, " ") || "—"],
//     ["Entry", formatIST(vehicle.entry_time)],
//     vehicle.expected_completion_time && [
//       "Expected",
//       formatIST(vehicle.expected_completion_time),
//     ],
//     vehicle.bill_amount > 0 && ["Bill", fmt(vehicle.bill_amount)],
//     vehicle.total_paid > 0 && ["Paid", fmt(vehicle.total_paid)],
//     vehicle.credit_amount > 0 && ["Credit", fmt(vehicle.credit_amount)],
//     vehicle.credit_guaranteed_by && [
//       "Guaranteed By",
//       vehicle.credit_guaranteed_by,
//     ],
//     vehicle.payment_status && ["Payment", vehicle.payment_status],
//     vehicle.job_code && ["Job Code", vehicle.job_code],
//   ].filter(Boolean);

//   return (
//     <Dlg
//       T={T}
//       open={true}
//       onClose={onClose}
//       title={`${meta.icon} ${vehicle.vehicle_number} — ${meta.label}`}
//       width={740}
//     >
//       <div
//         style={{
//           display: "grid",
//           gridTemplateColumns: "1fr 1fr",
//           gap: 8,
//           marginBottom: 14,
//         }}
//       >
//         {info.map(([l, val]) => (
//           <div
//             key={l}
//             style={{
//               background: T.surfaceElevated,
//               borderRadius: 6,
//               padding: "8px 12px",
//             }}
//           >
//             <div
//               style={{
//                 fontSize: 10,
//                 color: T.textMuted,
//                 fontWeight: 700,
//                 textTransform: "uppercase",
//                 marginBottom: 3,
//               }}
//             >
//               {l}
//             </div>
//             <div
//               style={{
//                 fontSize: 14,
//                 fontWeight: 600,
//                 color: T.text,
//                 textTransform: "capitalize",
//                 wordBreak: "break-word",
//               }}
//             >
//               {val}
//             </div>
//           </div>
//         ))}
//       </div>
//       {vehicle.customer_voice && (
//         <div
//           style={{
//             background: T.blueLight,
//             border: `1px solid ${T.blue}33`,
//             borderRadius: 8,
//             padding: 12,
//             marginBottom: 14,
//           }}
//         >
//           <div
//             style={{
//               fontSize: 10,
//               fontWeight: 800,
//               color: T.blue,
//               textTransform: "uppercase",
//               marginBottom: 4,
//             }}
//           >
//             💬 Customer Voice
//           </div>
//           <div style={{ fontSize: 13, color: T.text, fontStyle: "italic" }}>
//             "{vehicle.customer_voice}"
//           </div>
//         </div>
//       )}
//       {ws && DEPT_KEYS.some((d) => ws[`${d}_required`]) && (
//         <div style={{ marginBottom: 14 }}>
//           <SecTitle T={T}>Work Status</SecTitle>
//           <div
//             style={{
//               display: "grid",
//               gridTemplateColumns: "repeat(4,1fr)",
//               gap: 8,
//             }}
//           >
//             {DEPT_KEYS.map((dept) => {
//               if (!ws[`${dept}_required`]) return null;
//               const st = ws[`${dept}_status`];
//               const map = {
//                 completed: [T.green, T.greenLight],
//                 in_progress: [T.amber, T.amberLight],
//                 on_hold: [T.red, T.redLight],
//                 not_started: [T.textMuted, T.surfaceElevated],
//               };
//               const [c, bg] = map[st] || map.not_started;
//               const dm = STAGE_META[dept];
//               return (
//                 <div
//                   key={dept}
//                   style={{
//                     background: bg,
//                     borderRadius: 8,
//                     padding: "9px 10px",
//                     border: `1px solid ${c}44`,
//                   }}
//                 >
//                   <div style={{ fontSize: 14, marginBottom: 3 }}>{dm.icon}</div>
//                   <div
//                     style={{
//                       fontSize: 10,
//                       fontWeight: 700,
//                       color: T.textSecondary,
//                     }}
//                   >
//                     {dm.label}
//                   </div>
//                   <div
//                     style={{
//                       fontSize: 10,
//                       fontWeight: 700,
//                       color: c,
//                       textTransform: "capitalize",
//                       marginTop: 2,
//                     }}
//                   >
//                     {st?.replace(/_/g, " ")}
//                   </div>
//                   {ws[`${dept}_team_id`] && teamMap[ws[`${dept}_team_id`]] && (
//                     <div
//                       style={{ fontSize: 9, color: T.textMuted, marginTop: 1 }}
//                     >
//                       👥 {teamMap[ws[`${dept}_team_id`]]}
//                     </div>
//                   )}
//                   {ws[`${dept}_locked_by`] &&
//                     userMap[ws[`${dept}_locked_by`]] && (
//                       <div style={{ fontSize: 9, color: T.textMuted }}>
//                         👤 {userMap[ws[`${dept}_locked_by`]]}
//                       </div>
//                     )}
//                 </div>
//               );
//             })}
//           </div>
//         </div>
//       )}
//       {complaints.length > 0 && (
//         <div style={{ marginBottom: 14 }}>
//           <SecTitle T={T}>Complaints ({complaints.length})</SecTitle>
//           {complaints.map((c) => (
//             <div
//               key={c.id}
//               style={{
//                 display: "flex",
//                 justifyContent: "space-between",
//                 alignItems: "flex-start",
//                 padding: "9px 12px",
//                 background: T.surfaceElevated,
//                 borderRadius: 6,
//                 marginBottom: 6,
//               }}
//             >
//               <div>
//                 <span style={{ fontWeight: 700, color: T.text, fontSize: 13 }}>
//                   #{c.complaint_number}
//                 </span>
//                 <span
//                   style={{
//                     fontSize: 13,
//                     color: T.textSecondary,
//                     marginLeft: 10,
//                   }}
//                 >
//                   {c.complaint_text}
//                 </span>
//               </div>
//               <Chip
//                 color={c.is_resolved ? T.green : T.amber}
//                 bg={c.is_resolved ? T.greenLight : T.amberLight}
//               >
//                 {c.is_resolved ? "Resolved" : "Pending"}
//               </Chip>
//             </div>
//           ))}
//         </div>
//       )}
//       <SecTitle T={T}>Timeline</SecTitle>
//       {loading ? (
//         <div style={{ textAlign: "center", padding: 20, color: T.textMuted }}>
//           Loading...
//         </div>
//       ) : history.length === 0 ? (
//         <Empty T={T} icon="📭" text="No history" />
//       ) : (
//         <div style={{ maxHeight: 300, overflowY: "auto" }}>
//           {history.map((item, idx) => (
//             <div
//               key={item.id}
//               style={{ display: "flex", gap: 10, marginBottom: 4 }}
//             >
//               <div
//                 style={{
//                   display: "flex",
//                   flexDirection: "column",
//                   alignItems: "center",
//                   flexShrink: 0,
//                 }}
//               >
//                 <div
//                   style={{
//                     width: 9,
//                     height: 9,
//                     borderRadius: "50%",
//                     background: "#f59e0b",
//                     marginTop: 4,
//                   }}
//                 />
//                 {idx < history.length - 1 && (
//                   <div
//                     style={{
//                       width: 1,
//                       flex: 1,
//                       background: T.border,
//                       marginTop: 2,
//                       minHeight: 14,
//                     }}
//                   />
//                 )}
//               </div>
//               <div
//                 style={{
//                   flex: 1,
//                   background: T.surfaceElevated,
//                   borderRadius: 6,
//                   padding: "7px 11px",
//                   marginBottom: 4,
//                 }}
//               >
//                 <div
//                   style={{
//                     display: "flex",
//                     justifyContent: "space-between",
//                     marginBottom: 2,
//                   }}
//                 >
//                   <span
//                     style={{
//                       fontSize: 11,
//                       fontWeight: 700,
//                       color: T.text,
//                       textTransform: "capitalize",
//                     }}
//                   >
//                     {item.stage?.replace(/_/g, " ")} —{" "}
//                     {item.action?.replace(/_/g, " ")}
//                   </span>
//                   <span
//                     style={{
//                       fontSize: 10,
//                       color: T.textMuted,
//                       flexShrink: 0,
//                       marginLeft: 8,
//                     }}
//                   >
//                     {formatIST(item.created_at)}
//                   </span>
//                 </div>
//                 {item.user && (
//                   <div style={{ fontSize: 10, color: T.textSecondary }}>
//                     👤 {item.user.full_name}
//                   </div>
//                 )}
//                 {item.new_value && (
//                   <div
//                     style={{
//                       fontSize: 10,
//                       color: T.textSecondary,
//                       marginTop: 1,
//                     }}
//                   >
//                     {item.new_value}
//                   </div>
//                 )}
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </Dlg>
//   );
// }

// // ─── Excel Export ─────────────────────────────────────────────────────────────
// async function exportToExcel(reportType, fromDate, toDate) {
//   const f0 = fromDate + "T00:00:00+05:30";
//   const t0 = toDate + "T23:59:59+05:30";
//   const wb = XLSX.utils.book_new();
//   const sheet = (rows, name) => {
//     if (rows.length)
//       XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name);
//   };

//   if (reportType === "operations") {
//     const { data: veh } = await supabase
//       .from("vehicles")
//       .select(
//         "*,work_stages(*),advisor:users!vehicles_advisor_id_fkey(full_name)",
//       )
//       .eq("current_stage", "completed")
//       .gte("updated_at", f0)
//       .lte("updated_at", t0)
//       .order("updated_at", { ascending: false });

//     const vids = (veh || []).map((v) => v.id);
//     const { data: hist } = vids.length
//       ? await supabase
//           .from("vehicle_history")
//           .select("*,user:users!vehicle_history_user_id_fkey(full_name)")
//           .in("vehicle_id", vids)
//           .in("action", [
//             "work_started",
//             "work_completed",
//             "started",
//             "completed",
//             "on_hold",
//           ])
//           .order("created_at", { ascending: true })
//       : { data: [] };
//     const { data: pays } = await supabase
//       .from("payments")
//       .select(
//         "*,vehicle:vehicles!payments_vehicle_id_fkey(vehicle_number,customer_name),collector:users!payments_collected_by_fkey(full_name)",
//       )
//       .gte("created_at", f0)
//       .lte("created_at", t0)
//       .order("created_at", { ascending: false });

//     sheet(
//       (veh || []).map((v) => {
//         const e = v.entry_time ? new Date(toZ(v.entry_time)) : null;
//         const x = v.updated_at ? new Date(toZ(v.updated_at)) : null;
//         const exp = v.expected_completion_time
//           ? new Date(toZ(v.expected_completion_time))
//           : null;
//         const tat = e && x ? Math.round((x - e) / 60000) : null;
//         const deptDone = (d) =>
//           v.work_stages?.[0]?.[`${d}_required`]
//             ? v.work_stages[0][`${d}_status`] === "completed"
//               ? "Yes"
//               : "No"
//             : "N/A";
//         return {
//           "Vehicle No": v.vehicle_number,
//           "Customer Name": v.customer_name || "",
//           "Customer Phone": v.customer_phone || "",
//           Model: v.model || "",
//           "Odometer (km)": v.odometer_reading || "",
//           "Fuel Level": v.fuel_level || "",
//           "Service Type": v.service_type?.replace(/_/g, " ") || "",
//           Priority: v.priority || "normal",
//           Advisor: v.advisor?.full_name || "",
//           "Job Code": v.job_code || "",
//           "Part Amount": v.part_amount || "",
//           "Entry Time": e
//             ? e.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
//             : "",
//           "Exit Time": x
//             ? x.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
//             : "",
//           "TAT (mins)": tat,
//           "TAT (hrs)": tat ? (tat / 60).toFixed(1) : "",
//           "Bill Amount": v.bill_amount || 0,
//           "Total Paid": v.total_paid || 0,
//           "Credit Amount": v.credit_amount || 0,
//           "Payment Status": v.payment_status || "",
//           "Credit Guaranteed By": v.credit_guaranteed_by || "",
//           "SLA Breached": exp && x ? (x > exp ? "YES" : "NO") : "—",
//           Mechanic: deptDone("mechanic"),
//           Painter: deptDone("painter"),
//           Denter: deptDone("denter"),
//           Electrician: deptDone("electrician"),
//           "3M": deptDone("three_m"),
//           Alignment: deptDone("alignment_balancing"),
//           Tyre: deptDone("tyre_fitting"),
//           Washing: deptDone("washing"),
//         };
//       }),
//       "Vehicle Summary",
//     );

//     const hm = {};
//     (hist || []).forEach((h) => {
//       const vId = h.vehicle_id;
//       const d = h.stage;
//       if (!DEPT_KEYS.includes(d)) return;
//       if (!hm[vId]) hm[vId] = {};
//       if (!hm[vId][d]) hm[vId][d] = { s: null, e: null, hold: 0, worker: "" };
//       const a = h.action;
//       const t = new Date(toZ(h.created_at));
//       if ((a === "started" || a === "work_started") && !hm[vId][d].s) {
//         hm[vId][d].s = t;
//         hm[vId][d].worker = h.user?.full_name || "";
//       }
//       if (a === "completed" || a === "work_completed") hm[vId][d].e = t;
//       if (a === "on_hold") hm[vId][d].hold++;
//     });
//     const dRows = [];
//     (veh || []).forEach((v) => {
//       const ws = v.work_stages?.[0];
//       if (!ws) return;
//       DEPT_KEYS.forEach((d) => {
//         if (!ws[`${d}_required`]) return;
//         const lg = hm[v.id]?.[d];
//         const dur = lg?.s && lg?.e ? Math.round((lg.e - lg.s) / 60000) : null;
//         dRows.push({
//           "Vehicle No": v.vehicle_number,
//           Customer: v.customer_name || "",
//           Model: v.model || "",
//           Department: STAGE_META[d]?.label || d,
//           Status: ws[`${d}_status`] || "",
//           Worker: lg?.worker || "",
//           "Start Time": lg?.s
//             ? lg.s.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
//             : "",
//           "End Time": lg?.e
//             ? lg.e.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
//             : "",
//           "Duration (mins)": dur,
//           "On Hold": lg?.hold || 0,
//         });
//       });
//     });
//     sheet(dRows, "Dept Work Log");
//     sheet(
//       (pays || []).map((p) => ({
//         "Vehicle No": p.vehicle?.vehicle_number || "",
//         Customer: p.vehicle?.customer_name || "",
//         Amount: p.amount || 0,
//         Method: p.payment_method || "",
//         "Collected By": p.collector?.full_name || "",
//         "Transaction ID": p.transaction_id || "",
//         Time: new Date(toZ(p.created_at)).toLocaleString("en-IN", {
//           timeZone: "Asia/Kolkata",
//         }),
//       })),
//       "Payments",
//     );
//     XLSX.writeFile(wb, `Operations_${fromDate}_to_${toDate}.xlsx`);
//   } else if (reportType === "washing") {
//     const { data: wd } = await supabase
//       .from("washing_details")
//       .select(
//         "*,vehicle:vehicles!washing_details_vehicle_id_fkey(vehicle_number,customer_name,model,work_stages(*))",
//       )
//       .gte("created_at", f0)
//       .lte("created_at", t0);
//     const vids2 = (wd || []).map((w) => w.vehicle_id);
//     const { data: wh } = vids2.length
//       ? await supabase
//           .from("vehicle_history")
//           .select(
//             "vehicle_id,action,created_at,user:users!vehicle_history_user_id_fkey(full_name)",
//           )
//           .eq("stage", "washing")
//           .in("vehicle_id", vids2)
//           .order("created_at", { ascending: true })
//       : { data: [] };
//     const whm = {};
//     (wh || []).forEach((h) => {
//       if (!whm[h.vehicle_id]) whm[h.vehicle_id] = {};
//       const t = new Date(toZ(h.created_at));
//       const a = h.action;
//       if ((a === "started" || a === "work_started") && !whm[h.vehicle_id].s) {
//         whm[h.vehicle_id].s = t;
//         whm[h.vehicle_id].worker = h.user?.full_name || "";
//       }
//       if (a === "completed" || a === "work_completed") whm[h.vehicle_id].e = t;
//     });
//     sheet(
//       (wd || []).map((w) => {
//         const v = w.vehicle;
//         const ws = v?.work_stages?.[0];
//         const lg = whm[w.vehicle_id];
//         const dur = lg?.s && lg?.e ? Math.round((lg.e - lg.s) / 60000) : null;
//         return {
//           "Vehicle No": v?.vehicle_number || "",
//           Customer: v?.customer_name || "",
//           Model: v?.model || "",
//           "Slot Date": w.slot_date || "",
//           "Slot Time": w.slot || "",
//           "Wash Types": (w.washing_types || []).join(", "),
//           Status: ws?.washing_status || "",
//           Worker: lg?.worker || "",
//           Start: lg?.s
//             ? lg.s.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
//             : "",
//           End: lg?.e
//             ? lg.e.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
//             : "",
//           "Duration (mins)": dur,
//         };
//       }) || [{ note: "No data" }],
//       "Washing",
//     );
//     XLSX.writeFile(wb, `Washing_${fromDate}_to_${toDate}.xlsx`);
//   } else if (reportType === "special_work") {
//     const { data: tm } = await supabase
//       .from("three_m_details")
//       .select(
//         "*,vehicle:vehicles!three_m_details_vehicle_id_fkey(vehicle_number,customer_name,model)",
//       )
//       .gte("created_at", f0)
//       .lte("created_at", t0);
//     sheet(
//       (tm || []).map((t) => ({
//         "Vehicle No": t.vehicle?.vehicle_number || "",
//         Customer: t.vehicle?.customer_name || "",
//         Model: t.vehicle?.model || "",
//         Assigned: (t.work_types || []).join(", "),
//         Completed: (t.completed_types || []).join(", "),
//         "Completion %":
//           t.work_types?.length > 0
//             ? Math.round(
//                 ((t.completed_types?.length || 0) / t.work_types.length) * 100,
//               ) + "%"
//             : "0%",
//       })),
//       "3M Work",
//     );
//     const { data: al } = await supabase
//       .from("alignment_details")
//       .select(
//         "*,vehicle:vehicles!alignment_details_vehicle_id_fkey(vehicle_number,customer_name,model),worker:users!alignment_details_created_by_fkey(full_name)",
//       )
//       .gte("created_at", f0)
//       .lte("created_at", t0);
//     sheet(
//       (al || []).map((a) => ({
//         "Vehicle No": a.vehicle?.vehicle_number || "",
//         Customer: a.vehicle?.customer_name || "",
//         Model: a.vehicle?.model || "",
//         Worker: a.worker?.full_name || "",
//         "Work Types": Array.isArray(a.work_types)
//           ? a.work_types.map((w) => w.type?.replace(/_/g, " ")).join(", ")
//           : "",
//       })),
//       "Alignment",
//     );
//     XLSX.writeFile(wb, `SpecialWork_${fromDate}_to_${toDate}.xlsx`);
//   } else if (reportType === "productivity") {
//     const { data: veh } = await supabase
//       .from("vehicles")
//       .select(
//         "id,vehicle_number,bill_amount,credit_amount,advisor_id,work_stages(*)",
//       )
//       .eq("current_stage", "completed")
//       .gte("updated_at", f0)
//       .lte("updated_at", t0);
//     const { data: us } = await supabase
//       .from("users")
//       .select("id,full_name,role")
//       .eq("is_active", true);
//     const { data: hist } = await supabase
//       .from("vehicle_history")
//       .select("vehicle_id,stage,action,created_at")
//       .gte("created_at", f0)
//       .lte("created_at", t0)
//       .in("action", [
//         "started",
//         "work_started",
//         "completed",
//         "work_completed",
//         "on_hold",
//       ])
//       .order("created_at", { ascending: true });
//     const hm = {};
//     (hist || []).forEach((h) => {
//       const d = h.stage;
//       if (!DEPT_KEYS.includes(d)) return;
//       const vId = h.vehicle_id;
//       if (!hm[vId]) hm[vId] = {};
//       if (!hm[vId][d]) hm[vId][d] = { s: null, e: null, hold: 0 };
//       const t = new Date(toZ(h.created_at));
//       const a = h.action;
//       if ((a === "started" || a === "work_started") && !hm[vId][d].s)
//         hm[vId][d].s = t;
//       if (a === "completed" || a === "work_completed") hm[vId][d].e = t;
//       if (a === "on_hold") hm[vId][d].hold++;
//     });
//     sheet(
//       (us || [])
//         .filter((u) => u.role === "advisor")
//         .map((a) => {
//           const avs = (veh || []).filter((v) => v.advisor_id === a.id);
//           const rev = avs.reduce(
//             (s, v) => s + (parseFloat(v.bill_amount) || 0),
//             0,
//           );
//           const cred = avs.reduce(
//             (s, v) => s + (parseFloat(v.credit_amount) || 0),
//             0,
//           );
//           return {
//             Advisor: a.full_name,
//             Completed: avs.length,
//             Revenue: rev,
//             "Credit Given": cred,
//             "Avg Bill": avs.length ? Math.round(rev / avs.length) : 0,
//             "Credit Rate %":
//               rev > 0 ? Math.round((cred / (rev + cred)) * 100) : 0,
//           };
//         }),
//       "Advisor Productivity",
//     );
//     sheet(
//       DEPT_KEYS.map((d) => {
//         const done = (veh || []).filter(
//           (v) =>
//             v.work_stages?.[0]?.[`${d}_required`] &&
//             v.work_stages[0][`${d}_status`] === "completed",
//         );
//         const tats = done
//           .map((v) => {
//             const lg = hm[v.id]?.[d];
//             if (!lg?.s || !lg?.e) return null;
//             return (lg.e - lg.s) / 60000;
//           })
//           .filter((t) => t && t > 0 && t < 1440);
//         const avg = tats.length
//           ? tats.reduce((a, b) => a + b, 0) / tats.length
//           : null;
//         const hold = done.reduce((s, v) => s + (hm[v.id]?.[d]?.hold || 0), 0);
//         return {
//           Department: STAGE_META[d]?.label,
//           Completed: done.length,
//           "Avg TAT (mins)": avg ? Math.round(avg) : "",
//           "Avg TAT (hrs)": avg ? (avg / 60).toFixed(1) : "",
//           "On-Hold Events": hold,
//         };
//       }),
//       "Dept Productivity",
//     );
//     XLSX.writeFile(wb, `StaffProductivity_${fromDate}_to_${toDate}.xlsx`);
//   } else if (reportType === "credit") {
//     const { data: cv } = await supabase
//       .from("vehicles")
//       .select(
//         "vehicle_number,customer_name,customer_phone,bill_amount,total_paid,credit_amount,credit_guaranteed_by,entry_time,current_stage,payment_status",
//       )
//       .gt("credit_amount", 0)
//       .order("entry_time", { ascending: false });
//     const today = new Date();
//     sheet(
//       (cv || []).map((v) => {
//         const e = v.entry_time ? new Date(toZ(v.entry_time)) : null;
//         return {
//           "Vehicle No": v.vehicle_number,
//           Customer: v.customer_name || "",
//           Phone: v.customer_phone || "",
//           "Visit Date": e
//             ? e.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })
//             : "",
//           Bill: v.bill_amount || 0,
//           Paid: v.total_paid || 0,
//           "Credit Outstanding": v.credit_amount || 0,
//           "Guaranteed By": v.credit_guaranteed_by || "",
//           Stage: v.current_stage || "",
//           "Payment Status": v.payment_status || "",
//           "Days Outstanding": e ? Math.floor((today - e) / 86400000) : "",
//         };
//       }),
//       "Credit Outstanding",
//     );
//     XLSX.writeFile(
//       wb,
//       `CreditOutstanding_${new Date().toISOString().split("T")[0]}.xlsx`,
//     );
//   } else if (reportType === "force_pdi") {
//     const { data: hist } = await supabase
//       .from("vehicle_history")
//       .select(
//         "*,user:users!vehicle_history_user_id_fkey(full_name),vehicle:vehicles!vehicle_history_vehicle_id_fkey(vehicle_number,customer_name,model)",
//       )
//       .eq("action", "force_pdi")
//       .gte("created_at", f0)
//       .lte("created_at", t0)
//       .order("created_at", { ascending: false });

//     const { data: deptHist } = await supabase
//       .from("vehicle_history")
//       .select(
//         "*,user:users!vehicle_history_user_id_fkey(full_name),vehicle:vehicles!vehicle_history_vehicle_id_fkey(vehicle_number)",
//       )
//       .in("action", ["force_completed", "work_cancelled"])
//       .gte("created_at", f0)
//       .lte("created_at", t0)
//       .order("created_at", { ascending: true });

//     // Fetch vehicles and history for accountability sheets
//     const { data: veh } = await supabase
//       .from("vehicles")
//       .select("id,vehicle_number,customer_name,model,entry_time,work_stages(*)")
//       .gte("entry_time", f0)
//       .lte("entry_time", t0);

//     const { data: acctHist } = await supabase
//       .from("vehicle_history")
//       .select(
//         "vehicle_id,stage,action,created_at,user:users!vehicle_history_user_id_fkey(full_name)",
//       )
//       .gte("created_at", f0)
//       .lte("created_at", t0)
//       .in("action", [
//         "started",
//         "work_started",
//         "completed",
//         "work_completed",
//         "on_hold",
//         "force_completed",
//         "work_cancelled",
//       ])
//       .order("created_at", { ascending: true });

//     const { data: teamsData } = await supabase
//       .from("teams")
//       .select("id,name,role");

//     // Force PDI Summary sheet
//     sheet(
//       (hist || []).map((h) => ({
//         "Vehicle No": h.vehicle?.vehicle_number || "",
//         Customer: h.vehicle?.customer_name || "",
//         Model: h.vehicle?.model || "",
//         "Force PDI By": h.user?.full_name || "",
//         Summary: h.new_value || "",
//         "Departments Not Updated": h.notes || "",
//         Time: new Date(toZ(h.created_at)).toLocaleString("en-IN", {
//           timeZone: "Asia/Kolkata",
//         }),
//       })),
//       "Force PDI Summary",
//     );

//     // Dept Actions sheet
//     sheet(
//       (deptHist || []).map((h) => ({
//         "Vehicle No": h.vehicle?.vehicle_number || "",
//         Department: h.stage || "",
//         Action:
//           h.action === "force_completed" ? "Force Completed" : "Cancelled",
//         "By Advisor": h.user?.full_name || "",
//         Notes: h.notes || "",
//         Time: new Date(toZ(h.created_at)).toLocaleString("en-IN", {
//           timeZone: "Asia/Kolkata",
//         }),
//       })),
//       "Dept Actions",
//     );

//     // Force PDI by Team/Dept summary sheet
//     const summaryRows = [];

//     // Team-based depts — group by team name
//     const TEAM_DEPTS_FP = ["mechanic", "denter", "electrician", "painter"];
//     TEAM_DEPTS_FP.forEach((dept) => {
//       const deptTeams = (teamsData || []).filter((t) => t.role === dept);
//       const affectedForDept = (deptHist || []).filter((h) => h.stage === dept);

//       deptTeams.forEach((team) => {
//         // Get vehicles assigned to this team that had force pdi action
//         const teamVehicleNums = (veh || [])
//           .filter((v) => v.work_stages?.[0]?.[`${dept}_team_id`] === team.id)
//           .map((v) => v.vehicle_number);

//         const forcedVehicles = affectedForDept
//           .filter((h) => teamVehicleNums.includes(h.vehicle?.vehicle_number))
//           .map((h) => h.vehicle?.vehicle_number)
//           .filter(Boolean);

//         const unique = [...new Set(forcedVehicles)];
//         if (!unique.length) return;

//         summaryRows.push({
//           "Team / Department": team.name,
//           Role: STAGE_META[dept]?.label || dept,
//           "Vehicles with Force PDI": unique.join(", "),
//           Count: unique.length,
//         });
//       });
//     });

//     // Solo depts — just dept name
//     const SOLO_DEPTS_FP = [
//       "washing",
//       "three_m",
//       "alignment_balancing",
//       "tyre_fitting",
//     ];
//     SOLO_DEPTS_FP.forEach((dept) => {
//       const affectedForDept = (deptHist || []).filter((h) => h.stage === dept);
//       const unique = [
//         ...new Set(
//           affectedForDept.map((h) => h.vehicle?.vehicle_number).filter(Boolean),
//         ),
//       ];
//       if (!unique.length) return;

//       summaryRows.push({
//         "Team / Department": STAGE_META[dept]?.label || dept,
//         Role: STAGE_META[dept]?.label || dept,
//         "Vehicles with Force PDI": unique.join(", "),
//         Count: unique.length,
//       });
//     });

//     if (summaryRows.length) {
//       XLSX.utils.book_append_sheet(
//         wb,
//         XLSX.utils.json_to_sheet(summaryRows),
//         "Dept Force PDI Summary",
//       );
//     }

//     // Build history map for accountability
//     const hm = {};
//     (acctHist || []).forEach((h) => {
//       const key = `${h.vehicle_id}__${h.stage}`;
//       if (!hm[key])
//         hm[key] = {
//           s: null,
//           e: null,
//           hold: 0,
//           worker: "",
//           forceCompleted: false,
//           cancelled: false,
//         };
//       const t = new Date(toZ(h.created_at));
//       const a = h.action;
//       if ((a === "started" || a === "work_started") && !hm[key].s) {
//         hm[key].s = t;
//         hm[key].worker = h.user?.full_name || "";
//       }
//       if (a === "completed" || a === "work_completed") hm[key].e = t;
//       if (a === "on_hold") hm[key].hold++;
//       if (a === "force_completed") hm[key].forceCompleted = true;
//       if (a === "work_cancelled") hm[key].cancelled = true;
//     });

//     // Team-based departments
//     const TEAM_DEPTS = ["mechanic", "denter", "electrician"];
//     TEAM_DEPTS.forEach((dept) => {
//       const deptTeams = (teamsData || []).filter((t) => t.role === dept);
//       const deptVehicles = (veh || []).filter(
//         (v) => v.work_stages?.[0]?.[`${dept}_required`],
//       );

//       deptTeams.forEach((team) => {
//         const rows = [];
//         const teamVehicles = deptVehicles.filter(
//           (v) => v.work_stages?.[0]?.[`${dept}_team_id`] === team.id,
//         );
//         teamVehicles.forEach((v) => {
//           const ws = v.work_stages?.[0];
//           const key = `${v.id}__${dept}`;
//           const lg = hm[key] || {};
//           const dur = lg.s && lg.e ? Math.round((lg.e - lg.s) / 60000) : null;
//           const status = ws?.[`${dept}_status`] || "not_started";
//           rows.push({
//             "Vehicle No": v.vehicle_number,
//             Customer: v.customer_name || "",
//             Model: v.model || "",
//             Team: team.name,
//             Worker: lg.worker || "",
//             Status: status,
//             "Start Time": lg.s
//               ? lg.s.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
//               : "Not started",
//             "End Time": lg.e
//               ? lg.e.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
//               : "—",
//             "TAT (mins)": dur || "",
//             "On Hold Count": lg.hold || 0,
//             "Force Completed": lg.forceCompleted ? "YES" : "No",
//             "Work Cancelled": lg.cancelled ? "YES" : "No",
//             Missed: status !== "completed" ? "YES" : "No",
//           });
//         });

//         // Unassigned vehicles for this dept
//         deptVehicles
//           .filter((v) => !v.work_stages?.[0]?.[`${dept}_team_id`])
//           .forEach((v) => {
//             const ws = v.work_stages?.[0];
//             const key = `${v.id}__${dept}`;
//             const lg = hm[key] || {};
//             rows.push({
//               "Vehicle No": v.vehicle_number,
//               Customer: v.customer_name || "",
//               Model: v.model || "",
//               Team: "UNASSIGNED",
//               Worker: lg.worker || "",
//               Status: ws?.[`${dept}_status`] || "not_started",
//               "Start Time": lg.s
//                 ? lg.s.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
//                 : "Not started",
//               "End Time": "—",
//               "TAT (mins)": "",
//               "On Hold Count": lg.hold || 0,
//               "Force Completed": lg.forceCompleted ? "YES" : "No",
//               "Work Cancelled": lg.cancelled ? "YES" : "No",
//               Missed: "YES",
//             });
//           });

//         if (rows.length) {
//           const sheetName = `${STAGE_META[dept]?.label} - ${team.name}`.slice(
//             0,
//             31,
//           );
//           XLSX.utils.book_append_sheet(
//             wb,
//             XLSX.utils.json_to_sheet(rows),
//             sheetName,
//           );
//         }
//       });
//     });

//     // Solo departments
//     const SOLO_DEPTS = [
//       "painter",
//       "washing",
//       "three_m",
//       "alignment_balancing",
//       "tyre_fitting",
//     ];
//     SOLO_DEPTS.forEach((dept) => {
//       const deptVehicles = (veh || []).filter(
//         (v) => v.work_stages?.[0]?.[`${dept}_required`],
//       );
//       if (!deptVehicles.length) return;

//       const rows = deptVehicles.map((v) => {
//         const ws = v.work_stages?.[0];
//         const key = `${v.id}__${dept}`;
//         const lg = hm[key] || {};
//         const dur = lg.s && lg.e ? Math.round((lg.e - lg.s) / 60000) : null;
//         const status = ws?.[`${dept}_status`] || "not_started";
//         return {
//           "Vehicle No": v.vehicle_number,
//           Customer: v.customer_name || "",
//           Model: v.model || "",
//           Worker: lg.worker || "",
//           Status: status,
//           "Start Time": lg.s
//             ? lg.s.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
//             : "Not started",
//           "End Time": lg.e
//             ? lg.e.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
//             : "—",
//           "TAT (mins)": dur || "",
//           "On Hold Count": lg.hold || 0,
//           "Force Completed": lg.forceCompleted ? "YES" : "No",
//           "Work Cancelled": lg.cancelled ? "YES" : "No",
//           Missed: status !== "completed" ? "YES" : "No",
//         };
//       });

//       const sheetName = STAGE_META[dept]?.label?.slice(0, 31) || dept;
//       XLSX.utils.book_append_sheet(
//         wb,
//         XLSX.utils.json_to_sheet(rows),
//         sheetName,
//       );
//     });

//     XLSX.writeFile(wb, `ForcePDI_${fromDate}_to_${toDate}.xlsx`);
//   }
// }

// // ─── OVERVIEW TAB ─────────────────────────────────────────────────────────────
// function OverviewTab({
//   T,
//   derived,
//   vehicles,
//   todayPayments,
//   creditVehicles,
//   onVehiclePress,
//   onQuickView,
// }) {
//   const {
//     activeVehicles,
//     todayEntries,
//     todayEntriesVehicles,
//     todayCompleted,
//     overdue,
//     vipUrgent,
//     stuckVehicles,
//     pendingPDI,
//     pendingBilling,
//     pendingPayment,
//     readyForExit,
//     todayCollection,
//     totalOutstandingCredit,
//     deptCounts,
//     deptVehicles,
//   } = derived;

//   // Collapsible alert sections — collapsed by default (suggestion 6)
//   const [expanded, setExpanded] = useState({});
//   const toggle = (key) => setExpanded((p) => ({ ...p, [key]: !p[key] }));

//   // Credit ageing helper (suggestion 7)
//   const ageColor = (days) =>
//     days > 60 ? T.red : days > 30 ? T.amber : T.green;
//   const ageBg = (days) =>
//     days > 60 ? T.redLight : days > 30 ? T.amberLight : T.greenLight;
//   const ageLabel = (days) =>
//     days > 60 ? "60+ days" : days > 30 ? "31–60 days" : "0–30 days";

//   const CollapsibleAlert = ({ id, title, list, color, borderColor }) => {
//     const open = expanded[id];
//     return (
//       <Bx
//         T={T}
//         style={{ marginBottom: 12, borderLeft: `4px solid ${borderColor}` }}
//       >
//         <div
//           onClick={() => toggle(id)}
//           style={{
//             display: "flex",
//             justifyContent: "space-between",
//             alignItems: "center",
//             cursor: "pointer",
//             marginBottom: open ? 10 : 0,
//           }}
//         >
//           <SecTitle
//             T={T}
//             style={{ marginBottom: 0, borderBottom: "none", paddingBottom: 0 }}
//           >
//             {title}
//           </SecTitle>
//           <span style={{ fontSize: 12, color: T.textMuted, paddingBottom: 8 }}>
//             {open ? "▲ Hide" : "▼ Show"}
//           </span>
//         </div>
//         {open &&
//           list.map((v) => (
//             <AlertRow
//               key={v.id}
//               T={T}
//               v={v}
//               color={color}
//               onPress={() => onVehiclePress(v)}
//             />
//           ))}
//       </Bx>
//     );
//   };

//   return (
//     <div>
//       {/* 6 KPIs — all clickable (fix 3) */}
//       <div
//         style={{
//           display: "grid",
//           gridTemplateColumns: "repeat(6,1fr)",
//           gap: 12,
//           marginBottom: 20,
//         }}
//       >
//         <KPI
//           T={T}
//           label="Active"
//           value={activeVehicles.length}
//           icon="🚗"
//           color={T.blue}
//           onClick={() =>
//             activeVehicles.length > 0 &&
//             onQuickView("🚗 Active Vehicles", activeVehicles)
//           }
//         />
//         <KPI
//           T={T}
//           label="Today's Entry"
//           value={todayEntries}
//           icon="📥"
//           color={T.purple}
//           onClick={() =>
//             todayEntriesVehicles.length > 0 &&
//             onQuickView("📥 Today's Entries", todayEntriesVehicles)
//           }
//         />
//         <KPI
//           T={T}
//           label="Completed Today"
//           value={todayCompleted.length}
//           icon="✅"
//           color={T.green}
//           onClick={() =>
//             todayCompleted.length > 0 &&
//             onQuickView("✅ Completed Today", todayCompleted)
//           }
//         />
//         <KPI
//           T={T}
//           label="Overdue"
//           value={overdue.length}
//           icon="⏰"
//           color={overdue.length > 0 ? T.red : T.green}
//           onClick={() =>
//             overdue.length > 0 && onQuickView("⏰ Overdue", overdue)
//           }
//         />
//         <KPI
//           T={T}
//           label="Today's Collection"
//           value={`₹${(todayCollection / 1000).toFixed(1)}k`}
//           icon="💰"
//           color={T.green}
//           onClick={() =>
//             onQuickView(
//               "💰 Today's Payments — " +
//                 todayPayments.filter((p) => p.payment_method !== "credit")
//                   .length +
//                 " transactions",
//               todayPayments.map((p) => ({ ...p, _isPayment: true })),
//             )
//           }
//         />
//         <KPI
//           T={T}
//           label="Credit Outstanding"
//           value={`₹${(totalOutstandingCredit / 1000).toFixed(1)}k`}
//           icon="📋"
//           color={totalOutstandingCredit > 0 ? T.amber : T.green}
//           onClick={() =>
//             derived.creditGroups.length > 0 &&
//             onQuickView(
//               "📋 Credit Outstanding — " +
//                 derived.creditGroups.length +
//                 " vehicles",
//               derived.creditGroups
//                 .map((g) => ({
//                   ...g.visits[0],
//                   priority: g.visits[0]?.priority ?? "normal",
//                   work_stages: [],
//                 }))
//                 .filter(Boolean),
//             )
//           }
//         />
//       </div>

//       <div
//         style={{
//           display: "grid",
//           gridTemplateColumns: "1fr 1fr",
//           gap: 16,
//           marginBottom: 16,
//         }}
//       >
//         {/* Pipeline */}
//         <Bx T={T}>
//           <SecTitle T={T}>Pipeline Status</SecTitle>
//           <div
//             style={{
//               display: "grid",
//               gridTemplateColumns: "repeat(5,1fr)",
//               gap: 10,
//             }}
//           >
//             {[
//               {
//                 label: "PDI",
//                 count: pendingPDI.length,
//                 color: T.green,
//                 list: pendingPDI,
//                 icon: "✅",
//               },
//               {
//                 label: "Billing",
//                 count: pendingBilling.length,
//                 color: T.blue,
//                 list: pendingBilling,
//                 icon: "🧾",
//               },
//               {
//                 label: "Payment",
//                 count: pendingPayment.length,
//                 color: T.cyan,
//                 list: pendingPayment,
//                 icon: "💳",
//               },
//               {
//                 label: "Exit",
//                 count: readyForExit.length,
//                 color: T.green,
//                 list: readyForExit,
//                 icon: "🚪",
//               },
//               {
//                 label: "Stuck",
//                 count: stuckVehicles.length,
//                 color: stuckVehicles.length > 0 ? T.red : T.green,
//                 list: stuckVehicles,
//                 icon: "🔴",
//               },
//             ].map((item) => (
//               <div
//                 key={item.label}
//                 style={{
//                   textAlign: "center",
//                   background: item.color + "18",
//                   border: `1px solid ${item.color}44`,
//                   borderRadius: 8,
//                   padding: "12px 4px",
//                   cursor: item.list.length > 0 ? "pointer" : "default",
//                   transition: "transform 0.1s",
//                 }}
//                 onClick={() =>
//                   item.list.length > 0 &&
//                   onQuickView(`${item.icon} ${item.label}`, item.list)
//                 }
//                 onMouseEnter={(e) =>
//                   item.list.length > 0 &&
//                   (e.currentTarget.style.transform = "translateY(-2px)")
//                 }
//                 onMouseLeave={(e) =>
//                   (e.currentTarget.style.transform = "translateY(0)")
//                 }
//               >
//                 <div
//                   style={{
//                     fontSize: 24,
//                     fontWeight: 800,
//                     color: item.color,
//                     fontFamily: "'DM Mono',monospace",
//                   }}
//                 >
//                   {item.count}
//                 </div>
//                 <div
//                   style={{
//                     fontSize: 11,
//                     color: T.textSecondary,
//                     fontWeight: 700,
//                     marginTop: 3,
//                   }}
//                 >
//                   {item.label}
//                 </div>
//               </div>
//             ))}
//           </div>
//         </Bx>

//         {/* Dept Load — each card clickable (fix 3) */}
//         <Bx T={T}>
//           <SecTitle T={T}>Department Load</SecTitle>
//           <div
//             style={{
//               display: "grid",
//               gridTemplateColumns: "repeat(4,1fr)",
//               gap: 8,
//             }}
//           >
//             {DEPT_KEYS.map((dept) => {
//               const dm = STAGE_META[dept];
//               const n = deptCounts[dept];
//               const list = deptVehicles[dept] || [];
//               return (
//                 <div
//                   key={dept}
//                   style={{
//                     textAlign: "center",
//                     background: T.surfaceElevated,
//                     borderRadius: 8,
//                     padding: "9px 4px",
//                     border:
//                       n > 0
//                         ? `1px solid ${dm.color}44`
//                         : `1px solid ${T.border}`,
//                     cursor: n > 0 ? "pointer" : "default",
//                     transition: "transform 0.1s",
//                   }}
//                   onClick={() =>
//                     n > 0 && onQuickView(`${dm.icon} ${dm.label}`, list)
//                   }
//                   onMouseEnter={(e) =>
//                     n > 0 &&
//                     (e.currentTarget.style.transform = "translateY(-2px)")
//                   }
//                   onMouseLeave={(e) =>
//                     (e.currentTarget.style.transform = "translateY(0)")
//                   }
//                 >
//                   <div style={{ fontSize: 15 }}>{dm.icon}</div>
//                   <div
//                     style={{
//                       fontSize: 22,
//                       fontWeight: 800,
//                       color: n > 0 ? dm.color : T.textMuted,
//                       fontFamily: "'DM Mono',monospace",
//                     }}
//                   >
//                     {n}
//                   </div>
//                   <div
//                     style={{
//                       fontSize: 10,
//                       color: T.textMuted,
//                       fontWeight: 700,
//                     }}
//                   >
//                     {dm.label.split(" ")[0]}
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         </Bx>
//       </div>

//       {/* Alert sections — collapsible by default (fix 6) */}
//       {overdue.length > 0 && (
//         <CollapsibleAlert
//           id="overdue"
//           title={`⏰ Overdue (${overdue.length})`}
//           list={overdue}
//           color={T.red}
//           borderColor={T.red}
//         />
//       )}
//       {vipUrgent.length > 0 && (
//         <CollapsibleAlert
//           id="vip"
//           title={`🔥 VIP / Urgent (${vipUrgent.length})`}
//           list={vipUrgent}
//           color={T.amber}
//           borderColor={T.amber}
//         />
//       )}
//       {stuckVehicles.length > 0 && (
//         <CollapsibleAlert
//           id="stuck"
//           title={`🔴 Stuck — No Work Started (${stuckVehicles.length})`}
//           list={stuckVehicles}
//           color={T.red}
//           borderColor={T.red}
//         />
//       )}
//       {todayCompleted.length > 0 && (
//         <CollapsibleAlert
//           id="completed"
//           title={`✅ Completed Today (${todayCompleted.length})`}
//           list={todayCompleted}
//           color={T.green}
//           borderColor={T.green}
//         />
//       )}

//       {/* Credit Ageing (suggestion 7) */}
//       {derived.creditGroups.length > 0 && (
//         <Bx T={T} style={{ borderLeft: `4px solid ${T.amber}` }}>
//           <div
//             onClick={() => toggle("creditAge")}
//             style={{
//               display: "flex",
//               justifyContent: "space-between",
//               alignItems: "center",
//               cursor: "pointer",
//               marginBottom: expanded.creditAge ? 10 : 0,
//             }}
//           >
//             <SecTitle
//               T={T}
//               style={{
//                 marginBottom: 0,
//                 borderBottom: "none",
//                 paddingBottom: 0,
//               }}
//             >
//               📋 Credit Outstanding — Ageing ({derived.creditGroups.length}{" "}
//               vehicles)
//             </SecTitle>
//             <span
//               style={{ fontSize: 12, color: T.textMuted, paddingBottom: 8 }}
//             >
//               {expanded.creditAge ? "▲ Hide" : "▼ Show"}
//             </span>
//           </div>
//           {expanded.creditAge && (
//             <div>
//               {/* Ageing buckets summary */}
//               {(() => {
//                 const today = new Date();
//                 const b0 = derived.creditGroups.filter((g) => {
//                   const d = Math.floor(
//                     (today - new Date(toZ(g.visits[0]?.entry_time))) / 86400000,
//                   );
//                   return d <= 30;
//                 });
//                 const b30 = derived.creditGroups.filter((g) => {
//                   const d = Math.floor(
//                     (today - new Date(toZ(g.visits[0]?.entry_time))) / 86400000,
//                   );
//                   return d > 30 && d <= 60;
//                 });
//                 const b60 = derived.creditGroups.filter((g) => {
//                   const d = Math.floor(
//                     (today - new Date(toZ(g.visits[0]?.entry_time))) / 86400000,
//                   );
//                   return d > 60;
//                 });
//                 return (
//                   <div
//                     style={{
//                       display: "grid",
//                       gridTemplateColumns: "repeat(3,1fr)",
//                       gap: 10,
//                       marginBottom: 14,
//                     }}
//                   >
//                     {[
//                       [b0, "0–30 days", T.green, T.greenLight],
//                       [b30, "31–60 days", T.amber, T.amberLight],
//                       [b60, "60+ days", T.red, T.redLight],
//                     ].map(([bkt, label, c, bg]) => (
//                       <div
//                         key={label}
//                         style={{
//                           textAlign: "center",
//                           background: bg,
//                           borderRadius: 8,
//                           padding: "10px 8px",
//                           border: `1px solid ${c}44`,
//                         }}
//                       >
//                         <div
//                           style={{
//                             fontSize: 16,
//                             fontWeight: 800,
//                             color: c,
//                             fontFamily: "'DM Mono',monospace",
//                           }}
//                         >
//                           {bkt.length}
//                         </div>
//                         <div
//                           style={{
//                             fontSize: 10,
//                             color: c,
//                             fontWeight: 700,
//                             marginTop: 2,
//                           }}
//                         >
//                           {label}
//                         </div>
//                         <div
//                           style={{
//                             fontSize: 12,
//                             fontFamily: "'DM Mono',monospace",
//                             color: c,
//                             marginTop: 2,
//                           }}
//                         >
//                           {fmt(bkt.reduce((s, g) => s + g.total_credit, 0))}
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 );
//               })()}
//               {/* Per-vehicle rows */}
//               {derived.creditGroups.map((group) => {
//                 const today = new Date();
//                 const oldestVisit = group.visits[group.visits.length - 1];
//                 const days = oldestVisit?.entry_time
//                   ? Math.floor(
//                       (today - new Date(toZ(oldestVisit.entry_time))) /
//                         86400000,
//                     )
//                   : 0;
//                 return (
//                   <div
//                     key={group.vehicle_number}
//                     style={{
//                       display: "flex",
//                       justifyContent: "space-between",
//                       alignItems: "center",
//                       padding: "9px 12px",
//                       background: T.surfaceElevated,
//                       borderRadius: 6,
//                       marginBottom: 5,
//                     }}
//                   >
//                     <div
//                       style={{ display: "flex", alignItems: "center", gap: 10 }}
//                     >
//                       <span
//                         style={{
//                           fontWeight: 800,
//                           fontSize: 14,
//                           fontFamily: "'DM Mono',monospace",
//                           color: T.text,
//                         }}
//                       >
//                         {group.vehicle_number}
//                       </span>
//                       <span style={{ fontSize: 13, color: T.textSecondary }}>
//                         {group.customer_name || "—"}
//                       </span>
//                       <span style={{ fontSize: 12, color: T.textSecondary }}>
//                         {group.customer_phone || "—"}
//                       </span>
//                       <Chip
//                         color={ageColor(days)}
//                         bg={ageBg(days)}
//                         style={{ fontSize: 10 }}
//                       >
//                         {ageLabel(days)} ({days}d)
//                       </Chip>
//                     </div>
//                     <div
//                       style={{ display: "flex", alignItems: "center", gap: 8 }}
//                     >
//                       <span style={{ fontSize: 13, color: T.textMuted }}>
//                         {group.visits.length} visit
//                         {group.visits.length !== 1 ? "s" : ""}
//                       </span>
//                       <span
//                         style={{
//                           fontWeight: 800,
//                           fontSize: 15,
//                           color: ageColor(days),
//                           fontFamily: "'DM Mono',monospace",
//                         }}
//                       >
//                         {fmt(group.total_credit)}
//                       </span>
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           )}
//         </Bx>
//       )}
//     </div>
//   );
// }

// function AlertRow({ T, v, color, onPress }) {
//   const meta = STAGE_META[v.current_stage];
//   return (
//     <div
//       onClick={onPress}
//       style={{
//         display: "flex",
//         justifyContent: "space-between",
//         alignItems: "center",
//         padding: "9px 12px",
//         background: T.surfaceElevated,
//         borderRadius: 6,
//         cursor: "pointer",
//         marginBottom: 5,
//         transition: "background 0.1s",
//       }}
//       onMouseEnter={(e) => (e.currentTarget.style.background = T.border)}
//       onMouseLeave={(e) =>
//         (e.currentTarget.style.background = T.surfaceElevated)
//       }
//     >
//       <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//         <span
//           style={{
//             fontWeight: 800,
//             color: T.text,
//             fontSize: 14,
//             fontFamily: "'DM Mono',monospace",
//           }}
//         >
//           {v.vehicle_number}
//         </span>
//         {v.model && (
//           <Chip color={T.blue} bg={T.blueLight}>
//             {v.model}
//           </Chip>
//         )}
//         {v.priority !== "normal" && (
//           <Chip
//             color={v.priority === "vip" ? T.purple : T.red}
//             bg={v.priority === "vip" ? T.purpleLight : T.redLight}
//           >
//             {v.priority.toUpperCase()}
//           </Chip>
//         )}
//         <span style={{ fontSize: 13, color: T.textSecondary }}>
//           {v.customer_name || "—"}
//         </span>
//       </div>
//       <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
//         <span style={{ fontSize: 12, color: T.textSecondary }}>
//           {meta?.icon} {meta?.label}
//         </span>
//         {v.expected_completion_time && (
//           <span style={{ fontSize: 12, color, fontWeight: 700 }}>
//             ⏰ {formatIST(v.expected_completion_time)}
//           </span>
//         )}
//       </div>
//     </div>
//   );
// }

// // ─── FLOOR TAB ────────────────────────────────────────────────────────────────
// function FloorTab({ T, vehicles, derived, onVehiclePress }) {
//   const [view, setView] = useState("stage");
//   const [expanded, setExpanded] = useState({});
//   const PREVIEW = 5;

//   const active = vehicles.filter((v) => v.current_stage !== "completed");
//   const STAGE_ORDER = [
//     "front_checkup",
//     "advisor_review",
//     "pending",
//     "mechanic",
//     "painter",
//     "denter",
//     "electrician",
//     "three_m",
//     "alignment_balancing",
//     "tyre_fitting",
//     "washing",
//     "pdi",
//     "billing",
//     "payment",
//     "ready_for_exit",
//   ];

//   const stageGroups = {};
//   STAGE_ORDER.forEach((s) => {
//     let list;
//     if (DEPT_KEYS.includes(s)) {
//       // Fix 8: only show vehicles where this dept has work that isn't completed yet
//       list = active.filter((v) => {
//         const ws = v.work_stages?.[0];
//         if (!ws?.[`${s}_required`]) return false;
//         const st = ws[`${s}_status`];
//         return st === "in_progress" || st === "not_started" || st === "on_hold";
//       });
//     } else {
//       list = active.filter((v) => v.current_stage === s);
//     }
//     if (list.length > 0) stageGroups[s] = list;
//   });

//   const VRow = ({ v }) => (
//     <div
//       onClick={() => onVehiclePress(v)}
//       style={{
//         padding: "8px 10px",
//         background: T.surfaceElevated,
//         borderRadius: 6,
//         marginBottom: 5,
//         cursor: "pointer",
//         transition: "background 0.1s",
//       }}
//       onMouseEnter={(e) => (e.currentTarget.style.background = T.border)}
//       onMouseLeave={(e) =>
//         (e.currentTarget.style.background = T.surfaceElevated)
//       }
//     >
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//         }}
//       >
//         <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
//           <span
//             style={{
//               fontWeight: 800,
//               fontSize: 13,
//               fontFamily: "'DM Mono',monospace",
//               color: T.text,
//             }}
//           >
//             {v.vehicle_number}
//           </span>
//           {v.model && (
//             <Chip color={T.blue} bg={T.blueLight} style={{ fontSize: 10 }}>
//               {v.model}
//             </Chip>
//           )}
//           {v.priority !== "normal" && (
//             <Chip
//               color={v.priority === "vip" ? T.purple : T.red}
//               bg={v.priority === "vip" ? T.purpleLight : T.redLight}
//               style={{ fontSize: 10 }}
//             >
//               {v.priority.toUpperCase()}
//             </Chip>
//           )}
//         </div>
//         <span style={{ fontSize: 10, color: T.textMuted, flexShrink: 0 }}>
//           {formatIST(v.entry_time)}
//         </span>
//       </div>
//       {v.customer_name && (
//         <div style={{ fontSize: 11, color: T.textSecondary, marginTop: 2 }}>
//           {v.customer_name}
//         </div>
//       )}
//       {v.work_stages?.[0] && <WorkBadges T={T} ws={v.work_stages[0]} />}
//     </div>
//   );

//   const ExpandBtn = ({ id, total }) => (
//     <button
//       onClick={() => setExpanded((p) => ({ ...p, [id]: !p[id] }))}
//       style={{
//         width: "100%",
//         marginTop: 4,
//         padding: "7px",
//         background: "none",
//         border: `1px dashed ${T.border}`,
//         borderRadius: 6,
//         cursor: "pointer",
//         fontSize: 12,
//         fontWeight: 700,
//         color: T.textSecondary,
//         fontFamily: "inherit",
//       }}
//     >
//       {expanded[id] ? "▲ Show less" : `▼ View all ${total} vehicles`}
//     </button>
//   );

//   return (
//     <div>
//       <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
//         {[
//           ["stage", "By Stage"],
//           ["team", "By Team"],
//         ].map(([k, l]) => (
//           <Btn
//             key={k}
//             T={T}
//             v={view === k ? "primary" : "secondary"}
//             onClick={() => setView(k)}
//           >
//             {l}
//           </Btn>
//         ))}
//       </div>

//       {view === "stage" && (
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(3,1fr)",
//             gap: 14,
//           }}
//         >
//           {Object.entries(stageGroups).map(([stage, svs]) => {
//             const dm = STAGE_META[stage];
//             const exp = expanded[stage];
//             const shown = exp ? svs : svs.slice(0, PREVIEW);
//             return (
//               <Bx
//                 T={T}
//                 key={stage}
//                 style={{ borderTop: `3px solid ${dm.color}` }}
//               >
//                 <div
//                   style={{
//                     display: "flex",
//                     alignItems: "center",
//                     gap: 8,
//                     marginBottom: 10,
//                   }}
//                 >
//                   <span style={{ fontSize: 15 }}>{dm.icon}</span>
//                   <span
//                     style={{
//                       fontWeight: 700,
//                       color: T.text,
//                       flex: 1,
//                       fontSize: 13,
//                     }}
//                   >
//                     {dm.label}
//                   </span>
//                   <Chip color={dm.color} bg={dm.color + "22"}>
//                     {svs.length}
//                   </Chip>
//                   {DEPT_KEYS.includes(stage) && (
//                     <Chip
//                       color={T.purple}
//                       bg={T.purpleLight}
//                       style={{ fontSize: 9 }}
//                     >
//                       PARALLEL
//                     </Chip>
//                   )}
//                 </div>
//                 {shown.map((v) => (
//                   <VRow key={v.id} v={v} />
//                 ))}
//                 {svs.length > PREVIEW && (
//                   <ExpandBtn id={stage} total={svs.length} />
//                 )}
//               </Bx>
//             );
//           })}
//         </div>
//       )}

//       {view === "team" && (
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(3,1fr)",
//             gap: 14,
//           }}
//         >
//           {derived.teamLoads
//             .filter((t) => t.activeVehicles.length > 0)
//             .map((team) => {
//               const dm = STAGE_META[team.role] || {
//                 color: T.blue,
//                 icon: "👥",
//                 label: team.role,
//               };
//               const exp = expanded[team.id];
//               const shown = exp
//                 ? team.activeVehicles
//                 : team.activeVehicles.slice(0, PREVIEW);
//               return (
//                 <Bx
//                   T={T}
//                   key={team.id}
//                   style={{ borderTop: `3px solid ${dm.color}` }}
//                 >
//                   <div
//                     style={{
//                       display: "flex",
//                       alignItems: "center",
//                       gap: 8,
//                       marginBottom: 10,
//                     }}
//                   >
//                     <span style={{ fontSize: 14 }}>{dm.icon}</span>
//                     <div style={{ flex: 1 }}>
//                       <div
//                         style={{ fontWeight: 700, color: T.text, fontSize: 13 }}
//                       >
//                         {team.name}
//                       </div>
//                       <div
//                         style={{
//                           fontSize: 10,
//                           color: dm.color,
//                           fontWeight: 700,
//                         }}
//                       >
//                         {dm.label}
//                       </div>
//                     </div>
//                     <Chip color={dm.color} bg={dm.color + "22"}>
//                       {team.activeVehicles.length}
//                     </Chip>
//                   </div>
//                   {shown.map((v) => (
//                     <VRow key={v.id} v={v} />
//                   ))}
//                   {team.activeVehicles.length > PREVIEW && (
//                     <ExpandBtn
//                       id={team.id}
//                       total={team.activeVehicles.length}
//                     />
//                   )}
//                 </Bx>
//               );
//             })}
//         </div>
//       )}
//     </div>
//   );
// }

// // ─── FINANCE TAB ──────────────────────────────────────────────────────────────
// function FinanceTab({
//   T,
//   derived,
//   todayPayments,
//   allPayments,
//   creditVehicles,
// }) {
//   const [sub, setSub] = useState("today");
//   const [search, setSearch] = useState("");
//   const [df, setDf] = useState("");
//   const [dt, setDt] = useState("");
//   const [mf, setMf] = useState("all");
//   const { todayCollection, byMethod, totalOutstandingCredit, creditGroups } =
//     derived;

//   const filtAll =
//     mf === "outstanding"
//       ? []
//       : allPayments.filter((p) => {
//           const m =
//             !search.trim() ||
//             (p.vehicle?.vehicle_number || "")
//               .toLowerCase()
//               .includes(search.toLowerCase()) ||
//             (p.vehicle?.customer_name || "")
//               .toLowerCase()
//               .includes(search.toLowerCase());
//           const fd =
//             !df || new Date(p.created_at) >= new Date(df + "T00:00:00");
//           const td =
//             !dt || new Date(p.created_at) <= new Date(dt + "T23:59:59");
//           const fm = mf === "all" || p.payment_method === mf;
//           return m && fd && td && fm;
//         });
//   const filtOut = (creditVehicles || []).filter(
//     (v) =>
//       !search.trim() ||
//       (v.vehicle_number || "").toLowerCase().includes(search.toLowerCase()) ||
//       (v.customer_name || "").toLowerCase().includes(search.toLowerCase()),
//   );

//   return (
//     <div>
//       <div
//         style={{
//           display: "grid",
//           gridTemplateColumns: "1fr 1fr",
//           gap: 14,
//           marginBottom: 18,
//         }}
//       >
//         <Bx T={T}>
//           <div
//             style={{
//               fontSize: 10,
//               fontWeight: 800,
//               color: T.textMuted,
//               textTransform: "uppercase",
//               letterSpacing: "0.5px",
//               marginBottom: 8,
//             }}
//           >
//             Today's Collection
//           </div>
//           <div
//             style={{
//               fontSize: 30,
//               fontWeight: 800,
//               color: T.green,
//               fontFamily: "'DM Mono',monospace",
//             }}
//           >
//             {fmt(todayCollection)}
//           </div>
//           <div style={{ fontSize: 12, color: T.textMuted, marginTop: 5 }}>
//             {todayPayments.filter((p) => p.payment_method !== "credit").length}{" "}
//             transactions
//           </div>
//         </Bx>
//         <Bx T={T}>
//           <div
//             style={{
//               fontSize: 10,
//               fontWeight: 800,
//               color: T.textMuted,
//               textTransform: "uppercase",
//               letterSpacing: "0.5px",
//               marginBottom: 8,
//             }}
//           >
//             Credit Outstanding
//           </div>
//           <div
//             style={{
//               fontSize: 30,
//               fontWeight: 800,
//               color: T.amber,
//               fontFamily: "'DM Mono',monospace",
//             }}
//           >
//             {fmt(totalOutstandingCredit)}
//           </div>
//           <div style={{ fontSize: 12, color: T.textMuted, marginTop: 5 }}>
//             {creditGroups.length} vehicles
//           </div>
//         </Bx>
//       </div>

//       <Bx T={T} style={{ marginBottom: 18 }}>
//         <SecTitle T={T}>Today by Method</SecTitle>
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(4,1fr)",
//             gap: 12,
//           }}
//         >
//           {[
//             ["cash", "Cash", "💵", T.green],
//             ["upi", "UPI", "📱", T.blue],
//             ["card", "Card", "💳", T.purple],
//             ["bank_transfer", "Bank", "🏦", T.cyan],
//           ].map(([k, l, ic, c]) => (
//             <div
//               key={k}
//               style={{
//                 textAlign: "center",
//                 padding: "12px 8px",
//                 background: byMethod[k] > 0 ? c + "18" : T.surfaceElevated,
//                 borderRadius: 8,
//                 border: `1px solid ${byMethod[k] > 0 ? c + "44" : T.border}`,
//               }}
//             >
//               <div style={{ fontSize: 18, marginBottom: 4 }}>{ic}</div>
//               <div
//                 style={{
//                   fontSize: 16,
//                   fontWeight: 800,
//                   color: byMethod[k] > 0 ? c : T.textMuted,
//                   fontFamily: "'DM Mono',monospace",
//                 }}
//               >
//                 {fmt(byMethod[k])}
//               </div>
//               <div
//                 style={{ fontSize: 11, color: T.textMuted, fontWeight: 700 }}
//               >
//                 {l}
//               </div>
//             </div>
//           ))}
//         </div>
//       </Bx>

//       <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
//         {[
//           ["today", "Today's Transactions"],
//           ["credit", "Credit Ledger"],
//           ["all", "All Transactions"],
//         ].map(([k, l]) => (
//           <Btn
//             key={k}
//             T={T}
//             v={sub === k ? "primary" : "secondary"}
//             onClick={() => setSub(k)}
//           >
//             {l}
//           </Btn>
//         ))}
//       </div>

//       {sub === "today" && (
//         <Bx T={T}>
//           {todayPayments.length === 0 ? (
//             <Empty T={T} icon="💳" text="No transactions today" />
//           ) : (
//             <div style={{ overflowX: "auto" }}>
//               <table style={{ width: "100%", borderCollapse: "collapse" }}>
//                 <thead>
//                   <tr>
//                     {[
//                       "Vehicle",
//                       "Customer",
//                       "Amount",
//                       "Method",
//                       "Collected By",
//                       "Time",
//                       "Guarantor",
//                     ].map((h) => (
//                       <TH key={h} T={T}>
//                         {h}
//                       </TH>
//                     ))}
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {todayPayments.map((p) => (
//                     <tr
//                       key={p.id}
//                       onMouseEnter={(e) =>
//                         (e.currentTarget.style.background = T.surfaceElevated)
//                       }
//                       onMouseLeave={(e) =>
//                         (e.currentTarget.style.background = "transparent")
//                       }
//                     >
//                       <TD T={T}>
//                         <span
//                           style={{
//                             fontWeight: 800,
//                             fontFamily: "'DM Mono',monospace",
//                             color: T.text,
//                           }}
//                         >
//                           {p.vehicle?.vehicle_number || "—"}
//                         </span>
//                       </TD>
//                       <TD T={T} style={{ color: T.textSecondary }}>
//                         {p.vehicle?.customer_name || "—"}
//                       </TD>
//                       <TD T={T}>
//                         <span
//                           style={{
//                             fontWeight: 800,
//                             color:
//                               p.payment_method === "credit" ? T.amber : T.green,
//                             fontFamily: "'DM Mono',monospace",
//                           }}
//                         >
//                           {p.payment_method === "credit" ? "−" : "+"}
//                           {fmt(p.amount)}
//                         </span>
//                       </TD>
//                       <TD T={T}>
//                         <Chip color={T.blue} bg={T.blueLight}>
//                           {p.payment_method === "bank_transfer"
//                             ? "Bank"
//                             : p.payment_method}
//                         </Chip>
//                       </TD>
//                       <TD T={T} style={{ color: T.textSecondary }}>
//                         {p.collector?.full_name || "—"}
//                       </TD>
//                       <TD T={T} style={{ color: T.textMuted, fontSize: 11 }}>
//                         {formatIST(p.created_at)}
//                       </TD>
//                       <TD T={T} style={{ color: T.amber, fontSize: 11 }}>
//                         {p.vehicle?.credit_guaranteed_by || "—"}
//                       </TD>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           )}
//         </Bx>
//       )}

//       {sub === "credit" && (
//         <div>
//           {creditGroups.length === 0 ? (
//             <Empty T={T} icon="✅" text="No outstanding credits" />
//           ) : (
//             <>
//               <Bx
//                 T={T}
//                 style={{
//                   marginBottom: 12,
//                   background: T.amberLight,
//                   border: `1px solid ${T.amber}44`,
//                 }}
//               >
//                 <div
//                   style={{
//                     display: "flex",
//                     justifyContent: "space-between",
//                     alignItems: "center",
//                   }}
//                 >
//                   <span style={{ fontWeight: 700, color: T.amber }}>
//                     📋 Total Outstanding
//                   </span>
//                   <span
//                     style={{
//                       fontSize: 22,
//                       fontWeight: 800,
//                       color: T.amber,
//                       fontFamily: "'DM Mono',monospace",
//                     }}
//                   >
//                     {fmt(totalOutstandingCredit)}
//                   </span>
//                 </div>
//               </Bx>
//               {creditGroups.map((g) => (
//                 <CreditRow key={g.vehicle_number} T={T} group={g} />
//               ))}
//             </>
//           )}
//         </div>
//       )}

//       {sub === "all" && (
//         <div>
//           <Bx T={T} style={{ marginBottom: 12 }}>
//             <div
//               style={{
//                 display: "flex",
//                 gap: 8,
//                 marginBottom: 10,
//                 flexWrap: "wrap",
//               }}
//             >
//               <input
//                 value={search}
//                 onChange={(e) => setSearch(e.target.value)}
//                 placeholder="Search vehicle, customer..."
//                 style={{
//                   flex: "1 1 180px",
//                   padding: "7px 12px",
//                   border: `1px solid ${T.border}`,
//                   borderRadius: 6,
//                   fontSize: 13,
//                   fontFamily: "inherit",
//                   background: T.surface,
//                   color: T.text,
//                   outline: "none",
//                 }}
//               />
//               <input
//                 type="date"
//                 value={df}
//                 onChange={(e) => setDf(e.target.value)}
//                 style={{
//                   padding: "7px 10px",
//                   border: `1px solid ${T.border}`,
//                   borderRadius: 6,
//                   fontSize: 13,
//                   fontFamily: "inherit",
//                   background: T.surface,
//                   color: T.text,
//                 }}
//               />
//               <input
//                 type="date"
//                 value={dt}
//                 onChange={(e) => setDt(e.target.value)}
//                 style={{
//                   padding: "7px 10px",
//                   border: `1px solid ${T.border}`,
//                   borderRadius: 6,
//                   fontSize: 13,
//                   fontFamily: "inherit",
//                   background: T.surface,
//                   color: T.text,
//                 }}
//               />
//               {(df || dt) && (
//                 <Btn
//                   T={T}
//                   v="ghost"
//                   onClick={() => {
//                     setDf("");
//                     setDt("");
//                   }}
//                 >
//                   ✕
//                 </Btn>
//               )}
//             </div>
//             <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
//               {[
//                 "all",
//                 "cash",
//                 "upi",
//                 "card",
//                 "bank_transfer",
//                 "credit",
//                 "outstanding",
//               ].map((m) => (
//                 <button
//                   key={m}
//                   onClick={() => setMf(m)}
//                   style={{
//                     padding: "4px 11px",
//                     borderRadius: 20,
//                     border: `1px solid ${mf === m ? "#f59e0b" : T.border}`,
//                     background: mf === m ? "#f59e0b" : T.surface,
//                     color: mf === m ? "#fff" : T.textSecondary,
//                     fontSize: 12,
//                     fontWeight: 600,
//                     cursor: "pointer",
//                     fontFamily: "inherit",
//                   }}
//                 >
//                   {m === "bank_transfer"
//                     ? "Bank"
//                     : m === "outstanding"
//                       ? "📋 Outstanding"
//                       : m.charAt(0).toUpperCase() + m.slice(1)}
//                 </button>
//               ))}
//             </div>
//           </Bx>

//           {/* Fix 5: Summary bar — updates based on selected method chip */}
//           <Bx T={T} style={{ marginBottom: 12, background: T.surfaceElevated }}>
//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "repeat(3,1fr)",
//                 textAlign: "center",
//                 gap: 10,
//                 padding: "4px 0",
//               }}
//             >
//               {mf === "outstanding" ? (
//                 <>
//                   <div>
//                     <div
//                       style={{
//                         fontSize: 10,
//                         fontWeight: 700,
//                         color: T.textMuted,
//                         textTransform: "uppercase",
//                         marginBottom: 4,
//                       }}
//                     >
//                       Outstanding
//                     </div>
//                     <div
//                       style={{
//                         fontSize: 20,
//                         fontWeight: 800,
//                         color: T.amber,
//                         fontFamily: "'DM Mono',monospace",
//                       }}
//                     >
//                       {fmt(
//                         filtOut.reduce(
//                           (s, v) => s + (parseFloat(v.credit_amount) || 0),
//                           0,
//                         ),
//                       )}
//                     </div>
//                   </div>
//                   <div>
//                     <div
//                       style={{
//                         fontSize: 10,
//                         fontWeight: 700,
//                         color: T.textMuted,
//                         textTransform: "uppercase",
//                         marginBottom: 4,
//                       }}
//                     >
//                       Vehicles
//                     </div>
//                     <div
//                       style={{
//                         fontSize: 20,
//                         fontWeight: 800,
//                         color: T.text,
//                         fontFamily: "'DM Mono',monospace",
//                       }}
//                     >
//                       {filtOut.length}
//                     </div>
//                   </div>
//                   <div>
//                     <div
//                       style={{
//                         fontSize: 10,
//                         fontWeight: 700,
//                         color: T.textMuted,
//                         textTransform: "uppercase",
//                         marginBottom: 4,
//                       }}
//                     >
//                       Avg Per Vehicle
//                     </div>
//                     <div
//                       style={{
//                         fontSize: 20,
//                         fontWeight: 800,
//                         color: T.amber,
//                         fontFamily: "'DM Mono',monospace",
//                       }}
//                     >
//                       {filtOut.length > 0
//                         ? fmt(
//                             filtOut.reduce(
//                               (s, v) => s + (parseFloat(v.credit_amount) || 0),
//                               0,
//                             ) / filtOut.length,
//                           )
//                         : "—"}
//                     </div>
//                   </div>
//                 </>
//               ) : (
//                 <>
//                   <div>
//                     <div
//                       style={{
//                         fontSize: 10,
//                         fontWeight: 700,
//                         color: T.textMuted,
//                         textTransform: "uppercase",
//                         marginBottom: 4,
//                       }}
//                     >
//                       {mf === "all"
//                         ? "Total Collected"
//                         : mf === "credit"
//                           ? "Credit Given"
//                           : `${mf === "bank_transfer" ? "Bank Transfer" : mf.charAt(0).toUpperCase() + mf.slice(1)} Total`}
//                     </div>
//                     <div
//                       style={{
//                         fontSize: 20,
//                         fontWeight: 800,
//                         color: T.green,
//                         fontFamily: "'DM Mono',monospace",
//                       }}
//                     >
//                       {fmt(
//                         filtAll
//                           .filter((p) => p.payment_method !== "credit")
//                           .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0),
//                       )}
//                     </div>
//                   </div>
//                   <div>
//                     <div
//                       style={{
//                         fontSize: 10,
//                         fontWeight: 700,
//                         color: T.textMuted,
//                         textTransform: "uppercase",
//                         marginBottom: 4,
//                       }}
//                     >
//                       Credit Given
//                     </div>
//                     <div
//                       style={{
//                         fontSize: 20,
//                         fontWeight: 800,
//                         color: T.amber,
//                         fontFamily: "'DM Mono',monospace",
//                       }}
//                     >
//                       {fmt(
//                         filtAll
//                           .filter((p) => p.payment_method === "credit")
//                           .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0),
//                       )}
//                     </div>
//                   </div>
//                   <div>
//                     <div
//                       style={{
//                         fontSize: 10,
//                         fontWeight: 700,
//                         color: T.textMuted,
//                         textTransform: "uppercase",
//                         marginBottom: 4,
//                       }}
//                     >
//                       Transactions
//                     </div>
//                     <div
//                       style={{
//                         fontSize: 20,
//                         fontWeight: 800,
//                         color: T.text,
//                         fontFamily: "'DM Mono',monospace",
//                       }}
//                     >
//                       {filtAll.length}
//                     </div>
//                   </div>
//                 </>
//               )}
//             </div>
//           </Bx>

//           {mf === "outstanding" ? (
//             filtOut.length === 0 ? (
//               <Empty T={T} icon="✅" text="No outstanding credits" />
//             ) : (
//               <Bx T={T}>
//                 <div style={{ overflowX: "auto" }}>
//                   <table style={{ width: "100%", borderCollapse: "collapse" }}>
//                     <thead>
//                       <tr>
//                         {[
//                           "Vehicle",
//                           "Customer",
//                           "Phone",
//                           "Bill",
//                           "Paid",
//                           "Credit",
//                           "Guaranteed By",
//                           "Date",
//                         ].map((h) => (
//                           <TH key={h} T={T}>
//                             {h}
//                           </TH>
//                         ))}
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {filtOut.map((v) => (
//                         <tr
//                           key={v.id}
//                           onMouseEnter={(e) =>
//                             (e.currentTarget.style.background =
//                               T.surfaceElevated)
//                           }
//                           onMouseLeave={(e) =>
//                             (e.currentTarget.style.background = "transparent")
//                           }
//                         >
//                           <TD T={T}>
//                             <span
//                               style={{
//                                 fontWeight: 800,
//                                 fontFamily: "'DM Mono',monospace",
//                                 color: T.text,
//                               }}
//                             >
//                               {v.vehicle_number}
//                             </span>
//                           </TD>
//                           <TD T={T} style={{ color: T.textSecondary }}>
//                             {v.customer_name || "—"}
//                           </TD>
//                           <TD T={T} style={{ color: T.textSecondary }}>
//                             {v.customer_phone || "—"}
//                           </TD>
//                           <TD T={T}>
//                             <span style={{ fontFamily: "'DM Mono',monospace" }}>
//                               {fmt(v.bill_amount)}
//                             </span>
//                           </TD>
//                           <TD T={T}>
//                             <span
//                               style={{
//                                 fontFamily: "'DM Mono',monospace",
//                                 color: T.green,
//                               }}
//                             >
//                               {fmt(v.total_paid)}
//                             </span>
//                           </TD>
//                           <TD T={T}>
//                             <span
//                               style={{
//                                 fontFamily: "'DM Mono',monospace",
//                                 color: T.amber,
//                                 fontWeight: 800,
//                               }}
//                             >
//                               {fmt(v.credit_amount)}
//                             </span>
//                           </TD>
//                           <TD T={T} style={{ color: T.amber }}>
//                             {v.credit_guaranteed_by || "—"}
//                           </TD>
//                           <TD
//                             T={T}
//                             style={{ color: T.textMuted, fontSize: 11 }}
//                           >
//                             {formatIST(v.entry_time)}
//                           </TD>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               </Bx>
//             )
//           ) : filtAll.length === 0 ? (
//             <Empty T={T} icon="🔍" text="No transactions found" />
//           ) : (
//             <Bx T={T}>
//               <div style={{ overflowX: "auto" }}>
//                 <table style={{ width: "100%", borderCollapse: "collapse" }}>
//                   <thead>
//                     <tr>
//                       {[
//                         "Vehicle",
//                         "Customer",
//                         "Amount",
//                         "Method",
//                         "By",
//                         "Time",
//                       ].map((h) => (
//                         <TH key={h} T={T}>
//                           {h}
//                         </TH>
//                       ))}
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {filtAll.map((p) => (
//                       <tr
//                         key={p.id}
//                         onMouseEnter={(e) =>
//                           (e.currentTarget.style.background = T.surfaceElevated)
//                         }
//                         onMouseLeave={(e) =>
//                           (e.currentTarget.style.background = "transparent")
//                         }
//                       >
//                         <TD T={T}>
//                           <span
//                             style={{
//                               fontWeight: 800,
//                               fontFamily: "'DM Mono',monospace",
//                               color: T.text,
//                             }}
//                           >
//                             {p.vehicle?.vehicle_number || "—"}
//                           </span>
//                         </TD>
//                         <TD T={T} style={{ color: T.textSecondary }}>
//                           {p.vehicle?.customer_name || "—"}
//                         </TD>
//                         <TD T={T}>
//                           <span
//                             style={{
//                               fontWeight: 800,
//                               color:
//                                 p.payment_method === "credit"
//                                   ? T.amber
//                                   : T.green,
//                               fontFamily: "'DM Mono',monospace",
//                             }}
//                           >
//                             {p.payment_method === "credit" ? "−" : "+"}
//                             {fmt(p.amount)}
//                           </span>
//                         </TD>
//                         <TD T={T}>
//                           <Chip color={T.blue} bg={T.blueLight}>
//                             {p.payment_method === "bank_transfer"
//                               ? "Bank"
//                               : p.payment_method}
//                           </Chip>
//                         </TD>
//                         <TD T={T} style={{ color: T.textSecondary }}>
//                           {p.collector?.full_name || "—"}
//                         </TD>
//                         <TD T={T} style={{ color: T.textMuted, fontSize: 11 }}>
//                           {formatIST(p.created_at)}
//                         </TD>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             </Bx>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

// function CreditRow({ T, group }) {
//   const [exp, setExp] = useState(false);
//   return (
//     <Bx
//       T={T}
//       style={{
//         marginBottom: 8,
//         border: `1px solid ${T.amber}44`,
//         cursor: "pointer",
//       }}
//       onClick={() => setExp(!exp)}
//     >
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//         }}
//       >
//         <div>
//           <span
//             style={{
//               fontWeight: 800,
//               fontSize: 15,
//               fontFamily: "'DM Mono',monospace",
//               color: T.text,
//             }}
//           >
//             {group.vehicle_number}
//           </span>
//           <span
//             style={{ fontSize: 13, color: T.textSecondary, marginLeft: 12 }}
//           >
//             {group.customer_name} • {group.customer_phone}
//           </span>
//           <span style={{ fontSize: 11, color: T.textMuted, marginLeft: 10 }}>
//             {group.visits.length} visit(s)
//           </span>
//         </div>
//         <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//           <span
//             style={{
//               fontSize: 20,
//               fontWeight: 800,
//               color: T.amber,
//               fontFamily: "'DM Mono',monospace",
//             }}
//           >
//             {fmt(group.total_credit)}
//           </span>
//           <span style={{ color: T.textMuted }}>{exp ? "▲" : "▼"}</span>
//         </div>
//       </div>
//       {exp && (
//         <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
//           {group.visits.map((v) => (
//             <div
//               key={v.id}
//               style={{
//                 background: T.surfaceElevated,
//                 borderRadius: 6,
//                 padding: "8px 12px",
//                 display: "flex",
//                 justifyContent: "space-between",
//               }}
//             >
//               <div>
//                 <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
//                   Bill: {fmt(v.bill_amount)}
//                 </span>
//                 <span
//                   style={{ fontSize: 11, color: T.textMuted, marginLeft: 10 }}
//                 >
//                   {formatIST(v.entry_time)}
//                 </span>
//               </div>
//               <span style={{ fontSize: 13, fontWeight: 700, color: T.amber }}>
//                 Credit: {fmt(v.credit_amount)}
//               </span>
//             </div>
//           ))}
//         </div>
//       )}
//     </Bx>
//   );
// }

// // ─── STAFF TAB ────────────────────────────────────────────────────────────────
// function StaffTab({ T, derived, users, teams, vehicles, onVehiclePress }) {
//   const { advisorLoads, roleGroups } = derived;
//   const active = vehicles.filter((v) => v.current_stage !== "completed");
//   return (
//     <div>
//       <SecTitle T={T}>Advisors</SecTitle>
//       <div
//         style={{
//           display: "grid",
//           gridTemplateColumns: "repeat(3,1fr)",
//           gap: 14,
//           marginBottom: 22,
//         }}
//       >
//         {advisorLoads.map((a) => (
//           <Bx T={T} key={a.id}>
//             <div
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 gap: 10,
//                 marginBottom: 10,
//                 paddingBottom: 8,
//                 borderBottom: `1px solid ${T.border}`,
//               }}
//             >
//               <div
//                 style={{
//                   width: 38,
//                   height: 38,
//                   borderRadius: "50%",
//                   background: T.blueLight,
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   fontWeight: 800,
//                   color: T.blue,
//                   fontSize: 15,
//                   flexShrink: 0,
//                 }}
//               >
//                 {a.full_name?.charAt(0)}
//               </div>
//               <div style={{ flex: 1 }}>
//                 <div style={{ fontWeight: 700, color: T.text, fontSize: 14 }}>
//                   {a.full_name}
//                 </div>
//                 <div style={{ fontSize: 11, color: T.textMuted }}>Advisor</div>
//               </div>
//               <Chip color={T.blue} bg={T.blueLight}>
//                 {a.activeVehicles.length} active
//               </Chip>
//             </div>
//             {a.activeVehicles.slice(0, 5).map((v) => (
//               <div
//                 key={v.id}
//                 onClick={() => onVehiclePress(v)}
//                 style={{
//                   display: "flex",
//                   justifyContent: "space-between",
//                   alignItems: "center",
//                   padding: "6px 8px",
//                   borderRadius: 6,
//                   cursor: "pointer",
//                   marginBottom: 3,
//                 }}
//                 onMouseEnter={(e) =>
//                   (e.currentTarget.style.background = T.surfaceElevated)
//                 }
//                 onMouseLeave={(e) =>
//                   (e.currentTarget.style.background = "transparent")
//                 }
//               >
//                 <span
//                   style={{
//                     fontWeight: 800,
//                     fontSize: 13,
//                     fontFamily: "'DM Mono',monospace",
//                     color: T.text,
//                   }}
//                 >
//                   {v.vehicle_number}
//                 </span>
//                 <span style={{ fontSize: 10, color: T.textSecondary }}>
//                   {STAGE_META[v.current_stage]?.icon}{" "}
//                   {v.current_stage?.replace(/_/g, " ")}
//                 </span>
//               </div>
//             ))}
//             {a.activeVehicles.length > 5 && (
//               <div
//                 style={{
//                   fontSize: 11,
//                   color: T.textMuted,
//                   textAlign: "center",
//                   padding: 6,
//                 }}
//               >
//                 +{a.activeVehicles.length - 5} more
//               </div>
//             )}
//           </Bx>
//         ))}
//       </div>

//       <SecTitle T={T}>Departments</SecTitle>
//       <div
//         style={{
//           display: "grid",
//           gridTemplateColumns: "repeat(3,1fr)",
//           gap: 14,
//         }}
//       >
//         {Object.entries(roleGroups).map(
//           ([role, { members, roleTeams, unassignedMembers }]) => {
//             const dm = STAGE_META[role] || {
//               label: ROLE_LABELS[role] || role,
//               icon: "👤",
//               color: T.textMuted,
//             };
//             return (
//               <Bx
//                 T={T}
//                 key={role}
//                 style={{ borderTop: `3px solid ${dm.color}` }}
//               >
//                 <div
//                   style={{
//                     display: "flex",
//                     alignItems: "center",
//                     gap: 8,
//                     marginBottom: 10,
//                     paddingBottom: 8,
//                     borderBottom: `1px solid ${T.border}`,
//                   }}
//                 >
//                   <div
//                     style={{
//                       width: 34,
//                       height: 34,
//                       borderRadius: 8,
//                       background: dm.color + "20",
//                       display: "flex",
//                       alignItems: "center",
//                       justifyContent: "center",
//                       fontSize: 15,
//                       flexShrink: 0,
//                     }}
//                   >
//                     {dm.icon}
//                   </div>
//                   <div style={{ flex: 1 }}>
//                     <div
//                       style={{ fontWeight: 700, color: T.text, fontSize: 13 }}
//                     >
//                       {ROLE_LABELS[role] || role}
//                     </div>
//                     <div
//                       style={{ fontSize: 11, color: dm.color, fontWeight: 700 }}
//                     >
//                       {members.length} member{members.length !== 1 ? "s" : ""}
//                     </div>
//                   </div>
//                 </div>
//                 {roleTeams.map((team) => {
//                   const tm = members.filter((m) => m.team_id === team.id);
//                   const ta = active.filter(
//                     (v) =>
//                       v.work_stages?.[0]?.[`${role}_team_id`] === team.id &&
//                       v.work_stages[0][`${role}_status`] !== "completed",
//                   );
//                   return (
//                     <div
//                       key={team.id}
//                       style={{
//                         background: dm.color + "10",
//                         border: `1px solid ${dm.color}33`,
//                         borderRadius: 8,
//                         padding: 9,
//                         marginBottom: 7,
//                       }}
//                     >
//                       <div
//                         style={{
//                           display: "flex",
//                           justifyContent: "space-between",
//                           marginBottom: 5,
//                         }}
//                       >
//                         <span
//                           style={{
//                             fontWeight: 700,
//                             color: dm.color,
//                             fontSize: 12,
//                           }}
//                         >
//                           👥 {team.name}
//                         </span>
//                         <Chip color={dm.color} bg={dm.color + "20"}>
//                           {ta.length} vehicles
//                         </Chip>
//                       </div>
//                       <div
//                         style={{ display: "flex", flexWrap: "wrap", gap: 4 }}
//                       >
//                         {tm.map((m) => (
//                           <Chip
//                             key={m.id}
//                             color={T.textSecondary}
//                             bg={T.surfaceElevated}
//                           >
//                             {m.full_name}
//                           </Chip>
//                         ))}
//                       </div>
//                     </div>
//                   );
//                 })}
//                 {unassignedMembers.length > 0 && (
//                   <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
//                     {unassignedMembers.map((m) => (
//                       <Chip
//                         key={m.id}
//                         color={T.textSecondary}
//                         bg={T.surfaceElevated}
//                       >
//                         {m.full_name}
//                       </Chip>
//                     ))}
//                   </div>
//                 )}
//               </Bx>
//             );
//           },
//         )}
//       </div>
//     </div>
//   );
// }

// // ─── REPORTS TAB ──────────────────────────────────────────────────────────────
// function ReportsTab({
//   T,
//   derived,
//   users,
//   reportData,
//   reportLoading,
//   fetchReportData,
// }) {
//   const [preset, setPreset] = useState("today");
//   const [cf, setCf] = useState("");
//   const [ct, setCt] = useState("");
//   const [dling, setDling] = useState(null);

//   useEffect(() => {
//     const { from, to } = dateRange("today", "", "");
//     fetchReportData(from, to);
//   }, []);

//   const setP = (p) => {
//     setPreset(p);
//     if (p !== "custom") {
//       const { from, to } = dateRange(p, "", "");
//       fetchReportData(from, to);
//     }
//   };
//   const apply = () => {
//     if (cf && ct) fetchReportData(cf, ct);
//   };
//   const dl = async (type) => {
//     setDling(type);
//     try {
//       const { from, to } = dateRange(preset, cf, ct);
//       await exportToExcel(type, from, to);
//     } catch (e) {
//       alert("Export failed: " + e.message);
//     } finally {
//       setDling(null);
//     }
//   };

//   const { from: af, to: at } = dateRange(preset, cf, ct);
//   const veh = reportData.vehicles || [];
//   const realP = (reportData.payments || []).filter(
//     (p) => p.payment_method !== "credit",
//   );
//   const credP = (reportData.payments || []).filter(
//     (p) => p.payment_method === "credit",
//   );
//   const rev = realP.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
//   const cred = credP.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
//   const avgB = veh.length
//     ? veh.reduce((s, v) => s + (parseFloat(v.bill_amount) || 0), 0) / veh.length
//     : 0;
//   const tats = veh
//     .filter((v) => v.entry_time && v.updated_at)
//     .map(
//       (v) =>
//         (new Date(toZ(v.updated_at)) - new Date(toZ(v.entry_time))) / 60000,
//     )
//     .filter((t) => t > 0);
//   const avgT = tats.length ? tats.reduce((a, b) => a + b, 0) / tats.length : 0;
//   const slaBr = veh.filter(
//     (v) =>
//       v.expected_completion_time &&
//       new Date(toZ(v.updated_at)) > new Date(toZ(v.expected_completion_time)),
//   ).length;
//   const bm = {};
//   ["cash", "upi", "card", "bank_transfer"].forEach((m) => {
//     bm[m] = realP
//       .filter((p) => p.payment_method === m)
//       .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
//   });
//   const sb = {};
//   veh.forEach((v) => {
//     if (v.service_type) sb[v.service_type] = (sb[v.service_type] || 0) + 1;
//   });
//   const db = {};
//   veh.forEach((v) => {
//     const raw = v.updated_at || v.entry_time;
//     const d = new Date(toZ(raw)).toLocaleDateString("en-CA", {
//       timeZone: "Asia/Kolkata",
//     });
//     if (!db[d]) db[d] = { n: 0, r: 0 };
//     db[d].n++;
//     db[d].r += parseFloat(v.bill_amount) || 0;
//   });
//   const de = Object.entries(db).sort((a, b) => b[0].localeCompare(a[0]));
//   const mx = Math.max(...de.map(([, v]) => v.n), 1);

//   const DOWNLOADS = [
//     {
//       type: "operations",
//       label: "📊 Daily Operations",
//       desc: "Vehicle summary, dept log, payments",
//       usesDateRange: true,
//     },
//     {
//       type: "washing",
//       label: "💧 Washing Report",
//       desc: "Slot-wise data, timings, workers",
//       usesDateRange: true,
//     },
//     {
//       type: "special_work",
//       label: "✨ Special Work",
//       desc: "3M + alignment details",
//       usesDateRange: true,
//     },
//     {
//       type: "productivity",
//       label: "👥 Staff Productivity",
//       desc: "Advisor perf + dept TAT",
//       usesDateRange: true,
//     },
//     {
//       type: "credit",
//       label: "📋 Credit Outstanding",
//       desc: "Always exports current full balance",
//       usesDateRange: false,
//     },
//     {
//       type: "force_pdi",
//       label: "⚡ Force PDI Report",
//       desc: "All force PDI actions with dept details",
//       usesDateRange: true,
//     },
//   ];

//   return (
//     <div>
//       {/* Date presets */}
//       <div
//         style={{
//           display: "flex",
//           gap: 8,
//           marginBottom: 14,
//           flexWrap: "wrap",
//           alignItems: "center",
//         }}
//       >
//         {[
//           ["today", "Today"],
//           ["yesterday", "Yesterday"],
//           ["7days", "7 Days"],
//           ["30days", "30 Days"],
//           ["custom", "Custom"],
//         ].map(([k, l]) => (
//           <Btn
//             key={k}
//             T={T}
//             v={preset === k ? "primary" : "secondary"}
//             onClick={() => setP(k)}
//           >
//             {l}
//           </Btn>
//         ))}
//         {preset === "custom" && (
//           <>
//             <input
//               type="date"
//               value={cf}
//               onChange={(e) => setCf(e.target.value)}
//               style={{
//                 padding: "7px 10px",
//                 border: `1px solid ${T.border}`,
//                 borderRadius: 6,
//                 fontSize: 13,
//                 fontFamily: "inherit",
//                 background: T.surface,
//                 color: T.text,
//               }}
//             />
//             <span style={{ color: T.textMuted }}>→</span>
//             <input
//               type="date"
//               value={ct}
//               onChange={(e) => setCt(e.target.value)}
//               style={{
//                 padding: "7px 10px",
//                 border: `1px solid ${T.border}`,
//                 borderRadius: 6,
//                 fontSize: 13,
//                 fontFamily: "inherit",
//                 background: T.surface,
//                 color: T.text,
//               }}
//             />
//             <Btn T={T} v="success" onClick={apply} disabled={!cf || !ct}>
//               Apply
//             </Btn>
//           </>
//         )}
//         <span style={{ fontSize: 11, color: T.textMuted, marginLeft: 8 }}>
//           📅 {af === at ? af : `${af} → ${at}`}
//         </span>
//       </div>

//       {/* Downloads */}
//       <Bx T={T} style={{ marginBottom: 20, borderLeft: `4px solid #f59e0b` }}>
//         <SecTitle T={T}>📥 Download Excel Reports</SecTitle>
//         <div
//           style={{
//             marginBottom: 10,
//             padding: "6px 10px",
//             background: T.accentBg,
//             borderRadius: 6,
//             border: `1px solid #f59e0b44`,
//             fontSize: 12,
//             color: "#f59e0b",
//             fontWeight: 600,
//           }}
//         >
//           📅 Active range:{" "}
//           <span style={{ fontFamily: "'DM Mono',monospace" }}>
//             {af === at ? af : `${af} → ${at}`}
//           </span>{" "}
//           — downloads will use this range (except Credit Outstanding which is
//           always current)
//         </div>
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(2,1fr)",
//             gap: 10,
//           }}
//         >
//           {DOWNLOADS.map(({ type, label, desc, usesDateRange }) => (
//             <div
//               key={type}
//               style={{
//                 display: "flex",
//                 justifyContent: "space-between",
//                 alignItems: "center",
//                 padding: "11px 14px",
//                 background: T.surfaceElevated,
//                 borderRadius: 8,
//                 border: `1px solid ${T.border}`,
//               }}
//             >
//               <div>
//                 <div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>
//                   {label}
//                 </div>
//                 <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
//                   {desc}
//                 </div>
//                 {usesDateRange && (
//                   <div
//                     style={{
//                       fontSize: 10,
//                       color: "#f59e0b",
//                       fontWeight: 600,
//                       marginTop: 3,
//                       fontFamily: "'DM Mono',monospace",
//                     }}
//                   >
//                     📅 {af === at ? af : `${af} → ${at}`}
//                   </div>
//                 )}
//                 {!usesDateRange && (
//                   <div
//                     style={{ fontSize: 10, color: T.textMuted, marginTop: 3 }}
//                   >
//                     ⚠️ Always exports full current balance
//                   </div>
//                 )}
//               </div>
//               <Btn
//                 T={T}
//                 v="secondary"
//                 sz="sm"
//                 onClick={() => dl(type)}
//                 disabled={dling === type}
//               >
//                 {dling === type ? "⏳" : "⬇️"} Export
//               </Btn>
//             </div>
//           ))}
//         </div>
//         <div
//           style={{
//             fontSize: 11,
//             color: T.textMuted,
//             marginTop: 10,
//             padding: "7px 10px",
//             background: T.surfaceElevated,
//             borderRadius: 6,
//           }}
//         >
//           ℹ️ Operations, Washing & Special Work use the selected date range.
//           Credit Outstanding always exports the current full balance.
//         </div>
//       </Bx>

//       {reportLoading ? (
//         <div style={{ textAlign: "center", padding: 60, color: T.textMuted }}>
//           <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
//           <div style={{ fontSize: 14 }}>Loading report data...</div>
//         </div>
//       ) : (
//         <>
//           <div
//             style={{
//               display: "grid",
//               gridTemplateColumns: "repeat(6,1fr)",
//               gap: 12,
//               marginBottom: 18,
//             }}
//           >
//             {[
//               {
//                 label: "Completed",
//                 value: veh.length,
//                 color: T.green,
//                 icon: "✅",
//               },
//               { label: "Revenue", value: fmt(rev), color: T.green, icon: "💰" },
//               {
//                 label: "Avg Bill",
//                 value: avgB > 0 ? fmt(avgB) : "—",
//                 color: T.blue,
//                 icon: "🧾",
//               },
//               {
//                 label: "Avg TAT",
//                 value: fmtMins(avgT),
//                 color: T.cyan,
//                 icon: "⏱️",
//               },
//               {
//                 label: "Credit Given",
//                 value: fmt(cred),
//                 color: T.amber,
//                 icon: "📋",
//               },
//               {
//                 label: "SLA Breached",
//                 value: slaBr,
//                 color: slaBr > 0 ? T.red : T.green,
//                 icon: "⚠️",
//               },
//             ].map((k) => (
//               <KPI key={k.label} T={T} {...k} />
//             ))}
//           </div>

//           {rev > 0 && (
//             <Bx T={T} style={{ marginBottom: 14 }}>
//               <SecTitle T={T}>Revenue by Method</SecTitle>
//               <div
//                 style={{
//                   display: "grid",
//                   gridTemplateColumns: "repeat(4,1fr)",
//                   gap: 12,
//                 }}
//               >
//                 {[
//                   ["cash", "Cash", "💵", T.green],
//                   ["upi", "UPI", "📱", T.blue],
//                   ["card", "Card", "💳", T.purple],
//                   ["bank_transfer", "Bank", "🏦", T.cyan],
//                 ].map(([k, l, ic, c]) => (
//                   <div
//                     key={k}
//                     style={{
//                       textAlign: "center",
//                       padding: 12,
//                       background: bm[k] > 0 ? c + "15" : T.surfaceElevated,
//                       borderRadius: 8,
//                       border: `1px solid ${bm[k] > 0 ? c + "44" : T.border}`,
//                     }}
//                   >
//                     <div style={{ fontSize: 16, marginBottom: 4 }}>{ic}</div>
//                     <div
//                       style={{
//                         fontSize: 16,
//                         fontWeight: 800,
//                         color: bm[k] > 0 ? c : T.textMuted,
//                         fontFamily: "'DM Mono',monospace",
//                       }}
//                     >
//                       {fmt(bm[k])}
//                     </div>
//                     <div
//                       style={{
//                         fontSize: 10,
//                         color: T.textMuted,
//                         fontWeight: 700,
//                       }}
//                     >
//                       {l}
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </Bx>
//           )}

//           {de.length > 1 && (
//             <Bx T={T} style={{ marginBottom: 14 }}>
//               <SecTitle T={T}>Daily Breakdown</SecTitle>
//               {de.map(([date, d]) => {
//                 const p = Math.round((d.n / mx) * 100);
//                 return (
//                   <div
//                     key={date}
//                     style={{
//                       display: "flex",
//                       alignItems: "center",
//                       gap: 12,
//                       marginBottom: 7,
//                     }}
//                   >
//                     <span
//                       style={{
//                         fontSize: 11,
//                         color: T.textSecondary,
//                         fontFamily: "'DM Mono',monospace",
//                         width: 88,
//                         flexShrink: 0,
//                       }}
//                     >
//                       {date}
//                     </span>
//                     <div
//                       style={{
//                         flex: 1,
//                         background: T.surfaceElevated,
//                         borderRadius: 4,
//                         height: 7,
//                         overflow: "hidden",
//                       }}
//                     >
//                       <div
//                         style={{
//                           width: `${p}%`,
//                           height: "100%",
//                           background: "#f59e0b",
//                           borderRadius: 4,
//                         }}
//                       />
//                     </div>
//                     <span
//                       style={{
//                         fontSize: 11,
//                         fontWeight: 700,
//                         color: T.text,
//                         width: 72,
//                         textAlign: "right",
//                       }}
//                     >
//                       {d.n} vehicles
//                     </span>
//                     <span
//                       style={{
//                         fontSize: 11,
//                         color: T.green,
//                         fontFamily: "'DM Mono',monospace",
//                         width: 80,
//                         textAlign: "right",
//                       }}
//                     >
//                       {fmt(d.r)}
//                     </span>
//                   </div>
//                 );
//               })}
//             </Bx>
//           )}

//           {Object.keys(sb).length > 0 && (
//             <Bx T={T} style={{ marginBottom: 14 }}>
//               <SecTitle T={T}>By Service Type</SecTitle>
//               {Object.entries(sb)
//                 .sort((a, b) => b[1] - a[1])
//                 .map(([type, n]) => {
//                   const total = Object.values(sb).reduce((a, b) => a + b, 0);
//                   const p = Math.round((n / total) * 100);
//                   return (
//                     <div key={type} style={{ marginBottom: 9 }}>
//                       <div
//                         style={{
//                           display: "flex",
//                           justifyContent: "space-between",
//                           marginBottom: 3,
//                         }}
//                       >
//                         <span
//                           style={{
//                             fontSize: 12,
//                             fontWeight: 600,
//                             color: T.text,
//                             textTransform: "capitalize",
//                           }}
//                         >
//                           {type.replace(/_/g, " ")}
//                         </span>
//                         <span
//                           style={{
//                             fontSize: 12,
//                             fontWeight: 700,
//                             color: T.textSecondary,
//                           }}
//                         >
//                           {n} ({p}%)
//                         </span>
//                       </div>
//                       <div
//                         style={{
//                           height: 5,
//                           background: T.surfaceElevated,
//                           borderRadius: 3,
//                           overflow: "hidden",
//                         }}
//                       >
//                         <div
//                           style={{
//                             width: `${p}%`,
//                             height: "100%",
//                             background: T.blue,
//                             borderRadius: 3,
//                           }}
//                         />
//                       </div>
//                     </div>
//                   );
//                 })}
//             </Bx>
//           )}

//           {/* Advisor productivity */}
//           {veh.length > 0 &&
//             (() => {
//               const advStats = users
//                 .filter((u) => u.role === "advisor")
//                 .map((a) => {
//                   const avs = veh.filter((v) => v.advisor_id === a.id);
//                   const r = avs.reduce(
//                     (s, v) => s + (parseFloat(v.bill_amount) || 0),
//                     0,
//                   );
//                   const c = avs.reduce(
//                     (s, v) => s + (parseFloat(v.credit_amount) || 0),
//                     0,
//                   );
//                   const act = derived.activeVehicles.filter(
//                     (v) => v.advisor_id === a.id,
//                   ).length;
//                   return {
//                     ...a,
//                     done: avs.length,
//                     r,
//                     c,
//                     avg: avs.length ? r / avs.length : 0,
//                     cr: r > 0 ? Math.round((c / (r + c)) * 100) : 0,
//                     act,
//                   };
//                 })
//                 .filter((a) => a.done > 0 || a.act > 0)
//                 .sort((a, b) => b.done - a.done);
//               if (!advStats.length) return null;
//               return (
//                 <Bx T={T} style={{ marginBottom: 14 }}>
//                   <SecTitle T={T}>Staff Productivity</SecTitle>
//                   <div style={{ overflowX: "auto" }}>
//                     <table
//                       style={{ width: "100%", borderCollapse: "collapse" }}
//                     >
//                       <thead>
//                         <tr>
//                           {[
//                             "Advisor",
//                             "Completed",
//                             "Revenue",
//                             "Avg Bill",
//                             "Credit Given",
//                             "Credit Rate",
//                             "Active Now",
//                           ].map((h) => (
//                             <TH key={h} T={T}>
//                               {h}
//                             </TH>
//                           ))}
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {advStats.map((a) => (
//                           <tr
//                             key={a.id}
//                             onMouseEnter={(e) =>
//                               (e.currentTarget.style.background =
//                                 T.surfaceElevated)
//                             }
//                             onMouseLeave={(e) =>
//                               (e.currentTarget.style.background = "transparent")
//                             }
//                           >
//                             <TD T={T}>
//                               <span style={{ fontWeight: 700 }}>
//                                 {a.full_name}
//                               </span>
//                             </TD>
//                             <TD T={T}>
//                               <span
//                                 style={{
//                                   fontFamily: "'DM Mono',monospace",
//                                   fontWeight: 800,
//                                   color: T.green,
//                                 }}
//                               >
//                                 {a.done}
//                               </span>
//                             </TD>
//                             <TD T={T}>
//                               <span
//                                 style={{
//                                   fontFamily: "'DM Mono',monospace",
//                                   color: T.green,
//                                 }}
//                               >
//                                 {fmt(a.r)}
//                               </span>
//                             </TD>
//                             <TD T={T}>
//                               <span
//                                 style={{ fontFamily: "'DM Mono',monospace" }}
//                               >
//                                 {a.avg > 0 ? fmt(a.avg) : "—"}
//                               </span>
//                             </TD>
//                             <TD T={T}>
//                               <span
//                                 style={{
//                                   fontFamily: "'DM Mono',monospace",
//                                   color: T.amber,
//                                 }}
//                               >
//                                 {fmt(a.c)}
//                               </span>
//                             </TD>
//                             <TD T={T}>
//                               <Chip
//                                 color={a.cr > 20 ? T.red : T.green}
//                                 bg={a.cr > 20 ? T.redLight : T.greenLight}
//                               >
//                                 {a.cr}%
//                               </Chip>
//                             </TD>
//                             <TD T={T}>
//                               <Chip color={T.blue} bg={T.blueLight}>
//                                 {a.act}
//                               </Chip>
//                             </TD>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>
//                 </Bx>
//               );
//             })()}

//           {/* Completed vehicles — FULL table, no row cap */}
//           {veh.length > 0 && (
//             <Bx T={T}>
//               <SecTitle T={T}>Completed Vehicles ({veh.length})</SecTitle>
//               <div style={{ overflowX: "auto" }}>
//                 <table style={{ width: "100%", borderCollapse: "collapse" }}>
//                   <thead>
//                     <tr>
//                       {[
//                         "#",
//                         "Vehicle No",
//                         "Customer Name",
//                         "Phone",
//                         "Model",
//                         "Odometer",
//                         "Service",
//                         "Priority",
//                         "Advisor",
//                         "Entry",
//                         "Exit",
//                         "TAT",
//                         "Bill",
//                         "Paid",
//                         "Credit",
//                         "Payment",
//                         "Guaranteed By",
//                         "SLA",
//                       ].map((h) => (
//                         <TH key={h} T={T}>
//                           {h}
//                         </TH>
//                       ))}
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {veh.map((v, i) => {
//                       const e = v.entry_time
//                         ? new Date(toZ(v.entry_time))
//                         : null;
//                       const x = v.updated_at
//                         ? new Date(toZ(v.updated_at))
//                         : null;
//                       const exp = v.expected_completion_time
//                         ? new Date(toZ(v.expected_completion_time))
//                         : null;
//                       const tat = e && x ? Math.round((x - e) / 60000) : null;
//                       const sla =
//                         exp && x ? (
//                           x > exp ? (
//                             <Chip color={T.red} bg={T.redLight}>
//                               Breached
//                             </Chip>
//                           ) : (
//                             <Chip color={T.green} bg={T.greenLight}>
//                               On Time
//                             </Chip>
//                           )
//                         ) : (
//                           <span style={{ color: T.textMuted }}>—</span>
//                         );
//                       return (
//                         <tr
//                           key={v.id}
//                           onMouseEnter={(e) =>
//                             (e.currentTarget.style.background =
//                               T.surfaceElevated)
//                           }
//                           onMouseLeave={(e) =>
//                             (e.currentTarget.style.background = "transparent")
//                           }
//                         >
//                           <TD
//                             T={T}
//                             style={{
//                               color: T.textMuted,
//                               fontFamily: "'DM Mono',monospace",
//                               fontSize: 11,
//                             }}
//                           >
//                             {i + 1}
//                           </TD>
//                           <TD T={T}>
//                             <span
//                               style={{
//                                 fontWeight: 800,
//                                 fontFamily: "'DM Mono',monospace",
//                                 color: T.text,
//                               }}
//                             >
//                               {v.vehicle_number}
//                             </span>
//                           </TD>
//                           <TD T={T}>{v.customer_name || "—"}</TD>
//                           <TD T={T} style={{ color: T.textSecondary }}>
//                             {v.customer_phone || "—"}
//                           </TD>
//                           <TD T={T}>
//                             {v.model ? (
//                               <Chip color={T.blue} bg={T.blueLight}>
//                                 {v.model}
//                               </Chip>
//                             ) : (
//                               "—"
//                             )}
//                           </TD>
//                           <TD
//                             T={T}
//                             style={{
//                               color: T.textSecondary,
//                               fontFamily: "'DM Mono',monospace",
//                             }}
//                           >
//                             {v.odometer_reading
//                               ? `${v.odometer_reading} km`
//                               : "—"}
//                           </TD>
//                           <TD
//                             T={T}
//                             style={{
//                               textTransform: "capitalize",
//                               fontSize: 11,
//                             }}
//                           >
//                             {v.service_type?.replace(/_/g, " ") || "—"}
//                           </TD>
//                           <TD T={T}>
//                             {v.priority !== "normal" ? (
//                               <Chip
//                                 color={v.priority === "vip" ? T.purple : T.red}
//                                 bg={
//                                   v.priority === "vip"
//                                     ? T.purpleLight
//                                     : T.redLight
//                                 }
//                               >
//                                 {v.priority.toUpperCase()}
//                               </Chip>
//                             ) : (
//                               <span
//                                 style={{ color: T.textMuted, fontSize: 11 }}
//                               >
//                                 Normal
//                               </span>
//                             )}
//                           </TD>
//                           <TD
//                             T={T}
//                             style={{ color: T.textSecondary, fontSize: 11 }}
//                           >
//                             {v.advisor?.full_name || "—"}
//                           </TD>
//                           <TD
//                             T={T}
//                             style={{ color: T.textMuted, fontSize: 10 }}
//                           >
//                             {formatIST(v.entry_time)}
//                           </TD>
//                           <TD
//                             T={T}
//                             style={{ color: T.textMuted, fontSize: 10 }}
//                           >
//                             {formatIST(v.updated_at)}
//                           </TD>
//                           <TD
//                             T={T}
//                             style={{
//                               fontFamily: "'DM Mono',monospace",
//                               fontSize: 11,
//                             }}
//                           >
//                             {tat ? fmtMins(tat) : "—"}
//                           </TD>
//                           <TD T={T}>
//                             {v.bill_amount > 0 ? (
//                               <span
//                                 style={{
//                                   fontFamily: "'DM Mono',monospace",
//                                   fontWeight: 800,
//                                   color: T.green,
//                                   fontSize: 12,
//                                 }}
//                               >
//                                 {fmt(v.bill_amount)}
//                               </span>
//                             ) : (
//                               "—"
//                             )}
//                           </TD>
//                           <TD T={T}>
//                             {v.total_paid > 0 ? (
//                               <span
//                                 style={{
//                                   fontFamily: "'DM Mono',monospace",
//                                   color: T.green,
//                                   fontSize: 12,
//                                 }}
//                               >
//                                 {fmt(v.total_paid)}
//                               </span>
//                             ) : (
//                               "—"
//                             )}
//                           </TD>
//                           <TD T={T}>
//                             {v.credit_amount > 0 ? (
//                               <span
//                                 style={{
//                                   fontFamily: "'DM Mono',monospace",
//                                   fontWeight: 800,
//                                   color: T.amber,
//                                   fontSize: 12,
//                                 }}
//                               >
//                                 {fmt(v.credit_amount)}
//                               </span>
//                             ) : (
//                               "—"
//                             )}
//                           </TD>
//                           <TD T={T}>
//                             {v.payment_status ? (
//                               <Chip
//                                 color={
//                                   v.payment_status === "paid"
//                                     ? T.green
//                                     : v.payment_status === "credit"
//                                       ? T.amber
//                                       : T.blue
//                                 }
//                                 bg={
//                                   v.payment_status === "paid"
//                                     ? T.greenLight
//                                     : v.payment_status === "credit"
//                                       ? T.amberLight
//                                       : T.blueLight
//                                 }
//                               >
//                                 {v.payment_status}
//                               </Chip>
//                             ) : (
//                               "—"
//                             )}
//                           </TD>
//                           <TD T={T} style={{ color: T.amber, fontSize: 11 }}>
//                             {v.credit_guaranteed_by || "—"}
//                           </TD>
//                           <TD T={T}>{sla}</TD>
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               </div>
//             </Bx>
//           )}

//           {veh.length === 0 && (
//             <Empty
//               T={T}
//               icon="📊"
//               text="No completed vehicles in this date range"
//             />
//           )}
//         </>
//       )}
//     </div>
//   );
// }

// // ─── TEAM TAB ─────────────────────────────────────────────────────────────────
// function TeamTab({ T, users, teams, onRefresh }) {
//   const [sub, setSub] = useState("users");
//   const [showAddUser, setShowAddUser] = useState(false);
//   const [showAddTeam, setShowAddTeam] = useState(false);
//   const [editUser, setEditUser] = useState(null);
//   const [editTeam, setEditTeam] = useState(null);
//   const [srch, setSrch] = useState("");
//   const [rf, setRf] = useState("all");

//   const filtU = users.filter((u) => {
//     const m =
//       !srch.trim() ||
//       u.full_name?.toLowerCase().includes(srch.toLowerCase()) ||
//       u.phone?.includes(srch);
//     return m && (rf === "all" || u.role === rf);
//   });

//   const toggle = async (u) => {
//     if (!confirm(`${u.is_active ? "Deactivate" : "Activate"} ${u.full_name}?`))
//       return;
//     await supabase
//       .from("users")
//       .update({ is_active: !u.is_active })
//       .eq("id", u.id);
//     onRefresh();
//   };

//   return (
//     <div>
//       <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
//         {[
//           ["users", "👥 Users"],
//           ["teams", "🏢 Teams"],
//         ].map(([k, l]) => (
//           <Btn
//             key={k}
//             T={T}
//             v={sub === k ? "primary" : "secondary"}
//             onClick={() => setSub(k)}
//           >
//             {l}
//           </Btn>
//         ))}
//       </div>

//       {sub === "users" && (
//         <div>
//           <div
//             style={{
//               display: "flex",
//               justifyContent: "space-between",
//               alignItems: "center",
//               marginBottom: 12,
//               flexWrap: "wrap",
//               gap: 10,
//             }}
//           >
//             <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
//               <input
//                 value={srch}
//                 onChange={(e) => setSrch(e.target.value)}
//                 placeholder="Search name or phone..."
//                 style={{
//                   padding: "7px 12px",
//                   border: `1px solid ${T.border}`,
//                   borderRadius: 6,
//                   fontSize: 13,
//                   fontFamily: "inherit",
//                   background: T.surface,
//                   color: T.text,
//                   outline: "none",
//                   width: 210,
//                 }}
//               />
//               <select
//                 value={rf}
//                 onChange={(e) => setRf(e.target.value)}
//                 style={{
//                   padding: "7px 12px",
//                   border: `1px solid ${T.border}`,
//                   borderRadius: 6,
//                   fontSize: 13,
//                   fontFamily: "inherit",
//                   background: T.surface,
//                   color: T.text,
//                   cursor: "pointer",
//                 }}
//               >
//                 <option value="all">All Roles</option>
//                 {ALL_ROLES.map((r) => (
//                   <option key={r} value={r}>
//                     {ROLE_LABELS[r] || r}
//                   </option>
//                 ))}
//               </select>
//             </div>
//             <Btn T={T} v="primary" onClick={() => setShowAddUser(true)}>
//               + Add User
//             </Btn>
//           </div>
//           <Bx T={T}>
//             <div style={{ overflowX: "auto" }}>
//               <table style={{ width: "100%", borderCollapse: "collapse" }}>
//                 <thead>
//                   <tr>
//                     {[
//                       "Name",
//                       "Phone",
//                       "Role",
//                       "Team",
//                       "Auth",
//                       "Status",
//                       "Actions",
//                     ].map((h) => (
//                       <TH key={h} T={T}>
//                         {h}
//                       </TH>
//                     ))}
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {filtU.map((u) => {
//                     const team = teams.find((t) => t.id === u.team_id);
//                     return (
//                       <tr
//                         key={u.id}
//                         onMouseEnter={(e) =>
//                           (e.currentTarget.style.background = T.surfaceElevated)
//                         }
//                         onMouseLeave={(e) =>
//                           (e.currentTarget.style.background = "transparent")
//                         }
//                       >
//                         <TD T={T}>
//                           <span style={{ fontWeight: 700 }}>{u.full_name}</span>
//                         </TD>
//                         <TD T={T} style={{ fontFamily: "'DM Mono',monospace" }}>
//                           {u.phone}
//                         </TD>
//                         <TD T={T}>
//                           <Chip color={T.blue} bg={T.blueLight}>
//                             {ROLE_LABELS[u.role] || u.role}
//                           </Chip>
//                         </TD>
//                         <TD
//                           T={T}
//                           style={{ color: T.textSecondary, fontSize: 12 }}
//                         >
//                           {team?.name || "—"}
//                         </TD>
//                         <TD T={T}>
//                           <Chip
//                             color={u.auth_id ? T.green : T.amber}
//                             bg={u.auth_id ? T.greenLight : T.amberLight}
//                           >
//                             {u.auth_id ? "✅ Linked" : "⚠️ Legacy"}
//                           </Chip>
//                         </TD>
//                         <TD T={T}>
//                           <Chip
//                             color={u.is_active ? T.green : T.red}
//                             bg={u.is_active ? T.greenLight : T.redLight}
//                           >
//                             {u.is_active ? "Active" : "Inactive"}
//                           </Chip>
//                         </TD>
//                         <TD T={T}>
//                           <div style={{ display: "flex", gap: 5 }}>
//                             <Btn
//                               T={T}
//                               v="ghost"
//                               sz="sm"
//                               onClick={() => setEditUser(u)}
//                             >
//                               Edit
//                             </Btn>
//                             <Btn
//                               T={T}
//                               v={u.is_active ? "danger" : "success"}
//                               sz="sm"
//                               onClick={() => toggle(u)}
//                             >
//                               {u.is_active ? "Deactivate" : "Activate"}
//                             </Btn>
//                           </div>
//                         </TD>
//                       </tr>
//                     );
//                   })}
//                 </tbody>
//               </table>
//               {filtU.length === 0 && (
//                 <Empty T={T} icon="👤" text="No users found" />
//               )}
//             </div>
//           </Bx>
//         </div>
//       )}

//       {sub === "teams" && (
//         <div>
//           <div
//             style={{
//               display: "flex",
//               justifyContent: "flex-end",
//               marginBottom: 12,
//             }}
//           >
//             <Btn T={T} v="primary" onClick={() => setShowAddTeam(true)}>
//               + Create Team
//             </Btn>
//           </div>
//           <div
//             style={{
//               display: "grid",
//               gridTemplateColumns: "repeat(3,1fr)",
//               gap: 14,
//             }}
//           >
//             {teams.map((team) => {
//               const dm = STAGE_META[team.role] || { icon: "👥", color: T.blue };
//               const mems = users.filter((u) => u.team_id === team.id);
//               return (
//                 <Bx
//                   T={T}
//                   key={team.id}
//                   style={{ borderTop: `3px solid ${dm.color}` }}
//                 >
//                   <div
//                     style={{
//                       display: "flex",
//                       justifyContent: "space-between",
//                       alignItems: "flex-start",
//                       marginBottom: 8,
//                     }}
//                   >
//                     <div>
//                       <div
//                         style={{ fontWeight: 800, fontSize: 14, color: T.text }}
//                       >
//                         {team.name}
//                       </div>
//                       <Chip
//                         color={dm.color}
//                         bg={dm.color + "20"}
//                         style={{ marginTop: 4 }}
//                       >
//                         {dm.icon} {ROLE_LABELS[team.role] || team.role}
//                       </Chip>
//                     </div>
//                     <Btn
//                       T={T}
//                       v="ghost"
//                       sz="sm"
//                       onClick={() => setEditTeam(team)}
//                     >
//                       Edit
//                     </Btn>
//                   </div>
//                   <div
//                     style={{
//                       fontSize: 11,
//                       color: T.textMuted,
//                       marginBottom: 7,
//                     }}
//                   >
//                     {mems.length} member{mems.length !== 1 ? "s" : ""}
//                   </div>
//                   <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
//                     {mems.map((m) => (
//                       <Chip
//                         key={m.id}
//                         color={T.textSecondary}
//                         bg={T.surfaceElevated}
//                       >
//                         {m.full_name}
//                       </Chip>
//                     ))}
//                     {mems.length === 0 && (
//                       <span
//                         style={{
//                           fontSize: 11,
//                           color: T.textMuted,
//                           fontStyle: "italic",
//                         }}
//                       >
//                         No members
//                       </span>
//                     )}
//                   </div>
//                 </Bx>
//               );
//             })}
//           </div>
//           {teams.length === 0 && <Empty T={T} icon="🏢" text="No teams yet" />}
//         </div>
//       )}

//       {showAddUser && (
//         <AddUserDlg
//           T={T}
//           onClose={() => setShowAddUser(false)}
//           onSuccess={() => {
//             setShowAddUser(false);
//             onRefresh();
//           }}
//         />
//       )}
//       {showAddTeam && (
//         <AddTeamDlg
//           T={T}
//           onClose={() => setShowAddTeam(false)}
//           onSuccess={() => {
//             setShowAddTeam(false);
//             onRefresh();
//           }}
//         />
//       )}
//       {editUser && (
//         <EditUserDlg
//           T={T}
//           user={editUser}
//           onClose={() => setEditUser(null)}
//           onSuccess={() => {
//             setEditUser(null);
//             onRefresh();
//           }}
//         />
//       )}
//       {editTeam && (
//         <EditTeamDlg
//           T={T}
//           team={editTeam}
//           users={users}
//           onClose={() => setEditTeam(null)}
//           onSuccess={() => {
//             setEditTeam(null);
//             onRefresh();
//           }}
//         />
//       )}
//     </div>
//   );
// }

// function AddUserDlg({ T, onClose, onSuccess }) {
//   const [f, setF] = useState({
//     full_name: "",
//     phone: "",
//     password: "",
//     role: "gateman",
//   });
//   const [loading, setLoading] = useState(false);
//   const [err, setErr] = useState("");
//   const upd = (k, v) => setF((p) => ({ ...p, [k]: v }));
//   const go = async () => {
//     if (!f.full_name.trim() || !f.phone.trim() || !f.password.trim()) {
//       setErr("Name, phone and password are required");
//       return;
//     }
//     setLoading(true);
//     setErr("");
//     try {
//       const {
//         data: { session },
//       } = await supabase.auth.getSession();
//       if (!session) throw new Error("Not authenticated");
//       const { data, error: fe } = await supabase.functions.invoke(
//         "create-user",
//         {
//           body: {
//             full_name: f.full_name,
//             phone: f.phone,
//             password: f.password,
//             role: f.role,
//           },
//         },
//       );
//       if (fe || data?.error)
//         throw new Error(fe?.message || data?.error || "Failed");
//       onSuccess();
//     } catch (e) {
//       setErr(e.message);
//       setLoading(false);
//     }
//   };
//   return (
//     <Dlg T={T} open={true} onClose={onClose} title="Add New User">
//       <Inp
//         T={T}
//         label="Full Name"
//         value={f.full_name}
//         onChange={(v) => upd("full_name", v)}
//         required
//       />
//       <Inp
//         T={T}
//         label="Phone (login)"
//         value={f.phone}
//         onChange={(v) => upd("phone", v)}
//         required
//       />
//       <Inp
//         T={T}
//         label="Password"
//         value={f.password}
//         onChange={(v) => upd("password", v)}
//         required
//       />
//       <Sel
//         T={T}
//         label="Role"
//         value={f.role}
//         onChange={(v) => upd("role", v)}
//         options={ALL_ROLES.map((r) => ({
//           value: r,
//           label: ROLE_LABELS[r] || r,
//         }))}
//       />
//       {err && (
//         <div
//           style={{
//             background: T.redLight,
//             color: T.red,
//             padding: "9px 12px",
//             borderRadius: 6,
//             fontSize: 13,
//             marginBottom: 12,
//           }}
//         >
//           {err}
//         </div>
//       )}
//       <div style={{ display: "flex", gap: 8 }}>
//         <Btn
//           T={T}
//           v="secondary"
//           onClick={onClose}
//           style={{ flex: 1, justifyContent: "center" }}
//         >
//           Cancel
//         </Btn>
//         <Btn
//           T={T}
//           v="primary"
//           onClick={go}
//           disabled={loading}
//           style={{ flex: 2, justifyContent: "center" }}
//         >
//           {loading ? "Adding..." : "Add User"}
//         </Btn>
//       </div>
//     </Dlg>
//   );
// }

// function EditUserDlg({ T, user, onClose, onSuccess }) {
//   const [f, setF] = useState({
//     full_name: user.full_name,
//     phone: user.phone,
//     password: "",
//     role: user.role,
//   });
//   const [loading, setLoading] = useState(false);
//   const [err, setErr] = useState("");
//   const upd = (k, v) => setF((p) => ({ ...p, [k]: v }));
//   const go = async () => {
//     if (!f.full_name.trim()) {
//       setErr("Name required");
//       return;
//     }
//     setLoading(true);
//     setErr("");
//     try {
//       const {
//         data: { session },
//       } = await supabase.auth.getSession();
//       if (!session) throw new Error("Not authenticated");
//       const { data, error: fe } = await supabase.functions.invoke(
//         "create-user",
//         {
//           body: {
//             action: "update",
//             user_id: user.id,
//             full_name: f.full_name,
//             phone: f.phone,
//             password: f.password || null,
//             role: f.role,
//           },
//         },
//       );
//       if (fe || data?.error)
//         throw new Error(fe?.message || data?.error || "Failed");
//       onSuccess();
//     } catch (e) {
//       setErr(e.message);
//       setLoading(false);
//     }
//   };
//   return (
//     <Dlg T={T} open={true} onClose={onClose} title={`Edit — ${user.full_name}`}>
//       <div
//         style={{
//           padding: "7px 12px",
//           borderRadius: 6,
//           fontSize: 12,
//           marginBottom: 12,
//           background: user.auth_id ? T.greenLight : T.amberLight,
//           color: user.auth_id ? T.green : T.amber,
//         }}
//       >
//         {user.auth_id
//           ? "✅ Linked to Supabase Auth — changes sync to login"
//           : "⚠️ No Auth linked — password only updates local record"}
//       </div>
//       <Inp
//         T={T}
//         label="Full Name"
//         value={f.full_name}
//         onChange={(v) => upd("full_name", v)}
//         required
//       />
//       <Inp
//         T={T}
//         label="Phone"
//         value={f.phone}
//         onChange={(v) => upd("phone", v)}
//       />
//       <Inp
//         T={T}
//         label="New Password (leave blank to keep)"
//         value={f.password}
//         onChange={(v) => upd("password", v)}
//         placeholder="Leave blank to keep"
//       />
//       <Sel
//         T={T}
//         label="Role"
//         value={f.role}
//         onChange={(v) => upd("role", v)}
//         options={ALL_ROLES.map((r) => ({
//           value: r,
//           label: ROLE_LABELS[r] || r,
//         }))}
//       />
//       {err && (
//         <div
//           style={{
//             background: T.redLight,
//             color: T.red,
//             padding: "9px 12px",
//             borderRadius: 6,
//             fontSize: 13,
//             marginBottom: 12,
//           }}
//         >
//           {err}
//         </div>
//       )}
//       <div style={{ display: "flex", gap: 8 }}>
//         <Btn
//           T={T}
//           v="secondary"
//           onClick={onClose}
//           style={{ flex: 1, justifyContent: "center" }}
//         >
//           Cancel
//         </Btn>
//         <Btn
//           T={T}
//           v="primary"
//           onClick={go}
//           disabled={loading}
//           style={{ flex: 2, justifyContent: "center" }}
//         >
//           {loading ? "Saving..." : "Save Changes"}
//         </Btn>
//       </div>
//     </Dlg>
//   );
// }

// function AddTeamDlg({ T, onClose, onSuccess }) {
//   const [name, setName] = useState("");
//   const [role, setRole] = useState("mechanic");
//   const [loading, setLoading] = useState(false);
//   const [err, setErr] = useState("");
//   const go = async () => {
//     if (!name.trim()) {
//       setErr("Team name required");
//       return;
//     }
//     setLoading(true);
//     try {
//       const { error: e } = await supabase
//         .from("teams")
//         .insert([{ name: name.trim(), role }]);
//       if (e) throw e;
//       onSuccess();
//     } catch (e) {
//       setErr(e.message);
//       setLoading(false);
//     }
//   };
//   return (
//     <Dlg
//       T={T}
//       open={true}
//       onClose={onClose}
//       title="Create New Team"
//       width={420}
//     >
//       <Inp
//         T={T}
//         label="Team Name"
//         value={name}
//         onChange={setName}
//         required
//         placeholder="e.g. Team Alpha"
//       />
//       <Sel
//         T={T}
//         label="Department"
//         value={role}
//         onChange={setRole}
//         options={TEAM_ROLES.map((r) => ({
//           value: r,
//           label: ROLE_LABELS[r] || r,
//         }))}
//       />
//       {err && (
//         <div
//           style={{
//             background: T.redLight,
//             color: T.red,
//             padding: "9px 12px",
//             borderRadius: 6,
//             fontSize: 13,
//             marginBottom: 12,
//           }}
//         >
//           {err}
//         </div>
//       )}
//       <div style={{ display: "flex", gap: 8 }}>
//         <Btn
//           T={T}
//           v="secondary"
//           onClick={onClose}
//           style={{ flex: 1, justifyContent: "center" }}
//         >
//           Cancel
//         </Btn>
//         <Btn
//           T={T}
//           v="primary"
//           onClick={go}
//           disabled={loading}
//           style={{ flex: 2, justifyContent: "center" }}
//         >
//           {loading ? "Creating..." : "Create Team"}
//         </Btn>
//       </div>
//     </Dlg>
//   );
// }

// function EditTeamDlg({ T, team, users, onClose, onSuccess }) {
//   const [name, setName] = useState(team.name);
//   const [loading, setLoading] = useState(false);
//   const [err, setErr] = useState("");
//   const members = users.filter((u) => u.team_id === team.id);
//   const avail = users.filter(
//     (u) => u.role === team.role && u.team_id !== team.id && u.is_active,
//   );
//   const saveName = async () => {
//     if (!name.trim()) {
//       setErr("Name required");
//       return;
//     }
//     setLoading(true);
//     try {
//       const { error: e } = await supabase
//         .from("teams")
//         .update({ name: name.trim() })
//         .eq("id", team.id);
//       if (e) throw e;
//       onSuccess();
//     } catch (e) {
//       setErr(e.message);
//       setLoading(false);
//     }
//   };
//   const add = async (uid) => {
//     await supabase.from("users").update({ team_id: team.id }).eq("id", uid);
//     onSuccess();
//   };
//   const rem = async (uid) => {
//     if (!confirm("Remove from team?")) return;
//     await supabase.from("users").update({ team_id: null }).eq("id", uid);
//     onSuccess();
//   };
//   const del = async () => {
//     if (members.length > 0) {
//       alert("Remove all members first");
//       return;
//     }
//     if (!confirm(`Delete "${team.name}"?`)) return;
//     await supabase.from("teams").delete().eq("id", team.id);
//     onSuccess();
//   };
//   return (
//     <Dlg
//       T={T}
//       open={true}
//       onClose={onClose}
//       title={`Edit — ${team.name}`}
//       width={560}
//     >
//       <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
//         <input
//           value={name}
//           onChange={(e) => setName(e.target.value)}
//           style={{
//             flex: 1,
//             padding: "8px 12px",
//             border: `1px solid ${T.border}`,
//             borderRadius: 6,
//             fontSize: 14,
//             fontFamily: "inherit",
//             background: T.surface,
//             color: T.text,
//           }}
//         />
//         <Btn T={T} v="secondary" onClick={saveName} disabled={loading}>
//           Save Name
//         </Btn>
//         <Btn T={T} v="danger" onClick={del}>
//           Delete
//         </Btn>
//       </div>
//       {err && (
//         <div
//           style={{
//             background: T.redLight,
//             color: T.red,
//             padding: "8px 12px",
//             borderRadius: 6,
//             fontSize: 12,
//             marginBottom: 12,
//           }}
//         >
//           {err}
//         </div>
//       )}
//       <div style={{ marginBottom: 14 }}>
//         <div
//           style={{
//             fontSize: 10,
//             fontWeight: 800,
//             color: T.textMuted,
//             textTransform: "uppercase",
//             marginBottom: 7,
//           }}
//         >
//           Members ({members.length})
//         </div>
//         {members.length === 0 ? (
//           <div
//             style={{ fontSize: 13, color: T.textMuted, fontStyle: "italic" }}
//           >
//             No members
//           </div>
//         ) : (
//           members.map((m) => (
//             <div
//               key={m.id}
//               style={{
//                 display: "flex",
//                 justifyContent: "space-between",
//                 alignItems: "center",
//                 padding: "7px 12px",
//                 background: T.surfaceElevated,
//                 borderRadius: 6,
//                 marginBottom: 5,
//               }}
//             >
//               <div>
//                 <span style={{ fontWeight: 600, color: T.text }}>
//                   {m.full_name}
//                 </span>
//                 <span
//                   style={{ fontSize: 11, color: T.textMuted, marginLeft: 10 }}
//                 >
//                   {m.phone}
//                 </span>
//               </div>
//               <Btn T={T} v="danger" sz="sm" onClick={() => rem(m.id)}>
//                 Remove
//               </Btn>
//             </div>
//           ))
//         )}
//       </div>
//       <div>
//         <div
//           style={{
//             fontSize: 10,
//             fontWeight: 800,
//             color: T.textMuted,
//             textTransform: "uppercase",
//             marginBottom: 7,
//           }}
//         >
//           Add Members
//         </div>
//         {avail.length === 0 ? (
//           <div
//             style={{ fontSize: 13, color: T.textMuted, fontStyle: "italic" }}
//           >
//             No available {ROLE_LABELS[team.role]} users
//           </div>
//         ) : (
//           avail.map((u) => (
//             <div
//               key={u.id}
//               style={{
//                 display: "flex",
//                 justifyContent: "space-between",
//                 alignItems: "center",
//                 padding: "7px 12px",
//                 background: T.greenLight,
//                 borderRadius: 6,
//                 marginBottom: 5,
//               }}
//             >
//               <span style={{ fontWeight: 600, color: T.text }}>
//                 {u.full_name}
//               </span>
//               <Btn T={T} v="success" sz="sm" onClick={() => add(u.id)}>
//                 + Add
//               </Btn>
//             </div>
//           ))
//         )}
//       </div>
//     </Dlg>
//   );
// }

// // ─── Search Modal ─────────────────────────────────────────────────────────────
// function SearchModal({ T, onClose, onSelect }) {
//   const [q, setQ] = useState("");
//   const [results, setResults] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const ref = useRef(null);
//   useEffect(() => {
//     ref.current?.focus();
//   }, []);
//   useEffect(() => {
//     if (q.trim().length < 2) {
//       setResults([]);
//       return;
//     }
//     const t = setTimeout(async () => {
//       setLoading(true);
//       const { data } = await supabase
//         .from("vehicles")
//         .select("*,work_stages(*)")
//         .or(
//           `vehicle_number.ilike.%${q}%,customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%`,
//         )
//         .order("entry_time", { ascending: false })
//         .limit(20);
//       setResults(data || []);
//       setLoading(false);
//     }, 350);
//     return () => clearTimeout(t);
//   }, [q]);
//   return (
//     <Dlg
//       T={T}
//       open={true}
//       onClose={onClose}
//       title="Search Vehicles"
//       width={640}
//     >
//       <input
//         ref={ref}
//         value={q}
//         onChange={(e) => setQ(e.target.value)}
//         placeholder="Vehicle number, customer name, phone..."
//         autoCapitalize="characters"
//         style={{
//           width: "100%",
//           padding: "10px 14px",
//           border: `2px solid #f59e0b`,
//           borderRadius: 8,
//           fontSize: 15,
//           fontFamily: "inherit",
//           background: T.surface,
//           color: T.text,
//           outline: "none",
//           marginBottom: 12,
//           boxSizing: "border-box",
//         }}
//       />
//       {loading && (
//         <div style={{ textAlign: "center", padding: 20, color: T.textMuted }}>
//           Searching...
//         </div>
//       )}
//       {!loading && q.length >= 2 && results.length === 0 && (
//         <Empty T={T} icon="🔍" text={`No vehicles found for "${q}"`} />
//       )}
//       {results.map((v) => {
//         const meta = STAGE_META[v.current_stage] || {
//           icon: "🚗",
//           color: T.blue,
//           label: v.current_stage,
//         };
//         return (
//           <div
//             key={v.id}
//             onClick={() => {
//               onSelect(v);
//               onClose();
//             }}
//             style={{
//               display: "flex",
//               justifyContent: "space-between",
//               alignItems: "center",
//               padding: "11px 14px",
//               borderRadius: 8,
//               border: `1px solid ${T.border}`,
//               borderLeft: `3px solid ${meta.color}`,
//               marginBottom: 7,
//               cursor: "pointer",
//               background: T.surface,
//             }}
//             onMouseEnter={(e) =>
//               (e.currentTarget.style.background = T.surfaceElevated)
//             }
//             onMouseLeave={(e) => (e.currentTarget.style.background = T.surface)}
//           >
//             <div>
//               <div
//                 style={{
//                   display: "flex",
//                   alignItems: "center",
//                   gap: 8,
//                   marginBottom: 4,
//                 }}
//               >
//                 <span
//                   style={{
//                     fontWeight: 800,
//                     fontSize: 15,
//                     fontFamily: "'DM Mono',monospace",
//                     color: T.text,
//                   }}
//                 >
//                   {v.vehicle_number}
//                 </span>
//                 {v.model && (
//                   <Chip color={T.blue} bg={T.blueLight}>
//                     {v.model}
//                   </Chip>
//                 )}
//                 {v.priority !== "normal" && (
//                   <Chip
//                     color={v.priority === "vip" ? T.purple : T.red}
//                     bg={v.priority === "vip" ? T.purpleLight : T.redLight}
//                   >
//                     {v.priority.toUpperCase()}
//                   </Chip>
//                 )}
//               </div>
//               <div style={{ fontSize: 13, color: T.textSecondary }}>
//                 {v.customer_name || "—"} • {v.customer_phone || "—"}
//               </div>
//               {v.work_stages?.[0] && <WorkBadges T={T} ws={v.work_stages[0]} />}
//             </div>
//             <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 14 }}>
//               <Chip color={meta.color} bg={meta.color + "22"}>
//                 {meta.icon} {meta.label}
//               </Chip>
//               <div style={{ fontSize: 10, color: T.textMuted, marginTop: 5 }}>
//                 {formatIST(v.entry_time)}
//               </div>
//             </div>
//           </div>
//         );
//       })}
//     </Dlg>
//   );
// }

// // ─── MAIN ─────────────────────────────────────────────────────────────────────
// function OwnerDashboard({ user, onLogout }) {
//   // Dark mode — manual toggle, persisted in localStorage
//   const [dark, setDark] = useState(() => {
//     try {
//       return localStorage.getItem("ownerDarkMode") === "true";
//     } catch {
//       return false;
//     }
//   });
//   const T = useMemo(() => makeTheme(dark), [dark]);
//   const toggleDark = () =>
//     setDark((d) => {
//       const n = !d;
//       try {
//         localStorage.setItem("ownerDarkMode", String(n));
//       } catch {}
//       return n;
//     });

//   const [tab, setTab] = useState("overview");
//   const [vehicles, setVehicles] = useState([]);
//   const [creditVehicles, setCreditVehicles] = useState([]);
//   const [allPayments, setAllPayments] = useState([]);
//   const [todayPayments, setTodayPayments] = useState([]);
//   const [teams, setTeams] = useState([]);
//   const [users, setUsers] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [selVehicle, setSelVehicle] = useState(null);
//   const [quickView, setQuickView] = useState(null);
//   const [showSearch, setShowSearch] = useState(false);
//   const [reportData, setReportData] = useState({
//     vehicles: [],
//     payments: [],
//     history: [],
//   });
//   const [reportLoading, setReportLoading] = useState(false);
//   const [collapsed, setCollapsed] = useState(false);

//   const fetchAll = useCallback(async () => {
//     try {
//       const ts = getISTMidnightUTC();
//       const [vr, tp, ap, cr, tr, ur] = await Promise.all([
//         supabase
//           .from("vehicles")
//           .select(
//             "*,work_stages(*),customer_complaints(count),advisor:users!vehicles_advisor_id_fkey(full_name)",
//           )
//           .or(`current_stage.neq.completed,entry_time.gte.${ts}`)
//           .order("entry_time", { ascending: false }),
//         supabase
//           .from("payments")
//           .select(
//             "*,vehicle:vehicles!payments_vehicle_id_fkey(vehicle_number,customer_name,model,credit_guaranteed_by),collector:users!payments_collected_by_fkey(full_name)",
//           )
//           .gte("created_at", ts)
//           .order("created_at", { ascending: false }),
//         supabase
//           .from("payments")
//           .select(
//             "*,vehicle:vehicles!payments_vehicle_id_fkey(vehicle_number,customer_name,model,credit_guaranteed_by),collector:users!payments_collected_by_fkey(full_name)",
//           )
//           .order("created_at", { ascending: false })
//           .limit(500),
//         supabase
//           .from("vehicles")
//           .select(
//             "id,vehicle_number,customer_name,customer_phone,bill_amount,total_paid,credit_amount,credit_guaranteed_by,entry_time,current_stage,payment_status",
//           )
//           .gt("credit_amount", 0)
//           .order("entry_time", { ascending: false }),
//         supabase.from("teams").select("*").order("name"),
//         supabase
//           .from("users")
//           .select("id,full_name,role,team_id,is_active,phone,auth_id")
//           .order("full_name"),
//       ]);
//       setVehicles(vr.data || []);
//       setTodayPayments(tp.data || []);
//       setAllPayments(ap.data || []);
//       setCreditVehicles(cr.data || []);
//       setTeams(tr.data || []);
//       setUsers(ur.data || []);
//     } catch (e) {
//       console.error(e);
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   const fetchReport = useCallback(async (from, to) => {
//     setReportLoading(true);
//     try {
//       const f0 = from + "T00:00:00+05:30";
//       const t0 = to + "T23:59:59+05:30";
//       const [vr, pr, hr] = await Promise.all([
//         supabase
//           .from("vehicles")
//           .select(
//             "id,vehicle_number,customer_name,customer_phone,model,odometer_reading,service_type,bill_amount,credit_amount,total_paid,entry_time,updated_at,expected_completion_time,priority,payment_status,credit_guaranteed_by,advisor_id,work_stages(*),advisor:users!vehicles_advisor_id_fkey(full_name)",
//           )
//           .eq("current_stage", "completed")
//           .gte("updated_at", f0)
//           .lte("updated_at", t0)
//           .order("updated_at", { ascending: false }),
//         supabase
//           .from("payments")
//           .select(
//             "*,vehicle:vehicles!payments_vehicle_id_fkey(vehicle_number,customer_name)",
//           )
//           .gte("created_at", f0)
//           .lte("created_at", t0)
//           .order("created_at", { ascending: false }),
//         supabase
//           .from("vehicle_history")
//           .select("vehicle_id,stage,action,created_at")
//           .gte("created_at", f0)
//           .lte("created_at", t0)
//           .in("action", [
//             "started",
//             "completed",
//             "on_hold",
//             "work_started",
//             "work_completed",
//           ])
//           .order("created_at", { ascending: true }),
//       ]);
//       setReportData({
//         vehicles: vr.data || [],
//         payments: pr.data || [],
//         history: hr.data || [],
//       });
//     } catch (e) {
//       console.error(e);
//     } finally {
//       setReportLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     if (!user) return;
//     fetchAll();
//     const ch = supabase
//       .channel("owner-rt")
//       .on(
//         "postgres_changes",
//         { event: "*", schema: "public", table: "vehicles" },
//         fetchAll,
//       )
//       .on(
//         "postgres_changes",
//         { event: "*", schema: "public", table: "payments" },
//         fetchAll,
//       )
//       .subscribe();
//     return () => supabase.removeChannel(ch);
//   }, [user, fetchAll]);

//   const derived = useMemo(() => {
//     const now = new Date();
//     const istToday = new Date().toLocaleDateString("en-CA", {
//       timeZone: "Asia/Kolkata",
//     });
//     const active = vehicles.filter(
//       (v) =>
//         v.current_stage !== "completed" && v.current_stage !== "ready_for_exit",
//     );

//     const todayEntries = vehicles.filter((v) => {
//       if (!v.entry_time) return false;
//       return (
//         new Date(toZ(v.entry_time)).toLocaleDateString("en-CA", {
//           timeZone: "Asia/Kolkata",
//         }) === istToday
//       );
//     }).length;

//     const todayCompleted = vehicles.filter((v) => {
//       if (v.current_stage !== "completed") return false;
//       const raw = v.updated_at || v.entry_time;
//       if (!raw) return false;
//       return (
//         new Date(toZ(raw)).toLocaleDateString("en-CA", {
//           timeZone: "Asia/Kolkata",
//         }) === istToday
//       );
//     });

//     const overdue = active.filter(
//       (v) =>
//         v.expected_completion_time &&
//         now > new Date(toZ(v.expected_completion_time)),
//     );
//     const vipUrgent = active.filter(
//       (v) => v.priority === "vip" || v.priority === "urgent",
//     );
//     const stuck = active.filter((v) => {
//       if (v.current_stage !== "pending") return false;
//       const ws = v.work_stages?.[0];
//       if (!ws) return true;
//       return !DEPT_KEYS.some(
//         (k) =>
//           ws[`${k}_status`] === "in_progress" ||
//           ws[`${k}_status`] === "on_hold",
//       );
//     });
//     const pendingPDI = vehicles.filter((v) => v.current_stage === "pdi");
//     const pendingBilling = vehicles.filter(
//       (v) => v.current_stage === "billing",
//     );
//     const pendingPayment = vehicles.filter(
//       (v) => v.current_stage === "payment",
//     );
//     const readyForExit = vehicles.filter(
//       (v) => v.current_stage === "ready_for_exit",
//     );
//     const realP = todayPayments.filter((p) => p.payment_method !== "credit");
//     const todayCollection = realP.reduce(
//       (s, p) => s + (parseFloat(p.amount) || 0),
//       0,
//     );
//     const byMethod = {};
//     ["cash", "upi", "card", "bank_transfer"].forEach((m) => {
//       byMethod[m] = realP
//         .filter((p) => p.payment_method === m)
//         .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
//     });
//     // Credit ledger: credit_amount in the DB is a running balance per vehicle_number.
//     // The most recent visit already includes all previous unpaid credit carried forward.
//     // So total outstanding per vehicle = latest visit's credit_amount only.
//     // We still show all visits in the expanded view for transparency.
//     const cmap = {};
//     (creditVehicles || []).forEach((v) => {
//       if ((parseFloat(v.credit_amount) || 0) <= 0) return;
//       const vn = v.vehicle_number;
//       if (!cmap[vn])
//         cmap[vn] = {
//           vehicle_number: vn,
//           customer_name: v.customer_name,
//           customer_phone: v.customer_phone,
//           total_credit: 0,
//           visits: [],
//           latestEntry: null,
//         };
//       cmap[vn].visits.push(v);
//       // Track the latest entry_time to find the most recent visit
//       const entryDate = v.entry_time
//         ? new Date(toZ(v.entry_time))
//         : new Date(0);
//       if (!cmap[vn].latestEntry || entryDate > cmap[vn].latestEntry) {
//         cmap[vn].latestEntry = entryDate;
//         cmap[vn].total_credit = parseFloat(v.credit_amount) || 0; // latest visit's running balance
//       }
//     });
//     const creditGroups = Object.values(cmap).sort(
//       (a, b) => b.total_credit - a.total_credit,
//     );
//     const totalOutstandingCredit = creditGroups.reduce(
//       (s, g) => s + g.total_credit,
//       0,
//     );
//     const deptCounts = {};
//     const deptVehicles = {};
//     DEPT_KEYS.forEach((d) => {
//       const list = active.filter((v) => {
//         const ws = v.work_stages?.[0];
//         return ws?.[`${d}_required`] && ws?.[`${d}_status`] !== "completed";
//       });
//       deptCounts[d] = list.length;
//       deptVehicles[d] = list;
//     });
//     const todayEntriesVehicles = vehicles.filter((v) => {
//       if (!v.entry_time) return false;
//       return (
//         new Date(toZ(v.entry_time)).toLocaleDateString("en-CA", {
//           timeZone: "Asia/Kolkata",
//         }) === istToday
//       );
//     });
//     const advisorLoads = users
//       .filter((u) => u.role === "advisor")
//       .map((a) => ({
//         ...a,
//         activeVehicles: active.filter((v) => v.advisor_id === a.id),
//       }));
//     const teamLoads = teams.map((t) => ({
//       ...t,
//       activeVehicles: active.filter((v) => {
//         const ws = v.work_stages?.[0];
//         return (
//           ws?.[`${t.role}_team_id`] === t.id &&
//           ws?.[`${t.role}_status`] !== "completed"
//         );
//       }),
//       members: users.filter((u) => u.team_id === t.id),
//     }));
//     const roleGroups = {};
//     ALL_ROLES.filter((r) => r !== "owner").forEach((role) => {
//       const mems = users.filter((u) => u.role === role && u.is_active);
//       if (!mems.length) return;
//       const rt = TEAM_ROLES.includes(role)
//         ? teams.filter((t) => t.role === role)
//         : [];
//       const um = TEAM_ROLES.includes(role)
//         ? mems.filter(
//             (m) => !m.team_id || !teams.find((t) => t.id === m.team_id),
//           )
//         : mems;
//       roleGroups[role] = {
//         members: mems,
//         roleTeams: rt,
//         unassignedMembers: um,
//       };
//     });
//     return {
//       activeVehicles: active,
//       todayEntries,
//       todayCompleted,
//       todayEntriesVehicles,
//       overdue,
//       vipUrgent,
//       stuckVehicles: stuck,
//       pendingPDI,
//       pendingBilling,
//       pendingPayment,
//       readyForExit,
//       todayCollection,
//       byMethod,
//       totalOutstandingCredit,
//       creditGroups,
//       deptCounts,
//       deptVehicles,
//       advisorLoads,
//       teamLoads,
//       roleGroups,
//     };
//   }, [vehicles, todayPayments, teams, users, creditVehicles]);

//   if (loading)
//     return (
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "center",
//           alignItems: "center",
//           minHeight: "100vh",
//           background: dark ? "#0f172a" : "#f8fafc",
//           flexDirection: "column",
//           gap: 14,
//         }}
//       >
//         <div
//           style={{
//             width: 44,
//             height: 44,
//             border: `4px solid ${dark ? "#334155" : "#e2e8f0"}`,
//             borderTop: "4px solid #f59e0b",
//             borderRadius: "50%",
//             animation: "spin 0.8s linear infinite",
//           }}
//         />
//         <div style={{ fontSize: 14, color: "#94a3b8", fontWeight: 500 }}>
//           Loading Dashboard...
//         </div>
//         <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
//       </div>
//     );

//   const TABS = [
//     {
//       key: "overview",
//       icon: "🏠",
//       label: "Overview",
//       alert: derived.overdue.length + derived.stuckVehicles.length,
//     },
//     {
//       key: "floor",
//       icon: "🏭",
//       label: "Floor",
//       alert: derived.activeVehicles.length,
//     },
//     { key: "finance", icon: "💰", label: "Finance", alert: null },
//     { key: "staff", icon: "👥", label: "Staff", alert: null },
//     { key: "reports", icon: "📊", label: "Reports", alert: null },
//     { key: "team", icon: "⚙️", label: "Team", alert: null },
//   ];

//   return (
//     <div
//       style={{
//         display: "flex",
//         height: "100vh",
//         overflow: "hidden",
//         background: T.bg,
//         fontFamily: "'DM Sans',sans-serif",
//         color: T.text,
//       }}
//     >
//       <style>
//         {FONT}
//         {`
//         *{box-sizing:border-box;}
//         ::-webkit-scrollbar{width:5px;height:5px;}
//         ::-webkit-scrollbar-track{background:${T.surfaceElevated};}
//         ::-webkit-scrollbar-thumb{background:${T.borderStrong};border-radius:3px;}
//         input[type="date"]::-webkit-calendar-picker-indicator{cursor:pointer;filter:${dark ? "invert(0.7)" : "none"};}
//         select option{background:${T.surface};color:${T.text};}
//       `}
//       </style>

//       {/* Sidebar — always dark, fixed height, never scrolls with content */}
//       <div
//         style={{
//           width: collapsed ? 60 : 216,
//           background: "#0f172a",
//           display: "flex",
//           flexDirection: "column",
//           flexShrink: 0,
//           transition: "width 0.2s",
//           overflow: "hidden",
//           height: "100vh",
//           zIndex: 100,
//         }}
//       >
//         <div
//           style={{
//             padding: collapsed ? "16px 12px" : "16px 14px",
//             borderBottom: "1px solid #1e293b",
//             display: "flex",
//             alignItems: "center",
//             gap: 10,
//           }}
//         >
//           <div
//             style={{
//               width: 34,
//               height: 34,
//               background: "#f59e0b",
//               borderRadius: 8,
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               fontWeight: 900,
//               color: "#fff",
//               fontSize: 15,
//               flexShrink: 0,
//             }}
//           >
//             S
//           </div>
//           {!collapsed && (
//             <div>
//               <div style={{ color: "#f8fafc", fontWeight: 800, fontSize: 12 }}>
//                 Sheetal
//               </div>
//               <div style={{ color: "#64748b", fontSize: 10 }}>
//                 Service Center
//               </div>
//             </div>
//           )}
//         </div>
//         <nav style={{ flex: 1, padding: "8px 5px", overflowY: "auto" }}>
//           {TABS.map((t) => {
//             const a = tab === t.key;
//             return (
//               <div
//                 key={t.key}
//                 onClick={() => setTab(t.key)}
//                 style={{
//                   display: "flex",
//                   alignItems: "center",
//                   gap: 9,
//                   padding: collapsed ? "9px 13px" : "9px 11px",
//                   borderRadius: 7,
//                   cursor: "pointer",
//                   marginBottom: 2,
//                   background: a ? "rgba(245,158,11,0.18)" : "transparent",
//                   borderLeft: a ? "3px solid #f59e0b" : "3px solid transparent",
//                   transition: "all 0.12s",
//                 }}
//                 onMouseEnter={(e) => {
//                   if (!a) e.currentTarget.style.background = "#1e293b";
//                 }}
//                 onMouseLeave={(e) => {
//                   if (!a) e.currentTarget.style.background = "transparent";
//                 }}
//               >
//                 <span style={{ fontSize: 16, flexShrink: 0 }}>{t.icon}</span>
//                 {!collapsed && (
//                   <span
//                     style={{
//                       fontSize: 13,
//                       fontWeight: a ? 700 : 500,
//                       color: a ? "#f59e0b" : "#94a3b8",
//                       flex: 1,
//                     }}
//                   >
//                     {t.label}
//                   </span>
//                 )}
//                 {!collapsed && t.alert > 0 && (
//                   <span
//                     style={{
//                       background: "#dc2626",
//                       color: "#fff",
//                       borderRadius: 10,
//                       padding: "1px 6px",
//                       fontSize: 10,
//                       fontWeight: 800,
//                       flexShrink: 0,
//                     }}
//                   >
//                     {t.alert}
//                   </span>
//                 )}
//               </div>
//             );
//           })}
//         </nav>
//         <div style={{ padding: "8px 5px", borderTop: "1px solid #1e293b" }}>
//           <div
//             onClick={() => setCollapsed(!collapsed)}
//             style={{
//               display: "flex",
//               alignItems: "center",
//               gap: 9,
//               padding: "8px 11px",
//               borderRadius: 7,
//               cursor: "pointer",
//             }}
//             onMouseEnter={(e) => (e.currentTarget.style.background = "#1e293b")}
//             onMouseLeave={(e) =>
//               (e.currentTarget.style.background = "transparent")
//             }
//           >
//             <span style={{ fontSize: 13, flexShrink: 0, color: "#64748b" }}>
//               {collapsed ? "→" : "←"}
//             </span>
//             {!collapsed && (
//               <span style={{ fontSize: 12, color: "#64748b" }}>Collapse</span>
//             )}
//           </div>
//           <div
//             onClick={onLogout}
//             style={{
//               display: "flex",
//               alignItems: "center",
//               gap: 9,
//               padding: "8px 11px",
//               borderRadius: 7,
//               cursor: "pointer",
//             }}
//             onMouseEnter={(e) => (e.currentTarget.style.background = "#1e293b")}
//             onMouseLeave={(e) =>
//               (e.currentTarget.style.background = "transparent")
//             }
//           >
//             <span style={{ fontSize: 14, flexShrink: 0 }}>🚪</span>
//             {!collapsed && (
//               <span style={{ fontSize: 13, fontWeight: 500, color: "#f87171" }}>
//                 Logout
//               </span>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Main */}
//       <div
//         style={{
//           flex: 1,
//           display: "flex",
//           flexDirection: "column",
//           overflow: "hidden",
//           minWidth: 0,
//         }}
//       >
//         {/* Topbar */}
//         <div
//           style={{
//             background: T.surface,
//             borderBottom: `1px solid ${T.border}`,
//             padding: "10px 22px",
//             display: "flex",
//             justifyContent: "space-between",
//             alignItems: "center",
//             flexShrink: 0,
//             position: "sticky",
//             top: 0,
//             zIndex: 50,
//           }}
//         >
//           <div>
//             <div
//               style={{
//                 fontSize: 10,
//                 fontWeight: 800,
//                 color: T.textMuted,
//                 textTransform: "uppercase",
//                 letterSpacing: "1px",
//               }}
//             >
//               Sheetal Automobiles
//             </div>
//             <div style={{ fontSize: 19, fontWeight: 800, color: T.text }}>
//               {TABS.find((t) => t.key === tab)?.label}
//             </div>
//           </div>
//           <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//             <div
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 gap: 5,
//                 padding: "3px 10px",
//                 background: T.greenLight,
//                 borderRadius: 20,
//                 border: `1px solid ${T.green}44`,
//               }}
//             >
//               <div
//                 style={{
//                   width: 6,
//                   height: 6,
//                   borderRadius: "50%",
//                   background: T.green,
//                 }}
//               />
//               <span style={{ fontSize: 10, fontWeight: 800, color: T.green }}>
//                 LIVE
//               </span>
//             </div>
//             {/* Dark mode toggle */}
//             <button
//               onClick={toggleDark}
//               style={{
//                 padding: "6px 14px",
//                 borderRadius: 20,
//                 border: `1px solid ${T.border}`,
//                 background: T.surfaceElevated,
//                 cursor: "pointer",
//                 fontSize: 13,
//                 fontFamily: "inherit",
//                 color: T.text,
//                 display: "flex",
//                 alignItems: "center",
//                 gap: 6,
//                 fontWeight: 600,
//               }}
//             >
//               {dark ? "☀️ Light" : "🌙 Dark"}
//             </button>
//             <Btn
//               T={T}
//               v="secondary"
//               sz="sm"
//               onClick={() => setShowSearch(true)}
//             >
//               🔍 Search
//             </Btn>
//             <span
//               style={{ fontSize: 13, color: T.textSecondary, fontWeight: 600 }}
//             >
//               {user?.full_name}
//             </span>
//           </div>
//         </div>

//         {/* Tab content */}
//         <div style={{ flex: 1, overflowY: "auto", padding: 22 }}>
//           {tab === "overview" && (
//             <OverviewTab
//               T={T}
//               derived={derived}
//               vehicles={vehicles}
//               todayPayments={todayPayments}
//               creditVehicles={creditVehicles}
//               onVehiclePress={setSelVehicle}
//               onQuickView={(title, vlist) =>
//                 setQuickView({ title, vehicles: vlist })
//               }
//             />
//           )}
//           {tab === "floor" && (
//             <FloorTab
//               T={T}
//               vehicles={vehicles}
//               derived={derived}
//               onVehiclePress={setSelVehicle}
//             />
//           )}
//           {tab === "finance" && (
//             <FinanceTab
//               T={T}
//               derived={derived}
//               todayPayments={todayPayments}
//               allPayments={allPayments}
//               creditVehicles={creditVehicles}
//             />
//           )}
//           {tab === "staff" && (
//             <StaffTab
//               T={T}
//               derived={derived}
//               users={users}
//               teams={teams}
//               vehicles={vehicles}
//               onVehiclePress={setSelVehicle}
//             />
//           )}
//           {tab === "reports" && (
//             <ReportsTab
//               T={T}
//               derived={derived}
//               users={users}
//               reportData={reportData}
//               reportLoading={reportLoading}
//               fetchReportData={fetchReport}
//             />
//           )}
//           {tab === "team" && (
//             <TeamTab T={T} users={users} teams={teams} onRefresh={fetchAll} />
//           )}
//         </div>
//       </div>

//       {selVehicle && (
//         <VehicleDetailModal
//           T={T}
//           vehicle={selVehicle}
//           users={users}
//           teams={teams}
//           onClose={() => setSelVehicle(null)}
//         />
//       )}
//       {quickView && (
//         <QuickViewModal
//           T={T}
//           title={quickView.title}
//           vehicles={quickView.vehicles}
//           onVehiclePress={setSelVehicle}
//           onClose={() => setQuickView(null)}
//         />
//       )}
//       {showSearch && (
//         <SearchModal
//           T={T}
//           onClose={() => setShowSearch(false)}
//           onSelect={(v) => {
//             setSelVehicle(v);
//             setShowSearch(false);
//           }}
//         />
//       )}
//     </div>
//   );
// }

// export default OwnerDashboard;

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import logo from "../assets/logo.png";
import * as XLSX from "xlsx";

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

// FIX 1: tyre_fitting REMOVED from DEPT_KEYS
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

// FIX 1: tyre_fitting REMOVED from ALL_ROLES
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
  "advisor",
  "owner",
];
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
  advisor: "Advisor",
  owner: "Owner",
  // NOTE: tyre_fitting REMOVED — department no longer exists
};

// FIX 1: tyre_fitting REMOVED from STAGE_META
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
      borderBottom: `2px solid #f59e0b`,
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

async function exportToExcel(reportType, fromDate, toDate) {
  const f0 = fromDate + "T00:00:00+05:30";
  const t0 = toDate + "T23:59:59+05:30";
  const wb = XLSX.utils.book_new();
  const sheet = (rows, name) => {
    if (rows.length)
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name);
  };

  if (reportType === "operations") {
    // FIX 2: .is("deleted_at",null) on vehicle query
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

    sheet(
      (veh || []).map((v) => {
        const e = v.entry_time ? new Date(toZ(v.entry_time)) : null;
        const x = v.updated_at ? new Date(toZ(v.updated_at)) : null;
        const exp = v.expected_completion_time
          ? new Date(toZ(v.expected_completion_time))
          : null;
        const tat = e && x ? Math.round((x - e) / 60000) : null;
        // FIX 1: tyre_fitting column REMOVED from operations export
        const deptDone = (d) =>
          v.work_stages?.[0]?.[`${d}_required`]
            ? v.work_stages[0][`${d}_status`] === "completed"
              ? "Yes"
              : "No"
            : "N/A";
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
          Mechanic: deptDone("mechanic"),
          Painter: deptDone("painter"),
          Denter: deptDone("denter"),
          Electrician: deptDone("electrician"),
          "3M": deptDone("three_m"),
          Alignment: deptDone("alignment_balancing"),
          Washing: deptDone("washing"),
          // NOTE: Tyre Fitting column REMOVED
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
    // FIX 2: .is("deleted_at",null) via join filter (washing_details doesn't have deleted_at, filter via vehicle join)
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
    // FIX 2: filter deleted_at via join
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
    // FIX 2: .is("deleted_at",null) on vehicles
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
    // FIX 2: .is("deleted_at",null) on credit query
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
  } else if (reportType === "force_pdi") {
    const { data: hist } = await supabase
      .from("vehicle_history")
      .select(
        "*,user:users!vehicle_history_user_id_fkey(full_name),vehicle:vehicles!vehicle_history_vehicle_id_fkey(vehicle_number,customer_name,model)",
      )
      .eq("action", "force_pdi")
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
    // FIX 2: .is("deleted_at",null) on vehicles query
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
    // FIX 1: tyre_fitting REMOVED from TEAM_DEPTS_FP and SOLO_DEPTS_FP
    const TEAM_DEPTS_FP = ["mechanic", "denter", "electrician", "painter"];
    TEAM_DEPTS_FP.forEach((dept) => {
      const deptTeams = (teamsData || []).filter((t) => t.role === dept);
      const affectedForDept = (deptHist || []).filter((h) => h.stage === dept);
      deptTeams.forEach((team) => {
        const teamVehicleNums = (veh || [])
          .filter((v) => v.work_stages?.[0]?.[`${dept}_team_id`] === team.id)
          .map((v) => v.vehicle_number);
        const forcedVehicles = affectedForDept
          .filter((h) => teamVehicleNums.includes(h.vehicle?.vehicle_number))
          .map((h) => h.vehicle?.vehicle_number)
          .filter(Boolean);
        const unique = [...new Set(forcedVehicles)];
        if (!unique.length) return;
        summaryRows.push({
          "Team / Department": team.name,
          Role: STAGE_META[dept]?.label || dept,
          "Vehicles with Force PDI": unique.join(", "),
          Count: unique.length,
        });
      });
    });
    // FIX 1: tyre_fitting REMOVED — was in SOLO_DEPTS_FP
    const SOLO_DEPTS_FP = ["washing", "three_m", "alignment_balancing"];
    SOLO_DEPTS_FP.forEach((dept) => {
      const affectedForDept = (deptHist || []).filter((h) => h.stage === dept);
      const unique = [
        ...new Set(
          affectedForDept.map((h) => h.vehicle?.vehicle_number).filter(Boolean),
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

    const TEAM_DEPTS = ["mechanic", "denter", "electrician"];
    TEAM_DEPTS.forEach((dept) => {
      const deptTeams = (teamsData || []).filter((t) => t.role === dept);
      const deptVehicles = (veh || []).filter(
        (v) => v.work_stages?.[0]?.[`${dept}_required`],
      );
      deptTeams.forEach((team) => {
        const rows = [];
        const teamVehicles = deptVehicles.filter(
          (v) => v.work_stages?.[0]?.[`${dept}_team_id`] === team.id,
        );
        teamVehicles.forEach((v) => {
          const ws = v.work_stages?.[0];
          const key = `${v.id}__${dept}`;
          const lg = hm[key] || {};
          const dur = lg.s && lg.e ? Math.round((lg.e - lg.s) / 60000) : null;
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
        if (rows.length) {
          const sn = `${STAGE_META[dept]?.label} - ${team.name}`.slice(0, 31);
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sn);
        }
      });
    });

    // FIX 1: tyre_fitting REMOVED from SOLO_DEPTS
    const SOLO_DEPTS = ["painter", "washing", "three_m", "alignment_balancing"];
    SOLO_DEPTS.forEach((dept) => {
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
      const sn = STAGE_META[dept]?.label?.slice(0, 31) || dept;
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sn);
    });
    XLSX.writeFile(wb, `ForcePDI_${fromDate}_to_${toDate}.xlsx`);
  }
}

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

  const ageColor = (days) =>
    days > 60 ? T.red : days > 30 ? T.amber : T.green;
  const ageBg = (days) =>
    days > 60 ? T.redLight : days > 30 ? T.amberLight : T.greenLight;
  const ageLabel = (days) =>
    days > 60 ? "60+ days" : days > 30 ? "31–60 days" : "0–30 days";

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

function FloorTab({ T, vehicles, derived, onVehiclePress }) {
  const [view, setView] = useState("stage");
  const [expanded, setExpanded] = useState({});
  const PREVIEW = 5;
  const active = vehicles.filter((v) => v.current_stage !== "completed");
  // FIX 1: tyre_fitting REMOVED from STAGE_ORDER
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
    </div>
  );
}

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

  // FIX 3: byMethod — UPI payments stored as upi_phonepe/upi_gpay/upi_icici/upi_other
  // Group all UPI variants together for the summary row
  const realP = todayPayments.filter((p) => p.payment_method !== "credit");
  const byMethod = {};
  ["cash", "upi", "card", "bank_transfer"].forEach((m) => {
    if (m === "upi") {
      byMethod[m] = realP
        .filter((p) => p.payment_method?.startsWith("upi_"))
        .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    } else {
      byMethod[m] = realP
        .filter((p) => p.payment_method === m)
        .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    }
  });

  // FIX 3: All transactions filter — upi_ variants
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
          // FIX 3: "upi" filter chip matches all upi_ variants
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

      {/* FIX 3: Today by Method — shows 4 rows including UPI (summing all upi_* variants) */}
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
            ["upi", "UPI (all)", "📱", T.blue], // FIX 3: sums all upi_ variants
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
            {/* FIX 3: method filter chips include all UPI variants */}
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

function StaffTab({ T, derived, users, teams, vehicles, onVehiclePress }) {
  const { advisorLoads, roleGroups } = derived;
  const active = vehicles.filter((v) => v.current_stage !== "completed");
  return (
    <div>
      <SecTitle T={T}>Advisors</SecTitle>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 14,
          marginBottom: 22,
        }}
      >
        {advisorLoads.map((a) => (
          <Bx T={T} key={a.id}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 10,
                paddingBottom: 8,
                borderBottom: `1px solid ${T.border}`,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: T.blueLight,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  color: T.blue,
                  fontSize: 15,
                  flexShrink: 0,
                }}
              >
                {a.full_name?.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: T.text, fontSize: 14 }}>
                  {a.full_name}
                </div>
                <div style={{ fontSize: 11, color: T.textMuted }}>Advisor</div>
              </div>
              <Chip color={T.blue} bg={T.blueLight}>
                {a.activeVehicles.length} active
              </Chip>
            </div>
            {a.activeVehicles.slice(0, 5).map((v) => (
              <div
                key={v.id}
                onClick={() => onVehiclePress(v)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 8px",
                  borderRadius: 6,
                  cursor: "pointer",
                  marginBottom: 3,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = T.surfaceElevated)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
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
                <span style={{ fontSize: 10, color: T.textSecondary }}>
                  {STAGE_META[v.current_stage]?.icon}{" "}
                  {v.current_stage?.replace(/_/g, " ")}
                </span>
              </div>
            ))}
            {a.activeVehicles.length > 5 && (
              <div
                style={{
                  fontSize: 11,
                  color: T.textMuted,
                  textAlign: "center",
                  padding: 6,
                }}
              >
                +{a.activeVehicles.length - 5} more
              </div>
            )}
          </Bx>
        ))}
      </div>

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
                          marginBottom: 5,
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
                        <Chip color={dm.color} bg={dm.color + "20"}>
                          {ta.length} vehicles
                        </Chip>
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
  }, []);

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
  // FIX 3: UPI in reports — use startsWith("upi_") for bm
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

  // FIX 3: bm uses startsWith("upi_") for UPI group
  const bm = {};
  ["cash", "upi", "card", "bank_transfer"].forEach((m) => {
    if (m === "upi") {
      bm[m] = realP
        .filter((p) => p.payment_method?.startsWith("upi_"))
        .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    } else {
      bm[m] = realP
        .filter((p) => p.payment_method === m)
        .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    }
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

      {/* Downloads */}
      <Bx T={T} style={{ marginBottom: 20, borderLeft: `4px solid #f59e0b` }}>
        <SecTitle T={T}>📥 Download Excel Reports</SecTitle>
        <div
          style={{
            marginBottom: 10,
            padding: "6px 10px",
            background: T.accentBg,
            borderRadius: 6,
            border: `1px solid #f59e0b44`,
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
              <div style={{ overflowX: "auto" }}>
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
        </>
      )}
    </div>
  );
}

function TeamTab({ T, users, teams, onRefresh }) {
  const [sub, setSub] = useState("users");
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
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

function EditUserDlg({ T, user, onClose, onSuccess }) {
  const [f, setF] = useState({
    full_name: user.full_name,
    phone: user.phone,
    password: "",
    role: user.role,
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const upd = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const go = async () => {
    if (!f.full_name.trim()) {
      setErr("Name required");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
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
      onSuccess();
    } catch (e) {
      setErr(e.message);
      setLoading(false);
    }
  };
  return (
    <Dlg T={T} open={true} onClose={onClose} title={`Edit — ${user.full_name}`}>
      <div
        style={{
          padding: "7px 12px",
          borderRadius: 6,
          fontSize: 12,
          marginBottom: 12,
          background: user.auth_id ? T.greenLight : T.amberLight,
          color: user.auth_id ? T.green : T.amber,
        }}
      >
        {user.auth_id
          ? "✅ Linked to Supabase Auth — changes sync to login"
          : "⚠️ No Auth linked — password only updates local record"}
      </div>
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
      // FIX 2: .is("deleted_at",null) in search
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
          border: `2px solid #f59e0b`,
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
  const [loading, setLoading] = useState(true);
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

  const fetchAll = useCallback(async () => {
    try {
      const ts = getISTMidnightUTC();
      const [vr, tp, ap, cr, tr, ur] = await Promise.all([
        // FIX 2: .is("deleted_at",null) on main vehicles query
        supabase
          .from("vehicles")
          .select(
            "*,work_stages(*),customer_complaints(count),advisor:users!vehicles_advisor_id_fkey(full_name)",
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
        // FIX 6: Remove .limit(500) — owner should see all payments
        supabase
          .from("payments")
          .select(
            "*,vehicle:vehicles!payments_vehicle_id_fkey(vehicle_number,customer_name,model,credit_guaranteed_by),collector:users!payments_collected_by_fkey(full_name)",
          )
          .order("created_at", { ascending: false }),
        // FIX 2: .is("deleted_at",null) on credit vehicles
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
          .select("id,full_name,role,team_id,is_active,phone,auth_id")
          .order("full_name"),
      ]);
      setVehicles(vr.data || []);
      setTodayPayments(tp.data || []);
      setAllPayments(ap.data || []);
      setCreditVehicles(cr.data || []);
      setTeams(tr.data || []);
      setUsers(ur.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReport = useCallback(async (from, to) => {
    setReportLoading(true);
    try {
      const f0 = from + "T00:00:00+05:30";
      const t0 = to + "T23:59:59+05:30";
      const [vr, pr, hr] = await Promise.all([
        // FIX 2: .is("deleted_at",null) in fetchReport
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
        fetchAll,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        fetchAll,
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user, fetchAll]);

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

    // FIX 3: byMethod — UPI stored as upi_phonepe/upi_gpay/upi_icici/upi_other
    const byMethod = {};
    ["cash", "upi", "card", "bank_transfer"].forEach((m) => {
      if (m === "upi") {
        byMethod[m] = realP
          .filter((p) => p.payment_method?.startsWith("upi_"))
          .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
      } else {
        byMethod[m] = realP
          .filter((p) => p.payment_method === m)
          .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
      }
    });

    // FIX 4: creditGroups — SUM all visits credit_amount (not just latest)
    // Each visit row in creditVehicles has its own independent credit_amount balance
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
      // FIX 4: Accumulate ALL visits — each has independent credit balance
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
      .filter((u) => u.role === "advisor")
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
    return {
      activeVehicles: active,
      todayEntries,
      todayCompleted,
      todayEntriesVehicles,
      overdue,
      vipUrgent,
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
    };
  }, [vehicles, todayPayments, teams, users, creditVehicles]);

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
    { key: "staff", icon: "👥", label: "Staff", alert: null },
    { key: "reports", icon: "📊", label: "Reports", alert: null },
    { key: "team", icon: "⚙️", label: "Team", alert: null },
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
          {/* FIX 5: Use actual logo instead of "S" amber badge */}
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

      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {/* Topbar */}
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

        {/* Tab content */}
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
          {tab === "staff" && (
            <StaffTab
              T={T}
              derived={derived}
              users={users}
              teams={teams}
              vehicles={vehicles}
              onVehiclePress={setSelVehicle}
            />
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
            <TeamTab T={T} users={users} teams={teams} onRefresh={fetchAll} />
          )}
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
