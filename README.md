# CreatorStore AI — MVP 1

A mobile-first Stan Store-inspired prototype built with HTML, CSS and vanilla JavaScript.

## What works in this prototype
- Responsive landing page and product category cards
- Start / login demo modals
- Interactive creator dashboard preview
- Add and remove sample products (temporary browser-session state)
- Demo store-link copy interaction
- Mobile navigation

## Important limitations
This is a front-end prototype, not a production marketplace yet. It does not have real accounts, a database, secure file delivery, checkout, payment verification, or permanent product storage. Dashboard metrics are illustrative and do not represent real analytics.

## Preview locally
Open `index.html` in a browser, or use VS Code Live Server.

## Deploy as a separate GitHub + Vercel project
1. Create a NEW GitHub repository named `creatorstore-ai` (do not use `quantcrack-ai`).
2. Upload `index.html`, `styles.css`, `app.js`, and this README to the root of that new repository.
3. In Vercel, choose **Add New → Project** and import the new `creatorstore-ai` repository.
4. Framework preset: **Other**. Build command: leave blank. Output directory: leave blank / root, depending on the Vercel UI. This is a static HTML project.
5. Deploy and test the generated URL on desktop and mobile.

## Roadmap
1. Connect Supabase Auth and database in a separate backend iteration.
2. Add creator profiles and unique store slugs.
3. Add private file storage and access rules.
4. Integrate Razorpay with server-side payment verification and webhooks before enabling real purchases.
5. Add orders, refunds, analytics, and creator settings.
