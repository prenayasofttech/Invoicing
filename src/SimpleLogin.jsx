import React, { useState } from "react";
import { supabase } from "./supabaseClient";
import { useUser } from "./context/UserContext";

export default function SimpleLogin() {
  const { loginAsModuleUser } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) return;
    setLoading(true);

    const normalizedEmail = email.toLowerCase().trim();

    // ── PATH A: Try Supabase Auth first ────────────────────────────────────────
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });


    if (!authError) {
      setLoading(false);
      return;
    }

    // ── PATH B: Fallback — verify via module_users bcrypt RPC ─────────────────

    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "verify_module_user",
        { p_email: normalizedEmail, p_password: password }
      );


      if (!rpcError && rpcData?.success) {
        await loginAsModuleUser({
          email: rpcData.email,
          company_id: rpcData.company_id,
          company_name: rpcData.company_name || "",
          module_name: rpcData.module_name || "invoicing",
          permissions: rpcData.permissions // <-- Added this line
        });
        setLoading(false);
        return;
      }

      // Show exact error for diagnosis
      const pathBMsg = rpcData?.message || rpcError?.message || null;

      // User-friendly messages
      if (pathBMsg && !pathBMsg.toLowerCase().includes("function")) {
        // RPC ran — show its specific message
        setError(pathBMsg);
      } else if (authError.message?.toLowerCase().includes("email not confirmed")) {
        setError("Email not yet confirmed. Contact your company admin.");
      } else {
        setError("Login failed. Check your email and password, or contact your admin.");
      }
    } catch (err) {
      setError(authError.message || "Login failed. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md p-10 border border-slate-200 rounded-2xl shadow-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[#0f2d5a] rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-xl font-bold">L</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome to LeaseOS</h1>
          <p className="text-sm text-slate-500">Sign in with your DMAIC credentials</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && (
            <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <span className="text-red-500 mt-0.5">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              placeholder="you@company.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[#0f2d5a] hover:bg-blue-900 disabled:bg-slate-400 text-white font-semibold py-2.5 rounded-lg text-sm transition duration-200 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Signing In...
              </>
            ) : "Sign In"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          Account managed by your company admin on DMAIC
        </p>
      </div>
    </div>
  );
}
