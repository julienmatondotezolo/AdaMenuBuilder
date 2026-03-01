import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { AUTH_URL, TOKEN_KEY, buildAuthRedirectUrl } from "../config/auth";
import type { User } from "../types/auth";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Validate token against AdaAuth and get user profile
  const validateAndFetchUser = useCallback(async (accessToken: string): Promise<User | null> => {
    try {
      // First validate the token
      const validateRes = await fetch(`${AUTH_URL}/auth/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: accessToken }),
      });

      // AdaAuth returns 401 with {valid:false} for expired/invalid tokens —
      // parse body regardless of HTTP status to get structured response
      const validateData = await validateRes.json();
      if (!validateData.valid || !validateData.user) {
        return null;
      }

      // Fetch full profile
      const profileRes = await fetch(`${AUTH_URL}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!profileRes.ok) {
        // Validation passed but profile fetch failed — use validate data
        console.warn("Profile fetch failed, using validate data");
        return validateData.user;
      }

      return await profileRes.json();
    } catch (error) {
      console.error("Auth validation error:", error);
      return null;
    }
  }, []);

  // Login: store token and validate
  const login = useCallback(async (accessToken: string): Promise<boolean> => {
    const userData = await validateAndFetchUser(accessToken);
    if (userData) {
      localStorage.setItem(TOKEN_KEY, accessToken);
      setToken(accessToken);
      setUser(userData);
      return true;
    }
    localStorage.removeItem(TOKEN_KEY);
    return false;
  }, [validateAndFetchUser]);

  // Logout: clear everything and redirect to AdaAuth
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    window.location.href = buildAuthRedirectUrl("/");
  }, []);

  // On mount: check for stored token
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    validateAndFetchUser(storedToken).then((userData) => {
      if (userData) {
        setToken(storedToken);
        setUser(userData);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
      setIsLoading(false);
    });
  }, [validateAndFetchUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
