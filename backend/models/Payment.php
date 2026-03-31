<?php
/**
 * Payment Model
 * Handles payment tracking
 */

class Payment {
    private $conn;
    private $table_name = "payments";

    public $id;
    public $invoice_id;
    public $amount;
    public $payment_date;
    public $payment_method;
    public $reference_number;
    public $notes;

    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Create payment
     */
    public function create() {
        $query = "INSERT INTO " . $this->table_name . "
                  SET invoice_id = :invoice_id,
                      amount = :amount,
                      payment_date = :payment_date,
                      payment_method = :payment_method,
                      reference_number = :reference_number,
                      notes = :notes";

        $stmt = $this->conn->prepare($query);

        // Sanitize
        $this->reference_number = htmlspecialchars(strip_tags($this->reference_number));
        $this->notes = htmlspecialchars(strip_tags($this->notes));

        // Bind
        $stmt->bindParam(":invoice_id", $this->invoice_id);
        $stmt->bindParam(":amount", $this->amount);
        $stmt->bindParam(":payment_date", $this->payment_date);
        $stmt->bindParam(":payment_method", $this->payment_method);
        $stmt->bindParam(":reference_number", $this->reference_number);
        $stmt->bindParam(":notes", $this->notes);

        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }

        return false;
    }

    /**
     * Read all payments for an invoice
     */
    public function readByInvoice() {
        $query = "SELECT * FROM " . $this->table_name . "
                  WHERE invoice_id = :invoice_id
                  ORDER BY payment_date DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":invoice_id", $this->invoice_id);
        $stmt->execute();

        return $stmt;
    }

    /**
     * Get total paid amount for an invoice
     */
    public function getTotalPaid() {
        $query = "SELECT COALESCE(SUM(amount), 0) as total_paid
                  FROM " . $this->table_name . "
                  WHERE invoice_id = :invoice_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":invoice_id", $this->invoice_id);
        $stmt->execute();

        $row = $stmt->fetch();
        return $row['total_paid'];
    }

    /**
     * Delete payment
     */
    public function delete() {
        $query = "DELETE FROM " . $this->table_name . "
                  WHERE id = :id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $this->id);

        return $stmt->execute();
    }
}
