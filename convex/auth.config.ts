// Convex v1.26 config uses a runtime import from convex/server for Auth
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Auth from "convex/server";

// Configure Clerk as the Convex auth provider.
// Provide one or more issuers via the CLERK_ISSUER env var (comma-separated),
// e.g. "https://subtle-caiman-76.clerk.accounts.dev,https://your-prod.clerk.accounts.dev".
// We also include a safe fallback for local/dev if env vars are missing.

const fromEnv = (process.env.CLERK_ISSUER || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const fallbackDevIssuer = "https://subtle-caiman-76.clerk.accounts.dev";
const issuers = fromEnv.length > 0 ? fromEnv : [fallbackDevIssuer];

export default Auth.configure({
  providers: issuers.map((issuer) => Auth.Clerk({ issuer })),
});


