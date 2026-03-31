<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../utils/Auth.php';
require_once '../utils/Response.php';

Auth::requireRole('admin');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Method not allowed', 405);
}

$database = new Database();
$db = $database->getConnection();
$limit = intval($_GET['limit'] ?? 100);
if ($limit <= 0 || $limit > 500) {
    $limit = 100;
}

$query = "SELECT a.*, u.full_name, u.email
          FROM audit_logs a
          LEFT JOIN users u ON u.id = a.user_id
          ORDER BY a.created_at DESC
          LIMIT :limit_val";
$stmt = $db->prepare($query);
$stmt->bindParam(':limit_val', $limit, PDO::PARAM_INT);
$stmt->execute();

$logs = [];
while ($row = $stmt->fetch()) {
    $logs[] = $row;
}

Response::success($logs);
