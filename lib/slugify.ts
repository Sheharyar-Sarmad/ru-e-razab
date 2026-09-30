// lib/slugify.ts

// Every Urdu/Arabic-script letter, mark, and digit is mapped explicitly.
const MAP: Record<string, string> = {
  // Alif / vowels
  "ا": "a", "آ": "aa", "أ": "a", "إ": "i", "ٱ": "a",
  "ء": "a", "ئ": "i", "ؤ": "o",
  "و": "o", "ۆ": "o", "ۇ": "u",
  "ی": "i", "ي": "i", "ى": "i", "ے": "e", "ۓ": "e", "ې": "e",

  // Consonants
  "ب": "b", "پ": "p", "ت": "t", "ٹ": "t", "ة": "t", "ث": "s",
  "ج": "j", "چ": "ch", "ح": "h", "خ": "kh",
  "د": "d", "ڈ": "d", "ذ": "z",
  "ر": "r", "ڑ": "r", "ز": "z", "ژ": "zh",
  "س": "s", "ش": "sh", "ص": "s", "ض": "z", "ط": "t", "ظ": "z",
  "ع": "a", "غ": "gh", "ف": "f", "ق": "q",
  "ک": "k", "ك": "k", "ګ": "g", "گ": "g",
  "ل": "l", "م": "m", "ن": "n", "ں": "n", "ڻ": "n",
  "ہ": "h", "ه": "h", "ھ": "h", "ۃ": "h", "ۂ": "h", "ۀ": "h",

  // Diacritics
  "\u064E": "a", "\u0650": "i", "\u064F": "u",
  "\u064B": "an", "\u064D": "in", "\u064C": "un",
  "\u0670": "a", "\u0651": "", "\u0652": "", "\u0653": "",
  "\u0654": "", "\u0655": "", "\u0656": "", "\u0657": "",
  "\u0658": "", "\u065F": "", "\u0640": "", // tatweel

  // Invisible joiners / marks
  "\u200C": "", "\u200D": "", "\u200E": "", "\u200F": "",
  "\u202A": "", "\u202B": "", "\u202C": "", "\uFEFF": "",

  // Punctuation → space (word separators)
  "،": " ", "؛": " ", "؟": " ", "۔": " ", "٪": " ", "٫": ".", "٬": " ",

  // Arabic-Indic and Extended Arabic-Indic digits
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};

export function romanize(input: string): string {
  // NFKC folds presentation forms (ﻻ, ﷲ, ﺑ, etc.) into base letters
  const text = (input ?? "").normalize("NFKC");
  let out = "";

  for (const ch of text) {
    if (MAP[ch] !== undefined) {
      out += MAP[ch];
    } else if (/[\x00-\x7F]/.test(ch)) {
      out += ch; // English / ASCII stays as-is
    } else if (/\p{L}/u.test(ch)) {
      // Any other letter (accented Latin, unknown script...) is never dropped:
      // try stripping accents first, else fall back to its codepoint.
      const plain = ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      out += /^[\x00-\x7F]+$/.test(plain)
        ? plain
        : `u${ch.codePointAt(0)!.toString(16)}`;
    } else if (/\p{N}/u.test(ch)) {
      out += ch.normalize("NFKD").replace(/[^0-9]/g, "");
    } else {
      out += " "; // symbols/punctuation act as separators
    }
  }
  return out;
}

export function makeSlug(input: string, maxLength = 80): string {
  const slug = romanize(input)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (slug.length <= maxLength) return slug;

  // Cut at a word boundary instead of mid-word
  const cut = slug.slice(0, maxLength);
  const lastDash = cut.lastIndexOf("-");
  return (lastDash > 20 ? cut.slice(0, lastDash) : cut).replace(/-$/, "");
}