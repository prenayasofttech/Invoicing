import React, { useState, useEffect } from "react";
import LeaseOSSidebar from "./LeaseOSSidebar";
import { supabase } from "./supabaseClient";
import PartyProfileView from "./LeaseOSPartyProfileUI";
import { useUser } from "./context/UserContext";

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-slate-500 text-sm">
      <div style={{ width: "28px", height: "28px", border: "3px solid #e5e7eb", borderTop: "3px solid #0f2d5a", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: "8px" }} />
      Loading...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Header({ mobileOpen, setMobileOpen }) {
  return (
    <header style={{
      background: "#0f2d5a",
      borderBottom: "1px solid #1a3d70",
      padding: "16px 24px",
    }}>
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="lg:hidden rounded-lg px-3 py-1.5 text-sm"
            style={{ border: "1px solid rgba(255,255,255,0.25)", background: "transparent", color: "#fff" }}
            onClick={() => setMobileOpen(true)}
          >☰</button>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: "#ffffff", margin: 0 }}>Owner Master</h1>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.65)", margin: 0 }}>Manage Property Owners</p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function LeaseOSOwnerMasterUI({ onNavigate }) {
  const { companyId: userCompanyId, loadingAuth, permissions } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingPartyId, setViewingPartyId] = useState(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    alt_phone: "",
    company_name: "",
    brand_name: "",
    owner_group: "External Investor",
    id_type: "PAN",
    id_number: "",
    address_line1: "",
    address_line2: "",
    state: "",
    city: "",
    postal_code: "",
    country: "India",
    bank_name: "",
    branch: "",
    account_no: "",
    ifsc: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchOwners = async () => {
    if (loadingAuth) return;
    setLoading(true);
    try {
      let q = supabase
        .from("parties")
        .select("*")
        .eq("party_type", "Owner")
        .order("created_at", { ascending: false });
      // Scope to company if logged in as a company user
      if (userCompanyId) q = q.eq("company_id", userCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      setOwners(data || []);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwners();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userCompanyId, loadingAuth]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        party_type: "Owner",
        company_id: userCompanyId || undefined,
        first_name: formData.first_name,
        last_name: formData.last_name,
        company_name: formData.company_name,
        brand_name: formData.brand_name,
        owner_group: formData.owner_group,
        email: formData.email,
        phone: formData.phone,
        alt_phone: formData.alt_phone,
        id_type: formData.id_type,
        id_number: formData.id_number,
        address_line1: formData.address_line1,
        address_line2: formData.address_line2,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postal_code,
        country: formData.country || "India",
      };

      let partyId = editingId;
      if (editingId) {
        const { error } = await supabase.from("parties").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("parties").insert([payload]).select().single();
        if (error) throw error;
        partyId = data.id;
      }

      if (partyId && (formData.bank_name || formData.account_no)) {
        const bankPayload = {
          owner_party_id: partyId,
          bank_name: formData.bank_name,
          branch: formData.branch,
          account_no: formData.account_no,
          ifsc: formData.ifsc
        };
        
        // Upsert bank details
        const bankTable = "owner_bank_accounts";
        const { data: existingBank } = await supabase.from(bankTable).select("id").eq("owner_party_id", partyId).maybeSingle();
        
        if (existingBank) {
          await supabase.from(bankTable).update(bankPayload).eq("id", existingBank.id);
        } else {
          await supabase.from(bankTable).insert([bankPayload]);
        }
      }

      alert(editingId ? "Owner updated successfully" : "Owner created successfully");
      setShowCreateForm(false);
      setEditingId(null);
      resetForm();
      fetchOwners();
    } catch (err) {
      alert("Error: " + (err.message || "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: "", last_name: "", email: "", phone: "", alt_phone: "",
      company_name: "", brand_name: "", owner_group: "External Investor", id_type: "PAN", id_number: "",
      address_line1: "", address_line2: "", state: "", city: "", postal_code: "", country: "India",
      bank_name: "", branch: "", account_no: "", ifsc: ""
    });
  };

  const handleEdit = async (owner) => {
    setEditingId(owner.id);
    
    // Fetch bank details for this owner
    const { data: bankData } = await supabase
      .from("owner_bank_accounts")
      .select("*")
      .eq("owner_party_id", owner.id)
      .maybeSingle();

    setFormData({
      first_name: owner.first_name || "",
      last_name: owner.last_name || "",
      email: owner.email || "",
      phone: owner.phone || "",
      alt_phone: owner.alt_phone || "",
      company_name: owner.company_name || "",
      brand_name: owner.brand_name || "",
      owner_group: owner.owner_group || "External Investor",
      id_type: owner.id_type || "PAN",
      id_number: owner.id_number || "",
      address_line1: owner.address_line1 || "",
      address_line2: owner.address_line2 || "",
      state: owner.state || "",
      city: owner.city || "",
      postal_code: owner.postal_code || "",
      country: owner.country || "India",
      bank_name: bankData?.bank_name || "",
      branch: bankData?.branch || "",
      account_no: bankData?.account_no || "",
      ifsc: bankData?.ifsc || "",
    });
    setShowCreateForm(true);
  };

  return (
    <div className="min-h-screen text-slate-900" style={{ background: "var(--page-bg, #f8fafc)" }}>
      <div className="flex min-h-screen">
        <LeaseOSSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} currentPage="Owner Master" onNavigate={onNavigate} />
        <main className="flex-1 lg:ml-72" style={{ minWidth: 0 }}>
          <Header mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

          <div className="p-4 sm:p-6 space-y-6">
            {viewingPartyId ? (
              <PartyProfileView partyId={viewingPartyId} partyType="OWNER" onBack={() => setViewingPartyId(null)} />
            ) : showCreateForm && permissions?.edit ? (
              <section className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="border-b border-slate-100 px-6 py-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setShowCreateForm(false); setEditingId(null); resetForm(); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                    </button>
                    <h2 className="text-xl font-bold text-slate-900">{editingId ? "Edit Owner Profile" : "Create Owner Profile"}</h2>
                  </div>
                  <button onClick={() => { setShowCreateForm(false); setEditingId(null); resetForm(); }} className="text-sm font-medium text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md transition-colors">Back to List</button>
                </div>

                <form onSubmit={handleCreate} className="p-6 space-y-10">
                  {/* PERSONAL INFORMATION */}
                  <div>
                    <h3 className="text-[13px] font-bold text-slate-800 uppercase tracking-wider mb-5 border-b border-slate-100 pb-2">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Title</label>
                        <select value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                          <option>Select</option>
                          <option>Mr.</option>
                          <option>Ms.</option>
                          <option>Mrs.</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">First Name <span className="text-red-500">*</span></label>
                        <input type="text" required value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} placeholder="First Name" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Last Name <span className="text-red-500">*</span></label>
                        <input type="text" required value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} placeholder="Last Name" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Email Address <span className="text-red-500">*</span></label>
                        <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Phone Number <span className="text-red-500">*</span></label>
                        <input type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+91..." className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Alt Phone</label>
                        <input type="tel" value={formData.alt_phone} onChange={(e) => setFormData({ ...formData, alt_phone: e.target.value })} placeholder="Optional" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                      </div>
                    </div>
                  </div>

                  {/* PARTY DETAILS */}
                  <div>
                    <h3 className="text-[13px] font-bold text-slate-800 uppercase tracking-wider mb-5 border-b border-slate-100 pb-2">Party Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Company Name</label>
                        <input type="text" value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} placeholder="Company Name" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Owner Group</label>
                        <select value={formData.owner_group} onChange={(e) => setFormData({ ...formData, owner_group: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                          <option>External Investors</option>
                          <option>Close Group</option>
                          <option>Developer Pool</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">ID Type</label>
                        <select value={formData.id_type} onChange={(e) => setFormData({ ...formData, id_type: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                          <option>PAN</option>
                          <option>Aadhaar</option>
                          <option>GSTIN</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">ID Number</label>
                        <input type="text" value={formData.id_number} onChange={(e) => setFormData({ ...formData, id_number: e.target.value })} placeholder="Enter ID Number" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                      </div>
                    </div>
                  </div>

                  {/* ADDRESS */}
                  <div>
                    <h3 className="text-[13px] font-bold text-slate-800 uppercase tracking-wider mb-5 border-b border-slate-100 pb-2">Address</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Address Line 1</label>
                        <input type="text" value={formData.address_line1} onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })} placeholder="Street Address" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Address Line 2</label>
                        <input type="text" value={formData.address_line2} onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })} placeholder="Apartment, Suite, etc." className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">State</label>
                        <input type="text" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} placeholder="Select State" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">City</label>
                        <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Select City" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Postal Code</label>
                        <input type="text" value={formData.postal_code} onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })} placeholder="Zip / Postal Code" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Country</label>
                        <input type="text" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} placeholder="India" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                      </div>
                    </div>
                  </div>

                  {/* BANK DETAILS */}
                  <div>
                    <h3 className="text-[13px] font-bold text-slate-800 uppercase tracking-wider mb-5 border-b border-slate-100 pb-2">Bank Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Bank Name</label>
                        <input type="text" value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} placeholder="e.g., HDFC Bank" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Branch</label>
                        <input type="text" value={formData.branch} onChange={(e) => setFormData({ ...formData, branch: e.target.value })} placeholder="e.g., MG Road" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Account Number</label>
                        <input type="text" value={formData.account_no} onChange={(e) => setFormData({ ...formData, account_no: e.target.value })} placeholder="Account No" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">IFSC Code</label>
                        <input type="text" value={formData.ifsc} onChange={(e) => setFormData({ ...formData, ifsc: e.target.value })} placeholder="IFSC Code" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex justify-end">
                    <button disabled={saving} type="submit" className="rounded-lg bg-blue-700 px-8 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50 transition-colors">
                      {saving ? "Saving..." : (editingId ? "Update Owner" : "Save Owner")}
                    </button>
                  </div>
                </form>
              </section>
            ) : (
              <section className="rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-4 sm:px-5 py-4 flex items-center justify-between">
                  <p className="text-sm font-semibold">Registered Owners</p>
                  {permissions?.edit ? (
                    <button onClick={() => setShowCreateForm(true)} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                      + Add Owner
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                      🔒 View Only
                    </span>
                  )}
                </div>
                <div className="px-4 sm:px-5 py-4 overflow-auto">
                  {loading ? <LoadingSpinner /> : owners.length === 0 ? (
                    <div className="py-10 text-center text-slate-500 text-sm">No owners found. Create one.</div>
                  ) : (
                    <table className="w-full min-w-[800px] text-sm text-left">
                      <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-3">Name</th>
                          <th className="py-3 px-3">Company</th>
                          <th className="py-3 px-3">Brand</th>
                          <th className="py-3 px-3">Group</th>
                          <th className="py-3 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {owners.map(o => {
                          const fullName = `${o.first_name || ""} ${o.last_name || ""}`.trim();
                          return (
                            <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 px-3">
                                <button
                                  className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                  onClick={() => setViewingPartyId(o.id)}
                                >
                                  {fullName || "Unnamed Party"}
                                </button>
                              </td>
                              <td className="py-3 px-3 text-slate-600">{o.company_name || "No Company Name"}</td>
                              <td className="py-3 px-3 text-slate-600">{o.brand_name || "No Brand Name"}</td>
                              <td className="py-3 px-3">
                                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-100">{o.owner_group || "No Group"}</span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                {permissions?.edit && (
                                  <button 
                                    onClick={() => handleEdit(o)}
                                    className="text-xs font-semibold text-slate-600 hover:text-blue-600 border border-slate-200 rounded px-2 py-1 bg-white shadow-sm transition-all"
                                  >
                                    Edit
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
