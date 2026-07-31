import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "../lib/supabase";

// ─── THEME ────────────────────────────────────────────────────────────────────
const T = {
  bg: "#f8fafc",
  surface: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#94a3b8",
  primary: "#0f172a",
  accent: "#0891b2",
  accentLight: "#ecfeff",
  green: "#059669",
  greenLight: "#ecfdf5",
  red: "#dc2626",
  redLight: "#fef2f2",
  amber: "#d97706",
  amberLight: "#fffbeb",
  shadow: "0 1px 3px rgba(0,0,0,0.08)",
};

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

const formatIST = (dateStr) => {
  if (!dateStr) return "N/A";
  const d =
    String(dateStr).includes("Z") || String(dateStr).includes("+")
      ? dateStr
      : dateStr + "Z";
  return new Date(d).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// ─── SMALL UI HELPERS ─────────────────────────────────────────────────────────
const Chip = ({ color, bg, children }) => (
  <span
    style={{
      display: "inline-block",
      padding: "3px 9px",
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 700,
      color,
      background: bg,
      textTransform: "capitalize",
    }}
  >
    {children}
  </span>
);

const Bx = ({ children, style = {} }) => (
  <div
    style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 12,
      padding: 16,
      boxShadow: T.shadow,
      ...style,
    }}
  >
    {children}
  </div>
);

const Btn = ({
  children,
  onClick,
  disabled,
  style = {},
  variant = "primary",
}) => {
  const variants = {
    primary: { background: T.accent, color: "#fff", border: "none" },
    danger: { background: T.red, color: "#fff", border: "none" },
    ghost: {
      background: T.surface,
      color: T.textSecondary,
      border: `1px solid ${T.border}`,
    },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 16px",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontFamily: "inherit",
        ...variants[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
};

const Spinner = () => (
  <div style={{ padding: 40, textAlign: "center", color: T.textMuted }}>
    Loading...
  </div>
);

const Empty = ({ icon, text }) => (
  <div
    style={{
      padding: 60,
      textAlign: "center",
      color: T.textMuted,
      background: T.surface,
      borderRadius: 12,
      border: `1px dashed ${T.border}`,
    }}
  >
    <div style={{ fontSize: 40, marginBottom: 10 }}>{icon}</div>
    <div style={{ fontSize: 14, fontWeight: 600 }}>{text}</div>
  </div>
);

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function SpareDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("pending");
  const [orders, setOrders] = useState([]);
  const [vehicleMap, setVehicleMap] = useState({});
  const [requesterMap, setRequesterMap] = useState({});
  const [catalogMap, setCatalogMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingOrderId, setSavingOrderId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  // Locally-staged quantity edits, keyed by item id — never written to the DB
  // until the item is actually marked "Have". Kept separate from `orders`
  // (which mirrors the server) so adjusting the stepper never looks like a
  // saved change until it's explicitly confirmed.
  const [stagedQuantities, setStagedQuantities] = useState({});

  const fetchDebounceRef = useRef(null);
  const scheduleFetch = () => {
    clearTimeout(fetchDebounceRef.current);
    fetchDebounceRef.current = setTimeout(() => fetchAll(false), 800);
  };

  useEffect(() => {
    // Catalog rarely changes — fetched once here, not on every order/item event.
    supabase
      .from("parts_catalog")
      .select("id, name")
      .then(({ data }) => {
        setCatalogMap(
          Object.fromEntries((data || []).map((p) => [p.id, p.name])),
        );
      });

    fetchAll();
    const channel = supabase
      .channel("spare-orders-web")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "part_orders" },
        () => scheduleFetch(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "part_order_items" },
        () => scheduleFetch(),
      )
      .subscribe();
    return () => {
      clearTimeout(fetchDebounceRef.current);
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAll = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const { data: orderRows, error } = await withTimeout(
        supabase
          .from("part_orders")
          .select("*")
          .order("requested_at", { ascending: true }),
      );
      if (error) throw error;

      const ids = (orderRows || []).map((o) => o.id);
      let itemsByOrder = {};
      if (ids.length > 0) {
        const { data: items } = await withTimeout(
          supabase.from("part_order_items").select("*").in("order_id", ids),
        );
        (items || []).forEach((it) => {
          if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = [];
          itemsByOrder[it.order_id].push(it);
        });
      }

      const vehicleIds = [
        ...new Set((orderRows || []).map((o) => o.vehicle_id)),
      ];
      const requesterIds = [
        ...new Set(
          (orderRows || []).map((o) => o.requested_by).filter(Boolean),
        ),
      ];

      const [vehiclesRes, usersRes] = await withTimeout(
        Promise.all([
          vehicleIds.length > 0
            ? supabase
                .from("vehicles")
                .select("id, vehicle_number, model, customer_name")
                .in("id", vehicleIds)
            : { data: [] },
          requesterIds.length > 0
            ? supabase
                .from("users")
                .select("id, full_name")
                .in("id", requesterIds)
            : { data: [] },
        ]),
      );

      setVehicleMap(
        Object.fromEntries((vehiclesRes.data || []).map((v) => [v.id, v])),
      );
      setRequesterMap(
        Object.fromEntries(
          (usersRes.data || []).map((u) => [u.id, u.full_name]),
        ),
      );
      setOrders(
        (orderRows || []).map((o) => ({
          ...o,
          items: itemsByOrder[o.id] || [],
        })),
      );
    } catch (e) {
      console.error(e);
      alert("Failed to load parts orders.");
    } finally {
      setLoading(false);
    }
  };

  const getStagedQty = (item) =>
    stagedQuantities[item.id] ?? item.fulfilled_quantity ?? item.quantity;

  const updateItemQuantity = (itemId, newQty) => {
    setStagedQuantities((prev) => ({ ...prev, [itemId]: Math.max(1, newQty) }));
  };

  const setItemStatus = async (order, item, status) => {
    try {
      const updatePayload = { status };
      if (status === "confirmed") {
        updatePayload.fulfilled_quantity = getStagedQty(item);
      }
      const { error } = await supabase
        .from("part_order_items")
        .update(updatePayload)
        .eq("id", item.id);
      if (error) throw error;

      await supabase.from("vehicle_history").insert([
        {
          vehicle_id: order.vehicle_id,
          user_id: user?.id,
          stage: "spare",
          action: "part_item_status_updated",
          notes: `${item.custom_part_name || catalogMap[item.part_id] || "Part"} marked ${status}`,
        },
      ]);

      // If the order was still "pending", flip it to "confirmed" the moment
      // the spare team starts actioning items — gives front checkup
      // visibility that someone has picked up the request.
      const orderNowConfirmed = order.status === "pending";
      if (orderNowConfirmed) {
        await supabase
          .from("part_orders")
          .update({
            status: "confirmed",
            confirmed_by: user?.id,
            confirmed_at: new Date().toISOString(),
          })
          .eq("id", order.id);
      }

      // Update local state directly instead of refetching everything from the
      // network — a full refetch per click was the main cause of the list
      // feeling slow.
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== order.id) return o;
          return {
            ...o,
            ...(orderNowConfirmed ? { status: "confirmed" } : {}),
            items: o.items.map((it) =>
              it.id === item.id ? { ...it, ...updatePayload } : it,
            ),
          };
        }),
      );
      setStagedQuantities((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    } catch (e) {
      alert("Failed to update item: " + e.message);
    }
  };

  const canDeliver = (order) =>
    order.items.length > 0 &&
    order.items.every(
      (it) => it.status === "confirmed" || it.status === "unavailable",
    );

  const markDelivered = async (order) => {
    if (!canDeliver(order)) {
      alert(
        "Every item must be marked Confirmed or Unavailable before the order can be delivered.",
      );
      return;
    }
    setSavingOrderId(order.id);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("part_orders")
        .update({ status: "delivered", delivered_at: now })
        .eq("id", order.id);
      if (error) throw error;

      await supabase
        .from("part_order_items")
        .update({ status: "delivered" })
        .eq("order_id", order.id)
        .eq("status", "confirmed");

      await supabase.from("vehicle_history").insert([
        {
          vehicle_id: order.vehicle_id,
          user_id: user?.id,
          stage: "spare",
          action: "part_order_delivered",
          notes: `Parts order delivered (${order.items.length} item(s))`,
        },
      ]);

      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? {
                ...o,
                status: "delivered",
                delivered_at: now,
                items: o.items.map((it) =>
                  it.status === "confirmed" ? { ...it, status: "delivered" } : it,
                ),
              }
            : o,
        ),
      );
    } catch (e) {
      alert("Failed to mark order delivered: " + e.message);
    } finally {
      setSavingOrderId(null);
    }
  };

  // Step 2 of fulfillment — a separate, deliberate confirmation that the
  // vehicle's job card actually reflects what was handed out. Only after this
  // does the order leave the Pending tab and count as done.
  const confirmJobCardUpdated = async (order) => {
    setSavingOrderId(order.id);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("part_orders")
        .update({
          status: "completed",
          jobcard_confirmed_by: user?.id,
          jobcard_confirmed_at: now,
        })
        .eq("id", order.id);
      if (error) throw error;

      await supabase.from("vehicle_history").insert([
        {
          vehicle_id: order.vehicle_id,
          user_id: user?.id,
          stage: "spare",
          action: "part_order_jobcard_confirmed",
          notes: "Job card confirmed updated — order complete",
        },
      ]);

      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? {
                ...o,
                status: "completed",
                jobcard_confirmed_by: user?.id,
                jobcard_confirmed_at: now,
              }
            : o,
        ),
      );
    } catch (e) {
      alert("Failed to confirm job card update: " + e.message);
    } finally {
      setSavingOrderId(null);
    }
  };

  const cancelOrder = async (order) => {
    const vn = vehicleMap[order.vehicle_id]?.vehicle_number || "this vehicle";
    if (!window.confirm(`Cancel this parts request for ${vn}?`)) return;
    try {
      await supabase
        .from("part_orders")
        .update({ status: "cancelled" })
        .eq("id", order.id);
      await supabase.from("vehicle_history").insert([
        {
          vehicle_id: order.vehicle_id,
          user_id: user?.id,
          stage: "spare",
          action: "part_order_cancelled",
          notes: "Parts order cancelled by spare team",
        },
      ]);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id ? { ...o, status: "cancelled" } : o,
        ),
      );
    } catch (e) {
      alert("Failed to cancel order: " + e.message);
    }
  };

  const matchesSearch = (order) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    const vehicle = vehicleMap[order.vehicle_id];
    return (
      vehicle?.vehicle_number?.toLowerCase().includes(q) ||
      vehicle?.customer_name?.toLowerCase().includes(q)
    );
  };

  // Memoized so filtering only recomputes when the actual inputs change, not
  // on every render (e.g. savingOrderId changing while a click is in flight).
  const actionNeededOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          (o.status === "pending" || o.status === "confirmed") &&
          matchesSearch(o),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orders, vehicleMap, searchQuery],
  );
  const awaitingJobCardOrders = useMemo(
    () => orders.filter((o) => o.status === "delivered" && matchesSearch(o)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orders, vehicleMap, searchQuery],
  );
  // Pending tab shows both — action-needed first, then delivered-but-awaiting-
  // jobcard-confirmation, so nothing silently disappears between "delivered"
  // and actually being done.
  const pendingOrders = useMemo(
    () => [...actionNeededOrders, ...awaitingJobCardOrders],
    [actionNeededOrders, awaitingJobCardOrders],
  );
  // History: newest-first is more useful for looking back at what just happened.
  const historyOrders = useMemo(
    () =>
      orders
        .filter(
          (o) =>
            (o.status === "completed" || o.status === "cancelled") &&
            matchesSearch(o),
        )
        .slice()
        .reverse(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orders, vehicleMap, searchQuery],
  );
  const list = activeTab === "pending" ? pendingOrders : historyOrders;

  if (loading) return <Spinner />;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: T.primary,
          padding: "20px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.5)",
              fontWeight: 700,
              letterSpacing: 1.2,
              textTransform: "uppercase",
            }}
          >
            Spare Department
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>
            {user?.full_name}
          </div>
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          {[
            {
              label: "PENDING",
              value: actionNeededOrders.length,
              color: T.amber,
            },
            {
              label: "AWAITING JOB CARD",
              value: awaitingJobCardOrders.length,
              color: T.accent,
            },
            {
              label: "COMPLETED",
              value: historyOrders.filter((o) => o.status === "completed")
                .length,
              color: T.green,
            },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>
                {s.value}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: "rgba(255,255,255,0.5)",
                  fontWeight: 700,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
          {onLogout && (
            <Btn
              variant="ghost"
              onClick={onLogout}
              style={{
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              Log Out
            </Btn>
          )}
        </div>
      </div>

      {/* Tabs + search */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 28px 0",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { key: "pending", label: "🔧 Pending", count: pendingOrders.length },
            { key: "history", label: "📋 History", count: null },
          ].map((tab) => (
            <div
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "10px 18px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                color: activeTab === tab.key ? T.accent : T.textSecondary,
                borderBottom: `3px solid ${activeTab === tab.key ? T.accent : "transparent"}`,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  style={{
                    background: T.red,
                    color: "#fff",
                    borderRadius: 10,
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "1px 6px",
                  }}
                >
                  {tab.count}
                </span>
              )}
            </div>
          ))}
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 Search by vehicle number or customer name..."
          style={{
            flex: 1,
            maxWidth: 340,
            padding: "8px 14px",
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            fontSize: 14,
            color: T.text,
            background: T.surface,
            outline: "none",
            fontFamily: "inherit",
            marginBottom: 10,
          }}
          onFocus={(e) => (e.target.style.borderColor = T.accent)}
          onBlur={(e) => (e.target.style.borderColor = T.border)}
        />
      </div>

      {/* Body */}
      <div style={{ padding: 28, paddingTop: 12 }}>
        {list.length === 0 ? (
          <Empty
            icon={activeTab === "pending" ? "✅" : "📋"}
            text={
              searchQuery.trim()
                ? `No results for "${searchQuery}"`
                : activeTab === "pending"
                  ? "No Pending Requests"
                  : "No History Yet"
            }
          />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: 16,
            }}
          >
            {list.map((order) => {
              const vehicle = vehicleMap[order.vehicle_id] || {};
              const requesterName =
                requesterMap[order.requested_by] || "Unknown";
              const ready = canDeliver(order);
              const editable =
                activeTab === "pending" &&
                order.status !== "cancelled" &&
                order.status !== "delivered" &&
                order.status !== "completed";
              const statusColors = {
                pending: [T.amber, T.amberLight],
                confirmed: [T.accent, T.accentLight],
                delivered: [T.accent, T.accentLight],
                completed: [T.green, T.greenLight],
                cancelled: [T.red, T.redLight],
              };
              const [sColor, sBg] = statusColors[order.status] || [
                T.textMuted,
                T.bg,
              ];
              return (
                <Bx key={order.id}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <div>
                      <div
                        style={{ fontSize: 17, fontWeight: 800, color: T.text }}
                      >
                        {vehicle.vehicle_number || "—"}
                      </div>
                      {vehicle.model && (
                        <div style={{ fontSize: 12, color: T.textSecondary }}>
                          {vehicle.model}
                        </div>
                      )}
                    </div>
                    <Chip color={sColor} bg={sBg}>
                      {order.status === "delivered"
                        ? "Awaiting Job Card"
                        : order.status}
                    </Chip>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: T.textMuted,
                      marginBottom: 2,
                    }}
                  >
                    Requested by {requesterName} (
                    {order.requested_stage?.replace(/_/g, " ") || "—"}) ·{" "}
                    {formatIST(order.requested_at)}
                  </div>
                  {vehicle.customer_name && (
                    <div style={{ fontSize: 12, color: T.textMuted }}>
                      👤 {vehicle.customer_name}
                    </div>
                  )}
                  {order.notes && (
                    <div
                      style={{
                        fontSize: 12,
                        color: T.textSecondary,
                        fontStyle: "italic",
                        marginTop: 6,
                        background: T.bg,
                        padding: 8,
                        borderRadius: 6,
                      }}
                    >
                      📝 {order.notes}
                    </div>
                  )}

                  <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                    {order.items.map((item) => {
                      const name =
                        item.custom_part_name ||
                        catalogMap[item.part_id] ||
                        "Unknown part";
                      const qty = getStagedQty(item);
                      return (
                        <div
                          key={item.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            background: T.bg,
                            borderRadius: 8,
                            padding: "8px 10px",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontSize: 13,
                                color: T.text,
                                fontWeight: 600,
                              }}
                            >
                              {name}
                            </div>
                            {editable ? (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                  marginTop: 4,
                                }}
                              >
                                <button
                                  onClick={() =>
                                    updateItemQuantity(item.id, qty - 1)
                                  }
                                  style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 6,
                                    border: `1px solid ${T.border}`,
                                    background: "#fff",
                                    color: T.textSecondary,
                                    fontWeight: 700,
                                    fontSize: 14,
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                  }}
                                >
                                  −
                                </button>
                                <span
                                  style={{ fontSize: 12, color: T.textMuted }}
                                >
                                  Qty: {qty}
                                  {qty !== item.quantity
                                    ? ` (requested ${item.quantity})`
                                    : ""}
                                </span>
                                <button
                                  onClick={() =>
                                    updateItemQuantity(item.id, qty + 1)
                                  }
                                  style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 6,
                                    border: `1px solid ${T.border}`,
                                    background: "#fff",
                                    color: T.textSecondary,
                                    fontWeight: 700,
                                    fontSize: 14,
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                  }}
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <span
                                style={{ fontWeight: 400, color: T.textMuted, fontSize: 12 }}
                              >
                                × {item.fulfilled_quantity ?? item.quantity}
                              </span>
                            )}
                          </div>
                          {editable ? (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                onClick={() =>
                                  setItemStatus(order, item, "confirmed")
                                }
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: "5px 10px",
                                  borderRadius: 6,
                                  border: `1px solid ${T.border}`,
                                  cursor: "pointer",
                                  background:
                                    item.status === "confirmed"
                                      ? T.green
                                      : "#fff",
                                  color:
                                    item.status === "confirmed"
                                      ? "#fff"
                                      : T.textSecondary,
                                }}
                              >
                                ✓ Have
                              </button>
                              <button
                                onClick={() =>
                                  setItemStatus(order, item, "unavailable")
                                }
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: "5px 10px",
                                  borderRadius: 6,
                                  border: `1px solid ${T.border}`,
                                  cursor: "pointer",
                                  background:
                                    item.status === "unavailable"
                                      ? T.red
                                      : "#fff",
                                  color:
                                    item.status === "unavailable"
                                      ? "#fff"
                                      : T.textSecondary,
                                }}
                              >
                                ✕ N/A
                              </button>
                            </div>
                          ) : (
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color:
                                  item.status === "unavailable"
                                    ? T.red
                                    : T.green,
                                textTransform: "capitalize",
                              }}
                            >
                              {item.status}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {activeTab === "pending" && order.status !== "delivered" && (
                    <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                      <Btn
                        variant="ghost"
                        onClick={() => cancelOrder(order)}
                        style={{ flex: 1 }}
                      >
                        Cancel
                      </Btn>
                      <Btn
                        onClick={() => markDelivered(order)}
                        disabled={!ready || savingOrderId === order.id}
                        style={{ flex: 2 }}
                      >
                        {savingOrderId === order.id
                          ? "Saving..."
                          : "📦 Mark Delivered"}
                      </Btn>
                    </div>
                  )}
                  {activeTab === "pending" &&
                    order.status !== "delivered" &&
                    !ready && (
                      <div
                        style={{
                          fontSize: 11,
                          color: T.textMuted,
                          marginTop: 6,
                          textAlign: "center",
                        }}
                      >
                        Mark every item Have/N/A before delivering.
                      </div>
                    )}
                  {activeTab === "pending" && order.status === "delivered" && (
                    <Btn
                      onClick={() => confirmJobCardUpdated(order)}
                      disabled={savingOrderId === order.id}
                      style={{ width: "100%", marginTop: 14, justifyContent: "center" }}
                    >
                      {savingOrderId === order.id
                        ? "Saving..."
                        : "✅ Confirm Job Card Updated"}
                    </Btn>
                  )}
                </Bx>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
