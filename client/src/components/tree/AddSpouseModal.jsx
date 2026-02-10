import { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import Select from '../ui/Select';
import Input from '../ui/Input';
import Button from '../ui/Button';

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
    }
  }, [isOpen, forPerson]);

  // Available persons to select as spouse (opposite gender, or any if not specified)
  const spouseOptions = useMemo(() => {
    const targetGender = forPerson?.gender === 'male' ? 'female' : 'male';
    return persons
      .filter(p => p.gender === targetGender && p.id !== forPerson?.id)
      .map(p => ({
        value: p.id,
        label: `${p.first_name} ${p.family_name || ''}`.trim(),
      }));
  }, [persons, forPerson]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`إضافة ${forPerson.gender === 'male' ? 'زوجة' : 'زوج'} لـ ${forPerson.first_name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        <Select
          label={forPerson.gender === 'male' ? 'الزوجة' : 'الزوج'}
          value={formData.person_b_id}
          onChange={(e) => handleChange('person_b_id', e.target.value)}
          options={spouseOptions}
          placeholder="اختر..."
        />

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
  );
}
