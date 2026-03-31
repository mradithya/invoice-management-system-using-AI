<?php
/**
 * Audit Logger Utility
 */

class AuditLogger {
    public static function log($db, $user_id, $action, $entity_type, $entity_id = null, $details = null) {
        try {
            $query = "INSERT INTO audit_logs
                      SET user_id = :user_id,
                          action = :action,
                          entity_type = :entity_type,
                          entity_id = :entity_id,
                          details = :details,
                          ip_address = :ip_address";
            $stmt = $db->prepare($query);
            $ip = $_SERVER['REMOTE_ADDR'] ?? null;
            $details_json = $details ? json_encode($details) : null;

            if ($user_id === null) {
                $stmt->bindValue(':user_id', null, PDO::PARAM_NULL);
            } else {
                $stmt->bindParam(':user_id', $user_id);
            }

            $stmt->bindParam(':action', $action);
            $stmt->bindParam(':entity_type', $entity_type);
            $stmt->bindParam(':entity_id', $entity_id);
            $stmt->bindParam(':details', $details_json);
            $stmt->bindParam(':ip_address', $ip);
            $stmt->execute();
        } catch (Exception $e) {
            // Audit failure should not break business flow.
        }
    }
}
