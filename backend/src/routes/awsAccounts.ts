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

router.get('/:id/analytics', async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    try {
        const account = await AWSAccount.findOne({ where: { id, tenantId } });
        if (!account) return res.status(404).json({ error: 'Account not found or unauthorized' });

        const { InvariantGroup, Check, EvaluationRun } = require('../db');

        const groups = await InvariantGroup.findAll({
            where: { awsAccountId: id, tenantId },
            include: [{ model: Check, as: 'checks' }]
        });

        const stats = {
            totalGroups: groups.length,
            activeGroups: groups.filter((g: any) => g.enabled).length,
            passGroups: groups.filter((g: any) => g.enabled && g.lastStatus === 'PASS').length,
            failGroups: groups.filter((g: any) => g.enabled && g.lastStatus === 'FAIL').length,
            pendingGroups: groups.filter((g: any) => g.enabled && g.lastStatus === 'PENDING').length,
            totalChecks: groups.reduce((acc: number, g: any) => acc + (g.checks?.length || 0), 0),
        };

        // Fetch last 10 evaluation runs across all groups for this account
        const groupIds = groups.map((g: any) => g.id);
        const recentRuns = groupIds.length > 0 ? await EvaluationRun.findAll({
            where: {
                groupId: groupIds
            },
            order: [['evaluatedAt', 'DESC']],
            limit: 10,
            include: [{
                model: InvariantGroup,
                attributes: ['name']
            }]
        }) : [];

        res.json({ account, stats, recentRuns, groups });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
