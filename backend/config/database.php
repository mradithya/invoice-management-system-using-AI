<?php
/**
 * Database Configuration
 * XAMPP Compatible - MySQL Connection
 */

class Database {
    private $host = "localhost";
    private $db_name = "invoice_management_ai";
    private $username = "root";
    private $password = "";
    public $conn;
    private static $schemaEnsured = false;

    /**
     * Get database connection
     */
    public function getConnection() {
        $this->conn = null;

        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name,
                $this->username,
                $this->password
            );
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            $this->conn->exec("set names utf8mb4");

            if (!self::$schemaEnsured) {
                $this->ensureExtendedSchema();
                self::$schemaEnsured = true;
            }
        } catch(PDOException $exception) {
            error_log("Database connection error: " . $exception->getMessage());
        }

        return $this->conn;
    }

    private function ensureExtendedSchema() {
        if ($this->columnExists('users', 'role') === false) {
            $this->conn->exec("ALTER TABLE users ADD COLUMN role ENUM('admin', 'staff') NOT NULL DEFAULT 'staff' AFTER password_hash");
        }

        if ($this->columnExists('users', 'profile_photo') === false) {
            $this->conn->exec("ALTER TABLE users ADD COLUMN profile_photo LONGTEXT NULL");
        }

        $this->conn->exec("UPDATE users SET role = 'admin' WHERE email = 'admin@example.com'");

        $this->conn->exec("CREATE TABLE IF NOT EXISTS audit_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            action VARCHAR(120) NOT NULL,
            entity_type VARCHAR(80) NOT NULL,
            entity_id VARCHAR(80) NULL,
            details TEXT NULL,
            ip_address VARCHAR(45) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user_id (user_id),
            INDEX idx_entity_type (entity_type),
            INDEX idx_created_at (created_at),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $this->conn->exec("CREATE TABLE IF NOT EXISTS recurring_invoices (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            client_id INT NOT NULL,
            template_name VARCHAR(150) NOT NULL,
            items_json LONGTEXT NOT NULL,
            tax_rate DECIMAL(5,2) DEFAULT 0.00,
            notes TEXT NULL,
            frequency ENUM('hourly', 'weekly', 'monthly', 'quarterly') NOT NULL DEFAULT 'monthly',
            interval_hours INT NOT NULL DEFAULT 1,
            due_after_days INT NOT NULL DEFAULT 15,
            next_run_date DATETIME NOT NULL,
            last_run_date DATETIME NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_user_id (user_id),
            INDEX idx_next_run (next_run_date),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        if ($this->columnExists('recurring_invoices', 'interval_hours') === false) {
            $this->conn->exec("ALTER TABLE recurring_invoices ADD COLUMN interval_hours INT NOT NULL DEFAULT 1 AFTER frequency");
        }

        $this->conn->exec("ALTER TABLE recurring_invoices MODIFY COLUMN frequency ENUM('hourly', 'weekly', 'monthly', 'quarterly') NOT NULL DEFAULT 'monthly'");

        if ($this->columnTypeContains('recurring_invoices', 'next_run_date', 'date')) {
            $this->conn->exec("ALTER TABLE recurring_invoices MODIFY COLUMN next_run_date DATETIME NOT NULL");
            $this->conn->exec("UPDATE recurring_invoices SET next_run_date = CONCAT(DATE(next_run_date), ' 00:00:00') WHERE next_run_date IS NOT NULL");
        }

        if ($this->columnTypeContains('recurring_invoices', 'last_run_date', 'date')) {
            $this->conn->exec("ALTER TABLE recurring_invoices MODIFY COLUMN last_run_date DATETIME NULL");
            $this->conn->exec("UPDATE recurring_invoices SET last_run_date = CONCAT(DATE(last_run_date), ' 00:00:00') WHERE last_run_date IS NOT NULL");
        }
    }

    private function columnExists($table, $column) {
        $query = "SELECT COUNT(*) AS count_col
                  FROM information_schema.COLUMNS
                  WHERE TABLE_SCHEMA = :schema_name
                  AND TABLE_NAME = :table_name
                  AND COLUMN_NAME = :column_name";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':schema_name', $this->db_name);
        $stmt->bindParam(':table_name', $table);
        $stmt->bindParam(':column_name', $column);
        $stmt->execute();
        $row = $stmt->fetch();
        return intval($row['count_col'] ?? 0) > 0;
    }

    private function columnTypeContains($table, $column, $needle) {
        $query = "SELECT DATA_TYPE AS data_type
                  FROM information_schema.COLUMNS
                  WHERE TABLE_SCHEMA = :schema_name
                  AND TABLE_NAME = :table_name
                  AND COLUMN_NAME = :column_name
                  LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':schema_name', $this->db_name);
        $stmt->bindParam(':table_name', $table);
        $stmt->bindParam(':column_name', $column);
        $stmt->execute();
        $row = $stmt->fetch();
        $type = strtolower(strval($row['data_type'] ?? ''));
        return $type !== '' && strpos($type, strtolower($needle)) !== false;
    }
}
