# Confirm before launch

These items are provisional in the preview. They are **not** shown to visitors any more: each one is recorded in the page source as an HTML comment (`<!-- confirm: … -->`) next to the wording it affects. The production build won't enable indexing until every marker is removed, so nothing here can be launched by accident.

| # | Item | Where it appears | What we need from you |
| --- | --- | --- | --- |
| 1 | **Business name** “Foundry Digital” | Logo, titles, footer, share image (`assets/og-image.png`) | Confirm the legal or trading name. Then set `production.business.confirmed: true` in `site.config.json`. |
| 2 | **Founder names** Samuel and James | Home → About | Updated to James at your request. Optional: photos, if you want them. |
| 3 | **Domain** | Not shown anywhere yet | Confirm the domain you own. Then set `production.origin` (e.g. `https://www.example.com`) and `basePath`. `foundrydigital.com` is **not** assumed to be yours, and the old `hello@foundrydigital.com` address was removed. |
| 4 | **Inbox for enquiries** | Contact page (no address shown) | An inbox you control. Then configure the form service so it delivers there (see `CONTACT-FORM.md`). Decide whether to publish an email address on the site. |
| 5 | **Pricing approach** | Home “Straightforward costs”, Website design “How pricing works” | Approve the wording (“you’ll know what’s included and what it costs before work begins”; “a clear price for the agreed scope before any work starts”), or replace it. Decide whether to publish prices or ranges, and set deposit/payment terms. No prices were invented. |
| 6 | **Ownership & access** | Home “Ownership and access”, Design FAQ, Support FAQ | The preview now only promises to *explain* what the client owns, where it lives and how to get in. If you want to commit to “everything stays in your name”, approve that and put it in your contract. |
| 7 | **Support terms** | Home “Dependable support”, Maintenance & support “How support works” | Plan options, what's covered, pricing, and how requests are handled. No response times are promised anywhere. |
| 8 | **Impressive Finishes** | Home “Our work”, Our work page | Client approved being featured (2026-11-09). The before/after uses their current live site and our preview; when the redesign launches, update the screenshots and labels (see `PORTFOLIO-SCREENSHOTS.md`). No traffic or lead figures are claimed. |
| 9 | **Privacy notice** | Not yet present | The form collects a name and email. Add a short privacy page (what's collected, why, how long it's kept, who processes it, e.g. the form provider) before launch. |

## Facts used for Impressive Finishes (verified from the staging site on 2026-11-09)

From `https://impressive-finishes.pages.dev/`, which currently sends `noindex, nofollow`:

- Family-owned painting company, North Metro Atlanta.
- Pages: home, about, services overview plus interior painting, exterior painting, drywall & carpentry repair, deck & fence staining; projects gallery; service areas; FAQ; contact.
- Estimate request form; call/text/estimate buttons fixed at the bottom of the screen on phones; phone link on every page checked; skip-to-content link.
- Green/cream palette with a serif italic accent.

Nothing else (results, launch date, quotes) is claimed. The Foundry site doesn't link to the staging URL, so the staging site isn't publicised.
