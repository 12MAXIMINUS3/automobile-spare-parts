import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, LogOut, User, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useIsAdmin } from "../lib/admin";
import { useStore } from "../context/StoreContext";

/**
 * Account control. Visitors browse as an anonymous Supabase user, so signing up
 * upgrades that same uid in place and their cart survives the transition.
 */
export default function AccountMenu({ className = "" }: { className?: string }) {
  const { user, isAnonymous, signIn, signUp, signOut } = useAuth();
  const { toast } = useStore();
  const { isAdmin } = useIsAdmin();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signedIn = Boolean(user) && !isAnonymous;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = mode === "in" ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (err) return setError(err);
    setOpen(false);
    setEmail(""); setPassword("");
    toast(mode === "in" ? "Signed in" : "Account created — check your email to confirm");
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => (signedIn ? setOpen(!open) : setOpen(!open))}
        aria-label="Account"
        className="relative rounded-full p-2 text-zinc-700 transition hover:bg-zinc-100 hover:text-orange-500 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        <User className="h-5 w-5" />
        {signedIn && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-950" />}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.16 }}
              className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
            >
              {signedIn ? (
                <>
                  <p className="text-xs text-zinc-500">Signed in as</p>
                  <p className="truncate font-semibold">{user?.email}</p>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setOpen(false)}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 py-2 text-sm font-semibold text-white transition hover:bg-orange-500 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-orange-500 dark:hover:text-white">
                      <LayoutDashboard className="h-4 w-4" /> Admin dashboard
                    </Link>
                  )}
                  <button
                    onClick={async () => { await signOut(); setOpen(false); toast("Signed out", "info"); }}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </>
              ) : (
                <form onSubmit={submit} noValidate>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex gap-1 rounded-lg bg-zinc-100 p-0.5 text-sm dark:bg-zinc-800">
                      {(["in", "up"] as const).map((m) => (
                        <button key={m} type="button" onClick={() => { setMode(m); setError(null); }}
                          className={`rounded-md px-3 py-1 font-medium transition ${mode === m ? "bg-white shadow dark:bg-zinc-900" : "text-zinc-500"}`}>
                          {m === "in" ? "Sign in" : "Sign up"}
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-zinc-400 hover:text-zinc-600"><X className="h-4 w-4" /></button>
                  </div>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
                    className="mb-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-900" />
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-900" />
                  <AnimatePresence>
                    {error && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-1.5 text-xs text-rose-500">{error}</motion.p>}
                  </AnimatePresence>
                  <button disabled={busy} className="mt-3 w-full rounded-lg bg-orange-500 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60">
                    {busy ? "Working…" : mode === "in" ? "Sign in" : "Create account"}
                  </button>
                  <p className="mt-2 text-[11px] leading-snug text-zinc-500">Your cart carries over when you create an account.</p>
                </form>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
