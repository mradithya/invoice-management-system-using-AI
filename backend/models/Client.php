<?php
/**
 * Client Model
 * Handles client CRUD operations
 */

class Client {
    private $conn;
    private $table_name = "clients";

    public $id;
    public $user_id;
    public $name;
    public $email;
    public $phone;
    public $address;
    public $company;

    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Create new client
     */
    public function create() {
        $query = "INSERT INTO " . $this->table_name . "
                  SET user_id = :user_id,
                      name = :name,
                      email = :email,
                      phone = :phone,
                      address = :address,
                      company = :company";

        $stmt = $this->conn->prepare($query);

        // Sanitize
        $this->name = htmlspecialchars(strip_tags($this->name));
        $this->email = htmlspecialchars(strip_tags($this->email));
        $this->phone = htmlspecialchars(strip_tags($this->phone));
        $this->address = htmlspecialchars(strip_tags($this->address));
        $this->company = htmlspecialchars(strip_tags($this->company));

        // Bind
        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":email", $this->email);
        $stmt->bindParam(":phone", $this->phone);
        $stmt->bindParam(":address", $this->address);
        $stmt->bindParam(":company", $this->company);

        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }

        return false;
    }

    /**
     * Read all clients for a user
     */
    public function readAll() {
        $query = "SELECT * FROM " . $this->table_name . "
                  WHERE user_id = :user_id
                  ORDER BY name ASC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->execute();

        return $stmt;
    }

    /**
     * Read single client
     */
    public function readOne() {
        $query = "SELECT * FROM " . $this->table_name . "
                  WHERE id = :id AND user_id = :user_id
                  LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $this->id);
        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $row = $stmt->fetch();
            $this->name = $row['name'];
            $this->email = $row['email'];
            $this->phone = $row['phone'];
            $this->address = $row['address'];
            $this->company = $row['company'];
            return true;
        }

        return false;
    }

    /**
     * Update client
     */
    public function update() {
        $query = "UPDATE " . $this->table_name . "
                  SET name = :name,
                      email = :email,
                      phone = :phone,
                      address = :address,
                      company = :company
                  WHERE id = :id AND user_id = :user_id";

        $stmt = $this->conn->prepare($query);

        // Sanitize
        $this->name = htmlspecialchars(strip_tags($this->name));
        $this->email = htmlspecialchars(strip_tags($this->email));
        $this->phone = htmlspecialchars(strip_tags($this->phone));
        $this->address = htmlspecialchars(strip_tags($this->address));
        $this->company = htmlspecialchars(strip_tags($this->company));

        // Bind
        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":email", $this->email);
        $stmt->bindParam(":phone", $this->phone);
        $stmt->bindParam(":address", $this->address);
        $stmt->bindParam(":company", $this->company);
        $stmt->bindParam(":id", $this->id);
        $stmt->bindParam(":user_id", $this->user_id);

        return $stmt->execute();
    }

    /**
     * Delete client
     */
    public function delete() {
        $query = "DELETE FROM " . $this->table_name . "
                  WHERE id = :id AND user_id = :user_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $this->id);
        $stmt->bindParam(":user_id", $this->user_id);

        return $stmt->execute();
    }
}
