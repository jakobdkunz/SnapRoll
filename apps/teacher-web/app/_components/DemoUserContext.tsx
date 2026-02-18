"use client";
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

// Demo instructors list - must match convex/functions/seed.ts
export const DEMO_INSTRUCTORS = [
  // Active demo instructors (1-2)
  { firstName: "James", lastName: "Mitchell", email: "james.mitchell@example.com", active: true },
  { firstName: "Kimberly", lastName: "Nelson", email: "kimberly.nelson@example.com", active: true },
  // Greyed out instructors (3-6) - L, M, N, O
  { firstName: "Larry", lastName: "Olsen", email: "larry.olsen@example.com", active: false },
  { firstName: "Maria", lastName: "Perez", email: "maria.perez@example.com", active: false },
  { firstName: "Nathan", lastName: "Quinn", email: "nathan.quinn@example.com", active: false },
  { firstName: "Olivia", lastName: "Reynolds", email: "olivia.reynolds@example.com", active: false },
];

const STORAGE_KEY = "flamelink_demo_instructor_email";
const DEFAULT_EMAIL = DEMO_INSTRUCTORS[0].email;

interface DemoUserContextValue {
  /** The currently selected demo user email */
  demoUserEmail: string;
  /** Set the demo user email */
  setDemoUserEmail: (email: string) => void;
  /** Whether the context has been hydrated from localStorage */
  isHydrated: boolean;
}

const DemoUserContext = createContext<DemoUserContextValue | null>(null);

export function DemoUserProvider({ children }: { children: ReactNode }) {
  const [demoUserEmail, setDemoUserEmailState] = useState<string>(DEFAULT_EMAIL);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      // Validate it's a known demo instructor
      const isValid = DEMO_INSTRUCTORS.some(i => i.email === stored);
      if (isValid) {
        setDemoUserEmailState(stored);
      } else {
        // Clear invalid stored value
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsHydrated(true);
  }, []);

  const setDemoUserEmail = useCallback((email: string) => {
    // Only allow setting known demo users
    const instructor = DEMO_INSTRUCTORS.find(i => i.email === email);
    if (!instructor) {
      return;
    }
    setDemoUserEmailState(email);
    localStorage.setItem(STORAGE_KEY, email);
  }, []);

  return (
    <DemoUserContext.Provider value={{ demoUserEmail, setDemoUserEmail, isHydrated }}>
      {children}
    </DemoUserContext.Provider>
  );
}

export function useDemoUser(): DemoUserContextValue {
  const context = useContext(DemoUserContext);
  if (!context) {
    // Return a default value if not in demo mode / no provider
    return {
      demoUserEmail: DEFAULT_EMAIL,
      setDemoUserEmail: () => {},
      isHydrated: true,
    };
  }
  return context;
}

/**
 * Get the current demo instructor info
 */
export function getCurrentDemoInstructor(email: string) {
  return DEMO_INSTRUCTORS.find(i => i.email === email) ?? DEMO_INSTRUCTORS[0];
}
