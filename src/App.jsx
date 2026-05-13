import React from "react";
import { UserProvider, useUser } from "./context/UserContext";
import LeaseOSDashboardUI  from "./LeaseOSDashboardUI";
import LeaseOSInvoicingUI  from "./LeaseOSInvoicingUI";
import LeaseOSCollectionsUI from "./LeaseOSCollectionsUI";
import LeaseOSRentLedgerUI  from "./LeaseOSRentLedgerUI";
import LeaseOSOwnerMasterUI from "./LeaseOSOwnerMasterUI";
import LeaseOSTenantMasterUI from "./LeaseOSTenantMasterUI";
import SimpleLogin from "./SimpleLogin";

// ── Inner shell that can read auth context ─────────────────────────────────
function AppShell() {
  const { isLoggedIn, loadingAuth } = useUser();
  const [activePage, setActivePage] = React.useState("Dashboard");

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) return <SimpleLogin />;

  if (activePage === "Invoicing")    return <LeaseOSInvoicingUI   onNavigate={setActivePage} />;
  if (activePage === "Collections")  return <LeaseOSCollectionsUI  onNavigate={setActivePage} />;
  if (activePage === "Rent Ledger")  return <LeaseOSRentLedgerUI   onNavigate={setActivePage} />;
  if (activePage === "Owner Master") return <LeaseOSOwnerMasterUI  onNavigate={setActivePage} />;
  if (activePage === "Tenant Master") return <LeaseOSTenantMasterUI onNavigate={setActivePage} />;

  return <LeaseOSDashboardUI onNavigate={setActivePage} />;
}

// ── Root — wraps everything in the auth/company provider ──────────────────
export default function App() {
  return (
    <UserProvider>
      <AppShell />
    </UserProvider>
  );
}
