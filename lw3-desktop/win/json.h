// Небольшой разбор и запись JSON для обмена программы с интерфейсом (запросы invoke и ответы на них).
#pragma once
#include <map>
#include <memory>
#include <string>
#include <vector>
#include <cstdio>
#include <cstdlib>
#include <cstring>

struct Json {
  enum Type { Null, Bool, Num, Str, Arr, Obj } t = Null;
  bool b = false;
  double n = 0;
  std::string s;
  std::vector<Json> a;
  std::map<std::string, Json> o;

  Json() {}
  static Json str(const std::string& v) { Json j; j.t = Str; j.s = v; return j; }
  static Json num(double v) { Json j; j.t = Num; j.n = v; return j; }
  static Json boolean(bool v) { Json j; j.t = Bool; j.b = v; return j; }
  static Json arr() { Json j; j.t = Arr; return j; }
  static Json obj() { Json j; j.t = Obj; return j; }

  const Json& operator[](const std::string& k) const {
    static const Json none;
    if (t != Obj) return none;
    auto it = o.find(k);
    return it == o.end() ? none : it->second;
  }
  std::string text(const std::string& def = "") const { return t == Str ? s : def; }
  double number(double def = 0) const { return t == Num ? n : def; }

  // ---------- запись ----------
  static void quote(std::string& out, const std::string& v) {
    out += '"';
    for (unsigned char c : v) {
      switch (c) {
        case '"': out += "\\\""; break;
        case '\\': out += "\\\\"; break;
        case '\n': out += "\\n"; break;
        case '\r': out += "\\r"; break;
        case '\t': out += "\\t"; break;
        default:
          if (c < 0x20) { char buf[8]; snprintf(buf, sizeof buf, "\\u%04x", c); out += buf; }
          else out += (char)c;
      }
    }
    out += '"';
  }
  void dump(std::string& out) const {
    switch (t) {
      case Null: out += "null"; break;
      case Bool: out += b ? "true" : "false"; break;
      case Num: {
        char buf[32];
        if (n == (double)(long long)n) snprintf(buf, sizeof buf, "%lld", (long long)n); else snprintf(buf, sizeof buf, "%.17g", n);
        out += buf; break;
      }
      case Str: quote(out, s); break;
      case Arr: {
        out += '[';
        for (size_t i = 0; i < a.size(); i++) { if (i) out += ','; a[i].dump(out); }
        out += ']'; break;
      }
      case Obj: {
        out += '{'; bool first = true;
        for (auto& kv : o) { if (!first) out += ','; first = false; quote(out, kv.first); out += ':'; kv.second.dump(out); }
        out += '}'; break;
      }
    }
  }
  std::string dump() const { std::string s; dump(s); return s; }

  // ---------- разбор ----------
  static bool parse(const std::string& src, Json& out) { size_t i = 0; if (!value(src, i, out, 0)) return false; ws(src, i); return i == src.size(); }

 private:
  static void ws(const std::string& s, size_t& i) { while (i < s.size() && (s[i] == ' ' || s[i] == '\n' || s[i] == '\r' || s[i] == '\t')) i++; }
  static void utf8(std::string& out, unsigned cp) {
    if (cp < 0x80) out += (char)cp;
    else if (cp < 0x800) { out += (char)(0xC0 | (cp >> 6)); out += (char)(0x80 | (cp & 63)); }
    else if (cp < 0x10000) { out += (char)(0xE0 | (cp >> 12)); out += (char)(0x80 | ((cp >> 6) & 63)); out += (char)(0x80 | (cp & 63)); }
    else { out += (char)(0xF0 | (cp >> 18)); out += (char)(0x80 | ((cp >> 12) & 63)); out += (char)(0x80 | ((cp >> 6) & 63)); out += (char)(0x80 | (cp & 63)); }
  }
  static bool hex4(const std::string& s, size_t& i, unsigned& v) {
    if (i + 4 > s.size()) return false;
    v = 0;
    for (int k = 0; k < 4; k++) {
      char c = s[i++]; v <<= 4;
      if (c >= '0' && c <= '9') v |= c - '0'; else if (c >= 'a' && c <= 'f') v |= c - 'a' + 10; else if (c >= 'A' && c <= 'F') v |= c - 'A' + 10; else return false;
    }
    return true;
  }
  static bool string(const std::string& s, size_t& i, std::string& out) {
    if (s[i] != '"') return false;
    i++;
    while (i < s.size()) {
      char c = s[i++];
      if (c == '"') return true;
      if (c != '\\') { out += c; continue; }
      if (i >= s.size()) return false;
      char e = s[i++];
      switch (e) {
        case '"': out += '"'; break; case '\\': out += '\\'; break; case '/': out += '/'; break;
        case 'b': out += '\b'; break; case 'f': out += '\f'; break; case 'n': out += '\n'; break;
        case 'r': out += '\r'; break; case 't': out += '\t'; break;
        case 'u': {
          unsigned cp; if (!hex4(s, i, cp)) return false;
          if (cp >= 0xD800 && cp < 0xDC00 && i + 6 <= s.size() && s[i] == '\\' && s[i + 1] == 'u') {
            size_t j = i + 2; unsigned lo;
            if (hex4(s, j, lo) && lo >= 0xDC00 && lo < 0xE000) { cp = 0x10000 + ((cp - 0xD800) << 10) + (lo - 0xDC00); i = j; }
          }
          utf8(out, cp); break;
        }
        default: return false;
      }
    }
    return false;
  }
  static bool value(const std::string& s, size_t& i, Json& out, int depth) {
    if (depth > 64) return false;
    ws(s, i);
    if (i >= s.size()) return false;
    char c = s[i];
    if (c == '"') { out.t = Str; return string(s, i, out.s); }
    if (c == '{') {
      out.t = Obj; i++; ws(s, i);
      if (i < s.size() && s[i] == '}') { i++; return true; }
      while (true) {
        ws(s, i); std::string k;
        if (i >= s.size() || !string(s, i, k)) return false;
        ws(s, i); if (i >= s.size() || s[i] != ':') return false; i++;
        Json v; if (!value(s, i, v, depth + 1)) return false;
        out.o[k] = std::move(v);
        ws(s, i); if (i >= s.size()) return false;
        if (s[i] == ',') { i++; continue; }
        if (s[i] == '}') { i++; return true; }
        return false;
      }
    }
    if (c == '[') {
      out.t = Arr; i++; ws(s, i);
      if (i < s.size() && s[i] == ']') { i++; return true; }
      while (true) {
        Json v; if (!value(s, i, v, depth + 1)) return false;
        out.a.push_back(std::move(v));
        ws(s, i); if (i >= s.size()) return false;
        if (s[i] == ',') { i++; continue; }
        if (s[i] == ']') { i++; return true; }
        return false;
      }
    }
    if (s.compare(i, 4, "true") == 0) { out.t = Bool; out.b = true; i += 4; return true; }
    if (s.compare(i, 5, "false") == 0) { out.t = Bool; out.b = false; i += 5; return true; }
    if (s.compare(i, 4, "null") == 0) { out.t = Null; i += 4; return true; }
    if (c == '-' || (c >= '0' && c <= '9')) {
      size_t j = i;
      while (j < s.size() && (strchr("+-.eE", s[j]) || (s[j] >= '0' && s[j] <= '9'))) j++;
      out.t = Num; out.n = strtod(s.substr(i, j - i).c_str(), nullptr); i = j; return true;
    }
    return false;
  }
};
