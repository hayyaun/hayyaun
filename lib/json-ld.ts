/** Keep serialized data inside its script element, even when strings contain HTML. */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
