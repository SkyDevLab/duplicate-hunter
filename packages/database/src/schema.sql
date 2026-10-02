-- ====================================================================
-- Duplicate Hunter PostgreSQL Schema
-- Supports pgvector for vector similarity search
-- ====================================================================

-- 1. Enable pgvector extension (if available)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Installations Table
CREATE TABLE IF NOT EXISTS installations (
  id VARCHAR(64) PRIMARY KEY,
  github_installation_id BIGINT UNIQUE NOT NULL,
  account_login VARCHAR(255) NOT NULL,
  account_type VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Repositories Table
CREATE TABLE IF NOT EXISTS repositories (
  id VARCHAR(64) PRIMARY KEY,
  installation_id VARCHAR(64) REFERENCES installations(id) ON DELETE CASCADE,
  github_repo_id BIGINT UNIQUE NOT NULL,
  owner VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  full_name VARCHAR(512) NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_repo_owner_name ON repositories(owner, name);

-- 4. Issues & PR Metadata Table
CREATE TABLE IF NOT EXISTS issues (
  id VARCHAR(64) PRIMARY KEY,
  repository_id VARCHAR(64) REFERENCES repositories(id) ON DELETE CASCADE,
  github_issue_number INT NOT NULL,
  title VARCHAR(1024) NOT NULL,
  body TEXT,
  state VARCHAR(32) NOT NULL, -- 'open' or 'closed'
  is_pull_request BOOLEAN DEFAULT FALSE,
  author VARCHAR(255) NOT NULL,
  labels JSONB DEFAULT '[]'::jsonb,
  url VARCHAR(1024) NOT NULL,
  closed_at TIMESTAMP WITH TIME ZONE,
  fixed_in_release VARCHAR(128),
  embedding_vector vector(128),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_repo_issue UNIQUE (repository_id, github_issue_number)
);

CREATE INDEX IF NOT EXISTS idx_issues_repo_state ON issues(repository_id, state);
CREATE INDEX IF NOT EXISTS idx_issues_updated ON issues(updated_at DESC);

-- 5. Duplicate Detections Table
CREATE TABLE IF NOT EXISTS detections (
  id VARCHAR(64) PRIMARY KEY,
  repository_id VARCHAR(64) REFERENCES repositories(id) ON DELETE CASCADE,
  trigger_issue_number INT NOT NULL,
  trigger_issue_title VARCHAR(1024) NOT NULL,
  candidate_issue_number INT NOT NULL,
  candidate_issue_title VARCHAR(1024) NOT NULL,
  is_candidate_pr BOOLEAN DEFAULT FALSE,
  confidence VARCHAR(32) NOT NULL, -- 'high', 'medium', 'low'
  score REAL NOT NULL,
  signals JSONB NOT NULL,
  difference_summary TEXT,
  status VARCHAR(32) DEFAULT 'pending', -- 'pending', 'reviewed', 'confirmed', 'dismissed'
  maintainer_decision VARCHAR(64), -- 'confirmed_duplicate', 'related', 'not_related', 'false_positive'
  bot_comment_id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_detections_repo ON detections(repository_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_detections_status ON detections(status);

-- 6. Maintainer Review Feedback Table
CREATE TABLE IF NOT EXISTS maintainer_reviews (
  id VARCHAR(64) PRIMARY KEY,
  detection_id VARCHAR(64) REFERENCES detections(id) ON DELETE CASCADE,
  reviewer VARCHAR(255) NOT NULL,
  decision VARCHAR(64) NOT NULL, -- 'confirmed_duplicate', 'related', 'not_related', 'false_positive'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_decision ON maintainer_reviews(decision);
