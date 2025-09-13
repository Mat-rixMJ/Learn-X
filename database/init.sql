-- Initialize Learn-X Database for Docker
-- This script runs when the PostgreSQL container starts

-- Create database if it doesn't exist
CREATE DATABASE learnx;

-- Connect to the learnx database
\c learnx;

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone
SET timezone = 'UTC';