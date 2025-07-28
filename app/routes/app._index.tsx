import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { ReservationStore } from "../db/schema";

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);

  // Store admin instance for cleanup service
  if (admin && session) {
    const adminInstances = global.adminInstances as Map<string, any>;
    adminInstances.set(session.shop, admin);
  }

  // Get current reservations for this shop
  const activeReservations = ReservationStore.getAllActive()
    .filter(r => r.shopDomain === session?.shop)
    .map(r => ({
      id: r.id,
      productId: r.productId,
      cartId: r.cartId,
      reservedAt: r.reservedAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
      timeLeft: Math.max(0, r.expiresAt.getTime() - Date.now())
    }));

  return json({
    shop: session?.shop,
    reservations: activeReservations
  });
}

export default function Index() {
  const { shop, reservations } = useLoaderData<typeof loader>();

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.4", padding: "2rem" }}>
      <h1>Product Reservation System</h1>
      <p>Shop: <strong>{shop}</strong></p>
      
      <div style={{ marginTop: "2rem" }}>
        <h2>Setup Instructions</h2>
        <div style={{ background: "#f8f9fa", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
          <h3>1. Add JavaScript to Your Theme</h3>
          <p>Copy the reservation system JavaScript code and add it as a new asset file in your theme:</p>
          <code style={{ background: "#e9ecef", padding: "0.25rem 0.5rem", borderRadius: "4px" }}>
            assets/reservation-system.js
          </code>
        </div>

        <div style={{ background: "#f8f9fa", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
          <h3>2. Include in Theme Templates</h3>
          <p>Add the following to your product page template and cart template:</p>
          <pre style={{ background: "#e9ecef", padding: "0.5rem", borderRadius: "4px", fontSize: "0.875rem" }}>
{`<!-- In product-form.liquid or product.liquid -->
{% include 'reservation-system' %}

<!-- Before closing </body> tag in theme.liquid -->
<script src="{{ 'reservation-system.js' | asset_url }}" defer></script>`}
          </pre>
        </div>

        <div style={{ background: "#f8f9fa", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
          <h3>3. Configure App URL</h3>
          <p>In your theme settings, add a new setting for the app URL:</p>
          <code style={{ background: "#e9ecef", padding: "0.25rem 0.5rem", borderRadius: "4px" }}>
            {window.location.origin}
          </code>
        </div>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <h2>Active Reservations ({reservations.length})</h2>
        {reservations.length === 0 ? (
          <p>No active reservations</p>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {reservations.map((reservation) => (
              <div key={reservation.id} style={{ 
                border: "1px solid #dee2e6", 
                borderRadius: "8px", 
                padding: "1rem",
                background: "white"
              }}>
                <p><strong>Product ID:</strong> {reservation.productId}</p>
                <p><strong>Cart ID:</strong> {reservation.cartId}</p>
                <p><strong>Reserved At:</strong> {new Date(reservation.reservedAt).toLocaleString()}</p>
                <p><strong>Expires At:</strong> {new Date(reservation.expiresAt).toLocaleString()}</p>
                <p><strong>Time Left:</strong> {Math.ceil(reservation.timeLeft / 60000)} minutes</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: "2rem", padding: "1rem", background: "#d4edda", borderRadius: "8px" }}>
        <h3>✅ System Status</h3>
        <p>Reservation system is active and monitoring for expired reservations.</p>
        <p>Cleanup runs every minute to release expired reservations.</p>
      </div>
    </div>
  );
}