import { createContext, useCallback, useContext, useEffect, useState } from "react";

const KEY = "intervia:theme";
const Ctx = createContext({ theme: "light", toggle: () => {} });

// index.html sets data-theme before the page paints, so start from whatever it chose.
const initialTheme = () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Follow the operating system's setting until the user picks a theme themselves.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => {
      let saved = null;
      try {
        saved = localStorage.getItem(KEY);
      } catch {
        /* storage unavailable */
      }
      if (saved !== "light" && saved !== "dark") setTheme(e.matches ? "dark" : "light");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggle = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* storage unavailable: the choice just won't persist */
    }
  }, [theme]);

  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);