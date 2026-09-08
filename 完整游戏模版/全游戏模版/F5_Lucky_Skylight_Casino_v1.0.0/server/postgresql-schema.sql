CREATE TABLE accounts (
  id uuid PRIMARY KEY,
  username text NOT NULL UNIQUE,
  nickname text NOT NULL,
  avatar smallint NOT NULL DEFAULT 0 CHECK (avatar BETWEEN 0 AND 11),
  settings jsonb NOT NULL DEFAULT '{"music":true,"sound":true,"vibration":true,"quality":"medium","language":"en"}'::jsonb,
  app_account_token uuid NOT NULL UNIQUE,
  apple_subject text,
  password_hash bytea,
  password_salt bytea,
  is_guest boolean NOT NULL DEFAULT false,
  terms_version text,
  privacy_version text,
  terms_accepted_at timestamptz,
  age_confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE UNIQUE INDEX accounts_apple_subject_unique_idx ON accounts(apple_subject) WHERE apple_subject IS NOT NULL;

CREATE TABLE sessions (
  token_hash bytea PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  csrf_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_account_id_idx ON sessions(account_id);
CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE wallets (
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  balance bigint NOT NULL CHECK (balance >= 0),
  version bigint NOT NULL DEFAULT 0
);

CREATE TABLE rounds (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  request_id text NOT NULL,
  game_id text NOT NULL,
  bet bigint NOT NULL CHECK (bet > 0),
  win bigint NOT NULL CHECK (win >= 0),
  result_json jsonb NOT NULL,
  balance_after bigint NOT NULL CHECK (balance_after >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, request_id)
);

CREATE TABLE wallet_transactions (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  round_id uuid REFERENCES rounds(id) ON DELETE SET NULL,
  kind text NOT NULL,
  amount bigint NOT NULL,
  balance_after bigint NOT NULL CHECK (balance_after >= 0),
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, idempotency_key)
);

CREATE TABLE purchase_receipts (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  platform text NOT NULL,
  external_transaction_id text NOT NULL,
  product_id text NOT NULL,
  status text NOT NULL,
  credited_amount bigint NOT NULL CHECK (credited_amount > 0),
  revoked_at timestamptz,
  verified_payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform, external_transaction_id)
);

CREATE TABLE reward_claims (
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  reward_key text NOT NULL,
  amount bigint NOT NULL CHECK (amount > 0),
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, reward_key)
);

CREATE TABLE app_store_notifications (
  notification_uuid uuid PRIMARY KEY,
  notification_type text NOT NULL,
  transaction_id text,
  received_at timestamptz NOT NULL DEFAULT now()
);
