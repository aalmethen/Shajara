-- Migration 009: Include children of spouse-linked persons in traversal
-- When a wife is linked from another tree via spouse relationship,
-- her children (from other marriages in her own tree) should also appear.

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
    SELECT DISTINCT
      CASE
        WHEN s.person_a_id = bp.person_id THEN s.person_b_id
        ELSE s.person_a_id
      END AS person_id,
      bp.depth AS depth
    FROM spouses s
    INNER JOIN base_persons bp ON (s.person_a_id = bp.person_id OR s.person_b_id = bp.person_id)
  ),
  -- Only spouses not already in base
  new_spouses AS (
    SELECT sp.person_id, MIN(sp.depth) AS depth
    FROM spouse_persons sp
    WHERE NOT EXISTS (SELECT 1 FROM base_persons bp3 WHERE bp3.person_id = sp.person_id)
    GROUP BY sp.person_id
  ),
  -- Children of spouse-linked persons (from their other marriages/trees)
  spouse_children AS (
    SELECT p.id AS person_id, ns.depth + 1 AS depth
    FROM persons p
    INNER JOIN new_spouses ns ON (p.father_id = ns.person_id OR p.mother_id = ns.person_id)
    WHERE NOT EXISTS (SELECT 1 FROM base_persons bp4 WHERE bp4.person_id = p.id)
      AND NOT EXISTS (SELECT 1 FROM new_spouses ns2 WHERE ns2.person_id = p.id)
  ),
  -- The other parent of imported children (e.g., the father in the wife's other tree)
  other_parents AS (
    SELECT DISTINCT p.father_id AS person_id, sc.depth AS depth
    FROM spouse_children sc
    INNER JOIN persons p ON p.id = sc.person_id
    WHERE p.father_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM base_persons bp5 WHERE bp5.person_id = p.father_id)
      AND NOT EXISTS (SELECT 1 FROM new_spouses ns4 WHERE ns4.person_id = p.father_id)
      AND NOT EXISTS (SELECT 1 FROM spouse_children sc2 WHERE sc2.person_id = p.father_id)
    UNION
    SELECT DISTINCT p.mother_id AS person_id, sc.depth AS depth
    FROM spouse_children sc
    INNER JOIN persons p ON p.id = sc.person_id
    WHERE p.mother_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM base_persons bp6 WHERE bp6.person_id = p.mother_id)
      AND NOT EXISTS (SELECT 1 FROM new_spouses ns5 WHERE ns5.person_id = p.mother_id)
      AND NOT EXISTS (SELECT 1 FROM spouse_children sc3 WHERE sc3.person_id = p.mother_id)
  )
  -- Combine: base persons + new spouses + children of spouses + other parents
  SELECT bp2.person_id, bp2.depth FROM base_persons bp2
  UNION
  SELECT ns3.person_id, ns3.depth FROM new_spouses ns3
  UNION
  SELECT sc.person_id, MIN(sc.depth)
  FROM spouse_children sc
  GROUP BY sc.person_id
  UNION
  SELECT op.person_id, MIN(op.depth)
  FROM other_parents op
  GROUP BY op.person_id;
$$;
