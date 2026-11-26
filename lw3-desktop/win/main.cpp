// «Физпрактикум» для Windows 7 и новее: окно программы на C++ (Win32 + Microsoft WebView2).
// Интерфейс (dist/) встроен в .exe ресурсом app.pak и отдаётся по адресу http://tauri.localhost/ (как раньше),
// видеоуроки — по http://fzv.localhost/video/… с перемоткой (Range). Движок — своя копия WebView2 версии 109
// в папке WebView2Runtime рядом с программой: последняя версия, которая работает в Windows 7.
// Команды интерфейса (window.__TAURI__.core.invoke) те же, что были в версии на Rust: интерфейс не меняется.
#ifndef UNICODE
#define UNICODE
#endif
#define NOMINMAX
#include <windows.h>
#include <shellapi.h>
#include <shlobj.h>
#include <shobjidl.h>
#include <shlwapi.h>
#include <deque>
#include <functional>
#include <map>
#include <string>
#include <vector>
#include "WebView2.h"
#include "json.h"
#include "license.h"
#include "platform.h"
#include "resource.h"

#ifndef FZ_VERSION
#define FZ_VERSION "0.0.0"
#endif

// ---------- обработчики WebView2 (COM) без WRL: работает и в MSVC, и в MinGW ----------
template <class I, const IID* PIID, class... A>
class Handler : public I {
  LONG rc_ = 1;
  std::function<HRESULT(A...)> f_;
 public:
  explicit Handler(std::function<HRESULT(A...)> f) : f_(std::move(f)) {}
  virtual ~Handler() {}
  HRESULT STDMETHODCALLTYPE QueryInterface(REFIID riid, void** p) override {
    if (riid == IID_IUnknown || riid == *PIID) { *p = static_cast<I*>(this); AddRef(); return S_OK; }
    *p = nullptr; return E_NOINTERFACE;
  }
  ULONG STDMETHODCALLTYPE AddRef() override { return (ULONG)InterlockedIncrement(&rc_); }
  ULONG STDMETHODCALLTYPE Release() override { LONG r = InterlockedDecrement(&rc_); if (!r) delete this; return (ULONG)r; }
  HRESULT STDMETHODCALLTYPE Invoke(A... a) override { return f_(a...); }
};
template <class H, class F> H* make(F f) { return new H(f); }
using EnvDone = Handler<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler, &IID_ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler, HRESULT, ICoreWebView2Environment*>;
using CtlDone = Handler<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler, &IID_ICoreWebView2CreateCoreWebView2ControllerCompletedHandler, HRESULT, ICoreWebView2Controller*>;
using ResReq = Handler<ICoreWebView2WebResourceRequestedEventHandler, &IID_ICoreWebView2WebResourceRequestedEventHandler, ICoreWebView2*, ICoreWebView2WebResourceRequestedEventArgs*>;
using MsgRecv = Handler<ICoreWebView2WebMessageReceivedEventHandler, &IID_ICoreWebView2WebMessageReceivedEventHandler, ICoreWebView2*, ICoreWebView2WebMessageReceivedEventArgs*>;
using NavStart = Handler<ICoreWebView2NavigationStartingEventHandler, &IID_ICoreWebView2NavigationStartingEventHandler, ICoreWebView2*, ICoreWebView2NavigationStartingEventArgs*>;
using NewWin = Handler<ICoreWebView2NewWindowRequestedEventHandler, &IID_ICoreWebView2NewWindowRequestedEventHandler, ICoreWebView2*, ICoreWebView2NewWindowRequestedEventArgs*>;
using ProcFail = Handler<ICoreWebView2ProcessFailedEventHandler, &IID_ICoreWebView2ProcessFailedEventHandler, ICoreWebView2*, ICoreWebView2ProcessFailedEventArgs*>;
using ScriptDone = Handler<ICoreWebView2AddScriptToExecuteOnDocumentCreatedCompletedHandler, &IID_ICoreWebView2AddScriptToExecuteOnDocumentCreatedCompletedHandler, HRESULT, LPCWSTR>;
using PdfDone = Handler<ICoreWebView2PrintToPdfCompletedHandler, &IID_ICoreWebView2PrintToPdfCompletedHandler, HRESULT, BOOL>;

template <class T> struct Ptr {  // простой умный указатель для COM
  T* p = nullptr;
  ~Ptr() { if (p) p->Release(); }
  T** put() { if (p) { p->Release(); p = nullptr; } return &p; }
  T* operator->() const { return p; }
  explicit operator bool() const { return p != nullptr; }
};
struct CoStr {  // строка, выделенная WebView2 (освобождается CoTaskMemFree)
  LPWSTR s = nullptr;
  ~CoStr() { if (s) CoTaskMemFree(s); }
  std::wstring str() const { return s ? s : L""; }
};

// ---------- состояние ----------
static HWND g_wnd;
static ICoreWebView2Environment* g_env;
static ICoreWebView2Controller* g_ctl;
static ICoreWebView2* g_wv;
static bool g_full = false;
static WINDOWPLACEMENT g_place = {sizeof(WINDOWPLACEMENT)};
static LONG g_style;
static const UINT WM_FZ_CMD = WM_APP + 1;
struct Req { double id; std::string cmd; Json args; };
static std::deque<Req> g_queue;

// ---------- встроенный интерфейс: app.pak (FZPK, число файлов, [длина имени, имя, смещение, размер], данные) ----------
struct Asset { const unsigned char* data; DWORD size; };
static std::map<std::string, Asset> g_assets;
static bool load_pak() {
  HRSRC r = FindResourceW(nullptr, MAKEINTRESOURCEW(IDR_APP_PAK), RT_RCDATA); if (!r) return false;
  HGLOBAL h = LoadResource(nullptr, r); if (!h) return false;
  const unsigned char* p = (const unsigned char*)LockResource(h); DWORD total = SizeofResource(nullptr, r);
  if (!p || total < 8 || memcmp(p, "FZPK", 4)) return false;
  auto u32 = [&](size_t o) { return (DWORD)p[o] | (DWORD)p[o + 1] << 8 | (DWORD)p[o + 2] << 16 | (DWORD)p[o + 3] << 24; };
  DWORD n = u32(4); size_t o = 8;
  std::vector<std::pair<std::string, std::pair<DWORD, DWORD>>> idx;
  for (DWORD i = 0; i < n; i++) {
    if (o + 2 > total) return false;
    DWORD len = p[o] | p[o + 1] << 8; o += 2;
    if (o + len + 8 > total) return false;
    std::string name((const char*)p + o, len); o += len;
    idx.push_back({name, {u32(o), u32(o + 4)}}); o += 8;
  }
  for (auto& e : idx) { if (o + e.second.first + e.second.second > total) return false; g_assets[e.first] = {p + o + e.second.first, e.second.second}; }
  return true;
}
static const wchar_t* mime(const std::string& path) {
  std::string ext = path.substr(path.find_last_of('.') + 1);
  static const std::map<std::string, const wchar_t*> M = {
    {"html", L"text/html; charset=utf-8"}, {"js", L"text/javascript; charset=utf-8"}, {"css", L"text/css; charset=utf-8"},
    {"json", L"application/json; charset=utf-8"}, {"txt", L"text/plain; charset=utf-8"}, {"svg", L"image/svg+xml"},
    {"png", L"image/png"}, {"jpg", L"image/jpeg"}, {"jpeg", L"image/jpeg"}, {"webp", L"image/webp"}, {"gif", L"image/gif"},
    {"ico", L"image/x-icon"}, {"woff2", L"font/woff2"}, {"woff", L"font/woff"}, {"ttf", L"font/ttf"}, {"mp4", L"video/mp4"},
    {"mp3", L"audio/mpeg"}, {"pdf", L"application/pdf"}};
  auto it = M.find(ext); return it == M.end() ? L"application/octet-stream" : it->second;
}
static std::string url_path(const std::wstring& uri) {  // http://host/a/b%20c.png?x → a/b c.png
  size_t s = uri.find(L"://"); s = uri.find(L'/', s == std::wstring::npos ? 0 : s + 3);
  std::wstring p = s == std::wstring::npos ? L"" : uri.substr(s + 1);
  size_t q = p.find_first_of(L"?#"); if (q != std::wstring::npos) p = p.substr(0, q);
  std::string u = U(p), out;
  for (size_t i = 0; i < u.size(); i++) {
    if (u[i] == '%' && i + 2 < u.size() && isxdigit((unsigned char)u[i + 1]) && isxdigit((unsigned char)u[i + 2])) { out += (char)strtol(u.substr(i + 1, 2).c_str(), nullptr, 16); i += 2; }
    else out += u[i];
  }
  return out;
}

static void respond(ICoreWebView2WebResourceRequestedEventArgs* args, int status, const wchar_t* reason, const unsigned char* data, DWORD size, const std::wstring& headers) {
  Ptr<ICoreWebView2WebResourceResponse> resp;
  IStream* stream = data ? SHCreateMemStream(data, size) : nullptr;
  if (SUCCEEDED(g_env->CreateWebResourceResponse(stream, status, reason, headers.c_str(), resp.put()))) args->put_Response(resp.p);
  if (stream) stream->Release();
}
static void serve(ICoreWebView2WebResourceRequestedEventArgs* args) {
  Ptr<ICoreWebView2WebResourceRequest> req; if (FAILED(args->get_Request(req.put()))) return;
  CoStr uri; req->get_Uri(&uri.s); std::wstring u = uri.str();
  bool video = u.rfind(L"http://fzv.localhost/", 0) == 0;
  CoStr method; req->get_Method(&method.s);
  if (method.str() == L"OPTIONS") {  // предварительный запрос CORS (fetch с заголовком Range с другой страницы)
    respond(args, 204, L"No Content", nullptr, 0, L"Access-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, HEAD\r\nAccess-Control-Allow-Headers: Range\r\nAccess-Control-Expose-Headers: Content-Range, Content-Length, Accept-Ranges");
    return;
  }
  std::string path = url_path(u);
  if (path.empty()) path = "index.html";
  if (video && (path.rfind("video/", 0) != 0 || !(path.size() > 4 && (path.substr(path.size() - 4) == ".mp4" || path.substr(path.size() - 4) == ".jpg")))) path = "";
  auto it = path.find("..") == std::string::npos ? g_assets.find(path) : g_assets.end();
  if (it == g_assets.end()) { respond(args, 404, L"Not Found", nullptr, 0, L"Content-Type: text/plain\r\nAccess-Control-Allow-Origin: *"); return; }
  const Asset& a = it->second;
  std::wstring h = std::wstring(L"Content-Type: ") + mime(path) + L"\r\nAccept-Ranges: bytes\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Expose-Headers: Content-Range, Content-Length, Accept-Ranges\r\nCache-Control: no-cache";
  // Range: bytes=a-b, bytes=a-, bytes=-n (перемотка видео); без Range — весь файл
  Ptr<ICoreWebView2HttpRequestHeaders> hdrs; CoStr range;
  if (SUCCEEDED(req->get_Headers(hdrs.put())) && hdrs) hdrs->GetHeader(L"Range", &range.s);
  std::string r = U(range.str());
  if (r.rfind("bytes=", 0) == 0 && a.size > 0) {
    std::string spec = r.substr(6); spec = spec.substr(0, spec.find(','));
    size_t dash = spec.find('-');
    if (dash != std::string::npos) {
      const unsigned long long CHUNK = 2ull * 1024 * 1024, len = a.size;
      std::string sa = spec.substr(0, dash), sb = spec.substr(dash + 1);
      unsigned long long s, e; bool ok = true;
      if (sa.empty()) { unsigned long long n = strtoull(sb.c_str(), nullptr, 10); s = n >= len ? 0 : len - n; e = len - 1; ok = !sb.empty(); }
      else { s = strtoull(sa.c_str(), nullptr, 10); e = sb.empty() ? s + CHUNK - 1 : strtoull(sb.c_str(), nullptr, 10); if (e > len - 1) e = len - 1; }
      if (ok && s <= e && s < len) {
        wchar_t cr[96]; swprintf(cr, 96, L"\r\nContent-Range: bytes %llu-%llu/%llu", s, e, len);
        respond(args, 206, L"Partial Content", a.data + s, (DWORD)(e - s + 1), h + cr);
        return;
      }
    }
  }
  respond(args, 200, L"OK", a.data, a.size, h);
}

// ---------- ответ интерфейсу ----------
static void reply(double id, bool ok, const Json& value) {
  if (!g_wv) return;
  Json m = Json::obj(); m.o["id"] = Json::num(id); m.o["ok"] = Json::boolean(ok); m.o[ok ? "value" : "error"] = value;
  g_wv->PostWebMessageAsJson(W(m.dump()).c_str());
}
static void fail(double id, const std::string& e) { reply(id, false, Json::str(e)); }
static Json opt_str(const std::string& s, bool has) { return has ? Json::str(s) : Json(); }
static bool valid_utf8(const std::string& s) {
  for (size_t i = 0; i < s.size();) {
    unsigned char c = s[i]; int n = c < 0x80 ? 0 : (c >> 5) == 6 ? 1 : (c >> 4) == 14 ? 2 : (c >> 3) == 30 ? 3 : -1;
    if (n < 0 || i + n >= s.size() + (n ? 0 : 1)) return false;
    for (int k = 1; k <= n; k++) if (((unsigned char)s[i + k] >> 6) != 2) return false;
    i += n + 1;
  }
  return true;
}

// ---------- окна Windows: «Сохранить как», выбор папки ----------
#ifdef FZ_TEST
// проверочная сборка: вместо окон выбора — папка из FZ_TEST_SAVE_DIR (автотесты не могут нажимать кнопки в окнах Windows)
static std::string test_save_dir() { wchar_t b[MAX_PATH]; DWORD n = GetEnvironmentVariableW(L"FZ_TEST_SAVE_DIR", b, MAX_PATH); return n && n < MAX_PATH ? U(std::wstring(b, n)) : ""; }
#endif
static bool pick_save(const std::string& name, const std::string& ext, const std::string& label, std::string& out) {
#ifdef FZ_TEST
  { std::string d = test_save_dir(); if (!d.empty()) { out = d + "\\" + name; if (out.size() < ext.size() + 1 || out.substr(out.size() - ext.size() - 1) != "." + ext) out += "." + ext; return true; } }
#endif
  Ptr<IFileSaveDialog> d;
  if (FAILED(CoCreateInstance(CLSID_FileSaveDialog, nullptr, CLSCTX_INPROC_SERVER, IID_IFileSaveDialog, (void**)d.put()))) return false;
  std::wstring lbl = W(label + " (*." + ext + ")"), pat = W("*." + ext), wext = W(ext);
  COMDLG_FILTERSPEC f[] = {{lbl.c_str(), pat.c_str()}};
  d->SetFileTypes(1, f); d->SetDefaultExtension(wext.c_str()); d->SetFileName(W(name).c_str());
  DWORD opt = 0; d->GetOptions(&opt); d->SetOptions(opt | FOS_OVERWRITEPROMPT | FOS_FORCEFILESYSTEM);
  if (d->Show(g_wnd) != S_OK) return false;
  Ptr<IShellItem> it; if (FAILED(d->GetResult(it.put()))) return false;
  CoStr p; if (FAILED(it->GetDisplayName(SIGDN_FILESYSPATH, &p.s))) return false;
  out = U(p.str()); return true;
}
static bool pick_folder(std::string& out) {
#ifdef FZ_TEST
  { std::string d = test_save_dir(); if (!d.empty()) { out = d; return true; } }
#endif
  Ptr<IFileOpenDialog> d;
  if (FAILED(CoCreateInstance(CLSID_FileOpenDialog, nullptr, CLSCTX_INPROC_SERVER, IID_IFileOpenDialog, (void**)d.put()))) return false;
  DWORD opt = 0; d->GetOptions(&opt); d->SetOptions(opt | FOS_PICKFOLDERS | FOS_FORCEFILESYSTEM | FOS_PATHMUSTEXIST);
  if (d->Show(g_wnd) != S_OK) return false;
  Ptr<IShellItem> it; if (FAILED(d->GetResult(it.put()))) return false;
  CoStr p; if (FAILED(it->GetDisplayName(SIGDN_FILESYSPATH, &p.s))) return false;
  out = U(p.str()); return true;
}
static void toggle_full() {
  if (!g_full) {
    MONITORINFO mi = {sizeof mi};
    if (GetWindowPlacement(g_wnd, &g_place) && GetMonitorInfoW(MonitorFromWindow(g_wnd, MONITOR_DEFAULTTOPRIMARY), &mi)) {
      g_style = GetWindowLongW(g_wnd, GWL_STYLE);
      SetWindowLongW(g_wnd, GWL_STYLE, g_style & ~WS_OVERLAPPEDWINDOW);
      SetWindowPos(g_wnd, HWND_TOP, mi.rcMonitor.left, mi.rcMonitor.top, mi.rcMonitor.right - mi.rcMonitor.left, mi.rcMonitor.bottom - mi.rcMonitor.top, SWP_NOOWNERZORDER | SWP_FRAMECHANGED);
      g_full = true;
    }
  } else {
    SetWindowLongW(g_wnd, GWL_STYLE, g_style);
    SetWindowPlacement(g_wnd, &g_place);
    SetWindowPos(g_wnd, nullptr, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOOWNERZORDER | SWP_FRAMECHANGED);
    g_full = false;
  }
}
static bool safe_lw3_name(const std::string& n) {
  return n.size() > 4 && n.size() < 200 && n.substr(n.size() - 4) == ".lw3" && n.find_first_of("/\\:") == std::string::npos && n[0] != '.';
}

// ---------- команды интерфейса (выполняются вне обработчиков WebView2: окна выбора файлов модальные) ----------
static void run(const Req& q) {
  const Json& a = q.args; const std::string& c = q.cmd;
  if (c == "license_status") {
    std::vector<std::string> folders; for (auto& f : a["folders"].a) if (f.t == Json::Str) folders.push_back(f.s);
    reply(q.id, true, lic::status(folders).json());
  } else if (c == "license_activate") {
    lic::Status s; std::string err;
    if (lic::activate(a["text"].text(), s, err)) reply(q.id, true, s.json()); else fail(q.id, err);
  } else if (c == "save_file") {
    std::string path;
    if (!pick_save(a["name"].text(), a["ext"].text("txt"), a["label"].text("Файл"), path)) { reply(q.id, true, Json()); return; }
    if (!write_file(path, a["contents"].text())) { fail(q.id, path + ": не удалось записать файл"); return; }
    reply(q.id, true, Json::str(path));
  } else if (c == "save_pdf") {
    std::string path;
    if (!pick_save(a["name"].text(), "pdf", "PDF", path)) { reply(q.id, true, Json()); return; }
    ICoreWebView2_7* w7 = nullptr;
    if (FAILED(g_wv->QueryInterface(IID_ICoreWebView2_7, (void**)&w7)) || !w7) { fail(q.id, "Эта версия WebView2 не умеет сохранять PDF"); return; }
    double id = q.id;
    HRESULT hr = w7->PrintToPdf(W(path).c_str(), nullptr, make<PdfDone>([id, path](HRESULT r, BOOL ok) -> HRESULT {
      if (SUCCEEDED(r) && ok) reply(id, true, Json::str(path)); else fail(id, "PDF не создан");
      return S_OK;
    }));
    w7->Release();
    if (FAILED(hr)) fail(q.id, "PDF не создан");
  } else if (c == "pick_folder") {
    std::string p; bool ok = pick_folder(p); reply(q.id, true, opt_str(p, ok));
  } else if (c == "write_lw3") {
    std::string name = a["name"].text(), path = a["dir"].text() + "\\" + name;
    if (!safe_lw3_name(name)) { fail(q.id, "недопустимое имя файла"); return; }
    if (!write_file(path, a["contents"].text())) { fail(q.id, path + ": не удалось записать файл"); return; }
    reply(q.id, true, Json::str(path));
  } else if (c == "read_lw3_dir") {
    std::string dir = a["dir"].text(); Json out = Json::arr();
    WIN32_FIND_DATAW fd; HANDLE h = FindFirstFileW(W(dir + "\\*.lw3").c_str(), &fd);
    if (h == INVALID_HANDLE_VALUE) {
      DWORD e = GetLastError();
      if (e != ERROR_FILE_NOT_FOUND) { fail(q.id, dir + ": папка недоступна"); return; }
    } else {
      do {
        if (fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) continue;
        if (fd.nFileSizeHigh || fd.nFileSizeLow > 4000000) continue;
        std::string name = U(fd.cFileName), text;
        if (name.size() < 4) continue;
        std::string low = name.substr(name.size() - 4); for (auto& ch : low) ch = (char)tolower((unsigned char)ch);
        if (low != ".lw3") continue;  // *.lw3 в Windows находит и «.lw3x» по короткому имени
        if (!read_file(dir + "\\" + name, text, 4000000) || !valid_utf8(text)) continue;
        Json pair = Json::arr(); pair.a.push_back(Json::str(name)); pair.a.push_back(Json::str(text)); out.a.push_back(pair);
      } while (out.a.size() < 1000 && FindNextFileW(h, &fd));
      FindClose(h);
    }
    reply(q.id, true, out);
  } else if (c == "app_config") {
    std::string t; bool ok = read_file(exe_dir() + "\\adiabata.json", t, 1u << 20) && valid_utf8(t);
    reply(q.id, true, opt_str(t, ok));
  } else if (c == "set_zoom") {
    double s = a["scale"].number(1); s = s < 0.6 ? 0.6 : s > 2.0 ? 2.0 : s;
    g_ctl->put_ZoomFactor(s); reply(q.id, true, Json());
  } else if (c == "toggle_fullscreen") {
    toggle_full(); reply(q.id, true, Json());
  } else if (c == "open_release") {
    std::string url = a["url"].text();
    if (url.rfind("https://github.com/vitalya2078-cloud/vitalya2078-cloud.github.io/releases", 0) != 0) { fail(q.id, "ссылка не разрешена"); return; }
    ShellExecuteW(g_wnd, L"open", W(url).c_str(), nullptr, nullptr, SW_SHOWNORMAL); reply(q.id, true, Json());
  } else if (c == "app_info") {
    Json j = Json::obj(); j.o["version"] = Json::str(FZ_VERSION); j.o["host"] = Json::str("win32");
    reply(q.id, true, j);
  } else {
    fail(q.id, "неизвестная команда: " + c);
  }
}

// мост: window.__TAURI__.core.invoke(cmd, args) → сообщение программе → ответ по id
static const wchar_t* BRIDGE = LR"JS((() => {
  if (window.__TAURI__ || !window.chrome || !window.chrome.webview) return;
  const wv = window.chrome.webview, wait = new Map(); let n = 0;
  wv.addEventListener('message', e => { const m = e.data; const p = m && wait.get(m.id); if (!p) return; wait.delete(m.id); m.ok ? p[0](m.value) : p[1](m.error); });
  const invoke = (cmd, args) => new Promise((ok, no) => { const id = ++n; wait.set(id, [ok, no]); wv.postMessage(JSON.stringify({ id, cmd, args: args || {} })); });
  Object.defineProperty(window, '__TAURI__', { value: Object.freeze({ core: Object.freeze({ invoke }) }), writable: false });
})();)JS";

static void error_box(const std::wstring& what, HRESULT hr) {
  wchar_t code[32]; swprintf(code, 32, L"0x%08X", (unsigned)hr);
  std::wstring msg = what + L"\n\nКод ошибки: " + code +
    L"\n\nЧто проверить:\n• рядом с программой есть папка WebView2Runtime (переустановите программу);\n"
    L"• в Windows 7 установлен Service Pack 1 и обновления;\n• программа запущена не из архива, а из распакованной папки.";
  MessageBoxW(g_wnd, msg.c_str(), L"Физпрактикум", MB_ICONERROR | MB_OK);
}

static void on_controller(ICoreWebView2Controller* ctl) {
  g_ctl = ctl; g_ctl->AddRef();
  g_ctl->get_CoreWebView2(&g_wv);
  RECT rc; GetClientRect(g_wnd, &rc); g_ctl->put_Bounds(rc);
  ICoreWebView2Controller2* c2 = nullptr;
  if (SUCCEEDED(g_ctl->QueryInterface(IID_ICoreWebView2Controller2, (void**)&c2)) && c2) { c2->put_DefaultBackgroundColor({255, 8, 13, 26}); c2->Release(); }
  Ptr<ICoreWebView2Settings> st;
  if (SUCCEEDED(g_wv->get_Settings(st.put())) && st) {
#ifdef FZ_TEST
    st->put_AreDevToolsEnabled(TRUE);
#else
    st->put_AreDevToolsEnabled(FALSE);
#endif
    st->put_IsZoomControlEnabled(FALSE);
    st->put_IsStatusBarEnabled(FALSE);
    st->put_AreHostObjectsAllowed(FALSE);
    st->put_IsWebMessageEnabled(TRUE);
  }
  EventRegistrationToken t;
  g_wv->AddScriptToExecuteOnDocumentCreated(BRIDGE, make<ScriptDone>([](HRESULT, LPCWSTR) -> HRESULT { return S_OK; }));
  g_wv->AddWebResourceRequestedFilter(L"http://tauri.localhost/*", COREWEBVIEW2_WEB_RESOURCE_CONTEXT_ALL);
  g_wv->AddWebResourceRequestedFilter(L"http://fzv.localhost/*", COREWEBVIEW2_WEB_RESOURCE_CONTEXT_ALL);
  g_wv->add_WebResourceRequested(make<ResReq>([](ICoreWebView2*, ICoreWebView2WebResourceRequestedEventArgs* a) -> HRESULT { serve(a); return S_OK; }), &t);
  // только свои страницы: переходы на другие адреса не открываются
  g_wv->add_NavigationStarting(make<NavStart>([](ICoreWebView2*, ICoreWebView2NavigationStartingEventArgs* a) -> HRESULT {
    CoStr u; a->get_Uri(&u.s); std::wstring s = u.str();
    if (s.rfind(L"http://tauri.localhost/", 0) != 0 && s.rfind(L"about:blank", 0) != 0) a->put_Cancel(TRUE);
    return S_OK;
  }), &t);
  g_wv->add_NewWindowRequested(make<NewWin>([](ICoreWebView2*, ICoreWebView2NewWindowRequestedEventArgs* a) -> HRESULT { a->put_Handled(TRUE); return S_OK; }), &t);
  g_wv->add_WebMessageReceived(make<MsgRecv>([](ICoreWebView2*, ICoreWebView2WebMessageReceivedEventArgs* a) -> HRESULT {
    CoStr src; a->get_Source(&src.s);
    if (src.str().rfind(L"http://tauri.localhost/", 0) != 0) return S_OK;
    CoStr msg; if (FAILED(a->TryGetWebMessageAsString(&msg.s))) return S_OK;
    Json j; if (!Json::parse(U(msg.str()), j) || j.t != Json::Obj) return S_OK;
    g_queue.push_back({j["id"].number(), j["cmd"].text(), j["args"]});
    PostMessageW(g_wnd, WM_FZ_CMD, 0, 0);
    return S_OK;
  }), &t);
  g_wv->add_ProcessFailed(make<ProcFail>([](ICoreWebView2* w, ICoreWebView2ProcessFailedEventArgs* a) -> HRESULT {
    COREWEBVIEW2_PROCESS_FAILED_KIND k; a->get_ProcessFailedKind(&k);
    if (k == COREWEBVIEW2_PROCESS_FAILED_KIND_RENDER_PROCESS_EXITED || k == COREWEBVIEW2_PROCESS_FAILED_KIND_RENDER_PROCESS_UNRESPONSIVE) w->Reload();
    else if (k == COREWEBVIEW2_PROCESS_FAILED_KIND_BROWSER_PROCESS_EXITED) { MessageBoxW(g_wnd, L"Встроенный движок программы неожиданно завершился. Перезапустите программу.", L"Физпрактикум", MB_ICONERROR); PostMessageW(g_wnd, WM_CLOSE, 0, 0); }
    return S_OK;
  }), &t);
  g_wv->Navigate(L"http://tauri.localhost/");
}

static LRESULT CALLBACK wnd_proc(HWND h, UINT m, WPARAM w, LPARAM l) {
  switch (m) {
    case WM_SIZE: if (g_ctl) { RECT rc; GetClientRect(h, &rc); g_ctl->put_Bounds(rc); } return 0;
    case WM_MOVE: case WM_MOVING: if (g_ctl) g_ctl->NotifyParentWindowPositionChanged(); break;
    case WM_SETFOCUS: if (g_ctl) g_ctl->MoveFocus(COREWEBVIEW2_MOVE_FOCUS_REASON_PROGRAMMATIC); return 0;
    case WM_GETMINMAXINFO: {
      HDC dc = GetDC(h); int dpi = dc ? GetDeviceCaps(dc, LOGPIXELSX) : 96; if (dc) ReleaseDC(h, dc);
      auto* mm = (MINMAXINFO*)l; mm->ptMinTrackSize.x = MulDiv(1100, dpi, 96); mm->ptMinTrackSize.y = MulDiv(680, dpi, 96);
      return 0;
    }
    case WM_FZ_CMD:
      while (!g_queue.empty()) { Req q = g_queue.front(); g_queue.pop_front(); if (g_wv) run(q); }
      return 0;
    case WM_DESTROY:
      if (g_ctl) { g_ctl->Close(); }
      PostQuitMessage(0); return 0;
  }
  return DefWindowProcW(h, m, w, l);
}

static void dpi_aware() {  // Windows 8.1+: по мониторам; Windows 7: системный
  if (HMODULE u = LoadLibraryW(L"user32.dll")) {
    typedef BOOL(WINAPI * Ctx)(HANDLE);
    if (auto f = (Ctx)GetProcAddress(u, "SetProcessDpiAwarenessContext")) { if (f((HANDLE)-4)) return; }
  }
  if (HMODULE s = LoadLibraryW(L"shcore.dll")) {
    typedef HRESULT(WINAPI * Aw)(int);
    if (auto f = (Aw)GetProcAddress(s, "SetProcessDpiAwareness")) { if (SUCCEEDED(f(2))) return; }
  }
  SetProcessDPIAware();
}

int WINAPI wWinMain(HINSTANCE inst, HINSTANCE, LPWSTR, int show) {
#ifndef FZ_TEST
  // настройки WebView2 из переменных окружения не принимаем: никакой отладки и чужого движка у курсантов
  for (const wchar_t* v : {L"WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", L"WEBVIEW2_BROWSER_EXECUTABLE_FOLDER", L"WEBVIEW2_USER_DATA_FOLDER",
                           L"WEBVIEW2_RELEASE_CHANNEL_PREFERENCE", L"WEBVIEW2_PIPE_FOR_SCRIPT_DEBUGGER"})
    SetEnvironmentVariableW(v, nullptr);
#endif
  dpi_aware();
  if (FAILED(CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED))) return 1;
  if (!load_pak()) { MessageBoxW(nullptr, L"Файлы программы повреждены. Переустановите программу.", L"Физпрактикум", MB_ICONERROR); return 1; }

  WNDCLASSEXW wc = {sizeof wc};
  wc.lpfnWndProc = wnd_proc; wc.hInstance = inst; wc.lpszClassName = L"Fizpraktikum";
  wc.hCursor = LoadCursorW(nullptr, IDC_ARROW); wc.hbrBackground = CreateSolidBrush(RGB(8, 13, 26));
  wc.hIcon = LoadIconW(inst, MAKEINTRESOURCEW(IDI_APP)); wc.hIconSm = wc.hIcon;
  RegisterClassExW(&wc);
  g_wnd = CreateWindowExW(0, L"Fizpraktikum", L"Физпрактикум", WS_OVERLAPPEDWINDOW, CW_USEDEFAULT, CW_USEDEFAULT, 1440, 900, nullptr, nullptr, inst, nullptr);
  if (!g_wnd) return 1;
  ShowWindow(g_wnd, show == SW_SHOWMINIMIZED || show == SW_MINIMIZE ? show : SW_SHOWMAXIMIZED); UpdateWindow(g_wnd);

  std::string runtime = exe_dir() + "\\WebView2Runtime", data = local_appdata() + "\\Fizpraktikum";
  make_dir(data); data += "\\WebView"; make_dir(data);
  if (GetFileAttributesW(W(runtime + "\\msedgewebview2.exe").c_str()) == INVALID_FILE_ATTRIBUTES) {
    MessageBoxW(g_wnd, L"Не найдена папка WebView2Runtime рядом с программой. Переустановите программу.", L"Физпрактикум", MB_ICONERROR);
    return 1;
  }
  ICoreWebView2EnvironmentOptions* opts = nullptr;
#ifdef FZ_TEST
  // проверочная сборка: порт отладки для автоматических тестов (FZ_CDP_PORT)
  wchar_t port[16];
  if (GetEnvironmentVariableW(L"FZ_CDP_PORT", port, 16)) {
    struct Opts : ICoreWebView2EnvironmentOptions {
      std::wstring args; LONG rc = 1; virtual ~Opts() {}
      HRESULT STDMETHODCALLTYPE QueryInterface(REFIID r, void** p) override { if (r == IID_IUnknown || r == IID_ICoreWebView2EnvironmentOptions) { *p = this; AddRef(); return S_OK; } *p = nullptr; return E_NOINTERFACE; }
      ULONG STDMETHODCALLTYPE AddRef() override { return InterlockedIncrement(&rc); }
      ULONG STDMETHODCALLTYPE Release() override { LONG r = InterlockedDecrement(&rc); if (!r) delete this; return r; }
      static HRESULT dup(const std::wstring& s, LPWSTR* out) { *out = (LPWSTR)CoTaskMemAlloc((s.size() + 1) * 2); if (!*out) return E_OUTOFMEMORY; memcpy(*out, s.c_str(), (s.size() + 1) * 2); return S_OK; }
      HRESULT STDMETHODCALLTYPE get_AdditionalBrowserArguments(LPWSTR* v) override { return dup(args, v); }
      HRESULT STDMETHODCALLTYPE put_AdditionalBrowserArguments(LPCWSTR v) override { args = v; return S_OK; }
      HRESULT STDMETHODCALLTYPE get_Language(LPWSTR* v) override { return dup(L"", v); }
      HRESULT STDMETHODCALLTYPE put_Language(LPCWSTR) override { return S_OK; }
      HRESULT STDMETHODCALLTYPE get_TargetCompatibleBrowserVersion(LPWSTR* v) override { return dup(L"109.0.1518.46", v); }
      HRESULT STDMETHODCALLTYPE put_TargetCompatibleBrowserVersion(LPCWSTR) override { return S_OK; }
      HRESULT STDMETHODCALLTYPE get_AllowSingleSignOnUsingOSPrimaryAccount(BOOL* v) override { *v = FALSE; return S_OK; }
      HRESULT STDMETHODCALLTYPE put_AllowSingleSignOnUsingOSPrimaryAccount(BOOL) override { return S_OK; }
    };
    auto* o = new Opts(); o->args = std::wstring(L"--remote-debugging-port=") + port; opts = o;
  }
#endif
  HRESULT hr = CreateCoreWebView2EnvironmentWithOptions(W(runtime).c_str(), W(data).c_str(), opts,
    make<EnvDone>([](HRESULT r, ICoreWebView2Environment* env) -> HRESULT {
      if (FAILED(r) || !env) { error_box(L"Не удалось запустить встроенный движок программы (WebView2).", r); PostMessageW(g_wnd, WM_CLOSE, 0, 0); return S_OK; }
      g_env = env; g_env->AddRef();
      return g_env->CreateCoreWebView2Controller(g_wnd, make<CtlDone>([](HRESULT r2, ICoreWebView2Controller* c) -> HRESULT {
        if (FAILED(r2) || !c) { error_box(L"Не удалось открыть окно программы (WebView2).", r2); PostMessageW(g_wnd, WM_CLOSE, 0, 0); return S_OK; }
        on_controller(c); return S_OK;
      }));
    }));
  if (opts) opts->Release();
  if (FAILED(hr)) { error_box(L"Не удалось запустить встроенный движок программы (WebView2).", hr); return 1; }

  MSG msg;
  while (GetMessageW(&msg, nullptr, 0, 0) > 0) { TranslateMessage(&msg); DispatchMessageW(&msg); }
  CoUninitialize();
  return 0;
}
