import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { cors } from "remix-utils/cors";
import { ReservationService } from "../services/reservationService";

// CORS headers for cross-origin requests from the storefront
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Shopify-Shop-Domain",
};

export async function loader({ request }: LoaderFunctionArgs) {
  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(request.url);
  const cartId = url.searchParams.get("cartId");
  const shop = url.searchParams.get("shop");

  if (!cartId || !shop) {
    return json({ error: "Missing parameters" }, { 
      status: 400, 
      headers: corsHeaders 
    });
  }

  try {
    const reservations = await ReservationService.getCartReservations(cartId, shop);
    
    const response = json({
      success: true,
      reservations: reservations.map(r => ({
        productId: r.productId,
        expiresAt: r.expiresAt.toISOString(),
        isActive: r.isActive
      }))
    });

    return cors(request, response);
  } catch (error) {
    console.error("Error fetching storefront reservations:", error);
    return json({ error: "Internal server error" }, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const { action, productId, cartId, shop } = body;

    if (!productId || !cartId || !shop) {
      return json({ error: "Missing required parameters" }, { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // For storefront API, we need a way to get admin access
    // This is a simplified approach - in production, you'd want proper authentication
    const adminInstances = global.adminInstances as Map<string, any>;
    const admin = adminInstances?.get(shop);

    if (!admin) {
      return json({ error: "Shop not authenticated" }, { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    let result;

    switch (action) {
      case "reserve":
        result = await ReservationService.reserveProduct(
          admin,
          productId,
          cartId,
          shop
        );
        break;

      case "release":
        result = await ReservationService.releaseProductReservation(
          admin,
          productId,
          cartId,
          shop
        );
        break;

      case "finalize":
        result = await ReservationService.finalizeCartReservations(
          admin,
          cartId,
          shop
        );
        break;

      default:
        return json({ error: "Invalid action" }, { 
          status: 400, 
          headers: corsHeaders 
        });
    }

    const response = result.success 
      ? json({ 
          success: true, 
          message: result.message,
          expiresAt: 'expiresAt' in result ? result.expiresAt?.toISOString() : undefined
        })
      : json({ error: result.message }, { status: 400 });

    return cors(request, response);

  } catch (error) {
    console.error("Storefront API error:", error);
    return json({ error: "Internal server error" }, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}