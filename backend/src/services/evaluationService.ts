import { EC2Client, DescribeInstancesCommand, DescribeVpcsCommand } from '@aws-sdk/client-ec2';
import { ElasticLoadBalancingV2Client, DescribeTargetHealthCommand, DescribeListenersCommand } from '@aws-sdk/client-elastic-load-balancing-v2';
import { Route53Client, ListResourceRecordSetsCommand } from '@aws-sdk/client-route-53';
import { IAMClient, GetRoleCommand, ListAttachedRolePoliciesCommand } from '@aws-sdk/client-iam';
import { S3Client, GetBucketLifecycleConfigurationCommand, HeadBucketCommand, GetBucketPolicyCommand, GetPublicAccessBlockCommand, HeadObjectCommand, ListBucketsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { RDSClient, DescribeDBInstancesCommand } from '@aws-sdk/client-rds';
import { ECSClient, DescribeClustersCommand, DescribeServicesCommand } from '@aws-sdk/client-ecs';
import { DynamoDBClient, DescribeTableCommand, DescribeContinuousBackupsCommand } from '@aws-sdk/client-dynamodb';
import { LambdaClient, GetFunctionCommand, GetFunctionUrlConfigCommand, GetFunctionConcurrencyCommand, ListFunctionsCommand } from '@aws-sdk/client-lambda';
import { CloudFrontClient, GetDistributionCommand, ListDistributionsCommand } from '@aws-sdk/client-cloudfront';
import { ConfigServiceClient, DescribeConfigurationRecordersCommand, DescribeConfigurationRecorderStatusCommand, DescribeConfigRulesCommand, DescribeComplianceByConfigRuleCommand, DescribeDeliveryChannelsCommand, GetComplianceDetailsByResourceCommand, DescribeConformancePackComplianceCommand, DescribeConfigurationAggregatorsCommand } from '@aws-sdk/client-config-service';
import { AWSAdapter } from '../adapters/awsAdapter';
import { Check, InvariantGroup, AWSAccount, EvaluationRun, CheckResultLog } from '../db';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import _ from 'lodash';

const execAsync = promisify(exec);

// List helper functions for operator evaluations

/**
 * Converts a value to an array. If already an array, returns as-is.
 * If a string, attempts to parse as JSON array or splits by comma.
 * Otherwise wraps single value in array.
 */
export function toList(value: any): any[] {
    if (Array.isArray(value)) {
        return value;
    }
    if (typeof value === 'string') {
        // Try parsing as JSON array
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        } catch {
            // Not JSON, split by comma
            return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
        }
    }
    if (value === null || value === undefined) {
        return [];
    }
    return [value];
}

/**
 * Checks if a value exists in a list (case-insensitive for strings)
 */
export function isInList(value: any, list: any[]): boolean {
    const normalizedList = list.map(item =>
        typeof item === 'string' ? item.toLowerCase() : item
    );
    const normalizedValue = typeof value === 'string' ? value.toLowerCase() : value;
    return normalizedList.includes(normalizedValue);
}

/**
 * Checks if a list is empty (null, undefined, or zero length)
 */
export function isListEmpty(value: any): boolean {
    if (value === null || value === undefined) {
        return true;
    }
    const list = toList(value);
    return list.length === 0;
}

/**
 * Returns the intersection of two lists
 */
export function listIntersection(list1: any[], list2: any[]): any[] {
    return _.intersection(list1, list2);
}

/**
 * Returns the difference of two lists (items in list1 not in list2)
 */
export function listDifference(list1: any[], list2: any[]): any[] {
    return _.difference(list1, list2);
}

/**
 * Checks if list1 contains all items from list2
 */
export function listContainsAll(list1: any[], list2: any[]): boolean {
    const diff = _.difference(list2, list1);
    return diff.length === 0;
}

/**
 * Checks if list1 contains any item from list2
 */
export function listContainsAny(list1: any[], list2: any[]): boolean {
    const intersection = _.intersection(list1, list2);
    return intersection.length > 0;
}

/**
 * Evaluates an operator comparison between observed and expected values
 */
export function evaluateOperator(
    operator: string,
    observed: any,
    expected: any
): { passed: boolean; reason: string } {
    switch (operator) {
        case 'EQUALS':
            return {
                passed: _.isEqual(observed, expected),
                reason: _.isEqual(observed, expected)
                    ? `Value equals expected`
                    : `Value ${JSON.stringify(observed)} does not equal ${JSON.stringify(expected)}`
            };
        case 'NOT_EQUALS':
            return {
                passed: !_.isEqual(observed, expected),
                reason: !_.isEqual(observed, expected)
                    ? `Value does not equal ${JSON.stringify(expected)}`
                    : `Value unexpectedly equals ${JSON.stringify(expected)}`
            };
        case 'CONTAINS':
            if (typeof observed === 'string' && typeof expected === 'string') {
                return {
                    passed: observed.includes(expected),
                    reason: observed.includes(expected)
                        ? `String contains "${expected}"`
                        : `String does not contain "${expected}"`
                };
            }
            const obsList = toList(observed);
            return {
                passed: isInList(expected, obsList),
                reason: isInList(expected, obsList)
                    ? `List contains ${JSON.stringify(expected)}`
                    : `List does not contain ${JSON.stringify(expected)}`
            };
        case 'NOT_CONTAINS':
            if (typeof observed === 'string' && typeof expected === 'string') {
                return {
                    passed: !observed.includes(expected),
                    reason: !observed.includes(expected)
                        ? `String does not contain "${expected}"`
                        : `String unexpectedly contains "${expected}"`
                };
            }
            const obsListNot = toList(observed);
            return {
                passed: !isInList(expected, obsListNot),
                reason: !isInList(expected, obsListNot)
                    ? `List does not contain ${JSON.stringify(expected)}`
                    : `List unexpectedly contains ${JSON.stringify(expected)}`
            };
        case 'GREATER_THAN':
            return {
                passed: Number(observed) > Number(expected),
                reason: Number(observed) > Number(expected)
                    ? `${observed} is greater than ${expected}`
                    : `${observed} is not greater than ${expected}`
            };
        case 'LESS_THAN':
            return {
                passed: Number(observed) < Number(expected),
                reason: Number(observed) < Number(expected)
                    ? `${observed} is less than ${expected}`
                    : `${observed} is not less than ${expected}`
            };
        case 'GREATER_THAN_OR_EQUALS':
            return {
                passed: Number(observed) >= Number(expected),
                reason: Number(observed) >= Number(expected)
                    ? `${observed} is greater than or equal to ${expected}`
                    : `${observed} is not greater than or equal to ${expected}`
            };
        case 'LESS_THAN_OR_EQUALS':
            return {
                passed: Number(observed) <= Number(expected),
                reason: Number(observed) <= Number(expected)
                    ? `${observed} is less than or equal to ${expected}`
                    : `${observed} is not less than or equal to ${expected}`
            };
        case 'IN_LIST':
            const expectedList = toList(expected);
            return {
                passed: isInList(observed, expectedList),
                reason: isInList(observed, expectedList)
                    ? `${JSON.stringify(observed)} is in the list`
                    : `${JSON.stringify(observed)} is not in the list [${expectedList.join(', ')}]`
            };
        case 'NOT_IN_LIST':
            const expectedListNot = toList(expected);
            return {
                passed: !isInList(observed, expectedListNot),
                reason: !isInList(observed, expectedListNot)
                    ? `${JSON.stringify(observed)} is not in the list`
                    : `${JSON.stringify(observed)} is unexpectedly in the list [${expectedListNot.join(', ')}]`
            };
        case 'IS_EMPTY':
            return {
                passed: isListEmpty(observed),
                reason: isListEmpty(observed)
                    ? `Value is empty`
                    : `Value is not empty: ${JSON.stringify(observed)}`
            };
        case 'IS_NOT_EMPTY':
            return {
                passed: !isListEmpty(observed),
                reason: !isListEmpty(observed)
                    ? `Value is not empty`
                    : `Value is unexpectedly empty`
            };
        default:
            return {
                passed: false,
                reason: `Unknown operator: ${operator}`
            };
    }
}

export interface CheckResult {
    checkId: string;
    alias?: string;
    status: 'PASS' | 'FAIL';
    expected: string;
    observed: string;
    reason: string;
    data?: any; // Machine-readable data for dependencies (e.g., { publicIp: '...' })
}

export const evaluateCheck = async (check: Check, account: AWSAccount, context: Record<string, any> = {}): Promise<CheckResult> => {
    const credentials = await AWSAdapter.getCredentials(account);

    // Resolve placeholders in parameters
    const { resolved: resolvedParameters, resolutions } = resolvePlaceholders(check.parameters, context);
    const checkWithResolvedParams = { ...check.get({ plain: true }), parameters: resolvedParameters } as Check;

    try {
        let result: CheckResult;
        switch (check.service) {
            case 'EC2':
                result = await evaluateEC2Check(checkWithResolvedParams, credentials);
                break;
            case 'ALB':
                result = await evaluateALBCheck(checkWithResolvedParams, credentials);
                break;
            case 'Route53':
                result = await evaluateRoute53Check(checkWithResolvedParams, credentials);
                break;
            case 'IAM':
                result = await evaluateIAMCheck(checkWithResolvedParams, credentials);
                break;
            case 'S3':
                result = await evaluateS3Check(checkWithResolvedParams, credentials);
                break;
            case 'RDS':
                result = await evaluateRDSCheck(checkWithResolvedParams, credentials);
                break;
            case 'ECS':
                result = await evaluateECSCheck(checkWithResolvedParams, credentials);
                break;
            case 'DynamoDB':
                result = await evaluateDynamoDBCheck(checkWithResolvedParams, credentials);
                break;
            case 'Lambda':
                result = await evaluateLambdaCheck(checkWithResolvedParams, credentials);
                break;
            case 'CloudFront':
                result = await evaluateCloudFrontCheck(checkWithResolvedParams, credentials);
                break;
            case 'ConfigService':
                result = await evaluateConfigServiceCheck(checkWithResolvedParams, credentials);
                break;
            case 'NETWORK':
                if (check.type === 'PING') {
                    result = await evaluatePingCheck(checkWithResolvedParams);
                } else if (check.type === 'HTTP_200' || check.type === 'HTTP_RESPONSE_CONTAINS') {
                    result = await evaluateHTTPCheck(checkWithResolvedParams);
                } else {
                    throw new Error(`Unsupported network check type: ${check.type}`);
                }
                break;
            default:
                throw new Error(`Unsupported service: ${check.service}`);
        }

        // Add placeholder info to expected string if resolutions happened
        if (resolutions.length > 0) {
            result.expected = `${result.expected} (resolved from ${resolutions.join(', ')})`;
        }

        return result;
    } catch (error: any) {
        return {
            checkId: check.id,
            alias: check.alias,
            status: 'FAIL',
            expected: 'Successful API call',
            observed: 'API error',
            reason: error.message,
        };
    }
};

function resolvePlaceholders(parameters: any, context: Record<string, any>): { resolved: any, resolutions: string[] } {
    const resolutions: string[] = [];
    if (typeof parameters !== 'object' || parameters === null) return { resolved: parameters, resolutions };

    const result = Array.isArray(parameters) ? [...parameters] : { ...parameters };

    for (const key in result) {
        if (typeof result[key] === 'string') {
            // Match {{alias.property}}
            const matches = result[key].match(/\{\{([^}]+)\}\}/g);
            if (matches) {
                let replaced = result[key];
                for (const match of matches) {
                    const path = match.slice(2, -2).trim();
                    const [alias, property] = path.split('.');
                    const contextAlias = context[alias];
                    let value = undefined;
                    if (contextAlias) {
                        // Case-insensitive property lookup
                        const foundKey = Object.keys(contextAlias).find(k => k.toLowerCase() === property.toLowerCase());
                        if (foundKey) {
                            value = contextAlias[foundKey];
                        }
                    }
                    if (value !== undefined) {
                        replaced = replaced.replace(match, value);
                        if (!resolutions.includes(match)) resolutions.push(match);
                    }
                }
                result[key] = replaced;
            }
        } else if (typeof result[key] === 'object') {
            const childResult = resolvePlaceholders(result[key], context);
            result[key] = childResult.resolved;
            childResult.resolutions.forEach(res => {
                if (!resolutions.includes(res)) resolutions.push(res);
            });
        }
    }
    return { resolved: result, resolutions };
}

async function evaluateEC2Check(check: Check, credentials: any): Promise<CheckResult> {
    const client = await AWSAdapter.getEC2Client(credentials, check.region!);

    // Handle count-based check types first (these don't require instanceId)
    if (check.type === 'RUNNING_INSTANCE_COUNT' || check.type === 'INSTANCE_COUNT') {
        const { expectedCount, tagFilters } = check.parameters;
        const operator = check.operator || 'EQUALS';

        // Build filters for the query
        const filters: Array<{ Name: string; Values: string[] }> = [];

        // For RUNNING_INSTANCE_COUNT, always filter by running state
        if (check.type === 'RUNNING_INSTANCE_COUNT') {
            filters.push({ Name: 'instance-state-name', Values: ['running'] });
        }

        // Add tag filters if provided
        if (tagFilters && typeof tagFilters === 'object') {
            for (const [tagKey, tagValue] of Object.entries(tagFilters)) {
                filters.push({ Name: `tag:${tagKey}`, Values: [String(tagValue)] });
            }
        }

        const command = new DescribeInstancesCommand(filters.length > 0 ? { Filters: filters } : {});
        const response = await client.send(command);

        // Count all instances from all reservations
        let instanceCount = 0;
        const instanceIds: string[] = [];
        for (const reservation of response.Reservations || []) {
            for (const instance of reservation.Instances || []) {
                instanceCount++;
                instanceIds.push(instance.InstanceId || 'unknown');
            }
        }

        const evalResult = evaluateOperator(operator, instanceCount, Number(expectedCount));
        const filterDesc = filters.length > 0 ? ` (filters: ${filters.map(f => `${f.Name}=${f.Values.join(',')}`).join(', ')})` : '';
        const evidence = `Count: ${instanceCount} | Instances: ${instanceIds.slice(0, 5).join(', ')}${instanceIds.length > 5 ? '...' : ''}`;

        return {
            checkId: check.id,
            alias: check.alias,
            status: evalResult.passed ? 'PASS' : 'FAIL',
            expected: `instance count ${operator} ${expectedCount}${filterDesc}`,
            observed: evidence,
            reason: evalResult.reason,
            data: { count: instanceCount, expectedCount: Number(expectedCount), operator, instanceIds: instanceIds.slice(0, 20), filters }
        };
    }

    // Handle DEFAULT_VPC check
    if (check.type === 'DEFAULT_VPC') {
        const operator = check.operator || 'EQUALS';
        const expectedCount = check.parameters.expectedCount ?? 0;

        const vpcCommand = new DescribeVpcsCommand({
            Filters: [{ Name: 'isDefault', Values: ['true'] }]
        });
        const vpcResponse = await client.send(vpcCommand);
        const defaultVpcs = vpcResponse.Vpcs || [];
        const count = defaultVpcs.length;

        const evalResult = evaluateOperator(operator, count, Number(expectedCount));
        const vpcIds = defaultVpcs.map(v => v.VpcId).join(', ');
        const evidence = count > 0
            ? `Found ${count} default VPC(s): ${vpcIds}`
            : 'No default VPC found';

        return {
            checkId: check.id,
            alias: check.alias,
            status: evalResult.passed ? 'PASS' : 'FAIL',
            expected: `default VPC count ${operator} ${expectedCount}`,
            observed: evidence,
            reason: evalResult.reason,
            data: { count, expectedCount: Number(expectedCount), operator, vpcIds: defaultVpcs.map(v => v.VpcId) }
        };
    }

    // For instance-specific checks, require instanceId
    const { instanceId } = check.parameters;

    const command = new DescribeInstancesCommand({ InstanceIds: [instanceId] });
    const response = await client.send(command);
    const instance = response.Reservations?.[0]?.Instances?.[0];

    if (!instance) {
        return {
            checkId: check.id,
            status: 'FAIL',
            expected: check.type === 'INSTANCE_RUNNING' ? 'instance.state == running' : 'instance has public ip',
            observed: 'instance not found',
            reason: `EC2 instance ${instanceId} not found in ${check.region}`,
        };
    }

    const state = instance.State?.Name;
    const publicIp = instance.PublicIpAddress;
    const privateIp = instance.PrivateIpAddress;
    const instanceType = instance.InstanceType;
    const az = instance.Placement?.AvailabilityZone;
    const vpcId = instance.VpcId;
    const subnetId = instance.SubnetId;
    const stateReason = instance.StateReason?.Message || 'none';
    const nameTag = instance.Tags?.find(t => t.Key === 'Name')?.Value || 'Unnamed';

    // Detailed evidence string for history view
    const securityGroups = instance.SecurityGroups?.map(sg => sg.GroupId).join(', ') || 'None';
    const evidence = `ID: ${instanceId} | Name: ${nameTag} | State: ${state} | Reason: ${stateReason} | Type: ${instanceType} | AZ: ${az} | Public IP: ${publicIp || 'None'} | SGs: ${securityGroups}`;

    if (check.type === 'INSTANCE_RUNNING' || check.type === 'INSTANCE_AVAILABLE') {
        return {
            checkId: check.id,
            alias: check.alias,
            status: state === 'running' ? 'PASS' : 'FAIL',
            expected: 'instance.state == running',
            observed: evidence,
            reason: state === 'running' ? `EC2 instance ${nameTag} (${instanceId}) is running` : `EC2 instance ${nameTag} (${instanceId}) is ${state} (${stateReason})`,
            data: { instanceId, publicIp, privateIp, state, stateReason, name: nameTag, instanceType, az, vpcId, subnetId, securityGroups: instance.SecurityGroups?.map(sg => sg.GroupId) }
        };
    }

    if (check.type === 'INSTANCE_HAS_PUBLIC_IP' || check.type === 'HAS_PUBLIC_IP') {
        return {
            checkId: check.id,
            alias: check.alias,
            status: !!publicIp ? 'PASS' : 'FAIL',
            expected: 'instance has public ip',
            observed: evidence,
            reason: publicIp ? `EC2 instance ${nameTag} has public IP ${publicIp}` : `EC2 instance ${nameTag} has no public IP (${stateReason})`,
            data: { instanceId, publicIp, privateIp, state, stateReason, name: nameTag, instanceType, az, vpcId, subnetId, securityGroups: instance.SecurityGroups?.map(sg => sg.GroupId) }
        };
    }

    if (check.type === 'IN_SECURITY_GROUP') {
        const { securityGroupId } = check.parameters;
        const hasSg = instance.SecurityGroups?.some(sg => sg.GroupId === securityGroupId);
        return {
            checkId: check.id,
            alias: check.alias,
            status: hasSg ? 'PASS' : 'FAIL',
            expected: `instance in security group ${securityGroupId}`,
            observed: evidence,
            reason: hasSg ? `EC2 instance ${nameTag} is in security group ${securityGroupId}` : `EC2 instance ${nameTag} is NOT in security group ${securityGroupId}`,
            data: { instanceId, publicIp, privateIp, state, stateReason, name: nameTag, instanceType, az, vpcId, subnetId, securityGroups: instance.SecurityGroups?.map(sg => sg.GroupId) }
        };
    }

    if (check.type === 'IN_SUBNET') {
        const { subnetId: expectedSubnetId } = check.parameters;
        const isInSubnet = subnetId === expectedSubnetId;
        return {
            checkId: check.id,
            alias: check.alias,
            status: isInSubnet ? 'PASS' : 'FAIL',
            expected: `instance in subnet ${expectedSubnetId}`,
            observed: evidence,
            reason: isInSubnet ? `EC2 instance ${nameTag} is in subnet ${expectedSubnetId}` : `EC2 instance ${nameTag} is in subnet ${subnetId} (expected ${expectedSubnetId})`,
            data: { instanceId, publicIp, privateIp, state, stateReason, name: nameTag, instanceType, az, vpcId, subnetId, securityGroups: instance.SecurityGroups?.map(sg => sg.GroupId) }
        };
    }

    throw new Error(`Unsupported EC2 check type: ${check.type}`);
}

async function evaluateALBCheck(check: Check, credentials: any): Promise<CheckResult> {
    const client = await AWSAdapter.getALBClient(credentials, check.region!);
    if (check.type === 'TARGET_GROUP_HEALTHY') {
        const { targetGroupArn } = check.parameters;
        const command = new DescribeTargetHealthCommand({ TargetGroupArn: targetGroupArn });
        const response = await client.send(command);
        const healthyTargets = response.TargetHealthDescriptions?.filter(t => t.TargetHealth?.State === 'healthy') || [];
        const totalTargets = response.TargetHealthDescriptions?.length || 0;

        const targetIds = healthyTargets.slice(0, 5).map(t => t.Target?.Id).join(', ') + (healthyTargets.length > 5 ? '...' : '');
        const evidence = `Healthy: ${healthyTargets.length}/${totalTargets} targets | IDs: ${targetIds || 'none'}`;

        return {
            checkId: check.id,
            alias: check.alias,
            status: healthyTargets.length > 0 ? 'PASS' : 'FAIL',
            expected: 'target group has >=1 healthy target',
            observed: evidence,
            reason: healthyTargets.length > 0 ? `Target group is healthy with ${healthyTargets.length} targets` : 'Target group has no healthy targets',
            data: { healthyCount: healthyTargets.length, totalCount: totalTargets, targetIds: healthyTargets.map(t => t.Target?.Id), targetGroupArn }
        };
    }

    if (check.type === 'ALB_LISTENER_EXISTS') {
        const { loadBalancerArn, listenerPort } = check.parameters;
        const command = new DescribeListenersCommand({ LoadBalancerArn: loadBalancerArn });
        const response = await client.send(command);
        const listener = response.Listeners?.find(l => l.Port === parseInt(listenerPort));

        if (!listener) {
            return {
                checkId: check.id,
                alias: check.alias,
                status: 'FAIL',
                expected: `Listener on port ${listenerPort} exists`,
                observed: 'Listener not found',
                reason: `No listener found on port ${listenerPort} for LB ${loadBalancerArn}`,
                data: { loadBalancerArn, listenerPort }
            };
        }

        const defaultTargetGroupArn = listener.DefaultActions?.find(a => a.TargetGroupArn)?.TargetGroupArn;
        const evidence = `Port: ${listener.Port} | Protocol: ${listener.Protocol} | TG: ${defaultTargetGroupArn?.split('/').pop() || 'None'}`;

        return {
            checkId: check.id,
            alias: check.alias,
            status: 'PASS',
            expected: `Listener on port ${listenerPort} exists`,
            observed: evidence,
            reason: `Listener found on port ${listenerPort} (${listener.Protocol})`,
            data: {
                loadBalancerArn,
                listenerPort: listener.Port,
                protocol: listener.Protocol,
                targetGroupArn: defaultTargetGroupArn,
                listenerArn: listener.ListenerArn
            }
        };
    }

    throw new Error(`Unsupported ALB check type: ${check.type}`);
}

async function evaluateRoute53Check(check: Check, credentials: any): Promise<CheckResult> {
    const client = await AWSAdapter.getRoute53Client(credentials);
    const { recordName, hostedZoneId } = check.parameters;

    const command = new ListResourceRecordSetsCommand({
        HostedZoneId: hostedZoneId,
        StartRecordName: recordName,
        MaxItems: 1,
    });
    const response = await client.send(command);
    const record = response.ResourceRecordSets?.find(r => r.Name === recordName || r.Name === `${recordName}.`);

    if (!record) {
        return {
            checkId: check.id,
            status: 'FAIL',
            expected: check.type === 'RECORD_EXISTS' ? `DNS record ${recordName} exists` : 'DNS record exists',
            observed: 'Record not found',
            reason: `DNS record ${recordName} not found in hosted zone ${hostedZoneId}`,
        };
    }

    const values = record.ResourceRecords?.map(v => v.Value) || [];
    const aliasValue = record.AliasTarget?.DNSName;
    const ttl = record.TTL;
    const evidence = `Type: ${record.Type} | Values: ${values.join(', ') || aliasValue || 'None'} | TTL: ${ttl !== undefined ? ttl : 'Alias/None'}`;

    if (check.type === 'RECORD_EXISTS') {
        return {
            checkId: check.id,
            alias: check.alias,
            status: 'PASS',
            expected: `DNS record ${recordName} exists`,
            observed: evidence,
            reason: 'DNS record exists',
            data: { recordName, type: record.Type, values, aliasValue, ttl, hostedZoneId }
        };
    }

    if (check.type === 'DNS_POINTS_TO') {
        const { expectedValue } = check.parameters;
        const matched = values.includes(expectedValue) || aliasValue?.includes(expectedValue);

        return {
            checkId: check.id,
            alias: check.alias,
            status: matched ? 'PASS' : 'FAIL',
            expected: `DNS record ${recordName} points to ${expectedValue}`,
            observed: evidence,
            reason: matched ? 'DNS record matches expected value' : 'DNS record does not match expected value',
            data: { recordName, type: record.Type, values, aliasValue, ttl, hostedZoneId }
        };
    }

    if (check.type === 'TTL_EQUALS') {
        const { expectedTtl } = check.parameters;
        const matched = ttl === parseInt(expectedTtl);
        return {
            checkId: check.id,
            alias: check.alias,
            status: matched ? 'PASS' : 'FAIL',
            expected: `DNS record TTL == ${expectedTtl}`,
            observed: evidence,
            reason: matched ? 'TTL matches expected value' : `TTL ${ttl} does not match expected ${expectedTtl}`,
            data: { recordName, type: record.Type, values, aliasValue, ttl, hostedZoneId }
        };
    }

    throw new Error(`Unsupported Route53 check type: ${check.type}`);
}

async function evaluateIAMCheck(check: Check, credentials: any): Promise<CheckResult> {
    const client = await AWSAdapter.getIAMClient(credentials);
    const { roleName, policyArn } = check.parameters;

    if (check.type === 'ROLE_EXISTS') {
        try {
            const command = new GetRoleCommand({ RoleName: roleName });
            const response = await client.send(command);
            return {
                checkId: check.id,
                alias: check.alias,
                status: 'PASS',
                expected: `IAM role ${roleName} exists`,
                observed: 'Role found',
                reason: 'IAM role exists',
                data: { roleName, arn: response.Role?.Arn, path: response.Role?.Path, createDate: response.Role?.CreateDate }
            };
        } catch (error: any) {
            return {
                checkId: check.id,
                alias: check.alias,
                status: 'FAIL',
                expected: `IAM role ${roleName} exists`,
                observed: 'Role not found',
                reason: error.message,
                data: { roleName }
            };
        }
    }

    if (check.type === 'ROLE_HAS_POLICY' || check.type === 'POLICY_ATTACHED_TO_RESOURCE') {
        const command = new ListAttachedRolePoliciesCommand({ RoleName: roleName });
        const response = await client.send(command);
        const hasPolicy = response.AttachedPolicies?.some(p => p.PolicyArn === policyArn);

        return {
            checkId: check.id,
            alias: check.alias,
            status: hasPolicy ? 'PASS' : 'FAIL',
            expected: `IAM policy ${policyArn} attached to role ${roleName}`,
            observed: hasPolicy ? 'Policy found' : 'Policy not found',
            reason: hasPolicy ? 'IAM policy is attached' : 'IAM policy is missing',
            data: { roleName, policyArn, attachedPolicies: response.AttachedPolicies }
        };
    }

    throw new Error(`Unsupported IAM check type: ${check.type}`);
}

async function evaluateS3Check(check: Check, credentials: any): Promise<CheckResult> {
    const client = await AWSAdapter.getS3Client(credentials, check.region || 'us-east-1');

    try {
        // Handle count-based check types first (these may not require bucketName)
        if (check.type === 'S3_BUCKET_COUNT') {
            const { expectedCount, namePrefix } = check.parameters;
            const operator = check.operator || 'EQUALS';

            const command = new ListBucketsCommand({});
            const response = await client.send(command);
            let buckets = response.Buckets || [];

            // Filter by name prefix if provided
            if (namePrefix) {
                buckets = buckets.filter(b => b.Name?.startsWith(namePrefix));
            }

            const bucketCount = buckets.length;
            const bucketNames = buckets.map(b => b.Name || 'unknown');

            const evalResult = evaluateOperator(operator, bucketCount, Number(expectedCount));
            const filterDesc = namePrefix ? ` (prefix: ${namePrefix})` : '';
            const evidence = `Count: ${bucketCount} | Buckets: ${bucketNames.slice(0, 5).join(', ')}${bucketNames.length > 5 ? '...' : ''}`;

            return {
                checkId: check.id,
                alias: check.alias,
                status: evalResult.passed ? 'PASS' : 'FAIL',
                expected: `bucket count ${operator} ${expectedCount}${filterDesc}`,
                observed: evidence,
                reason: evalResult.reason,
                data: { count: bucketCount, expectedCount: Number(expectedCount), operator, bucketNames: bucketNames.slice(0, 20) }
            };
        }

        if (check.type === 'S3_OBJECT_COUNT') {
            const { bucketName, expectedCount, prefix } = check.parameters;
            const operator = check.operator || 'EQUALS';

            if (!bucketName) {
                return {
                    checkId: check.id,
                    alias: check.alias,
                    status: 'FAIL',
                    expected: `object count ${operator} ${expectedCount}`,
                    observed: 'Missing bucketName parameter',
                    reason: 'bucketName is required for S3_OBJECT_COUNT check',
                    data: {}
                };
            }

            // List objects with optional prefix
            const listParams: any = { Bucket: bucketName, MaxKeys: 1000 };
            if (prefix) {
                listParams.Prefix = prefix;
            }

            let objectCount = 0;
            const objectKeys: string[] = [];
            let continuationToken: string | undefined;

            // Paginate through all objects
            do {
                if (continuationToken) {
                    listParams.ContinuationToken = continuationToken;
                }
                const command = new ListObjectsV2Command(listParams);
                const response = await client.send(command);

                const contents = response.Contents || [];
                objectCount += contents.length;
                objectKeys.push(...contents.slice(0, 10).map(o => o.Key || 'unknown'));

                continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;

                // Safety limit to prevent infinite loops
                if (objectCount > 10000) break;
            } while (continuationToken);

            const evalResult = evaluateOperator(operator, objectCount, Number(expectedCount));
            const filterDesc = prefix ? ` (prefix: ${prefix})` : '';
            const evidence = `Count: ${objectCount} | Sample keys: ${objectKeys.slice(0, 5).join(', ')}${objectKeys.length > 5 ? '...' : ''}`;

            return {
                checkId: check.id,
                alias: check.alias,
                status: evalResult.passed ? 'PASS' : 'FAIL',
                expected: `object count in ${bucketName} ${operator} ${expectedCount}${filterDesc}`,
                observed: evidence,
                reason: evalResult.reason,
                data: { bucketName, count: objectCount, expectedCount: Number(expectedCount), operator, sampleKeys: objectKeys.slice(0, 20) }
            };
        }

        // For bucket-specific checks, require bucketName
        const { bucketName } = check.parameters;

        if (check.type === 'S3_BUCKET_EXISTS') {
            const command = new HeadBucketCommand({ Bucket: bucketName });
            await client.send(command);
            return {
                checkId: check.id,
                alias: check.alias,
                status: 'PASS',
                expected: `S3 bucket ${bucketName} exists`,
                observed: 'Bucket exists',
                reason: 'Bucket was found using HeadBucket',
                data: { bucketName, region: check.region || 'us-east-1' }
            };
        }

        if (check.type === 'S3_BUCKET_POLICY_PRESENT') {
            try {
                const command = new GetBucketPolicyCommand({ Bucket: bucketName });
                const response = await client.send(command);
                const hasPolicy = !!response.Policy;
                return {
                    checkId: check.id,
                    alias: check.alias,
                    status: hasPolicy ? 'PASS' : 'FAIL',
                    expected: `S3 bucket ${bucketName} has a policy`,
                    observed: hasPolicy ? 'Policy found' : 'No policy found',
                    reason: hasPolicy ? 'Bucket policy is attached' : 'Bucket has no policy attached',
                    data: { bucketName, policy: response.Policy }
                };
            } catch (policyError: any) {
                if (policyError.name === 'NoSuchBucketPolicy') {
                    return {
                        checkId: check.id,
                        alias: check.alias,
                        status: 'FAIL',
                        expected: `S3 bucket ${bucketName} has a policy`,
                        observed: 'No policy found',
                        reason: 'Bucket has no policy attached',
                        data: { bucketName }
                    };
                }
                throw policyError;
            }
        }

        if (check.type === 'S3_BUCKET_PUBLIC_ACCESS_BLOCKED') {
            try {
                const command = new GetPublicAccessBlockCommand({ Bucket: bucketName });
                const response = await client.send(command);
                const isBlocked = response.PublicAccessBlockConfiguration?.BlockPublicAcls &&
                    response.PublicAccessBlockConfiguration?.BlockPublicPolicy &&
                    response.PublicAccessBlockConfiguration?.IgnorePublicAcls &&
                    response.PublicAccessBlockConfiguration?.RestrictPublicBuckets;

                return {
                    checkId: check.id,
                    alias: check.alias,
                    status: isBlocked ? 'PASS' : 'FAIL',
                    expected: 'All Public Access Block settings enabled',
                    observed: isBlocked ? 'All blocked' : 'Some settings not blocked',
                    reason: isBlocked ? 'Public access is fully blocked at bucket level' : 'Public access is NOT fully blocked',
                    data: { bucketName, config: response.PublicAccessBlockConfiguration }
                };
            } catch (pabError: any) {
                if (pabError.name === 'NoSuchPublicAccessBlockConfiguration') {
                    return {
                        checkId: check.id,
                        alias: check.alias,
                        status: 'FAIL',
                        expected: 'All Public Access Block settings enabled',
                        observed: 'No configuration found',
                        reason: 'Public Access Block is not configured for this bucket',
                        data: { bucketName }
                    };
                }
                throw pabError;
            }
        }

        if (check.type === 'S3_LIFECYCLE_CONFIGURED') {
            try {
                const command = new GetBucketLifecycleConfigurationCommand({ Bucket: bucketName });
                const response = await client.send(command);
                const hasRules = (response.Rules?.length || 0) > 0;

                return {
                    checkId: check.id,
                    alias: check.alias,
                    status: hasRules ? 'PASS' : 'FAIL',
                    expected: `S3 bucket ${bucketName} has lifecycle rules`,
                    observed: hasRules ? `${response.Rules?.length} rules found` : 'No lifecycle rules found',
                    reason: hasRules ? 'Lifecycle policy is active' : 'Bucket missing lifecycle configuration',
                    data: { bucketName, rulesCount: response.Rules?.length || 0, region: check.region || 'us-east-1' }
                };
            } catch (lifecycleError: any) {
                if (lifecycleError.name === 'NoSuchLifecycleConfiguration') {
                    return {
                        checkId: check.id,
                        alias: check.alias,
                        status: 'FAIL',
                        expected: `S3 bucket ${bucketName} has lifecycle rules`,
                        observed: 'No lifecycle configuration found',
                        reason: 'Bucket has no lifecycle policy',
                        data: { bucketName }
                    };
                }
                throw lifecycleError;
            }
        }

        if (check.type === 'S3_OBJECT_EXISTS') {
            const { objectKey } = check.parameters;
            try {
                const command = new HeadObjectCommand({ Bucket: bucketName, Key: objectKey });
                const response = await client.send(command);
                return {
                    checkId: check.id,
                    alias: check.alias,
                    status: 'PASS',
                    expected: `Object ${objectKey} exists in bucket ${bucketName}`,
                    observed: `Object exists (Size: ${response.ContentLength} bytes)`,
                    reason: 'Object found in bucket',
                    data: { bucketName, objectKey, size: response.ContentLength, lastModified: response.LastModified }
                };
            } catch (objectError: any) {
                if (objectError.name === 'NotFound' || objectError.$metadata?.httpStatusCode === 404) {
                    return {
                        checkId: check.id,
                        alias: check.alias,
                        status: 'FAIL',
                        expected: `Object ${objectKey} exists in bucket ${bucketName}`,
                        observed: 'Object not found',
                        reason: 'HeadObject returned 404',
                        data: { bucketName, objectKey }
                    };
                }
                throw objectError;
            }
        }

        throw new Error(`Unsupported S3 check type: ${check.type}`);
    } catch (error: any) {
        return {
            checkId: check.id,
            alias: check.alias,
            status: 'FAIL',
            expected: 'Successful S3 API call',
            observed: 'API Error',
            reason: error.message,
            data: { bucketName: check.parameters?.bucketName }
        };
    }
}

async function evaluateRDSCheck(check: Check, credentials: any): Promise<CheckResult> {
    const { dbInstanceIdentifier } = check.parameters;
    const client = await AWSAdapter.getRDSClient(credentials, check.region || 'us-east-1');

    try {
        const command = new DescribeDBInstancesCommand({ DBInstanceIdentifier: dbInstanceIdentifier });
        const response = await client.send(command);
        const dbInstance = response.DBInstances?.[0];

        if (!dbInstance) {
            return {
                checkId: check.id,
                status: 'FAIL',
                expected: 'RDS instance exists',
                observed: 'Not found',
                reason: `RDS instance ${dbInstanceIdentifier} not found`,
            };
        }

        const state = dbInstance.DBInstanceStatus;
        const publicAccess = dbInstance.PubliclyAccessible;
        const encrypted = dbInstance.StorageEncrypted;
        const engine = dbInstance.Engine;
        const instanceClass = dbInstance.DBInstanceClass;

        const evidence = `Status: ${state} | Public: ${publicAccess} | Encrypted: ${encrypted} | Engine: ${engine} | Class: ${instanceClass}`;

        if (check.type === 'RDS_INSTANCE_AVAILABLE') {
            return {
                checkId: check.id,
                alias: check.alias,
                status: state === 'available' ? 'PASS' : 'FAIL',
                expected: 'status == available',
                observed: evidence,
                reason: state === 'available' ? `RDS instance is available` : `RDS instance is ${state}`,
                data: { dbInstanceIdentifier, state, publicAccess, encrypted, engine, instanceClass }
            };
        }

        if (check.type === 'RDS_PUBLIC_ACCESS_DISABLED') {
            return {
                checkId: check.id,
                alias: check.alias,
                status: !publicAccess ? 'PASS' : 'FAIL',
                expected: 'PubliclyAccessible == false',
                observed: evidence,
                reason: !publicAccess ? `RDS instance is not publicly accessible` : `RDS instance IS publicly accessible`,
                data: { dbInstanceIdentifier, state, publicAccess, encrypted, engine, instanceClass }
            };
        }

        if (check.type === 'RDS_ENCRYPTION_ENABLED') {
            return {
                checkId: check.id,
                alias: check.alias,
                status: encrypted ? 'PASS' : 'FAIL',
                expected: 'StorageEncrypted == true',
                observed: evidence,
                reason: encrypted ? `RDS storage is encrypted` : `RDS storage is NOT encrypted`,
                data: { dbInstanceIdentifier, state, publicAccess, encrypted, engine, instanceClass }
            };
        }

        if (check.type === 'RDS_IN_SUBNET_GROUP') {
            const { subnetGroupName: expectedSubnetGroup } = check.parameters;
            const actualSubnetGroup = dbInstance.DBSubnetGroup?.DBSubnetGroupName;
            const matched = actualSubnetGroup === expectedSubnetGroup;
            return {
                checkId: check.id,
                alias: check.alias,
                status: matched ? 'PASS' : 'FAIL',
                expected: `DB Subnet Group == ${expectedSubnetGroup}`,
                observed: evidence + ` | SubnetGroup: ${actualSubnetGroup}`,
                reason: matched ? `RDS instance is in subnet group ${expectedSubnetGroup}` : `RDS instance is in subnet group ${actualSubnetGroup} (expected ${expectedSubnetGroup})`,
                data: { dbInstanceIdentifier, state, publicAccess, encrypted, engine, instanceClass, subnetGroup: actualSubnetGroup }
            };
        }

        throw new Error(`Unsupported RDS check type: ${check.type}`);
    } catch (error: any) {
        return {
            checkId: check.id,
            status: 'FAIL',
            expected: 'Successful RDS API call',
            observed: 'API Error',
            reason: error.message,
        };
    }
}

async function evaluateECSCheck(check: Check, credentials: any): Promise<CheckResult> {
    const client = await AWSAdapter.getECSClient(credentials, check.region || 'us-east-1');

    try {
        if (check.type === 'ECS_CLUSTER_ACTIVE') {
            const { clusterName } = check.parameters;
            const command = new DescribeClustersCommand({ clusters: [clusterName] });
            const response = await client.send(command);
            const cluster = response.clusters?.[0];

            if (!cluster) {
                return {
                    checkId: check.id,
                    status: 'FAIL',
                    expected: 'ECS cluster exists',
                    observed: 'Not found',
                    reason: `ECS cluster ${clusterName} not found`,
                };
            }

            const status = cluster.status;
            const services = cluster.activeServicesCount;
            const tasks = cluster.runningTasksCount;
            const evidence = `Status: ${status} | Services: ${services} | Tasks: ${tasks}`;

            return {
                checkId: check.id,
                alias: check.alias,
                status: status === 'ACTIVE' ? 'PASS' : 'FAIL',
                expected: 'status == ACTIVE',
                observed: evidence,
                reason: status === 'ACTIVE' ? `ECS cluster is active` : `ECS cluster is ${status}`,
                data: { clusterName, status, services, tasks }
            };
        }

        if (check.type === 'ECS_SERVICE_RUNNING' || check.type === 'ECS_SERVICE_RUNNING_COUNT_EQUALS_DESIRED' || check.type === 'ECS_TASK_DEFINITION_REVISION_ACTIVE' || check.type === 'ECS_SERVICE_ATTACHED_TO_ALB') {
            const { clusterName, serviceName } = check.parameters;
            const command = new DescribeServicesCommand({ cluster: clusterName, services: [serviceName] });
            const response = await client.send(command);
            const service = response.services?.[0];

            if (!service) {
                return {
                    checkId: check.id,
                    status: 'FAIL',
                    expected: 'ECS service exists',
                    observed: 'Not found',
                    reason: `ECS service ${serviceName} not found in cluster ${clusterName}`,
                };
            }

            const running = service.runningCount;
            const desired = service.desiredCount;
            const status = service.status;
            const taskDef = service.taskDefinition;
            const loadBalancers = service.loadBalancers?.length || 0;
            const evidence = `Status: ${status} | Running: ${running}/${desired} | TaskDef: ${taskDef?.split('/').pop()} | LBs: ${loadBalancers}`;

            if (check.type === 'ECS_SERVICE_RUNNING') {
                const isHealthy = running !== undefined && desired !== undefined && running >= desired && status === 'ACTIVE';
                return {
                    checkId: check.id,
                    alias: check.alias,
                    status: isHealthy ? 'PASS' : 'FAIL',
                    expected: `runningCount >= desiredCount (${desired})`,
                    observed: evidence,
                    reason: isHealthy ? `ECS service is healthy` : `ECS service has insufficient tasks`,
                    data: { clusterName, serviceName, running, desired, status, taskDef, loadBalancers: service.loadBalancers }
                };
            }

            if (check.type === 'ECS_SERVICE_RUNNING_COUNT_EQUALS_DESIRED') {
                const matched = running === desired;
                return {
                    checkId: check.id,
                    alias: check.alias,
                    status: matched ? 'PASS' : 'FAIL',
                    expected: `runningCount == desiredCount (${desired})`,
                    observed: evidence,
                    reason: matched ? `Running count matches desired count` : `Running count (${running}) does not match desired (${desired})`,
                    data: { clusterName, serviceName, running, desired, status, taskDef, loadBalancers: service.loadBalancers }
                };
            }

            if (check.type === 'ECS_TASK_DEFINITION_REVISION_ACTIVE') {
                const { expectedTaskDefinition } = check.parameters;
                const matched = taskDef === expectedTaskDefinition || taskDef?.endsWith(expectedTaskDefinition);
                return {
                    checkId: check.id,
                    alias: check.alias,
                    status: matched ? 'PASS' : 'FAIL',
                    expected: `Task Definition == ${expectedTaskDefinition}`,
                    observed: evidence,
                    reason: matched ? `Active task definition matches expected` : `Active task definition is ${taskDef?.split('/').pop()}`,
                    data: { clusterName, serviceName, running, desired, status, taskDef, loadBalancers: service.loadBalancers }
                };
            }

            if (check.type === 'ECS_SERVICE_ATTACHED_TO_ALB') {
                const hasLb = loadBalancers > 0;
                return {
                    checkId: check.id,
                    alias: check.alias,
                    status: hasLb ? 'PASS' : 'FAIL',
                    expected: 'Service has load balancer attached',
                    observed: evidence,
                    reason: hasLb ? `Service is attached to ${loadBalancers} load balancer(s)` : `Service has no load balancer attached`,
                    data: { clusterName, serviceName, running, desired, status, taskDef, loadBalancers: service.loadBalancers }
                };
            }
        }

        throw new Error(`Unsupported ECS check type: ${check.type}`);
    } catch (error: any) {
        return {
            checkId: check.id,
            status: 'FAIL',
            expected: 'Successful ECS API call',
            observed: 'API Error',
            reason: error.message,
        };
    }
}

async function evaluateDynamoDBCheck(check: Check, credentials: any): Promise<CheckResult> {
    const { tableName } = check.parameters;
    const client = await AWSAdapter.getDynamoDBClient(credentials, check.region || 'us-east-1');

    try {
        const describeCommand = new DescribeTableCommand({ TableName: tableName });
        const response = await client.send(describeCommand);
        const table = response.Table;

        if (!table) {
            return {
                checkId: check.id,
                status: 'FAIL',
                expected: 'DynamoDB table exists',
                observed: 'Not found',
                reason: `DynamoDB table ${tableName} not found`,
            };
        }

        const tableStatus = table.TableStatus;
        const billingMode = table.BillingModeSummary?.BillingMode || 'PROVISIONED';
        const sseEnabled = table.SSEDescription?.Status === 'ENABLED' || table.SSEDescription?.Status === 'ENABLING';
        const deletionProtection = table.DeletionProtectionEnabled;
        const itemCount = table.ItemCount;
        const tableArn = table.TableArn;

        const evidence = `Status: ${tableStatus} | Billing: ${billingMode} | SSE: ${sseEnabled ? 'Enabled' : 'Disabled'} | DeletionProtection: ${deletionProtection} | Items: ${itemCount}`;

        if (check.type === 'TABLE_EXISTS') {
            return {
                checkId: check.id,
                alias: check.alias,
                status: 'PASS',
                expected: `DynamoDB table ${tableName} exists`,
                observed: evidence,
                reason: 'DynamoDB table exists',
                data: { tableName, tableArn, tableStatus, billingMode, sseEnabled, deletionProtection, itemCount }
            };
        }

        if (check.type === 'TABLE_STATUS_ACTIVE') {
            return {
                checkId: check.id,
                alias: check.alias,
                status: tableStatus === 'ACTIVE' ? 'PASS' : 'FAIL',
                expected: 'TableStatus == ACTIVE',
                observed: evidence,
                reason: tableStatus === 'ACTIVE' ? 'DynamoDB table is active' : `DynamoDB table status is ${tableStatus}`,
                data: { tableName, tableArn, tableStatus, billingMode, sseEnabled, deletionProtection, itemCount }
            };
        }

        if (check.type === 'BILLING_MODE_MATCHES') {
            const { expectedBillingMode } = check.parameters;
            const matched = billingMode === expectedBillingMode;
            return {
                checkId: check.id,
                alias: check.alias,
                status: matched ? 'PASS' : 'FAIL',
                expected: `BillingMode == ${expectedBillingMode}`,
                observed: evidence,
                reason: matched ? `Billing mode is ${expectedBillingMode}` : `Billing mode is ${billingMode} (expected ${expectedBillingMode})`,
                data: { tableName, tableArn, tableStatus, billingMode, sseEnabled, deletionProtection, itemCount }
            };
        }

        if (check.type === 'POINT_IN_TIME_RECOVERY_ENABLED') {
            const pitrCommand = new DescribeContinuousBackupsCommand({ TableName: tableName });
            const pitrResponse = await client.send(pitrCommand);
            const pitrEnabled = pitrResponse.ContinuousBackupsDescription?.PointInTimeRecoveryDescription?.PointInTimeRecoveryStatus === 'ENABLED';

            return {
                checkId: check.id,
                alias: check.alias,
                status: pitrEnabled ? 'PASS' : 'FAIL',
                expected: 'PointInTimeRecovery == ENABLED',
                observed: evidence + ` | PITR: ${pitrEnabled ? 'Enabled' : 'Disabled'}`,
                reason: pitrEnabled ? 'Point-in-time recovery is enabled' : 'Point-in-time recovery is NOT enabled',
                data: { tableName, tableArn, tableStatus, billingMode, sseEnabled, deletionProtection, itemCount, pitrEnabled }
            };
        }

        if (check.type === 'ENCRYPTION_ENABLED') {
            return {
                checkId: check.id,
                alias: check.alias,
                status: sseEnabled ? 'PASS' : 'FAIL',
                expected: 'SSE == ENABLED',
                observed: evidence,
                reason: sseEnabled ? 'Server-side encryption is enabled' : 'Server-side encryption is NOT enabled',
                data: { tableName, tableArn, tableStatus, billingMode, sseEnabled, deletionProtection, itemCount }
            };
        }

        if (check.type === 'DELETION_PROTECTION_ENABLED') {
            return {
                checkId: check.id,
                alias: check.alias,
                status: deletionProtection ? 'PASS' : 'FAIL',
                expected: 'DeletionProtectionEnabled == true',
                observed: evidence,
                reason: deletionProtection ? 'Deletion protection is enabled' : 'Deletion protection is NOT enabled',
                data: { tableName, tableArn, tableStatus, billingMode, sseEnabled, deletionProtection, itemCount }
            };
        }

        throw new Error(`Unsupported DynamoDB check type: ${check.type}`);
    } catch (error: any) {
        if (error.name === 'ResourceNotFoundException') {
            return {
                checkId: check.id,
                status: 'FAIL',
                expected: 'DynamoDB table exists',
                observed: 'Not found',
                reason: `DynamoDB table ${tableName} not found`,
            };
        }
        return {
            checkId: check.id,
            status: 'FAIL',
            expected: 'Successful DynamoDB API call',
            observed: 'API Error',
            reason: error.message,
        };
    }
}

async function evaluateLambdaCheck(check: Check, credentials: any): Promise<CheckResult> {
    const client = await AWSAdapter.getLambdaClient(credentials, check.region || 'us-east-1');

    try {
        // Handle count-based check types first (these don't require functionName)
        if (check.type === 'LAMBDA_FUNCTION_COUNT') {
            const { expectedCount, namePrefix, runtime: runtimeFilter } = check.parameters;
            const operator = check.operator || 'EQUALS';

            let functions: Array<{ FunctionName?: string; Runtime?: string; FunctionArn?: string }> = [];
            let marker: string | undefined;

            // Paginate through all functions
            do {
                const listParams: any = { MaxItems: 50 };
                if (marker) {
                    listParams.Marker = marker;
                }

                const command = new ListFunctionsCommand(listParams);
                const response = await client.send(command);

                functions.push(...(response.Functions || []));
                marker = response.NextMarker;

                // Safety limit
                if (functions.length > 1000) break;
            } while (marker);

            // Apply filters
            let filteredFunctions = functions;

            if (namePrefix) {
                filteredFunctions = filteredFunctions.filter(f => f.FunctionName?.startsWith(namePrefix));
            }

            if (runtimeFilter) {
                filteredFunctions = filteredFunctions.filter(f => f.Runtime === runtimeFilter);
            }

            const functionCount = filteredFunctions.length;
            const functionNames = filteredFunctions.map(f => f.FunctionName || 'unknown');

            const evalResult = evaluateOperator(operator, functionCount, Number(expectedCount));
            const filters: string[] = [];
            if (namePrefix) filters.push(`prefix: ${namePrefix}`);
            if (runtimeFilter) filters.push(`runtime: ${runtimeFilter}`);
            const filterDesc = filters.length > 0 ? ` (${filters.join(', ')})` : '';
            const evidence = `Count: ${functionCount} | Functions: ${functionNames.slice(0, 5).join(', ')}${functionNames.length > 5 ? '...' : ''}`;

            return {
                checkId: check.id,
                alias: check.alias,
                status: evalResult.passed ? 'PASS' : 'FAIL',
                expected: `function count ${operator} ${expectedCount}${filterDesc}`,
                observed: evidence,
                reason: evalResult.reason,
                data: { count: functionCount, expectedCount: Number(expectedCount), operator, functionNames: functionNames.slice(0, 20), region: check.region || 'us-east-1' }
            };
        }

        // For function-specific checks, require functionName
        const { functionName } = check.parameters;

        const getFunctionCommand = new GetFunctionCommand({ FunctionName: functionName });
        const response = await client.send(getFunctionCommand);
        const config = response.Configuration;

        if (!config) {
            return {
                checkId: check.id,
                status: 'FAIL',
                expected: 'Lambda function exists',
                observed: 'Not found',
                reason: `Lambda function ${functionName} not found`,
            };
        }

        const functionArn = config.FunctionArn;
        const runtime = config.Runtime;
        const memorySize = config.MemorySize;
        const timeout = config.Timeout;
        const vpcConfig = config.VpcConfig;
        const deadLetterConfig = config.DeadLetterConfig;
        const layers = config.Layers || [];
        const environment = config.Environment?.Variables || {};

        const vpcConfigured = !!(vpcConfig?.VpcId && vpcConfig?.SubnetIds?.length);
        const dlqConfigured = !!deadLetterConfig?.TargetArn;

        const evidence = `Runtime: ${runtime} | Memory: ${memorySize}MB | Timeout: ${timeout}s | VPC: ${vpcConfigured ? 'Yes' : 'No'} | DLQ: ${dlqConfigured ? 'Yes' : 'No'} | Layers: ${layers.length}`;

        if (check.type === 'VPC_CONFIGURED') {
            return {
                checkId: check.id,
                alias: check.alias,
                status: vpcConfigured ? 'PASS' : 'FAIL',
                expected: 'Lambda function is VPC-configured',
                observed: evidence,
                reason: vpcConfigured ? `Lambda is deployed in VPC ${vpcConfig?.VpcId}` : 'Lambda is NOT deployed in a VPC',
                data: { functionName, functionArn, runtime, memorySize, timeout, vpcId: vpcConfig?.VpcId, subnetIds: vpcConfig?.SubnetIds, securityGroupIds: vpcConfig?.SecurityGroupIds }
            };
        }

        if (check.type === 'RESERVED_CONCURRENCY_SET') {
            const concurrencyCommand = new GetFunctionConcurrencyCommand({ FunctionName: functionName });
            const concurrencyResponse = await client.send(concurrencyCommand);
            const reservedConcurrency = concurrencyResponse.ReservedConcurrentExecutions;
            const hasReservedConcurrency = reservedConcurrency !== undefined && reservedConcurrency !== null;

            return {
                checkId: check.id,
                alias: check.alias,
                status: hasReservedConcurrency ? 'PASS' : 'FAIL',
                expected: 'Reserved concurrency is set',
                observed: evidence + ` | ReservedConcurrency: ${hasReservedConcurrency ? reservedConcurrency : 'Not set'}`,
                reason: hasReservedConcurrency ? `Reserved concurrency is set to ${reservedConcurrency}` : 'Reserved concurrency is NOT set',
                data: { functionName, functionArn, runtime, memorySize, timeout, reservedConcurrency }
            };
        }

        if (check.type === 'FUNCTION_URL_AUTH_TYPE') {
            const { expectedAuthType } = check.parameters;
            try {
                const urlCommand = new GetFunctionUrlConfigCommand({ FunctionName: functionName });
                const urlResponse = await client.send(urlCommand);
                const authType = urlResponse.AuthType;
                const matched = authType === expectedAuthType;

                return {
                    checkId: check.id,
                    alias: check.alias,
                    status: matched ? 'PASS' : 'FAIL',
                    expected: `Function URL AuthType == ${expectedAuthType}`,
                    observed: evidence + ` | FunctionURL AuthType: ${authType}`,
                    reason: matched ? `Function URL auth type is ${expectedAuthType}` : `Function URL auth type is ${authType} (expected ${expectedAuthType})`,
                    data: { functionName, functionArn, functionUrl: urlResponse.FunctionUrl, authType }
                };
            } catch (urlError: any) {
                if (urlError.name === 'ResourceNotFoundException') {
                    return {
                        checkId: check.id,
                        alias: check.alias,
                        status: 'FAIL',
                        expected: `Function URL AuthType == ${expectedAuthType}`,
                        observed: 'No Function URL configured',
                        reason: 'Lambda function does not have a Function URL configured',
                        data: { functionName, functionArn }
                    };
                }
                throw urlError;
            }
        }

        if (check.type === 'ENVIRONMENT_VARIABLE_EXISTS') {
            const { variableName } = check.parameters;
            const hasVariable = variableName in environment;

            return {
                checkId: check.id,
                alias: check.alias,
                status: hasVariable ? 'PASS' : 'FAIL',
                expected: `Environment variable ${variableName} exists`,
                observed: evidence + ` | EnvVars: ${Object.keys(environment).join(', ') || 'None'}`,
                reason: hasVariable ? `Environment variable ${variableName} is set` : `Environment variable ${variableName} is NOT set`,
                data: { functionName, functionArn, runtime, environmentVariables: Object.keys(environment), hasVariable }
            };
        }

        if (check.type === 'LAYER_ATTACHED') {
            const { layerArn } = check.parameters;
            const hasLayer = layers.some(layer => layer.Arn === layerArn || layer.Arn?.includes(layerArn));

            return {
                checkId: check.id,
                alias: check.alias,
                status: hasLayer ? 'PASS' : 'FAIL',
                expected: `Layer ${layerArn} is attached`,
                observed: evidence + ` | AttachedLayers: ${layers.map(l => l.Arn?.split(':').slice(-2).join(':')).join(', ') || 'None'}`,
                reason: hasLayer ? `Layer ${layerArn} is attached` : `Layer ${layerArn} is NOT attached`,
                data: { functionName, functionArn, runtime, layers: layers.map(l => l.Arn) }
            };
        }

        if (check.type === 'DEAD_LETTER_QUEUE_CONFIGURED') {
            return {
                checkId: check.id,
                alias: check.alias,
                status: dlqConfigured ? 'PASS' : 'FAIL',
                expected: 'Dead letter queue is configured',
                observed: evidence + ` | DLQ ARN: ${deadLetterConfig?.TargetArn || 'None'}`,
                reason: dlqConfigured ? `Dead letter queue is configured: ${deadLetterConfig?.TargetArn}` : 'Dead letter queue is NOT configured',
                data: { functionName, functionArn, runtime, dlqArn: deadLetterConfig?.TargetArn }
            };
        }

        throw new Error(`Unsupported Lambda check type: ${check.type}`);
    } catch (error: any) {
        if (error.name === 'ResourceNotFoundException') {
            return {
                checkId: check.id,
                status: 'FAIL',
                expected: 'Lambda function exists',
                observed: 'Not found',
                reason: `Lambda function ${check.parameters?.functionName} not found`,
            };
        }
        return {
            checkId: check.id,
            status: 'FAIL',
            expected: 'Successful Lambda API call',
            observed: 'API Error',
            reason: error.message,
        };
    }
}

async function evaluateCloudFrontCheck(check: Check, credentials: any): Promise<CheckResult> {
    const client = await AWSAdapter.getCloudFrontClient(credentials);

    try {
        if (check.type === 'DISTRIBUTION_EXISTS') {
            const { distributionId } = check.parameters;
            const command = new GetDistributionCommand({ Id: distributionId });
            const response = await client.send(command);
            const distribution = response.Distribution;

            if (!distribution) {
                return {
                    checkId: check.id,
                    alias: check.alias,
                    status: 'FAIL',
                    expected: `CloudFront distribution ${distributionId} exists`,
                    observed: 'Distribution not found',
                    reason: `CloudFront distribution ${distributionId} not found`,
                    data: { distributionId }
                };
            }

            const status = distribution.Status;
            const domainName = distribution.DomainName;
            const enabled = distribution.DistributionConfig?.Enabled;
            const evidence = `ID: ${distributionId} | Status: ${status} | Domain: ${domainName} | Enabled: ${enabled}`;

            return {
                checkId: check.id,
                alias: check.alias,
                status: 'PASS',
                expected: `CloudFront distribution ${distributionId} exists`,
                observed: evidence,
                reason: 'CloudFront distribution exists',
                data: { distributionId, status, domainName, enabled }
            };
        }

        if (check.type === 'DISTRIBUTION_ENABLED') {
            const { distributionId } = check.parameters;
            const command = new GetDistributionCommand({ Id: distributionId });
            const response = await client.send(command);
            const distribution = response.Distribution;

            if (!distribution) {
                return {
                    checkId: check.id,
                    alias: check.alias,
                    status: 'FAIL',
                    expected: `CloudFront distribution ${distributionId} is enabled`,
                    observed: 'Distribution not found',
                    reason: `CloudFront distribution ${distributionId} not found`,
                    data: { distributionId }
                };
            }

            const enabled = distribution.DistributionConfig?.Enabled;
            const status = distribution.Status;
            const domainName = distribution.DomainName;
            const evidence = `ID: ${distributionId} | Status: ${status} | Domain: ${domainName} | Enabled: ${enabled}`;

            return {
                checkId: check.id,
                alias: check.alias,
                status: enabled ? 'PASS' : 'FAIL',
                expected: 'Distribution.Enabled == true',
                observed: evidence,
                reason: enabled ? 'CloudFront distribution is enabled' : 'CloudFront distribution is NOT enabled',
                data: { distributionId, status, domainName, enabled }
            };
        }

        if (check.type === 'ORIGIN_EXISTS') {
            const { distributionId, originId } = check.parameters;
            const command = new GetDistributionCommand({ Id: distributionId });
            const response = await client.send(command);
            const distribution = response.Distribution;

            if (!distribution) {
                return {
                    checkId: check.id,
                    alias: check.alias,
                    status: 'FAIL',
                    expected: `Origin ${originId} exists in distribution ${distributionId}`,
                    observed: 'Distribution not found',
                    reason: `CloudFront distribution ${distributionId} not found`,
                    data: { distributionId, originId }
                };
            }

            const origins = distribution.DistributionConfig?.Origins?.Items || [];
            const origin = origins.find(o => o.Id === originId);
            const originIds = origins.map(o => o.Id).join(', ');
            const evidence = `Distribution: ${distributionId} | Origins: ${originIds}`;

            return {
                checkId: check.id,
                alias: check.alias,
                status: origin ? 'PASS' : 'FAIL',
                expected: `Origin ${originId} exists`,
                observed: evidence,
                reason: origin ? `Origin ${originId} found in distribution` : `Origin ${originId} NOT found in distribution`,
                data: { distributionId, originId, origins: origins.map(o => ({ id: o.Id, domainName: o.DomainName })) }
            };
        }

        if (check.type === 'DEFAULT_ROOT_OBJECT_SET') {
            const { distributionId } = check.parameters;
            const command = new GetDistributionCommand({ Id: distributionId });
            const response = await client.send(command);
            const distribution = response.Distribution;

            if (!distribution) {
                return {
                    checkId: check.id,
                    alias: check.alias,
                    status: 'FAIL',
                    expected: `CloudFront distribution ${distributionId} has default root object`,
                    observed: 'Distribution not found',
                    reason: `CloudFront distribution ${distributionId} not found`,
                    data: { distributionId }
                };
            }

            const defaultRootObject = distribution.DistributionConfig?.DefaultRootObject;
            const hasDefaultRoot = !!defaultRootObject && defaultRootObject.length > 0;
            const evidence = `Distribution: ${distributionId} | DefaultRootObject: ${defaultRootObject || 'Not set'}`;

            return {
                checkId: check.id,
                alias: check.alias,
                status: hasDefaultRoot ? 'PASS' : 'FAIL',
                expected: 'DefaultRootObject is set',
                observed: evidence,
                reason: hasDefaultRoot ? `Default root object is set to ${defaultRootObject}` : 'Default root object is NOT set',
                data: { distributionId, defaultRootObject }
            };
        }

        if (check.type === 'VIEWER_PROTOCOL_HTTPS_ONLY') {
            const { distributionId } = check.parameters;
            const command = new GetDistributionCommand({ Id: distributionId });
            const response = await client.send(command);
            const distribution = response.Distribution;

            if (!distribution) {
                return {
                    checkId: check.id,
                    alias: check.alias,
                    status: 'FAIL',
                    expected: `CloudFront distribution ${distributionId} uses HTTPS only`,
                    observed: 'Distribution not found',
                    reason: `CloudFront distribution ${distributionId} not found`,
                    data: { distributionId }
                };
            }

            const viewerProtocolPolicy = distribution.DistributionConfig?.DefaultCacheBehavior?.ViewerProtocolPolicy;
            const isHttpsOnly = viewerProtocolPolicy === 'https-only' || viewerProtocolPolicy === 'redirect-to-https';
            const evidence = `Distribution: ${distributionId} | ViewerProtocolPolicy: ${viewerProtocolPolicy}`;

            return {
                checkId: check.id,
                alias: check.alias,
                status: isHttpsOnly ? 'PASS' : 'FAIL',
                expected: 'ViewerProtocolPolicy == https-only or redirect-to-https',
                observed: evidence,
                reason: isHttpsOnly ? `Viewer protocol is ${viewerProtocolPolicy}` : `Viewer protocol allows HTTP (${viewerProtocolPolicy})`,
                data: { distributionId, viewerProtocolPolicy }
            };
        }

        if (check.type === 'WAF_ENABLED') {
            const { distributionId } = check.parameters;
            const command = new GetDistributionCommand({ Id: distributionId });
            const response = await client.send(command);
            const distribution = response.Distribution;

            if (!distribution) {
                return {
                    checkId: check.id,
                    alias: check.alias,
                    status: 'FAIL',
                    expected: `CloudFront distribution ${distributionId} has WAF enabled`,
                    observed: 'Distribution not found',
                    reason: `CloudFront distribution ${distributionId} not found`,
                    data: { distributionId }
                };
            }

            const webAclId = distribution.DistributionConfig?.WebACLId;
            const hasWaf = !!webAclId && webAclId.length > 0;
            const evidence = `Distribution: ${distributionId} | WebACLId: ${webAclId || 'Not configured'}`;

            return {
                checkId: check.id,
                alias: check.alias,
                status: hasWaf ? 'PASS' : 'FAIL',
                expected: 'WebACLId is configured',
                observed: evidence,
                reason: hasWaf ? `WAF is enabled with ACL ${webAclId}` : 'WAF is NOT enabled',
                data: { distributionId, webAclId }
            };
        }

        if (check.type === 'ORIGIN_ACCESS_CONTROL_CONFIGURED') {
            const { distributionId } = check.parameters;
            const command = new GetDistributionCommand({ Id: distributionId });
            const response = await client.send(command);
            const distribution = response.Distribution;

            if (!distribution) {
                return {
                    checkId: check.id,
                    alias: check.alias,
                    status: 'FAIL',
                    expected: `CloudFront distribution ${distributionId} has OAC configured`,
                    observed: 'Distribution not found',
                    reason: `CloudFront distribution ${distributionId} not found`,
                    data: { distributionId }
                };
            }

            const origins = distribution.DistributionConfig?.Origins?.Items || [];
            const originsWithOac = origins.filter(o => o.OriginAccessControlId && o.OriginAccessControlId.length > 0);
            const hasOac = originsWithOac.length > 0;
            const evidence = `Distribution: ${distributionId} | Origins with OAC: ${originsWithOac.length}/${origins.length}`;

            return {
                checkId: check.id,
                alias: check.alias,
                status: hasOac ? 'PASS' : 'FAIL',
                expected: 'At least one origin has OriginAccessControlId configured',
                observed: evidence,
                reason: hasOac ? `${originsWithOac.length} origin(s) have OAC configured` : 'No origins have OAC configured',
                data: { distributionId, totalOrigins: origins.length, originsWithOac: originsWithOac.length }
            };
        }

        throw new Error(`Unsupported CloudFront check type: ${check.type}`);
    } catch (error: any) {
        return {
            checkId: check.id,
            alias: check.alias,
            status: 'FAIL',
            expected: 'Successful CloudFront API call',
            observed: 'API Error',
            reason: error.message,
        };
    }
}

async function evaluateConfigServiceCheck(check: Check, credentials: any): Promise<CheckResult> {
    const client = await AWSAdapter.getConfigServiceClient(credentials, check.region || 'us-east-1');

    try {
        if (check.type === 'CONFIG_RECORDER_ACTIVE') {
            const recorderCommand = new DescribeConfigurationRecordersCommand({});
            const recorderResponse = await client.send(recorderCommand);
            const recorders = recorderResponse.ConfigurationRecorders || [];

            if (recorders.length === 0) {
                return {
                    checkId: check.id,
                    alias: check.alias,
                    status: 'FAIL',
                    expected: 'AWS Config recorder exists and is active',
                    observed: 'No configuration recorders found',
                    reason: 'No AWS Config recorders configured in this region',
                    data: { region: check.region || 'us-east-1' }
                };
            }

            const statusCommand = new DescribeConfigurationRecorderStatusCommand({});
            const statusResponse = await client.send(statusCommand);
            const statuses = statusResponse.ConfigurationRecordersStatus || [];
            const activeRecorders = statuses.filter(s => s.recording === true);
            const recorderNames = recorders.map(r => r.name).join(', ');
            const evidence = `Recorders: ${recorderNames} | Active: ${activeRecorders.length}/${recorders.length}`;

            return {
                checkId: check.id,
                alias: check.alias,
                status: activeRecorders.length > 0 ? 'PASS' : 'FAIL',
                expected: 'At least one recorder is active',
                observed: evidence,
                reason: activeRecorders.length > 0 ? `${activeRecorders.length} recorder(s) actively recording` : 'No recorders are actively recording',
                data: { recorders: recorderNames, activeCount: activeRecorders.length, totalCount: recorders.length }
            };
        }

        if (check.type === 'CONFIG_RULE_COMPLIANT') {
            const { ruleName } = check.parameters;
            const command = new DescribeComplianceByConfigRuleCommand({ ConfigRuleNames: [ruleName] });
            const response = await client.send(command);
            const compliance = response.ComplianceByConfigRules?.[0];

            if (!compliance) {
                return {
                    checkId: check.id,
                    alias: check.alias,
                    status: 'FAIL',
                    expected: `Config rule ${ruleName} is compliant`,
                    observed: 'Rule not found',
                    reason: `Config rule ${ruleName} not found`,
                    data: { ruleName }
                };
            }

            const complianceType = compliance.Compliance?.ComplianceType;
            const isCompliant = complianceType === 'COMPLIANT';
            const evidence = `Rule: ${ruleName} | ComplianceType: ${complianceType}`;

            return {
                checkId: check.id,
                alias: check.alias,
                status: isCompliant ? 'PASS' : 'FAIL',
                expected: 'ComplianceType == COMPLIANT',
                observed: evidence,
                reason: isCompliant ? `Config rule ${ruleName} is compliant` : `Config rule ${ruleName} is ${complianceType}`,
                data: { ruleName, complianceType }
            };
        }

        if (check.type === 'DELIVERY_CHANNEL_CONFIGURED') {
            const command = new DescribeDeliveryChannelsCommand({});
            const response = await client.send(command);
            const channels = response.DeliveryChannels || [];

            const hasChannels = channels.length > 0;
            const channelNames = channels.map(c => c.name).join(', ');
            const s3Buckets = channels.map(c => c.s3BucketName).join(', ');
            const evidence = `Channels: ${channelNames || 'None'} | S3 Buckets: ${s3Buckets || 'None'}`;

            return {
                checkId: check.id,
                alias: check.alias,
                status: hasChannels ? 'PASS' : 'FAIL',
                expected: 'At least one delivery channel is configured',
                observed: evidence,
                reason: hasChannels ? `${channels.length} delivery channel(s) configured` : 'No delivery channels configured',
                data: { channels: channels.map(c => ({ name: c.name, s3Bucket: c.s3BucketName, snsTopicArn: c.snsTopicARN })) }
            };
        }

        if (check.type === 'RESOURCE_COMPLIANT') {
            const { resourceType, resourceId } = check.parameters;
            const command = new GetComplianceDetailsByResourceCommand({
                ResourceType: resourceType,
                ResourceId: resourceId
            });
            const response = await client.send(command);
            const evaluationResults = response.EvaluationResults || [];

            if (evaluationResults.length === 0) {
                return {
                    checkId: check.id,
                    alias: check.alias,
                    status: 'FAIL',
                    expected: `Resource ${resourceId} is compliant`,
                    observed: 'No evaluation results found',
                    reason: `No compliance data found for resource ${resourceId}`,
                    data: { resourceType, resourceId }
                };
            }

            const nonCompliantResults = evaluationResults.filter(e => e.ComplianceType !== 'COMPLIANT');
            const isCompliant = nonCompliantResults.length === 0;
            const evidence = `Resource: ${resourceId} | Type: ${resourceType} | Non-compliant rules: ${nonCompliantResults.length}`;

            return {
                checkId: check.id,
                alias: check.alias,
                status: isCompliant ? 'PASS' : 'FAIL',
                expected: 'All rules compliant for resource',
                observed: evidence,
                reason: isCompliant ? `Resource ${resourceId} is compliant with all rules` : `Resource ${resourceId} has ${nonCompliantResults.length} non-compliant rule(s)`,
                data: { resourceType, resourceId, totalRules: evaluationResults.length, nonCompliantCount: nonCompliantResults.length }
            };
        }

        if (check.type === 'CONFORMANCE_PACK_COMPLIANT') {
            const { conformancePackName } = check.parameters;
            const command = new DescribeConformancePackComplianceCommand({
                ConformancePackName: conformancePackName
            });
            const response = await client.send(command);
            const rules = response.ConformancePackRuleComplianceList || [];

            if (rules.length === 0) {
                return {
                    checkId: check.id,
                    alias: check.alias,
                    status: 'FAIL',
                    expected: `Conformance pack ${conformancePackName} is compliant`,
                    observed: 'No rules found in conformance pack',
                    reason: `No rules found for conformance pack ${conformancePackName}`,
                    data: { conformancePackName }
                };
            }

            const nonCompliantRules = rules.filter(r => r.ComplianceType !== 'COMPLIANT');
            const isCompliant = nonCompliantRules.length === 0;
            const evidence = `Pack: ${conformancePackName} | Rules: ${rules.length} | Non-compliant: ${nonCompliantRules.length}`;

            return {
                checkId: check.id,
                alias: check.alias,
                status: isCompliant ? 'PASS' : 'FAIL',
                expected: 'All rules in conformance pack are compliant',
                observed: evidence,
                reason: isCompliant ? `Conformance pack ${conformancePackName} is fully compliant` : `Conformance pack has ${nonCompliantRules.length} non-compliant rule(s)`,
                data: { conformancePackName, totalRules: rules.length, nonCompliantCount: nonCompliantRules.length }
            };
        }

        if (check.type === 'AGGREGATOR_CONFIGURED') {
            const command = new DescribeConfigurationAggregatorsCommand({});
            const response = await client.send(command);
            const aggregators = response.ConfigurationAggregators || [];

            const hasAggregators = aggregators.length > 0;
            const aggregatorNames = aggregators.map(a => a.ConfigurationAggregatorName).join(', ');
            const evidence = `Aggregators: ${aggregatorNames || 'None'} | Count: ${aggregators.length}`;

            return {
                checkId: check.id,
                alias: check.alias,
                status: hasAggregators ? 'PASS' : 'FAIL',
                expected: 'At least one configuration aggregator is configured',
                observed: evidence,
                reason: hasAggregators ? `${aggregators.length} aggregator(s) configured` : 'No configuration aggregators configured',
                data: { aggregators: aggregators.map(a => ({ name: a.ConfigurationAggregatorName, arn: a.ConfigurationAggregatorArn })) }
            };
        }

        throw new Error(`Unsupported ConfigService check type: ${check.type}`);
    } catch (error: any) {
        return {
            checkId: check.id,
            alias: check.alias,
            status: 'FAIL',
            expected: 'Successful Config Service API call',
            observed: 'API Error',
            reason: error.message,
        };
    }
}

async function evaluatePingCheck(check: Check): Promise<CheckResult> {
    const { target } = check.parameters;
    const start = Date.now();
    try {
        // macOS/Linux ping -c 1. For Windows it would be -n 1.
        const { stdout } = await execAsync(`ping -c 1 -W 2 ${target}`);
        const latencyMatch = stdout.match(/time=([\d\.]+)\s+ms/);
        const latency = latencyMatch ? parseFloat(latencyMatch[1]) : 0;

        return {
            checkId: check.id,
            alias: check.alias,
            status: 'PASS',
            expected: `Ping ${target} responds`,
            observed: `Response in ${latency}ms`,
            reason: 'ICMP echo received',
            data: { target, latency }
        };
    } catch (error: any) {
        return {
            checkId: check.id,
            alias: check.alias,
            status: 'FAIL',
            expected: `Ping ${target} responds`,
            observed: 'No response',
            reason: 'Request timed out or host unreachable',
            data: { target }
        };
    }
}

async function evaluateHTTPCheck(check: Check): Promise<CheckResult> {
    const { url, expectedSubstring } = check.parameters;
    const start = Date.now();
    try {
        const response = await axios.get(url, { timeout: 5000 });
        const latency = Date.now() - start;
        const responseData = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

        let status: 'PASS' | 'FAIL' = response.status === 200 ? 'PASS' : 'FAIL';
        let reason = response.status === 200 ? 'Service returned healthy status' : `Service returned ${response.status}`;
        let expected = `HTTP GET ${url} returns 200 OK`;

        if (check.type === 'HTTP_RESPONSE_CONTAINS' && status === 'PASS') {
            expected = `HTTP GET ${url} returns 200 OK and contains "${expectedSubstring}"`;
            const contains = responseData.includes(expectedSubstring);
            status = contains ? 'PASS' : 'FAIL';
            reason = contains ? `Response contains "${expectedSubstring}"` : `Response does NOT contain "${expectedSubstring}"`;
        }

        return {
            checkId: check.id,
            alias: check.alias,
            status,
            expected,
            observed: `Status ${response.status} (${latency}ms)`,
            reason,
            data: { url, status: response.status, latency, contentType: response.headers['content-type'], server: response.headers['server'] }
        };
    } catch (error: any) {
        const latency = Date.now() - start;
        return {
            checkId: check.id,
            alias: check.alias,
            status: 'FAIL',
            expected: check.type === 'HTTP_RESPONSE_CONTAINS' ? `HTTP GET ${url} returns 200 OK and contains "${expectedSubstring}"` : `HTTP GET ${url} returns 200 OK`,
            observed: error.response?.status ? `Status ${error.response.status}` : 'Request failed',
            reason: error.message,
            data: { url, status: error.response?.status, error: error.message, latency }
        };
    }
}

export const evaluateGroup = async (groupId: string) => {
    const group = await InvariantGroup.findByPk(groupId, {
        include: [{ model: Check, as: 'checks' }, { model: AWSAccount }],
        order: [[{ model: Check, as: 'checks' }, 'createdAt', 'ASC']]
    });

    if (!group || !group.AWSAccount) {
        throw new Error('Group or associated AWS Account not found');
    }

    // Skip evaluation if no checks defined
    const checks = (group as any).checks || [];
    if (checks.length === 0) {
        return {
            groupId: group.id,
            status: group.lastStatus || 'PENDING',
            oldStatus: group.lastStatus,
            results: [],
            changed: false,
            skipped: true,
            reason: 'No checks defined'
        };
    }

    const results: CheckResult[] = [];
    const context: Record<string, any> = {};

    for (const check of (group as any).checks) {
        const result = await evaluateCheck(check, (group as any).AWSAccount, context);
        results.push(result);

        // Populate context if alias is present
        if (check.alias && result.data) {
            context[check.alias] = result.data;
        }
    }

    const allPassed = results.every(r => r.status === 'PASS');
    const newStatus = allPassed ? 'PASS' : 'FAIL';

    const oldStatus = group.lastStatus;
    group.lastStatus = newStatus;
    group.lastEvaluatedAt = new Date();
    await group.save();

    // Persist History
    const run = await EvaluationRun.create({
        groupId: group.id,
        status: newStatus,
        evaluatedAt: group.lastEvaluatedAt,
    });

    for (const res of results) {
        await CheckResultLog.create({
            runId: run.id,
            checkId: res.checkId,
            status: res.status,
            expected: res.expected,
            observed: res.observed,
            reason: res.reason,
        });
    }

    return {
        groupId: group.id,
        status: newStatus,
        oldStatus,
        results,
        changed: oldStatus !== newStatus && oldStatus !== 'PENDING',
    };
};
