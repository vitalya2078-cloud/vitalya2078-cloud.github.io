#include "keygen-core.h"
#include <cctype>
#include <cstring>
#include <cstdio>

extern "C" {
#include "../../lw3-desktop/win/tweetnacl.h"
int crypto_sign_ed25519_tweet(unsigned char*, unsigned long long*, const unsigned char*, unsigned long long, const unsigned char*);
int crypto_sign_ed25519_tweet_keypair(unsigned char*, unsigned char*);
// TweetNaCl берёт случайные байты для ключевой пары отсюда: подставляем заданный seed
static const unsigned char* kg_seed = 0;
void randombytes(unsigned char* x, unsigned long long n) { for (unsigned long long i = 0; i < n; i++) x[i] = kg_seed ? kg_seed[i] : 0; }
}

namespace kg {
static const char ALPHA[] = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";   // Crockford base32

std::string hex(const u8* d, size_t n) { static const char* H = "0123456789abcdef"; std::string s; for (size_t i = 0; i < n; i++) { s += H[d[i] >> 4]; s += H[d[i] & 15]; } return s; }
bool unhex(const std::string& s, std::vector<u8>& out) {
  out.clear(); if (s.size() % 2) return false;
  for (size_t i = 0; i < s.size(); i += 2) { int v = 0; for (int k = 0; k < 2; k++) { char c = (char)tolower((unsigned char)s[i + k]); v <<= 4;
    if (c >= '0' && c <= '9') v |= c - '0'; else if (c >= 'a' && c <= 'f') v |= c - 'a' + 10; else return false; } out.push_back((u8)v); }
  return true;
}
static void keypair(const u8 seed[32], u8 pk[32], u8 sk[64]) { kg_seed = seed; crypto_sign_ed25519_tweet_keypair(pk, sk); kg_seed = 0; }
void public_key(const u8 seed[32], u8 pk[32]) { u8 sk[64]; keypair(seed, pk, sk); }

static std::string b32(const std::vector<u8>& d) {
  std::string out; unsigned buf = 0; int bits = 0;
  for (u8 b : d) { buf = (buf << 8) | b; bits += 8; while (bits >= 5) { bits -= 5; out += ALPHA[(buf >> bits) & 31]; } buf &= 255; }
  if (bits) out += ALPHA[(buf << (5 - bits)) & 31];
  return out;
}
std::string norm_code(const std::string& s0) {
  std::string s;
  for (char c0 : s0) { char c = (char)toupper((unsigned char)c0); if (c == 'O') c = '0'; if (c == 'I' || c == 'L') c = '1'; if (isalnum((unsigned char)c)) s += c; }
  if (s.compare(0, 2, "FZ") == 0) s = s.substr(2);
  if (s.size() != 16) return "";
  for (char c : s) if (!strchr(ALPHA, c)) return "";
  return "FZ-" + s.substr(0, 4) + "-" + s.substr(4, 4) + "-" + s.substr(8, 4) + "-" + s.substr(12, 4);
}
bool parse_line(const std::string& line, std::string& code, std::string& who) {
  // как в HTML: необязательное «fz», затем 16 букв-цифр (между ними пробелы и дефисы), остальное — кому
  size_t i = 0, n = line.size(); while (i < n && isspace((unsigned char)line[i])) i++;
  size_t j = i;
  if (j + 1 < n && tolower((unsigned char)line[j]) == 'f' && tolower((unsigned char)line[j + 1]) == 'z') { j += 2; while (j < n && (line[j] == '-' || isspace((unsigned char)line[j]))) j++; }
  std::string raw; size_t k = j;
  while (k < n && raw.size() < 16) { char c = line[k]; if (isalnum((unsigned char)c)) raw += c; else if (!(c == '-' || isspace((unsigned char)c))) break; k++; }
  if (raw.size() != 16) return false;
  code = norm_code(raw); if (code.empty()) return false;
  who = line.substr(k); size_t a = who.find_first_not_of(" \t-—,;"), b = who.find_last_not_of(" \t\r");
  who = a == std::string::npos ? "" : who.substr(a, b - a + 1);
  return true;
}
long days(int y, int m, int d) {
  y -= m <= 2; long era = (y >= 0 ? y : y - 399) / 400, yoe = y - era * 400;
  long doy = (153 * (m > 2 ? m - 3 : m + 9) + 2) / 5 + d - 1, doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
  return era * 146097 + doe - 719468 - 10957;
}
std::string make_key(const u8 seed[32], const std::string& code, const std::string& date) {
  long exp = 0; int y, m, d;
  if (!date.empty() && sscanf(date.c_str(), "%d-%d-%d", &y, &m, &d) == 3) exp = days(y, m, d);
  std::string msg = "FZ1|" + code + "|" + date;
  u8 pk[32], sk[64]; keypair(seed, pk, sk);
  std::vector<u8> sm(msg.size() + 64); unsigned long long sl = 0;
  crypto_sign_ed25519_tweet(sm.data(), &sl, (const u8*)msg.data(), msg.size(), sk);
  std::vector<u8> raw = { (u8)(exp >> 8), (u8)(exp & 255) }; raw.insert(raw.end(), sm.begin(), sm.begin() + 64);
  return "FZK-" + b32(raw);
}
std::string key_file_json(const u8 seed[32], const std::string& created) {
  u8 pk[32]; public_key(seed, pk);
  return "{\"fizpraktikum\":\"secret-key\",\"sk\":\"" + hex(seed, 32) + "\",\"pk\":\"" + hex(pk, 32) + "\",\"created\":\"" + created + "\"}";
}
bool read_key_file(const std::string& j, u8 seed[32]) {
  if (j.find("secret-key") == std::string::npos) return false;
  size_t p = j.find("\"sk\""); if (p == std::string::npos) return false;
  p = j.find('"', j.find(':', p) + 1); if (p == std::string::npos) return false;
  size_t q = j.find('"', p + 1); std::vector<u8> v;
  if (q == std::string::npos || !unhex(j.substr(p + 1, q - p - 1), v) || v.size() != 32) return false;
  memcpy(seed, v.data(), 32); return true;
}
}  // namespace kg
