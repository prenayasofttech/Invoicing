import React, { useState, useEffect } from "react";
import { createCollection, fetchOwnerBankDetails, fetchTenantBankDetails } from "./supabaseClient";

export default function CollectionReceiptPopup({ isOpen, onClose, selectedInvoices, onSettled }) {
  const [formData, setFormData] = useState({
    receipt_date: new Date().toISOString().split("T")[0],
    party_name: "",
    payment_mode: "NEFT",
    reference_no: "",
    remitter_bank: "",
    receiver_bank: "N/A",
    gross_amount: "",
    tds_deducted: "",
    remarks: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [receiverOptions, setReceiverOptions] = useState([]);

  useEffect(() => {
    if (isOpen && selectedInvoices?.length > 0) {
      const inv = selectedInvoices[0];
      const tName = inv.tenant_name || inv.tenant?.brand_name || inv.tenant?.company_name || inv.tenant?.first_name || "—";
      const totalDue = selectedInvoices.reduce((s, r) => s + (Number(r.balance_amount) || 0), 0);

      setFormData(prev => ({
        ...prev,
        party_name: tName,
        gross_amount: totalDue, // Pre-fill with full amount
        tds_deducted: 0,
        remarks: ""
      }));

      // Fetch bank details
      if (inv.tenant_party_id) {
        fetchTenantBankDetails(inv.tenant_party_id).then(bank => {
          if (bank) setFormData(prev => ({ ...prev, remitter_bank: `${bank.bank_name || ""} - ${bank.branch || ""}`.trim() }));
        });
      }
      if (inv.owner_party_id) {
        fetchOwnerBankDetails(inv.owner_party_id).then(bank => {
          if (bank) {
            const accString = `${bank.bank_name || "Bank"} - A/c ${bank.account_no || ""}`;
            setReceiverOptions([accString]);
            setFormData(prev => ({ ...prev, receiver_bank: accString }));
          } else {
            setFormData(prev => ({ ...prev, receiver_bank: "" }));
          }
        });
      }
    }
  }, [isOpen, selectedInvoices]);

  if (!isOpen || !selectedInvoices || selectedInvoices.length === 0) return null;

  const totalDue = selectedInvoices.reduce((s, r) => s + (Number(r.balance_amount) || 0), 0);
  const gross = Number(formData.gross_amount) || 0;
  const tds = Number(formData.tds_deducted) || 0;

  // Total settled includes what they physically paid (gross) plus what was deducted as TDS.
  const settledAmount = gross + tds;
  const netCredited = gross;
  const balance = Math.max(0, totalDue - settledAmount);

  const tName = selectedInvoices[0].tenant_name || selectedInvoices[0].tenant?.brand_name || selectedInvoices[0].tenant?.company_name || selectedInvoices[0].tenant?.first_name || formData.party_name;

  const handleSubmit = async () => {
    if (gross <= 0 && tds <= 0) {
      alert("Please enter a valid gross amount or TDS.");
      return;
    }
    setSubmitting(true);

    try {
      let remainingToSettle = settledAmount;
      let remainingTds = tds;
      let remainingGross = gross;

      // Distribute the settlement sequentially across selected invoices
      for (const inv of selectedInvoices) {
        if (remainingToSettle <= 0) break;
        const invBal = Number(inv.balance_amount) || 0;
        if (invBal <= 0) continue;

        // How much of the remaining payment applies to this invoice
        const settleForThis = Math.min(invBal, remainingToSettle);

        // Proportionally allocate TDS and Gross to this invoice
        const ratio = settleForThis / settledAmount;
        const tdsForThis = Number((tds * ratio).toFixed(2));
        const grossForThis = Number((gross * ratio).toFixed(2));

        await createCollection({
          receipt_no: `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          company_id: inv.company_id,
          invoice_id: inv.id,
          project_id: inv.project_id,
          unit_id: inv.unit_id,
          tenant_party_id: inv.tenant_party_id,
          receipt_date: formData.receipt_date,
          payment_mode: formData.payment_mode,
          bank_name: formData.remitter_bank,
          account_number: formData.receiver_bank,
          reference_no: formData.reference_no || `TRX-${Math.floor(Math.random() * 1000000)}`,
          amount: settleForThis,
          tds_amount: tdsForThis,
          net_amount: grossForThis,
          remarks: formData.remarks,
        });

        remainingToSettle -= settleForThis;
      }

      alert("Collection Receipt Recorded Successfully!");
      if (onSettled) onSettled();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to record collection.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: "Georgia, serif" }}>Record Collection Receipt</h2>
          <button className="text-slate-400 hover:text-slate-600 text-xl" onClick={onClose}>✕</button>
        </div>

        <div className="p-6">
          {/* Banner */}
          <div className="bg-[#f0fdf4] text-[#166534] rounded-lg px-4 py-3 text-sm font-semibold mb-6 flex items-center gap-2">
            <span>Settling: {selectedInvoices.length} invoice{selectedInvoices.length > 1 ? "s" : ""} for {tName} - Total Due: ₹{totalDue.toLocaleString("en-IN")}</span>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            {/* ROW 1 */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 tracking-wider uppercase mb-1">Date of Receipt</label>
              <input
                type="date"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                value={formData.receipt_date}
                onChange={(e) => setFormData(prev => ({ ...prev, receipt_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 tracking-wider uppercase mb-1">Party Name (Remitter)</label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                value={formData.party_name}
                onChange={(e) => setFormData(prev => ({ ...prev, party_name: e.target.value }))}
              />
            </div>

            {/* ROW 2 */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 tracking-wider uppercase mb-1">Mode of Payment</label>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                value={formData.payment_mode}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_mode: e.target.value }))}
              >
                <option value="NEFT">NEFT</option>
                <option value="RTGS">RTGS</option>
                <option value="IMPS">IMPS</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 tracking-wider uppercase mb-1">Payment Reference No</label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none placeholder-slate-400"
                placeholder="UTR / Cheque No / Txn ID"
                value={formData.reference_no}
                onChange={(e) => setFormData(prev => ({ ...prev, reference_no: e.target.value }))}
              />
            </div>

            {/* ROW 3 */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 tracking-wider uppercase mb-1">Remitter Bank</label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none placeholder-slate-400"
                placeholder="Bank name - Branch"
                value={formData.remitter_bank}
                onChange={(e) => setFormData(prev => ({ ...prev, remitter_bank: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 tracking-wider uppercase mb-1">Receiver Bank A/C</label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none placeholder-slate-400"
                placeholder="Bank Name - A/C No"
                value={formData.receiver_bank}
                onChange={(e) => setFormData(prev => ({ ...prev, receiver_bank: e.target.value }))}
              />
            </div>

            {/* ROW 4 */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 tr acking-wider uppercase mb-1">Gross Amount Received (₹)</label>
              <input
                type="number"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="0.00"
                value={formData.gross_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, gross_amount: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 tracking-wider uppercase mb-1">TDS Deducted (₹)</label>
              <input
                type="number"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="0.00"
                value={formData.tds_deducted}
                onChange={(e) => setFormData(prev => ({ ...prev, tds_deducted: e.target.value }))}
              />
            </div>
          </div>

          {/* Calcs */}
          <div className="mt-6 bg-slate-50 border border-slate-100 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Net Amount Credited</span>
              <span className="font-semibold text-teal-700">₹{netCredited.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Invoice Balance After Settlement</span>
              <span className="font-semibold text-slate-900">₹{balance.toLocaleString("en-IN")} remaining</span>
            </div>
          </div>

          {/* Remarks */}
          <div className="mt-5">
            <label className="block text-xs font-semibold text-slate-500 tracking-wider uppercase mb-1">Remarks</label>
            <input
              type="text"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none placeholder-slate-400"
              placeholder="Optional notes"
              value={formData.remarks}
              onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-4 flex justify-end gap-3 bg-white rounded-b-2xl">
          <button
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-[#d4af37] px-6 py-2.5 text-sm font-bold text-slate-900 hover:bg-[#c5a017] transition-colors disabled:opacity-50 flex items-center gap-2"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Processing..." : "↓ Submit & Post Collection"}
          </button>
        </div>

      </div>
    </div>
  );
}
