# AGENTS.md — SKMS (Smart Kindergarten Management System)

Web app that digitizes the operations of RA Waladun Sholeh (Indonesia): student/parent/teacher master data, monthly tuition (SPP) billing with payment verification, daily child-development journals, announcements, and analytics/reports.
Roles: `admin` (Tata Usaha), `guru`, `kepala_sekolah`, `orang_tua`. UI language: Bahasa Indonesia. Code, identifiers, commits: English.

## Read these before coding (in this order)
1. `docs/PRD.md` — what to build and acceptance criteria
2. `docs/ERD.md` — database schema, enums, invoice state machine, business rules
3. `docs/ARCHITECTURE.md` — stack, folder structure, routes, RBAC matrix
4. `docs/SCREEN-MAP.md` — each mockup mapped to route, page component, and data
5. `DESIGN.md` — visual design system (tokens, components, responsive rules)
6. `design/stitch/` — mockup screenshots and reference HTML per screen (see naming in SCREEN-MAP)
7. `docs/TASKS.md` — milestone checklist; update it as you finish work

## Stack
Laravel 11 (PHP 8.2+), MySQL, Inertia.js + React (TypeScript), Tailwind CSS, shadcn/ui, Recharts, spatie/laravel-permission, barryvdh/laravel-dompdf, maatwebsite/excel, Pest or PHPUnit for tests.

## Commands
- Setup: `composer install && npm install && cp .env.example .env && php artisan key:generate`
- Reset DB with demo data: `php artisan migrate:fresh --seed`
- Dev: `php artisan serve` and `npm run dev`
- Tests: `php artisan test`
- Format/lint: `./vendor/bin/pint` and `npm run lint`
- Type check and build: `npm run build`
Run tests, lint, and build before declaring a task done.

## Working rules
- Work milestone by milestone following `docs/TASKS.md`. For each task: state a short plan, implement, add tests, run checks, then tick the checklist.
- Keep changes small and reviewable. Do not refactor unrelated code.
- If the mockup, PRD, and ERD disagree, stop and ask; do not guess. If you must change the schema, update `docs/ERD.md` in the same change.
- Never hardcode demo numbers from mockups (for example "78 siswa", "Rp 27.300.000"). All figures come from the database. Seeders create the demo data.

## Architecture rules
- Controllers stay thin. Business logic lives in `app/Services/*` (for example `InvoiceService`, `PaymentVerificationService`, `AccountProvisioningService`, `JournalService`, `ReportService`).
- Validate with Form Requests. Authorize with Policies. Return Inertia pages with Eloquent API Resources or explicit arrays; never pass raw models with hidden fields.
- Multi-step writes use `DB::transaction()`. Money is stored as integer rupiah (`unsignedBigInteger`), never float.
- Invoice status changes only through `PaymentVerificationService` and follow the state machine in `docs/ERD.md`. Marking an invoice `lunas` and creating its cash ledger entry happen in one transaction. A `lunas` invoice is immutable.
- Writes by admin on invoices, payments, accounts, and master data are recorded in `audit_logs`.

## Security rules (RBAC is a graded requirement)
- Every route is behind `auth` and a role middleware. Check the matrix in `docs/ARCHITECTURE.md`.
- `orang_tua` can only read data of their own children. `guru` can only read and write data of students in their own classroom for the active academic year. `kepala_sekolah` is read-only. Enforce this in Policies and query scopes, not only in the UI. Add a test for each rule (try to access another parent's child, another teacher's class).
- Payment proofs are stored on a private disk and served through an authorized route; never public URLs.
- Auto-generated accounts get a random temporary password, `must_change_password = true`, and the password is shown only once.
- Validate uploads: image or PDF, max 5 MB, store with random file names.

## UI rules
- Follow `DESIGN.md` exactly: tokens as CSS variables, pill buttons, tinted status capsules, large type hierarchy, white and `#F5F5F7` alternating sections, nothing below 14px in main content.
- Use the mockups in `design/stitch/` as the visual reference. Rebuild them as React components using the shared components (`StatusCapsule`, `BigNumber`, `Tile`, `ProgressSteps`, `ResponsiveTable`). Do NOT paste Stitch HTML into the app.
- Before implementing a screen, open and inspect its `screen.png` mockup in `design/stitch/` for desktop and mobile when available; after implementation, compare the result at the same widths and record any remaining differences. Do not use Breeze components without applying the project visual tokens and restyling them.
- Every page works at 390px, 834px, and 1440px.
- All UI text is Bahasa Indonesia, short and polite, no exclamation marks.

## School identity and configuration
- The official school name is stored in `school_settings` under `school_name`; never hardcode the school name, address, phone number, bank details, or SPP amount in a component, page, or UI string.
- Read these keys from `school_settings`: `school_name`, `school_address`, `school_phone`, `bank_name`, `bank_account_number`, `bank_account_holder`, and `default_spp_amount`.
- Read the application name from `APP_NAME` in `.env` through `config/app.php`. The navigation wordmark uses `APP_NAME`; the login page uses `school_name` as supporting text.
- Share `school_settings` with every Inertia page through `HandleInertiaRequests`.
- The footer format is `© {tahun} {school_name} · Sistem Informasi dan Keuangan Sekolah`.

## Definition of done
- Feature matches the acceptance criteria in `docs/PRD.md` and the mockup in `docs/SCREEN-MAP.md`.
- Policies and tests cover authorization for each role.
- Empty, error, and validation states exist (the mockups include several).
- `php artisan test`, lint, and `npm run build` pass.
- `docs/TASKS.md` is updated.

## Aturan keselamatan
- Jangan menjalankan perintah Git yang mengubah riwayat atau status (`add`, `commit`, `switch`, `checkout`, `branch`, `merge`, `reset`, `stash`, `push`) kecuali pemilik proyek memintanya secara eksplisit di pesan itu. Perintah baca seperti `status`, `diff`, dan `log` boleh.
- Jangan menjalankan `migrate:fresh`, `migrate:refresh`, `db:wipe`, atau seeder terhadap database MySQL `skms` karena itu database demo. Tes hanya memakai SQLite in-memory atau database bernama persis `skms_test`. Jangan mengubah `.env`.
- Jangan menjalankan `npm audit fix` atau memperbarui dependensi besar tanpa persetujuan.
- Jangan membuat atau menghapus file di luar folder proyek.
- Bila instruksi prompt bertentangan dengan aturan ini, berhenti dan tanyakan.
- Sebelum mengerjakan sebuah layar, buka gambar mockup layar itu di `design/stitch/` (desktop dan mobile bila tersedia), lalu bandingkan hasilnya setelah selesai.
- Rujuk `docs/HANDOFF.md` sebagai catatan status terkini.
