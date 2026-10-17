# AI AgroProcurement

A student MVP for agricultural procurement in Kazakhstan. Buyers publish requests, suppliers submit KZT offers, and buyers compare them and receive explainable rule-based recommendations. All supplied companies, contacts, products, prices and offers are fictional demonstration data.

## Stack

React 19, TypeScript, Vite 7, Tailwind CSS 4, Lucide React, browser localStorage, and the Node.js test runner. No backend or database.

## Install, launch and verify

Use Node.js 22.18+ or a newer supported release. Open a terminal in this project folder:

```sh
npm install
npm run dev -- --port 5173
```

Open the Local URL Vite prints, normally http://localhost:5173/. If the port is occupied, use the next port printed by Vite. Keep the same browser/profile/origin throughout the demonstration: storage is scoped to the origin. Stop the server with Ctrl+C.

```sh
npm test
npm run build
npm run preview
```

Build checks TypeScript and outputs production assets to `dist/`. Production preview normally runs at http://localhost:4173/ and has a separate localStorage store from port 5173. Hash routes support refresh without server routing configuration.

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Buyer | buyer@agro.demo | Buyer123! |
| Supplier | supplier@agro.demo | Supplier123! |

At Login, choose Buyer demo or Supplier demo to fill credentials, then Sign in. Once signed in, the Buyer demo / Supplier demo controls above the heading switch accounts in one click without deleting data. Logout ends the session.

Register new accounts with name, company, email, role and matching passwords. Passwords require at least eight characters, a letter and a number. Emails are normalized and duplicates rejected. New buyers have empty personal request lists; sample requests belong to the demo buyer. Use sample passwords only.

## Features

- Buyer/supplier registration, login, persistent sessions, logout and role-protected navigation.
- Fictional Kazakhstan supplier catalog with product/contact details, KZT prices, combined supplier/product search, category filters, reset and empty states.
- Buyer request creation with required fields, positive quantities, valid category/unit and future-or-today deadlines; personal lists and details.
- Supplier opportunities, specifications, quantity/deadline display, and offer submission.
- KZT offer prices, quantities, integer delivery days, specifications, declared match and optional notes. One non-demo submission per supplier per request.
- Supplier My Offers and buyer Offers Received; counts derived from saved linked records.
- Side-by-side comparison with request selector, sorting, metric highlights, ties and exclusion reasons.
- Explainable Smart Ranking with sliders, normalized weights, contribution bars, calculations and exclusions.
- Responsive sidebar, mobile navigation, Escape dismissal, skip-to-content, first-error focus, improved contrast and reduced-motion support.

Buyers access only their own requests and offers. Suppliers browse open requests and see only their own offers; buyer creation/comparison/ranking routes are restricted. Sessions and data changes synchronize across tabs sharing the origin.

## Ranking formula

```text
S = wP * P + wD * D + wM * M
P = (maximum eligible price - offer price)
    / (maximum eligible price - minimum eligible price)
D = (maximum eligible delivery days - offer delivery days)
    / (maximum eligible delivery days - minimum eligible delivery days)
M = proportion of required specification attributes satisfied
```

Default weights: 40% price, 30% delivery, 30% match. Relative slider inputs are divided by their sum. All-zero inputs use defaults. Equal prices or delivery times receive component value 1 for every eligible offer, including a single-offer set. Calculations use full precision; display percentages are rounded. Exact score ties share rank/recommendation; IDs resolve display order only.

Eligibility is checked first: quantity must meet demand and arrival (recorded submission date plus offered days) must meet the deadline. Excluded offers do not affect normalization and appear separately with reasons. Stored match percentages are supplier-declared aggregate proportions divided by 100, not inferred from text or independently verified. Bars display contributed percentage points, e.g. 0.52 * 40% = 20.8 points.

This is a rule-based decision-support system using demonstration data. It does not use a trained AI/ML model. The final purchasing decision remains with the buyer.

### Main fertilizer scenario

The main request is 10 tonnes, due 2027-03-15. Original offers were submitted on 2026-10-18.

| Offer | KZT/tonne | Days | Match | P | D | Score | Rank |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A | 182,000 | 5 | 100% | 0.52 | 0.666667 | 70.8% | 1 |
| B | 170,000 | 9 | 80% | 1 | 0 | 64.0% | 2 |
| C | 195,000 | 3 | 100% | 0 | 1 | 60.0% | 3 |

D offers only 6 tonnes; E arrives late. Eleven original offers span three requests. Normal mode includes all saved offers. Additional eligible submissions may change scores and positions. The clearly labeled demonstration scenario toggle considers original A-E records only, excludes D/E, and preserves all other stored submissions.

## Project-defense demonstration

1. Launch the dev server and sign in with Buyer demo -> Sign in.
2. Open Suppliers. Search `wheat`, select Seeds, show matches, then search an unknown product to show the empty state. Reset filters.
3. Open My Requests -> Create purchase request. Submit empty fields to demonstrate validation/focus. Complete the form with a fictional product, category, positive quantity, unit, specifications, future deadline and description. Publish, then refresh to show persistence.
4. Switch using Supplier demo above the heading. Open Opportunities, find the new request, and Submit offer. Enter a positive KZT price, enough quantity, whole delivery days within the deadline, specifications and 100% declared match. Submit; show My offers and refresh.
5. Switch using Buyer demo. Open Supplier offers, show the response, and open its request details to show the updated count.
6. Open Offer comparison. Select the main NPK fertilizer request. Explain the columns and exclusion reasons, demonstrate each sort order, and scroll the comparison horizontally on smaller screens.
7. Select View Smart Ranking. The same request opens. Enable Reproduce demonstration scenario A-C (retain ineligible D/E) and Reset to Default Weights. Show A 70.8%, B 64.0%, C 60.0%.
8. Expand How scores are calculated and Show calculation for this offer. Explain eligible-only normalization, declared match and contribution points. Show excluded D/E and their reasons.
9. Set price to 100 and the other sliders to zero: B leads. Set delivery to 100 and others to zero: C leads. Reset to restore A. Turn demonstration mode off to show how additional saved offers participate in normal mode.
10. Switch to Supplier demo and visit `/#/buyer/ranking/demo-npk`: access redirects to supplier overview. Logout and open a protected route: Login appears. Optionally register distinct Buyer/Supplier accounts to show separate ownership.
11. End with the transparency notice: no trained model or live prices; the buyer retains the final decision.

The walkthrough creates local data. Repeat with new requests if needed. There is no destructive reset needed to reproduce A-C. Do not clear site data during the demonstration.

## Quality assurance

`npm test` runs 47 tests covering authentication, roles, validation, request ownership, search/filters, persistence, storage failures/corruption, offers/counts, comparison, ranking formula, weights, equal values, exclusions, and full registered-user workflow/demo-switch preservation.

Browser QA covers both-role registration/login, request and offer forms, first-error focus, refresh, buyer receipt, comparison sorting, ranking sliders/reset, exclusions, demo switching, route protection, and desktop/mobile layouts. `npm run build` verifies TypeScript and production bundling.

## Limitations

- Browser-only demo authentication, plain-text local passwords and editable localStorage. Not a production security boundary. Never use real passwords.
- No backend, database, cross-device synchronization, orders, payments, live supplier prices, verification, or trained AI/ML functionality.
- Match/specifications are supplier-declared. Eligibility checks quantity and deadline only.
- Settings, Help and Company Profile remain labeled future sections. No offer editing/withdrawal, contract award or fulfillment workflow.
- Some overview metrics are labeled illustrative; request/offer counts reflect saved records.
- Browser storage must be enabled and have space. Clearing it removes locally created data; missing storage keys trigger initial demo seeding. Invalid saved requests/offers show errors rather than silently overwriting records.
- New submissions need an Open request with a deadline not in the past. After seeded deadlines pass, create a new future-dated request to demonstrate submission; historical ranking uses original submission dates.

## Structure

`src/App.tsx`: shell and hash navigation. `auth.ts`, `procurement.ts`, `offers.ts`, `comparison.ts`, `ranking.ts`: data/calculation logic. Page components render each workflow. `styles.css`: Tailwind entry and agritech design. `tests/`: automated suites.
