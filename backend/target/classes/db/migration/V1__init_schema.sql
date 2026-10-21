-- Flyway Migration V1: Inspectra Master Schema

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'ROLE_USER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(64) PRIMARY KEY,
    owner_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_url VARCHAR(1024) NOT NULL,
    configuration_json TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);

CREATE TABLE IF NOT EXISTS test_runs (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    requested_by VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    target_url VARCHAR(1024) NOT NULL,
    scoring_version VARCHAR(32) DEFAULT '1.0',
    overall_score INT,
    metrics_json TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_runs_project ON test_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_status ON test_runs(status);

CREATE TABLE IF NOT EXISTS discovered_pages (
    id VARCHAR(64) PRIMARY KEY,
    test_run_id VARCHAR(64) NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
    url VARCHAR(1024) NOT NULL,
    title VARCHAR(512),
    discovery_status VARCHAR(32),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS test_results (
    id VARCHAR(64) PRIMARY KEY,
    test_run_id VARCHAR(64) NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    url VARCHAR(1024),
    status VARCHAR(32) NOT NULL,
    duration_ms BIGINT,
    expected_outcome TEXT,
    actual_outcome TEXT,
    error_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_results_run ON test_results(test_run_id);
CREATE INDEX IF NOT EXISTS idx_test_results_status ON test_results(status);

CREATE TABLE IF NOT EXISTS findings (
    id VARCHAR(64) PRIMARY KEY,
    test_run_id VARCHAR(64) NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
    title VARCHAR(512) NOT NULL,
    category VARCHAR(64) NOT NULL,
    severity VARCHAR(32) NOT NULL,
    affected_url VARCHAR(1024) NOT NULL,
    description TEXT,
    reproduction_steps_json TEXT,
    expected_result TEXT,
    actual_result TEXT,
    suggested_fix TEXT,
    confidence DOUBLE PRECISION DEFAULT 1.0,
    verification_status VARCHAR(32) DEFAULT 'verified',
    evidence_json TEXT,
    ai_enhanced BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_findings_run ON findings(test_run_id);
CREATE INDEX IF NOT EXISTS idx_findings_severity ON findings(severity);
CREATE INDEX IF NOT EXISTS idx_findings_category ON findings(category);

CREATE TABLE IF NOT EXISTS test_artifacts (
    id VARCHAR(64) PRIMARY KEY,
    test_run_id VARCHAR(64) NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
    finding_id VARCHAR(64),
    artifact_type VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    storage_path VARCHAR(1024) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS execution_events (
    id VARCHAR(64) PRIMARY KEY,
    test_run_id VARCHAR(64) NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
    sequence_number INT,
    event_type VARCHAR(32) NOT NULL,
    step VARCHAR(64),
    message TEXT,
    payload_json TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_run ON execution_events(test_run_id);
