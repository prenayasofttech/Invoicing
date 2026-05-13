import React, { useState, useEffect, useMemo } from "react";
import LeaseOSSidebar from "./LeaseOSSidebar";
import {
  fetchDashboardKPIs,
  fetchAgingRows,
  fetchUninvoicedLeases,
  fetchMonthlyInvoicingActivity,
  fetchAgingSummary,
  fetchOwnerReport
} from "./supabaseClient";

function toneStyles(tone) {
  if (tone === "blue") return { border: "#3b82f6", bg: "#eff6ff", text: "#1d4ed8", badge: "#dbeafe" };
  if (tone === "green") return { border: "#22c55e", bg: "#f0fdf4", text: "#15803d", badge: "#dcfce7" };
  if (tone === "amber") return { border: "#f59e0b", bg: "#fffbeb", text: "#b45309", badge: "#fef3c7" };
  return { border: "#ef4444", bg: "#fef2f2", text: "#b91c1c", badge: "#fee2e2" };
}

function formatRentModel(rm) {
  const m = String(rm || "").toLowerCase().replace(/\s+/g, "_");
  if (m.includes("fixed")) return "Fixed";
  if (m.includes("revenue")) return "Revenue Share";
  if (m.includes("mg") && (m.includes("rs") || m.includes("revenue"))) return "MG+RS";
  if (m.includes("mg")) return "MG";
  return rm ? String(rm).replace(/_/g, " ") : "—";
}

function parseAmountString(s) {
  return Number(String(s).replace(/,/g, "")) || 0;
}

function overdueDaysLabel(row) {
  if (row.d90 && row.d90 !== "—" && row.d90 !== "-") return "90d+";
  if (row.d61 && row.d61 !== "—" && row.d61 !== "-") return "60d+";
  if (row.d31 && row.d31 !== "—" && row.d31 !== "-") return "30d+";
  return "<30d";
}

const KPI_LABELS = [
  "Total Invoiced (Nov)",
  "Collected (Nov)",
  "Outstanding Dues",
  "Overdue > 60 Days",
];

function mapKpiForDisplay(card, index) {
  return { ...card, label: KPI_LABELS[index] ?? card.label };
}

function TopBar({ setMobileOpen }) {
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
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.65)", margin: 0 }}>Nexus Grand Mall - FY 2025-26</p>
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ borderRadius: "20px", background: "rgba(239,68,68,0.18)", padding: "5px 14px", fontSize: "12px", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.35)" }}>
          3 Leases Expiring in 30 Days
        </span>
        <span style={{ borderRadius: "20px", background: "rgba(234,179,8,0.2)", padding: "5px 14px", fontSize: "12px", color: "#fde047", border: "1px solid rgba(234,179,8,0.35)" }}>
          5 Units Uninvoiced - Nov 2025
        </span>
      </div>
    </header>
  );
}

function KPICard({ card }) {
  const tone = toneStyles(card.tone);
  const isCritical = String(card.trend).toLowerCase().includes("critical");
  const trendGreen = /↑|%|efficiency|vs|L|Cr/i.test(card.trend) && !isCritical;

  return (
    <article style={{
      borderRadius: "12px", border: `1px solid ${tone.border}`, borderTop: `3px solid ${tone.border}`,
      background: "#fff", padding: "18px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    }}>
      <p style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280", fontWeight: 600 }}>{card.label}</p>
      <p style={{ marginTop: "6px", fontSize: "28px", fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>{card.value}</p>
      <p style={{ marginTop: "4px", fontSize: "12px", color: "#6b7280" }}>{card.sub}</p>
      <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
        {!isCritical && (
          <span style={{
            display: "inline-block",
            borderRadius: "20px",
            background: trendGreen ? "#dcfce7" : tone.badge,
            padding: "3px 10px",
            fontSize: "12px",
            fontWeight: 600,
            color: trendGreen ? "#15803d" : tone.text,
          }}>{card.trend}</span>
        )}
        {isCritical && (
          <span style={{
            borderRadius: "20px",
            background: "#dbeafe",
            padding: "3px 10px",
            fontSize: "11px",
            fontWeight: 700,
            color: "#b91c1c",
            border: "1px solid #93c5fd",
          }}>Critical</span>
        )}
      </div>
    </article>
  );
}

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

/** Fixed-position tooltip following pointer while hovering chart marks */
function ChartTooltip({ tip }) {
  if (!tip?.lines?.length) return null;
  return (
    <div
      style={{
        position: "fixed",
        left: tip.x + 12,
        top: tip.y + 12,
        zIndex: 9999,
        pointerEvents: "none",
        background: "#1f2937",
        color: "#f9fafb",
        padding: "8px 12px",
        borderRadius: "8px",
        fontSize: "12px",
        fontWeight: 500,
        lineHeight: 1.45,
        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
      }}
    >
      {tip.lines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  );
}

function useChartTooltip() {
  const [tip, setTip] = useState(null);
  const moveTip = (e) => {
    setTip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : null));
  };
  const showTip = (e, lines) => {
    setTip({ x: e.clientX, y: e.clientY, lines });
  };
  const hideTip = () => setTip(null);
  return { tip, moveTip, showTip, hideTip };
}

/** Grouped bars Jun–Nov — invoiced (blue) vs collected (amber), matches reference layout */
function InvoicingActivityChart({ data = [] }) {
  const { tip, moveTip, showTip, hideTip } = useChartTooltip();
  const months = data.length ? data.map(d => d.month) : ["—"];
  const invoiced = data.length ? data.map(d => d.invoiced) : [0];
  const collected = data.length ? data.map(d => d.collected) : [0];
  const max = Math.max(...invoiced, ...collected, 1);
  const H = 200;
  const barW = 14;
  const gap = 6;
  const groupW = barW * 2 + gap;
  const chartW = months.length * (groupW + 16);
  const baseY = H - 28;

  return (
    <section
      style={{ borderRadius: "12px", border: "1px solid #e5e7eb", background: "#fff", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", position: "relative" }}
      onMouseLeave={hideTip}
    >
      <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        <p style={{ fontSize: "14px", fontWeight: 600, color: "#111827", margin: 0 }}>Invoicing Activity - Last 6 Months</p>
        <span style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "4px 10px", background: "#f9fafb" }}>Invoice vs Collection</span>
      </div>
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${chartW} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block" }}
        onMouseMove={moveTip}
      >
        {months.map((m, i) => {
          const x0 = 24 + i * (groupW + 16);
          const h1 = (invoiced[i] / max) * (baseY - 16);
          const h2 = (collected[i] / max) * (baseY - 16);
          return (
            <g key={m}>
              <rect
                x={x0}
                y={baseY - h1}
                width={barW}
                height={h1}
                rx={3}
                fill="#93c5fd"
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) => showTip(e, [`${m}`, "Invoiced", `₹${(invoiced[i] / 100000).toFixed(1)}L`])}
              />
              <rect
                x={x0 + barW + gap}
                y={baseY - h2}
                width={barW}
                height={h2}
                rx={3}
                fill="#fcd34d"
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) => showTip(e, [`${m}`, "Collected", `₹${(collected[i] / 100000).toFixed(1)}L`])}
              />
              <text x={x0 + groupW / 2} y={H - 8} textAnchor="middle" fill="#6b7280" fontSize="11" fontWeight={600}>{m}</text>
            </g>
          );
        })}
      </svg>
      <ChartTooltip tip={tip} />
      <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "8px", fontSize: "12px", color: "#6b7280" }}>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#93c5fd", borderRadius: 2, marginRight: 6, verticalAlign: "middle" }} /> Invoiced</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#fcd34d", borderRadius: 2, marginRight: 6, verticalAlign: "middle" }} /> Collected</span>
      </div>
    </section>
  );
}

/** Donut — aging buckets, matches reference layout */
function DebtorsAgingDonut({ data = [] }) {
  const { tip, moveTip, showTip, hideTip } = useChartTooltip();
  let segments = data.map(d => ({ label: d.label, pct: d.pct, color: d.color })).filter(d => d.pct > 0);
  if (segments.length === 0) segments = [{ label: "No Data", pct: 100, color: "#e5e7eb" }];
  const cx = 120;
  const cy = 120;
  const r = 72;
  const inner = 44;
  let angle = -Math.PI / 2;
  const paths = segments.map((s) => {
    let a = (s.pct / 100) * Math.PI * 2;
    if (a >= Math.PI * 2) a -= 0.0001; // fix SVG Arc bug for full circles
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    const startAngle = angle;
    angle += a;
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const large = a > Math.PI ? 1 : 0;
    const d = `M ${cx + inner * Math.cos(startAngle)} ${cy + inner * Math.sin(startAngle)} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${cx + inner * Math.cos(angle)} ${cy + inner * Math.sin(angle)} A ${inner} ${inner} 0 ${large} 0 ${cx + inner * Math.cos(startAngle)} ${cy + inner * Math.sin(startAngle)} Z`;
    return (
      <path
        key={s.label}
        d={d}
        fill={s.color}
        stroke="#fff"
        strokeWidth="2"
        style={{ cursor: "pointer" }}
        onMouseEnter={(e) => showTip(e, [s.label, `${s.pct}% of outstanding`])}
      />
    );
  });

  return (
    <section
      style={{ borderRadius: "12px", border: "1px solid #e5e7eb", background: "#fff", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", position: "relative" }}
      onMouseLeave={hideTip}
    >
      <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: "14px", fontWeight: 600, color: "#111827", margin: 0 }}>Debtors Aging Analysis</p>
        <span style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 600 }}>As of Nov 2025</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "24px" }}>
        <svg width={240} height={240} viewBox="0 0 240 240" onMouseMove={moveTip}>
          {paths}
          <text x={cx} y={cy - 4} textAnchor="middle" fill="#111827" fontSize="14" fontWeight={700}>100%</text>
          <text x={cx} y={cy + 12} textAnchor="middle" fill="#6b7280" fontSize="11">Outstanding</text>
        </svg>
        <div style={{ display: "grid", gap: "8px", fontSize: "12px" }}>
          {segments.map((s) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "8px", color: "#374151" }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
              {s.label} <span style={{ color: "#9ca3af" }}>({s.pct}%)</span>
            </div>
          ))}
        </div>
      </div>
      <ChartTooltip tip={tip} />
    </section>
  );
}

/** Owner category collection efficiency — reference layout */
function CollectionEfficiencyByOwner({ data = [] }) {
  const { tip, moveTip, showTip, hideTip } = useChartTooltip();
  const categories = data.length ? data.map(d => d.category) : ["—"];
  const invoiced = data.length ? data.map(d => d.invoiced) : [0];
  const collected = data.length ? data.map(d => d.collected) : [0];
  const max = Math.max(...invoiced, ...collected, 1);
  const H = 200;
  const barW = 16;
  const gap = 8;
  const groupW = barW * 2 + gap;
  const chartW = categories.length * (groupW + 48);

  return (
    <section
      style={{ borderRadius: "12px", border: "1px solid #e5e7eb", background: "#fff", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", position: "relative" }}
      onMouseLeave={hideTip}
    >
      <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        <p style={{ fontSize: "14px", fontWeight: 600, color: "#111827", margin: 0 }}>Collection Efficiency by Owner Category</p>
        <span style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", background: "#f3f4f6", padding: "4px 10px", borderRadius: "8px" }}>Nov 2025</span>
      </div>
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${chartW} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block" }}
        onMouseMove={moveTip}
      >
        {categories.map((c, i) => {
          const x0 = 40 + i * (groupW + 48);
          const baseY = H - 52;
          const h1 = (invoiced[i] / max) * (baseY - 20);
          const h2 = (collected[i] / max) * (baseY - 20);
          const words = c.split(" ");
          const mid = Math.ceil(words.length / 2);
          const line1 = words.slice(0, mid).join(" ");
          const line2 = words.slice(mid).join(" ");
          const eff = invoiced[i] ? `Efficiency: ${((collected[i] / invoiced[i]) * 100).toFixed(1)}%` : "Efficiency: —";
          return (
            <g key={c}>
              <rect
                x={x0}
                y={baseY - h1}
                width={barW}
                height={h1}
                rx={3}
                fill="#93c5fd"
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) => showTip(e, [c, "Invoiced", `₹${(invoiced[i] / 100000).toFixed(1)}L`, eff])}
              />
              <rect
                x={x0 + barW + gap}
                y={baseY - h2}
                width={barW}
                height={h2}
                rx={3}
                fill="#fdba74"
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) => showTip(e, [c, "Collected", `₹${(collected[i] / 100000).toFixed(1)}L`, eff])}
              />
              <text x={x0 + groupW / 2} y={H - 28} textAnchor="middle" fill="#6b7280" fontSize="10" fontWeight={600}>
                <tspan x={x0 + groupW / 2} dy="0">{line1}</tspan>
                <tspan x={x0 + groupW / 2} dy="12">{line2}</tspan>
              </text>
            </g>
          );
        })}
      </svg>
      <ChartTooltip tip={tip} />
      <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "4px", fontSize: "12px", color: "#6b7280" }}>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#93c5fd", borderRadius: 2, marginRight: 6, verticalAlign: "middle" }} /> Invoiced</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#fdba74", borderRadius: 2, marginRight: 6, verticalAlign: "middle" }} /> Collected</span>
      </div>
    </section>
  );
}

function TopOverdueTenants({ rows, loading, onNavigate }) {
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => parseAmountString(b.total) - parseAmountString(a.total));
  }, [rows]);

  return (
    <section style={{ borderRadius: "12px", border: "1px solid #e5e7eb", background: "#fff", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div style={{ marginBottom: "14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        <p style={{ fontSize: "14px", fontWeight: 600, color: "#111827", margin: 0 }}>Top Overdue Tenants</p>
        <button
          type="button"
          onClick={() => onNavigate("Collections")}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 600, color: "#2563eb", padding: 0 }}
        >
          Settle →
        </button>
      </div>
      {loading ? <LoadingSpinner /> : sorted.length === 0 ? (
        <EmptyState message="No overdue tenants" />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: "520px", fontSize: "13px", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                {["Tenant", "Unit", "Overdue", "Days", "Action"].map((h) => (
                  <th key={h} style={{ padding: "8px 6px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, 5).map((row) => (
                <tr key={row.tenant + row.unit} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px 6px", fontWeight: 500, color: "#111827" }}>{row.tenant}</td>
                  <td style={{ padding: "10px 6px", color: "#6b7280" }}>{row.unit}</td>
                  <td style={{ padding: "10px 6px", color: "#dc2626", fontWeight: 600 }}>₹{row.total}</td>
                  <td style={{ padding: "10px 6px", color: "#b45309", fontWeight: 600 }}>{overdueDaysLabel(row)}</td>
                  <td style={{ padding: "10px 6px" }}>
                    <button
                      type="button"
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

function UninvoicedUnits({ rows, loading, onNavigate }) {
  const titleMonth = new Date().toLocaleString("en-IN", { month: "long", year: "numeric" });

  return (
    <section style={{ borderRadius: "12px", border: "1px solid #fbbf24", background: "#fff", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div style={{ marginBottom: "14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        <p style={{ fontSize: "14px", fontWeight: 600, color: "#111827", margin: 0 }}>Uninvoiced Units - {titleMonth}</p>
        <button
          type="button"
          onClick={() => onNavigate("Invoicing")}
          style={{ borderRadius: "20px", background: "#2563eb", padding: "6px 16px", fontSize: "12px", fontWeight: 600, color: "#fff", border: "none", cursor: "pointer" }}
        >
          Generate Invoices →
        </button>
      </div>
      {loading ? <LoadingSpinner /> : rows.length === 0 ? (
        <EmptyState message="No uninvoiced units for this period" />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: "680px", fontSize: "13px", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                {["Unit", "Owner", "Tenant", "Lease Type", "Monthly Rent", "Status"].map((h) => (
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
                  <td style={{ padding: "10px 6px" }}>
                    <span style={{ borderRadius: "20px", background: "#dbeafe", padding: "2px 8px", fontSize: "11px", color: "#1d4ed8", fontWeight: 500 }}>{row.lease_type}</span>
                  </td>
                  <td style={{ padding: "10px 6px", fontWeight: 600, color: "#111827" }}>₹{Number(row.monthly_rent || 0).toLocaleString("en-IN")}</td>
                  <td style={{ padding: "10px 6px" }}>
                    <span style={{ borderRadius: "20px", background: "#fef3c7", padding: "2px 8px", fontSize: "11px", color: "#b45309", fontWeight: 500 }}>Pending</span>
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

export default function LeaseOSDashboardUI({ onNavigate }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [kpiCards, setKpiCards] = useState([]);
  const [overdueRows, setOverdueRows] = useState([]);
  const [uninvoicedRows, setUninvoicedRows] = useState([]);
  const [activityData, setActivityData] = useState([]);
  const [agingData, setAgingData] = useState([]);
  const [ownerData, setOwnerData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [kpis, aging, uninvoicedLeases, activity, agingSummary, owners] = await Promise.all([
          fetchDashboardKPIs(),
          fetchAgingRows(),
          fetchUninvoicedLeases(),
          fetchMonthlyInvoicingActivity(),
          fetchAgingSummary(),
          fetchOwnerReport()
        ]);
        const displayKpis = kpis.map((c, i) => mapKpiForDisplay(c, i));
        setKpiCards(displayKpis);
        setOverdueRows(aging);
        setUninvoicedRows(
          uninvoicedLeases.map((l) => ({
            unit_no: l.units?.unit_number ?? "—",
            owner_name: l.owner?.company_name || `${l.owner?.first_name || ""} ${l.owner?.last_name || ""}`.trim() || "—",
            tenant_name: l.tenant?.brand_name || l.tenant?.company_name || `${l.tenant?.first_name || ""} ${l.tenant?.last_name || ""}`.trim() || "—",
            lease_type: formatRentModel(l.rent_model),
            monthly_rent: l.monthly_rent ?? l.mg_amount ?? 0,
          })),
        );

        setActivityData(activity);

        const totalAging = agingSummary.reduce((sum, b) => sum + (b.rawTotal || 0), 0);
        setAgingData(
          agingSummary.map(b => ({
            label: b.label.replace(" Days", "d").replace("> ", ">").trim() + (b.label.includes(">") ? "+" : ""),
            pct: totalAging > 0 ? Math.round(((b.rawTotal || 0) / totalAging) * 100) : 0,
            color: b.tone === "teal" ? "#0ea5e9" : b.tone === "amber" ? "#eab308" : b.tone === "orange" ? "#f59e0b" : "#ef4444"
          }))
        );

        const ownerCats = { "External Investors": { invoiced: 0, collected: 0 }, "Close Group": { invoiced: 0, collected: 0 }, "Developer Pool": { invoiced: 0, collected: 0 } };
        for (const o of owners) {
          const c = o.category || "External Investors";
          if (!ownerCats[c]) ownerCats[c] = { invoiced: 0, collected: 0 };
          ownerCats[c].invoiced += Number(String(o.invoiced).replace(/,/g, "")) || 0;
          ownerCats[c].collected += Number(String(o.collected).replace(/,/g, "")) || 0;
        }
        setOwnerData(Object.entries(ownerCats).map(([cat, d]) => ({ category: cat, invoiced: d.invoiced, collected: d.collected })));
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
        <TopBar setMobileOpen={setMobileOpen} />
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "12px 16px", color: "#b91c1c", fontSize: "13px" }}>
              ⚠️ {error} — Check Supabase connection and table names.
            </div>
          )}

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

          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: "16px" }}>
            <InvoicingActivityChart data={activityData} />
            <DebtorsAgingDonut data={agingData} />
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: "16px" }}>
            <CollectionEfficiencyByOwner data={ownerData} />
            <TopOverdueTenants rows={overdueRows} loading={loading} onNavigate={onNavigate} />
          </section>

          <UninvoicedUnits rows={uninvoicedRows} loading={loading} onNavigate={onNavigate} />
        </div>
      </main>
    </div>
  );
}
