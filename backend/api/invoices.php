<?php
/**
 * Invoices API Endpoints
 * GET /api/invoices - Get all invoices
 * GET /api/invoices/{id} - Get single invoice with items
 * POST /api/invoices - Create invoice with items
 * PUT /api/invoices/{id} - Update invoice
 * DELETE /api/invoices/{id} - Delete invoice
 */

require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../models/Invoice.php';
require_once '../models/InvoiceItem.php';
require_once '../utils/Auth.php';
require_once '../utils/Response.php';
require_once '../utils/AuditLogger.php';
require_once '../utils/Mailer.php';
require_once '../utils/InvoicePdfBuilder.php';

// Require authentication
Auth::requireAuth();

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

// Get database connection
$database = new Database();
$db = $database->getConnection();

$invoice = new Invoice($db);
$actor_user_id = Auth::getUserId();
$is_admin = Auth::getUserRole() === 'admin';
$scope_user_id = $is_admin ? intval($_GET['user_id'] ?? 0) : $actor_user_id;

if ($is_admin && $scope_user_id <= 0) {
    Response::validationError(['user_id is required for admin']);
}

$invoice->user_id = $scope_user_id;

// Update overdue invoices
$invoice->updateOverdueStatus();

// Parse request URI to get ID
$uri_parts = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
$invoice_id = null;
$is_email_request = false;
$is_receivables_request = false;

// Find invoice ID in URI
$api_index = array_search('invoices', $uri_parts);
if ($api_index !== false && isset($uri_parts[$api_index + 1])) {
    $next_segment = $uri_parts[$api_index + 1];
    if ($next_segment === 'receivables') {
        $is_receivables_request = true;
    } else {
        $invoice_id = intval($next_segment);
    }
    if (isset($uri_parts[$api_index + 2]) && $uri_parts[$api_index + 2] === 'email') {
        $is_email_request = true;
    }
} else {
    $api_index = array_search('invoices.php', $uri_parts);
    if ($api_index !== false && isset($uri_parts[$api_index + 1])) {
        $next_segment = $uri_parts[$api_index + 1];
        if ($next_segment === 'receivables') {
            $is_receivables_request = true;
        } else {
            $invoice_id = intval($next_segment);
        }
        if (isset($uri_parts[$api_index + 2]) && $uri_parts[$api_index + 2] === 'email') {
            $is_email_request = true;
        }
    }
}

switch ($method) {
    case 'GET':
        if ($is_receivables_request) {
            $date_from = isset($_GET['date_from']) ? $_GET['date_from'] : null;
            $date_to = isset($_GET['date_to']) ? $_GET['date_to'] : null;

            $stmt = $invoice->readReceivables($date_from, $date_to);
            $receivables = [];

            while ($row = $stmt->fetch()) {
                $receivables[] = $row;
            }

            Response::success($receivables);
        } elseif ($invoice_id) {
            // Get single invoice with items
            $invoice->id = $invoice_id;
            $invoice_data = $invoice->readOne();

            if ($invoice_data) {
                // Get invoice items
                $invoiceItem = new InvoiceItem($db);
                $invoiceItem->invoice_id = $invoice_id;
                $stmt = $invoiceItem->readByInvoice();

                $items = [];
                while ($row = $stmt->fetch()) {
                    $items[] = $row;
                }

                $invoice_data['items'] = $items;
                Response::success($invoice_data);
            } else {
                Response::notFound('Invoice not found');
            }
        } else {
            // Get all invoices
            $stmt = $invoice->readAll();
            $invoices = [];

            while ($row = $stmt->fetch()) {
                $invoices[] = $row;
            }

            Response::success($invoices);
        }
        break;

    case 'POST':
        if ($is_email_request) {
            if (!$invoice_id) {
                Response::error('Invoice ID is required', 400);
            }

            $data = json_decode(file_get_contents("php://input"));
            $recipient = $data->to ?? '';

            $invoice->id = $invoice_id;
            $invoice_data = $invoice->readOne();

            if (!$invoice_data) {
                Response::notFound('Invoice not found');
            }

            if (empty($recipient)) {
                $recipient = $invoice_data['client_email'] ?? '';
            }

            if (empty($recipient)) {
                Response::validationError(['Recipient email is required']);
            }

            $subject = $data->subject ?? ('Invoice ' . $invoice_data['invoice_number']);
            $message = $data->message ?? "Hello,\n\nPlease find your invoice details below:\n"
                . "Invoice Number: " . $invoice_data['invoice_number'] . "\n"
                . "Issue Date: " . $invoice_data['issue_date'] . "\n"
                . "Due Date: " . $invoice_data['due_date'] . "\n"
                . "Total: ₹" . number_format($invoice_data['total'], 2) . "\n\n"
                . "Thank you.";

            $invoiceItem = new InvoiceItem($db);
            $invoiceItem->invoice_id = $invoice_id;
            $itemsStmt = $invoiceItem->readByInvoice();
            $invoice_items = [];
            while ($itemRow = $itemsStmt->fetch()) {
                $invoice_items[] = $itemRow;
            }

            $pdfContent = InvoicePdfBuilder::build($invoice_data, $invoice_items);
            $invoiceNumberSafe = preg_replace('/[^A-Za-z0-9_-]/', '_', strval($invoice_data['invoice_number'] ?? ('INV_' . $invoice_id)));
            $attachments = [[
                'filename' => 'invoice-' . $invoiceNumberSafe . '.pdf',
                'mime' => 'application/pdf',
                'content' => $pdfContent
            ]];

            $mail_result = Mailer::send($recipient, $subject, $message, $attachments);

            if (empty($mail_result['success'])) {
                AuditLogger::log($db, Auth::getUserId(), 'send_invoice_email_failed', 'invoice', strval($invoice_id), [
                    'recipient' => $recipient,
                    'mode' => $mail_result['mode'] ?? 'unknown',
                    'error' => $mail_result['error'] ?? 'Unknown mail error'
                ]);
                Response::serverError('Failed to send invoice email: ' . ($mail_result['error'] ?? 'Unknown error'));
            }

            AuditLogger::log($db, Auth::getUserId(), 'send_invoice_email', 'invoice', strval($invoice_id), [
                'recipient' => $recipient,
                'mode' => $mail_result['mode']
            ]);

            Response::success([
                'to' => $recipient,
                'mode' => $mail_result['mode']
            ], 'Invoice email sent successfully');
        }

        // Create invoice with items
        $data = json_decode(file_get_contents("php://input"));

        if (empty($data->client_id) || empty($data->issue_date) ||
            empty($data->due_date) || empty($data->items)) {
            Response::validationError(['client_id, issue_date, due_date, and items are required']);
        }

        // Invoice number is assigned during create() (globally unique)
        $invoice->invoice_number = '';
        $invoice->client_id = $data->client_id;
        $invoice->issue_date = $data->issue_date;
        $invoice->due_date = $data->due_date;
        $invoice->tax_rate = $data->tax_rate ?? 0;
        $invoice->notes = $data->notes ?? '';
        $invoice->status = 'Pending';

        // Calculate totals
        $subtotal = 0;
        foreach ($data->items as $item) {
            $item_total = $item->quantity * $item->unit_price;
            $subtotal += $item_total;
        }

        $invoice->subtotal = $subtotal;
        $invoice->tax_amount = ($subtotal * $invoice->tax_rate) / 100;
        $invoice->total = $subtotal + $invoice->tax_amount;

        // Start transaction
        $db->beginTransaction();

        try {
            if ($invoice->create()) {
                // Create invoice items
                $invoiceItem = new InvoiceItem($db);
                $invoiceItem->invoice_id = $invoice->id;

                foreach ($data->items as $item) {
                    $invoiceItem->description = $item->description;
                    $invoiceItem->quantity = $item->quantity;
                    $invoiceItem->unit_price = $item->unit_price;
                    $invoiceItem->total = $item->quantity * $item->unit_price;

                    if (!$invoiceItem->create()) {
                        throw new Exception('Failed to create invoice item');
                    }
                }

                $db->commit();

                AuditLogger::log($db, Auth::getUserId(), 'create_invoice', 'invoice', strval($invoice->id), [
                    'invoice_number' => $invoice->invoice_number,
                    'target_user_id' => $scope_user_id
                ]);

                Response::success([
                    'id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number
                ], 'Invoice created successfully', 201);
            } else {
                throw new Exception('Failed to create invoice');
            }
        } catch (Exception $e) {
            $db->rollBack();
            Response::serverError('Failed to create invoice: ' . $e->getMessage());
        }
        break;

    case 'PUT':
        // Update invoice
        if (!$invoice_id) {
            Response::error('Invoice ID is required', 400);
        }

        $data = json_decode(file_get_contents("php://input"));

        $invoice->id = $invoice_id;
        $invoice->client_id = $data->client_id;
        $invoice->issue_date = $data->issue_date;
        $invoice->due_date = $data->due_date;
        $invoice->tax_rate = $data->tax_rate ?? 0;
        $invoice->notes = $data->notes ?? '';
        $invoice->status = $data->status ?? 'Pending';

        // Calculate totals
        $subtotal = 0;
        if (isset($data->items)) {
            foreach ($data->items as $item) {
                $item_total = $item->quantity * $item->unit_price;
                $subtotal += $item_total;
            }
        }

        $invoice->subtotal = $subtotal;
        $invoice->tax_amount = ($subtotal * $invoice->tax_rate) / 100;
        $invoice->total = $subtotal + $invoice->tax_amount;

        // Start transaction
        $db->beginTransaction();

        try {
            if ($invoice->update()) {
                // Update invoice items if provided
                if (isset($data->items)) {
                    $invoiceItem = new InvoiceItem($db);
                    $invoiceItem->invoice_id = $invoice_id;

                    // Delete existing items
                    $invoiceItem->deleteByInvoice();

                    // Create new items
                    foreach ($data->items as $item) {
                        $invoiceItem->description = $item->description;
                        $invoiceItem->quantity = $item->quantity;
                        $invoiceItem->unit_price = $item->unit_price;
                        $invoiceItem->total = $item->quantity * $item->unit_price;

                        if (!$invoiceItem->create()) {
                            throw new Exception('Failed to create invoice item');
                        }
                    }
                }

                $db->commit();
                AuditLogger::log($db, Auth::getUserId(), 'update_invoice', 'invoice', strval($invoice_id), [
                    'target_user_id' => $scope_user_id
                ]);
                Response::success([], 'Invoice updated successfully');
            } else {
                throw new Exception('Failed to update invoice');
            }
        } catch (Exception $e) {
            $db->rollBack();
            Response::serverError('Failed to update invoice: ' . $e->getMessage());
        }
        break;

    case 'DELETE':
        // Delete invoice
        if (!$invoice_id) {
            Response::error('Invoice ID is required', 400);
        }

        $invoice->id = $invoice_id;

        if ($invoice->delete()) {
            AuditLogger::log($db, Auth::getUserId(), 'delete_invoice', 'invoice', strval($invoice_id), [
                'target_user_id' => $scope_user_id
            ]);
            Response::success([], 'Invoice deleted successfully');
        } else {
            Response::serverError('Failed to delete invoice');
        }
        break;

    default:
        Response::error('Method not allowed', 405);
}
