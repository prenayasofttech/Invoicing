import React from "react";
import { supabase } from "./supabaseClient";
import { useUser } from "./context/UserContext";

const menuSections = [
  {
    title: "OVERVIEW",
    items: [{ label: "Dashboard" }],
  },
  {
    title: "BILLING & COLLECTION",
    items: [
      { label: "Invoicing" },
      { label: "Collections" },
      { label: "Rent Ledger" },
    ],
  },
  {
    title: "MASTERS",
    items: [{ label: "Owner Master" }, { label: "Tenant Master" }],
  },
];

export default function LeaseOSSidebar({ mobileOpen, setMobileOpen, currentPage, onNavigate }) {
  const { companyName, brandName, user, signOut } = useUser();

  // Priority: brand_name → company_name → "LeaseOS"
  const displayTitle = brandName || companyName || "LeaseOS";
  const displaySubtitle = brandName && companyName && brandName !== companyName ? companyName : null;
  const userEmail = user?.email || "";

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-30 bg-black/40 lg:hidden ${mobileOpen ? "block" : "hidden"}`}
        onClick={() => setMobileOpen(false)}
      />
      {/* Sidebar — always 288px (w-72) wide on desktop */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-72 shrink-0 bg-white text-slate-900 transform transition-transform duration-200 flex flex-col overflow-y-auto border-r border-slate-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="px-5 py-5 sticky top-0 bg-white z-10 border-b border-slate-100 min-h-[85px] flex flex-col justify-center">
          <p className="text-xl font-bold tracking-tight text-slate-900 leading-tight">{displayTitle}</p>
          {displaySubtitle && (
            <p className="text-xs text-slate-500 mt-0.5 font-medium">{displaySubtitle}</p>
          )}
          <p className="text-xs text-slate-400 mt-1">Invoicing &amp; Collections</p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-8">
          {menuSections.map((section) => (
            <div key={section.title}>
              <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = item.label === currentPage;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        onNavigate(item.label);
                        if (window.innerWidth < 1024) setMobileOpen(false);
                      }}
                      className={`w-full flex items-center justify-between text-left rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${active
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                    >
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="flex items-center justify-center rounded-full bg-[#ef4444] text-white text-[10px] font-bold h-[18px] min-w-[18px] px-1">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto sticky bottom-0 bg-white w-full px-5 py-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-400">LeaseOS Platform</p>
              {userEmail && (
                <p className="text-[10px] text-slate-400 truncate mt-0.5" title={userEmail}>{userEmail}</p>
              )}
            </div>
            <button
              onClick={signOut}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors ml-3 shrink-0"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
