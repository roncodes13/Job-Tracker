import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ACCESS_TOKEN_KEY,
  fetchCurrentUser,
  requestAccessToken,
} from "../api/auth.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("checking");

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  useEffect(() => {
    let active = true;
    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);

    const onExpired = () => {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      setUser(null);
      setStatus("unauthenticated");
    };
    window.addEventListener("jobtrack:auth-expired", onExpired);

    if (!token) {
      setStatus("unauthenticated");
    } else {
      fetchCurrentUser(token)
        .then((currentUser) => {
          if (!active) return;
          setUser(currentUser);
          setStatus("authenticated");
        })
        .catch((error) => {
          if (!active) return;
          if (error.status === 401) {
            sessionStorage.removeItem(ACCESS_TOKEN_KEY);
            setStatus("unauthenticated");
          } else {
            setStatus("error");
          }
        });
    }

    return () => {
      active = false;
      window.removeEventListener("jobtrack:auth-expired", onExpired);
    };
  }, []);

  const signIn = useCallback(async (credentials) => {
    setStatus("checking");
    try {
      const tokenResponse = await requestAccessToken(credentials);
      const currentUser = await fetchCurrentUser(tokenResponse.access_token);
      sessionStorage.setItem(ACCESS_TOKEN_KEY, tokenResponse.access_token);
      setUser(currentUser);
      setStatus("authenticated");
      return currentUser;
    } catch (error) {
      setStatus("unauthenticated");
      throw error;
    }
  }, []);

  const retrySessionCheck = useCallback(async () => {
    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      setStatus("unauthenticated");
      return;
    }
    setStatus("checking");
    try {
      const currentUser = await fetchCurrentUser(token);
      setUser(currentUser);
      setStatus("authenticated");
    } catch (error) {
      if (error.status === 401) {
        clearSession();
        return;
      }
      setStatus("error");
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === "authenticated" && Boolean(user),
      signIn,
      signOut: clearSession,
      retrySessionCheck,
    }),
    [user, status, signIn, clearSession, retrySessionCheck],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
