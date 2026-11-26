// «Генератор ключей Физпрактикума» для Windows 7 и новее: обычное окно Win32, без браузера и интернета.
// Секретный ключ хранится только в файле fizpraktikum-secret.key у кафедры. Журнал выдачи — «Журнал ключей.csv» рядом с программой.
#ifndef UNICODE
#define UNICODE
#endif
#define NOMINMAX
#include <windows.h>
#include <commctrl.h>
#include <commdlg.h>
#include <shlobj.h>
#include <string>
#include <vector>
#include <ctime>
#include "keygen-core.h"

static std::wstring W(const std::string& s) { if (s.empty()) return L""; int n = MultiByteToWideChar(CP_UTF8, 0, s.data(), (int)s.size(), 0, 0); std::wstring w(n, 0); MultiByteToWideChar(CP_UTF8, 0, s.data(), (int)s.size(), &w[0], n); return w; }
static std::string U(const std::wstring& w) { if (w.empty()) return ""; int n = WideCharToMultiByte(CP_UTF8, 0, w.data(), (int)w.size(), 0, 0, 0, 0); std::string s(n, 0); WideCharToMultiByte(CP_UTF8, 0, w.data(), (int)w.size(), &s[0], n, 0, 0); return s; }

enum { ID_NEW = 101, ID_OPEN, ID_PK, ID_PKCOPY, ID_CODES, ID_FOREVER, ID_UNTIL, ID_DATE, ID_MAKE, ID_OUT, ID_SAVE, ID_COPY, ID_JOURNAL, ID_STATUS, ID_KEYST };
static HWND g_w, g_pk, g_codes, g_date, g_out, g_status, g_keyst, g_forever, g_until;
static HFONT g_font, g_bold, g_mono;
static bool g_has = false; static unsigned char g_seed[32];
static std::string g_last;               // последние ключи «код ключ» для файла лицензии
static int g_dpi = 96;
static int S(int v) { return MulDiv(v, g_dpi, 96); }

static std::wstring text(HWND h) { int n = GetWindowTextLengthW(h); std::wstring s(n, 0); if (n) GetWindowTextW(h, &s[0], n + 1); return s; }
static bool g_bad = false;
static void status(const std::wstring& s, bool bad = false) { g_bad = bad; SetWindowTextW(g_status, s.c_str()); InvalidateRect(g_status, 0, TRUE); }
static std::wstring exe_dir() { wchar_t b[MAX_PATH]; GetModuleFileNameW(0, b, MAX_PATH); std::wstring p(b); return p.substr(0, p.find_last_of(L"\\/")); }
static bool write_file(const std::wstring& path, const std::string& data) {
  HANDLE f = CreateFileW(path.c_str(), GENERIC_WRITE, 0, 0, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, 0); if (f == INVALID_HANDLE_VALUE) return false;
  DWORD wr = 0; BOOL ok = WriteFile(f, data.data(), (DWORD)data.size(), &wr, 0); CloseHandle(f); return ok && wr == data.size();
}
static bool append_file(const std::wstring& path, const std::string& data, bool bom) {
  HANDLE f = CreateFileW(path.c_str(), FILE_APPEND_DATA, FILE_SHARE_READ, 0, OPEN_ALWAYS, FILE_ATTRIBUTE_NORMAL, 0); if (f == INVALID_HANDLE_VALUE) return false;
  LARGE_INTEGER sz; GetFileSizeEx(f, &sz); std::string d = (bom && sz.QuadPart == 0 ? std::string("\xEF\xBB\xBF") : "") + data;
  DWORD wr = 0; BOOL ok = WriteFile(f, d.data(), (DWORD)d.size(), &wr, 0); CloseHandle(f); return ok != 0;
}
static bool read_file(const std::wstring& path, std::string& out) {
  HANDLE f = CreateFileW(path.c_str(), GENERIC_READ, FILE_SHARE_READ, 0, OPEN_EXISTING, 0, 0); if (f == INVALID_HANDLE_VALUE) return false;
  LARGE_INTEGER sz; GetFileSizeEx(f, &sz); if (sz.QuadPart > (1 << 20)) { CloseHandle(f); return false; }
  out.resize((size_t)sz.QuadPart); DWORD rd = 0; BOOL ok = ReadFile(f, &out[0], (DWORD)out.size(), &rd, 0); CloseHandle(f); return ok && rd == out.size();
}
static bool pick_file(bool save, const wchar_t* filter, const wchar_t* def, const wchar_t* ext, std::wstring& path) {
  wchar_t buf[MAX_PATH] = {0}; if (def) lstrcpynW(buf, def, MAX_PATH);
  OPENFILENAMEW o = {sizeof o}; o.hwndOwner = g_w; o.lpstrFilter = filter; o.lpstrFile = buf; o.nMaxFile = MAX_PATH; o.lpstrDefExt = ext;
  o.Flags = save ? (OFN_OVERWRITEPROMPT | OFN_PATHMUSTEXIST) : (OFN_FILEMUSTEXIST | OFN_PATHMUSTEXIST);
  if (!(save ? GetSaveFileNameW(&o) : GetOpenFileNameW(&o))) return false; path = buf; return true;
}
static void clip(const std::wstring& s) {
  if (!OpenClipboard(g_w)) return; EmptyClipboard(); HGLOBAL h = GlobalAlloc(GMEM_MOVEABLE, (s.size() + 1) * 2);
  if (h) { memcpy(GlobalLock(h), s.c_str(), (s.size() + 1) * 2); GlobalUnlock(h); SetClipboardData(CF_UNICODETEXT, h); } CloseClipboard();
}
static void set_key(const unsigned char seed[32], const std::wstring& from) {
  memcpy(g_seed, seed, 32); g_has = true; unsigned char pk[32]; kg::public_key(seed, pk);
  SetWindowTextW(g_pk, W(kg::hex(pk, 32)).c_str()); SetWindowTextW(g_keyst, (L"Секретный ключ загружен: " + from).c_str());
  EnableWindow(GetDlgItem(g_w, ID_MAKE), TRUE); EnableWindow(GetDlgItem(g_w, ID_PKCOPY), TRUE);
}
static std::string now_iso() { SYSTEMTIME t; GetSystemTime(&t); char b[40]; wsprintfA(b, "%04d-%02d-%02dT%02d:%02d:%02dZ", t.wYear, t.wMonth, t.wDay, t.wHour, t.wMinute, t.wSecond); return b; }

static void on_new() {
  if (g_has && MessageBoxW(g_w, L"Секретный ключ уже загружен. Создать новый?\n\nКлючи, выданные старым секретным ключом, не будут работать в программе, собранной с новым открытым ключом.", L"Новый секретный ключ", MB_YESNO | MB_ICONWARNING) != IDYES) return;
  unsigned char seed[32];
  typedef BOOLEAN(WINAPI * RGR)(PVOID, ULONG); HMODULE a = LoadLibraryW(L"advapi32.dll"); RGR rnd = a ? (RGR)GetProcAddress(a, "SystemFunction036") : 0;
  if (!rnd || !rnd(seed, 32)) { MessageBoxW(g_w, L"Не удалось получить случайные числа от Windows.", L"Ошибка", MB_ICONERROR); return; }
  std::wstring path; if (!pick_file(true, L"Секретный ключ (*.key)\0*.key\0", L"fizpraktikum-secret.key", L"key", path)) { SecureZeroMemory(seed, 32); return; }
  if (!write_file(path, kg::key_file_json(seed, now_iso()))) { MessageBoxW(g_w, L"Не удалось сохранить файл ключа.", L"Ошибка", MB_ICONERROR); return; }
  set_key(seed, path.substr(path.find_last_of(L"\\/") + 1)); SecureZeroMemory(seed, 32);
  MessageBoxW(g_w, L"Секретный ключ создан и сохранён.\n\n• Сделайте копию файла на флешку и храните её отдельно.\n• Никому не передавайте этот файл и не выкладывайте его в интернет.\n• Открытый ключ (поле ниже) вставьте в переменную FZ_LICENSE_PUBKEY на GitHub.", L"Готово", MB_ICONINFORMATION);
}
static void on_open() {
  std::wstring path; if (!pick_file(false, L"Секретный ключ (*.key)\0*.key\0Все файлы\0*.*\0", 0, L"key", path)) return;
  std::string j; unsigned char seed[32];
  if (!read_file(path, j) || !kg::read_key_file(j, seed)) { status(L"Это не файл секретного ключа «Физпрактикума».", true); return; }
  set_key(seed, path.substr(path.find_last_of(L"\\/") + 1)); SecureZeroMemory(seed, 32); status(L"");
}
static void on_make() {
  if (!g_has) { status(L"Сначала создайте или откройте секретный ключ.", true); return; }
  bool until = SendMessageW(g_until, BM_GETCHECK, 0, 0) == BST_CHECKED; std::string date;
  if (until) { SYSTEMTIME t; DateTime_GetSystemtime(g_date, &t); char b[16]; wsprintfA(b, "%04d-%02d-%02d", t.wYear, t.wMonth, t.wDay); date = b;
    SYSTEMTIME n; GetLocalTime(&n); if (kg::days(t.wYear, t.wMonth, t.wDay) < kg::days(n.wYear, n.wMonth, n.wDay)) { status(L"Дата окончания уже прошла.", true); return; } }
  std::string in = U(text(g_codes)), outText, bad; g_last.clear(); int n = 0;
  std::wstring jpath = exe_dir() + L"\\Журнал ключей.csv"; std::string journal; SYSTEMTIME lt; GetLocalTime(&lt); char at[32]; wsprintfA(at, "%02d.%02d.%04d %02d:%02d", lt.wDay, lt.wMonth, lt.wYear, lt.wHour, lt.wMinute);
  size_t p = 0;
  while (p <= in.size()) {
    size_t e = in.find('\n', p); if (e == std::string::npos) e = in.size(); std::string line = in.substr(p, e - p); p = e + 1;
    while (!line.empty() && (line.back() == '\r' || line.back() == ' ')) line.pop_back(); if (line.find_first_not_of(" \t") == std::string::npos) continue;
    std::string code, who; if (!kg::parse_line(line, code, who)) { bad += (bad.empty() ? "" : ", ") + line; continue; }
    std::string key = kg::make_key(g_seed, code, date); n++;
    outText += code + (who.empty() ? "" : "  (" + who + ")") + "  до: " + (date.empty() ? "бессрочно" : date) + "\r\n" + key + "\r\n\r\n";
    g_last += code + " " + key + "\n";
    std::string w2 = who; for (auto& ch : w2) if (ch == ';') ch = ',';
    journal += std::string(at) + ";" + code + ";" + w2 + ";" + (date.empty() ? "бессрочно" : date) + ";" + key + "\r\n";
  }
  SetWindowTextW(g_out, W(outText).c_str());
  EnableWindow(GetDlgItem(g_w, ID_SAVE), n > 0); EnableWindow(GetDlgItem(g_w, ID_COPY), n > 0);
  if (n) { if (!append_file(jpath, journal, true)) { wchar_t d[MAX_PATH]; if (SUCCEEDED(SHGetFolderPathW(0, CSIDL_PERSONAL, 0, 0, d))) { jpath = std::wstring(d) + L"\\Журнал ключей.csv"; append_file(jpath, journal, true); } } }
  if (!bad.empty()) status(L"Не распознаны коды: " + W(bad), true);
  else if (n) status(L"Готово: ключей — " + std::to_wstring(n) + L". Записано в журнал: " + jpath.substr(jpath.find_last_of(L"\\/") + 1) + L".");
  else status(L"Вставьте коды компьютеров: по одному в строке.", true);
}
static void on_save() {
  if (g_last.empty()) return; std::wstring path; if (!pick_file(true, L"Файл лицензии (*.fzl)\0*.fzl\0", L"license.fzl", L"fzl", path)) return;
  if (write_file(path, "\xEF\xBB\xBF# Файл лицензии «Физпрактикума»: код компьютера и ключ\r\n" + g_last)) status(L"Файл лицензии сохранён: " + path); else status(L"Не удалось сохранить файл.", true);
}
static void on_journal() {
  std::wstring p = exe_dir() + L"\\Журнал ключей.csv";
  if (GetFileAttributesW(p.c_str()) == INVALID_FILE_ATTRIBUTES) { wchar_t d[MAX_PATH]; if (SUCCEEDED(SHGetFolderPathW(0, CSIDL_PERSONAL, 0, 0, d))) p = std::wstring(d) + L"\\Журнал ключей.csv"; }
  if (GetFileAttributesW(p.c_str()) == INVALID_FILE_ATTRIBUTES) { status(L"Журнал пока пуст: ключи ещё не выдавались.", true); return; }
  ShellExecuteW(g_w, L"open", p.c_str(), 0, 0, SW_SHOWNORMAL);
}

static HWND mk(const wchar_t* cls, const wchar_t* t, DWORD st, int x, int y, int w, int h, int id, HFONT f = 0, DWORD ex = 0) {
  HWND c = CreateWindowExW(ex, cls, t, WS_CHILD | WS_VISIBLE | st, S(x), S(y), S(w), S(h), g_w, (HMENU)(INT_PTR)id, GetModuleHandleW(0), 0);
  SendMessageW(c, WM_SETFONT, (WPARAM)(f ? f : g_font), TRUE); return c;
}
static void build() {
  const int X = 18, Wd = 664;
  mk(L"STATIC", L"1. Секретный ключ кафедры", 0, X, 14, Wd, 20, -1, g_bold);
  g_keyst = mk(L"STATIC", L"Ключ не загружен. Создайте новый (один раз) или откройте файл fizpraktikum-secret.key.", 0, X, 36, Wd, 18, ID_KEYST);
  mk(L"BUTTON", L"Создать новый секретный ключ…", BS_PUSHBUTTON | WS_TABSTOP, X, 58, 250, 30, ID_NEW);
  mk(L"BUTTON", L"Открыть файл ключа…", BS_PUSHBUTTON | WS_TABSTOP, X + 260, 58, 200, 30, ID_OPEN);
  mk(L"STATIC", L"Открытый ключ (вставить в FZ_LICENSE_PUBKEY на GitHub при сборке программы):", 0, X, 98, Wd, 18, -1);
  g_pk = mk(L"EDIT", L"", ES_READONLY | ES_AUTOHSCROLL | WS_BORDER, X, 118, 560, 26, ID_PK, g_mono);
  HWND b = mk(L"BUTTON", L"Копировать", BS_PUSHBUTTON | WS_TABSTOP, X + 568, 117, 96, 28, ID_PKCOPY); EnableWindow(b, FALSE);
  mk(L"STATIC", L"2. Коды компьютеров — по одному в строке, после кода можно написать, кому (класс, ФИО)", 0, X, 158, Wd, 20, -1, g_bold);
  g_codes = mk(L"EDIT", L"", ES_MULTILINE | ES_AUTOVSCROLL | ES_WANTRETURN | WS_VSCROLL | WS_BORDER | WS_TABSTOP, X, 180, Wd, 118, ID_CODES, g_mono);
  mk(L"STATIC", L"3. Срок действия", 0, X, 310, Wd, 20, -1, g_bold);
  g_forever = mk(L"BUTTON", L"Бессрочно", BS_AUTORADIOBUTTON | WS_GROUP | WS_TABSTOP, X, 334, 120, 24, ID_FOREVER);
  g_until = mk(L"BUTTON", L"Действует до:", BS_AUTORADIOBUTTON, X + 130, 334, 130, 24, ID_UNTIL);
  g_date = mk(DATETIMEPICK_CLASSW, L"", DTS_SHORTDATEFORMAT | WS_TABSTOP, X + 264, 332, 160, 28, ID_DATE);
  SendMessageW(g_until, BM_SETCHECK, BST_CHECKED, 0);
  SYSTEMTIME t; GetLocalTime(&t); t.wYear += 1; if (t.wMonth == 2 && t.wDay == 29) t.wDay = 28; DateTime_SetSystemtime(g_date, GDT_VALID, &t);
  b = mk(L"BUTTON", L"Сделать ключи", BS_DEFPUSHBUTTON | WS_TABSTOP, X + 464, 330, 200, 32, ID_MAKE, g_bold); EnableWindow(b, FALSE);
  mk(L"STATIC", L"Ключи", 0, X, 374, Wd, 20, -1, g_bold);
  g_out = mk(L"EDIT", L"", ES_MULTILINE | ES_READONLY | ES_AUTOVSCROLL | WS_VSCROLL | WS_BORDER, X, 396, Wd, 150, ID_OUT, g_mono);
  b = mk(L"BUTTON", L"Сохранить файл лицензии…", BS_PUSHBUTTON | WS_TABSTOP, X, 556, 220, 30, ID_SAVE); EnableWindow(b, FALSE);
  b = mk(L"BUTTON", L"Копировать ключи", BS_PUSHBUTTON | WS_TABSTOP, X + 230, 556, 170, 30, ID_COPY); EnableWindow(b, FALSE);
  mk(L"BUTTON", L"Открыть журнал выдачи", BS_PUSHBUTTON | WS_TABSTOP, X + 410, 556, 200, 30, ID_JOURNAL);
  g_status = mk(L"STATIC", L"", 0, X, 596, Wd, 34, ID_STATUS);
}
static LRESULT CALLBACK proc(HWND h, UINT m, WPARAM w, LPARAM l) {
  switch (m) {
    case WM_COMMAND:
      switch (LOWORD(w)) {
        case ID_NEW: on_new(); break; case ID_OPEN: on_open(); break; case ID_MAKE: on_make(); break; case ID_SAVE: on_save(); break;
        case ID_COPY: { std::wstring s = W(g_last); std::wstring r; for (wchar_t c : s) { if (c == L'\n') r += L'\r'; r += c; } clip(r); status(L"Ключи скопированы."); break; }
        case ID_PKCOPY: clip(text(g_pk)); status(L"Открытый ключ скопирован."); break;
        case ID_JOURNAL: on_journal(); break;
        case ID_FOREVER: case ID_UNTIL: EnableWindow(g_date, SendMessageW(g_until, BM_GETCHECK, 0, 0) == BST_CHECKED); break;
      }
      return 0;
    case WM_CTLCOLORSTATIC: { HDC dc = (HDC)w; SetBkMode(dc, TRANSPARENT); if ((HWND)l == g_status) SetTextColor(dc, g_bad ? RGB(190, 40, 30) : RGB(20, 120, 60)); return (LRESULT)GetSysColorBrush(COLOR_WINDOW); }
    case WM_DESTROY: SecureZeroMemory(g_seed, 32); PostQuitMessage(0); return 0;
  }
  return DefWindowProcW(h, m, w, l);
}
int WINAPI wWinMain(HINSTANCE inst, HINSTANCE, LPWSTR, int show) {
  SetProcessDPIAware();
  INITCOMMONCONTROLSEX ic = {sizeof ic, ICC_DATE_CLASSES | ICC_STANDARD_CLASSES}; InitCommonControlsEx(&ic);
  HDC dc = GetDC(0); g_dpi = GetDeviceCaps(dc, LOGPIXELSX); ReleaseDC(0, dc);
  g_font = CreateFontW(-S(14), 0, 0, 0, FW_NORMAL, 0, 0, 0, DEFAULT_CHARSET, 0, 0, CLEARTYPE_QUALITY, 0, L"Segoe UI");
  g_bold = CreateFontW(-S(14), 0, 0, 0, FW_BOLD, 0, 0, 0, DEFAULT_CHARSET, 0, 0, CLEARTYPE_QUALITY, 0, L"Segoe UI");
  g_mono = CreateFontW(-S(14), 0, 0, 0, FW_NORMAL, 0, 0, 0, DEFAULT_CHARSET, 0, 0, CLEARTYPE_QUALITY, 0, L"Consolas");
  WNDCLASSEXW wc = {sizeof wc}; wc.lpfnWndProc = proc; wc.hInstance = inst; wc.lpszClassName = L"FzKeygen"; wc.hCursor = LoadCursorW(0, IDC_ARROW);
  wc.hbrBackground = GetSysColorBrush(COLOR_WINDOW); wc.hIcon = LoadIconW(inst, MAKEINTRESOURCEW(1)); wc.hIconSm = wc.hIcon; RegisterClassExW(&wc);
  RECT r = {0, 0, S(700), S(640)}; DWORD st = WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU | WS_MINIMIZEBOX; AdjustWindowRect(&r, st, FALSE);
  g_w = CreateWindowExW(0, L"FzKeygen", L"Генератор ключей «Физпрактикума»", st, CW_USEDEFAULT, CW_USEDEFAULT, r.right - r.left, r.bottom - r.top, 0, 0, inst, 0);
  build(); ShowWindow(g_w, show); UpdateWindow(g_w);
  MSG msg; while (GetMessageW(&msg, 0, 0, 0) > 0) { if (!IsDialogMessageW(g_w, &msg)) { TranslateMessage(&msg); DispatchMessageW(&msg); } }
  return 0;
}
