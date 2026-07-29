<?php
declare(strict_types=1);

const WEBHOOK_URL  = 'URL_ВЕБХУКА_ОТ_ЧЕЛОВЕКА'; // полный URL целиком, как дал заказчик
const MAX_LEN      = 500;
const CURL_TIMEOUT = 10;

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function respond(int $code, array $body): void {
    http_response_code($code);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}
function clean(string $key): string {
    $raw = isset($_POST[$key]) ? (string)$_POST[$key] : '';
    return trim(substr($raw, 0, MAX_LEN));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['error' => 'method_not_allowed']);
}
if (!empty($_SERVER['CONTENT_LENGTH']) && (int)$_SERVER['CONTENT_LENGTH'] > 8192) {
    respond(413, ['error' => 'payload_too_large']);
}
if (clean('website') !== '') {            // honeypot
    respond(200, ['status' => 'ok']);
}
if (clean('consent') === '') {
    respond(400, ['error' => 'consent_required']);
}
$phone  = clean('Phone');
$digits = preg_replace('/\D+/', '', $phone);
if ($digits === '' || strlen($digits) < 11) {
    respond(400, ['error' => 'phone_invalid']);
}

$payload = [
    'Phone'         => $phone,
    'Name'          => clean('Name'),
    'Message'       => clean('Message'),
    'form_id'       => clean('form_id'),
    'page_url'      => clean('page_url'),
    'formname'      => clean('form_id') !== '' ? clean('form_id') : 'callback',
    'ip'            => clean('ip'),
    'origin'        => clean('origin'),
    'kolokol_token' => clean('kolokol_token'),
];

$ch = curl_init(WEBHOOK_URL);
curl_setopt_array($ch, [
    CURLOPT_POST            => true,
    CURLOPT_POSTFIELDS      => http_build_query($payload),
    CURLOPT_RETURNTRANSFER  => true,
    CURLOPT_TIMEOUT         => CURL_TIMEOUT,
    CURLOPT_CONNECTTIMEOUT  => 5,
    CURLOPT_FOLLOWLOCATION  => false,
    CURLOPT_HTTPHEADER      => ['Content-Type: application/x-www-form-urlencoded'],
]);
$response = curl_exec($ch);
$httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
unset($ch);

if ($response === false || $httpCode < 200 || $httpCode >= 300) {
    error_log(sprintf('[send.php] webhook fail: http=%d, curl=%s', $httpCode, $curlError));
    respond(502, ['error' => 'webhook_failed']);
}

respond(200, ['status' => 'ok']);
