import { useState, useRef } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { parseCSV, parseJSON, generateTemplate } from '../../utils/importParser';
import { treesAPI } from '../../api/client';

export default function ImportModal({ isOpen, onClose, treeId, existingPersons = [], onImportComplete }) {
  const [fileType, setFileType] = useState('csv');
  const [parsedData, setParsedData] = useState(null);
  const [parseErrors, setParseErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResult(null);
    setError('');

    const text = await file.text();

    if (fileType === 'csv' || file.name.endsWith('.csv')) {
      const { persons, errors } = parseCSV(text);
      setParsedData({ persons, spouses: [] });
      setParseErrors(errors);
    } else {
      const { persons, spouses, errors } = parseJSON(text);
      setParsedData({ persons, spouses });
      setParseErrors(errors);
    }
  };

  const handleDownloadTemplate = () => {
    const csv = generateTemplate();
    const blob = new Blob([csv], { type: 'text/csv; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shajara-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!parsedData || !parsedData.persons.length) return;

    setImporting(true);
    setError('');
    setResult(null);

    try {
      const res = await treesAPI.importData(treeId, {
        persons: parsedData.persons,
        spouses: parsedData.spouses,
      });
      setResult(res.data);
      if (onImportComplete) {
        setTimeout(() => onImportComplete(), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ في الاستيراد');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setParsedData(null);
    setParseErrors([]);
    setResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="استيراد بيانات" maxWidth="max-w-2xl">
      <div className="space-y-4">
        {/* File type tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => { setFileType('csv'); setParsedData(null); setParseErrors([]); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              fileType === 'csv'
                ? 'bg-gold-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            CSV
          </button>
          <button
            onClick={() => { setFileType('json'); setParsedData(null); setParseErrors([]); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              fileType === 'json'
                ? 'bg-gold-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            JSON
          </button>
        </div>

        {/* Template download */}
        {fileType === 'csv' && (
          <button
            onClick={handleDownloadTemplate}
            className="text-sm text-gold-500 hover:text-gold-400 underline cursor-pointer"
          >
            تحميل قالب CSV
          </button>
        )}

        {/* File input */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gold-500/50 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept={fileType === 'csv' ? '.csv' : '.json'}
            onChange={handleFileSelect}
            className="hidden"
            id="import-file"
          />
          <label htmlFor="import-file" className="cursor-pointer">
            <div className="text-3xl mb-2">📁</div>
            <p className="text-gray-500 text-sm">
              اضغط لاختيار ملف {fileType === 'csv' ? 'CSV' : 'JSON'}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              أو اسحب الملف هنا
            </p>
          </label>
        </div>

        {/* Parse errors */}
        {parseErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-red-600 mb-2">أخطاء في التحليل:</h4>
            <ul className="text-xs text-red-500 space-y-1">
              {parseErrors.slice(0, 10).map((err, i) => (
                <li key={i}>• {err}</li>
              ))}
              {parseErrors.length > 10 && (
                <li className="text-red-400">... و{parseErrors.length - 10} أخطاء أخرى</li>
              )}
            </ul>
          </div>
        )}

        {/* Preview table */}
        {parsedData && parsedData.persons.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-600 mb-2">
              معاينة ({parsedData.persons.length} شخص)
            </h4>
            <div className="max-h-48 overflow-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-right text-gray-500 text-xs">الاسم</th>
                    <th className="px-3 py-2 text-right text-gray-500 text-xs">الجنس</th>
                    <th className="px-3 py-2 text-right text-gray-500 text-xs">الأب</th>
                    <th className="px-3 py-2 text-right text-gray-500 text-xs">الأم</th>
                    <th className="px-3 py-2 text-right text-gray-500 text-xs">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {parsedData.persons.slice(0, 50).map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-1.5 text-gray-800">
                        {p.first_name} {p.family_name || ''}
                      </td>
                      <td className="px-3 py-1.5 text-gray-500">
                        {p.gender === 'male' ? '👨' : '👩'}
                      </td>
                      <td className="px-3 py-1.5 text-gray-500">{p.father_name || '—'}</td>
                      <td className="px-3 py-1.5 text-gray-500">{p.mother_name || '—'}</td>
                      <td className="px-3 py-1.5 text-gray-500">
                        {p.status === 'deceased' ? 'متوفى' : 'حي'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedData.persons.length > 50 && (
                <div className="text-center py-2 text-xs text-gray-400">
                  ... و{parsedData.persons.length - 50} شخص آخر
                </div>
              )}
            </div>

            {parsedData.spouses.length > 0 && (
              <p className="text-xs text-gray-400 mt-2">
                + {parsedData.spouses.length} علاقة زواج
              </p>
            )}
          </div>
        )}

        {/* Import button */}
        {parsedData && parsedData.persons.length > 0 && !result && (
          <Button
            onClick={handleImport}
            disabled={importing}
            className="w-full"
          >
            {importing ? 'جاري الاستيراد...' : `استيراد ${parsedData.persons.length} شخص`}
          </Button>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Success result */}
        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-green-600 mb-2">تم الاستيراد بنجاح!</h4>
            <div className="text-sm text-green-600">
              <p>• {result.imported.persons} شخص تم استيرادهم</p>
              {result.imported.spouses > 0 && (
                <p>• {result.imported.spouses} علاقة زواج</p>
              )}
            </div>
            {result.warnings?.length > 0 && (
              <div className="mt-3">
                <h5 className="text-xs font-semibold text-amber-600 mb-1">تحذيرات:</h5>
                <ul className="text-xs text-amber-500 space-y-1">
                  {result.warnings.slice(0, 5).map((w, i) => (
                    <li key={i}>• {w}</li>
                  ))}
                  {result.warnings.length > 5 && (
                    <li className="text-amber-400">... و{result.warnings.length - 5} تحذيرات أخرى</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
