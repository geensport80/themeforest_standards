# Aurelia Dental — Dental Clinic Landing Page

A single-page HTML template for private dental and aesthetic clinics. It is built with semantic HTML5, one stylesheet driven by design tokens, and a small dependency-free script. There is no build step: open `index.html` and it works.

- Mobile-first, responsive from 320px to wide desktop
- Automatic dark mode, with a one-attribute opt-out
- WCAG 2.2 AA colour contrast, keyboard focus, and accessible form errors
- Responsive WebP images with JPEG fallbacks; no layout shift
- Pricing table and service grids that adapt to any number of items
- WordPress-ready class names and template boundaries

---

## Contents

1. [Project structure](#project-structure)
2. [Technology](#technology)
3. [Browser support](#browser-support)
4. [Getting started](#getting-started)
5. [Customisation](#customisation)
6. [Connecting the contact form](#connecting-the-contact-form)
7. [Images](#images)
8. [Accessibility and performance](#accessibility-and-performance)
9. [Credits and licences](#credits-and-licences)
10. [Changelog](#changelog)

---

## Project structure

```text
my-landing-project/
├── index.html                  Landing page markup
├── README.md                   This file
└── assets/
    ├── css/
    │   └── style.css           All styles: tokens, components, utilities
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
        └── og-share.jpg        Social sharing image (Open Graph), 1200 × 630
```

### Page sections

| Order | Section | Anchor |
| --- | --- | --- |
| 1 | Header and navigation | — |
| 2 | Hero with key figures | — |
| 3 | Services (dental care) | `#services` |
| 4 | Aesthetic treatments | `#aesthetics` |
| 5 | Approach | `#approach` |
| 6 | Patient stories | `#stories` |
| 7 | Clinicians | `#clinicians` |
| 8 | Visit (address and hours) | `#visit` |
| 9 | Pricing | `#pricing` |
| 10 | Contact and booking form | `#contact` |
| 11 | Footer | — |

### Stylesheet map

`style.css` is organised in numbered sections, listed in the table below. Each section begins with a comment header such as `/* ===== 08. Hero ===== */`.

| # | Section | # | Section |
| --- | --- | --- | --- |
| 01 | Design tokens | 11 | Services |
| 02 | Reset | 12 | Quote |
| 03 | Base | 13 | Opening hours |
| 04 | Layout and shared hover elevation | 14 | Contact and booking |
| 05 | Skip link | 15 | Site footer |
| 06 | Button | 16 | Pricing |
| 07 | Site header | 17 | WordPress core classes |
| 08 | Hero | 18 | Utilities |
| 09 | Section | 19 | Reduced motion |
| 10 | Cards | | |

---

## Technology

| Layer | Approach |
| --- | --- |
| Markup | Semantic HTML5 landmarks (`header`, `nav`, `main`, `section`, `footer`), Schema.org `Dentist` data in JSON-LD, Open Graph meta tags |
| Styles | Plain CSS with custom properties, BEM class names, mobile-first `min-width` media queries, `clamp()` fluid type and spacing, `color-mix()` derived colours |
| Script | Vanilla JavaScript (ES5 syntax), about 4 KB unminified, no libraries |
| Fonts | System font stack — no web fonts to download |
| Icons | Inline SVG, coloured with `currentColor` |
| Build | None required. The files are shipped unminified and readable |

---

## Browser support

| Browser | Minimum version |
| --- | --- |
| Chrome and Edge | 111 |
| Firefox | 113 |
| Safari (macOS and iOS) | 16.2 |
| Samsung Internet | 22 |

These minimums come from `color-mix()`, which derives hover, border and shadow colours from the base palette. On older browsers those derived colours are missing, so borders and shadows disappear, but the page stays usable.

A few features improve the page where available and are not required:

- `:has()` arranges four or more pricing plans in a 2 × 2 grid between 992px and 1199px.
- `text-wrap: balance` evens out the line lengths of headings.

---

## Getting started

1. Unzip the package.
2. Open `index.html` in a browser.

To test features that depend on a web server (canonical URLs, form submission), serve the folder locally. Any static server works:

```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve .
```

Then visit `http://localhost:8000`.

### Before you publish

- [ ] Replace `https://example.com/` in the `<head>`: canonical URL, Open Graph URLs and the JSON-LD block.
- [ ] Replace the clinic name, address, phone number and email address, in the page body and in the JSON-LD block.
- [ ] Replace `og-share.jpg` with your own 1200 × 630 image.
- [ ] Connect the contact form to a handler (see [Connecting the contact form](#connecting-the-contact-form)).
- [ ] Replace the map placeholder in the contact section with your map embed. Give the `<iframe>` a `title` and `loading="lazy"`.

---

## Customisation

### Colours

All colours are custom properties in section **01. Design tokens** of `style.css`. Change only the base colours; hover states, lines, glows and shadows are derived from them automatically.

```css
:root {
  --color-primary: #0b3b60;       /* buttons, badges */
  --color-on-primary: #ffffff;    /* text on primary */
  --color-accent: #00a896;        /* decorative only */
  --color-accent-strong: #007a6c; /* text, links, focus ring */
  --color-bg: #f8fafc;
  --color-surface: #ffffff;
  --color-text: #1e293b;
  --color-muted: #64748b;
  --color-danger: #b42318;        /* form errors */
}
```

Keep text colours at a contrast ratio of at least 4.5:1 against their background, and borders and focus rings at least 3:1.

### Dark mode

The page follows the visitor's system setting. The dark palette is the `@media (prefers-color-scheme: dark)` block right after the tokens; it overrides the same base colours.

To force the light theme, for example from a theme option, add `data-theme="light"` to the `<html>` element:

```html
<html lang="en" data-theme="light">
```

### Typography

Font sizes use fluid tokens such as `--text-body` and `--text-h1` to `--text-h3`, which scale between a minimum and a maximum with the viewport width. To use a web font, load it in the `<head>` and change `--font-sans`.

Form fields use `--text-form`, which never drops below 16px. Keep it that way: iOS Safari zooms the page when a field's text is smaller.

### Spacing and layout

| Token | Purpose |
| --- | --- |
| `--space-2xs` … `--space-2xl` | Spacing scale, 0.25rem to 4rem |
| `--space-fluid` | Vertical rhythm of each section (2rem on phones to 4rem on desktop) |
| `--container` | Content width: up to 72rem, with a gutter on small screens |
| `--radius-sm`, `--radius-lg`, `--radius-pill` | Corner radii |
| `--lift` | Hover rise of cards and buttons; set to 0 for visitors who prefer reduced motion |

### Breakpoints

The layout uses three `min-width` breakpoints: **768px**, **992px** and **1200px**. The 992px value is also used in `assets/js/main.js` (`desktopQuery`) to close the mobile menu. If you change it, change it in both files.

### Adding a section

Every content band uses the same pattern, so new sections match the rest of the page:

```html
<section class="section" id="example" aria-labelledby="example-heading">
  <header class="section__header">
    <p class="section__badge">Optional label</p>
    <h2 class="section__title" id="example-heading">Section title.</h2>
    <p class="section__lead">One or two sentences of introduction.</p>
  </header>
  <!-- section content -->
</section>
```

Add a link to the new section in both the header and footer navigation.

### Pricing table

- Add or remove `<li class="pricing-card">` items freely. From 992px wide, the cards share a single row, however many there are.
- Mark the recommended plan with `pricing-card--featured`. Give its button the plain `button` class, and give the other plans `button button--secondary`, so the recommended plan's button is the only filled one.
- Feature lists are plain `<li>` text; the tick icons come from CSS.

### Utility classes

Section **18. Utilities** provides a small set of Bootstrap-style helpers for quick adjustments: `m-0`, `mb-3`/`4`/`5`, `p-0`, `px-3`, `py-4`/`5`, `d-none`, `d-flex`, `flex-column`, `align-items-center`, `justify-content-center`, `justify-content-between`, and the 768px variants `d-md-none`, `d-md-flex` and `flex-md-row`. They use `!important` by design, so they always override component styles.

---

## Connecting the contact form

The form ships in demo mode: with `action="#"`, submitting it only shows a confirmation message on the page. To receive submissions:

1. Set the form's `action` to your handler URL (or replace the form with your form plugin's shortcode in WordPress). Once `action` is not `#`, the script lets valid submissions go through normally.
2. On the server, **validate every field again**. Browser validation can be bypassed.
3. Discard any submission where the hidden `website` field is filled in. It is a spam trap that people never see.
4. Protect the form with a CSRF token. In WordPress, use `wp_nonce_field()` and `check_admin_referer()`.
5. Serve the site over HTTPS. The form collects health information, which is a special category of personal data under GDPR and Thailand's PDPA.

Validation messages are stored in `data-error-required`, `data-error-format`, `data-msg-invalid` and `data-msg-success` attributes in the HTML, so you can translate them without touching JavaScript.

---

## Images

The hero image uses `<picture>` with WebP sources and JPEG fallbacks in three widths (640, 800 and 1200px). The browser picks the smallest file that is still sharp for the screen. The `sizes` attribute matches the hero layout in `style.css`; update it if you change the hero grid.

To replace the hero image:

1. Prepare a 1200 × 630 image (or keep any other ratio consistent across all sizes, and update the `width` and `height` attributes).
2. Export it at 640, 800 and 1200px wide as both JPEG and WebP. With [libwebp](https://developers.google.com/speed/webp/download) installed:

   ```bash
   cd assets/images
   for f in hero-640.jpg hero-800.jpg hero-banner.jpg; do
     cwebp -quiet -mt -m 6 -q 82 -sharp_yuv -metadata none "$f" -o "${f%.jpg}.webp"
   done
   ```

3. Keep `fetchpriority="high"` on the hero image and never add `loading="lazy"` to it: it is the largest element on first load.

Images added further down the page should have `width`, `height` and `loading="lazy"`.

---

## Accessibility and performance

**Accessibility (WCAG 2.2 AA)**

- Skip link, landmark regions, and one `h1` with an ordered heading outline
- Visible keyboard focus on every interactive element (`:focus-visible`)
- Text contrast of at least 4.5:1 and component contrast of at least 3:1, in both light and dark mode
- Form fields with visible labels and hints, per-field error messages, and focus moved to the first error
- Touch targets of at least 24px; most are 44px
- Hover effects are disabled on touch screens, and motion is removed for visitors who prefer reduced motion

**Performance**

- One stylesheet and one deferred script; no third-party requests
- Responsive WebP hero image, prioritised for Largest Contentful Paint
- Explicit image dimensions, so the layout does not shift while images load
- Hover animations use only `transform` and `opacity`

---

## Credits and licences

This template bundles no third-party scripts, stylesheets, fonts or images.

| Item | Source | Licence |
| --- | --- | --- |
| Fonts | System font stack, provided by the visitor's operating system | — |
| Icons | Inline SVG included in the markup | Template licence |
| Hero and social images | Included with the template | Template licence |

Development tools that are not part of the package:

| Tool | Licence |
| --- | --- |
| [libwebp](https://developers.google.com/speed/webp) (`cwebp`) | BSD-3-Clause |

---

## Changelog

### 1.0.0 — Milestone 1

- Initial release: semantic page structure, design tokens with dark mode, services, pricing and contact sections, responsive WebP hero image, accessible contact form, and reduced-motion support.
