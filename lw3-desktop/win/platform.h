// Файлы и папки с путями в UTF-8: в Windows через широкие строки (кириллица в путях), в Linux (проверки) напрямую.
#pragma once
#include <string>
#include <vector>
#include <cstdio>

#ifdef _WIN32
#include <windows.h>
#include <shlobj.h>
inline std::wstring W(const std::string& s) {
  if (s.empty()) return L"";
  int n = MultiByteToWideChar(CP_UTF8, 0, s.data(), (int)s.size(), nullptr, 0);
  std::wstring w(n, 0); MultiByteToWideChar(CP_UTF8, 0, s.data(), (int)s.size(), &w[0], n); return w;
}
inline std::string U(const std::wstring& w) {
  if (w.empty()) return "";
  int n = WideCharToMultiByte(CP_UTF8, 0, w.data(), (int)w.size(), nullptr, 0, nullptr, nullptr);
  std::string s(n, 0); WideCharToMultiByte(CP_UTF8, 0, w.data(), (int)w.size(), &s[0], n, nullptr, nullptr); return s;
}
inline FILE* fopen_u8(const std::string& p, const char* mode) { return _wfopen(W(p).c_str(), W(mode).c_str()); }
inline std::string exe_dir() {
  wchar_t buf[MAX_PATH * 4]; DWORD n = GetModuleFileNameW(nullptr, buf, (DWORD)(sizeof buf / sizeof buf[0]));
  std::wstring p(buf, n); size_t k = p.find_last_of(L"\\/"); return U(k == std::wstring::npos ? L"." : p.substr(0, k));
}
inline std::string local_appdata() {
  wchar_t buf[MAX_PATH];
  if (SUCCEEDED(SHGetFolderPathW(nullptr, CSIDL_LOCAL_APPDATA | CSIDL_FLAG_CREATE, nullptr, 0, buf))) return U(buf);
  DWORD n = GetEnvironmentVariableW(L"LOCALAPPDATA", buf, MAX_PATH); return n ? U(std::wstring(buf, n)) : exe_dir();
}
inline bool make_dir(const std::string& p) { return CreateDirectoryW(W(p).c_str(), nullptr) || GetLastError() == ERROR_ALREADY_EXISTS; }
#define PATH_SEP "\\"
#else
#include <sys/stat.h>
#include <cstdlib>
inline FILE* fopen_u8(const std::string& p, const char* mode) { return fopen(p.c_str(), mode); }
inline std::string exe_dir() { return "."; }
inline std::string local_appdata() { const char* h = getenv("FZ_LOCALAPPDATA"); if (!h) h = getenv("HOME"); return h ? h : "."; }
inline bool make_dir(const std::string& p) { return mkdir(p.c_str(), 0755) == 0 || true; }
#define PATH_SEP "/"
#endif

inline bool read_file(const std::string& path, std::string& out, size_t limit = 64u << 20) {
  FILE* f = fopen_u8(path, "rb"); if (!f) return false;
  out.clear(); char buf[65536]; size_t n;
  while ((n = fread(buf, 1, sizeof buf, f)) > 0) { out.append(buf, n); if (out.size() > limit) { fclose(f); return false; } }
  fclose(f); return true;
}
inline bool write_file(const std::string& path, const std::string& data) {
  FILE* f = fopen_u8(path, "wb"); if (!f) return false;
  bool ok = fwrite(data.data(), 1, data.size(), f) == data.size(); ok = (fclose(f) == 0) && ok; return ok;
}
