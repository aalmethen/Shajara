-- Migration 007: Universal Person Graph
-- Converts from tree-scoped persons to a global person graph.
-- A "tree" becomes a view: root_person_id + traversal_mode + depth_limit.

-- ============================================================
-- Step 1: Add traversal config to family_trees
-- ============================================================
ALTER TABLE family_trees
  ADD COLUMN IF NOT EXISTS traversal_mode VARCHAR(20) DEFAULT 'descendants',
  ADD COLUMN IF NOT EXISTS depth_limit INTEGER DEFAULT 20;

-- ============================================================
-- Step 2: Add home_tree_id to persons (provenance tracking)
-- ============================================================
ALTER TABLE persons
  ADD COLUMN IF NOT EXISTS home_tree_id UUID REFERENCES family_trees(id) ON DELETE SET NULL;

-- ============================================================
-- Step 3: Make audit_log.family_tree_id nullable
-- ============================================================
ALTER TABLE audit_log ALTER COLUMN family_tree_id DROP NOT NULL;

-- ============================================================
-- Step 4: Create graph traversal function using PL/pgSQL
-- ============================================================
CREATE OR REPLACE FUNCTION get_tree_person_ids(
  p_root_id UUID,
  p_mode VARCHAR DEFAULT 'descendants',
  p_depth INTEGER DEFAULT 20
)
RETURNS TABLE(person_id UUID, depth INTEGER)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  IF p_mode = 'descendants' THEN
    RETURN QUERY
    WITH RECURSIVE traversal AS (
      SELECT id AS person_id, 0 AS depth
      FROM persons
      WHERE id = p_root_id

      UNION ALL

      SELECT p.id, t.depth + 1
      FROM persons p
      INNER JOIN traversal t ON (p.father_id = t.person_id OR p.mother_id = t.person_id)
      WHERE t.depth < p_depth
    )
    SELECT DISTINCT ON (t2.person_id) t2.person_id, MIN(t2.depth) AS depth
    FROM traversal t2
    WHERE t2.person_id IS NOT NULL
    GROUP BY t2.person_id
    ORDER BY t2.person_id;

  ELSIF p_mode = 'ancestors' THEN
    RETURN QUERY
    WITH RECURSIVE traversal AS (
      SELECT id AS person_id, 0 AS depth
      FROM persons
      WHERE id = p_root_id

      UNION ALL

      SELECT
        CASE WHEN step.dir = 'f' THEN p.father_id ELSE p.mother_id END,
        t.depth + 1
      FROM traversal t
      INNER JOIN persons p ON p.id = t.person_id
      CROSS JOIN (VALUES ('f'), ('m')) AS step(dir)
      WHERE t.depth < p_depth
        AND CASE WHEN step.dir = 'f' THEN p.father_id ELSE p.mother_id END IS NOT NULL
    )
    SELECT DISTINCT ON (t2.person_id) t2.person_id, MIN(t2.depth) AS depth
    FROM traversal t2
    WHERE t2.person_id IS NOT NULL
    GROUP BY t2.person_id
    ORDER BY t2.person_id;

  ELSE
    -- 'both' mode: descendants + ancestors
    RETURN QUERY
    WITH RECURSIVE desc_traversal AS (
      SELECT id AS person_id, 0 AS depth
      FROM persons
      WHERE id = p_root_id

      UNION ALL

      SELECT p.id, t.depth + 1
      FROM persons p
      INNER JOIN desc_traversal t ON (p.father_id = t.person_id OR p.mother_id = t.person_id)
      WHERE t.depth < p_depth
    ),
    anc_traversal AS (
      SELECT id AS person_id, 0 AS depth
      FROM persons
      WHERE id = p_root_id

      UNION ALL

      SELECT
        CASE WHEN step.dir = 'f' THEN p.father_id ELSE p.mother_id END,
        t.depth + 1
      FROM anc_traversal t
      INNER JOIN persons p ON p.id = t.person_id
      CROSS JOIN (VALUES ('f'), ('m')) AS step(dir)
      WHERE t.depth < p_depth
        AND CASE WHEN step.dir = 'f' THEN p.father_id ELSE p.mother_id END IS NOT NULL
    ),
    combined AS (
      SELECT person_id, depth FROM desc_traversal
      UNION ALL
      SELECT person_id, depth FROM anc_traversal
    )
    SELECT DISTINCT ON (c.person_id) c.person_id, MIN(c.depth) AS depth
    FROM combined c
    WHERE c.person_id IS NOT NULL
    GROUP BY c.person_id
    ORDER BY c.person_id;
  END IF;
END;
$$;

-- ============================================================
-- Step 5: Create function to also include spouses of reachable persons
-- ============================================================
CREATE OR REPLACE FUNCTION get_tree_person_ids_with_spouses(
  p_root_id UUID,
  p_mode VARCHAR DEFAULT 'descendants',
  p_depth INTEGER DEFAULT 20
)
RETURNS TABLE(person_id UUID, depth INTEGER)
LANGUAGE SQL STABLE
AS $$
  WITH base_persons AS (
    SELECT * FROM get_tree_person_ids(p_root_id, p_mode, p_depth)
  ),
  spouse_persons AS (
    -- Spouses of reachable persons who are NOT already in the base set
    SELECT
      CASE
        WHEN s.person_a_id = bp.person_id THEN s.person_b_id
        ELSE s.person_a_id
      END AS person_id,
      bp.depth AS depth
    FROM spouses s
    INNER JOIN base_persons bp ON (s.person_a_id = bp.person_id OR s.person_b_id = bp.person_id)
  )
  SELECT bp2.person_id, bp2.depth FROM base_persons bp2
  UNION
  SELECT sp.person_id, MIN(sp.depth)
  FROM spouse_persons sp
  WHERE NOT EXISTS (SELECT 1 FROM base_persons bp3 WHERE bp3.person_id = sp.person_id)
  GROUP BY sp.person_id;
$$;
