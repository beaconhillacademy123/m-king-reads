# M King Reads

A mobile-first digital library for Nigeria and the world: thousands of free classic and African books, a beautiful reader, offline downloads, Read-Aloud and an installable app. Built with Next.js 16, Supabase and Vercel.

**Live app:** https://mkingreads.vercel.app

## What's inside

| Area | Highlights |
|---|---|
| Discovery | Book of the day, ranked "Trending" rail, genre rails, Stories from Africa, curated catalogue (110+ books), full 70,000-book Project Gutenberg open collection, search |
| Reader | Chapters for every Gutenberg book, 6 themes (3 Plus), 4 fonts (2 Plus), text size and line spacing, immersive tap-to-hide mode, bookmarks, cloud-synced progress, time-left estimate, Read-Aloud with speed control, offline download |
| Accounts | Library tabs (Reading / Saved / Finished / Offline), bookmarks, suggestions, reading streaks, daily goal and activity chart |
| App | Installable PWA with PNG + maskable icons, automatic install prompt (Android) and guided steps (iPhone), offline fallback page, cached covers |
| Earning | M King Reads Plus subscription, sponsored ad cards, Google AdSense slots, one-off support payments — all managed from `/admin` |
| SEO | Per-book metadata and Open Graph images, JSON-LD, `sitemap.xml`, `robots.txt` |

## How you earn

1. **Plus subscription** (`/premium`) — ₦1,000/month or ₦9,000/year by default. Readers transfer to the payout account, enter the reference, and you approve in **Admin → Payments**. Approval switches Plus on instantly; renewals are added on to the remaining time.
2. **Sponsored cards** (`/advertise`) — businesses book weekly placements (₦5,000/week by default) on the home page, book pages and between chapters. Create the card in **Admin → Sponsors**; views and clicks are tracked for reporting.
3. **Google AdSense** — when no sponsor is running, the ad slots can show AdSense. Set `NEXT_PUBLIC_ADSENSE_CLIENT` (e.g. `ca-pub-123…`) and `NEXT_PUBLIC_ADSENSE_SLOT` in Vercel once your AdSense account is approved. Plus members never see ads.
4. **Support** (`/support`) — one-off contributions of any amount.

Prices, payout account and the on/off switch live in **Admin → Settings**. The payout account is stored in the `booknest_billing_config` table and is only exposed through the `booknest_public_billing()` function while payments are enabled.

## Admin

Sign in with an account listed in `booknest_admins`, then open **Profile → Admin dashboard** (`/admin`):

- Overview — revenue (30 days / all time), active Plus members, readers, reading minutes; grant or remove Plus by email
- Payments — confirm or reject transfers
- Sponsors — publish, pause and delete sponsor cards
- Catalogue — add any Project Gutenberg book by ID (with a Nigerian copyright warning when the author died less than 70 years ago), feature or remove books
- Suggestions — approve reader suggestions
- Settings — prices and payout account

## Publishing on Google Play

The app is a Progressive Web App, so it can be wrapped for Play as a Trusted Web Activity:

1. Go to https://www.pwabuilder.com, enter `https://mkingreads.vercel.app`, and generate the **Android** package (package name e.g. `ng.mkingreads.app`).
2. PWABuilder gives you a signing key and an `assetlinks.json`. Put that file at `public/.well-known/assetlinks.json` and redeploy so the app opens without a browser bar.
3. Upload the `.aab` to the Play Console.

**Important — Play billing rules:** Google Play requires digital subscriptions sold *inside* a Play Store app to use Google Play Billing. Before submitting, either (a) integrate Play Billing through the Digital Goods API for the Plus purchase in the Android build, or (b) hide the in-app purchase buttons when running inside the Play app (detect `document.referrer` starting with `android-app://`) and keep selling Plus on the website. Ads (sponsors / AdSense) are allowed in Play apps.

## Development

1. Copy `.env.example` to `.env.local` and add the Supabase URL and publishable key.
2. `npm install`
3. `npm run dev`

Never put a Supabase secret/service-role key in browser code or in a `NEXT_PUBLIC_*` variable.

### Environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable / anon key |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for sitemap and social cards (optional) |
| `NEXT_PUBLIC_ADSENSE_CLIENT` / `NEXT_PUBLIC_ADSENSE_SLOT` | Google AdSense (optional) |

### Database

Migrations live in `supabase/migrations/`. `20261119120000_mkr_monetization.sql` adds billing, subscriptions, payment requests, sponsors, reading-day stats and admin functions — all with row-level security. Only `booknest_*` objects are touched.

## Content & licensing

M King Reads displays books only where the source and redistribution rights permit it. A book being public domain in the United States does **not** automatically mean it is public domain in Nigeria (life + 70 years). Check local copyright status before adding books — the admin catalogue tool warns you when an author died less than 70 years ago.
