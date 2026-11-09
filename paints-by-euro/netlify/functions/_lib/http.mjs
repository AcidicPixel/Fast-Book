export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Wraps a handler: checks the method and turns thrown errors into JSON. */
export const handler = (method, fn) => async (req, context) => {
  if (req.method !== method) return json({ error: "Method not allowed" }, 405);
  try {
    return await fn(req, context);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    return json({ error: status >= 500 ? "Something went wrong. No money was taken. Please try again." : err.message }, status);
  }
};

export const siteUrl = () => (process.env.URL || "http://localhost:8888").replace(/\/$/, "");

export async function readJson(req) {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Invalid request.");
  }
}
