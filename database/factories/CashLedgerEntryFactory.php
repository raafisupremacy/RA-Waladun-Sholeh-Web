<?php

namespace Database\Factories;

use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Factories\Factory;

class CashLedgerEntryFactory extends Factory
{
    public function definition(): array
    {
        return ['invoice_id' => Invoice::factory(), 'payment_id' => Payment::factory(), 'entry_date' => '2026-10-01', 'description' => 'Pembayaran SPP', 'amount_in' => 350000, 'receipt_number' => 'KWT/2026/10/'.$this->faker->unique()->numerify('###')];
    }
}
