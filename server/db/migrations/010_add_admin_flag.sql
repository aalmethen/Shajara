-- Migration 010: Add global admin flag to users
-- Allows designated users to view and edit all trees.

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Make the seed admin user a global admin
UPDATE users SET is_admin = true WHERE email = 'admin@shajara.app';
