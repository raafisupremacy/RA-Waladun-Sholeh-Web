<?php

namespace Tests\Feature;

use App\Enums\InvoiceStatus;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\Guardian;
use App\Models\Invoice;
use App\Models\Student;
use App\Models\User;
use App\Services\PaymentVerificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ParentInvoiceUiTest extends TestCase
{
    use RefreshDatabase;

    public function test_parent_invoice_list_is_scoped_to_active_child_and_year(): void
    {
        [$parent, $student, $year] = $this->fixture();
        Invoice::factory()->create(['student_id' => $student->id, 'academic_year_id' => $year->id]);
        $other = Student::factory()->create();
        Invoice::factory()->create(['student_id' => $other->id, 'academic_year_id' => $year->id]);

        $this->actingAs($parent)->get('/ortu/tagihan')->assertInertia(fn (Assert $page) => $page
            ->component('Ortu/Invoices')
            ->where('activeStudentId', $student->id)
            ->has('invoices.data', 1)
            ->where('invoices.data.0.student.id', $student->id)
            ->has('academicYears'));
    }

    public function test_parent_upload_rejects_invalid_file_and_duplicate_pending_upload(): void
    {
        Storage::fake('private');
        [$parent, $student] = $this->fixture();
        $invoice = Invoice::factory()->create(['student_id' => $student->id, 'status' => InvoiceStatus::Unpaid]);
        $this->actingAs($parent)->post(route('ortu.invoices.upload', $invoice), ['proof' => UploadedFile::fake()->create('proof.txt', 10, 'text/plain')])->assertSessionHasErrors('proof');
        $this->actingAs($parent)->post(route('ortu.invoices.upload', $invoice), ['proof' => UploadedFile::fake()->create('large.pdf', 5121, 'application/pdf')])->assertSessionHasErrors('proof');
        $this->actingAs($parent)->post(route('ortu.invoices.upload', $invoice), ['proof' => UploadedFile::fake()->image('proof.jpg')])->assertRedirect();
        $this->assertSame('menunggu_verifikasi', $invoice->fresh()->status->value);
        $this->actingAs($parent)->post(route('ortu.invoices.upload', $invoice), ['proof' => UploadedFile::fake()->image('proof-2.jpg')])->assertSessionHasErrors('invoice');
    }

    public function test_payment_proof_upload_boundary_and_storage_security(): void
    {
        Storage::fake('private');
        Storage::fake('public');
        [$parent, $student] = $this->fixture();
        $invoice = Invoice::factory()->create(['student_id' => $student->id, 'status' => InvoiceStatus::Unpaid]);

        // 1. Berkas 5.120 KB (maksimal diizinkan) diterima dan valid PDF
        $validPdf = UploadedFile::fake()->create('valid_receipt.pdf', 5120, 'application/pdf');
        $this->actingAs($parent)->post(route('ortu.invoices.upload', $invoice), ['proof' => $validPdf])
            ->assertRedirect()
            ->assertSessionHasNoErrors();
        $this->assertSame(InvoiceStatus::Pending, $invoice->fresh()->status);

        // 2. Bukti disimpan dengan nama acak pada disk privat, bukan publik
        $latestPayment = $invoice->payments()->latest('id')->first();
        $this->assertNotNull($latestPayment);
        $storedPath = $latestPayment->proof_path;
        $this->assertStringStartsWith('payments/', $storedPath);
        $this->assertNotSame('payments/valid_receipt.pdf', $storedPath, 'Nama berkas harus diacak oleh sistem');
        Storage::disk('private')->assertExists($storedPath);
        Storage::disk('public')->assertMissing($storedPath);

        // 3. Berkas 5.121 KB ditolak validasi batas ukuran
        $invoice2 = Invoice::factory()->create([
            'student_id' => $student->id,
            'period_month' => 11,
            'period_year' => 2026,
            'status' => InvoiceStatus::Unpaid,
        ]);
        $oversizedPdf = UploadedFile::fake()->create('oversized.pdf', 5121, 'application/pdf');
        $this->actingAs($parent)->post(route('ortu.invoices.upload', $invoice2), ['proof' => $oversizedPdf])
            ->assertSessionHasErrors('proof');
        $this->assertSame(InvoiceStatus::Unpaid, $invoice2->fresh()->status);

        // 4. Ekstensi terlarang ditolak
        foreach (['exploit.exe', 'shell.php', 'script.sh', 'vector.svg', 'document.docx'] as $badName) {
            $badFile = UploadedFile::fake()->create($badName, 100);
            $this->actingAs($parent)->post(route('ortu.invoices.upload', $invoice2), ['proof' => $badFile])
                ->assertSessionHasErrors('proof');
        }

        // 5. Gambar JPG/PNG valid diterima
        $validJpg = UploadedFile::fake()->image('bukti_transfer.jpg');
        $this->actingAs($parent)->post(route('ortu.invoices.upload', $invoice2), ['proof' => $validJpg])
            ->assertRedirect()
            ->assertSessionHasNoErrors();
        $this->assertSame(InvoiceStatus::Pending, $invoice2->fresh()->status);
    }

    public function test_rejected_invoice_can_be_uploaded_again_and_receipt_is_scoped(): void
    {
        Storage::fake('private');
        [$parent, $student] = $this->fixture();
        $invoice = Invoice::factory()->create(['student_id' => $student->id, 'status' => InvoiceStatus::Rejected]);
        $this->actingAs($parent)->post(route('ortu.invoices.upload', $invoice), ['proof' => UploadedFile::fake()->image('proof.jpg')])->assertRedirect();
        $this->assertSame('menunggu_verifikasi', $invoice->fresh()->status->value);
        $other = User::factory()->create(['must_change_password' => false]);
        $other->assignRole('orang_tua');
        $this->actingAs($other)->get(route('ortu.invoices.receipt', $invoice))->assertForbidden();
    }

    public function test_non_parent_roles_are_denied_parent_invoice_routes(): void
    {
        [$parent, $student] = $this->fixture();
        $invoice = Invoice::factory()->create(['student_id' => $student->id]);
        foreach (['admin', 'guru', 'kepala_sekolah'] as $role) {
            $user = User::factory()->create(['must_change_password' => false]);
            $user->assignRole($role);
            $this->actingAs($user)->get('/ortu/tagihan')->assertForbidden();
            $this->actingAs($user)->get(route('ortu.invoices.show', $invoice))->assertForbidden();
        }
    }

    public function test_all_detail_states_private_proof_receipt_and_payload(): void
    {
        Storage::fake('private');
        [$parent, $student, $year] = $this->fixture();
        $classroom = Classroom::factory()->create(['academic_year_id' => $year->id]);
        $student->enrollments()->create(['classroom_id' => $classroom->id, 'academic_year_id' => $year->id, 'status' => 'aktif']);
        $invoice = Invoice::factory()->create(['student_id' => $student->id, 'academic_year_id' => $year->id]);
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $service = app(PaymentVerificationService::class);
        $other = User::factory()->create();
        $other->assignRole('orang_tua');

        $this->actingAs($parent)->get('/ortu/tagihan?student_id='.Student::factory()->create()->id)->assertForbidden();
        $this->withSession(['active_student_id' => 999999])->get('/ortu/tagihan')
            ->assertInertia(fn (Assert $page) => $page->where('activeStudentId', $student->id));
        $this->get(route('ortu.invoices.receipt', $invoice))->assertNotFound();

        foreach (['belum_bayar', 'menunggu_verifikasi', 'ditolak', 'lunas'] as $state) {
            if ($state === 'menunggu_verifikasi') {
                $payment = $service->submitProof($invoice, $parent, UploadedFile::fake()->image('proof.png'), ['note' => 'Bukti pembayaran SPP']);
            } elseif ($state === 'ditolak') {
                $service->reject($payment, $admin, 'Bukti tidak terbaca');
            } elseif ($state === 'lunas') {
                $payment = $service->submitProof($invoice, $parent, UploadedFile::fake()->image('proof.png'));
                $service->approve($payment, $admin);
            }
            $response = $this->actingAs($parent)->get(route('ortu.invoices.show', $invoice));
            $response->assertInertia(fn (Assert $page) => $page
                ->where('invoice.status', $state)
                ->where('invoice.student.classroom', $classroom->name)
                ->missing('invoice.verified_by')
                ->missing('invoice.latest_payment.proof_path')
                ->missing('invoice.latest_payment.submitted_by'));
            if (getenv('SHOTS_PARENT_FIXTURES') === '1') {
                $directory = storage_path('app/shots/fixtures');
                if (! is_dir($directory)) {
                    mkdir($directory, 0755, true);
                }
                file_put_contents($directory.'/'.$state.'.html', $response->getContent());
            }
            if ($state === 'ditolak') {
                $this->get('/ortu/tagihan')->assertInertia(fn (Assert $page) => $page->where('invoices.data.0.rejection_reason', 'Bukti tidak terbaca'));
            }
        }
        $this->actingAs($parent)->get(route('ortu.invoices.receipt', $invoice))->assertDownload();
        $this->get(route('ortu.payments.proof', $payment).'?preview=1')->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->actingAs($other)->get(route('ortu.invoices.show', $invoice))->assertForbidden();
        $this->get(route('ortu.payments.proof', $payment).'?preview=1')->assertForbidden();
        $this->get(route('ortu.invoices.receipt', $invoice))->assertForbidden();
        $this->app['auth']->logout();
        $this->get(route('ortu.payments.proof', $payment))->assertRedirect(route('login'));
    }

    private function fixture(): array
    {
        foreach (['admin', 'guru', 'kepala_sekolah', 'orang_tua'] as $role) {
            Role::findOrCreate($role, 'web');
        }
        $parent = User::factory()->create(['must_change_password' => false]);
        $parent->assignRole('orang_tua');
        $guardian = Guardian::create(['user_id' => $parent->id, 'name' => 'Wali', 'phone' => '0812', 'address' => 'Alamat']);
        $year = AcademicYear::factory()->create(['is_active' => true]);
        $student = Student::factory()->create();
        $guardian->students()->attach($student->id, ['relationship' => 'wali', 'is_primary' => true]);

        return [$parent, $student, $year];
    }
}
