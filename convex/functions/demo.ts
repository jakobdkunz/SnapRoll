import { v } from "convex/values";
import { query } from "../_generated/server";

export const hello = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return `Hello ${args.name}!`;
  },
});
