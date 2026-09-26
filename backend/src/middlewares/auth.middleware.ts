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

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
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
