import { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import Select from '../ui/Select';
import Input from '../ui/Input';
import Button from '../ui/Button';
import LinkPersonModal from './LinkPersonModal';
import { personFullName } from '../../utils/nasab';

export default function AddSpouseModal({
  isOpen,
  onClose,
  onSubmit,
  persons,
  forPerson = null,
}) {
  const [formData, setFormData] = useState({
    person_a_id: forPerson?.id || '',
    person_b_id: '',
    marriage_date: '',
    marriage_order: 1,
    status: 'married',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLinkSpouse, setShowLinkSpouse] = useState(false);
  const [linkedSpouseName, setLinkedSpouseName] = useState('');

  // Reset form when modal opens or forPerson changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        person_a_id: forPerson?.id || '',
        person_b_id: '',
        marriage_date: '',
        marriage_order: 1,
        status: 'married',
      });
      setError('');
      setLinkedSpouseName('');
    }
  }, [isOpen, forPerson]);

  // Available persons to select as spouse (opposite gender, or any if not specified)
  const spouseOptions = useMemo(() => {
    const targetGender = forPerson?.gender === 'male' ? 'female' : 'male';
    return persons
      .filter(p => p.gender === targetGender && p.id !== forPerson?.id)
      .map(p => ({
        value: p.id,
        label: personFullName(p, persons),
      }));
  }, [persons, forPerson]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'person_b_id') setLinkedSpouseName('');
  };

  const handleLinkSpouse = (person) => {
    setFormData(prev => ({ ...prev, person_b_id: person.id }));
    setLinkedSpouseName(personFullName(person, persons));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onSubmit({
        person_a_id: forPerson?.id,
        person_b_id: formData.person_b_id,
        marriage_date: formData.marriage_date || null,
        marriage_order: parseInt(formData.marriage_order) || 1,
        status: formData.status,
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ في إضافة العلاقة');
    } finally {
      setLoading(false);
    }
  };

  if (!forPerson) return null;

  const targetGender = forPerson.gender === 'male' ? 'female' : 'male';

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={`إضافة ${forPerson.gender === 'male' ? 'زوجة' : 'زوج'} لـ ${personFullName(forPerson, persons)}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <Select
              label={forPerson.gender === 'male' ? 'الزوجة' : 'الزوج'}
              value={formData.person_b_id}
              onChange={(e) => handleChange('person_b_id', e.target.value)}
              options={spouseOptions}
              placeholder="اختر..."
            />
            {linkedSpouseName && (
              <p className="text-xs text-gold-500">
                {forPerson.gender === 'male' ? 'مرتبطة' : 'مرتبط'}: {linkedSpouseName}
              </p>
            )}
            <button
              type="button"
              onClick={() => setShowLinkSpouse(true)}
              className="text-xs text-gold-500/70 hover:text-gold-400 transition-colors cursor-pointer"
            >
              🔍 بحث في كل الأشجار
            </button>
          </div>

          <Input
            label="تاريخ الزواج"
            value={formData.marriage_date}
            onChange={(e) => handleChange('marriage_date', e.target.value)}
            placeholder="مثال: 1980"
            dir="ltr"
          />

          <Input
            label="ترتيب الزواج"
            type="number"
            min="1"
            max="4"
            value={formData.marriage_order}
            onChange={(e) => handleChange('marriage_order', e.target.value)}
            dir="ltr"
          />

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading || !formData.person_b_id}>
              {loading ? 'جاري الإضافة...' : 'إضافة'}
            </Button>
            <Button variant="secondary" onClick={onClose}>
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      <LinkPersonModal
        isOpen={showLinkSpouse}
        onClose={() => setShowLinkSpouse(false)}
        onSelect={handleLinkSpouse}
        title={`بحث عن ${forPerson.gender === 'male' ? 'زوجة' : 'زوج'} في كل الأشجار`}
        genderFilter={targetGender}
      />
    </>
  );
}
