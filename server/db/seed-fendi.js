const pool = require('./pool');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/**
 * Seed: ذرية جاسم الفندي
 *
 * Mapped from the family tree image provided by the user.
 * Root: جاسم الفندي
 *
 * His children (generation 2):
 *   1. إبراهيم (married هيا, شريفة الفضل {2}, مريم الضان {3})
 *   2. أحمد الضان (married حصة)
 *   3. محمد المهنى (married حصة, المشاري {2})
 *   4. فهد الضان (married نصف نوفان صغرا, سبيكة)
 *   5. نصف الحصفوص (married فاطمة)
 *   6. حسين الحصفوص (married حصة الدهنى, شريفة)
 *   7. خديجة (married خميس الشراح)
 *   8. شيخة (married المشاري)
 *   9. عائشة (married لولوة الشهم {note: likely a male name here}, علي المويس)
 *   10. دلال
 *   11. سبيكة (married أم منصور الدهنى / عبدالحميد)
 *   12. منيرة
 */

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if admin user exists already
    const existingUser = await client.query(`SELECT id FROM users WHERE email = 'admin@shajara.app'`);
    let userId;
    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
    } else {
      userId = uuidv4();
      const passwordHash = await bcrypt.hash('admin123', 10);
      await client.query(
        `INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)`,
        [userId, 'admin@shajara.app', passwordHash, 'مدير النظام']
      );
    }

    // Create family tree
    const treeId = uuidv4();
    await client.query(
      `INSERT INTO family_trees (id, name, description, slug, created_by, traversal_mode, depth_limit) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (slug) DO NOTHING`,
      [treeId, 'ذرية جاسم الفندي', 'شجرة ذرية جاسم الفندي', 'al-fendi', userId, 'descendants', 20]
    );

    // Create tree member
    await client.query(
      `INSERT INTO tree_members (id, user_id, family_tree_id, role) VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (user_id, family_tree_id) DO NOTHING`,
      [uuidv4(), userId, treeId]
    );

    // Helper to create a person
    const ids = {};
    async function addPerson(key, firstName, familyName, gender, fatherKey, motherKey, status = 'deceased', birthDate = null, deathDate = null) {
      const id = uuidv4();
      ids[key] = id;
      await client.query(
        `INSERT INTO persons (id, first_name, family_name, gender, father_id, mother_id, birth_date, death_date, status, home_tree_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [id, firstName, familyName || null, gender, fatherKey ? ids[fatherKey] : null, motherKey ? ids[motherKey] : null, birthDate, deathDate, status, treeId, userId]
      );
      return id;
    }

    // Helper to create spouse relationship
    async function addSpouse(personAKey, personBKey, marriageOrder = 1, status = 'married') {
      await client.query(
        `INSERT INTO spouses (id, person_a_id, person_b_id, marriage_order, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), ids[personAKey], ids[personBKey], marriageOrder, status, userId]
      );
    }

    // =============================================
    // GENERATION 1: ROOT — جاسم الفندي
    // =============================================
    await addPerson('jassim', 'جاسم', 'الفندي', 'male', null, null, 'deceased');

    // =============================================
    // GENERATION 2: Children of جاسم
    // =============================================

    // --- إبراهيم بن جاسم ---
    await addPerson('ibrahim', 'إبراهيم', null, 'male', 'jassim', null, 'deceased');

    // إبراهيم's wives
    await addPerson('haya_w_ibrahim', 'هيا', null, 'female', null, null, 'deceased');
    await addPerson('sharifa_alfadhl', 'شريفة', 'الفضل', 'female', null, null, 'deceased');
    await addPerson('maryam_aldhan_w_ibrahim', 'مريم', 'الضان', 'female', null, null, 'deceased');

    await addSpouse('ibrahim', 'haya_w_ibrahim', 1);
    await addSpouse('ibrahim', 'sharifa_alfadhl', 2);
    await addSpouse('ibrahim', 'maryam_aldhan_w_ibrahim', 3);

    // --- أحمد الضان (أحمد بن جاسم) ---
    await addPerson('ahmad_aldhan', 'أحمد', 'الضان', 'male', 'jassim', null, 'deceased');

    // أحمد الضان's wife: حصة
    await addPerson('hessa_w_ahmad', 'حصة', null, 'female', null, null, 'deceased');
    await addSpouse('ahmad_aldhan', 'hessa_w_ahmad', 1);

    // --- محمد المهنى (محمد بن جاسم) ---
    await addPerson('mohammed_almuhanna', 'محمد', 'المهنى', 'male', 'jassim', null, 'deceased');

    // محمد المهنى's wives
    await addPerson('hessa_w_mohammed', 'حصة', null, 'female', null, null, 'deceased');
    await addPerson('almishari_w_mohammed', 'المشاري', null, 'female', null, null, 'deceased');

    await addSpouse('mohammed_almuhanna', 'hessa_w_mohammed', 1);
    await addSpouse('mohammed_almuhanna', 'almishari_w_mohammed', 2);

    // --- فهد الضان (فهد بن جاسم) ---
    await addPerson('fahd_aldhan', 'فهد', 'الضان', 'male', 'jassim', null, 'deceased');

    // فهد's wives
    await addPerson('nisf_nofan_saghira', 'نصف', 'نوفان صغرا', 'female', null, null, 'deceased');
    await addPerson('sbeeka_w_fahd', 'سبيكة', null, 'female', null, null, 'deceased');

    await addSpouse('fahd_aldhan', 'nisf_nofan_saghira', 1);
    await addSpouse('fahd_aldhan', 'sbeeka_w_fahd', 2);

    // --- نصف الحصفوص (نصف بن جاسم) ---
    await addPerson('nisf_alhussfous', 'نصف', 'الحصفوص', 'male', 'jassim', null, 'deceased');

    // نصف's wife: فاطمة
    await addPerson('fatima_w_nisf', 'فاطمة', null, 'female', null, null, 'deceased');
    await addSpouse('nisf_alhussfous', 'fatima_w_nisf', 1);

    // --- حسين الحصفوص (حسين بن جاسم) ---
    await addPerson('hussain_alhussfous', 'حسين', 'الحصفوص', 'male', 'jassim', null, 'deceased');

    // حسين's wives
    await addPerson('hessa_alduhna', 'حصة', 'الدهنى', 'female', null, null, 'deceased');
    await addPerson('sharifa_w_hussain', 'شريفة', null, 'female', null, null, 'deceased');

    await addSpouse('hussain_alhussfous', 'hessa_alduhna', 1);
    await addSpouse('hussain_alhussfous', 'sharifa_w_hussain', 2);

    // --- Daughters of جاسم ---
    await addPerson('khadija', 'خديجة', null, 'female', 'jassim', null, 'deceased');
    await addPerson('sheikha', 'شيخة', null, 'female', 'jassim', null, 'deceased');
    await addPerson('aisha_bint_jassim', 'عائشة', null, 'female', 'jassim', null, 'deceased');
    await addPerson('dalal', 'دلال', null, 'female', 'jassim', null, 'deceased');
    await addPerson('sbeeka_bint_jassim', 'سبيكة', null, 'female', 'jassim', null, 'deceased');

    // Khadija's husband: خميس الشراح
    await addPerson('khamis_alsharrah', 'خميس', 'الشراح', 'male', null, null, 'deceased');
    await addSpouse('khamis_alsharrah', 'khadija', 1);

    // Sheikha's husband: المشاري
    await addPerson('almishari_h_sheikha', 'المشاري', null, 'male', null, null, 'deceased');
    await addSpouse('almishari_h_sheikha', 'sheikha', 1);

    // عائشة's husbands
    await addPerson('lolo_alshahm', 'لولوة', 'الشهم', 'male', null, null, 'deceased');
    await addPerson('ali_almuwais', 'علي', 'المويس', 'male', null, null, 'deceased');
    await addSpouse('lolo_alshahm', 'aisha_bint_jassim', 1);
    await addSpouse('ali_almuwais', 'aisha_bint_jassim', 2);

    // سبيكة's husband: أم منصور الدهنى / عبدالحميد
    await addPerson('abdulhameed', 'عبدالحميد', null, 'male', null, null, 'deceased');
    await addSpouse('abdulhameed', 'sbeeka_bint_jassim', 1);

    // =============================================
    // GENERATION 3: Children of إبراهيم
    // =============================================

    // Children of إبراهيم و هيا
    await addPerson('haya_bint_ibrahim', 'هيا', null, 'female', 'ibrahim', 'haya_w_ibrahim', 'deceased');

    // Children of إبراهيم و شريفة الفضل
    await addPerson('abdulrahman_ibn_ibrahim', 'عبدالرحمن', null, 'male', 'ibrahim', 'sharifa_alfadhl', 'deceased');
    await addPerson('sharifa_bint_ibrahim', 'شريفة', null, 'female', 'ibrahim', 'sharifa_alfadhl', 'deceased');
    await addPerson('muhammad_halawah', 'محمد', 'حلاوة', 'male', 'ibrahim', 'sharifa_alfadhl', 'deceased');

    // Children of إبراهيم و مريم الضان
    await addPerson('hessa_alduhna_bint_ibrahim', 'حصة', 'الدهنى', 'female', 'ibrahim', 'maryam_aldhan_w_ibrahim', 'deceased');
    await addPerson('abdulsalam', 'عبدالسلام', null, 'male', 'ibrahim', 'maryam_aldhan_w_ibrahim', 'deceased');

    // عبدالسلام's wife
    await addPerson('nora_w_abdulsalam', 'نورة', null, 'female', null, null, 'deceased');
    await addSpouse('abdulsalam', 'nora_w_abdulsalam', 1);

    // حصة الدهنى بنت إبراهيم married حسين الحصفوص (already exists)
    // This is a cross-branch marriage — we already have hussain

    // هيا بنت إبراهيم — married someone
    // عبدالرحمن بن إبراهيم
    await addPerson('ali_w_sharifa_bint_ibrahim', 'علي', 'جلوه سيوفة', 'male', null, null, 'deceased');
    await addSpouse('ali_w_sharifa_bint_ibrahim', 'sharifa_bint_ibrahim', 1);

    // =============================================
    // GENERATION 3: Children of أحمد الضان
    // =============================================

    // Children of أحمد الضان و حصة
    await addPerson('yousuf_ibn_ahmad', 'يوسف', null, 'male', 'ahmad_aldhan', 'hessa_w_ahmad', 'deceased');
    await addPerson('abdulrahman_ibn_ahmad', 'عبدالرحمن', null, 'male', 'ahmad_aldhan', 'hessa_w_ahmad', 'deceased');
    await addPerson('nora_bint_ahmad', 'نورة', null, 'female', 'ahmad_aldhan', 'hessa_w_ahmad', 'deceased');
    await addPerson('lolwa_bint_ahmad', 'لولوة', null, 'female', 'ahmad_aldhan', 'hessa_w_ahmad', 'deceased');
    await addPerson('fatima_bint_ahmad', 'فاطمة', null, 'female', 'ahmad_aldhan', 'hessa_w_ahmad', 'deceased');
    await addPerson('maryam_bint_ahmad', 'مريم', null, 'female', 'ahmad_aldhan', 'hessa_w_ahmad', 'deceased');
    await addPerson('ghadir', 'غادر', null, 'male', 'ahmad_aldhan', 'hessa_w_ahmad', 'deceased');
    await addPerson('salim_ibn_ahmad', 'سالم', null, 'male', 'ahmad_aldhan', 'hessa_w_ahmad', 'deceased');

    // يوسف بن أحمد's wife
    await addPerson('haya_alsaleh', 'هيا', 'الصالح', 'female', null, null, 'deceased');
    await addSpouse('yousuf_ibn_ahmad', 'haya_alsaleh', 1);

    // عبدالرحمن بن أحمد's wife: مها
    await addPerson('maha_w_abdulrahman', 'مها', null, 'female', null, null, 'alive');
    await addSpouse('abdulrahman_ibn_ahmad', 'maha_w_abdulrahman', 1);

    // =============================================
    // GENERATION 3: Children of محمد المهنى
    // =============================================

    // From wife 1 (حصة)
    await addPerson('mohammed_almuhanna2', 'محمد', 'المهنى', 'male', 'mohammed_almuhanna', 'hessa_w_mohammed', 'deceased');
    await addPerson('ahmad_ibn_mohammed', 'أحمد', null, 'male', 'mohammed_almuhanna', 'hessa_w_mohammed', 'alive');
    await addPerson('amina', 'أمينة', null, 'female', 'mohammed_almuhanna', 'hessa_w_mohammed', 'alive');
    await addPerson('hessa_bint_mohammed', 'حصة', null, 'female', 'mohammed_almuhanna', 'hessa_w_mohammed', 'alive');
    await addPerson('sarah_bint_mohammed', 'سارة', null, 'female', 'mohammed_almuhanna', 'hessa_w_mohammed', 'alive');
    await addPerson('maryam_bint_mohammed', 'مريم', null, 'female', 'mohammed_almuhanna', 'hessa_w_mohammed', 'alive');

    // From wife 2 (المشاري)
    await addPerson('saleh_ibn_mohammed', 'صالح', null, 'male', 'mohammed_almuhanna', 'almishari_w_mohammed', 'alive');
    await addPerson('saad', 'سعد', null, 'male', 'mohammed_almuhanna', 'almishari_w_mohammed', 'alive');
    await addPerson('abdulaziz_ibn_mohammed', 'عبدالعزيز', null, 'male', 'mohammed_almuhanna', 'almishari_w_mohammed', 'alive');
    await addPerson('dalal_bint_mohammed', 'دلال', null, 'female', 'mohammed_almuhanna', 'almishari_w_mohammed', 'alive');

    // محمد المهنى٢ (son)'s wife
    await addPerson('wife_mohammed2', 'محمد', 'المهنى', 'female', null, null, 'alive');

    // صالح's wife
    await addPerson('wife_saleh', 'صالح', null, 'female', null, null, 'alive');

    // =============================================
    // GENERATION 3: Children of حسين الحصفوص
    // =============================================

    // From حصة الدهنى
    await addPerson('ibrahim_ibn_hussain', 'إبراهيم', 'الحصفوص', 'male', 'hussain_alhussfous', 'hessa_alduhna', 'deceased');
    await addPerson('hussain_son', 'حسين', null, 'male', 'hussain_alhussfous', 'hessa_alduhna', 'alive');
    await addPerson('adnan', 'عدنان', null, 'male', 'hussain_alhussfous', 'hessa_alduhna', 'alive');
    await addPerson('tariq', 'طارق', null, 'male', 'hussain_alhussfous', 'hessa_alduhna', 'alive');
    await addPerson('badr', 'بادر', null, 'male', 'hussain_alhussfous', 'hessa_alduhna', 'alive');

    // From شريفة
    await addPerson('salah_ibn_hussain', 'صلاح', null, 'male', 'hussain_alhussfous', 'sharifa_w_hussain', 'alive');
    await addPerson('suhaila', 'سهيلة', null, 'female', 'hussain_alhussfous', 'sharifa_w_hussain', 'alive');

    // إبراهيم الحصفوص's wives
    await addPerson('haya_w_ibrahim_h', 'هيا', null, 'female', null, null, 'alive');
    await addSpouse('ibrahim_ibn_hussain', 'haya_w_ibrahim_h', 1);

    // =============================================
    // GENERATION 3: Children of نصف الحصفوص
    // =============================================

    // From فاطمة
    await addPerson('hussein_ibn_nisf', 'حسين', null, 'male', 'nisf_alhussfous', 'fatima_w_nisf', 'deceased');
    await addPerson('abdulrahman_ibn_nisf', 'عبدالرحمن', null, 'male', 'nisf_alhussfous', 'fatima_w_nisf', 'alive');
    await addPerson('abdulwahab', 'عبدالوهاب', null, 'male', 'nisf_alhussfous', 'fatima_w_nisf', 'alive');
    await addPerson('haya_ibn_nisf', 'هيا', null, 'female', 'nisf_alhussfous', 'fatima_w_nisf', 'alive');
    await addPerson('maryam_ibn_nisf', 'مريم', null, 'female', 'nisf_alhussfous', 'fatima_w_nisf', 'alive');
    await addPerson('munira_ibn_nisf', 'منيرة', null, 'female', 'nisf_alhussfous', 'fatima_w_nisf', 'alive');
    await addPerson('latifa', 'لطيفة', null, 'female', 'nisf_alhussfous', 'fatima_w_nisf', 'alive');
    await addPerson('rqya', 'رقية', null, 'female', 'nisf_alhussfous', 'fatima_w_nisf', 'alive');

    // حسين بن نصف's wife
    await addPerson('wife_hussein_nisf', 'زوجته', null, 'female', null, null, 'alive');
    await addSpouse('hussein_ibn_nisf', 'wife_hussein_nisf', 1);

    // =============================================
    // GENERATION 3: Children of فهد الضان
    // =============================================

    // From نصف نوفان صغرا
    await addPerson('abdulrahman_ibn_fahd', 'عبدالرحمن', null, 'male', 'fahd_aldhan', 'nisf_nofan_saghira', 'alive');
    await addPerson('khalid_ibn_fahd', 'خالد', null, 'male', 'fahd_aldhan', 'nisf_nofan_saghira', 'alive');
    await addPerson('abdulaziz_ibn_fahd', 'عبدالعزيز', null, 'male', 'fahd_aldhan', 'nisf_nofan_saghira', 'alive');
    await addPerson('ibrahim_ibn_fahd', 'إبراهيم', null, 'male', 'fahd_aldhan', 'nisf_nofan_saghira', 'alive');
    await addPerson('maryam_bint_fahd', 'مريم', null, 'female', 'fahd_aldhan', 'nisf_nofan_saghira', 'alive');
    await addPerson('mishra', 'مشرا', null, 'female', 'fahd_aldhan', 'nisf_nofan_saghira', 'alive');

    // From سبيكة
    await addPerson('sulaiman_ibn_fahd', 'سليمان', null, 'male', 'fahd_aldhan', 'sbeeka_w_fahd', 'alive');
    await addPerson('fatima_bint_fahd', 'فاطمة', null, 'female', 'fahd_aldhan', 'sbeeka_w_fahd', 'alive');

    // عبدالرحمن بن فهد's wife: مها
    await addPerson('maha_w_abdulrahman_fahd', 'مها', null, 'female', null, null, 'alive');
    await addSpouse('abdulrahman_ibn_fahd', 'maha_w_abdulrahman_fahd', 1);

    // =============================================
    // GENERATION 3: Children of خديجة و خميس الشراح
    // =============================================
    await addPerson('shk_ibn_khamis', 'شك', null, 'male', 'khamis_alsharrah', 'khadija', 'alive');
    await addPerson('mohammed_ibn_khamis', 'محمد', null, 'male', 'khamis_alsharrah', 'khadija', 'alive');
    await addPerson('jomaa', 'جمعة', null, 'female', 'khamis_alsharrah', 'khadija', 'alive');
    await addPerson('noama', 'نعمة', null, 'female', 'khamis_alsharrah', 'khadija', 'alive');

    // =============================================
    // GENERATION 3: Children of عائشة
    // =============================================

    // From لولوة الشهم
    await addPerson('alghaith', 'الغيث', null, 'male', 'lolo_alshahm', 'aisha_bint_jassim', 'alive');

    // From علي المويس
    await addPerson('hessa_bint_ali', 'حصة', null, 'female', 'ali_almuwais', 'aisha_bint_jassim', 'alive');
    await addPerson('mohammed_bint_ali', 'محمد', null, 'male', 'ali_almuwais', 'aisha_bint_jassim', 'alive');

    // =============================================
    // GENERATION 3: Children of سبيكة و عبدالحميد
    // =============================================
    await addPerson('abdullah_ibn_abdulhameed', 'عبدالله', null, 'male', 'abdulhameed', 'sbeeka_bint_jassim', 'alive');

    // =============================================
    // GENERATION 4: Children of عبدالسلام بن إبراهيم
    // =============================================
    await addPerson('ali_ibn_abdulsalam', 'علي', null, 'male', 'abdulsalam', 'nora_w_abdulsalam', 'alive');
    await addPerson('nora_bint_abdulsalam', 'نورة', null, 'female', 'abdulsalam', 'nora_w_abdulsalam', 'alive');

    // علي بن عبدالسلام's wife
    await addPerson('wife_ali_abdulsalam', 'جلوه', 'سيوفة', 'female', null, null, 'alive');
    await addSpouse('ali_ibn_abdulsalam', 'wife_ali_abdulsalam', 1);

    // =============================================
    // GENERATION 4: Children of إبراهيم الحصفوص (بن حسين)
    // =============================================
    await addPerson('hassan_ibn_ibrahim_h', 'حسن', null, 'male', 'ibrahim_ibn_hussain', 'haya_w_ibrahim_h', 'alive');
    await addPerson('ahmad_ibn_ibrahim_h', 'أحمد', null, 'male', 'ibrahim_ibn_hussain', 'haya_w_ibrahim_h', 'alive');

    // =============================================
    // GENERATION 4: Children of يوسف بن أحمد الضان
    // =============================================
    await addPerson('yousef_alhadad', 'يوسف', 'الحداد', 'male', 'yousuf_ibn_ahmad', 'haya_alsaleh', 'alive');
    await addPerson('moza_bint_yousef', 'موزة', null, 'female', 'yousuf_ibn_ahmad', 'haya_alsaleh', 'alive');

    // =============================================
    // GENERATION 4: Children of حسين بن نصف
    // =============================================
    await addPerson('abdulrahman_ibn_hussein_nisf', 'عبدالرحمن', null, 'male', 'hussein_ibn_nisf', 'wife_hussein_nisf', 'alive');
    await addPerson('malla', 'ملا', null, 'male', 'hussein_ibn_nisf', 'wife_hussein_nisf', 'alive');
    await addPerson('lolwa_ibn_hussein', 'لولوة', null, 'female', 'hussein_ibn_nisf', 'wife_hussein_nisf', 'alive');
    await addPerson('haya_ibn_hussein', 'هيا', null, 'female', 'hussein_ibn_nisf', 'wife_hussein_nisf', 'alive');
    await addPerson('maryam_ibn_hussein', 'مريم', null, 'female', 'hussein_ibn_nisf', 'wife_hussein_nisf', 'alive');

    // عبدالرحمن بن حسين's wife
    await addPerson('wife_abdulrahman_hussein', 'زوجته', null, 'female', null, null, 'alive');
    await addSpouse('abdulrahman_ibn_hussein_nisf', 'wife_abdulrahman_hussein', 1);

    // =============================================
    // GENERATION 4+: Children of عبدالرحمن بن فهد
    // =============================================
    await addPerson('yousuf_ibn_abdulrahman_f', 'يوسف', null, 'male', 'abdulrahman_ibn_fahd', 'maha_w_abdulrahman_fahd', 'alive');
    await addPerson('nora_ibn_abdulrahman_f', 'نورة', null, 'female', 'abdulrahman_ibn_fahd', 'maha_w_abdulrahman_fahd', 'alive');

    // =============================================
    // MORE GENERATION 4: Children of أحمد الضان branch
    // =============================================

    // سالم بن أحمد
    await addPerson('sami_ibn_salim', 'سامي', null, 'male', 'salim_ibn_ahmad', null, 'alive');
    await addPerson('abdulaziz_ibn_salim', 'عبدالعزيز', null, 'male', 'salim_ibn_ahmad', null, 'alive');
    await addPerson('salim2', 'سالم', null, 'male', 'salim_ibn_ahmad', null, 'alive');
    await addPerson('mohammed_ibn_salim', 'محمد', null, 'male', 'salim_ibn_ahmad', null, 'alive');

    // غادر بن أحمد
    await addPerson('salim_ibn_ghadir', 'سالم', null, 'male', 'ghadir', null, 'alive');
    await addPerson('khalid_ibn_ghadir', 'خالد', null, 'male', 'ghadir', null, 'alive');
    await addPerson('atif', 'عاطف', null, 'female', 'ghadir', null, 'alive');
    await addPerson('isham', 'إسحام', null, 'male', 'ghadir', null, 'alive');

    // =============================================
    // حسين الحصفوص sub-branches
    // =============================================

    // صلاح بن حسين's children
    await addPerson('mouzi_ibn_salah', 'موضي', null, 'female', 'salah_ibn_hussain', null, 'alive');
    await addPerson('dalal_ibn_salah', 'دلال', null, 'female', 'salah_ibn_hussain', null, 'alive');

    // عدنان بن حسين
    await addPerson('nouf_bint_adnan', 'نوف', null, 'female', 'adnan', null, 'alive');

    // =============================================
    // عبدالرحمن بن أحمد الضان sub-branch
    // =============================================
    await addPerson('saud', 'سعود', null, 'male', 'abdulrahman_ibn_ahmad', 'maha_w_abdulrahman', 'alive');

    // سعود's wife
    await addPerson('wife_saud', 'زوجته', null, 'female', null, null, 'alive');
    await addSpouse('saud', 'wife_saud', 1);

    // =============================================
    // إبراهيم بن إبراهيم الحصفوص sub-branches
    // =============================================

    // More of حسين الحصفوص lineage
    // بادر بن حسين
    await addPerson('jasim_ibn_badr', 'جاسم', null, 'male', 'badr', null, 'alive');

    // =============================================
    // محمد المهنى sub-branches
    // =============================================

    // عبدالحميد
    await addPerson('um_mansour', 'أم منصور', 'الدهنى', 'female', null, null, 'deceased');

    // =============================================
    // ADDITIONAL GENERATION 4+ MEMBERS
    // =============================================

    // Children of عبدالرحمن بن إبراهيم
    await addPerson('abdulmuhsin_aldawish', 'عبدالمحسن', 'الداعش', 'male', 'abdulrahman_ibn_ibrahim', null, 'alive');

    // عبدالمحسن's wife: سبيكة
    await addPerson('sbeeka_w_abdulmuhsin', 'سبيكة', null, 'female', null, null, 'alive');
    await addSpouse('abdulmuhsin_aldawish', 'sbeeka_w_abdulmuhsin', 1);

    // أحمد الضان deeper branches - from image
    // Children under فيصل area
    await addPerson('shayban', 'شعبان', null, 'male', 'salim_ibn_ahmad', null, 'alive');
    await addPerson('ahmad_ibn_salim', 'أحمد', null, 'male', 'salim_ibn_ahmad', null, 'alive');
    await addPerson('shuruq', 'شروق', null, 'female', 'salim_ibn_ahmad', null, 'alive');
    await addPerson('iman', 'إيمان', null, 'female', 'salim_ibn_ahmad', null, 'alive');

    // فهد الضان more children
    await addPerson('fahad_ibn_khalid_fahd', 'فهد', null, 'male', 'khalid_ibn_fahd', null, 'alive');
    await addPerson('masoud', 'مسعود', null, 'male', 'khalid_ibn_fahd', null, 'alive');

    // محمد المهنى deeper — children of محمد المهنى٢
    await addPerson('jomaa_ibn_m2', 'جمعة', null, 'male', 'mohammed_almuhanna2', null, 'alive');
    await addPerson('mohammed_ibn_m2', 'محمد', null, 'male', 'mohammed_almuhanna2', null, 'alive');

    // عبدالعزيز بن محمد المهنى
    await addPerson('dalal_bint_aa', 'دلال', null, 'female', 'abdulaziz_ibn_mohammed', null, 'alive');

    // =============================================
    // More branches from the tree image
    // =============================================

    // إبراهيم branch — deeper
    // Children of عبدالمحسن الداعش
    await addPerson('ali_ibn_abdulmuhsin', 'علي', null, 'male', 'abdulmuhsin_aldawish', 'sbeeka_w_abdulmuhsin', 'alive');
    await addPerson('nora_ibn_abdulmuhsin', 'نورة', null, 'female', 'abdulmuhsin_aldawish', 'sbeeka_w_abdulmuhsin', 'alive');

    // حسين الحصفوص — more grandchildren
    // Children of حسن بن إبراهيم الحصفوص
    await addPerson('hussain_ibn_hassan', 'حسين', null, 'male', 'hassan_ibn_ibrahim_h', null, 'alive');
    await addPerson('naser', 'ناصر', null, 'male', 'hassan_ibn_ibrahim_h', null, 'alive');

    // =============================================
    // نصف الحصفوص deeper branches
    // =============================================

    // عبدالوهاب بن نصف
    await addPerson('omar_ibn_abdulwahab', 'عمر', null, 'male', 'abdulwahab', null, 'alive');
    await addPerson('ahmad_ibn_abdulwahab', 'أحمد', null, 'male', 'abdulwahab', null, 'alive');
    await addPerson('mohammed_ibn_abdulwahab', 'محمد', null, 'male', 'abdulwahab', null, 'alive');
    await addPerson('maryam_ibn_abdulwahab', 'مريم', null, 'female', 'abdulwahab', null, 'alive');

    // عبدالرحمن بن نصف
    await addPerson('saad_ibn_abdulrahman_n', 'سعد', null, 'male', 'abdulrahman_ibn_nisf', null, 'alive');
    await addPerson('isra', 'إسراء', null, 'female', 'abdulrahman_ibn_nisf', null, 'alive');
    await addPerson('moza_ibn_abdulrahman_n', 'موزة', null, 'female', 'abdulrahman_ibn_nisf', null, 'alive');

    // =============================================
    // أحمد الضان — deeper (الضان line)
    // =============================================

    // Children of عبدالرحمن بن حسين بن نصف
    await addPerson('abdulnaser', 'عبدالناصر', null, 'male', 'abdulrahman_ibn_hussein_nisf', 'wife_abdulrahman_hussein', 'alive');
    await addPerson('abdullah_ibn_abdulrahman_h', 'عبدالله', null, 'male', 'abdulrahman_ibn_hussein_nisf', 'wife_abdulrahman_hussein', 'alive');

    // Additional branches from image

    // فهد الضان — إبراهيم بن فهد's children
    await addPerson('mansour_ibn_ibrahim_f', 'منصور', null, 'male', 'ibrahim_ibn_fahd', null, 'alive');
    await addPerson('musaed', 'مساعد', null, 'male', 'ibrahim_ibn_fahd', null, 'alive');
    await addPerson('ahmad_ibn_ibrahim_f', 'أحمد', null, 'male', 'ibrahim_ibn_fahd', null, 'alive');

    // عبدالعزيز بن فهد's children
    await addPerson('hamad', 'حمد', null, 'male', 'abdulaziz_ibn_fahd', null, 'alive');
    await addPerson('usama', 'أسامة', null, 'male', 'abdulaziz_ibn_fahd', null, 'alive');
    await addPerson('mohammed_ibn_az_fahd', 'محمد', null, 'male', 'abdulaziz_ibn_fahd', null, 'alive');

    // سليمان بن فهد
    await addPerson('khalid_ibn_sulaiman', 'خالد', null, 'male', 'sulaiman_ibn_fahd', null, 'alive');
    await addPerson('salim_ibn_sulaiman', 'سالم', null, 'male', 'sulaiman_ibn_fahd', null, 'alive');
    await addPerson('mohammed_ibn_sulaiman', 'محمد', null, 'male', 'sulaiman_ibn_fahd', null, 'alive');

    // =============================================
    // حسين الحصفوص additional
    // =============================================

    // عدنان children (besides نوف)
    await addPerson('haitham', 'هيثم', null, 'male', 'adnan', null, 'alive');
    await addPerson('hisham', 'هشام', null, 'male', 'adnan', null, 'alive');

    // طارق children
    await addPerson('mishari_ibn_tariq', 'مشاري', null, 'male', 'tariq', null, 'alive');
    await addPerson('khaldia', 'خالدية', null, 'female', 'tariq', null, 'alive');

    // =============================================
    // Additional visible names from image edges
    // =============================================

    // From the right side of the tree image — deeper حسين branch
    await addPerson('nadia', 'نادية', null, 'female', 'ibrahim_ibn_hussain', 'haya_w_ibrahim_h', 'alive');
    await addPerson('latifa_ibn_hussain', 'لطيفة', null, 'female', 'hussain_alhussfous', 'hessa_alduhna', 'alive');

    // عبدالله بن عبدالحميد children
    await addPerson('abdullatif', 'عبداللطيف', null, 'male', 'abdullah_ibn_abdulhameed', null, 'alive');
    await addPerson('khaled_ibn_abdullah', 'خالد', null, 'male', 'abdullah_ibn_abdulhameed', null, 'alive');
    await addPerson('ahmad_ibn_abdullah', 'أحمد', null, 'male', 'abdullah_ibn_abdulhameed', null, 'alive');

    // Some more visible names: right side
    await addPerson('adil', 'عادل', null, 'male', 'hussain_alhussfous', 'sharifa_w_hussain', 'alive');
    await addPerson('mooza', 'موزة', null, 'female', 'hussain_alhussfous', 'sharifa_w_hussain', 'alive');

    // Ali بن عبدالسلام's children
    await addPerson('dawood', 'داوود', null, 'male', 'ali_ibn_abdulsalam', 'wife_ali_abdulsalam', 'alive');
    await addPerson('bshar', 'بشار', null, 'male', 'ali_ibn_abdulsalam', 'wife_ali_abdulsalam', 'alive');

    // مريم الضان branch — more of إبراهيم's grandchildren visible
    await addPerson('issa', 'عيسى', null, 'male', 'abdulsalam', 'nora_w_abdulsalam', 'alive');
    await addPerson('daya', 'ضياء', null, 'female', 'abdulsalam', 'nora_w_abdulsalam', 'alive');
    await addPerson('khalil', 'خليل', null, 'male', 'abdulsalam', 'nora_w_abdulsalam', 'alive');

    // Upper right corner — deeper
    await addPerson('hisham_ibn_hussain_h', 'هشام', null, 'male', 'hussain_son', null, 'alive');
    await addPerson('mishari_ibn_hussain', 'مشاري', null, 'male', 'hussain_son', null, 'alive');
    await addPerson('nora_bint_hussain_son', 'نورة', null, 'female', 'hussain_son', null, 'alive');

    // =============================================
    // Additional right side — حسين branch deeper
    // =============================================

    // صلاح بن حسين children
    await addPerson('wahi', 'وهي', null, 'male', 'salah_ibn_hussain', null, 'alive');
    await addPerson('rouba', 'روبا', null, 'female', 'salah_ibn_hussain', null, 'alive');

    // Left area — محمد المهنى deeper
    await addPerson('abdulaziz_ibn_saleh', 'عبدالعزيز', null, 'male', 'saleh_ibn_mohammed', null, 'alive');
    await addPerson('sumeya', 'سمية', null, 'female', 'saleh_ibn_mohammed', null, 'alive');

    // =============================================
    // More deep branches from bottom of image
    // =============================================

    // أحمد الضان → سالم → children's children
    await addPerson('ahmad2', 'أحمد', null, 'male', 'sami_ibn_salim', null, 'alive');
    await addPerson('abdulaziz3', 'عبدالعزيز', null, 'male', 'sami_ibn_salim', null, 'alive');

    // Bottom-left area
    await addPerson('khalila', 'خليلة', null, 'female', 'abdulrahman_ibn_fahd', 'maha_w_abdulrahman_fahd', 'alive');
    await addPerson('masoud2', 'مسعود', null, 'male', 'abdulrahman_ibn_fahd', 'maha_w_abdulrahman_fahd', 'alive');

    // =============================================
    // Additional visible people from bottom edge
    // =============================================

    // Bottom center — أحمد الضان deepest visible
    await addPerson('alsouwaidi', 'السويدي', null, 'male', 'salim_ibn_ahmad', null, 'alive');

    // Far bottom — فهد الضان last generation visible
    await addPerson('abdullah_ibn_abdullatif', 'عبدالله', null, 'male', 'abdullatif', null, 'alive');
    await addPerson('ahmad_ibn_abdullatif', 'أحمد', 'عبداللطيف', 'male', 'abdullatif', null, 'alive');

    // =============================================
    // SET ROOT PERSON
    // =============================================
    await client.query(
      `UPDATE family_trees SET root_person_id = $1 WHERE id = $2`,
      [ids['jassim'], treeId]
    );

    await client.query('COMMIT');

    // Count persons
    const count = Object.keys(ids).length;
    console.log('✅ Seed data created successfully for ذرية جاسم الفندي');
    console.log(`   Tree: ذرية جاسم الفندي (slug: al-fendi)`);
    console.log(`   Admin: admin@shajara.app / admin123`);
    console.log(`   Persons: ${count}`);
    console.log(`   URL: http://localhost:5173/tree/al-fendi`);

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
