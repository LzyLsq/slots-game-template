CREATE TABLE accounts (
  id uuid PRIMARY KEY,
  username text NOT NULL UNIQUE,
  nickname text NOT NULL,
  password_hash bytea,
  password_salt bytea,
  is_guest boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE wallets (
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  balance bigint NOT NULL CHECK (balance >= 0),
  version bigint NOT NULL DEFAULT 0
);

CREATE TABLE rounds (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id),
  request_id text NOT NULL,
  game_id text NOT NULL,
  bet bigint NOT NULL CHECK (bet > 0),
  win bigint NOT NULL CHECK (win >= 0),
  result_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, request_id)
);

CREATE TABLE wallet_transactions (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id),
  round_id uuid REFERENCES rounds(id),
  kind text NOT NULL,
  amount bigint NOT NULL,
  balance_after bigint NOT NULL CHECK (balance_after >= 0),
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, idempotency_key)
);

CREATE TABLE purchase_receipts (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id),
  platform text NOT NULL,
  external_transaction_id text NOT NULL,
  product_id text NOT NULL,
  status text NOT NULL,
  verified_payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform, external_transaction_id)
);

CREATE TABLE reward_claims (
  account_id uuid NOT NULL REFERENCES accounts(id),
  reward_key text NOT NULL,
  amount bigint NOT NULL CHECK (amount > 0),
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, reward_key)
);
