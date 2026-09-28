import { Router } from 'express';
import { OwnerController } from '../controllers/owner.controller';
import { validate } from '../middlewares/validate.middleware';
import { authenticateUser, authorizeRole } from '../middlewares/auth.middleware';
import { restaurantApplicationSchema, documentSchema } from '../validators/owner.validator';

const router = Router();

router.use(authenticateUser);
router.use(authorizeRole('RESTAURANT_OWNER'));

router.get('/restaurant', OwnerController.getMyRestaurant);
router.post('/restaurant/:id/application', validate(restaurantApplicationSchema), OwnerController.submitApplication);
router.post('/restaurant/:id/documents', validate(documentSchema), OwnerController.uploadDocument);
router.get('/restaurant/:id/documents', OwnerController.getDocuments);
router.delete('/restaurant/:id/documents/:docId', OwnerController.deleteDocument);
router.put('/restaurant/:id/operating-status', OwnerController.updateOperatingStatus);

export default router;
