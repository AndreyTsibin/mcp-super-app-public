<?php
declare(strict_types=1);

const WEBHOOK_URL  = 'URL_ВЕБХУКА_ОТ_ЧЕЛОВЕКА'; // полный URL целиком, как дал заказчик
const MAX_LEN      = 500;
const CURL_TIMEOUT = 10;
const RATE_LIMIT   = 10;   // заявок с одного IP
const RATE_WINDOW  = 3600; // за столько секунд

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

/**
 * IP посетителя. Только REMOTE_ADDR: значение из тела запроса подделывается, а
 * внешний сервис (ipify и подобные) — лишняя точка отказа и утечка посетителя
 * третьей стороне.
 * Появится CDN/прокси — здесь добавляется разбор X-Forwarded-For с белым
 * списком доверенных адресов. БЕЗ белого списка заголовок брать нельзя: его
 * шлёт кто угодно.
 */
function clientIp(): string {
    return isset($_SERVER['REMOTE_ADDR']) ? (string)$_SERVER['REMOTE_ADDR'] : '';
}

/**
 * Рейт-лимит по IP. Ключ хранения — sha1(IP), не сам адрес; файлы лежат во
 * временной папке (вне вебрута).
 * Fails open: не завелось хранилище — заявка всё равно уходит. Спам-защита не
 * должна стоить живого лида.
 */
function rateLimited(string $ip): bool {
    if ($ip === '') return false;
    $dir  = sys_get_temp_dir() . '/lead-rate';
    $file = $dir . '/' . sha1($ip);
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) return false;

    $now  = time();
    $hits = [];
    if (is_file($file)) {
        $raw = @file_get_contents($file);
        if ($raw !== false && $raw !== '') {
            foreach (explode(',', $raw) as $stamp) {
                $stamp = (int)$stamp;
                if ($stamp > $now - RATE_WINDOW) $hits[] = $stamp;
            }
        }
    }
    if (count($hits) >= RATE_LIMIT) return true;

    $hits[] = $now;
    @file_put_contents($file, implode(',', $hits), LOCK_EX);
    return false;
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
// После валидации: боты, отсеянные honeypot'ом, лимит не съедают.
if (rateLimited(clientIp())) {
    respond(429, ['error' => 'rate_limited']);
}

$payload = [
    'Phone'         => $phone,
    'Name'          => clean('Name'),
    'Message'       => clean('Message'),
    'form_id'       => clean('form_id'),
    'page_url'      => clean('page_url'),
    'formname'      => clean('form_id') !== '' ? clean('form_id') : 'callback',
    'ip'            => clientIp(),
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
