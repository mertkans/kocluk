'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

export default function TopicsPage() {
    const { profile } = useAuth();
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newTopic, setNewTopic] = useState('');
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(null);

    useEffect(() => {
        if (profile) fetchTopics();
    }, [profile]);

    const fetchTopics = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('topics')
            .select('*')
            .eq('teacher_id', profile.id)
            .order('name');
        setTopics(data || []);
        setLoading(false);
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        const trimmed = newTopic.trim();
        if (!trimmed) return;
        setAdding(true);

        const { error } = await supabase.from('topics').insert([{
            teacher_id: profile.id,
            name: trimmed,
        }]);

        if (error) {
            if (error.code === '23505') {
                alert('Bu konu zaten mevcut.');
            } else {
                alert('Hata: ' + error.message);
            }
        } else {
            setNewTopic('');
            fetchTopics();
        }
        setAdding(false);
    };

    const executeDelete = async () => {
        if (!confirmDelete) return;
        const topic = confirmDelete;
        setConfirmDelete(null);

        const { error } = await supabase.from('topics').delete().eq('id', topic.id);
        if (error) {
            alert('Silme hatası: ' + error.message);
        } else {
            fetchTopics();
        }
    };

    const handleEdit = async (id) => {
        const trimmed = editingName.trim();
        if (!trimmed) return;

        const { error } = await supabase
            .from('topics')
            .update({ name: trimmed })
            .eq('id', id);

        if (error) {
            if (error.code === '23505') {
                alert('Bu konu adı zaten mevcut.');
            } else {
                alert('Güncelleme hatası: ' + error.message);
            }
        } else {
            setEditingId(null);
            fetchTopics();
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">📎 Konular</h1>
            <p className="text-sm text-gray-400 -mt-4">
                Ödev oluştururken sorulara atayabileceğiniz konu listesi.
            </p>

            {/* Yeni Konu Ekleme */}
            <form onSubmit={handleAdd} className="flex gap-2">
                <input
                    type="text"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    placeholder="Yeni konu adı yazın..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                />
                <button
                    type="submit"
                    disabled={adding || !newTopic.trim()}
                    className="px-5 py-2.5 bg-gray-900 text-white font-semibold rounded-xl shadow-sm hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-40 text-sm shrink-0"
                >
                    {adding ? '...' : '➕ Ekle'}
                </button>
            </form>

            {/* Konu Listesi */}
            {loading ? (
                <div className="flex items-center justify-center h-32">
                    <div className="animate-pulse text-gray-400">Yükleniyor...</div>
                </div>
            ) : topics.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm">
                    Henüz konu eklemediniz. Yukarıdan yeni konular ekleyin.
                </div>
            ) : (
                <div className="space-y-1.5">
                    <p className="text-xs text-gray-400 font-medium">{topics.length} konu</p>
                    {topics.map((topic) => (
                        <div
                            key={topic.id}
                            className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100 group"
                        >
                            {editingId === topic.id ? (
                                <div className="flex-1 flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleEdit(topic.id);
                                            if (e.key === 'Escape') setEditingId(null);
                                        }}
                                        autoFocus
                                        className="flex-1 px-3 py-1.5 rounded-lg border border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                                    />
                                    <button
                                        onClick={() => handleEdit(topic.id)}
                                        className="text-xs text-blue-600 font-medium hover:underline"
                                    >
                                        Kaydet
                                    </button>
                                    <button
                                        onClick={() => setEditingId(null)}
                                        className="text-xs text-gray-400 hover:underline"
                                    >
                                        İptal
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-gray-800 text-sm truncate">{topic.name}</p>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => {
                                                setEditingId(topic.id);
                                                setEditingName(topic.name);
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
                                            title="Düzenle"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => setConfirmDelete(topic)}
                                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all"
                                            title="Sil"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
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
                            <h3 className="text-lg font-bold text-gray-900">Konuyu Sil</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                <strong>&ldquo;{confirmDelete.name}&rdquo;</strong> konusunu silmek istediğinize emin misiniz?
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
