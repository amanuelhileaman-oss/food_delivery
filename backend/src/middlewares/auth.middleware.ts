import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util';
import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    let token;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      throw new ApiError(401, 'Authentication token missing');
    }

    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { role: true },
    });

    if (!user || user.accountStatus !== 'ACTIVE') {
      throw new ApiError(401, 'User no longer exists or inactive');
    }

    const { passwordHash, ...safeUser } = user;
    req.user = safeUser;
    next();
  } catch (error) {
    next(new ApiError(401, 'Invalid or expired token'));
  }
};

export const authorizeRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role.name)) {
      return next(new ApiError(403, 'Forbidden: Insufficient permissions'));
    }
    next();
  };
};

export const authorizeResourceOwnership = (resourceType: string, idParam: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resourceId = req.params[idParam] || req.body[idParam] || req.query[idParam];
      const userId = req.user.id;
      const userRole = req.user.role.name;
      
      // Admin bypasses ownership
      if (userRole === 'ADMIN') {
        return next();
      }

      if (!resourceId) {
        return next(new ApiError(400, `Missing resource identifier: ${idParam}`));
      }

      let isOwner = false;

      switch (resourceType) {
        case 'user':
          isOwner = resourceId === userId;
          break;
        case 'restaurant':
          const restaurant = await prisma.restaurant.findUnique({ where: { id: resourceId } });
          if (!restaurant) return next(new ApiError(404, 'Restaurant not found'));
          isOwner = restaurant.ownerId === userId;
          break;
        case 'order':
          const order = await prisma.order.findUnique({ where: { id: resourceId }, include: { restaurant: true, driver: true } });
          if (!order) return next(new ApiError(404, 'Order not found'));
          if (userRole === 'CUSTOMER') isOwner = order.customerId === userId;
          if (userRole === 'RESTAURANT_OWNER') isOwner = order.restaurant.ownerId === userId;
          if (userRole === 'DRIVER') isOwner = order.driver?.userId === userId;
          break;
        case 'address':
          const address = await prisma.address.findUnique({ where: { id: resourceId } });
          if (!address) return next(new ApiError(404, 'Address not found'));
          isOwner = address.userId === userId;
          break;
        case 'cart':
          const cart = await prisma.cart.findUnique({ where: { id: resourceId } });
          if (!cart) return next(new ApiError(404, 'Cart not found'));
          isOwner = cart.userId === userId;
          break;
        case 'favorite':
          const favorite = await prisma.favorite.findUnique({ where: { id: resourceId } });
          if (!favorite) return next(new ApiError(404, 'Favorite not found'));
          isOwner = favorite.userId === userId;
          break;
        case 'review':
          const review = await prisma.review.findUnique({ where: { id: resourceId } });
          if (!review) return next(new ApiError(404, 'Review not found'));
          isOwner = review.customerId === userId;
          break;
        case 'supportTicket':
          const ticket = await prisma.supportTicket.findUnique({ where: { id: resourceId } });
          if (!ticket) return next(new ApiError(404, 'Support ticket not found'));
          isOwner = ticket.userId === userId;
          break;
        case 'driverProfile':
          const driver = await prisma.driver.findUnique({ where: { id: resourceId } });
          if (!driver) return next(new ApiError(404, 'Driver profile not found'));
          isOwner = driver.userId === userId;
          break;
        default:
          return next(new ApiError(500, 'Invalid resource type for authorization'));
      }

      if (!isOwner) {
        return next(new ApiError(403, 'Forbidden: You do not own this resource'));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
