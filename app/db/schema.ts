export interface Reservation {
  id: string;
  productId: string;
  cartId: string;
  shopDomain: string;
  reservedAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

// In-memory storage for reservations (for demo purposes)
// In production, use a proper database like PostgreSQL
export class ReservationStore {
  private static reservations: Map<string, Reservation> = new Map();

  static create(reservation: Omit<Reservation, 'id'>): Reservation {
    const id = `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newReservation: Reservation = {
      id,
      ...reservation,
    };
    this.reservations.set(id, newReservation);
    return newReservation;
  }

  static findByProductId(productId: string, shopDomain: string): Reservation | undefined {
    for (const reservation of this.reservations.values()) {
      if (reservation.productId === productId && 
          reservation.shopDomain === shopDomain && 
          reservation.isActive) {
        return reservation;
      }
    }
    return undefined;
  }

  static findByCartId(cartId: string, shopDomain: string): Reservation[] {
    const results: Reservation[] = [];
    for (const reservation of this.reservations.values()) {
      if (reservation.cartId === cartId && 
          reservation.shopDomain === shopDomain && 
          reservation.isActive) {
        results.push(reservation);
      }
    }
    return results;
  }

  static update(id: string, updates: Partial<Reservation>): Reservation | null {
    const reservation = this.reservations.get(id);
    if (reservation) {
      const updated = { ...reservation, ...updates };
      this.reservations.set(id, updated);
      return updated;
    }
    return null;
  }

  static delete(id: string): boolean {
    return this.reservations.delete(id);
  }

  static getExpired(): Reservation[] {
    const now = new Date();
    const expired: Reservation[] = [];
    for (const reservation of this.reservations.values()) {
      if (reservation.isActive && reservation.expiresAt <= now) {
        expired.push(reservation);
      }
    }
    return expired;
  }

  static getAllActive(): Reservation[] {
    return Array.from(this.reservations.values()).filter(r => r.isActive);
  }
}