# Confirm before launch

These items are provisional in the preview. In the pages they're marked with dashed blue tags (`data-confirm="…"`). The production build won't enable indexing until every marker is removed.

| # | Item | Where it appears | What we need from you |
| --- | --- | --- | --- |
| 1 | **Business name** “Foundry Digital” | Logo, titles, footer, share image (`assets/og-image.png`) | Confirm the legal or trading name. Then set `production.business.confirmed: true` in `site.config.json`. |
| 2 | **Founder names** Samuel and Matthew | Home → About | Confirm names and how you want to be shown (first names only is fine). Optional: photos, if you want them. |
| 3 | **Domain** | Not shown anywhere yet | Confirm the domain you own. Then set `production.origin` (e.g. `https://www.example.com`) and `basePath`. `foundrydigital.com` is **not** assumed to be yours, and the old `hello@foundrydigital.com` address was removed. |
| 4 | **Inbox for enquiries** | Contact page (no address shown) | An inbox you control. Then configure the form service so it delivers there (see `CONTACT-FORM.md`). Decide whether to publish an email address on the site. |
| 5 | **Pricing approach** | Home “Clear scope and pricing”, Website design “How pricing works” | Approve the wording, or replace it. Decide whether to publish prices or ranges, and set deposit/payment terms. No prices were invented. |
| 6 | **Ownership terms** | Home “You own it”, Design FAQ, Support FAQ | Approve the statement that the client's domain, content and accounts stay in their name with access they control, and put it in your contract. |
| 7 | **Support terms** | Maintenance & support “How support works” | Plan options, what's covered, pricing, and how requests are handled. No response times are promised anywhere. |
| 8 | **Impressive Finishes permission** | Home “Recent project”, Our work | Written OK from the client to feature the project, and to use screenshots once we take them. Update the status from “In staging” once their site launches. Don't add traffic or lead figures unless they're measured and the client agrees. |
| 9 | **Privacy notice** | Not yet present | The form collects a name and email. Add a short privacy page (what's collected, why, how long it's kept, who processes it, e.g. the form provider) before launch. |

## Facts used for Impressive Finishes (verified from the staging site on 2026-11-09)

From `https://impressive-finishes.pages.dev/`, which currently sends `noindex, nofollow`:

- Family-owned painting company, North Metro Atlanta.
- Pages: home, about, services overview plus interior painting, exterior painting, drywall & carpentry repair, deck & fence staining; projects gallery; service areas; FAQ; contact.
- Estimate request form; call/text/estimate buttons fixed at the bottom of the screen on phones; phone link on every page checked; skip-to-content link.
- Green/cream palette with a serif italic accent.

Nothing else (results, launch date, quotes) is claimed. The Foundry site doesn't link to the staging URL, so the staging site isn't publicised.
