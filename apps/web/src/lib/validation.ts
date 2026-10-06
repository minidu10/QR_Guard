import { z } from 'zod';

// Same rules as the API, so users see errors before the request is sent.
export const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password').max(72),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(80),
  email: z.email('Enter a valid email').max(120),
  phone: z
    .string()
    .trim()
    .regex(/^(\+94|0)7\d{8}$/, 'Use a Sri Lankan mobile number, e.g. 0771234567')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  password: z.string().min(8, 'Use at least 8 characters').max(72),
  role: z.enum(['customer', 'owner']),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

/** State returned by the login/register server actions. */
export interface FormState {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
  values?: Record<string, string>;
}

/** First error message for each field. */
export function fieldErrors(error: z.ZodError): Partial<Record<string, string>> {
  const out: Partial<Record<string, string>> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    out[key] ??= issue.message;
  }
  return out;
}
