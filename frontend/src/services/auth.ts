import { apiRequest } from "./api";
export type User = {
  id: string;
  email: string;
  name: string;
  kind: "individual" | "company";
  company: string | null;
  country: string;
  phone: string | null;
  role: "customer" | "administrator" | "sales" | "content_editor";
  emailVerified: boolean;
};
export type Session = { user: User | null; csrfToken: string; sessionExpired: boolean };
export type ProfileInput = Pick<User, "name" | "kind" | "country"> & {
  company?: string;
  phone?: string;
};
export type MailInput = { email: string; lang: "ar" | "en"; returnTo: string };
const base = () => import.meta.env.VITE_API_BASE_URL || window.location.origin;
export const readSession = (signal?: AbortSignal) =>
  apiRequest<Session>(base(), "/api/v1/auth/session", { signal });
export function authWrite<T>(path: string, body: unknown, csrf: string, method = "POST") {
  return apiRequest<T>(base(), `/api/v1/${path}`, {
    method,
    body,
    headers: { "X-CSRF-Token": csrf },
  });
}
export const signIn = (body: { email: string; password: string }, csrf: string) =>
  authWrite<Session>("auth/login", body, csrf);
export const signOut = (csrf: string) => authWrite<{ ok: boolean }>("auth/logout", {}, csrf);
export const register = (body: ProfileInput & MailInput & { password: string }, csrf: string) =>
  authWrite<{ accepted: boolean }>("auth/register", body, csrf);
export const resendVerification = (body: MailInput, csrf: string) =>
  authWrite<{ accepted: boolean }>("auth/verification/resend", body, csrf);
export const confirmVerification = (token: string, csrf: string) =>
  authWrite<{ ok: boolean }>("auth/verification/confirm", { token }, csrf);
export const forgotPassword = (body: MailInput, csrf: string) =>
  authWrite<{ accepted: boolean }>("auth/password/forgot", body, csrf);
export const resetPassword = (body: { token: string; password: string }, csrf: string) =>
  authWrite<{ ok: boolean }>("auth/password/reset", body, csrf);
export const readProfile = (signal?: AbortSignal) =>
  apiRequest<User>(base(), "/api/v1/account/profile", { signal });
export const saveProfile = (body: ProfileInput, csrf: string) =>
  authWrite<User>("account/profile", body, csrf, "PATCH");
export const changePassword = (body: { currentPassword: string; password: string }, csrf: string) =>
  authWrite<{ ok: boolean }>("account/password", body, csrf);
export const readStaffAccess = (signal?: AbortSignal) =>
  apiRequest<{ role: User["role"]; permissions: string[] }>(base(), "/api/v1/staff/access", {
    signal,
  });
