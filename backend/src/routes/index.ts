import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import customerRoutes from './customer.routes';
import ownerRoutes from './owner.routes';
import adminRoutes from './admin.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/customer', customerRoutes);
router.use('/owner', ownerRoutes);
router.use('/admin', adminRoutes);

export default router;
