import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number').optional(),
    email: z.string().email('Invalid email address').optional(),
    profileImage: z.string().url('Invalid URL').optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8, 'Password must be at least 8 characters long').optional(),
  }).refine(data => {
    if (data.newPassword && !data.currentPassword) {
      return false;
    }
    return true;
  }, {
    message: "Current password is required to set a new password",
    path: ["currentPassword"]
  })
});

export const addressSchema = z.object({
  body: z.object({
    label: z.string().optional(),
    street: z.string().min(1, 'Street is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zipCode: z.string().min(1, 'Zip code is required'),
    country: z.string().min(1, 'Country is required'),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    isDefault: z.boolean().optional(),
  })
});

export const favoriteSchema = z.object({
  body: z.object({
    restaurantId: z.string().uuid('Invalid restaurant ID').optional(),
    foodId: z.string().uuid('Invalid food ID').optional(),
  }).refine(data => data.restaurantId || data.foodId, {
    message: "Must provide either restaurantId or foodId",
    path: ["restaurantId"]
  })
});

export const reviewSchema = z.object({
  body: z.object({
    orderId: z.string().uuid('Invalid order ID'),
    restaurantId: z.string().uuid('Invalid restaurant ID').optional(),
    foodId: z.string().uuid('Invalid food ID').optional(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().optional(),
  }).refine(data => data.restaurantId || data.foodId, {
    message: "Must review either a restaurant or a food item",
    path: ["restaurantId"]
  })
});
