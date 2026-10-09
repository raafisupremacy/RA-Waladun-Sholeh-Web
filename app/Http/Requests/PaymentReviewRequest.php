<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PaymentReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('admin');
    }

    public function rules(): array
    {
        return $this->routeIs('admin.payments.reject') ? ['rejection_reason' => 'required|string|max:2000'] : ['payment' => 'nullable|integer|min:1'];
    }

    public function messages(): array
    {
        return ['rejection_reason.required' => 'Alasan penolakan wajib diisi.', 'rejection_reason.max' => 'Alasan maksimal 2.000 karakter.'];
    }
}
