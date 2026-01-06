import { Router, Response } from 'express';
import { onboardAWSAccount } from '../services/awsAccountService';
import { AWSAccount } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/', async (req: AuthRequest, res: Response) => {
    const {
        awsAccountId,
        name,
        authMethod,
        roleArn,
        externalId,
        accessKeyId,
        secretAccessKey,
        region
    } = req.body;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        return res.status(401).json({ error: 'Tenant context missing' });
    }

    try {
        const account = await onboardAWSAccount({
            tenantId,
            awsAccountId,
            name,
            authMethod,
            roleArn,
            externalId: externalId || (authMethod === 'ROLE' ? uuidv4() : undefined),
            accessKeyId,
            secretAccessKey,
            region
        });
        res.status(201).json(account);
    } catch (error: any) {
        console.error('Onboarding error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/:tenantId', async (req: AuthRequest, res: Response) => {
    const { tenantId: urlTenantId } = req.params;
    const tenantId = req.user?.tenantId;

    if (urlTenantId !== tenantId) {
        return res.status(403).json({ error: 'Unauthorized access to tenant data' });
    }

    try {
        const accounts = await AWSAccount.findAll({
            where: { tenantId },
        });
        res.json(accounts);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
