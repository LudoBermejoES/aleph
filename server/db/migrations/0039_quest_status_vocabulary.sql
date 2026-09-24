-- Rescue every quest whose status is outside the declared vocabulary.
-- Written as NOT IN rather than = 'on_hold' on purpose: `on_hold` is the value we know about
-- (POST accepted it while the transition table did not, so those rows were frozen), but any other
-- stray value -- a direct SQL edit, a restored backup, an older export -- is stuck the same way
-- and deserves the same rescue.
UPDATE `quests` SET `status` = 'active'
WHERE `status` NOT IN ('active', 'completed', 'failed', 'abandoned');
