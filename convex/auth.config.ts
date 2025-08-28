// Convex auth configuration for Clerk per docs:
// https://docs.convex.dev/auth/clerk

export default {
  providers: [
    {
      // Use your Clerk Frontend API URL (issuer) via Convex env
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};


