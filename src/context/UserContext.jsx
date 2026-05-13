/**
 * UserContext.jsx
 *
 * Supports TWO login paths:
 *
 *  PATH A — Supabase Auth (supabase.auth.signInWithPassword)
 *    Works when DMAIC successfully created a Supabase Auth user.
 *
 *  PATH B — Module User Session (custom bcrypt RPC verify)
 *    Works when user only exists in module_users (DMAIC custom users).
 *    Session is kept in sessionStorage under key "leaseos_module_session".
 *
 * Both paths expose the same context shape:
 *   { session, user, companyId, companyName, brandName, loadingAuth }
 *
 * Logout clears both Supabase session and module session.
 */
import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const UserContext = createContext(null);

const MODULE_SESSION_KEY = "leaseos_module_session";

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadModuleSession() {
  try {
    const raw = sessionStorage.getItem(MODULE_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveModuleSession(data) {
  sessionStorage.setItem(MODULE_SESSION_KEY, JSON.stringify(data));
}

function clearModuleSession() {
  sessionStorage.removeItem(MODULE_SESSION_KEY);
}

/**
 * Fetches invoicing permissions for a given email.
 * Handles both storage strategies:
 *   Strategy A — one row per module: module_name = 'invoicing'
 *   Strategy B — merged _modules JSON:  permissions._modules = [{module_name:'invoicing', permissions:{...}}]
 */
async function fetchInvoicingPermissions(supabaseClient, email) {
  const { data: rows } = await supabaseClient
    .from("module_users")
    .select("permissions, module_name")
    .eq("email", email)
    .eq("status", "active");

  if (!rows || rows.length === 0) return null;

  let rawPerms = null;

  // Strategy A: find a row whose module_name is 'invoicing' (case-insensitive)
  const directRow = rows.find(
    r => r.module_name?.toLowerCase() === "invoicing" && r.permissions && !r.permissions._modules
  );
  if (directRow) {
    rawPerms = directRow.permissions;
  } else {
    // Strategy B: look inside _modules array in any row
    for (const row of rows) {
      const modules = row.permissions?._modules;
      if (Array.isArray(modules)) {
        const invMod = modules.find(m => m.module_name?.toLowerCase() === "invoicing");
        if (invMod?.permissions) {
          rawPerms = invMod.permissions;
          break;
        }
      }
    }
  }

  if (!rawPerms) return null;

  // Robust normalization: ensure keys exist as booleans
  return {
    view: !!rawPerms.view,
    edit: !!rawPerms.edit,
    delete: !!rawPerms.delete
  };
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function UserProvider({ children }) {
  const [session, setSession] = useState(null);  // Supabase Auth session
  const [user, setUser] = useState(null);
  const [moduleSession, setModuleSession] = useState(null); // Custom module session
  const [companyId, setCompanyId] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [permissions, setPermissions] = useState({ view: true, edit: false, delete: false });
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Is the user authenticated via either path?
  const isLoggedIn = !!session || !!moduleSession;

  // ── Fetch company name from company_users by id ─────────────────────────────
  const fetchCompanyName = async (cId) => {
    if (!cId) return;
    const { data } = await supabase
      .from("company_users")
      .select("company_name")
      .eq("id", cId)
      .limit(1);
    if (data?.[0]?.company_name) setCompanyName(data[0].company_name);
  };

  // ── Resolve company for a Supabase Auth user ────────────────────────────────
  const resolveCompany = async (authUser) => {
    if (!authUser) return;

    // Priority 1: company_id stored in Supabase Auth user_metadata
    let cId = authUser.user_metadata?.company_id ?? null;
    let cName = authUser.user_metadata?.company_name ?? "";

    // Priority 2: lookup in module_users by email (most reliable for module users)
    if (!cId) {
      const { data } = await supabase
        .from("module_users")
        .select("company_id")
        .eq("email", authUser.email)
        .eq("status", "active")
        .limit(1);
      if (data?.[0]) cId = data[0].company_id;
    }

    // Priority 3: lookup in company_users by email (admin users)
    // ALWAYS run this check to determine admin status, even if cId was already found
    let isAdmin = false;
    {
      const { data } = await supabase
        .from("company_users")
        .select("id, company_name")
        .eq("email", authUser.email)
        .limit(1);
      if (data?.[0]) {
        if (!cId) cId = data[0].id;
        if (!cName) cName = data[0].company_name || "";
        isAdmin = true;
      }
    }

    // Load permissions for invoicing
    if (isAdmin) {
      setPermissions({ view: true, edit: true, delete: true });
    } else {
      const invPerms = await fetchInvoicingPermissions(supabase, authUser.email);
      if (invPerms) {
        setPermissions(invPerms);
      } else {
        setPermissions({ view: true, edit: false, delete: false });
      }
    }

    // Fetch company name if we only have an id
    if (cId && !cName) {
      const { data } = await supabase
        .from("company_users")
        .select("company_name")
        .eq("id", cId)
        .limit(1);
      if (data?.[0]) cName = data[0].company_name || "";
    }

    setCompanyId(cId);
    setCompanyName(cName);
  };

  // ── 1. On mount: check both session types ──────────────────────────────────
  useEffect(() => {
    const init = async () => {
      // PATH A: check Supabase Auth session
      const { data: { session: s } } = await supabase.auth.getSession();
      if (s?.user) {
        setSession(s);
        setUser(s.user);
        await resolveCompany(s.user);
        setLoadingAuth(false);
        return;
      }

      // PATH B: check custom module session in sessionStorage
      const ms = loadModuleSession();
      if (ms?.email && ms?.company_id) {
        setModuleSession(ms);
        setUser({ email: ms.email });
        setCompanyId(ms.company_id);
        setCompanyName(ms.company_name || "");

        // ── CRITICAL: Use permissions stored in the session if available ──
        if (ms.permissions) {
          setPermissions(ms.permissions);
        } else {
          // Fallback: try to fetch (will only work if RLS allows or user is admin)
          const invPerms = await fetchInvoicingPermissions(supabase, ms.email);
          if (invPerms) setPermissions(invPerms);
        }

        // Also check if this email belongs to a company admin → full access
        const { data: adminCheck } = await supabase
          .from("company_users")
          .select("id")
          .eq("email", ms.email)
          .limit(1);
        if (adminCheck?.[0]) {
          setPermissions({ view: true, edit: true, delete: true });
        }

        await fetchCompanyName(ms.company_id);
        setLoadingAuth(false);
        return;
      }

      setLoadingAuth(false);
    };

    init();

    // Listen for Supabase Auth changes (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        if (s?.user) {
          clearModuleSession();   // clear custom session if Supabase takes over
          setModuleSession(null);
          setSession(s);
          setUser(s.user);
          await resolveCompany(s.user);
        } else if (!loadModuleSession()) {
          // Only clear if no module session active
          setSession(null);
          setUser(null);
          setCompanyId(null);
          setCompanyName("");
          setBrandName("");
          setPermissions({ view: true, edit: false, delete: false });
        }
      }
    );

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 2. Supabase Realtime — watch company_users for live name updates ────────
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel(`company_profile:${companyId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "company_users",
        filter: `id=eq.${companyId}`,
      }, (payload) => {
        if (payload.new?.company_name) setCompanyName(payload.new.company_name);
        if (payload.new?.brand_name) setBrandName(payload.new.brand_name);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [companyId]);

  // ── 3. signOut — clears both session types ──────────────────────────────────
  const signOut = async () => {
    clearModuleSession();
    setModuleSession(null);
    setSession(null);
    setUser(null);
    setCompanyId(null);
    setCompanyName("");
    setBrandName("");
    setPermissions({ view: true, edit: false, delete: false });
    await supabase.auth.signOut();
  };

  // ── 4. loginAsModuleUser — called by SimpleLogin after RPC verification ─────
  const loginAsModuleUser = async (moduleUserData) => {
    saveModuleSession(moduleUserData);
    setModuleSession(moduleUserData);
    setUser({ email: moduleUserData.email });
    setCompanyId(moduleUserData.company_id);
    setCompanyName(moduleUserData.company_name || "");

    // ── CRITICAL: Use permissions returned from the verify RPC ──
    if (moduleUserData.permissions) {
      setPermissions(moduleUserData.permissions);
    } else {
      // Fallback (Strategy A/B lookup)
      const invPerms = await fetchInvoicingPermissions(supabase, moduleUserData.email);
      if (invPerms) setPermissions(invPerms);
    }

    // Also check if this user is a company admin → full access
    const { data: adminCheck } = await supabase
      .from("company_users")
      .select("id")
      .eq("email", moduleUserData.email)
      .limit(1);
    if (adminCheck?.[0]) {
      setPermissions({ view: true, edit: true, delete: true });
    }

    await fetchCompanyName(moduleUserData.company_id);
  };

  const value = {
    session,
    user,
    moduleSession,
    isLoggedIn,
    companyId,
    companyName,
    brandName,
    permissions,
    loadingAuth,
    signOut,
    loginAsModuleUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider>");
  return ctx;
}
