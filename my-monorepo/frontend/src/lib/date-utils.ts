/**
 * Robust date and time utilities for TravelLust.
 * These helpers extract "local" date/time parts directly from strings 
 * to prevent timezone-shifting bugs (e.g., UTC vs UTC+8).
 */

/**
 * Extracts the date (YYYY-MM-DD) and time (HH:mm) parts directly from a string.
 * This ignores any timezone offset (+08:00, Z) to keep the "wall clock" time.
 */
export function parseLocalParts(dateTimeStr: string | undefined): { date: string; time: string } {
  if (!dateTimeStr) {
    return { date: "", time: "" };
  }

  // 1. Try regex extraction for YYYY-MM-DD[T ]HH:mm
  // This is the most reliable way to get the "intended" time without shift.
  const match = dateTimeStr.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (match) {
    return { date: match[1], time: match[2] };
  }

  // 2. Try regex extraction for just YYYY-MM-DD
  const dateMatch = dateTimeStr.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    return { date: dateMatch[1], time: "00:00" };
  }

  // 3. Fallback to native parsing if regex fails
  const d = new Date(dateTimeStr);
  if (!isNaN(d.getTime())) {
    // If it's a valid date, we try to use toLocaleDateString with CA locale 
    // which gives YYYY-MM-DD often, but regex is safer.
    // For now, we'll just return what we can.
    return {
      date: dateTimeStr.split(/[T ]/)[0] || "",
      time: dateTimeStr.split(/[T ]/)[1]?.slice(0, 5) || "00:00"
    };
  }

  return { date: "", time: "" };
}

/**
 * Formats a date string (YYYY-MM-DD) into a human-readable "Wed, Apr 10" format.
 */
export function formatDisplayDate(dateStr: string | undefined): string {
  if (!dateStr) return "N/A";
  try {
    // To avoid shift when creating a Date from just YYYY-MM-DD, 
    // we append a "safe" time or use the parts.
    const parts = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!parts) return dateStr;

    const d = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Formats a date string into "Apr 10, 2024" format.
 */
export function formatFullDate(dateStr: string | undefined): string {
  if (!dateStr) return "N/A";
  try {
    const parts = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!parts) return dateStr;

    const d = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return dateStr;
  }
}

/**
 * Formats a datetime string into "April 10, 2024 at 10:30 AM" format.
 * No timezone conversion is performed; it uses the digits as-is.
 */
export function formatFullDateTime(dateTimeStr: string | undefined): string {
  if (!dateTimeStr) return "N/A";
  const { date, time } = parseLocalParts(dateTimeStr);
  if (!date) return dateTimeStr;

  const dateParts = date.split("-").map(Number);
  const timeParts = time.split(":").map(Number);
  
  const d = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1]);
  
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }) + " at " + d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}
