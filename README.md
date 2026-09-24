# spreadloveandacceptance.com

Everything in this folder is the website. Upload the whole folder to the root of your GitHub Pages repo.

## Before you launch

1. **Gumroad link.** Open `site.js` and replace `joinUrl` near the top with your Gumroad product link. Every Join button on the site reads from that one line.
2. **Remove the test member.** `python3 manage-members.py remove test@example.com`
3. Push:
   ```
   git add -A && git commit -m "Launch site" && git push
   ```

## Members

The members list (`members.json`) is public, so it stores a one-way fingerprint of each email, never the address.

- New subscriber: `python3 manage-members.py add their@email.com`, then commit and push `members.json`.
- Cancellation: your refund policy promises access until the end of the paid period, so remove them when that period ends, not when the cancellation notice arrives: `python3 manage-members.py remove their@email.com`, then push.
- Check someone: `python3 manage-members.py check their@email.com`

A member signs in once with their subscription email and every members page opens in that browser. Each visit re-checks the list, so removing someone locks them out on their next page load.

## Changing the site

- **Make a page free or members-only:** in `site.js`, add or remove `paid: true` on that page's line in `SECTIONS`.
- **Add a page:** add one line to `SECTIONS`, and put these two lines in the new page's `<head>`:
  ```html
  <link rel="stylesheet" href="site.css">
  <script src="site.js" defer></script>
  ```
  Wrap any members-only part in `<div class="locked-section"> … </div>`.

## Testing on your computer

Sign-in needs the site served over http, not opened as a file:
```
cd this-folder && python3 -m http.server 8000
```
Then visit http://localhost:8000.

## Limits worth knowing

This is a static site, so members content is hidden in the browser, not withheld by a server. Anyone who views the page source can read it. That's normal for a small membership at this stage; if it becomes a problem, the next step is a host with real login (Gumroad's own content delivery, Memberful, or similar).
