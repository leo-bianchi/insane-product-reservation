import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
// import { cors } from "remix-utils/cors"; // REMOVED
import { addCorsHeaders, handleCorsPreflight } from "../utils/cors"; // ADDED
import { ReservationService } from "../services/reservationService";

export async function loader({ request }: LoaderFunctionArgs) {
  // Handle preflight requests using the utility function
  const preflightResponse = handleCorsPreflight(request);
  if (preflightResponse) {
    return preflightResponse;
  }

  const url = new URL(request.url);
  const cartId = url.searchParams.get("cartId");
  const shop = url.searchParams.get("shop");

  if (!cartId || !shop) {
    // Add headers to the response directly
    return addCorsHeaders(
      json({ error: "Missing parameters" }, { 
        status: 400
      })
    );
  }

  try {
    const reservations = await ReservationService.getCartReservations(cartId, shop);
    
    // Create the response object
    const response = json({
      success: true,
      reservations: reservations.map(r => ({
        productId: r.productId,
        expiresAt: r.expiresAt.toISOString(),
        isActive: r.isActive
      }))
    });

    // Add CORS headers before returning the response
    return addCorsHeaders(response);
  } catch (error) {
    console.error("Error fetching storefront reservations:", error);
    return addCorsHeaders(
      json({ error: "Internal server error" }, { 
        status: 500
      })
    );
  }
}

export async function action({ request }: ActionFunctionArgs) {
  // Handle preflight requests using the utility function
  const preflightResponse = handleCorsPreflight(request);
  if (preflightResponse) {
    return preflightResponse;
  }

  try {
    const body = await request.json();
    const { action, productId, cartId, shop } = body;

    if (!productId || !cartId || !shop) {
      return addCorsHeaders(
        json({ error: "Missing required parameters" }, { 
          status: 400
        })
      );
    }

    const adminInstances = global.adminInstances as Map<string, any>;
    const admin = adminInstances?.get(shop);

    if (!admin) {
      return addCorsHeaders(
        json({ error: "Shop not authenticated" }, { 
          status: 401
        })
      );
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
        return addCorsHeaders(
          json({ error: "Invalid action" }, { 
            status: 400
          })
        );
    }

    const response = result.success 
      ? json({ 
          success: true, 
          message: result.message,
          expiresAt: 'expiresAt' in result ? result.expiresAt?.toISOString() : undefined
        })
      : json({ error: result.message }, { status: 400 });

    return addCorsHeaders(response);

  } catch (error) {
    console.error("Storefront API error:", error);
    return addCorsHeaders(
      json({ error: "Internal server error" }, { 
        status: 500
      })
    );
  }
}