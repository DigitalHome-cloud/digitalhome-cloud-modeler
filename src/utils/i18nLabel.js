/**
 * Resolves a trilingual `{ en, de, fr }` label produced by the v2 generators
 * down to a single string for the current UI language. Falls back to English,
 * then to the first defined language, then to the empty string.
 */
export function pickLabel(label, language) {
  if (!label) return "";
  if (typeof label === "string") return label;
  if (language && label[language]) return label[language];
  if (label.en) return label.en;
  const first = Object.values(label).find(Boolean);
  return first || "";
}
