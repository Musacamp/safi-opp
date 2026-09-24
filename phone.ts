/**
 * Normalize a phone number to a canonical form for duplicate checking.
 * Handles Ugandan numbers (+256 / 0 prefix) and international formats.
 * Returns digits-only string with country code, no leading +.
 */
export function normalizePhone(input: string): string {
  if (!input) return "";
  let cleaned = input.replace(/[^\d+]/g, "").replace(/^\+/, "");

  // Ugandan local format: 07XXXXXXXX or 07X XXX XXXX → 2567XXXXXXXX
  if (cleaned.startsWith("0") && cleaned.length >= 10) {
    cleaned = "256" + cleaned.slice(1);
  }
  // Already has 256 prefix without +
  if (cleaned.startsWith("256")) {
    return cleaned;
  }
  // If it starts with another country code, keep as-is
  return cleaned;
}

/**
 * Format a phone number for display.
 */
export function formatPhone(phone: string): string {
  if (!phone) return "";
  if (phone.startsWith("256")) {
    const rest = phone.slice(3);
    return "+256 " + rest;
  }
  if (phone.startsWith("0")) {
    return phone;
  }
  return "+" + phone;
}

/**
 * Validate a phone number — at least 9 digits after normalization.
 */
export function isValidPhone(input: string): boolean {
  const normalized = normalizePhone(input);
  return normalized.length >= 9;
}
