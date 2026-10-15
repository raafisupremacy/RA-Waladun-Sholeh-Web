<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StorageExposureTest extends TestCase
{
    use RefreshDatabase;

    public function test_local_disk_is_not_served_and_private_files_are_not_public(): void
    {
        $this->assertFalse((bool) config('filesystems.disks.local.serve'));
        $this->assertArrayNotHasKey('url', config('filesystems.disks.private'));
        $this->assertArrayNotHasKey('serve', config('filesystems.disks.private'));
        $this->assertFalse(is_link(public_path('storage')));
        $this->assertFileDoesNotExist(public_path('storage/payments/secret.pdf'));

        Storage::disk('private')->put('payments/secret.pdf', 'private-proof');
        $this->get('/storage/payments/secret.pdf')->assertNotFound();
        $this->withHeaders(['X-Requested-With' => 'XMLHttpRequest'])->get('/storage/payments/secret.pdf')->assertNotFound();
    }
}
