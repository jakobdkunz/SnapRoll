import { query } from "../_generated/server";

export const hello = query({
  args: { name: "world" },
  handler: async (ctx, args) => {
    return `Hello ${args.name}!`;
  },
});
