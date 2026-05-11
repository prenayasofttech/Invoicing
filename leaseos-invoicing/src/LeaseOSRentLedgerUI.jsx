import React, { useState, useEffect } from "react";
import LeaseOSSidebar from "./LeaseOSSidebar";
import {
  fetchAgingSummary,
  fetchAgingRows,
  fetchTenantStatement,
  fetchOwnerReport,
  fetchActiveTenantParties,
} from "./supabaseClient";
import CollectionReceiptPopup from "./CollectionReceiptPopup";

function EmptyState({ message, icon = "📭" }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-sm">
      <span className="text-5xl mb-4">{icon}</span>
      <p className="text-lg font-medium text-slate-500">{message}</p>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-sm">
      <div style={{ width: "32px", height: "32px", border: "3px solid #e5e7eb", borderTop: "3px solid #0f2d5a", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: "12px" }} />
      Loading data...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function TopBar({ mobileOpen, setMobileOpen }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm no-print">
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="lg:hidden rounded bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
          onClick={() => setMobileOpen(true)}
        >☰</button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Georgia, serif" }}>Rent Ledger</h1>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Live Sync
        </span>
      </div>
    </header>
  );
}

// ─── DEBTORS AGING VIEW ────────────────────────────────────────────────────────
function DebtorsAgingView({ loadData, agingSummary, rows, loadingSummary, loadingRows, onSettle }) {
  const [filterTenant, setFilterTenant] = useState("");

  const filteredRows = rows.filter(r =>
    !filterTenant || r.tenant.toLowerCase().includes(filterTenant.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Alert Ribbon */}
      {rows.length > 0 && rows.some(r => r.d90 !== "-") && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-md flex items-start">
          <span className="text-rose-500 mr-3 text-lg">⚠️</span>
          <div>
            <h3 className="text-sm font-semibold text-rose-800">Critical Outstanding Alert</h3>
            <p className="text-xs text-rose-600 mt-1">Some tenants have invoices overdue by more than 90 days. Immediate action required.</p>
          </div>
        </div>
      )}

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingSummary ? (
          Array(4).fill(0).map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />)
        ) : (
          agingSummary.map((kpi, i) => {
            let colors = { bg: "bg-white", border: "border-slate-200", text: "text-slate-800", label: "text-slate-500" };
            if (kpi.tone === "teal") colors = { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-900", label: "text-teal-700" };
            if (kpi.tone === "amber") colors = { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900", label: "text-amber-700" };
            if (kpi.tone === "orange") colors = { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-900", label: "text-orange-700" };
            if (kpi.tone === "rose") colors = { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-900", label: "text-rose-700" };

            return (
              <div key={i} className={`rounded-xl border p-5 shadow-sm overflow-hidden ${colors.bg} ${colors.border}`}>
                <p className={`text-xs font-bold tracking-wider uppercase mb-2 truncate ${colors.label}`}>{kpi.label}</p>
                <p className={`text-3xl font-extrabold truncate ${colors.text}`} title={kpi.value}>{kpi.value}</p>
                <div className="mt-3 flex items-center justify-between text-xs font-medium opacity-80">
                  <span className={colors.text}>{kpi.meta}</span>
                  {kpi.tone === "rose" && <span className="bg-rose-600 text-white px-2 py-0.5 rounded text-[10px]">High Risk</span>}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Filters & Export */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex gap-3 flex-1 min-w-[300px]">
          <input
            type="text"
            placeholder="Search tenant name..."
            className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={filterTenant}
            onChange={(e) => setFilterTenant(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">Export Excel</button>
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800" onClick={() => window.print()}>Print Report</button>
        </div>
      </div>

      {/* Detailed Aging Table */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-base font-bold text-slate-800">Detailed Aging Report</h2>
        </div>
        <div className="overflow-x-auto">
          {loadingRows ? <LoadingSpinner /> : filteredRows.length === 0 ? (
            <EmptyState message="No outstanding debtors " icon="" />
          ) : (
            <table className="w-full min-w-[1200px] text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr className="text-left">
                  <th className="px-6 py-4">Tenant & Unit</th>
                  <th className="px-6 py-4 text-right">Total Outstanding</th>
                  <th className="px-6 py-4 text-right">0–30 Days</th>
                  <th className="px-6 py-4 text-right">31–60 Days</th>
                  <th className="px-6 py-4 text-right">61–90 Days</th>
                  <th className="px-6 py-4 text-right">&gt; 90 Days</th>
                  <th className="px-6 py-4">Status & Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row, idx) => {
                  const hasCritical = row.d90 !== "-";
                  const hasWarning = row.d61 !== "-";
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{row.tenant}</p>
                        <p className="text-xs text-slate-500">Unit: {row.unit}</p>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">₹{row.total}</td>
                      <td className="px-6 py-4 text-right font-medium text-emerald-600">{row.d0 === "-" ? "-" : `₹${row.d0}`}</td>
                      <td className="px-6 py-4 text-right font-medium text-amber-600">{row.d31 === "-" ? "-" : `₹${row.d31}`}</td>
                      <td className="px-6 py-4 text-right font-medium text-orange-600">{row.d61 === "-" ? "-" : `₹${row.d61}`}</td>
                      <td className="px-6 py-4 text-right font-bold text-rose-600">{row.d90 === "-" ? "-" : `₹${row.d90}`}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex flex-col gap-1 w-24">
                            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                              {row.d0 !== "-" && <div className="bg-emerald-500 h-full" style={{ width: '25%' }} />}
                              {row.d31 !== "-" && <div className="bg-amber-500 h-full" style={{ width: '25%' }} />}
                              {row.d61 !== "-" && <div className="bg-orange-500 h-full" style={{ width: '25%' }} />}
                              {row.d90 !== "-" && <div className="bg-rose-500 h-full" style={{ width: '25%' }} />}
                            </div>
                            <span className="text-[10px] font-semibold text-slate-400">
                              {hasCritical ? "CRITICAL" : hasWarning ? "WARNING" : "NORMAL"}
                            </span>
                          </div>
                          <button
                            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
                            onClick={() => onSettle(row.invoices)}
                          >
                            Settle
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── TENANT STATEMENT VIEW ──────────────────────────────────────────────────
function TenantStatementView({ tenants, loadingTenants }) {
  const [selectedKey, setSelectedKey] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedKey) { setRows([]); return; }
    const [tenantPartyId, _] = selectedKey.split("||");
    setLoading(true);
    fetchTenantStatement(tenantPartyId)
      .then(setRows)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedKey]);

  let runningBalance = 0;
  let totalDebit = 0;
  let totalCredit = 0;

  const processedRows = rows.map((inv) => {
    const d = Number(inv.total_amount) || 0;
    const c = Number(inv.collected_amount) || 0;
    runningBalance += d;
    runningBalance -= c;
    totalDebit += d;
    totalCredit += c;
    return {
      date: new Date(inv.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      particulars: `Invoice ${inv.invoice_no}`,
      debit: d > 0 ? `₹${d.toLocaleString("en-IN")}` : "—",
      credit: c > 0 ? `₹${c.toLocaleString("en-IN")}` : "—",
      balance: `₹${runningBalance.toLocaleString("en-IN")}`,
      remarks: c > 0 && c >= d ? "Settled" : c > 0 ? "Partial" : "Unpaid"
    };
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Account Statement Generation</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[250px]">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Select Tenant</label>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              disabled={loadingTenants}
            >
              <option value="">{loadingTenants ? "Loading tenants..." : "Search & Select Tenant..."}</option>
              {tenants.map((t, i) => (
                <option key={i} value={`${t.id}||${t.unit_no}`}>{t.display_name} — Unit {t.unit_no}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Date Range</label>
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-40">
              <option>All Time</option>
              <option>This Financial Year</option>
              <option>Last 6 Months</option>
            </select>
          </div>
          <button className="rounded-md bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800" onClick={() => window.print()}>
            Download PDF
          </button>
        </div>
      </div>

      {selectedKey && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Debit (Invoiced)</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">₹{totalDebit.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Credit (Received)</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">₹{totalCredit.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Closing Balance</p>
            <p className={`mt-1 text-2xl font-bold ${runningBalance > 0 ? "text-rose-600" : "text-slate-900"}`}>₹{runningBalance.toLocaleString("en-IN")}</p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden print-container">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Ledger Entries</h3>
          {selectedKey && <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">Opening Balance: ₹0</span>}
        </div>
        <div className="overflow-x-auto">
          {loading ? <LoadingSpinner /> : !selectedKey ? (
            <EmptyState message="Select a tenant to generate their financial statement." icon="📋" />
          ) : processedRows.length === 0 ? (
            <EmptyState message="No transactions recorded for this tenant." icon="📝" />
          ) : (
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr className="text-left">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Particulars</th>
                  <th className="px-6 py-4 text-right">Debit (₹)</th>
                  <th className="px-6 py-4 text-right">Credit (₹)</th>
                  <th className="px-6 py-4 text-right">Balance (₹)</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">{row.date}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{row.particulars}</td>
                    <td className="px-6 py-4 text-right text-slate-900">{row.debit}</td>
                    <td className="px-6 py-4 text-right text-emerald-600">{row.credit}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">{row.balance}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${row.remarks === 'Settled' ? 'bg-emerald-100 text-emerald-800' : row.remarks === 'Partial' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                        {row.remarks}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── OWNER REPORT VIEW ────────────────────────────────────────────────────
function OwnerReportView() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOwnerReport()
      .then(setRows)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900">Owner Financial Performance</h2>
          <p className="text-xs text-slate-500 mt-0.5">Track invoicing vs collection efficiency per property owner.</p>
        </div>
        <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50" onClick={() => window.print()}>Export Report</button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? <LoadingSpinner /> : rows.length === 0 ? (
            <EmptyState message="No owner data available." icon="🏢" />
          ) : (
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr className="text-left">
                  <th className="px-6 py-4">Owner Name</th>
                  <th className="px-6 py-4 text-center">Units</th>
                  <th className="px-6 py-4 text-right">Total Invoiced</th>
                  <th className="px-6 py-4 text-right">Total Collected</th>
                  <th className="px-6 py-4 text-right">Outstanding</th>
                  <th className="px-6 py-4">Collection Efficiency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, idx) => {
                  const eff = Number(row.efficiency);
                  const displayEff = isNaN(eff) ? 0 : eff;
                  const effColor = displayEff >= 90 ? "bg-emerald-500" : displayEff >= 75 ? "bg-amber-500" : "bg-rose-500";
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{row.owner}</td>
                      <td className="px-6 py-4 text-center text-slate-600">{row.units}</td>
                      <td className="px-6 py-4 text-right font-medium text-slate-900">₹{row.invoiced}</td>
                      <td className="px-6 py-4 text-right font-medium text-emerald-600">₹{row.collected}</td>
                      <td className="px-6 py-4 text-right font-bold text-rose-600">₹{row.outstanding}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold w-9">{displayEff}%</span>
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                            <div className={`h-full ${effColor} transition-all duration-500`} style={{ width: `${displayEff}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN EXPORT ────────────────────────────────────────────────────────────
export default function LeaseOSRentLedgerUI({ onNavigate }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Debtors Aging");

  // Data states
  const [agingSummary, setAgingSummary] = useState([]);
  const [agingRows, setAgingRows] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingRows, setLoadingRows] = useState(true);

  // Tenants for statement
  const [tenants, setTenants] = useState([]);
  const [loadingTenants, setLoadingTenants] = useState(true);

  // Settlement popup state
  const [showPopup, setShowPopup] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState([]);

  const loadAging = () => {
    setLoadingSummary(true);
    setLoadingRows(true);
    fetchAgingSummary()
      .then(setAgingSummary)
      .catch(console.error)
      .finally(() => setLoadingSummary(false));
    fetchAgingRows()
      .then(setAgingRows)
      .catch(console.error)
      .finally(() => setLoadingRows(false));
  };

  useEffect(() => {
    loadAging();
    fetchActiveTenantParties()
      .then(setTenants)
      .catch(console.error)
      .finally(() => setLoadingTenants(false));
  }, []);

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans text-slate-900">
      <LeaseOSSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} currentPage="Rent Ledger" onNavigate={onNavigate} />

      <main className="flex-1 lg:ml-72 flex flex-col min-w-0">
        <TopBar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

        <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {/* Custom ERP Tabs */}
          <div className="mb-8 border-b border-slate-200 no-print">
            <nav className="-mb-px flex gap-6 overflow-x-auto">
              {["Debtors Aging", "Tenant Statement", "Owner Report"].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-semibold transition-colors ${activeTab === tab
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                    }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="pb-12">
            {activeTab === "Debtors Aging" && (
              <DebtorsAgingView
                loadData={loadAging}
                agingSummary={agingSummary}
                rows={agingRows}
                loadingSummary={loadingSummary}
                loadingRows={loadingRows}
                onSettle={(invoices) => {
                  setSelectedInvoices(invoices);
                  setShowPopup(true);
                }}
              />
            )}
            {activeTab === "Tenant Statement" && (
              <TenantStatementView tenants={tenants} loadingTenants={loadingTenants} />
            )}
            {activeTab === "Owner Report" && (
              <OwnerReportView />
            )}
          </div>
        </div>
      </main>

      <CollectionReceiptPopup
        isOpen={showPopup}
        onClose={() => setShowPopup(false)}
        selectedInvoices={selectedInvoices}
        onSettled={() => {
          setShowPopup(false);
          loadAging(); // Live refresh
        }}
      />
    </div>
  );
}
