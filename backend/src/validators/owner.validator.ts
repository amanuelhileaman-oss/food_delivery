import { z } from 'zod';

export const restaurantApplicationSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    email: z.string().email("Invalid email"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    address: z.string().min(5, "Address must be at least 5 characters"),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    imageLogo: z.string().url("Invalid image URL"),
    openingTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid opening time format (HH:MM)"),
    closingTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid closing time format (HH:MM)")
  })
});

export const documentSchema = z.object({
  body: z.object({
    type: z.enum(['BUSINESS_LICENSE', 'FOOD_SAFETY_CERTIFICATE', 'TAX_ID']),
    url: z.string().url("Invalid document URL")
  })
});
