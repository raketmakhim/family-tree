import { createContext, useContext, useState, ReactNode } from "react";
import { Role } from "../types";

interface AuthState {
  token: string | null;
  role: Role | null;
}

interface AuthContextType extends AuthState {
  login: (token: string, role: string) => void;
  logout: () => void;
  isEditor: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => ({
    token: localStorage.getItem("token"),
    role: localStorage.getItem("role") as Role | null,
  }));

  const login = (token: string, role: string) => {
    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
    setAuth({ token, role: role as Role });
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setAuth({ token: null, role: null });
  };

  return (
    <AuthContext.Provider value={{ ...auth, login, logout, isEditor: auth.role === "editor" }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
