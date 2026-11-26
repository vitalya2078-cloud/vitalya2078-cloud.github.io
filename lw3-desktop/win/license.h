// Лицензия «Физпрактикума» (та же схема, что была в версии на Rust: ключи, выданные раньше, подходят).
#pragma once
#include <string>
#include <vector>
#include "json.h"

namespace lic {
struct Status { bool enforced; std::string code, state, expires; long long days_left; Json json() const; };
std::string machine_code();
Status status(const std::vector<std::string>& extra_folders);
// активация ключом или текстом файла лицензии; false + текст ошибки, если ключ не подходит
bool activate(const std::string& text, Status& out, std::string& err);
// для проверок: срок ключа в днях от 2000-01-01 (0 — бессрочно) или -1, если ключ не подходит к коду
long long check_key(const std::string& key, const std::string& code, const std::string& pubkey_hex);
std::string civil(long long days);
long long parse_date(const std::string& s);
std::string sha256_hex(const std::string& data);
}
