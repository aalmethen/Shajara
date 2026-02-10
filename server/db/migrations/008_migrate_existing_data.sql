-- Migration 008: Migrate existing data to universal person graph
-- Must run AFTER 007_universal_person_graph.sql

-- ============================================================
-- Step 1: Copy family_tree_id → home_tree_id for all existing persons
-- ============================================================
UPDATE persons SET home_tree_id = family_tree_id WHERE home_tree_id IS NULL;

-- ============================================================
-- Step 2: Ensure root_person_id is set on all trees
-- ============================================================
UPDATE family_trees ft
SET root_person_id = (
  SELECT p.id FROM persons p
  WHERE p.family_tree_id = ft.id
    AND p.father_id IS NULL
  ORDER BY p.created_at
  LIMIT 1
)
WHERE ft.root_person_id IS NULL;

-- Fallback: if no root found (all persons have fathers), pick the oldest
UPDATE family_trees ft
SET root_person_id = (
  SELECT p.id FROM persons p
  WHERE p.family_tree_id = ft.id
  ORDER BY p.created_at
  LIMIT 1
)
WHERE ft.root_person_id IS NULL
  AND EXISTS (SELECT 1 FROM persons WHERE family_tree_id = ft.id);

-- ============================================================
-- Step 3: Set default traversal config
-- ============================================================
UPDATE family_trees
SET traversal_mode = 'descendants', depth_limit = 20
WHERE traversal_mode IS NULL;

-- ============================================================
-- Step 4: Drop family_tree_id from persons
-- ============================================================
-- First drop the index
DROP INDEX IF EXISTS idx_persons_family_tree;

-- Drop the column (this also drops the FK constraint)
ALTER TABLE persons DROP COLUMN IF EXISTS family_tree_id;

-- ============================================================
-- Step 5: Drop family_tree_id from spouses
-- ============================================================
ALTER TABLE spouses DROP COLUMN IF EXISTS family_tree_id;

-- ============================================================
-- Step 6: Add new indexes for graph traversal performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_persons_father_mother ON persons(father_id, mother_id);
CREATE INDEX IF NOT EXISTS idx_persons_home_tree ON persons(home_tree_id);
CREATE INDEX IF NOT EXISTS idx_persons_created_by ON persons(created_by);
