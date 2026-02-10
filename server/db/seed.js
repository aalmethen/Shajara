const pool = require('./pool');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Create admin user
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash('admin123', 10);
    await client.query(
      `INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [userId, 'admin@shajara.app', passwordHash, 'مدير النظام']
    );

    // 2. Create family tree
    const treeId = uuidv4();
    await client.query(
      `INSERT INTO family_trees (id, name, description, slug, created_by, traversal_mode, depth_limit) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (slug) DO NOTHING`,
      [treeId, 'عائلة الفلاني', 'شجرة عائلة الفلاني - نموذج تجريبي', 'al-falani', userId, 'descendants', 20]
    );

    // 3. Create tree member (admin)
    await client.query(
      `INSERT INTO tree_members (id, user_id, family_tree_id, role) VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (user_id, family_tree_id) DO NOTHING`,
      [uuidv4(), userId, treeId]
    );

    // 4. Create persons - 4 generations
    // Generation 1: Root ancestor (عبدالله)
    const abdullahId = uuidv4();
    await client.query(
      `INSERT INTO persons (id, first_name, family_name, gender, birth_date, death_date, status, home_tree_id, created_by)
       VALUES ($1, $2, $3, 'male', $4, $5, 'deceased', $6, $7)`,
      [abdullahId, 'عبدالله', 'الفلاني', '1900', '1975', treeId, userId]
    );

    // Wife 1 of Abdullah: فاطمة
    const fatimahId = uuidv4();
    await client.query(
      `INSERT INTO persons (id, first_name, family_name, gender, birth_date, death_date, status, home_tree_id, created_by)
       VALUES ($1, $2, $3, 'female', $4, $5, 'deceased', $6, $7)`,
      [fatimahId, 'فاطمة', 'العلي', '1905', '1980', treeId, userId]
    );

    // Wife 2 of Abdullah: نورة
    const nourahId = uuidv4();
    await client.query(
      `INSERT INTO persons (id, first_name, family_name, gender, birth_date, death_date, status, home_tree_id, created_by)
       VALUES ($1, $2, $3, 'female', $4, $5, 'deceased', $6, $7)`,
      [nourahId, 'نورة', 'السعيد', '1910', '1985', treeId, userId]
    );

    // Generation 2: Children of Abdullah and Fatimah
    // محمد بن عبدالله (from فاطمة)
    const mohammedId = uuidv4();
    await client.query(
      `INSERT INTO persons (id, first_name, family_name, gender, father_id, mother_id, birth_date, death_date, status, home_tree_id, created_by)
       VALUES ($1, $2, $3, 'male', $4, $5, $6, $7, 'deceased', $8, $9)`,
      [mohammedId, 'محمد', 'الفلاني', abdullahId, fatimahId, '1925', '2000', treeId, userId]
    );

    // سارة بنت عبدالله (from فاطمة)
    const sarahId = uuidv4();
    await client.query(
      `INSERT INTO persons (id, first_name, family_name, gender, father_id, mother_id, birth_date, status, home_tree_id, created_by)
       VALUES ($1, $2, $3, 'female', $4, $5, $6, 'alive', $7, $8)`,
      [sarahId, 'سارة', 'الفلاني', abdullahId, fatimahId, '1930', treeId, userId]
    );

    // خالد بن عبدالله (from نورة)
    const khaledId = uuidv4();
    await client.query(
      `INSERT INTO persons (id, first_name, family_name, gender, father_id, mother_id, birth_date, status, home_tree_id, created_by)
       VALUES ($1, $2, $3, 'male', $4, $5, $6, 'alive', $7, $8)`,
      [khaledId, 'خالد', 'الفلاني', abdullahId, nourahId, '1935', treeId, userId]
    );

    // منيرة بنت عبدالله (from نورة)
    const munirahId = uuidv4();
    await client.query(
      `INSERT INTO persons (id, first_name, family_name, gender, father_id, mother_id, birth_date, status, home_tree_id, created_by)
       VALUES ($1, $2, $3, 'female', $4, $5, $6, 'alive', $7, $8)`,
      [munirahId, 'منيرة', 'الفلاني', abdullahId, nourahId, '1938', treeId, userId]
    );

    // Wife of Mohammed: عائشة
    const aishah1Id = uuidv4();
    await client.query(
      `INSERT INTO persons (id, first_name, family_name, gender, birth_date, status, home_tree_id, created_by)
       VALUES ($1, $2, $3, 'female', $4, 'alive', $5, $6)`,
      [aishah1Id, 'عائشة', 'المحمد', '1930', treeId, userId]
    );

    // Wife of Khaled: هند
    const hindId = uuidv4();
    await client.query(
      `INSERT INTO persons (id, first_name, family_name, gender, birth_date, status, home_tree_id, created_by)
       VALUES ($1, $2, $3, 'female', $4, 'alive', $5, $6)`,
      [hindId, 'هند', 'الخالد', '1940', treeId, userId]
    );

    // Generation 3: Children of Mohammed and Aishah
    // أحمد بن محمد
    const ahmedId = uuidv4();
    await client.query(
      `INSERT INTO persons (id, first_name, family_name, gender, father_id, mother_id, birth_date, status, home_tree_id, created_by)
       VALUES ($1, $2, $3, 'male', $4, $5, $6, 'alive', $7, $8)`,
      [ahmedId, 'أحمد', 'الفلاني', mohammedId, aishah1Id, '1955', treeId, userId]
    );

    // ريم بنت محمد
    const reemId = uuidv4();
    await client.query(
      `INSERT INTO persons (id, first_name, family_name, gender, father_id, mother_id, birth_date, status, home_tree_id, created_by)
       VALUES ($1, $2, $3, 'female', $4, $5, $6, 'alive', $7, $8)`,
      [reemId, 'ريم', 'الفلاني', mohammedId, aishah1Id, '1958', treeId, userId]
    );

    // Children of Khaled and Hind
    // فيصل بن خالد
    const faisalId = uuidv4();
    await client.query(
      `INSERT INTO persons (id, first_name, family_name, gender, father_id, mother_id, birth_date, status, home_tree_id, created_by)
       VALUES ($1, $2, $3, 'male', $4, $5, $6, 'alive', $7, $8)`,
      [faisalId, 'فيصل', 'الفلاني', khaledId, hindId, '1960', treeId, userId]
    );

    // لمى بنت خالد (cousin marriage — will marry أحمد)
    const lamaId = uuidv4();
    await client.query(
      `INSERT INTO persons (id, first_name, family_name, gender, father_id, mother_id, birth_date, status, home_tree_id, created_by)
       VALUES ($1, $2, $3, 'female', $4, $5, $6, 'alive', $7, $8)`,
      [lamaId, 'لمى', 'الفلاني', khaledId, hindId, '1962', treeId, userId]
    );

    // Generation 4: Children of Ahmed and Lama (cousin marriage)
    // يوسف بن أحمد
    const yousefId = uuidv4();
    await client.query(
      `INSERT INTO persons (id, first_name, family_name, gender, father_id, mother_id, birth_date, status, home_tree_id, created_by)
       VALUES ($1, $2, $3, 'male', $4, $5, $6, 'alive', $7, $8)`,
      [yousefId, 'يوسف', 'الفلاني', ahmedId, lamaId, '1985', treeId, userId]
    );

    // نوف بنت أحمد
    const nawfId = uuidv4();
    await client.query(
      `INSERT INTO persons (id, first_name, family_name, gender, father_id, mother_id, birth_date, status, home_tree_id, created_by)
       VALUES ($1, $2, $3, 'female', $4, $5, $6, 'alive', $7, $8)`,
      [nawfId, 'نوف', 'الفلاني', ahmedId, lamaId, '1988', treeId, userId]
    );

    // 5. Create spouse relationships (no family_tree_id)
    // Abdullah + Fatimah (1st wife)
    await client.query(
      `INSERT INTO spouses (id, person_a_id, person_b_id, marriage_date, marriage_order, status, created_by)
       VALUES ($1, $2, $3, $4, $5, 'married', $6)`,
      [uuidv4(), abdullahId, fatimahId, '1923', 1, userId]
    );

    // Abdullah + Norah (2nd wife)
    await client.query(
      `INSERT INTO spouses (id, person_a_id, person_b_id, marriage_date, marriage_order, status, created_by)
       VALUES ($1, $2, $3, $4, $5, 'married', $6)`,
      [uuidv4(), abdullahId, nourahId, '1933', 2, userId]
    );

    // Mohammed + Aishah
    await client.query(
      `INSERT INTO spouses (id, person_a_id, person_b_id, marriage_date, marriage_order, status, created_by)
       VALUES ($1, $2, $3, $4, $5, 'married', $6)`,
      [uuidv4(), mohammedId, aishah1Id, '1953', 1, userId]
    );

    // Khaled + Hind
    await client.query(
      `INSERT INTO spouses (id, person_a_id, person_b_id, marriage_date, marriage_order, status, created_by)
       VALUES ($1, $2, $3, $4, $5, 'married', $6)`,
      [uuidv4(), khaledId, hindId, '1958', 1, userId]
    );

    // Ahmed + Lama (cousin marriage)
    await client.query(
      `INSERT INTO spouses (id, person_a_id, person_b_id, marriage_date, marriage_order, status, created_by)
       VALUES ($1, $2, $3, $4, $5, 'married', $6)`,
      [uuidv4(), ahmedId, lamaId, '1982', 1, userId]
    );

    // 6. Set root person
    await client.query(
      `UPDATE family_trees SET root_person_id = $1 WHERE id = $2`,
      [abdullahId, treeId]
    );

    await client.query('COMMIT');

    console.log('✅ Seed data created successfully');
    console.log(`   Tree: عائلة الفلاني (slug: al-falani)`);
    console.log(`   Admin: admin@shajara.app / admin123`);
    console.log(`   Persons: 15 across 4 generations`);
    console.log(`   Includes: 2 wives for root, cousin marriage in generation 3-4`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
