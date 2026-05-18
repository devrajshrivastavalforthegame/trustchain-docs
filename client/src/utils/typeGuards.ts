export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const readString = (source: Record<string, unknown>, keys: string[], fallback = ""): string => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
    if (typeof value === "number") return String(value);
  }
  return fallback;
};

export const readNumber = (source: Record<string, unknown>, keys: string[], fallback = 0): number => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && !Number.isNaN(Number(value))) return Number(value);
  }
  return fallback;
};

export const readRecord = (source: Record<string, unknown>, keys: string[]): Record<string, unknown> | undefined => {
  for (const key of keys) {
    const value = source[key];
    if (isRecord(value)) return value;
  }
  return undefined;
};

export const readArray = <T>(source: Record<string, unknown>, keys: string[], mapper: (item: unknown) => T): T[] => {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) return value.map(mapper);
  }
  return [];
};

export const unwrapApiData = (payload: unknown): unknown => {
  if (!isRecord(payload)) return payload;
  if (payload.data !== undefined) return unwrapApiData(payload.data);
  if (payload.result !== undefined) return unwrapApiData(payload.result);
  if (payload.payload !== undefined) return unwrapApiData(payload.payload);
  return payload;
};
