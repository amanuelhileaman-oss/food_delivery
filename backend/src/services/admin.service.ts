import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';
import { AuditService } from './audit.service';
import { RestaurantStatus } from '@prisma/client';

export class AdminService {
  static async getRestaurantsByStatus(status?: RestaurantStatus) {
    const where = status ? { status } : {};
    return prisma.restaurant.findMany({ 
      where, 
      include: { 
        owner: { select: { id: true, firstName: true, lastName: true, email: true } }
      } 
    });
  }

  static async reviewRestaurant(adminId: string, restaurantId: string, status: RestaurantStatus, reason?: string) {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) throw new ApiError(404, 'Restaurant not found');
    
    // Status transition validation
    if (status === 'APPROVED') {
      if (restaurant.status !== 'UNDER_REVIEW' && restaurant.status !== 'SUSPENDED') {
        throw new ApiError(400, 'Invalid status transition to APPROVED');
      }
    } else if (status === 'REJECTED') {
      if (restaurant.status !== 'UNDER_REVIEW') {
        throw new ApiError(400, 'Invalid status transition to REJECTED');
      }
    } else if (status === 'SUSPENDED') {
      if (restaurant.status !== 'APPROVED') {
        throw new ApiError(400, 'Invalid status transition to SUSPENDED');
      }
    } else {
      throw new ApiError(400, 'Invalid review status');
    }

    // Only approved restaurants can be active
    const isActive = status === 'APPROVED';

    const updated = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        status,
        isActive
      }
    });

    await AuditService.log('REVIEW_RESTAURANT', 'RESTAURANT', restaurantId, adminId, { status, reason });
    return updated;
  }
}
