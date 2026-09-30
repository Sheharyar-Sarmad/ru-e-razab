// lib/slugify.ts

/* ---------- Common words (keys: no diacritics, Urdu letter forms ہ ی ک) ---------- */
const DICT: Record<string, string> = {
  // function words
  "ہے": "hai", "ہیں": "hain", "تھا": "tha", "تھی": "thi", "تھے": "the",
  "ہو": "ho", "ہوں": "hoon", "ہوا": "hua", "ہوئی": "hui", "ہوئے": "hue",
  "کا": "ka", "کی": "ki", "کے": "ke", "کو": "ko", "سے": "se", "میں": "mein",
  "پر": "par", "پہ": "pe", "نے": "ne", "اور": "aur", "یہ": "ye", "وہ": "woh",
  "جو": "jo", "کہ": "ke", "کیا": "kya", "کہاں": "kahan", "کہیں": "kahin",
  "نہیں": "nahin", "نہ": "na", "بھی": "bhi", "بھر": "bhar", "تو": "to",
  "ہی": "hi", "ہم": "hum", "تم": "tum", "آپ": "aap", "مجھے": "mujhe",
  "تجھے": "tujhe", "تمہیں": "tumhein", "ہمیں": "humein", "مجھ": "mujh",
  "اس": "is", "اُس": "us", "ان": "in", "ہر": "har", "سب": "sab", "کوئی": "koi",
  "ایک": "ek", "دو": "do", "بس": "bas", "ہاں": "haan", "جب": "jab", "تب": "tab",
  "کب": "kab", "اب": "ab", "ابھی": "abhi", "کبھی": "kabhi", "پھر": "phir",
  "کیوں": "kyun", "کیسے": "kaise", "ایسے": "aise", "جیسے": "jaise",
  "کر": "kar", "کرو": "karo", "کرنا": "karna", "گیا": "gaya", "گئی": "gayi",
  "دیا": "diya", "لیے": "liye", "لئے": "liye", "ساتھ": "saath", "بات": "baat",
  "رہا": "raha", "رہی": "rahi", "رہے": "rahe", "آیا": "aaya", "آئی": "aayi",
  "آئے": "aaye", "ملا": "mila", "پڑا": "pada",
  "میرا": "mera", "میری": "meri", "میرے": "mere", "تیرا": "tera",
  "تیری": "teri", "تیرے": "tere", "اپنا": "apna", "اپنی": "apni", "اپنے": "apne",
  "ہمارا": "hamara", "ہماری": "hamari", "تمہارا": "tumhara",
  // poetry vocabulary
  "دل": "dil", "عشق": "ishq", "محبت": "mohabbat", "غزل": "ghazal",
  "شعر": "sher", "شعور": "shaoor", "عقل": "aql", "خمار": "khumar",
  "مے": "may", "تاہم": "taham", "رغبت": "raghbat", "غیر": "ghair",
  "جائے": "jaye", "عذر": "uzr", "مست": "mast", "چشم": "chashm",
  "گل": "gul", "بھول": "bhool", "ابتدا": "ibteda", "فضا": "fiza",
  "سازگار": "saazgar", "مائدہ": "maida", "نظم": "nazm", "قطعہ": "qata",
  "رات": "raat", "دن": "din", "آج": "aaj", "کل": "kal", "یاد": "yaad",
  "خواب": "khwab", "آنکھ": "aankh", "آنکھیں": "aankhein", "چاند": "chand",
  "وقت": "waqt", "دنیا": "duniya", "درد": "dard", "غم": "gham",
  "خوشی": "khushi", "زندگی": "zindagi", "وفا": "wafa", "جفا": "jafa",
  "حسن": "husn", "نظر": "nazar", "صبح": "subah", "شام": "shaam",
  "ساقی": "saqi", "شراب": "sharab", "جام": "jaam", "محفل": "mehfil",
  "بہار": "bahaar", "پھول": "phool", "گلاب": "gulab", "خدا": "khuda",
  "اللہ": "allah", "دوست": "dost", "یار": "yaar", "دشمن": "dushman",
  "ہجر": "hijr", "وصال": "visaal", "انتظار": "intezaar", "تنہائی": "tanhai",
  "آنسو": "aansu", "موت": "maut", "جان": "jaan", "ہوش": "hosh",
  "شب": "shab", "سحر": "sehar", "چراغ": "charagh", "ستارے": "sitare",
};

/* ---------- Letters ---------- */
const CONS: Record<string, string> = {
  "ب": "b", "پ": "p", "ت": "t", "ٹ": "t", "ث": "s", "ج": "j", "چ": "ch",
  "ح": "h", "خ": "kh", "د": "d", "ڈ": "d", "ذ": "z", "ر": "r", "ڑ": "r",
  "ز": "z", "ژ": "zh", "س": "s", "ش": "sh", "ص": "s", "ض": "z", "ط": "t",
  "ظ": "z", "غ": "gh", "ف": "f", "ق": "q", "ک": "k", "گ": "g", "ل": "l",
  "م": "m", "ن": "n", "ڻ": "n", "ګ": "g",
};

const DIAC: Record<string, string> = {
  "\u064E": "a", "\u0650": "i", "\u064F": "u", "\u0670": "a",
};

const DIGITS: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};

// Arabic/Persian letter variants → the Urdu letter used above
const VARIANTS: Record<string, string> = {
  "ي": "ی", "ى": "ی", "ك": "ک", "ه": "ہ", "ة": "ہ", "ۃ": "ہ", "ۂ": "ہ",
  "ۀ": "ہ", "ۓ": "ے", "ٱ": "ا", "أ": "ا", "إ": "ا",
};

const STRIP_MARKS = /[\u064B-\u065F\u0670\u0640]/g;
const INVISIBLE = /[\u200B-\u200F\u202A-\u202E\uFEFF]/g;
const SEPARATORS =
  /[\s\u060C\u061B\u061F\u06D4\u066A\u066C\u2026\u2014\u2013,;:!?.\-"()\[\]{}<>\/\\|_]+/;

function normalize(input: string): string {
  return (input ?? "")
    .normalize("NFKC")
    .replace(INVISIBLE, "")
    .replace(/['’‘]/g, "")
    .replace(/[يىكهةۃۂۀۓٱأإ]/g, (c) => VARIANTS[c] ?? c);
}

/* ---------- One word ---------- */
function romanizeWord(raw: string): string {
  let word = raw;

  // Trailing zer = izafat ("shaoor-e-ishq")
  let izafat = false;
  if (word.endsWith("\u0650")) {
    izafat = true;
    word = word.slice(0, -1);
  }
  const suffix = izafat ? "-e" : "";

  const key = word.replace(STRIP_MARKS, "");
  if (DICT[key]) return DICT[key] + suffix;

  const w = Array.from(word);
  const out: string[] = [];
  let last: "S" | "C" | "V" = "S"; // start / consonant / vowel
  let lastC = "";
  let skipInsert = false;

  const pushV = (s: string) => { out.push(s); last = "V"; };
  const pushC = (s: string) => {
    if (last === "C" && !skipInsert) out.push("a"); // break consonant clusters
    skipInsert = false;
    out.push(s);
    last = "C";
    lastC = s;
  };

  for (let i = 0; i < w.length; i++) {
    const ch = w[i];
    const next = w[i + 1];

    if (DIAC[ch] !== undefined) { pushV(DIAC[ch]); continue; }
    if (ch === "\u0651") { if (last === "C") out.push(lastC); continue; } // shadda
    if (/[\u064B-\u065F\u0640]/.test(ch)) continue; // jazm, tanween, tatweel...

    if (CONS[ch] !== undefined) {
      pushC(CONS[ch]);
      if (next && DIAC[next] !== undefined) { pushV(DIAC[next]); i++; }
      continue;
    }

    switch (ch) {
      case "ھ": // do-chashmi: bh, ph, kh, th, jh, gh, dh...
        if (last === "C") { out[out.length - 1] += "h"; lastC += "h"; }
        else pushC("h");
        break;

      case "ہ":
        if (i === w.length - 1 && last === "C") pushV("a"); // مائدہ → maida
        else {
          const afterVowel = last === "V";
          pushC("h");
          if (afterVowel) skipInsert = true; // تاہم → taham
        }
        break;

      case "ا":
      case "ع":
        if (next && DIAC[next] !== undefined) { pushV(DIAC[next]); i++; }
        else pushV("a");
        break;

      case "آ": pushV("aa"); break;
      case "و": last === "S" ? pushC("w") : pushV("o"); break;
      case "ی": last === "V" || last === "S" ? pushC("y") : pushV("i"); break;
      case "ئ": pushV("i"); break;
      case "ؤ": pushV("o"); break;
      case "ے": pushV("e"); break;
      case "ء": break;
      case "ں": out.push("n"); last = "V"; break;

      default:
        if (DIGITS[ch] !== undefined) { out.push(DIGITS[ch]); last = "V"; }
        else if (/[\x00-\x7F]/.test(ch)) { out.push(ch); last = "V"; } // English
        else if (/\p{L}/u.test(ch)) {
          // Never drop an unknown letter: strip accents, else use its codepoint
          const plain = ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          out.push(/^[\x00-\x7F]+$/.test(plain) ? plain : `u${ch.codePointAt(0)!.toString(16)}`);
          last = "V";
        } else if (/\p{N}/u.test(ch)) {
          out.push(ch.normalize("NFKD").replace(/[^0-9]/g, ""));
          last = "V";
        }
    }
  }

  return out.join("") + suffix;
}

/* ---------- Public API ---------- */
export function romanize(input: string): string {
  return normalize(input)
    .split(SEPARATORS)
    .filter(Boolean)
    .map(romanizeWord)
    .join(" ");
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

  const cut = slug.slice(0, maxLength);
  const lastDash = cut.lastIndexOf("-");
  return (lastDash > 20 ? cut.slice(0, lastDash) : cut).replace(/-$/, "");
}