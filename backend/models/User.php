<?php
/**
 * User Model
 * Handles user authentication and management
 */

class User {
    private $conn;
    private $table_name = "users";
    private $legacy_admin_hash = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

    public $id;
    public $full_name;
    public $email;
    public $password;
    public $password_hash;
    public $role;
    public $profile_photo;

    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Register new user
     */
    public function register() {
        $role = $this->role ?? 'staff';

        $query = "INSERT INTO " . $this->table_name . "
                  SET full_name = :full_name,
                      email = :email,
                      password_hash = :password_hash,
                      role = :role";

        $stmt = $this->conn->prepare($query);

        // Sanitize inputs
        $this->full_name = htmlspecialchars(strip_tags($this->full_name));
        $this->email = htmlspecialchars(strip_tags($this->email));
        $this->password_hash = password_hash($this->password, PASSWORD_BCRYPT);

        // Bind values
        $stmt->bindParam(":full_name", $this->full_name);
        $stmt->bindParam(":email", $this->email);
        $stmt->bindParam(":password_hash", $this->password_hash);
        $stmt->bindParam(":role", $role);

        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }

        return false;
    }

    /**
     * Login user
     */
    public function login() {
        $query = "SELECT id, full_name, email, password_hash, role, profile_photo
                  FROM " . $this->table_name . "
                  WHERE email = :email
                  LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $this->email = htmlspecialchars(strip_tags($this->email));
        $stmt->bindParam(":email", $this->email);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $row = $stmt->fetch();

            if (password_verify($this->password, $row['password_hash'])) {
                $this->id = $row['id'];
                $this->full_name = $row['full_name'];
                $this->email = $row['email'];
                $this->role = $row['role'] ?? 'staff';
                $this->profile_photo = $row['profile_photo'] ?? null;
                return true;
            }

            // Backward compatibility for older seed data where the admin hash
            // did not match the documented default password.
            if ($this->tryMigrateLegacyAdminPassword($row)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Allow one-time login for legacy seeded admin account and upgrade hash.
     */
    private function tryMigrateLegacyAdminPassword($row) {
        if ($row['email'] !== 'admin@example.com') {
            return false;
        }

        if ($this->password !== 'admin123') {
            return false;
        }

        if (!hash_equals($this->legacy_admin_hash, $row['password_hash'])) {
            return false;
        }

        $new_hash = password_hash('admin123', PASSWORD_BCRYPT);
        $update_query = "UPDATE " . $this->table_name . "
                         SET password_hash = :password_hash
                         WHERE id = :id";
        $update_stmt = $this->conn->prepare($update_query);
        $update_stmt->bindParam(':password_hash', $new_hash);
        $update_stmt->bindParam(':id', $row['id']);

        if (!$update_stmt->execute()) {
            return false;
        }

        $this->id = $row['id'];
        $this->full_name = $row['full_name'];
        $this->email = $row['email'];
        $this->role = $row['role'] ?? 'staff';
        $this->profile_photo = $row['profile_photo'] ?? null;
        return true;
    }

    /**
     * Check if email exists
     */
    public function emailExists() {
        $query = "SELECT id FROM " . $this->table_name . "
                  WHERE email = :email
                  LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $this->email = htmlspecialchars(strip_tags($this->email));
        $stmt->bindParam(":email", $this->email);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }

    /**
     * Get user by ID
     */
    public function getById() {
        $query = "SELECT id, full_name, email, created_at, role, profile_photo
                  FROM " . $this->table_name . "
                  WHERE id = :id
                  LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $this->id);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $row = $stmt->fetch();
            $this->id = $row['id'];
            $this->full_name = $row['full_name'];
            $this->email = $row['email'];
            $this->role = $row['role'] ?? 'staff';
            $this->profile_photo = $row['profile_photo'] ?? null;
            return true;
        }

        return false;
    }

    /**
     * Read all users (for admin)
     */
    public function readAll() {
        $query = "SELECT id, full_name, email, role, created_at
                  FROM " . $this->table_name . "
                  ORDER BY created_at DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }

    /**
     * Update a user's role
     */
    public function updateRole() {
        $query = "UPDATE " . $this->table_name . "
                  SET role = :role
                  WHERE id = :id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':role', $this->role);
        $stmt->bindParam(':id', $this->id);
        return $stmt->execute();
    }

    /**
     * Update a user's own profile (full name and profile photo)
     */
    public function updateProfile() {
        $query = "UPDATE " . $this->table_name . "
                  SET full_name = :full_name,
                      profile_photo = :profile_photo
                  WHERE id = :id";

        $stmt = $this->conn->prepare($query);

        $this->full_name = htmlspecialchars(strip_tags($this->full_name));

        $stmt->bindParam(':full_name', $this->full_name);
        $stmt->bindParam(':id', $this->id);

        if ($this->profile_photo === null || $this->profile_photo === '') {
            $stmt->bindValue(':profile_photo', null, PDO::PARAM_NULL);
        } else {
            $stmt->bindParam(':profile_photo', $this->profile_photo);
        }

        return $stmt->execute();
    }
}
