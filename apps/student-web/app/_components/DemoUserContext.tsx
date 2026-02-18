"use client";
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

// Demo students list - must match convex/functions/seed.ts
export const DEMO_STUDENTS = [
  // Active demo students (1-5)
  { firstName: "Alice", lastName: "Anderson", email: "alice.anderson@example.com", active: true },
  { firstName: "Bob", lastName: "Bennett", email: "bob.bennett@example.com", active: true },
  { firstName: "Carol", lastName: "Chen", email: "carol.chen@example.com", active: true },
  { firstName: "Dave", lastName: "Davis", email: "dave.davis@example.com", active: true },
  { firstName: "Eve", lastName: "Edwards", email: "eve.edwards@example.com", active: true },
  // Greyed out students (6-26)
  { firstName: "Frank", lastName: "Foster", email: "frank.foster@example.com", active: false },
  { firstName: "Grace", lastName: "Garcia", email: "grace.garcia@example.com", active: false },
  { firstName: "Henry", lastName: "Harris", email: "henry.harris@example.com", active: false },
  { firstName: "Iris", lastName: "Ingram", email: "iris.ingram@example.com", active: false },
  { firstName: "Jack", lastName: "Johnson", email: "jack.johnson@example.com", active: false },
  { firstName: "Kevin", lastName: "Kim", email: "kevin.kim@example.com", active: false },
  { firstName: "Laura", lastName: "Lee", email: "laura.lee@example.com", active: false },
  { firstName: "Mike", lastName: "Martinez", email: "mike.martinez@example.com", active: false },
  { firstName: "Nina", lastName: "Nguyen", email: "nina.nguyen@example.com", active: false },
  { firstName: "Oscar", lastName: "Ortiz", email: "oscar.ortiz@example.com", active: false },
  { firstName: "Paula", lastName: "Patel", email: "paula.patel@example.com", active: false },
  { firstName: "Quinn", lastName: "Quinn", email: "quinn.quinn@example.com", active: false },
  { firstName: "Rachel", lastName: "Robinson", email: "rachel.robinson@example.com", active: false },
  { firstName: "Steve", lastName: "Singh", email: "steve.singh@example.com", active: false },
  { firstName: "Tina", lastName: "Thompson", email: "tina.thompson@example.com", active: false },
  { firstName: "Uma", lastName: "Underwood", email: "uma.underwood@example.com", active: false },
  { firstName: "Victor", lastName: "Valdez", email: "victor.valdez@example.com", active: false },
  { firstName: "Wendy", lastName: "Williams", email: "wendy.williams@example.com", active: false },
  { firstName: "Xavier", lastName: "Xu", email: "xavier.xu@example.com", active: false },
  { firstName: "Yolanda", lastName: "Young", email: "yolanda.young@example.com", active: false },
  { firstName: "Zack", lastName: "Zhang", email: "zack.zhang@example.com", active: false },
];

const STORAGE_KEY = "flamelink_demo_student_email";
const DEFAULT_EMAIL = DEMO_STUDENTS[0].email;

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
      // Validate it's a known demo student
      const isValid = DEMO_STUDENTS.some(s => s.email === stored);
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
    const student = DEMO_STUDENTS.find(s => s.email === email);
    if (!student) {
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
 * Get the current demo student info
 */
export function getCurrentDemoStudent(email: string) {
  return DEMO_STUDENTS.find(s => s.email === email) ?? DEMO_STUDENTS[0];
}
