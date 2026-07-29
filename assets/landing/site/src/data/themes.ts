/*
 * Кандидаты тем для СТОП-точки выбора (шаг арт-дирекшна во флоу).
 * В боевом проекте этот файл переписывает агент: три темы под конкретную нишу
 * и бриф. Здесь — демо-набор, чтобы страница /themes работала из коробки.
 *
 * Требование контрастности: темы должны различаться по осям (тёплая/холодная,
 * светлая/тёмная, строгая/мягкая), а не быть тремя оттенками одного цвета —
 * иначе выбор бессмысленный.
 *
 * Каждая тема = значения токенов из tokens.css. Имена менять нельзя, значения —
 * в этом файле; выбранная тема потом переезжает в styles/theme.css.
 */

export interface Theme {
  id: string;
  name: string;
  /** Настроение в 2–3 словах — чтобы выбор был осмысленным, а не «какой цвет красивее». */
  mood: string;
  /** Пара Google Fonts: заголовки + текст, обе с кириллицей. */
  fonts: { heading: string; body: string };
  /** Значения токенов. Ключи — ровно имена из контракта tokens.css. */
  tokens: Record<string, string>;
  /** Чем эта тема отличается — одна строка для подписи под тайлом. */
  note: string;
}

export const themes: Theme[] = [
  {
    id: 'workshop',
    name: 'Мастерская',
    mood: 'тёплый ремесленный',
    fonts: { heading: 'Onest', body: 'Golos Text' },
    note: 'Зелёный «всё под контролем» с терракотовым акцентом. Спокойный, не кричит скидками.',
    tokens: {
      '--color-primary': '#0f5c42',
      '--color-primary-dark': '#0a4530',
      '--color-accent': '#0f8058',
      '--color-accent-dark': '#0e6e4c',
      '--color-accent-warm': '#e69b77',
      '--color-accent-warm-dark': '#96654d',
      '--color-bg-section': '#f4f7f5',
      '--color-border': '#e2e9e5',
      '--font-heading': "'Onest', system-ui, sans-serif",
      '--font-sans': "'Golos Text', system-ui, sans-serif",
    },
  },
  {
    id: 'dispatch',
    name: 'Диспетчерская',
    mood: 'срочный технический',
    fonts: { heading: 'Unbounded', body: 'Manrope' },
    note: 'Холодный синий с оранжевым CTA. Читается как служба, которая выезжает по вызову.',
    tokens: {
      '--color-primary': '#123a63',
      '--color-primary-dark': '#0c2846',
      // Оранжевый в CTA легко проваливает AA с белым текстом: #d1600f давал 3.90.
      '--color-accent': '#b8510b',
      '--color-accent-dark': '#8f3e07',
      '--color-accent-warm': '#7fb2e5',
      '--color-accent-warm-dark': '#3d6c9c',
      '--color-bg-section': '#f2f5f9',
      '--color-border': '#dde4ee',
      '--radius': '8px',
      '--radius-sm': '5px',
      '--font-heading': "'Unbounded', system-ui, sans-serif",
      '--font-sans': "'Manrope', system-ui, sans-serif",
    },
  },
  {
    id: 'clinic',
    name: 'Кабинет',
    mood: 'клинически чистый',
    fonts: { heading: 'Prata', body: 'Jost' },
    note: 'Графит с приглушённым бордо, крупные скругления. Для ниш, где решают доверием, а не скоростью.',
    tokens: {
      '--color-primary': '#2b2b33',
      '--color-primary-dark': '#1b1b21',
      '--color-accent': '#8c3b4a',
      '--color-accent-dark': '#6e2c39',
      '--color-accent-warm': '#d6bfa8',
      '--color-accent-warm-dark': '#8a765f',
      '--color-bg-section': '#f7f6f4',
      '--color-border': '#e8e5e0',
      '--radius': '20px',
      '--radius-sm': '12px',
      '--font-heading': "'Prata', Georgia, serif",
      '--font-sans': "'Jost', system-ui, sans-serif",
    },
  },
];

/** Токены темы → строка для инлайнового style, чтобы скоупить тему на контейнер. */
export const themeStyle = (t: Theme): string =>
  Object.entries(t.tokens)
    .map(([k, v]) => `${k}:${v}`)
    .join(';');

/** Один href Google Fonts на все шрифтовые пары витрины — вместо трёх запросов. */
export const themesFontsHref = (list: Theme[]): string => {
  const families = [...new Set(list.flatMap((t) => [t.fonts.heading, t.fonts.body]))]
    .map((f) => `family=${f.replace(/ /g, '+')}:wght@400;600;700;800`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
};
