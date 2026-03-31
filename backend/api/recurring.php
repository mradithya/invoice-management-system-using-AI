<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../models/Invoice.php';
require_once '../models/InvoiceItem.php';
require_once '../utils/Auth.php';
require_once '../utils/Response.php';
require_once '../utils/AuditLogger.php';
require_once '../utils/RecurringProcessor.php';

Auth::requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$database = new Database();
$db = $database->getConnection();
$user_id = Auth::getUserId();

$uri_parts = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
$template_id = null;
$is_run_request = false;
$api_index = array_search('recurring.php', $uri_parts);
if ($api_index !== false && isset($uri_parts[$api_index + 1])) {
    if ($uri_parts[$api_index + 1] === 'run') {
        $is_run_request = true;
    } else {
        $template_id = intval($uri_parts[$api_index + 1]);
    }
}

switch ($method) {
    case 'GET':
        $stmt = $db->prepare("SELECT r.*, c.name AS client_name, c.company AS client_company
                             FROM recurring_invoices r
                             LEFT JOIN clients c ON c.id = r.client_id
                             WHERE r.user_id = :user_id
                             ORDER BY r.created_at DESC");
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();

        $templates = [];
        while ($row = $stmt->fetch()) {
            $row['items'] = json_decode($row['items_json'], true);
            unset($row['items_json']);
            $templates[] = $row;
        }

        Response::success($templates);
        break;

    case 'POST':
        if ($is_run_request) {
            $count = RecurringProcessor::runDueTemplatesForUser($db, $user_id);
            Response::success(['created_count' => $count], 'Recurring invoices processed');
        }

        $data = json_decode(file_get_contents('php://input'));
        if (empty($data->template_name) || empty($data->client_id) || empty($data->items)) {
            Response::validationError(['template_name, client_id and items are required']);
        }

        $frequency = $data->frequency ?? 'monthly';
        if (!in_array($frequency, ['hourly', 'weekly', 'monthly', 'quarterly'])) {
            Response::validationError(['frequency must be hourly, weekly, monthly, or quarterly']);
        }

        $interval_hours = intval($data->interval_hours ?? 1);
        if ($interval_hours < 1 || $interval_hours > 720) {
            Response::validationError(['interval_hours must be between 1 and 720']);
        }

        $due_after_days = intval($data->due_after_days ?? 15);
        if ($due_after_days < 1 || $due_after_days > 90) {
            Response::validationError(['due_after_days must be between 1 and 90']);
        }

        $query = "INSERT INTO recurring_invoices
                  SET user_id = :user_id,
                      client_id = :client_id,
                      template_name = :template_name,
                      items_json = :items_json,
                      tax_rate = :tax_rate,
                      notes = :notes,
                      frequency = :frequency,
                      interval_hours = :interval_hours,
                      due_after_days = :due_after_days,
                      next_run_date = :next_run_date,
                      is_active = :is_active";
        $stmt = $db->prepare($query);
        $items_json = json_encode($data->items);
        $tax_rate = floatval($data->tax_rate ?? 0);
        $notes = $data->notes ?? '';
        $next_run_date = $data->next_run_date ?? date('Y-m-d H:i:s');
        $next_run_date = str_replace('T', ' ', $next_run_date);
        if (strlen($next_run_date) === 10) {
            $next_run_date .= ' 00:00:00';
        }
        $is_active = isset($data->is_active) ? (intval($data->is_active) ? 1 : 0) : 1;

        $stmt->bindParam(':user_id', $user_id);
        $stmt->bindParam(':client_id', $data->client_id);
        $stmt->bindParam(':template_name', $data->template_name);
        $stmt->bindParam(':items_json', $items_json);
        $stmt->bindParam(':tax_rate', $tax_rate);
        $stmt->bindParam(':notes', $notes);
        $stmt->bindParam(':frequency', $frequency);
        $stmt->bindParam(':interval_hours', $interval_hours);
        $stmt->bindParam(':due_after_days', $due_after_days);
        $stmt->bindParam(':next_run_date', $next_run_date);
        $stmt->bindParam(':is_active', $is_active);

        if ($stmt->execute()) {
            $new_id = $db->lastInsertId();
            AuditLogger::log($db, $user_id, 'create_recurring_template', 'recurring_template', strval($new_id));
            Response::success(['id' => $new_id], 'Recurring template created', 201);
        }

        Response::serverError('Failed to create recurring template');
        break;

    case 'PUT':
        if (!$template_id) {
            Response::error('Template ID is required', 400);
        }

        $data = json_decode(file_get_contents('php://input'));
        $query = "UPDATE recurring_invoices
                  SET template_name = :template_name,
                      client_id = :client_id,
                      items_json = :items_json,
                      tax_rate = :tax_rate,
                      notes = :notes,
                      frequency = :frequency,
                      interval_hours = :interval_hours,
                      due_after_days = :due_after_days,
                      next_run_date = :next_run_date,
                      is_active = :is_active
                  WHERE id = :id AND user_id = :user_id";
        $stmt = $db->prepare($query);

        $template_name = $data->template_name ?? '';
        $client_id = intval($data->client_id ?? 0);
        $items_json = json_encode($data->items ?? []);
        $tax_rate = floatval($data->tax_rate ?? 0);
        $notes = $data->notes ?? '';
        $frequency = $data->frequency ?? 'monthly';
        $interval_hours = intval($data->interval_hours ?? 1);
        $due_after_days = intval($data->due_after_days ?? 15);
        $next_run_date = $data->next_run_date ?? date('Y-m-d H:i:s');
        $next_run_date = str_replace('T', ' ', $next_run_date);
        if (strlen($next_run_date) === 10) {
            $next_run_date .= ' 00:00:00';
        }
        $is_active = isset($data->is_active) ? (intval($data->is_active) ? 1 : 0) : 1;

        $stmt->bindParam(':template_name', $template_name);
        $stmt->bindParam(':client_id', $client_id);
        $stmt->bindParam(':items_json', $items_json);
        $stmt->bindParam(':tax_rate', $tax_rate);
        $stmt->bindParam(':notes', $notes);
        $stmt->bindParam(':frequency', $frequency);
        $stmt->bindParam(':interval_hours', $interval_hours);
        $stmt->bindParam(':due_after_days', $due_after_days);
        $stmt->bindParam(':next_run_date', $next_run_date);
        $stmt->bindParam(':is_active', $is_active);
        $stmt->bindParam(':id', $template_id);
        $stmt->bindParam(':user_id', $user_id);

        if ($stmt->execute()) {
            AuditLogger::log($db, $user_id, 'update_recurring_template', 'recurring_template', strval($template_id));
            Response::success([], 'Recurring template updated');
        }

        Response::serverError('Failed to update recurring template');
        break;

    case 'DELETE':
        if (!$template_id) {
            Response::error('Template ID is required', 400);
        }

        $stmt = $db->prepare("DELETE FROM recurring_invoices WHERE id = :id AND user_id = :user_id");
        $stmt->bindParam(':id', $template_id);
        $stmt->bindParam(':user_id', $user_id);

        if ($stmt->execute()) {
            AuditLogger::log($db, $user_id, 'delete_recurring_template', 'recurring_template', strval($template_id));
            Response::success([], 'Recurring template deleted');
        }

        Response::serverError('Failed to delete recurring template');
        break;

    default:
        Response::error('Method not allowed', 405);
}
