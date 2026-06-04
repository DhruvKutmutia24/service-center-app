// import { useState, useEffect, useCallback } from "react";
// import { supabase } from "../lib/supabase";
// import {
//   BeautifulHeader,
//   BeautifulStatCard,
//   BeautifulLoading,
// } from "./BeautifulComponents";

// // ─── Helpers ────────────────────────────────────────────────────────────────

// const PAYMENT_METHODS = [
//   { value: "cash", label: "Cash", icon: "💵" },
//   { value: "card", label: "Card", icon: "💳" },
//   { value: "upi_phonepe", label: "PhonePe UPI", icon: "📱" },
//   { value: "upi_icici", label: "ICICI UPI", icon: "📱" },
//   { value: "bank_transfer", label: "Bank Transfer", icon: "🏦" },
//   { value: "credit", label: "Credit (Pay Later)", icon: "📋" },
// ];

// //const METHOD_NEEDS_TXN = ["card", "upi", "bank_transfer"];
// const METHOD_NEEDS_TXN = [
//   "card",
//   "upi_phonepe",
//   "upi_gpay",
//   "upi_icici",
//   "upi_other",
//   "bank_transfer",
// ];

// function formatIST(dateStr) {
//   if (!dateStr) return "N/A";
//   return new Date(dateStr).toLocaleString("en-IN", {
//     timeZone: "Asia/Kolkata",
//   });
// }

// function formatCurrency(val) {
//   return `₹${(parseFloat(val) || 0).toFixed(2)}`;
// }

// function getCurrentUser() {
//   try {
//     return JSON.parse(localStorage.getItem("user"));
//   } catch {
//     return null;
//   }
// }

// // ─── Main Dashboard ──────────────────────────────────────────────────────────

// function CashierDashboard({ user, onLogout }) {
//   const [tab, setTab] = useState("pending");
//   const [pendingVehicles, setPendingVehicles] = useState([]);
//   const [pipelineVehicles, setPipelineVehicles] = useState([]);
//   const [creditGroups, setCreditGroups] = useState([]); // grouped by vehicle_number
//   const [allPayments, setAllPayments] = useState([]);
//   const [todayPayments, setTodayPayments] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [selectedVehicle, setSelectedVehicle] = useState(null);
//   const [selectedCreditGroup, setSelectedCreditGroup] = useState(null);
//   const [modal, setModal] = useState(null); // "payment" | "details" | "credit" | "statement"

//   const fetchData = useCallback(async () => {
//     setLoading(true);
//     try {
//       // Pending payments (payment stage)
//       const { data: pending } = await supabase
//         .from("vehicles")
//         .select("*")
//         .not("bill_amount", "is", null)
//         .gt("bill_amount", 0)
//         .not("payment_status", "in", '("paid","credit")')
//         .not("current_stage", "in", '("ready_for_exit","completed")')
//         .order("entry_time", { ascending: false });

//       // For each pending vehicle, look up previous credit from same vehicle_number
//       const enrichedPending = await Promise.all(
//         (pending || []).map(async (v) => {
//           const { data: prevCredits } = await supabase
//             .from("vehicles")
//             .select("id, credit_amount, bill_amount, entry_time")
//             .eq("vehicle_number", v.vehicle_number)
//             .gt("credit_amount", 0)
//             .neq("id", v.id); // exclude current visit

//           const previousCredit = (prevCredits || []).reduce(
//             (s, p) => s + (parseFloat(p.credit_amount) || 0),
//             0,
//           );
//           return { ...v, previous_credit: previousCredit };
//         }),
//       );

//       // Pipeline: billing stage + all active (not completed/payment/ready_for_exit)
//       const { data: pipeline } = await supabase
//         .from("vehicles")
//         .select("*")
//         .not("current_stage", "in", '("payment","ready_for_exit","completed")')
//         .order("entry_time", { ascending: false });

//       // Credit vehicles - all with outstanding credit_amount > 0
//       const { data: allCreditVehicles } = await supabase
//         .from("vehicles")
//         .select(
//           "id, vehicle_number, customer_name, customer_phone, bill_amount, total_paid, credit_amount, credit_guaranteed_by, entry_time, updated_at, payment_status",
//         )
//         .gt("credit_amount", 0);

//       // Group by vehicle_number
//       const grouped = {};
//       (allCreditVehicles || []).forEach((v) => {
//         const vn = v.vehicle_number;
//         if (!grouped[vn]) {
//           grouped[vn] = {
//             vehicle_number: vn,
//             customer_name: v.customer_name,
//             customer_phone: v.customer_phone,
//             total_credit: 0,
//             visits: [],
//           };
//         }
//         grouped[vn].total_credit += parseFloat(v.credit_amount) || 0;
//         // Collect all unique guarantors across visits
//         grouped[vn].visits.push(v);
//       });

//       // Today's payments (exclude credit method — not real cash)
//       const todayStart = new Date();
//       todayStart.setHours(0, 0, 0, 0);
//       const { data: todayPay } = await supabase
//         .from("payments")
//         .select("*")
//         .gte("created_at", todayStart.toISOString())
//         .neq("payment_method", "credit");

//       // All payments with vehicle + collector info for Collections Report
//       const { data: allPay } = await supabase
//         .from("payments")
//         .select(
//           `
//           *,
//           vehicle:vehicles!payments_vehicle_id_fkey(vehicle_number, customer_name, customer_phone, model, credit_guaranteed_by),
//           collector:users!payments_collected_by_fkey(full_name)
//         `,
//         )
//         .order("created_at", { ascending: false });

//       setPendingVehicles(enrichedPending || []);
//       setPipelineVehicles(pipeline || []);
//       setCreditGroups(
//         Object.values(grouped).sort((a, b) => b.total_credit - a.total_credit),
//       );
//       setTodayPayments(todayPay || []);
//       setAllPayments(allPay || []);
//     } catch (e) {
//       console.error("fetchData error:", e);
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     fetchData();
//   }, [fetchData]);

//   const todayCollection = todayPayments.reduce(
//     (s, p) => s + parseFloat(p.amount || 0),
//     0,
//   );
//   const totalCredit = creditGroups.reduce((s, g) => s + g.total_credit, 0);

//   const openModal = (vehicle, type) => {
//     setSelectedVehicle(vehicle);
//     setModal(type);
//   };
//   const openCreditModal = (group, type) => {
//     setSelectedCreditGroup(group);
//     setModal(type);
//   };
//   const closeModal = () => {
//     setSelectedVehicle(null);
//     setSelectedCreditGroup(null);
//     setModal(null);
//   };
//   const onSuccess = () => {
//     closeModal();
//     fetchData();
//   };

//   if (loading) return <BeautifulLoading />;

//   const TABS = [
//     {
//       id: "pending",
//       label: "💳 Pending Payments",
//       count: pendingVehicles.length,
//     },
//     { id: "pipeline", label: "🔜 Upcoming", count: pipelineVehicles.length },
//     { id: "credit", label: "📋 Credit Ledger", count: creditGroups.length },
//     { id: "collections", label: "📊 Collections Report", count: null },
//   ];

//   return (
//     <div
//       style={{
//         minHeight: "100vh",
//         backgroundColor: "#f3f4f6",
//         fontFamily:
//           '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
//       }}
//     >
//       <BeautifulHeader
//         title="Cashier Dashboard"
//         subtitle="Tata Motors Service Center"
//         userName={user.full_name}
//         onLogout={onLogout}
//       />

//       <div style={{ padding: "32px 40px 20px" }}>
//         {/* Stats */}
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(4, 1fr)",
//             gap: "24px",
//             marginBottom: "32px",
//           }}
//         >
//           <BeautifulStatCard
//             title="Pending Payments"
//             value={pendingVehicles.length}
//             icon="💳"
//             color="#ef4444"
//             bgColor="#fee2e2"
//           />
//           <BeautifulStatCard
//             title="Today's Collection"
//             value={formatCurrency(todayCollection)}
//             icon="📊"
//             color="#3b82f6"
//             bgColor="#dbeafe"
//           />
//           <BeautifulStatCard
//             title="Credit Outstanding"
//             value={formatCurrency(totalCredit)}
//             icon="📋"
//             color="#f59e0b"
//             bgColor="#fef3c7"
//           />
//           <BeautifulStatCard
//             title="Vehicles in Pipeline"
//             value={pipelineVehicles.length}
//             icon="🔜"
//             color="#8b5cf6"
//             bgColor="#ede9fe"
//           />
//         </div>

//         {/* Tab Bar */}
//         <div
//           style={{
//             display: "flex",
//             gap: "4px",
//             backgroundColor: "white",
//             padding: "6px",
//             borderRadius: "12px",
//             boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
//             marginBottom: "24px",
//             width: "fit-content",
//           }}
//         >
//           {TABS.map((t) => (
//             <button
//               key={t.id}
//               onClick={() => setTab(t.id)}
//               style={{
//                 padding: "10px 20px",
//                 border: "none",
//                 borderRadius: "8px",
//                 cursor: "pointer",
//                 fontWeight: "600",
//                 fontSize: "14px",
//                 transition: "all 0.2s",
//                 backgroundColor: tab === t.id ? "#667eea" : "transparent",
//                 color: tab === t.id ? "white" : "#6b7280",
//                 boxShadow:
//                   tab === t.id ? "0 2px 8px rgba(102,126,234,0.4)" : "none",
//               }}
//             >
//               {t.label}
//               {t.count !== null && (
//                 <span
//                   style={{
//                     marginLeft: "8px",
//                     backgroundColor:
//                       tab === t.id ? "rgba(255,255,255,0.3)" : "#e5e7eb",
//                     color: tab === t.id ? "white" : "#374151",
//                     borderRadius: "12px",
//                     padding: "2px 8px",
//                     fontSize: "12px",
//                   }}
//                 >
//                   {t.count}
//                 </span>
//               )}
//             </button>
//           ))}
//         </div>

//         {/* Tab Content */}
//         {tab === "pending" && (
//           <PendingTab
//             vehicles={pendingVehicles}
//             onPayment={(v) => openModal(v, "payment")}
//             onDetails={(v) => openModal(v, "details")}
//           />
//         )}
//         {tab === "pipeline" && <PipelineTab vehicles={pipelineVehicles} />}
//         {tab === "credit" && (
//           <CreditLedgerTab
//             vehicles={creditGroups}
//             onCollect={(g) => openCreditModal(g, "credit")}
//             onViewStatement={(g) => openCreditModal(g, "statement")}
//           />
//         )}
//         {tab === "collections" && (
//           <CollectionsReportTab payments={allPayments} />
//         )}
//       </div>

//       {/* Modals */}
//       {modal === "payment" && selectedVehicle && (
//         <PaymentFormModal
//           vehicle={selectedVehicle}
//           onClose={closeModal}
//           onSuccess={onSuccess}
//         />
//       )}
//       {modal === "details" && selectedVehicle && (
//         <VehicleDetailsModal
//           vehicle={selectedVehicle}
//           onClose={closeModal}
//           onPayment={() => setModal("payment")}
//         />
//       )}
//       {modal === "credit" && selectedCreditGroup && (
//         <CreditCollectionModal
//           group={selectedCreditGroup}
//           onClose={closeModal}
//           onSuccess={onSuccess}
//         />
//       )}
//       {modal === "statement" && selectedCreditGroup && (
//         <CreditStatementModal
//           group={selectedCreditGroup}
//           onClose={closeModal}
//         />
//       )}
//     </div>
//   );
// }

// // ─── Tab: Pending Payments ───────────────────────────────────────────────────

// function PendingTab({ vehicles, onPayment, onDetails }) {
//   if (vehicles.length === 0)
//     return (
//       <EmptyState
//         icon="✅"
//         title="No pending payments"
//         subtitle="All vehicles processed!"
//       />
//     );

//   return (
//     <div style={{ display: "grid", gap: "16px" }}>
//       {vehicles.map((v) => (
//         <VehiclePaymentCard
//           key={v.id}
//           vehicle={v}
//           onPayment={() => onPayment(v)}
//           onDetails={() => onDetails(v)}
//         />
//       ))}
//     </div>
//   );
// }

// function VehiclePaymentCard({ vehicle, onPayment, onDetails }) {
//   const bill = parseFloat(vehicle.bill_amount) || 0;
//   const previousCredit = parseFloat(vehicle.previous_credit) || 0;
//   const totalOutstanding = bill + previousCredit;
//   const status = vehicle.payment_status || "unpaid";

//   const statusColors = {
//     unpaid: { bg: "#fee2e2", color: "#991b1b", label: "Unpaid" },
//     partial: { bg: "#fef3c7", color: "#92400e", label: "Partial" },
//     credit: { bg: "#fce7f3", color: "#9f1239", label: "Credit" },
//     paid: { bg: "#dcfce7", color: "#166534", label: "Paid" },
//   };
//   const sc = statusColors[status] || statusColors.unpaid;

//   return (
//     <div
//       style={{
//         padding: "24px",
//         backgroundColor: "white",
//         borderRadius: "12px",
//         border: "2px solid #e5e7eb",
//         boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
//       }}
//     >
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "flex-start",
//         }}
//       >
//         <div style={{ flex: 1 }}>
//           {/* Header */}
//           <div
//             style={{
//               display: "flex",
//               alignItems: "center",
//               gap: "12px",
//               marginBottom: "12px",
//               flexWrap: "wrap",
//             }}
//           >
//             <h4
//               style={{
//                 margin: 0,
//                 fontSize: "20px",
//                 color: "#111827",
//                 fontWeight: "700",
//               }}
//             >
//               {vehicle.vehicle_number}
//             </h4>
//             {vehicle.model && <ModelBadge model={vehicle.model} />}
//             {vehicle.priority !== "normal" && (
//               <PriorityBadge priority={vehicle.priority} />
//             )}
//             <span
//               style={{
//                 padding: "4px 10px",
//                 backgroundColor: sc.bg,
//                 color: sc.color,
//                 borderRadius: "6px",
//                 fontSize: "12px",
//                 fontWeight: "600",
//               }}
//             >
//               {sc.label}
//             </span>
//             {previousCredit > 0 && (
//               <span
//                 style={{
//                   padding: "4px 10px",
//                   backgroundColor: "#fef3c7",
//                   color: "#92400e",
//                   borderRadius: "6px",
//                   fontSize: "12px",
//                   fontWeight: "600",
//                 }}
//               >
//                 ⚠️ Previous Credit
//               </span>
//             )}
//           </div>

//           {/* Info */}
//           <div
//             style={{
//               display: "grid",
//               gridTemplateColumns: "1fr 1fr",
//               gap: "6px 24px",
//               marginBottom: "16px",
//             }}
//           >
//             <InfoRow label="Customer" value={vehicle.customer_name || "N/A"} />
//             <InfoRow label="Phone" value={vehicle.customer_phone || "N/A"} />
//             <InfoRow
//               label="Bill Generated"
//               value={formatIST(vehicle.bill_generated_at)}
//             />
//             <InfoRow label="Entry" value={formatIST(vehicle.entry_time)} />
//           </div>

//           {/* Amount: 2 boxes only */}
//           <div
//             style={{
//               display: "grid",
//               gridTemplateColumns: "1fr 1fr",
//               gap: "12px",
//             }}
//           >
//             <AmountBox
//               label="Current Bill"
//               amount={bill}
//               color="#f0f9ff"
//               border="#bae6fd"
//               text="#0c4a6e"
//             />

//             {/* Outstanding box — enhanced if previous credit exists */}
//             <div
//               style={{
//                 padding: "14px 16px",
//                 borderRadius: "10px",
//                 textAlign: "center",
//                 backgroundColor: previousCredit > 0 ? "#fff7ed" : "#fff7ed",
//                 border: `2px solid ${previousCredit > 0 ? "#f97316" : "#fed7aa"}`,
//               }}
//             >
//               <div
//                 style={{
//                   fontSize: "12px",
//                   color: "#6b7280",
//                   fontWeight: "600",
//                   marginBottom: "4px",
//                 }}
//               >
//                 Total Outstanding
//               </div>
//               <div
//                 style={{
//                   fontSize: "22px",
//                   fontWeight: "800",
//                   color: "#9a3412",
//                 }}
//               >
//                 {formatCurrency(totalOutstanding)}
//               </div>
//               {previousCredit > 0 && (
//                 <div
//                   style={{
//                     marginTop: "6px",
//                     fontSize: "11px",
//                     color: "#b45309",
//                     lineHeight: "1.4",
//                   }}
//                 >
//                   ₹{bill.toFixed(0)} current + ₹{previousCredit.toFixed(0)}{" "}
//                   prev. credit
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* Actions */}
//         <div
//           style={{
//             display: "flex",
//             flexDirection: "column",
//             gap: "10px",
//             marginLeft: "24px",
//           }}
//         >
//           <ActionButton
//             label="💳 Process Payment"
//             onClick={onPayment}
//             primary
//           />
//           <ActionButton label="📄 View Details" onClick={onDetails} />
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Tab: Pipeline ───────────────────────────────────────────────────────────

// function PipelineTab({ vehicles }) {
//   const [showAll, setShowAll] = useState(false);

//   const STAGE_LABELS = {
//     billing: "🧾 Billing",
//     pdi: "🔍 PDI",
//     washing: "💧 Washing",
//     alignment_balancing: "⚖️ Alignment",
//     tyre_fitting: "🛞 Tyre",
//     three_m: "✨ 3M",
//     electrician: "⚡ Electrician",
//     denter: "🔨 Denter",
//     painter: "🎨 Painter",
//     mechanic: "🔧 Mechanic",
//     advisor_review: "👔 Advisor",
//     front_checkup: "🔍 Front Checkup",
//     pending: "⏳ Pending",
//   };
//   const STAGE_ORDER = [
//     "billing",
//     "pdi",
//     "washing",
//     "alignment_balancing",
//     "tyre_fitting",
//     "three_m",
//     "electrician",
//     "denter",
//     "painter",
//     "mechanic",
//     "advisor_review",
//     "front_checkup",
//     "pending",
//   ];

//   const billingVehicles = vehicles.filter((v) => v.current_stage === "billing");
//   const otherVehicles = vehicles.filter((v) => v.current_stage !== "billing");

//   const displayed = showAll ? vehicles : billingVehicles;

//   const grouped = {};
//   displayed.forEach((v) => {
//     const s = v.current_stage;
//     if (!grouped[s]) grouped[s] = [];
//     grouped[s].push(v);
//   });
//   const stages = STAGE_ORDER.filter((s) => grouped[s]?.length > 0);

//   return (
//     <div>
//       {/* Toggle bar */}
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           marginBottom: "20px",
//         }}
//       >
//         <div style={{ fontSize: "14px", color: "#6b7280" }}>
//           {showAll
//             ? `Showing all ${vehicles.length} active vehicles`
//             : `Showing ${billingVehicles.length} vehicles in billing${otherVehicles.length > 0 ? ` (+${otherVehicles.length} elsewhere)` : ""}`}
//         </div>
//         <button
//           onClick={() => setShowAll((p) => !p)}
//           style={{
//             padding: "8px 16px",
//             backgroundColor: showAll ? "#eff6ff" : "#f3f4f6",
//             color: showAll ? "#2563eb" : "#374151",
//             border: `1px solid ${showAll ? "#bfdbfe" : "#d1d5db"}`,
//             borderRadius: "8px",
//             cursor: "pointer",
//             fontSize: "13px",
//             fontWeight: "600",
//           }}
//         >
//           {showAll ? "📋 Billing Only" : "🔍 Show All Stages"}
//         </button>
//       </div>

//       {displayed.length === 0 ? (
//         <EmptyState
//           icon={showAll ? "🔜" : "🧾"}
//           title={showAll ? "No active vehicles" : "No vehicles in billing"}
//           subtitle={showAll ? "All clear!" : "Nothing heading to payment yet"}
//         />
//       ) : (
//         <div style={{ display: "grid", gap: "16px" }}>
//           {stages.map((stage) => (
//             <div
//               key={stage}
//               style={{
//                 backgroundColor: "white",
//                 borderRadius: "12px",
//                 padding: "20px",
//                 border:
//                   stage === "billing"
//                     ? "2px solid #bfdbfe"
//                     : "1px solid #e5e7eb",
//               }}
//             >
//               <div
//                 style={{
//                   display: "flex",
//                   alignItems: "center",
//                   gap: "12px",
//                   marginBottom: "16px",
//                 }}
//               >
//                 <h4
//                   style={{
//                     margin: 0,
//                     fontSize: "16px",
//                     fontWeight: "700",
//                     color: "#111827",
//                   }}
//                 >
//                   {STAGE_LABELS[stage] || stage}
//                 </h4>
//                 <span
//                   style={{
//                     backgroundColor:
//                       stage === "billing" ? "#dbeafe" : "#f3f4f6",
//                     color: stage === "billing" ? "#1d4ed8" : "#374151",
//                     padding: "3px 10px",
//                     borderRadius: "12px",
//                     fontSize: "13px",
//                     fontWeight: "600",
//                   }}
//                 >
//                   {grouped[stage].length}
//                 </span>
//                 {stage === "billing" && (
//                   <span
//                     style={{
//                       fontSize: "12px",
//                       color: "#2563eb",
//                       fontWeight: "500",
//                     }}
//                   >
//                     Next for payment
//                   </span>
//                 )}
//               </div>
//               <div style={{ display: "grid", gap: "8px" }}>
//                 {grouped[stage].map((v) => (
//                   <div
//                     key={v.id}
//                     style={{
//                       display: "flex",
//                       justifyContent: "space-between",
//                       alignItems: "center",
//                       padding: "12px 16px",
//                       backgroundColor: "#f9fafb",
//                       borderRadius: "8px",
//                       border: "1px solid #e5e7eb",
//                     }}
//                   >
//                     <div
//                       style={{
//                         display: "flex",
//                         alignItems: "center",
//                         gap: "12px",
//                       }}
//                     >
//                       <span
//                         style={{
//                           fontWeight: "700",
//                           color: "#111827",
//                           fontSize: "15px",
//                         }}
//                       >
//                         {v.vehicle_number}
//                       </span>
//                       {v.model && <ModelBadge model={v.model} small />}
//                       {v.priority !== "normal" && (
//                         <PriorityBadge priority={v.priority} small />
//                       )}
//                     </div>
//                     <div
//                       style={{
//                         display: "flex",
//                         alignItems: "center",
//                         gap: "24px",
//                       }}
//                     >
//                       <span style={{ fontSize: "13px", color: "#6b7280" }}>
//                         {v.customer_name}
//                       </span>
//                       {v.bill_amount && (
//                         <span
//                           style={{
//                             fontSize: "15px",
//                             fontWeight: "700",
//                             color: "#0c4a6e",
//                           }}
//                         >
//                           {formatCurrency(v.bill_amount)}
//                         </span>
//                       )}
//                       <span style={{ fontSize: "12px", color: "#9ca3af" }}>
//                         {formatIST(v.entry_time)}
//                       </span>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// // ─── Tab: Credit Ledger ──────────────────────────────────────────────────────

// function CreditLedgerTab({ vehicles, onCollect, onViewStatement }) {
//   const totalCredit = vehicles.reduce((s, v) => s + v.total_credit, 0);

//   if (vehicles.length === 0)
//     return (
//       <EmptyState
//         icon="✅"
//         title="No outstanding credits"
//         subtitle="All credits cleared!"
//       />
//     );

//   return (
//     <div>
//       {/* Summary Banner */}
//       <div
//         style={{
//           backgroundColor: "#fff7ed",
//           border: "2px solid #fed7aa",
//           borderRadius: "12px",
//           padding: "16px 24px",
//           marginBottom: "20px",
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//         }}
//       >
//         <div>
//           <span
//             style={{ fontWeight: "700", color: "#92400e", fontSize: "15px" }}
//           >
//             📋 Total Outstanding Credit
//           </span>
//           <span
//             style={{ marginLeft: "16px", fontSize: "13px", color: "#b45309" }}
//           >
//             {vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""}
//           </span>
//         </div>
//         <span style={{ fontWeight: "800", color: "#9a3412", fontSize: "26px" }}>
//           {formatCurrency(totalCredit)}
//         </span>
//       </div>

//       <div style={{ display: "grid", gap: "16px" }}>
//         {vehicles.map((group) => (
//           <CreditSummaryCard
//             key={group.vehicle_number}
//             group={group}
//             onCollect={() => onCollect(group)}
//             onViewStatement={() => onViewStatement(group)}
//           />
//         ))}
//       </div>
//     </div>
//   );
// }

// function CreditSummaryCard({ group, onCollect, onViewStatement }) {
//   // Collect unique guarantors across all visits
//   const guarantors = [
//     ...new Set(group.visits.map((v) => v.credit_guaranteed_by).filter(Boolean)),
//   ];

//   return (
//     <div
//       style={{
//         backgroundColor: "white",
//         borderRadius: "12px",
//         border: "2px solid #fed7aa",
//         padding: "20px 24px",
//       }}
//     >
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "flex-start",
//         }}
//       >
//         <div style={{ flex: 1 }}>
//           <div
//             style={{
//               display: "flex",
//               alignItems: "center",
//               gap: "10px",
//               marginBottom: "10px",
//               flexWrap: "wrap",
//             }}
//           >
//             <span
//               style={{ fontSize: "19px", fontWeight: "800", color: "#111827" }}
//             >
//               {group.vehicle_number}
//             </span>
//             <span
//               style={{
//                 padding: "3px 10px",
//                 backgroundColor: "#fce7f3",
//                 color: "#9f1239",
//                 borderRadius: "6px",
//                 fontSize: "12px",
//                 fontWeight: "600",
//               }}
//             >
//               {group.visits.length} visit{group.visits.length !== 1 ? "s" : ""}
//             </span>
//           </div>
//           <div
//             style={{
//               display: "grid",
//               gridTemplateColumns: "1fr 1fr",
//               gap: "4px 24px",
//             }}
//           >
//             <InfoRow label="Customer" value={group.customer_name || "N/A"} />
//             <InfoRow label="Phone" value={group.customer_phone || "N/A"} />
//           </div>
//           {guarantors.length > 0 && (
//             <div
//               style={{
//                 marginTop: "10px",
//                 display: "flex",
//                 alignItems: "center",
//                 gap: "8px",
//                 flexWrap: "wrap",
//               }}
//             >
//               <span
//                 style={{
//                   fontSize: "12px",
//                   color: "#6b7280",
//                   fontWeight: "600",
//                 }}
//               >
//                 👤 Guaranteed by:
//               </span>
//               {guarantors.map((g, i) => (
//                 <span
//                   key={i}
//                   style={{
//                     padding: "3px 10px",
//                     backgroundColor: "#fef3c7",
//                     color: "#92400e",
//                     borderRadius: "6px",
//                     fontSize: "12px",
//                     fontWeight: "700",
//                     border: "1px solid #fcd34d",
//                   }}
//                 >
//                   {g}
//                 </span>
//               ))}
//             </div>
//           )}
//         </div>
//         <div style={{ textAlign: "right", marginLeft: "24px" }}>
//           <div
//             style={{
//               fontSize: "11px",
//               color: "#9ca3af",
//               fontWeight: "600",
//               textTransform: "uppercase",
//               marginBottom: "2px",
//             }}
//           >
//             Outstanding
//           </div>
//           <div
//             style={{ fontSize: "30px", fontWeight: "800", color: "#9a3412" }}
//           >
//             {formatCurrency(group.total_credit)}
//           </div>
//         </div>
//       </div>
//       <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
//         <ActionButton label="💰 Collect Credit" onClick={onCollect} primary />
//         <ActionButton label="📅 View Statement" onClick={onViewStatement} />
//       </div>
//     </div>
//   );
// }

// // ─── Modal: Process Payment ──────────────────────────────────────────────────

// function PaymentFormModal({ vehicle, onClose, onSuccess }) {
//   const [paymentType, setPaymentType] = useState("full");
//   const [fullMethod, setFullMethod] = useState("cash");
//   const [fullTxnId, setFullTxnId] = useState("");
//   const [partialLines, setPartialLines] = useState([
//     { method: "cash", amount: "", txnId: "" },
//   ]);
//   const [discount, setDiscount] = useState("");
//   const [notes, setNotes] = useState("");
//   const [guaranteedBy, setGuaranteedBy] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const bill = parseFloat(vehicle.bill_amount) || 0;
//   const alreadyPaid = parseFloat(vehicle.total_paid) || 0;
//   const previousCredit = parseFloat(vehicle.previous_credit) || 0;
//   const discountAmount = Math.min(parseFloat(discount) || 0, bill);
//   const currentOutstanding = bill - alreadyPaid - discountAmount;
//   const totalOutstanding = currentOutstanding + previousCredit;

//   const addLine = () =>
//     setPartialLines((prev) => [
//       ...prev,
//       { method: "cash", amount: "", txnId: "" },
//     ]);
//   const removeLine = (i) =>
//     setPartialLines((prev) => prev.filter((_, idx) => idx !== i));
//   const updateLine = (i, field, val) =>
//     setPartialLines((prev) =>
//       prev.map((l, idx) => (idx === i ? { ...l, [field]: val } : l)),
//     );

//   const partialTotal = partialLines.reduce(
//     (s, l) => s + (parseFloat(l.amount) || 0),
//     0,
//   );
//   const partialCredit = partialLines
//     .filter((l) => l.method === "credit")
//     .reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);

//   // Does this payment involve any credit?
//   const hasAnyCredit =
//     (paymentType === "full" && fullMethod === "credit") ||
//     (paymentType === "partial" && partialCredit > 0);

//   const handleSubmit = async () => {
//     setError("");
//     setLoading(true);
//     const currentUser = getCurrentUser();

//     try {
//       // ── Validation ──
//       if (paymentType === "full") {
//         if (METHOD_NEEDS_TXN.includes(fullMethod) && !fullTxnId.trim()) {
//           setError("Transaction ID required for " + fullMethod);
//           setLoading(false);
//           return;
//         }
//       } else {
//         if (partialLines.length === 0) {
//           setError("Add at least one payment line");
//           setLoading(false);
//           return;
//         }
//         for (const l of partialLines) {
//           if (!l.amount || parseFloat(l.amount) <= 0) {
//             setError("All amounts must be > 0");
//             setLoading(false);
//             return;
//           }
//           if (METHOD_NEEDS_TXN.includes(l.method) && !l.txnId.trim()) {
//             setError(`Transaction ID required for ${l.method}`);
//             setLoading(false);
//             return;
//           }
//         }
//         if (Math.abs(partialTotal - totalOutstanding) > 0.01) {
//           setError(
//             `Partial amounts must sum to ${formatCurrency(totalOutstanding)} (outstanding). Got ${formatCurrency(partialTotal)}`,
//           );
//           setLoading(false);
//           return;
//         }
//       }

//       // Guarantor required if any credit involved
//       if (hasAnyCredit && !guaranteedBy.trim()) {
//         setError("Employee guarantee is required when giving credit");
//         setLoading(false);
//         return;
//       }

//       // ── Build payment rows ──
//       let paymentRows = [];
//       let newCreditAmount = 0;
//       let collectedAmount = 0;

//       if (paymentType === "full") {
//         if (fullMethod === "credit") {
//           paymentRows.push({
//             vehicle_id: vehicle.id,
//             amount: totalOutstanding,
//             payment_method: "credit",
//             transaction_id: null,
//             collected_by: currentUser?.id,
//             notes,
//           });
//           newCreditAmount = totalOutstanding;
//           collectedAmount = alreadyPaid;
//         } else {
//           paymentRows.push({
//             vehicle_id: vehicle.id,
//             amount: totalOutstanding,
//             payment_method: fullMethod,
//             transaction_id: fullTxnId || null,
//             collected_by: currentUser?.id,
//             notes,
//           });
//           collectedAmount = alreadyPaid + totalOutstanding;
//           newCreditAmount = 0;
//         }
//       } else {
//         for (const l of partialLines) {
//           paymentRows.push({
//             vehicle_id: vehicle.id,
//             amount: parseFloat(l.amount),
//             payment_method: l.method,
//             transaction_id: l.txnId || null,
//             collected_by: currentUser?.id,
//             notes: notes || null,
//           });
//         }
//         collectedAmount = alreadyPaid + (partialTotal - partialCredit);
//         newCreditAmount =
//           (parseFloat(vehicle.credit_amount) || 0) + partialCredit;
//       }

//       // ── Determine new payment_status ──
//       const totalNowPaid = collectedAmount;
//       const hasCredit = newCreditAmount > 0;
//       let paymentStatus = "paid";
//       if (hasCredit && totalNowPaid > 0) paymentStatus = "partial";
//       else if (hasCredit && totalNowPaid === 0) paymentStatus = "credit";
//       else if (totalNowPaid >= bill) paymentStatus = "paid";

//       // ── Insert payments ──
//       const { error: payErr } = await supabase
//         .from("payments")
//         .insert(paymentRows);
//       if (payErr) throw payErr;

//       // ── Update vehicle ──
//       // Only move to ready_for_exit if vehicle is already in payment stage
//       // If bill was generated before PDI, vehicle may still be in an earlier stage
//       const nextStage =
//         vehicle.current_stage === "payment"
//           ? "ready_for_exit"
//           : vehicle.current_stage;

//       const { error: vErr } = await supabase
//         .from("vehicles")
//         .update({
//           current_stage: nextStage,
//           current_status: "pending",
//           payment_status: paymentStatus,
//           total_paid: totalNowPaid,
//           credit_amount: newCreditAmount,
//           credit_guaranteed_by: hasAnyCredit ? guaranteedBy.trim() : null,
//           discount_amount: discountAmount > 0 ? discountAmount : null,
//           payment_received_at: new Date().toISOString(),
//           payment_received_by: currentUser?.id,
//         })
//         .eq("id", vehicle.id);
//       if (vErr) throw vErr;

//       // ── History ──
//       const summary =
//         paymentType === "full"
//           ? `Payment: ${formatCurrency(totalOutstanding)} via ${fullMethod}${discountAmount > 0 ? ` | Discount: ${formatCurrency(discountAmount)}` : ""}${hasAnyCredit ? ` | Guaranteed by: ${guaranteedBy}` : ""}`
//           : partialLines
//               .map((l) => `${formatCurrency(l.amount)} via ${l.method}`)
//               .join(", ") +
//             (discountAmount > 0
//               ? ` | Discount: ${formatCurrency(discountAmount)}`
//               : "") +
//             (hasAnyCredit ? ` | Guaranteed by: ${guaranteedBy}` : "");
//       await supabase.from("vehicle_history").insert([
//         {
//           vehicle_id: vehicle.id,
//           user_id: currentUser?.id || null,
//           stage: "payment",
//           action: "payment_received",
//           new_value: summary,
//           notes: notes || null,
//         },
//       ]);

//       alert(
//         `Payment processed! Vehicle moved to Ready for Exit.${hasCredit ? `\nCredit pending: ${formatCurrency(newCreditAmount)}` : ""}`,
//       );
//       onSuccess();
//     } catch (e) {
//       console.error(e);
//       setError(e.message || "Failed to process payment");
//       setLoading(false);
//     }
//   };

//   return (
//     <Overlay onClose={onClose}>
//       <div style={{ width: "100%", maxWidth: "580px" }}>
//         <ModalHeader
//           title="💳 Process Payment"
//           subtitle={`${vehicle.vehicle_number} • ${vehicle.customer_name}`}
//           onClose={onClose}
//         />

//         {/* Bill Summary */}
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "1fr 1fr",
//             gap: "12px",
//             marginBottom: previousCredit > 0 ? "12px" : "24px",
//           }}
//         >
//           <AmountBox
//             label="Current Bill"
//             amount={bill}
//             color="#f0f9ff"
//             border="#bae6fd"
//             text="#0c4a6e"
//           />
//           <AmountBox
//             label="Total Outstanding"
//             amount={totalOutstanding}
//             color="#fff7ed"
//             border={previousCredit > 0 ? "#f97316" : "#fed7aa"}
//             text="#9a3412"
//           />
//         </div>

//         {/* Previous credit warning */}
//         {previousCredit > 0 && (
//           <div
//             style={{
//               padding: "10px 14px",
//               backgroundColor: "#fef3c7",
//               border: "1px solid #fcd34d",
//               borderRadius: "8px",
//               marginBottom: "20px",
//               fontSize: "13px",
//               color: "#92400e",
//             }}
//           >
//             ⚠️ Includes <strong>{formatCurrency(previousCredit)}</strong> from
//             previous visit(s). Current bill:{" "}
//             <strong>{formatCurrency(bill)}</strong>
//           </div>
//         )}

//         {/* Discount */}
//         <div style={{ marginBottom: "20px" }}>
//           <label style={labelStyle}>Discount (Optional)</label>
//           <div style={{ position: "relative" }}>
//             <span
//               style={{
//                 position: "absolute",
//                 left: 14,
//                 top: "50%",
//                 transform: "translateY(-50%)",
//                 fontSize: 18,
//                 color: "#9ca3af",
//                 fontWeight: 700,
//               }}
//             >
//               ₹
//             </span>
//             <input
//               type="number"
//               value={discount}
//               onChange={(e) => setDiscount(e.target.value)}
//               placeholder="0"
//               min="0"
//               max={bill}
//               style={{
//                 width: "100%",
//                 padding: "11px 11px 11px 36px",
//                 border: "2px solid #e5e7eb",
//                 borderRadius: 8,
//                 fontSize: 16,
//                 fontWeight: 700,
//                 color: "#111827",
//                 background: "#fff",
//                 outline: "none",
//                 fontFamily: "inherit",
//                 boxSizing: "border-box",
//               }}
//               onFocus={(e) => (e.target.style.borderColor = "#10b981")}
//               onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
//             />
//           </div>
//           {discountAmount > 0 && (
//             <div
//               style={{
//                 marginTop: 6,
//                 padding: "6px 12px",
//                 background: "#f0fdf4",
//                 borderRadius: 6,
//                 border: "1px solid #86efac",
//                 fontSize: 13,
//                 color: "#166534",
//                 fontWeight: 600,
//               }}
//             >
//               ✅ Discount of ₹{discountAmount.toFixed(0)} applied — new
//               outstanding: {formatCurrency(totalOutstanding)}
//             </div>
//           )}
//         </div>

//         {/* Full / Partial Toggle */}
//         <div style={{ marginBottom: "20px" }}>
//           <label style={labelStyle}>Payment Type</label>
//           <div
//             style={{
//               display: "grid",
//               gridTemplateColumns: "1fr 1fr",
//               gap: "10px",
//             }}
//           >
//             {[
//               {
//                 v: "full",
//                 label: "✅ Full Payment",
//                 sub: `Pay full ${formatCurrency(totalOutstanding)}`,
//               },
//               {
//                 v: "partial",
//                 label: "⚡ Partial / Split",
//                 sub: "Split across methods",
//               },
//             ].map((opt) => (
//               <label
//                 key={opt.v}
//                 style={{
//                   ...optionCard,
//                   ...(paymentType === opt.v ? optionCardActive : {}),
//                 }}
//               >
//                 <input
//                   type="radio"
//                   name="payType"
//                   value={opt.v}
//                   checked={paymentType === opt.v}
//                   onChange={(e) => setPaymentType(e.target.value)}
//                   style={{ marginRight: "10px" }}
//                 />
//                 <div>
//                   <div
//                     style={{
//                       fontWeight: "700",
//                       fontSize: "14px",
//                       color: "#111827",
//                     }}
//                   >
//                     {opt.label}
//                   </div>
//                   <div style={{ fontSize: "12px", color: "#6b7280" }}>
//                     {opt.sub}
//                   </div>
//                 </div>
//               </label>
//             ))}
//           </div>
//         </div>

//         {/* Full Payment */}
//         {paymentType === "full" && (
//           <>
//             <div style={{ marginBottom: "16px" }}>
//               <label style={labelStyle}>Payment Method</label>
//               <div style={{ display: "grid", gap: "8px" }}>
//                 {PAYMENT_METHODS.map((m) => (
//                   <label
//                     key={m.value}
//                     style={{
//                       ...optionCard,
//                       ...(fullMethod === m.value ? optionCardActive : {}),
//                       flexDirection: "row",
//                       alignItems: "center",
//                       padding: "12px 16px",
//                     }}
//                   >
//                     <input
//                       type="radio"
//                       name="fullMethod"
//                       value={m.value}
//                       checked={fullMethod === m.value}
//                       onChange={(e) => setFullMethod(e.target.value)}
//                       style={{ marginRight: "10px" }}
//                     />
//                     <span style={{ fontSize: "20px", marginRight: "10px" }}>
//                       {m.icon}
//                     </span>
//                     <span style={{ fontWeight: "600", color: "#111827" }}>
//                       {m.label}
//                     </span>
//                     {m.value === "credit" && (
//                       <span
//                         style={{
//                           marginLeft: "auto",
//                           fontSize: "12px",
//                           color: "#9f1239",
//                           backgroundColor: "#fce7f3",
//                           padding: "2px 8px",
//                           borderRadius: "4px",
//                         }}
//                       >
//                         Vehicle exits, owes money
//                       </span>
//                     )}
//                   </label>
//                 ))}
//               </div>
//             </div>
//             {METHOD_NEEDS_TXN.includes(fullMethod) && (
//               <div style={{ marginBottom: "16px" }}>
//                 <label style={labelStyle}>Transaction ID *</label>
//                 <StyledInput
//                   value={fullTxnId}
//                   onChange={(e) => setFullTxnId(e.target.value)}
//                   placeholder="Enter transaction / reference ID"
//                 />
//               </div>
//             )}
//           </>
//         )}

//         {/* Partial Payment */}
//         {paymentType === "partial" && (
//           <div style={{ marginBottom: "16px" }}>
//             <div
//               style={{
//                 display: "flex",
//                 justifyContent: "space-between",
//                 alignItems: "center",
//                 marginBottom: "10px",
//               }}
//             >
//               <label style={{ ...labelStyle, marginBottom: 0 }}>
//                 Split Payment Lines
//               </label>
//               <button
//                 onClick={addLine}
//                 style={{
//                   padding: "6px 14px",
//                   backgroundColor: "#eff6ff",
//                   color: "#2563eb",
//                   border: "1px solid #bfdbfe",
//                   borderRadius: "6px",
//                   cursor: "pointer",
//                   fontSize: "13px",
//                   fontWeight: "600",
//                 }}
//               >
//                 + Add Line
//               </button>
//             </div>

//             {partialLines.map((line, i) => (
//               <div
//                 key={i}
//                 style={{
//                   display: "grid",
//                   gridTemplateColumns: "1fr 120px auto",
//                   gap: "10px",
//                   alignItems: "flex-start",
//                   marginBottom: "10px",
//                   padding: "14px",
//                   backgroundColor: "#f9fafb",
//                   borderRadius: "10px",
//                   border: "1px solid #e5e7eb",
//                 }}
//               >
//                 <div>
//                   <select
//                     value={line.method}
//                     onChange={(e) => updateLine(i, "method", e.target.value)}
//                     style={selectStyle}
//                   >
//                     {PAYMENT_METHODS.map((m) => (
//                       <option key={m.value} value={m.value}>
//                         {m.icon} {m.label}
//                       </option>
//                     ))}
//                   </select>
//                   {METHOD_NEEDS_TXN.includes(line.method) && (
//                     <StyledInput
//                       style={{ marginTop: "6px" }}
//                       value={line.txnId}
//                       onChange={(e) => updateLine(i, "txnId", e.target.value)}
//                       placeholder="Transaction ID"
//                     />
//                   )}
//                 </div>
//                 <StyledInput
//                   type="number"
//                   min="0"
//                   step="0.01"
//                   value={line.amount}
//                   onChange={(e) => updateLine(i, "amount", e.target.value)}
//                   placeholder="Amount"
//                 />
//                 {partialLines.length > 1 && (
//                   <button
//                     onClick={() => removeLine(i)}
//                     style={{
//                       padding: "8px 12px",
//                       backgroundColor: "#fee2e2",
//                       color: "#dc2626",
//                       border: "none",
//                       borderRadius: "6px",
//                       cursor: "pointer",
//                       fontSize: "16px",
//                       marginTop: "2px",
//                     }}
//                   >
//                     ✕
//                   </button>
//                 )}
//               </div>
//             ))}

//             {/* Running Total */}
//             <div
//               style={{
//                 padding: "12px 16px",
//                 backgroundColor:
//                   partialLines.length > 0 &&
//                   Math.abs(partialTotal - totalOutstanding) < 0.01
//                     ? "#f0fdf4"
//                     : "#fff7ed",
//                 borderRadius: "8px",
//                 border: `1px solid ${Math.abs(partialTotal - totalOutstanding) < 0.01 ? "#86efac" : "#fed7aa"}`,
//               }}
//             >
//               <div
//                 style={{
//                   display: "flex",
//                   justifyContent: "space-between",
//                   fontSize: "14px",
//                 }}
//               >
//                 <span style={{ color: "#374151" }}>Sum of lines:</span>
//                 <span style={{ fontWeight: "700", color: "#111827" }}>
//                   {formatCurrency(partialTotal)}
//                 </span>
//               </div>
//               {partialCredit > 0 && (
//                 <div
//                   style={{
//                     display: "flex",
//                     justifyContent: "space-between",
//                     fontSize: "13px",
//                     marginTop: "4px",
//                   }}
//                 >
//                   <span style={{ color: "#9f1239" }}>
//                     Credit portion (pending):
//                   </span>
//                   <span style={{ fontWeight: "700", color: "#9f1239" }}>
//                     {formatCurrency(partialCredit)}
//                   </span>
//                 </div>
//               )}
//               <div
//                 style={{
//                   display: "flex",
//                   justifyContent: "space-between",
//                   fontSize: "13px",
//                   marginTop: "4px",
//                 }}
//               >
//                 <span style={{ color: "#6b7280" }}>
//                   Must equal outstanding:
//                 </span>
//                 <span style={{ fontWeight: "600", color: "#6b7280" }}>
//                   {formatCurrency(totalOutstanding)}
//                 </span>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Guarantor — required when credit is involved */}
//         {hasAnyCredit && (
//           <div
//             style={{
//               marginBottom: "20px",
//               padding: "16px 20px",
//               backgroundColor: "#fef3c7",
//               borderRadius: "12px",
//               border: "2px solid #fcd34d",
//             }}
//           >
//             <label
//               style={{ ...labelStyle, color: "#92400e", marginBottom: "8px" }}
//             >
//               👤 Employee Guarantee <span style={{ color: "#dc2626" }}>*</span>
//             </label>
//             <p
//               style={{
//                 margin: "0 0 10px 0",
//                 fontSize: "12px",
//                 color: "#b45309",
//               }}
//             >
//               Credit cannot be issued without an employee taking responsibility.
//               This name will be recorded.
//             </p>
//             <StyledInput
//               value={guaranteedBy}
//               onChange={(e) => setGuaranteedBy(e.target.value)}
//               placeholder="Full name of guaranteeing employee..."
//               style={{
//                 color: "#111827",
//                 backgroundColor: "white",
//                 border: "2px solid #fcd34d",
//               }}
//             />
//           </div>
//         )}

//         {/* Notes */}
//         <div style={{ marginBottom: "20px" }}>
//           <label style={labelStyle}>Notes (Optional)</label>
//           <StyledInput
//             as="textarea"
//             rows={2}
//             value={notes}
//             onChange={(e) => setNotes(e.target.value)}
//             placeholder="Any additional notes..."
//           />
//         </div>

//         {error && (
//           <div
//             style={{
//               backgroundColor: "#fee2e2",
//               color: "#991b1b",
//               padding: "10px 14px",
//               borderRadius: "8px",
//               marginBottom: "14px",
//               fontSize: "14px",
//             }}
//           >
//             {error}
//           </div>
//         )}

//         <button
//           onClick={handleSubmit}
//           disabled={loading}
//           style={{
//             width: "100%",
//             padding: "16px",
//             background: loading
//               ? "#9ca3af"
//               : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
//             color: "white",
//             border: "none",
//             borderRadius: "10px",
//             cursor: loading ? "not-allowed" : "pointer",
//             fontSize: "16px",
//             fontWeight: "700",
//             boxShadow: "0 4px 12px rgba(16,185,129,0.3)",
//           }}
//         >
//           {loading
//             ? "Processing..."
//             : `✓ Confirm Payment • ${formatCurrency(totalOutstanding)}`}
//         </button>
//       </div>
//     </Overlay>
//   );
// }

// // ─── Modal: Collect Credit (group-based) ────────────────────────────────────

// function CreditCollectionModal({ group, onClose, onSuccess }) {
//   const creditPending = group.total_credit;
//   const [collectType, setCollectType] = useState("full");
//   const [method, setMethod] = useState("cash");
//   const [amount, setAmount] = useState(creditPending.toFixed(2));
//   const [txnId, setTxnId] = useState("");
//   const [notes, setNotes] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const handleCollect = async () => {
//     setError("");
//     const collectAmount = parseFloat(amount) || 0;
//     if (collectAmount <= 0) {
//       setError("Amount must be > 0");
//       return;
//     }
//     if (collectAmount > creditPending + 0.01) {
//       setError(
//         `Cannot collect more than outstanding ${formatCurrency(creditPending)}`,
//       );
//       return;
//     }
//     if (METHOD_NEEDS_TXN.includes(method) && !txnId.trim()) {
//       setError("Transaction ID required");
//       return;
//     }

//     setLoading(true);
//     const currentUser = getCurrentUser();

//     try {
//       // Deduct from visits oldest-first
//       let remaining = collectAmount;
//       const updates = [];
//       const sortedVisits = [...group.visits].sort(
//         (a, b) => new Date(a.entry_time) - new Date(b.entry_time),
//       );

//       for (const visit of sortedVisits) {
//         if (remaining <= 0) break;
//         const visitCredit = parseFloat(visit.credit_amount) || 0;
//         if (visitCredit <= 0) continue;
//         const deduct = Math.min(remaining, visitCredit);
//         const newCredit = visitCredit - deduct;
//         const newTotalPaid = (parseFloat(visit.total_paid) || 0) + deduct;
//         const newStatus = newCredit <= 0 ? "paid" : "partial";
//         updates.push({
//           id: visit.id,
//           credit_amount: newCredit,
//           total_paid: newTotalPaid,
//           payment_status: newStatus,
//         });
//         remaining -= deduct;
//       }

//       // Insert payment row (linked to first visit for record-keeping)
//       const { error: pErr } = await supabase.from("payments").insert([
//         {
//           vehicle_id: sortedVisits[0].id,
//           amount: collectAmount,
//           payment_method: method,
//           transaction_id: txnId || null,
//           collected_by: currentUser?.id,
//           notes: notes || null,
//         },
//       ]);
//       if (pErr) throw pErr;

//       // Apply updates to vehicles
//       for (const u of updates) {
//         const { error: vErr } = await supabase
//           .from("vehicles")
//           .update({
//             credit_amount: u.credit_amount,
//             total_paid: u.total_paid,
//             payment_status: u.payment_status,
//           })
//           .eq("id", u.id);
//         if (vErr) throw vErr;
//       }

//       // History on first visit
//       await supabase.from("vehicle_history").insert([
//         {
//           vehicle_id: sortedVisits[0].id,
//           user_id: currentUser?.id || null,
//           stage: "payment",
//           action: "credit_collected",
//           new_value: `Credit collected: ${formatCurrency(collectAmount)} via ${method}. Remaining: ${formatCurrency(Math.max(0, creditPending - collectAmount))}`,
//           notes: notes || null,
//         },
//       ]);

//       alert(
//         `✅ Credit collected: ${formatCurrency(collectAmount)}. Remaining: ${formatCurrency(Math.max(0, creditPending - collectAmount))}`,
//       );
//       onSuccess();
//     } catch (e) {
//       setError(e.message || "Failed to collect credit");
//       setLoading(false);
//     }
//   };

//   return (
//     <Overlay onClose={onClose}>
//       <div style={{ width: "100%", maxWidth: "480px" }}>
//         <ModalHeader
//           title="💰 Collect Credit"
//           subtitle={`${group.vehicle_number} • ${group.customer_name}`}
//           onClose={onClose}
//         />

//         <div style={{ marginBottom: "20px" }}>
//           <AmountBox
//             label="Credit Outstanding"
//             amount={creditPending}
//             color="#fff7ed"
//             border="#fed7aa"
//             text="#9a3412"
//           />
//         </div>

//         <div style={{ marginBottom: "16px" }}>
//           <label style={labelStyle}>Collection Type</label>
//           <div
//             style={{
//               display: "grid",
//               gridTemplateColumns: "1fr 1fr",
//               gap: "10px",
//             }}
//           >
//             {[
//               {
//                 v: "full",
//                 label: "✅ Full Credit",
//                 sub: formatCurrency(creditPending),
//               },
//               { v: "partial", label: "⚡ Partial", sub: "Collect part now" },
//             ].map((opt) => (
//               <label
//                 key={opt.v}
//                 style={{
//                   ...optionCard,
//                   ...(collectType === opt.v ? optionCardActive : {}),
//                 }}
//               >
//                 <input
//                   type="radio"
//                   name="collectType"
//                   value={opt.v}
//                   checked={collectType === opt.v}
//                   onChange={(e) => {
//                     setCollectType(e.target.value);
//                     if (e.target.value === "full")
//                       setAmount(creditPending.toFixed(2));
//                   }}
//                   style={{ marginRight: "8px" }}
//                 />
//                 <div>
//                   <div style={{ fontWeight: "700", fontSize: "14px" }}>
//                     {opt.label}
//                   </div>
//                   <div style={{ fontSize: "12px", color: "#6b7280" }}>
//                     {opt.sub}
//                   </div>
//                 </div>
//               </label>
//             ))}
//           </div>
//         </div>

//         {collectType === "partial" && (
//           <div style={{ marginBottom: "16px" }}>
//             <label style={labelStyle}>Amount to Collect</label>
//             <StyledInput
//               type="number"
//               min="0"
//               max={creditPending}
//               step="0.01"
//               value={amount}
//               onChange={(e) => setAmount(e.target.value)}
//               placeholder="Enter amount"
//             />
//           </div>
//         )}

//         <div style={{ marginBottom: "16px" }}>
//           <label style={labelStyle}>Payment Method</label>
//           <div style={{ display: "grid", gap: "8px" }}>
//             {PAYMENT_METHODS.filter((m) => m.value !== "credit").map((m) => (
//               <label
//                 key={m.value}
//                 style={{
//                   ...optionCard,
//                   ...(method === m.value ? optionCardActive : {}),
//                   flexDirection: "row",
//                   alignItems: "center",
//                   padding: "10px 14px",
//                 }}
//               >
//                 <input
//                   type="radio"
//                   name="creditMethod"
//                   value={m.value}
//                   checked={method === m.value}
//                   onChange={(e) => setMethod(e.target.value)}
//                   style={{ marginRight: "10px" }}
//                 />
//                 <span style={{ fontSize: "18px", marginRight: "8px" }}>
//                   {m.icon}
//                 </span>
//                 <span style={{ fontWeight: "600", color: "#111827" }}>
//                   {m.label}
//                 </span>
//               </label>
//             ))}
//           </div>
//         </div>

//         {METHOD_NEEDS_TXN.includes(method) && (
//           <div style={{ marginBottom: "16px" }}>
//             <label style={labelStyle}>Transaction ID *</label>
//             <StyledInput
//               value={txnId}
//               onChange={(e) => setTxnId(e.target.value)}
//               placeholder="Transaction / reference ID"
//             />
//           </div>
//         )}

//         <div style={{ marginBottom: "20px" }}>
//           <label style={labelStyle}>Notes (Optional)</label>
//           <StyledInput
//             as="textarea"
//             rows={2}
//             value={notes}
//             onChange={(e) => setNotes(e.target.value)}
//             placeholder="Notes..."
//           />
//         </div>

//         {error && (
//           <div
//             style={{
//               backgroundColor: "#fee2e2",
//               color: "#991b1b",
//               padding: "10px 14px",
//               borderRadius: "8px",
//               marginBottom: "14px",
//               fontSize: "14px",
//             }}
//           >
//             {error}
//           </div>
//         )}

//         <button
//           onClick={handleCollect}
//           disabled={loading}
//           style={{
//             width: "100%",
//             padding: "16px",
//             background: loading
//               ? "#9ca3af"
//               : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
//             color: "white",
//             border: "none",
//             borderRadius: "10px",
//             cursor: loading ? "not-allowed" : "pointer",
//             fontSize: "16px",
//             fontWeight: "700",
//           }}
//         >
//           {loading
//             ? "Processing..."
//             : `✓ Collect ${formatCurrency(parseFloat(amount) || 0)}`}
//         </button>
//       </div>
//     </Overlay>
//   );
// }

// // ─── Modal: Credit Statement (date-wise) ─────────────────────────────────────

// function CreditStatementModal({ group, onClose }) {
//   const [entries, setEntries] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     loadStatement();
//   }, []);

//   const loadStatement = async () => {
//     const vehicleIds = group.visits.map((v) => v.id);

//     const { data: payments } = await supabase
//       .from("payments")
//       .select("*, collector:users!payments_collected_by_fkey(full_name)")
//       .in("vehicle_id", vehicleIds)
//       .order("created_at", { ascending: true });

//     const statement = [];

//     // Each visit = a bill entry
//     group.visits.forEach((v) => {
//       statement.push({
//         type: "bill",
//         date: v.entry_time,
//         amount: parseFloat(v.bill_amount) || 0,
//         label: `Bill`,
//         sub: null,
//         id: `bill-${v.id}`,
//       });
//     });

//     // Each payment row
//     (payments || []).forEach((p) => {
//       const methodLabel =
//         p.payment_method === "bank_transfer"
//           ? "Bank Transfer"
//           : p.payment_method.charAt(0).toUpperCase() +
//             p.payment_method.slice(1);
//       statement.push({
//         type: p.payment_method === "credit" ? "credit_given" : "payment",
//         date: p.created_at,
//         amount: parseFloat(p.amount) || 0,
//         method: p.payment_method,
//         label:
//           p.payment_method === "credit"
//             ? `Credit Given`
//             : `Payment — ${methodLabel}`,
//         sub: p.transaction_id ? `TXN: ${p.transaction_id}` : null,
//         collector: p.collector?.full_name,
//         notes: p.notes,
//         id: p.id,
//       });
//     });

//     // Sort by date
//     statement.sort((a, b) => new Date(a.date) - new Date(b.date));

//     // Running balance
//     let balance = 0;
//     statement.forEach((e) => {
//       if (e.type === "bill" || e.type === "credit_given") balance += e.amount;
//       else balance -= e.amount;
//       e.runningBalance = balance;
//     });

//     setEntries(statement);
//     setLoading(false);
//   };

//   const totalBilled = group.visits.reduce(
//     (s, v) => s + (parseFloat(v.bill_amount) || 0),
//     0,
//   );
//   const totalCollected = group.visits.reduce(
//     (s, v) => s + (parseFloat(v.total_paid) || 0),
//     0,
//   );

//   return (
//     <Overlay onClose={onClose}>
//       <div style={{ width: "100%", maxWidth: "620px" }}>
//         <ModalHeader
//           title={`📅 ${group.vehicle_number} — Statement`}
//           subtitle={`${group.customer_name} • ${group.customer_phone}`}
//           onClose={onClose}
//         />

//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(3,1fr)",
//             gap: "12px",
//             marginBottom: "16px",
//           }}
//         >
//           <AmountBox
//             label="Total Billed"
//             amount={totalBilled}
//             color="#f0f9ff"
//             border="#bae6fd"
//             text="#0c4a6e"
//           />
//           <AmountBox
//             label="Total Collected"
//             amount={totalCollected}
//             color="#f0fdf4"
//             border="#86efac"
//             text="#166534"
//           />
//           <AmountBox
//             label="Outstanding"
//             amount={group.total_credit}
//             color="#fff7ed"
//             border="#fed7aa"
//             text="#9a3412"
//           />
//         </div>

//         {/* Guarantors */}
//         {(() => {
//           const guarantors = [
//             ...new Set(
//               group.visits.map((v) => v.credit_guaranteed_by).filter(Boolean),
//             ),
//           ];
//           return guarantors.length > 0 ? (
//             <div
//               style={{
//                 padding: "12px 16px",
//                 backgroundColor: "#fef3c7",
//                 borderRadius: "8px",
//                 border: "1px solid #fcd34d",
//                 marginBottom: "20px",
//                 display: "flex",
//                 alignItems: "center",
//                 gap: "10px",
//                 flexWrap: "wrap",
//               }}
//             >
//               <span
//                 style={{
//                   fontSize: "13px",
//                   fontWeight: "700",
//                   color: "#92400e",
//                 }}
//               >
//                 👤 Guaranteed by:
//               </span>
//               {guarantors.map((g, i) => (
//                 <span
//                   key={i}
//                   style={{
//                     padding: "3px 12px",
//                     backgroundColor: "white",
//                     color: "#92400e",
//                     borderRadius: "6px",
//                     fontSize: "13px",
//                     fontWeight: "700",
//                     border: "1px solid #fcd34d",
//                   }}
//                 >
//                   {g}
//                 </span>
//               ))}
//             </div>
//           ) : null;
//         })()}

//         {loading ? (
//           <p
//             style={{ color: "#9ca3af", textAlign: "center", padding: "40px 0" }}
//           >
//             Loading...
//           </p>
//         ) : (
//           <div>
//             <h4
//               style={{
//                 margin: "0 0 14px 0",
//                 fontSize: "14px",
//                 fontWeight: "700",
//                 color: "#374151",
//               }}
//             >
//               Transaction History ({entries.length} entries)
//             </h4>

//             <div style={{ position: "relative", paddingLeft: "20px" }}>
//               <div
//                 style={{
//                   position: "absolute",
//                   left: "7px",
//                   top: "12px",
//                   bottom: "12px",
//                   width: "2px",
//                   backgroundColor: "#e5e7eb",
//                 }}
//               />

//               {entries.map((entry, idx) => {
//                 const isBill = entry.type === "bill";
//                 const isCreditGiven = entry.type === "credit_given";
//                 const dotColor = isBill
//                   ? "#ef4444"
//                   : isCreditGiven
//                     ? "#f59e0b"
//                     : "#10b981";
//                 const rowBg = isBill
//                   ? "#fef2f2"
//                   : isCreditGiven
//                     ? "#fff7ed"
//                     : "#f0fdf4";
//                 const rowBorder = isBill
//                   ? "#fecaca"
//                   : isCreditGiven
//                     ? "#fed7aa"
//                     : "#bbf7d0";

//                 return (
//                   <div
//                     key={entry.id}
//                     style={{
//                       position: "relative",
//                       marginBottom: idx < entries.length - 1 ? "12px" : 0,
//                     }}
//                   >
//                     <div
//                       style={{
//                         position: "absolute",
//                         left: "-16px",
//                         top: "14px",
//                         width: "12px",
//                         height: "12px",
//                         borderRadius: "50%",
//                         backgroundColor: dotColor,
//                         border: "2px solid white",
//                         boxShadow: `0 0 0 2px ${dotColor}40`,
//                       }}
//                     />
//                     <div
//                       style={{
//                         padding: "12px 16px",
//                         backgroundColor: rowBg,
//                         borderRadius: "10px",
//                         border: `1px solid ${rowBorder}`,
//                       }}
//                     >
//                       <div
//                         style={{
//                           display: "flex",
//                           justifyContent: "space-between",
//                           alignItems: "flex-start",
//                         }}
//                       >
//                         <div style={{ flex: 1 }}>
//                           <div
//                             style={{
//                               fontSize: "14px",
//                               fontWeight: "700",
//                               color: "#111827",
//                             }}
//                           >
//                             {entry.label}
//                           </div>
//                           <div
//                             style={{
//                               fontSize: "12px",
//                               color: "#6b7280",
//                               marginTop: "3px",
//                             }}
//                           >
//                             📅 {formatIST(entry.date)}
//                           </div>
//                           {entry.sub && (
//                             <div
//                               style={{
//                                 fontSize: "12px",
//                                 color: "#9ca3af",
//                                 marginTop: "2px",
//                               }}
//                             >
//                               {entry.sub}
//                             </div>
//                           )}
//                           {entry.collector && (
//                             <div
//                               style={{
//                                 fontSize: "12px",
//                                 color: "#6b7280",
//                                 marginTop: "2px",
//                               }}
//                             >
//                               👤 {entry.collector}
//                             </div>
//                           )}
//                           {entry.notes && (
//                             <div
//                               style={{
//                                 fontSize: "12px",
//                                 color: "#9ca3af",
//                                 fontStyle: "italic",
//                                 marginTop: "2px",
//                               }}
//                             >
//                               📝 {entry.notes}
//                             </div>
//                           )}
//                         </div>
//                         <div style={{ textAlign: "right", marginLeft: "16px" }}>
//                           <div
//                             style={{
//                               fontSize: "17px",
//                               fontWeight: "800",
//                               color:
//                                 entry.type === "payment"
//                                   ? "#166534"
//                                   : "#9a3412",
//                             }}
//                           >
//                             {entry.type === "payment" ? "−" : "+"}
//                             {formatCurrency(entry.amount)}
//                           </div>
//                           <div
//                             style={{
//                               fontSize: "11px",
//                               color: "#9ca3af",
//                               marginTop: "3px",
//                             }}
//                           >
//                             Balance:{" "}
//                             <span
//                               style={{
//                                 fontWeight: "700",
//                                 color:
//                                   entry.runningBalance > 0.01
//                                     ? "#9a3412"
//                                     : "#166534",
//                               }}
//                             >
//                               {formatCurrency(entry.runningBalance)}
//                             </span>
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>

//             {/* Final Balance */}
//             <div
//               style={{
//                 marginTop: "20px",
//                 padding: "16px 20px",
//                 backgroundColor:
//                   group.total_credit > 0.01 ? "#fff7ed" : "#f0fdf4",
//                 borderRadius: "10px",
//                 border: `2px solid ${group.total_credit > 0.01 ? "#fed7aa" : "#86efac"}`,
//                 display: "flex",
//                 justifyContent: "space-between",
//                 alignItems: "center",
//               }}
//             >
//               <span
//                 style={{
//                   fontWeight: "700",
//                   fontSize: "15px",
//                   color: "#374151",
//                 }}
//               >
//                 {group.total_credit > 0.01
//                   ? "⚠️ Outstanding Balance"
//                   : "✅ Fully Cleared"}
//               </span>
//               <span
//                 style={{
//                   fontWeight: "800",
//                   fontSize: "22px",
//                   color: group.total_credit > 0.01 ? "#9a3412" : "#166534",
//                 }}
//               >
//                 {formatCurrency(group.total_credit)}
//               </span>
//             </div>
//           </div>
//         )}
//       </div>
//     </Overlay>
//   );
// }

// // ─── Modal: Vehicle Details ──────────────────────────────────────────────────

// function VehicleDetailsModal({ vehicle, onClose, onPayment }) {
//   const [history, setHistory] = useState([]);
//   const [payments, setPayments] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const load = async () => {
//       const [{ data: hist }, { data: pays }] = await Promise.all([
//         supabase
//           .from("vehicle_history")
//           .select("*, user:users!vehicle_history_user_id_fkey(full_name)")
//           .eq("vehicle_id", vehicle.id)
//           .order("created_at", { ascending: false }),
//         supabase
//           .from("payments")
//           .select("*, collector:users!payments_collected_by_fkey(full_name)")
//           .eq("vehicle_id", vehicle.id)
//           .order("created_at", { ascending: false }),
//       ]);
//       setHistory(hist || []);
//       setPayments(pays || []);
//       setLoading(false);
//     };
//     load();
//   }, [vehicle.id]);

//   const bill = parseFloat(vehicle.bill_amount) || 0;
//   const paid = parseFloat(vehicle.total_paid) || 0;
//   const credit = parseFloat(vehicle.credit_amount) || 0;

//   return (
//     <Overlay onClose={onClose}>
//       <div style={{ width: "100%", maxWidth: "800px" }}>
//         <div
//           style={{
//             display: "flex",
//             justifyContent: "space-between",
//             alignItems: "center",
//             marginBottom: "24px",
//           }}
//         >
//           <div>
//             <h3
//               style={{
//                 margin: 0,
//                 fontSize: "24px",
//                 color: "#111827",
//                 fontWeight: "700",
//               }}
//             >
//               🚗 {vehicle.vehicle_number}
//             </h3>
//             <p
//               style={{
//                 margin: "4px 0 0 0",
//                 fontSize: "14px",
//                 color: "#6b7280",
//               }}
//             >
//               {vehicle.customer_name} • {vehicle.customer_phone}
//             </p>
//           </div>
//           <div style={{ display: "flex", gap: "8px" }}>
//             <ActionButton
//               label="💳 Process Payment"
//               onClick={onPayment}
//               primary
//             />
//             <ActionButton label="Close" onClick={onClose} />
//           </div>
//         </div>

//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(3,1fr)",
//             gap: "12px",
//             marginBottom: "24px",
//           }}
//         >
//           <AmountBox
//             label="Total Bill"
//             amount={bill}
//             color="#f0f9ff"
//             border="#bae6fd"
//             text="#0c4a6e"
//           />
//           <AmountBox
//             label="Total Paid"
//             amount={paid}
//             color="#f0fdf4"
//             border="#86efac"
//             text="#166534"
//           />
//           <AmountBox
//             label="Credit Pending"
//             amount={credit}
//             color="#fff7ed"
//             border="#fed7aa"
//             text="#9a3412"
//           />
//         </div>

//         {loading ? (
//           <p style={{ color: "#9ca3af" }}>Loading...</p>
//         ) : (
//           <div
//             style={{
//               display: "grid",
//               gridTemplateColumns: "1fr 1fr",
//               gap: "24px",
//             }}
//           >
//             {/* Payments */}
//             <div>
//               <h4
//                 style={{
//                   margin: "0 0 12px 0",
//                   fontSize: "15px",
//                   fontWeight: "700",
//                   color: "#111827",
//                 }}
//               >
//                 💰 Payments ({payments.length})
//               </h4>
//               {payments.length === 0 ? (
//                 <p style={{ color: "#9ca3af", fontSize: "14px" }}>
//                   No payments yet
//                 </p>
//               ) : (
//                 <div style={{ display: "grid", gap: "8px" }}>
//                   {payments.map((p) => (
//                     <div
//                       key={p.id}
//                       style={{
//                         padding: "10px 14px",
//                         backgroundColor: "#f9fafb",
//                         borderRadius: "8px",
//                         border: "1px solid #e5e7eb",
//                       }}
//                     >
//                       <div
//                         style={{
//                           display: "flex",
//                           justifyContent: "space-between",
//                         }}
//                       >
//                         <span
//                           style={{
//                             fontWeight: "600",
//                             fontSize: "13px",
//                             color: "#111827",
//                           }}
//                         >
//                           {
//                             PAYMENT_METHODS.find(
//                               (m) => m.value === p.payment_method,
//                             )?.icon
//                           }{" "}
//                           {p.payment_method === "bank_transfer"
//                             ? "Bank Transfer"
//                             : p.payment_method}
//                         </span>
//                         <span
//                           style={{
//                             fontWeight: "700",
//                             fontSize: "14px",
//                             color:
//                               p.payment_method === "credit"
//                                 ? "#9a3412"
//                                 : "#166534",
//                           }}
//                         >
//                           {formatCurrency(p.amount)}
//                         </span>
//                       </div>
//                       <div
//                         style={{
//                           fontSize: "12px",
//                           color: "#6b7280",
//                           marginTop: "4px",
//                         }}
//                       >
//                         {formatIST(p.created_at)}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>
//             {/* History */}
//             <div>
//               <h4
//                 style={{
//                   margin: "0 0 12px 0",
//                   fontSize: "15px",
//                   fontWeight: "700",
//                   color: "#111827",
//                 }}
//               >
//                 🕐 Timeline
//               </h4>
//               <div
//                 style={{
//                   maxHeight: "320px",
//                   overflowY: "auto",
//                   display: "grid",
//                   gap: "8px",
//                 }}
//               >
//                 {history.map((item) => (
//                   <div
//                     key={item.id}
//                     style={{
//                       padding: "10px 14px",
//                       backgroundColor: "#f9fafb",
//                       borderRadius: "8px",
//                       border: "1px solid #e5e7eb",
//                     }}
//                   >
//                     <div
//                       style={{
//                         fontSize: "13px",
//                         fontWeight: "600",
//                         color: "#111827",
//                         textTransform: "capitalize",
//                       }}
//                     >
//                       {item.stage.replace(/_/g, " ")} —{" "}
//                       {item.action.replace(/_/g, " ")}
//                     </div>
//                     {item.user && (
//                       <div style={{ fontSize: "12px", color: "#6b7280" }}>
//                         👤 {item.user.full_name}
//                       </div>
//                     )}
//                     {item.new_value && (
//                       <div
//                         style={{
//                           fontSize: "13px",
//                           color: "#374151",
//                           marginTop: "4px",
//                         }}
//                       >
//                         {item.new_value}
//                       </div>
//                     )}
//                     <div
//                       style={{
//                         fontSize: "12px",
//                         color: "#9ca3af",
//                         marginTop: "4px",
//                       }}
//                     >
//                       {formatIST(item.created_at)}
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </Overlay>
//   );
// }

// // ─── Shared Small Components ─────────────────────────────────────────────────

// function Overlay({ children, onClose }) {
//   return (
//     <div
//       onClick={onClose}
//       style={{
//         position: "fixed",
//         inset: 0,
//         backgroundColor: "rgba(0,0,0,0.5)",
//         display: "flex",
//         justifyContent: "center",
//         alignItems: "center",
//         zIndex: 1000,
//         padding: "20px",
//       }}
//     >
//       <div
//         onClick={(e) => e.stopPropagation()}
//         style={{
//           backgroundColor: "white",
//           padding: "32px",
//           borderRadius: "16px",
//           width: "100%",
//           maxHeight: "90vh",
//           overflowY: "auto",
//           boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
//         }}
//       >
//         {children}
//       </div>
//     </div>
//   );
// }

// function ModalHeader({ title, subtitle, onClose }) {
//   return (
//     <div
//       style={{
//         display: "flex",
//         justifyContent: "space-between",
//         alignItems: "flex-start",
//         marginBottom: "24px",
//       }}
//     >
//       <div>
//         <h3
//           style={{
//             margin: 0,
//             fontSize: "22px",
//             color: "#111827",
//             fontWeight: "700",
//           }}
//         >
//           {title}
//         </h3>
//         {subtitle && (
//           <p
//             style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#6b7280" }}
//           >
//             {subtitle}
//           </p>
//         )}
//       </div>
//       <button
//         onClick={onClose}
//         style={{
//           backgroundColor: "#fee2e2",
//           color: "#dc2626",
//           padding: "8px 14px",
//           border: "none",
//           borderRadius: "8px",
//           cursor: "pointer",
//           fontSize: "14px",
//           fontWeight: "600",
//         }}
//       >
//         ✕
//       </button>
//     </div>
//   );
// }

// function AmountBox({ label, amount, color, border, text }) {
//   return (
//     <div
//       style={{
//         padding: "14px 16px",
//         backgroundColor: color,
//         borderRadius: "10px",
//         border: `2px solid ${border}`,
//         textAlign: "center",
//       }}
//     >
//       <div
//         style={{
//           fontSize: "12px",
//           color: "#6b7280",
//           fontWeight: "600",
//           marginBottom: "4px",
//         }}
//       >
//         {label}
//       </div>
//       <div style={{ fontSize: "22px", fontWeight: "800", color: text }}>
//         {formatCurrency(amount)}
//       </div>
//     </div>
//   );
// }

// function InfoRow({ label, value }) {
//   return (
//     <div style={{ display: "flex", gap: "8px", fontSize: "13px" }}>
//       <span style={{ color: "#9ca3af", minWidth: "90px" }}>{label}:</span>
//       <span style={{ color: "#111827", fontWeight: "500" }}>{value}</span>
//     </div>
//   );
// }

// function ModelBadge({ model, small }) {
//   return (
//     <span
//       style={{
//         backgroundColor: "#ede9fe",
//         color: "#5b21b6",
//         padding: small ? "2px 8px" : "4px 10px",
//         borderRadius: "6px",
//         fontSize: small ? "11px" : "12px",
//         fontWeight: "600",
//       }}
//     >
//       {model}
//     </span>
//   );
// }

// function PriorityBadge({ priority, small }) {
//   const isVip = priority === "vip";
//   return (
//     <span
//       style={{
//         padding: small ? "2px 8px" : "4px 10px",
//         backgroundColor: isVip ? "#fce7f3" : "#fee2e2",
//         color: isVip ? "#9f1239" : "#991b1b",
//         borderRadius: "6px",
//         fontSize: small ? "11px" : "12px",
//         fontWeight: "600",
//         textTransform: "uppercase",
//       }}
//     >
//       {priority}
//     </span>
//   );
// }

// function ActionButton({ label, onClick, primary }) {
//   return (
//     <button
//       onClick={onClick}
//       style={{
//         padding: "10px 20px",
//         border: primary ? "none" : "1px solid #d1d5db",
//         borderRadius: "8px",
//         cursor: "pointer",
//         fontSize: "14px",
//         fontWeight: "600",
//         background: primary
//           ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
//           : "#f3f4f6",
//         color: primary ? "white" : "#374151",
//         boxShadow: primary ? "0 4px 12px rgba(16,185,129,0.3)" : "none",
//         whiteSpace: "nowrap",
//       }}
//     >
//       {label}
//     </button>
//   );
// }

// function EmptyState({ icon, title, subtitle }) {
//   return (
//     <div
//       style={{
//         textAlign: "center",
//         padding: "80px 0",
//         color: "#6b7280",
//         backgroundColor: "white",
//         borderRadius: "16px",
//         border: "1px solid #e5e7eb",
//       }}
//     >
//       <div style={{ fontSize: "52px", marginBottom: "16px" }}>{icon}</div>
//       <p
//         style={{
//           fontSize: "18px",
//           margin: 0,
//           color: "#374151",
//           fontWeight: "600",
//         }}
//       >
//         {title}
//       </p>
//       <p style={{ fontSize: "14px", margin: "8px 0 0 0" }}>{subtitle}</p>
//     </div>
//   );
// }

// function StyledInput({ as, style, ...props }) {
//   const base = {
//     width: "100%",
//     padding: "10px 12px",
//     border: "2px solid #e5e7eb",
//     borderRadius: "8px",
//     fontSize: "14px",
//     boxSizing: "border-box",
//     fontFamily: "inherit",
//     outline: "none",
//     color: "#111827",
//     backgroundColor: "white",
//     ...style,
//   };
//   if (as === "textarea")
//     return <textarea style={{ ...base, resize: "vertical" }} {...props} />;
//   return <input style={base} {...props} />;
// }

// const labelStyle = {
//   display: "block",
//   fontSize: "13px",
//   fontWeight: "600",
//   color: "#374151",
//   marginBottom: "8px",
// };
// const optionCard = {
//   display: "flex",
//   alignItems: "center",
//   padding: "14px",
//   backgroundColor: "#f9fafb",
//   border: "2px solid #e5e7eb",
//   borderRadius: "10px",
//   cursor: "pointer",
//   color: "#111827",
// };
// const optionCardActive = {
//   backgroundColor: "#eff6ff",
//   borderColor: "#667eea",
//   color: "#111827",
// };
// const selectStyle = {
//   width: "100%",
//   padding: "10px 12px",
//   border: "2px solid #e5e7eb",
//   borderRadius: "8px",
//   fontSize: "14px",
//   boxSizing: "border-box",
//   backgroundColor: "white",
//   color: "#111827",
//   cursor: "pointer",
// };

// // ─── Tab: Collections Report ─────────────────────────────────────────────────

// function CollectionsReportTab({ payments }) {
//   const [search, setSearch] = useState("");
//   const [dateFrom, setDateFrom] = useState("");
//   const [dateTo, setDateTo] = useState("");
//   const [methodFilter, setMethodFilter] = useState("all");

//   // Filter logic
//   const filtered = payments.filter((p) => {
//     // Exclude credit-given rows from collection totals (they're debts, not collections)
//     // But DO show them in the list so cashier has full picture — just mark them differently

//     const matchSearch =
//       !search.trim() ||
//       p.vehicle?.vehicle_number?.toLowerCase().includes(search.toLowerCase()) ||
//       p.vehicle?.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
//       p.vehicle?.customer_phone?.includes(search) ||
//       p.transaction_id?.toLowerCase().includes(search.toLowerCase());

//     const pDate = new Date(p.created_at);
//     const matchFrom = !dateFrom || pDate >= new Date(dateFrom + "T00:00:00");
//     const matchTo = !dateTo || pDate <= new Date(dateTo + "T23:59:59");
//     const matchMethod =
//       methodFilter === "all" || p.payment_method === methodFilter;

//     return matchSearch && matchFrom && matchTo && matchMethod;
//   });

//   // Summary — only real collections (not credit-given)
//   const realCollections = filtered.filter((p) => p.payment_method !== "credit");
//   const creditGiven = filtered.filter((p) => p.payment_method === "credit");

//   const totalCollected = realCollections.reduce(
//     (s, p) => s + parseFloat(p.amount || 0),
//     0,
//   );
//   const totalCreditGiven = creditGiven.reduce(
//     (s, p) => s + parseFloat(p.amount || 0),
//     0,
//   );

//   // Method breakdown
//   const byMethod = {};
//   PAYMENT_METHODS.filter((m) => m.value !== "credit").forEach((m) => {
//     byMethod[m.value] = realCollections
//       .filter((p) => p.payment_method === m.value)
//       .reduce((s, p) => s + parseFloat(p.amount || 0), 0);
//   });

//   const hasFilters = search || dateFrom || dateTo || methodFilter !== "all";

//   return (
//     <div>
//       {/* Filter Bar */}
//       <div
//         style={{
//           backgroundColor: "white",
//           borderRadius: "12px",
//           padding: "20px 24px",
//           marginBottom: "20px",
//           border: "1px solid #e5e7eb",
//           display: "grid",
//           gridTemplateColumns: "1fr 160px 160px 180px auto",
//           gap: "12px",
//           alignItems: "flex-end",
//         }}
//       >
//         <div>
//           <label style={{ ...labelStyle, marginBottom: "6px" }}>
//             🔍 Search
//           </label>
//           <StyledInput
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             placeholder="Vehicle no., customer, TXN ID..."
//           />
//         </div>
//         <div>
//           <label style={{ ...labelStyle, marginBottom: "6px" }}>From</label>
//           <StyledInput
//             type="date"
//             value={dateFrom}
//             onChange={(e) => setDateFrom(e.target.value)}
//           />
//         </div>
//         <div>
//           <label style={{ ...labelStyle, marginBottom: "6px" }}>To</label>
//           <StyledInput
//             type="date"
//             value={dateTo}
//             onChange={(e) => setDateTo(e.target.value)}
//           />
//         </div>
//         <div>
//           <label style={{ ...labelStyle, marginBottom: "6px" }}>Method</label>
//           <select
//             value={methodFilter}
//             onChange={(e) => setMethodFilter(e.target.value)}
//             style={selectStyle}
//           >
//             <option value="all">All Methods</option>
//             {PAYMENT_METHODS.map((m) => (
//               <option key={m.value} value={m.value}>
//                 {m.icon} {m.label}
//               </option>
//             ))}
//           </select>
//         </div>
//         {hasFilters && (
//           <button
//             onClick={() => {
//               setSearch("");
//               setDateFrom("");
//               setDateTo("");
//               setMethodFilter("all");
//             }}
//             style={{
//               padding: "10px 16px",
//               backgroundColor: "#fee2e2",
//               color: "#dc2626",
//               border: "none",
//               borderRadius: "8px",
//               cursor: "pointer",
//               fontSize: "13px",
//               fontWeight: "600",
//               whiteSpace: "nowrap",
//             }}
//           >
//             ✕ Clear
//           </button>
//         )}
//       </div>

//       {/* Summary Cards */}
//       <div
//         style={{
//           display: "grid",
//           gridTemplateColumns: "repeat(3, 1fr)",
//           gap: "16px",
//           marginBottom: "20px",
//         }}
//       >
//         <div
//           style={{
//             backgroundColor: "white",
//             borderRadius: "12px",
//             padding: "20px",
//             border: "2px solid #86efac",
//           }}
//         >
//           <div
//             style={{
//               fontSize: "12px",
//               color: "#6b7280",
//               fontWeight: "600",
//               marginBottom: "6px",
//               textTransform: "uppercase",
//             }}
//           >
//             Total Collected {hasFilters ? "(filtered)" : ""}
//           </div>
//           <div
//             style={{ fontSize: "28px", fontWeight: "800", color: "#166534" }}
//           >
//             {formatCurrency(totalCollected)}
//           </div>
//           <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
//             {realCollections.length} transactions
//           </div>
//         </div>
//         <div
//           style={{
//             backgroundColor: "white",
//             borderRadius: "12px",
//             padding: "20px",
//             border: "2px solid #fed7aa",
//           }}
//         >
//           <div
//             style={{
//               fontSize: "12px",
//               color: "#6b7280",
//               fontWeight: "600",
//               marginBottom: "6px",
//               textTransform: "uppercase",
//             }}
//           >
//             Credit Given
//           </div>
//           <div
//             style={{ fontSize: "28px", fontWeight: "800", color: "#9a3412" }}
//           >
//             {formatCurrency(totalCreditGiven)}
//           </div>
//           <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
//             {creditGiven.length} transactions
//           </div>
//         </div>
//         {/* Method Breakdown */}
//         <div
//           style={{
//             backgroundColor: "white",
//             borderRadius: "12px",
//             padding: "16px 20px",
//             border: "1px solid #e5e7eb",
//           }}
//         >
//           <div
//             style={{
//               fontSize: "12px",
//               color: "#6b7280",
//               fontWeight: "600",
//               marginBottom: "10px",
//               textTransform: "uppercase",
//             }}
//           >
//             By Method
//           </div>
//           <div style={{ display: "grid", gap: "5px" }}>
//             {PAYMENT_METHODS.filter(
//               (m) => m.value !== "credit" && byMethod[m.value] > 0,
//             ).map((m) => (
//               <div
//                 key={m.value}
//                 style={{
//                   display: "flex",
//                   justifyContent: "space-between",
//                   fontSize: "13px",
//                 }}
//               >
//                 <span style={{ color: "#374151" }}>
//                   {m.icon} {m.label}
//                 </span>
//                 <span style={{ fontWeight: "700", color: "#111827" }}>
//                   {formatCurrency(byMethod[m.value])}
//                 </span>
//               </div>
//             ))}
//             {Object.values(byMethod).every((v) => v === 0) && (
//               <span style={{ fontSize: "13px", color: "#9ca3af" }}>
//                 No collections
//               </span>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Transactions Table */}
//       <div
//         style={{
//           backgroundColor: "white",
//           borderRadius: "12px",
//           border: "1px solid #e5e7eb",
//           overflow: "hidden",
//         }}
//       >
//         <div
//           style={{
//             padding: "16px 24px",
//             borderBottom: "1px solid #e5e7eb",
//             display: "flex",
//             justifyContent: "space-between",
//             alignItems: "center",
//           }}
//         >
//           <h4
//             style={{
//               margin: 0,
//               fontSize: "15px",
//               fontWeight: "700",
//               color: "#111827",
//             }}
//           >
//             Transaction History
//           </h4>
//           <span style={{ fontSize: "13px", color: "#6b7280" }}>
//             {filtered.length} records
//           </span>
//         </div>

//         {filtered.length === 0 ? (
//           <div
//             style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}
//           >
//             <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔍</div>
//             <p style={{ margin: 0, fontSize: "15px" }}>No transactions found</p>
//             {hasFilters && (
//               <p style={{ margin: "6px 0 0 0", fontSize: "13px" }}>
//                 Try adjusting filters
//               </p>
//             )}
//           </div>
//         ) : (
//           <div>
//             {/* Table Header */}
//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "140px 1fr 130px 120px 130px 110px",
//                 gap: "0",
//                 padding: "10px 24px",
//                 backgroundColor: "#f9fafb",
//                 borderBottom: "1px solid #e5e7eb",
//               }}
//             >
//               {[
//                 "Date & Time",
//                 "Vehicle / Customer",
//                 "Method",
//                 "Amount",
//                 "Transaction ID",
//                 "Collected By",
//               ].map((h) => (
//                 <div
//                   key={h}
//                   style={{
//                     fontSize: "11px",
//                     fontWeight: "700",
//                     color: "#6b7280",
//                     textTransform: "uppercase",
//                   }}
//                 >
//                   {h}
//                 </div>
//               ))}
//             </div>

//             {/* Rows */}
//             <div style={{ maxHeight: "520px", overflowY: "auto" }}>
//               {filtered.map((p, idx) => {
//                 const isCredit = p.payment_method === "credit";
//                 const method = PAYMENT_METHODS.find(
//                   (m) => m.value === p.payment_method,
//                 );
//                 return (
//                   <div
//                     key={p.id}
//                     style={{
//                       display: "grid",
//                       gridTemplateColumns: "140px 1fr 130px 120px 130px 110px",
//                       gap: "0",
//                       padding: "14px 24px",
//                       backgroundColor: isCredit
//                         ? "#fffbeb"
//                         : idx % 2 === 0
//                           ? "white"
//                           : "#fafafa",
//                       borderBottom: "1px solid #f3f4f6",
//                     }}
//                   >
//                     <div style={{ fontSize: "12px", color: "#6b7280" }}>
//                       {new Date(p.created_at).toLocaleDateString("en-IN", {
//                         timeZone: "Asia/Kolkata",
//                         day: "2-digit",
//                         month: "short",
//                         year: "numeric",
//                       })}
//                       <div style={{ color: "#9ca3af" }}>
//                         {new Date(p.created_at).toLocaleTimeString("en-IN", {
//                           timeZone: "Asia/Kolkata",
//                           hour: "2-digit",
//                           minute: "2-digit",
//                         })}
//                       </div>
//                     </div>
//                     <div>
//                       <div
//                         style={{
//                           fontSize: "14px",
//                           fontWeight: "700",
//                           color: "#111827",
//                         }}
//                       >
//                         {p.vehicle?.vehicle_number || "—"}
//                       </div>
//                       <div style={{ fontSize: "12px", color: "#6b7280" }}>
//                         {p.vehicle?.customer_name || "—"}
//                       </div>
//                     </div>
//                     <div
//                       style={{
//                         display: "flex",
//                         alignItems: "center",
//                         gap: "6px",
//                       }}
//                     >
//                       <span style={{ fontSize: "16px" }}>{method?.icon}</span>
//                       <span
//                         style={{
//                           fontSize: "13px",
//                           color: "#374151",
//                           fontWeight: "500",
//                         }}
//                       >
//                         {p.payment_method === "bank_transfer"
//                           ? "Bank"
//                           : p.payment_method === "credit"
//                             ? "Credit Given"
//                             : method?.label}
//                       </span>
//                     </div>
//                     <div
//                       style={{
//                         fontSize: "15px",
//                         fontWeight: "800",
//                         color: isCredit ? "#9a3412" : "#166534",
//                       }}
//                     >
//                       {isCredit ? "−" : "+"}
//                       {formatCurrency(p.amount)}
//                     </div>
//                     <div
//                       style={{
//                         fontSize: "12px",
//                         color: "#6b7280",
//                         wordBreak: "break-all",
//                       }}
//                     >
//                       {p.transaction_id || (
//                         <span style={{ color: "#d1d5db" }}>—</span>
//                       )}
//                     </div>
//                     <div style={{ fontSize: "12px", color: "#6b7280" }}>
//                       {p.collector?.full_name || "—"}
//                       {isCredit && p.vehicle?.credit_guaranteed_by && (
//                         <div
//                           style={{
//                             marginTop: "3px",
//                             color: "#92400e",
//                             fontWeight: "600",
//                           }}
//                         >
//                           👤 {p.vehicle.credit_guaranteed_by}
//                         </div>
//                       )}
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// export default CashierDashboard;

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
    if (collectAmount <= 0) throw new Error("Amount must be > 0");
    if (collectAmount > creditPending + 0.01)
      throw new Error(`Cannot collect more than ${fmtINR(creditPending)}`);
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
        updates.push({
          id: visit.id,
          credit_amount: visitCredit - deduct,
          total_paid: (parseFloat(visit.total_paid) || 0) + deduct,
          payment_status: visitCredit - deduct <= 0 ? "paid" : "partial",
        });
        remaining -= deduct;
      }
      const { error: pErr } = await supabase.from("payments").insert([
        {
          vehicle_id: sortedVisits[0].id,
          amount: collectAmount,
          payment_method: method,
          transaction_id: txnId || null,
          collected_by: user?.id,
          notes: notes || null,
        },
      ]);
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
      await supabase.from("vehicle_history").insert([
        {
          vehicle_id: sortedVisits[0].id,
          user_id: user?.id || null,
          stage: "payment",
          action: "credit_collected",
          new_value: `Credit collected: ${fmtINR(collectAmount)} via ${methodLabel(method)}. Remaining: ${fmtINR(Math.max(0, creditPending - collectAmount))}`,
          notes: notes || null,
        },
      ]);
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

function PendingTab({ vehicles, onPayment, onDetails }) {
  const [search, setSearch] = useState("");
  const filtered = vehicles
    .filter((v) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        v.vehicle_number?.toLowerCase().includes(q) ||
        v.customer_name?.toLowerCase().includes(q) ||
        v.customer_phone?.includes(q)
      );
    })
    .sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority || "normal"] ?? 2;
      const pb = PRIORITY_ORDER[b.priority || "normal"] ?? 2;
      if (pa !== pb) return pa - pb;
      return new Date(toZ(a.entry_time)) - new Date(toZ(b.entry_time));
    });

  if (!vehicles.length)
    return (
      <EmptyState
        icon="✅"
        title="No pending payments"
        subtitle="All vehicles processed!"
      />
    );
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
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
        {vehicles.some(
          (v) => v.priority === "vip" || v.priority === "urgent",
        ) && (
          <span
            style={{ fontSize: 12, color: C.textMuted, fontStyle: "italic" }}
          >
            👑 VIP & urgent sorted first
          </span>
        )}
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No results"
          subtitle={`No match for "${search}"`}
        />
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {filtered.map((v) => (
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
  );
}

// ─── Tab: Pipeline ────────────────────────────────────────────────────────────
function PipelineTab({ vehicles }) {
  const [showAll, setShowAll] = useState(false);
  // FIX: tyre_fitting removed from STAGE_LABELS and STAGE_ORDER
  const STAGE_LABELS = {
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
  const STAGE_ORDER = [
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
  const billingV = vehicles.filter((v) => v.current_stage === "billing");
  const displayed = showAll ? vehicles : billingV;
  const grouped = {};
  displayed.forEach((v) => {
    const s = v.current_stage;
    if (!grouped[s]) grouped[s] = [];
    grouped[s].push(v);
  });
  const stages = STAGE_ORDER.filter((s) => grouped[s]?.length > 0);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <span style={{ fontSize: 13, color: C.textMuted }}>
          {showAll
            ? `All ${vehicles.length} active vehicles`
            : `${billingV.length} in billing${vehicles.length - billingV.length > 0 ? ` (+${vehicles.length - billingV.length} elsewhere)` : ""}`}
        </span>
        <Btn
          variant="ghost"
          onClick={() => setShowAll((p) => !p)}
          style={{ fontSize: 13, padding: "7px 14px" }}
        >
          {showAll ? "📋 Billing Only" : "🔍 Show All Stages"}
        </Btn>
      </div>
      {displayed.length === 0 ? (
        <EmptyState
          icon={showAll ? "🔜" : "🧾"}
          title={showAll ? "No active vehicles" : "No vehicles in billing"}
          subtitle={showAll ? "All clear!" : "Nothing heading to payment yet"}
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
                <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
                  {STAGE_LABELS[stage] || stage.replace(/_/g, " ")}
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
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
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
                      style={{ display: "flex", alignItems: "center", gap: 20 }}
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
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
    const matchFrom = !dateFrom || pDate >= new Date(dateFrom + "T00:00:00");
    const matchTo = !dateTo || pDate <= new Date(dateTo + "T23:59:59");
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
  const [tab, setTab] = useState("pending");
  const [pendingVehicles, setPendingVehicles] = useState([]);
  const [pipelineVehicles, setPipelineVehicles] = useState([]);
  const [creditGroups, setCreditGroups] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [todayPayments, setTodayPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedCredit, setSelectedCredit] = useState(null);
  const [modal, setModal] = useState(null); // "payment"|"details"|"credit"|"statement"

  // FIX 5: showLoader param — realtime uses fetchData(false)
  const fetchData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      // FIX 6: IST midnight UTC — was setHours (local TZ)
      const todayStartUTC = getISTMidnightUTC();

      const [pendingRes, pipelineRes, creditRes, todayPayRes, allPayRes] =
        await Promise.all([
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
        ]);

      // Enrich pending vehicles with previous credit from same vehicle_number
      const enriched = await Promise.all(
        (pendingRes.data || []).map(async (v) => {
          const { data: prevC } = await supabase
            .from("vehicles")
            .select("id,credit_amount")
            .eq("vehicle_number", v.vehicle_number)
            .gt("credit_amount", 0)
            .neq("id", v.id)
            .is("deleted_at", null);
          return {
            ...v,
            previous_credit: (prevC || []).reduce(
              (s, p) => s + (parseFloat(p.credit_amount) || 0),
              0,
            ),
          };
        }),
      );

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
      setPipelineVehicles(pipelineRes.data || []);
      setCreditGroups(
        Object.values(grouped).sort((a, b) => b.total_credit - a.total_credit),
      );
      setTodayPayments(todayPayRes.data || []);
      setAllPayments(allPayRes.data || []);
    } catch (e) {
      console.error("CashierDashboard fetchData error:", e);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
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
  }, [fetchData]);

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

  const TABS = [
    {
      id: "pending",
      label: "💳 Pending Payments",
      count: pendingVehicles.length,
    },
    { id: "pipeline", label: "🔜 Upcoming", count: pipelineVehicles.length },
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
        {tab === "pending" && (
          <PendingTab
            vehicles={pendingVehicles}
            onPayment={(v) => {
              setSelectedVehicle(v);
              setModal("payment");
            }}
            onDetails={(v) => {
              setSelectedVehicle(v);
              setModal("details");
            }}
          />
        )}
        {tab === "pipeline" && <PipelineTab vehicles={pipelineVehicles} />}
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
