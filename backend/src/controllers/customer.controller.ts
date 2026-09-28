import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';
import bcrypt from 'bcrypt';

// Helper to calculate distance in km between two lat/lngs
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; // Distance in km
}

export class CustomerController {
  // ---------------------------------------------------------------------------
  // RESTAURANTS & DISCOVERY
  // ---------------------------------------------------------------------------
  static async getRestaurants(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, category, isPopular, isNearby, lat, lng } = req.query;
      
      const where: any = { isActive: true, status: 'APPROVED' };
      
      if (search) {
        where.OR = [
          { name: { contains: String(search), mode: 'insensitive' } },
          { foods: { some: { name: { contains: String(search), mode: 'insensitive' } } } }
        ];
      }
      
      if (category) {
        where.foods = { some: { categoryId: String(category) } };
      }

      let orderBy: any = { createdAt: 'desc' };
      if (isPopular) {
        orderBy = { orders: { _count: 'desc' } }; // Popular = highest order count
      }

      let restaurants = await prisma.restaurant.findMany({
        where,
        orderBy,
        include: { _count: { select: { reviews: true, orders: true } } },
        take: 50
      });

      if (isNearby && lat && lng) {
        const userLat = parseFloat(String(lat));
        const userLng = parseFloat(String(lng));
        if (!isNaN(userLat) && !isNaN(userLng)) {
          // Filter to restaurants within 20km
          restaurants = restaurants.filter(r => {
            if (!r.latitude || !r.longitude) return false;
            const dist = getDistanceFromLatLonInKm(userLat, userLng, r.latitude, r.longitude);
            return dist <= 20;
          });
          // Sort by distance (not implemented here but they are filtered)
        }
      }

      res.status(200).json({ success: true, data: restaurants });
    } catch (error) {
      next(error);
    }
  }

  static async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await prisma.category.findMany({ where: { isActive: true } });
      res.status(200).json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  }

  static async getRestaurantDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const restaurant = await prisma.restaurant.findUnique({
        where: { id, isActive: true, status: 'APPROVED' },
        include: {
          foods: {
            where: { isAvailable: true },
            include: { category: true, options: { include: { values: true } } }
          },
          reviews: { include: { customer: { select: { firstName: true, lastName: true } } } }
        }
      });

      if (!restaurant) throw new ApiError(404, 'Restaurant not found');
      res.status(200).json({ success: true, data: restaurant });
    } catch (error) {
      next(error);
    }
  }

  static async getRecommendedFoods(req: Request, res: Response, next: NextFunction) {
    try {
      // Find foods with best ratings
      const foods = await prisma.food.findMany({
        where: { isAvailable: true, restaurant: { isActive: true, status: 'APPROVED' } },
        include: { restaurant: { select: { name: true, id: true } } },
        take: 10
      });
      // In a real app this would use ML or complex aggregations.
      res.status(200).json({ success: true, data: foods });
    } catch (error) {
      next(error);
    }
  }

  // ---------------------------------------------------------------------------
  // PROFILE
  // ---------------------------------------------------------------------------
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, profileImage: true, accountStatus: true }
      });
      res.status(200).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { firstName, lastName, phone, email, profileImage, currentPassword, newPassword } = req.body;

      const updateData: any = {};
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (phone) updateData.phone = phone;
      if (profileImage) updateData.profileImage = profileImage;

      if (email) {
        const existingEmail = await prisma.user.findFirst({ where: { email, id: { not: userId } } });
        if (existingEmail) throw new ApiError(400, 'Email already in use');
        updateData.email = email;
      }

      if (newPassword && currentPassword) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new ApiError(404, 'User not found');
        
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) throw new ApiError(400, 'Incorrect current password');
        
        updateData.password = await bcrypt.hash(newPassword, 10);
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, profileImage: true, role: true }
      });

      res.status(200).json({ success: true, data: updatedUser });
    } catch (error) {
      next(error);
    }
  }

  // ---------------------------------------------------------------------------
  // ADDRESSES
  // ---------------------------------------------------------------------------
  static async getAddresses(req: Request, res: Response, next: NextFunction) {
    try {
      const addresses = await prisma.address.findMany({ where: { userId: req.user!.id } });
      res.status(200).json({ success: true, data: addresses });
    } catch (error) {
      next(error);
    }
  }

  static async addAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { isDefault } = req.body;

      if (isDefault) {
        await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
      }

      // Check if it's the first address, make it default automatically if not specified
      const count = await prisma.address.count({ where: { userId } });
      const address = await prisma.address.create({
        data: { ...req.body, userId, isDefault: isDefault || count === 0 }
      });

      res.status(201).json({ success: true, data: address });
    } catch (error) {
      next(error);
    }
  }

  static async updateAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const { isDefault } = req.body;

      // Ownership checked by authorizeResourceOwnership middleware
      if (isDefault) {
        await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
      }

      const address = await prisma.address.update({
        where: { id },
        data: req.body
      });

      res.status(200).json({ success: true, data: address });
    } catch (error) {
      next(error);
    }
  }

  static async deleteAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      // Ownership checked by authorizeResourceOwnership middleware
      await prisma.address.delete({ where: { id } });
      res.status(200).json({ success: true, message: 'Address deleted' });
    } catch (error) {
      next(error);
    }
  }

  // ---------------------------------------------------------------------------
  // FAVORITES
  // ---------------------------------------------------------------------------
  static async getFavorites(req: Request, res: Response, next: NextFunction) {
    try {
      const favorites = await prisma.favorite.findMany({
        where: { userId: req.user!.id },
        include: { restaurant: true, food: true }
      });
      res.status(200).json({ success: true, data: favorites });
    } catch (error) {
      next(error);
    }
  }

  static async addFavorite(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { restaurantId, foodId } = req.body;

      if (restaurantId) {
        const exists = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
        if (!exists) throw new ApiError(400, 'Invalid restaurant');
      }
      if (foodId) {
        const exists = await prisma.food.findUnique({ where: { id: foodId } });
        if (!exists) throw new ApiError(400, 'Invalid food');
      }

      // Check for duplicate
      const existing = await prisma.favorite.findFirst({
        where: { userId, restaurantId, foodId }
      });
      if (existing) throw new ApiError(400, 'Already in favorites');

      const favorite = await prisma.favorite.create({
        data: { userId, restaurantId, foodId }
      });
      res.status(201).json({ success: true, data: favorite });
    } catch (error) {
      next(error);
    }
  }

  static async removeFavorite(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      // Ownership checked by authorizeResourceOwnership
      await prisma.favorite.delete({ where: { id } });
      res.status(200).json({ success: true, message: 'Removed from favorites' });
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) {
        return res.status(404).json({ message: 'Favorite not found' });
      }
      next(error);
    }
  }

  // ---------------------------------------------------------------------------
  // ORDERS
  // ---------------------------------------------------------------------------
  static async getOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const { type } = req.query; // 'current' or 'previous'
      const userId = req.user!.id;

      let statusFilter: any = undefined;
      
      if (type === 'current') {
        statusFilter = { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'DRIVER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'] };
      } else if (type === 'previous') {
        statusFilter = { in: ['DELIVERED', 'CANCELLED'] };
      }

      const orders = await prisma.order.findMany({
        where: { customerId: userId, ...(statusFilter && { status: statusFilter }) },
        orderBy: { createdAt: 'desc' },
        include: { restaurant: { select: { name: true, imageLogo: true } }, items: true }
      });

      res.status(200).json({ success: true, data: orders });
    } catch (error) {
      next(error);
    }
  }

  static async getOrderDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      // Ownership handled by authorizeResourceOwnership
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          restaurant: true,
          items: { include: { food: true } },
          statusHistory: { orderBy: { createdAt: 'desc' } },
          deliveryAddress: true,
          reviews: true
        }
      });
      
      if (!order) throw new ApiError(404, 'Order not found');
      res.status(200).json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  }

  static async reorder(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Ensure old order is theirs
      const order = await prisma.order.findUnique({
        where: { id, customerId: userId },
        include: { items: { include: { food: true } } }
      });

      if (!order) throw new ApiError(404, 'Order not found');

      // Create or update cart
      let cart = await prisma.cart.findUnique({ where: { userId } });
      if (!cart) {
        cart = await prisma.cart.create({ data: { userId } });
      }

      // Clear existing cart items
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

      // Add items if they are still available
      const itemsToCreate = [];
      for (const item of order.items) {
        if (item.food.isAvailable && item.food.restaurantId === order.restaurantId) {
          itemsToCreate.push({
            cartId: cart.id,
            foodId: item.foodId,
            quantity: item.quantity,
            options: item.options || undefined
          });
        }
      }

      if (itemsToCreate.length === 0) {
        throw new ApiError(400, 'None of the items from this order are available anymore');
      }

      await prisma.cartItem.createMany({ data: itemsToCreate });

      const updatedCart = await prisma.cart.findUnique({
        where: { id: cart.id },
        include: { items: { include: { food: true } } }
      });

      res.status(200).json({ success: true, message: 'Cart populated for reorder', data: updatedCart });
    } catch (error) {
      next(error);
    }
  }

  // ---------------------------------------------------------------------------
  // REVIEWS
  // ---------------------------------------------------------------------------
  static async submitReview(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { orderId, restaurantId, foodId, rating, comment } = req.body;

      // Ensure order is completed and belongs to user
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) throw new ApiError(404, 'Order not found');
      if (order.customerId !== userId) throw new ApiError(403, 'Unauthorized');
      if (order.status !== 'DELIVERED') throw new ApiError(400, 'Cannot review an incomplete order');

      // Prevent duplicate
      const existing = await prisma.review.findFirst({
        where: { orderId, customerId: userId, restaurantId: restaurantId || null, foodId: foodId || null }
      });
      if (existing) throw new ApiError(400, 'Already reviewed this item/restaurant for this order');

      const review = await prisma.review.create({
        data: {
          customerId: userId,
          orderId,
          restaurantId: restaurantId || null,
          foodId: foodId || null,
          rating,
          comment
        }
      });

      res.status(201).json({ success: true, data: review });
    } catch (error) {
      next(error);
    }
  }
}
