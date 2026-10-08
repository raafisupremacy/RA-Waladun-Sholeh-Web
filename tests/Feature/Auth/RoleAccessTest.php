<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RoleAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        foreach (['admin', 'guru', 'kepala_sekolah', 'orang_tua'] as $role) {
            Role::findOrCreate($role, 'web');
        }
    }

    public function test_each_role_redirects_to_own_home(): void
    {
        foreach (['admin' => '/admin', 'guru' => '/guru', 'kepala_sekolah' => '/kepsek', 'orang_tua' => '/ortu'] as $role => $path) {
            $u = User::factory()->create(['must_change_password' => false]);
            $u->assignRole($role);
            $this->post('/login', ['email' => $u->email, 'password' => 'password'])->assertRedirect($path);
            $this->post('/logout');
        }
    }

    public function test_inactive_account_is_rejected(): void
    {
        $u = User::factory()->create(['is_active' => false]);
        $this->post('/login', ['email' => $u->email, 'password' => 'password'])->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_must_change_password_redirects_and_clears_flag(): void
    {
        $u = User::factory()->create(['must_change_password' => true]);
        $u->assignRole('admin');
        $this->actingAs($u)->get('/admin')->assertRedirect('/ganti-kata-sandi');
        $this->actingAs($u)->put('/ganti-kata-sandi', ['current_password' => 'password', 'password' => 'baru12345', 'password_confirmation' => 'baru12345'])->assertRedirect('/admin');
        $this->assertFalse($u->fresh()->must_change_password);
    }

    public function test_roles_cannot_open_another_role_area(): void
    {
        $u = User::factory()->create(['must_change_password' => false]);
        $u->assignRole('orang_tua');
        $this->actingAs($u)->get('/admin')->assertForbidden();
    }
}
