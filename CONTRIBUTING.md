# Как присылать правки

**Этот репозиторий — зеркало.** Разработка идёт в приватной копии, а сюда `src/`, `assets/`
и `docs/` приезжают побайтово при каждом релизе, вместе с удалением лишнего. Правка,
сделанная здесь напрямую — коммитом в `main` или мержем pull request, — живёт до
следующего релиза и затем молча исчезает. Поэтому:

- **Нашёл баг — заведи [issue](https://github.com/AndreyTsibin/mcp-super-app-public/issues).**
  Это рабочий канал, читается.
- **Pull request тоже можно.** Он полезен как баг-репорт с готовым патчем, и разбирать его
  будут именно так. Но смержен он не будет: правка переносится в приватную копию, выходит
  релизом, а PR закрывается со ссылкой на версию, в которой она приехала. Это не отказ —
  просто иначе она не выживет.
- **Форк для установки не нужен** — обновления приходят через `update_server`, ему нужен
  обычный клон.

Что за сервер и как его поставить — в [README.md](README.md) и [INSTALL.md](INSTALL.md).

---

## In English

This repository is a **mirror**. Development happens in a private copy; `src/`, `assets/`
and `docs/` are rsynced here byte-for-byte on every release, with deletion of anything
extra. A change made directly here — a commit to `main` or a merged pull request — survives
only until the next release, then disappears silently.

So: **open an issue** for bugs. A **pull request is welcome as a bug report with a patch**,
and will be read as one — but it will not be merged. The fix gets ported upstream, ships in
a release, and the PR is closed with a link to the version that carries it. That is not a
rejection; it is the only way the change survives.
