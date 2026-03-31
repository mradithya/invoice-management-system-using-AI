<?php
/**
 * Authentication Utility
 * Handle session-based authentication
 */

class Auth {
    /**
     * Start session if not already started
     */
    public static function initSession() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }

    /**
     * Login user
     */
    public static function login($user_id, $user_data) {
        self::initSession();
        $_SESSION['user_id'] = $user_id;
        $_SESSION['user_email'] = $user_data['email'];
        $_SESSION['user_name'] = $user_data['name'];
        $_SESSION['user_role'] = $user_data['role'] ?? 'staff';
        $_SESSION['logged_in'] = true;
    }

    /**
     * Logout user
     */
    public static function logout() {
        self::initSession();
        session_unset();
        session_destroy();
    }

    /**
     * Check if user is logged in
     */
    public static function isLoggedIn() {
        self::initSession();
        return isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true;
    }

    /**
     * Get current user ID
     */
    public static function getUserId() {
        self::initSession();
        return $_SESSION['user_id'] ?? null;
    }

    /**
     * Get current user role
     */
    public static function getUserRole() {
        self::initSession();
        return $_SESSION['user_role'] ?? 'staff';
    }

    /**
     * Get current user profile
     */
    public static function getCurrentUser() {
        self::initSession();
        return [
            'user_id' => $_SESSION['user_id'] ?? null,
            'email' => $_SESSION['user_email'] ?? null,
            'full_name' => $_SESSION['user_name'] ?? null,
            'role' => $_SESSION['user_role'] ?? 'staff'
        ];
    }

    /**
     * Require authentication
     */
    public static function requireAuth() {
        if (!self::isLoggedIn()) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized. Please login.']);
            exit();
        }
    }

    /**
     * Require specific user role
     */
    public static function requireRole($role) {
        self::requireAuth();

        if (self::getUserRole() !== $role) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden. Insufficient permissions.']);
            exit();
        }
    }
}
