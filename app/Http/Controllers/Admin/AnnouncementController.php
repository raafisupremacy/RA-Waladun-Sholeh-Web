<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AnnouncementStatus;
use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Announcement;
use App\Models\Classroom;
use App\Services\AnnouncementService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AnnouncementController extends Controller
{
    public function index(Request $request)
    {
        $query = Announcement::with('classroom')->latest();
        if ($request->filled('status') && in_array($request->status, ['draf', 'terbit'], true)) {
            $query->where('status', $request->status);
        }
        if ($request->filled('search')) {
            $search = $request->string('search')->trim()->value();
            $query->where(fn ($q) => $q->where('title', 'like', "%{$search}%")->orWhere('body', 'like', "%{$search}%"));
        }

        $allCount = Announcement::count();
        $publishedCount = Announcement::where('status', 'terbit')->count();
        $draftCount = Announcement::where('status', 'draf')->count();

        return Inertia::render('Admin/Announcements/Index', [
            'announcements' => $query->paginate(12)->withQueryString()->through(fn (Announcement $item) => $this->present($item)),
            'filters' => $request->only('status', 'search'),
            'counts' => [
                'all' => $allCount,
                'terbit' => $publishedCount,
                'draf' => $draftCount,
            ],
        ]);
    }

    public function create()
    {
        return $this->form();
    }

    public function edit(Announcement $announcement)
    {
        return $this->form($announcement);
    }

    public function store(Request $request, AnnouncementService $service)
    {
        $service->save($this->validated($request), $request->user());

        return redirect()->route('admin.announcements')->with('success', 'Pengumuman berhasil disimpan.');
    }

    public function update(Request $request, Announcement $announcement, AnnouncementService $service)
    {
        $service->save($this->validated($request), $request->user(), $announcement);

        return redirect()->route('admin.announcements')->with('success', 'Pengumuman berhasil diperbarui.');
    }

    public function destroy(Announcement $announcement)
    {
        $announcement->delete();

        return back()->with('success', 'Pengumuman berhasil dihapus.');
    }

    private function form(?Announcement $announcement = null)
    {
        $yearId = AcademicYear::where('is_active', true)->value('id');

        return Inertia::render('Admin/Announcements/Form', [
            'announcement' => $announcement ? $this->present($announcement) : null,
            'classrooms' => Classroom::when($yearId, fn ($q) => $q->where('academic_year_id', $yearId))->orderBy('name')->get(['id', 'name']),
        ]);
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'body' => ['required', 'string'],
            'target' => ['required', 'in:all,classroom'],
            'classroom_id' => ['required_if:target,classroom', 'nullable', 'integer', 'exists:classrooms,id'],
            'is_pinned' => ['nullable', 'boolean'],
            'status' => ['required', 'in:draf,terbit'],
            'expires_at' => ['nullable', 'date'],
        ]);
        $data['classroom_id'] = $data['target'] === 'classroom' ? ($data['classroom_id'] ?? null) : null;
        unset($data['target']);

        return $data;
    }

    private function present(Announcement $announcement): array
    {
        return [
            'id' => $announcement->id,
            'title' => $announcement->title,
            'body' => $announcement->body,
            'status' => $announcement->status instanceof AnnouncementStatus ? $announcement->status->value : $announcement->status,
            'is_pinned' => (bool) $announcement->is_pinned,
            'classroom_id' => $announcement->classroom_id,
            'classroom_name' => $announcement->classroom?->name,
            'published_at' => $announcement->published_at?->toDateString(),
            'expires_at' => $announcement->expires_at?->toDateTimeString(),
        ];
    }
}
