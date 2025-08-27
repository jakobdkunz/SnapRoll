import { ConvexReactClient } from "convex/react";
import { api } from "../../convex/_generated/api";

// Create a client
export const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Export the API for type safety
export { api };
