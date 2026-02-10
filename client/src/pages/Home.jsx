import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

export default function Home() {
  const [slug, setSlug] = useState('');
  const navigate = useNavigate();

  const handleViewTree = (e) => {
    e.preventDefault();
    if (slug.trim()) {
      navigate(`/tree/${slug.trim()}`);
    }
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 pattern-overlay">
        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="mb-6">
            <span className="text-6xl mb-4 block">🌳</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 font-amiri text-gold-gradient">
            شَجَرَة
          </h1>
          <p className="text-xl text-gray-400 mb-2">
            منصة شجرة العائلة
          </p>
          <p className="text-gray-500 text-sm leading-relaxed max-w-lg mx-auto">
            أنشئ شجرة عائلتك وشاركها مع أفراد العائلة. تدعم النسب العربي، تعدد الزوجات، ونسب الذكور
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-6 items-center w-full max-w-lg">
          {/* Create tree */}
          <Link
            to="/register"
            className="w-full sm:w-auto bg-gold-500 text-navy-900 px-8 py-3 rounded-xl text-lg font-semibold hover:bg-gold-400 transition-all hover:shadow-lg hover:shadow-gold-500/20 text-center"
          >
            أنشئ شجرة عائلتك
          </Link>

          {/* View existing tree */}
          <div className="w-full sm:w-auto">
            <form onSubmit={handleViewTree} className="flex gap-2">
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="رابط الشجرة..."
                className="flex-1 px-4 py-3 bg-navy-800 border border-navy-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent text-sm"
                dir="ltr"
              />
              <button
                type="submit"
                className="px-4 py-3 bg-navy-700 border border-navy-600 rounded-xl text-gray-300 hover:text-white hover:bg-navy-600 transition-colors cursor-pointer"
              >
                عرض
              </button>
            </form>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto text-center">
          <div className="p-4">
            <div className="text-3xl mb-3">📜</div>
            <h3 className="text-gold-500 font-semibold mb-1">النسب التلقائي</h3>
            <p className="text-gray-500 text-sm">يُبنى النسب تلقائياً من سلسلة الآباء</p>
          </div>
          <div className="p-4">
            <div className="text-3xl mb-3">🔗</div>
            <h3 className="text-gold-500 font-semibold mb-1">رابط مشاركة</h3>
            <p className="text-gray-500 text-sm">شارك الشجرة بدون تسجيل دخول</p>
          </div>
          <div className="p-4">
            <div className="text-3xl mb-3">👨‍👩‍👧‍👦</div>
            <h3 className="text-gold-500 font-semibold mb-1">تعدد الزوجات</h3>
            <p className="text-gray-500 text-sm">دعم كامل لتعدد الزوجات وزواج الأقارب</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
