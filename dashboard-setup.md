# Household Dashboard — Setup

The dashboard (`dashboard.html`) is the only part of the site with accounts and stored data. The site itself stays static on GitHub Pages; the dashboard talks directly from the browser to a Supabase project, which provides sign-in and a Postgres database. There's no server code to host.

Until step 5 is done, `dashboard.html` runs in **preview mode**: a sample household you can click around in, with nothing saved. That's the easiest way to review the design before connecting anything.

## What gets stored, and who can see it

| Data | Who can see it | Enforced by |
|---|---|---|
| Register hours, ownership treaty, weekly closings | Both household members | Row-level security in `supabase/schema.sql` |
| Battery & Stress Meter check-ins | Both members; **only the person described can write theirs** | `user_id = auth.uid()` on insert/update |
| Check Your State log | Only the person who logged it | `user_id = auth.uid()` on every operation |
| Email address | The account holder (and Supabase, for sign-in) | Supabase Auth; never exposed to the partner |

A household holds at most two people. P(Solvency) only appears once both have done their own Battery check-in, per `epistemic-verdict-engine.md` ("never computed from one partner's inputs alone").

## 1. Create the Supabase project

1. Sign up at supabase.com and create a new project.
2. Pick a region close to your users (for example, East US).
3. Save the database password somewhere safe. You won't need it for the site, but you'll want it for the Supabase dashboard later.

## 2. Create the tables and security rules

1. In the project, open **SQL Editor → New query**.
2. Paste the entire contents of `supabase/schema.sql` and click **Run**.
3. Open **Table Editor** and confirm you see: `households`, `household_members`, `weeks`, `ledger_items`, `raci_tasks`, `asi_entries`, `state_checkins`. Each should show RLS as enabled.

## 3. Configure sign-in

In **Authentication**:

1. **Sign In / Providers → Email**: make sure Email is enabled. The dashboard uses emailed sign-in links (magic links), so there are no passwords.
2. **URL Configuration**:
   - Site URL: `https://spreadloveandacceptance.com`
   - Redirect URLs: add `https://spreadloveandacceptance.com/dashboard.html`
   - If you test locally, also add your local address (for example `http://localhost:8000/dashboard.html`).
3. **Emails → Templates → Magic Link** (optional): reword the email to match the site's voice. Keep the `{{ .ConfirmationURL }}` link in it.

## 4. Set up email sending before launch

Supabase's built-in email sender is meant for testing only and allows very few emails per hour. Before real households use the dashboard, go to **Authentication → Emails → SMTP Settings** and connect a real email-sending service (Supabase's docs list compatible providers). Without this, sign-in links will stop arriving once the hourly limit is hit.

## 5. Connect the site

1. In Supabase, open **Project Settings → API** (or **API Keys**).
2. Copy the **Project URL** and the **anon** (or **publishable**) key.
3. Paste both into `assets/js/dashboard-config.js`, replacing the placeholders.
4. Commit and push. GitHub Pages rebuilds in a minute or two.

**Never** put the `service_role` or "secret" key in the site. The anon/publishable key is safe to publish because the row-level security rules are what protect the data; the service key bypasses them.

## 6. Test it end to end

1. Open `https://spreadloveandacceptance.com/dashboard.html`. The "Preview mode" notice should be gone.
2. Sign in with your email, open the link, and choose **Start a Household**.
3. In a private/incognito window, sign in with a second email address, choose **Join a Household**, and enter the invite code shown in the first account's Household & Account section.
4. Check each of these:
   - An hours change in one window appears in the other after switching back to that tab.
   - Each person's Battery check-in shows up for the other, but the Check Your State log does not.
   - P(Solvency) stays blank until both Battery check-ins are in.
   - **Export my data** downloads a JSON file.
   - **Delete my account** on the test account removes it (confirm under Authentication → Users).

## 7. Keep the project awake

On Supabase's free plan, a project that sees no activity for about a week gets paused, and the dashboard stops working until you restore it from the Supabase dashboard. Either check in on it regularly or move to a paid plan once real households depend on it.

## Before launch: legal pages

`legal/privacy-policy.html` and `legal/terms-of-service.html` have been updated to describe the dashboard, Supabase, what each partner can see, retention, export, and deletion. Both are still marked as attorney drafts; include the dashboard sections in that review, and fill in the effective dates.

## Files

| File | Purpose |
|---|---|
| `dashboard.html` | The page, in the same frame as `roadmap.html` |
| `assets/css/dashboard.css` | Form controls and ledger components; everything else comes from `book-layout.css` |
| `assets/js/dashboard.js` | Sign-in, household setup, all dashboard sections, preview mode |
| `assets/js/dashboard-config.js` | Your Supabase URL and anon key |
| `supabase/schema.sql` | Tables, security rules, and the join/leave/delete functions |
