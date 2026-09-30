"use client";

import { useSyncExternalStore } from "react";

/**
 * Cognito sign-in straight from the browser (the site is a static export, so
 * there is no server to hold a session). Tokens live in localStorage when
 * "Mantener sesión iniciada" is on, otherwise in sessionStorage.
 */

const REGION = process.env.NEXT_PUBLIC_COGNITO_REGION ?? "us-east-2";
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "";
const ENDPOINT = `https://cognito-idp.${REGION}.amazonaws.com/`;
const STORAGE_KEY = "mtc:session";
const EXPIRY_MARGIN_MS = 60_000;

export interface Session {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  /** ms since epoch when the id token expires. */
  expiresAt: number;
  email: string;
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

const MESSAGES: Record<string, string> = {
  NotAuthorizedException: "Correo o contraseña incorrectos.",
  UserNotFoundException: "Correo o contraseña incorrectos.",
  PasswordResetRequiredException: "Debes restablecer tu contraseña.",
  InvalidPasswordException: "La contraseña debe tener al menos 10 caracteres, con mayúscula, minúscula y número.",
  CodeMismatchException: "El código no es correcto.",
  ExpiredCodeException: "El código venció. Pide uno nuevo.",
  LimitExceededException: "Demasiados intentos. Espera unos minutos.",
  TooManyRequestsException: "Demasiados intentos. Espera unos minutos.",
};

async function cognito<T>(target: string, body: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-amz-json-1.1", "X-Amz-Target": `AWSCognitoIdentityProviderService.${target}` },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AuthError("No hay conexión. Revisa tu internet e intenta de nuevo.", "NetworkError");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = String(data.__type ?? "Error").split("#").pop() as string;
    throw new AuthError(MESSAGES[code] ?? data.message ?? "No pudimos iniciar sesión.", code);
  }
  return data as T;
}

/* ----------------------------------------------------------------- session */

interface AuthResult {
  IdToken: string;
  AccessToken: string;
  RefreshToken?: string;
  ExpiresIn: number;
}

function claims(token: string): { email?: string; exp: number } {
  const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(decodeURIComponent(escape(atob(payload))));
}

const listeners = new Set<() => void>();
let cached: { raw: string | null; session: Session | null } = { raw: null, session: null };

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Stable object per stored value, as useSyncExternalStore requires. */
function readSession(): Session | null {
  const raw = readRaw();
  if (raw !== cached.raw) {
    let session: Session | null = null;
    try {
      session = raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      session = null;
    }
    cached = { raw, session };
  }
  return cached.session;
}

function store(session: Session | null, persistent: boolean) {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.sessionStorage.removeItem(STORAGE_KEY);
    if (session) (persistent ? window.localStorage : window.sessionStorage).setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage blocked: the session lasts only until reload.
  }
  listeners.forEach((l) => l());
}

const isPersistent = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
};

function toSession(result: AuthResult, previous?: Session): Session {
  return {
    idToken: result.IdToken,
    accessToken: result.AccessToken,
    refreshToken: result.RefreshToken ?? previous?.refreshToken ?? "",
    expiresAt: Date.now() + result.ExpiresIn * 1000,
    email: claims(result.IdToken).email ?? previous?.email ?? "",
  };
}

/**
 * Current session: null when signed out, undefined while the page is still
 * hydrating (localStorage is not readable yet). Re-renders on sign-in/out and across tabs.
 */
export function useSession(): Session | null | undefined {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      window.addEventListener("storage", onChange);
      return () => {
        listeners.delete(onChange);
        window.removeEventListener("storage", onChange);
      };
    },
    readSession,
    () => undefined,
  );
}

/* ----------------------------------------------------------------- actions */

export type SignInResult = { status: "signed-in" } | { status: "new-password"; challengeSession: string };

export async function signIn(email: string, password: string, keepSession: boolean): Promise<SignInResult> {
  const res = await cognito<{ AuthenticationResult?: AuthResult; ChallengeName?: string; Session?: string }>("InitiateAuth", {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: CLIENT_ID,
    AuthParameters: { USERNAME: email, PASSWORD: password },
  });
  if (res.AuthenticationResult) {
    store(toSession(res.AuthenticationResult), keepSession);
    return { status: "signed-in" };
  }
  if (res.ChallengeName === "NEW_PASSWORD_REQUIRED" && res.Session) return { status: "new-password", challengeSession: res.Session };
  throw new AuthError("Este inicio de sesión requiere un paso que la app no soporta.", res.ChallengeName ?? "UnsupportedChallenge");
}

/** First sign-in with the temporary password: choose the real one. */
export async function setNewPassword(email: string, newPassword: string, challengeSession: string, keepSession: boolean): Promise<void> {
  const res = await cognito<{ AuthenticationResult?: AuthResult }>("RespondToAuthChallenge", {
    ClientId: CLIENT_ID,
    ChallengeName: "NEW_PASSWORD_REQUIRED",
    Session: challengeSession,
    ChallengeResponses: { USERNAME: email, NEW_PASSWORD: newPassword },
  });
  if (!res.AuthenticationResult) throw new AuthError("No pudimos guardar la contraseña.", "NoResult");
  store(toSession(res.AuthenticationResult), keepSession);
}

export const requestPasswordReset = (email: string) => cognito("ForgotPassword", { ClientId: CLIENT_ID, Username: email }).then(() => undefined);

export const confirmPasswordReset = (email: string, code: string, newPassword: string) =>
  cognito("ConfirmForgotPassword", { ClientId: CLIENT_ID, Username: email, ConfirmationCode: code, Password: newPassword }).then(() => undefined);

export function signOut() {
  store(null, false);
}

let refreshing: Promise<Session> | null = null;

async function refresh(current: Session): Promise<Session> {
  refreshing ??= cognito<{ AuthenticationResult: AuthResult }>("InitiateAuth", {
    AuthFlow: "REFRESH_TOKEN_AUTH",
    ClientId: CLIENT_ID,
    AuthParameters: { REFRESH_TOKEN: current.refreshToken },
  })
    .then((res) => {
      const next = toSession(res.AuthenticationResult, current);
      store(next, isPersistent());
      return next;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/** A valid id token for the API, refreshed when about to expire. Signs out when the refresh token is no longer good. */
export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const session = readSession();
  if (!session) return null;
  if (!forceRefresh && session.expiresAt - Date.now() > EXPIRY_MARGIN_MS) return session.idToken;
  try {
    return (await refresh(session)).idToken;
  } catch (err) {
    if (err instanceof AuthError && err.code !== "NetworkError") signOut();
    return null;
  }
}
