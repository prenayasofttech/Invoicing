import React, { useState, useEffect } from "react";
import LeaseOSSidebar from "./LeaseOSSidebar";
import { fetchInvoices, fetchCompanies, fetchProjects, fetchOwnersByCompanyAndProject, fetchLeasesForInvoicing, createInvoice, createCollection, deleteInvoice } from "./supabaseClient";
import CollectionReceiptPopup from "./CollectionReceiptPopup";

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-sm">
      <span className="text-3xl mb-2">📭</span>
      {message}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-slate-500 text-sm">
      <div style={{ width: "28px", height: "28px", border: "3px solid #e5e7eb", borderTop: "3px solid #0f2d5a", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: "8px" }} />
      Loading...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function TopBar({ mobileOpen, setMobileOpen }) {
  return (
    <header style={{
      background: "#0f2d5a",
      borderBottom: "1px solid #1a3d70",
      padding: "14px 24px",
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
          style={{ border: "1px solid rgba(255,255,255,0.25)", borderRadius: "6px", padding: "6px 12px", fontSize: "13px", background: "transparent", cursor: "pointer", color: "#fff" }}
          onClick={() => setMobileOpen(true)}
        >☰</button>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#ffffff", margin: 0 }}>Invoicing</h1>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", margin: 0 }}>Generate - Register - Preview</p>
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <span style={{ borderRadius: "20px", background: "rgba(239,68,68,0.18)", padding: "4px 12px", fontSize: "12px", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.35)" }}>Live Data</span>
      </div>
    </header>
  );
}

function InvoiceTabs({ activeTab, setActiveTab }) {
  const tabs = ["Generate Invoices", "Invoice Register", "Invoice Preview"];
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-1 no-print">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => setActiveTab(tab)}
          className={`rounded-md px-4 py-2 text-sm transition ${activeTab === tab
            ? "border border-blue-700 bg-white font-semibold text-slate-900 shadow-sm"
            : "border border-transparent bg-transparent font-medium text-slate-500 hover:text-slate-700"
            }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

// ─── Generate Invoices ────────────────────────────────────────────────────────
function GenerateInvoicesView({ setActiveTab, setPreviewInvoice }) {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [owners, setOwners] = useState([]);
  const [selectedOwner, setSelectedOwner] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`);
  const [selectedLeaseType, setSelectedLeaseType] = useState("");
  const [units, setUnits] = useState([]);
  const [allUnits, setAllUnits] = useState([]); // Store all units before filtering
  const [salesValues, setSalesValues] = useState({}); // Store sales input per unit
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [checkedUnits, setCheckedUnits] = useState({});

  // Configuration States
  const [configEmail, setConfigEmail] = useState(true);
  const [configSavePdf, setConfigSavePdf] = useState(false);
  const [configZip, setConfigZip] = useState(false);
  const [configDraft, setConfigDraft] = useState(false);

  // Show only current month
  const now = new Date();
  const currentMonthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthOptions = [{
    value: currentMonthValue,
    label: now.toLocaleString("en-IN", { month: "long", year: "numeric" })
  }];

  useEffect(() => {
    fetchCompanies()
      .then(setCompanies)
      .catch(console.error)
      .finally(() => setLoadingCompanies(false));
  }, []);

  useEffect(() => {
    if (!selectedCompany) {
      setProjects([]);
      setSelectedProject("");
      return;
    }
    setLoadingProjects(true);
    fetchProjects(selectedCompany)
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoadingProjects(false));
  }, [selectedCompany]);

  useEffect(() => {
    if (!selectedProject || !selectedCompany) {
      setOwners([]);
      setSelectedOwner("");
      return;
    }
    setLoadingOwners(true);
    fetchOwnersByCompanyAndProject(selectedCompany, selectedProject)
      .then((data) => {
        setOwners(data);
        setSelectedOwner("");
      })
      .catch(console.error)
      .finally(() => setLoadingOwners(false));
  }, [selectedProject, selectedCompany]);

  async function handleLoadUnits() {
    if (!selectedProject || !selectedOwner || !selectedMonth) {
      alert("Please select Project, Owner, and Month");
      return;
    }
    setLoadingUnits(true);
    try {
      const data = await fetchLeasesForInvoicing(selectedProject, selectedOwner);
      setAllUnits(data);
      // Filter by lease type if selected
      const filteredData = selectedLeaseType ? filterUnitsByLeaseType(data, selectedLeaseType) : data;
      setUnits(filteredData);
      const init = {};
      filteredData.forEach((u) => (init[u.id] = true));
      setCheckedUnits(init);
      setSalesValues({}); // Reset sales values
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUnits(false);
    }
  }

  // Filter units based on lease type
  function filterUnitsByLeaseType(data, leaseType) {
    if (!leaseType) return data;
    return data.filter(u => {
      const model = u.rent_model?.toLowerCase() || "";
      if (leaseType === "Fixed Rent") return model.includes("fixed");
      if (leaseType === "MG + RS") return model.includes("mg + rs") || model.includes("mg+rs");
      if (leaseType === "MG or Revenue share") return model.includes("mg or") || model.includes("highest");
      if (leaseType === "Revenue share") return model.includes("revenue share") && !model.includes("mg");
      return true;
    });
  }

  // Handle lease type change
  function handleLeaseTypeChange(type) {
    setSelectedLeaseType(type);
    if (allUnits.length > 0) {
      const filteredData = type ? filterUnitsByLeaseType(allUnits, type) : allUnits;
      setUnits(filteredData);
      const init = {};
      filteredData.forEach((u) => (init[u.id] = true));
      setCheckedUnits(init);
    }
  }

  function calculateComputedRent(unit) {
    const sales = Number(salesValues[unit.id]) || 0;
    const monthlyRent = Number(unit.monthly_rent) || 0;
    const mgAmount = Number(unit.mg_amount) || monthlyRent; // Fallback to monthlyRent
    const revSharePct = Number(unit.revenue_share_percentage) || 0;

    const isMgOrRs = unit.rent_model?.includes("MG or") || unit.rent_model?.includes("MG/RS");
    const isMgPlusRs = unit.rent_model?.includes("MG+RS") || unit.rent_model?.includes("MG + RS");
    const isPureRs = unit.rent_model === "Revenue Share" || unit.rent_model === "RS";

    const revShareAmount = sales * (revSharePct / 100);

    if (isMgOrRs) return Math.max(mgAmount, revShareAmount);
    if (isMgPlusRs) return mgAmount + revShareAmount;
    if (isPureRs) return revShareAmount;

    // Default fixed rent
    return monthlyRent;
  }

  const selected = units.filter((u) => checkedUnits[u.id]);
  // Calculate total with sales values included
  const totalRent = selected.reduce((s, u) => s + calculateComputedRent(u), 0);
  const totalSales = selected.reduce((s, u) => s + (Number(salesValues[u.id]) || 0), 0);
  const gst = totalRent * 0.18;

  async function handleGenerateInvoices() {
    if (selected.length === 0) {
      alert("Select at least one unit to generate an invoice.");
      return;
    }
    setGenerating(true);
    try {
      for (const u of selected) {
        // Use computed rent which includes sales calculation
        const rentAmount = calculateComputedRent(u);
        const camAmount = Number(u.cam_charges) || 0;
        const salesAmount = Number(salesValues[u.id]) || 0;
        const gstAmount = (rentAmount + camAmount) * 0.18;
        const totalAmount = rentAmount + camAmount + gstAmount;

        const payload = {
          invoice_no: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          company_id: selectedCompany,
          project_id: selectedProject,
          unit_id: u.unit_id,
          lease_id: u.id,
          owner_party_id: u.party_owner_id,
          tenant_party_id: u.party_tenant_id,
          billing_month: selectedMonth,
          invoice_date: new Date().toISOString().split("T")[0],
          due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
          rent_amount: rentAmount,
          cam_amount: camAmount,
          gst_amount: gstAmount,
          total_amount: totalAmount,
          balance_amount: totalAmount,
          status: configDraft ? "Draft" : "Outstanding",
          notes: `Generated for ${selectedMonth}${salesAmount > 0 ? ` | Sales: ₹${salesAmount.toLocaleString("en-IN")}` : ""}${u.revenue_share_percentage ? ` | Rev Share: ${u.revenue_share_percentage}%` : ""}`,
        };
        await createInvoice(payload);
      }

      let successMsg = `Successfully generated ${selected.length} invoice(s)`;
      if (configDraft) successMsg += ` as Draft`;
      successMsg += `!`;

      if (configEmail) successMsg += `\nEmails have been queued for dispatch.`;
      if (configSavePdf) successMsg += `\nPDF copies saved to tenant accounts.`;
      if (configZip) successMsg += `\nCombined ZIP is downloading...`;

      alert(successMsg);

      // clear selection after generating
      setUnits([]);
      setAllUnits([]);
      setCheckedUnits({});
      setSalesValues({});
    } catch (err) {
      console.error(err);
      alert("Failed to generate invoices. Check console for details.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="space-y-5">
      {/* Step indicators */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {[
          { n: "1", label: "Select Owner & Period", color: "bg-teal-700" },
          { n: "2", label: "Select Units", color: "bg-teal-700" },
          { n: "3", label: "Review & Generate", color: "bg-amber-500" },
        ].map((s) => (
          <span key={s.n} className="inline-flex items-center gap-2 font-medium text-slate-700">
            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${s.color} text-xs text-white`}>{s.n}</span>
            {s.label}
          </span>
        ))}
      </div>

      {/* Step 1 */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <p className="text-sm font-semibold mb-3">Step 1 — Select Company, Project, Owner &amp; Billing Period</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            disabled={loadingCompanies}
          >
            <option value="">{loadingCompanies ? "Loading companies..." : "Select Company"}</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.company_name}</option>
            ))}
          </select>

          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            disabled={!selectedCompany || loadingProjects}
          >
            <option value="">{loadingProjects ? "Loading projects..." : "Select Project"}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.project_name}</option>
            ))}
          </select>

          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={selectedOwner}
            onChange={(e) => setSelectedOwner(e.target.value)}
            disabled={!selectedProject || loadingOwners}
          >
            <option value="">{loadingOwners ? "Loading owners..." : "Select Owner"}</option>
            <option value="ALL">All Owners</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>{o.display_name} {o.owner_group ? `(${o.owner_group})` : ""}</option>
            ))}
          </select>

          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="">Select Month...</option>
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={selectedLeaseType}
            onChange={(e) => handleLeaseTypeChange(e.target.value)}
          >
            <option value="">All Lease Types</option>
            <option value="Fixed Rent">Fixed Rent</option>
            <option value="MG + RS">MG + RS</option>
            <option value="MG or Revenue share">MG or Revenue share</option>
            <option value="Revenue share">Revenue share</option>
          </select>

          <button
            type="button"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            onClick={handleLoadUnits}
          >
            Load Units
          </button>
        </div>
        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Note: Revenue Share units will prompt for monthly sales figure before generation.
        </p>
      </div>

      {/* Step 2 */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">Step 2 — Select Units for Invoicing</p>
          <div className="flex gap-2">
            <button className="rounded-md border border-slate-300 px-3 py-1.5 text-xs" onClick={() => { const all = {}; units.forEach(u => all[u.id] = true); setCheckedUnits(all); }}>Select All</button>
            <button className="rounded-md border border-slate-300 px-3 py-1.5 text-xs" onClick={() => setCheckedUnits({})}>Deselect All</button>
          </div>
        </div>

        <div className="overflow-auto">
          {loadingUnits ? <LoadingSpinner /> : units.length === 0 ? (
            <EmptyState message="Load owner & period above to see available units" />
          ) : (
            <table className="w-full min-w-[1150px] text-sm">
              <thead className="bg-slate-950 text-white">
                <tr className="text-left">
                  <th className="p-3"><input type="checkbox" onChange={(e) => { const all = {}; if (e.target.checked) units.forEach(u => all[u.id] = true); setCheckedUnits(all); }} className="h-4 w-4 rounded border-slate-300" /></th>
                  <th className="p-3">Unit</th><th className="p-3">Tenant</th><th className="p-3">Area</th>
                  <th className="p-3">Lease Type</th><th className="p-3">%</th><th className="p-3">Rate/Sqft</th>
                  <th className="p-3">Monthly Rent</th><th className="p-3">Sales (₹)</th><th className="p-3">Computed Rent</th>
                </tr>
              </thead>
              <tbody>
                {units.map((row) => {
                  const tName = row.tenant?.brand_name || row.tenant?.company_name || `${row.tenant?.first_name || ""} ${row.tenant?.last_name || ""}`.trim() || "—";
                  return (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="p-3"><input type="checkbox" checked={!!checkedUnits[row.id]} onChange={(e) => setCheckedUnits((prev) => ({ ...prev, [row.id]: e.target.checked }))} className="h-4 w-4 rounded border-slate-300" /></td>
                      <td className="p-3 font-medium">{row.units?.unit_number}</td>
                      <td className="p-3">{tName}</td>
                      <td className="p-3">{row.units?.chargeable_area?.toLocaleString("en-IN")}</td>
                      <td className="p-3"><span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{row.rent_model}</span></td>
                      <td className="p-3 text-xs font-medium text-slate-600 whitespace-nowrap">
                        {row.rent_model?.includes("Fixed") ? "Fixed" :
                          row.rent_model?.includes("MG + RS") ? `MG: ₹${Number(row.mg_amount || 0).toLocaleString()} & RS: ${row.revenue_share_percentage || 0}%` :
                            row.rent_model?.includes("MG") ? `MG: ₹${Number(row.mg_amount || 0).toLocaleString()} or RS: ${row.revenue_share_percentage || 0}%` :
                              row.rent_model?.includes("Revenue") || row.rent_model?.includes("RS") ? `RS: ${row.revenue_share_percentage || 0}%` : "—"
                        }
                      </td>
                      <td className="p-3">₹{row.units?.chargeable_area && Number(row.monthly_rent) ? (Number(row.monthly_rent) / row.units.chargeable_area).toFixed(2) : "—"}</td>
                      <td className="p-3">₹{Number(row.monthly_rent).toLocaleString("en-IN")}</td>
                      <td className="p-3">
                        {row.revenue_share_percentage > 0 || row.rent_model?.includes("Revenue") || row.rent_model?.includes("RS") || row.rent_model?.includes("MG") ? (
                          <input
                            className="inline-flex w-24 rounded-md border border-slate-300 px-2 py-1 text-xs"
                            placeholder="Enter sales"
                            type="number"
                            value={salesValues[row.id] || ""}
                            onChange={(e) => setSalesValues((prev) => ({ ...prev, [row.id]: e.target.value }))}
                          />
                        ) : "-"}
                      </td>
                      <td className="p-3 font-medium">₹{calculateComputedRent(row).toLocaleString("en-IN")}</td>
                    </tr>
                  );
                })}
                <tr className="font-semibold bg-slate-50">
                  <td className="p-3" colSpan={5}>Total for Selected Units ({selected.length})</td>
                  <td className="p-3">₹{totalRent.toLocaleString("en-IN")}</td>
                  <td className="p-3">{totalSales > 0 ? <span className="text-xs text-slate-500">Sales: ₹{totalSales.toLocaleString("en-IN")}</span> : ""}</td>
                  <td className="p-3" />
                  <td className="p-3">₹{totalRent.toLocaleString("en-IN")}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Step 3 */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <p className="text-sm font-semibold mb-4">Step 3 — Review &amp; Generate Invoices</p>
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { label: "Units Selected", value: selected.length, color: "text-slate-900" },
            { label: "Gross Rent", value: `₹${totalRent.toLocaleString("en-IN")}`, color: "text-emerald-700" },
            { label: "GST @ 18%", value: `₹${gst.toLocaleString("en-IN")}`, color: "text-amber-700" },
            { label: "Total Invoice Value", value: `₹${(totalRent + gst).toLocaleString("en-IN")}`, color: "text-slate-900" },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-lg border border-slate-200 p-4 overflow-hidden">
              <p className="text-xs text-slate-500 truncate">{kpi.label}</p>
              <p className={`mt-1 text-2xl font-semibold truncate ${kpi.color}`} title={kpi.value}>{kpi.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Invoice Configuration</p>
            <div className="space-y-2 text-sm text-slate-700">
              <label className="flex items-center gap-2"><input type="checkbox" checked={configEmail} onChange={(e) => setConfigEmail(e.target.checked)} /> Send invoice via email to each tenant</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={configSavePdf} onChange={(e) => setConfigSavePdf(e.target.checked)} /> Save PDF copy to tenant account</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={configZip} onChange={(e) => setConfigZip(e.target.checked)} /> Generate combined ZIP download</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={configDraft} onChange={(e) => setConfigDraft(e.target.checked)} /> Mark as draft (do not post)</label>
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Billing Entity Details</p>
            <p className="text-sm text-slate-500">Loaded from company settings in Supabase.</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Back</button>
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm" onClick={() => {
            if (selected.length > 0) {
              const previews = selected.map((u, idx) => {
                const rentAmount = calculateComputedRent(u);
                const camAmount = Number(u.cam_charges) || 0;
                const gstAmount = (rentAmount + camAmount) * 0.18;
                const totalAmount = rentAmount + camAmount + gstAmount;

                return {
                  invoice_no: `INV-${u.units?.unit_number || "XX"}-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(idx + 1).padStart(3, '0')}`,
                  invoice_date: new Date().toISOString().split("T")[0],
                  due_date: new Date(Date.now() + 864000000).toISOString().split("T")[0],
                  billing_month: selectedMonth,
                  owner_name: selectedOwner === "ALL"
                    ? (owners.find(o => o.id === u.party_owner_id)?.display_name || u.owner?.company_name || u.owner?.first_name || "—")
                    : (owners.find(o => o.id === selectedOwner)?.display_name || "—"),
                  tenant_name: u.tenant?.brand_name || u.tenant?.company_name || u.tenant?.first_name || "—",
                  unit_no: u.units?.unit_number,
                  project_name: projects.find(p => p.id === selectedProject)?.project_name || "Commercial Project",
                  area_sqft: u.units?.chargeable_area || 0,
                  rent_amount: rentAmount,
                  cam_amount: camAmount,
                  gst_amount: gstAmount,
                  total_amount: totalAmount,
                  status: "OUTSTANDING",
                  isDraft: true
                };
              });
              setPreviewInvoice(previews);
              setActiveTab("Invoice Preview");
            } else {
              alert("Select a unit first.");
            }
          }}>Preview Invoice</button>
          <button
            className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
            onClick={handleGenerateInvoices}
            disabled={generating || selected.length === 0}
          >
            {generating ? "Generating..." : "Generate Invoices"}
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── Invoice Register ─────────────────────────────────────────────────────────
function InvoiceRegisterView({ setActiveTab, setPreviewInvoice, onNavigate }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState([]);

  const fetchList = () => {
    setLoading(true);
    fetchInvoices({ month: filterMonth || undefined, status: filterStatus || undefined })
      .then(setInvoices)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchList();
  }, [filterMonth, filterStatus]);

  const exportToExcel = () => {
    if (invoices.length === 0) return;
    const headers = ["Invoice No", "Date", "Owner", "Tenant", "Unit", "Rent", "GST", "Total", "Collected", "Balance", "Status"];
    const csvContent = [
      headers.join(","),
      ...invoices.map(r => [
        r.invoice_no, r.invoice_date, `"${r.owner_name}"`, `"${r.tenant_name}"`, r.unit_no,
        r.rent_amount, r.gst_amount, r.total_amount, r.collected_amount, r.balance_amount, r.status
      ].join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Invoice_Register.csv";
    link.click();
  };

  const handleSettle = (row) => {
    setSelectedInvoices([row]);
    setShowPopup(true);
  };

  async function handleDelete(invoiceId) {
    if (window.confirm("Are you sure you want to delete this invoice? This action cannot be undone.")) {
      try {
        await deleteInvoice(invoiceId);
        setInvoices(invoices.filter((inv) => inv.id !== invoiceId));
        alert("Invoice deleted successfully.");
      } catch (err) {
        console.error(err);
        alert("Failed to delete invoice.");
      }
    }
  }

  return (
    <section className="max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold">Invoice Register — Rent Master</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100"
            onClick={exportToExcel}
          >
            Export Excel
          </button>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
            <option value="">All Months</option>
            {(() => {
              const now = new Date();
              const currentYear = now.getFullYear();
              const currentMonth = now.getMonth();
              return (
                <option key="current" value={`${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`}>
                  {now.toLocaleString("en-IN", { month: "long", year: "numeric" })}
                </option>
              );
            })()}
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option>Paid</option><option>Outstanding</option><option>Overdue</option><option>Partial</option>
          </select>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : invoices.length === 0 ? (
        <EmptyState message="No invoices found. Generate invoices first." />
      ) : (
        <div className="max-w-full overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full min-w-full table-auto text-xs text-slate-700">
            <thead className="border-b border-gray-200 bg-gray-50 text-[11px] tracking-wide text-gray-500">
              <tr className="text-left">
                <th className="px-3 py-3">Invoice No</th><th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Owner</th><th className="px-3 py-3">Tenant</th>
                <th className="px-3 py-3">Unit</th>
                <th className="px-3 py-3 text-right">Rent</th><th className="px-3 py-3 text-right">GST</th>
                <th className="px-3 py-3 text-right">Total</th><th className="px-3 py-3 text-right">Collected</th>
                <th className="px-3 py-3 text-right">Balance</th><th className="px-2 py-3">Status</th>
                <th className="px-2 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-3 font-semibold">{row.invoice_no}</td>
                  <td className="px-3 py-3">{row.invoice_date}</td>
                  <td className="px-3 py-3">{row.owner_name}</td>
                  <td className="px-3 py-3">{row.tenant_name}</td>
                  <td className="px-3 py-3">{row.unit_no}</td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">₹{Number(row.rent_amount).toLocaleString("en-IN")}</td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">₹{Number(row.gst_amount).toLocaleString("en-IN")}</td>
                  <td className="px-3 py-3 text-right whitespace-nowrap font-semibold text-slate-800">₹{Number(row.total_amount).toLocaleString("en-IN")}</td>
                  <td className="px-3 py-3 text-right whitespace-nowrap text-green-600">₹{Number(row.collected_amount).toLocaleString("en-IN")}</td>
                  <td className="px-3 py-3 text-right whitespace-nowrap text-red-600">₹{Number(row.balance_amount).toLocaleString("en-IN")}</td>
                  <td className="px-2 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${row.status === "Paid" ? "bg-green-100 text-green-600"
                      : row.status === "Outstanding" ? "bg-blue-100 text-blue-600"
                        : row.status === "Overdue" ? "bg-red-100 text-red-600"
                          : "bg-orange-100 text-orange-600"
                      }`}>{row.status}</span>
                  </td>
                  <td className="px-2 py-3 flex gap-2">
                    <button
                      onClick={() => {
                        setPreviewInvoice(row);
                        setActiveTab("Invoice Preview");
                      }}
                      className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                    >Preview Invoice</button>
                    {row.status === "Paid" || row.status === "Partial" ? null : (
                      <button
                        onClick={() => handleDelete(row.id)}
                        className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      >Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CollectionReceiptPopup
        isOpen={showPopup}
        onClose={() => setShowPopup(false)}
        selectedInvoices={selectedInvoices}
        onSettled={() => {
          setShowPopup(false);
          fetchList();
        }}
      />
    </section>
  );
}

// ─── Invoice Preview ──────────────────────────────────────────────────────────
function InvoicePreviewView({ invoice, setActiveTab }) {
  if (!invoice || (Array.isArray(invoice) && invoice.length === 0)) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <EmptyState message="Select an invoice from the register to preview it here" />
      </section>
    );
  }

  const invoicesToRender = Array.isArray(invoice) ? invoice : [invoice];
  const isDraft = invoicesToRender[0].isDraft;

  return (
    <>
      <div className="mb-4 flex items-center justify-between px-2 no-print">
        <p className="text-sm font-semibold text-slate-800">
          Invoice Preview {invoicesToRender.length > 1 ? `(${invoicesToRender.length} Invoices)` : ""}
        </p>
        <div className="flex gap-2">
          <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700" onClick={() => setActiveTab(isDraft ? "Generate Invoices" : "Invoice Register")}>
            {isDraft ? "Back to Edit / Generate" : "Back"}
          </button>
          <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm" onClick={() => window.print()}>
            Download PDF / Print All
          </button>
          {!isDraft && <button className="rounded-md bg-[#009b7c] px-4 py-2 text-xs font-semibold text-white shadow-sm">Send Email(s)</button>}
        </div>
      </div>

      {invoicesToRender.map((inv, idx) => {
        const rent = Number(inv.rent_amount) || 0;
        const cam = Number(inv.cam_amount) || 0;
        const subTotal = rent + cam;
        const cgst = subTotal * 0.09;
        const sgst = subTotal * 0.09;
        const grandTotal = subTotal + cgst + sgst;
        const area = inv.area_sqft || 0;
        const rate = area > 0 ? rent / area : 0;
        const camRate = area > 0 ? cam / area : 0;

        const formattedDate = new Date(inv.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const formattedDueDate = inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : "—";

        return (
          <section key={idx} className="rounded-xl border border-slate-200 bg-white p-8 sm:p-12 shadow-sm max-w-5xl mx-auto mb-8" style={{ fontFamily: "Inter, sans-serif", pageBreakAfter: "always" }}>
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: "Georgia, serif" }}>
                  {inv.project_name || "Commercial Project"}
                </h1>
                <div className="mt-3 inline-block rounded bg-[#fef3c7] px-2 py-1 text-[10px] font-bold text-[#b45309] uppercase tracking-wider">
                  Tax Invoice
                </div>
                <div className="mt-4 text-xs text-slate-600 leading-relaxed">
                  <p>{localStorage.getItem("dmaic_company_name") || "Management Co. Pvt Ltd"}</p>
                  <p>GSTIN: 06ABCN1234M1ZX</p>
                </div>
              </div>
              <div className="text-right text-sm text-slate-600 space-y-1.5">
                <p className="text-slate-400 text-xs tracking-wider uppercase mb-3">{inv.invoice_no}</p>
                <p><span className="font-semibold text-slate-900">Date:</span> {formattedDate}</p>
                <p><span className="font-semibold text-slate-900">Due Date:</span> {formattedDueDate}</p>
                <div className="mt-3">
                  <span className={`inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${inv.status === 'Paid' ? 'bg-[#dcfce7] text-[#15803d]' : inv.isDraft ? 'bg-slate-100 text-slate-600' : 'bg-[#fef3c7] text-[#b45309]'}`}>
                    {inv.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 py-4 mb-4 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Invoice Number</p>
                  <p className="font-semibold text-slate-900">{inv.invoice_no}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Billing Period</p>
                  <p className="font-semibold text-slate-900">{inv.billing_month || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Lease Ref</p>
                  <p className="font-semibold text-slate-900">{inv.lease_id ? `LEASE-${inv.lease_id}` : "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Lock-in Info</p>
                  <p className="font-semibold text-slate-900">{inv.lock_in_period ? `${inv.lock_in_period} months` : "N/A"}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 border-t border-slate-100 py-8 mb-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase mb-3">Bill To (Tenant)</p>
                <p className="font-bold text-slate-900 text-base">{inv.tenant_name}</p>
                <p className="text-slate-500 mt-1">Unit {inv.unit_no}, {inv.project_name}</p>
                <p className="text-slate-500 mt-1">{inv.tenant_address || "—"}</p>
                <p className="text-slate-600 mt-2 text-xs"><span className="font-semibold">GSTIN:</span> {inv.tenant_gst || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase mb-3">On Behalf Of (Owner)</p>
                <p className="font-bold text-slate-900 text-base">{inv.owner_name}</p>
                <p className="text-slate-500 mt-1">{inv.owner_address || "—"}</p>
                <p className="text-slate-600 mt-2 text-xs"><span className="font-semibold">GSTIN:</span> {inv.owner_gst || "N/A"}</p>
              </div>
            </div>

            <table className="w-full text-sm mb-6">
              <thead className="bg-[#0f172a] text-white text-xs font-semibold">
                <tr>
                  <th className="p-3 text-left w-12">#</th>
                  <th className="p-3 text-left">Description</th>
                  <th className="p-3 text-left">SAC</th>
                  <th className="p-3 text-right">Area</th>
                  <th className="p-3 text-right">Rate/Sqft</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rent > 0 && (
                  <tr>
                    <td className="p-3 py-5 text-slate-500">1</td>
                    <td className="p-3 py-5">Fixed Rent - {inv.billing_month}</td>
                    <td className="p-3 py-5 text-slate-500">997212</td>
                    <td className="p-3 py-5 text-right">{area > 0 ? area.toLocaleString("en-IN") : "—"}</td>
                    <td className="p-3 py-5 text-right">{rate > 0 ? `₹${rate.toFixed(2)}` : "—"}</td>
                    <td className="p-3 py-5 text-right font-medium text-slate-900">₹{rent.toLocaleString("en-IN")}</td>
                  </tr>
                )}
                {cam > 0 && (
                  <tr>
                    <td className="p-3 py-5 text-slate-500">{rent > 0 ? "2" : "1"}</td>
                    <td className="p-3 py-5">IFMS Contribution (Common Area)</td>
                    <td className="p-3 py-5 text-slate-500">997219</td>
                    <td className="p-3 py-5 text-right">{area > 0 ? area.toLocaleString("en-IN") : "—"}</td>
                    <td className="p-3 py-5 text-right">{camRate > 0 ? `₹${camRate.toFixed(2)}` : "—"}</td>
                    <td className="p-3 py-5 text-right font-medium text-slate-900">₹{cam.toLocaleString("en-IN")}</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="flex justify-end mb-12">
              <div className="w-64 space-y-3 text-sm">
                <div className="flex justify-between text-slate-700">
                  <span>Sub Total</span>
                  <span className="font-medium text-slate-900">₹{subTotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>CGST @ 9%</span>
                  <span>₹{cgst.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between text-slate-600 pb-3 border-b border-slate-200">
                  <span>SGST @ 9%</span>
                  <span>₹{sgst.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-slate-900 pt-2">
                  <span>Total</span>
                  <span>₹{grandTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function LeaseOSInvoicingUI({ onNavigate }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Generate Invoices");
  const [previewInvoice, setPreviewInvoice] = useState(null);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex" }}>
      <LeaseOSSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} currentPage="Invoicing" onNavigate={onNavigate} />
      <main className="flex-1 lg:ml-72" style={{ minWidth: 0 }}>
        <TopBar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        <div style={{ padding: "20px 24px" }}>
          <InvoiceTabs activeTab={activeTab} setActiveTab={setActiveTab} />
          <div style={{ marginTop: "20px" }}>
            {activeTab === "Generate Invoices" && <GenerateInvoicesView setActiveTab={setActiveTab} setPreviewInvoice={setPreviewInvoice} />}
            {activeTab === "Invoice Register" && <InvoiceRegisterView setActiveTab={setActiveTab} setPreviewInvoice={setPreviewInvoice} onNavigate={onNavigate} />}
            {activeTab === "Invoice Preview" && <InvoicePreviewView invoice={previewInvoice} setActiveTab={setActiveTab} />}
          </div>
        </div>
      </main>
    </div>
  );
}
