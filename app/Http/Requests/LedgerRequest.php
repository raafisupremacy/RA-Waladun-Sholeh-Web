<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LedgerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasAnyRole(['admin', 'kepala_sekolah']);
    }

    public function rules(): array
    {
        return ['start_date' => ['nullable', 'date_format:Y-m-d'], 'end_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:start_date']];
    }

    public function messages(): array
    {
        return ['end_date.after_or_equal' => 'Tanggal akhir harus sama atau setelah tanggal mulai.', '*.date_format' => 'Gunakan tanggal yang valid.'];
    }
}
