import { Router } from 'express';
import { WatchlistController } from '../controllers/watchlistController';

const router = Router();
const ctrl = new WatchlistController();

router.get('/', (req, res) => ctrl.list(req, res));
router.post('/', (req, res) => ctrl.add(req, res));
router.delete('/:id', (req, res) => ctrl.remove(req, res));

export default router;
