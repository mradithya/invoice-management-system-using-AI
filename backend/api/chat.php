<?php
/**
 * AI Chat API
 * POST /api/chat.php
 */

require_once '../config/cors.php';
require_once '../utils/Auth.php';
require_once '../utils/Response.php';

Auth::requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!is_array($data)) {
    Response::validationError(['Invalid JSON payload']);
}

$message = trim(strval($data['message'] ?? ''));
$history = $data['history'] ?? [];
$context = $data['context'] ?? [];

if ($message === '') {
    Response::validationError(['message is required']);
}

$apiKey = getenv('OPENAI_API_KEY');
$baseUrl = rtrim(getenv('OPENAI_BASE_URL') ?: 'https://api.openai.com/v1', '/');

// If Gemini host is provided without OpenAI-compatible path, normalize it.
if (strpos($baseUrl, 'generativelanguage.googleapis.com') !== false && strpos($baseUrl, '/openai') === false) {
    $baseUrl = rtrim($baseUrl, '/') . '/v1beta/openai';
}

$defaultModel = (strpos($baseUrl, 'generativelanguage.googleapis.com') !== false)
    ? 'gemini-2.0-flash'
    : 'gpt-4o-mini';
$model = getenv('OPENAI_CHAT_MODEL') ?: $defaultModel;

if (!$apiKey) {
    Response::error('AI assistant is not configured. Set OPENAI_API_KEY in your server environment.', 503);
}

$safeHistory = [];
if (is_array($history)) {
    $recentHistory = array_slice($history, -12);
    foreach ($recentHistory as $item) {
        if (!is_array($item)) {
            continue;
        }
        $role = strtolower(strval($item['role'] ?? 'user'));
        $content = trim(strval($item['content'] ?? ''));
        if ($content === '') {
            continue;
        }

        if ($role !== 'user' && $role !== 'assistant') {
            $role = 'user';
        }

        $safeHistory[] = [
            'role' => $role,
            'content' => substr($content, 0, 1500)
        ];
    }
}

$contextText = '';
if (is_array($context) && !empty($context)) {
    $encoded = json_encode($context, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($encoded !== false) {
        $contextText = substr($encoded, 0, 3000);
    }
}

$systemPrompt = "You are an AI assistant inside an invoice-management web app. "
    . "Be conversational and flexible like ChatGPT while staying concise and helpful. "
    . "You can help with invoices, payments, clients, receivables, financial summaries, and general business communication. "
    . "If the user asks for actions that require in-app execution (create invoice, export, follow-up generation), provide clear next phrasing if execution fails. "
    . "Use INR currency format when discussing money for this app. "
    . "If context is provided, use it as factual source and do not invent data.";

$messages = [
    [
        'role' => 'system',
        'content' => $systemPrompt
    ]
];

if ($contextText !== '') {
    $messages[] = [
        'role' => 'system',
        'content' => 'Application context JSON: ' . $contextText
    ];
}

foreach ($safeHistory as $item) {
    $messages[] = $item;
}

$messages[] = [
    'role' => 'user',
    'content' => $message
];

$callProvider = function($selectedModel) use ($baseUrl, $apiKey, $messages) {
    $payload = [
        'model' => $selectedModel,
        'temperature' => 0.4,
        'messages' => $messages
    ];

    $ch = curl_init($baseUrl . '/chat/completions');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_TIMEOUT, 45);

    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($result === false || $curlError) {
        Response::serverError('AI provider request failed: ' . $curlError);
    }

    $parsed = json_decode($result, true);
    if (!is_array($parsed)) {
        Response::serverError('AI provider returned an invalid response');
    }

    return [
        'http_code' => $httpCode,
        'parsed' => $parsed,
        'model' => $selectedModel
    ];
};

$extractProviderError = function($parsed) {
    return $parsed['error']['message']
        ?? $parsed['message']
        ?? $parsed['error']['status']
        ?? (is_string($parsed['error'] ?? null) ? $parsed['error'] : 'AI provider error');
};

$providerResponse = $callProvider($model);
$fallbackModel = trim(strval(getenv('OPENAI_FALLBACK_MODEL') ?: ''));

// Retry with configured fallback model when quota/rate-limited.
if (
    $providerResponse['http_code'] === 429
    && $fallbackModel !== ''
    && $fallbackModel !== $providerResponse['model']
) {
    $providerResponse = $callProvider($fallbackModel);
}

$httpCode = $providerResponse['http_code'];
$parsed = $providerResponse['parsed'];
$usedModel = $providerResponse['model'];

if ($httpCode >= 400) {
    $providerError = $extractProviderError($parsed);

    if ($httpCode === 429) {
        $providerError = 'Quota or rate limit reached on AI provider. Please wait, lower request rate, or switch to a paid tier. ' . $providerError;
    }

    if ($httpCode === 404) {
        $providerError = 'Selected model is not available on this provider endpoint. Set OPENAI_CHAT_MODEL to a valid model for your base URL. ' . $providerError;
    }

    $providerError = $providerError . ' (upstream HTTP ' . $httpCode . ', model: ' . $usedModel . ')';
    Response::error($providerError, 502);
}

$reply = $parsed['choices'][0]['message']['content'] ?? '';
$reply = trim(strval($reply));

if ($reply === '') {
    Response::serverError('AI provider returned an empty reply');
}

Response::success([
    'reply' => $reply,
    'model' => $usedModel
]);
