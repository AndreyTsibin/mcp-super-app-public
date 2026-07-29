# Заявки + коллтрекинг — инструкция для Claude

Настроить на сайте: форму заявки → `send.php` → вебхук CRM + коллтрекинг (поля `ip`/`origin`/`kolokol_token` в заявку).

> Читается на задаче «Заявки» (`docs/redesign-playbook.md` → §8). Обработчик и
> клиентский скрипт **уже написаны и обкатаны** — лежат в `docs/lead-capture/`.
> Писать их заново по описанию из playbook не надо: там требования, здесь код.

## Сначала спроси у человека и дождись ответа

1. **Полный URL вебхука приёма заявок** — целиком, со всеми параметрами, как дал заказчик.
   Не достраивай его сам и не угадывай домен: вставляется в `send.php` ровно как есть.
2. **PHP на хостинге есть?** Нет PHP → см. [конец файла](#если-php-недоступен).
3. **Какие поля собираем** (телефон / имя / сообщение).
4. **Ссылка на политику конфиденциальности.**
5. **Нужен Колокол?** Если да — проси сниппет loader Колокола (свой ID на домен).

## Что уже готово, а что пишешь ты

Готово и правке не подлежит — **серверная и клиентская части контракта**:

- `docs/lead-capture/send.php` — Шаг 1, обработчик целиком;
- `docs/lead-capture/lead-form.js` — Шаг 2, клиентский скрипт целиком.

Пишешь ты — **разметку и стили формы** под дизайн этого сайта (Шаги 3–4). Класс,
сетка, размеры, цвета — свободно; имена полей, `data-*` и honeypot — дословно
из Шага 4, на них держится весь контракт.

## Порядок действий

1. Скопируй файлы на места (пути — от корня проекта):
   ```
   cp docs/lead-capture/send.php public/send.php
   mkdir -p public/assets && cp docs/lead-capture/lead-form.js public/assets/lead-form.js
   ```
   Astro копирует `public/` в корень сборки как есть — отдельного деплоя обработчика
   не нужно.
2. Подставь `WEBHOOK_URL` в `public/send.php` ([Шаг 1](#шаг-1-sendphp)). Реальный URL
   в публичный git не коммить.
3. Свёрстай форму по [Шагу 4](#шаг-4-html-формы) — как компонент проекта, чтобы формы
   на разных страницах не расползались. Стили — токенами проекта, эталон из
   [Шага 3](#шаг-3-lead-formcss) бери как отправную точку, не копируй значения.
4. `data-form` уникален у каждой формы на странице (`hero`, `footer`, `popup`, …) —
   он уходит как `form_id`, по нему в CRM видно, откуда пришла заявка.
5. Подключи скрипт по [Шагу 5](#шаг-5-подключение) — в общем layout, с `?v=`.
6. Ссылка на политику конфиденциальности — на реальную страницу проекта. Нет
   страницы — заводи её, это не опция.
7. Нужен Колокол → loader в `<head>` общего layout ([Шаг 6](#шаг-6-колокол)).
8. Проверь ([Шаг 7](#шаг-7-проверка)) — на собранном `npm run build` и живом хостинге.
   Под dev-сервером Astro PHP не выполняется: локально гоняй `php -S` против
   мок-вебхука.

## Контракт полей (регистр критичен)

| Поле | Регистр | Обяз. |
|------|---------|-------|
| `Phone` | Заглавная | да |
| `Name` | Заглавная | нет |
| `Message` | Заглавная | нет |
| `form_id` / `page_url` / `formname` | lowercase | нет |
| `origin` / `kolokol_token` | lowercase | нет |
| `ip` | lowercase | ставит сервер |

`ip` в форме и в `lead-form.js` не передаётся: `send.php` берёт его из
`REMOTE_ADDR`. Значение из тела запроса подделывается, а внешний сервис
(ipify и подобные) — лишняя точка отказа и утечка посетителя третьей стороне.

---

## Шаг 1. send.php

В корень сайта: `public/send.php` → в сборке окажется рядом с `index.html`.
Меняй только `WEBHOOK_URL`.

Листинг — копия `docs/lead-capture/send.php`; файл уже написан, копировать текст
отсюда не нужно. Листинг здесь, чтобы проверить, что лежит на хостинге, и понять
коды ответов.

```php
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
```

---

## Шаг 2. lead-form.js

В `public/assets/lead-form.js` (готовый файл — `docs/lead-capture/lead-form.js`).
Настройка не нужна — сам найдёт `<form data-form>` на любой странице.

```js
(function () {
  var SUCCESS = 'Спасибо! Заявка отправлена, в ближайшее время мы вам перезвоним.';
  var FAIL = 'Не удалось отправить. Позвоните нам напрямую.';

  // `ip` в этом списке НЕТ намеренно: его подставляет send.php из REMOTE_ADDR.
  var TRACKING_FIELDS = ['origin', 'kolokol_token'];

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

Блок ниже — рабочий эталон, а не финальные стили проекта. Перенеси его в свою
систему: цвета, радиусы, кегли и отступы — токенами из `@theme`, а не значениями
отсюда (playbook §5.1 запрещает произвольные значения в разметке).

`.lead-form__hp` (honeypot) скрывать обязательно — это единственное правило,
которое нельзя переопределить дизайном.

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

В общий layout проекта, перед `</body>` — один раз на все страницы, а не в каждой
странице отдельно. `?v=` обязателен, меняй при каждом изменении файла (дата или хеш).

```astro
<script src="/assets/lead-form.js?v=20260729a" is:inline defer></script>
```

`is:inline` обязателен: без него Astro утащит скрипт в свой бандл, а он лежит
в `public/` и должен грузиться как есть. Путь — от корня (`/assets/…`), не
относительный: на вложенных маршрутах относительный путь развалится.

Стили формы живут в компоненте (Шаг 3) — отдельный `lead-form.css` заводить не надо.

## Шаг 6. Колокол

Нужен коллтрекинг → вставь loader Колокола (от заказчика) в `<head>` как есть. Только loader, мостик заказчика не ставь. ID — свой на каждый домен.

Зона заказчика: домен в whitelist проекта Колокола.

Опционально (если просят):
```js
var h = new URLSearchParams(location.search).get('h');
if (h) document.querySelectorAll('h1').forEach(function (el) { el.textContent = h; });
```

## Шаг 7. Проверка

1. Открой сайт → в cookie есть `origin`. Cookie `ip` быть не должно — его больше
   никто не ставит, IP подставляет сервер.
2. Отправь форму реальным телефоном → «Спасибо! Заявка отправлена…».
3. POST на `send.php` содержит `Phone`, `consent`, `origin`, `kolokol_token`, `form_id`, `page_url`
   (без `ip` — он добавляется на сервере).
4. Есть Метрика → при успехе уходит `reachGoal('zayavka')`.
5. `<script src>` — свежий `?v=`.
6. Человек проверяет заявку в CRM — в ней должен быть непустой `ip`.

Коды `send.php`: `200` ок · `400` consent_required/phone_invalid · `405` не POST · `413` тело >8КБ · `429` рейт-лимит (>10 заявок с IP за час) · `502` вебхук не ответил 2xx (проверь `WEBHOOK_URL`, лог `[send.php] webhook fail`).

## Норма, не баг

- `kolokol_token` пустой при прямом заходе (ставится под рекламный трафик).
- `getAttribute null` из `init.js` Колокола — шум, игнор.
- `/tracker/visits/` не уходит при прямом заходе.

## Нельзя

- ❌ Править URL вебхука, который дал человек: достраивать путь, менять параметры, «исправлять» домен. Вставляй строку как есть — иначе заявки теряются.
- ❌ Менять имена/регистр полей (`Name`/`Phone`/`consent`/`website`/`form_id`/`page_url`/`ip`/`origin`/`kolokol_token`).
- ❌ Убирать honeypot, проверку согласия или рейт-лимит.
- ❌ Брать `ip` из тела запроса или из внешнего сервиса (ipify и подобные) — только `REMOTE_ADDR`.
- ❌ Придумывать URL вебхука — бери у человека.
- ❌ Ставить мостик заказчика на наши формы — только loader Колокола.
- ❌ Подключать JS без `?v=`.
- ❌ Класть реальный `WEBHOOK_URL` в публичный git.

## Если PHP недоступен

Спроси человека: сменить хостинг на PHP / перенести `send.php` в serverless (Netlify/Vercel/Cloudflare Worker) / слать прямо на вебхук (адрес виден в коде — предупреди).
