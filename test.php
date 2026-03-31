<?php
require_once 'backend/config/database.php';
$database = new Database();
$conn = $database->getConnection();
if($conn){
    echo "Database connected successfully!";
} else {
    echo "Connection failed!";
}
?>