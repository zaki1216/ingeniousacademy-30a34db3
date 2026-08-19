// Native Web Push (RFC 8291 aes128gcm + RFC 8292 VAPID) implemented with
// WebCrypto so it runs on the edge runtime. No Node-only dependencies.

export type PushDevice = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

const te = new TextEncoder();

export function b64urlToBytes(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = (input + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToB64url(bytes: Uint8Array | ArrayBuffer): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]!);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

async function hmacSha256(keyBytes: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes as unknown as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, data as unknown as ArrayBuffer));
}

/** HKDF with a single-block expand (all outputs here are <= 32 bytes). */
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number) {
  const prk = await hmacSha256(salt, ikm);
  const okm = await hmacSha256(prk, concat(info, new Uint8Array([1])));
  return okm.slice(0, length);
}

/* --------------------------------- VAPID ---------------------------------- */

function getVapid() {
  const publicKey = process.env["VAPID_PUBLIC_KEY"];
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  const subject = process.env["VAPID_SUBJECT"] || "mailto:admin@example.com";
  if (!publicKey || !privateKey) throw new Error("VAPID keys are not configured");
  return { publicKey, privateKey, subject };
}

export function getVapidPublicKeyOrNull(): string | null {
  return process.env["VAPID_PUBLIC_KEY"] ?? null;
}

async function vapidAuthHeader(audience: string): Promise<string> {
  const { publicKey, privateKey, subject } = getVapid();
  const pub = b64urlToBytes(publicKey);
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    d: privateKey,
    x: bytesToB64url(pub.slice(1, 33)),
    y: bytesToB64url(pub.slice(33, 65)),
    ext: true,
  };
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const header = bytesToB64url(te.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = bytesToB64url(
    te.encode(
      JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: subject,
      }),
    ),
  );
  const unsigned = `${header}.${payload}`;
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    te.encode(unsigned) as unknown as ArrayBuffer,
  );
  return `vapid t=${unsigned}.${bytesToB64url(sig)}, k=${publicKey}`;
}

/* ------------------------------- Encryption -------------------------------- */

async function encryptPayload(device: PushDevice, plaintext: string) {
  const uaPublic = b64urlToBytes(device.p256dh);
  const authSecret = b64urlToBytes(device.auth);

  const localKeys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveBits",
  ]);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", localKeys.publicKey));

  const uaKey = await crypto.subtle.importKey(
    "raw",
    uaPublic as unknown as ArrayBuffer,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, localKeys.privateKey, 256),
  );

  const keyInfo = concat(te.encode("WebPush: info\0"), uaPublic, asPublic);
  const ikm = await hkdf(authSecret, sharedSecret, keyInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, te.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, te.encode("Content-Encoding: nonce\0"), 12);

  const aesKey = await crypto.subtle.importKey(
    "raw",
    cek as unknown as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
  const record = concat(te.encode(plaintext), new Uint8Array([2]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce as unknown as ArrayBuffer },
      aesKey,
      record as unknown as ArrayBuffer,
    ),
  );

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  const header = concat(salt, rs, new Uint8Array([asPublic.length]), asPublic);
  return concat(header, ciphertext);
}

/* ---------------------------------- Send ----------------------------------- */

export type PushResult = { ok: boolean; gone: boolean; status?: number; error?: string };

export async function sendWebPush(
  device: PushDevice,
  payload: unknown,
  opts?: { ttl?: number; urgency?: "very-low" | "low" | "normal" | "high" },
): Promise<PushResult> {
  try {
    const url = new URL(device.endpoint);
    const body = await encryptPayload(device, JSON.stringify(payload));
    const authorization = await vapidAuthHeader(url.origin);

    const res = await fetch(device.endpoint, {
      method: "POST",
      headers: {
        authorization,
        "content-encoding": "aes128gcm",
        "content-type": "application/octet-stream",
        ttl: String(opts?.ttl ?? 86400),
        urgency: opts?.urgency ?? "normal",
      },
      body: body as unknown as BodyInit,
    });

    if (res.ok) return { ok: true, gone: false, status: res.status };
    const gone = res.status === 404 || res.status === 410;
    return { ok: false, gone, status: res.status, error: await res.text().catch(() => "") };
  } catch (e) {
    return { ok: false, gone: false, error: e instanceof Error ? e.message : String(e) };
  }
}
