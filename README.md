# CreatorStore AI — Supabase-connected MVP

## Files
- `index.html`, `styles.css`: responsive landing page and styles
- `app.js`: email signup/login and database-backed product management
- `supabase-config.js`: your Project URL and publishable key (placeholders by default)

## Configure Supabase
1. In Supabase, open Project Settings → API Keys (or Connect).
2. Copy Project URL and Publishable key.
3. Open `supabase-config.js` and replace:
   - `YOUR_PROJECT_URL` with your project URL
   - `YOUR_PUBLISHABLE_KEY` with your `sb_publishable_...` key
4. Do not use a secret key or service_role key in browser code.

## Deploy safely to a separate repository
Upload/replace these files in the `creatorstore-ai` GitHub repository only:
- `index.html`
- `styles.css`
- `app.js`
- `supabase-config.js`
- `README.md`

Commit to `main`; Vercel should redeploy from the connected repository.

## Supabase prerequisites
The initial SQL setup should have created `public.profiles` and `public.products` with RLS policies.
For email confirmation, configure the Supabase Auth URL Configuration Site URL to your Vercel domain and add the local/deployed redirect URLs under allowed redirect URLs if needed.

## Current functionality
- Email/password signup and login through Supabase Auth
- Profile row upsert for signed-in users
- Insert, list, and delete products through Supabase RLS

## Not included yet
- Public creator store pages
- Payments, order processing, protected downloads, courses, coaching calendar, or analytics
- Profile slug editor and public read policies
