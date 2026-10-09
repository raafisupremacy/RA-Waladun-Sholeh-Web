<?php

namespace App\Services;

use App\Models\Announcement;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AnnouncementService
{
    public function save(array $data, User $actor, ?Announcement $announcement = null): Announcement
    {
        return DB::transaction(function () use ($data, $actor, $announcement) {
            $values = [
                'created_by' => $announcement?->created_by ?? $actor->id,
                'classroom_id' => $data['classroom_id'] ?? null,
                'title' => $data['title'],
                'body' => $data['body'],
                'is_pinned' => (bool) ($data['is_pinned'] ?? false),
                'status' => $data['status'],
                'published_at' => $data['status'] === 'terbit' ? ($announcement?->published_at ?? now()) : null,
                'expires_at' => ! empty($data['expires_at']) ? Carbon::parse($data['expires_at']) : null,
            ];

            $announcement ??= new Announcement;
            $announcement->fill($values);
            $announcement->save();

            AuditLog::create([
                'user_id' => $actor->id,
                'action' => $announcement->wasRecentlyCreated ? 'announcement_created' : 'announcement_updated',
                'entity_type' => Announcement::class,
                'entity_id' => $announcement->id,
                'new_values' => $values,
            ]);

            return $announcement;
        });
    }
}
