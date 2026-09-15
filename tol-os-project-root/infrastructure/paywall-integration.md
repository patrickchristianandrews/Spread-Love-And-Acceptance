# Infrastructure — Paywall Integration (Gumroad / Stripe)

Since this site is fully static (GitHub Pages, no server), "paywall" here means **checkout links that gate access to specific manuscript files** — not a real-time subscription check, which would require a backend. Two options, in order of setup effort.

## Option A — Gumroad (lowest effort)

Gumroad hosts both the checkout and the file delivery, so it needs almost nothing from this repo.

1. Create a product in the Gumroad dashboard, upload the gated manuscript content (e.g., a bundled PDF/EPUB export of `/manuscript`) directly to Gumroad.
2. Set price and any variants (e.g., "Book only" vs. "Book + workpapers").
3. Copy the product's **Overlay embed** or **Direct link** from Gumroad's embed panel.
4. Drop a button into the relevant page, e.g. in `index.html` before `</body>`:

```html
<script src="https://gumroad.com/js/gumroad.js"></script>
<a class="gumroad-button" href="https://gum.co/your-product-id">Get the full manuscript</a>
```

Gumroad handles payment, receipts, and file delivery entirely on their side — no webhook or backend needed on this repo.

## Option B — Stripe Payment Links (more control, still no backend)

Stripe Payment Links can take payment without a server, but **file delivery after payment still needs somewhere to point people** — typically a "thank you" page with a download link, or an emailed link via Stripe's built-in post-payment email.

1. In the Stripe Dashboard, create a **Payment Link** for the product/price.
2. Set the Payment Link's confirmation page to a redirect URL, e.g. `https://spreadloveandacceptance.com/unlocked/` — a page you add to this repo that isn't linked from anywhere else (an "unlisted" page is not the same as access control; anyone with the URL can view it).
3. Link to the Payment Link from the site:

```html
<a href="https://buy.stripe.com/your-payment-link">Get the full manuscript</a>
```

### Important limitation

Neither option provides real access control on a static site — both rely on the gated content either being delivered externally (Gumroad) or living at an unlisted-but-technically-public URL (Stripe + GitHub Pages). If genuine per-user access control is needed later, that requires a backend (e.g., a small serverless function verifying a Stripe webhook before issuing a signed download URL), which is out of scope for the current static-only phase noted in the Q&A above.

## Suggested phase note

Given the site is "static now, backend later," Option A (Gumroad) is the better fit for Phase 1 — it requires zero backend work and can be swapped for Option B or a custom backend later without changing the manuscript files themselves.
