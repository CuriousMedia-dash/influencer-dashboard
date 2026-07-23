/**
 * Supabase's client gives a generic "Edge Function returned a non-2xx
 * status code" message by default when a function call fails — it
 * doesn't automatically read the actual error text out of the response
 * body. This digs it out properly, so the real reason shows up instead
 * of that unhelpful generic line.
 */
export async function getFunctionErrorMessage(fnError, data) {
  if (data?.error) return data.error;
  if (fnError?.context) {
    try {
      const body = await fnError.context.json();
      if (body?.error) return body.error;
    } catch {
      // Response body wasn't JSON, or already consumed — fall through
      // to the generic message below.
    }
  }
  return fnError?.message || "Something went wrong.";
}
