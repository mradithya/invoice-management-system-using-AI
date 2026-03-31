<?php
/**
 * Invoice Model
 * Handles invoice CRUD operations
 */

class Invoice {
    private $conn;
    private $table_name = "invoices";

    public $id;
    public $user_id;
    public $client_id;
    public $invoice_number;
    public $issue_date;
    public $due_date;
    public $subtotal;
    public $tax_rate;
    public $tax_amount;
    public $total;
    public $status;
    public $notes;

    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Create new invoice
     */
    public function create() {
        $query = "INSERT INTO " . $this->table_name . "
                  SET user_id = :user_id,
                      client_id = :client_id,
                      invoice_number = :invoice_number,
                      issue_date = :issue_date,
                      due_date = :due_date,
                      subtotal = :subtotal,
                      tax_rate = :tax_rate,
                      tax_amount = :tax_amount,
                      total = :total,
                      status = :status,
                      notes = :notes";

        $stmt = $this->conn->prepare($query);

        // Sanitize
        $this->invoice_number = htmlspecialchars(strip_tags($this->invoice_number));
        $this->notes = htmlspecialchars(strip_tags($this->notes));

        // Bind
        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->bindParam(":client_id", $this->client_id);
        $stmt->bindParam(":invoice_number", $this->invoice_number);
        $stmt->bindParam(":issue_date", $this->issue_date);
        $stmt->bindParam(":due_date", $this->due_date);
        $stmt->bindParam(":subtotal", $this->subtotal);
        $stmt->bindParam(":tax_rate", $this->tax_rate);
        $stmt->bindParam(":tax_amount", $this->tax_amount);
        $stmt->bindParam(":total", $this->total);
        $stmt->bindParam(":status", $this->status);
        $stmt->bindParam(":notes", $this->notes);

        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }

        return false;
    }

    /**
     * Read all invoices for a user
     */
    public function readAll() {
        $query = "SELECT i.*, c.name as client_name, c.company as client_company
                  FROM " . $this->table_name . " i
                  LEFT JOIN clients c ON i.client_id = c.id
                  WHERE i.user_id = :user_id
                  ORDER BY i.created_at DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->execute();

        return $stmt;
    }

    /**
     * Read single invoice
     */
    public function readOne() {
        $query = "SELECT i.*, c.name as client_name, c.email as client_email,
                         c.phone as client_phone, c.address as client_address,
                         c.company as client_company
                  FROM " . $this->table_name . " i
                  LEFT JOIN clients c ON i.client_id = c.id
                  WHERE i.id = :id AND i.user_id = :user_id
                  LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $this->id);
        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            return $stmt->fetch();
        }

        return false;
    }

    /**
     * Update invoice
     */
    public function update() {
        $query = "UPDATE " . $this->table_name . "
                  SET client_id = :client_id,
                      issue_date = :issue_date,
                      due_date = :due_date,
                      subtotal = :subtotal,
                      tax_rate = :tax_rate,
                      tax_amount = :tax_amount,
                      total = :total,
                      status = :status,
                      notes = :notes
                  WHERE id = :id AND user_id = :user_id";

        $stmt = $this->conn->prepare($query);

        // Sanitize
        $this->notes = htmlspecialchars(strip_tags($this->notes));

        // Bind
        $stmt->bindParam(":client_id", $this->client_id);
        $stmt->bindParam(":issue_date", $this->issue_date);
        $stmt->bindParam(":due_date", $this->due_date);
        $stmt->bindParam(":subtotal", $this->subtotal);
        $stmt->bindParam(":tax_rate", $this->tax_rate);
        $stmt->bindParam(":tax_amount", $this->tax_amount);
        $stmt->bindParam(":total", $this->total);
        $stmt->bindParam(":status", $this->status);
        $stmt->bindParam(":notes", $this->notes);
        $stmt->bindParam(":id", $this->id);
        $stmt->bindParam(":user_id", $this->user_id);

        return $stmt->execute();
    }

    /**
     * Update invoice status
     */
    public function updateStatus() {
        $query = "UPDATE " . $this->table_name . "
                  SET status = :status
                  WHERE id = :id AND user_id = :user_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":status", $this->status);
        $stmt->bindParam(":id", $this->id);
        $stmt->bindParam(":user_id", $this->user_id);

        return $stmt->execute();
    }

    /**
     * Delete invoice
     */
    public function delete() {
        $query = "DELETE FROM " . $this->table_name . "
                  WHERE id = :id AND user_id = :user_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $this->id);
        $stmt->bindParam(":user_id", $this->user_id);

        return $stmt->execute();
    }

    /**
     * Update overdue invoices
     */
    public function updateOverdueStatus() {
        $query = "UPDATE " . $this->table_name . "
                  SET status = 'Overdue'
                  WHERE due_date < CURDATE()
                  AND status = 'Pending'
                  AND user_id = :user_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $this->user_id);

        return $stmt->execute();
    }

    /**
     * Generate next invoice number
     */
    public function generateInvoiceNumber() {
        $query = "SELECT MAX(CAST(SUBSTRING(invoice_number, 5) AS UNSIGNED)) as max_num
                  FROM " . $this->table_name . "
                  WHERE user_id = :user_id
                  AND invoice_number LIKE 'INV-%'";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->execute();
        $row = $stmt->fetch();

        $next_num = ($row['max_num'] ?? 0) + 1;
        return 'INV-' . str_pad($next_num, 5, '0', STR_PAD_LEFT);
    }

    /**
     * Read open receivables for a user.
     */
    public function readReceivables($dateFrom = null, $dateTo = null) {
        $query = "SELECT
                    i.id,
                    i.invoice_number,
                    i.issue_date,
                    i.due_date,
                    i.total,
                    i.status,
                    c.id as client_id,
                    c.name as client_name,
                    c.company as client_company,
                    DATEDIFF(CURDATE(), i.due_date) as days_overdue
                  FROM " . $this->table_name . " i
                  LEFT JOIN clients c ON i.client_id = c.id
                  WHERE i.user_id = :user_id
                    AND i.status <> 'Paid'";

        if ($dateFrom) {
            $query .= " AND i.issue_date >= :date_from";
        }

        if ($dateTo) {
            $query .= " AND i.issue_date <= :date_to";
        }

        $query .= " ORDER BY i.due_date ASC, i.total DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':user_id', $this->user_id);

        if ($dateFrom) {
            $stmt->bindParam(':date_from', $dateFrom);
        }

        if ($dateTo) {
            $stmt->bindParam(':date_to', $dateTo);
        }

        $stmt->execute();
        return $stmt;
    }
}
