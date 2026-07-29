// @ts-check
import { defineConfig } from 'astro/config';

// Static output — деплой на обычный хостинг + send.php рядом в public/.
export default defineConfig({
  // Боевой домен проекта. Из него BaseLayout строит canonical и абсолютные OG-ссылки:
  // без site они не сгенерятся, а для многостраничника canonical обязателен.
  // ПОДСТАВИТЬ домен клиента при сборке.
  site: 'https://example.com',
  output: 'static',
  compressHTML: true,
});
