-- Migration: Create initial database schema
-- Version: 001
-- Created: 2025-01-XX

BEGIN;

-- This migration creates the initial database schema for LearnX platform
-- Run this after creating the database

-- Check if migration has already been run
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(10) PRIMARY KEY,
    applied_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Only proceed if this migration hasn't been applied
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = '001') THEN
        -- Run the main schema file
        \i '../schema.sql'
        
        -- Record this migration
        INSERT INTO schema_migrations (version) VALUES ('001');
        
        RAISE NOTICE 'Migration 001 applied successfully';
    ELSE
        RAISE NOTICE 'Migration 001 already applied, skipping';
    END IF;
END $$;

COMMIT;