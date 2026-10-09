<?php

namespace App\Http\Requests;

use App\Enums\InvoiceStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class InvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('admin');
    }

    public function rules(): array
    {
        if ($this->routeIs('admin.invoices.update')) {
            return ['net_amount' => ['required', 'integer', 'min:0', 'max:'.$this->route('invoice')->amount]];
        }
        $required = $this->isMethod('post') ? 'required' : 'nullable';

        return [
            'month' => [$required, 'integer', 'between:1,12'],
            'year' => [$required, 'integer', 'between:2000,2100'],
            'academic_year_id' => [$required, 'integer', 'exists:academic_years,id'],
            'amount' => ['nullable', 'integer', 'min:0'],
            'due_date' => ['nullable', 'date'],
            'classroom_id' => ['nullable', 'integer', 'exists:classrooms,id'],
            'status' => ['nullable', Rule::enum(InvoiceStatus::class)],
        ];
    }

    public function messages(): array
    {
        return ['required' => ':attribute wajib diisi.', 'integer' => ':attribute harus berupa bilangan bulat.', 'net_amount.max' => 'Nominal tidak boleh melebihi nominal awal tagihan.', 'min' => ':attribute tidak boleh negatif.', 'exists' => ':attribute tidak tersedia.', 'date_format' => 'Gunakan tanggal yang valid.', 'between' => ':attribute di luar rentang yang diperbolehkan.'];
    }

    public function attributes(): array
    {
        return ['month' => 'Bulan', 'year' => 'Tahun', 'academic_year_id' => 'Tahun ajaran', 'amount' => 'Nominal', 'net_amount' => 'Nominal akhir'];
    }
}
