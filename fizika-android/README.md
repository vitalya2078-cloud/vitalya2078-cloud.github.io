# Физика — Android-приложение

Нативная оболочка (Java, WebView) вокруг веб-приложения из `../fizika`. Всё работает без интернета:
`index.html` со всеми вопросами, рисунками и шрифтами лежит внутри APK и открывается через
`WebViewAssetLoader` по адресу `https://appassets.androidplatform.net/assets/web/index.html`,
поэтому прогресс (localStorage) сохраняется между запусками.

## Сборка

Нужны JDK 17+ и Android SDK (platform 35, build-tools 35).

```bash
python3 ../fizika/src/build.py          # сначала собрать свежий index.html
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
