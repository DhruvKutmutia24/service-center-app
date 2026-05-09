import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import {
  BeautifulHeader,
  BeautifulStatCard,
  BeautifulLoading,
} from "./BeautifulComponents";

// ─── Helpers ────────────────────────────────────────────────────────────────

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", icon: "💵" },
  { value: "card", label: "Card", icon: "💳" },
  { value: "upi_phonepe", label: "PhonePe UPI", icon: "📱" },
  { value: "upi_icici", label: "ICICI UPI", icon: "📱" },
  { value: "bank_transfer", label: "Bank Transfer", icon: "🏦" },
  { value: "credit", label: "Credit (Pay Later)", icon: "📋" },
];

//const METHOD_NEEDS_TXN = ["card", "upi", "bank_transfer"];
const METHOD_NEEDS_TXN = [
  "card",
  "upi_phonepe",
  "upi_gpay",
  "upi_icici",
  "upi_other",
  "bank_transfer",
];

function formatIST(dateStr) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  });
}

function formatCurrency(val) {
  return `₹${(parseFloat(val) || 0).toFixed(2)}`;
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

function CashierDashboard({ user, onLogout }) {
  const [tab, setTab] = useState("pending");
  const [pendingVehicles, setPendingVehicles] = useState([]);
  const [pipelineVehicles, setPipelineVehicles] = useState([]);
  const [creditGroups, setCreditGroups] = useState([]); // grouped by vehicle_number
  const [allPayments, setAllPayments] = useState([]);
  const [todayPayments, setTodayPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedCreditGroup, setSelectedCreditGroup] = useState(null);
  const [modal, setModal] = useState(null); // "payment" | "details" | "credit" | "statement"

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Pending payments (payment stage)
      const { data: pending } = await supabase
        .from("vehicles")
        .select("*")
        .not("bill_amount", "is", null)
        .gt("bill_amount", 0)
        .not("payment_status", "in", '("paid","credit")')
        .not("current_stage", "in", '("ready_for_exit","completed")')
        .order("entry_time", { ascending: false });

      // For each pending vehicle, look up previous credit from same vehicle_number
      const enrichedPending = await Promise.all(
        (pending || []).map(async (v) => {
          const { data: prevCredits } = await supabase
            .from("vehicles")
            .select("id, credit_amount, bill_amount, entry_time")
            .eq("vehicle_number", v.vehicle_number)
            .gt("credit_amount", 0)
            .neq("id", v.id); // exclude current visit

          const previousCredit = (prevCredits || []).reduce(
            (s, p) => s + (parseFloat(p.credit_amount) || 0),
            0,
          );
          return { ...v, previous_credit: previousCredit };
        }),
      );

      // Pipeline: billing stage + all active (not completed/payment/ready_for_exit)
      const { data: pipeline } = await supabase
        .from("vehicles")
        .select("*")
        .not("current_stage", "in", '("payment","ready_for_exit","completed")')
        .order("entry_time", { ascending: false });

      // Credit vehicles - all with outstanding credit_amount > 0
      const { data: allCreditVehicles } = await supabase
        .from("vehicles")
        .select(
          "id, vehicle_number, customer_name, customer_phone, bill_amount, total_paid, credit_amount, credit_guaranteed_by, entry_time, updated_at, payment_status",
        )
        .gt("credit_amount", 0);

      // Group by vehicle_number
      const grouped = {};
      (allCreditVehicles || []).forEach((v) => {
        const vn = v.vehicle_number;
        if (!grouped[vn]) {
          grouped[vn] = {
            vehicle_number: vn,
            customer_name: v.customer_name,
            customer_phone: v.customer_phone,
            total_credit: 0,
            visits: [],
          };
        }
        grouped[vn].total_credit += parseFloat(v.credit_amount) || 0;
        // Collect all unique guarantors across visits
        grouped[vn].visits.push(v);
      });

      // Today's payments (exclude credit method — not real cash)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: todayPay } = await supabase
        .from("payments")
        .select("*")
        .gte("created_at", todayStart.toISOString())
        .neq("payment_method", "credit");

      // All payments with vehicle + collector info for Collections Report
      const { data: allPay } = await supabase
        .from("payments")
        .select(
          `
          *,
          vehicle:vehicles!payments_vehicle_id_fkey(vehicle_number, customer_name, customer_phone, model, credit_guaranteed_by),
          collector:users!payments_collected_by_fkey(full_name)
        `,
        )
        .order("created_at", { ascending: false });

      setPendingVehicles(enrichedPending || []);
      setPipelineVehicles(pipeline || []);
      setCreditGroups(
        Object.values(grouped).sort((a, b) => b.total_credit - a.total_credit),
      );
      setTodayPayments(todayPay || []);
      setAllPayments(allPay || []);
    } catch (e) {
      console.error("fetchData error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const todayCollection = todayPayments.reduce(
    (s, p) => s + parseFloat(p.amount || 0),
    0,
  );
  const totalCredit = creditGroups.reduce((s, g) => s + g.total_credit, 0);

  const openModal = (vehicle, type) => {
    setSelectedVehicle(vehicle);
    setModal(type);
  };
  const openCreditModal = (group, type) => {
    setSelectedCreditGroup(group);
    setModal(type);
  };
  const closeModal = () => {
    setSelectedVehicle(null);
    setSelectedCreditGroup(null);
    setModal(null);
  };
  const onSuccess = () => {
    closeModal();
    fetchData();
  };

  if (loading) return <BeautifulLoading />;

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

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f3f4f6",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <BeautifulHeader
        title="Cashier Dashboard"
        subtitle="Tata Motors Service Center"
        userName={user.full_name}
        onLogout={onLogout}
      />

      <div style={{ padding: "32px 40px 20px" }}>
        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "24px",
            marginBottom: "32px",
          }}
        >
          <BeautifulStatCard
            title="Pending Payments"
            value={pendingVehicles.length}
            icon="💳"
            color="#ef4444"
            bgColor="#fee2e2"
          />
          <BeautifulStatCard
            title="Today's Collection"
            value={formatCurrency(todayCollection)}
            icon="📊"
            color="#3b82f6"
            bgColor="#dbeafe"
          />
          <BeautifulStatCard
            title="Credit Outstanding"
            value={formatCurrency(totalCredit)}
            icon="📋"
            color="#f59e0b"
            bgColor="#fef3c7"
          />
          <BeautifulStatCard
            title="Vehicles in Pipeline"
            value={pipelineVehicles.length}
            icon="🔜"
            color="#8b5cf6"
            bgColor="#ede9fe"
          />
        </div>

        {/* Tab Bar */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            backgroundColor: "white",
            padding: "6px",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            marginBottom: "24px",
            width: "fit-content",
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "10px 20px",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "14px",
                transition: "all 0.2s",
                backgroundColor: tab === t.id ? "#667eea" : "transparent",
                color: tab === t.id ? "white" : "#6b7280",
                boxShadow:
                  tab === t.id ? "0 2px 8px rgba(102,126,234,0.4)" : "none",
              }}
            >
              {t.label}
              {t.count !== null && (
                <span
                  style={{
                    marginLeft: "8px",
                    backgroundColor:
                      tab === t.id ? "rgba(255,255,255,0.3)" : "#e5e7eb",
                    color: tab === t.id ? "white" : "#374151",
                    borderRadius: "12px",
                    padding: "2px 8px",
                    fontSize: "12px",
                  }}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "pending" && (
          <PendingTab
            vehicles={pendingVehicles}
            onPayment={(v) => openModal(v, "payment")}
            onDetails={(v) => openModal(v, "details")}
          />
        )}
        {tab === "pipeline" && <PipelineTab vehicles={pipelineVehicles} />}
        {tab === "credit" && (
          <CreditLedgerTab
            vehicles={creditGroups}
            onCollect={(g) => openCreditModal(g, "credit")}
            onViewStatement={(g) => openCreditModal(g, "statement")}
          />
        )}
        {tab === "collections" && (
          <CollectionsReportTab payments={allPayments} />
        )}
      </div>

      {/* Modals */}
      {modal === "payment" && selectedVehicle && (
        <PaymentFormModal
          vehicle={selectedVehicle}
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
      {modal === "credit" && selectedCreditGroup && (
        <CreditCollectionModal
          group={selectedCreditGroup}
          onClose={closeModal}
          onSuccess={onSuccess}
        />
      )}
      {modal === "statement" && selectedCreditGroup && (
        <CreditStatementModal
          group={selectedCreditGroup}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

// ─── Tab: Pending Payments ───────────────────────────────────────────────────

function PendingTab({ vehicles, onPayment, onDetails }) {
  if (vehicles.length === 0)
    return (
      <EmptyState
        icon="✅"
        title="No pending payments"
        subtitle="All vehicles processed!"
      />
    );

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      {vehicles.map((v) => (
        <VehiclePaymentCard
          key={v.id}
          vehicle={v}
          onPayment={() => onPayment(v)}
          onDetails={() => onDetails(v)}
        />
      ))}
    </div>
  );
}

function VehiclePaymentCard({ vehicle, onPayment, onDetails }) {
  const bill = parseFloat(vehicle.bill_amount) || 0;
  const previousCredit = parseFloat(vehicle.previous_credit) || 0;
  const totalOutstanding = bill + previousCredit;
  const status = vehicle.payment_status || "unpaid";

  const statusColors = {
    unpaid: { bg: "#fee2e2", color: "#991b1b", label: "Unpaid" },
    partial: { bg: "#fef3c7", color: "#92400e", label: "Partial" },
    credit: { bg: "#fce7f3", color: "#9f1239", label: "Credit" },
    paid: { bg: "#dcfce7", color: "#166534", label: "Paid" },
  };
  const sc = statusColors[status] || statusColors.unpaid;

  return (
    <div
      style={{
        padding: "24px",
        backgroundColor: "white",
        borderRadius: "12px",
        border: "2px solid #e5e7eb",
        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
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
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "12px",
              flexWrap: "wrap",
            }}
          >
            <h4
              style={{
                margin: 0,
                fontSize: "20px",
                color: "#111827",
                fontWeight: "700",
              }}
            >
              {vehicle.vehicle_number}
            </h4>
            {vehicle.model && <ModelBadge model={vehicle.model} />}
            {vehicle.priority !== "normal" && (
              <PriorityBadge priority={vehicle.priority} />
            )}
            <span
              style={{
                padding: "4px 10px",
                backgroundColor: sc.bg,
                color: sc.color,
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              {sc.label}
            </span>
            {previousCredit > 0 && (
              <span
                style={{
                  padding: "4px 10px",
                  backgroundColor: "#fef3c7",
                  color: "#92400e",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                ⚠️ Previous Credit
              </span>
            )}
          </div>

          {/* Info */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6px 24px",
              marginBottom: "16px",
            }}
          >
            <InfoRow label="Customer" value={vehicle.customer_name || "N/A"} />
            <InfoRow label="Phone" value={vehicle.customer_phone || "N/A"} />
            <InfoRow
              label="Bill Generated"
              value={formatIST(vehicle.bill_generated_at)}
            />
            <InfoRow label="Entry" value={formatIST(vehicle.entry_time)} />
          </div>

          {/* Amount: 2 boxes only */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            <AmountBox
              label="Current Bill"
              amount={bill}
              color="#f0f9ff"
              border="#bae6fd"
              text="#0c4a6e"
            />

            {/* Outstanding box — enhanced if previous credit exists */}
            <div
              style={{
                padding: "14px 16px",
                borderRadius: "10px",
                textAlign: "center",
                backgroundColor: previousCredit > 0 ? "#fff7ed" : "#fff7ed",
                border: `2px solid ${previousCredit > 0 ? "#f97316" : "#fed7aa"}`,
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  fontWeight: "600",
                  marginBottom: "4px",
                }}
              >
                Total Outstanding
              </div>
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: "800",
                  color: "#9a3412",
                }}
              >
                {formatCurrency(totalOutstanding)}
              </div>
              {previousCredit > 0 && (
                <div
                  style={{
                    marginTop: "6px",
                    fontSize: "11px",
                    color: "#b45309",
                    lineHeight: "1.4",
                  }}
                >
                  ₹{bill.toFixed(0)} current + ₹{previousCredit.toFixed(0)}{" "}
                  prev. credit
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
            gap: "10px",
            marginLeft: "24px",
          }}
        >
          <ActionButton
            label="💳 Process Payment"
            onClick={onPayment}
            primary
          />
          <ActionButton label="📄 View Details" onClick={onDetails} />
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Pipeline ───────────────────────────────────────────────────────────

function PipelineTab({ vehicles }) {
  const [showAll, setShowAll] = useState(false);

  const STAGE_LABELS = {
    billing: "🧾 Billing",
    pdi: "🔍 PDI",
    washing: "💧 Washing",
    alignment_balancing: "⚖️ Alignment",
    tyre_fitting: "🛞 Tyre",
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
    "tyre_fitting",
    "three_m",
    "electrician",
    "denter",
    "painter",
    "mechanic",
    "advisor_review",
    "front_checkup",
    "pending",
  ];

  const billingVehicles = vehicles.filter((v) => v.current_stage === "billing");
  const otherVehicles = vehicles.filter((v) => v.current_stage !== "billing");

  const displayed = showAll ? vehicles : billingVehicles;

  const grouped = {};
  displayed.forEach((v) => {
    const s = v.current_stage;
    if (!grouped[s]) grouped[s] = [];
    grouped[s].push(v);
  });
  const stages = STAGE_ORDER.filter((s) => grouped[s]?.length > 0);

  return (
    <div>
      {/* Toggle bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div style={{ fontSize: "14px", color: "#6b7280" }}>
          {showAll
            ? `Showing all ${vehicles.length} active vehicles`
            : `Showing ${billingVehicles.length} vehicles in billing${otherVehicles.length > 0 ? ` (+${otherVehicles.length} elsewhere)` : ""}`}
        </div>
        <button
          onClick={() => setShowAll((p) => !p)}
          style={{
            padding: "8px 16px",
            backgroundColor: showAll ? "#eff6ff" : "#f3f4f6",
            color: showAll ? "#2563eb" : "#374151",
            border: `1px solid ${showAll ? "#bfdbfe" : "#d1d5db"}`,
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "600",
          }}
        >
          {showAll ? "📋 Billing Only" : "🔍 Show All Stages"}
        </button>
      </div>

      {displayed.length === 0 ? (
        <EmptyState
          icon={showAll ? "🔜" : "🧾"}
          title={showAll ? "No active vehicles" : "No vehicles in billing"}
          subtitle={showAll ? "All clear!" : "Nothing heading to payment yet"}
        />
      ) : (
        <div style={{ display: "grid", gap: "16px" }}>
          {stages.map((stage) => (
            <div
              key={stage}
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "20px",
                border:
                  stage === "billing"
                    ? "2px solid #bfdbfe"
                    : "1px solid #e5e7eb",
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
                <h4
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: "700",
                    color: "#111827",
                  }}
                >
                  {STAGE_LABELS[stage] || stage}
                </h4>
                <span
                  style={{
                    backgroundColor:
                      stage === "billing" ? "#dbeafe" : "#f3f4f6",
                    color: stage === "billing" ? "#1d4ed8" : "#374151",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  {grouped[stage].length}
                </span>
                {stage === "billing" && (
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#2563eb",
                      fontWeight: "500",
                    }}
                  >
                    Next for payment
                  </span>
                )}
              </div>
              <div style={{ display: "grid", gap: "8px" }}>
                {grouped[stage].map((v) => (
                  <div
                    key={v.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 16px",
                      backgroundColor: "#f9fafb",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: "700",
                          color: "#111827",
                          fontSize: "15px",
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
                        gap: "24px",
                      }}
                    >
                      <span style={{ fontSize: "13px", color: "#6b7280" }}>
                        {v.customer_name}
                      </span>
                      {v.bill_amount && (
                        <span
                          style={{
                            fontSize: "15px",
                            fontWeight: "700",
                            color: "#0c4a6e",
                          }}
                        >
                          {formatCurrency(v.bill_amount)}
                        </span>
                      )}
                      <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                        {formatIST(v.entry_time)}
                      </span>
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

// ─── Tab: Credit Ledger ──────────────────────────────────────────────────────

function CreditLedgerTab({ vehicles, onCollect, onViewStatement }) {
  const totalCredit = vehicles.reduce((s, v) => s + v.total_credit, 0);

  if (vehicles.length === 0)
    return (
      <EmptyState
        icon="✅"
        title="No outstanding credits"
        subtitle="All credits cleared!"
      />
    );

  return (
    <div>
      {/* Summary Banner */}
      <div
        style={{
          backgroundColor: "#fff7ed",
          border: "2px solid #fed7aa",
          borderRadius: "12px",
          padding: "16px 24px",
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <span
            style={{ fontWeight: "700", color: "#92400e", fontSize: "15px" }}
          >
            📋 Total Outstanding Credit
          </span>
          <span
            style={{ marginLeft: "16px", fontSize: "13px", color: "#b45309" }}
          >
            {vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""}
          </span>
        </div>
        <span style={{ fontWeight: "800", color: "#9a3412", fontSize: "26px" }}>
          {formatCurrency(totalCredit)}
        </span>
      </div>

      <div style={{ display: "grid", gap: "16px" }}>
        {vehicles.map((group) => (
          <CreditSummaryCard
            key={group.vehicle_number}
            group={group}
            onCollect={() => onCollect(group)}
            onViewStatement={() => onViewStatement(group)}
          />
        ))}
      </div>
    </div>
  );
}

function CreditSummaryCard({ group, onCollect, onViewStatement }) {
  // Collect unique guarantors across all visits
  const guarantors = [
    ...new Set(group.visits.map((v) => v.credit_guaranteed_by).filter(Boolean)),
  ];

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "12px",
        border: "2px solid #fed7aa",
        padding: "20px 24px",
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
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "10px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{ fontSize: "19px", fontWeight: "800", color: "#111827" }}
            >
              {group.vehicle_number}
            </span>
            <span
              style={{
                padding: "3px 10px",
                backgroundColor: "#fce7f3",
                color: "#9f1239",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              {group.visits.length} visit{group.visits.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "4px 24px",
            }}
          >
            <InfoRow label="Customer" value={group.customer_name || "N/A"} />
            <InfoRow label="Phone" value={group.customer_phone || "N/A"} />
          </div>
          {guarantors.length > 0 && (
            <div
              style={{
                marginTop: "10px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  fontWeight: "600",
                }}
              >
                👤 Guaranteed by:
              </span>
              {guarantors.map((g, i) => (
                <span
                  key={i}
                  style={{
                    padding: "3px 10px",
                    backgroundColor: "#fef3c7",
                    color: "#92400e",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "700",
                    border: "1px solid #fcd34d",
                  }}
                >
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right", marginLeft: "24px" }}>
          <div
            style={{
              fontSize: "11px",
              color: "#9ca3af",
              fontWeight: "600",
              textTransform: "uppercase",
              marginBottom: "2px",
            }}
          >
            Outstanding
          </div>
          <div
            style={{ fontSize: "30px", fontWeight: "800", color: "#9a3412" }}
          >
            {formatCurrency(group.total_credit)}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
        <ActionButton label="💰 Collect Credit" onClick={onCollect} primary />
        <ActionButton label="📅 View Statement" onClick={onViewStatement} />
      </div>
    </div>
  );
}

// ─── Modal: Process Payment ──────────────────────────────────────────────────

function PaymentFormModal({ vehicle, onClose, onSuccess }) {
  const [paymentType, setPaymentType] = useState("full");
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

  const bill = parseFloat(vehicle.bill_amount) || 0;
  const alreadyPaid = parseFloat(vehicle.total_paid) || 0;
  const previousCredit = parseFloat(vehicle.previous_credit) || 0;
  const discountAmount = Math.min(parseFloat(discount) || 0, bill);
  const currentOutstanding = bill - alreadyPaid - discountAmount;
  const totalOutstanding = currentOutstanding + previousCredit;

  const addLine = () =>
    setPartialLines((prev) => [
      ...prev,
      { method: "cash", amount: "", txnId: "" },
    ]);
  const removeLine = (i) =>
    setPartialLines((prev) => prev.filter((_, idx) => idx !== i));
  const updateLine = (i, field, val) =>
    setPartialLines((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, [field]: val } : l)),
    );

  const partialTotal = partialLines.reduce(
    (s, l) => s + (parseFloat(l.amount) || 0),
    0,
  );
  const partialCredit = partialLines
    .filter((l) => l.method === "credit")
    .reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);

  // Does this payment involve any credit?
  const hasAnyCredit =
    (paymentType === "full" && fullMethod === "credit") ||
    (paymentType === "partial" && partialCredit > 0);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    const currentUser = getCurrentUser();

    try {
      // ── Validation ──
      if (paymentType === "full") {
        if (METHOD_NEEDS_TXN.includes(fullMethod) && !fullTxnId.trim()) {
          setError("Transaction ID required for " + fullMethod);
          setLoading(false);
          return;
        }
      } else {
        if (partialLines.length === 0) {
          setError("Add at least one payment line");
          setLoading(false);
          return;
        }
        for (const l of partialLines) {
          if (!l.amount || parseFloat(l.amount) <= 0) {
            setError("All amounts must be > 0");
            setLoading(false);
            return;
          }
          if (METHOD_NEEDS_TXN.includes(l.method) && !l.txnId.trim()) {
            setError(`Transaction ID required for ${l.method}`);
            setLoading(false);
            return;
          }
        }
        if (Math.abs(partialTotal - totalOutstanding) > 0.01) {
          setError(
            `Partial amounts must sum to ${formatCurrency(totalOutstanding)} (outstanding). Got ${formatCurrency(partialTotal)}`,
          );
          setLoading(false);
          return;
        }
      }

      // Guarantor required if any credit involved
      if (hasAnyCredit && !guaranteedBy.trim()) {
        setError("Employee guarantee is required when giving credit");
        setLoading(false);
        return;
      }

      // ── Build payment rows ──
      let paymentRows = [];
      let newCreditAmount = 0;
      let collectedAmount = 0;

      if (paymentType === "full") {
        if (fullMethod === "credit") {
          paymentRows.push({
            vehicle_id: vehicle.id,
            amount: totalOutstanding,
            payment_method: "credit",
            transaction_id: null,
            collected_by: currentUser?.id,
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
            collected_by: currentUser?.id,
            notes,
          });
          collectedAmount = alreadyPaid + totalOutstanding;
          newCreditAmount = 0;
        }
      } else {
        for (const l of partialLines) {
          paymentRows.push({
            vehicle_id: vehicle.id,
            amount: parseFloat(l.amount),
            payment_method: l.method,
            transaction_id: l.txnId || null,
            collected_by: currentUser?.id,
            notes: notes || null,
          });
        }
        collectedAmount = alreadyPaid + (partialTotal - partialCredit);
        newCreditAmount =
          (parseFloat(vehicle.credit_amount) || 0) + partialCredit;
      }

      // ── Determine new payment_status ──
      const totalNowPaid = collectedAmount;
      const hasCredit = newCreditAmount > 0;
      let paymentStatus = "paid";
      if (hasCredit && totalNowPaid > 0) paymentStatus = "partial";
      else if (hasCredit && totalNowPaid === 0) paymentStatus = "credit";
      else if (totalNowPaid >= bill) paymentStatus = "paid";

      // ── Insert payments ──
      const { error: payErr } = await supabase
        .from("payments")
        .insert(paymentRows);
      if (payErr) throw payErr;

      // ── Update vehicle ──
      // Only move to ready_for_exit if vehicle is already in payment stage
      // If bill was generated before PDI, vehicle may still be in an earlier stage
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
          total_paid: totalNowPaid,
          credit_amount: newCreditAmount,
          credit_guaranteed_by: hasAnyCredit ? guaranteedBy.trim() : null,
          discount_amount: discountAmount > 0 ? discountAmount : null,
          payment_received_at: new Date().toISOString(),
          payment_received_by: currentUser?.id,
        })
        .eq("id", vehicle.id);
      if (vErr) throw vErr;

      // ── History ──
      const summary =
        paymentType === "full"
          ? `Payment: ${formatCurrency(totalOutstanding)} via ${fullMethod}${discountAmount > 0 ? ` | Discount: ${formatCurrency(discountAmount)}` : ""}${hasAnyCredit ? ` | Guaranteed by: ${guaranteedBy}` : ""}`
          : partialLines
              .map((l) => `${formatCurrency(l.amount)} via ${l.method}`)
              .join(", ") +
            (discountAmount > 0
              ? ` | Discount: ${formatCurrency(discountAmount)}`
              : "") +
            (hasAnyCredit ? ` | Guaranteed by: ${guaranteedBy}` : "");
      await supabase.from("vehicle_history").insert([
        {
          vehicle_id: vehicle.id,
          user_id: currentUser?.id || null,
          stage: "payment",
          action: "payment_received",
          new_value: summary,
          notes: notes || null,
        },
      ]);

      alert(
        `Payment processed! Vehicle moved to Ready for Exit.${hasCredit ? `\nCredit pending: ${formatCurrency(newCreditAmount)}` : ""}`,
      );
      onSuccess();
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to process payment");
      setLoading(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ width: "100%", maxWidth: "580px" }}>
        <ModalHeader
          title="💳 Process Payment"
          subtitle={`${vehicle.vehicle_number} • ${vehicle.customer_name}`}
          onClose={onClose}
        />

        {/* Bill Summary */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            marginBottom: previousCredit > 0 ? "12px" : "24px",
          }}
        >
          <AmountBox
            label="Current Bill"
            amount={bill}
            color="#f0f9ff"
            border="#bae6fd"
            text="#0c4a6e"
          />
          <AmountBox
            label="Total Outstanding"
            amount={totalOutstanding}
            color="#fff7ed"
            border={previousCredit > 0 ? "#f97316" : "#fed7aa"}
            text="#9a3412"
          />
        </div>

        {/* Previous credit warning */}
        {previousCredit > 0 && (
          <div
            style={{
              padding: "10px 14px",
              backgroundColor: "#fef3c7",
              border: "1px solid #fcd34d",
              borderRadius: "8px",
              marginBottom: "20px",
              fontSize: "13px",
              color: "#92400e",
            }}
          >
            ⚠️ Includes <strong>{formatCurrency(previousCredit)}</strong> from
            previous visit(s). Current bill:{" "}
            <strong>{formatCurrency(bill)}</strong>
          </div>
        )}

        {/* Discount */}
        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>Discount (Optional)</label>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 18,
                color: "#9ca3af",
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
                padding: "11px 11px 11px 36px",
                border: "2px solid #e5e7eb",
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 700,
                color: "#111827",
                background: "#fff",
                outline: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#10b981")}
              onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
            />
          </div>
          {discountAmount > 0 && (
            <div
              style={{
                marginTop: 6,
                padding: "6px 12px",
                background: "#f0fdf4",
                borderRadius: 6,
                border: "1px solid #86efac",
                fontSize: 13,
                color: "#166534",
                fontWeight: 600,
              }}
            >
              ✅ Discount of ₹{discountAmount.toFixed(0)} applied — new
              outstanding: {formatCurrency(totalOutstanding)}
            </div>
          )}
        </div>

        {/* Full / Partial Toggle */}
        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>Payment Type</label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            {[
              {
                v: "full",
                label: "✅ Full Payment",
                sub: `Pay full ${formatCurrency(totalOutstanding)}`,
              },
              {
                v: "partial",
                label: "⚡ Partial / Split",
                sub: "Split across methods",
              },
            ].map((opt) => (
              <label
                key={opt.v}
                style={{
                  ...optionCard,
                  ...(paymentType === opt.v ? optionCardActive : {}),
                }}
              >
                <input
                  type="radio"
                  name="payType"
                  value={opt.v}
                  checked={paymentType === opt.v}
                  onChange={(e) => setPaymentType(e.target.value)}
                  style={{ marginRight: "10px" }}
                />
                <div>
                  <div
                    style={{
                      fontWeight: "700",
                      fontSize: "14px",
                      color: "#111827",
                    }}
                  >
                    {opt.label}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>
                    {opt.sub}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Full Payment */}
        {paymentType === "full" && (
          <>
            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Payment Method</label>
              <div style={{ display: "grid", gap: "8px" }}>
                {PAYMENT_METHODS.map((m) => (
                  <label
                    key={m.value}
                    style={{
                      ...optionCard,
                      ...(fullMethod === m.value ? optionCardActive : {}),
                      flexDirection: "row",
                      alignItems: "center",
                      padding: "12px 16px",
                    }}
                  >
                    <input
                      type="radio"
                      name="fullMethod"
                      value={m.value}
                      checked={fullMethod === m.value}
                      onChange={(e) => setFullMethod(e.target.value)}
                      style={{ marginRight: "10px" }}
                    />
                    <span style={{ fontSize: "20px", marginRight: "10px" }}>
                      {m.icon}
                    </span>
                    <span style={{ fontWeight: "600", color: "#111827" }}>
                      {m.label}
                    </span>
                    {m.value === "credit" && (
                      <span
                        style={{
                          marginLeft: "auto",
                          fontSize: "12px",
                          color: "#9f1239",
                          backgroundColor: "#fce7f3",
                          padding: "2px 8px",
                          borderRadius: "4px",
                        }}
                      >
                        Vehicle exits, owes money
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
            {METHOD_NEEDS_TXN.includes(fullMethod) && (
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Transaction ID *</label>
                <StyledInput
                  value={fullTxnId}
                  onChange={(e) => setFullTxnId(e.target.value)}
                  placeholder="Enter transaction / reference ID"
                />
              </div>
            )}
          </>
        )}

        {/* Partial Payment */}
        {paymentType === "partial" && (
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                Split Payment Lines
              </label>
              <button
                onClick={addLine}
                style={{
                  padding: "6px 14px",
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                  border: "1px solid #bfdbfe",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "600",
                }}
              >
                + Add Line
              </button>
            </div>

            {partialLines.map((line, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 120px auto",
                  gap: "10px",
                  alignItems: "flex-start",
                  marginBottom: "10px",
                  padding: "14px",
                  backgroundColor: "#f9fafb",
                  borderRadius: "10px",
                  border: "1px solid #e5e7eb",
                }}
              >
                <div>
                  <select
                    value={line.method}
                    onChange={(e) => updateLine(i, "method", e.target.value)}
                    style={selectStyle}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.icon} {m.label}
                      </option>
                    ))}
                  </select>
                  {METHOD_NEEDS_TXN.includes(line.method) && (
                    <StyledInput
                      style={{ marginTop: "6px" }}
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
                      backgroundColor: "#fee2e2",
                      color: "#dc2626",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "16px",
                      marginTop: "2px",
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            {/* Running Total */}
            <div
              style={{
                padding: "12px 16px",
                backgroundColor:
                  partialLines.length > 0 &&
                  Math.abs(partialTotal - totalOutstanding) < 0.01
                    ? "#f0fdf4"
                    : "#fff7ed",
                borderRadius: "8px",
                border: `1px solid ${Math.abs(partialTotal - totalOutstanding) < 0.01 ? "#86efac" : "#fed7aa"}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "14px",
                }}
              >
                <span style={{ color: "#374151" }}>Sum of lines:</span>
                <span style={{ fontWeight: "700", color: "#111827" }}>
                  {formatCurrency(partialTotal)}
                </span>
              </div>
              {partialCredit > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "13px",
                    marginTop: "4px",
                  }}
                >
                  <span style={{ color: "#9f1239" }}>
                    Credit portion (pending):
                  </span>
                  <span style={{ fontWeight: "700", color: "#9f1239" }}>
                    {formatCurrency(partialCredit)}
                  </span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "13px",
                  marginTop: "4px",
                }}
              >
                <span style={{ color: "#6b7280" }}>
                  Must equal outstanding:
                </span>
                <span style={{ fontWeight: "600", color: "#6b7280" }}>
                  {formatCurrency(totalOutstanding)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Guarantor — required when credit is involved */}
        {hasAnyCredit && (
          <div
            style={{
              marginBottom: "20px",
              padding: "16px 20px",
              backgroundColor: "#fef3c7",
              borderRadius: "12px",
              border: "2px solid #fcd34d",
            }}
          >
            <label
              style={{ ...labelStyle, color: "#92400e", marginBottom: "8px" }}
            >
              👤 Employee Guarantee <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <p
              style={{
                margin: "0 0 10px 0",
                fontSize: "12px",
                color: "#b45309",
              }}
            >
              Credit cannot be issued without an employee taking responsibility.
              This name will be recorded.
            </p>
            <StyledInput
              value={guaranteedBy}
              onChange={(e) => setGuaranteedBy(e.target.value)}
              placeholder="Full name of guaranteeing employee..."
              style={{
                color: "#111827",
                backgroundColor: "white",
                border: "2px solid #fcd34d",
              }}
            />
          </div>
        )}

        {/* Notes */}
        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>Notes (Optional)</label>
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
              backgroundColor: "#fee2e2",
              color: "#991b1b",
              padding: "10px 14px",
              borderRadius: "8px",
              marginBottom: "14px",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%",
            padding: "16px",
            background: loading
              ? "#9ca3af"
              : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: "white",
            border: "none",
            borderRadius: "10px",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "16px",
            fontWeight: "700",
            boxShadow: "0 4px 12px rgba(16,185,129,0.3)",
          }}
        >
          {loading
            ? "Processing..."
            : `✓ Confirm Payment • ${formatCurrency(totalOutstanding)}`}
        </button>
      </div>
    </Overlay>
  );
}

// ─── Modal: Collect Credit (group-based) ────────────────────────────────────

function CreditCollectionModal({ group, onClose, onSuccess }) {
  const creditPending = group.total_credit;
  const [collectType, setCollectType] = useState("full");
  const [method, setMethod] = useState("cash");
  const [amount, setAmount] = useState(creditPending.toFixed(2));
  const [txnId, setTxnId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCollect = async () => {
    setError("");
    const collectAmount = parseFloat(amount) || 0;
    if (collectAmount <= 0) {
      setError("Amount must be > 0");
      return;
    }
    if (collectAmount > creditPending + 0.01) {
      setError(
        `Cannot collect more than outstanding ${formatCurrency(creditPending)}`,
      );
      return;
    }
    if (METHOD_NEEDS_TXN.includes(method) && !txnId.trim()) {
      setError("Transaction ID required");
      return;
    }

    setLoading(true);
    const currentUser = getCurrentUser();

    try {
      // Deduct from visits oldest-first
      let remaining = collectAmount;
      const updates = [];
      const sortedVisits = [...group.visits].sort(
        (a, b) => new Date(a.entry_time) - new Date(b.entry_time),
      );

      for (const visit of sortedVisits) {
        if (remaining <= 0) break;
        const visitCredit = parseFloat(visit.credit_amount) || 0;
        if (visitCredit <= 0) continue;
        const deduct = Math.min(remaining, visitCredit);
        const newCredit = visitCredit - deduct;
        const newTotalPaid = (parseFloat(visit.total_paid) || 0) + deduct;
        const newStatus = newCredit <= 0 ? "paid" : "partial";
        updates.push({
          id: visit.id,
          credit_amount: newCredit,
          total_paid: newTotalPaid,
          payment_status: newStatus,
        });
        remaining -= deduct;
      }

      // Insert payment row (linked to first visit for record-keeping)
      const { error: pErr } = await supabase.from("payments").insert([
        {
          vehicle_id: sortedVisits[0].id,
          amount: collectAmount,
          payment_method: method,
          transaction_id: txnId || null,
          collected_by: currentUser?.id,
          notes: notes || null,
        },
      ]);
      if (pErr) throw pErr;

      // Apply updates to vehicles
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

      // History on first visit
      await supabase.from("vehicle_history").insert([
        {
          vehicle_id: sortedVisits[0].id,
          user_id: currentUser?.id || null,
          stage: "payment",
          action: "credit_collected",
          new_value: `Credit collected: ${formatCurrency(collectAmount)} via ${method}. Remaining: ${formatCurrency(Math.max(0, creditPending - collectAmount))}`,
          notes: notes || null,
        },
      ]);

      alert(
        `✅ Credit collected: ${formatCurrency(collectAmount)}. Remaining: ${formatCurrency(Math.max(0, creditPending - collectAmount))}`,
      );
      onSuccess();
    } catch (e) {
      setError(e.message || "Failed to collect credit");
      setLoading(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ width: "100%", maxWidth: "480px" }}>
        <ModalHeader
          title="💰 Collect Credit"
          subtitle={`${group.vehicle_number} • ${group.customer_name}`}
          onClose={onClose}
        />

        <div style={{ marginBottom: "20px" }}>
          <AmountBox
            label="Credit Outstanding"
            amount={creditPending}
            color="#fff7ed"
            border="#fed7aa"
            text="#9a3412"
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Collection Type</label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            {[
              {
                v: "full",
                label: "✅ Full Credit",
                sub: formatCurrency(creditPending),
              },
              { v: "partial", label: "⚡ Partial", sub: "Collect part now" },
            ].map((opt) => (
              <label
                key={opt.v}
                style={{
                  ...optionCard,
                  ...(collectType === opt.v ? optionCardActive : {}),
                }}
              >
                <input
                  type="radio"
                  name="collectType"
                  value={opt.v}
                  checked={collectType === opt.v}
                  onChange={(e) => {
                    setCollectType(e.target.value);
                    if (e.target.value === "full")
                      setAmount(creditPending.toFixed(2));
                  }}
                  style={{ marginRight: "8px" }}
                />
                <div>
                  <div style={{ fontWeight: "700", fontSize: "14px" }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>
                    {opt.sub}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {collectType === "partial" && (
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Amount to Collect</label>
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

        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Payment Method</label>
          <div style={{ display: "grid", gap: "8px" }}>
            {PAYMENT_METHODS.filter((m) => m.value !== "credit").map((m) => (
              <label
                key={m.value}
                style={{
                  ...optionCard,
                  ...(method === m.value ? optionCardActive : {}),
                  flexDirection: "row",
                  alignItems: "center",
                  padding: "10px 14px",
                }}
              >
                <input
                  type="radio"
                  name="creditMethod"
                  value={m.value}
                  checked={method === m.value}
                  onChange={(e) => setMethod(e.target.value)}
                  style={{ marginRight: "10px" }}
                />
                <span style={{ fontSize: "18px", marginRight: "8px" }}>
                  {m.icon}
                </span>
                <span style={{ fontWeight: "600", color: "#111827" }}>
                  {m.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {METHOD_NEEDS_TXN.includes(method) && (
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Transaction ID *</label>
            <StyledInput
              value={txnId}
              onChange={(e) => setTxnId(e.target.value)}
              placeholder="Transaction / reference ID"
            />
          </div>
        )}

        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>Notes (Optional)</label>
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
              backgroundColor: "#fee2e2",
              color: "#991b1b",
              padding: "10px 14px",
              borderRadius: "8px",
              marginBottom: "14px",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={handleCollect}
          disabled={loading}
          style={{
            width: "100%",
            padding: "16px",
            background: loading
              ? "#9ca3af"
              : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
            color: "white",
            border: "none",
            borderRadius: "10px",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "16px",
            fontWeight: "700",
          }}
        >
          {loading
            ? "Processing..."
            : `✓ Collect ${formatCurrency(parseFloat(amount) || 0)}`}
        </button>
      </div>
    </Overlay>
  );
}

// ─── Modal: Credit Statement (date-wise) ─────────────────────────────────────

function CreditStatementModal({ group, onClose }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatement();
  }, []);

  const loadStatement = async () => {
    const vehicleIds = group.visits.map((v) => v.id);

    const { data: payments } = await supabase
      .from("payments")
      .select("*, collector:users!payments_collected_by_fkey(full_name)")
      .in("vehicle_id", vehicleIds)
      .order("created_at", { ascending: true });

    const statement = [];

    // Each visit = a bill entry
    group.visits.forEach((v) => {
      statement.push({
        type: "bill",
        date: v.entry_time,
        amount: parseFloat(v.bill_amount) || 0,
        label: `Bill`,
        sub: null,
        id: `bill-${v.id}`,
      });
    });

    // Each payment row
    (payments || []).forEach((p) => {
      const methodLabel =
        p.payment_method === "bank_transfer"
          ? "Bank Transfer"
          : p.payment_method.charAt(0).toUpperCase() +
            p.payment_method.slice(1);
      statement.push({
        type: p.payment_method === "credit" ? "credit_given" : "payment",
        date: p.created_at,
        amount: parseFloat(p.amount) || 0,
        method: p.payment_method,
        label:
          p.payment_method === "credit"
            ? `Credit Given`
            : `Payment — ${methodLabel}`,
        sub: p.transaction_id ? `TXN: ${p.transaction_id}` : null,
        collector: p.collector?.full_name,
        notes: p.notes,
        id: p.id,
      });
    });

    // Sort by date
    statement.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Running balance
    let balance = 0;
    statement.forEach((e) => {
      if (e.type === "bill" || e.type === "credit_given") balance += e.amount;
      else balance -= e.amount;
      e.runningBalance = balance;
    });

    setEntries(statement);
    setLoading(false);
  };

  const totalBilled = group.visits.reduce(
    (s, v) => s + (parseFloat(v.bill_amount) || 0),
    0,
  );
  const totalCollected = group.visits.reduce(
    (s, v) => s + (parseFloat(v.total_paid) || 0),
    0,
  );

  return (
    <Overlay onClose={onClose}>
      <div style={{ width: "100%", maxWidth: "620px" }}>
        <ModalHeader
          title={`📅 ${group.vehicle_number} — Statement`}
          subtitle={`${group.customer_name} • ${group.customer_phone}`}
          onClose={onClose}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <AmountBox
            label="Total Billed"
            amount={totalBilled}
            color="#f0f9ff"
            border="#bae6fd"
            text="#0c4a6e"
          />
          <AmountBox
            label="Total Collected"
            amount={totalCollected}
            color="#f0fdf4"
            border="#86efac"
            text="#166534"
          />
          <AmountBox
            label="Outstanding"
            amount={group.total_credit}
            color="#fff7ed"
            border="#fed7aa"
            text="#9a3412"
          />
        </div>

        {/* Guarantors */}
        {(() => {
          const guarantors = [
            ...new Set(
              group.visits.map((v) => v.credit_guaranteed_by).filter(Boolean),
            ),
          ];
          return guarantors.length > 0 ? (
            <div
              style={{
                padding: "12px 16px",
                backgroundColor: "#fef3c7",
                borderRadius: "8px",
                border: "1px solid #fcd34d",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#92400e",
                }}
              >
                👤 Guaranteed by:
              </span>
              {guarantors.map((g, i) => (
                <span
                  key={i}
                  style={{
                    padding: "3px 12px",
                    backgroundColor: "white",
                    color: "#92400e",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "700",
                    border: "1px solid #fcd34d",
                  }}
                >
                  {g}
                </span>
              ))}
            </div>
          ) : null;
        })()}

        {loading ? (
          <p
            style={{ color: "#9ca3af", textAlign: "center", padding: "40px 0" }}
          >
            Loading...
          </p>
        ) : (
          <div>
            <h4
              style={{
                margin: "0 0 14px 0",
                fontSize: "14px",
                fontWeight: "700",
                color: "#374151",
              }}
            >
              Transaction History ({entries.length} entries)
            </h4>

            <div style={{ position: "relative", paddingLeft: "20px" }}>
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

              {entries.map((entry, idx) => {
                const isBill = entry.type === "bill";
                const isCreditGiven = entry.type === "credit_given";
                const dotColor = isBill
                  ? "#ef4444"
                  : isCreditGiven
                    ? "#f59e0b"
                    : "#10b981";
                const rowBg = isBill
                  ? "#fef2f2"
                  : isCreditGiven
                    ? "#fff7ed"
                    : "#f0fdf4";
                const rowBorder = isBill
                  ? "#fecaca"
                  : isCreditGiven
                    ? "#fed7aa"
                    : "#bbf7d0";

                return (
                  <div
                    key={entry.id}
                    style={{
                      position: "relative",
                      marginBottom: idx < entries.length - 1 ? "12px" : 0,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: "-16px",
                        top: "14px",
                        width: "12px",
                        height: "12px",
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
                        borderRadius: "10px",
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
                              fontSize: "14px",
                              fontWeight: "700",
                              color: "#111827",
                            }}
                          >
                            {entry.label}
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#6b7280",
                              marginTop: "3px",
                            }}
                          >
                            📅 {formatIST(entry.date)}
                          </div>
                          {entry.sub && (
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#9ca3af",
                                marginTop: "2px",
                              }}
                            >
                              {entry.sub}
                            </div>
                          )}
                          {entry.collector && (
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#6b7280",
                                marginTop: "2px",
                              }}
                            >
                              👤 {entry.collector}
                            </div>
                          )}
                          {entry.notes && (
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#9ca3af",
                                fontStyle: "italic",
                                marginTop: "2px",
                              }}
                            >
                              📝 {entry.notes}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: "right", marginLeft: "16px" }}>
                          <div
                            style={{
                              fontSize: "17px",
                              fontWeight: "800",
                              color:
                                entry.type === "payment"
                                  ? "#166534"
                                  : "#9a3412",
                            }}
                          >
                            {entry.type === "payment" ? "−" : "+"}
                            {formatCurrency(entry.amount)}
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#9ca3af",
                              marginTop: "3px",
                            }}
                          >
                            Balance:{" "}
                            <span
                              style={{
                                fontWeight: "700",
                                color:
                                  entry.runningBalance > 0.01
                                    ? "#9a3412"
                                    : "#166534",
                              }}
                            >
                              {formatCurrency(entry.runningBalance)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Final Balance */}
            <div
              style={{
                marginTop: "20px",
                padding: "16px 20px",
                backgroundColor:
                  group.total_credit > 0.01 ? "#fff7ed" : "#f0fdf4",
                borderRadius: "10px",
                border: `2px solid ${group.total_credit > 0.01 ? "#fed7aa" : "#86efac"}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontWeight: "700",
                  fontSize: "15px",
                  color: "#374151",
                }}
              >
                {group.total_credit > 0.01
                  ? "⚠️ Outstanding Balance"
                  : "✅ Fully Cleared"}
              </span>
              <span
                style={{
                  fontWeight: "800",
                  fontSize: "22px",
                  color: group.total_credit > 0.01 ? "#9a3412" : "#166534",
                }}
              >
                {formatCurrency(group.total_credit)}
              </span>
            </div>
          </div>
        )}
      </div>
    </Overlay>
  );
}

// ─── Modal: Vehicle Details ──────────────────────────────────────────────────

function VehicleDetailsModal({ vehicle, onClose, onPayment }) {
  const [history, setHistory] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: hist }, { data: pays }] = await Promise.all([
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
      ]);
      setHistory(hist || []);
      setPayments(pays || []);
      setLoading(false);
    };
    load();
  }, [vehicle.id]);

  const bill = parseFloat(vehicle.bill_amount) || 0;
  const paid = parseFloat(vehicle.total_paid) || 0;
  const credit = parseFloat(vehicle.credit_amount) || 0;

  return (
    <Overlay onClose={onClose}>
      <div style={{ width: "100%", maxWidth: "800px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "24px",
                color: "#111827",
                fontWeight: "700",
              }}
            >
              🚗 {vehicle.vehicle_number}
            </h3>
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: "14px",
                color: "#6b7280",
              }}
            >
              {vehicle.customer_name} • {vehicle.customer_phone}
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <ActionButton
              label="💳 Process Payment"
              onClick={onPayment}
              primary
            />
            <ActionButton label="Close" onClick={onClose} />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          <AmountBox
            label="Total Bill"
            amount={bill}
            color="#f0f9ff"
            border="#bae6fd"
            text="#0c4a6e"
          />
          <AmountBox
            label="Total Paid"
            amount={paid}
            color="#f0fdf4"
            border="#86efac"
            text="#166534"
          />
          <AmountBox
            label="Credit Pending"
            amount={credit}
            color="#fff7ed"
            border="#fed7aa"
            text="#9a3412"
          />
        </div>

        {loading ? (
          <p style={{ color: "#9ca3af" }}>Loading...</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "24px",
            }}
          >
            {/* Payments */}
            <div>
              <h4
                style={{
                  margin: "0 0 12px 0",
                  fontSize: "15px",
                  fontWeight: "700",
                  color: "#111827",
                }}
              >
                💰 Payments ({payments.length})
              </h4>
              {payments.length === 0 ? (
                <p style={{ color: "#9ca3af", fontSize: "14px" }}>
                  No payments yet
                </p>
              ) : (
                <div style={{ display: "grid", gap: "8px" }}>
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        padding: "10px 14px",
                        backgroundColor: "#f9fafb",
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: "600",
                            fontSize: "13px",
                            color: "#111827",
                          }}
                        >
                          {
                            PAYMENT_METHODS.find(
                              (m) => m.value === p.payment_method,
                            )?.icon
                          }{" "}
                          {p.payment_method === "bank_transfer"
                            ? "Bank Transfer"
                            : p.payment_method}
                        </span>
                        <span
                          style={{
                            fontWeight: "700",
                            fontSize: "14px",
                            color:
                              p.payment_method === "credit"
                                ? "#9a3412"
                                : "#166534",
                          }}
                        >
                          {formatCurrency(p.amount)}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#6b7280",
                          marginTop: "4px",
                        }}
                      >
                        {formatIST(p.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* History */}
            <div>
              <h4
                style={{
                  margin: "0 0 12px 0",
                  fontSize: "15px",
                  fontWeight: "700",
                  color: "#111827",
                }}
              >
                🕐 Timeline
              </h4>
              <div
                style={{
                  maxHeight: "320px",
                  overflowY: "auto",
                  display: "grid",
                  gap: "8px",
                }}
              >
                {history.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: "10px 14px",
                      backgroundColor: "#f9fafb",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#111827",
                        textTransform: "capitalize",
                      }}
                    >
                      {item.stage.replace(/_/g, " ")} —{" "}
                      {item.action.replace(/_/g, " ")}
                    </div>
                    {item.user && (
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>
                        👤 {item.user.full_name}
                      </div>
                    )}
                    {item.new_value && (
                      <div
                        style={{
                          fontSize: "13px",
                          color: "#374151",
                          marginTop: "4px",
                        }}
                      >
                        {item.new_value}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#9ca3af",
                        marginTop: "4px",
                      }}
                    >
                      {formatIST(item.created_at)}
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

// ─── Shared Small Components ─────────────────────────────────────────────────

function Overlay({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "white",
          padding: "32px",
          borderRadius: "16px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, subtitle, onClose }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: "24px",
      }}
    >
      <div>
        <h3
          style={{
            margin: 0,
            fontSize: "22px",
            color: "#111827",
            fontWeight: "700",
          }}
        >
          {title}
        </h3>
        {subtitle && (
          <p
            style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#6b7280" }}
          >
            {subtitle}
          </p>
        )}
      </div>
      <button
        onClick={onClose}
        style={{
          backgroundColor: "#fee2e2",
          color: "#dc2626",
          padding: "8px 14px",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: "600",
        }}
      >
        ✕
      </button>
    </div>
  );
}

function AmountBox({ label, amount, color, border, text }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        backgroundColor: color,
        borderRadius: "10px",
        border: `2px solid ${border}`,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          color: "#6b7280",
          fontWeight: "600",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "22px", fontWeight: "800", color: text }}>
        {formatCurrency(amount)}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", gap: "8px", fontSize: "13px" }}>
      <span style={{ color: "#9ca3af", minWidth: "90px" }}>{label}:</span>
      <span style={{ color: "#111827", fontWeight: "500" }}>{value}</span>
    </div>
  );
}

function ModelBadge({ model, small }) {
  return (
    <span
      style={{
        backgroundColor: "#ede9fe",
        color: "#5b21b6",
        padding: small ? "2px 8px" : "4px 10px",
        borderRadius: "6px",
        fontSize: small ? "11px" : "12px",
        fontWeight: "600",
      }}
    >
      {model}
    </span>
  );
}

function PriorityBadge({ priority, small }) {
  const isVip = priority === "vip";
  return (
    <span
      style={{
        padding: small ? "2px 8px" : "4px 10px",
        backgroundColor: isVip ? "#fce7f3" : "#fee2e2",
        color: isVip ? "#9f1239" : "#991b1b",
        borderRadius: "6px",
        fontSize: small ? "11px" : "12px",
        fontWeight: "600",
        textTransform: "uppercase",
      }}
    >
      {priority}
    </span>
  );
}

function ActionButton({ label, onClick, primary }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 20px",
        border: primary ? "none" : "1px solid #d1d5db",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "600",
        background: primary
          ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
          : "#f3f4f6",
        color: primary ? "white" : "#374151",
        boxShadow: primary ? "0 4px 12px rgba(16,185,129,0.3)" : "none",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "80px 0",
        color: "#6b7280",
        backgroundColor: "white",
        borderRadius: "16px",
        border: "1px solid #e5e7eb",
      }}
    >
      <div style={{ fontSize: "52px", marginBottom: "16px" }}>{icon}</div>
      <p
        style={{
          fontSize: "18px",
          margin: 0,
          color: "#374151",
          fontWeight: "600",
        }}
      >
        {title}
      </p>
      <p style={{ fontSize: "14px", margin: "8px 0 0 0" }}>{subtitle}</p>
    </div>
  );
}

function StyledInput({ as, style, ...props }) {
  const base = {
    width: "100%",
    padding: "10px 12px",
    border: "2px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "14px",
    boxSizing: "border-box",
    fontFamily: "inherit",
    outline: "none",
    color: "#111827",
    backgroundColor: "white",
    ...style,
  };
  if (as === "textarea")
    return <textarea style={{ ...base, resize: "vertical" }} {...props} />;
  return <input style={base} {...props} />;
}

const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: "600",
  color: "#374151",
  marginBottom: "8px",
};
const optionCard = {
  display: "flex",
  alignItems: "center",
  padding: "14px",
  backgroundColor: "#f9fafb",
  border: "2px solid #e5e7eb",
  borderRadius: "10px",
  cursor: "pointer",
  color: "#111827",
};
const optionCardActive = {
  backgroundColor: "#eff6ff",
  borderColor: "#667eea",
  color: "#111827",
};
const selectStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "2px solid #e5e7eb",
  borderRadius: "8px",
  fontSize: "14px",
  boxSizing: "border-box",
  backgroundColor: "white",
  color: "#111827",
  cursor: "pointer",
};

// ─── Tab: Collections Report ─────────────────────────────────────────────────

function CollectionsReportTab({ payments }) {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");

  // Filter logic
  const filtered = payments.filter((p) => {
    // Exclude credit-given rows from collection totals (they're debts, not collections)
    // But DO show them in the list so cashier has full picture — just mark them differently

    const matchSearch =
      !search.trim() ||
      p.vehicle?.vehicle_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.vehicle?.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.vehicle?.customer_phone?.includes(search) ||
      p.transaction_id?.toLowerCase().includes(search.toLowerCase());

    const pDate = new Date(p.created_at);
    const matchFrom = !dateFrom || pDate >= new Date(dateFrom + "T00:00:00");
    const matchTo = !dateTo || pDate <= new Date(dateTo + "T23:59:59");
    const matchMethod =
      methodFilter === "all" || p.payment_method === methodFilter;

    return matchSearch && matchFrom && matchTo && matchMethod;
  });

  // Summary — only real collections (not credit-given)
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

  // Method breakdown
  const byMethod = {};
  PAYMENT_METHODS.filter((m) => m.value !== "credit").forEach((m) => {
    byMethod[m.value] = realCollections
      .filter((p) => p.payment_method === m.value)
      .reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  });

  const hasFilters = search || dateFrom || dateTo || methodFilter !== "all";

  return (
    <div>
      {/* Filter Bar */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "20px 24px",
          marginBottom: "20px",
          border: "1px solid #e5e7eb",
          display: "grid",
          gridTemplateColumns: "1fr 160px 160px 180px auto",
          gap: "12px",
          alignItems: "flex-end",
        }}
      >
        <div>
          <label style={{ ...labelStyle, marginBottom: "6px" }}>
            🔍 Search
          </label>
          <StyledInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Vehicle no., customer, TXN ID..."
          />
        </div>
        <div>
          <label style={{ ...labelStyle, marginBottom: "6px" }}>From</label>
          <StyledInput
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <label style={{ ...labelStyle, marginBottom: "6px" }}>To</label>
          <StyledInput
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <div>
          <label style={{ ...labelStyle, marginBottom: "6px" }}>Method</label>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="all">All Methods</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.icon} {m.label}
              </option>
            ))}
          </select>
        </div>
        {hasFilters && (
          <button
            onClick={() => {
              setSearch("");
              setDateFrom("");
              setDateTo("");
              setMethodFilter("all");
            }}
            style={{
              padding: "10px 16px",
              backgroundColor: "#fee2e2",
              color: "#dc2626",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600",
              whiteSpace: "nowrap",
            }}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "20px",
            border: "2px solid #86efac",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#6b7280",
              fontWeight: "600",
              marginBottom: "6px",
              textTransform: "uppercase",
            }}
          >
            Total Collected {hasFilters ? "(filtered)" : ""}
          </div>
          <div
            style={{ fontSize: "28px", fontWeight: "800", color: "#166534" }}
          >
            {formatCurrency(totalCollected)}
          </div>
          <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
            {realCollections.length} transactions
          </div>
        </div>
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "20px",
            border: "2px solid #fed7aa",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#6b7280",
              fontWeight: "600",
              marginBottom: "6px",
              textTransform: "uppercase",
            }}
          >
            Credit Given
          </div>
          <div
            style={{ fontSize: "28px", fontWeight: "800", color: "#9a3412" }}
          >
            {formatCurrency(totalCreditGiven)}
          </div>
          <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
            {creditGiven.length} transactions
          </div>
        </div>
        {/* Method Breakdown */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "16px 20px",
            border: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#6b7280",
              fontWeight: "600",
              marginBottom: "10px",
              textTransform: "uppercase",
            }}
          >
            By Method
          </div>
          <div style={{ display: "grid", gap: "5px" }}>
            {PAYMENT_METHODS.filter(
              (m) => m.value !== "credit" && byMethod[m.value] > 0,
            ).map((m) => (
              <div
                key={m.value}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "13px",
                }}
              >
                <span style={{ color: "#374151" }}>
                  {m.icon} {m.label}
                </span>
                <span style={{ fontWeight: "700", color: "#111827" }}>
                  {formatCurrency(byMethod[m.value])}
                </span>
              </div>
            ))}
            {Object.values(byMethod).every((v) => v === 0) && (
              <span style={{ fontSize: "13px", color: "#9ca3af" }}>
                No collections
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h4
            style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: "700",
              color: "#111827",
            }}
          >
            Transaction History
          </h4>
          <span style={{ fontSize: "13px", color: "#6b7280" }}>
            {filtered.length} records
          </span>
        </div>

        {filtered.length === 0 ? (
          <div
            style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}
          >
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔍</div>
            <p style={{ margin: 0, fontSize: "15px" }}>No transactions found</p>
            {hasFilters && (
              <p style={{ margin: "6px 0 0 0", fontSize: "13px" }}>
                Try adjusting filters
              </p>
            )}
          </div>
        ) : (
          <div>
            {/* Table Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "140px 1fr 130px 120px 130px 110px",
                gap: "0",
                padding: "10px 24px",
                backgroundColor: "#f9fafb",
                borderBottom: "1px solid #e5e7eb",
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
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#6b7280",
                    textTransform: "uppercase",
                  }}
                >
                  {h}
                </div>
              ))}
            </div>

            {/* Rows */}
            <div style={{ maxHeight: "520px", overflowY: "auto" }}>
              {filtered.map((p, idx) => {
                const isCredit = p.payment_method === "credit";
                const method = PAYMENT_METHODS.find(
                  (m) => m.value === p.payment_method,
                );
                return (
                  <div
                    key={p.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "140px 1fr 130px 120px 130px 110px",
                      gap: "0",
                      padding: "14px 24px",
                      backgroundColor: isCredit
                        ? "#fffbeb"
                        : idx % 2 === 0
                          ? "white"
                          : "#fafafa",
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>
                      {new Date(p.created_at).toLocaleDateString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                      <div style={{ color: "#9ca3af" }}>
                        {new Date(p.created_at).toLocaleTimeString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "700",
                          color: "#111827",
                        }}
                      >
                        {p.vehicle?.vehicle_number || "—"}
                      </div>
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>
                        {p.vehicle?.customer_name || "—"}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span style={{ fontSize: "16px" }}>{method?.icon}</span>
                      <span
                        style={{
                          fontSize: "13px",
                          color: "#374151",
                          fontWeight: "500",
                        }}
                      >
                        {p.payment_method === "bank_transfer"
                          ? "Bank"
                          : p.payment_method === "credit"
                            ? "Credit Given"
                            : method?.label}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "15px",
                        fontWeight: "800",
                        color: isCredit ? "#9a3412" : "#166534",
                      }}
                    >
                      {isCredit ? "−" : "+"}
                      {formatCurrency(p.amount)}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        wordBreak: "break-all",
                      }}
                    >
                      {p.transaction_id || (
                        <span style={{ color: "#d1d5db" }}>—</span>
                      )}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>
                      {p.collector?.full_name || "—"}
                      {isCredit && p.vehicle?.credit_guaranteed_by && (
                        <div
                          style={{
                            marginTop: "3px",
                            color: "#92400e",
                            fontWeight: "600",
                          }}
                        >
                          👤 {p.vehicle.credit_guaranteed_by}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CashierDashboard;
