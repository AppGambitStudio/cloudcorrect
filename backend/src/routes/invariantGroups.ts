import { Router, Response } from 'express';
import { InvariantGroup, Check, EvaluationRun, CheckResultLog, AWSAccount } from '../db';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// Valid operators for checks
const VALID_OPERATORS = [
    'EQUALS', 'NOT_EQUALS', 'CONTAINS', 'NOT_CONTAINS',
    'GREATER_THAN', 'LESS_THAN', 'GREATER_THAN_OR_EQUALS', 'LESS_THAN_OR_EQUALS',
    'IN_LIST', 'NOT_IN_LIST', 'IS_EMPTY', 'IS_NOT_EMPTY'
] as const;

// Check types that require expectedCount in parameters
const COUNT_CHECK_TYPES = [
    'RUNNING_INSTANCE_COUNT', 'INSTANCE_COUNT',
    'S3_BUCKET_COUNT', 'S3_OBJECT_COUNT',
    'LAMBDA_FUNCTION_COUNT'
] as const;

/**
 * Validates check data for operator and expectedCount
 * @returns null if valid, error message string if invalid
 */
function validateCheckData(checkData: any): string | null {
    const { type, operator, parameters } = checkData;

    // Validate operator if provided
    if (operator !== undefined) {
        if (!VALID_OPERATORS.includes(operator)) {
            return `Invalid operator: ${operator}. Valid operators are: ${VALID_OPERATORS.join(', ')}`;
        }
    }

    // Validate expectedCount for count-based check types
    if (COUNT_CHECK_TYPES.includes(type)) {
        if (!parameters || parameters.expectedCount === undefined || parameters.expectedCount === null) {
            return `expectedCount is required in parameters for check type: ${type}`;
        }

        const expectedCount = Number(parameters.expectedCount);
        if (isNaN(expectedCount)) {
            return `expectedCount must be a valid number for check type: ${type}`;
        }

        if (expectedCount < 0) {
            return `expectedCount must be a non-negative number for check type: ${type}`;
        }
    }

    return null;
}

router.post('/', async (req: AuthRequest, res: Response) => {
    const { awsAccountId, name, description, intervalMinutes, enabled, notificationEmails, checks } = req.body;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        return res.status(401).json({ error: 'Tenant context missing' });
    }

    // Validate all checks before creating the group
    if (checks && Array.isArray(checks)) {
        for (let i = 0; i < checks.length; i++) {
            const validationError = validateCheckData(checks[i]);
            if (validationError) {
                return res.status(400).json({ error: `Check ${i + 1}: ${validationError}` });
            }
        }
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

    // Validate check data
    const validationError = validateCheckData(req.body);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

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
        const { service, type, scope, region, parameters, alias, operator } = req.body;

        const group = await InvariantGroup.findOne({ where: { id: groupId, tenantId } });
        if (!group) return res.status(404).json({ error: 'Group not found or unauthorized' });

        const check = await Check.findOne({ where: { id: checkId, groupId } });
        if (!check) return res.status(404).json({ error: 'Check not found' });

        // Build the update data, merging with existing check data for validation
        const updateData = {
            service: service !== undefined ? service : check.service,
            type: type !== undefined ? type : check.type,
            scope: scope !== undefined ? scope : check.scope,
            region: region !== undefined ? region : check.region,
            parameters: parameters !== undefined ? parameters : check.parameters,
            alias: alias !== undefined ? alias : check.alias,
            operator: operator !== undefined ? operator : check.operator
        };

        // Validate the merged check data
        const validationError = validateCheckData(updateData);
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        await check.update({
            service,
            type,
            scope,
            region,
            parameters,
            alias,
            operator
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

        if (result.skipped) {
            return res.status(400).json({ error: result.reason, skipped: true });
        }

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
