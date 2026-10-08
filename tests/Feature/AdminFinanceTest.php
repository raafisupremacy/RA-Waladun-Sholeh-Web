<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\CashLedgerEntry;
use App\Models\Classroom;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminFinanceTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role): User
    {
        Role::findOrCreate($role, 'web');
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    public function test_finance_pages_and_endpoints_enforce_roles(): void
    {
        foreach (['admin', 'guru', 'kepala_sekolah', 'orang_tua'] as $role) {
            $this->actingAs($this->user($role));
            foreach (['/admin/tagihan', '/admin/verifikasi'] as $path) {
                $this->get($path)->assertStatus($role === 'admin' ? 200 : 403);
            }
            $this->get('/admin/buku-kas')->assertStatus(in_array($role, ['admin', 'kepala_sekolah']) ? 200 : 403);
            if ($role !== 'admin') {
                $this->postJson('/admin/tagihan/preview', [])->assertForbidden();
                $this->post('/admin/tagihan/generate', [])->assertForbidden();
            }
        }
    }

    public function test_preview_matches_generation_and_repeated_generation_skips_existing_invoices(): void
    {
        $this->actingAs($this->user('admin'));
        $year = AcademicYear::factory()->create();
        $class = Classroom::create(['academic_year_id' => $year->id, 'name' => 'A', 'age_range' => '4-5']);
        $students = Student::factory()->count(3)->create();
        foreach ($students as $student) {
            $student->enrollments()->create(['classroom_id' => $class->id, 'academic_year_id' => $year->id, 'status' => 'aktif']);
        }
        $students[2]->update(['status' => 'nonaktif']);
        Invoice::factory()->create(['student_id' => $students[0]->id, 'academic_year_id' => $year->id]);
        $data = ['month' => 10, 'year' => 2026, 'academic_year_id' => $year->id, 'amount' => 280000, 'due_date' => '2026-10-10'];
        $this->postJson('/admin/tagihan/preview', $data)->assertOk()->assertJson(['created' => 1, 'skipped' => 1]);
        $this->post('/admin/tagihan/generate', $data)->assertRedirect();
        $this->post('/admin/tagihan/generate', $data)->assertRedirect();
        $this->assertDatabaseCount('invoices', 2);
        $this->assertDatabaseHas('invoices', ['student_id' => $students[1]->id, 'amount' => 280000]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'invoices_generated']);
    }

    public function test_invoice_discount_is_audited_and_paid_invoice_cannot_change(): void
    {
        $this->actingAs($this->user('admin'));
        $invoice = Invoice::factory()->create();
        $this->patch('/admin/tagihan/'.$invoice->id.'/nominal', ['net_amount' => 300000])->assertRedirect();
        $this->assertSame(50000, (int) $invoice->fresh()->discount_amount);
        $this->assertDatabaseHas('audit_logs', ['action' => 'invoice_amount_updated', 'entity_id' => $invoice->id]);
        $this->patchJson('/admin/tagihan/'.$invoice->id.'/nominal', ['net_amount' => 400000])->assertUnprocessable();
        $invoice->update(['status' => 'lunas']);
        $this->patch('/admin/tagihan/'.$invoice->id.'/nominal', ['net_amount' => 200000])->assertForbidden();
        $this->assertSame(50000, (int) $invoice->fresh()->discount_amount);
    }

    public function test_invoice_filters_and_overdue_days_are_server_calculated(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 15)->startOfDay());
        $invoice = Invoice::factory()->create();
        Invoice::factory()->create(['status' => 'lunas']);
        $this->actingAs($this->user('admin'))->get('/admin/tagihan?month=10&year=2026&status=belum_bayar')
            ->assertInertia(fn (Assert $page) => $page->component('Admin/Invoices')->has('invoices.data', 1)->where('invoices.data.0.id', $invoice->id)->where('invoices.data.0.overdue_days', 5));
    }

    public function test_verification_actions_update_queue_and_require_rejection_reason(): void
    {
        $admin = $this->user('admin');
        $invoice = Invoice::factory()->create(['status' => 'menunggu_verifikasi', 'discount_amount' => 50000]);
        $payment = Payment::factory()->create(['invoice_id' => $invoice->id]);
        $this->actingAs($admin)->get('/admin/verifikasi?payment='.$payment->id)
            ->assertInertia(fn (Assert $page) => $page->has('selected')->where('selected.invoice_amount', 300000)->missing('selected.proof_path')->missing('selected.submitted_by'));
        $this->post('/admin/verifikasi/'.$payment->id.'/tolak', ['rejection_reason' => ' '])->assertSessionHasErrors('rejection_reason');
        $this->post('/admin/verifikasi/'.$payment->id.'/setujui')->assertRedirect('/admin/verifikasi');
        $this->assertSame('lunas', $invoice->fresh()->status->value);
        $this->assertDatabaseHas('cash_ledger_entries', ['invoice_id' => $invoice->id, 'amount_in' => 300000]);
        $this->get('/admin/verifikasi')->assertInertia(fn (Assert $page) => $page->has('payments.data', 0)->where('selected', null));
    }

    public function test_ledger_totals_balance_and_exports_respect_date_range(): void
    {
        foreach (['2026-09-30' => 100000, '2026-10-01' => 200000, '2026-10-02' => 300000, '2026-11-01' => 400000] as $date => $amount) {
            $payment = Payment::factory()->create();
            CashLedgerEntry::create(['invoice_id' => $payment->invoice_id, 'payment_id' => $payment->id, 'entry_date' => $date, 'description' => 'SPP '.$date, 'amount_in' => $amount, 'receipt_number' => 'KWT/'.$payment->id]);
        }
        $this->actingAs($this->user('admin'))->get('/admin/buku-kas?start_date=2026-10-01&end_date=2026-10-31')
            ->assertInertia(fn (Assert $page) => $page->where('summary.total', 500000)->where('summary.count', 2)->where('summary.opening_balance', 100000)->where('entries.data.0.running_balance', 600000)->where('entries.data.1.running_balance', 300000));
        $this->get('/admin/buku-kas/pdf?start_date=2026-10-01&end_date=2026-10-31')->assertOk()->assertDownload('buku-kas.pdf');
        $this->get('/admin/buku-kas/excel?start_date=2026-10-01&end_date=2026-10-31')->assertOk()->assertDownload('buku-kas.xlsx');
        $this->getJson('/admin/buku-kas?start_date=2026-10-31&end_date=2026-10-01')->assertUnprocessable();
    }

    public function test_admin_proof_route_is_private_and_policy_protected(): void
    {
        Storage::fake('private');
        Storage::disk('private')->put('proofs/proof.pdf', '%PDF-1.4 sample');
        $payment = Payment::factory()->create(['proof_path' => 'proofs/proof.pdf']);
        $url = '/admin/verifikasi/'.$payment->id.'/bukti';
        $this->get($url)->assertRedirect('/login');
        foreach (['guru', 'kepala_sekolah', 'orang_tua'] as $role) {
            $this->actingAs($this->user($role))->get($url)->assertForbidden();
        }
        $this->actingAs($this->user('admin'))->get($url)->assertOk()->assertHeader('Content-Type', 'application/pdf');
    }
}
