import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/db';
import { hashPassword, comparePassword } from '../utils/hash.util';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../utils/jwt.util';
import { ApiError } from '../utils/ApiError';
import { AuditService } from './audit.service';

export class AuthService {
  static async registerCustomer(data: any) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ApiError(400, 'Email already in use');

    const customerRole = await prisma.role.findUnique({ where: { name: 'CUSTOMER' } });
    if (!customerRole) throw new ApiError(500, 'System role missing');

    const hashedPassword = await hashPassword(data.password);
    
    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        password: hashedPassword,
        roleId: customerRole.id,
        isVerified: false,
      }
    });

    const token = await this.createVerificationToken(user.id);
    await AuditService.log('REGISTER_CUSTOMER', 'USER', user.id, user.id, { email: user.email });
    return { user: this.sanitizeUser(user), verificationToken: token };
  }

  static async registerRestaurantOwner(data: any) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ApiError(400, 'Email already in use');

    const ownerRole = await prisma.role.findUnique({ where: { name: 'RESTAURANT_OWNER' } });
    if (!ownerRole) throw new ApiError(500, 'System role missing');

    const hashedPassword = await hashPassword(data.password);
    
    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        password: hashedPassword,
        roleId: ownerRole.id,
        isVerified: false,
        restaurants: {
          create: {
            name: data.restaurantName,
            description: data.restaurantDescription,
            status: 'PENDING'
          }
        }
      }
    });

    const token = await this.createVerificationToken(user.id);
    await AuditService.log('REGISTER_RESTAURANT_OWNER', 'USER', user.id, user.id, { email: user.email });
    return { user: this.sanitizeUser(user), verificationToken: token };
  }

  static async registerDriver(data: any) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ApiError(400, 'Email already in use');

    const driverRole = await prisma.role.findUnique({ where: { name: 'DRIVER' } });
    if (!driverRole) throw new ApiError(500, 'System role missing');

    const hashedPassword = await hashPassword(data.password);
    
    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        password: hashedPassword,
        roleId: driverRole.id,
        isVerified: false,
        driverProfile: {
          create: {
            vehicleType: data.vehicleType,
            plateNumber: data.plateNumber,
            status: 'PENDING'
          }
        }
      }
    });

    const token = await this.createVerificationToken(user.id);
    await AuditService.log('REGISTER_DRIVER', 'USER', user.id, user.id, { email: user.email });
    return { user: this.sanitizeUser(user), verificationToken: token };
  }

  static async login(data: any) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { role: true }
    });

    if (!user || user.accountStatus !== 'ACTIVE') {
      throw new ApiError(401, 'Invalid credentials or account inactive');
    }

    const isValid = await comparePassword(data.password, user.password);
    if (!isValid) throw new ApiError(401, 'Invalid credentials');

    const payload = { userId: user.id, role: user.role.name };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await AuditService.log('LOGIN', 'USER', user.id, user.id, { role: user.role.name });

    return { user: this.sanitizeUser(user), accessToken, refreshToken };
  }

  static async refreshToken(token: string) {
    try {
      const decoded = verifyToken(token);
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { role: true }
      });

      if (!user || user.accountStatus !== 'ACTIVE') {
        throw new ApiError(401, 'Invalid or inactive user');
      }

      const payload = { userId: user.id, role: user.role.name };
      const newAccessToken = generateAccessToken(payload);
      const newRefreshToken = generateRefreshToken(payload); // Optional: rotate refresh token
      
      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (error) {
      console.error('REFRESH TOKEN ERROR:', error);
      throw new ApiError(401, 'Invalid or expired refresh token');
    }
  }

  static async verifyEmail(token: string) {
    const record = await prisma.verificationToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!record || record.type !== 'EMAIL_VERIFICATION' || record.expiresAt < new Date()) {
      throw new ApiError(400, 'Invalid or expired token');
    }

    await prisma.user.update({
      where: { id: record.userId },
      data: { isVerified: true }
    });

    await prisma.verificationToken.delete({ where: { id: record.id } });
    await AuditService.log('VERIFY_EMAIL', 'USER', record.userId, record.userId);
  }

  static async resendVerification(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.accountStatus !== 'ACTIVE') {
      return { message: 'If an account exists, a verification link has been sent.' };
    }

    if (user.isVerified) {
      return { message: 'Account is already verified.' };
    }

    await prisma.verificationToken.deleteMany({
      where: { userId: user.id, type: 'EMAIL_VERIFICATION' }
    });

    const token = await this.createVerificationToken(user.id);
    await AuditService.log('RESEND_VERIFICATION', 'USER', user.id, user.id);
    return { message: 'Verification link resent', verificationToken: token };
  }

  private static async createVerificationToken(userId: string) {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

    await prisma.verificationToken.create({
      data: {
        userId,
        token,
        type: 'EMAIL_VERIFICATION',
        expiresAt
      }
    });

    return token;
  }

  static async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.accountStatus !== 'ACTIVE') {
      // In a real application, we wouldn't want to leak whether the email exists.
      // We would just return { message: 'If an account exists, a reset link has been sent.' }
      // But for testing purposes, we'll return a token if user exists.
      return { message: 'If an account exists, a reset link has been sent.' };
    }

    // Invalidate previous reset tokens for this user
    await prisma.verificationToken.deleteMany({
      where: { userId: user.id, type: 'PASSWORD_RESET' }
    });

    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry for password reset

    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        token,
        type: 'PASSWORD_RESET',
        expiresAt
      }
    });

    return { message: 'Password reset link generated', resetToken: token };
  }

  static async resetPassword(token: string, newPassword: string) {
    const record = await prisma.verificationToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!record || record.type !== 'PASSWORD_RESET' || record.expiresAt < new Date()) {
      throw new ApiError(400, 'Invalid or expired password reset token');
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: record.userId },
      data: { password: hashedPassword }
    });

    await prisma.verificationToken.delete({ where: { id: record.id } });
    await AuditService.log('RESET_PASSWORD', 'USER', record.userId, record.userId);
    // Also delete any refresh tokens or other active sessions if we had a session model
  }

  private static sanitizeUser(user: any) {
    const { password, ...safeUser } = user;
    return safeUser;
  }
}
