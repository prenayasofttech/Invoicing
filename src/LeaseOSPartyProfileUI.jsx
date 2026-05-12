import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function PartyProfileView({ partyId, partyType, onBack }) {
  const [party, setParty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bank, setBank] = useState(null);

  useEffect(() => {
    if (!partyId) return;
    setLoading(true);
    
    // Fetch party details
    supabase
      .from("parties")
      .select("*")
      .eq("id", partyId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setParty(data);
        
        // Fetch bank details depending on party type
        const bankTable = partyType === "TENANT" ? "tenant_bank_accounts" : "owner_bank_accounts";
        const foreignKey = partyType === "TENANT" ? "tenant_party_id" : "owner_party_id";
        
        return supabase.from(bankTable).select("*").eq(foreignKey, partyId).maybeSingle();
      })
      .then(({ data, error }) => {
        if (!error && data) setBank(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [partyId, partyType]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-sm">
        <div style={{ width: "32px", height: "32px", border: "3px solid #e5e7eb", borderTop: "3px solid #0f2d5a", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: "12px" }} />
        Loading profile...
      </div>
    );
  }

  if (!party) {
    return <div className="p-8 text-center text-slate-500 text-base">Party not found. <button onClick={onBack} className="text-blue-600 underline ml-2">Go back</button></div>;
  }

  const name = party.company_name || party.brand_name || `${party.first_name || ""} ${party.last_name || ""}`.trim() || "Unnamed Party";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Area */}
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div className="text-sm font-bold text-blue-600 uppercase tracking-widest">
            Parties &gt; <span className="text-slate-500">{name}</span>
          </div>
        </div>
        <div className="flex gap-2">
        </div>
      </div>

      <div className="mt-2 mb-6">
        <h1 className="text-4xl font-bold text-slate-900 mb-3">{name}</h1>
        <div className="flex items-center gap-3 mt-4">
          <span className="rounded bg-amber-100 text-amber-800 px-3 py-1 text-xs font-bold uppercase tracking-wider">{party.party_type || "Company"}</span>
          <span className="rounded bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-bold uppercase tracking-wider">{partyType}</span>
        </div>
      </div>

      {/* Basic Information */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-8 py-5">
          <h2 className="text-base font-bold text-slate-800">Basic Information</h2>
        </div>
        <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">First Name</p>
            <p className="text-base font-medium text-slate-900">{party.first_name || "-"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Last Name</p>
            <p className="text-base font-medium text-slate-900">{party.last_name || "-"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Company / Brand Name</p>
            <p className="text-base font-medium text-slate-900">{party.company_name || party.brand_name || "-"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{party.id_type || "ID Number"}</p>
            <p className="text-base font-medium text-slate-900">{party.id_number || "-"}</p>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-8 py-5">
          <h2 className="text-base font-bold text-slate-800">Contact Information</h2>
        </div>
        <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email</p>
            <p className="text-base font-medium text-slate-900">{party.email || "-"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Phone</p>
            <p className="text-base font-medium text-slate-900">{party.phone || "-"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Alternate Phone</p>
            <p className="text-base font-medium text-slate-900">{party.alt_phone || "-"}</p>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-8 py-5">
          <h2 className="text-base font-bold text-slate-800">Address</h2>
        </div>
        <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Address Line 1</p>
            <p className="text-base font-medium text-slate-900">{party.address_line1 || "-"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Address Line 2</p>
            <p className="text-base font-medium text-slate-900">{party.address_line2 || "-"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">City</p>
            <p className="text-base font-medium text-slate-900">{party.city || "-"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">State</p>
            <p className="text-base font-medium text-slate-900">{party.state || "-"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Postal Code</p>
            <p className="text-base font-medium text-slate-900">{party.postal_code || "-"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Country</p>
            <p className="text-base font-medium text-slate-900">{party.country || "India"}</p>
          </div>
        </div>
      </div>

      {/* Bank Details */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-8 py-5 flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-800">Bank Details</h2>
          {!bank && <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded">Not Set</span>}
        </div>
        <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Bank Name</p>
            <p className="text-base font-medium text-slate-900">{bank?.bank_name || "-"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Account Number</p>
            <p className="text-base font-medium text-slate-900">{bank?.account_no || "-"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">IFSC Code</p>
            <p className="text-base font-medium text-slate-900">{bank?.ifsc || "-"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Branch Name</p>
            <p className="text-base font-medium text-slate-900">{bank?.branch || "-"}</p>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-12">
        <div className="border-b border-slate-100 bg-slate-50 px-8 py-5">
          <h2 className="text-base font-bold text-slate-800">Additional Information</h2>
        </div>
        <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Brand Category</p>
            <p className="text-base font-medium text-slate-900">{party.brand_category || "-"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Owner Group</p>
            <p className="text-base font-medium text-slate-900">{party.owner_group || "-"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
