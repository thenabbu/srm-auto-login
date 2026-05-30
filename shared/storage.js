const browserApi = globalThis.browser || globalThis.chrome;
const _SALT = "srm-al-obf-v2";

function _encode(str) {
  const salt = new TextEncoder().encode(_SALT);
  const plain = new TextEncoder().encode(str);
  const out = new Uint8Array(plain.length);
  for (let i = 0; i < plain.length; i++) {
    out[i] = plain[i] ^ salt[i % salt.length];
  }
  return Array.from(out, (b) => b.toString(16).padStart(2, "0")).join("");
}

function _decode(hex) {
  if (!hex || typeof hex !== "string") return "";
  const salt = new TextEncoder().encode(_SALT);
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(
      parseInt(hex.slice(i, i + 2), 16) ^ salt[(i >> 1) % salt.length],
    );
  }
  try {
    return new TextDecoder().decode(new Uint8Array(bytes));
  } catch (_) {
    return "";
  }
}

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function looksObfuscated(str) {
  return (
    typeof str === "string" &&
    str.length > 0 &&
    str.length % 2 === 0 &&
    /^[0-9a-f]+$/.test(str)
  );
}

function normalizeAccount(account) {
  if (!account || !account.email || !account.password) return null;
  const pw = account.password;
  return {
    ...account,
    email: account.email.trim().toLowerCase(),
    // Silently migrate plaintext passwords on read
    password: looksObfuscated(pw) ? pw : _encode(pw),
    enabled: account.enabled !== false,
  };
}
