<?php
/**
 * Recurring invoice processing utility.
 */

require_once __DIR__ . '/../models/Invoice.php';
require_once __DIR__ . '/../models/InvoiceItem.php';
require_once __DIR__ . '/AuditLogger.php';

class RecurringProcessor {
    private static function nextRunDate($frequency, $from_date) {
        if ($frequency === 'hourly') {
            return date('Y-m-d H:i:s', strtotime($from_date . ' +1 hour'));
        }

        if ($frequency === 'weekly') {
            return date('Y-m-d H:i:s', strtotime($from_date . ' +7 days'));
        }

        if ($frequency === 'quarterly') {
            return date('Y-m-d H:i:s', strtotime($from_date . ' +3 months'));
        }

        return date('Y-m-d H:i:s', strtotime($from_date . ' +1 month'));
    }

    private static function createInvoiceFromTemplate($db, $template) {
        $items = json_decode($template['items_json'], true);
        if (!is_array($items) || count($items) === 0) {
            return false;
        }

        $invoice = new Invoice($db);
        $invoice->user_id = intval($template['user_id']);
        $invoice->client_id = intval($template['client_id']);
        $invoice->invoice_number = $invoice->generateInvoiceNumber();
        $invoice->issue_date = date('Y-m-d');
        $invoice->due_date = date('Y-m-d', strtotime(date('Y-m-d') . ' +' . intval($template['due_after_days']) . ' days'));
        $invoice->tax_rate = floatval($template['tax_rate']);
        $invoice->notes = trim(($template['notes'] ?? '') . "\n[Generated from recurring template: " . $template['template_name'] . "]");
        $invoice->status = 'Pending';

        $subtotal = 0;
        foreach ($items as $item) {
            $subtotal += floatval($item['quantity']) * floatval($item['unit_price']);
        }

        $invoice->subtotal = $subtotal;
        $invoice->tax_amount = ($subtotal * $invoice->tax_rate) / 100;
        $invoice->total = $invoice->subtotal + $invoice->tax_amount;

        $db->beginTransaction();

        try {
            if (!$invoice->create()) {
                throw new Exception('Failed to create recurring invoice');
            }

            $itemModel = new InvoiceItem($db);
            $itemModel->invoice_id = $invoice->id;

            foreach ($items as $item) {
                $itemModel->description = $item['description'];
                $itemModel->quantity = floatval($item['quantity']);
                $itemModel->unit_price = floatval($item['unit_price']);
                $itemModel->total = floatval($item['quantity']) * floatval($item['unit_price']);

                if (!$itemModel->create()) {
                    throw new Exception('Failed to create recurring invoice item');
                }
            }

            $fromDate = $template['next_run_date'] ?: date('Y-m-d H:i:s');
            $next_date = self::nextRunDate($template['frequency'], $fromDate);

            if ($template['frequency'] === 'hourly') {
                $hours = max(1, intval($template['interval_hours'] ?? 1));
                $next_date = date('Y-m-d H:i:s', strtotime($fromDate . ' +' . $hours . ' hours'));
            }

            $update = $db->prepare("UPDATE recurring_invoices
                                   SET last_run_date = NOW(),
                                       next_run_date = :next_run_date
                                   WHERE id = :id");
            $update->bindParam(':next_run_date', $next_date);
            $update->bindParam(':id', $template['id']);
            $update->execute();

            $db->commit();

            AuditLogger::log($db, intval($template['user_id']), 'generate_recurring_invoice', 'recurring_template', strval($template['id']), [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number
            ]);

            return true;
        } catch (Exception $e) {
            $db->rollBack();
            return false;
        }
    }

    public static function runDueTemplatesForUser($db, $user_id) {
        $query = "SELECT * FROM recurring_invoices
                  WHERE user_id = :user_id
                  AND is_active = 1
                  AND next_run_date <= NOW()";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();

        $templates = $stmt->fetchAll();
        $created = 0;

        foreach ($templates as $template) {
            if (self::createInvoiceFromTemplate($db, $template)) {
                $created++;
            }
        }

        return $created;
    }

    public static function runDueTemplatesForAllUsers($db) {
        $query = "SELECT * FROM recurring_invoices
                  WHERE is_active = 1
                  AND next_run_date <= NOW()
                  ORDER BY user_id ASC, id ASC";
        $stmt = $db->prepare($query);
        $stmt->execute();

        $templates = $stmt->fetchAll();
        $created = 0;
        $processed = 0;

        foreach ($templates as $template) {
            $processed++;

            if (self::createInvoiceFromTemplate($db, $template)) {
                $created++;
            }
        }

        return [
            'processed_templates' => $processed,
            'created_invoices' => $created
        ];
    }
}
