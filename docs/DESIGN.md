# Design

The visual language of Travel Roots and how its assets are produced. All tokens and components live in `public/css/app.css`.

## Direction

An editorial travel-magazine feel rather than a generic booking template: serif headlines, an earthy palette, hairline rules instead of heavy shadows, generous whitespace and photography doing most of the work. Introduced in version 2.1.0.

## Logo

`public/images/logo.svg` is the source of truth. A map pin marks a destination and holds a globe (anywhere in the world); a dotted terracotta line traces the journey to it. The mark sits on a rounded forest-green tile so it reads well as a browser tab icon at 16 pixels.

- `favicon.svg` is a copy of `logo.svg`. Browsers that cannot use SVG icons get `favicon-32.png`; phones get `apple-touch-icon.png`, and `site.webmanifest` lists `icon-192.png` and `icon-512.png`.
- In the interface the logo always appears next to the "Travel Roots" wordmark set in Fraunces.

## Colour

| Token           | Light     | Dark      | Used for                                 |
| --------------- | --------- | --------- | ---------------------------------------- |
| `--paper`       | `#f7f4ee` | `#121310` | Page background                          |
| `--surface`     | `#fffdf9` | `#191a16` | Cards, panels, inputs                    |
| `--sand`        | `#efe8dc` | `#22231e` | Footer, hover backgrounds                |
| `--ink`         | `#1d1c19` | `#ece7dc` | Main text                                |
| `--muted`       | `#6c675d` | `#a49e91` | Secondary text                           |
| `--line`        | `#e2d9ca` | `#31322b` | Hairline borders                         |
| `--forest`      | `#1f4d3a` | `#8cc4a5` | Primary buttons, links, brand            |
| `--clay`        | `#b4532c` | `#e08a62` | Accents: eyebrows, kickers, active tabs  |
| `--star`        | `#b7791f` | `#e3ad4f` | Ratings                                  |

The theme follows the operating system and can be toggled from the header. The choice is remembered only when the visitor allows preference storage in the cookie banner.

## Typography

- **Fraunces** (variable serif) for headings, the wordmark and large numbers.
- **Inter** (variable sans) for everything else.
- Both are self-hosted from the `@fontsource-variable` packages, Latin subset only, and preloaded in the page head. Characters outside the subset, such as the rupee sign, fall back to the system font.

## Components

- **Hero**: headline with an italic forest-green phrase, a search panel and a photo with a "top rated right now" card built from real data.
- **Category bar**: icons with labels, underlined when active.
- **Listing card**: 4:3 photo, a terracotta kicker ("New", "Guest favourite" or the category), place, title and nightly price, with an optional price including GST.
- **Destinations gallery**: six panels; the active panel widens with a slow zoom and a terracotta progress line, and the others show the country name vertically. It rotates every five seconds while visible, pauses on hover or keyboard focus, becomes a swipeable carousel on phones and stops moving for visitors who prefer reduced motion.
- **Notices**: toast messages for success and errors, which close on their own after six seconds.

## Icons

`public/images/icons.svg` is a sprite of 63 symbols: Lucide icons (ISC License), three brand marks from Simple Icons (CC0) and a hand-drawn LinkedIn mark. Templates use `helpers.icon("name")`, which outputs an `<svg>` element referencing the sprite.

To add or change icons, edit the list in `scripts/assets/build-icons.js` and run it as described at the top of that file.

## Images

| File                         | Source                                   | Sizes              |
| ---------------------------- | ---------------------------------------- | ------------------ |
| `hero-*.webp`                | Unsplash photo `1476514525535-07fb3b4ae5f1` | 640, 960, 1280 px wide, 5:4 |
| `auth-*.webp`                | Unsplash photo `1522708323590-d24dbb6b0267` | 640, 960 px wide, 4:5 |
| `test-listing.webp`          | `scripts/assets/test-listing.svg`        | 1600 x 1200        |
| PNG icons                    | `logo.svg`                               | 32, 180, 192, 512  |
| `placeholder.svg`            | Hand-made                                | Used when a listing has no photo |

Run `scripts/assets/build-images.js` to regenerate all of them.

Listing photos are not stored in the repository. They come from Cloudinary (uploads) or Unsplash (seed data), and `helpers.imageUrl()` requests resized, cropped WebP versions with a responsive `srcset`.

## Accessibility

- A skip link, labelled form controls, visible focus outlines and ARIA labels on icon-only buttons.
- Decorative icons are hidden from screen readers; meaningful ones carry a label.
- Text colours were chosen for readable contrast against the paper background in both themes.
- All motion stops when the visitor's system asks for reduced motion.
