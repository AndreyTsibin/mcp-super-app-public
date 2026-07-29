# Заявки + коллтрекинг — инструкция для Claude

Настроить на лендинге: форму заявки → `send.php` → вебхук CRM + коллтрекинг (поля `ip`/`origin`/`kolokol_token` в заявку).

## Сначала спроси у человека и дождись ответа

1. **Полный URL вебхука приёма заявок** — целиком, со всеми параметрами, как дал заказчик.
   Не достраивай его сам и не угадывай домен: вставляется в `send.php` ровно как есть.
2. **PHP на хостинге есть?** Нет PHP → см. [конец файла](#если-php-недоступен).
3. **Какие поля собираем** (телефон / имя / сообщение).
4. **Ссылка на политику конфиденциальности.**
5. **Нужен Колокол?** Если да — проси сниппет loader Колокола (свой ID на домен).

## В этом проекте почти всё уже готово

Astro-проект приходит с развёрнутым контрактом заявок:

- `public/send.php` — Шаг 1, лежит на месте;
- `public/assets/lead-form.js` — Шаг 2, подключён в `BaseLayout` с `?v=`;
- `src/components/LeadForm.astro` — Шаг 4 (разметка) + Шаг 3 (стили внутри компонента,
  отдельного `lead-form.css` в Astro-проекте нет);
- `LeadModal.astro` — одна модалка на страницу, уже в `BaseLayout`;
  `LeadFormSection.astro` — открытая форма-секция.

Шаги 1–5 ниже — эталон контракта: сверяйся с ними при правках и используй целиком,
если собираешь заявки на голом HTML (перенос с конструктора, чужой сайт).

## Порядок действий (Astro-проект)

1. Подставь `WEBHOOK_URL` в `public/send.php` ([Шаг 1](#шаг-1-sendphp)).
2. Проверь ссылку на политику: проп `policyHref` (дефолт `/privacy`) у `LeadForm`,
   `LeadModal`, `LeadFormSection`, `Footer`.
3. Убедись, что `data-form` уникален у каждой формы на странице (`popup`, `section`, …) —
   он уходит как `form_id`.
4. Стили формы темизируй свободно: `lead-form.js` цепляется за `name` и `data-*`,
   а не за классы. Разметку и имена полей не трогай ([Шаг 4](#шаг-4-html-формы)).
5. Нужен Колокол → вставь loader в `<head>` `BaseLayout` ([Шаг 6](#шаг-6-колокол)).
6. Проверь ([Шаг 7](#шаг-7-проверка)) — на собранном `npm run build` и живом хостинге,
   `send.php` под dev-сервером Astro не выполняется.

## Контракт полей (регистр критичен)

| Поле | Регистр | Обяз. |
|------|---------|-------|
| `Phone` | Заглавная | да |
| `Name` | Заглавная | нет |
| `Message` | Заглавная | нет |
| `form_id` / `page_url` / `formname` | lowercase | нет |
| `ip` / `origin` / `kolokol_token` | lowercase | нет |

---

## Шаг 1. send.php

В корень сайта (Astro-проект: `public/send.php` → в сборке окажется рядом с
`index.html`). Меняй только `WEBHOOK_URL`.

```php
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
```

---

## Шаг 2. lead-form.js

В `assets/lead-form.js`. Настройка не нужна — сам найдёт `<form data-form>`.

```js
(function () {
  var SUCCESS = 'Спасибо! Заявка отправлена, в ближайшее время мы вам перезвоним.';
  var FAIL = 'Не удалось отправить. Позвоните нам напрямую.';

  var TRACKING_FIELDS = ['ip', 'origin', 'kolokol_token'];

  function getCookie(name) {
    var key = name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1');
    var m = document.cookie.match(new RegExp('(?:^|;\\s*)' + key + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }
  function setCookie(name, value, days) {
    var exp = new Date(Date.now() + (days || 365) * 864e5).toUTCString();
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + exp + '; path=/';
  }
  function initLeadTracking() {
    if (!getCookie('origin')) setCookie('origin', window.location.href);
    if (!getCookie('ip')) {
      fetch('https://api.ipify.org?format=json')
        .then(function (r) { return r.json(); })
        .then(function (d) { if (d && d.ip) setCookie('ip', d.ip); })
        .catch(function () {});
    }
  }

  function reachLeadGoal() {
    var ym = window.ym;
    if (typeof ym !== 'function' || !Array.isArray(ym.a)) return;
    var ids = [];
    ym.a.forEach(function (c) { if (c && c[0] && ids.indexOf(c[0]) === -1) ids.push(c[0]); });
    ids.forEach(function (id) { try { ym(id, 'reachGoal', 'zayavka'); } catch (e) {} });
  }

  function maskPhone(input) {
    function format(v) {
      var d = v.replace(/\D/g, '');
      if (d && d[0] === '8') d = '7' + d.slice(1);
      if (d && d[0] === '9') d = '7' + d;
      d = d.slice(0, 11);
      if (!d) return '';
      var r = '+7';
      if (d.length > 1) r += ' (' + d.slice(1, 4);
      if (d.length >= 4) r += ') ' + d.slice(4, 7);
      if (d.length >= 7) r += '-' + d.slice(7, 9);
      if (d.length >= 9) r += '-' + d.slice(9, 11);
      return r;
    }
    input.addEventListener('input', function () {
      var s = input.selectionStart, len = input.value.length;
      input.value = format(input.value);
      if (s >= len) input.setSelectionRange(input.value.length, input.value.length);
    });
    input.addEventListener('focus', function () {
      if (!input.value) input.value = '+7 ';
    });
  }

  function initLeadForms() {
    document.querySelectorAll('input[name="Phone"]').forEach(maskPhone);

    document.querySelectorAll('form[data-form]').forEach(function (form) {
      var status = form.querySelector('[data-form-status]');
      var submit = form.querySelector('button[type="submit"]');

      function setStatus(state, msg) {
        if (!status) return;
        status.textContent = msg || '';
        if (state) status.setAttribute('data-state', state);
        else status.removeAttribute('data-state');
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        setStatus(null, '');

        var phone = form.querySelector('input[name="Phone"]');
        var consent = form.querySelector('input[name="consent"]');
        var digits = ((phone && phone.value) || '').replace(/\D/g, '');

        if (digits.length < 11) {
          setStatus('error', 'Укажите корректный номер телефона');
          if (phone) phone.focus();
          return;
        }
        if (consent && !consent.checked) {
          setStatus('error', 'Нужно согласие с политикой конфиденциальности');
          return;
        }

        var payload = new FormData(form);
        payload.append('form_id', form.dataset.form || 'unknown');
        payload.append('page_url', window.location.href);
        TRACKING_FIELDS.forEach(function (name) { payload.append(name, getCookie(name)); });

        if (submit) submit.setAttribute('disabled', 'true');
        setStatus(null, 'Отправляем...');

        fetch('send.php', { method: 'POST', body: payload })
          .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res; })
          .then(function () {
            form.reset();
            setStatus('ok', SUCCESS);
            reachLeadGoal();
            document.dispatchEvent(new CustomEvent('lead-form:success', { detail: { form: form } }));
          })
          .catch(function (err) {
            console.error('[lead-form] submit failed:', err);
            setStatus('error', FAIL);
          })
          .finally(function () {
            if (submit) submit.removeAttribute('disabled');
          });
      });
    });
  }

  initLeadTracking();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLeadForms);
  } else {
    initLeadForms();
  }
})();
```

`send.php` лежит не рядом с формой → поправь путь в `fetch('send.php', …)`.

---

## Шаг 3. lead-form.css

В Astro-проекте отдельного файла нет — эти стили живут в `<style>` компонента
`LeadForm.astro` на токенах темы. Блок ниже — эталон для голого HTML.

`.lead-form__hp` (honeypot) скрывать обязательно. Остальное правь под дизайн.

```css
.lead-form{width:100%;box-sizing:border-box}
.lead-form *{box-sizing:border-box}
.lead-form__hp{position:absolute!important;left:-9999px!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important}
.lead-form__row{display:flex;flex-wrap:wrap;gap:14px;align-items:stretch}
.lead-form__input{flex:1 1 180px;min-width:0;height:64px;padding:0 26px;border:none;border-radius:16px;background:#fff;
  font-family:inherit;font-size:18px;color:#1d1d23;box-shadow:0 6px 24px rgba(20,40,80,.08);outline:none}
.lead-form__input::placeholder{color:#9aa1ab}
.lead-form__input:focus{box-shadow:0 0 0 2px #1d1d23,0 6px 24px rgba(20,40,80,.10)}
.lead-form__btn{flex:0 0 auto;height:64px;padding:0 40px;border:none;border-radius:16px;background:#1d1d23;color:#fff;
  font-family:inherit;font-size:18px;font-weight:700;cursor:pointer;transition:background .18s,opacity .18s;white-space:nowrap}
.lead-form__btn:hover{background:#34343f}
.lead-form__btn[disabled]{opacity:.6;cursor:default}
.lead-form__consent{display:flex;align-items:flex-start;gap:9px;margin-top:14px;font-family:inherit;font-size:13px;line-height:1.4;color:#6b7280;cursor:pointer}
.lead-form__consent input{flex:0 0 auto;width:16px;height:16px;margin:1px 0 0;cursor:pointer;accent-color:#1d1d23}
.lead-form__consent a{color:inherit;text-decoration:underline}
.lead-form__status{margin:10px 0 0;min-height:18px;font-family:inherit;font-size:14px;line-height:1.4}
.lead-form__status[data-state="error"]{color:#e23b3b}
.lead-form__status[data-state="ok"]{color:#1faa55}
@media (max-width:767px){
  .lead-form__row{flex-direction:column}
  .lead-form__input,.lead-form__btn{width:100%;flex:1 1 auto}
}
```

---

## Шаг 4. HTML формы

`name="..."` и `data-form-status` не менять. `data-form` — уникальный id формы (`hero`/`footer`/`popup`), уходит как `form_id`. Несколько форм — копируй блок, меняй `data-form`.

```html
<form class="lead-form" data-form="hero" novalidate>
  <input class="lead-form__hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">

  <div class="lead-form__row">
    <input class="lead-form__input" name="Name"  type="text" autocomplete="name"  placeholder="Ваше имя">
    <input class="lead-form__input" name="Phone" type="tel"  inputmode="tel" autocomplete="tel" placeholder="+7 (___) ___-__-__" required>
    <button class="lead-form__btn" type="submit">Оставить заявку</button>
  </div>

  <label class="lead-form__consent">
    <input type="checkbox" name="consent" required checked>
    <span>Согласен с обработкой персональных данных
      <a href="ССЫЛКА_НА_ПОЛИТИКУ" target="_blank" rel="noopener">политика конфиденциальности</a>
    </span>
  </label>

  <p class="lead-form__status" data-form-status aria-live="polite"></p>
</form>
```

## Шаг 5. Подключение

Перед `</body>`. `?v=` обязателен, меняй при каждом изменении файла (дата или хеш).

```html
<link rel="stylesheet" href="assets/lead-form.css">
<script src="assets/lead-form.js?v=20260625a" defer></script>
```

В Astro-проекте это уже сделано в `BaseLayout` (без CSS-файла — стили в компоненте):
```astro
<script src="/assets/lead-form.js?v=20260713a" is:inline defer></script>
```
Правишь `lead-form.js` — обнови `?v=` там же.

## Шаг 6. Колокол

Нужен коллтрекинг → вставь loader Колокола (от заказчика) в `<head>` как есть. Только loader, мостик заказчика не ставь. ID — свой на каждый домен.

Зона заказчика: домен в whitelist проекта Колокола.

Опционально (если просят):
```js
var h = new URLSearchParams(location.search).get('h');
if (h) document.querySelectorAll('h1').forEach(function (el) { el.textContent = h; });
```

## Шаг 7. Проверка

1. Открой сайт → в cookie есть `origin` и `ip`.
2. Отправь форму реальным телефоном → «Спасибо! Заявка отправлена…».
3. POST на `send.php` содержит `Phone`, `consent`, `ip`, `origin`, `kolokol_token`, `form_id`, `page_url`.
4. Есть Метрика → при успехе уходит `reachGoal('zayavka')`.
5. `<script src>` — свежий `?v=`.
6. Человек проверяет заявку в CRM.

Коды `send.php`: `200` ок · `400` consent_required/phone_invalid · `405` не POST · `413` тело >8КБ · `502` вебхук не ответил 2xx (проверь `WEBHOOK_URL`, лог `[send.php] webhook fail`).

## Норма, не баг

- `kolokol_token` пустой при прямом заходе (ставится под рекламный трафик).
- `getAttribute null` из `init.js` Колокола — шум, игнор.
- `/tracker/visits/` не уходит при прямом заходе.

## Нельзя

- ❌ Править URL вебхука, который дал человек: достраивать путь, менять параметры, «исправлять» домен. Вставляй строку как есть — иначе заявки теряются.
- ❌ Менять имена/регистр полей (`Name`/`Phone`/`consent`/`website`/`form_id`/`page_url`/`ip`/`origin`/`kolokol_token`).
- ❌ Убирать honeypot и проверку согласия.
- ❌ Придумывать URL вебхука — бери у человека.
- ❌ Ставить мостик заказчика на наши формы — только loader Колокола.
- ❌ Подключать JS без `?v=`.
- ❌ Класть реальный `WEBHOOK_URL` в публичный git.

## Если PHP недоступен

Спроси человека: сменить хостинг на PHP / перенести `send.php` в serverless (Netlify/Vercel/Cloudflare Worker) / слать прямо на вебхук (адрес виден в коде — предупреди).
