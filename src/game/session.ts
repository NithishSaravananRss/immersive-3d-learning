import { create } from "zustand";
import type { SessionUser } from "./api";

const sessionStorageKey = "three-d-learning-session";

type SessionState = {
  authError: string | null;
  authMode: "login" | "register";
  isAuthenticating: boolean;
  token: string | null;
  user: SessionUser | null;
  clearSession: () => void;
  hydrateSession: () => string | null;
  setAuthError: (message: string | null) => void;
  setAuthMode: (mode: "login" | "register") => void;
  setAuthenticating: (value: boolean) => void;
  setSession: (token: string, user: SessionUser) => void;
};

function persistSession(token: string | null) {
  if (!token) {
    localStorage.removeItem(sessionStorageKey);
    return;
  }

  localStorage.setItem(sessionStorageKey, token);
}

export const useSession = create<SessionState>((set) => ({
  authError: null,
  authMode: "login",
  isAuthenticating: false,
  token: null,
  user: null,
  clearSession: () => {
    persistSession(null);
    set({ authError: null, isAuthenticating: false, token: null, user: null });
  },
  hydrateSession: () => {
    const token = localStorage.getItem(sessionStorageKey);
    set({ token });
    return token;
  },
  setAuthError: (authError) => set({ authError }),
  setAuthMode: (authMode) => set({ authError: null, authMode }),
  setAuthenticating: (isAuthenticating) => set({ isAuthenticating }),
  setSession: (token, user) => {
    persistSession(token);
    set({ authError: null, isAuthenticating: false, token, user });
  }
}));
