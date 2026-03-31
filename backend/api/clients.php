<?php
/**
 * Clients API Endpoints
 * GET /api/clients - Get all clients
 * GET /api/clients/{id} - Get single client
 * POST /api/clients - Create client
 * PUT /api/clients/{id} - Update client
 * DELETE /api/clients/{id} - Delete client
 */

require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../models/Client.php';
require_once '../utils/Auth.php';
require_once '../utils/Response.php';
require_once '../utils/AuditLogger.php';

// Require authentication
Auth::requireAuth();

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

// Get database connection
$database = new Database();
$db = $database->getConnection();

$client = new Client($db);
$actor_user_id = Auth::getUserId();
$is_admin = Auth::getUserRole() === 'admin';
$scope_user_id = $is_admin ? intval($_GET['user_id'] ?? 0) : $actor_user_id;

if ($is_admin && $scope_user_id <= 0) {
    Response::validationError(['user_id is required for admin']);
}

$client->user_id = $scope_user_id;

// Parse request URI to get ID
$uri_parts = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
$client_id = null;

// Find client ID in URI
$api_index = array_search('clients', $uri_parts);
if ($api_index !== false && isset($uri_parts[$api_index + 1])) {
    $client_id = intval($uri_parts[$api_index + 1]);
} else {
    $api_index = array_search('clients.php', $uri_parts);
    if ($api_index !== false && isset($uri_parts[$api_index + 1])) {
        $client_id = intval($uri_parts[$api_index + 1]);
    }
}

switch ($method) {
    case 'GET':
        if ($client_id) {
            // Get single client
            $client->id = $client_id;
            if ($client->readOne()) {
                Response::success([
                    'id' => $client->id,
                    'name' => $client->name,
                    'email' => $client->email,
                    'phone' => $client->phone,
                    'address' => $client->address,
                    'company' => $client->company
                ]);
            } else {
                Response::notFound('Client not found');
            }
        } else {
            // Get all clients
            $stmt = $client->readAll();
            $clients = [];

            while ($row = $stmt->fetch()) {
                $clients[] = $row;
            }

            Response::success($clients);
        }
        break;

    case 'POST':
        // Create client
        $data = json_decode(file_get_contents("php://input"));

        if (empty($data->name)) {
            Response::validationError(['name is required']);
        }

        $client->name = $data->name;
        $client->email = $data->email ?? '';
        $client->phone = $data->phone ?? '';
        $client->address = $data->address ?? '';
        $client->company = $data->company ?? '';

        if ($client->create()) {
            AuditLogger::log($db, $actor_user_id, 'create_client', 'client', strval($client->id), [
                'target_user_id' => $scope_user_id,
                'name' => $client->name,
                'email' => $client->email
            ]);

            Response::success([
                'id' => $client->id,
                'name' => $client->name,
                'email' => $client->email,
                'phone' => $client->phone,
                'address' => $client->address,
                'company' => $client->company
            ], 'Client created successfully', 201);
        } else {
            Response::serverError('Failed to create client');
        }
        break;

    case 'PUT':
        // Update client
        if (!$client_id) {
            Response::error('Client ID is required', 400);
        }

        $data = json_decode(file_get_contents("php://input"));

        if (empty($data->name)) {
            Response::validationError(['name is required']);
        }

        $client->id = $client_id;
        $client->name = $data->name;
        $client->email = $data->email ?? '';
        $client->phone = $data->phone ?? '';
        $client->address = $data->address ?? '';
        $client->company = $data->company ?? '';

        if ($client->update()) {
            AuditLogger::log($db, $actor_user_id, 'update_client', 'client', strval($client_id), [
                'target_user_id' => $scope_user_id,
                'name' => $client->name,
                'email' => $client->email
            ]);
            Response::success([], 'Client updated successfully');
        } else {
            Response::serverError('Failed to update client');
        }
        break;

    case 'DELETE':
        // Delete client
        if (!$client_id) {
            Response::error('Client ID is required', 400);
        }

        $client->id = $client_id;

        if ($client->delete()) {
            AuditLogger::log($db, $actor_user_id, 'delete_client', 'client', strval($client_id), [
                'target_user_id' => $scope_user_id
            ]);
            Response::success([], 'Client deleted successfully');
        } else {
            Response::serverError('Failed to delete client');
        }
        break;

    default:
        Response::error('Method not allowed', 405);
}
