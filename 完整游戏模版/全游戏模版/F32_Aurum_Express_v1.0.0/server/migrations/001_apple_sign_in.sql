BEGIN;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS apple_subject text;
CREATE UNIQUE INDEX IF NOT EXISTS accounts_apple_subject_unique_idx ON accounts(apple_subject) WHERE apple_subject IS NOT NULL;
COMMIT;
