// Simple in-memory token store — replace with expo-secure-store in production
let _token: string | null = null;
let _role: string | null = null;

export function saveSession(token: string, role: string) {
  _token = token;
  _role = role;
}

export function clearSession() {
  _token = null;
  _role = null;
}

export function getToken(): string | null { return _token; }
export function getRole(): string | null { return _role; }
