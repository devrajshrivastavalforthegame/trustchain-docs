export const shortenHash = (hash: string, start = 10, end = 8) => {
  if (hash.length <= start + end) return hash;
  return `${hash.slice(0, start)}…${hash.slice(-end)}`;
};

export const generateSHA256FromFile = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(digest));

  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const generateSHA256FromText = async (value: string): Promise<string> => {
  const encoded = new TextEncoder().encode(value.trim());
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(digest));

  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
};
