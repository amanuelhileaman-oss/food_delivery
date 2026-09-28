import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';
import { AuditService } from './audit.service';

export class OwnerService {
  static async getMyRestaurant(ownerId: string) {
    const restaurant = await prisma.restaurant.findFirst({
      where: { ownerId }
    });
    if (!restaurant) throw new ApiError(404, 'Restaurant not found');
    return restaurant;
  }

  static async submitApplication(ownerId: string, restaurantId: string, data: any) {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) throw new ApiError(404, 'Restaurant not found');
    if (restaurant.ownerId !== ownerId) throw new ApiError(403, 'Forbidden');
    
    // Only allow submission if PENDING or REJECTED
    if (restaurant.status !== 'PENDING' && restaurant.status !== 'REJECTED') {
      throw new ApiError(400, 'Cannot submit application in current status');
    }

    // Verify required documents
    const documents = await prisma.restaurantDocument.findMany({
      where: { restaurantId }
    });

    const hasBusinessLicense = documents.some(doc => doc.type === 'BUSINESS_LICENSE');
    const hasFoodSafety = documents.some(doc => doc.type === 'FOOD_SAFETY_CERTIFICATE');

    if (!hasBusinessLicense || !hasFoodSafety) {
      throw new ApiError(400, 'Missing required documents: BUSINESS_LICENSE and FOOD_SAFETY_CERTIFICATE');
    }

    const updated = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        ...data,
        status: 'UNDER_REVIEW'
      }
    });

    await AuditService.log('SUBMIT_RESTAURANT_APPLICATION', 'RESTAURANT', restaurantId, ownerId);
    return updated;
  }

  static async uploadDocument(ownerId: string, restaurantId: string, data: { type: string; url: string }) {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) throw new ApiError(404, 'Restaurant not found');
    if (restaurant.ownerId !== ownerId) throw new ApiError(403, 'Forbidden');

    const document = await prisma.restaurantDocument.create({
      data: {
        restaurantId,
        type: data.type,
        url: data.url
      }
    });
    return document;
  }

  static async getDocuments(ownerId: string, restaurantId: string) {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) throw new ApiError(404, 'Restaurant not found');
    if (restaurant.ownerId !== ownerId) throw new ApiError(403, 'Forbidden');

    return prisma.restaurantDocument.findMany({ where: { restaurantId } });
  }

  static async deleteDocument(ownerId: string, restaurantId: string, docId: string) {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) throw new ApiError(404, 'Restaurant not found');
    if (restaurant.ownerId !== ownerId) throw new ApiError(403, 'Forbidden');

    const document = await prisma.restaurantDocument.findUnique({ where: { id: docId } });
    if (!document || document.restaurantId !== restaurantId) {
      throw new ApiError(404, 'Document not found');
    }

    await prisma.restaurantDocument.delete({ where: { id: docId } });
  }

  static async updateOperatingStatus(ownerId: string, restaurantId: string, isOpen: boolean) {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) throw new ApiError(404, 'Restaurant not found');
    if (restaurant.ownerId !== ownerId) throw new ApiError(403, 'Forbidden');
    if (restaurant.status !== 'APPROVED') {
      throw new ApiError(403, 'Restaurant must be APPROVED to operate');
    }

    // In a real app, this would toggle an isOpen flag on the restaurant.
    return { success: true, isOpen };
  }
}
