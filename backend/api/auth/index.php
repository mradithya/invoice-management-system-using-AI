<?php
/**
 * Authentication API Endpoints
 * /api/auth/register.php - Register new user
 * /api/auth/login.php - User login
 * /api/auth/logout.php - User logout
 * /api/auth/check.php - Check authentication status
 */

require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../models/User.php';
require_once '../../utils/Auth.php';
require_once '../../utils/Response.php';
require_once '../../utils/AuditLogger.php';

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

// Get database connection
$database = new Database();
$db = $database->getConnection();

if (!$db) {
    Response::serverError('Database connection failed. Please start MySQL in XAMPP.');
}

// Handle different endpoints based on URI
$request_uri = $_SERVER['REQUEST_URI'];
$action = $_GET['action'] ?? null;

if ($action === 'register' || strpos($request_uri, '/api/auth/register') !== false) {
    // Registration endpoint
    if ($method !== 'POST') {
        Response::error('Method not allowed', 405);
    }

    $data = json_decode(file_get_contents("php://input"));

    if (empty($data->full_name) || empty($data->email) || empty($data->password)) {
        Response::validationError(['full_name', 'email', 'password are required']);
    }

    $user = new User($db);
    $user->full_name = $data->full_name;
    $user->email = $data->email;
    $user->password = $data->password;
    $user->role = 'staff';

    // Check if email already exists
    if ($user->emailExists()) {
        Response::error('Email already exists', 409);
    }

    if ($user->register()) {
        AuditLogger::log($db, $user->id, 'register', 'user', strval($user->id), [
            'email' => $user->email,
            'role' => $user->role
        ]);

        Response::success([
            'user_id' => $user->id,
            'full_name' => $user->full_name,
            'email' => $user->email,
            'role' => $user->role
        ], 'Registration successful', 201);
    } else {
        Response::serverError('Failed to register user');
    }

} elseif ($action === 'login' || strpos($request_uri, '/api/auth/login') !== false) {
    // Login endpoint
    if ($method !== 'POST') {
        Response::error('Method not allowed', 405);
    }

    $data = json_decode(file_get_contents("php://input"));

    if (empty($data->email) || empty($data->password)) {
        Response::validationError(['email and password are required']);
    }

    $user = new User($db);
    $user->email = $data->email;
    $user->password = $data->password;

    if ($user->login()) {
        Auth::login($user->id, [
            'email' => $user->email,
            'name' => $user->full_name,
            'role' => $user->role,
            'profile_photo' => $user->profile_photo
        ]);

        AuditLogger::log($db, $user->id, 'login', 'session', strval($user->id));

        Response::success([
            'user_id' => $user->id,
            'full_name' => $user->full_name,
            'email' => $user->email,
            'role' => $user->role,
            'profile_photo' => $user->profile_photo
        ], 'Login successful');
    } else {
        Response::error('Invalid email or password', 401);
    }

} elseif ($action === 'logout' || strpos($request_uri, '/api/auth/logout') !== false) {
    // Logout endpoint
    $current_user_id = Auth::getUserId();
    AuditLogger::log($db, $current_user_id, 'logout', 'session', $current_user_id ? strval($current_user_id) : null);
    Auth::logout();
    Response::success([], 'Logout successful');

} elseif ($action === 'check' || strpos($request_uri, '/api/auth/check') !== false) {
    // Check authentication status
    if (Auth::isLoggedIn()) {
        $current_user_id = Auth::getUserId();

        $user = new User($db);
        $user->id = $current_user_id;

        if ($user->getById()) {
            Response::success([
                'logged_in' => true,
                'user_id' => $user->id,
                'email' => $user->email,
                'full_name' => $user->full_name,
                'role' => $user->role,
                'profile_photo' => $user->profile_photo
            ]);
        }

        Response::success([
            'logged_in' => true,
            'user_id' => $current_user_id
        ]);
    } else {
        Response::success(['logged_in' => false]);
    }

} else {
    Response::notFound('Endpoint not found');
}
