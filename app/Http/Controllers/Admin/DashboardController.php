<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $r, ReportService $reports)
    {
        return Inertia::render('Admin/Dashboard', $reports->adminDashboard());
    }
}
