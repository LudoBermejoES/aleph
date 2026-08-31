## ADDED Requirements

### Requirement: The embedding backfill converges

The one-time embedding backfill SHALL stop attempting an entity it has failed to embed after a
bounded number of runs, recording the failure so the give-up is inspectable and reversible. A run
in which every remaining entity has been given up on SHALL report no failures and no work done.

#### Scenario: A missing content file is retried, then given up on

GIVEN an entity whose `filePath` points at a file that does not exist
WHEN the backfill runs three times
THEN each run counts it as failed
AND the fourth run counts it as permanently skipped instead, and reports zero failures

#### Scenario: Giving up on one entity does not stop the others

GIVEN one entity that has been given up on and one healthy entity with no embedding
WHEN the backfill runs
THEN the healthy entity is embedded
AND the given-up entity is skipped without an attempt

#### Scenario: The failure is inspectable

GIVEN an entity that has failed twice
WHEN `entity_embedding_failures` is queried for it
THEN it holds an attempt count of 2, the error message from the last attempt, and a timestamp

#### Scenario: Clearing the record makes it try again

GIVEN an entity the backfill has given up on, whose content file has since been restored
WHEN its row is deleted from `entity_embedding_failures` and the backfill runs
THEN the entity is embedded

#### Scenario: A success clears an earlier failure record

GIVEN an entity with a failure record whose content file has since been restored
WHEN the backfill embeds it successfully
THEN its failure record is removed
