// import { useState, useEffect } from "react";
// import { supabase } from "../lib/supabase";
// import {
//   BeautifulHeader,
//   BeautifulStatCard,
//   BeautifulTabs,
//   BeautifulLoading,
// } from "./BeautifulComponents";

// function AdvisorDashboard({ user, onLogout }) {
//   const [activeTab, setActiveTab] = useState("needs-assignment");
//   const [vehicles, setVehicles] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [selectedVehicle, setSelectedVehicle] = useState(null);
//   const [showAssignWork, setShowAssignWork] = useState(false);
//   const [showPDI, setShowPDI] = useState(false);

//   useEffect(() => {
//     fetchData();
//   }, []);

//   const fetchData = async () => {
//     try {
//       // Fetch all vehicles with user info and work stages
//       const { data: vehiclesData } = await supabase
//         .from("vehicles")
//         .select(
//           `
//           *,
//           locked_by_user:users!vehicles_locked_by_fkey(full_name),
//           work_stages(*)
//         `
//         )
//         .order("entry_time", { ascending: false });

//       setVehicles(vehiclesData || []);
//       setLoading(false);
//     } catch (error) {
//       console.error("Error fetching data:", error);
//       setLoading(false);
//     }
//   };

//   const getVehiclesByStage = (stage) => {
//     return vehicles.filter((v) => v.current_stage === stage);
//   };

//   const getNeedsAssignment = () => {
//     return vehicles.filter((v) => v.current_stage === "advisor_review");
//   };

//   const getPendingPDI = () => {
//     return vehicles.filter((v) => v.current_stage === "pdi");
//   };

//   const getStats = () => {
//     const needsAssignment = getNeedsAssignment().length;
//     const pendingPDI = getPendingPDI().length;
//     const inProgress = vehicles.filter(
//       (v) => !["completed", "front_checkup", "pdi"].includes(v.current_stage)
//     ).length;
//     const completedToday = vehicles.filter(
//       (v) =>
//         v.current_stage === "completed" &&
//         new Date(v.entry_time).toDateString() === new Date().toDateString()
//     ).length;

//     return { needsAssignment, pendingPDI, inProgress, completedToday };
//   };

//   const stats = getStats();

//   if (loading) {
//     return <BeautifulLoading />;
//   }

//   return (
//     <div
//       style={{
//         minHeight: "100vh",
//         backgroundColor: "#f3f4f6",
//         fontFamily:
//           '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
//       }}
//     >
//       {/* Header - Beautiful Gradient */}
//       <BeautifulHeader
//         title="Advisor Dashboard"
//         subtitle="Tata Motors Service Center"
//         userName={user.full_name}
//         onLogout={onLogout}
//       />

//       {/* Stats Cards */}
//       <div style={{ padding: "32px 40px 20px 40px" }}>
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(4, 1fr)",
//             gap: "24px",
//           }}
//         >
//           <BeautifulStatCard
//             title="Needs Assignment"
//             value={stats.needsAssignment}
//             icon="📋"
//             color="#ef4444"
//             bgColor="#fee2e2"
//           />
//           <BeautifulStatCard
//             title="Pending PDI"
//             value={stats.pendingPDI}
//             icon="✅"
//             color="#f59e0b"
//             bgColor="#fef3c7"
//           />
//           <BeautifulStatCard
//             title="In Progress"
//             value={stats.inProgress}
//             icon="🔧"
//             color="#3b82f6"
//             bgColor="#dbeafe"
//           />
//           <BeautifulStatCard
//             title="Completed Today"
//             value={stats.completedToday}
//             icon="🎉"
//             color="#10b981"
//             bgColor="#dcfce7"
//           />
//         </div>
//       </div>

//       {/* Critical Alerts */}
//       <div style={{ padding: "0 40px 24px 40px" }}>
//         <div
//           style={{
//             backgroundColor: "white",
//             padding: "32px",
//             borderRadius: "12px",
//             boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
//           }}
//         >
//           <h3
//             style={{
//               margin: "0 0 24px 0",
//               fontSize: "20px",
//               color: "#111827",
//               fontWeight: "700",
//             }}
//           >
//             🚨 Critical Alerts
//           </h3>

//           <div style={{ display: "grid", gap: "16px" }}>
//             {/* Pending Vehicles Alert */}
//             {(() => {
//               const pendingVehicles = vehicles.filter(
//                 (v) => v.current_stage === "pending"
//               );
//               return (
//                 <div
//                   style={{
//                     backgroundColor:
//                       pendingVehicles.length > 0 ? "#fef2f2" : "#f0fdf4",
//                     border: `2px solid ${
//                       pendingVehicles.length > 0 ? "#fca5a5" : "#86efac"
//                     }`,
//                     padding: "12px 16px",
//                     borderRadius: "8px",
//                     display: "flex",
//                     justifyContent: "space-between",
//                     alignItems: "center",
//                   }}
//                 >
//                   <div>
//                     <span
//                       style={{
//                         fontSize: "14px",
//                         color:
//                           pendingVehicles.length > 0 ? "#991b1b" : "#166534",
//                         fontWeight: "600",
//                       }}
//                     >
//                       🔴 Pending: {pendingVehicles.length}
//                     </span>
//                     <span style={{ margin: "0 8px", color: "#d1d5db" }}>•</span>
//                     <span
//                       style={{
//                         fontSize: "13px",
//                         color:
//                           pendingVehicles.length > 0 ? "#7f1d1d" : "#14532d",
//                       }}
//                     >
//                       {pendingVehicles.length === 0
//                         ? "All assigned"
//                         : "Needs urgent attention"}
//                     </span>
//                   </div>
//                   <span
//                     style={{
//                       fontSize: "20px",
//                       fontWeight: "bold",
//                       color: pendingVehicles.length > 0 ? "#dc2626" : "#16a34a",
//                     }}
//                   >
//                     {pendingVehicles.length}
//                   </span>
//                 </div>
//               );
//             })()}

//             {/* Early Warning + Overdue Alert */}
//             {(() => {
//               const now = new Date();
//               const warningThresholdMinutes = 30;

//               const warningVehicles = vehicles.filter((v) => {
//                 if (
//                   v.current_stage === "completed" ||
//                   !v.expected_completion_time
//                 )
//                   return false;
//                 const expectedTime = new Date(v.expected_completion_time);
//                 const minutesUntilDue = (expectedTime - now) / (1000 * 60);
//                 return (
//                   minutesUntilDue > 0 &&
//                   minutesUntilDue <= warningThresholdMinutes
//                 );
//               });

//               const overdueVehicles = vehicles.filter((v) => {
//                 if (
//                   v.current_stage === "completed" ||
//                   !v.expected_completion_time
//                 )
//                   return false;
//                 const expectedTime = new Date(v.expected_completion_time);
//                 return now > expectedTime;
//               });

//               const totalAlerts =
//                 warningVehicles.length + overdueVehicles.length;

//               return (
//                 <div
//                   style={{
//                     backgroundColor: totalAlerts > 0 ? "#fef3c7" : "#f0fdf4",
//                     border: `2px solid ${
//                       totalAlerts > 0 ? "#fbbf24" : "#86efac"
//                     }`,
//                     padding: "12px 16px",
//                     borderRadius: "8px",
//                     display: "flex",
//                     justifyContent: "space-between",
//                     alignItems: "center",
//                   }}
//                 >
//                   <div>
//                     <span
//                       style={{
//                         fontSize: "14px",
//                         color: totalAlerts > 0 ? "#92400e" : "#166534",
//                         fontWeight: "600",
//                       }}
//                     >
//                       ⏰ Time Alerts: {totalAlerts}
//                     </span>
//                     <span style={{ margin: "0 8px", color: "#d1d5db" }}>•</span>
//                     <span
//                       style={{
//                         fontSize: "13px",
//                         color: totalAlerts > 0 ? "#78350f" : "#14532d",
//                       }}
//                     >
//                       {overdueVehicles.length > 0 &&
//                         `${overdueVehicles.length} overdue`}
//                       {overdueVehicles.length > 0 &&
//                         warningVehicles.length > 0 &&
//                         ", "}
//                       {warningVehicles.length > 0 &&
//                         `${warningVehicles.length} due soon`}
//                       {totalAlerts === 0 && "All on track"}
//                     </span>
//                   </div>
//                   <span
//                     style={{
//                       fontSize: "20px",
//                       fontWeight: "bold",
//                       color: totalAlerts > 0 ? "#f59e0b" : "#16a34a",
//                     }}
//                   >
//                     {totalAlerts}
//                   </span>
//                 </div>
//               );
//             })()}

//             {/* VIP/Urgent Priority Alert */}
//             {(() => {
//               const priorityVehicles = vehicles.filter(
//                 (v) =>
//                   (v.priority === "vip" || v.priority === "urgent") &&
//                   v.current_stage !== "completed"
//               );
//               return (
//                 <div
//                   style={{
//                     backgroundColor:
//                       priorityVehicles.length > 0 ? "#fef3c7" : "#f0fdf4",
//                     border: `2px solid ${
//                       priorityVehicles.length > 0 ? "#fbbf24" : "#86efac"
//                     }`,
//                     padding: "12px 16px",
//                     borderRadius: "8px",
//                     display: "flex",
//                     justifyContent: "space-between",
//                     alignItems: "center",
//                   }}
//                 >
//                   <div>
//                     <span
//                       style={{
//                         fontSize: "14px",
//                         color:
//                           priorityVehicles.length > 0 ? "#92400e" : "#166534",
//                         fontWeight: "600",
//                       }}
//                     >
//                       🔥 Priority: {priorityVehicles.length}
//                     </span>
//                     <span style={{ margin: "0 8px", color: "#d1d5db" }}>•</span>
//                     <span
//                       style={{
//                         fontSize: "13px",
//                         color:
//                           priorityVehicles.length > 0 ? "#78350f" : "#14532d",
//                       }}
//                     >
//                       {priorityVehicles.length === 0
//                         ? "No priority vehicles"
//                         : "VIP/Urgent in service"}
//                     </span>
//                   </div>
//                   <span
//                     style={{
//                       fontSize: "20px",
//                       fontWeight: "bold",
//                       color:
//                         priorityVehicles.length > 0 ? "#f59e0b" : "#16a34a",
//                     }}
//                   >
//                     {priorityVehicles.length}
//                   </span>
//                 </div>
//               );
//             })()}
//           </div>
//         </div>
//       </div>

//       {/* Tabs - Beautiful */}
//       <BeautifulTabs
//         tabs={[
//           { id: "needs-assignment", label: "Needs Assignment", icon: "📋" },
//           { id: "pending-pdi", label: "Pending PDI", icon: "✅" },
//           { id: "all-departments", label: "All Departments", icon: "🏭" },
//         ]}
//         activeTab={activeTab}
//         onTabChange={setActiveTab}
//       />

//       {/* Content */}
//       <div style={{ padding: "24px 40px" }}>
//         {activeTab === "needs-assignment" && (
//           <div>
//             <h3
//               style={{
//                 margin: "0 0 20px 0",
//                 fontSize: "18px",
//                 color: "#111827",
//               }}
//             >
//               Vehicles Ready for Work Assignment ({getNeedsAssignment().length})
//             </h3>
//             {getNeedsAssignment().length === 0 ? (
//               <div
//                 style={{
//                   backgroundColor: "white",
//                   padding: "60px",
//                   borderRadius: "12px",
//                   textAlign: "center",
//                 }}
//               >
//                 <p style={{ color: "#6b7280", fontSize: "16px" }}>
//                   ✅ No vehicles waiting for assignment
//                 </p>
//               </div>
//             ) : (
//               <div style={{ display: "grid", gap: "16px" }}>
//                 {getNeedsAssignment().map((vehicle) => (
//                   <div
//                     key={vehicle.id}
//                     style={{
//                       backgroundColor: "white",
//                       padding: "20px",
//                       borderRadius: "12px",
//                       boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
//                       display: "flex",
//                       justifyContent: "space-between",
//                       alignItems: "center",
//                     }}
//                   >
//                     <div>
//                       <h4
//                         style={{
//                           margin: 0,
//                           fontSize: "18px",
//                           fontWeight: "600",
//                           color: "#111827",
//                         }}
//                       >
//                         {vehicle.vehicle_number}
//                       </h4>
//                       <p
//                         style={{
//                           margin: "4px 0 0 0",
//                           fontSize: "14px",
//                           color: "#6b7280",
//                         }}
//                       >
//                         Customer: {vehicle.customer_name || "N/A"} • Entry:{" "}
//                         {new Date(vehicle.entry_time).toLocaleString()}
//                       </p>
//                     </div>
//                     <button
//                       onClick={() => {
//                         setSelectedVehicle(vehicle);
//                         setShowAssignWork(true);
//                       }}
//                       style={{
//                         backgroundColor: "#2563eb",
//                         color: "white",
//                         padding: "10px 20px",
//                         border: "none",
//                         borderRadius: "8px",
//                         cursor: "pointer",
//                         fontSize: "14px",
//                         fontWeight: "600",
//                       }}
//                     >
//                       Assign Work
//                     </button>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         )}

//         {activeTab === "pending-pdi" && (
//           <div>
//             <h3
//               style={{
//                 margin: "0 0 20px 0",
//                 fontSize: "18px",
//                 color: "#111827",
//               }}
//             >
//               Vehicles Ready for PDI ({getPendingPDI().length})
//             </h3>
//             {getPendingPDI().length === 0 ? (
//               <div
//                 style={{
//                   backgroundColor: "white",
//                   padding: "60px",
//                   borderRadius: "12px",
//                   textAlign: "center",
//                 }}
//               >
//                 <p style={{ color: "#6b7280", fontSize: "16px" }}>
//                   ✅ No vehicles waiting for PDI
//                 </p>
//               </div>
//             ) : (
//               <div style={{ display: "grid", gap: "16px" }}>
//                 {getPendingPDI().map((vehicle) => (
//                   <div
//                     key={vehicle.id}
//                     style={{
//                       backgroundColor: "white",
//                       padding: "20px",
//                       borderRadius: "12px",
//                       boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
//                       display: "flex",
//                       justifyContent: "space-between",
//                       alignItems: "center",
//                     }}
//                   >
//                     <div>
//                       <h4
//                         style={{
//                           margin: 0,
//                           fontSize: "18px",
//                           fontWeight: "600",
//                           color: "#111827",
//                         }}
//                       >
//                         {vehicle.vehicle_number}
//                       </h4>
//                       <p
//                         style={{
//                           margin: "4px 0 0 0",
//                           fontSize: "14px",
//                           color: "#6b7280",
//                         }}
//                       >
//                         Customer: {vehicle.customer_name || "N/A"} • Work
//                         completed
//                       </p>
//                     </div>
//                     <button
//                       onClick={() => {
//                         setSelectedVehicle(vehicle);
//                         setShowPDI(true);
//                       }}
//                       style={{
//                         backgroundColor: "#10b981",
//                         color: "white",
//                         padding: "10px 20px",
//                         border: "none",
//                         borderRadius: "8px",
//                         cursor: "pointer",
//                         fontSize: "14px",
//                         fontWeight: "600",
//                       }}
//                     >
//                       Start PDI
//                     </button>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         )}

//         {activeTab === "all-departments" && (
//           <div>
//             <h3
//               style={{
//                 margin: "0 0 24px 0",
//                 fontSize: "20px",
//                 color: "#111827",
//                 fontWeight: "700",
//               }}
//             >
//               All Departments
//             </h3>
//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "repeat(3, 1fr)",
//                 gap: "24px",
//               }}
//             >
//               {[
//                 { stage: "pending", label: "⏳ Pending", color: "#ef4444" },
//                 {
//                   stage: "front_checkup",
//                   label: "Front Checkup",
//                   color: "#8b5cf6",
//                 },
//                 {
//                   stage: "advisor_review",
//                   label: "Advisor Review",
//                   color: "#ec4899",
//                 },
//                 { stage: "mechanic", label: "Mechanic", color: "#f59e0b" },
//                 { stage: "painter", label: "Painter", color: "#10b981" },
//                 { stage: "denter", label: "Denter", color: "#14b8a6" },
//                 {
//                   stage: "electrician",
//                   label: "Electrician",
//                   color: "#f97316",
//                 },
//                 { stage: "3m", label: "3M Work", color: "#a855f7" },
//                 {
//                   stage: "alignment_balancing",
//                   label: "Alignment & Balancing",
//                   color: "#ec4899",
//                 },
//                 {
//                   stage: "tyre_fitting",
//                   label: "Tyre Fitting",
//                   color: "#84cc16",
//                 },
//                 { stage: "washing", label: "Washing", color: "#06b6d4" },
//                 { stage: "pdi", label: "PDI", color: "#f43f5e" },
//                 { stage: "billing", label: "Billing", color: "#6366f1" },
//                 { stage: "payment", label: "Payment", color: "#10b981" },
//                 {
//                   stage: "ready_for_exit",
//                   label: "Ready for Exit",
//                   color: "#22c55e",
//                 },
//                 { stage: "completed", label: "Completed", color: "#16a34a" },
//               ].map(({ stage, label, color }) => {
//                 const stageVehicles = getVehiclesByStage(stage);
//                 return (
//                   <div
//                     key={stage}
//                     style={{
//                       backgroundColor: "white",
//                       padding: "20px",
//                       borderRadius: "12px",
//                       boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
//                     }}
//                   >
//                     <div
//                       style={{
//                         display: "flex",
//                         alignItems: "center",
//                         gap: "12px",
//                         marginBottom: "16px",
//                       }}
//                     >
//                       <div
//                         style={{
//                           width: "12px",
//                           height: "12px",
//                           borderRadius: "50%",
//                           backgroundColor: color,
//                         }}
//                       />
//                       <h4
//                         style={{
//                           margin: 0,
//                           fontSize: "16px",
//                           fontWeight: "600",
//                           color: "#111827",
//                         }}
//                       >
//                         {label} ({stageVehicles.length})
//                       </h4>
//                     </div>
//                     {stageVehicles.length === 0 ? (
//                       <p
//                         style={{
//                           margin: 0,
//                           color: "#9ca3af",
//                           fontSize: "14px",
//                         }}
//                       >
//                         No vehicles
//                       </p>
//                     ) : (
//                       <div style={{ display: "grid", gap: "8px" }}>
//                         {stageVehicles.map((v) => {
//                           // Get work stages data
//                           const workStages =
//                             v.work_stages && v.work_stages.length > 0
//                               ? v.work_stages[0]
//                               : null;

//                           // Build work status array
//                           const workStatus = [];
//                           if (workStages) {
//                             const workTypes = [
//                               {
//                                 key: "mechanic",
//                                 label: "Mechanic",
//                                 required: workStages.mechanic_required,
//                                 status: workStages.mechanic_status,
//                               },
//                               {
//                                 key: "painter",
//                                 label: "Painter",
//                                 required: workStages.painter_required,
//                                 status: workStages.painter_status,
//                               },
//                               {
//                                 key: "denter",
//                                 label: "Denter",
//                                 required: workStages.denter_required,
//                                 status: workStages.denter_status,
//                               },
//                               {
//                                 key: "electrician",
//                                 label: "Electrician",
//                                 required: workStages.electrician_required,
//                                 status: workStages.electrician_status,
//                               },
//                               {
//                                 key: "three_m",
//                                 label: "3M",
//                                 required: workStages.three_m_required,
//                                 status: workStages.three_m_status,
//                               },
//                               {
//                                 key: "alignment_balancing",
//                                 label: "A&B",
//                                 required:
//                                   workStages.alignment_balancing_required,
//                                 status: workStages.alignment_balancing_status,
//                               },
//                               {
//                                 key: "tyre_fitting",
//                                 label: "Tyre",
//                                 required: workStages.tyre_fitting_required,
//                                 status: workStages.tyre_fitting_status,
//                               },
//                               {
//                                 key: "washing",
//                                 label: "Wash",
//                                 required: workStages.washing_required,
//                                 status: workStages.washing_status,
//                               },
//                             ];

//                             workTypes.forEach((work) => {
//                               if (work.required) {
//                                 workStatus.push({
//                                   label: work.label,
//                                   status: work.status || "not_started",
//                                 });
//                               }
//                             });
//                           }

//                           return (
//                             <div
//                               key={v.id}
//                               style={{
//                                 padding: "12px",
//                                 backgroundColor: "#f9fafb",
//                                 borderRadius: "8px",
//                                 border: "1px solid #e5e7eb",
//                               }}
//                             >
//                               <div
//                                 style={{
//                                   display: "flex",
//                                   justifyContent: "space-between",
//                                   alignItems: "center",
//                                   marginBottom:
//                                     workStatus.length > 0 ? "8px" : "0",
//                                 }}
//                               >
//                                 <div>
//                                   <span
//                                     style={{
//                                       fontWeight: "600",
//                                       color: "#111827",
//                                     }}
//                                   >
//                                     {v.vehicle_number}
//                                   </span>
//                                   <span
//                                     style={{
//                                       margin: "0 8px",
//                                       color: "#d1d5db",
//                                     }}
//                                   >
//                                     •
//                                   </span>
//                                   <span
//                                     style={{
//                                       fontSize: "14px",
//                                       color: "#6b7280",
//                                       textTransform: "capitalize",
//                                     }}
//                                   >
//                                     {v.current_status}
//                                   </span>
//                                   {v.locked_by_user && (
//                                     <>
//                                       <span
//                                         style={{
//                                           margin: "0 8px",
//                                           color: "#d1d5db",
//                                         }}
//                                       >
//                                         •
//                                       </span>
//                                       <span
//                                         style={{
//                                           fontSize: "14px",
//                                           color: "#6b7280",
//                                         }}
//                                       >
//                                         {v.locked_by_user.full_name}
//                                       </span>
//                                     </>
//                                   )}
//                                 </div>
//                                 <button
//                                   onClick={() => setSelectedVehicle(v)}
//                                   style={{
//                                     padding: "6px 12px",
//                                     backgroundColor: "white",
//                                     border: "1px solid #d1d5db",
//                                     borderRadius: "6px",
//                                     cursor: "pointer",
//                                     fontSize: "12px",
//                                     color: "#374151",
//                                   }}
//                                 >
//                                   View
//                                 </button>
//                               </div>

//                               {/* Work Status Breakdown */}
//                               {workStatus.length > 0 && (
//                                 <div
//                                   style={{
//                                     display: "flex",
//                                     flexWrap: "wrap",
//                                     gap: "6px",
//                                     marginTop: "8px",
//                                   }}
//                                 >
//                                   {workStatus.map((work, idx) => (
//                                     <span
//                                       key={idx}
//                                       style={{
//                                         fontSize: "11px",
//                                         padding: "3px 8px",
//                                         borderRadius: "4px",
//                                         fontWeight: "600",
//                                         backgroundColor:
//                                           work.status === "completed"
//                                             ? "#dcfce7"
//                                             : work.status === "in_progress"
//                                             ? "#fef3c7"
//                                             : "#f3f4f6",
//                                         color:
//                                           work.status === "completed"
//                                             ? "#166534"
//                                             : work.status === "in_progress"
//                                             ? "#92400e"
//                                             : "#6b7280",
//                                       }}
//                                     >
//                                       {work.status === "completed" && "✅ "}
//                                       {work.status === "in_progress" && "🔄 "}
//                                       {work.status === "not_started" && "⏳ "}
//                                       {work.label}
//                                     </span>
//                                   ))}
//                                 </div>
//                               )}
//                             </div>
//                           );
//                         })}
//                       </div>
//                     )}
//                   </div>
//                 );
//               })}
//             </div>
//           </div>
//         )}
//       </div>

//       {/* PDI Popup */}
//       {showPDI && selectedVehicle && (
//         <PDIPopup
//           vehicle={selectedVehicle}
//           onClose={() => {
//             setShowPDI(false);
//             setSelectedVehicle(null);
//           }}
//           onSuccess={() => {
//             setShowPDI(false);
//             setSelectedVehicle(null);
//             fetchData(); // Refresh data
//           }}
//         />
//       )}

//       {/* Vehicle Details Popup */}
//       {selectedVehicle && !showAssignWork && !showPDI && (
//         <VehicleDetailsPopup
//           vehicle={selectedVehicle}
//           onClose={() => setSelectedVehicle(null)}
//         />
//       )}

//       {/* Assign Work Popup */}
//       {showAssignWork && selectedVehicle && (
//         <AssignWorkPopup
//           vehicle={selectedVehicle}
//           onClose={() => {
//             setShowAssignWork(false);
//             setSelectedVehicle(null);
//           }}
//           onSuccess={() => {
//             setShowAssignWork(false);
//             setSelectedVehicle(null);
//             fetchData(); // Refresh data
//           }}
//         />
//       )}
//     </div>
//   );
// }

// // PDI Popup Component
// function PDIPopup({ vehicle, onClose, onSuccess }) {
//   const [complaints, setComplaints] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [submitting, setSubmitting] = useState(false);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     fetchComplaints();
//   }, []);

//   const fetchComplaints = async () => {
//     try {
//       const { data, error } = await supabase
//         .from("customer_complaints")
//         .select("*")
//         .eq("vehicle_id", vehicle.id)
//         .order("complaint_number", { ascending: true });

//       if (error) throw error;

//       // Initialize each complaint with resolution state
//       const complaintsWithState = (data || []).map((c) => ({
//         ...c,
//         resolved: c.is_resolved || false,
//         resolution_notes: c.resolution_notes || "",
//       }));

//       setComplaints(complaintsWithState);
//       setLoading(false);
//     } catch (err) {
//       console.error("Error fetching complaints:", err);
//       setError("Failed to load complaints");
//       setLoading(false);
//     }
//   };

//   const toggleResolved = (index) => {
//     const updated = [...complaints];
//     updated[index].resolved = !updated[index].resolved;
//     // Clear resolution notes if marking as resolved
//     if (updated[index].resolved) {
//       updated[index].resolution_notes = "";
//     }
//     setComplaints(updated);
//   };

//   const updateResolutionNotes = (index, notes) => {
//     const updated = [...complaints];
//     updated[index].resolution_notes = notes;
//     setComplaints(updated);
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError("");
//     setSubmitting(true);

//     try {
//       // Validation: Unresolved complaints must have a reason
//       const unresolvedWithoutReason = complaints.filter(
//         (c) => !c.resolved && !c.resolution_notes.trim()
//       );

//       if (unresolvedWithoutReason.length > 0) {
//         setError("Please provide a reason for all unresolved complaints");
//         setSubmitting(false);
//         return;
//       }

//       // Get current user
//       const userStr = localStorage.getItem("user");
//       const currentUser = userStr ? JSON.parse(userStr) : null;

//       // 1. Update all complaints
//       for (const complaint of complaints) {
//         const updateData = {
//           is_resolved: complaint.resolved,
//           resolution_notes: complaint.resolved
//             ? null
//             : complaint.resolution_notes,
//           resolved_at: complaint.resolved ? new Date().toISOString() : null,
//           resolved_by: complaint.resolved ? currentUser?.id : null,
//         };

//         const { error: complaintError } = await supabase
//           .from("customer_complaints")
//           .update(updateData)
//           .eq("id", complaint.id);

//         if (complaintError) throw complaintError;
//       }

//       // 2. Update vehicle stage to billing
//       const { error: vehicleError } = await supabase
//         .from("vehicles")
//         .update({
//           current_stage: "billing",
//           current_status: "pending",
//           updated_at: new Date().toISOString(),
//         })
//         .eq("id", vehicle.id);

//       if (vehicleError) throw vehicleError;

//       // 3. Add to vehicle history
//       const resolvedCount = complaints.filter((c) => c.resolved).length;
//       const unresolvedCount = complaints.filter((c) => !c.resolved).length;

//       const { error: historyError } = await supabase
//         .from("vehicle_history")
//         .insert([
//           {
//             vehicle_id: vehicle.id,
//             user_id: currentUser?.id || null,
//             stage: "pdi",
//             action: "pdi_completed",
//             new_value: `PDI completed. ${resolvedCount} complaint(s) resolved, ${unresolvedCount} unresolved`,
//             created_at: new Date().toISOString(),
//           },
//         ]);

//       if (historyError) throw historyError;

//       alert("PDI completed successfully! Vehicle moved to billing.");
//       onSuccess();
//     } catch (err) {
//       console.error("Error completing PDI:", err);
//       setError(err.message || "Failed to complete PDI");
//       setSubmitting(false);
//     }
//   };

//   return (
//     <div
//       onClick={onClose}
//       style={{
//         position: "fixed",
//         top: 0,
//         left: 0,
//         right: 0,
//         bottom: 0,
//         backgroundColor: "rgba(0, 0, 0, 0.5)",
//         display: "flex",
//         justifyContent: "center",
//         alignItems: "center",
//         zIndex: 1000,
//       }}
//     >
//       <div
//         onClick={(e) => e.stopPropagation()}
//         style={{
//           backgroundColor: "white",
//           padding: "32px",
//           borderRadius: "12px",
//           width: "100%",
//           maxWidth: "700px",
//           maxHeight: "90vh",
//           overflowY: "auto",
//         }}
//       >
//         <div
//           style={{
//             display: "flex",
//             justifyContent: "space-between",
//             alignItems: "center",
//             marginBottom: "24px",
//           }}
//         >
//           <div>
//             <h3 style={{ margin: 0, fontSize: "20px", color: "#111827" }}>
//               Pre-Delivery Inspection (PDI)
//             </h3>
//             <p
//               style={{
//                 margin: "4px 0 0 0",
//                 fontSize: "14px",
//                 color: "#6b7280",
//               }}
//             >
//               {vehicle.vehicle_number} - {vehicle.customer_name || "N/A"}
//             </p>
//           </div>
//           <button
//             onClick={onClose}
//             style={{
//               backgroundColor: "#ef4444",
//               color: "white",
//               padding: "8px 16px",
//               border: "none",
//               borderRadius: "6px",
//               cursor: "pointer",
//               fontSize: "14px",
//               fontWeight: "600",
//             }}
//           >
//             Close
//           </button>
//         </div>

//         {loading ? (
//           <p
//             style={{ color: "#6b7280", textAlign: "center", padding: "40px 0" }}
//           >
//             Loading complaints...
//           </p>
//         ) : complaints.length === 0 ? (
//           <div
//             style={{
//               backgroundColor: "#f0fdf4",
//               border: "2px solid #86efac",
//               padding: "24px",
//               borderRadius: "8px",
//               textAlign: "center",
//               marginBottom: "24px",
//             }}
//           >
//             <p
//               style={{
//                 margin: 0,
//                 fontSize: "16px",
//                 color: "#166534",
//                 fontWeight: "600",
//               }}
//             >
//               ✅ No complaints recorded for this vehicle
//             </p>
//             <p
//               style={{
//                 margin: "8px 0 0 0",
//                 fontSize: "14px",
//                 color: "#14532d",
//               }}
//             >
//               You can proceed to complete PDI and move to billing.
//             </p>
//           </div>
//         ) : (
//           <form onSubmit={handleSubmit}>
//             <div style={{ marginBottom: "24px" }}>
//               <h4
//                 style={{
//                   margin: "0 0 16px 0",
//                   fontSize: "16px",
//                   color: "#111827",
//                 }}
//               >
//                 📋 Resolve Customer Complaints ({complaints.length})
//               </h4>

//               <div style={{ display: "grid", gap: "16px" }}>
//                 {complaints.map((complaint, index) => (
//                   <div
//                     key={complaint.id}
//                     style={{
//                       padding: "16px",
//                       backgroundColor: complaint.resolved
//                         ? "#f0fdf4"
//                         : "#fef3c7",
//                       border: `2px solid ${
//                         complaint.resolved ? "#86efac" : "#fbbf24"
//                       }`,
//                       borderRadius: "8px",
//                     }}
//                   >
//                     <div
//                       style={{
//                         display: "flex",
//                         alignItems: "flex-start",
//                         gap: "12px",
//                         marginBottom: "12px",
//                       }}
//                     >
//                       <input
//                         type="checkbox"
//                         checked={complaint.resolved}
//                         onChange={() => toggleResolved(index)}
//                         style={{
//                           width: "20px",
//                           height: "20px",
//                           cursor: "pointer",
//                           marginTop: "2px",
//                         }}
//                       />
//                       <div style={{ flex: 1 }}>
//                         <div
//                           style={{
//                             display: "flex",
//                             justifyContent: "space-between",
//                             alignItems: "center",
//                             marginBottom: "6px",
//                           }}
//                         >
//                           <span
//                             style={{
//                               fontSize: "14px",
//                               fontWeight: "600",
//                               color: "#111827",
//                             }}
//                           >
//                             Complaint #{complaint.complaint_number}
//                           </span>
//                           <span
//                             style={{
//                               fontSize: "12px",
//                               padding: "4px 8px",
//                               borderRadius: "4px",
//                               backgroundColor: complaint.resolved
//                                 ? "#dcfce7"
//                                 : "#fee2e2",
//                               color: complaint.resolved ? "#166534" : "#991b1b",
//                               fontWeight: "600",
//                             }}
//                           >
//                             {complaint.resolved
//                               ? "✅ Resolved"
//                               : "❌ Not Resolved"}
//                           </span>
//                         </div>
//                         <p
//                           style={{
//                             margin: "0 0 12px 0",
//                             fontSize: "14px",
//                             color: "#374151",
//                           }}
//                         >
//                           {complaint.complaint_text}
//                         </p>

//                         {/* Show resolution notes input if not resolved */}
//                         {!complaint.resolved && (
//                           <div>
//                             <label
//                               style={{
//                                 display: "block",
//                                 fontSize: "13px",
//                                 fontWeight: "600",
//                                 color: "#111827",
//                                 marginBottom: "6px",
//                               }}
//                             >
//                               Reason for not resolving: *
//                             </label>
//                             <textarea
//                               value={complaint.resolution_notes}
//                               onChange={(e) =>
//                                 updateResolutionNotes(index, e.target.value)
//                               }
//                               placeholder="e.g., Customer declined due to budget constraints"
//                               required={!complaint.resolved}
//                               rows={2}
//                               style={{
//                                 width: "100%",
//                                 padding: "8px",
//                                 border: "1px solid #d1d5db",
//                                 borderRadius: "6px",
//                                 fontSize: "13px",
//                                 boxSizing: "border-box",
//                                 fontFamily: "Arial, sans-serif",
//                               }}
//                             />
//                           </div>
//                         )}

//                         {/* Show existing resolution notes if already resolved */}
//                         {complaint.resolved &&
//                           complaint.is_resolved &&
//                           complaint.resolution_notes && (
//                             <p
//                               style={{
//                                 margin: 0,
//                                 fontSize: "12px",
//                                 color: "#6b7280",
//                                 fontStyle: "italic",
//                               }}
//                             >
//                               Previous note: {complaint.resolution_notes}
//                             </p>
//                           )}
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>

//             {/* Summary */}
//             <div
//               style={{
//                 backgroundColor: "#f0f9ff",
//                 padding: "16px",
//                 borderRadius: "8px",
//                 marginBottom: "24px",
//               }}
//             >
//               <p style={{ margin: 0, fontSize: "14px", color: "#0369a1" }}>
//                 <strong>Summary:</strong>{" "}
//                 {complaints.filter((c) => c.resolved).length} resolved,{" "}
//                 {complaints.filter((c) => !c.resolved).length} unresolved
//               </p>
//             </div>

//             {/* Error Message */}
//             {error && (
//               <div
//                 style={{
//                   backgroundColor: "#fee2e2",
//                   color: "#991b1b",
//                   padding: "12px",
//                   borderRadius: "8px",
//                   marginBottom: "16px",
//                   fontSize: "14px",
//                 }}
//               >
//                 {error}
//               </div>
//             )}

//             {/* Submit Button */}
//             <button
//               type="submit"
//               disabled={submitting}
//               style={{
//                 width: "100%",
//                 padding: "14px",
//                 backgroundColor: submitting ? "#9ca3af" : "#10b981",
//                 color: "white",
//                 border: "none",
//                 borderRadius: "8px",
//                 cursor: submitting ? "not-allowed" : "pointer",
//                 fontSize: "16px",
//                 fontWeight: "600",
//               }}
//             >
//               {submitting
//                 ? "Completing PDI..."
//                 : "Complete PDI & Move to Billing"}
//             </button>
//           </form>
//         )}

//         {/* If no complaints, show complete button */}
//         {!loading && complaints.length === 0 && (
//           <button
//             onClick={async () => {
//               setSubmitting(true);
//               try {
//                 const userStr = localStorage.getItem("user");
//                 const currentUser = userStr ? JSON.parse(userStr) : null;

//                 await supabase
//                   .from("vehicles")
//                   .update({
//                     current_stage: "billing",
//                     current_status: "pending",
//                     updated_at: new Date().toISOString(),
//                   })
//                   .eq("id", vehicle.id);

//                 await supabase.from("vehicle_history").insert([
//                   {
//                     vehicle_id: vehicle.id,
//                     user_id: currentUser?.id || null,
//                     stage: "pdi",
//                     action: "pdi_completed",
//                     new_value: "PDI completed. No complaints recorded",
//                     created_at: new Date().toISOString(),
//                   },
//                 ]);

//                 alert("PDI completed successfully! Vehicle moved to billing.");
//                 onSuccess();
//               } catch (err) {
//                 setError(err.message || "Failed to complete PDI");
//                 setSubmitting(false);
//               }
//             }}
//             disabled={submitting}
//             style={{
//               width: "100%",
//               padding: "14px",
//               backgroundColor: submitting ? "#9ca3af" : "#10b981",
//               color: "white",
//               border: "none",
//               borderRadius: "8px",
//               cursor: submitting ? "not-allowed" : "pointer",
//               fontSize: "16px",
//               fontWeight: "600",
//             }}
//           >
//             {submitting
//               ? "Completing PDI..."
//               : "Complete PDI & Move to Billing"}
//           </button>
//         )}
//       </div>
//     </div>
//   );
// }

// // Vehicle Details Popup Component
// function VehicleDetailsPopup({ vehicle, onClose }) {
//   const [history, setHistory] = useState([]);
//   const [loadingHistory, setLoadingHistory] = useState(true);

//   useEffect(() => {
//     fetchHistory();
//   }, []);

//   const fetchHistory = async () => {
//     try {
//       const { data, error } = await supabase
//         .from("vehicle_history")
//         .select(
//           `
//           *,
//           user:users!vehicle_history_user_id_fkey(full_name)
//         `
//         )
//         .eq("vehicle_id", vehicle.id)
//         .order("created_at", { ascending: false });

//       if (error) throw error;
//       setHistory(data || []);
//       setLoadingHistory(false);
//     } catch (error) {
//       console.error("Error fetching history:", error);
//       setLoadingHistory(false);
//     }
//   };

//   return (
//     <div
//       onClick={onClose}
//       style={{
//         position: "fixed",
//         top: 0,
//         left: 0,
//         right: 0,
//         bottom: 0,
//         backgroundColor: "rgba(0, 0, 0, 0.5)",
//         display: "flex",
//         justifyContent: "center",
//         alignItems: "center",
//         zIndex: 1000,
//       }}
//     >
//       <div
//         onClick={(e) => e.stopPropagation()}
//         style={{
//           backgroundColor: "white",
//           padding: "32px",
//           borderRadius: "12px",
//           width: "100%",
//           maxWidth: "700px",
//           maxHeight: "90vh",
//           overflowY: "auto",
//         }}
//       >
//         <div
//           style={{
//             display: "flex",
//             justifyContent: "space-between",
//             alignItems: "center",
//             marginBottom: "24px",
//           }}
//         >
//           <h3 style={{ margin: 0, fontSize: "24px", color: "#111827" }}>
//             {vehicle.vehicle_number}
//           </h3>
//           <button
//             onClick={onClose}
//             style={{
//               backgroundColor: "#ef4444",
//               color: "white",
//               padding: "8px 16px",
//               border: "none",
//               borderRadius: "6px",
//               cursor: "pointer",
//               fontSize: "14px",
//             }}
//           >
//             Close
//           </button>
//         </div>

//         <div
//           style={{
//             backgroundColor: "#f0f9ff",
//             border: "2px solid #bae6fd",
//             padding: "16px",
//             borderRadius: "8px",
//             marginBottom: "24px",
//           }}
//         >
//           <div
//             style={{
//               display: "flex",
//               justifyContent: "space-between",
//               marginBottom: "8px",
//             }}
//           >
//             <span
//               style={{
//                 fontSize: "14px",
//                 color: "#0369a1",
//                 fontWeight: "600",
//               }}
//             >
//               Current Stage:
//             </span>
//             <span
//               style={{
//                 backgroundColor: "#dbeafe",
//                 color: "#1e40af",
//                 padding: "4px 12px",
//                 borderRadius: "6px",
//                 fontSize: "13px",
//                 fontWeight: "600",
//                 textTransform: "capitalize",
//               }}
//             >
//               {vehicle.current_stage.replace("_", " ")}
//             </span>
//           </div>
//           <div style={{ display: "flex", justifyContent: "space-between" }}>
//             <span
//               style={{
//                 fontSize: "14px",
//                 color: "#0369a1",
//                 fontWeight: "600",
//               }}
//             >
//               Status:
//             </span>
//             <span
//               style={{
//                 backgroundColor:
//                   vehicle.current_status === "completed"
//                     ? "#dcfce7"
//                     : vehicle.current_status === "in_progress"
//                     ? "#fef3c7"
//                     : "#f3f4f6",
//                 color:
//                   vehicle.current_status === "completed"
//                     ? "#166534"
//                     : vehicle.current_status === "in_progress"
//                     ? "#92400e"
//                     : "#374151",
//                 padding: "4px 12px",
//                 borderRadius: "6px",
//                 fontSize: "13px",
//                 fontWeight: "600",
//                 textTransform: "capitalize",
//               }}
//             >
//               {vehicle.current_status}
//             </span>
//           </div>
//         </div>

//         <div style={{ marginBottom: "24px" }}>
//           <h4
//             style={{
//               margin: "0 0 16px 0",
//               fontSize: "16px",
//               color: "#374151",
//             }}
//           >
//             Vehicle Information
//           </h4>
//           <div style={{ display: "grid", gap: "12px" }}>
//             <InfoRow
//               label="Customer Name"
//               value={vehicle.customer_name || "N/A"}
//             />
//             <InfoRow
//               label="Customer Phone"
//               value={vehicle.customer_phone || "N/A"}
//             />
//             <InfoRow
//               label="Odometer Reading"
//               value={`${vehicle.odometer_reading} km`}
//             />
//             <InfoRow label="Fuel Level" value={vehicle.fuel_level} />
//             <InfoRow
//               label="Priority"
//               value={
//                 <span
//                   style={{
//                     backgroundColor:
//                       vehicle.priority === "vip"
//                         ? "#fce7f3"
//                         : vehicle.priority === "urgent"
//                         ? "#fee2e2"
//                         : "#f3f4f6",
//                     color:
//                       vehicle.priority === "vip"
//                         ? "#9f1239"
//                         : vehicle.priority === "urgent"
//                         ? "#991b1b"
//                         : "#374151",
//                     padding: "4px 12px",
//                     borderRadius: "6px",
//                     fontSize: "13px",
//                     fontWeight: "600",
//                     textTransform: "uppercase",
//                   }}
//                 >
//                   {vehicle.priority}
//                 </span>
//               }
//             />
//             {vehicle.expected_completion_time && (
//               <InfoRow
//                 label="Expected Completion"
//                 value={new Date(
//                   vehicle.expected_completion_time
//                 ).toLocaleString()}
//               />
//             )}
//           </div>
//         </div>

//         <div>
//           <h4
//             style={{
//               margin: "0 0 16px 0",
//               fontSize: "16px",
//               color: "#374151",
//             }}
//           >
//             🕐 Complete Timeline
//           </h4>

//           {loadingHistory ? (
//             <p style={{ color: "#6b7280", fontSize: "14px" }}>
//               Loading timeline...
//             </p>
//           ) : history.length === 0 ? (
//             <p style={{ color: "#6b7280", fontSize: "14px" }}>
//               No history recorded yet
//             </p>
//           ) : (
//             <div style={{ position: "relative", paddingLeft: "24px" }}>
//               {/* Timeline line */}
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

//               {history.map((item, index) => (
//                 <div
//                   key={item.id}
//                   style={{
//                     position: "relative",
//                     marginBottom: index < history.length - 1 ? "20px" : "0",
//                     paddingBottom: "12px",
//                   }}
//                 >
//                   {/* Timeline dot */}
//                   <div
//                     style={{
//                       position: "absolute",
//                       left: "-20px",
//                       top: "6px",
//                       width: "12px",
//                       height: "12px",
//                       borderRadius: "50%",
//                       backgroundColor: "#2563eb",
//                       border: "2px solid white",
//                       boxShadow: "0 0 0 2px #e5e7eb",
//                     }}
//                   />

//                   {/* Timeline content */}
//                   <div
//                     style={{
//                       backgroundColor: "#f9fafb",
//                       padding: "12px",
//                       borderRadius: "8px",
//                       border: "1px solid #e5e7eb",
//                     }}
//                   >
//                     <div
//                       style={{
//                         display: "flex",
//                         justifyContent: "space-between",
//                         marginBottom: "6px",
//                       }}
//                     >
//                       <span
//                         style={{
//                           fontSize: "13px",
//                           fontWeight: "600",
//                           color: "#111827",
//                           textTransform: "capitalize",
//                         }}
//                       >
//                         {item.stage.replace("_", " ")} -{" "}
//                         {item.action.replace("_", " ")}
//                       </span>
//                       <span
//                         style={{
//                           fontSize: "12px",
//                           color: "#6b7280",
//                         }}
//                       >
//                         {new Date(item.created_at).toLocaleString()}
//                       </span>
//                     </div>

//                     {item.user && (
//                       <p
//                         style={{
//                           margin: "0 0 6px 0",
//                           fontSize: "12px",
//                           color: "#6b7280",
//                         }}
//                       >
//                         👤 {item.user.full_name}
//                       </p>
//                     )}

//                     {item.new_value && (
//                       <p
//                         style={{
//                           margin: "0 0 6px 0",
//                           fontSize: "13px",
//                           color: "#374151",
//                         }}
//                       >
//                         {item.new_value}
//                       </p>
//                     )}

//                     {item.notes && (
//                       <p
//                         style={{
//                           margin: 0,
//                           fontSize: "12px",
//                           color: "#6b7280",
//                           fontStyle: "italic",
//                         }}
//                       >
//                         📝 {item.notes}
//                       </p>
//                     )}
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// function InfoRow({ label, value }) {
//   return (
//     <div
//       style={{
//         display: "flex",
//         justifyContent: "space-between",
//         padding: "10px",
//         backgroundColor: "#f9fafb",
//         borderRadius: "6px",
//       }}
//     >
//       <span style={{ fontSize: "14px", color: "#6b7280" }}>{label}</span>
//       <span style={{ fontSize: "14px", color: "#111827", fontWeight: "500" }}>
//         {value}
//       </span>
//     </div>
//   );
// }

// // Assign Work Popup Component
// function AssignWorkPopup({ vehicle, onClose, onSuccess }) {
//   const [complaints, setComplaints] = useState([{ text: "" }]);
//   const [workTypes, setWorkTypes] = useState({
//     mechanic: false,
//     painter: false,
//     denter: false,
//     electrician: false,
//     "3m": false,
//     alignment_balancing: false,
//     tyre_fitting: false,
//     washing: false,
//   });
//   const [expectedDate, setExpectedDate] = useState("");
//   const [expectedTime, setExpectedTime] = useState("");
//   const [notes, setNotes] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const addComplaint = () => {
//     setComplaints([...complaints, { text: "" }]);
//   };

//   const removeComplaint = (index) => {
//     setComplaints(complaints.filter((_, i) => i !== index));
//   };

//   const updateComplaint = (index, text) => {
//     const updated = [...complaints];
//     updated[index].text = text;
//     setComplaints(updated);
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError("");
//     setLoading(true);

//     try {
//       // Validation
//       const selectedWork = Object.keys(workTypes).filter(
//         (key) => workTypes[key]
//       );
//       if (selectedWork.length === 0) {
//         setError("Please select at least one work type");
//         setLoading(false);
//         return;
//       }

//       if (!expectedDate || !expectedTime) {
//         setError("Please set expected completion date and time");
//         setLoading(false);
//         return;
//       }

//       // Combine date and time
//       const expectedDateTime = new Date(`${expectedDate}T${expectedTime}`);

//       // Filter out empty complaints
//       const validComplaints = complaints.filter((c) => c.text.trim() !== "");

//       // Get current user (advisor)
//       const userStr = localStorage.getItem("user");
//       const currentUser = userStr ? JSON.parse(userStr) : null;

//       // 1. Update vehicles table
//       const { error: vehicleError } = await supabase
//         .from("vehicles")
//         .update({
//           current_stage: "pending",
//           current_status: "pending",
//           expected_completion_time: expectedDateTime.toISOString(),
//           updated_at: new Date().toISOString(),
//         })
//         .eq("id", vehicle.id);

//       if (vehicleError) throw vehicleError;

//       // 2. Insert complaints if any
//       if (validComplaints.length > 0) {
//         // Get the current max complaint number for this vehicle
//         const { data: existingComplaints } = await supabase
//           .from("customer_complaints")
//           .select("complaint_number")
//           .eq("vehicle_id", vehicle.id)
//           .order("complaint_number", { ascending: false })
//           .limit(1);

//         const startNumber =
//           existingComplaints && existingComplaints.length > 0
//             ? existingComplaints[0].complaint_number + 1
//             : 1;

//         const complaintsToInsert = validComplaints.map((complaint, index) => ({
//           vehicle_id: vehicle.id,
//           complaint_text: complaint.text,
//           complaint_number: startNumber + index,
//           is_resolved: false,
//           reported_by: currentUser?.id || null,
//           created_at: new Date().toISOString(),
//         }));

//         const { error: complaintsError } = await supabase
//           .from("customer_complaints")
//           .insert(complaintsToInsert);

//         if (complaintsError) throw complaintsError;
//       }

//       // 3. Update or insert work_stages
//       const { data: existingWorkStage } = await supabase
//         .from("work_stages")
//         .select("*")
//         .eq("vehicle_id", vehicle.id)
//         .single();

//       const workStageData = {
//         vehicle_id: vehicle.id,
//         mechanic_required: workTypes.mechanic,
//         painter_required: workTypes.painter,
//         denter_required: workTypes.denter,
//         electrician_required: workTypes.electrician,
//         three_m_required: workTypes["3m"],
//         alignment_balancing_required: workTypes.alignment_balancing,
//         tyre_fitting_required: workTypes.tyre_fitting,
//         washing_required: workTypes.washing,
//         mechanic_status: workTypes.mechanic ? "not_started" : "not_started",
//         painter_status: workTypes.painter ? "not_started" : "not_started",
//         denter_status: workTypes.denter ? "not_started" : "not_started",
//         electrician_status: workTypes.electrician
//           ? "not_started"
//           : "not_started",
//         three_m_status: workTypes["3m"] ? "not_started" : "not_started",
//         alignment_balancing_status: workTypes.alignment_balancing
//           ? "not_started"
//           : "not_started",
//         tyre_fitting_status: workTypes.tyre_fitting
//           ? "not_started"
//           : "not_started",
//         washing_status: workTypes.washing ? "not_started" : "not_started",
//         updated_at: new Date().toISOString(),
//       };

//       if (existingWorkStage) {
//         const { error: updateError } = await supabase
//           .from("work_stages")
//           .update(workStageData)
//           .eq("vehicle_id", vehicle.id);

//         if (updateError) throw updateError;
//       } else {
//         const { error: insertError } = await supabase
//           .from("work_stages")
//           .insert([{ ...workStageData, created_at: new Date().toISOString() }]);

//         if (insertError) throw insertError;
//       }

//       // 4. Add to vehicle history
//       const workTypesList = selectedWork
//         .map((w) => w.replace("_", " "))
//         .join(", ");
//       const { error: historyError } = await supabase
//         .from("vehicle_history")
//         .insert([
//           {
//             vehicle_id: vehicle.id,
//             user_id: currentUser?.id || null,
//             stage: "pending",
//             action: "work_assigned",
//             new_value: `Work assigned: ${workTypesList}. Expected completion: ${expectedDateTime.toLocaleString()}`,
//             notes: notes || null,
//             created_at: new Date().toISOString(),
//           },
//         ]);

//       if (historyError) throw historyError;

//       alert("Work assigned successfully!");
//       onSuccess();
//     } catch (err) {
//       console.error("Error assigning work:", err);
//       setError(err.message || "Failed to assign work");
//       setLoading(false);
//     }
//   };

//   return (
//     <div
//       onClick={onClose}
//       style={{
//         position: "fixed",
//         top: 0,
//         left: 0,
//         right: 0,
//         bottom: 0,
//         backgroundColor: "rgba(0, 0, 0, 0.5)",
//         display: "flex",
//         justifyContent: "center",
//         alignItems: "center",
//         zIndex: 1000,
//       }}
//     >
//       <div
//         onClick={(e) => e.stopPropagation()}
//         style={{
//           backgroundColor: "white",
//           padding: "32px",
//           borderRadius: "12px",
//           width: "100%",
//           maxWidth: "700px",
//           maxHeight: "90vh",
//           overflowY: "auto",
//         }}
//       >
//         <div
//           style={{
//             display: "flex",
//             justifyContent: "space-between",
//             alignItems: "center",
//             marginBottom: "24px",
//           }}
//         >
//           <div>
//             <h3 style={{ margin: 0, fontSize: "20px", color: "#111827" }}>
//               Assign Work - {vehicle.vehicle_number}
//             </h3>
//             <p
//               style={{
//                 margin: "4px 0 0 0",
//                 fontSize: "14px",
//                 color: "#6b7280",
//               }}
//             >
//               Customer: {vehicle.customer_name || "N/A"}
//             </p>
//           </div>
//           <button
//             onClick={onClose}
//             style={{
//               backgroundColor: "#ef4444",
//               color: "white",
//               padding: "8px 16px",
//               border: "none",
//               borderRadius: "6px",
//               cursor: "pointer",
//               fontSize: "14px",
//               fontWeight: "600",
//             }}
//           >
//             Close
//           </button>
//         </div>

//         <form onSubmit={handleSubmit}>
//           {/* Customer Complaints Section */}
//           <div style={{ marginBottom: "24px" }}>
//             <label
//               style={{
//                 display: "block",
//                 fontSize: "16px",
//                 fontWeight: "600",
//                 color: "#111827",
//                 marginBottom: "12px",
//               }}
//             >
//               📋 Customer Complaints
//             </label>
//             <div style={{ display: "grid", gap: "8px" }}>
//               {complaints.map((complaint, index) => (
//                 <div key={index} style={{ display: "flex", gap: "8px" }}>
//                   <input
//                     type="text"
//                     value={complaint.text}
//                     onChange={(e) => updateComplaint(index, e.target.value)}
//                     placeholder={`Complaint ${index + 1}`}
//                     style={{
//                       flex: 1,
//                       padding: "10px",
//                       border: "1px solid #d1d5db",
//                       borderRadius: "8px",
//                       fontSize: "14px",
//                     }}
//                   />
//                   {complaints.length > 1 && (
//                     <button
//                       type="button"
//                       onClick={() => removeComplaint(index)}
//                       style={{
//                         padding: "10px 16px",
//                         backgroundColor: "#fee2e2",
//                         color: "#991b1b",
//                         border: "none",
//                         borderRadius: "8px",
//                         cursor: "pointer",
//                         fontSize: "14px",
//                         fontWeight: "600",
//                       }}
//                     >
//                       ✕
//                     </button>
//                   )}
//                 </div>
//               ))}
//             </div>
//             <button
//               type="button"
//               onClick={addComplaint}
//               style={{
//                 marginTop: "8px",
//                 padding: "8px 16px",
//                 backgroundColor: "#f3f4f6",
//                 color: "#374151",
//                 border: "1px solid #d1d5db",
//                 borderRadius: "8px",
//                 cursor: "pointer",
//                 fontSize: "14px",
//                 fontWeight: "600",
//               }}
//             >
//               + Add Another Complaint
//             </button>
//           </div>

//           {/* Work Types Section */}
//           <div style={{ marginBottom: "24px" }}>
//             <label
//               style={{
//                 display: "block",
//                 fontSize: "16px",
//                 fontWeight: "600",
//                 color: "#111827",
//                 marginBottom: "12px",
//               }}
//             >
//               🔧 Work Required *
//             </label>
//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "repeat(2, 1fr)",
//                 gap: "12px",
//               }}
//             >
//               {[
//                 { key: "mechanic", label: "Mechanic" },
//                 { key: "painter", label: "Painter" },
//                 { key: "denter", label: "Denter" },
//                 { key: "electrician", label: "Electrician" },
//                 { key: "3m", label: "3M Work" },
//                 { key: "alignment_balancing", label: "Alignment & Balancing" },
//                 { key: "tyre_fitting", label: "Tyre Fitting" },
//                 { key: "washing", label: "Washing" },
//               ].map(({ key, label }) => (
//                 <label
//                   key={key}
//                   style={{
//                     display: "flex",
//                     alignItems: "center",
//                     gap: "8px",
//                     padding: "12px",
//                     backgroundColor: workTypes[key] ? "#dbeafe" : "#f9fafb",
//                     border: `2px solid ${
//                       workTypes[key] ? "#2563eb" : "#e5e7eb"
//                     }`,
//                     borderRadius: "8px",
//                     cursor: "pointer",
//                   }}
//                 >
//                   <input
//                     type="checkbox"
//                     checked={workTypes[key]}
//                     onChange={(e) =>
//                       setWorkTypes({ ...workTypes, [key]: e.target.checked })
//                     }
//                     style={{ width: "18px", height: "18px", cursor: "pointer" }}
//                   />
//                   <span
//                     style={{
//                       fontSize: "14px",
//                       fontWeight: "500",
//                       color: "#111827",
//                     }}
//                   >
//                     {label}
//                   </span>
//                 </label>
//               ))}
//             </div>
//           </div>

//           {/* Expected Completion Time */}
//           <div style={{ marginBottom: "24px" }}>
//             <label
//               style={{
//                 display: "block",
//                 fontSize: "16px",
//                 fontWeight: "600",
//                 color: "#111827",
//                 marginBottom: "12px",
//               }}
//             >
//               ⏰ Expected Completion Time *
//             </label>
//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "1fr 1fr",
//                 gap: "12px",
//               }}
//             >
//               <div>
//                 <label
//                   style={{
//                     display: "block",
//                     fontSize: "14px",
//                     color: "#6b7280",
//                     marginBottom: "6px",
//                   }}
//                 >
//                   Date
//                 </label>
//                 <input
//                   type="date"
//                   value={expectedDate}
//                   onChange={(e) => setExpectedDate(e.target.value)}
//                   required
//                   style={{
//                     width: "100%",
//                     padding: "10px",
//                     border: "1px solid #d1d5db",
//                     borderRadius: "8px",
//                     fontSize: "14px",
//                     boxSizing: "border-box",
//                   }}
//                 />
//               </div>
//               <div>
//                 <label
//                   style={{
//                     display: "block",
//                     fontSize: "14px",
//                     color: "#6b7280",
//                     marginBottom: "6px",
//                   }}
//                 >
//                   Time
//                 </label>
//                 <input
//                   type="time"
//                   value={expectedTime}
//                   onChange={(e) => setExpectedTime(e.target.value)}
//                   required
//                   style={{
//                     width: "100%",
//                     padding: "10px",
//                     border: "1px solid #d1d5db",
//                     borderRadius: "8px",
//                     fontSize: "14px",
//                     boxSizing: "border-box",
//                   }}
//                 />
//               </div>
//             </div>
//           </div>

//           {/* Notes */}
//           <div style={{ marginBottom: "24px" }}>
//             <label
//               style={{
//                 display: "block",
//                 fontSize: "16px",
//                 fontWeight: "600",
//                 color: "#111827",
//                 marginBottom: "12px",
//               }}
//             >
//               📝 Notes (Optional)
//             </label>
//             <textarea
//               value={notes}
//               onChange={(e) => setNotes(e.target.value)}
//               placeholder="Add any special instructions or notes..."
//               rows={4}
//               style={{
//                 width: "100%",
//                 padding: "10px",
//                 border: "1px solid #d1d5db",
//                 borderRadius: "8px",
//                 fontSize: "14px",
//                 boxSizing: "border-box",
//                 fontFamily: "Arial, sans-serif",
//               }}
//             />
//           </div>

//           {/* Error Message */}
//           {error && (
//             <div
//               style={{
//                 backgroundColor: "#fee2e2",
//                 color: "#991b1b",
//                 padding: "12px",
//                 borderRadius: "8px",
//                 marginBottom: "16px",
//                 fontSize: "14px",
//               }}
//             >
//               {error}
//             </div>
//           )}

//           {/* Submit Button */}
//           <button
//             type="submit"
//             disabled={loading}
//             style={{
//               width: "100%",
//               padding: "14px",
//               backgroundColor: loading ? "#9ca3af" : "#2563eb",
//               color: "white",
//               border: "none",
//               borderRadius: "8px",
//               cursor: loading ? "not-allowed" : "pointer",
//               fontSize: "16px",
//               fontWeight: "600",
//             }}
//           >
//             {loading ? "Assigning Work..." : "Assign Work"}
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// }

// export default AdvisorDashboard;

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  BeautifulHeader,
  BeautifulStatCard,
  BeautifulTabs,
  BeautifulLoading,
} from "./BeautifulComponents";

function AdvisorDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("needs-assignment");
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showAssignWork, setShowAssignWork] = useState(false);
  const [showPDI, setShowPDI] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: vehiclesData } = await supabase
        .from("vehicles")
        .select(
          `
          *,
          locked_by_user:users!vehicles_locked_by_fkey(full_name),
          work_stages(*),
          customer_complaints(*)
        `
        )
        .order("entry_time", { ascending: false });

      setVehicles(vehiclesData || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  const getVehiclesByStage = (stage) => {
    return vehicles.filter((v) => v.current_stage === stage);
  };

  const getNeedsAssignment = () => {
    return vehicles.filter((v) => v.current_stage === "advisor_review");
  };

  const getPendingPDI = () => {
    return vehicles.filter((v) => v.current_stage === "pdi");
  };

  const getStats = () => {
    const needsAssignment = getNeedsAssignment().length;
    const pendingPDI = getPendingPDI().length;
    const inProgress = vehicles.filter(
      (v) =>
        !["completed", "front_checkup", "pdi", "advisor_review"].includes(
          v.current_stage
        )
    ).length;
    const completedToday = vehicles.filter(
      (v) =>
        v.current_stage === "completed" &&
        new Date(v.entry_time).toDateString() === new Date().toDateString()
    ).length;

    return { needsAssignment, pendingPDI, inProgress, completedToday };
  };

  const stats = getStats();

  if (loading) {
    return <BeautifulLoading />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f3f4f6",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Header - Beautiful Gradient */}
      <BeautifulHeader
        title="Advisor Dashboard"
        subtitle="Tata Motors Service Center"
        userName={user.full_name}
        onLogout={onLogout}
      />

      {/* Stats Cards */}
      <div style={{ padding: "32px 40px 20px 40px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "24px",
          }}
        >
          <BeautifulStatCard
            title="Needs Assignment"
            value={stats.needsAssignment}
            icon="📋"
            color="#ef4444"
            bgColor="#fee2e2"
          />
          <BeautifulStatCard
            title="Pending PDI"
            value={stats.pendingPDI}
            icon="✅"
            color="#f59e0b"
            bgColor="#fef3c7"
          />
          <BeautifulStatCard
            title="In Progress"
            value={stats.inProgress}
            icon="🔧"
            color="#3b82f6"
            bgColor="#dbeafe"
          />
          <BeautifulStatCard
            title="Completed Today"
            value={stats.completedToday}
            icon="🎉"
            color="#10b981"
            bgColor="#dcfce7"
          />
        </div>
      </div>

      {/* Critical Alerts */}
      <div style={{ padding: "0 40px 24px 40px" }}>
        <div
          style={{
            backgroundColor: "white",
            padding: "32px",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          }}
        >
          <h3
            style={{
              margin: "0 0 24px 0",
              fontSize: "20px",
              color: "#111827",
              fontWeight: "700",
            }}
          >
            🚨 Critical Alerts
          </h3>

          <div style={{ display: "grid", gap: "16px" }}>
            {/* Pending Vehicles Alert */}
            {(() => {
              const pendingVehicles = vehicles.filter(
                (v) => v.current_stage === "pending"
              );
              return (
                <div
                  style={{
                    backgroundColor:
                      pendingVehicles.length > 0 ? "#fef2f2" : "#f0fdf4",
                    border: `2px solid ${
                      pendingVehicles.length > 0 ? "#fca5a5" : "#86efac"
                    }`,
                    padding: "12px 16px",
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: "14px",
                        color:
                          pendingVehicles.length > 0 ? "#991b1b" : "#166534",
                        fontWeight: "600",
                      }}
                    >
                      🔴 Pending: {pendingVehicles.length}
                    </span>
                    <span style={{ margin: "0 8px", color: "#d1d5db" }}>•</span>
                    <span
                      style={{
                        fontSize: "13px",
                        color:
                          pendingVehicles.length > 0 ? "#7f1d1d" : "#14532d",
                      }}
                    >
                      {pendingVehicles.length === 0
                        ? "All assigned"
                        : "Needs urgent attention"}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "20px",
                      fontWeight: "bold",
                      color: pendingVehicles.length > 0 ? "#dc2626" : "#16a34a",
                    }}
                  >
                    {pendingVehicles.length}
                  </span>
                </div>
              );
            })()}

            {/* Early Warning + Overdue Alert */}
            {(() => {
              const now = new Date();
              const warningThresholdMinutes = 30;

              const warningVehicles = vehicles.filter((v) => {
                if (
                  v.current_stage === "completed" ||
                  !v.expected_completion_time
                )
                  return false;
                const expectedTime = new Date(v.expected_completion_time);
                const minutesUntilDue = (expectedTime - now) / (1000 * 60);
                return (
                  minutesUntilDue > 0 &&
                  minutesUntilDue <= warningThresholdMinutes
                );
              });

              const overdueVehicles = vehicles.filter((v) => {
                if (
                  v.current_stage === "completed" ||
                  !v.expected_completion_time
                )
                  return false;
                const expectedTime = new Date(v.expected_completion_time);
                return now > expectedTime;
              });

              const totalAlerts =
                warningVehicles.length + overdueVehicles.length;

              return (
                <div
                  style={{
                    backgroundColor: totalAlerts > 0 ? "#fef3c7" : "#f0fdf4",
                    border: `2px solid ${
                      totalAlerts > 0 ? "#fbbf24" : "#86efac"
                    }`,
                    padding: "12px 16px",
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: "14px",
                        color: totalAlerts > 0 ? "#92400e" : "#166534",
                        fontWeight: "600",
                      }}
                    >
                      ⏰ Time Alerts: {totalAlerts}
                    </span>
                    <span style={{ margin: "0 8px", color: "#d1d5db" }}>•</span>
                    <span
                      style={{
                        fontSize: "13px",
                        color: totalAlerts > 0 ? "#78350f" : "#14532d",
                      }}
                    >
                      {overdueVehicles.length > 0 &&
                        `${overdueVehicles.length} overdue`}
                      {overdueVehicles.length > 0 &&
                        warningVehicles.length > 0 &&
                        ", "}
                      {warningVehicles.length > 0 &&
                        `${warningVehicles.length} due soon`}
                      {totalAlerts === 0 && "All on track"}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "20px",
                      fontWeight: "bold",
                      color: totalAlerts > 0 ? "#f59e0b" : "#16a34a",
                    }}
                  >
                    {totalAlerts}
                  </span>
                </div>
              );
            })()}

            {/* VIP/Urgent Priority Alert */}
            {(() => {
              const priorityVehicles = vehicles.filter(
                (v) =>
                  (v.priority === "vip" || v.priority === "urgent") &&
                  v.current_stage !== "completed"
              );
              return (
                <div
                  style={{
                    backgroundColor:
                      priorityVehicles.length > 0 ? "#fef3c7" : "#f0fdf4",
                    border: `2px solid ${
                      priorityVehicles.length > 0 ? "#fbbf24" : "#86efac"
                    }`,
                    padding: "12px 16px",
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: "14px",
                        color:
                          priorityVehicles.length > 0 ? "#92400e" : "#166534",
                        fontWeight: "600",
                      }}
                    >
                      🔥 Priority: {priorityVehicles.length}
                    </span>
                    <span style={{ margin: "0 8px", color: "#d1d5db" }}>•</span>
                    <span
                      style={{
                        fontSize: "13px",
                        color:
                          priorityVehicles.length > 0 ? "#78350f" : "#14532d",
                      }}
                    >
                      {priorityVehicles.length === 0
                        ? "No priority vehicles"
                        : "VIP/Urgent in service"}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "20px",
                      fontWeight: "bold",
                      color:
                        priorityVehicles.length > 0 ? "#f59e0b" : "#16a34a",
                    }}
                  >
                    {priorityVehicles.length}
                  </span>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Tabs - Beautiful */}
      <BeautifulTabs
        tabs={[
          { id: "needs-assignment", label: "Needs Assignment", icon: "📋" },
          { id: "pending-pdi", label: "Pending PDI", icon: "✅" },
          { id: "all-departments", label: "All Departments", icon: "🏭" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Content */}
      <div style={{ padding: "24px 40px" }}>
        {activeTab === "needs-assignment" && (
          <div>
            <h3
              style={{
                margin: "0 0 20px 0",
                fontSize: "18px",
                color: "#111827",
              }}
            >
              Vehicles Ready for Work Assignment ({getNeedsAssignment().length})
            </h3>
            {getNeedsAssignment().length === 0 ? (
              <div
                style={{
                  backgroundColor: "white",
                  padding: "60px",
                  borderRadius: "12px",
                  textAlign: "center",
                }}
              >
                <p style={{ color: "#6b7280", fontSize: "16px" }}>
                  ✅ No vehicles waiting for assignment
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "16px" }}>
                {getNeedsAssignment().map((vehicle) => (
                  <div
                    key={vehicle.id}
                    style={{
                      backgroundColor: "white",
                      padding: "20px",
                      borderRadius: "12px",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: "18px",
                          fontWeight: "600",
                          color: "#111827",
                        }}
                      >
                        {vehicle.vehicle_number}
                      </h4>
                      <p
                        style={{
                          margin: "4px 0 0 0",
                          fontSize: "14px",
                          color: "#6b7280",
                        }}
                      >
                        Customer: {vehicle.customer_name || "N/A"} • Entry:{" "}
                        {new Date(vehicle.entry_time).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedVehicle(vehicle);
                        setShowAssignWork(true);
                      }}
                      style={{
                        backgroundColor: "#2563eb",
                        color: "white",
                        padding: "10px 20px",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "600",
                      }}
                    >
                      Assign Work
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "pending-pdi" && (
          <div>
            <h3
              style={{
                margin: "0 0 20px 0",
                fontSize: "18px",
                color: "#111827",
              }}
            >
              Vehicles Ready for PDI ({getPendingPDI().length})
            </h3>
            {getPendingPDI().length === 0 ? (
              <div
                style={{
                  backgroundColor: "white",
                  padding: "60px",
                  borderRadius: "12px",
                  textAlign: "center",
                }}
              >
                <p style={{ color: "#6b7280", fontSize: "16px" }}>
                  ✅ No vehicles waiting for PDI
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "16px" }}>
                {getPendingPDI().map((vehicle) => (
                  <div
                    key={vehicle.id}
                    style={{
                      backgroundColor: "white",
                      padding: "20px",
                      borderRadius: "12px",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: "18px",
                          fontWeight: "600",
                          color: "#111827",
                        }}
                      >
                        {vehicle.vehicle_number}
                      </h4>
                      <p
                        style={{
                          margin: "4px 0 0 0",
                          fontSize: "14px",
                          color: "#6b7280",
                        }}
                      >
                        Customer: {vehicle.customer_name || "N/A"} • Work
                        completed
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedVehicle(vehicle);
                        setShowPDI(true);
                      }}
                      style={{
                        backgroundColor: "#10b981",
                        color: "white",
                        padding: "10px 20px",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "600",
                      }}
                    >
                      Start PDI
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "all-departments" && (
          <div>
            <h3
              style={{
                margin: "0 0 24px 0",
                fontSize: "20px",
                color: "#111827",
                fontWeight: "700",
              }}
            >
              All Departments
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "24px",
              }}
            >
              {[
                { stage: "pending", label: "⏳ Pending", color: "#ef4444" },
                {
                  stage: "front_checkup",
                  label: "Front Checkup",
                  color: "#8b5cf6",
                },
                {
                  stage: "advisor_review",
                  label: "Advisor Review",
                  color: "#ec4899",
                },
                { stage: "mechanic", label: "Mechanic", color: "#f59e0b" },
                { stage: "painter", label: "Painter", color: "#10b981" },
                { stage: "denter", label: "Denter", color: "#14b8a6" },
                {
                  stage: "electrician",
                  label: "Electrician",
                  color: "#f97316",
                },
                { stage: "three_m", label: "3M Work", color: "#a855f7" },
                {
                  stage: "alignment_balancing",
                  label: "Alignment & Balancing",
                  color: "#ec4899",
                },
                {
                  stage: "tyre_fitting",
                  label: "Tyre Fitting",
                  color: "#84cc16",
                },
                { stage: "washing", label: "Washing", color: "#06b6d4" },
                { stage: "pdi", label: "PDI", color: "#f43f5e" },
                { stage: "billing", label: "Billing", color: "#6366f1" },
                { stage: "payment", label: "Payment", color: "#10b981" },
                {
                  stage: "ready_for_exit",
                  label: "Ready for Exit",
                  color: "#22c55e",
                },
                { stage: "completed", label: "Completed", color: "#16a34a" },
              ].map(({ stage, label, color }) => {
                const stageVehicles = getVehiclesByStage(stage);
                return (
                  <div
                    key={stage}
                    style={{
                      backgroundColor: "white",
                      padding: "20px",
                      borderRadius: "12px",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        marginBottom: "16px",
                      }}
                    >
                      <div
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          backgroundColor: color,
                        }}
                      />
                      <h4
                        style={{
                          margin: 0,
                          fontSize: "16px",
                          fontWeight: "600",
                          color: "#111827",
                        }}
                      >
                        {label} ({stageVehicles.length})
                      </h4>
                    </div>
                    {stageVehicles.length === 0 ? (
                      <p
                        style={{
                          margin: 0,
                          color: "#9ca3af",
                          fontSize: "14px",
                        }}
                      >
                        No vehicles
                      </p>
                    ) : (
                      <div style={{ display: "grid", gap: "8px" }}>
                        {stageVehicles.map((v) => {
                          const workStages =
                            v.work_stages && v.work_stages.length > 0
                              ? v.work_stages[0]
                              : null;

                          const workStatus = [];
                          if (workStages) {
                            const workTypes = [
                              {
                                key: "mechanic",
                                label: "Mechanic",
                                required: workStages.mechanic_required,
                                status: workStages.mechanic_status,
                              },
                              {
                                key: "painter",
                                label: "Painter",
                                required: workStages.painter_required,
                                status: workStages.painter_status,
                              },
                              {
                                key: "denter",
                                label: "Denter",
                                required: workStages.denter_required,
                                status: workStages.denter_status,
                              },
                              {
                                key: "electrician",
                                label: "Electrician",
                                required: workStages.electrician_required,
                                status: workStages.electrician_status,
                              },
                              {
                                key: "three_m",
                                label: "3M",
                                required: workStages.three_m_required,
                                status: workStages.three_m_status,
                              },
                              {
                                key: "alignment_balancing",
                                label: "A&B",
                                required:
                                  workStages.alignment_balancing_required,
                                status: workStages.alignment_balancing_status,
                              },
                              {
                                key: "tyre_fitting",
                                label: "Tyre",
                                required: workStages.tyre_fitting_required,
                                status: workStages.tyre_fitting_status,
                              },
                              {
                                key: "washing",
                                label: "Wash",
                                required: workStages.washing_required,
                                status: workStages.washing_status,
                              },
                            ];

                            workTypes.forEach((work) => {
                              if (work.required) {
                                workStatus.push({
                                  label: work.label,
                                  status: work.status || "not_started",
                                });
                              }
                            });
                          }

                          return (
                            <div
                              key={v.id}
                              style={{
                                padding: "12px",
                                backgroundColor: "#f9fafb",
                                borderRadius: "8px",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  marginBottom:
                                    workStatus.length > 0 ? "8px" : "0",
                                }}
                              >
                                <div>
                                  <span
                                    style={{
                                      fontWeight: "600",
                                      color: "#111827",
                                    }}
                                  >
                                    {v.vehicle_number}
                                  </span>
                                  <span
                                    style={{
                                      margin: "0 8px",
                                      color: "#d1d5db",
                                    }}
                                  >
                                    •
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "14px",
                                      color: "#6b7280",
                                      textTransform: "capitalize",
                                    }}
                                  >
                                    {v.current_status}
                                  </span>
                                  {v.locked_by_user && (
                                    <>
                                      <span
                                        style={{
                                          margin: "0 8px",
                                          color: "#d1d5db",
                                        }}
                                      >
                                        •
                                      </span>
                                      <span
                                        style={{
                                          fontSize: "14px",
                                          color: "#6b7280",
                                        }}
                                      >
                                        {v.locked_by_user.full_name}
                                      </span>
                                    </>
                                  )}
                                </div>
                                <button
                                  onClick={() => {
                                    setSelectedVehicle(v);
                                    setShowDetails(true);
                                  }}
                                  style={{
                                    padding: "6px 12px",
                                    backgroundColor: "white",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    color: "#374151",
                                  }}
                                >
                                  View
                                </button>
                              </div>

                              {workStatus.length > 0 && (
                                <div
                                  style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: "6px",
                                    marginTop: "8px",
                                  }}
                                >
                                  {workStatus.map((work, idx) => (
                                    <span
                                      key={idx}
                                      style={{
                                        fontSize: "11px",
                                        padding: "3px 8px",
                                        borderRadius: "4px",
                                        fontWeight: "600",
                                        backgroundColor:
                                          work.status === "completed"
                                            ? "#dcfce7"
                                            : work.status === "in_progress"
                                            ? "#fef3c7"
                                            : "#f3f4f6",
                                        color:
                                          work.status === "completed"
                                            ? "#166534"
                                            : work.status === "in_progress"
                                            ? "#92400e"
                                            : "#6b7280",
                                      }}
                                    >
                                      {work.status === "completed" && "✅ "}
                                      {work.status === "in_progress" && "🔄 "}
                                      {work.status === "not_started" && "⏳ "}
                                      {work.label}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showPDI && selectedVehicle && (
        <PDIPopup
          vehicle={selectedVehicle}
          onClose={() => {
            setShowPDI(false);
            setSelectedVehicle(null);
          }}
          onSuccess={() => {
            setShowPDI(false);
            setSelectedVehicle(null);
            fetchData();
          }}
        />
      )}

      {showDetails && selectedVehicle && !showEdit && (
        <VehicleDetailsPopup
          vehicle={selectedVehicle}
          onClose={() => {
            setShowDetails(false);
            setSelectedVehicle(null);
          }}
          onEdit={() => {
            setShowDetails(false);
            setShowEdit(true);
          }}
          onDelete={async () => {
            if (
              window.confirm(
                `Are you sure you want to delete ${selectedVehicle.vehicle_number}? This cannot be undone.`
              )
            ) {
              try {
                await supabase
                  .from("customer_complaints")
                  .delete()
                  .eq("vehicle_id", selectedVehicle.id);
                await supabase
                  .from("work_stages")
                  .delete()
                  .eq("vehicle_id", selectedVehicle.id);
                await supabase
                  .from("vehicle_history")
                  .delete()
                  .eq("vehicle_id", selectedVehicle.id);
                await supabase
                  .from("vehicles")
                  .delete()
                  .eq("id", selectedVehicle.id);

                alert("Vehicle deleted successfully");
                setShowDetails(false);
                setSelectedVehicle(null);
                fetchData();
              } catch (error) {
                alert("Failed to delete vehicle");
                console.error(error);
              }
            }
          }}
        />
      )}

      {showEdit && selectedVehicle && (
        <EditVehiclePopup
          vehicle={selectedVehicle}
          user={user}
          onClose={() => {
            setShowEdit(false);
            setSelectedVehicle(null);
          }}
          onSuccess={() => {
            setShowEdit(false);
            setSelectedVehicle(null);
            fetchData();
          }}
        />
      )}

      {showAssignWork && selectedVehicle && (
        <AssignWorkPopup
          vehicle={selectedVehicle}
          user={user}
          onClose={() => {
            setShowAssignWork(false);
            setSelectedVehicle(null);
          }}
          onSuccess={() => {
            setShowAssignWork(false);
            setSelectedVehicle(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

function PDIPopup({ vehicle, onClose, onSuccess }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const { data, error } = await supabase
        .from("customer_complaints")
        .select("*")
        .eq("vehicle_id", vehicle.id)
        .order("complaint_number", { ascending: true });

      if (error) throw error;

      const complaintsWithState = (data || []).map((c) => ({
        ...c,
        resolved: c.is_resolved || false,
        resolution_notes: c.resolution_notes || "",
      }));

      setComplaints(complaintsWithState);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching complaints:", err);
      setError("Failed to load complaints");
      setLoading(false);
    }
  };

  const toggleResolved = (index) => {
    const updated = [...complaints];
    updated[index].resolved = !updated[index].resolved;
    if (updated[index].resolved) {
      updated[index].resolution_notes = "";
    }
    setComplaints(updated);
  };

  const updateResolutionNotes = (index, notes) => {
    const updated = [...complaints];
    updated[index].resolution_notes = notes;
    setComplaints(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const unresolvedWithoutReason = complaints.filter(
        (c) => !c.resolved && !c.resolution_notes.trim()
      );

      if (unresolvedWithoutReason.length > 0) {
        setError("Please provide a reason for all unresolved complaints");
        setSubmitting(false);
        return;
      }

      const userStr = localStorage.getItem("user");
      const currentUser = userStr ? JSON.parse(userStr) : null;

      for (const complaint of complaints) {
        const updateData = {
          is_resolved: complaint.resolved,
          resolution_notes: complaint.resolved
            ? null
            : complaint.resolution_notes,
          resolved_at: complaint.resolved ? new Date().toISOString() : null,
          resolved_by: complaint.resolved ? currentUser?.id : null,
        };

        const { error: complaintError } = await supabase
          .from("customer_complaints")
          .update(updateData)
          .eq("id", complaint.id);

        if (complaintError) throw complaintError;
      }

      const { error: vehicleError } = await supabase
        .from("vehicles")
        .update({
          current_stage: "billing",
          current_status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", vehicle.id);

      if (vehicleError) throw vehicleError;

      const resolvedCount = complaints.filter((c) => c.resolved).length;
      const unresolvedCount = complaints.filter((c) => !c.resolved).length;

      const { error: historyError } = await supabase
        .from("vehicle_history")
        .insert([
          {
            vehicle_id: vehicle.id,
            user_id: currentUser?.id || null,
            stage: "pdi",
            action: "pdi_completed",
            new_value: `PDI completed. ${resolvedCount} complaint(s) resolved, ${unresolvedCount} unresolved`,
            created_at: new Date().toISOString(),
          },
        ]);

      if (historyError) throw historyError;

      alert("PDI completed successfully! Vehicle moved to billing.");
      onSuccess();
    } catch (err) {
      console.error("Error completing PDI:", err);
      setError(err.message || "Failed to complete PDI");
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "white",
          padding: "32px",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "700px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "20px", color: "#111827" }}>
              Pre-Delivery Inspection (PDI)
            </h3>
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: "14px",
                color: "#6b7280",
              }}
            >
              {vehicle.vehicle_number} - {vehicle.customer_name || "N/A"}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: "#ef4444",
              color: "white",
              padding: "8px 16px",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            Close
          </button>
        </div>

        {loading ? (
          <p
            style={{ color: "#6b7280", textAlign: "center", padding: "40px 0" }}
          >
            Loading complaints...
          </p>
        ) : complaints.length === 0 ? (
          <div
            style={{
              backgroundColor: "#f0fdf4",
              border: "2px solid #86efac",
              padding: "24px",
              borderRadius: "8px",
              textAlign: "center",
              marginBottom: "24px",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "16px",
                color: "#166534",
                fontWeight: "600",
              }}
            >
              ✅ No complaints recorded for this vehicle
            </p>
            <p
              style={{
                margin: "8px 0 0 0",
                fontSize: "14px",
                color: "#14532d",
              }}
            >
              You can proceed to complete PDI and move to billing.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "24px" }}>
              <h4
                style={{
                  margin: "0 0 16px 0",
                  fontSize: "16px",
                  color: "#111827",
                }}
              >
                📋 Resolve Customer Complaints ({complaints.length})
              </h4>

              <div style={{ display: "grid", gap: "16px" }}>
                {complaints.map((complaint, index) => (
                  <div
                    key={complaint.id}
                    style={{
                      padding: "16px",
                      backgroundColor: complaint.resolved
                        ? "#f0fdf4"
                        : "#fef3c7",
                      border: `2px solid ${
                        complaint.resolved ? "#86efac" : "#fbbf24"
                      }`,
                      borderRadius: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        marginBottom: "12px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={complaint.resolved}
                        onChange={() => toggleResolved(index)}
                        style={{
                          width: "20px",
                          height: "20px",
                          cursor: "pointer",
                          marginTop: "2px",
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "6px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "14px",
                              fontWeight: "600",
                              color: "#111827",
                            }}
                          >
                            Complaint #{complaint.complaint_number}
                          </span>
                          <span
                            style={{
                              fontSize: "12px",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              backgroundColor: complaint.resolved
                                ? "#dcfce7"
                                : "#fee2e2",
                              color: complaint.resolved ? "#166534" : "#991b1b",
                              fontWeight: "600",
                            }}
                          >
                            {complaint.resolved
                              ? "✅ Resolved"
                              : "❌ Not Resolved"}
                          </span>
                        </div>
                        <p
                          style={{
                            margin: "0 0 12px 0",
                            fontSize: "14px",
                            color: "#374151",
                          }}
                        >
                          {complaint.complaint_text}
                        </p>

                        {!complaint.resolved && (
                          <div>
                            <label
                              style={{
                                display: "block",
                                fontSize: "13px",
                                fontWeight: "600",
                                color: "#111827",
                                marginBottom: "6px",
                              }}
                            >
                              Reason for not resolving: *
                            </label>
                            <textarea
                              value={complaint.resolution_notes}
                              onChange={(e) =>
                                updateResolutionNotes(index, e.target.value)
                              }
                              placeholder="e.g., Customer declined due to budget constraints"
                              required={!complaint.resolved}
                              rows={2}
                              style={{
                                width: "100%",
                                padding: "8px",
                                border: "1px solid #d1d5db",
                                borderRadius: "6px",
                                fontSize: "13px",
                                boxSizing: "border-box",
                                fontFamily: "Arial, sans-serif",
                              }}
                            />
                          </div>
                        )}

                        {complaint.resolved &&
                          complaint.is_resolved &&
                          complaint.resolution_notes && (
                            <p
                              style={{
                                margin: 0,
                                fontSize: "12px",
                                color: "#6b7280",
                                fontStyle: "italic",
                              }}
                            >
                              Previous note: {complaint.resolution_notes}
                            </p>
                          )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#f0f9ff",
                padding: "16px",
                borderRadius: "8px",
                marginBottom: "24px",
              }}
            >
              <p style={{ margin: 0, fontSize: "14px", color: "#0369a1" }}>
                <strong>Summary:</strong>{" "}
                {complaints.filter((c) => c.resolved).length} resolved,{" "}
                {complaints.filter((c) => !c.resolved).length} unresolved
              </p>
            </div>

            {error && (
              <div
                style={{
                  backgroundColor: "#fee2e2",
                  color: "#991b1b",
                  padding: "12px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  fontSize: "14px",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: "100%",
                padding: "14px",
                backgroundColor: submitting ? "#9ca3af" : "#10b981",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: submitting ? "not-allowed" : "pointer",
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              {submitting
                ? "Completing PDI..."
                : "Complete PDI & Move to Billing"}
            </button>
          </form>
        )}

        {!loading && complaints.length === 0 && (
          <button
            onClick={async () => {
              setSubmitting(true);
              try {
                const userStr = localStorage.getItem("user");
                const currentUser = userStr ? JSON.parse(userStr) : null;

                await supabase
                  .from("vehicles")
                  .update({
                    current_stage: "billing",
                    current_status: "pending",
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", vehicle.id);

                await supabase.from("vehicle_history").insert([
                  {
                    vehicle_id: vehicle.id,
                    user_id: currentUser?.id || null,
                    stage: "pdi",
                    action: "pdi_completed",
                    new_value: "PDI completed. No complaints recorded",
                    created_at: new Date().toISOString(),
                  },
                ]);

                alert("PDI completed successfully! Vehicle moved to billing.");
                onSuccess();
              } catch (err) {
                setError(err.message || "Failed to complete PDI");
                setSubmitting(false);
              }
            }}
            disabled={submitting}
            style={{
              width: "100%",
              padding: "14px",
              backgroundColor: submitting ? "#9ca3af" : "#10b981",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: submitting ? "not-allowed" : "pointer",
              fontSize: "16px",
              fontWeight: "600",
            }}
          >
            {submitting
              ? "Completing PDI..."
              : "Complete PDI & Move to Billing"}
          </button>
        )}
      </div>
    </div>
  );
}

// Vehicle Details Popup Component (UPDATED WITH EDIT/DELETE BUTTONS)
function VehicleDetailsPopup({ vehicle, onClose, onEdit, onDelete }) {
  const [history, setHistory] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    fetchHistory();
    fetchComplaints();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicle_history")
        .select(
          `
          *,
          user:users!vehicle_history_user_id_fkey(full_name)
        `
        )
        .eq("vehicle_id", vehicle.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
      setLoadingHistory(false);
    } catch (error) {
      console.error("Error fetching history:", error);
      setLoadingHistory(false);
    }
  };

  const fetchComplaints = async () => {
    try {
      const { data } = await supabase
        .from("customer_complaints")
        .select("*")
        .eq("vehicle_id", vehicle.id)
        .order("complaint_number", { ascending: true });

      setComplaints(data || []);
    } catch (error) {
      console.error("Error fetching complaints:", error);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "white",
          padding: "32px",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "700px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "24px", color: "#111827" }}>
            {vehicle.vehicle_number}
          </h3>
          <button
            onClick={onClose}
            style={{
              backgroundColor: "#ef4444",
              color: "white",
              padding: "8px 16px",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Close
          </button>
        </div>

        {/* Edit and Delete Buttons */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
          <button
            onClick={onEdit}
            style={{
              flex: 1,
              backgroundColor: "#fef3c7",
              color: "#92400e",
              padding: "12px",
              border: "2px solid #f59e0b",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            ✏️ Edit Vehicle
          </button>
          <button
            onClick={onDelete}
            style={{
              flex: 1,
              backgroundColor: "#fee2e2",
              color: "#dc2626",
              padding: "12px",
              border: "2px solid #ef4444",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            🗑️ Delete Vehicle
          </button>
        </div>

        <div
          style={{
            backgroundColor: "#f0f9ff",
            border: "2px solid #bae6fd",
            padding: "16px",
            borderRadius: "8px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                fontSize: "14px",
                color: "#0369a1",
                fontWeight: "600",
              }}
            >
              Current Stage:
            </span>
            <span
              style={{
                backgroundColor: "#dbeafe",
                color: "#1e40af",
                padding: "4px 12px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "600",
                textTransform: "capitalize",
              }}
            >
              {vehicle.current_stage.replace("_", " ")}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span
              style={{
                fontSize: "14px",
                color: "#0369a1",
                fontWeight: "600",
              }}
            >
              Status:
            </span>
            <span
              style={{
                backgroundColor:
                  vehicle.current_status === "completed"
                    ? "#dcfce7"
                    : vehicle.current_status === "in_progress"
                    ? "#fef3c7"
                    : "#f3f4f6",
                color:
                  vehicle.current_status === "completed"
                    ? "#166534"
                    : vehicle.current_status === "in_progress"
                    ? "#92400e"
                    : "#374151",
                padding: "4px 12px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "600",
                textTransform: "capitalize",
              }}
            >
              {vehicle.current_status}
            </span>
          </div>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <h4
            style={{
              margin: "0 0 16px 0",
              fontSize: "16px",
              color: "#374151",
            }}
          >
            Vehicle Information
          </h4>
          <div style={{ display: "grid", gap: "12px" }}>
            <InfoRow
              label="Customer Name"
              value={vehicle.customer_name || "N/A"}
            />
            <InfoRow
              label="Customer Phone"
              value={vehicle.customer_phone || "N/A"}
            />
            <InfoRow
              label="Odometer Reading"
              value={`${vehicle.odometer_reading || 0} km`}
            />
            <InfoRow label="Fuel Level" value={vehicle.fuel_level || "N/A"} />
            <InfoRow
              label="Priority"
              value={
                <span
                  style={{
                    backgroundColor:
                      vehicle.priority === "vip"
                        ? "#fce7f3"
                        : vehicle.priority === "urgent"
                        ? "#fee2e2"
                        : "#f3f4f6",
                    color:
                      vehicle.priority === "vip"
                        ? "#9f1239"
                        : vehicle.priority === "urgent"
                        ? "#991b1b"
                        : "#374151",
                    padding: "4px 12px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                  }}
                >
                  {vehicle.priority || "normal"}
                </span>
              }
            />
            {vehicle.service_type && (
              <InfoRow
                label="Service Type"
                value={vehicle.service_type.replace(/_/g, " ")}
              />
            )}
            {vehicle.job_code && (
              <InfoRow label="Job Code" value={vehicle.job_code} />
            )}
            {vehicle.part_amount && (
              <InfoRow label="Part Amount" value={`₹${vehicle.part_amount}`} />
            )}
            {vehicle.expected_completion_time && (
              <InfoRow
                label="Expected Completion"
                value={new Date(
                  vehicle.expected_completion_time
                ).toLocaleString()}
              />
            )}
          </div>
        </div>

        {vehicle.customer_voice && (
          <div
            style={{
              backgroundColor: "#f0f9ff",
              padding: "16px",
              borderRadius: "12px",
              marginBottom: "24px",
            }}
          >
            <p
              style={{
                margin: "0 0 8px 0",
                fontSize: "14px",
                fontWeight: "600",
                color: "#0369a1",
              }}
            >
              💬 Customer Voice:
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                color: "#0c4a6e",
                fontStyle: "italic",
              }}
            >
              "{vehicle.customer_voice}"
            </p>
          </div>
        )}

        {complaints.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <h4
              style={{
                margin: "0 0 16px 0",
                fontSize: "16px",
                color: "#374151",
              }}
            >
              📝 Complaints ({complaints.length})
            </h4>
            <div style={{ display: "grid", gap: "12px" }}>
              {complaints.map((c) => (
                <div
                  key={c.id}
                  style={{
                    backgroundColor: "#f9fafb",
                    padding: "12px",
                    borderRadius: "8px",
                    borderLeft: "3px solid #8b5cf6",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: "700",
                        color: "#374151",
                      }}
                    >
                      #{c.complaint_number}
                    </span>
                    <span
                      style={{
                        fontSize: "10px",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        backgroundColor: c.is_resolved ? "#dcfce7" : "#fee2e2",
                        color: c.is_resolved ? "#166534" : "#991b1b",
                        fontWeight: "600",
                      }}
                    >
                      {c.is_resolved ? "Resolved" : "Pending"}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "14px",
                      color: "#374151",
                    }}
                  >
                    {c.complaint_text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h4
            style={{
              margin: "0 0 16px 0",
              fontSize: "16px",
              color: "#374151",
            }}
          >
            🕐 Complete Timeline
          </h4>

          {loadingHistory ? (
            <p style={{ color: "#6b7280", fontSize: "14px" }}>
              Loading timeline...
            </p>
          ) : history.length === 0 ? (
            <p style={{ color: "#6b7280", fontSize: "14px" }}>
              No history recorded yet
            </p>
          ) : (
            <div style={{ position: "relative", paddingLeft: "24px" }}>
              <div
                style={{
                  position: "absolute",
                  left: "7px",
                  top: "12px",
                  bottom: "12px",
                  width: "2px",
                  backgroundColor: "#e5e7eb",
                }}
              />

              {history.map((item, index) => (
                <div
                  key={item.id}
                  style={{
                    position: "relative",
                    marginBottom: index < history.length - 1 ? "20px" : "0",
                    paddingBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: "-20px",
                      top: "6px",
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      backgroundColor: "#2563eb",
                      border: "2px solid white",
                      boxShadow: "0 0 0 2px #e5e7eb",
                    }}
                  />

                  <div
                    style={{
                      backgroundColor: "#f9fafb",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "6px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "#111827",
                          textTransform: "capitalize",
                        }}
                      >
                        {item.stage.replace("_", " ")} -{" "}
                        {item.action.replace("_", " ")}
                      </span>
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#6b7280",
                        }}
                      >
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                    </div>

                    {item.user && (
                      <p
                        style={{
                          margin: "0 0 6px 0",
                          fontSize: "12px",
                          color: "#6b7280",
                        }}
                      >
                        👤 {item.user.full_name}
                      </p>
                    )}

                    {item.new_value && (
                      <p
                        style={{
                          margin: "0 0 6px 0",
                          fontSize: "13px",
                          color: "#374151",
                        }}
                      >
                        {item.new_value}
                      </p>
                    )}

                    {item.notes && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: "12px",
                          color: "#6b7280",
                          fontStyle: "italic",
                        }}
                      >
                        📝 {item.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "10px",
        backgroundColor: "#f9fafb",
        borderRadius: "6px",
      }}
    >
      <span style={{ fontSize: "14px", color: "#6b7280" }}>{label}</span>
      <span style={{ fontSize: "14px", color: "#111827", fontWeight: "500" }}>
        {value}
      </span>
    </div>
  );
}

// EditVehiclePopup Component
function EditVehiclePopup({ vehicle, user, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState(
    vehicle.vehicle_number || ""
  );
  const [customerName, setCustomerName] = useState(vehicle.customer_name || "");
  const [customerPhone, setCustomerPhone] = useState(
    vehicle.customer_phone || ""
  );
  const [odometerReading, setOdometerReading] = useState(
    vehicle.odometer_reading?.toString() || ""
  );
  const [fuelLevel, setFuelLevel] = useState(vehicle.fuel_level || "1/2");
  const [priority, setPriority] = useState(vehicle.priority || "normal");
  const [serviceType, setServiceType] = useState(vehicle.service_type || "");
  const [customerVoice, setCustomerVoice] = useState(
    vehicle.customer_voice || ""
  );
  const [jobCode, setJobCode] = useState(vehicle.job_code || "");
  const [jobDescription, setJobDescription] = useState(
    vehicle.job_description || ""
  );
  const [partAmount, setPartAmount] = useState(
    vehicle.part_amount?.toString() || ""
  );

  const handleSave = async (e) => {
    e.preventDefault();
    if (!vehicleNumber.trim()) {
      alert("Vehicle number is required");
      return;
    }

    setLoading(true);
    try {
      await supabase
        .from("vehicles")
        .update({
          vehicle_number: vehicleNumber.trim().toUpperCase(),
          customer_name: customerName.trim() || null,
          customer_phone: customerPhone.trim() || null,
          odometer_reading: odometerReading ? parseInt(odometerReading) : null,
          fuel_level: fuelLevel,
          priority,
          service_type: serviceType || null,
          customer_voice: customerVoice.trim() || null,
          job_code: jobCode.trim() || null,
          job_description: jobDescription.trim() || null,
          part_amount: partAmount ? parseFloat(partAmount) : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", vehicle.id);

      await supabase.from("vehicle_history").insert([
        {
          vehicle_id: vehicle.id,
          user_id: user?.id,
          stage: vehicle.current_stage,
          action: "vehicle_edited",
          new_value: `Vehicle details updated by ${
            user?.full_name || "Advisor"
          }`,
          created_at: new Date().toISOString(),
        },
      ]);

      alert("Vehicle updated successfully!");
      onSuccess();
    } catch (error) {
      alert("Failed to update vehicle");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "white",
          padding: "32px",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "700px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "20px", color: "#111827" }}>
              ✏️ Edit Vehicle
            </h3>
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: "14px",
                color: "#6b7280",
              }}
            >
              {vehicle.vehicle_number}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: "#ef4444",
              color: "white",
              padding: "8px 16px",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div style={{ marginBottom: "24px" }}>
            <h4
              style={{
                margin: "0 0 16px 0",
                fontSize: "16px",
                color: "#111827",
                fontWeight: "700",
              }}
            >
              🚗 Basic Information
            </h4>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Vehicle Number *
              </label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="MH12AB1234"
                maxLength={10}
                required
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Customer Phone
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="9876543210"
                maxLength={10}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Odometer (km)
              </label>
              <input
                type="number"
                value={odometerReading}
                onChange={(e) => setOdometerReading(e.target.value)}
                placeholder="0"
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Fuel Level
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: "8px",
                }}
              >
                {["Empty", "1/4", "1/2", "3/4", "Full"].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setFuelLevel(level)}
                    style={{
                      padding: "10px",
                      backgroundColor:
                        fuelLevel === level ? "#dbeafe" : "#f9fafb",
                      border: `2px solid ${
                        fuelLevel === level ? "#2563eb" : "#e5e7eb"
                      }`,
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: fuelLevel === level ? "#2563eb" : "#374151",
                    }}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Priority
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "12px",
                }}
              >
                {["normal", "urgent", "vip"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    style={{
                      padding: "12px",
                      backgroundColor:
                        priority === p
                          ? p === "vip"
                            ? "#fce7f3"
                            : p === "urgent"
                            ? "#fee2e2"
                            : "#f3f4f6"
                          : "#f9fafb",
                      border: `2px solid ${
                        priority === p
                          ? p === "vip"
                            ? "#ec4899"
                            : p === "urgent"
                            ? "#ef4444"
                            : "#9ca3af"
                          : "#e5e7eb"
                      }`,
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600",
                      color:
                        priority === p
                          ? p === "vip"
                            ? "#be185d"
                            : p === "urgent"
                            ? "#dc2626"
                            : "#374151"
                          : "#6b7280",
                    }}
                  >
                    {p === "vip"
                      ? "👑 VIP"
                      : p === "urgent"
                      ? "🔥 Urgent"
                      : "Normal"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <h4
              style={{
                margin: "0 0 16px 0",
                fontSize: "16px",
                color: "#111827",
                fontWeight: "700",
              }}
            >
              📋 Service Details
            </h4>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Service Type
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "10px",
                }}
              >
                {[
                  { value: "", label: "Not Set" },
                  { value: "paid_service", label: "💰 Paid" },
                  { value: "free_scheduled_service", label: "🎁 Free" },
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setServiceType(type.value)}
                    style={{
                      padding: "10px",
                      backgroundColor:
                        serviceType === type.value ? "#f5f3ff" : "#f9fafb",
                      border: `2px solid ${
                        serviceType === type.value ? "#8b5cf6" : "#e5e7eb"
                      }`,
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: serviceType === type.value ? "#8b5cf6" : "#6b7280",
                    }}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Customer Voice
              </label>
              <textarea
                value={customerVoice}
                onChange={(e) => setCustomerVoice(e.target.value)}
                placeholder="What did the customer say?"
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  fontFamily: "Arial, sans-serif",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Job Code
              </label>
              <input
                type="text"
                value={jobCode}
                onChange={(e) => setJobCode(e.target.value)}
                placeholder="JC-2026-001"
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Job Description
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Detailed description..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  fontFamily: "Arial, sans-serif",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Part Amount (₹)
              </label>
              <input
                type="number"
                value={partAmount}
                onChange={(e) => setPartAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "14px",
                backgroundColor: "#f3f4f6",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2,
                padding: "14px",
                backgroundColor: loading ? "#9ca3af" : "#f59e0b",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              {loading ? "Saving..." : "💾 Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssignWorkPopup({ vehicle, onClose, onSuccess }) {
  const [complaints, setComplaints] = useState([{ text: "" }]);
  const [workTypes, setWorkTypes] = useState({
    mechanic: false,
    painter: false,
    denter: false,
    electrician: false,
    "3m": false,
    alignment_balancing: false,
    tyre_fitting: false,
    washing: false,
  });
  const [expectedDate, setExpectedDate] = useState("");
  const [expectedTime, setExpectedTime] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addComplaint = () => {
    setComplaints([...complaints, { text: "" }]);
  };

  const removeComplaint = (index) => {
    setComplaints(complaints.filter((_, i) => i !== index));
  };

  const updateComplaint = (index, text) => {
    const updated = [...complaints];
    updated[index].text = text;
    setComplaints(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validation
      const selectedWork = Object.keys(workTypes).filter(
        (key) => workTypes[key]
      );
      if (selectedWork.length === 0) {
        setError("Please select at least one work type");
        setLoading(false);
        return;
      }

      if (!expectedDate || !expectedTime) {
        setError("Please set expected completion date and time");
        setLoading(false);
        return;
      }

      // Combine date and time
      const expectedDateTime = new Date(`${expectedDate}T${expectedTime}`);

      // Filter out empty complaints
      const validComplaints = complaints.filter((c) => c.text.trim() !== "");

      // Get current user (advisor)
      const userStr = localStorage.getItem("user");
      const currentUser = userStr ? JSON.parse(userStr) : null;

      // 1. Update vehicles table
      const { error: vehicleError } = await supabase
        .from("vehicles")
        .update({
          current_stage: "pending",
          current_status: "pending",
          expected_completion_time: expectedDateTime.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", vehicle.id);

      if (vehicleError) throw vehicleError;

      // 2. Insert complaints if any
      if (validComplaints.length > 0) {
        // Get the current max complaint number for this vehicle
        const { data: existingComplaints } = await supabase
          .from("customer_complaints")
          .select("complaint_number")
          .eq("vehicle_id", vehicle.id)
          .order("complaint_number", { ascending: false })
          .limit(1);

        const startNumber =
          existingComplaints && existingComplaints.length > 0
            ? existingComplaints[0].complaint_number + 1
            : 1;

        const complaintsToInsert = validComplaints.map((complaint, index) => ({
          vehicle_id: vehicle.id,
          complaint_text: complaint.text,
          complaint_number: startNumber + index,
          is_resolved: false,
          reported_by: currentUser?.id || null,
          created_at: new Date().toISOString(),
        }));

        const { error: complaintsError } = await supabase
          .from("customer_complaints")
          .insert(complaintsToInsert);

        if (complaintsError) throw complaintsError;
      }

      // 3. Update or insert work_stages
      const { data: existingWorkStage } = await supabase
        .from("work_stages")
        .select("*")
        .eq("vehicle_id", vehicle.id)
        .single();

      const workStageData = {
        vehicle_id: vehicle.id,
        mechanic_required: workTypes.mechanic,
        painter_required: workTypes.painter,
        denter_required: workTypes.denter,
        electrician_required: workTypes.electrician,
        three_m_required: workTypes["3m"],
        alignment_balancing_required: workTypes.alignment_balancing,
        tyre_fitting_required: workTypes.tyre_fitting,
        washing_required: workTypes.washing,
        mechanic_status: workTypes.mechanic ? "not_started" : "not_started",
        painter_status: workTypes.painter ? "not_started" : "not_started",
        denter_status: workTypes.denter ? "not_started" : "not_started",
        electrician_status: workTypes.electrician
          ? "not_started"
          : "not_started",
        three_m_status: workTypes["3m"] ? "not_started" : "not_started",
        alignment_balancing_status: workTypes.alignment_balancing
          ? "not_started"
          : "not_started",
        tyre_fitting_status: workTypes.tyre_fitting
          ? "not_started"
          : "not_started",
        washing_status: workTypes.washing ? "not_started" : "not_started",
        updated_at: new Date().toISOString(),
      };

      if (existingWorkStage) {
        const { error: updateError } = await supabase
          .from("work_stages")
          .update(workStageData)
          .eq("vehicle_id", vehicle.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("work_stages")
          .insert([{ ...workStageData, created_at: new Date().toISOString() }]);

        if (insertError) throw insertError;
      }

      // 4. Add to vehicle history
      const workTypesList = selectedWork
        .map((w) => w.replace("_", " "))
        .join(", ");
      const { error: historyError } = await supabase
        .from("vehicle_history")
        .insert([
          {
            vehicle_id: vehicle.id,
            user_id: currentUser?.id || null,
            stage: "pending",
            action: "work_assigned",
            new_value: `Work assigned: ${workTypesList}. Expected completion: ${expectedDateTime.toLocaleString()}`,
            notes: notes || null,
            created_at: new Date().toISOString(),
          },
        ]);

      if (historyError) throw historyError;

      alert("Work assigned successfully!");
      onSuccess();
    } catch (err) {
      console.error("Error assigning work:", err);
      setError(err.message || "Failed to assign work");
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "white",
          padding: "32px",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "700px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "20px", color: "#111827" }}>
              Assign Work - {vehicle.vehicle_number}
            </h3>
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: "14px",
                color: "#6b7280",
              }}
            >
              Customer: {vehicle.customer_name || "N/A"}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: "#ef4444",
              color: "white",
              padding: "8px 16px",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Customer Complaints Section */}
          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                fontSize: "16px",
                fontWeight: "600",
                color: "#111827",
                marginBottom: "12px",
              }}
            >
              📋 Customer Complaints
            </label>
            <div style={{ display: "grid", gap: "8px" }}>
              {complaints.map((complaint, index) => (
                <div key={index} style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={complaint.text}
                    onChange={(e) => updateComplaint(index, e.target.value)}
                    placeholder={`Complaint ${index + 1}`}
                    style={{
                      flex: 1,
                      padding: "10px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "14px",
                    }}
                  />
                  {complaints.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeComplaint(index)}
                      style={{
                        padding: "10px 16px",
                        backgroundColor: "#fee2e2",
                        color: "#991b1b",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "600",
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addComplaint}
              style={{
                marginTop: "8px",
                padding: "8px 16px",
                backgroundColor: "#f3f4f6",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              + Add Another Complaint
            </button>
          </div>

          {/* Work Types Section */}
          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                fontSize: "16px",
                fontWeight: "600",
                color: "#111827",
                marginBottom: "12px",
              }}
            >
              🔧 Work Required *
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "12px",
              }}
            >
              {[
                { key: "mechanic", label: "Mechanic" },
                { key: "painter", label: "Painter" },
                { key: "denter", label: "Denter" },
                { key: "electrician", label: "Electrician" },
                { key: "3m", label: "3M Work" },
                { key: "alignment_balancing", label: "Alignment & Balancing" },
                { key: "tyre_fitting", label: "Tyre Fitting" },
                { key: "washing", label: "Washing" },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "12px",
                    backgroundColor: workTypes[key] ? "#dbeafe" : "#f9fafb",
                    border: `2px solid ${
                      workTypes[key] ? "#2563eb" : "#e5e7eb"
                    }`,
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={workTypes[key]}
                    onChange={(e) =>
                      setWorkTypes({ ...workTypes, [key]: e.target.checked })
                    }
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#111827",
                    }}
                  >
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Expected Completion Time */}
          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                fontSize: "16px",
                fontWeight: "600",
                color: "#111827",
                marginBottom: "12px",
              }}
            >
              ⏰ Expected Completion Time *
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    color: "#6b7280",
                    marginBottom: "6px",
                  }}
                >
                  Date
                </label>
                <input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    color: "#6b7280",
                    marginBottom: "6px",
                  }}
                >
                  Time
                </label>
                <input
                  type="time"
                  value={expectedTime}
                  onChange={(e) => setExpectedTime(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                fontSize: "16px",
                fontWeight: "600",
                color: "#111827",
                marginBottom: "12px",
              }}
            >
              📝 Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any special instructions or notes..."
              rows={4}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px",
                boxSizing: "border-box",
                fontFamily: "Arial, sans-serif",
              }}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                backgroundColor: "#fee2e2",
                color: "#991b1b",
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "16px",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              backgroundColor: loading ? "#9ca3af" : "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "16px",
              fontWeight: "600",
            }}
          >
            {loading ? "Assigning Work..." : "Assign Work"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdvisorDashboard;
