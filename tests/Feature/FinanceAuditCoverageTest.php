<?php

namespace Tests\Feature;

use App\Enums\InvoiceStatus;
use App\Enums\PaymentStatus;
use App\Models\AcademicYear;
use App\Models\AuditLog;
use App\Models\CashLedgerEntry;
use App\Models\Classroom;
use App\Models\Guardian;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\SchoolSetting;
use App\Models\Student;
use App\Models\User;
use App\Services\PaymentVerificationService;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;
use Mockery;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Spatie\Permission\Models\Role;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class FinanceAuditCoverageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        foreach (['admin', 'guru', 'kepala_sekolah', 'orang_tua'] as $role) {
            Role::findOrCreate($role, 'web');
        }
        Storage::fake('private');
    }

    public function test_batch_preview_is_read_only_and_generation_respects_enrollment_year_and_existing_period(): void
    {
        $admin = $this->user('admin');
        $year = AcademicYear::factory()->create(['is_active' => true]);
        $otherYear = AcademicYear::factory()->create();
        $class = Classroom::factory()->create(['academic_year_id' => $year->id]);
        $otherClass = Classroom::factory()->create(['academic_year_id' => $otherYear->id]);
        $students = Student::factory()->count(6)->create();
        foreach ($students as $index => $student) {
            $student->enrollments()->create([
                'classroom_id' => $index === 5 ? $otherClass->id : $class->id,
                'academic_year_id' => $index === 5 ? $otherYear->id : $year->id,
                'status' => match ($index) {
                    3 => 'pindah', 4 => 'selesai', default => 'aktif'
                },
            ]);
        }
        $students[2]->update(['status' => 'nonaktif']);
        $existing = Invoice::factory()->create(['student_id' => $students[1]->id, 'academic_year_id' => $otherYear->id]);
        SchoolSetting::create(['key' => 'default_spp_amount', 'value' => '275000']);
        $data = ['month' => 10, 'year' => 2026, 'academic_year_id' => $year->id, 'due_date' => '2026-10-17'];

        $this->actingAs($admin)->postJson(route('admin.invoices.preview'), $data)
            ->assertOk()->assertExactJson(['created' => 1, 'skipped' => 1]);
        $this->assertDatabaseCount('invoices', 1);
        $this->assertDatabaseCount('audit_logs', 0);
        $this->post(route('admin.invoices.generate.v2'), $data)->assertRedirect()->assertSessionHasNoErrors();
        $this->postJson(route('admin.invoices.preview'), $data)
            ->assertOk()->assertExactJson(['created' => 0, 'skipped' => 2]);
        $this->post(route('admin.invoices.generate.v2'), $data)->assertRedirect()->assertSessionHasNoErrors();
        $this->assertDatabaseCount('invoices', 2);
        $this->assertDatabaseHas('invoices', [
            'student_id' => $students[0]->id, 'academic_year_id' => $year->id,
            'amount' => 275000, 'status' => 'belum_bayar',
        ]);
        $this->assertSame('2026-10-17', Invoice::where('student_id', $students[0]->id)->sole()->due_date->toDateString());
        $this->assertSame($otherYear->id, $existing->fresh()->academic_year_id);
        $this->assertSame(1, AuditLog::where('action', 'invoices_generated')->count());
    }

    #[DataProvider('invalidBatchInputs')]
    public function test_batch_validation_rejects_invalid_period_money_and_dates(string $field, mixed $value): void
    {
        $year = AcademicYear::factory()->create();
        $data = ['month' => 10, 'year' => 2026, 'academic_year_id' => $year->id, 'amount' => 250000, 'due_date' => '2026-10-10'];
        $data[$field] = $value;
        $this->actingAs($this->user('admin'));
        foreach (['admin.invoices.preview', 'admin.invoices.generate.v2'] as $route) {
            $this->postJson(route($route), $data)->assertUnprocessable()->assertJsonValidationErrors($field);
        }
        $this->assertDatabaseCount('invoices', 0);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public static function invalidBatchInputs(): array
    {
        return [
            'invalid month' => ['month', 0],
            'invalid year' => ['year', 1999],
            'missing academic year' => ['academic_year_id', 999999],
            'negative rupiah' => ['amount', -1],
            'fractional rupiah' => ['amount', 250000.5],
            'invalid due date' => ['due_date', 'invalid-date'],
        ];
    }

    #[DataProvider('unuploadableStates')]
    public function test_submission_checks_current_database_state_even_with_stale_invoice(string $status): void
    {
        [$parent, $invoice] = $this->parentInvoice();
        Invoice::whereKey($invoice->id)->update(['status' => $status]);
        try {
            app(PaymentVerificationService::class)->submitProof($invoice, $parent, UploadedFile::fake()->image('proof.jpg'), ['amount_transferred' => 350000, 'transfer_date' => '2026-10-01']);
            $this->fail('An outdated invoice instance must not bypass the current status.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('invoice', $exception->errors());
        }
        $this->assertSame($status, $invoice->fresh()->status->value);
        $this->assertDatabaseCount('payments', 0);
        $this->assertDatabaseCount('audit_logs', 0);
        $this->assertSame([], Storage::disk('private')->allFiles());
    }

    public static function unuploadableStates(): array
    {
        return ['pending' => ['menunggu_verifikasi'], 'paid' => ['lunas']];
    }

    public function test_existing_pending_payment_blocks_upload_even_if_invoice_is_unpaid(): void
    {
        [$parent, $invoice] = $this->parentInvoice();
        Payment::factory()->create(['invoice_id' => $invoice->id, 'submitted_by' => $parent->id]);
        $this->actingAs($parent)->postJson(route('ortu.invoices.upload', $invoice), ['amount_transferred' => 350000, 'transfer_date' => '2026-10-01', 'sender_name' => 'Orang Tua', 'proof' => UploadedFile::fake()->image('proof.jpg')])
            ->assertUnprocessable()->assertJsonValidationErrors('invoice');
        $this->assertSame(InvoiceStatus::Unpaid, $invoice->fresh()->status);
        $this->assertDatabaseCount('payments', 1);
        $this->assertDatabaseCount('audit_logs', 0);
        $this->assertSame([], Storage::disk('private')->allFiles());
    }

    public function test_another_parent_cannot_submit_proof_for_unrelated_child(): void
    {
        [, $invoice] = $this->parentInvoice();
        [$otherParent] = $this->parentInvoice();
        $this->actingAs($otherParent)->post(route('ortu.invoices.upload', $invoice), ['amount_transferred' => 350000, 'transfer_date' => '2026-10-01', 'sender_name' => 'Orang Tua', 'proof' => UploadedFile::fake()->image('proof.jpg')])
            ->assertForbidden();
        $this->assertSame(InvoiceStatus::Unpaid, $invoice->fresh()->status);
        $this->assertDatabaseCount('payments', 0);
        $this->assertSame([], Storage::disk('private')->allFiles());
    }

    public function test_submission_rolls_back_payment_invoice_and_earlier_audit_if_status_audit_fails(): void
    {
        [$parent, $invoice] = $this->parentInvoice();
        $dispatcher = AuditLog::getEventDispatcher();
        AuditLog::setEventDispatcher(clone $dispatcher);
        $attemptedPaymentCount = null;
        $attemptedAuditCount = null;
        AuditLog::creating(function (AuditLog $audit) use (&$attemptedPaymentCount, &$attemptedAuditCount) {
            if ($audit->action === 'invoice_status_changed') {
                $attemptedPaymentCount = Payment::count();
                $attemptedAuditCount = AuditLog::count();
                throw new RuntimeException('Simulated status audit failure.');
            }
        });
        try {
            try {
                app(PaymentVerificationService::class)->submitProof($invoice, $parent, UploadedFile::fake()->image('proof.jpg'), ['amount_transferred' => 350000, 'transfer_date' => '2026-10-01']);
                $this->fail('Status audit storage failure must propagate.');
            } catch (RuntimeException $exception) {
                $this->assertSame('Simulated status audit failure.', $exception->getMessage());
            }
        } finally {
            AuditLog::setEventDispatcher($dispatcher);
        }
        $this->assertSame(1, $attemptedPaymentCount);
        $this->assertSame(1, $attemptedAuditCount);
        $this->assertSame(InvoiceStatus::Unpaid, $invoice->fresh()->status);
        $this->assertDatabaseCount('payments', 0);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_failed_private_disk_write_cannot_create_payment_without_proof(): void
    {
        [$parent, $invoice] = $this->parentInvoice();
        $disk = Mockery::mock(FilesystemAdapter::class);
        $disk->shouldReceive('putFileAs')->once()->andReturn(false);
        Storage::shouldReceive('disk')->once()->with('private')->andReturn($disk);
        $failure = null;
        try {
            app(PaymentVerificationService::class)->submitProof($invoice, $parent, UploadedFile::fake()->image('proof.jpg'), ['amount_transferred' => 350000, 'transfer_date' => '2026-10-01']);
        } catch (\Throwable $exception) {
            $failure = $exception;
        }
        $this->assertSame(InvoiceStatus::Unpaid, $invoice->fresh()->status, 'A failed proof write must leave the invoice unpaid.');
        $this->assertDatabaseCount('payments', 0);
        $this->assertDatabaseCount('audit_logs', 0);
        $this->assertNotNull($failure, 'Private storage failure must be reported to the caller.');
    }

    #[DataProvider('proofStorageFailures')]
    public function test_proof_storage_failure_returns_indonesian_validation_error(bool $throws): void
    {
        [$parent, $invoice] = $this->parentInvoice();
        $disk = Mockery::mock(FilesystemAdapter::class);
        $write = $disk->shouldReceive('putFileAs')->once();
        $throws ? $write->andThrow(new RuntimeException('Simulated private storage failure.')) : $write->andReturn(false);
        Storage::shouldReceive('disk')->once()->with('private')->andReturn($disk);

        $this->actingAs($parent)->postJson(route('ortu.invoices.upload', $invoice), ['amount_transferred' => 350000, 'transfer_date' => '2026-10-01', 'sender_name' => 'Orang Tua', 'proof' => UploadedFile::fake()->image('proof.jpg')])
            ->assertUnprocessable()
            ->assertJsonPath('errors.proof.0', 'Bukti pembayaran gagal disimpan. Silakan coba lagi.');
        $this->assertSame(InvoiceStatus::Unpaid, $invoice->fresh()->status);
        $this->assertDatabaseCount('payments', 0);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public static function proofStorageFailures(): array
    {
        return ['returns false' => [false], 'throws' => [true]];
    }

    #[DataProvider('proofCleanupFailures')]
    public function test_submission_cleanup_preserves_original_database_failure(bool $cleanupThrows): void
    {
        [$parent, $invoice] = $this->parentInvoice();
        $file = UploadedFile::fake()->image('proof.jpg');
        $path = 'payments/'.$file->hashName();
        $disk = Storage::disk('private');
        if ($cleanupThrows) {
            $failingDisk = Mockery::mock(FilesystemAdapter::class);
            $failingDisk->shouldReceive('putFileAs')->once()->andReturnUsing(fn (...$arguments) => $disk->putFileAs(...$arguments));
            $failingDisk->shouldReceive('delete')->once()->with($path)->andThrow(new RuntimeException('Simulated cleanup failure.'));
            Storage::set('private', $failingDisk);
        }
        $dispatcher = AuditLog::getEventDispatcher();
        AuditLog::setEventDispatcher(clone $dispatcher);
        AuditLog::creating(function (AuditLog $audit) {
            if ($audit->action === 'invoice_status_changed') {
                throw new RuntimeException('Simulated status audit failure.');
            }
        });

        try {
            try {
                app(PaymentVerificationService::class)->submitProof($invoice, $parent, $file, ['amount_transferred' => 350000, 'transfer_date' => '2026-10-01']);
                $this->fail('Database failure must propagate.');
            } catch (RuntimeException $exception) {
                $this->assertSame('Simulated status audit failure.', $exception->getMessage());
            }
        } finally {
            AuditLog::setEventDispatcher($dispatcher);
        }
        $cleanupThrows ? $disk->assertExists($path) : $disk->assertMissing($path);
        $this->assertSame(InvoiceStatus::Unpaid, $invoice->fresh()->status);
        $this->assertDatabaseCount('payments', 0);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public static function proofCleanupFailures(): array
    {
        return ['file removed' => [false], 'cleanup throws' => [true]];
    }

    #[DataProvider('studentSearchTerms')]
    public function test_student_name_and_nis_search_filter_invoice_queue_and_ledger_content(string $term): void
    {
        $matching = Student::factory()->create(['name' => 'Rani Safira', 'nis' => '2426-101']);
        $other = Student::factory()->create(['name' => 'Dimas Arjuna', 'nis' => '2426-202']);
        $matchingInvoice = Invoice::factory()->create(['student_id' => $matching->id, 'status' => InvoiceStatus::Pending]);
        $otherInvoice = Invoice::factory()->create(['student_id' => $other->id, 'status' => InvoiceStatus::Pending]);
        $matchingPayment = Payment::factory()->create(['invoice_id' => $matchingInvoice->id]);
        $otherPayment = Payment::factory()->create(['invoice_id' => $otherInvoice->id]);
        $admin = $this->user('admin');
        $query = '?'.http_build_query(['search' => $term]);

        $this->actingAs($admin)->get(route('admin.invoices').$query)
            ->assertInertia(fn (Assert $page) => $page->component('Admin/Invoices')
                ->has('invoices.data', 1)->where('invoices.data.0.id', $matchingInvoice->id)
                ->where('invoices.total', 1)->where('filters.search', $term));
        $this->get(route('admin.payments.index').$query)
            ->assertInertia(fn (Assert $page) => $page->component('Admin/PaymentVerification')
                ->has('payments.data', 1)->where('payments.data.0.id', $matchingPayment->id)
                ->where('selected.id', $matchingPayment->id)->where('payments.total', 1)
                ->where('filters.search', $term));
        $service = app(PaymentVerificationService::class);
        $service->approve($matchingPayment, $admin);
        $service->approve($otherPayment, $admin);
        $this->get(route('admin.cash-ledger').$query)
            ->assertInertia(fn (Assert $page) => $page->component('Admin/CashLedger')
                ->has('entries.data', 1)->where('entries.data.0.invoice_number', $matchingInvoice->invoice_number)
                ->where('entries.total', 1)->where('filters.search', $term));
    }

    public static function studentSearchTerms(): array
    {
        return ['student name' => ['Safira'], 'student NIS' => ['101']];
    }

    #[DataProvider('nonAdminRoles')]
    public function test_non_admins_cannot_mutate_invoice_amount_or_review_payments_over_http(string $role): void
    {
        [$parent, $invoice] = $this->parentInvoice(InvoiceStatus::Pending);
        $payment = Payment::factory()->create(['invoice_id' => $invoice->id, 'submitted_by' => $parent->id]);
        $actor = $role === 'orang_tua' ? $parent : $this->user($role);
        $this->actingAs($actor)->patch(route('admin.invoices.update', $invoice), ['net_amount' => 100000])->assertForbidden();
        $this->post(route('admin.payments.approve', $payment))->assertForbidden();
        $this->post(route('admin.payments.reject', $payment), ['rejection_reason' => 'Nominal berbeda'])->assertForbidden();
        $this->assertSame(InvoiceStatus::Pending, $invoice->fresh()->status);
        $this->assertSame(0, $invoice->fresh()->discount_amount);
        $this->assertSame(PaymentStatus::Pending, $payment->fresh()->status);
        $this->assertDatabaseCount('cash_ledger_entries', 0);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    #[DataProvider('nonAdminRoles')]
    public function test_rejection_service_independently_denies_non_admin_roles(string $role): void
    {
        [$parent, $invoice] = $this->parentInvoice(InvoiceStatus::Pending);
        $payment = Payment::factory()->create(['invoice_id' => $invoice->id, 'submitted_by' => $parent->id]);
        $actor = $role === 'orang_tua' ? $parent : $this->user($role);
        try {
            app(PaymentVerificationService::class)->reject($payment, $actor, 'Nominal berbeda');
            $this->fail('Non-admin must not reject payments through the service.');
        } catch (HttpException $exception) {
            $this->assertSame(403, $exception->getStatusCode());
        }
        $this->assertSame(InvoiceStatus::Pending, $invoice->fresh()->status);
        $this->assertSame(PaymentStatus::Pending, $payment->fresh()->status);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public static function nonAdminRoles(): array
    {
        return ['parent' => ['orang_tua'], 'teacher' => ['guru'], 'principal' => ['kepala_sekolah']];
    }

    #[DataProvider('settledReviewAttempts')]
    public function test_review_cannot_reopen_a_settled_payment_using_stale_instance(string $status, string $action): void
    {
        [$parent, $invoice] = $this->parentInvoice(InvoiceStatus::Pending);
        $payment = Payment::factory()->create(['invoice_id' => $invoice->id, 'submitted_by' => $parent->id]);
        Payment::whereKey($payment->id)->update(['status' => $status]);
        $service = app(PaymentVerificationService::class);
        $admin = $this->user('admin');
        try {
            $action === 'approve' ? $service->approve($payment, $admin) : $service->reject($payment, $admin, 'Nominal berbeda');
            $this->fail('An outdated payment instance must not bypass its settled status.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('payment', $exception->errors());
        }
        $this->assertSame($status, $payment->fresh()->status->value);
        $this->assertSame(InvoiceStatus::Pending, $invoice->fresh()->status);
        $this->assertDatabaseCount('cash_ledger_entries', 0);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public static function settledReviewAttempts(): array
    {
        return [
            'approved then approve' => ['disetujui', 'approve'],
            'approved then reject' => ['disetujui', 'reject'],
            'rejected then approve' => ['ditolak', 'approve'],
            'rejected then reject' => ['ditolak', 'reject'],
        ];
    }

    public function test_paid_invoice_remains_final_and_receipt_uses_net_invoice_amount(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 14)->setTime(10, 0));
        [$parent, $invoice] = $this->parentInvoice(InvoiceStatus::Pending);
        $invoice->update(['discount_amount' => 50000]);
        $payment = Payment::factory()->create(['invoice_id' => $invoice->id, 'submitted_by' => $parent->id, 'amount_transferred' => 310000]);
        $admin = $this->user('admin');
        $service = app(PaymentVerificationService::class);
        $service->approve($payment, $admin);
        $ledger = CashLedgerEntry::where('invoice_id', $invoice->id)->sole();
        $this->assertSame('KWT/2026/10/001', $ledger->receipt_number);
        $this->assertSame(300000, $ledger->amount_in);
        $this->assertSame($payment->id, $ledger->payment_id);
        $this->assertSame($admin->id, $invoice->fresh()->verified_by);
        $this->assertSame($admin->id, $payment->fresh()->reviewed_by);
        $this->assertTrue($invoice->fresh()->paid_at->equalTo(now()));
        $this->assertTrue($invoice->fresh()->verified_at->equalTo(now()));
        $this->assertTrue($payment->fresh()->reviewed_at->equalTo(now()));
        $snapshot = $invoice->fresh()->getAttributes();

        $this->actingAs($admin)->postJson(route('admin.payments.approve', $payment))->assertUnprocessable();
        $this->postJson(route('admin.payments.reject', $payment), ['rejection_reason' => 'Sudah selesai'])->assertUnprocessable();
        $this->patch(route('admin.invoices.update', $invoice), ['net_amount' => 100000])->assertForbidden();
        $this->actingAs($parent)->postJson(route('ortu.invoices.upload', $invoice), ['amount_transferred' => 350000, 'transfer_date' => '2026-10-01', 'sender_name' => 'Orang Tua', 'proof' => UploadedFile::fake()->image('proof.jpg')])->assertUnprocessable();
        $this->assertSame($snapshot, $invoice->fresh()->getAttributes());
        $this->assertDatabaseCount('cash_ledger_entries', 1);
        $this->assertDatabaseCount('payments', 1);
        $this->assertSame(1, AuditLog::where('action', 'payment_approved')->count());
        $this->assertSame([], Storage::disk('private')->allFiles());
    }

    #[DataProvider('reviewActions')]
    public function test_review_rolls_back_all_writes_when_final_audit_insert_fails(string $action): void
    {
        [$parent, $invoice] = $this->parentInvoice(InvoiceStatus::Pending);
        $payment = Payment::factory()->create(['invoice_id' => $invoice->id, 'submitted_by' => $parent->id]);
        $admin = $this->user('admin');
        $service = app(PaymentVerificationService::class);
        $dispatcher = AuditLog::getEventDispatcher();
        AuditLog::setEventDispatcher(clone $dispatcher);
        $attemptedStatus = null;
        $attemptedLedgerCount = null;
        AuditLog::creating(function () use ($invoice, &$attemptedStatus, &$attemptedLedgerCount) {
            $attemptedStatus = $invoice->fresh()->status->value;
            $attemptedLedgerCount = CashLedgerEntry::count();
            throw new RuntimeException('Simulated audit storage failure.');
        });
        try {
            try {
                $action === 'approve' ? $service->approve($payment, $admin) : $service->reject($payment, $admin, 'Bukti tidak terbaca');
                $this->fail('Audit storage failure must propagate.');
            } catch (RuntimeException $exception) {
                $this->assertSame('Simulated audit storage failure.', $exception->getMessage());
            }
        } finally {
            AuditLog::setEventDispatcher($dispatcher);
        }
        $this->assertSame($action === 'approve' ? 'lunas' : 'ditolak', $attemptedStatus);
        $this->assertSame($action === 'approve' ? 1 : 0, $attemptedLedgerCount);
        $this->assertSame(InvoiceStatus::Pending, $invoice->fresh()->status);
        $this->assertNull($invoice->fresh()->paid_at);
        $this->assertNull($invoice->fresh()->verified_by);
        $this->assertNull($invoice->fresh()->verified_at);
        $this->assertSame(PaymentStatus::Pending, $payment->fresh()->status);
        $this->assertNull($payment->fresh()->reviewed_by);
        $this->assertNull($payment->fresh()->reviewed_at);
        $this->assertNull($payment->fresh()->rejection_reason);
        $this->assertDatabaseCount('cash_ledger_entries', 0);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public static function reviewActions(): array
    {
        return ['approve' => ['approve'], 'reject' => ['reject']];
    }

    #[DataProvider('unreceiptedStates')]
    public function test_parent_cannot_download_receipt_for_pending_or_rejected_invoice(string $status): void
    {
        [$parent, $invoice] = $this->parentInvoice(InvoiceStatus::from($status));
        $this->actingAs($parent)->get(route('ortu.invoices.receipt', $invoice))->assertNotFound();
    }

    public static function unreceiptedStates(): array
    {
        return ['pending' => ['menunggu_verifikasi'], 'rejected' => ['ditolak']];
    }

    public function test_non_parent_roles_and_guests_cannot_download_parent_proof_or_receipt(): void
    {
        [$parent, $invoice] = $this->parentInvoice(InvoiceStatus::Pending);
        $payment = Payment::factory()->create(['invoice_id' => $invoice->id, 'submitted_by' => $parent->id, 'proof_path' => 'payments/proof.pdf']);
        Storage::disk('private')->put($payment->proof_path, '%PDF-1.4 proof');
        app(PaymentVerificationService::class)->approve($payment, $this->user('admin'));
        $proof = route('ortu.payments.proof', $payment);
        $receipt = route('ortu.invoices.receipt', $invoice);
        foreach (['admin', 'guru', 'kepala_sekolah'] as $role) {
            $this->actingAs($this->user($role))->get($proof)->assertForbidden();
            $this->get($proof.'?preview=1')->assertForbidden();
            $this->get($receipt)->assertForbidden();
            $this->post(route('ortu.invoices.upload', $invoice), ['amount_transferred' => 350000, 'transfer_date' => '2026-10-01', 'sender_name' => 'Orang Tua', 'proof' => UploadedFile::fake()->image('proof.jpg')])->assertForbidden();
        }
        $this->assertSame(InvoiceStatus::Paid, $invoice->fresh()->status);
        $this->assertDatabaseCount('payments', 1);
        $this->app['auth']->logout();
        $this->get($proof)->assertRedirect(route('login'));
        $this->get($receipt)->assertRedirect(route('login'));
    }

    public function test_verification_detail_keeps_transfer_amount_for_difference_label(): void
    {
        [$parent, $invoice] = $this->parentInvoice(InvoiceStatus::Pending);
        $payment = Payment::factory()->create([
            'invoice_id' => $invoice->id,
            'submitted_by' => $parent->id,
            'amount_transferred' => 300000,
            'transfer_date' => '2026-10-01',
            'proof_path' => 'payments/proof.jpg',
        ]);
        Storage::disk('private')->put($payment->proof_path, 'proof');

        $this->actingAs($this->user('admin'))->get(route('admin.payments.index', ['payment' => $payment->id]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('selected.amount_transferred', 300000)
                ->where('selected.invoice_amount', $invoice->net_amount)
                ->where('selected.transfer_date', '2026-10-01'));
    }

    private function user(string $role): User
    {
        $user = User::factory()->create(['must_change_password' => false]);
        $user->assignRole($role);

        return $user;
    }

    private function parentInvoice(InvoiceStatus $status = InvoiceStatus::Unpaid): array
    {
        $parent = $this->user('orang_tua');
        $guardian = Guardian::create(['user_id' => $parent->id, 'name' => $parent->name, 'phone' => '0812', 'address' => 'Alamat']);
        $student = Student::factory()->create();
        $guardian->students()->attach($student->id, ['relationship' => 'wali', 'is_primary' => true]);
        $invoice = Invoice::factory()->create(['student_id' => $student->id, 'status' => $status]);

        return [$parent, $invoice];
    }
}
