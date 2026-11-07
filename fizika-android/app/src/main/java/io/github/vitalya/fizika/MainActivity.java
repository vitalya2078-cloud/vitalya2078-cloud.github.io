package io.github.vitalya.fizika;

import android.app.Activity;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import androidx.webkit.WebViewAssetLoader;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Оболочка: показывает встроенное веб-приложение через https://appassets.androidplatform.net,
 * чтобы прогресс (localStorage/IndexedDB) сохранялся. Обновления вопросов и интерфейса
 * приложение скачивает само с сайта; здесь — только системные вещи.
 */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START = "https://" + HOST + "/assets/web/index.html";
    private static final int REQ_SAVE = 1, REQ_OPEN = 2;
    private WebView web;
    private FrameLayout root;
    private String pendingText;
    private ValueCallback<Uri[]> fileCallback;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        boolean night = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;

        root = new FrameLayout(this);
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        applyInsets(root);
        styleBars(night);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        // по этой метке приложение понимает, что запущено внутри APK и какой оно версии
        s.setUserAgentString(s.getUserAgentString() + " FizikaApp/" + BuildConfig.VERSION_NAME + " (" + BuildConfig.VERSION_CODE + ")");
        web.addJavascriptInterface(new Bridge(), "FizikaNative");

        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .setDomain(HOST)
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (HOST.equals(u.getHost()) && u.getPath() != null && u.getPath().startsWith("/mirror/")) return mirror(u);
                return loader.shouldInterceptRequest(u);
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (HOST.equals(u.getHost())) return false;
                openExternal(u);
                return true; // внешние ссылки (например, новый APK) — в браузер
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onCreateWindow(WebView v, boolean dialog, boolean user, android.os.Message msg) {
                WebView.HitTestResult h = v.getHitTestResult();
                if (h.getExtra() != null) openExternal(Uri.parse(h.getExtra()));
                return false;
            }
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = cb;
                Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
                try { startActivityForResult(i, REQ_OPEN); } catch (Exception e) { fileCallback = null; return false; }
                return true;
            }
        });
        if (state != null) web.restoreState(state); else web.loadUrl(START);
    }

    /**
     * Прокси к зеркалам сайта: /mirror/gv/… → fizika.gitverse.site, /mirror/gh/… → GitHub Pages.
     * Файлы отдаются странице как свои (тот же адрес), поэтому CORS не нужен — GitVerse его не отдаёт.
     * Разрешены только эти два адреса; вызывается в фоновом потоке WebView.
     */
    private WebResourceResponse mirror(Uri u) {
        String path = u.getPath(), base;
        if (path.startsWith("/mirror/gv/")) { base = "https://fizika.gitverse.site/"; path = path.substring(11); }
        else if (path.startsWith("/mirror/gh/")) { base = "https://vitalya2078-cloud.github.io/fizika/"; path = path.substring(11); }
        else return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", null, null);
        java.util.Map<String, String> hdr = new java.util.HashMap<>();
        hdr.put("Cache-Control", "no-store");
        try {
            String q = u.getEncodedQuery();
            java.net.HttpURLConnection c = (java.net.HttpURLConnection) new java.net.URL(base + u.getEncodedPath().substring(11) + (q != null ? "?" + q : "")).openConnection();
            c.setConnectTimeout(12000); c.setReadTimeout(30000); c.setUseCaches(false);
            int code = c.getResponseCode();
            String type = c.getContentType();
            java.io.InputStream in = code < 400 ? c.getInputStream() : c.getErrorStream();
            String mime = type != null ? type.split(";")[0].trim() : "application/octet-stream";
            String cs = type != null && type.contains("charset=") ? type.substring(type.indexOf("charset=") + 8).trim() : null;
            String reason = c.getResponseMessage(); if (reason == null || reason.isEmpty()) reason = code < 400 ? "OK" : "Error";
            if (type != null) hdr.put("Content-Type", type);
            return new WebResourceResponse(mime, cs, code, reason, hdr, in);
        } catch (Exception e) {
            return new WebResourceResponse("text/plain", "utf-8", 504, "Gateway Timeout", hdr, new java.io.ByteArrayInputStream(new byte[0]));
        }
    }

    private void openExternal(Uri u) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
    }

    /** Мост для веб-части: сохранить резервную копию в файл и подстроить цвет системных панелей под тему. */
    private class Bridge {
        @JavascriptInterface
        public void saveText(String name, String text) {
            runOnUiThread(() -> {
                pendingText = text;
                Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                        .setType("application/json").putExtra(Intent.EXTRA_TITLE, name);
                try { startActivityForResult(i, REQ_SAVE); } catch (Exception e) { toast("Не удалось открыть сохранение файла"); }
            });
        }
        @JavascriptInterface
        public void setDark(boolean dark) { runOnUiThread(() -> styleBars(dark)); }
        /** Есть ли прокси /mirror/ (с версии 2.2): страница берёт файлы зеркал через него, без CORS. */
        @JavascriptInterface
        public boolean hasMirrorProxy() { return true; }
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == REQ_OPEN && fileCallback != null) {
            fileCallback.onReceiveValue(res == RESULT_OK && data != null && data.getData() != null ? new Uri[]{data.getData()} : null);
            fileCallback = null;
        } else if (req == REQ_SAVE && res == RESULT_OK && data != null && data.getData() != null && pendingText != null) {
            try (OutputStream out = getContentResolver().openOutputStream(data.getData())) {
                out.write(pendingText.getBytes(StandardCharsets.UTF_8));
                toast("Резервная копия сохранена");
            } catch (Exception e) { toast("Не удалось сохранить файл"); }
            pendingText = null;
        }
    }

    private void toast(String t) { Toast.makeText(this, t, Toast.LENGTH_SHORT).show(); }

    /** Android 15 рисует приложение до краёв экрана — отступаем от системных панелей и клавиатуры. */
    private void applyInsets(View v0) {
        v0.setOnApplyWindowInsetsListener((v, ins) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                Insets b = ins.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                v.setPadding(b.left, b.top, b.right, b.bottom);
            } else {
                v.setPadding(ins.getSystemWindowInsetLeft(), ins.getSystemWindowInsetTop(), ins.getSystemWindowInsetRight(), ins.getSystemWindowInsetBottom());
            }
            return ins;
        });
    }

    /** Цвет системных панелей = цвет шапки и нижних вкладок приложения. */
    @SuppressWarnings("deprecation")
    private void styleBars(boolean dark) {
        int bar = dark ? 0xFF132B4C : 0xFFFFFFFF;
        root.setBackgroundColor(bar);
        web.setBackgroundColor(dark ? 0xFF10233F : 0xFFF1F5FD);
        getWindow().setStatusBarColor(bar);
        getWindow().setNavigationBarColor(bar);
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                int light = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                c.setSystemBarsAppearance(dark ? 0 : light, light);
            }
        } else {
            int f = 0;
            if (!dark) { f = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR; if (Build.VERSION.SDK_INT >= 26) f |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR; }
            getWindow().getDecorView().setSystemUiVisibility(f);
        }
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack(); else super.onBackPressed();
    }

    @Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }
    @Override protected void onPause() { super.onPause(); web.onPause(); }
    @Override protected void onResume() { super.onResume(); web.onResume(); }
    @Override protected void onDestroy() { web.destroy(); super.onDestroy(); }
}
