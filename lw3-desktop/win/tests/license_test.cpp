// Проверка лицензии на C++: даты, код компьютера, ключи из генератора (HTML) и защита от подделки.
// Запуск: см. tests/run-license-test.sh
#include "../license.h"
#include <cassert>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <string>
int main(int argc, char** argv) {
  int fails = 0;
  auto must = [&](bool c, const char* m) { if (!c) { printf("FAIL: %s\n", m); fails++; } };
  for (const char* s : {"2000-01-01", "2026-11-26", "2027-06-30", "2099-12-31"}) must(lic::civil(lic::parse_date(s)) == s, "даты");
  must(lic::sha256_hex("abc") == "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", "SHA-256");
  // аргументы: pubkey, затем тройки «код ключ срок|-»
  if (argc > 1) {
    std::string pk = argv[1];
    for (int i = 2; i + 2 < argc + 1; i += 3) {
      std::string code = argv[i], key = argv[i + 1], date = strcmp(argv[i + 2], "-") ? argv[i + 2] : "";
      long long e = lic::check_key(key, code, pk);
      must(e >= 0, "ключ генератора не принят");
      must((e == 0 ? std::string() : lic::civil(e)) == date, "срок ключа прочитан неверно");
      must(lic::check_key(key, "FZ-0000-0000-0000-0000", pk) < 0, "ключ подошёл к чужому компьютеру");
      std::string bad = key; bad.back() = bad.back() == 'A' ? 'B' : 'A';
      must(lic::check_key(bad, code, pk) < 0, "испорченный ключ принят");
      std::string bad2 = key; bad2[6] = bad2[6] == '0' ? '1' : '0';
      must(lic::check_key(bad2, code, pk) < 0, "ключ с изменённым сроком принят");
    }
  }
  printf("machine_code=%s\n", lic::machine_code().c_str());
  printf(fails ? "FAIL\n" : "PASS: лицензия C++\n");
  return fails ? 1 : 0;
}
