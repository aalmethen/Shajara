CREATE TYPE audit_action_enum AS ENUM ('add', 'edit', 'delete');

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_tree_id UUID REFERENCES family_trees(id) ON DELETE CASCADE NOT NULL,
  action audit_action_enum NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_family_tree ON audit_log(family_tree_id);
