// «Генератор ключей Физпрактикума» для Windows 7 и новее: окно Win32 в оформлении программы, без браузера и интернета.
// Секретный ключ хранится только в файле fizpraktikum-secret.key у кафедры; генератор помнит лишь путь к нему.
// FZ_EXPECTED_PK — открытый ключ, вшитый в программу (lw3-desktop/license-pubkey.txt): генератор сразу говорит,
// подходят ли ключи из открытого файла к программе. Журнал выдачи — «Журнал ключей.csv» рядом с генератором.
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
#include "keygen-core.h"

#ifndef FZ_EXPECTED_PK
#define FZ_EXPECTED_PK ""
#endif

static std::wstring W(const std::string& s) { if (s.empty()) return L""; int n = MultiByteToWideChar(CP_UTF8, 0, s.data(), (int)s.size(), 0, 0); std::wstring w(n, 0); MultiByteToWideChar(CP_UTF8, 0, s.data(), (int)s.size(), &w[0], n); return w; }
static std::string U(const std::wstring& w) { if (w.empty()) return ""; int n = WideCharToMultiByte(CP_UTF8, 0, w.data(), (int)w.size(), 0, 0, 0, 0); std::string s(n, 0); WideCharToMultiByte(CP_UTF8, 0, w.data(), (int)w.size(), &s[0], n, 0, 0); return s; }

// ---------- оформление: светлая тема «Физпрактикума» ----------
static const COLORREF C_BG = RGB(0xF2, 0xF4, 0xF7), C_CARD = RGB(255, 255, 255), C_LINE = RGB(0xDD, 0xE2, 0xE9), C_TEXT = RGB(0x1A, 0x1F, 0x27),
  C_MUTED = RGB(0x6B, 0x75, 0x84), C_ACC = RGB(0xFF, 0x7A, 0x45), C_ACC_D = RGB(0xE8, 0x62, 0x2E), C_ACC_T = RGB(0x1C, 0x0C, 0x04),
  C_ACC_L = RGB(0xFF, 0xEC, 0xE3), C_OK = RGB(0x15, 0x80, 0x3D), C_OK_L = RGB(0xE3, 0xF6, 0xE9), C_BAD = RGB(0xC0, 0x26, 0x2D), C_BAD_L = RGB(0xFD, 0xE8, 0xE9),
  C_OFF = RGB(0xE6, 0xE9, 0xEE), C_OFF_T = RGB(0x9A, 0xA4, 0xB2);

enum { ID_NEW = 101, ID_OPEN, ID_PKCOPY, ID_CODES, ID_FOREVER, ID_UNTIL, ID_DATE, ID_MAKE, ID_OUT, ID_SAVE, ID_COPY, ID_JOURNAL };
static HWND g_w, g_codes, g_date, g_out;
static HFONT g_font, g_bold, g_mono, g_title, g_small, g_num;
static HBRUSH g_brCard;
static bool g_has = false, g_until = true; static unsigned char g_seed[32];
static std::string g_last, g_pk;         // последние ключи «код ключ» для файла лицензии; открытый ключ загруженного файла
static std::wstring g_keyfile;            // имя открытого файла ключа
static std::wstring g_status; static bool g_bad = false;
static int g_dpi = 96;
static int S(int v) { return MulDiv(v, g_dpi, 96); }

// раскладка (в точках при 96 dpi)
static const int CW = 760, CH = 712, PX = 20, CX = 20, CWD = 720, IND = 54;
static const RECT R_C1 = {CX, 76, CX + CWD, 76 + 164}, R_C2 = {CX, 250, CX + CWD, 250 + 232}, R_C3 = {CX, 492, CX + CWD, 492 + 186};

static std::wstring text(HWND h) { int n = GetWindowTextLengthW(h); std::wstring s(n, 0); if (n) GetWindowTextW(h, &s[0], n + 1); return s; }
static RECT SR(RECT r) { return {S(r.left), S(r.top), S(r.right), S(r.bottom)}; }
static void repaint() { InvalidateRect(g_w, 0, FALSE); }
static void status(const std::wstring& s, bool bad = false) { g_status = s; g_bad = bad; repaint(); }
static std::wstring exe_dir() { wchar_t b[MAX_PATH]; GetModuleFileNameW(0, b, MAX_PATH); std::wstring p(b); return p.substr(0, p.find_last_of(L"\\/")); }
static std::wstring base(const std::wstring& p) { return p.substr(p.find_last_of(L"\\/") + 1); }
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
  out.resize((size_t)sz.QuadPart); DWORD rd = 0; BOOL ok = out.empty() ? TRUE : ReadFile(f, &out[0], (DWORD)out.size(), &rd, 0); CloseHandle(f); return ok && rd == out.size();
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
// путь к последнему файлу ключа (только путь, не сам ключ) — чтобы не искать его каждый раз
static const wchar_t* REG = L"Software\\Fizpraktikum\\Keygen";
static void remember(const std::wstring& p) { HKEY k; if (RegCreateKeyExW(HKEY_CURRENT_USER, REG, 0, 0, 0, KEY_WRITE, 0, &k, 0) == ERROR_SUCCESS) { RegSetValueExW(k, L"LastKeyFile", 0, REG_SZ, (const BYTE*)p.c_str(), (DWORD)((p.size() + 1) * 2)); RegCloseKey(k); } }
static std::wstring remembered() {
  HKEY k; std::wstring r; if (RegOpenKeyExW(HKEY_CURRENT_USER, REG, 0, KEY_READ, &k) != ERROR_SUCCESS) return r;
  wchar_t b[MAX_PATH] = {0}; DWORD sz = sizeof b - 2, t = 0; if (RegQueryValueExW(k, L"LastKeyFile", 0, &t, (BYTE*)b, &sz) == ERROR_SUCCESS && t == REG_SZ) r = b; RegCloseKey(k); return r;
}
static const char EXPECTED_PK[] = FZ_EXPECTED_PK;
static const char* volatile g_expected = EXPECTED_PK;   // через volatile: строка остаётся в exe целиком, сборка её проверяет
static std::string expected() { std::string e = g_expected; for (auto& c : e) c = (char)tolower((unsigned char)c); return e; }
static bool matches() { return g_has && (expected().empty() || g_pk == expected()); }
static void enable(int id, bool on) { HWND h = GetDlgItem(g_w, id); EnableWindow(h, on); InvalidateRect(h, 0, FALSE); }

static void set_key(const unsigned char seed[32], const std::wstring& path) {
  memcpy(g_seed, seed, 32); g_has = true; unsigned char pk[32]; kg::public_key(seed, pk); g_pk = kg::hex(pk, 32); g_keyfile = base(path);
  enable(ID_MAKE, true); enable(ID_PKCOPY, true); remember(path); repaint();
}
static std::string now_iso() { SYSTEMTIME t; GetSystemTime(&t); char b[40]; wsprintfA(b, "%04d-%02d-%02dT%02d:%02d:%02dZ", t.wYear, t.wMonth, t.wDay, t.wHour, t.wMinute, t.wSecond); return b; }

static bool load(const std::wstring& path, bool quiet) {
  std::string j; unsigned char seed[32];
  if (!read_file(path, j) || !kg::read_key_file(j, seed)) { if (!quiet) status(L"Это не файл секретного ключа «Физпрактикума». Нужен файл fizpraktikum-secret.key.", true); return false; }
  set_key(seed, path); SecureZeroMemory(seed, 32);
  if (!matches()) status(L"Этот секретный ключ не подходит к программе. Откройте другой файл fizpraktikum-secret.key.", true);
  else status(quiet ? L"Открыт ключ, с которым вы работали в прошлый раз." : L"");
  return true;
}
static void on_new() {
  std::wstring msg = L"Новый секретный ключ нужен только один раз, при первой настройке.\n\n";
  if (!expected().empty()) msg += L"Ключи от нового файла программа НЕ примет, пока её не пересоберут с его открытым ключом. Если у кафедры уже есть файл fizpraktikum-secret.key, нажмите «Нет» и откройте его.\n\n";
  if (MessageBoxW(g_w, (msg + L"Создать новый секретный ключ?").c_str(), L"Новый секретный ключ", MB_YESNO | MB_ICONWARNING | MB_DEFBUTTON2) != IDYES) return;
  unsigned char seed[32];
  typedef BOOLEAN(WINAPI * RGR)(PVOID, ULONG); HMODULE a = LoadLibraryW(L"advapi32.dll"); RGR rnd = a ? (RGR)GetProcAddress(a, "SystemFunction036") : 0;
  if (!rnd || !rnd(seed, 32)) { MessageBoxW(g_w, L"Не удалось получить случайные числа от Windows.", L"Ошибка", MB_ICONERROR); return; }
  std::wstring path; if (!pick_file(true, L"Секретный ключ (*.key)\0*.key\0", L"fizpraktikum-secret.key", L"key", path)) { SecureZeroMemory(seed, 32); return; }
  if (!write_file(path, kg::key_file_json(seed, now_iso()))) { SecureZeroMemory(seed, 32); MessageBoxW(g_w, L"Не удалось сохранить файл ключа.", L"Ошибка", MB_ICONERROR); return; }
  set_key(seed, path); SecureZeroMemory(seed, 32); status(L"");
  MessageBoxW(g_w, L"Секретный ключ создан и сохранён.\n\n• Сделайте копию файла на флешку и храните её отдельно.\n• Никому не передавайте этот файл и не выкладывайте его в интернет.\n• Чтобы программа принимала ключи от него, её открытый ключ (кнопка «Копировать открытый ключ») нужно вписать в программу и пересобрать её.", L"Готово", MB_ICONINFORMATION);
}
static void on_open() {
  std::wstring path; if (!pick_file(false, L"Секретный ключ (*.key)\0*.key\0Все файлы\0*.*\0", 0, L"key", path)) return;
  load(path, false);
}
static void on_make() {
  if (!g_has) { status(L"Сначала откройте файл секретного ключа (шаг 1).", true); return; }
  if (!matches() && MessageBoxW(g_w, L"Открытый секретный ключ не подходит к программе: сделанные им ключи программа не примет.\n\nВсё равно сделать ключи?", L"Ключ не подходит", MB_YESNO | MB_ICONWARNING | MB_DEFBUTTON2) != IDYES) return;
  std::string date;
  if (g_until) { SYSTEMTIME t; DateTime_GetSystemtime(g_date, &t); char b[16]; wsprintfA(b, "%04d-%02d-%02d", t.wYear, t.wMonth, t.wDay); date = b;
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
  enable(ID_SAVE, n > 0); enable(ID_COPY, n > 0);
  if (n) { if (!append_file(jpath, journal, true)) { wchar_t d[MAX_PATH]; if (SUCCEEDED(SHGetFolderPathW(0, CSIDL_PERSONAL, 0, 0, d))) { jpath = std::wstring(d) + L"\\Журнал ключей.csv"; append_file(jpath, journal, true); } } }
  if (!bad.empty()) status(L"Не распознаны коды: " + W(bad) + L". Код выглядит так: FZ-XXXX-XXXX-XXXX-XXXX.", true);
  else if (n) status(L"Готово: ключей - " + std::to_wstring(n) + L". Они записаны в журнал выдачи.");
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

// ---------- рисование ----------
static void fill_round(HDC dc, RECT r, int rad, COLORREF fill, COLORREF line) {
  HBRUSH b = CreateSolidBrush(fill); HPEN p = CreatePen(PS_SOLID, 1, line); HGDIOBJ ob = SelectObject(dc, b), op = SelectObject(dc, p);
  RoundRect(dc, r.left, r.top, r.right, r.bottom, rad, rad); SelectObject(dc, ob); SelectObject(dc, op); DeleteObject(b); DeleteObject(p);
}
static int draw_text(HDC dc, const std::wstring& s, RECT r, HFONT f, COLORREF c, UINT fl = DT_LEFT | DT_WORDBREAK | DT_NOPREFIX) {
  SelectObject(dc, f); SetTextColor(dc, c); SetBkMode(dc, TRANSPARENT); return DrawTextW(dc, s.c_str(), (int)s.size(), &r, fl);
}
static void step(HDC dc, RECT card, int n, const wchar_t* title, bool done) {
  RECT c = SR(card); fill_round(dc, c, S(18), C_CARD, C_LINE);
  RECT b = {c.left + S(16), c.top + S(14), c.left + S(16) + S(26), c.top + S(14) + S(26)};
  HBRUSH br = CreateSolidBrush(done ? C_OK : C_ACC); HPEN pn = CreatePen(PS_SOLID, 1, done ? C_OK : C_ACC); HGDIOBJ ob = SelectObject(dc, br), op = SelectObject(dc, pn);
  Ellipse(dc, b.left, b.top, b.right, b.bottom); SelectObject(dc, ob); SelectObject(dc, op); DeleteObject(br); DeleteObject(pn);
  draw_text(dc, std::to_wstring(n), b, g_num, done ? RGB(255, 255, 255) : C_ACC_T, DT_CENTER | DT_VCENTER | DT_SINGLELINE);
  draw_text(dc, title, {c.left + S(IND), c.top + S(15), c.right - S(16), c.top + S(40)}, g_bold, C_TEXT, DT_LEFT | DT_SINGLELINE | DT_NOPREFIX);
}
static void field(HDC dc, HWND h) {   // рамка поля ввода со скруглением вокруг EDIT без собственной рамки
  RECT r; GetWindowRect(h, &r); MapWindowPoints(0, g_w, (POINT*)&r, 2); InflateRect(&r, S(8), S(6));
  fill_round(dc, r, S(12), C_CARD, GetFocus() == h ? C_ACC : RGB(0xC9, 0xD0, 0xDA));
}
static void paint(HDC dc, RECT all) {
  HBRUSH bg = CreateSolidBrush(C_BG); FillRect(dc, &all, bg); DeleteObject(bg);
  HICON ic = (HICON)LoadImageW(GetModuleHandleW(0), MAKEINTRESOURCEW(1), IMAGE_ICON, S(36), S(36), 0);
  if (ic) { DrawIconEx(dc, S(PX), S(18), ic, S(36), S(36), 0, 0, DI_NORMAL); DestroyIcon(ic); }
  draw_text(dc, L"Генератор ключей", {S(PX + 48), S(14), S(CW - PX), S(42)}, g_title, C_TEXT, DT_LEFT | DT_SINGLELINE);
  draw_text(dc, L"Физпрактикум · ключи активации для компьютеров кафедры · работает без интернета", {S(PX + 48), S(42), S(CW - PX), S(62)}, g_small, C_MUTED, DT_LEFT | DT_SINGLELINE);

  // 1. секретный ключ
  step(dc, R_C1, 1, L"Откройте секретный ключ кафедры", matches());
  RECT c = SR(R_C1); int x = c.left + S(IND), r = c.right - S(18);
  if (!g_has) draw_text(dc, L"Это файл fizpraktikum-secret.key: он есть только у кафедры. Генератор запомнит, где он лежит, и в следующий раз откроет его сам.", {x, c.top + S(42), r, c.top + S(78)}, g_font, C_MUTED);
  else draw_text(dc, L"Открыт файл: " + g_keyfile, {x, c.top + S(46), r, c.top + S(68)}, g_font, C_TEXT, DT_LEFT | DT_SINGLELINE | DT_END_ELLIPSIS | DT_NOPREFIX);
  RECT m = {x, c.top + S(122), r, c.top + S(152)};
  if (g_has) {
    bool ok = matches(); std::wstring pk8 = W(g_pk.substr(0, 8)), ex8 = W(expected().substr(0, std::min<size_t>(8, expected().size())));
    std::wstring t = expected().empty() ? L"Открытый ключ: " + pk8 + L"…" :
      ok ? L"Подходит к программе: ключи из этого файла программа примет (открытый ключ " + pk8 + L"…)."
         : L"Не подходит к программе: в ней открытый ключ " + ex8 + L"…, а у этого файла " + pk8 + L"…. Откройте другой файл.";
    fill_round(dc, m, S(10), ok ? C_OK_L : C_BAD_L, ok ? C_OK_L : C_BAD_L);
    RECT d = {m.left + S(12), m.top + S(10), m.left + S(22), m.top + S(20)}; HBRUSH db = CreateSolidBrush(ok ? C_OK : C_BAD); HPEN dp = CreatePen(PS_SOLID, 1, ok ? C_OK : C_BAD);
    HGDIOBJ ob = SelectObject(dc, db), op = SelectObject(dc, dp); Ellipse(dc, d.left, d.top, d.right, d.bottom); SelectObject(dc, ob); SelectObject(dc, op); DeleteObject(db); DeleteObject(dp);
    draw_text(dc, t, {m.left + S(30), m.top, m.right - S(10), m.bottom}, g_font, ok ? C_OK : C_BAD, DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_END_ELLIPSIS | DT_NOPREFIX);
  }

  // 2. коды и срок
  step(dc, R_C2, 2, L"Вставьте коды компьютеров и выберите срок", false);
  c = SR(R_C2); x = c.left + S(IND); r = c.right - S(18);
  draw_text(dc, L"Код показан в окне активации программы на каждом компьютере. По одному в строке; после кода можно написать, кому выдан:  FZ-7K3M-Q9PX-2T4D-8WRN  ауд. 214, ПК 5", {x, c.top + S(42), r, c.top + S(78)}, g_font, C_MUTED);
  field(dc, g_codes);
  draw_text(dc, L"Срок:", {x, c.top + S(186), x + S(50), c.top + S(218)}, g_font, C_TEXT, DT_LEFT | DT_VCENTER | DT_SINGLELINE);

  // 3. ключи
  step(dc, R_C3, 3, L"Раздайте ключи", !g_last.empty());
  c = SR(R_C3); x = c.left + S(IND); r = c.right - S(18);
  field(dc, g_out);
  draw_text(dc, L"Один компьютер - вставьте ключ в окно активации. Целый класс - положите license.fzl рядом с Fizpraktikum.exe.", {x, c.top + S(42), r, c.top + S(62)}, g_small, C_MUTED, DT_LEFT | DT_SINGLELINE | DT_END_ELLIPSIS);

  // строка состояния
  if (!g_status.empty()) draw_text(dc, g_status, {S(PX), S(684), S(CW - PX), S(708)}, g_font, g_bad ? C_BAD : C_OK, DT_LEFT | DT_SINGLELINE | DT_END_ELLIPSIS | DT_NOPREFIX);
}
static void draw_button(DRAWITEMSTRUCT* d) {
  int id = d->CtlID; bool off = (d->itemState & ODS_DISABLED) != 0, down = (d->itemState & ODS_SELECTED) != 0, focus = (d->itemState & ODS_FOCUS) != 0;
  bool primary = id == ID_OPEN || id == ID_MAKE || id == ID_SAVE, seg = id == ID_FOREVER || id == ID_UNTIL, on = seg && ((id == ID_UNTIL) == g_until);
  if (id == ID_OPEN && g_has) primary = false;   // ключ уже открыт — главное действие дальше
  HDC dc = d->hDC; RECT r = d->rcItem;
  HBRUSH bg = CreateSolidBrush(C_CARD); FillRect(dc, &r, bg); DeleteObject(bg);
  COLORREF fill, line, txt;
  if (off) { fill = C_OFF; line = C_OFF; txt = C_OFF_T; }
  else if (primary) { fill = down ? C_ACC_D : C_ACC; line = fill; txt = C_ACC_T; }
  else if (seg && on) { fill = C_ACC_L; line = C_ACC; txt = RGB(0xB3, 0x43, 0x1A); }
  else { fill = down ? C_OFF : C_CARD; line = RGB(0xC9, 0xD0, 0xDA); txt = C_TEXT; }
  if (focus && !off && !primary) line = C_ACC;
  RECT b = r; fill_round(dc, b, S(10), fill, line);
  if (focus && !off && primary) { RECT f = r; InflateRect(&f, -S(3), -S(3)); HBRUSH nb = (HBRUSH)GetStockObject(NULL_BRUSH); HPEN p = CreatePen(PS_DOT, 1, C_ACC_T);
    HGDIOBJ ob = SelectObject(dc, nb), op = SelectObject(dc, p); RoundRect(dc, f.left, f.top, f.right, f.bottom, S(8), S(8)); SelectObject(dc, ob); SelectObject(dc, op); DeleteObject(p); }
  wchar_t t[128]; GetWindowTextW(d->hwndItem, t, 128);
  draw_text(dc, t, r, primary || on ? g_bold : g_font, txt, DT_CENTER | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
}

static HWND mk(const wchar_t* cls, const wchar_t* t, DWORD st, int x, int y, int w, int h, int id, HFONT f = 0) {
  HWND c = CreateWindowExW(0, cls, t, WS_CHILD | WS_VISIBLE | st, S(x), S(y), S(w), S(h), g_w, (HMENU)(INT_PTR)id, GetModuleHandleW(0), 0);
  SendMessageW(c, WM_SETFONT, (WPARAM)(f ? f : g_font), TRUE); return c;
}
static HWND btn(const wchar_t* t, int x, int y, int w, int id, bool on = true) { HWND b = mk(L"BUTTON", t, BS_OWNERDRAW | WS_TABSTOP, x, y, w, 34, id); EnableWindow(b, on); return b; }
static void build() {
  const int x = CX + IND, r = CX + CWD - 18;
  int y = R_C1.top;
  btn(L"Открыть файл ключа…", x, y + 80, 210, ID_OPEN);
  btn(L"Создать новый…", x + 220, y + 80, 160, ID_NEW);
  btn(L"Копировать открытый ключ", r - 220, y + 80, 220, ID_PKCOPY, false);
  y = R_C2.top;
  g_codes = mk(L"EDIT", L"", ES_MULTILINE | ES_AUTOVSCROLL | ES_WANTRETURN | WS_VSCROLL | WS_TABSTOP, x + 8, y + 88, r - x - 16, 78, ID_CODES, g_mono);
  btn(L"Бессрочно", x + 50, y + 186, 110, ID_FOREVER);
  btn(L"До даты", x + 166, y + 186, 100, ID_UNTIL);
  g_date = mk(DATETIMEPICK_CLASSW, L"", DTS_SHORTDATEFORMAT | WS_TABSTOP, x + 276, y + 188, 130, 30, ID_DATE);
  SYSTEMTIME t; GetLocalTime(&t); t.wYear += 1; if (t.wMonth == 2 && t.wDay == 29) t.wDay = 28; DateTime_SetSystemtime(g_date, GDT_VALID, &t);
  btn(L"Сделать ключи", r - 190, y + 186, 190, ID_MAKE, false);
  y = R_C3.top;
  g_out = mk(L"EDIT", L"", ES_MULTILINE | ES_READONLY | ES_AUTOVSCROLL | WS_VSCROLL | WS_TABSTOP, x + 8, y + 74, r - x - 16, 52, ID_OUT, g_mono);
  btn(L"Сохранить license.fzl…", x, y + 140, 220, ID_SAVE, false);
  btn(L"Копировать ключи", x + 230, y + 140, 170, ID_COPY, false);
  btn(L"Журнал выдачи", r - 160, y + 140, 160, ID_JOURNAL);
}
static LRESULT CALLBACK proc(HWND h, UINT m, WPARAM w, LPARAM l) {
  switch (m) {
    case WM_COMMAND:
      switch (LOWORD(w)) {
        case ID_NEW: on_new(); break; case ID_OPEN: on_open(); break; case ID_MAKE: on_make(); break; case ID_SAVE: on_save(); break;
        case ID_COPY: { std::wstring s = W(g_last); std::wstring r; for (wchar_t c : s) { if (c == L'\n') r += L'\r'; r += c; } clip(r); status(L"Ключи скопированы: вставьте их в письмо или документ."); break; }
        case ID_PKCOPY: clip(W(g_pk)); status(L"Открытый ключ скопирован."); break;
        case ID_JOURNAL: on_journal(); break;
        case ID_FOREVER: case ID_UNTIL: g_until = LOWORD(w) == ID_UNTIL; EnableWindow(g_date, g_until);
          InvalidateRect(GetDlgItem(g_w, ID_FOREVER), 0, FALSE); InvalidateRect(GetDlgItem(g_w, ID_UNTIL), 0, FALSE); break;
        case ID_CODES: case ID_OUT: if (HIWORD(w) == EN_SETFOCUS || HIWORD(w) == EN_KILLFOCUS) repaint(); break;
      }
      return 0;
    case WM_DRAWITEM: draw_button((DRAWITEMSTRUCT*)l); return TRUE;
    case WM_CTLCOLOREDIT: case WM_CTLCOLORSTATIC: { HDC dc = (HDC)w; SetTextColor(dc, C_TEXT); SetBkColor(dc, C_CARD); return (LRESULT)g_brCard; }
    case WM_ERASEBKGND: return 1;
    case WM_PAINT: {
      PAINTSTRUCT ps; HDC dc = BeginPaint(h, &ps); RECT all; GetClientRect(h, &all);
      HDC mem = CreateCompatibleDC(dc); HBITMAP bmp = CreateCompatibleBitmap(dc, all.right, all.bottom); HGDIOBJ ob = SelectObject(mem, bmp);
      paint(mem, all); BitBlt(dc, 0, 0, all.right, all.bottom, mem, 0, 0, SRCCOPY);
      SelectObject(mem, ob); DeleteObject(bmp); DeleteDC(mem); EndPaint(h, &ps); return 0;
    }
    case WM_DESTROY: SecureZeroMemory(g_seed, 32); PostQuitMessage(0); return 0;
  }
  return DefWindowProcW(h, m, w, l);
}
int WINAPI wWinMain(HINSTANCE inst, HINSTANCE, LPWSTR, int show) {
  SetProcessDPIAware();
  INITCOMMONCONTROLSEX ic = {sizeof ic, ICC_DATE_CLASSES | ICC_STANDARD_CLASSES}; InitCommonControlsEx(&ic);
  HDC dc = GetDC(0); g_dpi = GetDeviceCaps(dc, LOGPIXELSX); ReleaseDC(0, dc);
  // экран меньше окна (старые мониторы 1024×768 с крупным масштабом) — уменьшаем масштаб, чтобы всё помещалось
  RECT wa; SystemParametersInfoW(SPI_GETWORKAREA, 0, &wa, 0); while (g_dpi > 72 && S(CH) + 40 > wa.bottom - wa.top) g_dpi -= 6;
  auto font = [](int px, int weight, const wchar_t* face) { return CreateFontW(-S(px), 0, 0, 0, weight, 0, 0, 0, DEFAULT_CHARSET, 0, 0, CLEARTYPE_QUALITY, 0, face); };
  g_font = font(14, FW_NORMAL, L"Segoe UI"); g_bold = font(14, FW_SEMIBOLD, L"Segoe UI"); g_title = font(22, FW_BOLD, L"Segoe UI");
  g_small = font(13, FW_NORMAL, L"Segoe UI"); g_num = font(14, FW_BOLD, L"Segoe UI"); g_mono = font(14, FW_NORMAL, L"Consolas");
  g_brCard = CreateSolidBrush(C_CARD);
  WNDCLASSEXW wc = {sizeof wc}; wc.lpfnWndProc = proc; wc.hInstance = inst; wc.lpszClassName = L"FzKeygen"; wc.hCursor = LoadCursorW(0, IDC_ARROW);
  wc.hbrBackground = 0; wc.hIcon = LoadIconW(inst, MAKEINTRESOURCEW(1)); wc.hIconSm = wc.hIcon; RegisterClassExW(&wc);
  RECT r = {0, 0, S(CW), S(CH)}; DWORD st = WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU | WS_MINIMIZEBOX | WS_CLIPCHILDREN; AdjustWindowRect(&r, st, FALSE);
  g_w = CreateWindowExW(0, L"FzKeygen", L"Генератор ключей «Физпрактикума»", st, CW_USEDEFAULT, CW_USEDEFAULT, r.right - r.left, r.bottom - r.top, 0, 0, inst, 0);
  build();
  std::wstring last = remembered(); if (!last.empty() && GetFileAttributesW(last.c_str()) != INVALID_FILE_ATTRIBUTES) load(last, true);
  ShowWindow(g_w, show); UpdateWindow(g_w);
  MSG msg; while (GetMessageW(&msg, 0, 0, 0) > 0) { if (!IsDialogMessageW(g_w, &msg)) { TranslateMessage(&msg); DispatchMessageW(&msg); } }
  return 0;
}
