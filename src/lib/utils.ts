import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** A document's display name: its printed title, else a tidied file name. */
export function docName(
  title: string | null | undefined,
  fileName: string | null | undefined,
): string {
  const t = title?.replaceAll("\n", " ").trim();
  if (t) return t;
  if (fileName)
    return fileName
      .replace(/\.pdf$/i, "")
      .replace(/[-_]+/g, " ")
      .trim();
  return "document";
}
