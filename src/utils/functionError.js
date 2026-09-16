/**
 * An error coming back from a function isn't always a string. Resend,
 * for one, returns an object like { statusCode, name, message } — and
 * dropping that into a message gives "[object Object]", which tells
 * nobody anything. This always produces readable text.
 */
function asText(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (typeof value.message === "string") return value.message;
    if (typeof value.error === "string") return value.error;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export async function getFunctionErrorMessage(fnError, data) {
  if (data?.error) return asText(data.error);
  if (fnError?.context) {
    try {
      const body = await fnError.context.json();
      if (body?.error) return asText(body.error);
    } catch {
      // Response body wasn't JSON, or already consumed — fall through
      // to the generic message below.
    }
  }
  return asText(fnError?.message) || "Something went wrong.";
}
