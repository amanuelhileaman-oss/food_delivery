import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';
import { validate } from '../middlewares/validate.middleware';
import { authenticateUser, authorizeRole, authorizeResourceOwnership } from '../middlewares/auth.middleware';
import {
  updateProfileSchema,
  addressSchema,
  favoriteSchema,
  reviewSchema
} from '../validators/customer.validator';

const router = Router();

// Protect all customer routes
router.use(authenticateUser);
router.use(authorizeRole('CUSTOMER', 'ADMIN'));

// Profile
router.get('/profile', CustomerController.getProfile);
router.put('/profile', validate(updateProfileSchema), CustomerController.updateProfile);

// Discovery
router.get('/restaurants', CustomerController.getRestaurants);
router.get('/restaurants/:id', CustomerController.getRestaurantDetails);
router.get('/categories', CustomerController.getCategories);
router.get('/recommended-foods', CustomerController.getRecommendedFoods);

// Addresses
router.get('/addresses', CustomerController.getAddresses);
router.post('/addresses', validate(addressSchema), CustomerController.addAddress);
router.put('/addresses/:id', authorizeResourceOwnership('address', 'id'), validate(addressSchema), CustomerController.updateAddress);
router.delete('/addresses/:id', authorizeResourceOwnership('address', 'id'), CustomerController.deleteAddress);

// Favorites
router.get('/favorites', CustomerController.getFavorites);
router.post('/favorites', validate(favoriteSchema), CustomerController.addFavorite);
router.delete('/favorites/:id', authorizeResourceOwnership('favorite', 'id'), CustomerController.removeFavorite);

// Orders
router.get('/orders', CustomerController.getOrders);
router.get('/orders/:id', authorizeResourceOwnership('order', 'id'), CustomerController.getOrderDetails);
router.post('/orders/:id/reorder', authorizeResourceOwnership('order', 'id'), CustomerController.reorder);

// Reviews
router.post('/reviews', validate(reviewSchema), CustomerController.submitReview);

export default router;
