import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateToken(token: string, maxLen = 6): string {
  return token.length > maxLen ? token.slice(0, maxLen) + "…" : token;
}
