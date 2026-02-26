import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  fetchAuthSession,
  getCurrentUser,
  signOut as amplifySignOut,
} from "aws-amplify/auth";

/**
 * AuthContext / AuthProvider
 *
 * Identical to portal's AuthContext — same Cognito pool, same pattern.
 *
 * Exposes:
 *   - authState: "loading" | "demo" | "authenticated"
 *   - isLoading, isAuthenticated
 *   - user, groups, hasGroup(name)
 *   - reloadSession(), signOut()
 *
 * SSR-safe: never calls Amplify Auth on the server.
 */

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState("loading");
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);

  const isBrowser = typeof window !== "undefined";

  const loadSession = async () => {
    if (!isBrowser) {
      setAuthState((prev) => (prev === "loading" ? "demo" : prev));
      return;
    }

    try {
      setAuthState("loading");

      const currentUser = await getCurrentUser();

      let idPayload = {};
      try {
        const session = await fetchAuthSession();
        idPayload = session?.tokens?.idToken?.payload || {};
      } catch (sessionErr) {
        console.warn(
          "[AuthContext] fetchAuthSession failed (Identity Pool?), proceeding without token payload:",
          sessionErr
        );
      }

      const tokenGroups = idPayload["cognito:groups"] || [];

      setUser({
        ...currentUser,
        idTokenPayload: idPayload,
      });
      setGroups(tokenGroups);
      setAuthState("authenticated");
    } catch (err) {
      console.warn("[AuthContext] No valid session, using DEMO mode:", err);
      setUser(null);
      setGroups([]);
      setAuthState("demo");
    }
  };

  useEffect(() => {
    if (!isBrowser) return;
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = async () => {
    try {
      await amplifySignOut();
    } catch (err) {
      console.error("[AuthContext] Error during sign-out:", err);
    } finally {
      setUser(null);
      setGroups([]);
      setAuthState("demo");
    }
  };

  const value = {
    authState,
    isLoading: authState === "loading",
    isAuthenticated: authState === "authenticated",
    user,
    groups,
    hasGroup: (g) => groups.includes(g),
    reloadSession: loadSession,
    signOut: handleSignOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
