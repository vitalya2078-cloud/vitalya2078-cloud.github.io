// Проверка ядра генератора на C++: ключи совпадают с генератором в HTML. Аргументы: seed_hex, затем «код|дата|ожидаемый ключ»…
#include "keygen-core.h"
#include <cstdio>
#include <cstring>
int main(int argc, char** argv) {
  std::vector<kg::u8> s; kg::unhex(argv[1], s); int bad = 0; kg::u8 pk[32]; kg::public_key(s.data(), pk); printf("pk %s\n", kg::hex(pk, 32).c_str());
  for (int i = 2; i < argc; i++) { std::string a = argv[i]; size_t p = a.find('|'), q = a.find('|', p + 1);
    std::string code = a.substr(0, p), date = a.substr(p + 1, q - p - 1), want = a.substr(q + 1), got = kg::make_key(s.data(), code, date);
    if (got != want) { printf("НЕ СОВПАЛО %s %s\n  %s\n  %s\n", code.c_str(), date.c_str(), got.c_str(), want.c_str()); bad++; } }
  std::string c, w;
  const char* lines[] = {"FZ-PM2E-7KCE-GCJ3-GR1B Иванов", "fz pm2e 7kce gcj3 gr1b", "PM2E7KCEGCJ3GR1B — кл. 103", "FZ-PM2E-7KCE", "foo"};
  for (auto l : lines) { bool ok = kg::parse_line(l, c, w); printf("%-34s → %s %s [%s]\n", l, ok ? "да " : "нет", c.c_str(), w.c_str()); }
  kg::u8 seed2[32]; bool rk = kg::read_key_file(kg::key_file_json(s.data(), "2026"), seed2); printf("файл ключа: %s\n", rk && !memcmp(seed2, s.data(), 32) ? "ok" : "ОШИБКА");
  printf(bad ? "FAIL\n" : "PASS: ключи совпадают с HTML-генератором\n"); return bad;
}
