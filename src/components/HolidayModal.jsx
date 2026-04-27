'use client';

import { useState, useEffect } from 'react';

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

export default function HolidayModal({ show, onClose, onSave }) {
  const [form, setForm] = useState({
    label: '',
    lesson_date: todayLocal(),
    all_day: true,
    start_time: '08:00',
    end_time: '23:00',
    is_recurring: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show) {
      setForm({
        label: '',
        lesson_date: todayLocal(),
        all_day: true,
        start_time: '08:00',
        end_time: '23:00',
        is_recurring: false,
      });
    }
  }, [show]);

  if (!show) return null;

  // end_time'dan duration hesapla
  const timeToMin = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const handleSubmit = async () => {
    if (!form.lesson_date) return;
    if (!form.label.trim()) {
      alert('Lütfen tatil için bir açıklama girin.');
      return;
    }

    const startTime = form.all_day ? '08:00' : form.start_time;
    const endMin = form.all_day ? timeToMin('23:00') : timeToMin(form.end_time);
    const startMin = timeToMin(startTime);

    if (!form.all_day && endMin <= startMin) {
      alert('Bitiş saati, başlangıç saatinden sonra olmalıdır.');
      return;
    }

    const durationMinutes = endMin - startMin;

    setSaving(true);
    await onSave({
      label: form.label.trim(),
      lesson_date: form.lesson_date,
      start_time: startTime,
      duration_minutes: durationMinutes,
      is_recurring: form.is_recurring,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'modalIn 0.25s ease-out' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/90 backdrop-blur-md px-6 py-4 border-b border-amber-100 rounded-t-2xl flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-gray-900">🚫 Tatil / Müsait Değil</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Açıklama */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Açıklama</label>
            <input
              type="text"
              value={form.label}
              onChange={e => setForm({ ...form, label: e.target.value })}
              placeholder="Örn: Bayram, Özel Gün, Hasta..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all text-sm"
            />
          </div>

          {/* Tarih */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Tarih</label>
            <input
              type="date"
              value={form.lesson_date}
              onChange={e => setForm({ ...form, lesson_date: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all text-sm"
            />
          </div>

          {/* Tüm Gün mü? */}
          <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-amber-300 cursor-pointer transition-all">
            <input
              type="checkbox"
              checked={form.all_day}
              onChange={e => setForm({ ...form, all_day: e.target.checked })}
              className="w-4 h-4 rounded accent-amber-500"
            />
            <div>
              <span className="text-sm font-semibold text-gray-700">🌅 Tüm Gün</span>
              <p className="text-xs text-gray-400 mt-0.5">İşaretlenirse gün boyunca ders eklenemez</p>
            </div>
          </label>

          {/* Belirli Saat Aralığı */}
          {!form.all_day && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Başlangıç Saati</label>
                <select
                  value={form.start_time}
                  onChange={e => setForm({ ...form, start_time: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all text-sm"
                >
                  {HOURS.map(h => (
                    <option key={h.value} value={h.value}>{h.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Bitiş Saati</label>
                <select
                  value={form.end_time}
                  onChange={e => setForm({ ...form, end_time: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all text-sm"
                >
                  {HOURS.map(h => (
                    <option key={h.value} value={h.value}>{h.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Haftalık Tekrar */}
          <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-amber-300 cursor-pointer transition-all">
            <input
              type="checkbox"
              checked={form.is_recurring}
              onChange={e => setForm({ ...form, is_recurring: e.target.checked })}
              className="w-4 h-4 rounded accent-amber-500"
            />
            <div>
              <span className="text-sm font-semibold text-gray-700">🔁 Haftalık Tekrar</span>
              <p className="text-xs text-gray-400 mt-0.5">12 hafta boyunca her hafta aynı günde bloklanır</p>
            </div>
          </label>

          {/* Kaydet */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-500 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all">
              İptal
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !form.label.trim() || !form.lesson_date}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-amber-500 rounded-xl hover:bg-amber-600 active:scale-[0.97] transition-all disabled:opacity-40 shadow-sm"
            >
              {saving ? 'Kaydediliyor...' : '🚫 Tatil Ekle'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
