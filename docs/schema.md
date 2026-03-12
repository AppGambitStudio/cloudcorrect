# Architecture Invariants Monitoring
## JSON Schemas (MVP – Region & Global Aware)

---

## 1. Invariant Group Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/schemas/invariant-group.json",
  "title": "InvariantGroup",
  "type": "object",
  "required": [
    "id",
    "name",
    "accountId",
    "intervalMinutes",
    "enabled"
  ],
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier for the invariant group"
    },
    "name": {
      "type": "string",
      "description": "Human-readable group name"
    },
    "description": {
      "type": "string",
      "description": "Description of architectural intent"
    },
    "accountId": {
      "type": "string",
      "pattern": "^[0-9]{12}$",
      "description": "AWS account ID"
    },
    "intervalMinutes": {
      "type": "integer",
      "minimum": 1,
      "description": "Evaluation frequency in minutes"
    },
    "enabled": {
      "type": "boolean",
      "description": "Whether the group is actively evaluated"
    }
  },
  "additionalProperties": false
}
```

## 2. Check Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/schemas/check.json",
  "title": "Check",
  "type": "object",
  "required": [
    "id",
    "groupId",
    "service",
    "scope",
    "type",
    "parameters"
  ],
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier for the check"
    },
    "groupId": {
      "type": "string",
      "description": "Associated invariant group ID"
    },
    "service": {
      "type": "string",
      "enum": ["EC2", "ALB", "Route53", "IAM"],
      "description": "AWS service name"
    },
    "scope": {
      "type": "string",
      "enum": ["GLOBAL", "REGIONAL"],
      "description": "Resource scope"
    },
    "region": {
      "type": "string",
      "description": "AWS region (required for REGIONAL scope)",
      "pattern": "^[a-z]{2}-[a-z]+-[0-9]$"
    },
    "type": {
      "type": "string",
      "description": "Check type identifier"
    },
    "parameters": {
      "type": "object",
      "description": "Check-specific configuration"
    }
  },
  "allOf": [
    {
      "if": {
        "properties": { "scope": { "const": "REGIONAL" } }
      },
      "then": {
        "required": ["region"]
      }
    }
  ],
  "additionalProperties": false
}
```

## 3. Check Result Schema

This is the mandatory contract every check execution must return.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/schemas/check-result.json",
  "title": "CheckResult",
  "type": "object",
  "required": [
    "checkId",
    "status",
    "expected",
    "observed",
    "reason"
  ],
  "properties": {
    "checkId": {
      "type": "string",
      "description": "Check identifier"
    },
    "status": {
      "type": "string",
      "enum": ["PASS", "FAIL"]
    },
    "expected": {
      "type": "string",
      "description": "Expected state description"
    },
    "observed": {
      "type": "string",
      "description": "Observed state description"
    },
    "reason": {
      "type": "string",
      "description": "Human-readable explanation"
    }
  },
  "additionalProperties": false
}
```

## 4. Group Evaluation Result Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/schemas/group-evaluation.json",
  "title": "GroupEvaluationResult",
  "type": "object",
  "required": [
    "groupId",
    "status",
    "evaluatedAt",
    "checkResults"
  ],
  "properties": {
    "groupId": {
      "type": "string",
      "description": "Invariant group identifier"
    },
    "status": {
      "type": "string",
      "enum": ["PASS", "FAIL"]
    },
    "evaluatedAt": {
      "type": "string",
      "format": "date-time"
    },
    "checkResults": {
      "type": "array",
      "items": {
        "$ref": "check-result.json"
      }
    }
  },
  "additionalProperties": false
}
```

## 5. Persisted Group State Schema

Used to detect state transitions.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/schemas/group-state.json",
  "title": "GroupState",
  "type": "object",
  "required": [
    "groupId",
    "lastStatus",
    "lastEvaluatedAt"
  ],
  "properties": {
    "groupId": {
      "type": "string"
    },
    "lastStatus": {
      "type": "string",
      "enum": ["PASS", "FAIL"]
    },
    "lastEvaluatedAt": {
      "type": "string",
      "format": "date-time"
    }
  },
  "additionalProperties": false
}
```

## 6. Alert Payload Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/schemas/alert-payload.json",
  "title": "AlertPayload",
  "type": "object",
  "required": [
    "group",
    "status",
    "failedChecks",
    "timestamp"
  ],
  "properties": {
    "group": {
      "type": "string",
      "description": "Invariant group name"
    },
    "status": {
      "type": "string",
      "enum": ["PASS", "FAIL"]
    },
    "failedChecks": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["service", "scope", "reason"],
        "properties": {
          "service": {
            "type": "string"
          },
          "scope": {
            "type": "string",
            "enum": ["GLOBAL", "REGIONAL"]
          },
          "region": {
            "type": "string"
          },
          "reason": {
            "type": "string"
          }
        },
        "additionalProperties": false
      }
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    }
  },
  "additionalProperties": false
}
```

