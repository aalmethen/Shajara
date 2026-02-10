CREATE TYPE member_role_enum AS ENUM ('admin', 'viewer');

CREATE TABLE tree_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  family_tree_id UUID REFERENCES family_trees(id) ON DELETE CASCADE NOT NULL,
  role member_role_enum DEFAULT 'viewer',
  linked_person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, family_tree_id)
);
