import type { ScheduledTask } from 'node-cron';
import cron from 'node-cron';
import { ReservationService } from './reservationService';

export class CleanupService {
  private static isRunning = false;
  private static cronJob: ScheduledTask | null = null;

  static start(adminInstances: Map<string, any>) {
    if (this.isRunning) {
      console.log('Cleanup service is already running');
      return;
    }

    // Run cleanup every minute
    this.cronJob = cron.schedule('* * * * *', async () => {
      try {
        console.log('Running reservation cleanup...');
        
        let totalCleaned = 0;
        
        // Clean up for each shop that has an active admin instance
        for (const [shopDomain, admin] of adminInstances.entries()) {
          const cleaned = await ReservationService.cleanupExpiredReservations(admin);
          totalCleaned += cleaned;
        }

        if (totalCleaned > 0) {
          console.log(`Cleanup completed: ${totalCleaned} expired reservations cleaned`);
        }
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    });

    this.isRunning = true;
    console.log('Cleanup service started - running every minute');
  }

  static stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    console.log('Cleanup service stopped');
  }

  static isRunningService(): boolean {
    return this.isRunning;
  }

  // Manual cleanup trigger for testing
  static async runManualCleanup(admin: any): Promise<number> {
    try {
      return await ReservationService.cleanupExpiredReservations(admin);
    } catch (error) {
      console.error('Error in manual cleanup:', error);
      return 0;
    }
  }
}