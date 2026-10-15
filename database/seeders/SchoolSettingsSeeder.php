<?php

namespace Database\Seeders;

use App\Models\SchoolSetting;
use Illuminate\Database\Seeder;

class SchoolSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            'school_name' => 'RA Waladun Sholeh',
            'school_address' => 'Jl. Mawar A No.5 13, RT.13/RW.6, Tugu Utara, Kec. Koja, Jkt Utara, Daerah Khusus Ibukota Jakarta 14230',
            'school_phone' => '0831123456789',
            'bank_name' => 'BRI',
            'bank_account_number' => '1234567890',
            'bank_account_holder' => 'RA Waladun Sholeh',
            'default_spp_amount' => '350000',
            'semester_1_start' => '2026-07-15', 'semester_1_end' => '2026-12-20',
            'semester_2_start' => '2027-01-05', 'semester_2_end' => '2027-06-20',
            'school_holidays' => '[]',
        ];

        foreach ($settings as $key => $value) {
            SchoolSetting::updateOrCreate(['key' => $key], ['value' => $value]);
        }
    }
}
