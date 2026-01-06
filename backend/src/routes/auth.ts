import { Router } from 'express';
import { createTenantForUser, authenticateUser } from '../services/tenantService';
import { User } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/signup', async (req, res) => {
    const { email, password, tenantName } = req.body;

    try {
        const result = await createTenantForUser(email, password, tenantName);
        res.status(201).json(result);
    } catch (error: any) {
        console.error('Signup error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await authenticateUser(email, password);
        res.json(user);
    } catch (error: any) {
        res.status(401).json({ error: error.message });
    }
});

router.get('/me', authenticate, async (req: AuthRequest, res) => {
    try {
        const userId = req.user?.userId;
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ id: user.id, email: user.email, tenantId: user.tenantId });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
