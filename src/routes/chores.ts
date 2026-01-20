import { Router } from 'express';
import { completeChore, claimChore } from '../controllers/choreController';

const router = Router();

router.post('/:choreId/complete', completeChore);
router.post('/:choreId/claim', claimChore);

export default router;