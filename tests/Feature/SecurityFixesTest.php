<?php

namespace Tests\Feature;

use App\Enums\AssessmentLevel;
use App\Enums\InvoiceStatus;
use App\Enums\JournalAspect;
use App\Enums\PaymentStatus;
use App\Models\AcademicYear;
use App\Models\AnecdotalNote;
use App\Models\Classroom;
use App\Models\Guardian;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\SchoolSetting;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use App\Services\AnecdotalNoteService;
use App\Services\JournalService;
use App\Services\PaymentVerificationService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class SecurityFixesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        foreach (['admin', 'guru', 'kepala_sekolah', 'orang_tua'] as $role) {
            Role::findOrCreate($role, 'web');
        }
    }

    public function test_submitting_proof_moves_invoice_and_rejects_duplicate_pending_upload(): void
    {
        Storage::fake('private');
        [$parent, $invoice] = $this->parentInvoice(InvoiceStatus::Unpaid);
        $service = app(PaymentVerificationService::class);

        $first = $service->submitProof($invoice, $parent, UploadedFile::fake()->create('first.pdf', 10, 'application/pdf'));
        $this->assertSame(InvoiceStatus::Pending, $invoice->fresh()->status);
        $this->assertSame(PaymentStatus::Pending, $first->status);
        $this->expectException(ValidationException::class);
        $service->submitProof($invoice->fresh(), $parent, UploadedFile::fake()->create('second.pdf', 10, 'application/pdf'));
    }

    public function test_reject_requires_a_reason_and_paid_invoice_is_final(): void
    {
        [$admin, $invoice] = $this->adminInvoice(InvoiceStatus::Pending);
        $payment = Payment::factory()->create(['invoice_id' => $invoice->id, 'submitted_by' => $admin->id, 'status' => PaymentStatus::Pending]);
        $service = app(PaymentVerificationService::class);

        try {
            $service->reject($payment, $admin, '   ');
            $this->fail('Blank rejection reason must be rejected.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('reason', $exception->errors());
        }

        $service->approve($payment, $admin);
        $this->assertSame(InvoiceStatus::Paid, $invoice->fresh()->status);
        $this->expectException(ValidationException::class);
        $service->reject($payment->fresh(), $admin, 'Terlambat');
    }

    public function test_finalize_and_anecdote_update_require_current_homeroom(): void
    {
        [$user, $teacher, $class, $student] = $this->teacherFixture();
        $journal = app(JournalService::class)->saveDraft([
            'student_id' => $student->id,
            'classroom_id' => $class->id,
            'journal_date' => '2026-10-01',
        ], $teacher);
        $replacementUser = User::factory()->create();
        $replacementUser->assignRole('guru');
        $replacement = Teacher::create(['user_id' => $replacementUser->id, 'name' => 'Pengganti', 'nip' => 'NIP-MOVED', 'phone' => '0813']);
        $class->update(['homeroom_teacher_id' => $replacement->id]);

        $assessments = array_fill_keys(array_map(fn ($case) => $case->value, JournalAspect::cases()), AssessmentLevel::BSH->value);
        $this->expectException(HttpException::class);
        app(JournalService::class)->finalize($journal, ['assessments' => $assessments], $teacher);
    }

    public function test_replaced_teacher_cannot_update_anecdote(): void
    {
        [$user, $teacher, $class, $student] = $this->teacherFixture();
        $note = AnecdotalNote::create(['student_id' => $student->id, 'teacher_id' => $teacher->id, 'noted_at' => '2026-10-01 09:00:00', 'observed_behavior' => 'awal', 'interpretation' => 'awal', 'follow_up' => 'awal']);
        $replacementUser = User::factory()->create();
        $replacementUser->assignRole('guru');
        $replacement = Teacher::create(['user_id' => $replacementUser->id, 'name' => 'Pengganti', 'nip' => 'NIP-MOVED-2', 'phone' => '0813']);
        $class->update(['homeroom_teacher_id' => $replacement->id]);

        $this->expectException(HttpException::class);
        app(AnecdotalNoteService::class)->update($note, ['observed_behavior' => 'x'], $user);
    }

    public function test_draft_is_idempotent_and_invalid_assessment_is_rejected(): void
    {
        [, $teacher, $class, $student] = $this->teacherFixture();
        $service = app(JournalService::class);
        $data = ['student_id' => $student->id, 'classroom_id' => $class->id, 'journal_date' => '2026-10-02', 'assessments' => []];
        $first = $service->saveDraft($data, $teacher);
        $second = $service->saveDraft($data + ['activity_summary' => 'autosave'], $teacher);
        $this->assertSame($first->id, $second->id);
        $this->assertSame(1, $student->dailyJournals()->count());

        $this->expectException(ValidationException::class);
        $service->saveDraft(array_merge($data, ['assessments' => ['kognitif' => 'INVALID']]), $teacher);
    }

    public function test_first_password_change_requires_temporary_password(): void
    {
        $user = User::factory()->create(['must_change_password' => true]);
        $user->assignRole('admin');
        $this->actingAs($user)->put('/ganti-kata-sandi', ['password' => 'baru12345', 'password_confirmation' => 'baru12345'])
            ->assertSessionHasErrors('current_password');
        $this->actingAs($user)->put('/ganti-kata-sandi', ['current_password' => 'password', 'password' => 'baru12345', 'password_confirmation' => 'baru12345'])
            ->assertRedirect('/admin');
    }

    public function test_root_redirects_and_profile_route_is_removed(): void
    {
        $this->get('/')->assertRedirect(route('login'));
        $user = User::factory()->create(['must_change_password' => false]);
        $user->assignRole('admin');
        $this->actingAs($user)->get('/')->assertRedirect('/admin');
        $this->get('/profile')->assertNotFound();
        $this->get('/styleguide')->assertNotFound();
    }

    public function test_password_change_middleware_covers_root_and_dashboard(): void
    {
        $user = User::factory()->create(['must_change_password' => true]);
        $user->assignRole('admin');
        $this->actingAs($user)->get('/')->assertRedirect(route('password.change'));
        $this->actingAs($user)->get('/dashboard')->assertRedirect(route('password.change'));
    }

    public function test_disabled_authenticated_session_is_logged_out(): void
    {
        $user = User::factory()->create(['must_change_password' => false, 'is_active' => true]);
        $user->assignRole('admin');
        $this->actingAs($user);
        $user->update(['is_active' => false]);
        $this->get('/dashboard')->assertRedirect(route('login'));
        $this->assertGuest();
    }

    public function test_shared_settings_and_invoice_props_do_not_expose_sensitive_fields(): void
    {
        SchoolSetting::create(['key' => 'school_name', 'value' => 'TK Tunas Harapan']);
        SchoolSetting::create(['key' => 'bank_account_number', 'value' => '123']);
        $this->get('/login')->assertInertia(fn (Assert $page) => $page
            ->where('schoolName', 'TK Tunas Harapan')
            ->where('schoolSettings', [])
        );

        [$parent, $invoice] = $this->parentInvoice(InvoiceStatus::Unpaid);
        $payment = Payment::factory()->create(['invoice_id' => $invoice->id, 'submitted_by' => $parent->id]);
        $this->actingAs($parent)->get(route('ortu.invoices.show', $invoice))->assertInertia(fn (Assert $page) => $page
            ->missing('invoice.payments.0.proof_path')
            ->missing('invoice.payments.0.submitted_by')
        );
        $admin = User::factory()->create(['must_change_password' => false]);
        $admin->assignRole('admin');
        $this->actingAs($admin)->get('/admin')->assertInertia(fn (Assert $page) => $page->where('schoolSettings.bank_account_number', '123'));
    }

    public function test_production_seed_does_not_use_demo_passwords(): void
    {
        config(['app.env' => 'production']);
        app(DatabaseSeeder::class)->run();
        $admin = User::where('email', 'admin@skms.test')->firstOrFail();

        $this->assertTrue($admin->must_change_password);
        $this->assertFalse(Hash::check('password', $admin->password));
    }

    private function parentInvoice(InvoiceStatus $status): array
    {
        $parent = User::factory()->create(['must_change_password' => false]);
        $parent->assignRole('orang_tua');
        $guardian = Guardian::create(['user_id' => $parent->id, 'name' => 'Wali', 'phone' => '0812', 'address' => 'Alamat']);
        $student = Student::factory()->create();
        $guardian->students()->attach($student->id, ['relationship' => 'wali', 'is_primary' => true]);
        $invoice = Invoice::factory()->create(['student_id' => $student->id, 'status' => $status]);

        return [$parent, $invoice];
    }

    private function adminInvoice(InvoiceStatus $status): array
    {
        $admin = User::factory()->create(['must_change_password' => false]);
        $admin->assignRole('admin');
        $invoice = Invoice::factory()->create(['status' => $status]);

        return [$admin, $invoice];
    }

    private function teacherFixture(): array
    {
        $year = AcademicYear::create(['name' => '2026/2027', 'start_date' => '2026-07-01', 'end_date' => '2027-06-30', 'is_active' => true]);
        $user = User::factory()->create(['must_change_password' => false]);
        $user->assignRole('guru');
        $teacher = Teacher::create(['user_id' => $user->id, 'name' => 'Guru', 'nip' => 'NIP-TEST', 'phone' => '0812']);
        $class = Classroom::create(['academic_year_id' => $year->id, 'homeroom_teacher_id' => $teacher->id, 'name' => 'A', 'age_range' => '4-5']);
        $student = Student::factory()->create();
        $student->enrollments()->create(['classroom_id' => $class->id, 'academic_year_id' => $year->id, 'status' => 'aktif']);

        return [$user, $teacher, $class, $student];
    }
}
