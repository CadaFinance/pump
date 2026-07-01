import { shortAddress } from "@/config/chain";

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 15;
const USERNAME_PATTERN = /^[a-z0-9_]+$/;
const ETH_ADDRESS_PATTERN = /^0x[a-f0-9]{4,}$/;

const RESERVED_USERNAMES = new Set([
  "admin",
  "api",
  "arena",
  "auth",
  "create",
  "help",
  "login",
  "logout",
  "portfolio",
  "pump",
  "settings",
  "signin",
  "signup",
  "support",
  "token",
  "trade",
  "www",
]);

export type UsernameValidationResult =
  | { ok: true; username: string }
  | { ok: false; error: string };

export function normalizeUsernameInput(input: string): string {
  return input.trim().toLowerCase().replace(/^@+/, "");
}

export function validateUsername(input: string): UsernameValidationResult {
  const username = normalizeUsernameInput(input);

  if (!username) {
    return { ok: false, error: "Username is required" };
  }

  if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `Username must be ${USERNAME_MIN_LENGTH}–${USERNAME_MAX_LENGTH} characters`,
    };
  }

  if (!USERNAME_PATTERN.test(username)) {
    return {
      ok: false,
      error: "Use only letters, numbers, and underscores",
    };
  }

  if (ETH_ADDRESS_PATTERN.test(username)) {
    return { ok: false, error: "Username cannot look like a wallet address" };
  }

  if (RESERVED_USERNAMES.has(username)) {
    return { ok: false, error: "This username is reserved" };
  }

  return { ok: true, username };
}

export function resolveDisplayUsername(
  address: string,
  username: string | null | undefined,
  compact = true
): string {
  if (username) return username;
  return shortAddress(address, compact);
}

export function isDefaultUsernameInput(address: string, input: string): boolean {
  const normalized = address.toLowerCase();
  const candidate = normalizeUsernameInput(input);
  if (!candidate) return true;
  if (candidate === normalized) return true;
  if (candidate === normalized.slice(2)) return true;
  return resolveDisplayUsername(address, null, true).toLowerCase() === candidate;
}

export class UsernameTakenError extends Error {
  constructor() {
    super("Username is already taken");
    this.name = "UsernameTakenError";
  }
}

export class InvalidUsernameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidUsernameError";
  }
}
