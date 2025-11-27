import * as React from 'react';

export type AuthState = {
  isLoaded: boolean;
  isSignedIn: boolean;
};

const AuthContext = React.createContext<AuthState | undefined>(undefined);

export function AuthProvider({ value, children }: { value: AuthState; children?: React.ReactNode }) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthState {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    return { isLoaded: false, isSignedIn: false };
  }
  return ctx;
}


