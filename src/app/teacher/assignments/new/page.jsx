'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import OpticalForm from '@/components/OpticalForm';
import { format } from 'date-fns';

const STEPS = ['settings', 'answerKey', 'students'];

export default function NewAssignmentPage() {
    const { profile } = useAuth();
    const router = useRouter();
    const [step, setStep] = useState('settings');
    const [saving, setSaving] = useState(false);

    // Aşama 1 - Ayarlar
    const [title, setTitle] = useState('');
    const [questionCount, setQuestionCount] = useState(20);
    const [optionCount, setOptionCount] = useState(5);
    const [dueDate, setDueDate] = useState('');

    // Aşama 2 - Cevap anahtarı + konu ataması
    const [answerKey, setAnswerKey] = useState({});
    const [questionTopics, setQuestionTopics] = useState({});
    const [topics, setTopics] = useState([]);
    const [answerKeyTemplates, setAnswerKeyTemplates] = useState([]);
    const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
    const [appliedTemplate, setAppliedTemplate] = useState(null);

    // Aşama 3 - Öğrenci seçimi
    const [students, setStudents] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);

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
            .select('id, name, question_count, option_count, answer_key')
            .eq('teacher_id', profile.id)
            .order('name');
        setAnswerKeyTemplates(data || []);
    };

    const applyTemplate = (template) => {
        setQuestionCount(template.question_count);
        setOptionCount(template.option_count);
        setAnswerKey(template.answer_key);
        setAppliedTemplate(template);
        setTemplatePickerOpen(false);
        setQuestionTopics({});
    };

    const clearTemplate = () => {
        setAppliedTemplate(null);
        setAnswerKey({});
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

        // Yeni konuyu listeye ekle ve sıralama koru
        setTopics((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    };

    const handleQuestionTopicChange = (qNumber, topicId) => {
        setQuestionTopics((prev) => ({
            ...prev,
            [qNumber]: topicId,
        }));
    };

    const handleSave = async () => {
        if (selectedStudents.length === 0) {
            alert('En az bir öğrenci seçmelisiniz.');
            return;
        }
        setSaving(true);

        try {
            // 1. Ödevi kaydet
            const { data: assignment, error: aError } = await supabase
                .from('assignments')
                .insert([{
                    teacher_id: profile.id,
                    title,
                    question_count: questionCount,
                    option_count: optionCount,
                    answer_key: answerKey,
                    question_topics: questionTopics,
                    due_date: dueDate || null,
                }])
                .select()
                .single();

            if (aError) {
                throw new Error(`Ödev kaydedilemedi: ${aError.message}`);
            }

            // 2. Öğrenci atamalarını kaydet
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

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">➕ Yeni Ödev Oluştur</h1>

            {/* Adım Göstergesi */}
            <div className="flex items-center gap-2">
                {STEPS.map((s, i) => {
                    const labels = { settings: 'Ayarlar', answerKey: 'Cevap Anahtarı', students: 'Öğrenciler' };
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

            {/* Aşama 1: Ayarlar */}
            {step === 'settings' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm space-y-5">
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
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Soru Sayısı</label>
                        <input
                            type="number" min={1} max={100} value={questionCount}
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
                            Belirtilen tarihten sonra gönderilen ödevler "Geç Teslim" olarak işaretlenir.
                        </p>
                    </div>

                    <button
                        onClick={() => { if (title.trim()) setStep('answerKey'); }}
                        disabled={!title.trim()}
                        className="w-full py-3 bg-gray-900 text-white font-semibold rounded-xl shadow-sm hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-40 text-sm"
                    >
                        Sonraki: Cevap Anahtarı →
                    </button>
                </div>
            )}

            {/* Aşama 2: Cevap Anahtarı + Konu Ataması */}
            {step === 'answerKey' && (
                <div className="space-y-4">
                    {/* Hazır Şablon Seçici */}
                    {answerKeyTemplates.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-700">
                                        🔑 Hazır Cevap Anahtarından Seç
                                    </p>
                                    {appliedTemplate ? (
                                        <p className="text-xs text-emerald-600 mt-0.5 font-medium">
                                            ✅ {appliedTemplate.name} uygulandı
                                        </p>
                                    ) : (
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            Kaydedilmiş bir Şablonu seçerek cevapları otomatik doldurun.
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {appliedTemplate && (
                                        <button
                                            onClick={clearTemplate}
                                            className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
                                        >
                                            Temizle ×
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setTemplatePickerOpen(!templatePickerOpen)}
                                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                                            templatePickerOpen
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                        }`}
                                    >
                                        {templatePickerOpen ? 'Kapat ▲' : 'Seç ▼'}
                                    </button>
                                </div>
                            </div>

                            {templatePickerOpen && (
                                <div className="mt-3 border-t border-gray-100 pt-3 grid gap-2 sm:grid-cols-2">
                                    {answerKeyTemplates.map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => applyTemplate(t)}
                                            className={`flex items-center justify-between px-3 py-3 rounded-xl border-2 text-left transition-all ${
                                                appliedTemplate?.id === t.id
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
                                            {appliedTemplate?.id === t.id && (
                                                <span className="shrink-0 ml-2 text-blue-600 text-lg">✓</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Optik Form */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 shadow-sm">
                        <OpticalForm
                            questionCount={questionCount}
                            optionCount={optionCount}
                            mode="teacher"
                            initialAnswers={answerKey}
                            showTopics={true}
                            topics={topics}
                            questionTopics={questionTopics}
                            onQuestionTopicChange={handleQuestionTopicChange}
                            onAddTopic={handleAddTopic}
                            onSubmit={(answers) => {
                                setAnswerKey(answers);
                                setStep('students');
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Aşama 3: Öğrenci Seçimi */}
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
                            {saving ? 'Kaydediliyor...' : '✅ Ödevi Kaydet ve Ata'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
