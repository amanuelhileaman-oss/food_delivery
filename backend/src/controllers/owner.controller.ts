import { Request, Response, NextFunction } from 'express';
import { OwnerService } from '../services/owner.service';

export class OwnerController {
  static async getMyRestaurant(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurant = await OwnerService.getMyRestaurant(req.user!.id);
      res.json({ success: true, data: restaurant });
    } catch (error) {
      next(error);
    }
  }

  static async submitApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updated = await OwnerService.submitApplication(req.user!.id, id, req.body);
      res.json({ success: true, data: updated, message: 'Application submitted successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async uploadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const document = await OwnerService.uploadDocument(req.user!.id, id, req.body);
      res.status(201).json({ success: true, data: document });
    } catch (error) {
      next(error);
    }
  }

  static async getDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const documents = await OwnerService.getDocuments(req.user!.id, id);
      res.json({ success: true, data: documents });
    } catch (error) {
      next(error);
    }
  }

  static async deleteDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, docId } = req.params;
      await OwnerService.deleteDocument(req.user!.id, id, docId);
      res.json({ success: true, message: 'Document deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
  static async updateOperatingStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { isOpen } = req.body;
      const result = await OwnerService.updateOperatingStatus(req.user!.id, id, isOpen);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
