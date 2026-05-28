import { Router } from 'express';
import { AuthController } from '../controllers/authController';

const router = Router();
const ctrl = new AuthController();

router.post('/register', (req, res) => ctrl.register(req, res));
router.post('/login', (req, res) => ctrl.login(req, res));
router.post('/refresh', (req, res) => ctrl.refresh(req, res));

export default router;
