<?php

namespace App\Http\Requests;

use App\Models\AcademicYear;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MasterDataRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('admin');
    }

    public function rules(): array
    {
        $class = Rule::exists('classrooms', 'id')->where('academic_year_id', AcademicYear::where('is_active', true)->value('id'));

        return match ($this->route()->getName()) {
            'admin.students.store' => [
                'name' => 'required|string|max:255', 'nis' => 'required|string|max:255|unique:students,nis',
                'birth_date' => 'required|date|before_or_equal:today', 'gender' => 'required|in:L,P',
                'entry_year' => 'required|integer|between:1900,2100', 'classroom_id' => ['required', 'integer', $class],
                'existing_guardian' => 'required|boolean', 'guardian_id' => [Rule::excludeIf(! $this->boolean('existing_guardian')), 'required', 'integer', 'exists:guardians,id'],
                'relationship' => 'required|in:ayah,ibu,wali',
                'guardian_name' => [Rule::excludeIf($this->boolean('existing_guardian')), 'required', 'string', 'max:255'],
                'guardian_email' => [Rule::excludeIf($this->boolean('existing_guardian')), 'required', 'email', 'max:255', 'unique:users,email'],
                'guardian_phone' => [Rule::excludeIf($this->boolean('existing_guardian')), 'required', 'string', 'max:50'],
                'guardian_address' => [Rule::excludeIf($this->boolean('existing_guardian')), 'required', 'string', 'max:2000'],
            ],
            'admin.teachers.store' => [
                'name' => 'required|string|max:255', 'email' => 'required|email|max:255|unique:users,email',
                'nip' => 'required|string|max:255|unique:teachers,nip', 'phone' => 'required|string|max:50',
                'classroom_id' => ['nullable', 'integer', $class],
            ],
            'admin.guardians.store' => [
                'name' => 'required|string|max:255', 'email' => 'required|email|max:255|unique:users,email',
                'phone' => 'required|string|max:50', 'address' => 'required|string|max:2000',
            ],
            'admin.classrooms.move' => [
                'student_ids' => 'required|array|min:1|max:200',
                'student_ids.*' => 'required|integer|distinct|exists:students,id',
            ],
            'admin.students.move' => ['classroom_id' => ['required', 'integer', $class]],
            'admin.students.update' => [
                'name' => 'required|string|max:255',
                'nis' => ['required', 'string', 'max:255', Rule::unique('students', 'nis')->ignore($this->route('student'))],
                'birth_date' => 'nullable|date|before_or_equal:today',
                'gender' => 'required|in:L,P',
                'status' => 'required|in:aktif,nonaktif',
                'classroom_id' => ['nullable', 'integer', $class],
            ],
            'admin.classrooms.teacher' => ['teacher_id' => ['required', 'integer', Rule::exists('teachers', 'id')]],
            'admin.classrooms.store' => [
                'name' => 'required|string|max:255',
                'age_range' => 'required|string|max:50',
                'teacher_id' => ['nullable', 'integer', Rule::exists('teachers', 'id')],
            ],
            default => [],
        };
    }

    public function messages(): array
    {
        return [
            'required' => ':attribute wajib diisi.', 'email' => 'Masukkan email yang valid.',
            'email.unique' => 'Email sudah dipakai akun lain.', 'guardian_email.unique' => 'Email sudah dipakai akun lain.',
            'nis.unique' => 'NIS sudah dipakai siswa lain.', 'nip.unique' => 'NIP sudah dipakai guru lain.',
            'exists' => 'Pilihan :attribute tidak tersedia.', 'max' => ':attribute melebihi batas yang diizinkan.',
            'date' => 'Masukkan tanggal yang valid.', 'before_or_equal' => 'Tanggal lahir tidak boleh di masa depan.',
            'in' => 'Pilihan :attribute tidak valid.', 'integer' => ':attribute harus berupa angka.',
        ];
    }

    public function attributes(): array
    {
        return [
            'name' => 'Nama', 'nis' => 'NIS', 'nip' => 'NIP', 'birth_date' => 'Tanggal lahir',
            'gender' => 'Jenis kelamin', 'entry_year' => 'Tahun masuk', 'classroom_id' => 'Kelas',
            'guardian_id' => 'Orang tua', 'relationship' => 'Hubungan', 'guardian_name' => 'Nama orang tua',
            'guardian_email' => 'Email', 'guardian_phone' => 'Telepon', 'guardian_address' => 'Alamat',
            'phone' => 'Telepon', 'address' => 'Alamat', 'teacher_id' => 'Guru', 'student_ids' => 'Siswa',
            'age_range' => 'Rentang usia',
        ];
    }
}
