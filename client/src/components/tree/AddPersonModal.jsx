import { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import LinkPersonModal from './LinkPersonModal';

export default function AddPersonModal({
  isOpen,
  onClose,
  onSubmit,
  persons,
  defaultFatherId = null,
  defaultMotherId = null,
}) {
  const [formData, setFormData] = useState({
    first_name: '',
    family_name: '',
    gender: 'male',
    father_id: defaultFatherId || '',
    mother_id: defaultMotherId || '',
    birth_date: '',
    death_date: '',
    status: 'alive',
    bio: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLinkFather, setShowLinkFather] = useState(false);
  const [showLinkMother, setShowLinkMother] = useState(false);
  const [linkedFatherName, setLinkedFatherName] = useState('');
  const [linkedMotherName, setLinkedMotherName] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        first_name: '',
        family_name: '',
        gender: 'male',
        father_id: defaultFatherId || '',
        mother_id: defaultMotherId || '',
        birth_date: '',
        death_date: '',
        status: 'alive',
        bio: '',
      });
      setError('');
      setLinkedFatherName('');
      setLinkedMotherName('');
    }
  }, [isOpen, defaultFatherId, defaultMotherId]);

  const maleOptions = useMemo(() =>
    persons
      .filter(p => p.gender === 'male')
      .map(p => ({
        value: p.id,
        label: `${p.first_name} ${p.family_name || ''}`.trim(),
      })),
    [persons]
  );

  const femaleOptions = useMemo(() =>
    persons
      .filter(p => p.gender === 'female')
      .map(p => ({
        value: p.id,
        label: `${p.first_name} ${p.family_name || ''}`.trim(),
      })),
    [persons]
  );

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear linked name if user changes dropdown selection
    if (field === 'father_id') setLinkedFatherName('');
    if (field === 'mother_id') setLinkedMotherName('');
  };

  const handleLinkFather = (person) => {
    setFormData(prev => ({ ...prev, father_id: person.id }));
    setLinkedFatherName(`${person.first_name} ${person.family_name || ''}`.trim());
  };

  const handleLinkMother = (person) => {
    setFormData(prev => ({ ...prev, mother_id: person.id }));
    setLinkedMotherName(`${person.first_name} ${person.family_name || ''}`.trim());
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
      await onSubmit(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ في إضافة الشخص');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="إضافة شخص جديد" maxWidth="max-w-md">
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
                  name="gender"
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
                  name="gender"
                  value="female"
                  checked={formData.gender === 'female'}
                  onChange={(e) => handleChange('gender', e.target.value)}
                  className="accent-gold-500"
                />
                <span className="text-sm text-gray-300">أنثى</span>
              </label>
            </div>
          </div>

          {/* Father selection */}
          <div className="space-y-1">
            <Select
              label="الأب"
              value={formData.father_id}
              onChange={(e) => handleChange('father_id', e.target.value)}
              options={maleOptions}
              placeholder="اختر الأب (اختياري)"
            />
            {linkedFatherName && (
              <p className="text-xs text-gold-500">
                مرتبط: {linkedFatherName}
              </p>
            )}
            <button
              type="button"
              onClick={() => setShowLinkFather(true)}
              className="text-xs text-gold-500/70 hover:text-gold-400 transition-colors cursor-pointer"
            >
              🔍 بحث في كل الأشجار
            </button>
          </div>

          {/* Mother selection */}
          <div className="space-y-1">
            <Select
              label="الأم"
              value={formData.mother_id}
              onChange={(e) => handleChange('mother_id', e.target.value)}
              options={femaleOptions}
              placeholder="اختر الأم (اختياري)"
            />
            {linkedMotherName && (
              <p className="text-xs text-gold-500">
                مرتبطة: {linkedMotherName}
              </p>
            )}
            <button
              type="button"
              onClick={() => setShowLinkMother(true)}
              className="text-xs text-gold-500/70 hover:text-gold-400 transition-colors cursor-pointer"
            >
              🔍 بحث في كل الأشجار
            </button>
          </div>

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
                  name="status"
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
                  name="status"
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

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading || !formData.first_name.trim()}>
              {loading ? 'جاري الإضافة...' : 'إضافة'}
            </Button>
            <Button variant="secondary" onClick={onClose}>
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      {/* Global search modals for father/mother */}
      <LinkPersonModal
        isOpen={showLinkFather}
        onClose={() => setShowLinkFather(false)}
        onSelect={handleLinkFather}
        title="بحث عن الأب في كل الأشجار"
        genderFilter="male"
      />

      <LinkPersonModal
        isOpen={showLinkMother}
        onClose={() => setShowLinkMother(false)}
        onSelect={handleLinkMother}
        title="بحث عن الأم في كل الأشجار"
        genderFilter="female"
      />
    </>
  );
}
