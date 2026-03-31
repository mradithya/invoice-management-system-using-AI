<?php
/**
 * Mailer Utility
 */

class Mailer {
    public static function send($to, $subject, $body, $attachments = []) {
        $smtpHost = trim((string) getenv('MAIL_HOST'));
        $smtpPort = (int) (getenv('MAIL_PORT') ?: 587);
        $smtpUsername = (string) (getenv('MAIL_USERNAME') ?: '');
        $smtpPassword = (string) (getenv('MAIL_PASSWORD') ?: '');
        $smtpEncryption = strtolower(trim((string) (getenv('MAIL_ENCRYPTION') ?: 'tls')));
        $mailFrom = trim((string) (getenv('MAIL_FROM') ?: 'no-reply@invoice-management.local'));
        $mime = self::buildMimeMessage($mailFrom, $to, $subject, $body, $attachments);

        if ($smtpHost !== '') {
            $smtpResult = self::sendViaSmtp([
                'host' => $smtpHost,
                'port' => $smtpPort,
                'username' => $smtpUsername,
                'password' => $smtpPassword,
                'encryption' => $smtpEncryption,
                'from' => $mailFrom
            ], $mime['smtp_data']);

            if ($smtpResult['success']) {
                return $smtpResult;
            }

            return [
                'success' => false,
                'mode' => 'smtp',
                'error' => $smtpResult['error'] ?? 'SMTP send failed'
            ];
        }

        if (function_exists('mail') && @mail($to, $subject, $mime['mail_body'], $mime['mail_headers'])) {
            return ['success' => true, 'mode' => 'php_mail'];
        }

        return [
            'success' => false,
            'mode' => 'none',
            'error' => 'Mail transport is not configured. Set MAIL_HOST/MAIL_PORT/MAIL_USERNAME/MAIL_PASSWORD environment variables or configure PHP mail() in XAMPP.'
        ];
    }

    private static function sendViaSmtp($config, $smtpData) {
        $scheme = ($config['encryption'] === 'ssl') ? 'ssl://' : '';
        $host = $scheme . $config['host'];
        $port = (int) $config['port'];

        $socket = @stream_socket_client($host . ':' . $port, $errno, $errstr, 20);
        if (!$socket) {
            return ['success' => false, 'error' => "SMTP connection failed: {$errstr} ({$errno})"];
        }

        stream_set_timeout($socket, 20);

        try {
            self::smtpExpect($socket, [220]);
            self::smtpCommand($socket, 'EHLO localhost', [250]);

            if ($config['encryption'] === 'tls') {
                self::smtpCommand($socket, 'STARTTLS', [220]);
                $cryptoEnabled = @stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
                if (!$cryptoEnabled) {
                    throw new Exception('Could not enable TLS encryption for SMTP connection');
                }
                self::smtpCommand($socket, 'EHLO localhost', [250]);
            }

            if (!empty($config['username'])) {
                self::smtpCommand($socket, 'AUTH LOGIN', [334]);
                self::smtpCommand($socket, base64_encode($config['username']), [334]);
                self::smtpCommand($socket, base64_encode($config['password']), [235]);
            }

            $recipients = self::extractRecipients($smtpData);
            if (empty($recipients)) {
                throw new Exception('No recipient found for SMTP message');
            }

            self::smtpCommand($socket, 'MAIL FROM:<' . $config['from'] . '>', [250]);
            foreach ($recipients as $recipient) {
                self::smtpCommand($socket, 'RCPT TO:<' . $recipient . '>', [250, 251]);
            }
            self::smtpCommand($socket, 'DATA', [354]);

            $normalized = str_replace(["\r\n", "\r"], "\n", $smtpData);
            $normalized = str_replace("\n.", "\n..", $normalized);
            $payload = str_replace("\n", "\r\n", $normalized);

            fwrite($socket, $payload . "\r\n.\r\n");
            self::smtpExpect($socket, [250]);
            self::smtpCommand($socket, 'QUIT', [221]);
            fclose($socket);

            return ['success' => true, 'mode' => 'smtp'];
        } catch (Exception $e) {
            @fwrite($socket, "QUIT\r\n");
            @fclose($socket);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    private static function smtpCommand($socket, $command, $expectedCodes) {
        fwrite($socket, $command . "\r\n");
        self::smtpExpect($socket, $expectedCodes);
    }

    private static function smtpExpect($socket, $expectedCodes) {
        $response = '';

        while (($line = fgets($socket, 515)) !== false) {
            $response .= $line;
            if (strlen($line) < 4 || $line[3] !== '-') {
                break;
            }
        }

        if ($response === '') {
            throw new Exception('SMTP server did not respond');
        }

        $code = (int) substr($response, 0, 3);
        if (!in_array($code, $expectedCodes, true)) {
            throw new Exception('SMTP error: ' . trim($response));
        }
    }

    private static function buildMimeMessage($from, $to, $subject, $body, $attachments) {
        $safeFrom = trim((string) $from);
        $safeTo = trim((string) $to);
        $safeSubject = trim((string) $subject);
        $safeBody = str_replace(["\r\n", "\r"], "\n", (string) $body);
        $attachments = self::normalizeAttachments($attachments);

        if (empty($attachments)) {
            $mailHeaders = [];
            $mailHeaders[] = 'MIME-Version: 1.0';
            $mailHeaders[] = 'Content-Type: text/plain; charset=UTF-8';
            $mailHeaders[] = 'From: ' . $safeFrom;

            $smtpData = [];
            $smtpData[] = 'From: ' . $safeFrom;
            $smtpData[] = 'To: ' . $safeTo;
            $smtpData[] = 'Subject: ' . $safeSubject;
            $smtpData[] = implode("\r\n", $mailHeaders);
            $smtpData[] = '';
            $smtpData[] = $safeBody;

            return [
                'mail_headers' => implode("\r\n", $mailHeaders),
                'mail_body' => str_replace("\n", "\r\n", $safeBody),
                'smtp_data' => implode("\r\n", $smtpData)
            ];
        }

        $boundary = 'invoice_mixed_' . md5((string) microtime(true));

        $mailHeaders = [];
        $mailHeaders[] = 'MIME-Version: 1.0';
        $mailHeaders[] = 'From: ' . $safeFrom;
        $mailHeaders[] = 'Content-Type: multipart/mixed; boundary="' . $boundary . '"';

        $parts = [];
        $parts[] = '--' . $boundary;
        $parts[] = 'Content-Type: text/plain; charset=UTF-8';
        $parts[] = 'Content-Transfer-Encoding: 8bit';
        $parts[] = '';
        $parts[] = $safeBody;

        foreach ($attachments as $attachment) {
            $parts[] = '--' . $boundary;
            $parts[] = 'Content-Type: ' . $attachment['mime'] . '; name="' . $attachment['filename'] . '"';
            $parts[] = 'Content-Transfer-Encoding: base64';
            $parts[] = 'Content-Disposition: attachment; filename="' . $attachment['filename'] . '"';
            $parts[] = '';
            $parts[] = chunk_split(base64_encode($attachment['content']), 76, "\r\n");
        }

        $parts[] = '--' . $boundary . '--';
        $parts[] = '';

        $mailBody = implode("\r\n", $parts);

        $smtpData = [];
        $smtpData[] = 'From: ' . $safeFrom;
        $smtpData[] = 'To: ' . $safeTo;
        $smtpData[] = 'Subject: ' . $safeSubject;
        $smtpData[] = implode("\r\n", $mailHeaders);
        $smtpData[] = '';
        $smtpData[] = $mailBody;

        return [
            'mail_headers' => implode("\r\n", $mailHeaders),
            'mail_body' => $mailBody,
            'smtp_data' => implode("\r\n", $smtpData)
        ];
    }

    private static function normalizeAttachments($attachments) {
        if (!is_array($attachments)) {
            return [];
        }

        $normalized = [];
        foreach ($attachments as $attachment) {
            if (!is_array($attachment)) {
                continue;
            }

            $filename = trim((string) ($attachment['filename'] ?? 'attachment.bin'));
            $mime = trim((string) ($attachment['mime'] ?? 'application/octet-stream'));
            $content = $attachment['content'] ?? '';

            if ($filename === '') {
                $filename = 'attachment.bin';
            }
            if ($mime === '') {
                $mime = 'application/octet-stream';
            }
            if (!is_string($content) || $content === '') {
                continue;
            }

            $normalized[] = [
                'filename' => str_replace(['"', "\r", "\n"], '', $filename),
                'mime' => str_replace(['"', "\r", "\n"], '', $mime),
                'content' => $content
            ];
        }

        return $normalized;
    }

    private static function extractRecipients($smtpData) {
        $matches = [];
        if (!preg_match('/^To:\s*(.+)$/mi', $smtpData, $matches)) {
            return [];
        }

        $raw = trim($matches[1]);
        if ($raw === '') {
            return [];
        }

        $parts = array_map('trim', explode(',', $raw));
        $recipients = [];
        foreach ($parts as $part) {
            if ($part === '') {
                continue;
            }
            if (preg_match('/<([^>]+)>/', $part, $addrMatch)) {
                $part = trim($addrMatch[1]);
            }
            $recipients[] = $part;
        }

        return $recipients;
    }
}
