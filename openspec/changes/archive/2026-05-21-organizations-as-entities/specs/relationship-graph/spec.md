## ADDED Requirements

### Requirement: Organizations participate in entity relations

The relations API SHALL accept organization entity IDs as `sourceEntityId` and `targetEntityId`. Because every organization has a paired entity row of `type = 'organization'`, no special-case logic is required at the relations layer — the existing entity validation succeeds for org entity IDs.

#### Scenario: Creating a relation with an organization as source

- **GIVEN** organization `iron-circle` in campaign C with paired entity row `e1`
- **AND** location `the-foundry` in campaign C with entity row `e2`
- **AND** the requesting user has role editor or above
- **WHEN** they POST `/api/campaigns/C/relations` with `{ sourceEntityId: e1, targetEntityId: e2, forwardLabel: "controls", reverseLabel: "controlled by" }`
- **THEN** the server returns 201 with the new relation id
- **AND** the relation appears on both the org's and the location's relation lists

#### Scenario: Creating a relation between two organizations

- **GIVEN** organizations `iron-circle` and `silver-circle` in campaign C
- **AND** the requesting user has role editor or above
- **WHEN** they POST `/api/campaigns/C/relations` with both `sourceEntityId` and `targetEntityId` set to the orgs' entity rows
- **THEN** the server returns 201 with the new relation id
- **AND** the relation appears on both organizations' relation lists

#### Scenario: Relation create with non-existent org rejected

- **GIVEN** a request body where `sourceEntityId` refers to no row in `entities`
- **WHEN** the user POSTs `/api/campaigns/C/relations`
- **THEN** the server returns 404 with `Source entity not found`

#### Scenario: CLI resolves org slug for relation create

- **GIVEN** the user runs `aleph relation create --campaign C --source iron-circle --target the-foundry --forward controls --reverse "controlled by"`
- **WHEN** the CLI calls `GET /api/campaigns/C/entities/iron-circle` to resolve the slug
- **THEN** the server returns the org's entity row
- **AND** the subsequent POST `/api/campaigns/C/relations` succeeds with the resolved entity IDs
