import { useState } from "react";
import { Camera, CreditCard, Globe, Lock, Mail, MessageCircle, Play, ShieldCheck, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { useStore } from "../context/StoreContext";

export default function Footer() {
  const { toast } = useStore();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const subscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Please enter a valid email address.");
    setError(""); setEmail("");
    toast("Thanks for subscribing!");
  };

  const cols = [
    { title: "Company", links: ["About", "Careers", "Press"] },
    { title: "Support", links: ["Help centre", "Shipping", "Returns"] },
    { title: "Legal", links: ["Terms", "Privacy", "Cookies"] },
  ];

  return (
    <footer className="mt-24 bg-zinc-950 text-zinc-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Link to="/" className="text-xl font-extrabold text-white">AutoParts<span className="text-orange-500"> Hub</span></Link>
          <p className="mt-3 max-w-xs text-sm text-zinc-400">Exact-fit parts for the car you drive. Demo storefront — all data is mock.</p>
          <form onSubmit={subscribe} className="mt-5 max-w-sm" noValidate>
            <label htmlFor="nl" className="text-sm font-medium text-white">Get deals in your inbox</label>
            <div className="mt-2 flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input id="nl" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-orange-500" />
              </div>
              <button className="rounded-lg bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600">Join</button>
            </div>
            {error && <p className="mt-1.5 text-xs text-rose-400">{error}</p>}
          </form>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white">{c.title}</h4>
            <ul className="space-y-2 text-sm">
              {c.links.map((l) => <li key={l}><a href="#" onClick={(e) => e.preventDefault()} className="transition hover:text-orange-400">{l}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-zinc-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 text-sm sm:flex-row">
          <div className="flex gap-4 text-zinc-400">
            {[Globe, Camera, MessageCircle, Play].map((I, i) => (
              <a key={i} href="#" onClick={(e) => e.preventDefault()} aria-label="Social link" className="transition hover:-translate-y-0.5 hover:text-orange-400"><I className="h-5 w-5" /></a>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-400">
            <span className="flex items-center gap-1"><Lock className="h-4 w-4" /> SSL secure</span>
            <span className="flex items-center gap-1"><CreditCard className="h-4 w-4" /> Safe payments</span>
            <span className="flex items-center gap-1"><ShieldCheck className="h-4 w-4" /> Exact-fit guarantee</span>
            <span className="flex items-center gap-1"><Truck className="h-4 w-4" /> Tracked delivery</span>
          </div>
          <p className="text-xs text-zinc-500">© {new Date().getFullYear()} AutoParts Hub</p>
        </div>
      </div>
    </footer>
  );
}
