<?php
/**
 * Profile API Endpoints (current user)
 * GET /api/profile.php - Get current user's profile
 * PUT /api/profile.php - Update current user's profile
 */

require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../models/User.php';
require_once '../utils/Auth.php';
require_once '../utils/Response.php';
require_once '../utils/AuditLogger.php';

Auth::requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$database = new Database();
$db = $database->getConnection();

$user = new User($db);
$user->id = Auth::getUserId();

switch ($method) {
    case 'GET':
        if (!$user->getById()) {
            Response::notFound('User not found');
        }

        Response::success([
            'user_id' => $user->id,
            'full_name' => $user->full_name,
            'email' => $user->email,
            'role' => $user->role,
            'profile_photo' => $user->profile_photo
        ]);
        break;

    case 'POST':
        if (!$user->getById()) {
            Response::notFound('User not found');
        }

        $full_name = isset($_POST['full_name']) ? trim(strval($_POST['full_name'])) : '';
        if ($full_name === '') {
            Response::validationError(['full_name is required']);
        }

        $profile_photo = $user->profile_photo;

        if (isset($_FILES['profile_photo']) && $_FILES['profile_photo']['error'] !== UPLOAD_ERR_NO_FILE) {
            $photo = $_FILES['profile_photo'];

            if ($photo['error'] !== UPLOAD_ERR_OK) {
                Response::validationError(['profile_photo upload failed']);
            }

            $max_bytes = 2 * 1024 * 1024;
            if (!isset($photo['size']) || intval($photo['size']) <= 0 || intval($photo['size']) > $max_bytes) {
                Response::validationError(['profile_photo must be between 1 byte and 2MB']);
            }

            $allowed_types = [
                'image/png' => 'png',
                'image/jpeg' => 'jpg',
                'image/webp' => 'webp',
                'image/gif' => 'gif'
            ];

            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mime_type = $finfo ? finfo_file($finfo, $photo['tmp_name']) : false;
            if ($finfo) {
                finfo_close($finfo);
            }

            if (!$mime_type || !isset($allowed_types[$mime_type])) {
                Response::validationError(['profile_photo must be png, jpg, webp, or gif']);
            }

            $upload_dir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'profile';
            if (!is_dir($upload_dir) && !mkdir($upload_dir, 0755, true)) {
                Response::serverError('Failed to prepare upload directory');
            }

            try {
                $file_name = 'user_' . strval($user->id) . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $allowed_types[$mime_type];
            } catch (Exception $e) {
                $file_name = 'user_' . strval($user->id) . '_' . time() . '_' . mt_rand(1000, 9999) . '.' . $allowed_types[$mime_type];
            }

            $target_path = $upload_dir . DIRECTORY_SEPARATOR . $file_name;
            if (!move_uploaded_file($photo['tmp_name'], $target_path)) {
                Response::serverError('Failed to save uploaded file');
            }

            // Best effort cleanup for previous local profile image.
            if (is_string($user->profile_photo) && strpos($user->profile_photo, '/backend/uploads/profile/') !== false) {
                $old_name = basename(parse_url($user->profile_photo, PHP_URL_PATH));
                if ($old_name && $old_name !== $file_name) {
                    $old_path = $upload_dir . DIRECTORY_SEPARATOR . $old_name;
                    if (is_file($old_path)) {
                        @unlink($old_path);
                    }
                }
            }

            $profile_photo = '/invoice-management/backend/uploads/profile/' . $file_name;
        }

        $user->full_name = $full_name;
        $user->profile_photo = $profile_photo;

        if ($user->updateProfile()) {
            Auth::initSession();
            $_SESSION['user_name'] = $user->full_name;

            AuditLogger::log($db, $user->id, 'update_profile', 'user', strval($user->id), [
                'updated_fields' => ['full_name', 'profile_photo']
            ]);

            Response::success([
                'user_id' => $user->id,
                'full_name' => $user->full_name,
                'email' => $user->email,
                'role' => $user->role,
                'profile_photo' => $user->profile_photo
            ], 'Profile updated successfully');
        }

        Response::serverError('Failed to update profile');
        break;

    case 'PUT':
        if (!$user->getById()) {
            Response::notFound('User not found');
        }

        $payload = json_decode(file_get_contents('php://input'));
        if (!is_object($payload)) {
            Response::validationError(['Invalid JSON payload']);
        }

        $full_name = isset($payload->full_name) ? trim(strval($payload->full_name)) : '';
        if ($full_name === '') {
            Response::validationError(['full_name is required']);
        }

        $profile_photo = property_exists($payload, 'profile_photo') ? $payload->profile_photo : $user->profile_photo;
        if ($profile_photo === '') {
            $profile_photo = null;
        }

        if ($profile_photo !== null) {
            if (!is_string($profile_photo)) {
                Response::validationError(['profile_photo must be a string or null']);
            }

            if (strlen($profile_photo) > 3000000) {
                Response::validationError(['profile_photo is too large']);
            }

            $is_base64_data_url = preg_match('/^data:image\/(png|jpeg|jpg|webp|gif);base64,/', $profile_photo);
            $is_local_upload_url = preg_match('/^\/invoice-management\/backend\/uploads\/profile\//', $profile_photo);
            $is_http_url = preg_match('/^https?:\/\//', $profile_photo);

            if (!$is_base64_data_url && !$is_local_upload_url && !$is_http_url) {
                Response::validationError(['profile_photo must be a base64 data URL, local upload URL, or http(s) URL']);
            }
        }

        $user->full_name = $full_name;
        $user->profile_photo = $profile_photo;

        if ($user->updateProfile()) {
            Auth::initSession();
            $_SESSION['user_name'] = $user->full_name;

            AuditLogger::log($db, $user->id, 'update_profile', 'user', strval($user->id), [
                'updated_fields' => ['full_name', 'profile_photo']
            ]);

            Response::success([
                'user_id' => $user->id,
                'full_name' => $user->full_name,
                'email' => $user->email,
                'role' => $user->role,
                'profile_photo' => $user->profile_photo
            ], 'Profile updated successfully');
        }

        Response::serverError('Failed to update profile');
        break;

    default:
        Response::error('Method not allowed', 405);
}
