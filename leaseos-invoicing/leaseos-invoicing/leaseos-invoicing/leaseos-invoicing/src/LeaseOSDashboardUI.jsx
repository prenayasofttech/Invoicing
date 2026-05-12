import React, { useState, useEffect } from "react";
import LeaseOSSidebar from "./LeaseOSSidebar";
import {
  fetchDashboardKPIs,
  fetchAgingRows,
  fetchInvoices,
} from "./supabaseClient";

/* ─── static demo data for chart sections ─── */
const monthlyBars = [
  { month: "Jun", invoiced: 165, collected: 154 },
  { month: "Jul", invoiced: 160, collected: 153 },
  { month: "Aug", invoiced: 171, collected: 160 },
  { month: "Sep", invoiced: 176, collected: 166 },
  { month: "Oct", invoiced: 172, collected: 145 },
  { month: "Nov", invoiced: 184, collected: 151 },
];

const ownerBars = [
  { owner: "External Investors", invoiced: 82, collected: 74 },
  { owner: "Close Group", invoiced: 20, collected: 19 },
  { owner: "Developer Pool", invoiced: 41, collected: 36 },
];

/* ─── tone helpers (original colours) ─── */
function toneStyles(tone) {
  if (tone === "blue") return { border: "#3b82f6", bg: "#eff6ff", text: "#1d4ed8", badge: "#dbeafe" };
  if (tone === "green") return { border: "#22c55e", bg: "#f0fdf4", text: "#15803d", badge: "#dcfce7" };
  if (tone === "amber") return { border: "#f59e0b", bg: "#fffbeb", text: "#b45309", badge: "#fef3c7" };
  return { border: "#ef4444", bg: "#fef2f2", text: "#b91c1c", badge: "#fee2e2" };
}

/* ─── TopBar — new layout with two alert pills ─── */
function TopBar({ mobileOpen, setMobileOpen }) {
  return (
    <header style={{
      background: "#0f2d5a",
      borderBottom: "1px solid #1a3d70",
      padding: "16px 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      flexWrap: "wrap",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          type="button"
          className="lg:hidden"
          style={{ border: "1px solid rgba(255,255,255,0.25)", borderRadius: "10px", padding: "8px 12px", fontSize: "13px", background: "transparent", cursor: "pointer", color: "#fff" }}
          onClick={() => setMobileOpen(true)}
        >☰</button>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#ffffff", margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.65)", margin: 0 }}>Invoicing &amp; Collections Overview</p>
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <span style={{ borderRadius: "20px", background: "rgba(239,68,68,0.18)", padding: "5px 14px", fontSize: "12px", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.35)" }}>3 Leases Expiring in 30 Days</span>
        <span style={{ borderRadius: "20px", background: "rgba(245,158,11,0.18)", padding: "5px 14px", fontSize: "12px", color: "#fcd34d", border: "1px solid rgba(245,158,11,0.35)" }}>5 Units Uninvoiced - Nov 2025</span>
      </div>
    </header>
  );
}

/* ─── KPI Card (original colours) ─── */
function KPICard({ card }) {
  const tone = toneStyles(card.tone);
  return (
    <article style={{
      borderRadius: "12px", border: `1px solid ${tone.border}`, borderTop: `3px solid ${tone.border}`,
      background: "#fff", padding: "18px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
    }}>
      <p style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280", fontWeight: 600 }}>{card.label}</p>
      <p style={{ marginTop: "6px", fontSize: "28px", fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>{card.value}</p>
      <p style={{ marginTop: "4px", fontSize: "12px", color: "#6b7280" }}>{card.sub}</p>
      <span style={{ marginTop: "10px", display: "inline-block", borderRadius: "20px", background: tone.badge, padding: "3px 10px", fontSize: "12px", fontWeight: 600, color: tone.text }}>{card.trend}</span>
    </article>
  );
}

/* ─── Mini Bar Chart ─── */
function MiniBarChart({ title, rightLabel, rows, maxValue }) {
  const cols = rows.length;
  return (
    <section style={{ borderRadius: "12px", border: "1px solid #e5e7eb", background: "#fff", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>{title}</p>
        <span style={{ borderRadius: "6px", background: "#f3f4f6", padding: "3px 8px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", color: "#6b7280" }}>{rightLabel}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "12px" }}>
        {rows.map((item) => (
          <div key={item.month || item.owner} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ height: "180px", width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "3px" }}>
              <div
                style={{
                  width: "14px", borderRadius: "3px 3px 0 0",
                  background: "#bfdbfe", border: "1px solid #3b82f6",
                  height: `${Math.round((item.invoiced / maxValue) * 100)}%`
                }}
              />
              <div
                style={{
                  width: "14px", borderRadius: "3px 3px 0 0",
                  background: "#fef3c7", border: "1px solid #f59e0b",
                  height: `${Math.round((item.collected / maxValue) * 100)}%`
                }}
              />
            </div>
            <p style={{ marginTop: "6px", fontSize: "11px", color: "#6b7280" }}>{item.month || item.owner}</p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", fontSize: "12px", color: "#6b7280" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#bfdbfe", border: "1px solid #3b82f6", display: "inline-block" }} />
          Invoiced
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#fef3c7", border: "1px solid #f59e0b", display: "inline-block" }} />
          Collected
        </span>
      </div>
    </section>
  );
}

/* ─── Donut Card ─── */
function DonutCard() {
  return (
    <section style={{ borderRadius: "12px", border: "1px solid #e5e7eb", background: "#fff", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>Debtors Aging Analysis</p>
        <span style={{ borderRadius: "6px", background: "#f3f4f6", padding: "3px 8px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", color: "#6b7280" }}>As of Nov 2025</span>
      </div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "16px 0" }}>
        <div style={{
          width: "220px", height: "220px", borderRadius: "50%", position: "relative",
          background: "conic-gradient(#3b82f6 0 36%, #f59e0b 36% 64%, #ef4444 64% 84%, #22c55e 84% 100%)"
        }}>
          <div style={{ position: "absolute", inset: "48px", borderRadius: "50%", background: "#fff" }} />
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px", marginTop: "12px", fontSize: "12px", color: "#6b7280" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#3b82f6", display: "inline-block" }} />Current</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />30–60 Days</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />&gt;60 Days</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />Settled</span>
      </div>
    </section>
  );
}

/* ─── Shared helpers ─── */
function EmptyState({ message }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", color: "#9ca3af", fontSize: "14px" }}>
      <span style={{ fontSize: "32px", display: "block", marginBottom: "8px" }}>📭</span>
      {message}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", color: "#6b7280", fontSize: "14px" }}>
      <div style={{ width: "32px", height: "32px", border: "3px solid #e5e7eb", borderTop: "3px solid #0f2d5a", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
      Loading...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ─── Top Overdue Tenants (with Days column) ─── */
function TopOverdueTenants({ rows, loading, onNavigate }) {
  return (
    <section style={{ borderRadius: "12px", border: "1px solid #e5e7eb", background: "#fff", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div style={{ marginBottom: "14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>Top Overdue Tenants</p>
        <button
          onClick={() => onNavigate("Collections")}
          style={{ borderRadius: "20px", border: "1px solid #d1d5db", padding: "4px 14px", fontSize: "12px", fontWeight: 500, color: "#374151", background: "#fff", cursor: "pointer" }}
        >Settle →</button>
      </div>
      {loading ? <LoadingSpinner /> : rows.length === 0 ? (
        <EmptyState message="No overdue tenants" />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: "520px", fontSize: "13px", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                {["Tenant", "Unit", "Outstanding", "Days", "Action"].map(h => (
                  <th key={h} style={{ padding: "8px 6px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 5).map((row) => (
                <tr key={row.tenant + row.unit} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px 6px", fontWeight: 500, color: "#111827" }}>{row.tenant}</td>
                  <td style={{ padding: "10px 6px", color: "#6b7280" }}>{row.unit}</td>
                  <td style={{ padding: "10px 6px", color: "#dc2626", fontWeight: 600 }}>₹{row.total}</td>
                  <td style={{ padding: "10px 6px" }}>
                    <span style={{ borderRadius: "20px", background: "#fef3c7", padding: "2px 8px", fontSize: "11px", color: "#b45309", fontWeight: 500 }}>
                      {row.days ?? "—"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 6px" }}>
                    <button
                      onClick={() => onNavigate("Collections")}
                      style={{ borderRadius: "20px", background: "#2563eb", padding: "4px 12px", fontSize: "11px", fontWeight: 600, color: "#fff", border: "none", cursor: "pointer" }}
                    >Settle</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ─── Uninvoiced Units ─── */
function UninvoicedUnits({ rows, loading, onNavigate }) {
  return (
    <section style={{ borderRadius: "12px", border: "1px solid #fbbf24", background: "#fff", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div style={{ marginBottom: "14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        <p style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>Uninvoiced Units — Current Period</p>
        <button
          onClick={() => onNavigate("Invoicing")}
          style={{ borderRadius: "20px", background: "#2563eb", padding: "6px 16px", fontSize: "12px", fontWeight: 600, color: "#fff", border: "none", cursor: "pointer" }}
        >Generate Invoices →</button>
      </div>
      {loading ? <LoadingSpinner /> : rows.length === 0 ? (
        <EmptyState message="No uninvoiced units for this period" />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: "680px", fontSize: "13px", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                {["Unit", "Owner", "Tenant", "Lease Type", "Monthly Rent", "Status"].map(h => (
                  <th key={h} style={{ padding: "8px 6px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px 6px", fontWeight: 600, color: "#2563eb" }}>{row.unit_no}</td>
                  <td style={{ padding: "10px 6px", color: "#374151" }}>{row.owner_name}</td>
                  <td style={{ padding: "10px 6px", color: "#374151" }}>{row.tenant_name}</td>
                  <td style={{ padding: "10px 6px" }}><span style={{ borderRadius: "20px", background: "#dbeafe", padding: "2px 8px", fontSize: "11px", color: "#1d4ed8", fontWeight: 500 }}>{row.lease_type}</span></td>
                  <td style={{ padding: "10px 6px", fontWeight: 600, color: "#111827" }}>₹{row.monthly_rent?.toLocaleString("en-IN")}</td>
                  <td style={{ padding: "10px 6px" }}><span style={{ borderRadius: "20px", background: "#fef3c7", padding: "2px 8px", fontSize: "11px", color: "#b45309", fontWeight: 500 }}>Pending</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ─── Main export ─── */
export default function LeaseOSDashboardUI({ onNavigate }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [kpiCards, setKpiCards] = useState([]);
  const [overdueRows, setOverdueRows] = useState([]);
  const [uninvoicedRows, setUninvoicedRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [kpis, aging] = await Promise.all([
          fetchDashboardKPIs(),
          fetchAgingRows(),
        ]);
        setKpiCards(kpis);
        setOverdueRows(aging);
      } catch (err) {
        console.error("Dashboard load error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--page-bg)", display: "flex" }}>
      <LeaseOSSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} currentPage="Dashboard" onNavigate={onNavigate} />
      <main className="flex-1 lg:ml-72" style={{ minWidth: 0 }}>
        <TopBar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "12px 16px", color: "#b91c1c", fontSize: "13px" }}>
              ⚠️ {error} — Check Supabase connection and table names.
            </div>
          )}

          {/* KPI Row */}
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            {loading ? (
              <div style={{ gridColumn: "1/-1", background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                <LoadingSpinner />
              </div>
            ) : kpiCards.length === 0 ? (
              <div style={{ gridColumn: "1/-1", background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                <EmptyState message="No invoice data found in database" />
              </div>
            ) : (
              kpiCards.map((card) => <KPICard key={card.label} card={card} />)
            )}
          </section>

          {/* Charts Row */}
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "16px" }}>
            <MiniBarChart title="Invoicing Activity - Last 6 Months" rightLabel="Invoice vs Collection" rows={monthlyBars} maxValue={200} />
            <DonutCard />
          </section>

          {/* Owner Chart + Overdue Table */}
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "16px" }}>
            <MiniBarChart title="Collection Efficiency by Owner Category" rightLabel="Nov 2025" rows={ownerBars} maxValue={90} />
            <TopOverdueTenants rows={overdueRows} loading={loading} onNavigate={onNavigate} />
          </section>

          {/* Uninvoiced Units */}
          <UninvoicedUnits rows={uninvoicedRows} loading={false} onNavigate={onNavigate} />
        </div>
      </main>
    </div>
  );
}
