import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTreeData } from '../hooks/useTreeData';
import { treesAPI } from '../api/client';
import TreeCanvas from '../components/tree/TreeCanvas';
import TreeControls from '../components/tree/TreeControls';
import PersonDetailPanel from '../components/tree/PersonDetailPanel';
import AddPersonModal from '../components/tree/AddPersonModal';
import AddSpouseModal from '../components/tree/AddSpouseModal';
import EditPersonModal from '../components/tree/EditPersonModal';
import ImportModal from '../components/tree/ImportModal';
import RelationshipModal from '../components/tree/RelationshipModal';
import Button from '../components/ui/Button';

export default function TreeView() {
  const { slug } = useParams();
  const {
    tree,
    persons,
    spouses,
    isAdmin,
    loading,
    error,
    selectedPerson,
    setSelectedPerson,
    lineageMode,
    toggleLineageMode,
    rootPersonId,
    setRootPerson,
    maxDepth,
    setMaxDepth,
    linkedPersonId,
    addPerson,
    updatePerson,
    deletePerson,
    addSpouse,
    deleteSpouse,
    hasMore,
    refetch,
  } = useTreeData(slug);

  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showAddSpouse, setShowAddSpouse] = useState(false);
  const [showEditPerson, setShowEditPerson] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [addPersonDefaults, setAddPersonDefaults] = useState({});
  const [spouseForPerson, setSpouseForPerson] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showRelationship, setShowRelationship] = useState(false);
  const [relationshipFrom, setRelationshipFrom] = useState(null);
  const [relationshipTo, setRelationshipTo] = useState(null);
  const exportMenuRef = useRef(null);

  // Close export menu on outside click
  useEffect(() => {
    if (!showExportMenu) return;
    const handleClick = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showExportMenu]);

  // Loading state
  if (loading) {
    return (
      <div className="h-screen bg-navy-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🌳</div>
          <p className="text-gray-500">جاري تحميل الشجرة...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-screen bg-navy-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">😞</div>
          <p className="text-red-400 mb-4">{error}</p>
          <Link to="/" className="text-gold-500 hover:text-gold-400">
            العودة للرئيسية
          </Link>
        </div>
      </div>
    );
  }

  const handleAddChild = (parent) => {
    if (parent.gender === 'male') {
      setAddPersonDefaults({ father_id: parent.id });
    } else {
      setAddPersonDefaults({ mother_id: parent.id });
    }
    setShowAddPerson(true);
  };

  const handleAddSpouseFor = (person) => {
    setSpouseForPerson(person);
    setShowAddSpouse(true);
  };

  const handleViewFromHere = (personId) => {
    setRootPerson(personId);
    setSelectedPerson(null);
  };

  const handleEditPerson = (person) => {
    setEditingPerson(person);
    setShowEditPerson(true);
  };

  const handleDeletePerson = async (personId) => {
    try {
      await deletePerson(personId);
      setSelectedPerson(null);
    } catch (err) {
      alert(err.response?.data?.error || 'حدث خطأ في حذف الشخص');
    }
  };

  const handleDeleteSpouse = async (spouseRelId) => {
    try {
      await deleteSpouse(spouseRelId);
    } catch (err) {
      alert(err.response?.data?.error || 'حدث خطأ في حذف الزواج');
    }
  };

  const handleExport = async (format) => {
    setShowExportMenu(false);
    try {
      const res = format === 'json'
        ? await treesAPI.exportJSON(tree.id)
        : await treesAPI.exportCSV(tree.id);
      const blob = new Blob([res.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shajara-${tree.name}-${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.error || 'حدث خطأ في التصدير');
    }
  };

  const handleFindRelationship = (fromId, toId) => {
    setRelationshipFrom(fromId);
    setRelationshipTo(toId);
    setShowRelationship(true);
  };

  const handleCompareWith = (personId) => {
    setRelationshipFrom(personId);
    setRelationshipTo(null);
    setShowRelationship(true);
  };

  return (
    <div className="h-screen bg-navy-900 flex flex-col">
      {/* Top bar */}
      <div className="h-12 bg-navy-800/90 backdrop-blur-sm border-b border-navy-700 flex items-center justify-between px-4 shrink-0 z-40">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gold-500 hover:text-gold-400 transition-colors text-lg">
            🌳
          </Link>
          <h1 className="text-sm font-semibold text-white">
            {tree?.name}
          </h1>
          <span className="text-xs text-gray-500">
            ({persons.length} شخص)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              {/* Export dropdown */}
              <div className="relative" ref={exportMenuRef}>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                >
                  تصدير ↓
                </Button>
                {showExportMenu && (
                  <div className="absolute top-full mt-1 left-0 bg-navy-700 border border-navy-600 rounded-lg shadow-xl overflow-hidden z-50 min-w-[140px]">
                    <button
                      onClick={() => handleExport('json')}
                      className="w-full text-right px-4 py-2 text-sm text-gray-300 hover:bg-navy-600 hover:text-white transition-colors cursor-pointer"
                    >
                      تصدير JSON
                    </button>
                    <button
                      onClick={() => handleExport('csv')}
                      className="w-full text-right px-4 py-2 text-sm text-gray-300 hover:bg-navy-600 hover:text-white transition-colors cursor-pointer"
                    >
                      تصدير CSV
                    </button>
                  </div>
                )}
              </div>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowImport(true)}
              >
                استيراد
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setAddPersonDefaults({});
                  setShowAddPerson(true);
                }}
              >
                + إضافة شخص
              </Button>
            </>
          )}
          <Link
            to={isAdmin ? '/dashboard' : '/'}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            {isAdmin ? 'شجراتي' : 'الرئيسية'}
          </Link>
        </div>
      </div>

      {/* Main canvas area */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        <TreeCanvas
          persons={persons}
          spouses={spouses}
          rootPersonId={rootPersonId}
          lineageMode={lineageMode}
          selectedPerson={selectedPerson}
          onSelectPerson={setSelectedPerson}
          maxDepth={maxDepth}
          hasMore={hasMore}
        />

        {/* Tree controls */}
        <TreeControls
          persons={persons}
          lineageMode={lineageMode}
          onToggleLineage={toggleLineageMode}
          rootPersonId={rootPersonId}
          onChangeRoot={setRootPerson}
          maxDepth={maxDepth}
          onChangeDepth={setMaxDepth}
          onSelectPerson={setSelectedPerson}
          onComparePersons={() => {
            setRelationshipFrom(null);
            setRelationshipTo(null);
            setShowRelationship(true);
          }}
        />

        {/* Person detail panel */}
        {selectedPerson && (
          <PersonDetailPanel
            person={selectedPerson}
            persons={persons}
            spouses={spouses}
            isAdmin={isAdmin}
            onClose={() => setSelectedPerson(null)}
            onViewFromHere={handleViewFromHere}
            onAddChild={handleAddChild}
            onEdit={handleEditPerson}
            onAddSpouse={handleAddSpouseFor}
            onDelete={handleDeletePerson}
            onDeleteSpouse={handleDeleteSpouse}
            linkedPersonId={linkedPersonId}
            onFindRelationship={handleFindRelationship}
            onCompareWith={handleCompareWith}
          />
        )}
      </div>

      {/* Add Person Modal */}
      <AddPersonModal
        isOpen={showAddPerson}
        onClose={() => setShowAddPerson(false)}
        onSubmit={addPerson}
        persons={persons}
        spouses={spouses}
        defaultFatherId={addPersonDefaults.father_id}
        defaultMotherId={addPersonDefaults.mother_id}
      />

      {/* Add Spouse Modal */}
      <AddSpouseModal
        isOpen={showAddSpouse}
        onClose={() => {
          setShowAddSpouse(false);
          setSpouseForPerson(null);
        }}
        onSubmit={addSpouse}
        persons={persons}
        forPerson={spouseForPerson}
      />

      {/* Edit Person Modal */}
      <EditPersonModal
        isOpen={showEditPerson}
        onClose={() => {
          setShowEditPerson(false);
          setEditingPerson(null);
        }}
        onSubmit={updatePerson}
        person={editingPerson}
        persons={persons}
        spouses={spouses}
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        treeId={tree?.id}
        existingPersons={persons}
        onImportComplete={() => {
          setShowImport(false);
          refetch();
        }}
      />

      {/* Relationship Modal */}
      <RelationshipModal
        isOpen={showRelationship}
        onClose={() => setShowRelationship(false)}
        treeId={tree?.id}
        persons={persons}
        initialFromId={relationshipFrom}
        initialToId={relationshipTo}
      />
    </div>
  );
}
