/**
 * Grants admin rights to an account, creating and confirming it if needed.
 *
 *   SB_REF=... SB_PAT=... node scripts/grant-admin.mjs you@email.com [password]
 *
 * Admin membership is a row in public.admins. No client can write that table
 * (RLS allows reads to admins only, writes to service_role alone), so promoting
 * someone is deliberately a server-side act using a personal access token.
 */
import fs from "fs";
import path from "path";

const REF = process.env.SB_REF;
const PAT = process.env.SB_PAT;
const [email, password] = process.argv.slice(2);

if (!REF || !PAT) { console.error("Set SB_REF and SB_PAT."); process.exit(1); }
if (!email) { console.error("Usage: node scripts/grant-admin.mjs <email> [password]"); process.exit(1); }

// anon key from .env.local, used only for the public signup endpoint
const envPath = path.join(process.cwd(), ".env.local");
const anon = fs.existsSync(envPath)
  ? (fs.readFileSync(envPath, "utf8").match(/VITE_SUPABASE_ANON_KEY=(.+)/) ?? [])[1]?.trim()
  : null;

const sql = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!r.ok) throw new Error(`${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
};

const esc = (s) => s.replace(/'/g, "''");

let [user] = await sql(`select id from auth.users where email = '${esc(email)}' limit 1;`);

if (!user) {
  if (!password) { console.error(`No account for ${email}. Pass a password to create one.`); process.exit(1); }
  if (!anon) { console.error("No anon key in .env.local; cannot sign up."); process.exit(1); }
  const r = await fetch(`https://${REF}.supabase.co/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await r.json();
  if (!r.ok) { console.error("Signup failed:", body.msg ?? body.error_description ?? JSON.stringify(body)); process.exit(1); }
  console.log("created account");
  [user] = await sql(`select id from auth.users where email = '${esc(email)}' limit 1;`);
}

// Confirm the address so the account can sign in without the email round-trip.
await sql(`update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where id = '${user.id}';`);
await sql(`insert into public.admins (user_id, note) values ('${user.id}', 'granted via script')
           on conflict (user_id) do nothing;`);

const [check] = await sql(`select u.email, (a.user_id is not null) as is_admin
                           from auth.users u left join public.admins a on a.user_id = u.id
                           where u.id = '${user.id}';`);
console.log(`\n${check.email} -> admin: ${check.is_admin}`);
console.log("Sign in with this account, then open /admin");
