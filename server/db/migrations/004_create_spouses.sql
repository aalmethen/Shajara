CREATE TYPE marriage_status_enum AS ENUM ('married', 'divorced', 'widowed');

CREATE TABLE spouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_a_id UUID REFERENCES persons(id) ON DELETE CASCADE NOT NULL,
  person_b_id UUID REFERENCES persons(id) ON DELETE CASCADE NOT NULL,
  marriage_date VARCHAR(50),
  divorce_date VARCHAR(50),
  marriage_order INTEGER DEFAULT 1,
  status marriage_status_enum DEFAULT 'married',
  family_tree_id UUID REFERENCES family_trees(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_spouses_person_a ON spouses(person_a_id);
CREATE INDEX idx_spouses_person_b ON spouses(person_b_id);
