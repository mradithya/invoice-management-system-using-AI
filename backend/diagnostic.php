<?php
/**
 * Diagnostic Script
 * Check database and system status
 */

require_once 'backend/config/database.php';

$database = new Database();
$db = $database->getConnection();

$status = [
    'database_connected' => false,
    'database_name' => 'invoice_management_ai',
    'users_table_exists' => false,
    'admin_user_exists' => false,
    'error' => null
];

try {
    if (!$db) {
        $status['error'] = 'Database connection failed';
        echo json_encode($status);
        exit;
    }

    $status['database_connected'] = true;

    // Check if users table exists
    $query = "SHOW TABLES LIKE 'users'";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $status['users_table_exists'] = $stmt->rowCount() > 0;

    // Check if admin user exists
    $query = "SELECT id, full_name, email, role FROM users WHERE email = 'admin@example.com' LIMIT 1";
    $stmt = $db->prepare($query);
    $stmt->execute();
    if ($stmt->rowCount() > 0) {
        $row = $stmt->fetch();
        $status['admin_user_exists'] = true;
        $status['admin_user'] = $row;
    }

    // Get total users count
    $query = "SELECT COUNT(*) as count FROM users";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $row = $stmt->fetch();
    $status['total_users'] = $row['count'];

} catch (Exception $e) {
    $status['error'] = $e->getMessage();
}

header('Content-Type: application/json');
echo json_encode($status, JSON_PRETTY_PRINT);
