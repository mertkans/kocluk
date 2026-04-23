'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { subDays, subMonths, startOfDay } from 'date-fns';
import { getAssignmentTests } from '@/lib/evaluate';

const HorizontalBarComponent = dynamic(() => import('recharts').then(mod => {
    const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } = mod;
    return function HBar({ data }) {
        const getColor = (val) => {
            if (val >= 70) return '#10b981';
            if (val >= 40) return '#f59e0b';
            return '#ef4444';
        };
        return (
            <ResponsiveContainer width="100%" height={Math.max(200, data.length * 45)}>
                <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip formatter={(v) => `%${v}`} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                        {data.map((entry, idx) => (
                            <Cell key={idx} fill={getColor(entry.value)} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        );
    };
}), { ssr: false });

const TIME_FILTERS = [
    { key: 'week', label: 'Son 1 Hafta' },
    { key: 'month', label: 'Son 1 Ay' },
    { key: '3months', label: 'Son 3 Ay' },
    { key: 'all', label: 'Tümü' },
];

function getFilterDate(filterKey) {
    const today = startOfDay(new Date());
    switch (filterKey) {
        case 'week':
            return subDays(today, 7);
        case 'month':
            return subMonths(today, 1);
        case '3months':
            return subMonths(today, 3);
        default:
            return null;
    }
}

function safeFormatDate(dateStr) {
    if (!dateStr) return 'Tarih Yok';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'Geçersiz Tarih' : d.toLocaleDateString('tr-TR');
}

export default function StudentDetailPage() {
    const { id } = useParams();
    const { profile } = useAuth();
    const [student, setStudent] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState('all');
    const [selectedSubs, setSelectedSubs] = useState([]);

    const [showPassword, setShowPassword] = useState(false);
    const [passwordData, setPasswordData] = useState(null);
    const [passwordLoading, setPasswordLoading] = useState(false);

    const [editing, setEditing] = useState(false);
    const [editData, setEditData] = useState({ name: '', email: '', phone: '', classId: '', defaultLessonPrice: '' });
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState('');
    const [classes, setClasses] = useState([]);

    // Notlar
    const [notes, setNotes] = useState([]);
    const [noteContent, setNoteContent] = useState('');
    const [noteSaving, setNoteSaving] = useState(false);

    useEffect(() => {
        if (profile && id) fetchData();
    }, [profile, id]);

    const fetchData = async () => {
        setLoading(true);

        const { data: studentData } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();
        setStudent(studentData);

        const { data: subsData } = await supabase
            .from('submissions')
            .select('*, assignments!submissions_assignment_id_fkey(id, title, question_count, option_count, answer_key, question_topics, tests, created_at)')
            .eq('student_id', id);
        setSubmissions(subsData || []);

        const { data: topicsData } = await supabase
            .from('topics')
            .select('id, name')
            .eq('teacher_id', profile.id);
        setTopics(topicsData || []);

        // Sınıfları çek (düzenleme formu için)
        const { data: classData, error: classError } = await supabase
            .from('classes')
            .select('id, name')
            .eq('teacher_id', profile.id)
            .order('name');
        if (!classError) setClasses(classData || []);

        // Öğrenci notlarını çek
        const { data: notesData } = await supabase
            .from('student_notes')
            .select('*')
            .eq('student_id', id)
            .eq('teacher_id', profile.id)
            .order('created_at', { ascending: false });
        setNotes(notesData || []);

        setLoading(false);
    };

    const handleShowPassword = async () => {
        if (passwordData) {
            setShowPassword(!showPassword);
            return;
        }
        setPasswordLoading(true);
        try {
            const res = await fetch(`/api/students/${id}/password`);
            const data = await res.json();
            if (data.success) {
                setPasswordData(data.password);
                setShowPassword(true);
            } else {
                alert(data.error || 'Şifre alınamadı.');
            }
        } catch {
            alert('Bir hata oluştu.');
        } finally {
            setPasswordLoading(false);
        }
    };

    const startEditing = () => {
        setEditData({
            name: student.name || '',
            email: student.email || '',
            phone: student.phone || '',
            classId: student.class_id || '',
            defaultLessonPrice: student.default_lesson_price ?? '',
        });
        setEditError('');
        setEditing(true);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        setEditLoading(true);
        setEditError('');
        try {
            const res = await fetch(`/api/students/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editData),
            });
            const data = await res.json();
            if (data.success) {
                setEditing(false);
                fetchData();
            } else {
                setEditError(data.error || 'Güncelleme başarısız.');
            }
        } catch {
            setEditError('Bir hata oluştu.');
        }
        setEditLoading(false);
    };

    // Zaman filtresi
    const filteredSubmissions = useMemo(() => {
        const cutoff = getFilterDate(timeFilter);
        if (!cutoff) return submissions;
        return submissions.filter((s) => {
            if (!s.submitted_at) return false;
            const d = new Date(s.submitted_at);
            if (isNaN(d.getTime())) return false;
            return d >= cutoff;
        });
    }, [submissions, timeFilter]);

    useEffect(() => {
        setSelectedSubs(filteredSubmissions.map(s => s.id));
    }, [filteredSubmissions]);

    const activeSubmissions = useMemo(() => {
        return filteredSubmissions.filter(s => selectedSubs.includes(s.id));
    }, [filteredSubmissions, selectedSubs]);

    const overallStats = useMemo(() => {
        let totalQuestions = 0, correct = 0, incorrect = 0, empty = 0;
        for (const sub of activeSubmissions) {
            const assignment = sub.assignments;
            if (!assignment) continue;

            const tests = getAssignmentTests(assignment);
            const studentAnswersRaw = sub.answers || {};

            // Detect format: if answers has test IDs as keys (multi-test) or question numbers (old format)
            const isNestedFormat = tests.length > 0 && typeof studentAnswersRaw[tests[0].id] === 'object';

            for (const test of tests) {
                const answerKey = test.answer_key || {};
                // Get student answers for this specific test
                let studentAnswers;
                if (isNestedFormat) {
                    studentAnswers = studentAnswersRaw[test.id] || {};
                } else if (tests.length === 1) {
                    // Old single-test format: answers are flat
                    studentAnswers = studentAnswersRaw;
                } else {
                    studentAnswers = {};
                }

                totalQuestions += Object.keys(answerKey).length;
                for (const [qNum, correctAns] of Object.entries(answerKey)) {
                    const sa = studentAnswers[qNum];
                    if (!sa) empty++;
                    else if (sa === correctAns) correct++;
                    else incorrect++;
                }
            }
        }
        const percentage = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
        return { totalQuestions, correct, incorrect, empty, percentage, assignmentCount: activeSubmissions.length };
    }, [activeSubmissions]);

    const topicStats = useMemo(() => {
        const topicMap = {};
        for (const sub of activeSubmissions) {
            const assignment = sub.assignments;
            if (!assignment) continue;

            const tests = getAssignmentTests(assignment);
            const studentAnswersRaw = sub.answers || {};
            const isNestedFormat = tests.length > 0 && typeof studentAnswersRaw[tests[0].id] === 'object';

            for (const test of tests) {
                const answerKey = test.answer_key || {};
                const questionTopics = test.question_topics || {};

                let studentAnswers;
                if (isNestedFormat) {
                    studentAnswers = studentAnswersRaw[test.id] || {};
                } else if (tests.length === 1) {
                    studentAnswers = studentAnswersRaw;
                } else {
                    studentAnswers = {};
                }

                for (const [qNum, correctAns] of Object.entries(answerKey)) {
                    const topicId = questionTopics[qNum];
                    if (!topicId) continue;
                    if (!topicMap[topicId]) topicMap[topicId] = { total: 0, correct: 0, incorrect: 0, empty: 0 };
                    const sa = studentAnswers[qNum];
                    topicMap[topicId].total++;
                    if (!sa) topicMap[topicId].empty++;
                    else if (sa === correctAns) topicMap[topicId].correct++;
                    else topicMap[topicId].incorrect++;
                }
            }
        }
        return Object.entries(topicMap)
            .map(([topicId, stats]) => {
                const topic = topics.find((t) => t.id === topicId);
                return { id: topicId, name: topic?.name || 'Bilinmeyen', ...stats, percentage: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0 };
            })
            .sort((a, b) => a.percentage - b.percentage);
    }, [activeSubmissions, topics]);

    if (loading || !student) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-pulse text-gray-400">Yükleniyor...</div>
            </div>
        );
    }

    const chartData = topicStats.map((t) => ({ name: t.name, value: t.percentage }));

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Başlık */}
            <div className="flex items-center gap-3">
                <Link href="/teacher/students" className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
                        <button
                            onClick={startEditing}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
                            title="Düzenle"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </button>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <p className="text-sm text-gray-500">
                            {student.email}{student.phone && ` · ${student.phone}`}
                        </p>
                        <button
                            onClick={handleShowPassword}
                            disabled={passwordLoading}
                            className="text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded transition-colors"
                        >
                            {passwordLoading ? '...' : showPassword ? 'Gizle' : 'Şifreyi Göster'}
                        </button>
                        {showPassword && passwordData && (
                            <span className="text-sm font-mono font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                {passwordData}
                            </span>
                        )}
                    </div>
                </div>
                <Link
                    href={`/teacher/students/${id}/lessons`}
                    className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 text-sm font-semibold rounded-xl hover:bg-emerald-100 transition-all border border-emerald-200"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Ödeme Takibi
                </Link>
            </div>

            {/* Düzenleme Formu */}
            {editing && (
                <div className="bg-white rounded-2xl border border-blue-100 p-5 sm:p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-bold text-gray-800">✏️ Öğrenci Bilgilerini Düzenle</h2>
                        <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">İptal</button>
                    </div>

                    {editError && (
                        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">{editError}</div>
                    )}

                    <form onSubmit={handleSaveEdit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Ad Soyad *</label>
                            <input type="text" required value={editData.name}
                                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                            <input type="email" value={editData.email}
                                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Telefon</label>
                            <input type="tel" value={editData.phone}
                                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                                placeholder="05XX XXX XX XX"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Sınıf</label>
                            {classes.length === 0 ? (
                                <p className="text-xs text-gray-400 py-2">Henüz sınıf oluşturulmamış.</p>
                            ) : (
                                <select
                                    value={editData.classId}
                                    onChange={(e) => setEditData({ ...editData, classId: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm bg-white"
                                >
                                    <option value="">Sınıf seçin...</option>
                                    {classes.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Varsayılan Ders Ücreti (₺)</label>
                            <input
                                type="number" min="0" step="1"
                                value={editData.defaultLessonPrice}
                                onChange={(e) => setEditData({ ...editData, defaultLessonPrice: e.target.value })}
                                placeholder="Örn: 500"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <button type="submit" disabled={editLoading}
                                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-sm hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 text-sm"
                            >
                                {editLoading ? 'Kaydediliyor...' : '💾 Değişiklikleri Kaydet'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Zaman Filtresi */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500 font-medium">📅 Dönem:</span>
                {TIME_FILTERS.map((f) => (
                    <button
                        key={f.key}
                        onClick={() => setTimeFilter(f.key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                            timeFilter === f.key
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Genel İstatistikler */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{overallStats.assignmentCount}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Ödev</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{overallStats.totalQuestions}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Toplam Soru</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{overallStats.correct}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Doğru</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{overallStats.incorrect}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Yanlış</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center col-span-2 sm:col-span-1">
                    <p className={`text-2xl font-bold ${
                        overallStats.percentage >= 70 ? 'text-emerald-600' :
                        overallStats.percentage >= 40 ? 'text-amber-600' : 'text-red-600'
                    }`}>%{overallStats.percentage}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Başarı</p>
                </div>
            </div>

            {/* Doğru/Yanlış/Boş Bar */}
            {overallStats.totalQuestions > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <div className="flex rounded-full overflow-hidden h-4">
                        {overallStats.correct > 0 && (
                            <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${(overallStats.correct / overallStats.totalQuestions) * 100}%` }} title={`Doğru: ${overallStats.correct}`} />
                        )}
                        {overallStats.incorrect > 0 && (
                            <div className="bg-red-500 transition-all duration-500" style={{ width: `${(overallStats.incorrect / overallStats.totalQuestions) * 100}%` }} title={`Yanlış: ${overallStats.incorrect}`} />
                        )}
                        {overallStats.empty > 0 && (
                            <div className="bg-gray-300 transition-all duration-500" style={{ width: `${(overallStats.empty / overallStats.totalQuestions) * 100}%` }} title={`Boş: ${overallStats.empty}`} />
                        )}
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Doğru ({overallStats.correct})</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Yanlış ({overallStats.incorrect})</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300" /> Boş ({overallStats.empty})</span>
                    </div>
                </div>
            )}

            {/* Konu Bazlı Analiz */}
            {topicStats.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
                    <h2 className="text-sm font-bold text-gray-700">📊 Konu Bazlı Analiz</h2>
                    <HorizontalBarComponent data={chartData} />
                    <div className="space-y-1.5 mt-2">
                        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-3 text-xs font-medium text-gray-400">
                            <span>Konu</span>
                            <span className="w-12 text-center">Soru</span>
                            <span className="w-12 text-center">Doğru</span>
                            <span className="w-12 text-center">Yanlış</span>
                            <span className="w-14 text-center">Başarı</span>
                        </div>
                        {topicStats.map((t) => (
                            <div key={t.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center px-3 py-2.5 rounded-lg bg-gray-50">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                        t.percentage >= 70 ? 'bg-emerald-500' : t.percentage >= 40 ? 'bg-amber-500' : 'bg-red-500'
                                    }`} />
                                    <span className="text-sm font-medium text-gray-700 truncate">{t.name}</span>
                                </div>
                                <span className="w-12 text-center text-sm text-gray-600">{t.total}</span>
                                <span className="w-12 text-center text-sm text-emerald-600 font-medium">{t.correct}</span>
                                <span className="w-12 text-center text-sm text-red-600 font-medium">{t.incorrect}</span>
                                <span className={`w-14 text-center text-sm font-bold ${
                                    t.percentage >= 70 ? 'text-emerald-600' : t.percentage >= 40 ? 'text-amber-600' : 'text-red-600'
                                }`}>%{t.percentage}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Veri yoksa */}
            {filteredSubmissions.length === 0 && (
                <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center">
                    <p className="text-gray-400 text-sm">
                        {timeFilter === 'all' ? 'Bu öğrenci henüz ödev teslim etmemiş.' : 'Seçilen dönemde teslim edilen ödev bulunmuyor.'}
                    </p>
                </div>
            )}

            {/* Ödev Geçmişi */}
            {filteredSubmissions.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-bold text-gray-700">📋 Ödev Geçmişi</h2>
                        <button
                            onClick={() => {
                                if (selectedSubs.length === filteredSubmissions.length) {
                                    setSelectedSubs([]);
                                } else {
                                    setSelectedSubs(filteredSubmissions.map(s => s.id));
                                }
                            }}
                            className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            {selectedSubs.length === filteredSubmissions.length ? 'Tüm Seçimleri Kaldır' : 'Tümünü Seç'}
                        </button>
                    </div>
                    <div className="space-y-1.5">
                        {filteredSubmissions.map((sub) => {
                            const a = sub.assignments;
                            if (!a) return null;
                            const pct = sub.score?.percentage || 0;
                            return (
                                <div
                                    key={sub.id}
                                    className={`flex items-center justify-between bg-white rounded-xl px-4 py-3 border transition-all group ${
                                        selectedSubs.includes(sub.id) ? 'border-blue-200 shadow-sm' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm opacity-60'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <input
                                            type="checkbox"
                                            checked={selectedSubs.includes(sub.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedSubs(prev => [...prev, sub.id]);
                                                } else {
                                                    setSelectedSubs(prev => prev.filter(sid => sid !== sub.id));
                                                }
                                            }}
                                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <Link href={`/teacher/assignments/${a.id}`} className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-gray-800 hover:text-blue-700 transition-colors truncate">
                                                    {a.title}
                                                </p>
                                                {a.due_date && new Date(sub.submitted_at) > new Date(a.due_date) && (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wide shrink-0">
                                                        Geç Teslim
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {safeFormatDate(sub.submitted_at)} · {a.question_count} soru
                                            </p>
                                        </Link>
                                    </div>
                                    <Link href={`/teacher/assignments/${a.id}`} className="ml-3 shrink-0 text-right pr-2">
                                        <p className={`text-sm font-bold ${
                                            pct >= 70 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-red-600'
                                        }`}>%{pct}</p>
                                        <p className="text-xs text-gray-400">
                                            {sub.score?.correct}D / {sub.score?.incorrect}Y / {sub.score?.empty}B
                                        </p>
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Not Ekle & Not Listesi */}
            <div className="space-y-4">
                {/* Başlık + Not Ekle Formu */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="text-base">📝</span>
                        <h2 className="text-sm font-bold text-gray-700">Öğrenci Notları</h2>
                        {notes.length > 0 && (
                            <span className="ml-auto px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-semibold rounded-full">
                                {notes.length} not
                            </span>
                        )}
                    </div>

                    <div className="space-y-2">
                        <textarea
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            placeholder="Bu öğrenci hakkında not ekleyin..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm resize-none text-gray-800 placeholder-gray-400"
                        />
                        <div className="flex justify-end">
                            <button
                                onClick={async () => {
                                    const trimmed = noteContent.trim();
                                    if (!trimmed) return;
                                    setNoteSaving(true);
                                    const { data, error } = await supabase
                                        .from('student_notes')
                                        .insert([{ teacher_id: profile.id, student_id: id, content: trimmed }])
                                        .select()
                                        .single();
                                    if (!error && data) {
                                        setNotes(prev => [data, ...prev]);
                                        setNoteContent('');
                                    } else if (error) {
                                        alert('Not eklenemedi: ' + error.message);
                                    }
                                    setNoteSaving(false);
                                }}
                                disabled={noteSaving || !noteContent.trim()}
                                className="px-5 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                            >
                                {noteSaving ? 'Kaydediliyor...' : '+ Not Ekle'}
                            </button>
                        </div>
                    </div>

                    {/* Not Listesi */}
                    {notes.length > 0 ? (
                        <div className="space-y-2 pt-2 border-t border-gray-100">
                            {notes.map((note) => (
                                <div
                                    key={note.id}
                                    className="group flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100/70 transition-all"
                                >
                                    <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-sm mt-0.5">
                                        <span className="text-white text-xs font-bold">N</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{note.content}</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {new Date(note.created_at).toLocaleDateString('tr-TR', {
                                                day: 'numeric', month: 'long', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            if (!confirm('Bu notu silmek istediğinizden emin misiniz?')) return;
                                            const { error } = await supabase
                                                .from('student_notes')
                                                .delete()
                                                .eq('id', note.id);
                                            if (!error) {
                                                setNotes(prev => prev.filter(n => n.id !== note.id));
                                            }
                                        }}
                                        className="shrink-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                        title="Notu sil"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400 text-center py-2">
                            Bu öğrenci için henüz not eklenmemiş.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
