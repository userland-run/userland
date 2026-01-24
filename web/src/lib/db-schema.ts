export const SCHEMA = `
-- VM Templates (base configurations)
CREATE TABLE IF NOT EXISTS vm_templates (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  description VARCHAR,
  memory_mb INTEGER DEFAULT 512,
  filesystem_url VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- VM Instances
CREATE TABLE IF NOT EXISTS vm_instances (
  id VARCHAR PRIMARY KEY,
  template_id VARCHAR,
  name VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'stopped',
  state_opfs_path VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_started_at TIMESTAMP
);

-- App Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  description VARCHAR,
  packages VARCHAR,
  scripts VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Profile Installations (which profiles are installed on which instances)
CREATE TABLE IF NOT EXISTS instance_profiles (
  instance_id VARCHAR,
  profile_id VARCHAR,
  installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (instance_id, profile_id)
);

-- OPFS Disk Registry
CREATE TABLE IF NOT EXISTS disks (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  opfs_path VARCHAR NOT NULL,
  size_bytes BIGINT,
  type VARCHAR,
  instance_id VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default template
INSERT OR IGNORE INTO vm_templates (id, name, description, memory_mb, filesystem_url)
VALUES ('alpine-default', 'Alpine Linux', 'Alpine Linux i386 base image', 512, '/alpine/');
`;
