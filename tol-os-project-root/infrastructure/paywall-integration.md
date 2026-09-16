# Infrastructure — Paywall Integration (Gumroad / Stripe)

Since this site is fully static (GitHub Pages, no server), "paywall" here means **checkout links that gate access to specific manuscript files** — not a real-time subscription check, which would require a backend. Two options, in order of setup effort. **Option A is the one actually deployed** — see the live product details below before the general instructions.

## Live product (deployed)

- **Product:** Spread Love & Acceptance Relationship Survival Kit
- **Billing:** monthly recurring membership, handled entirely by Gumroad
- **Checkout URL:** `https://cloudpat.gumroad.com/l/vigkfs`
- **CTA lives in:** `index.html`, "Full Program" tier card (`#access-tiers` section)

```html
<a class="cta-button" href="https://cloudpat.gumroad.com/l/vigkfs">Get the Survival Kit</a>
```

No `gumroad.js` overlay script is used — this is a plain link-out button, so clicking it navigates the visitor to Gumroad's own checkout page rather than opening an in-page popup.

### Keeping the bundle in sync

Because this is billed as a recurring membership and `index.html` explicitly promises that *"everyone who joins keeps access to each new release,"* the file(s) actually delivered through Gumroad need to be re-uploaded there every time new manuscript chapters, workpapers, or calculators are added to this repo. Gumroad has no awareness of this GitHub repository — it only serves whatever's currently attached to the product on Gumroad's side. If the repo's content grows but the Gumroad-hosted bundle doesn't get refreshed to match, the site's "living program" promise silently stops being true for paying members. Worth a recurring reminder (e.g., re-export and re-upload the bundle any time the `/manuscript` or `/workpapers` inventory count changes).

## Option A — Gumroad (lowest effort)

Gumroad hosts both the checkout and the file delivery, so it needs almost nothing from this repo.

1. Create a product in the Gumroad dashboard, upload the gated manuscript content (e.g., a bundled PDF/EPUB export of `/manuscript`) directly to Gumroad.
2. Set price and any variants (e.g., "Book only" vs. "Book + workpapers"), or configure it as a recurring membership price, as done for the live product above.
3. Copy the product's **Overlay embed** or **Direct link** from Gumroad's embed panel.
4. Drop a button into the relevant page, e.g. in `index.html`:

```html
<a class="cta-button" href="https://your-account.gumroad.com/l/your-product-slug">Your button text</a>
```

Gumroad handles payment, receipts, recurring billing, and file delivery entirely on their side — no webhook or backend needed on this repo.

## Option B — Stripe Payment Links (more control, still no backend)

Stripe Payment Links can take payment without a server, but **file delivery after payment still needs somewhere to point people** — typically a "thank you" page with a download link, or an emailed link via Stripe's built-in post-payment email.

1. In the Stripe Dashboard, create a **Payment Link** for the product/price.
2. Set the Payment Link's confirmation page to a redirect URL, e.g. `https://spreadloveandacceptance.com/unlocked/` — a page you add to this repo that isn't linked from anywhere else (an "unlisted" page is not the same as access control; anyone with the URL can view it).
3. Link to the Payment Link from the site:

```html
<a href="https://buy.stripe.com/your-payment-link">Get the full manuscript</a>
```

### Important limitation

Neither option provides real access control on a static site — both rely on the gated content either being delivered externally (Gumroad) or living at an unlisted-but-technically-public URL (Stripe + GitHub Pages). The live product uses Gumroad specifically because it also handles recurring billing without any custom code. If genuine per-user access control is needed later (e.g., verifying an active subscription before showing repo-hosted content), that requires a backend — a small serverless function checking Gumroad's or Stripe's subscription-status API before granting access — which is out of scope for the current static-only phase.

## Phase note

The live product confirms Option A (Gumroad) as the deployed approach — it required zero backend work and handles the monthly recurring billing natively. Option B (Stripe) remains documented above as a fallback or future path if per-user access control eventually becomes necessary, but nothing on the current live site depends on it.
