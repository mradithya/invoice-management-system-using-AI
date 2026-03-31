<?php
/**
 * Simple invoice PDF builder with no external dependencies.
 */

class InvoicePdfBuilder {
    public static function build($invoice, $items) {
        $invoiceNumber = strval($invoice['invoice_number'] ?? 'N/A');
        $clientName = strval($invoice['client_name'] ?? 'Client');
        $clientCompany = strval($invoice['client_company'] ?? '');
        $issueDate = strval($invoice['issue_date'] ?? '');
        $dueDate = strval($invoice['due_date'] ?? '');
        $status = strval($invoice['status'] ?? 'Pending');
        $subtotal = number_format((float) ($invoice['subtotal'] ?? 0), 2, '.', '');
        $taxRate = number_format((float) ($invoice['tax_rate'] ?? 0), 2, '.', '');
        $taxAmount = number_format((float) ($invoice['tax_amount'] ?? 0), 2, '.', '');
        $total = number_format((float) ($invoice['total'] ?? 0), 2, '.', '');

        $lines = [
            'Invoice',
            'Invoice Number: ' . $invoiceNumber,
            'Issue Date: ' . $issueDate,
            'Due Date: ' . $dueDate,
            'Status: ' . $status,
            '',
            'Bill To: ' . $clientName . ($clientCompany !== '' ? ' (' . $clientCompany . ')' : ''),
            '',
            'Items'
        ];

        if (!is_array($items) || !count($items)) {
            $lines[] = 'No line items found.';
        } else {
            $index = 1;
            foreach ($items as $item) {
                $description = strval($item['description'] ?? 'Item');
                $qty = (float) ($item['quantity'] ?? 0);
                $unitPrice = (float) ($item['unit_price'] ?? 0);
                $lineTotal = (float) ($item['total'] ?? ($qty * $unitPrice));

                $lines[] = $index . '. ' . self::truncate($description, 44)
                    . ' | Qty: ' . self::trimNumber($qty)
                    . ' | Unit: Rs ' . number_format($unitPrice, 2, '.', '')
                    . ' | Total: Rs ' . number_format($lineTotal, 2, '.', '');
                $index++;

                if (count($lines) >= 42) {
                    $lines[] = '...';
                    break;
                }
            }
        }

        $lines[] = '';
        $lines[] = 'Subtotal: Rs ' . $subtotal;
        $lines[] = 'Tax (' . $taxRate . '%): Rs ' . $taxAmount;
        $lines[] = 'Grand Total: Rs ' . $total;

        return self::buildSinglePagePdf($lines);
    }

    private static function buildSinglePagePdf($lines) {
        $content = "BT\n/F1 12 Tf\n50 800 Td\n";
        $lineCount = 0;

        foreach ($lines as $line) {
            $safe = self::escapePdfText(self::toAscii($line));
            if ($lineCount === 0) {
                $content .= '(' . $safe . ") Tj\n";
            } else {
                $content .= "0 -16 Td\n(" . $safe . ") Tj\n";
            }
            $lineCount++;
            if ($lineCount >= 44) {
                break;
            }
        }

        $content .= "ET";

        $objects = [];
        $objects[] = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
        $objects[] = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
        $objects[] = "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n";
        $objects[] = "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";
        $objects[] = "5 0 obj\n<< /Length " . strlen($content) . " >>\nstream\n" . $content . "\nendstream\nendobj\n";

        $pdf = "%PDF-1.4\n";
        $offsets = [0];

        foreach ($objects as $object) {
            $offsets[] = strlen($pdf);
            $pdf .= $object;
        }

        $xrefOffset = strlen($pdf);
        $pdf .= "xref\n0 6\n";
        $pdf .= "0000000000 65535 f \n";

        for ($i = 1; $i <= 5; $i++) {
            $pdf .= str_pad(strval($offsets[$i]), 10, '0', STR_PAD_LEFT) . " 00000 n \n";
        }

        $pdf .= "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" . $xrefOffset . "\n%%EOF";

        return $pdf;
    }

    private static function escapePdfText($text) {
        $text = str_replace('\\', '\\\\', $text);
        $text = str_replace('(', '\\(', $text);
        $text = str_replace(')', '\\)', $text);
        return $text;
    }

    private static function toAscii($text) {
        $clean = preg_replace('/[^\x20-\x7E]/', ' ', strval($text));
        return preg_replace('/\s+/', ' ', trim($clean));
    }

    private static function truncate($text, $maxLength) {
        $clean = self::toAscii($text);
        if (strlen($clean) <= $maxLength) {
            return $clean;
        }
        return substr($clean, 0, $maxLength - 3) . '...';
    }

    private static function trimNumber($value) {
        $formatted = number_format((float) $value, 2, '.', '');
        $formatted = rtrim(rtrim($formatted, '0'), '.');
        return $formatted === '' ? '0' : $formatted;
    }
}
