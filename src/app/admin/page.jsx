'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminPage() {
    const [teachers, setTeachers] = useState([]);
    const [students, setStudents] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteLoading, setDeleteLoading] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const [teacherRes, studentRes, assignmentRes] = await Promise.all([
            supabase.from('users').select('*').eq('role', 'teacher').order('created_at', { ascending: false }),
            supabase.from('users').select('*').eq('role', 'student').order('created_at', { ascending: false }),
            supabase.from('assignments').select('*, users!assignments_teacher_id_fkey(name)').order('created_at', { ascending: false }),
        ]);
        setTeachers(teacherRes.data || []);
        setStudents(studentRes.data || []);
        setAssignments(assignmentRes.data || []);
        setLoading(false);
    };

    const handleDelete = async (userId, userName) => {
        if (!confirm(`"${userName}" kullanıcısını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
        setDeleteLoading(userId);
        try {
            const res = await fetch('/api/admin/delete-user', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            const data = await res.json();
            if (data.success) {
                fetchData();
            } else {
                alert('Silme hatası: ' + data.error);
            }
        } catch {
            alert('Bir hata oluştu.');
        }
        setDeleteLoading(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-pulse text-gray-400">Yükleniyor...</div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <h1 className="text-2xl font-bold text-gray-900">📊 Yönetici Paneli</h1>

            {/* İstatistik Kartları */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="Öğretmenler" value={teachers.length} icon="👨‍🏫" color="blue" />
                <StatCard label="Öğrenciler" value={students.length} icon="👨‍🎓" color="emerald" />
                <StatCard label="Ödevler" value={assignments.length} icon="📋" color="purple" />
            </div>

            {/* Öğretmenler */}
            <Section title="👨‍🏫 Öğretmenler">
                {teachers.length === 0 ? (
                    <EmptyState text="Henüz kayıtlı öğretmen yok." />
                ) : (
                    <div className="space-y-2">
                        {teachers.map((t) => (
                            <UserRow
                                key={t.id}
                                user={t}
                                subtitle={t.email}
                                onDelete={() => handleDelete(t.id, t.name)}
                                isDeleting={deleteLoading === t.id}
                            />
                        ))}
                    </div>
                )}
            </Section>

            {/* Öğrenciler */}
            <Section title="👨‍🎓 Öğrenciler">
                {students.length === 0 ? (
                    <EmptyState text="Henüz kayıtlı öğrenci yok." />
                ) : (
                    <div className="space-y-2">
                        {students.map((s) => (
                            <UserRow
                                key={s.id}
                                user={s}
                                subtitle={`${s.class_level || 'Sınıf belirtilmemiş'} · ${s.email}`}
                                onDelete={() => handleDelete(s.id, s.name)}
                                isDeleting={deleteLoading === s.id}
                            />
                        ))}
                    </div>
                )}
            </Section>

            {/* Ödevler */}
            <Section title="📋 Tüm Ödevler">
                {assignments.length === 0 ? (
                    <EmptyState text="Henüz oluşturulmuş ödev yok." />
                ) : (
                    <div className="space-y-2">
                        {assignments.map((a) => (
                            <div key={a.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100">
                                <div>
                                    <p className="font-medium text-gray-800 text-sm">{a.title}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {a.question_count} soru · {a.option_count} şık · Öğretmen: {a.users?.name || '—'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Section>
        </div>
    );
}

function StatCard({ label, value, icon, color }) {
    const colors = {
        blue: 'bg-blue-50 text-blue-700',
        emerald: 'bg-emerald-50 text-emerald-700',
        purple: 'bg-purple-50 text-purple-700',
    };
    return (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${colors[color]}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div>
            <h2 className="text-lg font-bold text-gray-800 mb-3">{title}</h2>
            {children}
        </div>
    );
}

function UserRow({ user, subtitle, onDelete, isDeleting }) {
    return (
        <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100">
            <div className="min-w-0">
                <p className="font-medium text-gray-800 text-sm truncate">{user.name}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>
            </div>
            <button
                onClick={onDelete}
                disabled={isDeleting}
                className="ml-3 shrink-0 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-all disabled:opacity-50"
            >
                {isDeleting ? '...' : 'Sil'}
            </button>
        </div>
    );
}

function EmptyState({ text }) {
    return (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm">
            {text}
        </div>
    );
}
