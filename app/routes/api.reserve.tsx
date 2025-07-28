import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { ReservationService } from "../services/reservationService";

export async function action({ request }: ActionFunctionArgs) {
  const { admin, session } = await authenticate.public.appProxy(request);
  
  if (!admin || !session) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const action = formData.get("action") as string;
    const productId = formData.get("productId") as string;
    const cartId = formData.get("cartId") as string;
    const shopDomain = session.shop;

    if (!productId || !cartId) {
      return json({ error: "Missing required parameters" }, { status: 400 });
    }

    let result;

    switch (action) {
      case "reserve":
        result = await ReservationService.reserveProduct(
          admin,
          productId,
          cartId,
          shopDomain
        );
        break;

      case "release":
        result = await ReservationService.releaseProductReservation(
          admin,
          productId,
          cartId,
          shopDomain
        );
        break;

      case "finalize":
        result = await ReservationService.finalizeCartReservations(
          admin,
          cartId,
          shopDomain
        );
        break;

      default:
        return json({ error: "Invalid action" }, { status: 400 });
    }

    if (result.success) {
      return json({ 
        success: true, 
        message: result.message,
        expiresAt: 'expiresAt' in result ? result.expiresAt : undefined
      });
    } else {
      return json({ error: result.message }, { status: 400 });
    }

  } catch (error) {
    console.error("Reservation API error:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}

// Handle CORS for cross-origin requests from the storefront
export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const cartId = url.searchParams.get("cartId");
  const shopDomain = url.searchParams.get("shop");

  if (!cartId || !shopDomain) {
    return json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    const reservations = await ReservationService.getCartReservations(cartId, shopDomain);
    
    return json({
      reservations: reservations.map(r => ({
        productId: r.productId,
        expiresAt: r.expiresAt,
        isActive: r.isActive
      }))
    });
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}