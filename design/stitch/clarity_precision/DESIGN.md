---
name: Clarity & Precision
colors:
  surface: '#FFFFFF'
  surface-dim: '#dcd9dc'
  surface-bright: '#fcf8fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f5'
  surface-container: '#f0edef'
  surface-container-high: '#eae7ea'
  surface-container-highest: '#e4e2e4'
  on-surface: '#1b1b1d'
  on-surface-variant: '#414753'
  inverse-surface: '#303032'
  inverse-on-surface: '#f3f0f2'
  outline: '#717785'
  outline-variant: '#c1c6d6'
  surface-tint: '#005cbb'
  primary: '#0059b5'
  on-primary: '#ffffff'
  primary-container: '#0071e3'
  on-primary-container: '#fcfbff'
  inverse-primary: '#abc7ff'
  secondary: '#5e5e63'
  on-secondary: '#ffffff'
  secondary-container: '#e0dfe4'
  on-secondary-container: '#626267'
  tertiary: '#535c66'
  on-tertiary: '#ffffff'
  tertiary-container: '#6c757f'
  on-tertiary-container: '#fbfbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d7e2ff'
  primary-fixed-dim: '#abc7ff'
  on-primary-fixed: '#001b3f'
  on-primary-fixed-variant: '#00458f'
  secondary-fixed: '#e3e2e7'
  secondary-fixed-dim: '#c7c6cb'
  on-secondary-fixed: '#1a1b1f'
  on-secondary-fixed-variant: '#46464b'
  tertiary-fixed: '#dae3ef'
  tertiary-fixed-dim: '#bec7d3'
  on-tertiary-fixed: '#141c25'
  on-tertiary-fixed-variant: '#3f4851'
  background: '#fcf8fb'
  on-background: '#1b1b1d'
  surface-variant: '#e4e2e4'
  bg-alternate: '#F5F5F7'
  text-tertiary: '#86868B'
  separator: '#E5E5EA'
  accent-hover: '#0077ED'
  link: '#0066CC'
  hero-black: '#000000'
  status-lunas-text: '#1D7A3C'
  status-lunas-bg: '#E4F6EA'
  status-pending-text: '#A15C00'
  status-pending-bg: '#FFF1D6'
  status-unpaid-text: '#6E6E73'
  status-unpaid-bg: '#EEEEF1'
  status-rejected-text: '#C4271B'
  status-rejected-bg: '#FDE7E5'
  eval-step-1: '#EEF2F8'
  eval-step-2: '#B8D4F7'
  eval-step-3: '#5CA2F0'
  eval-step-4: '#0071E3'
typography:
  display-hero:
    fontFamily: Inter
    fontSize: 72px
    fontWeight: '600'
    lineHeight: 80px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-hero:
    fontFamily: Inter
    fontSize: 56px
    fontWeight: '600'
    lineHeight: 62px
    letterSpacing: -0.02em
  headline-hero-mobile:
    fontFamily: Inter
    fontSize: 34px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-section:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.015em
  headline-section-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-tile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-tile-mobile:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.005em
  subhead:
    fontFamily: Inter
    fontSize: 21px
    fontWeight: '400'
    lineHeight: 28px
  subhead-mobile:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 24px
  body-large:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '600'
    lineHeight: 24px
  body-default:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 24px
  body-table:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  caption:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  caption-small:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 0.75rem
  margin: 3rem
  margin-tablet: 2rem
  margin-mobile: 1.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

# DESIGN.md — SKMS (Smart Kindergarten Management System)

Responsive web app for RA Waladun Sholeh, Indonesia. UI language: Bahasa Indonesia, plain, polite, short.
Users: Admin/Tata Usaha, Guru, Kepala Sekolah, Orang Tua.
It is a WEBSITE opened in a browser on any device (phone, tablet, laptop). Every screen must work well at mobile (390px), tablet (834px) and desktop (1440px). Never a native Android/iOS app: no status bar, no device frame, no Material components.

## 1. Direction: Apple clarity, responsive

Clean, elegant, calm. Inspired by apple.com (large type, whitespace, tiles) and Apple's Human Interface Guidelines (grouped lists, segmented controls, sheets, tab bars). The same visual language scales across screen sizes; only layout and navigation adapt.
- Generous whitespace, but whitespace must be balanced by large, confident elements. Clean does NOT mean flat or tiny.
- Neutral grays plus ONE accent blue. Color is used for meaning (status, actions) and for one focal block per screen.
- Large type contrast: huge headlines and big numbers next to small captions create the hierarchy.
- Large numbers act as the visual hero (for example "81%", "Rp 350.000"), instead of photos or illustrations.
- Craft over decoration: precise alignment, consistent spacing, subtle motion.
- No illustrations, no mascots, no gradients, no emoji.

## 2. Visual weight rules (mandatory on every screen)

These rules exist because minimal screens easily turn out flat, small, and empty. Follow them literally.
1. **One focal point per screen**: a headline of 40px or larger, or a big number of 56px or larger.
2. **Minimum text size 14px** in main content (footer and tiny captions 12px). Nothing in the main content may be smaller than 14px.
3. **Alternate section backgrounds**: white (`#FFFFFF`) and light gray (`#F5F5F7`). Tiles on gray are white; tiles on white are gray. Tiles must be visibly distinct from the background.
4. **One solid color block per screen at most**: accent blue (or near-black for the principal dashboard hero). Use it for the single most important item: the unpaid bill, the verification count, the SPP percentage. Everything else stays white, gray, or tinted.
5. **Primary actions are always solid blue pills** (or white pills on the blue block). **Status is always a tinted capsule.** Never render a button or a status as plain text.
6. **Navigation items** have at least 32px spacing between them and 14px text.
7. **Hierarchy through size**: at least a 3x size ratio between the biggest and the smallest text in the main content.
8. Spacing is generous: section vertical padding 96px desktop, 64px tablet, 48px mobile; tile padding 40-48px desktop, 24px mobile.
9. Every list row has a clear two-line structure: a 17px semibold title and a 15px gray detail line.

## 3. Responsive principles

Breakpoints:
- Mobile: up to 639px (design at 390px)
- Tablet: 640px to 1023px (design at 834px)
- Desktop: 1024px and up (design at 1440px)

Rules:
1. Mobile-first: design the 390px layout first, then enhance for larger screens.
2. Same components and tokens at every size. Do not invent separate designs per device.
3. Content max-width: 680px for forms and reading, 1100px for dashboards and tiles, 1200px for tables, centered. Never stretch text across a wide screen.
4. Page padding: 20px mobile, 32px tablet, 48px desktop.
5. Touch first: tap targets at least 44px (48px on parent screens) at all sizes. Hover effects are extras, never required.
6. Nothing may scroll sideways except tables inside their own scroll container.

How layouts adapt:
| Pattern | Mobile | Tablet | Desktop |
|---|---|---|---|
| Tile grid (bento) | 1 column | 2 columns | 2 to 4 columns, mixed tile sizes |
| Two-pane (list + detail) | list screen, then detail screen | list + detail side by side (list 280px) | list 340px + detail |
| Data table | stacked row list (name, key value, status capsule, chevron); tap opens detail | table with fewer columns | full table |
| Forms | single column, full width | single column 560px | single column 640px, optional side preview |
| Modal | bottom sheet, grabber handle | centered dialog 480px | centered dialog 480px |
| Filters | horizontal scroll chips or a "Filter" sheet | inline segmented controls | inline segmented controls and search |
| Primary action | full-width pill in content or sticky bottom bar | pill in local nav | pill in local nav |
| Charts | full width, one per section | 2 per row | per tile |

## 4. Color

```
--bg:            #F5F5F7   alternate section background
--surface:       #FFFFFF   tiles, panels, sheets, tables
--text:          #1D1D1F   primary text
--text-2:        #6E6E73   secondary text
--text-3:        #86868B   tertiary, placeholders
--separator:     #E5E5EA   hairlines (1px)
--accent:        #0071E3   primary buttons, focal block, active states, focus ring
--accent-hover:  #0077ED
--link:          #0066CC   text links
--accent-soft:   #E8F1FD   selected row, avatar tint, soft highlight
--black:         #000000   optional dark hero section (Kepala Sekolah only)
```

Status (text on tinted background, capsule, 14px medium, 32px high; 12px in dense tables):
- Lunas: `#1D7A3C` on `#E4F6EA`
- Menunggu Verifikasi: `#A15C00` on `#FFF1D6`
- Belum Bayar: `#6E6E73` on `#EEEEF1`
- Ditolak: `#C4271B` on `#FDE7E5`

On the solid blue block, the status capsule keeps its tinted colors (light amber on blue is readable) and buttons turn white with blue text.
Assessment levels BB / MB / BSH / BSB: four steps of the same blue from `#EEF2F8` to `#0071E3`, letters always visible (capsule 14px).
Dark mode optional: same tokens inverted (`#000000` / `#1C1C1E` surfaces, `#F5F5F7` text).

## 5. Typography

- Font: SF Pro via the system stack `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, system-ui, sans-serif`. In tools that cannot load SF Pro, use Inter.
- Responsive scale (mobile / desktop):
  - Hero headline: 34px / 56px, weight 600, line-height 1.1, tracking -0.02em
  - Section headline: 28px / 40px, weight 600
  - Tile headline: 22px / 28px, weight 600
  - Subhead: 17px / 21px, weight 400, `--text-2`
  - Body and row title: 17px (staff tables 15px)
  - Row detail: 15px, `--text-2`
  - Caption: 14px, `--text-2` (footer 12px)
  - Big number: 48px / 72px, weight 600, tabular figures
- Max 5 sizes per screen. Headlines are centered only on landing-style screens (login, hero blocks); lists, tables and forms are left-aligned.
- No handwriting fonts, no serif, no all-caps except 12px captions.

## 6. Shape, depth, spacing

- Radius: tiles 28px desktop / 20px mobile, tables and panels 20px, inputs and secondary buttons 12px, primary buttons and capsules fully rounded (pill), avatars circular.
- Depth: none by default. Tiles are flat fills. Only floating layers (dropdown, dialog, bottom sheet) get a soft shadow `0 8px 30px rgba(0,0,0,0.12)`.
- Translucent bars: global nav, local nav, bottom tab bar and sticky action bars use `rgba(251,251,253,0.8)` with backdrop blur 20px and a 1px hairline. This is the only blur allowed.
- Spacing on an 8px grid. Tile gap 12px mobile, 24px desktop.

## 7. Navigation (adapts per breakpoint)

**Global nav**
- Desktop and tablet: 44px translucent top bar. Left: "SKMS" wordmark (17px semibold). Center: up to 6 text items (14px, 40px spacing; active item in `--text`, others at 70% opacity). Right: user name with dropdown (Profil, Keluar).
- Mobile: 48px top bar with wordmark and, for staff roles with many items (Admin), a menu button that opens a full-height sheet listing all items (grouped). Parents, teachers and the principal use the bottom tab bar instead of the menu.

**Bottom tab bar (mobile and small tablet)**: 3 to 4 tabs, outline icons (Lucide 1.5px) plus 11px labels, active tab in `--accent`, translucent background. No pill indicator, no floating action button.

**Local nav (sub-nav)**: sticky 52px bar under the global nav on tablet and desktop with the page title at left (21px semibold) and one primary pill action at right. On mobile, the title becomes a large title inside the page (34px) and the primary action moves into the content or a sticky bottom bar.

**Menus per role**
- Admin: Beranda, Siswa (Data Siswa, Orang Tua, Guru, Kelas), Keuangan (Tagihan SPP, Verifikasi, Buku Kas), Pengumuman, Laporan. Mobile: menu sheet with the same groups.
- Guru: Beranda, Jurnal, Catatan Anekdot, Riwayat. Mobile and tablet: bottom tab bar with 4 tabs.
- Kepala Sekolah: Ringkasan, Laporan Keuangan, Laporan Evaluasi. Mobile: bottom tab bar with 3 tabs.
- Orang Tua: Beranda, Tagihan, Perkembangan, Profil. Bottom tab bar on mobile, top nav on desktop.

## 8. Components (all responsive)

- **Buttons**: primary = solid `--accent` pill, white text, 17px, 52px high on parent screens (44px staff, 48px mobile). Secondary = `--accent-soft` fill with accent text, or blue text link with chevron ("Lihat detail >", 17px). Destructive = red outlined pill. Pressed: scale 0.98. Full width on mobile when it is the main action.
- **Inputs**: 48px high, white, 1px `--separator`, radius 12px, focus ring 3px `rgba(0,113,227,0.25)` plus accent border. Labels above, 14px `--text-2`. Error text in red under the field. Use correct mobile keyboards.
- **Tiles**: rounded containers with one headline and one key number or short list. Used on dashboards and home screens instead of identical stat-card rows. No icons in tile headers.
- **Avatar**: circle with initials on `--accent-soft`, text `--accent`, 72px in hero blocks, 40px in lists.
- **Grouped lists (iOS Settings style)**: white rounded container, rows 56-80px, hairline separators inset from the left, chevron on tappable rows. Used for parent screens, profile, announcements, and as the mobile form of tables.
- **Tables (desktop and tablet)**: white container radius 20px, header 14px `--text-2`, rows 52px, hairline separators, right-aligned numbers, hover tint `#FAFAFC`, no zebra. On mobile they become grouped lists.
- **Segmented control**: filters and tabs (Semua / Belum diisi / Sudah diisi; Jurnal harian / Catatan anekdot; BB / MB / BSH / BSB per aspect). Light gray track, white thumb. Scrolls horizontally if too wide for mobile.
- **Status**: tinted capsules (section 4). Three-step progress line (Belum Bayar > Menunggu Verifikasi > Lunas, or Diajukan > Verifikasi > Selesai) with dots and a thin line; completed steps filled, current step ringed.
- **Dialogs and sheets**: bottom sheet on mobile (radius 20px top corners, grabber handle), centered dialog on larger screens.
- **Sticky action bar**: translucent bar at the bottom for form pages, safe-area aware on phones.
- **Empty states**: one line of `--text-2` text (17px) with an optional blue text link. No illustration.
- **Charts**: thin, flat, blue plus grays, direct labels, hairline gridlines, no 3D. One chart per question with a plain-language title and the key number as large text.
- **Toasts**: small centered capsule, auto-dismiss.
- **Document preview** (rapor bayangan): white A4-proportion paper with hairline border on `--bg`; on mobile it scales to fit width and scrolls.
- **Footer**: `--bg` background, 12px `--text-2`, hairline top border.

## 9. Layout per role (priority device, but all sizes must work)

- **Admin** (mostly desktop, usable on phone): home leads with the work: the count of payments waiting verification as a giant number (72px), a link to the queue, then bento tiles (siswa aktif, masuk bulan ini, belum bayar, pengumuman) and a "Pembayaran terbaru" table. Data pages: local nav with title and pill action, search and segmented filters, table (list on mobile). Verifikasi: queue left, detail right on desktop; list then detail screen on mobile.
- **Guru** (tablet and phone first): fast input. Home shows "23 dari 39" progress as a big number and the student list with segmented filter. Journal form: five stacked panels, segmented control per aspect, notes textarea, sticky action bar, previous/next student navigation. Comfortable one-handed on a phone.
- **Kepala Sekolah** (desktop first, readable on phone): read-only. Near-black hero with giant percentage (the one solid block), then tiles that each answer one question with one thin chart. Export buttons in local nav (desktop) or an export row (mobile).
- **Orang Tua** (mobile first, fully usable on desktop):
  - Hero (white): 72px avatar with initials, child name at 56px (34px mobile), a gray line "Kelompok A · Tahun Ajaran 2026/2027 · Semester 1" at 21px (17px mobile), blue link "Ganti anak >".
  - Section on `--bg`: two tiles side by side on desktop (stacked on mobile). Bill tile in SOLID BLUE with white text: "SPP Oktober 2026", "Rp 350.000" at 72px (48px mobile), due date, status capsule, three-step progress line, white pill "Unggah bukti bayar", white link "Lihat rincian tagihan >". Journal tile in white: "Jurnal terakhir" with five aspect rows (title 17px semibold, BSH/BSB capsule, teacher note 15px gray).
  - Section on white: "Pengumuman" at 40px (28px mobile) with a grouped list, 80px rows, pinned item with a gray capsule "Disematkan".
  - Desktop content width 1100px; always provide download actions for paid invoices and reports.
- **Login**: centered 56px headline (34px mobile) and a 360px form at every size, footer note below.

## 10. Content and tone

- Short, calm Indonesian. No exclamation marks, no "Selamat datang".
- Headlines say what matters: "9 pembayaran menunggu verifikasi.", "SPP Oktober sudah lunas."
- Rejections explain the next step: "Ditolak: nominal tidak sesuai. Mohon unggah ulang."
- Wording about children is supportive.
- Realistic uneven data: 78 siswa, 9 menunggu, Rp 350.000, Rp 27.300.000. Names: Aisyah Putri Ramadhani, Muhammad Fadhil, Kevin Santoso, Ni Luh Ayu, Zahra Nabila. NIS 2425-014. Dates like 8 Okt 2026. Teacher: Bu Sari Wulandari. Principal: Ibu Dra. Hartini. Admin: Pak Dedi. School: RA Waladun Sholeh.

## 11. Motion

Subtle and quick: 150-250ms ease-out, sheet slide-up, button press scale, gentle fade/translate of sections on scroll, fade for toasts. No parallax, no looping animation. Respect prefers-reduced-motion.

## 12. Accessibility

- Text contrast at least 4.5:1 (white text on `#0071E3` passes for 17px and above).
- Status always has text, not only color.
- Visible focus ring on all interactive elements.
- Tap targets at least 44px (48px on parent screens).
- Support browser zoom to 200% and system text size without breaking layouts.

## 13. Never use

Gradients, neon/glow, heavy drop shadows, glassmorphism beyond the translucent bars, purple/violet, teal+orange pairing, emoji, cartoon or stock illustrations, mascots, photos of people, hero banners with imagery, repeated identical stat-card rows with big icons, icons beside every heading, handwriting fonts, textures, rotated elements, Material Design components, Android/iOS device chrome (status bar, notch, home indicator), text below 14px in main content, buttons or status rendered as plain text, lorem ipsum, round placeholder numbers, generic names like John Doe.

## 14. Implementation notes (Laravel + Inertia + React)

- Tokens as CSS variables on `:root`; extend the Tailwind theme from them.
- Tailwind breakpoints: default `sm` 640, `lg` 1024; write mobile styles first, then `sm:` and `lg:` overrides.
- shadcn/ui with pill buttons, radius tokens above, neutral base, accent `#0071E3`. Use Sheet for mobile menus and dialogs, Dialog for larger screens.
- Build one `ResponsiveTable` component that renders a table on `lg` and a grouped list below it.
- Build `StatusCapsule`, `BigNumber`, `Tile`, `ProgressSteps` as shared components so the visual weight rules are enforced in code.
- Safe areas: `padding-bottom: env(safe-area-inset-bottom)` on bottom bars.
- Translucent bars: `backdrop-filter: saturate(180%) blur(20px)`.
- Icons: Lucide, 1.5px stroke.
- Recharts with tokens, direct labels instead of legends.
