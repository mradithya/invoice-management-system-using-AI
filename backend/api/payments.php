<?php
/**
 * Payments API Endpoints
 * GET /api/payments/invoice/{invoice_id} - Get payments for an invoice
 * POST /api/payments - Create payment
 * DELETE /api/payments/{id} - Delete payment
 */

require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../models/Payment.php';
require_once '../models/Invoice.php';
require_once '../utils/Auth.php';
require_once '../utils/Response.php';

// Require authentication
Auth::requireAuth();

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

// Get database connection
$database = new Database();
$db = $database->getConnection();

$payment = new Payment($db);
$user_id = Auth::getUserId();

// Parse request URI
$uri_parts = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
$payment_id = null;
$invoice_id = null;

// Check for invoice payments endpoint
if (in_array('invoice', $uri_parts)) {
    $invoice_index = array_search('invoice', $uri_parts);
    if (isset($uri_parts[$invoice_index + 1])) {
        $invoice_id = intval($uri_parts[$invoice_index + 1]);
    }
} else {
    // Find payment ID in URI
    $api_index = array_search('payments', $uri_parts);
    if ($api_index !== false && isset($uri_parts[$api_index + 1])) {
        $payment_id = intval($uri_parts[$api_index + 1]);
    } else {
        $api_index = array_search('payments.php', $uri_parts);
        if ($api_index !== false && isset($uri_parts[$api_index + 1])) {
            $payment_id = intval($uri_parts[$api_index + 1]);
        }
    }
}

switch ($method) {
    case 'GET':
        if ($invoice_id) {
            // Get payments for an invoice
            $payment->invoice_id = $invoice_id;
            $stmt = $payment->readByInvoice();

            $payments = [];
            while ($row = $stmt->fetch()) {
                $payments[] = $row;
            }

            Response::success($payments);
        } else {
            Response::error('Invoice ID is required', 400);
        }
        break;

    case 'POST':
        // Create payment
        $data = json_decode(file_get_contents("php://input"));

        if (empty($data->invoice_id) || empty($data->amount) || empty($data->payment_date)) {
            Response::validationError(['invoice_id, amount, and payment_date are required']);
        }

        $payment->invoice_id = $data->invoice_id;
        $payment->amount = $data->amount;
        $payment->payment_date = $data->payment_date;
        $payment->payment_method = $data->payment_method ?? 'Cash';
        $payment->reference_number = $data->reference_number ?? '';
        $payment->notes = $data->notes ?? '';

        // Start transaction
        $db->beginTransaction();

        try {
            if ($payment->create()) {
                // Check if invoice is fully paid
                $total_paid = $payment->getTotalPaid();

                // Get invoice total
                $invoice = new Invoice($db);
                $invoice->id = $payment->invoice_id;
                $invoice->user_id = $user_id;
                $invoice_data = $invoice->readOne();

                if ($invoice_data && $total_paid >= $invoice_data['total']) {
                    // Update invoice status to Paid
                    $invoice->status = 'Paid';
                    $invoice->updateStatus();
                }

                $db->commit();

                Response::success([
                    'id' => $payment->id
                ], 'Payment recorded successfully', 201);
            } else {
                throw new Exception('Failed to create payment');
            }
        } catch (Exception $e) {
            $db->rollBack();
            Response::serverError('Failed to record payment: ' . $e->getMessage());
        }
        break;

    case 'DELETE':
        // Delete payment
        if (!$payment_id) {
            Response::error('Payment ID is required', 400);
        }

        $payment->id = $payment_id;

        if ($payment->delete()) {
            Response::success([], 'Payment deleted successfully');
        } else {
            Response::serverError('Failed to delete payment');
        }
        break;

    default:
        Response::error('Method not allowed', 405);
}
