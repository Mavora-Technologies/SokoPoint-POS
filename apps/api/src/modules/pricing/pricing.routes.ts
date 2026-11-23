import { Router } from 'express';
import { PricingController } from './pricing.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

router.get('/', PricingController.getOverview);
router.patch('/products/:productId', PricingController.updateProductPrice);
router.post('/promotions', PricingController.createPromotion);
router.patch('/promotions/:id/toggle', PricingController.togglePromotion);
router.delete('/promotions/:id', PricingController.deletePromotion);

export const pricingRoutes = router;
export default router;