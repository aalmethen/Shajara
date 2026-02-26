import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { treesAPI } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';

export default function Dashboard() {
  const [trees, setTrees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTreeName, setNewTreeName] = useState('');
  const [newTreeDescription, setNewTreeDescription] = useState('');
  const [newTreeSlug, setNewTreeSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  const isGlobalAdmin = user?.is_admin;

  useEffect(() => {
    fetchTrees();
  }, []);

  const fetchTrees = async () => {
    try {
      const res = await treesAPI.list();
      setTrees(res.data.trees);
    } catch (err) {
      console.error('Failed to load trees:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTree = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      const res = await treesAPI.create({
        name: newTreeName,
        description: newTreeDescription || undefined,
        slug: newTreeSlug || undefined,
      });
      const tree = res.data.tree;
      setShowCreateModal(false);
      setNewTreeName('');
      setNewTreeDescription('');
      setNewTreeSlug('');
      navigate(`/tree/${tree.slug}`);
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ في إنشاء الشجرة');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {isGlobalAdmin ? 'كل الشجرات' : 'شجراتي'}
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {isGlobalAdmin ? 'إدارة جميع شجرات العائلة' : 'إدارة شجرات العائلة الخاصة بك'}
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            + إنشاء شجرة جديدة
          </Button>
        </div>

        {/* Trees Grid */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">جاري التحميل...</div>
        ) : trees.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🌱</div>
            <h2 className="text-xl text-gray-500 mb-2">لا توجد شجرات بعد</h2>
            <p className="text-gray-400 text-sm mb-6">أنشئ شجرة عائلتك الأولى</p>
            <Button onClick={() => setShowCreateModal(true)}>
              إنشاء شجرة جديدة
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trees.map((tree) => (
              <div
                key={tree.id}
                onClick={() => navigate(`/tree/${tree.slug}`)}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:border-gold-500/50 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 group-hover:text-gold-500 transition-colors">
                      {tree.name}
                    </h3>
                    {tree.description && (
                      <p className="text-gray-400 text-sm mt-1 line-clamp-2">{tree.description}</p>
                    )}
                  </div>
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-500">
                    {tree.role === 'admin' ? 'مدير' : 'مشاهد'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{tree.person_count || 0} شخص</span>
                  <span>{new Date(tree.created_at).toLocaleDateString('ar-SA')}</span>
                </div>

                {isGlobalAdmin && tree.owner_name && (
                  <div className="text-xs text-gray-400 mt-2">
                    المالك: {tree.owner_name}
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400 font-mono" dir="ltr">
                    /tree/{tree.slug}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Tree Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="إنشاء شجرة جديدة"
        >
          <form onSubmit={handleCreateTree} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Input
              label="اسم الشجرة"
              value={newTreeName}
              onChange={(e) => setNewTreeName(e.target.value)}
              placeholder="مثال: عائلة الفلاني"
              required
            />

            <Input
              label="الوصف (اختياري)"
              value={newTreeDescription}
              onChange={(e) => setNewTreeDescription(e.target.value)}
              placeholder="وصف مختصر للشجرة"
            />

            <Input
              label="رابط مخصص (اختياري)"
              value={newTreeSlug}
              onChange={(e) => setNewTreeSlug(e.target.value)}
              placeholder="al-falani"
              dir="ltr"
            />
            <p className="text-xs text-gray-400">سيكون الرابط: /tree/{newTreeSlug || '...'}</p>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={creating || !newTreeName.trim()}>
                {creating ? 'جاري الإنشاء...' : 'إنشاء'}
              </Button>
              <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                إلغاء
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
}
