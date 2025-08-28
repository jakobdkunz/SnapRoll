// Convex auth configuration for Clerk per docs:
// https://docs.convex.dev/auth/clerk

const issuerEnv = process.env.CLERK_JWT_ISSUER_DOMAIN || "";
// Allow comma-separated issuers to support multiple Clerk instances (student + instructor)
const issuerDomains = issuerEnv
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  // de-dupe
  .filter((v, i, a) => a.indexOf(v) === i);

export default {
  providers: issuerDomains.map((domain) => ({
    domain,
    applicationID: "convex",
  })),
};


