import { Router, Response } from 'express';
import { InvariantGroup, Check, EvaluationRun, CheckResultLog, AWSAccount } from '../db';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/', async (req: AuthRequest, res: Response) => {
    const { awsAccountId, name, description, intervalMinutes, enabled, notificationEmails, checks } = req.body;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        return res.status(401).json({ error: 'Tenant context missing' });
    }

    try {

        const group = await InvariantGroup.create({
            tenantId,
            awsAccountId,
            name,
            description,
            intervalMinutes,
            enabled,
            notificationEmails,
        });

        if (checks && Array.isArray(checks)) {
            for (const checkData of checks) {
                await Check.create({
                    groupId: group.id,
                    ...checkData,
                });
            }
        }

        const result = await InvariantGroup.findByPk(group.id, {
            include: [{ model: Check, as: 'checks' }],
        });

        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/detail/:id', async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    try {
        const group = await InvariantGroup.findOne({
            where: { id, tenantId },
            include: [
                { model: Check, as: 'checks' },
                { model: AWSAccount }
            ],
            order: [[{ model: Check, as: 'checks' }, 'createdAt', 'ASC']]
        });
        if (!group) {
            return res.status(404).json({ error: 'Group not found or unauthorized' });
        }
        res.json(group);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Note: Keeping tenantId in URL for compatibility but enforcing match with JWT
router.get('/:tenantId', async (req: AuthRequest, res: Response) => {
    const { tenantId: urlTenantId } = req.params;
    const tenantId = req.user?.tenantId;

    if (urlTenantId !== tenantId) {
        return res.status(403).json({ error: 'Unauthorized access to tenant data' });
    }

    try {
        const groups = await InvariantGroup.findAll({
            where: { tenantId },
            include: [{ model: Check, as: 'checks' }],
            order: [
                ['enabled', 'DESC'],
                ['createdAt', 'DESC']
            ]
        });
        res.json(groups);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/:id', async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    try {
        const group = await InvariantGroup.findOne({ where: { id, tenantId } });
        if (!group) {
            return res.status(404).json({ error: 'Group not found or unauthorized' });
        }
        await group.update(req.body);
        res.json(group);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/:id/checks', async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    try {
        const group = await InvariantGroup.findOne({ where: { id, tenantId } });
        if (!group) {
            return res.status(404).json({ error: 'Group not found or unauthorized' });
        }

        const check = await Check.create({
            groupId: id,
            ...req.body,
        });

        res.status(201).json(check);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:groupId/checks/:checkId', async (req, res) => {
    const { groupId, checkId } = req.params;
    try {
        const check = await Check.findOne({
            where: { id: checkId, groupId },
        });

        if (!check) {
            return res.status(404).json({ error: 'Check not found' });
        }

        // Clear alias so it can be reused
        await check.update({ alias: null });
        await check.destroy();
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/:id/toggle', async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    try {
        const group = await InvariantGroup.findOne({ where: { id, tenantId } });
        if (!group) {
            return res.status(404).json({ error: 'Group not found or unauthorized' });
        }
        group.enabled = !group.enabled;
        await group.save();
        res.json(group);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/:groupId/checks/:checkId', async (req: AuthRequest, res: Response) => {
    try {
        const { groupId, checkId } = req.params;
        const tenantId = req.user?.tenantId;
        const { service, type, scope, region, parameters, alias } = req.body;

        const group = await InvariantGroup.findOne({ where: { id: groupId, tenantId } });
        if (!group) return res.status(404).json({ error: 'Group not found or unauthorized' });

        const check = await Check.findOne({ where: { id: checkId, groupId } });
        if (!check) return res.status(404).json({ error: 'Check not found' });

        await check.update({
            service,
            type,
            scope,
            region,
            parameters,
            alias
        });

        res.json(check);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to update check' });
    }
});

router.get('/:id/history', async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    try {
        const group = await InvariantGroup.findOne({ where: { id, tenantId } });
        if (!group) return res.status(404).json({ error: 'Group not found or unauthorized' });

        const { count, rows } = await EvaluationRun.findAndCountAll({
            where: { groupId: id },
            order: [['evaluatedAt', 'DESC']],
            limit,
            offset,
            distinct: true,
            include: [{
                model: CheckResultLog,
                as: 'results',
                include: [{
                    model: Check,
                    as: 'check',
                    paranoid: false // Include soft-deleted checks in historical logs
                }]
            }],
        });
        res.json({
            data: rows,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/:id/evaluate', async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    try {
        const group = await InvariantGroup.findOne({ where: { id, tenantId } });
        if (!group) return res.status(404).json({ error: 'Group not found or unauthorized' });

        const { evaluateGroup } = require('../services/evaluationService');
        const result = await evaluateGroup(id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
