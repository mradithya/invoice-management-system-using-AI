<?php
/**
 * Database Initialization Script
 * Run this once to set up the database and create the admin user
 */

require_once 'backend/config/database.php';
require_once 'backend/models/User.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed'
    ]);
    exit;
}

// Check if admin user exists
$query = "SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1";
$stmt = $db->prepare($query);
$stmt->execute();

if ($stmt->rowCount() > 0) {
    echo json_encode([
        'success' => true,
        'message' => 'Admin user already exists'
    ]);
    exit;
}

// Create admin user
$user = new User($db);
$user->full_name = 'Admin User';
$user->email = 'admin@example.com';
$user->password = 'password123'; // Default password
$user->role = 'admin';

if ($user->register()) {
    // Set role to admin
    $updateQuery = "UPDATE users SET role = 'admin' WHERE email = 'admin@example.com'";
    $updateStmt = $db->prepare($updateQuery);
    $updateStmt->execute();

    echo json_encode([
        'success' => true,
        'message' => 'Admin user created successfully',
        'credentials' => [
            'email' => 'admin@example.com',
            'password' => 'password123'
        ]
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to create admin user'
    ]);
}
