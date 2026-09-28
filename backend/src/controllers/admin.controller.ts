import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service';
import { RestaurantStatus } from '@prisma/client';

export class AdminController {
  static async getRestaurants(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as RestaurantStatus | undefined;
      const restaurants = await AdminService.getRestaurantsByStatus(status);
      res.json({ success: true, data: restaurants });
    } catch (error) {
      next(error);
    }
  }

  static async reviewRestaurant(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      const updated = await AdminService.reviewRestaurant(req.user!.id, id, status, reason);
      res.json({ success: true, data: updated, message: `Restaurant ${status.toLowerCase()} successfully` });
    } catch (error) {
      next(error);
    }
  }
}
