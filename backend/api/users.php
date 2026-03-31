<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../models/User.php';
require_once '../utils/Auth.php';
require_once '../utils/Response.php';
require_once '../utils/AuditLogger.php';

Auth::requireRole('admin');

$method = $_SERVER['REQUEST_METHOD'];
$database = new Database();
$db = $database->getConnection();
$userModel = new User($db);

$uri_parts = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
$user_id = null;
$api_index = array_search('users.php', $uri_parts);
if ($api_index !== false && isset($uri_parts[$api_index + 1])) {
    $user_id = intval($uri_parts[$api_index + 1]);
}

switch ($method) {
    case 'GET':
        $stmt = $userModel->readAll();
        $users = [];
        while ($row = $stmt->fetch()) {
            $users[] = $row;
        }
        Response::success($users);
        break;

    case 'PUT':
        if (!$user_id) {
            Response::error('User ID is required', 400);
        }

        $payload = json_decode(file_get_contents('php://input'));
        $role = $payload->role ?? '';

        if (!in_array($role, ['admin', 'staff'])) {
            Response::validationError(['role must be admin or staff']);
        }

        $current_user_id = Auth::getUserId();
        if ($current_user_id == $user_id && $role !== 'admin') {
            Response::error('You cannot remove your own admin access', 400);
        }

        $userModel->id = $user_id;
        $userModel->role = $role;

        if ($userModel->updateRole()) {
            AuditLogger::log($db, $current_user_id, 'update_role', 'user', strval($user_id), ['role' => $role]);
            Response::success([], 'User role updated successfully');
        }

        Response::serverError('Failed to update user role');
        break;

    default:
        Response::error('Method not allowed', 405);
}
