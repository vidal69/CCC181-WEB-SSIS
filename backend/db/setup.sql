-- Create database if it doesn't exist
SELECT 'CREATE DATABASE ssis_web'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ssis_web')\gexec

-- Create user if it doesn't exist
SELECT 'CREATE USER ssis_user WITH PASSWORD ''postgres123'''
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ssis_user')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ssis_web TO ssis_user;
