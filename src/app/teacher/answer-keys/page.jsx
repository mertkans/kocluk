'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import OpticalForm from '@/components/OpticalForm';

export default function AnswerKeysPage() {
    const { profile } = useAuth();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' | 'view'
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(null);

    // Yeni şablon form state
    const [name, setName] = useState('');
    const [questionCount, setQuestionCount] = useState(20);
    const [optionCount, setOptionCount] = useState(5);
    const [answerKey, setAnswerKey] = useState({});
    const [saving, setSaving] = useState(false);
    const [formStep, setFormStep] = useState('info'); // 'info' | 'answers'

    useEffect(() => {
        if (profile) fetchTemplates();
    }, [profile]);

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

    const openCreateModal = () => {
        setName('');
        setQuestionCount(20);
        setOptionCount(5);
        setAnswerKey({});
        setFormStep('info');
        setModalMode('create');
        setSelectedTemplate(null);
        setShowModal(true);
    };

    const openViewModal = (template) => {
        setSelectedTemplate(template);
        setModalMode('view');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedTemplate(null);
    };

    const handleSaveTemplate = async (answers) => {
        if (!name.trim()) return;
        setSaving(true);
        const { error } = await supabase
            .from('answer_key_templates')
            .insert([{
                teacher_id: profile.id,
                name: name.trim(),
                question_count: questionCount,
                option_count: optionCount,
                answer_key: answers,
            }]);

        if (error) {
            if (error.code === '23505') {
                alert('Bu isimde bir cevap anahtarı zaten mevcut.');
            } else {
                alert('Kaydedilemedi: ' + error.message);
            }
        } else {
            await fetchTemplates();
            closeModal();
        }
        setSaving(false);
    };

    const openDeleteConfirm = (e, template) => {
        e.stopPropagation();
        setConfirmDelete(template);
    };

    const executeDelete = async () => {
        if (!confirmDelete) return;
        const t = confirmDelete;
        setConfirmDelete(null);
        setDeleting(t.id);
        const { error } = await supabase
            .from('answer_key_templates')
            .delete()
            .eq('id', t.id);
        if (error) {
            alert('Silinemedi: ' + error.message);
        } else {
            setTemplates((prev) => prev.filter((x) => x.id !== t.id));
        }
        setDeleting(null);
    };

    const answeredCount = (ak) => Object.values(ak || {}).filter(Boolean).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-pulse text-gray-400">Yükleniyor...</div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">🔑 Cevap Anahtarları</h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Hazır cevap anahtarlarını buradan yönetin, ödev verirken hızlıca seçin.
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 text-white font-semibold rounded-xl shadow-sm hover:bg-gray-800 active:scale-[0.98] transition-all text-sm shrink-0"
                >
                    ➕ Yeni Cevap Anahtarı
                </button>
            </div>

            {templates.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
                    <div className="text-4xl mb-3">🔑</div>
                    <p className="text-gray-500 font-medium">Henüz cevap anahtarı eklemediniz.</p>
                    <p className="text-gray-400 text-sm mt-1">
                        Kitap testleri gibi sık kullandığınız anahtarları buraya ekleyin.
                    </p>
                    <button
                        onClick={openCreateModal}
                        className="mt-4 inline-block text-blue-600 font-medium text-sm hover:underline"
                    >
                        İlk cevap anahtarını oluşturun →
                    </button>
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                    {templates.map((t) => {
                        const filled = answeredCount(t.answer_key);
                        const pct = t.question_count > 0 ? Math.round((filled / t.question_count) * 100) : 0;
                        const isDeleting = deleting === t.id;
                        return (
                            <div
                                key={t.id}
                                onClick={() => openViewModal(t)}
                                className={`bg-white rounded-2xl border border-gray-100 p-5 cursor-pointer hover:border-blue-200 hover:shadow-md transition-all group ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-gray-800 text-sm group-hover:text-blue-700 transition-colors truncate">
                                            {t.name}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {t.question_count} soru · {t.option_count} şık
                                        </p>
                                    </div>
                                    <button
                                        onClick={(e) => openDeleteConfirm(e, t)}
                                        className="shrink-0 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                        title="Sil"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>

                                {/* İlerleme barı */}
                                <div className="mt-4">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-gray-400">Dolu cevaplar</span>
                                        <span className="text-xs font-semibold text-gray-600">{filled}/{t.question_count}</span>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-amber-400' : 'bg-gray-300'}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>

                                <p className="text-xs text-gray-300 mt-3">
                                    {new Date(t.created_at).toLocaleDateString('tr-TR')}
                                </p>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ───── MODAL ───── */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={closeModal}
                    />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-6 overflow-hidden">

                        {/* Modal Başlık */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h2 className="text-base font-bold text-gray-900">
                                {modalMode === 'create' ? '➕ Yeni Cevap Anahtarı' : `🔑 ${selectedTemplate?.name}`}
                            </h2>
                            <button
                                onClick={closeModal}
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-all"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal İçerik */}
                        <div className="p-6">
                            {modalMode === 'view' && selectedTemplate ? (
                                <div className="space-y-4">
                                    <div className="flex gap-4 text-sm text-gray-500">
                                        <span>📊 {selectedTemplate.question_count} soru</span>
                                        <span>🔢 {selectedTemplate.option_count} şık</span>
                                        <span>✅ {answeredCount(selectedTemplate.answer_key)} cevap dolu</span>
                                    </div>
                                    <OpticalForm
                                        questionCount={selectedTemplate.question_count}
                                        optionCount={selectedTemplate.option_count}
                                        mode="teacher"
                                        initialAnswers={selectedTemplate.answer_key}
                                        readOnly={true}
                                        showTopics={false}
                                        topics={[]}
                                        questionTopics={{}}
                                    />
                                </div>
                            ) : (
                                /* Create Mode */
                                formStep === 'info' ? (
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 mb-1.5">Cevap Anahtarı Adı</label>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="Örn: Hız Matematik Test 1"
                                                autoFocus
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 mb-1.5">Soru Sayısı</label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={100}
                                                value={questionCount}
                                                onChange={(e) => setQuestionCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 mb-2">Şık Sayısı</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {[4, 5].map((count) => (
                                                    <button
                                                        key={count}
                                                        onClick={() => setOptionCount(count)}
                                                        className={`flex flex-col items-center gap-1 p-4 rounded-xl border-2 transition-all ${optionCount === count
                                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                                                            }`}
                                                    >
                                                        <span className="text-2xl font-bold">{count}</span>
                                                        <span className="text-xs font-medium">
                                                            {count === 4 ? 'A · B · C · D' : 'A · B · C · D · E'}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { if (name.trim()) setFormStep('answers'); }}
                                            disabled={!name.trim()}
                                            className="w-full py-3 bg-gray-900 text-white font-semibold rounded-xl shadow-sm hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-40 text-sm"
                                        >
                                            Sonraki: Cevapları Gir →
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setFormStep('info')}
                                                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                ← Geri
                                            </button>
                                            <span className="text-xs text-gray-300">|</span>
                                            <p className="text-xs text-gray-500">
                                                <strong>{name}</strong> · {questionCount} soru · {optionCount} şık
                                            </p>
                                        </div>
                                        <OpticalForm
                                            questionCount={questionCount}
                                            optionCount={optionCount}
                                            mode="teacher"
                                            initialAnswers={answerKey}
                                            showTopics={false}
                                            topics={[]}
                                            questionTopics={{}}
                                            onSubmit={(answers) => handleSaveTemplate(answers)}
                                            submitLabel={saving ? 'Kaydediliyor...' : '💾 Cevap Anahtarını Kaydet'}
                                            submitDisabled={saving}
                                        />
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Silme Onay Modalı */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setConfirmDelete(null)}
                    />
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
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all"
                            >
                                İptal
                            </button>
                            <button
                                onClick={executeDelete}
                                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all"
                            >
                                🗑️ Evet, Sil
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
