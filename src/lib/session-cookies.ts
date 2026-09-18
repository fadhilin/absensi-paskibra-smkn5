export const REMEMBER_COOKIE = "paskibra-remember";
export function sessionCookieOptions(remember: boolean, production: boolean) {
  return {
    httpOnly: true,
    secure: production,
    sameSite: "lax" as const,
    path: "/",
    ...(remember ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  };
}
