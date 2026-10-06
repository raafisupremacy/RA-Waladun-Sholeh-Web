<?php

namespace Database\Factories;

use App\Models\AcademicYear;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

class InvoiceFactory extends Factory
{
    public function definition(): array
    {
        return ['invoice_number' => 'INV-'.$this->faker->unique()->numerify('####-##-###'), 'student_id' => Student::factory(), 'academic_year_id' => AcademicYear::factory(), 'period_month' => 10, 'period_year' => 2026, 'amount' => 350000, 'discount_amount' => 0, 'due_date' => '2026-10-10', 'status' => 'belum_bayar'];
    }
}
