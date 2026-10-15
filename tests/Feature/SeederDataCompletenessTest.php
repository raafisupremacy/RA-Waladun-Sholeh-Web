<?php

namespace Tests\Feature;

use App\Enums\AnnouncementStatus;
use App\Enums\InvoiceStatus;
use App\Enums\PaymentStatus;
use App\Models\AnecdotalNote;
use App\Models\Announcement;
use App\Models\CashLedgerEntry;
use App\Models\Classroom;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Student;
use App\Models\User;
use App\Services\ReportService;
use Carbon\Carbon;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeederDataCompletenessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Jalankan seeder pada SQLite in-memory
        $this->seed(DatabaseSeeder::class);
    }

    public function test_seeder_creates_expected_students_and_accounts(): void
    {
        $this->assertSame(78, Student::where('status', 'aktif')->count());
        $this->assertSame(['A-1', 'A-2', 'B-1', 'B-2'], Classroom::whereHas('academicYear', fn ($q) => $q->where('is_active', true))->orderBy('name')->pluck('name')->all());
        $this->assertSame([20, 19, 20, 19], Classroom::whereHas('academicYear', fn ($q) => $q->where('is_active', true))->orderBy('name')->withCount(['enrollments' => fn ($q) => $q->where('status', 'aktif')])->pluck('enrollments_count')->all());
        $this->assertDatabaseHas('users', ['email' => 'admin@skms.test']);
        $this->assertDatabaseHas('users', ['email' => 'guru@skms.test']);
        $this->assertDatabaseHas('users', ['email' => 'kepsek@skms.test']);
        $this->assertDatabaseHas('users', ['email' => 'ortu@skms.test']);
    }

    public function test_seeder_tuition_composition_and_overdue_integrity(): void
    {
        // 1. Tagihan Oktober 2026: 63 lunas, 9 menunggu_verifikasi, 6 belum_bayar
        $octPaid = Invoice::where('period_year', 2026)->where('period_month', 10)->where('status', InvoiceStatus::Paid->value)->count();
        $octPending = Invoice::where('period_year', 2026)->where('period_month', 10)->where('status', InvoiceStatus::Pending->value)->count();
        $octUnpaid = Invoice::where('period_year', 2026)->where('period_month', 10)->where('status', InvoiceStatus::Unpaid->value)->count();

        $this->assertSame(63, $octPaid, 'Oktober harus memiliki 63 tagihan lunas');
        $this->assertSame(9, $octPending, 'Oktober harus memiliki 9 tagihan menunggu verifikasi');
        $this->assertSame(6, $octUnpaid, 'Oktober harus memiliki 6 tagihan belum bayar');

        // 2. Tagihan Agustus & September ada untuk seluruh 78 siswa
        $this->assertSame(78, Invoice::where('period_year', 2026)->where('period_month', 8)->count());
        $this->assertSame(78, Invoice::where('period_year', 2026)->where('period_month', 9)->count());

        // 3. Tepat 3 tagihan berstatus ditolak dengan alasan realistis
        $rejectedInvoices = Invoice::where('status', InvoiceStatus::Rejected->value)->get();
        $this->assertGreaterThanOrEqual(3, $rejectedInvoices->count(), 'Minimal 3 tagihan berstatus ditolak');
        foreach ($rejectedInvoices as $inv) {
            $rejectedPayment = Payment::where('invoice_id', $inv->id)->where('status', PaymentStatus::Rejected->value)->first();
            $this->assertNotNull($rejectedPayment);
            $this->assertNotEmpty($rejectedPayment->rejection_reason);
        }

        // 4. Siswa menunggak > 30 hari dihitung dari ReportService
        Carbon::setTestNow(Carbon::create(2026, 10, 15));
        $overdueStudents = app(ReportService::class)->overdueStudents(30);
        Carbon::setTestNow();
        $this->assertSame(9, count($overdueStudents), 'D2 menghitung enam siswa belum bayar dan tiga siswa dengan tagihan ditolak >30 hari');

        // 5. Setiap tagihan lunas memiliki tepat satu entri cash ledger
        $allPaid = Invoice::where('status', InvoiceStatus::Paid->value)->get();
        foreach ($allPaid as $inv) {
            $this->assertSame(1, CashLedgerEntry::where('invoice_id', $inv->id)->count());
        }

        // 6. Setiap tagihan menunggu verifikasi memiliki payment berstatus menunggu
        $allPending = Invoice::where('status', InvoiceStatus::Pending->value)->get();
        foreach ($allPending as $inv) {
            $this->assertTrue(Payment::where('invoice_id', $inv->id)->where('status', PaymentStatus::Pending->value)->exists());
        }

        // 7. Nomor tagihan dan nomor kuitansi unik tanpa duplikasi
        $totalInvoices = Invoice::count();
        $uniqueInvoiceNumbers = Invoice::distinct()->count('invoice_number');
        $this->assertSame($totalInvoices, $uniqueInvoiceNumbers, 'Semua invoice_number harus unik');

        $totalLedgers = CashLedgerEntry::count();
        $uniqueReceiptNumbers = CashLedgerEntry::distinct()->count('receipt_number');
        $this->assertSame($totalLedgers, $uniqueReceiptNumbers, 'Semua receipt_number harus unik');
    }

    public function test_seeder_creates_anecdotes_and_announcements(): void
    {
        // Minimal 12 catatan anekdot tersebar pada beberapa siswa dan kedua guru
        $anecdotes = AnecdotalNote::all();
        $this->assertGreaterThanOrEqual(12, $anecdotes->count(), 'Minimal 12 catatan anekdot');
        $teachersWithAnecdotes = $anecdotes->pluck('teacher_id')->unique();
        $this->assertGreaterThanOrEqual(2, $teachersWithAnecdotes->count(), 'Anekdot harus ditulis oleh minimal 2 guru');

        // Minimal 6 pengumuman: pinned, draft, expired, target classroom A, target classroom B, target all
        $announcements = Announcement::all();
        $this->assertGreaterThanOrEqual(6, $announcements->count(), 'Minimal 6 pengumuman');
        $this->assertTrue($announcements->contains('is_pinned', true), 'Harus ada pengumuman disematkan');
        $this->assertTrue($announcements->contains('status', AnnouncementStatus::Draft), 'Harus ada pengumuman draf');
        $this->assertTrue($announcements->contains(fn ($a) => $a->expires_at !== null && Carbon::parse($a->expires_at)->isPast()), 'Harus ada pengumuman kedaluwarsa');
        $this->assertTrue($announcements->contains(fn ($a) => $a->classroom_id !== null), 'Harus ada pengumuman target kelas');
        $this->assertTrue($announcements->contains(fn ($a) => $a->classroom_id === null), 'Harus ada pengumuman target semua');
    }

    public function test_level_and_classroom_targets_are_scoped_to_matching_students(): void
    {
        $a1 = Classroom::where('name', 'A-1')->firstOrFail();
        $a2 = Classroom::where('name', 'A-2')->firstOrFail();
        $b1 = Classroom::where('name', 'B-1')->firstOrFail();
        $admin = User::where('email', 'admin@skms.test')->firstOrFail();
        Announcement::create(['created_by' => $admin->id, 'target_level' => 'A', 'title' => 'A level', 'body' => 'x', 'status' => AnnouncementStatus::Published, 'published_at' => now()]);
        Announcement::create(['created_by' => $admin->id, 'classroom_id' => $a2->id, 'title' => 'A2', 'body' => 'x', 'status' => AnnouncementStatus::Published, 'published_at' => now()]);
        $a1Student = Student::whereHas('enrollments', fn ($q) => $q->where('classroom_id', $a1->id))->firstOrFail();
        $a2Student = Student::whereHas('enrollments', fn ($q) => $q->where('classroom_id', $a2->id))->firstOrFail();
        $b1Student = Student::whereHas('enrollments', fn ($q) => $q->where('classroom_id', $b1->id))->firstOrFail();
        $this->assertCount(1, Announcement::visibleToStudent($a1Student)->whereIn('title', ['A level', 'A2'])->get());
        $this->assertCount(2, Announcement::visibleToStudent($a2Student)->whereIn('title', ['A level', 'A2'])->get());
        $this->assertCount(0, Announcement::visibleToStudent($b1Student)->whereIn('title', ['A level', 'A2'])->get());
    }
}
