'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import OpticalForm from '@/components/OpticalForm';

// ─── Yardımcı: dolu cevap sayısı ────────────────────────────────────────────
const answeredCount = (ak) => Object.values(ak || {}).filter(Boolean).length;

// ─── Dosya yükleme alanı bileşeni ───────────────────────────────────────────
function DropZone({ file, onFile }) {
    const inputRef = useRef(null);
    const [dragging, setDragging] = useState(false);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
    };

    return (
        <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all ${
                dragging
                    ? 'border-blue-400 bg-blue-50'
                    : file
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/40'
            }`}
        >
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
                className="hidden"
                onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
            />
            {file ? (
                <>
                    <span className="text-3xl">✅</span>
                    <p className="text-sm font-semibold text-emerald-700">{file.name}</p>
                    <p className="text-xs text-emerald-500">
                        {(file.size / 1024).toFixed(0)} KB · Değiştirmek için tıklayın
                    </p>
                </>
            ) : (
                <>
                    <span className="text-3xl">📎</span>
                    <p className="text-sm font-semibold text-gray-600">Dosyayı buraya sürükleyin</p>
                    <p className="text-xs text-gray-400">veya seçmek için tıklayın</p>
                    <p className="text-xs text-gray-300 mt-1">JPG · PNG · WEBP · PDF · maks. 10 MB</p>
                </>
            )}
        </div>
    );
}

// ─── Kategori Accordion bileşeni ─────────────────────────────────────────────
function CategoryGroup({ category, templates, openViewModal, openDeleteConfirm, deleting }) {
    const [expanded, setExpanded] = useState(true);
    const totalTests = templates.length;
    const totalFilled = templates.reduce((sum, t) => sum + answeredCount(t.answer_key), 0);
    const totalQuestions = templates.reduce((sum, t) => sum + t.question_count, 0);

    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            {/* Kategori Başlığı */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/60 transition-all group"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-sm">
                        <span className="text-white text-sm font-bold">📚</span>
                    </div>
                    <div className="text-left min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate group-hover:text-violet-700 transition-colors">
                            {category}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {totalTests} test · {totalFilled}/{totalQuestions} toplam cevap
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-bold">
                        {totalTests}
                    </span>
                    <svg
                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {/* Testler Listesi */}
            {expanded && (
                <div className="border-t border-gray-50 divide-y divide-gray-50">
                    {templates.map((t) => {
                        const filled = answeredCount(t.answer_key);
                        const pct = t.question_count > 0 ? Math.round((filled / t.question_count) * 100) : 0;
                        const isDeleting = deleting === t.id;
                        return (
                            <div
                                key={t.id}
                                onClick={() => openViewModal(t)}
                                className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-blue-50/40 transition-all group/item ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <div className="shrink-0 w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 group-hover/item:bg-blue-100 group-hover/item:text-blue-600 transition-colors">
                                    🔑
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-700 text-sm truncate group-hover/item:text-blue-700 transition-colors">
                                        {t.name}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-xs text-gray-400">
                                            {t.question_count} soru · {t.option_count} şık
                                        </span>
                                        <div className="flex items-center gap-1.5 flex-1 max-w-[120px]">
                                            <div className="h-1 flex-1 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-amber-400' : 'bg-gray-300'}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-medium text-gray-500">{filled}/{t.question_count}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs text-gray-300">
                                        {new Date(t.created_at).toLocaleDateString('tr-TR')}
                                    </span>
                                    <button
                                        onClick={(e) => openDeleteConfirm(e, t)}
                                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all opacity-0 group-hover/item:opacity-100"
                                        title="Sil"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Ana sayfa ───────────────────────────────────────────────────────────────
export default function AnswerKeysPage() {
    const { profile } = useAuth();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);

    // Manuel oluşturma modalı
    const [showManualModal, setShowManualModal] = useState(false);
    const [manualMode, setManualMode] = useState('create'); // 'create' | 'view'
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [manualName, setManualName] = useState('');
    const [manualCategory, setManualCategory] = useState('');
    const [manualQCount, setManualQCount] = useState(20);
    const [manualOptCount, setManualOptCount] = useState(5);
    const [manualAnswerKey, setManualAnswerKey] = useState({});
    const [manualFormStep, setManualFormStep] = useState('info');
    const [manualSaving, setManualSaving] = useState(false);

    // AI import modalı
    const [showImportModal, setShowImportModal] = useState(false);
    const [importStep, setImportStep] = useState('upload'); // 'upload' | 'preview'
    const [importBookName, setImportBookName] = useState('');
    const [importUnitName, setImportUnitName] = useState('');
    const [importFile, setImportFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importError, setImportError] = useState('');
    const [extractedTemplates, setExtractedTemplates] = useState([]);
    const [editedNames, setEditedNames] = useState({});
    const [bulkSaving, setBulkSaving] = useState(false);

    // Silme
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(null);

    // Kategori filtre
    const [filterCategory, setFilterCategory] = useState('all');

    useEffect(() => { if (profile) fetchTemplates(); }, [profile]);

    const fetchTemplates = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('answer_key_templates')
            .select('*')
            .eq('teacher_id', profile.id)
            .order('created_at', { ascending: false });
        if (!error) setTemplates(data || []);
        setLoading(false);
    };

    // ── Kategorilere ayır ────────────────────────────────────────────────────
    const groupedTemplates = useMemo(() => {
        const groups = {};
        templates.forEach((t) => {
            const cat = t.category || 'Kategorisiz';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(t);
        });
        return groups;
    }, [templates]);

    const categories = useMemo(() => Object.keys(groupedTemplates).sort((a, b) => {
        if (a === 'Kategorisiz') return 1;
        if (b === 'Kategorisiz') return -1;
        return a.localeCompare(b, 'tr');
    }), [groupedTemplates]);

    // Mevcut kategorileri çek (auto-complete için)
    const existingCategories = useMemo(() => {
        return [...new Set(templates.map(t => t.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
    }, [templates]);

    const filteredCategories = filterCategory === 'all' ? categories : categories.filter(c => c === filterCategory);

    // ── Manuel modal ──────────────────────────────────────────────────────────
    const openCreateModal = () => {
        setManualName(''); setManualCategory(''); setManualQCount(20); setManualOptCount(5);
        setManualAnswerKey({}); setManualFormStep('info');
        setManualMode('create'); setSelectedTemplate(null);
        setShowManualModal(true);
    };

    const openViewModal = (t) => {
        setSelectedTemplate(t); setManualMode('view');
        setShowManualModal(true);
    };

    const handleSaveManual = async (answers) => {
        if (!manualName.trim()) return;
        setManualSaving(true);
        const { error } = await supabase.from('answer_key_templates').insert([{
            teacher_id: profile.id,
            name: manualName.trim(),
            category: manualCategory.trim() || null,
            question_count: manualQCount,
            option_count: manualOptCount,
            answer_key: answers,
        }]);
        if (error) {
            alert(error.code === '23505' ? 'Bu isimde bir cevap anahtarı zaten mevcut.' : 'Kaydedilemedi: ' + error.message);
        } else {
            await fetchTemplates();
            setShowManualModal(false);
        }
        setManualSaving(false);
    };

    // ── AI Import modal ───────────────────────────────────────────────────────
    const openImportModal = () => {
        setImportBookName(''); setImportUnitName(''); setImportFile(null);
        setImporting(false); setImportError('');
        setExtractedTemplates([]); setEditedNames({});
        setImportStep('upload'); setShowImportModal(true);
    };

    const handleExtract = async () => {
        if (!importFile || !importBookName.trim()) return;
        setImporting(true);
        setImportError('');

        const fd = new FormData();
        fd.append('file', importFile);
        fd.append('bookName', importBookName.trim());
        if (importUnitName.trim()) {
            fd.append('unitName', importUnitName.trim());
        }

        try {
            const res = await fetch('/api/extract-answer-keys', { method: 'POST', body: fd });
            const json = await res.json();
            if (!res.ok) {
                setImportError(json.error || 'Bir hata oluştu.');
            } else {
                setExtractedTemplates(json.templates);
                const names = {};
                json.templates.forEach((t, i) => { names[i] = t.name; });
                setEditedNames(names);
                setImportStep('preview');
            }
        } catch (err) {
            setImportError('Sunucu hatası: ' + err.message);
        }
        setImporting(false);
    };

    const handleBulkSave = async () => {
        setBulkSaving(true);
        const inserts = extractedTemplates.map((t, i) => ({
            teacher_id: profile.id,
            name: editedNames[i] ?? t.name,
            category: importBookName.trim() || null,
            question_count: t.question_count,
            option_count: t.option_count,
            answer_key: t.answer_key,
        }));
        const { error } = await supabase.from('answer_key_templates').insert(inserts);
        if (error) {
            alert('Kaydedilemedi: ' + error.message);
        } else {
            await fetchTemplates();
            setShowImportModal(false);
        }
        setBulkSaving(false);
    };

    // ── Silme ─────────────────────────────────────────────────────────────────
    const openDeleteConfirm = (e, t) => { e.stopPropagation(); setConfirmDelete(t); };
    const executeDelete = async () => {
        const t = confirmDelete;
        setConfirmDelete(null);
        setDeleting(t.id);
        const { error } = await supabase.from('answer_key_templates').delete().eq('id', t.id);
        if (error) alert('Silinemedi: ' + error.message);
        else setTemplates((prev) => prev.filter((x) => x.id !== t.id));
        setDeleting(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-pulse text-gray-400">Yükleniyor...</div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">

            {/* ── Başlık ── */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">🔑 Cevap Anahtarları</h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Hazır cevap anahtarlarını yönetin, ödev verirken hızlıca seçin.
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={openImportModal}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-violet-600 text-white font-semibold rounded-xl shadow-sm hover:bg-violet-700 active:scale-[0.98] transition-all text-sm"
                    >
                        ✨ Dosyadan İçe Aktar
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gray-900 text-white font-semibold rounded-xl shadow-sm hover:bg-gray-800 active:scale-[0.98] transition-all text-sm"
                    >
                        ➕ Manuel Ekle
                    </button>
                </div>
            </div>

            {/* ── Kategori filtre ── */}
            {categories.length > 1 && (
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => setFilterCategory('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            filterCategory === 'all'
                                ? 'bg-gray-900 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                    >
                        Tümü ({templates.length})
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setFilterCategory(filterCategory === cat ? 'all' : cat)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                filterCategory === cat
                                    ? 'bg-violet-600 text-white shadow-sm'
                                    : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
                            }`}
                        >
                            {cat} ({groupedTemplates[cat].length})
                        </button>
                    ))}
                </div>
            )}

            {/* ── Sıfır durum ── */}
            {templates.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
                    <div className="text-4xl mb-3">🔑</div>
                    <p className="text-gray-500 font-medium">Henüz cevap anahtarı eklemediniz.</p>
                    <p className="text-gray-400 text-sm mt-1">
                        Kitap testleri gibi sık kullandığınız anahtarları buraya ekleyin.
                    </p>
                    <div className="flex items-center justify-center gap-3 mt-4">
                        <button onClick={openImportModal} className="text-violet-600 font-medium text-sm hover:underline">
                            ✨ Dosyadan içe aktar →
                        </button>
                        <span className="text-gray-300">|</span>
                        <button onClick={openCreateModal} className="text-blue-600 font-medium text-sm hover:underline">
                            Manuel ekle →
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredCategories.map((cat) => (
                        <CategoryGroup
                            key={cat}
                            category={cat}
                            templates={groupedTemplates[cat]}
                            openViewModal={openViewModal}
                            openDeleteConfirm={openDeleteConfirm}
                            deleting={deleting}
                        />
                    ))}
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                MODAL — Manuel Ekle / Görüntüle
            ═══════════════════════════════════════════════════════════ */}
            {showManualModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowManualModal(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-6 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h2 className="text-base font-bold text-gray-900">
                                {manualMode === 'create' ? '➕ Yeni Cevap Anahtarı' : `🔑 ${selectedTemplate?.name}`}
                            </h2>
                            <button onClick={() => setShowManualModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-all">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6">
                            {manualMode === 'view' && selectedTemplate ? (
                                <div className="space-y-4">
                                    <div className="flex gap-4 text-sm text-gray-500 flex-wrap">
                                        <span>📊 {selectedTemplate.question_count} soru</span>
                                        <span>🔢 {selectedTemplate.option_count} şık</span>
                                        <span>✅ {answeredCount(selectedTemplate.answer_key)} cevap</span>
                                        {selectedTemplate.category && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-600 rounded-lg text-xs font-medium">
                                                📚 {selectedTemplate.category}
                                            </span>
                                        )}
                                    </div>
                                    <OpticalForm
                                        questionCount={selectedTemplate.question_count}
                                        optionCount={selectedTemplate.option_count}
                                        mode="teacher" initialAnswers={selectedTemplate.answer_key}
                                        readOnly={true} showTopics={false} topics={[]} questionTopics={{}}
                                    />
                                </div>
                            ) : manualFormStep === 'info' ? (
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Cevap Anahtarı Adı</label>
                                        <input
                                            type="text" value={manualName} onChange={(e) => setManualName(e.target.value)}
                                            placeholder="Örn: Hız Hibrit Test 1" autoFocus
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1.5">
                                            Kategori (Kitap Adı)
                                            <span className="text-xs text-gray-400 ml-1">— isteğe bağlı</span>
                                        </label>
                                        <input
                                            type="text" value={manualCategory} onChange={(e) => setManualCategory(e.target.value)}
                                            placeholder="Örn: Hız Hibrit, Karekök Matematik..."
                                            list="category-suggestions"
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none transition-all text-sm"
                                        />
                                        <datalist id="category-suggestions">
                                            {existingCategories.map((cat) => (
                                                <option key={cat} value={cat} />
                                            ))}
                                        </datalist>
                                        <p className="text-xs text-gray-400 mt-1.5">
                                            Aynı kitaba ait testleri gruplamak için kitap adını girin.
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Soru Sayısı</label>
                                        <input
                                            type="number" min={1} max={100} value={manualQCount}
                                            onChange={(e) => setManualQCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-2">Şık Sayısı</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[4, 5].map((count) => (
                                                <button key={count} onClick={() => setManualOptCount(count)}
                                                    className={`flex flex-col items-center gap-1 p-4 rounded-xl border-2 transition-all ${manualOptCount === count ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
                                                >
                                                    <span className="text-2xl font-bold">{count}</span>
                                                    <span className="text-xs font-medium">{count === 4 ? 'A · B · C · D' : 'A · B · C · D · E'}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { if (manualName.trim()) setManualFormStep('answers'); }}
                                        disabled={!manualName.trim()}
                                        className="w-full py-3 bg-gray-900 text-white font-semibold rounded-xl shadow-sm hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-40 text-sm"
                                    >
                                        Sonraki: Cevapları Gir →
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setManualFormStep('info')} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← Geri</button>
                                        <span className="text-xs text-gray-300">|</span>
                                        <p className="text-xs text-gray-500"><strong>{manualName}</strong> · {manualQCount} soru · {manualOptCount} şık</p>
                                        {manualCategory.trim() && (
                                            <>
                                                <span className="text-xs text-gray-300">|</span>
                                                <span className="text-xs text-violet-500 font-medium">📚 {manualCategory}</span>
                                            </>
                                        )}
                                    </div>
                                    <OpticalForm
                                        questionCount={manualQCount} optionCount={manualOptCount}
                                        mode="teacher" initialAnswers={manualAnswerKey}
                                        showTopics={false} topics={[]} questionTopics={{}}
                                        onSubmit={handleSaveManual}
                                        submitLabel={manualSaving ? 'Kaydediliyor...' : '💾 Cevap Anahtarını Kaydet'}
                                        submitDisabled={manualSaving}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                MODAL — AI İçe Aktarma
            ═══════════════════════════════════════════════════════════ */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !importing && !bulkSaving && setShowImportModal(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-6 overflow-hidden">

                        {/* Modal başlık */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <div>
                                <h2 className="text-base font-bold text-gray-900">✨ Dosyadan İçe Aktar</h2>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {importStep === 'upload' ? 'Adım 1/2 — Dosya yükle' : `Adım 2/2 — Önizleme ve onay · ${extractedTemplates.length} test bulundu`}
                                </p>
                            </div>
                            {!importing && !bulkSaving && (
                                <button onClick={() => setShowImportModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-all">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        <div className="p-6">
                            {/* ── Adım 1: Yükleme ── */}
                            {importStep === 'upload' && (
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Kitap / Kaynak Adı</label>
                                        <input
                                            type="text" value={importBookName} onChange={(e) => setImportBookName(e.target.value)}
                                            placeholder="Örn: Hız Hibrit, Karekök Matematik..."
                                            autoFocus
                                            list="import-category-suggestions"
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none transition-all text-sm"
                                        />
                                        <datalist id="import-category-suggestions">
                                            {existingCategories.map((cat) => (
                                                <option key={cat} value={cat} />
                                            ))}
                                        </datalist>
                                        <p className="text-xs text-gray-400 mt-1.5">
                                            Bu isim <span className="font-medium text-violet-500">kategori</span> olarak kullanılacak.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1.5">
                                            Ünite / Bölüm Adı
                                            <span className="text-xs text-gray-400 ml-1">— isteğe bağlı</span>
                                        </label>
                                        <input
                                            type="text" value={importUnitName} onChange={(e) => setImportUnitName(e.target.value)}
                                            placeholder="Örn: 1. Ünite Çarpanlar ve Katlar..."
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none transition-all text-sm"
                                        />
                                        <p className="text-xs text-gray-400 mt-1.5">
                                            Testler şu şekilde adlandırılacak: <span className="font-medium text-gray-500">
                                                {importBookName && importUnitName
                                                    ? `"${importBookName} - ${importUnitName} Test 1", "${importBookName} - ${importUnitName} Test 2"...`
                                                    : importBookName
                                                        ? `"${importBookName} Test 1", "${importBookName} Test 2"...`
                                                        : '"Kitap Adı - Ünite Adı Test 1"...'}
                                            </span>
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Cevap Anahtarı Görseli veya PDF'i</label>
                                        <DropZone file={importFile} onFile={setImportFile} />
                                    </div>

                                    {importError && (
                                        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                                            <span className="text-lg leading-none">⚠️</span>
                                            <span>{importError}</span>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleExtract}
                                        disabled={!importFile || !importBookName.trim() || importing}
                                        className="w-full py-3 bg-violet-600 text-white font-semibold rounded-xl shadow-sm hover:bg-violet-700 active:scale-[0.98] transition-all disabled:opacity-40 text-sm flex items-center justify-center gap-2"
                                    >
                                        {importing ? (
                                            <>
                                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                                </svg>
                                                Yapay zeka analiz ediyor...
                                            </>
                                        ) : (
                                            '✨ Analiz Et ve Cevapları Çıkar'
                                        )}
                                    </button>

                                    <p className="text-xs text-center text-gray-300">
                                        Dosyanız Gemini yapay zeka modeline gönderilecek ve saklanmayacak.
                                    </p>
                                </div>
                            )}

                            {/* ── Adım 2: Önizleme ── */}
                            {importStep === 'preview' && (
                                <div className="space-y-4">
                                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-center gap-2">
                                        <span>✅</span>
                                        <span><strong>{extractedTemplates.length} test</strong> başarıyla çıkarıldı. İsimleri düzenleyebilirsiniz.</span>
                                    </div>

                                    <div className="p-3 bg-violet-50 border border-violet-200 rounded-xl text-sm text-violet-700 flex items-center gap-2">
                                        <span>📚</span>
                                        <span>Kategori: <strong>{importBookName}</strong></span>
                                    </div>

                                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                                        {extractedTemplates.map((t, i) => {
                                            const filled = answeredCount(t.answer_key);
                                            const pct = t.question_count > 0 ? Math.round((filled / t.question_count) * 100) : 0;
                                            return (
                                                <div key={i} className="bg-gray-50 rounded-xl p-4 space-y-2">
                                                    <div className="flex items-center gap-3">
                                                        <span className="shrink-0 w-7 h-7 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center">
                                                            {i + 1}
                                                        </span>
                                                        <input
                                                            type="text"
                                                            value={editedNames[i] ?? t.name}
                                                            onChange={(e) => setEditedNames(prev => ({ ...prev, [i]: e.target.value }))}
                                                            className="flex-1 bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-800 focus:border-violet-400 focus:ring-1 focus:ring-violet-200 outline-none transition-all"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-4 text-xs text-gray-500 pl-10">
                                                        <span>{t.question_count} soru · {t.option_count} şık</span>
                                                        <span>·</span>
                                                        <span className={pct === 100 ? 'text-emerald-600 font-medium' : 'text-amber-600'}>
                                                            {filled}/{t.question_count} cevap dolu
                                                        </span>
                                                    </div>
                                                    {/* mini cevap göster */}
                                                    <div className="pl-10 flex flex-wrap gap-1">
                                                        {Array.from({ length: Math.min(t.question_count, 10) }, (_, qi) => qi + 1).map(q => (
                                                            <span key={q} className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${t.answer_key[q] ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                                                {t.answer_key[q] || '·'}
                                                            </span>
                                                        ))}
                                                        {t.question_count > 10 && (
                                                            <span className="inline-flex items-center justify-center px-2 h-7 rounded-full text-xs text-gray-400 bg-gray-100">
                                                                +{t.question_count - 10}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                                        <button
                                            onClick={() => { setImportStep('upload'); setImportError(''); }}
                                            className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all"
                                        >
                                            ← Geri
                                        </button>
                                        <button
                                            onClick={handleBulkSave}
                                            disabled={bulkSaving}
                                            className="flex-[2] py-2.5 text-sm font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {bulkSaving ? (
                                                <>
                                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                                    </svg>
                                                    Kaydediliyor...
                                                </>
                                            ) : (
                                                `💾 Tümünü Kaydet (${extractedTemplates.length} test)`
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Silme Onayı ── */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
                        <div className="text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Cevap Anahtarını Sil</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                <strong>&ldquo;{confirmDelete.name}&rdquo;</strong> silinecek. Bu işlem geri alınamaz.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all">İptal</button>
                            <button onClick={executeDelete} className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all">🗑️ Evet, Sil</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
