import { z } from "zod";

export const urlSchema = z
  .string()
  .min(1, "URL is required")
  .url("Must be a valid URL")
  .refine(
    (val) => val.startsWith("http://") || val.startsWith("https://"),
    "URL must use http or https protocol",
  );

/**
 * Specifying the values on success will define the url / error
 * properties availability.
 */
type ValidateUrlResponse =
  | { success: true; url: string }
  | { success: false; error: string };

export function validateUrl(input: string): ValidateUrlResponse {
  const result = urlSchema.safeParse(input);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message ?? "Invalid URL",
    };
  }

  return { success: true, url: result.data };
}
