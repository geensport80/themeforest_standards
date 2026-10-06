# Aurelia Dental — High-Converting Semantic Landing Page

Aurelia Dental is a single-page HTML template for private dental and aesthetic clinics. It is built for ThemeForest-style redistribution: semantic landmarks, one design-token stylesheet, and a small dependency-free script. There is no build step — open `index.html` and the page runs.

The layout leads with a clear value proposition, treatment plans, clinician trust, transparent pricing, and an accessible booking form so visitors can convert without hunting for the next step.

---

## Key Architectural Features

- **ThemeForest standard compliance** — BEM class names, mobile-first CSS, semantic HTML5, readable unminified assets, and WordPress-ready template boundaries in the markup.
- **Mobile-first responsive layout** — Intrinsic CSS Grid and Flexbox from ~320px to wide desktop; breakpoints at 768px, 992px, and 1200px.
- **WCAG 2.2 AA accessible** — Skip link, landmarks, visible `:focus-visible` rings, labelled form fields with per-field errors, 4.5:1 text contrast, and `prefers-reduced-motion` support. Meets WCAG 2.1 AA requirements as well.
- **Core Web Vitals oriented** — Prioritised LCP hero (`fetchpriority="high"`, no lazy-load), responsive WebP with JPEG fallbacks, explicit image dimensions to limit CLS, one stylesheet and one deferred script.
- **Zero dependencies** — No npm packages, CDNs, frameworks, or web fonts. System font stack and inline SVG only.

---

## Folder Structure

```text
my-landing-project/
├── index.html                  Landing page markup
├── README.md                   This file
├── .cursorrules                Project coding standards (for editors / agents)
└── assets/
    ├── css/
    │   └── style.css           Design tokens, components, utilities
    ├── js/
    │   └── main.js             Mobile menu and contact form validation
    └── images/
        ├── favicon.svg
        ├── logo.svg
        ├── hero-640.webp       Hero image, 640 px wide
        ├── hero-640.jpg        JPEG fallback
        ├── hero-800.webp       Hero image, 800 px wide
        ├── hero-800.jpg
        ├── hero-banner.webp    Hero image, 1200 px wide
        ├── hero-banner.jpg
        └── og-share.jpg        Open Graph share image, 1200 × 630
```

### Page sections

| Order | Section | Closing comment |
| --- | --- | --- |
| 1 | Site header | `<!-- /.site-header -->` |
| 2 | Hero | `<!-- /#hero -->` |
| 3 | Services | `<!-- /#services -->` |
| 4 | Aesthetics | `<!-- /#aesthetics -->` |
| 5 | Approach | `<!-- /#approach -->` |
| 6 | Stories | `<!-- /#stories -->` |
| 7 | Clinicians | `<!-- /#clinicians -->` |
| 8 | Visit | `<!-- /#visit -->` |
| 9 | Pricing | `<!-- /#pricing -->` |
| 10 | Contact | `<!-- /#contact -->` |
| 11 | Site footer | `<!-- /.site-footer -->` |

---

## Technologies Used

| Layer | Approach |
| --- | --- |
| Markup | HTML5 semantic landmarks (`header`, `nav`, `main`, `section`, `footer`), Schema.org `Dentist` JSON-LD, Open Graph meta tags |
| Layout | Modern CSS Grid and Flexbox, fluid `clamp()` type and spacing |
| Styling | Custom properties (design tokens), BEM, mobile-first `min-width` media queries, `color-mix()` derived colours |
| Script | Vanilla JavaScript (ES5-compatible syntax), deferred, no libraries |
| Fonts & icons | System font stack; inline SVG with `currentColor` |
| Build | None — files ship unminified and readable |

---

## How to Run / Preview Locally

1. Unzip (or clone) the package and open the `my-landing-project` folder.
2. Double-click `index.html`, or serve the folder so relative asset paths resolve the same way they will in production:

```bash
# From inside my-landing-project/

# Python 3
python -m http.server 8000

# Node.js
npx serve .
```

3. Visit `http://localhost:8000`.

All stylesheet, script, and image paths in `index.html` are relative to that file (`assets/...`). Preview from the project root so those paths resolve correctly.

### Before you publish

- Replace `https://example.com/` in the `<head>` (canonical, Open Graph, and JSON-LD).
- Replace clinic name, address, phone, and email in the body and JSON-LD.
- Replace `og-share.jpg` with your own 1200 × 630 image.
- Point the contact form `action` at a real handler (or a WordPress form shortcode). Re-validate every field on the server, discard honeypot submissions (`website`), and use a CSRF token over HTTPS.

---

## License & Attribution

This template bundles **no** third-party scripts, stylesheets, fonts, or stock photo libraries. Redistribution of the template itself follows the licence under which you purchased or obtained the package (for Envato / ThemeForest sales, that is typically the [Envato Regular or Extended License](https://themeforest.net/licenses/standard)).

| Item | Source | Licence |
| --- | --- | --- |
| Fonts | System font stack (visitor’s OS) | — |
| Icons | Inline SVG in the markup | Template licence |
| Hero and social images | Included with the template | Template licence |

Development-only tools that are **not** shipped in the buyer package:

| Tool | Licence |
| --- | --- |
| [libwebp](https://developers.google.com/speed/webp) (`cwebp`) | BSD-3-Clause |

Placeholder clinic details (`example.com`, demo phone and email) are for preview only — replace them before go-live.

---

## Changelog

### 1.0.0 — Milestone 1

- Initial packaging: semantic page structure, design tokens with dark mode, services, pricing and contact sections, responsive WebP hero, accessible contact form, cross-browser WebKit hardening, and reduced-motion support.
