# Физика — Android-приложение

Нативная оболочка (Java, WebView) вокруг веб-приложения из `../fizika`. Всё работает без интернета:
интерфейс (`app.html`), вопросы (`content.json`) и рисунки (`pics/`) лежат внутри APK и открываются через
`WebViewAssetLoader` по адресу `https://appassets.androidplatform.net/assets/web/index.html`,
поэтому прогресс (localStorage, IndexedDB) сохраняется между запусками.

## Онлайн-обновления
При запуске с интернетом приложение читает `version.json` с первого доступного зеркала:
`https://fizika.gitverse.site/` (GitVerse, открывается в России без VPN), затем GitHub Pages.
GitVerse не отдаёт CORS, поэтому с версии 2.2 оболочка проксирует зеркала сама: страница запрашивает
`/mirror/gv/…` и `/mirror/gh/…` на своём адресе, а Java скачивает файл (только с этих двух адресов).
Далее:
- `data` больше встроенного — скачивает `content.json` (и недостающие рисунки) в IndexedDB;
- `build` больше встроенного — скачивает `app.html` и при следующем запуске открывает его.
  Если новая версия не запустилась за 5 секунд, она помечается плохой и открывается встроенная;
- `apk.code` больше `versionCode` — предлагает скачать новый APK.

Чтобы выпустить обновление вопросов или интерфейса, достаточно `python3 fizika/src/build.py`
и опубликовать сайт: ветка `main` (GitHub Pages) и `python3 fizika/src/publish.py <клон gitverse.ru/fizika/fizika>` (GitVerse). Новый APK нужен только при изменении Java-кода или разрешений.

## Сборка

Нужны JDK 17+ и Android SDK (platform 35, build-tools 35).

```bash
python3 ../fizika/src/build.py          # сначала собрать сайт: app.html, content.json, pics/, version.json
echo "sdk.dir=/путь/к/android-sdk" > local.properties
./gradlew assembleRelease
cp app/build/outputs/apk/release/app-release.apk ../fizika/fizika.apk
```

## Подпись

Ключ в репозиторий не кладётся. Создай `keystore.properties` рядом с этим файлом:

```
storeFile=/путь/к/fizika-release.jks
storePassword=...
keyAlias=fizika
keyPassword=...
```

Обновление поверх установленного приложения возможно только тем же ключом — храни `.jks` в надёжном месте.
Без `keystore.properties` сборка подпишется отладочным ключом (для проверки, не для раздачи).

Перед выпуском новой версии увеличь `versionCode` в `app/build.gradle`.
