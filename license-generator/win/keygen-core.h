// Генератор ключей «Физпрактикума»: те же ключи, что у генератора в HTML (Ed25519, детерминированная подпись).
// Секретный ключ — 32 байта (seed), открытый — 32 байта. Ключ: «FZK-» + base32(2 байта срока + 64 байта подписи
// строки «FZ1|код|ГГГГ-ММ-ДД» или «FZ1|код|» для бессрочного).
#pragma once
#include <string>
#include <vector>

namespace kg {
typedef unsigned char u8;
std::string hex(const u8* d, size_t n);
bool unhex(const std::string& s, std::vector<u8>& out);
// открытый ключ из секретного (seed 32 байта)
void public_key(const u8 seed[32], u8 pk[32]);
// нормализация кода компьютера: «fz pm2e 7kce gcj3 gr1b» → «FZ-PM2E-7KCE-GCJ3-GR1B»; пусто — не код
std::string norm_code(const std::string& s);
// разбор строки списка: код (16 знаков, можно с «FZ», пробелами, дефисами) и остаток — кому выдан
bool parse_line(const std::string& line, std::string& code, std::string& who);
long days(int y, int m, int d);                       // дней от 2000-01-01
std::string make_key(const u8 seed[32], const std::string& code, const std::string& date /* "" — бессрочно */);
// секретный ключ в файле генератора: {"fizpraktikum":"secret-key","sk":"…","pk":"…","created":"…"}
std::string key_file_json(const u8 seed[32], const std::string& created);
bool read_key_file(const std::string& json, u8 seed[32]);
}
