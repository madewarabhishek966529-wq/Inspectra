-- Flyway Migration V2: Autonomous Project Scheduling & Trends
ALTER TABLE projects ADD COLUMN IF NOT EXISTS schedule_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS schedule_frequency VARCHAR(64);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS schedule_cron VARCHAR(128);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_scheduled_run_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS alert_on_critical BOOLEAN DEFAULT TRUE;

ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS trigger_source VARCHAR(32) DEFAULT 'MANUAL';

CREATE INDEX IF NOT EXISTS idx_projects_schedule ON projects(schedule_enabled, next_run_at);
CREATE INDEX IF NOT EXISTS idx_test_runs_trigger ON test_runs(trigger_source);
