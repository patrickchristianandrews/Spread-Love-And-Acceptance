# Infrastructure — DNS Configuration (GoDaddy → GitHub Pages)

Steps to point `spreadloveandacceptance.com` (registered at GoDaddy) at a GitHub Pages site.

## 1. Records to add in GoDaddy's DNS manager

For the apex/root domain (`spreadloveandacceptance.com`), add four **A records** pointing at GitHub Pages' IPs:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | @ | 185.199.108.153 | 600 |
| A | @ | 185.199.109.153 | 600 |
| A | @ | 185.199.110.153 | 600 |
| A | @ | 185.199.111.153 | 600 |

For the `www` subdomain, add a **CNAME record** pointing at your GitHub Pages URL:

| Type | Name | Value | TTL |
|---|---|---|---|
| CNAME | www | `<github-username>.github.io` | 600 |

Remove any pre-existing GoDaddy "parked domain" A records or forwarding records first — they conflict with the ones above.

## 2. Configure the repository

1. In the repo, add a file named exactly `CNAME` (no extension) at the repository root, containing a single line:
   ```
   spreadloveandacceptance.com
   ```
2. In **Settings → Pages**, set the custom domain field to `spreadloveandacceptance.com` and save.
3. Once DNS has propagated, check **Enforce HTTPS** in the same settings panel. GitHub issues the TLS certificate automatically, but this can take up to 24 hours after DNS first resolves.

## 3. Decide on the canonical host

Pick either the apex (`spreadloveandacceptance.com`) or `www` as canonical, and redirect the other to it, to avoid duplicate-content issues. GitHub Pages will serve either the apex or `www` as canonical based on which one is entered in the `CNAME` file and Pages settings — the DNS records above support both, but only the one matching the `CNAME` file will resolve correctly through GitHub's TLS certificate.

## 4. Verifying propagation

DNS changes can take anywhere from a few minutes to 48 hours to fully propagate. Check status with:

```
dig spreadloveandacceptance.com +noall +answer
dig www.spreadloveandacceptance.com +noall +answer
```

Both should resolve — the apex to the four GitHub A-record IPs, `www` to the `github.io` CNAME target.

## Troubleshooting

- **"Domain's DNS record could not be retrieved" in GitHub Settings:** usually a propagation delay — wait and retry.
- **HTTPS toggle greyed out:** DNS hasn't finished propagating, or the `CNAME` file doesn't match what's in Pages settings.
- **Site loads but shows a GitHub 404:** confirm `index.html` exists at the repository root and the Pages source branch/folder is set correctly in Settings.
