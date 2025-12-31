import { z } from "zod";

export const usernameSchema = z
  .string()
  .min(1)
  .max(39)
  .regex(/^[a-zA-Z0-9-]+$/, "Invalid GitHub username format");

export const hexColorSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{6}$/, "Invalid hex color");

export const themeSchema = z.enum(["light", "dark", "auto"]).default("auto");

export const boolSchema = z
  .string()
  .transform((v) => v === "true" || v === "1")
  .pipe(z.boolean());

export function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
