// components/client/kalam/KalamFontUtils.ts

/** Detects whether text contains Urdu/Arabic script characters */
export function isUrduScript(text: string | undefined | null): boolean {
  if (!text) return false;
  return /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

/** Pick the right font class based on detected script */
export function scriptFontClass(text: string | undefined | null): string {
  return isUrduScript(text) ? "font-urdu" : "font-outfit";
}

/** Urdu uses taller line height than Latin */
export function scriptLineHeight(text: string | undefined | null): string {
  return isUrduScript(text) ? "leading-[2.4]" : "leading-[1.6]";
}

/** Direction based on script */
export function scriptDir(text: string | undefined | null): "rtl" | "ltr" {
  return isUrduScript(text) ? "rtl" : "ltr";
}