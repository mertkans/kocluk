'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { subDays, subMonths, startOfDay } from 'date-fns';

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
    const [assignments, setAssignments] = useState({});
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState('all');
    const [selectedSubs, setSelectedSubs] = useState([]);

    const [showPassword, setShowPassword] = useState(false);
    const [passwordData, setPasswordData] = useState(null);
    const [passwordLoading, setPasswordLoading] = useState(false);

    useEffect(() => {
        if (profile && id) fetchData();
    }, [profile, id]);

    const fetchData = async () => {
        setLoading(true);

        // Öğrenci bilgisi
        const { data: studentData } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();
        setStudent(studentData);

        // Öğrencinin tüm teslimleri
        const { data: subsData } = await supabase
            .from('submissions')
            .select('*, assignments!submissions_assignment_id_fkey(id, title, question_count, option_count, answer_key, question_topics, created_at)')
            .eq('student_id', id);
        setSubmissions(subsData || []);

        // Öğretmenin konularını çek
        const { data: topicsData } = await supabase
            .from('topics')
            .select('id, name')
            .eq('teacher_id', profile.id);
        setTopics(topicsData || []);

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
        } catch (error) {
            alert('Bir hata oluştu.');
        } finally {
            setPasswordLoading(false);
        }
    };

    // Zaman filtresi uygula
    const filteredSubmissions = useMemo(() => {
        const cutoff = getFilterDate(timeFilter);
        if (!cutoff) return submissions;
        return submissions.filter((s) => {
            if (!s.submitted_at) return false;
            const d = new Date(s.submitted_at);
            if (isNaN(d.getTime())) return false; // filter out invalid dates gracefully
            return d >= cutoff;
        });
    }, [submissions, timeFilter]);

    useEffect(() => {
        setSelectedSubs(filteredSubmissions.map(s => s.id));
    }, [filteredSubmissions]);

    const activeSubmissions = useMemo(() => {
        return filteredSubmissions.filter(s => selectedSubs.includes(s.id));
    }, [filteredSubmissions, selectedSubs]);

    // Genel istatistikler
    const overallStats = useMemo(() => {
        let totalQuestions = 0;
        let correct = 0;
        let incorrect = 0;
        let empty = 0;

        for (const sub of activeSubmissions) {
            const assignment = sub.assignments;
            if (!assignment) continue;

            const answerKey = assignment.answer_key || {};
            const studentAnswers = sub.answers || {};
            const questionCount = Object.keys(answerKey).length;
            totalQuestions += questionCount;

            for (const [qNum, correctAns] of Object.entries(answerKey)) {
                const studentAns = studentAnswers[qNum];
                if (!studentAns) {
                    empty++;
                } else if (studentAns === correctAns) {
                    correct++;
                } else {
                    incorrect++;
                }
            }
        }

        const percentage = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
        return { totalQuestions, correct, incorrect, empty, percentage, assignmentCount: activeSubmissions.length };
    }, [activeSubmissions]);

    // Konu bazlı istatistikler
    const topicStats = useMemo(() => {
        const topicMap = {};

        for (const sub of activeSubmissions) {
            const assignment = sub.assignments;
            if (!assignment) continue;

            const answerKey = assignment.answer_key || {};
            const questionTopics = assignment.question_topics || {};
            const studentAnswers = sub.answers || {};

            for (const [qNum, correctAns] of Object.entries(answerKey)) {
                const topicId = questionTopics[qNum];
                if (!topicId) continue;

                if (!topicMap[topicId]) {
                    topicMap[topicId] = { total: 0, correct: 0, incorrect: 0, empty: 0 };
                }

                const studentAns = studentAnswers[qNum];
                topicMap[topicId].total++;
                if (!studentAns) {
                    topicMap[topicId].empty++;
                } else if (studentAns === correctAns) {
                    topicMap[topicId].correct++;
                } else {
                    topicMap[topicId].incorrect++;
                }
            }
        }

        return Object.entries(topicMap)
            .map(([topicId, stats]) => {
                const topic = topics.find((t) => t.id === topicId);
                return {
                    id: topicId,
                    name: topic?.name || 'Bilinmeyen',
                    ...stats,
                    percentage: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
                };
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
                <Link
                    href="/teacher/students"
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-gray-500">
                            {student.class_level && `${student.class_level} · `}{student.email}
                        </p>
                        <button
                            onClick={handleShowPassword}
                            disabled={passwordLoading}
                            className="text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded transition-colors ml-2"
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
            </div>

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
                            <div
                                className="bg-emerald-500 transition-all duration-500"
                                style={{ width: `${(overallStats.correct / overallStats.totalQuestions) * 100}%` }}
                                title={`Doğru: ${overallStats.correct}`}
                            />
                        )}
                        {overallStats.incorrect > 0 && (
                            <div
                                className="bg-red-500 transition-all duration-500"
                                style={{ width: `${(overallStats.incorrect / overallStats.totalQuestions) * 100}%` }}
                                title={`Yanlış: ${overallStats.incorrect}`}
                            />
                        )}
                        {overallStats.empty > 0 && (
                            <div
                                className="bg-gray-300 transition-all duration-500"
                                style={{ width: `${(overallStats.empty / overallStats.totalQuestions) * 100}%` }}
                                title={`Boş: ${overallStats.empty}`}
                            />
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

                    {/* Konu detay tablosu */}
                    <div className="space-y-1.5 mt-2">
                        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-3 text-xs font-medium text-gray-400">
                            <span>Konu</span>
                            <span className="w-12 text-center">Soru</span>
                            <span className="w-12 text-center">Doğru</span>
                            <span className="w-12 text-center">Yanlış</span>
                            <span className="w-14 text-center">Başarı</span>
                        </div>
                        {topicStats.map((t) => (
                            <div
                                key={t.id}
                                className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center px-3 py-2.5 rounded-lg bg-gray-50"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                        t.percentage >= 70 ? 'bg-emerald-500' :
                                        t.percentage >= 40 ? 'bg-amber-500' : 'bg-red-500'
                                    }`} />
                                    <span className="text-sm font-medium text-gray-700 truncate">{t.name}</span>
                                </div>
                                <span className="w-12 text-center text-sm text-gray-600">{t.total}</span>
                                <span className="w-12 text-center text-sm text-emerald-600 font-medium">{t.correct}</span>
                                <span className="w-12 text-center text-sm text-red-600 font-medium">{t.incorrect}</span>
                                <span className={`w-14 text-center text-sm font-bold ${
                                    t.percentage >= 70 ? 'text-emerald-600' :
                                    t.percentage >= 40 ? 'text-amber-600' : 'text-red-600'
                                }`}>
                                    %{t.percentage}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Veri yoksa */}
            {filteredSubmissions.length === 0 && (
                <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center">
                    <p className="text-gray-400 text-sm">
                        {timeFilter === 'all'
                            ? 'Bu öğrenci henüz ödev teslim etmemiş.'
                            : 'Seçilen dönemde teslim edilen ödev bulunmuyor.'}
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
                                                    setSelectedSubs(prev => prev.filter(id => id !== sub.id));
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
                                            pct >= 70 ? 'text-emerald-600' :
                                            pct >= 40 ? 'text-amber-600' : 'text-red-600'
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
        </div>
    );
}
