<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminAuditLogUiTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role): User
    {
        Role::findOrCreate($role, 'web');
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    public function test_audit_log_page_enforces_rbac(): void
    {
        $this->get('/admin/audit-log')->assertRedirect('/login');

        foreach (['guru', 'kepala_sekolah', 'orang_tua'] as $role) {
            $this->actingAs($this->user($role));
            $this->get('/admin/audit-log')->assertForbidden();
        }

        $admin = $this->user('admin');
        $this->actingAs($admin);
        $this->get('/admin/audit-log')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/AuditLog')
                ->has('logs.data')
                ->has('stats')
                ->has('availableActions')
                ->has('availableEntities')
            );
    }

    public function test_admin_can_view_and_filter_audit_logs(): void
    {
        $admin = $this->user('admin');
        $guru = $this->user('guru');

        AuditLog::create([
            'user_id' => $admin->id,
            'action' => 'payment_approved',
            'entity_type' => 'Invoice',
            'entity_id' => 101,
            'old_values' => ['status' => 'menunggu_verifikasi'],
            'new_values' => ['status' => 'lunas', 'receipt_number' => 'REC-001'],
            'created_at' => now(),
        ]);

        AuditLog::create([
            'user_id' => $guru->id,
            'action' => 'anecdotal_note_created',
            'entity_type' => 'AnecdotalNote',
            'entity_id' => 202,
            'old_values' => null,
            'new_values' => ['observed_behavior' => 'Siswa mandiri memakai sepatu'],
            'created_at' => now()->subDays(2),
        ]);

        AuditLog::create([
            'user_id' => $admin->id,
            'action' => 'invoice_amount_updated',
            'entity_type' => 'Invoice',
            'entity_id' => 102,
            'old_values' => ['net_amount' => 350000],
            'new_values' => ['net_amount' => 300000],
            'created_at' => now(),
        ]);

        $this->actingAs($admin);

        // All logs
        $response = $this->get('/admin/audit-log');
        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/AuditLog')
                ->has('logs.data', 3)
                ->where('stats.total', 3)
                ->where('stats.today', 2)
            );

        // Filter by action
        $responseAction = $this->get('/admin/audit-log?action=payment_approved');
        $responseAction->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/AuditLog')
                ->has('logs.data', 1)
                ->where('logs.data.0.action', 'payment_approved')
                ->where('logs.data.0.entity_id', 101)
                ->where('logs.data.0.old_values.status', 'menunggu_verifikasi')
                ->where('logs.data.0.new_values.status', 'lunas')
            );

        // Filter by search
        $responseSearch = $this->get('/admin/audit-log?search=anecdotal');
        $responseSearch->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/AuditLog')
                ->has('logs.data', 1)
                ->where('logs.data.0.action', 'anecdotal_note_created')
            );
    }
}
