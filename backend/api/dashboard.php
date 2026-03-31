<?php
/**
 * Dashboard API - AI Financial Analytics
 * GET /api/dashboard/stats - Get dashboard statistics with AI insights
 * GET /api/dashboard/clients/risky - Get risky clients
 * GET /api/dashboard/clients/top - Get top performing clients
 */

require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../models/FinancialAnalyzer.php';
require_once '../utils/Auth.php';
require_once '../utils/Response.php';

// Require authentication
Auth::requireAuth();

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    Response::error('Method not allowed', 405);
}

// Get database connection
$database = new Database();
$db = $database->getConnection();

$actor_user_id = Auth::getUserId();
$is_admin = Auth::getUserRole() === 'admin';
$scope_user_id = $is_admin ? intval($_GET['user_id'] ?? 0) : $actor_user_id;

if ($is_admin && $scope_user_id <= 0) {
    Response::validationError(['user_id is required for admin']);
}

$analyzer = new FinancialAnalyzer($db, $scope_user_id);

// Parse request URI
$request_uri = $_SERVER['REQUEST_URI'];

if (strpos($request_uri, '/dashboard/stats') !== false || strpos($request_uri, '/dashboard.php/stats') !== false) {
    // Get dashboard statistics
    $stats = $analyzer->getDashboardStats();
    Response::success($stats);

} elseif (strpos($request_uri, '/dashboard/clients/risky') !== false || strpos($request_uri, '/dashboard.php/clients/risky') !== false) {
    // Get risky clients
    $clients = $analyzer->identifyRiskyClients();
    Response::success($clients);

} elseif (strpos($request_uri, '/dashboard/clients/top') !== false || strpos($request_uri, '/dashboard.php/clients/top') !== false) {
    // Get top performing clients (optionally filtered by quarter)
    $quarter = $_GET['quarter'] ?? null;
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 10;

    if ($quarter) {
        if (strtolower($quarter) === 'this' || strtolower($quarter) === 'this-quarter') {
            $year = date('Y');
            $q = intval(ceil(date('n') / 3));
            $quarter = $year . '-Q' . $q;
        }

        $clients = $analyzer->identifyTopClientsByQuarter($quarter, $limit);
    } else {
        $clients = $analyzer->identifyTopClients();
    }

    Response::success($clients);

} elseif (strpos($request_uri, '/dashboard/invoices/overdue') !== false || strpos($request_uri, '/dashboard.php/invoices/overdue') !== false) {
    // Get overdue invoices by threshold days
    $threshold_days = isset($_GET['threshold_days']) ? intval($_GET['threshold_days']) : 0;
    $invoices = $analyzer->getOverdueInvoicesByThreshold($threshold_days);
    Response::success($invoices);

} else {
    Response::notFound('Endpoint not found');
}
