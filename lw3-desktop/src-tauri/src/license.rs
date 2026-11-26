//! Лицензия «Физпрактикума»: программа работает только на компьютере, для которого кафедра выдала ключ.
//! Код компьютера — из идентификатора Windows (MachineGuid). Ключ — подпись Ed25519 строки «FZ1|код|срок»,
//! сделанная секретным ключом генератора; в программе только открытый ключ (FZ_LICENSE_PUBKEY при сборке).
//! Без открытого ключа (локальная сборка для разработки) проверка выключена.
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use sha2::{Digest, Sha256};
use std::path::PathBuf;

const PUBKEY: Option<&str> = option_env!("FZ_LICENSE_PUBKEY");
const ALPHA: &[u8] = b"0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford base32: без I, L, O, U

fn b32(data: &[u8]) -> String {
    let (mut out, mut buf, mut bits) = (String::new(), 0u32, 0u32);
    for &b in data {
        buf = (buf << 8) | b as u32; bits += 8;
        while bits >= 5 { bits -= 5; out.push(ALPHA[((buf >> bits) & 31) as usize] as char); }
    }
    if bits > 0 { out.push(ALPHA[((buf << (5 - bits)) & 31) as usize] as char); }
    out
}
fn unb32(s: &str) -> Option<Vec<u8>> {
    let (mut out, mut buf, mut bits) = (Vec::new(), 0u32, 0u32);
    for c in s.chars() {
        let c = match c.to_ascii_uppercase() { 'O' => '0', 'I' | 'L' => '1', '-' | ' ' | '\n' | '\r' | '\t' => continue, c => c };
        let v = ALPHA.iter().position(|&a| a as char == c)? as u32;
        buf = (buf << 5) | v; bits += 5;
        if bits >= 8 { bits -= 8; out.push(((buf >> bits) & 255) as u8); }
    }
    Some(out)
}
fn hexdec(s: &str) -> Option<Vec<u8>> {
    if s.len() % 2 != 0 { return None; }
    (0..s.len()).step_by(2).map(|i| u8::from_str_radix(&s[i..i + 2], 16).ok()).collect()
}

#[cfg(windows)]
fn machine_guid() -> Option<String> {
    use winreg::{enums::{HKEY_LOCAL_MACHINE, KEY_READ, KEY_WOW64_64KEY}, RegKey};
    let k = RegKey::predef(HKEY_LOCAL_MACHINE).open_subkey_with_flags("SOFTWARE\\Microsoft\\Cryptography", KEY_READ | KEY_WOW64_64KEY).ok()?;
    k.get_value::<String, _>("MachineGuid").ok()
}
#[cfg(not(windows))]
fn machine_guid() -> Option<String> { std::fs::read_to_string("/etc/machine-id").ok().map(|s| s.trim().to_string()) }

/// Код компьютера: FZ-XXXX-XXXX-XXXX-XXXX (16 знаков base32 из SHA-256 идентификатора Windows).
pub fn machine_code() -> String {
    let id = machine_guid().unwrap_or_else(|| "unknown".into()).to_lowercase();
    let h = Sha256::digest(format!("FZ|{}", id).as_bytes());
    let s = b32(&h[..10]);
    format!("FZ-{}-{}-{}-{}", &s[0..4], &s[4..8], &s[8..12], &s[12..16])
}

/// Дата — число дней от 2000-01-01 (0 — бессрочно).
fn days_from_civil(y: i64, m: i64, d: i64) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400;
    let doy = (153 * (if m > 2 { m - 3 } else { m + 9 }) + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146097 + doe - 719468 - 10957
}
fn today() -> i64 {
    let secs = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0);
    secs / 86400 - 10957
}
fn civil(n: i64) -> String {
    let z = n + 10957 + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = yoe + era * 400 + if m <= 2 { 1 } else { 0 };
    format!("{:04}-{:02}-{:02}", y, m, d)
}
pub fn parse_date(s: &str) -> Option<i64> {
    let p: Vec<i64> = s.trim().split('-').map(|x| x.parse().ok()).collect::<Option<_>>()?;
    if p.len() != 3 { return None; }
    Some(days_from_civil(p[0], p[1], p[2]))
}

/// Ключ: «FZK-» + base32(2 байта срока + 64 байта подписи). Проверка подписи строки «FZ1|код|срок».
fn check_key(key: &str, code: &str) -> Option<i64> {
    let pk = VerifyingKey::from_bytes(&hexdec(PUBKEY?)?.try_into().ok()?).ok()?;
    let k = key.trim(); let k = k.strip_prefix("FZK-").or_else(|| k.strip_prefix("fzk-")).unwrap_or(k);
    let raw = unb32(k)?;
    if raw.len() < 66 { return None; }
    let exp = ((raw[0] as i64) << 8) | raw[1] as i64;
    let sig = Signature::from_bytes(&raw[2..66].try_into().ok()?);
    let msg = format!("FZ1|{}|{}", code, if exp == 0 { String::new() } else { civil(exp) });
    pk.verify(msg.as_bytes(), &sig).ok()?;
    Some(exp)
}

fn store_dir() -> Option<PathBuf> {
    let base = std::env::var_os("LOCALAPPDATA").or_else(|| std::env::var_os("HOME"))?;
    let d = PathBuf::from(base).join("Fizpraktikum");
    std::fs::create_dir_all(&d).ok()?;
    Some(d)
}
/// Ключи из файлов лицензии: сохранённый при активации, рядом с программой, в папке класса (по строкам, «код ключ»).
fn candidate_keys(extra: &[String]) -> Vec<String> {
    let mut files: Vec<PathBuf> = Vec::new();
    if let Some(d) = store_dir() { files.push(d.join("license.fzl")); }
    if let Some(d) = std::env::current_exe().ok().and_then(|e| e.parent().map(|p| p.to_path_buf())) { files.push(d.join("license.fzl")); }
    for x in extra { if !x.is_empty() { files.push(PathBuf::from(x).join("license.fzl")); } }
    let mut keys = Vec::new();
    for f in files {
        if let Ok(t) = std::fs::read_to_string(&f) {
            for line in t.lines() { for w in line.split_whitespace() { if w.len() > 60 { keys.push(w.to_string()); } } }
        }
    }
    keys
}

#[derive(serde::Serialize)]
pub struct Status { enforced: bool, code: String, state: String, expires: String, days_left: i64 }

fn seen_check() -> bool {   // перевод часов назад больше чем на сутки — подозрительно
    let Some(d) = store_dir() else { return true };
    let f = d.join("seen"); let now = today();
    let last = std::fs::read_to_string(&f).ok().and_then(|s| s.trim().parse::<i64>().ok()).unwrap_or(0);
    if now + 1 < last { return false; }
    if now > last { let _ = std::fs::write(&f, now.to_string()); }
    true
}

pub fn status(extra: &[String]) -> Status {
    let code = machine_code();
    if PUBKEY.map(|s| s.is_empty()).unwrap_or(true) {
        return Status { enforced: false, code, state: "ok".into(), expires: String::new(), days_left: -1 };
    }
    if !seen_check() { return Status { enforced: true, code, state: "clock".into(), expires: String::new(), days_left: 0 }; }
    let now = today();
    let mut best: Option<i64> = None; let mut expired: Option<i64> = None;
    for k in candidate_keys(extra) {
        if let Some(e) = check_key(&k, &code) {
            if e == 0 || e >= now { best = Some(match best { Some(b) if b == 0 || (e != 0 && b >= e) => b, _ => e }); } else { expired = Some(expired.map_or(e, |x| x.max(e))); }
        }
    }
    match (best, expired) {
        (Some(0), _) => Status { enforced: true, code, state: "ok".into(), expires: String::new(), days_left: -1 },
        (Some(e), _) => Status { enforced: true, code, state: "ok".into(), expires: civil(e), days_left: e - now },
        (None, Some(e)) => Status { enforced: true, code, state: "expired".into(), expires: civil(e), days_left: 0 },
        _ => Status { enforced: true, code, state: "none".into(), expires: String::new(), days_left: 0 },
    }
}

/// Активация ключом или текстом файла лицензии: подходящий ключ сохраняется для этого компьютера.
pub fn activate(text: &str) -> Result<Status, String> {
    let code = machine_code();
    let key = text.split_whitespace().filter(|w| w.len() > 60).find(|w| check_key(w, &code).is_some())
        .ok_or("Ключ не подходит к этому компьютеру. Проверьте, что ключ выдан для кода, который показан выше.")?;
    let d = store_dir().ok_or("Не удалось сохранить ключ")?;
    std::fs::write(d.join("license.fzl"), format!("{} {}\n", code, key)).map_err(|e| e.to_string())?;
    Ok(status(&[]))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn dates() { for s in ["2000-01-01", "2026-11-26", "2027-06-30", "2099-12-31"] { assert_eq!(civil(parse_date(s).unwrap()), s); } }
    #[test]
    fn base32() { let v = vec![1u8, 2, 250, 77, 0, 9, 13]; assert_eq!(&unb32(&b32(&v)).unwrap()[..7], &v[..]); }
}

#[cfg(test)]
mod cross {
    // ключ из генератора (HTML, noble-ed25519) должен приниматься программой: FZ_TEST_KEYS="код ключ срок|..."
    #[test]
    fn generator_keys() {
        let Ok(v) = std::env::var("FZ_TEST_KEYS") else { return };
        for item in v.split('|') {
            let p: Vec<&str> = item.split(' ').collect();
            let exp = super::check_key(p[1], p[0]).expect("ключ генератора не принят");
            assert_eq!(if exp == 0 { String::new() } else { super::civil(exp) }, p.get(2).copied().unwrap_or(""));
            assert!(super::check_key(p[1], "FZ-0000-0000-0000-0000").is_none(), "ключ подошёл к чужому компьютеру");
            let mut bad = p[1].to_string(); let c = bad.pop().unwrap(); bad.push(if c == 'A' { 'B' } else { 'A' });
            assert!(super::check_key(&bad, p[0]).is_none(), "испорченный ключ принят");
        }
    }
}
