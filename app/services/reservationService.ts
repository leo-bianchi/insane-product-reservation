import { ReservationStore, type Reservation } from '../db/schema';
import { updateProductMetafields, getProductMetafields } from '../utils/graphql';

export class ReservationService {
  private static RESERVATION_DURATION_MS = 15 * 60 * 1000; // 15 minutes

  static async reserveProduct(
    admin: any,
    productId: string,
    cartId: string,
    shopDomain: string
  ): Promise<{ success: boolean; message: string; expiresAt?: Date }> {
    try {
      // Check if product is already reserved
      const existingReservation = ReservationStore.findByProductId(productId, shopDomain);
      
      if (existingReservation && existingReservation.cartId !== cartId) {
        // Check if reservation is still valid
        if (existingReservation.expiresAt > new Date()) {
          return {
            success: false,
            message: 'Product is already reserved by another customer'
          };
        } else {
          // Reservation expired, clean it up
          await this.releaseReservation(admin, existingReservation.id, shopDomain);
        }
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.RESERVATION_DURATION_MS);
      
      // Create or update reservation
      let reservation: Reservation;
      if (existingReservation && existingReservation.cartId === cartId) {
        // Extend existing reservation
        reservation = ReservationStore.update(existingReservation.id, {
          reservedAt: now,
          expiresAt,
          isActive: true
        })!;
      } else {
        // Create new reservation
        reservation = ReservationStore.create({
          productId,
          cartId,
          shopDomain,
          reservedAt: now,
          expiresAt,
          isActive: true
        });
      }

      // Update Shopify metafields
      const productGid = `gid://shopify/Product/${productId}`;
      await updateProductMetafields(admin, productGid, [
        {
          namespace: 'reservation',
          key: 'is_reserved',
          value: 'true',
          type: 'boolean'
        },
        {
          namespace: 'reservation',
          key: 'cart_id',
          value: cartId,
          type: 'single_line_text_field'
        },
        {
          namespace: 'reservation',
          key: 'reserved_until',
          value: expiresAt.toISOString(),
          type: 'single_line_text_field'
        }
      ]);

      return {
        success: true,
        message: 'Product reserved successfully',
        expiresAt
      };
    } catch (error) {
      console.error('Error reserving product:', error);
      return {
        success: false,
        message: 'Failed to reserve product'
      };
    }
  }

  static async releaseReservation(
    admin: any,
    reservationId: string,
    shopDomain: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const reservation = ReservationStore.update(reservationId, { isActive: false });
      
      if (!reservation) {
        return {
          success: false,
          message: 'Reservation not found'
        };
      }

      // Update Shopify metafields
      const productGid = `gid://shopify/Product/${reservation.productId}`;
      await updateProductMetafields(admin, productGid, [
        {
          namespace: 'reservation',
          key: 'is_reserved',
          value: 'false',
          type: 'boolean'
        },
        {
          namespace: 'reservation',
          key: 'cart_id',
          value: '',
          type: 'single_line_text_field'
        },
        {
          namespace: 'reservation',
          key: 'reserved_until',
          value: '',
          type: 'single_line_text_field'
        }
      ]);

      return {
        success: true,
        message: 'Reservation released successfully'
      };
    } catch (error) {
      console.error('Error releasing reservation:', error);
      return {
        success: false,
        message: 'Failed to release reservation'
      };
    }
  }

  static async releaseProductReservation(
    admin: any,
    productId: string,
    cartId: string,
    shopDomain: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const reservation = ReservationStore.findByProductId(productId, shopDomain);
      
      if (!reservation || reservation.cartId !== cartId) {
        return {
          success: false,
          message: 'No matching reservation found'
        };
      }

      return await this.releaseReservation(admin, reservation.id, shopDomain);
    } catch (error) {
      console.error('Error releasing product reservation:', error);
      return {
        success: false,
        message: 'Failed to release product reservation'
      };
    }
  }

  static async getCartReservations(cartId: string, shopDomain: string): Promise<Reservation[]> {
    return ReservationStore.findByCartId(cartId, shopDomain);
  }

  static async cleanupExpiredReservations(admin: any): Promise<number> {
    try {
      const expiredReservations = ReservationStore.getExpired();
      let cleanedCount = 0;

      for (const reservation of expiredReservations) {
        const result = await this.releaseReservation(admin, reservation.id, reservation.shopDomain);
        if (result.success) {
          cleanedCount++;
        }
      }

      console.log(`Cleaned up ${cleanedCount} expired reservations`);
      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up expired reservations:', error);
      return 0;
    }
  }

  static async finalizeCartReservations(
    admin: any,
    cartId: string,
    shopDomain: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const reservations = ReservationStore.findByCartId(cartId, shopDomain);
      
      for (const reservation of reservations) {
        // Mark as inactive but don't clear metafields (they stay reserved until order completion)
        ReservationStore.update(reservation.id, { isActive: false });
      }

      return {
        success: true,
        message: `Finalized ${reservations.length} reservations for checkout`
      };
    } catch (error) {
      console.error('Error finalizing cart reservations:', error);
      return {
        success: false,
        message: 'Failed to finalize reservations'
      };
    }
  }
}