'use client';

import { useState, useEffect } from 'react';

const DURATIONS = [
  { label: '30 dk', value: 30 },
  { label: '45 dk', value: 45 },
  { label: '1 saat', value: 60 },
  { label: '1.5 saat', value: 90 },
  { label: '2 saat', value: 120 },
];

const HOURS = Array.from({ length: 16 }, (_, i) => {
  const h = i + 8;
  return { label: `${String(h).padStart(2, '0')}:00`, value: `${String(h).padStart(2, '0')}:00` };
}).concat(
  Array.from({ length: 15 }, (_, i) => {
    const h = i + 8;
    return { label: `${String(h).padStart(2, '0')}:30`, value: `${String(h).padStart(2, '0')}:30` };
  })
).sort((a, b) => a.value.localeCompare(b.value));

function todayLocal() {
  return new Date().toISOString().split('T')[0];
}

export default function AgendaModal({ show, onClose, onSave, students, editLesson }) {
  const isEdit = !!editLesson;

  const [form, setForm] = useState({
    student_id: '',
    lesson_type: 'face_to_face',
    lesson_date: todayLocal(),
    start_time: '10:00',
    duration_minutes: 60,
    price: '',
    subject: '',
    is_recurring: false,
  });
  const [applyToFuture, setApplyToFuture] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editLesson) {
      setForm({
        student_id: editLesson.student_id,
        lesson_type: editLesson.lesson_type,
        lesson_date: editLesson.lesson_date,
        start_time: editLesson.start_time?.slice(0, 5) || '10:00',
        duration_minutes: editLesson.duration_minutes,
        price: String(editLesson.price),
        subject: editLesson.subject || '',
        is_recurring: editLesson.is_recurring || false,
      });
      setApplyToFuture(false);
    } else {
      setForm({
        student_id: '',
        lesson_type: 'face_to_face',
        lesson_date: todayLocal(),
        start_time: '10:00',
        duration_minutes: 60,
        price: '',
        subject: '',
        is_recurring: false,
      });
    }
  }, [editLesson, show]);

  // Auto-fill price when student changes
  useEffect(() => {
    if (!isEdit && form.student_id) {
      const s = students.find(st => st.id === form.student_id);
      if (s?.default_lesson_price) {
        setForm(prev => ({ ...prev, price: String(s.default_lesson_price) }));
      }
    }
  }, [form.student_id, isEdit, students]);

  if (!show) return null;

  const handleSubmit = async () => {
    if (!form.student_id || !form.lesson_date || !form.start_time || !form.price) return;
    setSaving(true);
    await onSave({ ...form, price: parseFloat(form.price) }, isEdit ? applyToFuture : false);
    setSaving(false);
  };

  const selectedStudent = students.find(s => s.id === form.student_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'modalIn 0.25s ease-out' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/90 backdrop-blur-md px-6 py-4 border-b border-gray-100 rounded-t-2xl flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? '✏️ Dersi Düzenle' : '📅 Yeni Ders Ekle'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Öğrenci */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Öğrenci</label>
            <select
              value={form.student_id}
              onChange={e => setForm({ ...form, student_id: e.target.value })}
              disabled={isEdit}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">Öğrenci seçin...</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Ders Tipi */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Ders Tipi</label>
            <div className="flex gap-2">
              {[
                { value: 'face_to_face', label: '🏫 Yüz Yüze', color: 'blue' },
                { value: 'online', label: '💻 Online', color: 'teal' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, lesson_type: opt.value })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                    form.lesson_type === opt.value
                      ? opt.color === 'blue'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tarih & Saat */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Tarih</label>
              <input
                type="date"
                value={form.lesson_date}
                onChange={e => setForm({ ...form, lesson_date: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Saat</label>
              <select
                value={form.start_time}
                onChange={e => setForm({ ...form, start_time: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
              >
                {HOURS.map(h => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Süre & Ücret */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Süre</label>
              <select
                value={form.duration_minutes}
                onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
              >
                {DURATIONS.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Ücret (₺)</label>
              <input
                type="number" min="0" step="1"
                value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })}
                placeholder="0"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
              />
            </div>
          </div>

          {/* Konu Notu */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Konu Notu <span className="text-gray-400 font-normal">(opsiyonel)</span></label>
            <input
              type="text"
              value={form.subject}
              onChange={e => setForm({ ...form, subject: e.target.value })}
              placeholder="Örn: Türev, Integral..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
            />
          </div>

          {/* Haftalık Tekrar */}
          {!isEdit && (
            <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-blue-300 cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={form.is_recurring}
                onChange={e => setForm({ ...form, is_recurring: e.target.checked })}
                className="w-4 h-4 rounded accent-blue-600"
              />
              <div>
                <span className="text-sm font-semibold text-gray-700">🔁 Haftalık Tekrar</span>
                <p className="text-xs text-gray-400 mt-0.5">12 hafta boyunca her hafta aynı gün ve saatte oluşturulur</p>
              </div>
            </label>
          )}

          {/* Tekrar eden ders düzenlemesinde */}
          {isEdit && editLesson?.is_recurring && (
            <label className="flex items-center gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50 cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={applyToFuture}
                onChange={e => setApplyToFuture(e.target.checked)}
                className="w-4 h-4 rounded accent-amber-600"
              />
              <div>
                <span className="text-sm font-semibold text-amber-700">Sonraki haftalara da uygulansın mı?</span>
                <p className="text-xs text-amber-500 mt-0.5">Bu değişiklik tüm gelecek derslere uygulanır</p>
              </div>
            </label>
          )}

          {/* Kaydet */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-500 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all">
              İptal
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !form.student_id || !form.price}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-gray-900 rounded-xl hover:bg-gray-800 active:scale-[0.97] transition-all disabled:opacity-40 shadow-sm"
            >
              {saving ? 'Kaydediliyor...' : isEdit ? '✏️ Güncelle' : '📅 Ekle'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
