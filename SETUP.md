# Hypodermical — Setup & Go-Live Guide

The site is a **static frontend** (plain HTML/CSS/JS) plus two backend pieces:

- **Supabase** — B2B (trade) accounts, manual approval, and gated wholesale pricing.
- **Vercel serverless** (`/api`) — Stripe Checkout with server-side price validation.

Everything works without configuration (retail shop only); B2B + checkout light up once you add keys.

---

## 1. Install & run locally

```bash
npm install                  # installs stripe + @supabase/supabase-js (for /api)
cp .env.example .env         # fill in your keys (see below)
npx vercel dev               # runs the static site + /api functions together
```

For a quick static-only preview (no `/api`): `npx serve .`

---

## 2. Supabase (B2B accounts + trade pricing)

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor → paste & run** [`supabase/schema.sql`](supabase/schema.sql). This creates:
   - `b2b_profiles` (accounts, `status`: pending/approved/rejected)
   - `trade_prices` (wholesale prices, keyed by product `sku`)
   - `orders` (order log)
   - Row-Level Security so **only approved B2B accounts can read trade prices**.
3. **Project Settings → API**, copy the **Project URL** and **anon public key** into:
   - [`assets/js/supabase-config.js`](assets/js/supabase-config.js) (browser — these are public by design)
   - `.env` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`)
4. Copy the **service-role key** into `.env` (`SUPABASE_SERVICE_ROLE_KEY`) — **server only, never in the browser.**
5. (Recommended) In **Authentication → Providers → Email**, decide whether to require email confirmation. With confirmation on, applicants confirm their email, then sign in; their profile is created automatically on first login.

### Approving a trade account
A professional applies via `/pages/professionals.html`. They land in `b2b_profiles` with `status = 'pending'`. To approve:

```sql
update public.b2b_profiles set status = 'approved' where email = 'clinic@example.com';
```

(Status can only be changed by the service role / SQL editor — users cannot self-approve.)

### Setting trade prices
Prices are in **cents**, keyed by the same `sku` used in `shop/assets/data/products.json`:

```sql
insert into public.trade_prices (sku, price_cents, stripe_price_id) values
  ('HY-HC-GLYCO-001', 2400, null),
  ('HY-SPF50-001',    1800, null)
on conflict (sku) do update set price_cents = excluded.price_cents;
```

Leave `stripe_price_id` null to let checkout create the price on the fly, or set a real Stripe Price ID.

---

## 3. Stripe (checkout)

1. Get your keys from [dashboard.stripe.com](https://dashboard.stripe.com) (use **test** keys first).
2. Put the **secret key** in `.env` (`STRIPE_SECRET_KEY`) — used only by `/api/create-checkout-session`.
3. Put the **publishable key** in `.env` and in [`shop/assets/js/stripe-checkout.js`](shop/assets/js/stripe-checkout.js) (`STRIPE_PUBLISHABLE_KEY`).
4. **Retail prices**: set the `price` (cents) and optionally `stripe_price_id` for each product in `shop/assets/data/products.json`. Products with `price: null` show "Price on request".

> **Security:** the browser never sends prices to checkout — only `{ sku, quantity }`. The server (`/api/create-checkout-session.js`) recomputes the authoritative price from `trade_prices` (approved B2B) or `products.json` (retail). Don't change this.

---

## 4. Deploy to Vercel

1. Import the repo in Vercel.
2. **Settings → Environment Variables**: add all five keys from `.env`
   (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`).
3. Make sure `assets/js/supabase-config.js` and `shop/assets/js/stripe-checkout.js`
   contain the public keys (committed to the repo).
4. Deploy. `/api/*` becomes serverless functions automatically.

---

## 5. Optional — contact form backend
The contact form ([`pages/contact.html`](pages/contact.html)) uses a `mailto:` fallback by default
(no backend needed). To use a real form service, set `CONTACT_ENDPOINT` in that page's inline
script to your endpoint (e.g. a Formspree URL or a custom `/api/contact`).

---

## How the two tiers behave
| Visitor | Sees | Can buy |
|---|---|---|
| Anonymous / retail | Retail prices; pro products gated | Retail products |
| B2B **pending** | Retail prices; "under review" banner in dashboard | Retail products |
| B2B **approved** | **Trade prices** (green badge) across the shop + price list in dashboard | Retail **and** professional products at trade pricing |

Files of interest: [`assets/js/auth.js`](assets/js/auth.js) (session),
[`shop/assets/js/pricing.js`](shop/assets/js/pricing.js) (tier overlay),
[`pages/account/index.html`](pages/account/index.html) (dashboard),
[`api/create-checkout-session.js`](api/create-checkout-session.js) (secure checkout).
