import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
};

export class AuthController {
  static async registerCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.registerCustomer(req.body);
      res.status(201).json({
        message: 'Customer registered successfully',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async registerRestaurantOwner(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.registerRestaurantOwner(req.body);
      res.status(201).json({
        message: 'Restaurant owner registered successfully',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async registerDriver(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.registerDriver(req.body);
      res.status(201).json({
        message: 'Driver registered successfully',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, accessToken, refreshToken } = await AuthService.login(req.body);

      res.cookie('refreshToken', refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({
        message: 'Login successful',
        user,
        accessToken
      });
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.cookies;
      if (!refreshToken) {
        return res.status(401).json({ message: 'Refresh token not found' });
      }

      const { accessToken, refreshToken: newRefreshToken } = await AuthService.refreshToken(refreshToken);
      
      res.cookie('refreshToken', newRefreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json({ accessToken });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response) {
    res.clearCookie('refreshToken', COOKIE_OPTIONS);
    if (req.user) {
      const { AuditService } = require('../services/audit.service');
      await AuditService.log('LOGOUT', 'USER', req.user.id, req.user.id);
    }
    res.json({ message: 'Logout successful' });
  }

  static async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.query;
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: 'Token is required' });
      }
      
      await AuthService.verifyEmail(token);
      res.json({ message: 'Email verified successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async resendVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const result = await AuthService.resendVerification(email);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }
      
      const result = await AuthService.forgotPassword(email);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token and new password are required' });
      }

      await AuthService.resetPassword(token, newPassword);
      res.json({ message: 'Password reset successful' });
    } catch (error) {
      next(error);
    }
  }

  static async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      // req.user will be populated by auth.middleware
      res.json({ user: req.user });
    } catch (error) {
      next(error);
    }
  }
}
