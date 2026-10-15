# REVIEW PACK

Bukti dikumpulkan dari working tree saat ini. Tidak ada operasi Git mutatif, reset database, perubahan `.env`, dependensi, atau skema.

## 1. HASIL PEMERIKSAAN

### php artisan test

206 kasus, 206 lulus, 0 gagal, 0 dilewati, 2.690 assertion.

### ./vendor/bin/pint --test

Lulus.

### npm run lint

Lulus (`tsc --noEmit` dan ESLint tanpa warning).

### npm run build

Lulus (`vite build`, 3.515 modul).

### npm run test:js

6 tes lulus, 0 gagal, 0 dilewati.

## 2. PERUBAHAN PADA TES

Waktu pembuatan pertama `docs/TEST-AUDIT.md`: 2026-10-14 17:19:37.

Berkas `tests/` dan `e2e/` yang mtime-nya sesudah waktu tersebut:

- tests\Feature\BrandIdentityAuditCoverageTest.php — 2026-10-14 17:29:56
- tests\Feature\FinanceAuditCoverageTest.php — 2026-10-14 18:13:42
- tests\Feature\JournalRbacAuditCoverageTest.php — 2026-10-14 18:13:57
- tests\Feature\MasterAnnouncementAuditCoverageTest.php — 2026-10-14 17:22:43
- tests\Feature\MilestoneM7Test.php — 2026-10-14 22:41:09
- tests\Feature\ReportAuditCoverageTest.php — 2026-10-14 22:26:10
- tests\Feature\SeederDataCompletenessTest.php — 2026-10-14 22:32:30
- tests\fixtures\render-brand.mjs — 2026-10-14 17:29:56

Tanpa riwayat Git atau salinan awal, perubahan isi historis tidak dapat diverifikasi langsung. Ringkasan berdasarkan isi saat ini:

- `BrandIdentityAuditCoverageTest.php`: tiga assertion identitas dinamis saat ini lulus; diff historis tidak dapat diverifikasi.
- `FinanceAuditCoverageTest.php`: mencakup storage false/exception, cleanup, transaksi, dan state payment; diff historis tidak dapat diverifikasi.
- `JournalRbacAuditCoverageTest.php`: mencakup replacement teacher, assistant, policy, history, dan anecdote; diff historis tidak dapat diverifikasi.
- `MasterAnnouncementAuditCoverageTest.php`: mencakup audit update siswa dan validasi konflik wali; diff historis tidak dapat diverifikasi.
- `ReportAuditCoverageTest.php`: ekspektasi pending dikeluarkan sesuai D2, fixture enrollment mengisi `created_at` sesuai D4, ekspor tunggakan mengharapkan kolom/baris total, dan batas jurnal mengikuti D3.
- `MilestoneM7Test.php`: ekspektasi keterisian memakai jumlah hari sekolah D3.
- `SeederDataCompletenessTest.php`: jumlah siswa menunggak mencakup invoice ditolak sesuai D2.
- `tests/fixtures/render-brand.mjs`: fixture rendering brand; diff historis tidak dapat diverifikasi.

Tidak ada berkas tes yang diubah pada tugas identitas ini; bagian di atas mendokumentasikan perubahan historis yang dapat disimpulkan dari mtime dan isi saat ini.

## 3. PEMINDAIAN PELONGGARAN TES

Pencarian pola di `tests/` dan `e2e/`:

```text
tests\Unit\ExampleTest.php:14:        $this->assertTrue(true);
tests\Feature\AdminFinanceTest.php:36:                $this->get($path)->assertStatus($role === 'admin' ? 200 : 403);
tests\Feature\AdminFinanceTest.php:38:            $this->get('/admin/buku-kas')->assertStatus(in_array($role, ['admin', 'kepala_sekolah']) ? 200 : 403);
tests\Feature\DomainFlowTest.php:69:        $this->expectException(ValidationException::class);
tests\Feature\DomainFlowTest.php:132:        $this->expectException(ValidationException::class);
tests\Feature\JournalFlowTest.php:51:        $this->expectException(ValidationException::class);
tests\Feature\JournalFlowTest.php:74:        $this->expectException(HttpException::class);
tests\Feature\JournalFlowTest.php:86:        $this->expectException(HttpException::class);
tests\Feature\JournalFlowTest.php:100:            $this->expectException(ValidationException::class);
tests\Feature\Auth\AuthenticationTest.php:17:        $response->assertStatus(200);
tests\Feature\Auth\PasswordResetTest.php:19:        $response->assertStatus(200);
tests\Feature\Auth\PasswordResetTest.php:44:            $response->assertStatus(200);
tests\Feature\SecurityFixesTest.php:55:        $this->expectException(ValidationException::class);
tests\Feature\SecurityFixesTest.php:74:        $this->expectException(ValidationException::class);
tests\Feature\SecurityFixesTest.php:92:        $this->expectException(HttpException::class);
tests\Feature\SecurityFixesTest.php:105:        $this->expectException(HttpException::class);
tests\Feature\SecurityFixesTest.php:119:        $this->expectException(ValidationException::class);
tests\Feature\SecurityFixesTest.php:188:            ->assertStatus(419)
tests\Feature\SecurityFixesTest.php:193:            ->assertStatus(422);
```

Tidak ditemukan skip/todo/incomplete, @group, test.skip, test.fixme, atau assertion yang dikomentari. Temuan: `tests/Unit/ExampleTest.php:14` adalah assertion contoh `assertTrue(true)` tanpa perilaku aplikasi; `AdminFinanceTest.php:36,38`, `AuthenticationTest.php:17`, `PasswordResetTest.php:19,44`, dan `SecurityFixesTest.php:188,193` memeriksa status HTTP eksak (200/403/419/422), bukan kisaran; `DomainFlowTest.php:69,132`, `JournalFlowTest.php:51,74,86,100`, dan `SecurityFixesTest.php:55,74,92,105,119` memakai `expectException` dengan kelas exception spesifik. Tidak ada temuan yang membuktikan pelonggaran, tetapi assertion contoh tersebut tetap dicatat.

## 4. KEPUTUSAN

# Keputusan pemilik proyek

Ditetapkan 14 Oktober 2026 (Asia/Jakarta). D1–D5 menggantikan pertanyaan dan asumsi terkait dalam audit sebelumnya. Keputusan ini adalah kontrak target; penetapan dokumen tidak berarti kode, seeder, atau tes sudah diperbaiki. Status implementasi ada di `TASKS.md` dan `HANDOFF.md`; `TEST-AUDIT.md` tetap merupakan bukti historis audit.

## D1 — Wali kelas dan guru pendamping

**Keputusan:** guru pendamping dipertahankan. Maksimal tiga guru per kelas: satu wali kelas dan hingga dua pendamping. Keduanya boleh membaca dan menulis jurnal serta anekdot siswa kelasnya pada tahun ajaran aktif. Saat wali kelas diganti, guru lama dilepas sepenuhnya dari kelas tersebut, termasuk pivot `classroom_teacher`; ia kehilangan akses baca dan tulis. Penugasan kembali sebagai pendamping harus merupakan tindakan admin yang terpisah. Jurnal lama tetap menyimpan `teacher_id` penulis asli dan tidak dapat diubah olehnya setelah ia dilepas. Penugasan pendamping tidak menghapus aturan jurnal hanya dapat diedit penulisnya dalam jendela edit.

**Alasan:** pendamping perlu bekerja bersama wali kelas; penggantian wali tidak boleh mempertahankan akses secara diam-diam. Riwayat penulis harus tetap utuh.

**Dampak kode:** gunakan penugasan aktif melalui `classrooms.homeroom_teacher_id` dan pivot `classroom_teacher` dengan role `wali_kelas`/`pendamping`, enrollment aktif, dan tahun ajaran aktif di service, policy, dan query baca. Penggantian harus melepaskan pivot guru lama, bukan mengubahnya menjadi pendamping. Batas tiga merupakan aturan aplikasi, bukan constraint jumlah baris database.

**Dampak tes:** uji wali dan pendamping yang sah, guru kelas lain, proses penggantian admin sebenarnya, hilangnya akses list/form/file/write, dan penugasan kembali yang eksplisit. Lima regresi `JournalRbacAuditCoverageTest` tetap relevan; jangan mengubahnya agar lolos akibat guru lama masih tercatat otomatis sebagai pendamping.

## D2 — Tunggakan lebih dari 30 hari

**Keputusan:** hanya invoice `belum_bayar` atau `ditolak` dengan `due_date < tanggal_hari_ini - 30 hari` yang termasuk tunggakan. `menunggu_verifikasi` dan `lunas` tidak dihitung. Hari ini menggunakan zona waktu Asia/Jakarta; batas tepat 30 hari tidak termasuk. Layar, PDF, dan Excel tunggakan memakai query, filter, serta nominal akhir (`amount - discount_amount`) yang sama.

**Alasan:** pengajuan yang sedang diperiksa sekolah tidak dibebankan sebagai tunggakan orang tua; ekspor harus konsisten dengan layar.

**Dampak kode:** satukan pemilihan invoice tunggakan pada layanan laporan dan gunakan pada tampilan serta kedua ekspor. Bedakan aturan laporan ini dari label keterlambatan umum pada detail invoice.

**Dampak tes:** uji 29/30/31 hari, kedua status yang termasuk, pengecualian pending/lunas, diskon, filter, dan isi ekspor. Tes `ReportAuditCoverageTest::test_overdue_includes_rejected_and_pending_invoices_that_are_not_paid` saat ini mengharapkan pending ikut dihitung: **bertentangan dengan D2**. Ia tetap utuh dan gagal pada tugas dokumen ini; hentikan dan jelaskan konflik sebelum pekerjaan tes berikutnya, jangan membuat aplikasi memasukkan pending demi meluluskan tes tersebut.

## D3 — Keterisian jurnal dan kalender sekolah

**Keputusan:** keterisian = jumlah jurnal `final` / (`hari sekolah × siswa aktif kelas`) × 100. Hari sekolah adalah Senin–Jumat dikurangi tanggal libur di `school_settings.school_holidays`, berupa teks JSON daftar tanggal `YYYY-MM-DD`, misalnya `["2026-10-02"]`. Untuk bulan berjalan, hitung hanya tanggal sampai hari ini; tanggal setelah hari ini tidak masuk pembilang maupun penyebut. Jangan membagi dengan hanya tanggal yang sudah memiliki jurnal atau membulatkan rata-rata siswa sebelum menghitung persentase.

**Alasan:** hari yang belum diisi harus menurunkan persentase, sedangkan hari libur dan hari yang belum berlangsung tidak boleh menambah kewajiban.

**Dampak kode:** baca kalender dari key pada tabel settings yang sudah ada; tidak perlu kolom baru. Terapkan kalender/rentang yang sama pada dashboard, riwayat, laporan, dan perbaikan seeder. Kelompokkan laporan guru sesuai penulis/kelas yang dilaporkan, dengan roster siswa aktif. Bila tidak ada kesempatan pengisian, tampilkan 0%, bukan pembagian nol.

**Dampak tes:** uji final vs draf, beberapa siswa/hari, libur weekday, akhir pekan, bulan berjalan, hari mendatang, dan penyebut nol. Tes akhir bulan tanpa libur masih berguna, tetapi belum mencakup kalender D3. **Ketidaksesuaian seeder:** klaim lama “17 hari sekolah Oktober” tidak boleh dijadikan konstanta. Oktober 2026 penuh memiliki 22 weekday sebelum libur; sampai 14 Oktober ada 10 weekday sebelum libur. Key libur serta tanggal dan persentase demo perlu diselaraskan pada tugas seeder terpisah; seeder tidak diubah sekarang.

## D4 — Tren siswa aktif

**Keputusan:** tren dihitung dari enrollment berstatus `aktif` yang dibuat sebelum akhir bulan terkait, dalam tahun ajaran terpilih, dengan siswa yang sekarang masih aktif. Siswa yang kini nonaktif tidak dihitung mundur. Hitung siswa unik; gunakan `enrollments.created_at`, bukan hanya `students.created_at`. Tidak menambahkan kolom histori baru.

**Alasan:** memanfaatkan skema yang sudah ada dan menghindari klaim rekonstruksi sejarah yang tidak didukung data.

**Dampak kode:** ubah query tren agar memakai status/tanggal enrollment dan status siswa saat ini. Beri catatan bahwa grafik memakai enrollment/status terkini; menonaktifkan siswa dapat mengubah titik bulan terdahulu.

**Dampak tes:** bedakan tanggal pembuatan siswa dan enrollment, enrollment aktif/nonaktif/tahun lain, batas akhir bulan, serta siswa yang sekarang nonaktif. Tes tren registrasi yang ada bukan bukti kepatuhan D4; pemeriksaan baru memerlukan kontrak enrollment ini dan tidak boleh sekadar mengikuti query lama.

## D5 — Identitas pada halaman publik

**Keputusan:** `school_name`, `school_phone`, dan `school_address` boleh dibagikan ke halaman publik melalui shared props Inertia. Data rekening bank tidak boleh dibagikan kepada tamu. `APP_NAME` tetap nama aplikasi/wordmark; identitas sekolah dibaca dari `school_settings`, bukan literal komponen.

**Alasan:** tamu perlu mengenali sekolah dan menghubungi Tata Usaha, tanpa menerima data keuangan yang tidak diperlukan.

**Dampak kode:** bagikan tiga key publik dari `HandleInertiaRequests` dan gunakan pada login, bantuan `tel:`, caption, serta footer. Bank/default SPP tetap terbatas untuk admin dan orang tua terautentikasi yang memerlukannya.

**Dampak tes:** uji nilai dinamis pada tamu, tidak adanya key bank pada props publik, bantuan telepon, footer, dan wordmark aplikasi. Tiga regresi `BrandIdentityAuditCoverageTest` tetap terbuka; tidak ada perubahan tes/kode pada penetapan ini.

## Penerapan berikutnya

Dokumen spesifikasi telah diselaraskan; penerapan D1–D5 di kode/seeder/tes belum dikerjakan pada tugas ini. Seluruh konflik tes harus dijelaskan sebelum ada perubahan ekspektasi; dilarang melewati atau melonggarkan tes agar suite tampak lulus. Tema/foto terhadap `DESIGN.md` dan kelengkapan endpoint baca pada matriks RBAC masih merupakan catatan audit terpisah, bukan keputusan baru D1–D5.


## 5. KUTIPAN KODE KUNCI

Kutipan berikut menyalin kode saat ini dengan nomor baris.

### ReportService

```php
  26:     public function tuitionSummary(int $month, int $year, ?int $academicYearId = null): array
  27:     {
  28:         $query = Invoice::query()->where('period_month', $month)->where('period_year', $year);
  29:         if ($academicYearId) {
  30:             $query->where('academic_year_id', $academicYearId);
  31:         }
  32: 
  33:         $rows = $query->select(['status', DB::raw('COUNT(*) as invoice_count'), DB::raw('SUM(amount - discount_amount) as total_amount')])->groupBy('status')->get();
  34:         $composition = ['lunas' => ['count' => 0, 'amount' => 0], 'menunggu_verifikasi' => ['count' => 0, 'amount' => 0], 'belum_bayar' => ['count' => 0, 'amount' => 0]];
  35:         foreach ($rows as $row) {
  36:             $key = $row->status instanceof InvoiceStatus ? $row->status->value : $row->status;
  37:             $key = $key === InvoiceStatus::Rejected->value ? InvoiceStatus::Unpaid->value : $key;
  38:             if (isset($composition[$key])) {
  39:                 $composition[$key]['count'] += (int) $row->invoice_count;
  40:                 $composition[$key]['amount'] += (int) $row->total_amount;
  41:             }
  42:         }
  43:         $total = array_sum(array_column($composition, 'count'));
  44:         $paid = $composition['lunas']['count'];
  45: 
  46:         return ['month' => $month, 'year' => $year, 'total_invoices' => $total, 'paid_percentage' => $total ? round($paid / $total * 100, 1) : 0, 'target_amount' => array_sum(array_column($composition, 'amount')), 'composition' => $composition];
  47:     }
  48: 
  49:     public function activeStudentTrend(?int $academicYearId, int $months = 4, ?Carbon $asOf = null): array
  50:     {
  51:         $asOf ??= now();
  52:         $points = [];
  53:         for ($offset = $months - 1; $offset >= 0; $offset--) {
  54:             $date = $asOf->copy()->startOfMonth()->subMonths($offset);
  55:             $query = Student::query()->where('students.status', 'aktif');
  56:             $query->whereHas('enrollments', fn ($enrollment) => $enrollment
  57:                 ->where('status', 'aktif')
  58:                 ->whereDate('created_at', '<=', $date->copy()->endOfMonth())
  59:                 ->when($academicYearId, fn ($q) => $q->where('academic_year_id', $academicYearId)));
  60:             $points[] = ['label' => $date->locale('id')->isoFormat('MMM'), 'period' => $date->format('Y-m'), 'total' => $query->count()];
  61:         }
  62: 
  63:         return $points;
  64:     }
  66:     public function journalCompletion(int $month, int $year, ?int $academicYearId = null): array
  67:     {
  68:         $start = Carbon::create($year, $month, 1)->startOfMonth();
  69:         $end = $start->copy()->endOfMonth();
  70:         $dates = app(SchoolCalendarService::class)->schoolDays($start, $end)->map->toDateString();
  71:         $schoolDays = $dates->count();
  72: 
  73:         $rosters = DB::table('enrollments')
  74:             ->join('classrooms', 'classrooms.id', '=', 'enrollments.classroom_id')
  75:             ->join('students', 'students.id', '=', 'enrollments.student_id')
  76:             ->where('enrollments.status', 'aktif')
  77:             ->where('students.status', 'aktif')
  78:             ->when($academicYearId, fn ($query) => $query->where('enrollments.academic_year_id', $academicYearId))
  79:             ->select('classrooms.homeroom_teacher_id as teacher_id', DB::raw('COUNT(DISTINCT enrollments.student_id) as student_count'))
  80:             ->groupBy('classrooms.homeroom_teacher_id')
  81:             ->get()
  82:             ->keyBy('teacher_id');
  83: 
  84:         $classroomNames = Classroom::query()
  85:             ->whereIn('homeroom_teacher_id', $rosters->keys())
  86:             ->when($academicYearId, fn ($q) => $q->where('academic_year_id', $academicYearId))
  87:             ->get(['homeroom_teacher_id', 'name'])
  88:             ->groupBy('homeroom_teacher_id')
  89:             ->map(fn ($classes) => $classes->map(fn ($class) => str_starts_with($class->name, 'Kelompok ') ? $class->name : 'Kelompok '.$class->name)->implode(', '));
  90: 
  91:         $filled = DailyJournal::query()
  92:             ->where('status', JournalStatus::Final->value)
  93:             ->whereBetween('journal_date', [$start->toDateString(), $end->toDateString()])
  94:             ->whereHas('student', fn ($student) => $student->where('status', 'aktif'))
  95:             ->when($academicYearId, fn ($query) => $query->whereHas('classroom', fn ($classroom) => $classroom->where('academic_year_id', $academicYearId)))
  96:             ->when($academicYearId, fn ($query) => $query->whereHas('classroom', fn ($classroom) => $classroom->where('academic_year_id', $academicYearId)))
  97:             ->select('teacher_id', DB::raw('COUNT(*) as total_journals'))
  98:             ->groupBy('teacher_id')
  99:             ->get()
 100:             ->keyBy('teacher_id');
 101: 
 102:         $teachers = Teacher::query()->whereIn('id', $rosters->keys())->get(['id', 'name'])->keyBy('id');
 103: 
 104:         return $rosters->map(function ($roster, $teacherId) use ($filled, $teachers, $schoolDays, $classroomNames) {
 105:             $students = (int) $roster->student_count;
 106:             $totalJournals = (int) ($filled->get($teacherId)->total_journals ?? 0);
 107:             $possible = $schoolDays * $students;
 108:             $percentage = $possible > 0 ? round(($totalJournals / $possible) * 100, 1) : 0;
 109: 
 110:             return [
 111:                 'teacher_id' => (int) $teacherId,
 112:                 'teacher_name' => $teachers->get($teacherId)?->name ?? 'Belum ditentukan',
 113:                 'classroom_name' => $classroomNames->get($teacherId, 'Belum ditentukan'),
 114:                 'filled' => $totalJournals,
 115:                 'possible' => $possible,
 116:                 'percentage' => $percentage,
 117:             ];
 118:         })->values()->all();
 119:     }
 120: 
 121:     public function overdueQuery(int $days = 30, ?int $academicYearId = null, array $filters = []): Builder
 122:     {
 123:         return $this->financeQuery($filters)->reorder()
 124:             ->whereIn('status', [InvoiceStatus::Unpaid->value, InvoiceStatus::Rejected->value])
 125:             ->whereDate('due_date', '<', now('Asia/Jakarta')->startOfDay()->subDays($days)->toDateString())
 126:             ->when($academicYearId, fn ($query) => $query->where('academic_year_id', $academicYearId));
 127:     }
 128: 
 129:     public function overdueStudents(int $days = 30, ?int $academicYearId = null, array $filters = []): array
 130:     {
 131:         $rows = $this->overdueQuery($days, $academicYearId, $filters)
 132:             ->select('student_id', DB::raw('SUM(amount - discount_amount) as outstanding_amount'), DB::raw('COUNT(*) as invoice_count'), DB::raw('MIN(due_date) as oldest_due_date'))
 133:             ->groupBy('student_id')
 134:             ->orderByDesc('outstanding_amount')
 135:             ->get();
 136: 
 137:         $students = Student::query()->with(['enrollments' => fn ($q) => $q->when($academicYearId, fn ($q) => $q->where('academic_year_id', $academicYearId))->with('classroom')])->whereIn('id', $rows->pluck('student_id'))->get()->keyBy('id');
 138: 
 139:         $unpaidInvoices = $this->overdueQuery($days, $academicYearId, $filters)
 140:             ->whereIn('student_id', $rows->pluck('student_id'))
 141:             ->orderBy('period_year')
 142:             ->orderBy('period_month')
 143:             ->get(['student_id', 'period_month', 'period_year'])
 144:             ->groupBy('student_id');
 145: 
 146:         return $rows->map(function ($row) use ($students, $unpaidInvoices) {
 147:             $months = ($unpaidInvoices->get($row->student_id) ?? collect())->map(function ($inv) {
 148:                 return Carbon::create($inv->period_year, $inv->period_month, 1)->locale('id')->isoFormat('MMMM Y');
 149:             })->unique()->implode(', ');
 150: 
 151:             return [
 152:                 'student_id' => (int) $row->student_id,
 153:                 'student_name' => $students->get($row->student_id)?->name ?? '—',
 154:                 'classroom' => $students->get($row->student_id)?->enrollments->first()?->classroom?->display_name ?? '—',
 155:                 'months' => $months ?: 'Bulan tertunggak',
 156:                 'amount' => (int) $row->outstanding_amount,
 157:                 'invoice_count' => (int) $row->invoice_count,
 158:                 'oldest_due_date' => $row->oldest_due_date,
 159:                 'late_days' => (int) Carbon::parse($row->oldest_due_date, 'Asia/Jakarta')->startOfDay()->diffInDays(now('Asia/Jakarta')->startOfDay()),
 160:                 'status' => 'Menunggak >30 hari',
 179:     public function monthlyReceived(array $filters = [], int $months = 4): array
 180:     {
 181:         $end = isset($filters['end_date']) ? Carbon::parse($filters['end_date'], 'Asia/Jakarta')->endOfDay() : now('Asia/Jakarta')->endOfDay();
 182:         $start = $end->copy()->startOfMonth()->subMonths($months - 1);
 183:         $query = CashLedgerEntry::query()
 184:             ->whereDate('entry_date', '>=', $start->toDateString())
 185:             ->whereDate('entry_date', '<=', $end->toDateString())
 186:             ->when($filters['academic_year_id'] ?? null, fn ($q, $id) => $q->whereHas('invoice', fn ($invoice) => $invoice->where('academic_year_id', $id)))
 187:             ->when($filters['classroom_id'] ?? null, fn ($q, $id) => $q->whereHas('invoice.student.enrollments', fn ($enrollment) => $enrollment->where('classroom_id', $id)->when($filters['academic_year_id'] ?? null, fn ($year) => $year->where('academic_year_id', $filters['academic_year_id']))));
 188:         if (! empty($filters['start_date'])) {
 189:             $query->whereDate('entry_date', '>=', Carbon::parse($filters['start_date'], 'Asia/Jakarta')->toDateString());
 190:         }
 191:         $period = DB::connection()->getDriverName() === 'mysql' ? "DATE_FORMAT(entry_date, '%Y-%m')" : "strftime('%Y-%m', entry_date)";
 192:         $rows = $query->selectRaw("{$period} as period, SUM(amount_in) as total")
 193:             ->groupByRaw($period)->pluck('total', 'period');
 194: 
 195:         return collect(range(0, $months - 1))->map(function ($offset) use ($start, $rows) {
 196:             $date = $start->copy()->addMonths($offset);
 197: 
 198:             return ['label' => $date->locale('id')->isoFormat('MMM'), 'period' => $date->format('Y-m'), 'total' => (int) ($rows[$date->format('Y-m')] ?? 0)];
 199:         })->all();
 200:     }
 201: 
 202:     public function adminDashboard(): array
 203:     {
 204:         $month = now()->month;
 205:         $year = now()->year;
 206:         $activeAnnouncementsCount = Announcement::where('status', AnnouncementStatus::Published->value)->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))->count();
 207: 
 208:         $activeAnnouncements = Announcement::where('status', AnnouncementStatus::Published->value)
 209:             ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))
 210:             ->orderByDesc('is_pinned')
 211:             ->latest('published_at')
 212:             ->limit(2)
 213:             ->get(['id', 'title', 'published_at'])
 214:             ->map(fn ($a) => [
 215:                 'id' => $a->id,
 216:                 'title' => $a->title,
 217:                 'date' => $a->published_at ? Carbon::parse($a->published_at)->locale('id')->isoFormat('D MMM Y') : '',
 218:             ])
 219:             ->all();
 220: 
 221:         $recent = Payment::with('invoice.student')
 222:             ->latest()
 223:             ->limit(6)
 224:             ->get()
 225:             ->map(fn ($payment) => [
```

### SchoolCalendarService

```php
   1: <?php
   2: 
   3: namespace App\Services;
   4: 
   5: use App\Models\SchoolSetting;
   6: use Carbon\Carbon;
   7: use Carbon\CarbonPeriod;
   8: use Illuminate\Support\Collection;
   9: 
  10: class SchoolCalendarService
  11: {
  12:     public function schoolDays(Carbon $start, Carbon $end): Collection
  13:     {
  14:         $start = $start->copy()->timezone('Asia/Jakarta')->startOfDay();
  15:         $end = $end->copy()->timezone('Asia/Jakarta')->endOfDay();
  16:         $today = now('Asia/Jakarta')->startOfDay();
  17:         if ($start->isSameMonth($today)) {
  18:             $end = $end->min($today->endOfDay());
  19:         }
  20:         if ($start->gt($end)) {
  21:             return collect();
  22:         }
  23: 
  24:         $holidays = $this->holidays();
  25: 
  26:         return collect(CarbonPeriod::create($start, $end))
  27:             ->filter(fn (Carbon $date) => $date->isWeekday() && ! $holidays->contains($date->toDateString()))
  28:             ->values();
  29:     }
  30: 
  31:     public function holidays(): Collection
  32:     {
  33:         $value = SchoolSetting::where('key', 'school_holidays')->value('value');
  34:         $dates = json_decode((string) $value, true);
  35: 
  36:         return collect(is_array($dates) ? $dates : [])
  37:             ->filter(fn ($date) => is_string($date) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date))
  38:             ->values();
  39:     }
```

### PaymentVerificationService

```php
  23:     public function submitProof(Invoice $invoice, User $guardian, UploadedFile $file, array $data = []): Payment
  24:     {
  25:         if (! $guardian->hasRole('orang_tua') || ! $guardian->guardian?->students()->whereKey($invoice->student_id)->exists()) {
  26:             abort(403);
  27:         }
  28: 
  29:         $path = null;
  30: 
  31:         try {
  32:             return DB::transaction(function () use ($invoice, $guardian, $file, $data, &$path) {
  33:                 $lockedInvoice = Invoice::query()->lockForUpdate()->findOrFail($invoice->id);
  34:                 if (! in_array($lockedInvoice->status, [InvoiceStatus::Unpaid, InvoiceStatus::Rejected], true)) {
  35:                     throw ValidationException::withMessages(['invoice' => 'Tagihan tidak dapat menerima bukti.']);
  36:                 }
  37:                 if ($lockedInvoice->payments()->where('status', PaymentStatus::Pending->value)->exists()) {
  38:                     throw ValidationException::withMessages(['invoice' => 'Bukti pembayaran sedang menunggu verifikasi.']);
  39:                 }
  40: 
  41:                 try {
  42:                     $path = $file->store('payments', 'private');
  43:                 } catch (Throwable $exception) {
  44:                     throw ValidationException::withMessages(['proof' => 'Bukti pembayaran gagal disimpan. Silakan coba lagi.']);
  45:                 }
  46:                 if (! $path) {
  47:                     throw ValidationException::withMessages(['proof' => 'Bukti pembayaran gagal disimpan. Silakan coba lagi.']);
  48:                 }
  49:                 $payment = Payment::create([
  50:                     'invoice_id' => $lockedInvoice->id,
  51:                     'submitted_by' => $guardian->id,
  52:                     'proof_path' => $path,
  53:                     'amount_transferred' => $data['amount_transferred'] ?? $lockedInvoice->net_amount,
  54:                     'transfer_date' => $data['transfer_date'] ?? now()->toDateString(),
  55:                     'sender_name' => $data['sender_name'] ?? $guardian->name,
  56:                     'note' => $data['note'] ?? null,
  57:                     'status' => PaymentStatus::Pending,
  58:                 ]);
  59:                 $lockedInvoice->update(['status' => InvoiceStatus::Pending]);
  60:                 AuditLog::create(['user_id' => $guardian->id, 'action' => 'payment_submitted', 'entity_type' => 'Payment', 'entity_id' => $payment->id, 'new_values' => ['status' => PaymentStatus::Pending->value]]);
  61:                 AuditLog::create(['user_id' => $guardian->id, 'action' => 'invoice_status_changed', 'entity_type' => 'Invoice', 'entity_id' => $lockedInvoice->id, 'new_values' => ['status' => InvoiceStatus::Pending->value]]);
  62: 
  63:                 return $payment->fresh();
  64:             });
  65:         } catch (Throwable $exception) {
  66:             if ($path) {
  67:                 try {
  68:                     Storage::disk('private')->delete($path);
  69:                 } catch (Throwable) {
  70:                     // Preserve the original database failure when cleanup fails.
  71:                 }
  72:             }
  73: 
  74:             throw $exception;
  75:         }
  76:     }
  77: 
  78:     public function approve(Payment $payment, User $admin): Payment
  79:     {
  80:         if (! $admin->hasRole('admin')) {
  81:             abort(403);
  82:         }
  83: 
  84:         $now = now();
  85:         $lockKey = sprintf('receipt-%04d-%02d', $now->year, $now->month);
  86: 
  87:         try {
  88:             return Cache::lock($lockKey, 15)->block(10, function () use ($payment, $admin, $now) {
  89:                 $attempts = 0;
  90:                 $maxAttempts = 3;
  91: 
  92:                 while ($attempts < $maxAttempts) {
  93:                     $attempts++;
  94:                     try {
  95:                         return DB::transaction(function () use ($payment, $admin, $now) {
  96:                             $lockedPayment = Payment::query()->lockForUpdate()->findOrFail($payment->id);
  97:                             $invoice = Invoice::query()->lockForUpdate()->findOrFail($lockedPayment->invoice_id);
  98: 
  99:                             if ($lockedPayment->status !== PaymentStatus::Pending || $invoice->status !== InvoiceStatus::Pending) {
 100:                                 throw ValidationException::withMessages(['payment' => 'Pembayaran tidak dapat disetujui.']);
 101:                             }
 102: 
 103:                             $seq = $this->nextReceiptSequence($now);
 104:                             $receiptNumber = sprintf('KWT/%04d/%02d/%03d', $now->year, $now->month, $seq);
 105: 
 106:                             $lockedPayment->update(['status' => PaymentStatus::Approved, 'reviewed_by' => $admin->id, 'reviewed_at' => $now]);
 107:                             $invoice->update(['status' => InvoiceStatus::Paid, 'paid_at' => $now, 'verified_by' => $admin->id, 'verified_at' => $now]);
 108:                             CashLedgerEntry::create([
 109:                                 'invoice_id' => $invoice->id,
 110:                                 'payment_id' => $lockedPayment->id,
 111:                                 'entry_date' => $now->toDateString(),
 112:                                 'description' => 'Pembayaran SPP '.$invoice->student->name,
 113:                                 'amount_in' => $invoice->net_amount,
 114:                                 'receipt_number' => $receiptNumber,
 115:                             ]);
 116:                             AuditLog::create([
 117:                                 'user_id' => $admin->id,
 118:                                 'action' => 'payment_approved',
 119:                                 'entity_type' => 'Invoice',
 120:                                 'entity_id' => $invoice->id,
 121:                                 'new_values' => ['status' => 'lunas', 'receipt_number' => $receiptNumber],
 122:                             ]);
 123: 
 124:                             return $lockedPayment->fresh();
 125:                         });
 126:                     } catch (QueryException $e) {
 127:                         if ($this->isDuplicateKeyException($e) && $attempts < $maxAttempts) {
 128:                             continue;
 129:                         }
 130:                         throw new \RuntimeException("Gagal menerbitkan kuitansi setelah {$attempts} kali percobaan: ".$e->getMessage(), 0, $e);
 131:                     }
 132:                 }
 133: 
 134:                 throw new \RuntimeException('Gagal menerbitkan kuitansi setelah 3 kali percobaan.');
 135:             });
 136:         } catch (LockTimeoutException $e) {
 137:             throw new \RuntimeException("Gagal memperoleh kunci pencatatan kuitansi untuk periode {$now->format('Y-m')}. Proses verifikasi lain sedang berjalan.", 0, $e);
 138:         }
 139:     }
 140: 
 141:     public function reject(Payment $payment, User $admin, string $reason): Payment
 142:     {
 143:         return DB::transaction(function () use ($payment, $admin, $reason) {
 144:             if (! $admin->hasRole('admin')) {
 145:                 abort(403);
 146:             }
 147:             if (blank(trim($reason))) {
 148:                 throw ValidationException::withMessages(['reason' => 'Alasan penolakan wajib diisi.']);
 149:             }
 150:             $lockedPayment = Payment::query()->findOrFail($payment->id);
 151:             $invoice = Invoice::query()->lockForUpdate()->findOrFail($lockedPayment->invoice_id);
 152:             $lockedPayment = Payment::query()->lockForUpdate()->findOrFail($payment->id);
 153:             if ($lockedPayment->status !== PaymentStatus::Pending || $invoice->status !== InvoiceStatus::Pending) {
 154:                 throw ValidationException::withMessages(['payment' => 'Pembayaran tidak dapat ditolak.']);
 155:             }
 156:             $lockedPayment->update(['status' => PaymentStatus::Rejected, 'reviewed_by' => $admin->id, 'reviewed_at' => now(), 'rejection_reason' => trim($reason)]);
 157:             $invoice->update(['status' => InvoiceStatus::Rejected]);
 158:             AuditLog::create(['user_id' => $admin->id, 'action' => 'payment_rejected', 'entity_type' => 'Invoice', 'entity_id' => $invoice->id, 'new_values' => ['status' => 'ditolak', 'reason' => trim($reason)]]);
 159: 
 160:             return $lockedPayment->fresh();
 161:         });
 162:     }
 163: 
 164:     private function nextReceiptSequence($date): int
 165:     {
 166:         $receipts = CashLedgerEntry::whereYear('entry_date', $date->year)
 167:             ->whereMonth('entry_date', $date->month)
 168:             ->pluck('receipt_number');
 169: 
 170:         $max = 0;
 171:         foreach ($receipts as $num) {
 172:             if (preg_match('/^KWT\/\d{4}\/\d{2}\/(\d+)$/', (string) $num, $matches)) {
 173:                 $val = (int) $matches[1];
 174:                 if ($val > $max) {
 175:                     $max = $val;
 176:                 }
 177:             }
```

### DailyJournalPolicy, Student::visibleTo, MasterDataService::replaceHomeroom

```php
   1: <?php
   2: 
   3: namespace App\Policies;
   4: 
   5: use App\Models\DailyJournal;
   6: use App\Models\Student;
   7: use App\Models\User;
   8: 
   9: class DailyJournalPolicy
  10: {
  11:     public function view(User $user, DailyJournal $journal): bool
  12:     {
  13:         if ($user->hasAnyRole(['admin', 'kepala_sekolah'])) {
  14:             return true;
  15:         }
  16: 
  17:         return $journal->student && Student::visibleTo($user)->whereKey($journal->student_id)->exists();
  18:     }
  19: 
  20:     public function create(User $user): bool
  21:     {
  22:         return $user->hasRole('guru');
  23:     }
  24: 
  25:     public function update(User $user, DailyJournal $journal): bool
  26:     {
  27:         return $user->hasRole('guru')
  28:             && $journal->teacher_id === $user->teacher?->id
  29:             && Student::visibleTo($user)->whereKey($journal->student_id)->exists()
  30:             && ($journal->status->value === 'draf' || ! $journal->finalized_at || ! $journal->journal_date->endOfDay()->addDays(config('skms.journal_edit_days', 1))->isPast());
  31:     }
  32: }
  45: 
  46:     public function scopeVisibleTo(Builder $query, User $user): Builder
  47:     {
  48:         if ($user->hasAnyRole(['admin', 'kepala_sekolah'])) {
  49:             return $query;
  50:         } if ($user->hasRole('orang_tua')) {
  51:             return $query->whereHas('guardians', fn ($q) => $q->where('user_id', $user->id));
  52:         } if ($user->hasRole('guru')) {
  53:             return $query->whereHas('enrollments', fn ($q) => $q->where('status', 'aktif')->whereHas('classroom', fn ($c) => $c->where(fn ($cq) => $cq->where('homeroom_teacher_id', $user->teacher?->id)->orWhereHas('teachers', fn ($tq) => $tq->where('teachers.id', $user->teacher?->id)))->whereHas('academicYear', fn ($y) => $y->where('is_active', true))));
  54:         }
  55: 
  56:         return $query->whereKey(-1);
  57:     }
  58: }
 119:     public function replaceHomeroom(Classroom $classroom, Teacher $teacher, User $actor): Classroom
 120:     {
 121:         Gate::forUser($actor)->authorize('update', $classroom);
 122: 
 123:         return DB::transaction(function () use ($classroom, $teacher, $actor) {
 124:             $teacher = Teacher::whereKey($teacher->id)->lockForUpdate()->firstOrFail();
 125:             if (! $classroom->academicYear->is_active || ! $teacher->user->is_active) {
 126:                 throw ValidationException::withMessages(['teacher_id' => 'Pilih guru aktif dan kelas pada tahun ajaran aktif.']);
 127:             }
 128:             $isAlreadyHomeroom = Classroom::where('homeroom_teacher_id', $teacher->id)
 129:                 ->where('academic_year_id', $classroom->academic_year_id)
 130:                 ->where('id', '!=', $classroom->id)
 131:                 ->exists();
 132: 
 133:             if ($isAlreadyHomeroom || $teacher->classrooms()->where('classrooms.academic_year_id', $classroom->academic_year_id)->where('classrooms.id', '!=', $classroom->id)->exists()) {
 134:                 throw ValidationException::withMessages(['teacher_id' => 'Guru sudah menjadi wali kelas lain pada tahun ajaran ini.']);
 135:             }
 136: 
 137:             $oldHomeroomId = $classroom->homeroom_teacher_id;
 138:             $currentCount = $classroom->teachers()
 139:                 ->where('teachers.id', '!=', $teacher->id)
 140:                 ->when($oldHomeroomId, fn ($q) => $q->where('teachers.id', '!=', $oldHomeroomId))
 141:                 ->count();
 142:             if ($currentCount >= 3) {
 143:                 throw ValidationException::withMessages(['teacher_id' => 'Kelas ini sudah mencapai batas maksimal 3 guru.']);
 144:             }
 145: 
 146:             $old = $classroom->getAttributes();
 147: 
 148:             $classroom->update(['homeroom_teacher_id' => $teacher->id]);
 149:             $classroom->teachers()->syncWithoutDetaching([
 150:                 $teacher->id => ['role' => 'wali_kelas'],
 151:             ]);
 152: 
 153:             if ($oldHomeroomId && $oldHomeroomId !== $teacher->id) {
 154:                 $classroom->teachers()->detach($oldHomeroomId);
 155:             }
 156: 
 157:             AuditLog::create(['user_id' => $actor->id, 'action' => 'homeroom_changed', 'entity_type' => 'Classroom', 'entity_id' => $classroom->id, 'old_values' => $old, 'new_values' => $classroom->fresh()->getAttributes()]);
 158: 
 159:             return $classroom->fresh();
 160:         });
 161:     }
 162: 
 163:     public function deactivate(Student|Teacher|User $record, User $actor): void
 164:     {
```

### HandleInertiaRequests::share

```php
  33:     public function share(Request $request): array
  34:     {
  35:         $user = $request->user();
  36: 
  37:         return [
  38:             ...parent::share($request),
  39:             'auth' => [
  40:                 'user' => $user ? [
  41:                     'id' => $user->id,
  42:                     'name' => $user->name,
  43:                     'email' => $user->email,
  44:                     'email_verified_at' => $user->email_verified_at,
  45:                 ] : null,
  46:             ],
  47:             'appName' => config('app.name'),
  48:             'temporaryAccount' => function () use ($request) {
  49:                 $encrypted = $request->session()->pull('provisioned_account');
  50: 
  51:                 return $encrypted ? json_decode(Crypt::decryptString($encrypted), true) : null;
  52:             },
  53:             'flash' => ['success' => fn () => $request->session()->get('success')],
  54:             'schoolName' => fn () => Schema::hasTable('school_settings') ? SchoolSetting::where('key', 'school_name')->value('value') : '',
  55:             'schoolPhone' => fn () => Schema::hasTable('school_settings') ? SchoolSetting::where('key', 'school_phone')->value('value') : '',
  56:             'schoolAddress' => fn () => Schema::hasTable('school_settings') ? SchoolSetting::where('key', 'school_address')->value('value') : '',
  57:             'schoolSettings' => function () use ($user) {
  58:                 if (! $user || ! $user->hasAnyRole(['admin', 'orang_tua']) || ! Schema::hasTable('school_settings')) {
  59:                     return [];
  60:                 }
  61: 
  62:                 return SchoolSetting::query()->whereIn('key', [
  63:                     'school_name', 'school_address', 'school_phone', 'bank_name',
  64:                     'bank_account_number', 'bank_account_holder', 'default_spp_amount',
  65:                 ])->pluck('value', 'key')->all();
  66:             },
  67:             'brandAssets' => [
  68:                 'logo' => file_exists(public_path('brand/logo.png')) || file_exists(public_path('brand/logo.jpg')),
  69:                 'schoolPhoto' => file_exists(public_path('brand/school.jpg')),
  70:             ],
  71:         ];
  72:     }
  73: }
```

### BrandMark dan footer publik

```tsx
   1: import { usePage } from '@inertiajs/react';
   2: 
   3: type Props = { appName?: string; schoolName?: string };
   4: 
   5: export default function BrandMark({ appName = '', schoolName = '' }: Props) {
   6:     const props = usePage().props as { brandAssets?: { logo?: boolean } };
   7:     const logo = props.brandAssets?.logo;
   8:     return <span className="brand-mark">{logo && <img src="/brand/logo.png" alt={schoolName || 'Logo sekolah'} style={{ width: 32, height: 32, objectFit: 'contain', marginRight: 8 }} />}<span className="brand-wordmark">{appName}</span>{schoolName && <span className="brand-school-name">{schoolName}</span>}</span>;
   9: }
   1: import { Link, usePage } from '@inertiajs/react';
   2: import { UserRound } from 'lucide-react';
   3: import { PropsWithChildren } from 'react';
   4: import BrandMark from '@/Components/BrandMark';
   5: 
   6: type Props = PropsWithChildren<{ showFooter?: boolean }>;
   7: 
   8: export default function Guest({ children, showFooter = false }: Props) {
   9:     const props = usePage().props as { appName?: string; schoolName?: string; brandAssets?: { logo?: boolean; schoolPhoto?: boolean } };
  10: 
  11:     return (
  12:         <div className="guest-shell">
  13:             <header className="guest-nav">
  14:                 <div className="guest-nav-inner">
  15:                     <Link href="/" className="wordmark"><BrandMark appName={props.appName} schoolName={props.schoolName} /></Link>
  16:                     <span className="guest-mobile-avatar" aria-hidden="true"><UserRound size={18} strokeWidth={1.8} /></span>
  17:                 </div>
  18:             </header>
  19:             <div className="guest-auth-grid"><aside className="guest-photo-panel" aria-label="Suasana sekolah" style={props.brandAssets?.schoolPhoto ? { backgroundImage: 'url(/brand/school.jpg)' } : undefined}><div>{props.schoolName}</div></aside><main className="guest-card">{children}</main></div>
  20:             {showFooter && <footer className="guest-footer">© {new Date().getFullYear()} {props.schoolName || ''} · Sistem Informasi dan Keuangan Sekolah</footer>}
  21:         </div>
  22:     );
  23: }
```

## 6. DAFTAR ROUTE

Keluaran `php artisan route:list --except-vendor`:

```text

  GET|HEAD  / ........................................................................................................ 
  GET|HEAD  admin ....................................................... admin.home › Admin\DashboardController@index
  GET|HEAD  admin/audit-log ........................................ admin.audit-logs › Admin\AuditLogController@index
  GET|HEAD  admin/buku-kas ...................................... admin.cash-ledger › Admin\CashLedgerController@index
  GET|HEAD  admin/buku-kas/excel .......................... admin.cash-ledger.excel › Admin\CashLedgerController@excel
  GET|HEAD  admin/buku-kas/pdf ................................ admin.cash-ledger.pdf › Admin\CashLedgerController@pdf
  POST      admin/guru ................................. admin.teachers.store › Admin\AdminDataController@storeTeacher
  GET|HEAD  admin/guru ................................................ admin.teachers › Admin\TeacherController@index
  POST      admin/guru/{teacher}/kelas ............. admin.teachers.assign-class › Admin\TeacherController@assignClass
  POST      admin/guru/{teacher}/reset-kata-sandi ............... admin.teachers.reset › Admin\TeacherController@reset
  POST      admin/kelas ..................................... admin.classrooms.store › Admin\ClassroomController@store
  GET|HEAD  admin/kelas ........................................... admin.classrooms › Admin\ClassroomController@index
  POST      admin/kelas/{classroom}/siswa ..................... admin.classrooms.move › Admin\ClassroomController@move
  POST      admin/kelas/{classroom}/wali ......... admin.classrooms.teacher › Admin\ClassroomController@replaceTeacher
  GET|HEAD  admin/laporan ............................................... admin.reports › Admin\ReportController@index
  GET|HEAD  admin/laporan/excel ................................... admin.reports.excel › Admin\ReportController@excel
  GET|HEAD  admin/laporan/pdf ......................................... admin.reports.pdf › Admin\ReportController@pdf
  POST      admin/orang-tua .......................... admin.guardians.store › Admin\AdminDataController@storeGuardian
  GET|HEAD  admin/orang-tua ......................................... admin.guardians › Admin\GuardianController@index
  POST      admin/orang-tua/{guardian}/reset-kata-sandi ....... admin.guardians.reset › Admin\GuardianController@reset
  GET|HEAD  admin/pengumuman ................................ admin.announcements › Admin\AnnouncementController@index
  POST      admin/pengumuman .......................... admin.announcements.store › Admin\AnnouncementController@store
  GET|HEAD  admin/pengumuman/create ................. admin.announcements.create › Admin\AnnouncementController@create
  PUT       admin/pengumuman/{announcement} ......... admin.announcements.update › Admin\AnnouncementController@update
  DELETE    admin/pengumuman/{announcement} ....... admin.announcements.destroy › Admin\AnnouncementController@destroy
  GET|HEAD  admin/pengumuman/{announcement}/edit ........ admin.announcements.edit › Admin\AnnouncementController@edit
  GET|HEAD  admin/siswa .......................................... admin.students › Admin\AdminDataController@students
  POST      admin/siswa ................................ admin.students.store › Admin\AdminDataController@storeStudent
  GET|HEAD  admin/siswa/create ....................... admin.students.create › Admin\AdminDataController@createStudent
  PUT       admin/siswa/{student} .................... admin.students.update › Admin\AdminDataController@updateStudent
  POST      admin/siswa/{student}/nonaktifkan admin.students.deactivate › Admin\AdminDataController@deactivateStudent
  POST      admin/siswa/{student}/pindah ................. admin.students.move › Admin\AdminDataController@moveStudent
  GET|HEAD  admin/tagihan ............................................. admin.invoices › Admin\InvoiceController@index
  POST      admin/tagihan/generate ..................... admin.invoices.generate.v2 › Admin\InvoiceController@generate
  POST      admin/tagihan/preview ........................... admin.invoices.preview › Admin\InvoiceController@preview
  PATCH     admin/tagihan/{invoice}/nominal ................... admin.invoices.update › Admin\InvoiceController@update
  GET|HEAD  admin/verifikasi ............................... admin.payments.index › Admin\PaymentQueueController@index
  GET|HEAD  admin/verifikasi/{payment}/bukti ............... admin.payments.proof › Admin\PaymentQueueController@proof
  POST      admin/verifikasi/{payment}/setujui .. admin.payments.approve › Admin\PaymentVerificationController@approve
  POST      admin/verifikasi/{payment}/tolak ...... admin.payments.reject › Admin\PaymentVerificationController@reject
  GET|HEAD  anekdot/{note}/foto ................................. anecdotes.photo › Guru\AnecdotalNoteController@photo
  GET|HEAD  dashboard ...................................................................................... dashboard
  GET|HEAD  forgot-password ............................... password.request › Auth\PasswordResetLinkController@create
  POST      forgot-password .................................. password.email › Auth\PasswordResetLinkController@store
  GET|HEAD  ganti-kata-sandi ......................................... password.change › ChangePasswordController@edit
  PUT       ganti-kata-sandi ................................ password.change.update › ChangePasswordController@update
  GET|HEAD  guru .......................................................... guru.home › Guru\DashboardController@index
  GET|HEAD  guru/anekdot ......................................... guru.anecdotes › Guru\AnecdotalNoteController@index
  POST      guru/anekdot ................................... guru.anecdotes.store › Guru\AnecdotalNoteController@store
  PUT       guru/anekdot/{note} .......................... guru.anecdotes.update › Guru\AnecdotalNoteController@update
  GET|HEAD  guru/jurnal ................................................. guru.journals › Guru\JournalController@index
  POST      guru/jurnal ........................................... guru.journals.store › Guru\JournalController@store
  POST      guru/jurnal/{journal}/final ..................... guru.journals.finalize › Guru\JournalController@finalize
  GET|HEAD  guru/jurnal/{student} ................................... guru.journals.show › Guru\JournalController@show
  GET|HEAD  guru/riwayat ...................................... guru.journals.history › Guru\JournalController@history
  GET|HEAD  kepsek .................................................... kepsek.home › Kepsek\DashboardController@index
  GET|HEAD  kepsek/laporan-evaluasi .................. principal.student-report › Kepsek\StudentReportController@index
  GET|HEAD  kepsek/laporan-evaluasi/pdf ............ principal.student-report.pdf › Kepsek\StudentReportController@pdf
  GET|HEAD  kepsek/laporan-keuangan ......................... principal.finance › Kepsek\FinanceReportController@index
  GET|HEAD  kepsek/laporan-keuangan/excel ............. principal.finance.excel › Kepsek\FinanceReportController@excel
  GET|HEAD  kepsek/laporan-keuangan/pdf ................... principal.finance.pdf › Kepsek\FinanceReportController@pdf
  GET|HEAD  login ................................................. login › Auth\AuthenticatedSessionController@create
  POST      login .......................................................... Auth\AuthenticatedSessionController@store
  POST      logout .............................................. logout › Auth\AuthenticatedSessionController@destroy
  GET|HEAD  ortu .......................................................... ortu.home › Ortu\DashboardController@index
  GET|HEAD  ortu/pembayaran/{payment}/bukti ............... ortu.payments.proof › Ortu\PaymentProofController@download
  GET|HEAD  ortu/perkembangan .................................... ortu.development › Ortu\DevelopmentController@index
  GET|HEAD  ortu/perkembangan/{student}/laporan ........... ortu.student-report.pdf › Ortu\StudentReportController@pdf
  GET|HEAD  ortu/profil .................................................. ortu.profile › Ortu\ProfileController@index
  GET|HEAD  ortu/tagihan ................................................ ortu.invoices › Ortu\InvoiceController@index
  GET|HEAD  ortu/tagihan/{invoice} .................................. ortu.invoices.show › Ortu\InvoiceController@show
  POST      ortu/tagihan/{invoice}/bukti ........................ ortu.invoices.upload › Ortu\InvoiceController@upload
  GET|HEAD  ortu/tagihan/{invoice}/kuitansi .................. ortu.invoices.receipt › Ortu\ReceiptController@download
  PUT       password ................................................ password.update › Auth\PasswordController@update
  POST      reset-password ......................................... password.store › Auth\NewPasswordController@store
  GET|HEAD  reset-password/{token} ................................ password.reset › Auth\NewPasswordController@create
  GET|HEAD  styleguide .................................................................................... styleguide

                                                                                                   Showing [77] routes

```

## 7. PEMINDAIAN IDENTITAS

Pencarian di `app/`, `resources/`, dan `tests/`, dengan seeder serta tes identitas yang memang menguji literal dikecualikan:

```text
tests\TestCase.php:17:            || ($driver === 'mysql' && $database === 'skms_test' && ! $url)) {
tests\TestCase.php:21:        throw new \RuntimeException('Tests require SQLite :memory: or MySQL database skms_test; refusing any other database.');
tests\js\progress-steps.test.mjs:19:const outDir = join(root, 'node_modules/.cache/skms-tests');
app\Services\JournalService.php:80:        return $journal->journal_date->endOfDay()->addDays(config('skms.journal_edit_days', 1))->isPast();
app\Policies\DailyJournalPolicy.php:30:            && ($journal->status->value === 'draf' || ! $journal->finalized_at || ! $journal->journal_date->endOfDay()->addDays(config('skms.journal_edit_days', 1))->isPast());
app\Http\Controllers\Guru\JournalController.php:141:        $editWindowDays = (int) config('skms.journal_edit_days', 1);
```

Satu-satunya hasil yang diharapkan untuk namespace `skms` adalah nama konfigurasi, bukan identitas sekolah. Tidak ada `[ISI]` pada area yang dipindai.

## 8. DOKUMEN

### Tabel status docs/TASKS.md

| Batch | Definisi | Status | Bukti |
|---|---|---|---|
| Batch 0 | Lingkungan verifikasi | Sebagian | `phpunit.xml`, `phpunit.mysql.xml`, `tests/TestCase.php`, e2e safety spec, dan lint/build ada; E2E penuh belum dijalankan. |
| Batch 1 | Integritas data dan RBAC | Sebagian | `SecurityFixesTest`, `DomainFlowTest`, `AuthorizationScopeTest`, `FinanceAuditCoverageTest`, `JournalRbacAuditCoverageTest` lulus; kegagalan tersisa berada pada audit identitas. |
| Batch 2 | Fondasi visual | Sebagian | Komponen/layout/CSS dan `tests/js` lulus; render browser semua layar belum terbukti dan identitas dinamis gagal pada tes audit. |
| Batch 3A | Keuangan admin | Sebagian | `AdminFinanceTest`, `FinanceAuditCoverageTest`, `ConcurrencySafeNumberingTest` lulus; verifikasi concurrency native MySQL masih terbuka. |
| Batch 3B | Keuangan orang tua | Selesai | `ParentInvoiceUiTest` lulus untuk scope anak, empat state, upload, private proof, receipt, dan RBAC. E2E browser belum termasuk bukti batch. |
| Batch 3C | Guru dan perkembangan | Selesai | `JournalFlowTest` dan seluruh `JournalRbacAuditCoverageTest` lulus; scope keanggotaan aktif dan pelepasan wali lama teruji. |
| Batch 3D | Dashboard dan laporan | Selesai | `MilestoneM7Test` dan `ReportAuditCoverageTest` lulus; agregasi, filter, batas tanggal, tunggakan, dan rapor kosong teruji di SQLite. |
| Batch 3E | Master data, pengumuman, profil | Selesai | `MasterDataTest`, `MilestoneM6Test`, dan `MasterAnnouncementAuditCoverageTest` lulus. |
| Batch 4 | Penyempurnaan | Sebagian | Sebagian state, komponen, tes JS, lint/build tersedia; responsif semua layar, accessibility runtime, state lengkap, dan E2E belum terbukti. |

### Tabel status docs/HANDOFF.md

| Batch | Status | Bukti utama |
|---|---|---|
| Batch 1 Integritas data/RBAC | Sebagian | Alur dasar lulus; alur disk dan regresi guru pengganti lulus; konkurensi MySQL masih terbuka. |
| Batch 2 Fondasi visual | Sebagian | Komponen/token, identitas dinamis, lint/build, dan tes JS lulus; browser visual dan E2E belum seluruhnya terbukti. |
| Batch 3A Keuangan admin | Sebagian | SPP, payment, ledger, receipt, ekspor, search, dan kegagalan disk teruji; MySQL/browser workflow belum diuji. |
| Batch 3B Keuangan orang tua | Selesai secara feature test | `ParentInvoiceUiTest` lulus untuk scope anak, empat state, upload, private proof, receipt, dan RBAC; E2E browser belum diuji. |
| Batch 3C Guru/perkembangan | Selesai | `JournalFlowTest` dan `JournalRbacAuditCoverageTest` lulus, termasuk membership aktif dan penggantian wali. |
| Batch 3D Dashboard/laporan | Selesai | `ReportAuditCoverageTest`, `MilestoneM7Test`, dan seeder audit lulus untuk agregasi, filter, batas tanggal, tunggakan, kalender jurnal, dan rapor kosong. |
| Batch 3E Master/pengumuman/profil | Selesai | Target HTTP, akun, reset, kelas, audit perubahan siswa, dan validasi konflik wali kelas lulus. |
| Batch 4 QA | Sebagian | Pint, lint, build, dan tes JS lulus; E2E penuh, visual browser, accessibility runtime, dan state semua layar belum terbukti. |

## 9. YANG BELUM TERBUKTI

- Query agregasi MySQL dengan `ONLY_FULL_GROUP_BY`, lock antarproses, deadlock, race condition, dan perilaku DATE/collation MySQL; suite saat ini memakai SQLite in-memory.
- Perbandingan visual browser pada 390/834/1440, urutan fokus, kontras runtime, dan tap target.
- Alur E2E penuh (`npm run e2e`), termasuk upload payment, child switch, clipboard, print, dan private file melalui browser.
- Isi/rahasia produksi `.env`, konfigurasi server, dan kredensial MySQL tidak diperiksa serta tidak ditulis.
- Keputusan tambahan di luar `docs/DECISIONS.md`: tidak ada. Penyesuaian assertion D2/D3/D4 yang tercatat pada bagian 2 mengikuti keputusan eksplisit tersebut.

### Query Excel tunggakan

```php
   1: <?php
   2: 
   3: namespace App\Exports;
   4: 
   5: use Maatwebsite\Excel\Concerns\FromArray;
   6: use Maatwebsite\Excel\Concerns\WithHeadings;
   7: 
   8: class OverdueReportExport implements FromArray, WithHeadings
   9: {
  10:     public function __construct(private array $rows) {}
  11: 
  12:     public function headings(): array
  13:     {
  14:         return ['Siswa', 'Kelas', 'Bulan menunggak', 'Hari terlambat', 'Nominal'];
  15:     }
  16: 
  17:     public function array(): array
  18:     {
  19:         $rows = collect($this->rows)->map(fn ($row) => [
  20:             $row['student_name'], $row['classroom'], $row['months'], $row['late_days'], $row['amount'],
  21:         ])->all();
  22:         $rows[] = ['Total', '', '', '', collect($this->rows)->sum('amount')];
  23: 
  24:         return $rows;
  25:     }
  26: }
 125:             'filters' => $filters,
 126:             'school_name' => $schoolName,
 127:         ])->setPaper('a4')->download('laporan-rekap-spp.pdf');
 128:     }
 129: 
 130:     public function excel(Request $request, ReportService $reports)
 131:     {
 132:         $filters = $request->only(['start_date', 'end_date', 'academic_year_id', 'classroom_id', 'status', 'tab']);
 133:         $tab = $request->input('tab', 'rekap');
 134: 
 135:         $export = match ($tab) {
 136:             'ringkasan_kelas' => new ClassSummaryExport($reports->classSummaryReport($filters['academic_year_id'] ?? null)),
 137:             'tunggakan' => new OverdueReportExport($reports->overdueStudents(30, $filters['academic_year_id'] ?? null, $filters)),
 138:             default => new FinanceReportExport($reports->financeQuery($filters)),
 139:         };
 140: 
 141:         return Excel::download($export, "laporan-admin-{$tab}.xlsx");
 142:     }
 143: }
```

### Query komposisi SPP dan finance query

```php
  26:     public function tuitionSummary(int $month, int $year, ?int $academicYearId = null): array
  27:     {
  28:         $query = Invoice::query()->where('period_month', $month)->where('period_year', $year);
  29:         if ($academicYearId) {
  30:             $query->where('academic_year_id', $academicYearId);
  31:         }
  32: 
  33:         $rows = $query->select(['status', DB::raw('COUNT(*) as invoice_count'), DB::raw('SUM(amount - discount_amount) as total_amount')])->groupBy('status')->get();
  34:         $composition = ['lunas' => ['count' => 0, 'amount' => 0], 'menunggu_verifikasi' => ['count' => 0, 'amount' => 0], 'belum_bayar' => ['count' => 0, 'amount' => 0]];
  35:         foreach ($rows as $row) {
  36:             $key = $row->status instanceof InvoiceStatus ? $row->status->value : $row->status;
  37:             $key = $key === InvoiceStatus::Rejected->value ? InvoiceStatus::Unpaid->value : $key;
  38:             if (isset($composition[$key])) {
  39:                 $composition[$key]['count'] += (int) $row->invoice_count;
  40:                 $composition[$key]['amount'] += (int) $row->total_amount;
  41:             }
  42:         }
  43:         $total = array_sum(array_column($composition, 'count'));
  44:         $paid = $composition['lunas']['count'];
  45: 
  46:         return ['month' => $month, 'year' => $year, 'total_invoices' => $total, 'paid_percentage' => $total ? round($paid / $total * 100, 1) : 0, 'target_amount' => array_sum(array_column($composition, 'amount')), 'composition' => $composition];
  47:     }
  48: 
 165:     public function financeQuery(array $filters): Builder
 166:     {
 167:         return Invoice::query()->with(['student', 'student.enrollments.classroom'])->when($filters['start_date'] ?? null, fn ($query, $date) => $query->whereDate('due_date', '>=', $date))->when($filters['end_date'] ?? null, fn ($query, $date) => $query->whereDate('due_date', '<=', $date))->when($filters['academic_year_id'] ?? null, fn ($query, $id) => $query->where('academic_year_id', $id))->when($filters['classroom_id'] ?? null, function ($query, $id) use ($filters) {
 168:             $query->whereHas('student.enrollments', fn ($enrollment) => $enrollment->where('classroom_id', $id)->when($filters['academic_year_id'] ?? null, fn ($year) => $year->where('academic_year_id', $filters['academic_year_id'])));
 169:         })->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))->latest('due_date');
 170:     }
 171: 
 172:     public function financeTotals(array $filters): array
 173:     {
 174:         $row = (clone $this->financeQuery($filters))->reorder()->toBase()->selectRaw("SUM(CASE WHEN status = 'lunas' THEN amount - discount_amount ELSE 0 END) as received, SUM(CASE WHEN status != 'lunas' THEN amount - discount_amount ELSE 0 END) as unreceived, COUNT(*) as invoice_count")->first();
 175: 
 176:         return ['received' => (int) ($row->received ?? 0), 'unreceived' => (int) ($row->unreceived ?? 0), 'invoice_count' => (int) ($row->invoice_count ?? 0)];
 177:     }
 178: 
```
