import { motion } from "framer-motion";
import { BarChart3, Boxes, Loader2, Package, ShieldAlert } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsAdmin } from "../../lib/admin";

const tabs = [
  { to: "/admin", end: true, label: "Overview", icon: BarChart3 },
  { to: "/admin/products", label: "Products", icon: Boxes },
  { to: "/admin/orders", label: "Orders", icon: Package },
];

/**
 * Route guard. This only hides UI - the database rejects non-admin writes on its
 * own, so a user who forces this route still sees nothing but errors.
 */
export default function AdminLayout() {
  const { isAdmin, checking } = useIsAdmin();
  const { user, isAnonymous } = useAuth();

  if (checking) {
    return (
      <div className="flex items-center justify-center py-32 text-zinc-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Checking permissions…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-28 text-center">
        <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-amber-500" />
        <h1 className="text-2xl font-extrabold">Admin access required</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {!user || isAnonymous
            ? "Sign in with an admin account to open the dashboard."
            : "This account does not have admin rights."}
        </p>
        <p className="mt-4 rounded-lg bg-zinc-100 p-3 text-left font-mono text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          node scripts/grant-admin.mjs you@email.com yourpassword
        </p>
        <Link to="/" className="mt-6 inline-block rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600">
          Back to the shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Dashboard</h1>
          <p className="text-sm text-zinc-500">Signed in as {user?.email}</p>
        </div>
        <Link to="/" className="text-sm font-medium text-orange-500 hover:underline">View storefront →</Link>
      </div>

      <nav className="mb-8 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end}
            className={({ isActive }) =>
              `relative flex items-center gap-2 px-4 py-3 text-sm font-semibold transition ${
                isActive ? "text-orange-500" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"}`}>
            {({ isActive }) => (
              <>
                <t.icon className="h-4 w-4" /> {t.label}
                {isActive && <motion.span layoutId="admin-tab" className="absolute inset-x-0 -bottom-px h-0.5 bg-orange-500" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
