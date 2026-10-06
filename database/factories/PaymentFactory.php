<?php

namespace Database\Factories;

use App\Models\Invoice;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class PaymentFactory extends Factory
{
    public function definition(): array
    {
        return ['invoice_id' => Invoice::factory(), 'submitted_by' => User::factory(), 'proof_path' => 'proofs/demo.pdf', 'amount_transferred' => 350000, 'transfer_date' => '2026-10-01', 'sender_name' => $this->faker->name(), 'status' => 'menunggu'];
    }
}
