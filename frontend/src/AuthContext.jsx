import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from "firebase/auth";
import { auth, googleProvider } from "./firebase.js";

// VITE_AUTH=off skips login entirely (pair it with INTERVIA_AUTH=off on the backend).
const AUTH_OFF = import.meta.env.VITE_AUTH === "off";
const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(AUTH_OFF ? { displayName: "Dev user" } : null);
  const [loading, setLoading] = useState(!AUTH_OFF);

  useEffect(() => {
    if (AUTH_OFF || !auth) {
      setLoading(false);
      return undefined;
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const value = {
    user,
    loading,
    signIn: () => signInWithPopup(auth, googleProvider),
    signOut: () => (AUTH_OFF || !auth ? Promise.resolve() : fbSignOut(auth)),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);