import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { validate } from '../middlewares/validate.middleware';
import { authenticateUser, authorizeRole } from '../middlewares/auth.middleware';
import { reviewRestaurantSchema } from '../validators/admin.validator';

const router = Router();

router.use(authenticateUser);
router.use(authorizeRole('ADMIN'));

router.get('/restaurants', AdminController.getRestaurants);
router.put('/restaurants/:id/review', validate(reviewRestaurantSchema), AdminController.reviewRestaurant);

export default router;
