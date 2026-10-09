<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', AuditLog::class);

        $query = AuditLog::with('user:id,name,email');

        if ($action = $request->string('action')->trim()->value()) {
            $query->where('action', $action);
        }

        if ($entityType = $request->string('entity_type')->trim()->value()) {
            $query->where('entity_type', $entityType);
        }

        if ($startDate = $request->input('start_date')) {
            $query->whereDate('created_at', '>=', $startDate);
        }

        if ($endDate = $request->input('end_date')) {
            $query->whereDate('created_at', '<=', $endDate);
        }

        if ($search = $request->string('search')->trim()->value()) {
            $query->where(function ($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                    ->orWhere('entity_type', 'like', "%{$search}%")
                    ->orWhere('entity_id', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($u) use ($search) {
                        $u->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        $logs = (clone $query)->orderByDesc('id')->paginate(15)->withQueryString()->through(fn ($log) => [
            'id' => $log->id,
            'user' => $log->user ? [
                'id' => $log->user->id,
                'name' => $log->user->name,
                'email' => $log->user->email,
            ] : null,
            'action' => $log->action,
            'entity_type' => class_basename($log->entity_type),
            'entity_id' => $log->entity_id,
            'old_values' => $log->old_values,
            'new_values' => $log->new_values,
            'created_at' => $log->created_at?->toIso8601String(),
        ]);

        $availableActions = AuditLog::select('action')->distinct()->orderBy('action')->pluck('action');
        $availableEntities = AuditLog::select('entity_type')->distinct()->orderBy('entity_type')->pluck('entity_type')
            ->map(fn ($e) => class_basename($e))->unique()->values();

        $todayCount = AuditLog::whereDate('created_at', today())->count();
        $totalCount = AuditLog::count();

        return Inertia::render('Admin/AuditLog', [
            'logs' => $logs,
            'filters' => $request->only('search', 'action', 'entity_type', 'start_date', 'end_date'),
            'availableActions' => $availableActions,
            'availableEntities' => $availableEntities,
            'stats' => [
                'total' => $totalCount,
                'today' => $todayCount,
            ],
        ]);
    }
}
