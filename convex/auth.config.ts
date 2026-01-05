// Convex auth configuration for WorkOS AuthKit
// https://docs.convex.dev/auth/authkit

const clientId = "client_01KAGX2D64TMX8M8K554JYENQ3";
const jwksUrl = `https://api.workos.com/sso/jwks/${clientId}`;

export default {
  providers: [
    // Provider for standard WorkOS API issuer
    {
      type: "customJwt",
      issuer: "https://api.workos.com/",
      algorithm: "RS256",
      applicationID: clientId,
      jwks: jwksUrl,
    },
    // Provider for user_management issuer (used by AuthKit session tokens)
    {
      type: "customJwt",
      issuer: `https://api.workos.com/user_management/${clientId}`,
      algorithm: "RS256",
      applicationID: clientId,
      jwks: jwksUrl,
    },
  ],
};
