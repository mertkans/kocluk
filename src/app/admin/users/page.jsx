'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminUsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteLoading, setDeleteLoading] = useState(null);
    const [filter, setFilter] = useState('all');
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        const { data } = await supabase.from('users').select('*').order('role').order('created_at', { ascending: false });
        setUsers(data || []);
        setLoading(false);
    };

    const handleDelete = async (userId, userName) => {
        if (!confirm(`"${userName}" kullanıcısını silmek istediğinize emin misiniz?`)) return;
        setDeleteLoading(userId);
        try {
            const res = await fetch('/api/admin/delete-user', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            const data = await res.json();
            if (data.success) fetchUsers();
            else alert('Hata: ' + data.error);
        } catch { alert('Bir hata oluştu.'); }
        setDeleteLoading(null);
    };

    const handleAddTeacher = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');
        setFormLoading(true);
        try {
            const res = await fetch('/api/admin/create-teacher', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (data.success) {
                setFormSuccess(`✅ "${data.teacher.name}" öğretmen olarak eklendi.`);
                setFormData({ name: '', email: '', password: '' });
                fetchUsers();
            } else {
                setFormError(data.error);
            }
        } catch {
            setFormError('Bir hata oluştu.');
        }
        setFormLoading(false);
    };

    const roleLabels = { admin: 'Yönetici', teacher: 'Öğretmen', student: 'Öğrenci' };
    const roleColors = {
        admin: 'bg-purple-100 text-purple-700',
        teacher: 'bg-blue-100 text-blue-700',
        student: 'bg-emerald-100 text-emerald-700',
    };

    const filtered = filter === 'all' ? users : users.filter((u) => u.role === filter);

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-gray-400">Yükleniyor...</div></div>;
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-900">👥 Kullanıcı Yönetimi</h1>
                <button
                    onClick={() => { setShowForm(!showForm); setFormError(''); setFormSuccess(''); }}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 text-white font-semibold rounded-xl shadow-sm hover:bg-gray-800 active:scale-[0.98] transition-all text-sm"
                >
                    {showForm ? '✕ İptal' : '👨‍🏫 Öğretmen Ekle'}
                </button>
            </div>

            {/* Öğretmen Ekleme Formu */}
            {showForm && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm">
                    <h2 className="text-base font-bold text-gray-800 mb-4">Yeni Öğretmen Kaydı</h2>

                    {formError && (
                        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">{formError}</div>
                    )}
                    {formSuccess && (
                        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm">{formSuccess}</div>
                    )}

                    <form onSubmit={handleAddTeacher} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Ad Soyad *</label>
                            <input type="text" required value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Öğretmen adı soyadı"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Email *</label>
                            <input type="email" required value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="ogretmen@email.com"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Şifre *</label>
                            <input type="text" required minLength={6} value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="En az 6 karakter"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                            />
                        </div>
                        <button type="submit" disabled={formLoading}
                            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-sm hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 text-sm"
                        >
                            {formLoading ? 'Oluşturuluyor...' : '👨‍🏫 Öğretmeni Kaydet'}
                        </button>
                    </form>
                </div>
            )}

            {/* Filtre */}
            <div className="flex gap-2 flex-wrap">
                {['all', 'teacher', 'student'].map((f) => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${filter === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                        {f === 'all' ? `Tümü (${users.length})` : `${roleLabels[f]} (${users.filter(u => u.role === f).length})`}
                    </button>
                ))}
            </div>

            {/* Kullanıcı Listesi */}
            <div className="space-y-2">
                {filtered.length === 0 ? (
                    <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm">
                        Bu filtrede kullanıcı bulunamadı.
                    </div>
                ) : filtered.map((u) => (
                    <div key={u.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100">
                        <div className="min-w-0 flex items-center gap-3">
                            <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${roleColors[u.role]}`}>
                                {roleLabels[u.role]}
                            </span>
                            <div className="min-w-0">
                                <p className="font-medium text-gray-800 text-sm truncate">{u.name}</p>
                                <p className="text-xs text-gray-400 truncate">{u.email}</p>
                            </div>
                        </div>
                        {u.role !== 'admin' && (
                            <button onClick={() => handleDelete(u.id, u.name)} disabled={deleteLoading === u.id}
                                className="ml-3 shrink-0 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-all disabled:opacity-50"
                            >
                                {deleteLoading === u.id ? '...' : 'Sil'}
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
