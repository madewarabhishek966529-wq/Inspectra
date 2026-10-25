ALTER TABLE findings ADD COLUMN IF NOT EXISTS detection_method VARCHAR(128);
ALTER TABLE findings ADD COLUMN IF NOT EXISTS technical_explanation TEXT;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS verification_procedure TEXT;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS remediation_status VARCHAR(32) DEFAULT 'OPEN';
