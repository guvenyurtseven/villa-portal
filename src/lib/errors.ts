export function getErrorMessage(error: unknown, fallback = "Bilinmeyen hata"): string {
  if (error instanceof Error) return error.message;

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }

  if (typeof error === "string" && error.trim()) return error;

  return fallback;
}

export function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}
