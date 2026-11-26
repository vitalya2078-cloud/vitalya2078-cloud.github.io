// Лицензия «Физпрактикума»: программа работает только на компьютере, для которого кафедра выдала ключ.
// Код компьютера — из идентификатора Windows (MachineGuid). Ключ — подпись Ed25519 строки «FZ1|код|срок»,
// сделанная секретным ключом генератора; в программе только открытый ключ (FZ_LICENSE_PUBKEY при сборке).
// Без открытого ключа (сборка для разработки) проверка выключена. Интернет не нужен.
#include "license.h"
#include "platform.h"
#include <cstdint>
#include <cstring>
#include <ctime>

extern "C" {
#include "tweetnacl.h"
int crypto_sign_ed25519_tweet_open(unsigned char*, unsigned long long*, const unsigned char*, unsigned long long, const unsigned char*);
// случайные числа нужны TweetNaCl только для создания ключей; программа ключи лишь проверяет
void randombytes(unsigned char* x, unsigned long long n) { memset(x, 0, (size_t)n); }
}

#ifndef FZ_LICENSE_PUBKEY
#define FZ_LICENSE_PUBKEY ""
#endif

namespace lic {
static const char ALPHA[] = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";  // Crockford base32: без I, L, O, U

// ---------- SHA-256 ----------
static const uint32_t K[64] = {
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2};
static void sha256(const std::string& msg, uint8_t out[32]) {
  uint32_t h[8] = {0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19};
  std::string m = msg; uint64_t bits = (uint64_t)msg.size() * 8; m += (char)0x80;
  while (m.size() % 64 != 56) m += (char)0;
  for (int i = 7; i >= 0; i--) m += (char)((bits >> (i * 8)) & 255);
  auto rot = [](uint32_t x, int n) { return (x >> n) | (x << (32 - n)); };
  for (size_t c = 0; c < m.size(); c += 64) {
    uint32_t w[64];
    for (int i = 0; i < 16; i++) w[i] = (uint32_t)(uint8_t)m[c + i * 4] << 24 | (uint32_t)(uint8_t)m[c + i * 4 + 1] << 16 | (uint32_t)(uint8_t)m[c + i * 4 + 2] << 8 | (uint8_t)m[c + i * 4 + 3];
    for (int i = 16; i < 64; i++) {
      uint32_t s0 = rot(w[i - 15], 7) ^ rot(w[i - 15], 18) ^ (w[i - 15] >> 3), s1 = rot(w[i - 2], 17) ^ rot(w[i - 2], 19) ^ (w[i - 2] >> 10);
      w[i] = w[i - 16] + s0 + w[i - 7] + s1;
    }
    uint32_t a = h[0], b = h[1], cc = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
    for (int i = 0; i < 64; i++) {
      uint32_t t1 = hh + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i];
      uint32_t t2 = (rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & cc) ^ (b & cc));
      hh = g; g = f; f = e; e = d + t1; d = cc; cc = b; b = a; a = t1 + t2;
    }
    h[0] += a; h[1] += b; h[2] += cc; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
  }
  for (int i = 0; i < 8; i++) for (int j = 0; j < 4; j++) out[i * 4 + j] = (uint8_t)(h[i] >> (24 - 8 * j));
}
std::string sha256_hex(const std::string& data) {
  uint8_t d[32]; sha256(data, d); std::string s; char b[3];
  for (uint8_t x : d) { snprintf(b, sizeof b, "%02x", x); s += b; }
  return s;
}

// ---------- base32, hex ----------
static std::string b32(const uint8_t* data, size_t n) {
  std::string out; uint32_t buf = 0; int bits = 0;
  for (size_t i = 0; i < n; i++) { buf = (buf << 8) | data[i]; bits += 8; while (bits >= 5) { bits -= 5; out += ALPHA[(buf >> bits) & 31]; } }
  if (bits > 0) out += ALPHA[(buf << (5 - bits)) & 31];
  return out;
}
static bool unb32(const std::string& s, std::vector<uint8_t>& out) {
  uint32_t buf = 0; int bits = 0;
  for (char c0 : s) {
    char c = (char)toupper((unsigned char)c0);
    if (c == '-' || c == ' ' || c == '\n' || c == '\r' || c == '\t') continue;
    if (c == 'O') c = '0'; else if (c == 'I' || c == 'L') c = '1';
    const char* p = strchr(ALPHA, c); if (!p || !c) return false;
    buf = (buf << 5) | (uint32_t)(p - ALPHA); bits += 5;
    if (bits >= 8) { bits -= 8; out.push_back((uint8_t)((buf >> bits) & 255)); }
  }
  return true;
}
static bool hexdec(const std::string& s, std::vector<uint8_t>& out) {
  if (s.size() % 2) return false;
  for (size_t i = 0; i < s.size(); i += 2) {
    char* end; std::string x = s.substr(i, 2); long v = strtol(x.c_str(), &end, 16);
    if (*end) return false; out.push_back((uint8_t)v);
  }
  return true;
}

// ---------- даты: число дней от 2000-01-01 ----------
static long long days_from_civil(long long y, long long m, long long d) {
  y -= m <= 2; long long era = (y >= 0 ? y : y - 399) / 400, yoe = y - era * 400;
  long long doy = (153 * (m > 2 ? m - 3 : m + 9) + 2) / 5 + d - 1, doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
  return era * 146097 + doe - 719468 - 10957;
}
static long long today() { return (long long)time(nullptr) / 86400 - 10957; }
std::string civil(long long n) {
  long long z = n + 10957 + 719468, era = (z >= 0 ? z : z - 146096) / 146097, doe = z - era * 146097;
  long long yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365, doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
  long long mp = (5 * doy + 2) / 153, d = doy - (153 * mp + 2) / 5 + 1, m = mp < 10 ? mp + 3 : mp - 9, y = yoe + era * 400 + (m <= 2);
  char b[16]; snprintf(b, sizeof b, "%04lld-%02lld-%02lld", y, m, d); return b;
}
long long parse_date(const std::string& s) { int y, m, d; if (sscanf(s.c_str(), "%d-%d-%d", &y, &m, &d) != 3) return -1; return days_from_civil(y, m, d); }

// ---------- код компьютера ----------
static std::string machine_guid() {
#ifdef _WIN32
  HKEY k; std::string r;
  if (RegOpenKeyExW(HKEY_LOCAL_MACHINE, L"SOFTWARE\\Microsoft\\Cryptography", 0, KEY_READ | KEY_WOW64_64KEY, &k) == ERROR_SUCCESS) {
    wchar_t buf[256]; DWORD sz = sizeof buf, type = 0;
    if (RegQueryValueExW(k, L"MachineGuid", nullptr, &type, (BYTE*)buf, &sz) == ERROR_SUCCESS && type == REG_SZ) r = U(std::wstring(buf, wcsnlen(buf, sz / sizeof(wchar_t))));
    RegCloseKey(k);
  }
  return r;
#else
  std::string s; const char* t = getenv("FZ_MACHINE_GUID"); if (t) return t;
  if (read_file("/etc/machine-id", s)) { while (!s.empty() && (s.back() == '\n' || s.back() == ' ')) s.pop_back(); }
  return s;
#endif
}
std::string machine_code() {
  std::string id = machine_guid(); if (id.empty()) id = "unknown";
  for (auto& c : id) c = (char)tolower((unsigned char)c);
  uint8_t h[32]; sha256("FZ|" + id, h);
  std::string s = b32(h, 10);
  return "FZ-" + s.substr(0, 4) + "-" + s.substr(4, 4) + "-" + s.substr(8, 4) + "-" + s.substr(12, 4);
}

// ---------- ключ: «FZK-» + base32(2 байта срока + 64 байта подписи) ----------
long long check_key(const std::string& key0, const std::string& code, const std::string& pubkey_hex) {
  std::vector<uint8_t> pk; if (!hexdec(pubkey_hex, pk) || pk.size() != 32) return -1;
  std::string k = key0;
  while (!k.empty() && isspace((unsigned char)k.back())) k.pop_back();
  while (!k.empty() && isspace((unsigned char)k.front())) k.erase(0, 1);
  if (k.compare(0, 4, "FZK-") == 0 || k.compare(0, 4, "fzk-") == 0) k = k.substr(4);
  std::vector<uint8_t> raw; if (!unb32(k, raw) || raw.size() < 66) return -1;
  long long exp = ((long long)raw[0] << 8) | raw[1];
  std::string msg = "FZ1|" + code + "|" + (exp == 0 ? std::string() : civil(exp));
  std::vector<uint8_t> sm(raw.begin() + 2, raw.begin() + 66); sm.insert(sm.end(), msg.begin(), msg.end());
  std::vector<uint8_t> m(sm.size()); unsigned long long mlen = 0;
  if (crypto_sign_ed25519_tweet_open(m.data(), &mlen, sm.data(), sm.size(), pk.data()) != 0) return -1;
  return exp;
}

static std::string store_dir() { std::string d = local_appdata() + PATH_SEP "Fizpraktikum"; make_dir(d); return d; }
static std::vector<std::string> words(const std::string& t) {
  std::vector<std::string> w; std::string cur;
  for (char c : t) { if (isspace((unsigned char)c)) { if (!cur.empty()) w.push_back(cur); cur.clear(); } else cur += c; }
  if (!cur.empty()) w.push_back(cur);
  return w;
}
static std::vector<std::string> candidate_keys(const std::vector<std::string>& extra) {
  std::vector<std::string> files = {store_dir() + PATH_SEP "license.fzl", exe_dir() + PATH_SEP "license.fzl"};
  for (auto& x : extra) if (!x.empty()) files.push_back(x + PATH_SEP "license.fzl");
  std::vector<std::string> keys;
  for (auto& f : files) { std::string t; if (read_file(f, t, 4u << 20)) for (auto& w : words(t)) if (w.size() > 60) keys.push_back(w); }
  return keys;
}
static bool seen_check() {  // перевод часов назад больше чем на сутки — подозрительно
  std::string f = store_dir() + PATH_SEP "seen", t; long long now = today(), last = 0;
  if (read_file(f, t)) last = atoll(t.c_str());
  if (now + 1 < last) return false;
  if (now > last) write_file(f, std::to_string(now));
  return true;
}

Json Status::json() const {
  Json j = Json::obj();
  j.o["enforced"] = Json::boolean(enforced); j.o["code"] = Json::str(code); j.o["state"] = Json::str(state);
  j.o["expires"] = Json::str(expires); j.o["days_left"] = Json::num((double)days_left);
  return j;
}

Status status(const std::vector<std::string>& extra) {
  std::string code = machine_code(), pub = FZ_LICENSE_PUBKEY;
  if (pub.empty()) return {false, code, "ok", "", -1};
  if (!seen_check()) return {true, code, "clock", "", 0};
  long long now = today(), best = -1, expired = -1;
  for (auto& k : candidate_keys(extra)) {
    long long e = check_key(k, code, pub);
    if (e < 0) continue;
    if (e == 0 || e >= now) { if (best == -1 || (best != 0 && (e == 0 || e > best))) best = e; }
    else if (e > expired) expired = e;
  }
  if (best == 0) return {true, code, "ok", "", -1};
  if (best > 0) return {true, code, "ok", civil(best), best - now};
  if (expired > 0) return {true, code, "expired", civil(expired), 0};
  return {true, code, "none", "", 0};
}

bool activate(const std::string& text, Status& out, std::string& err) {
  std::string code = machine_code(), pub = FZ_LICENSE_PUBKEY, key;
  for (auto& w : words(text)) if (w.size() > 60 && check_key(w, code, pub) >= 0) { key = w; break; }
  if (key.empty()) { err = "Ключ не подходит к этому компьютеру. Проверьте, что ключ выдан для кода, который показан выше."; return false; }
  if (!write_file(store_dir() + PATH_SEP "license.fzl", code + " " + key + "\n")) { err = "Не удалось сохранить ключ"; return false; }
  out = status({}); return true;
}
}  // namespace lic
