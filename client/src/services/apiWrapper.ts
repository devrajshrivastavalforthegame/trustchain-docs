function base64ToBytes(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return window.btoa(binary);
}

async function getKey(): Promise<CryptoKey> {
  const raw = import.meta.env.VITE_API_WRAPPER_KEY || import.meta.env.VITE_API_ENCRYPTION_KEY;
  if (!raw) throw new Error("VITE_API_WRAPPER_KEY is missing");
  return crypto.subtle.importKey("raw", base64ToBytes(raw), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptEnvelope(data: unknown) {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded));
  const payload = encrypted.slice(0, encrypted.length - 16);
  const authTag = encrypted.slice(encrypted.length - 16);
  return {
    encrypted: true,
    algorithm: "aes-256-gcm",
    payload: bytesToBase64(payload),
    iv: bytesToBase64(iv),
    authTag: bytesToBase64(authTag),
  };
}

export async function decryptEnvelope<T>(data: unknown): Promise<T> {
  const envelope = data as { encrypted?: boolean; payload?: string; iv?: string; authTag?: string };
  if (!envelope?.encrypted) return data as T;
  if (!envelope.payload || !envelope.iv || !envelope.authTag) throw new Error("Invalid encrypted API envelope");
  const key = await getKey();
  const payload = base64ToBytes(envelope.payload);
  const authTag = base64ToBytes(envelope.authTag);
  const encrypted = new Uint8Array(payload.length + authTag.length);
  encrypted.set(payload);
  encrypted.set(authTag, payload.length);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(envelope.iv) }, key, encrypted);
  return JSON.parse(new TextDecoder().decode(decrypted)) as T;
}

export async function encryptFileForApi(file: File): Promise<{ encryptedFile: File; metadata: string }> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const raw = await file.arrayBuffer();
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, raw));
  const payload = encrypted.slice(0, encrypted.length - 16);
  const authTag = encrypted.slice(encrypted.length - 16);
  const encryptedFile = new File([payload], `${file.name}.api.enc`, { type: "application/octet-stream" });
  return {
    encryptedFile,
    metadata: JSON.stringify({ algorithm: "aes-256-gcm", iv: bytesToBase64(iv), authTag: bytesToBase64(authTag), originalName: file.name, originalType: file.type }),
  };
}
