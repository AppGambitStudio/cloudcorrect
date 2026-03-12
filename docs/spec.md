# Architecture Invariants Monitoring
## User Stories & Technical Specification (MVP – Region & Global Aware)

---

## 1. Product Overview

Architecture Invariants Monitoring is a lightweight system that continuously validates
**architectural correctness** by evaluating predefined **invariant groups** composed of
region-aware and global AWS resource checks.

The system focuses on **intent validation**, not metric-based monitoring.

---

## 2. Core Principles

- API-based validation (no agents, no telemetry)
- Explicit configuration over auto-discovery
- Low noise, high-confidence alerts
- Deterministic and explainable failures
- Region-aware and global resource handling

---

## 3. Core Concepts

### 3.1 Check

A **Check** is an atomic assertion against a cloud resource.

Each check:
- Targets a single AWS service
- Has a defined scope (GLOBAL or REGIONAL)
- Produces a semantic evaluation result

---

### 3.2 Invariant Group

An **Invariant Group** is a collection of checks that must **all pass** for the group
to be considered healthy.

A group represents an architectural expectation.

---

### 3.3 Resource Scope

Each check explicitly declares its scope:

- GLOBAL  
  - Example: Route53, IAM
- REGIONAL  
  - Example: EC2, ALB, ECS, Lambda

Region is mandatory for REGIONAL checks.

---

## 4. User Stories

---

### Epic 1: Invariant Group Management

#### US-1: Create Invariant Group
As an operator,  
I want to create an invariant group  
So that I can define how a system is expected to behave.

**Acceptance Criteria**
- Group includes:
  - Name
  - Description
  - AWS Account ID
  - Evaluation interval (minutes)
  - Enabled flag
- Group can contain one or more checks

---

#### US-2: Update Invariant Group
As an operator,  
I want to modify an existing group  
So that architecture changes are reflected.

**Acceptance Criteria**
- Checks can be added or removed
- Changes apply on next evaluation cycle

---

#### US-3: Disable Invariant Group
As an operator,  
I want to disable a group  
So that it no longer generates alerts.

---

### Epic 2: Check Definition

#### US-4: Add Regional Check
As an operator,  
I want to define a check for a regional AWS resource  
So that the correct region is evaluated.

**Acceptance Criteria**
- Region is mandatory
- Validation fails if region is missing

---

#### US-5: Add Global Check
As an operator,  
I want to define a check for a global AWS resource  
So that account-wide dependencies are validated.

**Acceptance Criteria**
- Region field is ignored or disabled
- Global AWS endpoints are used

---

#### US-6: View Check Result
As an operator,  
I want to see detailed check results  
So that failures are immediately actionable.

**Acceptance Criteria**
- Result includes:
  - Status
  - Expected state
  - Observed state
  - Failure reason

---

### Epic 3: Evaluation & Alerting

#### US-7: Periodic Group Evaluation
As the system,  
I want to evaluate invariant groups periodically  
So that architecture drift is detected.

---

#### US-8: Alert on State Change
As an operator,  
I want alerts only when group state changes  
So that alert fatigue is avoided.

**Acceptance Criteria**
- Alerts triggered only on:
  - PASS → FAIL
  - FAIL → PASS

---

#### US-9: Receive Actionable Alerts
As an operator,  
I want alerts that clearly explain what failed  
So that I can take corrective action without dashboards.

---

## 5. MVP Scope

---

### 5.1 Supported Services

| Service  | Scope     |
|--------|-----------|
| EC2    | REGIONAL  |
| ALB    | REGIONAL  |
| Route53| GLOBAL    |
| IAM    | GLOBAL    |

---

### 5.2 Supported Check Types

| Service  | Scope     | Check Description |
|--------|-----------|------------------|
| EC2    | REGIONAL  | Instance state is running |
| EC2    | REGIONAL  | Instance has public IP |
| ALB    | REGIONAL  | Target group has ≥1 healthy target |
| Route53| GLOBAL    | DNS record resolves to expected value |
| IAM    | GLOBAL    | IAM role exists |
| IAM    | GLOBAL    | IAM role has required policy attached |

---

## 6. System Architecture

---

### 6.1 High-Level Flow

1. Scheduler triggers evaluation
2. Evaluation worker fetches group configuration
3. Checks executed using AWS APIs
4. Results aggregated
5. Group state evaluated
6. Alert emitted if state changed

---

### 6.2 Components

- Scheduler (Event-based / cron)
- Evaluation Worker (stateless)
- AWS API Adapters
- Alert Dispatcher
- Persistence Store

---

## 7. Data Models

---

### 7.1 Invariant Group

```json
{
  "id": "group-123",
  "name": "Public Web Entry",
  "description": "DNS must point to live EC2",
  "accountId": "123456789012",
  "intervalMinutes": 5,
  "enabled": true
}

### 7.2 Check (Regional)

```json
{
  "id": "check-456",
  "groupId": "group-123",
  "service": "EC2",
  "scope": "REGIONAL",
  "region": "ap-south-1",
  "type": "INSTANCE_RUNNING",
  "parameters": {
    "instanceId": "i-0abc123"
  }
}

### 7.3 Check (Global)

```json
{
  "id": "check-789",
  "groupId": "group-123",
  "service": "Route53",
  "scope": "GLOBAL",
  "type": "DNS_POINTS_TO",
  "parameters": {
    "recordName": "api.example.com",
    "expectedValue": "alb-dns-name"
  }
}
```

### 7.4 Group State

```json
{
  "groupId": "group-123",
  "lastStatus": "FAIL",
  "lastEvaluatedAt": "2026-01-05T10:15:00Z"
}
```

## 8. Check Evaluation Contract

All checks MUST return the following structure:

```json
{
  "checkId": "check-456",
  "status": "PASS | FAIL",
  "expected": "instance.state == running",
  "observed": "instance.state == stopped",
  "reason": "EC2 instance is stopped"
}
```

This contract is mandatory and immutable.

## 9. Group Evaluation Logic

```txt
IF all checks PASS
  Group Status = PASS
ELSE
  Group Status = FAIL
```

No scoring, weighting, or partial success in MVP.

## 10. Alert Payload

```json
{
  "group": "Public Web Entry – ap-south-1",
  "status": "FAIL",
  "failedChecks": [
    {
      "service": "Route53",
      "scope": "GLOBAL",
      "reason": "DNS record points to outdated ALB DNS name"
    }
  ],
  "timestamp": "2026-01-05T10:15:00Z"
}
```

## 11. Non-Goals (Explicit)

No metrics dashboards
No auto-discovery
No YAML/DSL configs
No AI-generated checks
No real-time monitoring
No dependency graphs

## 12. Extension Strategy

The system is extended by:
- Adding new check types
- Adding new service adapters

Core evaluation logic remains unchanged.

## 13. Success Criteria

This MVP is successful if:
- A measurable reduction in CloudWatch alerts is achieved
- Engineers trust invariant alerts without secondary verification

Architecture drift is detected before user impact