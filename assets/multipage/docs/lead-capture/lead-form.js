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
