// app/utils/cors.ts

// The headers to be returned for all CORS responses
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Shopify-Shop-Domain",
};

/**
 * Handles a CORS preflight OPTIONS request.
 * @param request The incoming Request object.
 * @returns A Response object for the preflight request if the method is OPTIONS, otherwise undefined.
 */
export function handleCorsPreflight(request: Request): Response | undefined {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204, // Use 204 No Content for a successful preflight
      headers: corsHeaders,
    });
  }
}

/**
 * Adds CORS headers to a given Response object.
 * @param response The Response object to modify.
 * @returns The modified Response object with CORS headers.
 */
export function addCorsHeaders(response: Response): Response {
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}