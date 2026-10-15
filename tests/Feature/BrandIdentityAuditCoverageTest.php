<?php

namespace Tests\Feature;

use Symfony\Component\Process\Process;
use Tests\TestCase;

class BrandIdentityAuditCoverageTest extends TestCase
{
    private function render(string $component): string
    {
        $process = new Process(['node', base_path('tests/fixtures/render-brand.mjs'), $component, json_encode([
            'appName' => 'Aplikasi audit dinamis', 'schoolName' => 'Sekolah dari shared props',
            'brandAssets' => ['logo' => true, 'schoolPhoto' => true],
        ], JSON_THROW_ON_ERROR)], base_path());
        $process->mustRun();

        return $process->getOutput();
    }

    public function test_navigation_wordmark_uses_app_name_even_when_school_name_is_available(): void
    {
        $markup = $this->render('BrandMark');
        $this->assertStringContainsString('Aplikasi audit dinamis', strip_tags($markup));
    }

    public function test_guest_photo_caption_uses_dynamic_school_name_without_hardcoded_identity(): void
    {
        $markup = $this->render('GuestLayout');
        preg_match('/<aside\b[^>]*>(.*?)<\/aside>/s', $markup, $matches);
        $this->assertStringContainsString('Sekolah dari shared props', strip_tags($matches[1]));
    }

    public function test_public_footer_uses_shared_school_name_without_exposing_banking_settings(): void
    {
        $markup = $this->render('GuestLayout');
        preg_match('/<footer\b[^>]*>(.*?)<\/footer>/s', $markup, $matches);
        $this->assertSame('© '.date('Y').' Sekolah dari shared props · Sistem Informasi dan Keuangan Sekolah', html_entity_decode(strip_tags($matches[1]), ENT_QUOTES, 'UTF-8'));
    }
}
