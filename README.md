# Hypodermical-ecom

E-commerce shop for Hypodermical Benelux — professional aesthetic products and home care.

- **Retail (B2C):** anyone can shop the home-care range and check out via Stripe.
- **Trade (B2B):** certified professionals apply for an account (manually approved), then see
  wholesale pricing and the full professional range from a dashboard.

Static frontend (HTML/CSS/JS) + Supabase (B2B auth/pricing) + Vercel serverless (Stripe checkout).

## Structure
- `index.html` — landing page
- `pages/` — about, professionals (B2B login/apply), contact, account dashboard, legal
- `shop/` — catalogue, product pages, cart, checkout
- `api/` — serverless Stripe checkout (server-side price validation)
- `supabase/schema.sql` — database schema + row-level security

## Setup
See **[SETUP.md](SETUP.md)** for Supabase, Stripe, and Vercel configuration.
The site runs as a retail-only shop with no configuration; B2B and checkout activate once keys are added.
