<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\MasterDataRequest;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\Guardian;
use App\Models\Student;
use App\Services\AccountProvisioningService;
use App\Services\InvoiceService;
use App\Services\MasterDataService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AdminDataController extends Controller
{
    public function students(Request $request)
    {
        $this->authorize('viewAny', Student::class);
        $activeYearId = AcademicYear::where('is_active', true)->value('id');
        $query = Student::with(['guardians', 'enrollments' => fn ($q) => $q->where('academic_year_id', $activeYearId)->with('classroom')]);
        if ($search = $request->string('search')->trim()->value()) {
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('nis', 'like', "%{$search}%"));
        }
        if (in_array($request->status, ['aktif', 'nonaktif'])) {
            $query->where('status', $request->status);
        }
        if ($request->filled('classroom_id')) {
            $query->whereHas('enrollments', fn ($q) => $q->where('classroom_id', $request->integer('classroom_id'))->where('academic_year_id', $activeYearId));
        }

        return Inertia::render('Admin/Students', [
            'students' => $query->orderBy('name')->paginate(12)->withQueryString()->through(fn ($student) => [
                'id' => $student->id, 'name' => $student->name, 'nis' => $student->nis,
                'status' => $student->status->value,
                'classroom' => $student->enrollments->first()?->classroom?->name,
                'classroom_id' => $student->enrollments->first()?->classroom_id,
                'birth_date' => $student->birth_date?->format('d M Y'),
                'birth_date_raw' => $student->birth_date?->format('Y-m-d'),
                'gender' => $student->gender?->value ?? (string) $student->gender,
                'guardians' => $student->guardians->map(fn ($g) => [
                    'name' => $g->name,
                    'phone' => $g->phone,
                    'relationship' => $g->pivot?->relationship ? ucfirst($g->pivot->relationship) : 'Wali',
                ])->all(),
            ]),
            'classrooms' => Classroom::where('academic_year_id', $activeYearId)->orderBy('name')->get(['id', 'name'])->toArray(),
            'filters' => $request->only('search', 'status', 'classroom_id'),
            'academicYear' => AcademicYear::where('is_active', true)->first()?->name,
            'totalRegistered' => Student::count(),
        ]);
    }

    public function createStudent()
    {
        $this->authorize('create', Student::class);

        return Inertia::render('Admin/CreateStudent', [
            'classrooms' => Classroom::whereHas('academicYear', fn ($q) => $q->where('is_active', true))->get(['id', 'name', 'age_range'])->toArray(),
            'guardians' => Guardian::with('user:id,email')->orderBy('name')->get()->map(fn ($g) => ['id' => $g->id, 'name' => $g->name, 'email' => $g->user->email])->all(),
            'academicYear' => AcademicYear::where('is_active', true)->first()?->only('id', 'name'),
        ]);
    }

    public function storeStudent(MasterDataRequest $r, AccountProvisioningService $s)
    {
        $s->student($r->validated(), $r->user());

        return redirect()->route('admin.students')->with('success', 'Siswa berhasil ditambahkan.');
    }

    public function updateStudent(MasterDataRequest $r, Student $student)
    {
        $this->authorize('update', $student);
        $data = $r->validated();

        $student->update([
            'name' => $data['name'],
            'nis' => $data['nis'],
            'birth_date' => ! empty($data['birth_date']) ? $data['birth_date'] : $student->birth_date,
            'gender' => $data['gender'],
            'status' => $data['status'],
        ]);

        if (array_key_exists('classroom_id', $data)) {
            $activeYearId = AcademicYear::where('is_active', true)->value('id');
            $enrollment = $student->enrollments()->where('academic_year_id', $activeYearId)->first();
            if ($enrollment) {
                if ($data['classroom_id']) {
                    $enrollment->update(['classroom_id' => $data['classroom_id']]);
                }
            } elseif ($data['classroom_id']) {
                $student->enrollments()->create([
                    'classroom_id' => $data['classroom_id'],
                    'academic_year_id' => $activeYearId,
                    'status' => 'aktif',
                ]);
            }
        }

        return back()->with('success', "Data {$student->name} berhasil diperbarui.");
    }

    public function moveStudent(MasterDataRequest $r, Student $student, MasterDataService $service)
    {
        $data = $r->validated();
        $service->moveStudent($student, Classroom::findOrFail($data['classroom_id']), $r->user());

        return back();
    }

    public function storeTeacher(MasterDataRequest $r, AccountProvisioningService $s)
    {
        $s->teacher($r->validated(), $r->user());

        return redirect()->route('admin.teachers')->with('success', 'Guru berhasil ditambahkan.');
    }

    public function storeGuardian(MasterDataRequest $r, AccountProvisioningService $s)
    {
        $s->guardian($r->validated(), $r->user());

        return redirect()->route('admin.guardians');
    }

    public function deactivateStudent(Student $student, Request $request, MasterDataService $service)
    {
        $this->authorize('update', $student);
        $service->deactivate($student, $request->user());

        return back()->with('success', 'Siswa dinonaktifkan. Riwayat tetap tersimpan.');
    }

    public function generateInvoices(Request $r, InvoiceService $service)
    {
        $data = $r->validate(['month' => 'required|integer|between:1,12', 'year' => 'required|integer', 'academic_year_id' => 'required|exists:academic_years,id', 'amount' => 'nullable|integer|min:0', 'due_date' => 'nullable|date']);
        $result = $service->generate($data['month'], $data['year'], $data['academic_year_id'], $data['amount'] ?? null, $data['due_date'] ?? null);

        return back()->with($result);
    }
}
