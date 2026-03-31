<?php
/**
 * Invoice Item Model
 * Handles invoice line items
 */

class InvoiceItem {
    private $conn;
    private $table_name = "invoice_items";

    public $id;
    public $invoice_id;
    public $description;
    public $quantity;
    public $unit_price;
    public $total;

    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Create invoice item
     */
    public function create() {
        $query = "INSERT INTO " . $this->table_name . "
                  SET invoice_id = :invoice_id,
                      description = :description,
                      quantity = :quantity,
                      unit_price = :unit_price,
                      total = :total";

        $stmt = $this->conn->prepare($query);

        // Sanitize
        $this->description = htmlspecialchars(strip_tags($this->description));

        // Bind
        $stmt->bindParam(":invoice_id", $this->invoice_id);
        $stmt->bindParam(":description", $this->description);
        $stmt->bindParam(":quantity", $this->quantity);
        $stmt->bindParam(":unit_price", $this->unit_price);
        $stmt->bindParam(":total", $this->total);

        return $stmt->execute();
    }

    /**
     * Read all items for an invoice
     */
    public function readByInvoice() {
        $query = "SELECT * FROM " . $this->table_name . "
                  WHERE invoice_id = :invoice_id
                  ORDER BY id ASC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":invoice_id", $this->invoice_id);
        $stmt->execute();

        return $stmt;
    }

    /**
     * Delete all items for an invoice
     */
    public function deleteByInvoice() {
        $query = "DELETE FROM " . $this->table_name . "
                  WHERE invoice_id = :invoice_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":invoice_id", $this->invoice_id);

        return $stmt->execute();
    }
}
