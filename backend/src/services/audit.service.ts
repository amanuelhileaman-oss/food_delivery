import prisma from '../config/db';

export class AuditService {
  static async log(
    action: string,
    resourceType: string,
    resourceId: string,
    userId?: string,
    metadata?: any,
    ipAddress?: string
  ) {
    try {
      await prisma.auditLog.create({
        data: {
          action,
          resourceType,
          resourceId,
          userId,
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
          ipAddress
        }
      });
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }
}
