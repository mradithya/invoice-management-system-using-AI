<?php
/**
 * Response Utility
 * Standard JSON responses
 */

class Response {
    /**
     * Send success response
     */
    public static function success($data = [], $message = 'Success', $status = 200) {
        http_response_code($status);
        echo json_encode([
            'success' => true,
            'message' => $message,
            'data' => $data
        ]);
        exit();
    }

    /**
     * Send error response
     */
    public static function error($message = 'An error occurred', $status = 400, $errors = []) {
        http_response_code($status);
        echo json_encode([
            'success' => false,
            'message' => $message,
            'errors' => $errors
        ]);
        exit();
    }

    /**
     * Send validation error
     */
    public static function validationError($errors = []) {
        self::error('Validation failed', 422, $errors);
    }

    /**
     * Send not found error
     */
    public static function notFound($message = 'Resource not found') {
        self::error($message, 404);
    }

    /**
     * Send unauthorized error
     */
    public static function unauthorized($message = 'Unauthorized') {
        self::error($message, 401);
    }

    /**
     * Send server error
     */
    public static function serverError($message = 'Internal server error') {
        self::error($message, 500);
    }
}
