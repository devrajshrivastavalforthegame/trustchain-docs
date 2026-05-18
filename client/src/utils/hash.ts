export const sha256FromText = async (input: string): Promise<string> => {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

export const sha256FromFile = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

export const makeVerificationId = async (seed: string): Promise<string> => {
  const hash = await sha256FromText(`${seed}-${Date.now()}`);
  return `vr_${hash.slice(0, 16)}`;
};
