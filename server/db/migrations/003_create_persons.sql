CREATE TYPE gender_enum AS ENUM ('male', 'female');
CREATE TYPE person_status_enum AS ENUM ('alive', 'deceased');

CREATE TABLE persons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name VARCHAR(255) NOT NULL,
  family_name VARCHAR(255),
  gender gender_enum NOT NULL,
  father_id UUID REFERENCES persons(id) ON DELETE SET NULL,
  mother_id UUID REFERENCES persons(id) ON DELETE SET NULL,
  birth_date VARCHAR(50),
  death_date VARCHAR(50),
  status person_status_enum DEFAULT 'alive',
  bio TEXT,
  photo_url VARCHAR(500),
  family_tree_id UUID REFERENCES family_trees(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add the deferred FK from family_trees to persons
ALTER TABLE family_trees ADD CONSTRAINT fk_root_person
  FOREIGN KEY (root_person_id) REFERENCES persons(id) ON DELETE SET NULL;

-- Indexes for tree traversal queries
CREATE INDEX idx_persons_family_tree ON persons(family_tree_id);
CREATE INDEX idx_persons_father ON persons(father_id);
CREATE INDEX idx_persons_mother ON persons(mother_id);
