import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase.js";

// VITE_AUTH=off skips login entirely (pair it with INTERVIA_AUTH=off on the backend).
const AUTH_OFF = import.meta.env.VITE_AUTH === "off";
const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(
    AUTH_OFF ? { displayName: "Dev user", email: "dev@intervia.io" } : null
  );
  const [loading, setLoading] = useState(!AUTH_OFF);
  const [userRole, setUserRole] = useState(
    () => localStorage.getItem("intervia_user_role") || "candidate"
  );
  const [companyName, setCompanyName] = useState(
    () => localStorage.getItem("intervia_company_name") || ""
  );
  const [, bump] = useState(0);

  useEffect(() => {
    if (AUTH_OFF || !auth) {
      setLoading(false);
      return undefined;
    }
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const token = await u.getIdToken();
          const res = await fetch("/api/profile", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            const prof = data.profile || {};
            const role = prof.account_type === "employer" ? "employer" : "candidate";
            setUserRole(role);
            localStorage.setItem("intervia_user_role", role);
            if (prof.company_name) {
              setCompanyName(prof.company_name);
              localStorage.setItem("intervia_company_name", prof.company_name);
            }
          }
        } catch {
          // Keep cached role from local storage on network hiccup
        }
      }
      setLoading(false);
    });
  }, []);

  function saveCompany(company) {
    setCompanyName(company || "");
    if (company) localStorage.setItem("intervia_company_name", company);
    else localStorage.removeItem("intervia_company_name");
  }

  async function signInDemoEmployer() {
    const demoEmail = "recruiter@acmecorp.com";
    const demoPassword = "demopassword123";

    setUserRole("employer");
    saveCompany("Acme Corp");
    localStorage.setItem("intervia_user_role", "employer");
    localStorage.setItem("intervia_company_name", "Acme Corp");

    if (AUTH_OFF || !auth) {
      setUser({ displayName: "Acme Recruiter", email: demoEmail });
      return;
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
      setUser(cred.user);
      return cred;
    } catch (err) {
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password"
      ) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
          await updateProfile(cred.user, { displayName: "Acme Recruiter" });
          setUser(cred.user);

          const token = await cred.user.getIdToken();
          await fetch("/api/profile", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              "X-User-Role": "employer",
            },
            body: JSON.stringify({
              account_type: "employer",
              company_name: "Acme Corp",
              name: "Acme Recruiter",
              city: "Bengaluru",
              skills: [],
            }),
          });
          return cred;
        } catch {
          // Graceful fallback to demo session
          setUser({ displayName: "Acme Recruiter", email: demoEmail });
          return;
        }
      }
      setUser({ displayName: "Acme Recruiter", email: demoEmail });
    }
  }

  async function signInEmployer(email, password) {
    if (AUTH_OFF || !auth) {
      setUser({ displayName: "Acme Recruiter", email });
      setUserRole("employer");
      saveCompany("Acme Corp");
      localStorage.setItem("intervia_user_role", "employer");
      return;
    }
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const token = await cred.user.getIdToken();
    try {
      const res = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const prof = data.profile || {};
        if (prof.account_type === "candidate") {
          await fbSignOut(auth);
          throw new Error("This account is registered as a Candidate. Please sign in via the Candidate portal at /login.");
        }
        setUserRole("employer");
        saveCompany(prof.company_name || "");
        localStorage.setItem("intervia_user_role", "employer");
      }
    } catch (err) {
      if (err.message.includes("Candidate")) throw err;
      setUserRole("employer");
      localStorage.setItem("intervia_user_role", "employer");
    }
    return cred;
  }

  async function signUpEmployer(email, password, name, company) {
    if (AUTH_OFF || !auth) {
      setUser({ displayName: name, email });
      setUserRole("employer");
      saveCompany(company);
      localStorage.setItem("intervia_user_role", "employer");
      return;
    }
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    setUser(cred.user);
    setUserRole("employer");
    saveCompany(company);
    localStorage.setItem("intervia_user_role", "employer");

    try {
      const token = await cred.user.getIdToken();
      await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-User-Role": "employer",
        },
        body: JSON.stringify({
          account_type: "employer",
          company_name: company,
          name: name,
          skills: [],
        }),
      });
    } catch {
      // Backend profile update attempted
    }
    bump((n) => n + 1);
    return cred;
  }

  async function signInCandidate(email, password) {
    if (AUTH_OFF || !auth) {
      setUser({ displayName: "Dev Candidate", email });
      setUserRole("candidate");
      localStorage.setItem("intervia_user_role", "candidate");
      return;
    }
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const token = await cred.user.getIdToken();
    try {
      const res = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const prof = data.profile || {};
        if (prof.account_type === "employer") {
          await fbSignOut(auth);
          throw new Error("This account is registered as an Employer / Recruiter. Please sign in via the Recruiter Portal at /employer/login.");
        }
        setUserRole("candidate");
        localStorage.setItem("intervia_user_role", "candidate");
      }
    } catch (err) {
      if (err.message.includes("Employer")) throw err;
      setUserRole("candidate");
      localStorage.setItem("intervia_user_role", "candidate");
    }
    return cred;
  }

  async function signUpCandidate(email, password, name) {
    if (AUTH_OFF || !auth) {
      setUser({ displayName: name, email });
      setUserRole("candidate");
      localStorage.setItem("intervia_user_role", "candidate");
      return;
    }
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    setUser(cred.user);
    setUserRole("candidate");
    localStorage.setItem("intervia_user_role", "candidate");

    try {
      const token = await cred.user.getIdToken();
      await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-User-Role": "candidate",
        },
        body: JSON.stringify({
          account_type: "candidate",
          name: name,
          skills: [],
        }),
      });
    } catch {
      // Backend profile update attempted
    }
    bump((n) => n + 1);
    return cred;
  }

  async function signInGoogleCandidate() {
    if (AUTH_OFF || !auth) {
      setUser({ displayName: "Dev Candidate", email: "candidate@intervia.io" });
      setUserRole("candidate");
      localStorage.setItem("intervia_user_role", "candidate");
      return;
    }
    const cred = await signInWithPopup(auth, googleProvider);
    const token = await cred.user.getIdToken();
    try {
      const res = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const prof = data.profile || {};
        if (prof.account_type === "employer") {
          await fbSignOut(auth);
          throw new Error("This account is registered as an Employer. Please sign in via the Recruiter Portal at /employer/login.");
        }
        setUserRole("candidate");
        localStorage.setItem("intervia_user_role", "candidate");
      }
    } catch (err) {
      if (err.message.includes("Employer")) throw err;
      setUserRole("candidate");
      localStorage.setItem("intervia_user_role", "candidate");
    }
    return cred;
  }

  async function signOut() {
    localStorage.removeItem("intervia_user_role");
    localStorage.removeItem("intervia_company_name");
    setUserRole("candidate");
    setCompanyName("");
    if (AUTH_OFF || !auth) {
      setUser(null);
      return Promise.resolve();
    }
    return fbSignOut(auth);
  }

  const value = {
    user,
    userRole,
    companyName,
    isEmployer: userRole === "employer",
    isCandidate: userRole === "candidate",
    loading,
    saveCompany,
    signInDemoEmployer,
    signInEmployer,
    signUpEmployer,
    signInCandidate,
    signUpCandidate,
    signInGoogleCandidate,
    signIn: signInGoogleCandidate,
    signInEmail: (email, password) => signInCandidate(email, password),
    signUpEmail: (email, password, name) => signUpCandidate(email, password, name),
    resetPassword: (email) => sendPasswordResetEmail(auth, email),
    signOut,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
