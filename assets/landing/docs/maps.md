# Яндекс Карты — Зоны выезда

> Секция `Contacts` принимает не весь iframe, а только его адрес: возьми значение
> `src` из блока нужного города и передай пропом `mapEmbed` (вариант `variant="map"`).
> Не хочешь iframe — сделай скриншот карты, положи в `public/assets/img/` и передай
> `mapImage` с `variant="screenshot"`: он легче и не тянет чужой JS.

---

## Москва
**Зона:** Москва и МО до 30 км от МКАД

```html
<iframe
  src="https://yandex.ru/map-widget/v1/?um=constructor%3A3d980aa3b8bfcfe193bc2690a40dc8c4b5351a27f6c00c95993456caa0462487&amp;source=constructor"
  width="100%"
  height="100%"
  frameborder="0"
  style="border:0;"
  allowfullscreen
></iframe>
```

---

## Санкт-Петербург
**Зона:** Санкт-Петербург и область до 20 км от КАД

```html
<iframe
  src="https://yandex.ru/map-widget/v1/?um=constructor%3Afb5bcb627b07a192c4917d0eda9087e3d1fd3d75ac9463d8cdb043e5b160b296&amp;source=constructor"
  width="100%"
  height="100%"
  frameborder="0"
  style="border:0;"
  allowfullscreen
></iframe>
```

---

## Воронеж
**Зона:** Воронеж и область, не более 20 км от города

```html
<iframe
  src="https://yandex.ru/map-widget/v1/?um=constructor%3A9fffc76aba51f8374ec6a510b0927da63aebfc15742b33e50e05be0a1a1f2bc5&amp;source=constructor"
  width="100%"
  height="100%"
  frameborder="0"
  style="border:0;"
  allowfullscreen
></iframe>
```

---

## Ростов-на-Дону
**Зона:** Ростов-на-Дону и область, не более 20 км от города

```html
<iframe
  src="https://yandex.ru/map-widget/v1/?um=constructor%3A73ef21a43fe393b8d4edadb3a28cfc1c5a6496ab75aba1e96909f1e8fdd6c608&amp;source=constructor"
  width="100%"
  height="100%"
  frameborder="0"
  style="border:0;"
  allowfullscreen
></iframe>
```

---

## Челябинск
**Зона:** Челябинск и область, не более 20 км от города

```html
<iframe
  src="https://yandex.ru/map-widget/v1/?um=constructor%3A4a77984ce239171b4e6317e12ea133732309fee62dbf6761078a364cd183508f&amp;source=constructor"
  width="100%"
  height="100%"
  frameborder="0"
  style="border:0;"
  allowfullscreen
></iframe>
```

---

## Другой город
Города нет в списке выше — действуй по порядку. И обязательно добавь в финальный отчёт строку: «Проверь / замени карту зоны выезда для города [ГОРОД]».

**1. Собери рабочую карту по координатам** (конструктор Яндекса не нужен). Узнай координаты центра города веб-поиском и подставь в стандартный map-widget:

```html
<!-- Карта зоны выезда — [ГОРОД]. Пример для Казани: LAT 55.796, LON 49.106 -->
<iframe
  src="https://yandex.ru/map-widget/v1/?ll=LON%2CLAT&z=11&pt=LON%2CLAT,pm2rdm"
  width="100%" height="100%" frameborder="0" style="border:0;" allowfullscreen
></iframe>
```
Порядок в `ll=` и `pt=` — **долгота, широта** (LON,LAT). Открой превью и убедись, что карта показывает нужный город.

**2. Не вышло — оставь заглушку-плейсхолдер ниже:**

```html
<!-- КАРТА: вставить iframe от Яндекс Конструктора для города [ГОРОД] -->
<div style="width:100%; height:100%; background:#f0f0f0; display:flex; align-items:center; justify-content:center;">
  <p style="color:#999; font-size:14px;">Карта зоны выезда — [ГОРОД]</p>
</div>
```
