'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import OpticalForm from '@/components/OpticalForm';
import { format } from 'date-fns';

const STEPS = ['testsAndSettings', 'students'];

// ─── Tek bir test kartı bileşeni ──────────────────────────────────────────────
function TestCard({
    test,
    index,
    totalCount,
    onUpdate,
    onRemove,
    answerKeyTemplates,
    topics,
    onAddTopic,
}) {
    const [expanded, setExpanded] = useState(test._expanded ?? true);
    const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

    const updateField = (field, value) => {
        onUpdate(index, { ...test, [field]: value });
    };

    const applyTemplate = (template) => {
        onUpdate(index, {
            ...test,
            name: template.name,
            question_count: template.question_count,
            option_count: template.option_count,
            answer_key: template.answer_key,
            applied_template: template,
            question_topics: {},
        });
        setTemplatePickerOpen(false);
    };

    const clearTemplate = () => {
        onUpdate(index, {
            ...test,
            applied_template: null,
            answer_key: {},
        });
    };

    const handleQuestionTopicChange = (qNumber, topicId) => {
        const newTopics = { ...(test.question_topics || {}) };
        newTopics[qNumber] = topicId;
        updateField('question_topics', newTopics);
    };

    const handleAnswerKeyChange = (answers) => {
        updateField('answer_key', answers);
    };

    const answeredCount = Object.keys(test.answer_key || {}).length;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all">
            {/* Card Header — Her zaman görünür */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/60 transition-all group"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                        <span className="text-white text-sm font-bold">{index + 1}</span>
                    </div>
                    <div className="text-left min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate group-hover:text-blue-700 transition-colors">
                            {test.name || `Test ${index + 1}`}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {test.question_count} soru · {test.option_count} şık · {answeredCount} cevap dolu
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {answeredCount === test.question_count && answeredCount > 0 && (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full uppercase tracking-wide">
                            Tamam ✓
                        </span>
                    )}
                    {totalCount > 1 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove(index);
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all"
                            title="Bu testi kaldır"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    )}
                    <svg
                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {/* Card Body — Expand olunca görünür */}
            {expanded && (
                <div className="border-t border-gray-100 px-5 py-5 space-y-5">
                    {/* Test Adı */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Test Adı</label>
                        <input
                            type="text"
                            value={test.name}
                            onChange={(e) => updateField('name', e.target.value)}
                            placeholder={`Örn: Matematik Test ${index + 1}`}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                        />
                    </div>

                    {/* Soru Sayısı + Şık Sayısı */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">Soru Sayısı</label>
                            <input
                                type="number" min={1} max={100}
                                value={test.question_count}
                                onChange={(e) => updateField('question_count', Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">Şık Sayısı</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[4, 5].map((count) => (
                                    <button
                                        key={count}
                                        onClick={() => updateField('option_count', count)}
                                        className={`flex flex-col items-center gap-0.5 p-3 rounded-xl border-2 transition-all ${test.option_count === count
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                                            }`}
                                    >
                                        <span className="text-lg font-bold">{count}</span>
                                        <span className="text-[10px] font-medium">
                                            {count === 4 ? 'A·B·C·D' : 'A·B·C·D·E'}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Hazır Şablon Seçici */}
                    {answerKeyTemplates.length > 0 && (
                        <div className="bg-gray-50 rounded-xl p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-700">
                                        🔑 Hazır Cevap Anahtarından Seç
                                    </p>
                                    {test.applied_template ? (
                                        <p className="text-xs text-emerald-600 mt-0.5 font-medium">
                                            ✅ {test.applied_template.name} uygulandı
                                        </p>
                                    ) : (
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            Kaydedilmiş bir şablonu seçerek cevapları otomatik doldurun.
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {test.applied_template && (
                                        <button
                                            onClick={clearTemplate}
                                            className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
                                        >
                                            Temizle ×
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setTemplatePickerOpen(!templatePickerOpen)}
                                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${templatePickerOpen
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                            }`}
                                    >
                                        {templatePickerOpen ? 'Kapat ▲' : 'Seç ▼'}
                                    </button>
                                </div>
                            </div>

                            {templatePickerOpen && (() => {
                                const grouped = {};
                                answerKeyTemplates.forEach((t) => {
                                    const cat = t.category || 'Kategorisiz';
                                    if (!grouped[cat]) grouped[cat] = [];
                                    grouped[cat].push(t);
                                });
                                const cats = Object.keys(grouped).sort((a, b) => {
                                    if (a === 'Kategorisiz') return 1;
                                    if (b === 'Kategorisiz') return -1;
                                    return a.localeCompare(b, 'tr');
                                });
                                return (
                                    <div className="mt-3 border-t border-gray-200 pt-3 space-y-3 max-h-[320px] overflow-y-auto">
                                        {cats.map((cat) => (
                                            <div key={cat}>
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                                    <span className="w-5 h-5 rounded-md bg-violet-100 flex items-center justify-center text-violet-600 text-[10px]">📚</span>
                                                    {cat}
                                                </p>
                                                <div className="grid gap-2 sm:grid-cols-2">
                                                    {grouped[cat].map((t) => (
                                                        <button
                                                            key={t.id}
                                                            onClick={() => applyTemplate(t)}
                                                            className={`flex items-center justify-between px-3 py-3 rounded-xl border-2 text-left transition-all ${test.applied_template?.id === t.id
                                                                ? 'border-blue-500 bg-blue-50'
                                                                : 'border-gray-100 hover:border-blue-200 hover:bg-blue-50/50'
                                                                }`}
                                                        >
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-semibold text-gray-800 truncate">{t.name}</p>
                                                                <p className="text-xs text-gray-400 mt-0.5">
                                                                    {t.question_count} soru · {t.option_count} şık
                                                                </p>
                                                            </div>
                                                            {test.applied_template?.id === t.id && (
                                                                <span className="shrink-0 ml-2 text-blue-600 text-lg">✓</span>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* Optik Form (cevap anahtarı) */}
                    <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4">
                        <OpticalForm
                            key={`test-${index}-${test.applied_template?.id ?? 'manual'}`}
                            questionCount={test.question_count}
                            optionCount={test.option_count}
                            mode="teacher"
                            initialAnswers={test.answer_key}
                            showTopics={true}
                            topics={topics}
                            questionTopics={test.question_topics || {}}
                            onQuestionTopicChange={handleQuestionTopicChange}
                            onAddTopic={onAddTopic}
                            onChange={handleAnswerKeyChange}
                            hideSubmit={true}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Varsayılan boş test oluşturucu ───────────────────────────────────────────
function createEmptyTest(index) {
    return {
        id: `test_${index}`,
        name: '',
        question_count: 20,
        option_count: 5,
        answer_key: {},
        question_topics: {},
        applied_template: null,
        _expanded: true,
    };
}

// ─── Ana sayfa ────────────────────────────────────────────────────────────────
export default function NewAssignmentPage() {
    const { profile } = useAuth();
    const router = useRouter();
    const [step, setStep] = useState('testsAndSettings');
    const [saving, setSaving] = useState(false);

    // Ayarlar
    const [title, setTitle] = useState('');
    const [dueDate, setDueDate] = useState('');

    // Çoklu testler
    const [tests, setTests] = useState([createEmptyTest(0)]);

    // Öğrenci seçimi
    const [students, setStudents] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);

    // Yardımcı veriler
    const [topics, setTopics] = useState([]);
    const [answerKeyTemplates, setAnswerKeyTemplates] = useState([]);

    useEffect(() => {
        if (profile) {
            fetchStudents();
            fetchTopics();
            fetchAnswerKeyTemplates();
        }
    }, [profile]);

    const fetchStudents = async () => {
        const { data } = await supabase
            .from('users')
            .select('id, name, class_level')
            .eq('role', 'student')
            .eq('created_by', profile.id)
            .order('name');
        setStudents(data || []);
    };

    const fetchTopics = async () => {
        const { data } = await supabase
            .from('topics')
            .select('id, name')
            .eq('teacher_id', profile.id)
            .order('name');
        setTopics(data || []);
    };

    const fetchAnswerKeyTemplates = async () => {
        const { data } = await supabase
            .from('answer_key_templates')
            .select('id, name, question_count, option_count, answer_key, category')
            .eq('teacher_id', profile.id)
            .order('name');
        setAnswerKeyTemplates(data || []);
    };

    const handleAddTopic = async (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;

        const { data, error } = await supabase
            .from('topics')
            .insert([{ teacher_id: profile.id, name: trimmed }])
            .select('id, name')
            .single();

        if (error) {
            if (error.code === '23505') {
                alert('Bu konu zaten mevcut.');
            } else {
                alert('Konu eklenemedi: ' + error.message);
            }
            return;
        }

        setTopics((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    };

    // ─── Test yönetimi ────────────────────────────────────────────────────────
    const updateTest = useCallback((index, updatedTest) => {
        setTests((prev) => prev.map((t, i) => (i === index ? updatedTest : t)));
    }, []);

    const removeTest = useCallback((index) => {
        setTests((prev) => {
            if (prev.length <= 1) return prev;
            return prev.filter((_, i) => i !== index);
        });
    }, []);

    const addTest = () => {
        // Mevcut testleri collapse et
        setTests((prev) => [
            ...prev.map((t) => ({ ...t, _expanded: false })),
            createEmptyTest(Date.now()),
        ]);
    };

    // ─── Kaydetme ─────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (selectedStudents.length === 0) {
            alert('En az bir öğrenci seçmelisiniz.');
            return;
        }
        setSaving(true);

        try {
            // Tests dizisini temizle (UI-only alanları _expanded, applied_template kaldır)
            const cleanTests = tests.map((t, i) => ({
                id: `test_${i}`,
                name: t.name || `Test ${i + 1}`,
                question_count: t.question_count,
                option_count: t.option_count,
                answer_key: t.answer_key,
                question_topics: t.question_topics || {},
            }));

            // İlk testin bilgisini ana alanlara da yaz (geriye dönük uyumluluk)
            const firstTest = cleanTests[0];

            const { data: assignment, error: aError } = await supabase
                .from('assignments')
                .insert([{
                    teacher_id: profile.id,
                    title,
                    question_count: firstTest.question_count,
                    option_count: firstTest.option_count,
                    answer_key: firstTest.answer_key,
                    question_topics: firstTest.question_topics,
                    due_date: dueDate || null,
                    tests: cleanTests,
                }])
                .select()
                .single();

            if (aError) {
                throw new Error(`Ödev kaydedilemedi: ${aError.message}`);
            }

            // Öğrenci atamalarını kaydet
            const studentInserts = selectedStudents.map((sId) => ({
                assignment_id: assignment.id,
                student_id: sId,
            }));

            const { error: sError } = await supabase
                .from('assignment_students')
                .insert(studentInserts);

            if (sError) {
                throw new Error(`Öğrenci ataması başarısız: ${sError.message}`);
            }

            window.location.href = '/teacher';
        } catch (err) {
            console.error('handleSave hata:', err);
            alert('Hata: ' + err.message);
        }
        setSaving(false);
    };

    // ─── Öğrenci seçim yardımcıları ───────────────────────────────────────────
    const toggleStudent = (id) => {
        setSelectedStudents((prev) =>
            prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        if (selectedStudents.length === students.length) {
            setSelectedStudents([]);
        } else {
            setSelectedStudents(students.map((s) => s.id));
        }
    };

    // Validasyon: En az bir testte cevap girilmiş mi?
    const hasAtLeastOneAnswer = tests.some((t) => Object.keys(t.answer_key || {}).length > 0);
    const canProceedToStudents = title.trim() && hasAtLeastOneAnswer;

    // Toplam soru sayısı
    const totalQuestions = tests.reduce((sum, t) => sum + t.question_count, 0);
    const totalAnswered = tests.reduce((sum, t) => sum + Object.keys(t.answer_key || {}).length, 0);

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">➕ Yeni Ödev Oluştur</h1>

            {/* Adım Göstergesi */}
            <div className="flex items-center gap-2">
                {STEPS.map((s, i) => {
                    const labels = { testsAndSettings: 'Ayarlar & Testler', students: 'Öğrenciler' };
                    const isCurrent = step === s;
                    const isDone = STEPS.indexOf(step) > i;
                    return (
                        <div key={s} className="flex items-center gap-2">
                            {i > 0 && <div className={`w-6 h-0.5 ${isDone ? 'bg-blue-500' : 'bg-gray-200'}`} />}
                            <button
                                onClick={() => {
                                    if (isDone || isCurrent) setStep(s);
                                }}
                                disabled={!isDone && !isCurrent}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${isCurrent
                                    ? 'bg-blue-600 text-white'
                                    : isDone
                                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                        : 'bg-gray-100 text-gray-400'
                                    }`}
                            >
                                {i + 1}. {labels[s]}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                ADIM 1: Ayarlar + Testler (tek sayfa)
            ══════════════════════════════════════════════════════════════════ */}
            {step === 'testsAndSettings' && (
                <div className="space-y-5">
                    {/* Ödev Başlığı + Tarih */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">Ödev Başlığı</label>
                            <input
                                type="text" value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Örn: Matematik LGS Deneme 1"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">Son Teslim Tarihi (Opsiyonel)</label>
                            <input
                                type="datetime-local"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm text-gray-700 bg-white"
                            />
                            <p className="text-xs text-gray-400 mt-1.5">
                                Belirtilen tarihten sonra gönderilen ödevler &quot;Geç Teslim&quot; olarak işaretlenir.
                            </p>
                        </div>
                    </div>

                    {/* Test Özeti Bilgisi */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h2 className="text-base font-bold text-gray-800">📝 Testler</h2>
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full">
                                {tests.length} test · {totalQuestions} soru · {totalAnswered} cevap
                            </span>
                        </div>
                    </div>

                    {/* Test Kartları */}
                    <div className="space-y-4">
                        {tests.map((test, index) => (
                            <TestCard
                                key={test.id}
                                test={test}
                                index={index}
                                totalCount={tests.length}
                                onUpdate={updateTest}
                                onRemove={removeTest}
                                answerKeyTemplates={answerKeyTemplates}
                                topics={topics}
                                onAddTopic={handleAddTopic}
                            />
                        ))}
                    </div>

                    {/* Yeni Test Ekle Butonu */}
                    <button
                        onClick={addTest}
                        className="w-full py-3.5 border-2 border-dashed border-gray-200 rounded-2xl text-sm font-semibold text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Yeni Test Ekle
                    </button>

                    {/* Sonraki Adım Butonu */}
                    <button
                        onClick={() => { if (canProceedToStudents) setStep('students'); }}
                        disabled={!canProceedToStudents}
                        className="w-full py-3 bg-gray-900 text-white font-semibold rounded-xl shadow-sm hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-40 text-sm"
                    >
                        Sonraki: Öğrenci Seçimi →
                    </button>
                    {!canProceedToStudents && title.trim() && (
                        <p className="text-xs text-amber-500 text-center -mt-2">
                            En az bir testte cevap anahtarı girmelisiniz.
                        </p>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                ADIM 2: Öğrenci Seçimi
            ══════════════════════════════════════════════════════════════════ */}
            {step === 'students' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-gray-800">Öğrenci Seçimi</h2>
                        <button
                            onClick={selectAll}
                            className="text-xs text-blue-600 font-medium hover:underline"
                        >
                            {selectedStudents.length === students.length ? 'Hiçbirini Seçme' : 'Tümünü Seç'}
                        </button>
                    </div>

                    {students.length === 0 ? (
                        <div className="p-6 text-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
                            Henüz öğrenci eklemediniz. Önce <a href="/teacher/students" className="text-blue-600 underline">öğrenci ekleyin</a>.
                        </div>
                    ) : (
                        <div className="space-y-1.5 max-h-64 overflow-y-auto">
                            {students.map((s) => {
                                const isSelected = selectedStudents.includes(s.id);
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => toggleStudent(s.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${isSelected
                                            ? 'bg-blue-50 border-2 border-blue-400'
                                            : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                                            }`}>
                                            {isSelected && (
                                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-800">{s.name}</p>
                                            {s.class_level && <p className="text-xs text-gray-400">{s.class_level}</p>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-sm text-gray-500">{selectedStudents.length} öğrenci seçili</p>
                        <button
                            onClick={handleSave}
                            disabled={saving || selectedStudents.length === 0}
                            className="px-6 py-2.5 bg-gray-900 text-white font-semibold rounded-xl shadow-sm hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-40 text-sm"
                        >
                            {saving ? 'Kaydediliyor...' : `✅ Ödevi Kaydet ve Ata (${tests.length} test)`}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
