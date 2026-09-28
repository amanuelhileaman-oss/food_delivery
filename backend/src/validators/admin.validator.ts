import { z } from 'zod';

export const reviewRestaurantSchema = z.object({
  body: z.object({
    status: z.enum(['APPROVED', 'REJECTED', 'SUSPENDED']),
    reason: z.string().optional()
  })
});
