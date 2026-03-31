<?php
/**
 * Daily recurring invoice runner.
 *
 * CLI usage:
 *   php backend/cron/run_recurring.php
 *
 * HTTP usage (optional):
 *   /invoice-management/backend/cron/run_recurring.php?token=YOUR_TOKEN
 *
 * Set RECURRENCE_CRON_TOKEN in your environment for HTTP protection.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/RecurringProcessor.php';

$is_cli = php_sapi_name() === 'cli';

if (!$is_cli) {
    header('Content-Type: application/json; charset=UTF-8');
    $expected_token = getenv('RECURRENCE_CRON_TOKEN') ?: '';
    $provided_token = $_GET['token'] ?? '';

    if ($expected_token === '') {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Cron token is not configured'
        ]);
        exit();
    }

    if (!is_string($provided_token) || !hash_equals($expected_token, $provided_token)) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid token'
        ]);
        exit();
    }
}

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    if (!$is_cli) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Database connection failed'
        ]);
        exit();
    }

    fwrite(STDERR, "Database connection failed\n");
    exit(1);
}

$result = RecurringProcessor::runDueTemplatesForAllUsers($db);

if ($is_cli) {
    echo "Recurring run complete\n";
    echo "Processed templates: " . $result['processed_templates'] . "\n";
    echo "Created invoices: " . $result['created_invoices'] . "\n";
    exit(0);
}

http_response_code(200);
echo json_encode([
    'success' => true,
    'message' => 'Recurring run complete',
    'data' => $result
]);
