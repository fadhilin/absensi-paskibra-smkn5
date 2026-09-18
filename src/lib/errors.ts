export function readableError(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "issues" in error &&
    Array.isArray(error.issues)
  )
    return error.issues
      .map((issue: { message: string }) => issue.message)
      .join(" ");
  return error instanceof Error
    ? error.message
    : "Permintaan gagal. Silakan coba lagi.";
}
