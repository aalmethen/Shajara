/**
 * Import parser — handles CSV and JSON file parsing for bulk import
 */

// Column name mappings: Arabic → internal field name
const COLUMN_MAP = {
  // Arabic headers
  'الاسم_الأول': 'first_name',
  'الاسم': 'first_name',
  'اسم_العائلة': 'family_name',
  'العائلة': 'family_name',
  'الجنس': 'gender',
  'اسم_الأب': 'father_name',
  'الأب': 'father_name',
  'اسم_الأم': 'mother_name',
  'الأم': 'mother_name',
  'تاريخ_الميلاد': 'birth_date',
  'الميلاد': 'birth_date',
  'تاريخ_الوفاة': 'death_date',
  'الوفاة': 'death_date',
  'الحالة': 'status',
  'نبذة': 'bio',
  // English headers
  'first_name': 'first_name',
  'family_name': 'family_name',
  'gender': 'gender',
  'father_name': 'father_name',
  'mother_name': 'mother_name',
  'birth_date': 'birth_date',
  'death_date': 'death_date',
  'status': 'status',
  'bio': 'bio',
};

// Gender normalization
const GENDER_MAP = {
  'ذكر': 'male',
  'أنثى': 'female',
  'male': 'male',
  'female': 'female',
  'm': 'male',
  'f': 'female',
};

// Status normalization
const STATUS_MAP = {
  'حي': 'alive',
  'متوفى': 'deceased',
  'متوفي': 'deceased',
  'alive': 'alive',
  'deceased': 'deceased',
};

/**
 * Parse a CSV line respecting quoted fields
 */
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}

/**
 * Parse CSV text into person objects
 * @param {string} text - CSV content
 * @returns {{ persons: Array, errors: Array }}
 */
export function parseCSV(text) {
  const errors = [];

  // Strip BOM
  let content = text;
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.substring(1);
  }

  const lines = content.split(/\r?\n/).filter(line => line.trim());

  if (lines.length < 2) {
    return { persons: [], errors: ['الملف لا يحتوي على بيانات كافية'] };
  }

  // Parse header row
  const headerLine = lines[0];
  const rawHeaders = parseCSVLine(headerLine);
  const headers = rawHeaders.map(h => {
    const trimmed = h.trim().replace(/^"|"$/g, '');
    return COLUMN_MAP[trimmed] || trimmed;
  });

  // Validate required columns
  if (!headers.includes('first_name')) {
    errors.push('الملف لا يحتوي على عمود "الاسم_الأول" أو "first_name"');
    return { persons: [], errors };
  }
  if (!headers.includes('gender')) {
    errors.push('الملف لا يحتوي على عمود "الجنس" أو "gender"');
    return { persons: [], errors };
  }

  // Parse data rows
  const persons = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const person = {};

    for (let j = 0; j < headers.length; j++) {
      const key = headers[j];
      const value = fields[j] || '';
      if (key && value) {
        person[key] = value;
      }
    }

    // Validate required fields
    if (!person.first_name) {
      errors.push(`سطر ${i + 1}: الاسم الأول مفقود`);
      continue;
    }
    if (!person.gender) {
      errors.push(`سطر ${i + 1}: الجنس مفقود للشخص "${person.first_name}"`);
      continue;
    }

    // Normalize gender
    const normalizedGender = GENDER_MAP[person.gender?.trim()?.toLowerCase()] || GENDER_MAP[person.gender?.trim()];
    if (!normalizedGender) {
      errors.push(`سطر ${i + 1}: جنس غير صالح "${person.gender}" للشخص "${person.first_name}"`);
      continue;
    }
    person.gender = normalizedGender;

    // Normalize status
    if (person.status) {
      person.status = STATUS_MAP[person.status.trim()] || 'alive';
    } else {
      person.status = 'alive';
    }

    persons.push(person);
  }

  return { persons, errors };
}

/**
 * Parse JSON text into person/spouse objects
 * @param {string} text - JSON content
 * @returns {{ persons: Array, spouses: Array, errors: Array }}
 */
export function parseJSON(text) {
  const errors = [];

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { persons: [], spouses: [], errors: ['ملف JSON غير صالح'] };
  }

  // Accept array (persons only) or object with persons/spouses
  let persons = [];
  let spouses = [];

  if (Array.isArray(data)) {
    persons = data;
  } else if (data && typeof data === 'object') {
    persons = data.persons || [];
    spouses = data.spouses || [];
  } else {
    return { persons: [], spouses: [], errors: ['تنسيق JSON غير مدعوم'] };
  }

  // Validate persons
  const validPersons = [];
  for (let i = 0; i < persons.length; i++) {
    const p = persons[i];
    if (!p.first_name) {
      errors.push(`شخص ${i + 1}: الاسم الأول مفقود`);
      continue;
    }
    if (!p.gender) {
      errors.push(`شخص ${i + 1}: الجنس مفقود للشخص "${p.first_name}"`);
      continue;
    }

    // Normalize gender
    const normalizedGender = GENDER_MAP[p.gender?.trim()?.toLowerCase()] || GENDER_MAP[p.gender?.trim()];
    if (!normalizedGender) {
      errors.push(`شخص ${i + 1}: جنس غير صالح "${p.gender}"`);
      continue;
    }
    p.gender = normalizedGender;

    // Normalize status
    if (p.status) {
      p.status = STATUS_MAP[p.status.trim()] || 'alive';
    }

    validPersons.push(p);
  }

  return { persons: validPersons, spouses, errors };
}

/**
 * Generate a CSV template with Arabic headers and an example row
 * @returns {string} CSV content
 */
export function generateTemplate() {
  const bom = '\uFEFF';
  const headers = 'الاسم_الأول,اسم_العائلة,الجنس,اسم_الأب,اسم_الأم,تاريخ_الميلاد,تاريخ_الوفاة,الحالة,نبذة';
  const example = 'أحمد,الفلاني,ذكر,محمد,فاطمة,1950,,حي,';
  return bom + headers + '\n' + example + '\n';
}
