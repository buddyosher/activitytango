import { Router } from 'express';
import { getFamilyDashboard } from '../controllers/familyController';

const router = Router();

router.get('/dashboard', getFamilyDashboard);

export default router;