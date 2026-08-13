import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import { api, ApiError } from "./api";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: "user" | "admin";
  money: number;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
    adminCode?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  promote: (code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const token = localStorage.getItem("identity_slot_token");

    if (!token) {
      setUser(null);
      return;
    }

    try {
      const me = await api.get<AuthUser>("/auth/me");
      setUser(me);
    } catch {
      localStorage.removeItem("identity_slot_token");
      setUser(null);
    }
  }

  useEffect(() => {
    refresh().finally(() => {
      setLoading(false);
    });
  }, []);

  async function login(email: string, password: string) {
    const result = await api.post<AuthResponse>(
      "/auth/login",
      {
        email,
        password,
      }
    );

    localStorage.setItem(
      "identity_slot_token",
      result.token
    );

    setUser(result.user);
  }

  async function register(
    email: string,
    password: string,
    displayName: string,
    adminCode?: string
  ) {
    const result = await api.post<AuthResponse>(
      "/auth/register",
      {
        email,
        password,
        displayName,
        adminCode,
      }
    );

    localStorage.setItem(
      "identity_slot_token",
      result.token
    );

    setUser(result.user);
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      localStorage.removeItem("identity_slot_token");
      setUser(null);
    }
  }

  async function promote(code: string) {
    const me = await api.post<AuthUser>(
      "/auth/promote",
      { code }
    );

    setUser(me);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refresh,
        promote,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      "useAuth must be used within AuthProvider"
    );
  }

  return ctx;
}

export { ApiError };