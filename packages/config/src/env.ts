import { z } from 'zod';

const EnvSchema = z.object({
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  NEXT_PUBLIC_TEACHER_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_STUDENT_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_DEV_MODE: z.enum(["true", "false"]).optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function getEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${parsed.error.message}`);
  }
  return parsed.data;
}
