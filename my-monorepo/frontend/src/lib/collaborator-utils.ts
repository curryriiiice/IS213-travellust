/**
 * Utility functions for collaborator display.
 */

/**
 * Generate initials from a name (up to 2 characters).
 * E.g., "John Doe" -> "JD", "Alice" -> "AL"
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  // Single name: take first two characters
  return name.slice(0, 2).toUpperCase();
}

/**
 * Generate a consistent HSL color from a UUID string.
 * The hue is derived from the UUID so the same user always gets the same color.
 */
export function getColorFromUuid(uuid: string): string {
  // Simple hash from UUID characters
  const hash = uuid
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = hash % 360;
  return `hsl(${hue} 70% 50%)`;
}
