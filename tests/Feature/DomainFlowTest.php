<?php

namespace Tests\Feature;

use App\Enums\InvoiceStatus;
use App\Enums\PaymentStatus;
use App\Models\AcademicYear;
use App\Models\CashLedgerEntry;
use App\Models\Classroom;
use App\Models\Guardian;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Student;
use App\Models\User;
use App\Services\AccountProvisioningService;
use App\Services\PaymentVerificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class DomainFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        foreach (['admin', 'guru', 'kepala_sekolah', 'orang_tua'] as $r) {
            Role::findOrCreate($r, 'web');
        }
    }

    public function test_account_provisioning_uses_random_password_and_forces_change(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $result = app(AccountProvisioningService::class)->guardian(['name' => 'Wali', 'email' => 'wali@example.test', 'phone' => '0812', 'address' => 'Alamat'], $admin);
        $this->assertNotSame('password', $result['password']);
        $this->assertTrue($result['user']->fresh()->must_change_password);
        $this->assertTrue(Hash::check($result['password'], $result['user']->password));
    }

    public function test_payment_approval_is_atomic_and_creates_ledger(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $year = AcademicYear::create(['name' => '2026/2027', 'start_date' => '2026-07-01', 'end_date' => '2027-06-30', 'is_active' => true]);
        $class = Classroom::create(['academic_year_id' => $year->id, 'name' => 'A', 'age_range' => '4-5']);
        $student = Student::factory()->create();
        $student->enrollments()->create(['classroom_id' => $class->id, 'academic_year_id' => $year->id, 'status' => 'aktif']);
        $invoice = Invoice::factory()->create(['student_id' => $student->id, 'academic_year_id' => $year->id, 'status' => InvoiceStatus::Pending]);
        $payment = Payment::factory()->create(['invoice_id' => $invoice->id, 'status' => PaymentStatus::Pending, 'submitted_by' => $admin->id]);
        app(PaymentVerificationService::class)->approve($payment, $admin);
        $this->assertSame('lunas', $invoice->fresh()->status->value);
        $this->assertDatabaseHas('cash_ledger_entries', ['invoice_id' => $invoice->id, 'payment_id' => $payment->id]);
    }

    public function test_paid_payment_cannot_be_rejected(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $invoice = Invoice::factory()->create(['status' => InvoiceStatus::Paid]);
        $payment = Payment::factory()->create(['invoice_id' => $invoice->id, 'status' => PaymentStatus::Pending, 'submitted_by' => $admin->id]);
        $this->expectException(ValidationException::class);
        app(PaymentVerificationService::class)->reject($payment, $admin, 'Alasan');
    }

    public function test_parent_cannot_view_another_child_invoice(): void
    {
        $parent = User::factory()->create();
        $parent->assignRole('orang_tua');
        $guardian = Guardian::create(['user_id' => $parent->id, 'name' => 'Wali', 'phone' => '0812', 'address' => 'Alamat']);
        $own = Student::factory()->create();
        $other = Student::factory()->create();
        $guardian->students()->attach($own->id, ['relationship' => 'wali', 'is_primary' => true]);
        $invoice = Invoice::factory()->create(['student_id' => $other->id]);

        $this->actingAs($parent)->get(route('ortu.invoices.show', $invoice))->assertForbidden();
    }

    public function test_rejected_invoice_can_receive_a_new_proof(): void
    {
        Storage::fake('private');
        $parent = User::factory()->create();
        $parent->assignRole('orang_tua');
        $guardian = Guardian::create(['user_id' => $parent->id, 'name' => 'Wali', 'phone' => '0812', 'address' => 'Alamat']);
        $student = Student::factory()->create();
        $guardian->students()->attach($student->id, ['relationship' => 'wali', 'is_primary' => true]);
        $invoice = Invoice::factory()->create(['student_id' => $student->id, 'status' => InvoiceStatus::Rejected]);

        $payment = app(PaymentVerificationService::class)->submitProof($invoice, $parent, UploadedFile::fake()->create('bukti.pdf', 100, 'application/pdf'));

        $this->assertSame(PaymentStatus::Pending, $payment->status);
        Storage::disk('private')->assertExists($payment->proof_path);
    }

    private function billingFixture(): array
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $parent = User::factory()->create();
        $parent->assignRole('orang_tua');
        $guardian = Guardian::create(['user_id' => $parent->id, 'name' => 'Wali', 'phone' => '0812', 'address' => 'Alamat']);
        $student = Student::factory()->create();
        $guardian->students()->attach($student->id, ['relationship' => 'wali', 'is_primary' => true]);
        $invoice = Invoice::factory()->create(['student_id' => $student->id, 'status' => InvoiceStatus::Pending]);
        $payment = Payment::factory()->create(['invoice_id' => $invoice->id, 'submitted_by' => $parent->id, 'status' => PaymentStatus::Pending]);

        return compact('admin', 'parent', 'guardian', 'student', 'invoice', 'payment');
    }

    public function test_reject_transition_records_reason_and_audit(): void
    {
        $fixture = $this->billingFixture();
        app(PaymentVerificationService::class)->reject($fixture['payment'], $fixture['admin'], 'Nominal tidak sesuai.');

        $this->assertSame('ditolak', $fixture['invoice']->fresh()->status->value);
        $this->assertSame('ditolak', $fixture['payment']->fresh()->status->value);
        $this->assertSame('Nominal tidak sesuai.', $fixture['payment']->fresh()->rejection_reason);
        $this->assertDatabaseHas('audit_logs', ['action' => 'payment_rejected', 'entity_id' => $fixture['invoice']->id]);
    }

    public function test_only_unpaid_or_rejected_invoice_accepts_proof(): void
    {
        $fixture = $this->billingFixture();
        Storage::fake('private');
        $this->expectException(ValidationException::class);
        app(PaymentVerificationService::class)->submitProof($fixture['invoice'], $fixture['parent'], UploadedFile::fake()->create('bukti.pdf', 10, 'application/pdf'));
    }

    public function test_admin_can_review_only_payments_for_verification_state(): void
    {
        $fixture = $this->billingFixture();
        $fixture['invoice']->update(['status' => InvoiceStatus::Unpaid]);
        $service = app(PaymentVerificationService::class);
        foreach (['approve', 'reject'] as $action) {
            try {
                $action === 'approve' ? $service->approve($fixture['payment'], $fixture['admin']) : $service->reject($fixture['payment'], $fixture['admin'], 'Alasan');
                $this->fail("Unexpected {$action} transition from belum_bayar.");
            } catch (ValidationException) {
                $this->assertSame('belum_bayar', $fixture['invoice']->fresh()->status->value);
                $this->assertSame('menunggu', $fixture['payment']->fresh()->status->value);
            }
        }
    }

    public function test_parent_teacher_and_principal_cannot_approve_or_reject(): void
    {
        $fixture = $this->billingFixture();
        $service = app(PaymentVerificationService::class);
        foreach (['parent' => $fixture['parent'], 'guru' => User::factory()->create(), 'kepala_sekolah' => User::factory()->create()] as $role => $user) {
            if ($role !== 'parent') {
                $user->assignRole($role);
            }
            try {
                $service->approve($fixture['payment'], $user);
                $this->fail("{$role} unexpectedly approved payment");
            } catch (HttpException $exception) {
                $this->assertSame(403, $exception->getStatusCode());
            }
        }
    }

    public function test_approval_rolls_back_invoice_payment_and_ledger_on_constraint_failure(): void
    {
        $fixture = $this->billingFixture();
        $existingPayment = Payment::factory()->create(['invoice_id' => $fixture['invoice']->id, 'status' => PaymentStatus::Rejected]);
        CashLedgerEntry::create(['invoice_id' => $fixture['invoice']->id, 'payment_id' => $existingPayment->id, 'entry_date' => '2026-10-09', 'description' => 'Entri lama', 'amount_in' => 350000, 'receipt_number' => 'KWT/2026/10/001']);

        try {
            app(PaymentVerificationService::class)->approve($fixture['payment'], $fixture['admin']);
            $this->fail('Expected unique ledger constraint failure.');
        } catch (\Throwable) {
            $this->assertSame('menunggu_verifikasi', $fixture['invoice']->fresh()->status->value);
            $this->assertSame('menunggu', $fixture['payment']->fresh()->status->value);
            $this->assertSame(1, CashLedgerEntry::where('invoice_id', $fixture['invoice']->id)->count());
        }
    }

    public function test_payment_proof_is_private_and_scoped_to_guardian(): void
    {
        Storage::fake('private');
        $fixture = $this->billingFixture();
        $fixture['invoice']->update(['status' => InvoiceStatus::Unpaid]);
        $fixture['payment']->update(['status' => PaymentStatus::Rejected]);
        $payment = app(PaymentVerificationService::class)->submitProof($fixture['invoice'], $fixture['parent'], UploadedFile::fake()->create('bukti.pdf', 10, 'application/pdf'));
        $other = User::factory()->create();
        $other->assignRole('orang_tua');

        $this->actingAs($other)->get(route('ortu.payments.proof', $payment))->assertForbidden();
        $this->app['auth']->logout();
        $this->get(route('ortu.payments.proof', $payment))->assertRedirect(route('login'));
        $this->actingAs($fixture['parent'])->get(route('ortu.payments.proof', $payment))->assertDownload();
    }
}
