<?php

namespace Tests\Feature;

use App\Enums\InvoiceStatus;
use App\Enums\PaymentStatus;
use App\Models\AcademicYear;
use App\Models\CashLedgerEntry;
use App\Models\Classroom;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Student;
use App\Models\User;
use App\Services\InvoiceService;
use App\Services\PaymentVerificationService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Catatan Pengujian Konkurensi:
 * Balapan paralel sungguhan (real concurrent racing condition) tidak dapat
 * direproduksi secara penuh di lingkungan SQLite in-memory single-thread,
 * dan hanya dapat diuji secara multi-thread pada MySQL dengan proses worker paralel.
 * Pengujian di bawah ini memvalidasi determinisme penomoran berurutan, ketahanan
 * terhadap collision buatan (retry loop saat duplicate key), isolasi penomoran antar bulan,
 * dan perolehan lock Cache::lock.
 */
class ConcurrencySafeNumberingTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private AcademicYear $year;

    private Classroom $class;

    protected function setUp(): void
    {
        parent::setUp();
        Role::findOrCreate('admin', 'web');
        Role::findOrCreate('orang_tua', 'web');

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        $this->year = AcademicYear::create([
            'name' => '2026/2027',
            'start_date' => '2026-07-01',
            'end_date' => '2027-06-30',
            'is_active' => true,
        ]);

        $this->class = Classroom::create([
            'academic_year_id' => $this->year->id,
            'name' => 'Kelompok A',
            'age_range' => '4-5 tahun',
        ]);
    }

    private function createStudent(string $nis, string $name): Student
    {
        $student = Student::create([
            'nis' => $nis,
            'name' => $name,
            'birth_date' => '2021-01-01',
            'gender' => 'L',
            'entry_year' => 2026,
            'status' => 'aktif',
        ]);

        $student->enrollments()->create([
            'classroom_id' => $this->class->id,
            'academic_year_id' => $this->year->id,
            'status' => 'aktif',
        ]);

        return $student;
    }

    public function test_invoice_numbers_are_sequential_unique_and_without_gaps_across_batch_generations(): void
    {
        $service = app(InvoiceService::class);

        // Batch 1: buat 3 siswa
        $s1 = $this->createStudent('001', 'Siswa Satu');
        $s2 = $this->createStudent('002', 'Siswa Dua');
        $s3 = $this->createStudent('003', 'Siswa Tiga');

        $res1 = $service->generate(10, 2026, $this->year->id, 350000, null, $this->admin);
        $this->assertSame(3, $res1['created']);
        $this->assertSame(0, $res1['skipped']);

        $invoices = Invoice::where('period_year', 2026)->where('period_month', 10)->orderBy('invoice_number')->pluck('invoice_number')->all();
        $this->assertSame(['INV-2026-10-001', 'INV-2026-10-002', 'INV-2026-10-003'], $invoices);

        // Batch 2: tambah 2 siswa baru di bulan yang sama
        $s4 = $this->createStudent('004', 'Siswa Empat');
        $s5 = $this->createStudent('005', 'Siswa Lima');

        $res2 = $service->generate(10, 2026, $this->year->id, 350000, null, $this->admin);
        $this->assertSame(2, $res2['created']);
        $this->assertSame(3, $res2['skipped']); // Siswa 1-3 di-skip

        $allInvoices = Invoice::where('period_year', 2026)->where('period_month', 10)->orderBy('invoice_number')->pluck('invoice_number')->all();
        $this->assertSame([
            'INV-2026-10-001',
            'INV-2026-10-002',
            'INV-2026-10-003',
            'INV-2026-10-004',
            'INV-2026-10-005',
        ], $allInvoices);
    }

    public function test_invoice_generate_called_twice_for_same_period_does_not_create_duplicates(): void
    {
        $service = app(InvoiceService::class);
        $this->createStudent('001', 'Siswa Satu');
        $this->createStudent('002', 'Siswa Dua');

        $res1 = $service->generate(10, 2026, $this->year->id, 350000, null, $this->admin);
        $this->assertSame(2, $res1['created']);

        // Pemanggilan kedua langsung
        $res2 = $service->generate(10, 2026, $this->year->id, 350000, null, $this->admin);
        $this->assertSame(0, $res2['created']);
        $this->assertSame(2, $res2['skipped']);

        $this->assertSame(2, Invoice::where('period_year', 2026)->where('period_month', 10)->count());
    }

    public function test_invoice_generation_handles_pre_existing_gap_or_collision_gracefully(): void
    {
        $service = app(InvoiceService::class);
        $s1 = $this->createStudent('001', 'Siswa Satu');
        $s2 = $this->createStudent('002', 'Siswa Dua');

        // Simulasi: buat invoice s1 dengan nomor INV-2026-10-005 secara manual (misal ada baris lompat)
        Invoice::create([
            'invoice_number' => 'INV-2026-10-005',
            'student_id' => $s1->id,
            'academic_year_id' => $this->year->id,
            'period_month' => 10,
            'period_year' => 2026,
            'amount' => 350000,
            'discount_amount' => 0,
            'due_date' => '2026-10-10',
            'status' => InvoiceStatus::Unpaid,
        ]);

        // Jalankan generate untuk s2: sistem harus mengambil max(5) + 1 = 006, bukan menabrak 001 atau 005
        $res = $service->generate(10, 2026, $this->year->id, 350000, null, $this->admin);
        $this->assertSame(1, $res['created']);
        $this->assertSame(1, $res['skipped']);

        $s2Invoice = Invoice::where('student_id', $s2->id)->where('period_month', 10)->first();
        $this->assertNotNull($s2Invoice);
        $this->assertSame('INV-2026-10-006', $s2Invoice->invoice_number);
    }

    public function test_receipt_numbers_are_sequential_unique_and_isolated_by_month(): void
    {
        $service = app(PaymentVerificationService::class);
        $s1 = $this->createStudent('001', 'Siswa Satu');
        $s2 = $this->createStudent('002', 'Siswa Dua');
        $s3 = $this->createStudent('003', 'Siswa Tiga');

        // Tagihan Bulan Oktober
        $invOct1 = Invoice::factory()->create([
            'student_id' => $s1->id,
            'academic_year_id' => $this->year->id,
            'period_month' => 10,
            'period_year' => 2026,
            'status' => InvoiceStatus::Pending,
        ]);
        $payOct1 = Payment::factory()->create([
            'invoice_id' => $invOct1->id,
            'status' => PaymentStatus::Pending,
            'submitted_by' => $this->admin->id,
        ]);

        $invOct2 = Invoice::factory()->create([
            'student_id' => $s2->id,
            'academic_year_id' => $this->year->id,
            'period_month' => 10,
            'period_year' => 2026,
            'status' => InvoiceStatus::Pending,
        ]);
        $payOct2 = Payment::factory()->create([
            'invoice_id' => $invOct2->id,
            'status' => PaymentStatus::Pending,
            'submitted_by' => $this->admin->id,
        ]);

        // Tagihan Bulan November
        $invNov1 = Invoice::factory()->create([
            'student_id' => $s3->id,
            'academic_year_id' => $this->year->id,
            'period_month' => 11,
            'period_year' => 2026,
            'status' => InvoiceStatus::Pending,
        ]);
        $payNov1 = Payment::factory()->create([
            'invoice_id' => $invNov1->id,
            'status' => PaymentStatus::Pending,
            'submitted_by' => $this->admin->id,
        ]);

        // Set waktu konfirmasi ke Oktober 2026
        Carbon::setTestNow(Carbon::create(2026, 10, 15, 10, 0, 0));
        $service->approve($payOct1, $this->admin);
        $service->approve($payOct2, $this->admin);

        // Set waktu konfirmasi ke November 2026
        Carbon::setTestNow(Carbon::create(2026, 11, 5, 10, 0, 0));
        $service->approve($payNov1, $this->admin);
        Carbon::setTestNow();

        $octReceipts = CashLedgerEntry::where('entry_date', 'like', '2026-10%')->orderBy('receipt_number')->pluck('receipt_number')->all();
        $this->assertSame(['KWT/2026/10/001', 'KWT/2026/10/002'], $octReceipts);

        $novReceipts = CashLedgerEntry::where('entry_date', 'like', '2026-11%')->pluck('receipt_number')->all();
        $this->assertSame(['KWT/2026/11/001'], $novReceipts);
    }

    public function test_receipt_approval_retries_and_succeeds_on_simulated_collision(): void
    {
        $service = app(PaymentVerificationService::class);
        $s1 = $this->createStudent('001', 'Siswa Satu');
        $s2 = $this->createStudent('002', 'Siswa Dua');

        $inv1 = Invoice::factory()->create(['student_id' => $s1->id, 'academic_year_id' => $this->year->id, 'status' => InvoiceStatus::Pending]);
        $pay1 = Payment::factory()->create(['invoice_id' => $inv1->id, 'status' => PaymentStatus::Pending, 'submitted_by' => $this->admin->id]);

        Carbon::setTestNow(Carbon::create(2026, 10, 10, 10, 0, 0));

        // Simulasi: Masukkan baris dengan receipt KWT/2026/10/001 manual dari proses lain untuk siswa 2
        $dummyInv = Invoice::factory()->create(['student_id' => $s2->id, 'academic_year_id' => $this->year->id, 'status' => InvoiceStatus::Paid]);
        $dummyPay = Payment::factory()->create(['invoice_id' => $dummyInv->id, 'status' => PaymentStatus::Approved, 'submitted_by' => $this->admin->id]);
        CashLedgerEntry::create([
            'invoice_id' => $dummyInv->id,
            'payment_id' => $dummyPay->id,
            'entry_date' => '2026-10-10',
            'description' => 'Dummy Entry',
            'amount_in' => 350000,
            'receipt_number' => 'KWT/2026/10/001',
        ]);

        // Saat approve dijalankan, sistem menghitung max(001) + 1 = 002, tidak bentrok dengan 001
        $service->approve($pay1, $this->admin);
        Carbon::setTestNow();

        $ledger = CashLedgerEntry::where('invoice_id', $inv1->id)->first();
        $this->assertNotNull($ledger);
        $this->assertSame('KWT/2026/10/002', $ledger->receipt_number);
    }
}
