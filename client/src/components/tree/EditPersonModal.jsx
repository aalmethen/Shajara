import { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { personFullName } from '../../utils/nasab';

export default function EditPersonModal({
  isOpen,
  onClose,
  onSubmit,
  person,
  persons,
  spouses = [],
}) {
  const [formData, setFormData] = useState({
    first_name: '',
    family_name: '',
    gender: 'male',
    father_id: '',
    mother_id: '',
    birth_date: '',
    death_date: '',
    status: 'alive',
    bio: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Populate form when person changes or modal opens
  useEffect(() => {
    if (isOpen && person) {
      setFormData({
        first_name: person.first_name || '',
        family_name: person.family_name || '',
        gender: person.gender || 'male',
        father_id: person.father_id || '',
        mother_id: person.mother_id || '',
        birth_date: person.birth_date || '',
        death_date: person.death_date || '',
        status: person.status || 'alive',
        bio: person.bio || '',
      });
      setError('');
    }
  }, [isOpen, person]);

  const maleOptions = useMemo(() =>
    persons
      .filter(p => p.gender === 'male' && p.id !== person?.id)
      .map(p => ({
        value: p.id,
        label: personFullName(p, persons),
      })),
    [persons, person]
  );

  // Mother options: only show wives/ex-wives of the selected father
  const motherOptions = useMemo(() => {
    if (!formData.father_id) {
      // No father selected — show all females
      return persons
        .filter(p => p.gender === 'female' && p.id !== person?.id)
        .map(p => ({
          value: p.id,
          label: personFullName(p, persons),
        }));
    }
    // Get IDs of women who are/were married to the selected father
    const wifeIds = new Set(
      spouses
        .filter(s => s.person_a_id === formData.father_id || s.person_b_id === formData.father_id)
        .map(s => s.person_a_id === formData.father_id ? s.person_b_id : s.person_a_id)
    );
    return persons
      .filter(p => p.gender === 'female' && p.id !== person?.id && wifeIds.has(p.id))
      .map(p => ({
        value: p.id,
        label: personFullName(p, persons),
      }));
  }, [persons, spouses, formData.father_id, person]);

  const handleChange = (field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'father_id') {
        // Clear mother when father changes (wives list will change)
        next.mother_id = '';
        // Default family name to father's family name
        const father = persons.find(p => p.id === value);
        if (father?.family_name) {
          next.family_name = father.family_name;
        }
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = {
        ...formData,
        father_id: formData.father_id || null,
        mother_id: formData.mother_id || null,
        death_date: formData.status === 'deceased' ? formData.death_date : null,
      };
      await onSubmit(person.id, data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ في تحديث البيانات');
    } finally {
      setLoading(false);
    }
  };

  if (!person) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`تعديل: ${personFullName(person, persons)}`} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        <Input
          label="الاسم الأول"
          value={formData.first_name}
          onChange={(e) => handleChange('first_name', e.target.value)}
          placeholder="مثال: أحمد"
          required
        />

        <Input
          label="اسم العائلة"
          value={formData.family_name}
          onChange={(e) => handleChange('family_name', e.target.value)}
          placeholder="مثال: الفلاني"
        />

        {/* Gender */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-300">الجنس</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="edit-gender"
                value="male"
                checked={formData.gender === 'male'}
                onChange={(e) => handleChange('gender', e.target.value)}
                className="accent-gold-500"
              />
              <span className="text-sm text-gray-300">ذكر</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="edit-gender"
                value="female"
                checked={formData.gender === 'female'}
                onChange={(e) => handleChange('gender', e.target.value)}
                className="accent-gold-500"
              />
              <span className="text-sm text-gray-300">أنثى</span>
            </label>
          </div>
        </div>

        <Select
          label="الأب"
          value={formData.father_id}
          onChange={(e) => handleChange('father_id', e.target.value)}
          options={maleOptions}
          placeholder="اختر الأب (اختياري)"
        />

        <Select
          label="الأم"
          value={formData.mother_id}
          onChange={(e) => handleChange('mother_id', e.target.value)}
          options={motherOptions}
          placeholder={formData.father_id ? 'اختر من زوجات الأب' : 'اختر الأم (اختياري)'}
        />

        <Input
          label="تاريخ الميلاد"
          value={formData.birth_date}
          onChange={(e) => handleChange('birth_date', e.target.value)}
          placeholder="مثال: 1950 أو 1950-01-15"
          dir="ltr"
        />

        {/* Status */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-300">الحالة</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="edit-status"
                value="alive"
                checked={formData.status === 'alive'}
                onChange={(e) => handleChange('status', e.target.value)}
                className="accent-gold-500"
              />
              <span className="text-sm text-gray-300">على قيد الحياة</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="edit-status"
                value="deceased"
                checked={formData.status === 'deceased'}
                onChange={(e) => handleChange('status', e.target.value)}
                className="accent-gold-500"
              />
              <span className="text-sm text-gray-300">متوفى</span>
            </label>
          </div>
        </div>

        {formData.status === 'deceased' && (
          <Input
            label="تاريخ الوفاة"
            value={formData.death_date}
            onChange={(e) => handleChange('death_date', e.target.value)}
            placeholder="مثال: 2020"
            dir="ltr"
          />
        )}

        <Input
          label="نبذة"
          value={formData.bio}
          onChange={(e) => handleChange('bio', e.target.value)}
          placeholder="معلومات إضافية (اختياري)"
        />

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading || !formData.first_name.trim()}>
            {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
        </div>
      </form>
    </Modal>
  );
}
