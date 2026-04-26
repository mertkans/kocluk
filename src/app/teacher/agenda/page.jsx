'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import AgendaModal from '@/components/AgendaModal';

function getWeekDays(baseDate) {
  const days = [];
  const d = new Date(baseDate);
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    days.push(day);
  }
  return days;
}

function fmtDate(d) {
  return d.toISOString().split('T')[0];
}

function isToday(d) {
  return fmtDate(d) === fmtDate(new Date());
}

function isPast(d) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

const DAY_NAMES = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const DAY_FULL = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const MONTH_NAMES = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export default function AgendaPage() {
  const { profile } = useAuth();
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  });
  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editLesson, setEditLesson] = useState(null);

  const days = getWeekDays(weekStart);

  const fetchStudents = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('users')
      .select('id, name, default_lesson_price')
      .eq('role', 'student')
      .eq('created_by', profile.id)
      .order('name');
    setStudents(data || []);
  }, [profile]);

  const fetchLessons = useCallback(async () => {
    if (!profile) return;
    const startStr = fmtDate(days[0]);
    const endStr = fmtDate(days[6]);
    const { data } = await supabase
      .from('scheduled_lessons')
      .select('*, student:users!scheduled_lessons_student_id_fkey(name)')
      .eq('teacher_id', profile.id)
      .gte('lesson_date', startStr)
      .lte('lesson_date', endStr)
      .order('start_time');
    setLessons(data || []);
  }, [profile, days[0]?.getTime()]);

  useEffect(() => {
    if (profile) {
      setLoading(true);
      Promise.all([fetchStudents(), fetchLessons()]).then(() => setLoading(false));
    }
  }, [profile, weekStart]);

  const navigateWeek = (dir) => {
    setWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + dir * 7);
      return d;
    });
  };

  const goToday = () => {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    setWeekStart(d);
  };

  // ---- CRUD ----
  const handleSave = async (form, applyToFuture) => {
    if (editLesson) {
      // UPDATE
      const updates = {
        lesson_type: form.lesson_type,
        lesson_date: form.lesson_date,
        start_time: form.start_time,
        duration_minutes: form.duration_minutes,
        price: form.price,
        subject: form.subject || null,
      };

      if (applyToFuture && editLesson.recurring_group_id) {
        await supabase
          .from('scheduled_lessons')
          .update(updates)
          .eq('recurring_group_id', editLesson.recurring_group_id)
          .gte('lesson_date', editLesson.lesson_date)
          .eq('status', 'scheduled');
      } else {
        await supabase.from('scheduled_lessons').update(updates).eq('id', editLesson.id);
      }
    } else {
      // INSERT
      const groupId = form.is_recurring ? crypto.randomUUID() : null;
      const rows = [];
      const weeksCount = form.is_recurring ? 12 : 1;

      for (let w = 0; w < weeksCount; w++) {
        const d = new Date(form.lesson_date + 'T12:00:00');
        d.setDate(d.getDate() + w * 7);
        rows.push({
          teacher_id: profile.id,
          student_id: form.student_id,
          lesson_date: fmtDate(d),
          start_time: form.start_time,
          duration_minutes: form.duration_minutes,
          lesson_type: form.lesson_type,
          subject: form.subject || null,
          price: form.price,
          is_recurring: form.is_recurring,
          recurring_group_id: groupId,
          status: 'scheduled',
        });
      }
      await supabase.from('scheduled_lessons').insert(rows);
    }

    setShowModal(false);
    setEditLesson(null);
    await fetchLessons();
  };

  const handleStatus = async (lesson, newStatus) => {
    await supabase.from('scheduled_lessons').update({ status: newStatus }).eq('id', lesson.id);

    if (newStatus === 'completed') {
      await supabase.from('private_lessons').insert([{
        teacher_id: profile.id,
        student_id: lesson.student_id,
        lesson_date: lesson.lesson_date,
        duration_minutes: lesson.duration_minutes,
        subject: lesson.subject || null,
        price: lesson.price,
      }]);
    }
    await fetchLessons();
  };

  const handleDelete = async (lesson) => {
    if (!confirm('Bu dersi silmek istediğinizden emin misiniz?')) return;
    await supabase.from('scheduled_lessons').delete().eq('id', lesson.id);
    await fetchLessons();
  };

  const openEdit = (lesson) => {
    setEditLesson(lesson);
    setShowModal(true);
  };

  const openNew = () => {
    setEditLesson(null);
    setShowModal(true);
  };

  // Group lessons by date
  const lessonsByDate = {};
  lessons.forEach(l => {
    if (!lessonsByDate[l.lesson_date]) lessonsByDate[l.lesson_date] = [];
    lessonsByDate[l.lesson_date].push(l);
  });

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📅 Ajanda</h1>
          <p className="text-sm text-gray-400 mt-0.5">Haftalık ders programı</p>
        </div>
        <button
          onClick={openNew}
          className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 active:scale-[0.97] transition-all shadow-sm"
        >
          + Ders Ekle
        </button>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm">
        <button onClick={() => navigateWeek(-1)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-800">
            {days[0].getDate()} {MONTH_NAMES[days[0].getMonth()]} — {days[6].getDate()} {MONTH_NAMES[days[6].getMonth()]} {days[6].getFullYear()}
          </span>
          <button onClick={goToday} className="px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all">
            Bugün
          </button>
        </div>
        <button onClick={() => navigateWeek(1)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-pulse text-gray-400">Yükleniyor...</div>
        </div>
      ) : (
        <>
          {/* Desktop: 7-column grid */}
          <div className="hidden md:grid grid-cols-7 gap-2">
            {days.map(day => {
              const dateStr = fmtDate(day);
              const dayLessons = lessonsByDate[dateStr] || [];
              const today = isToday(day);
              const past = isPast(day);

              return (
                <div
                  key={dateStr}
                  className={`rounded-2xl border p-3 min-h-[200px] transition-all ${
                    today
                      ? 'border-blue-300 bg-blue-50/50 shadow-md ring-2 ring-blue-200'
                      : past
                      ? 'border-gray-100 bg-gray-50/50 opacity-70'
                      : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
                  }`}
                >
                  {/* Day header */}
                  <div className="text-center mb-2 pb-2 border-b border-gray-100">
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${today ? 'text-blue-600' : 'text-gray-400'}`}>
                      {DAY_NAMES[day.getDay()]}
                    </div>
                    <div className={`text-lg font-black mt-0.5 ${today ? 'text-blue-700' : 'text-gray-800'}`}>
                      {day.getDate()}
                    </div>
                  </div>

                  {/* Lessons */}
                  <div className="space-y-1.5">
                    {dayLessons.map(lesson => (
                      <LessonCard key={lesson.id} lesson={lesson} compact onEdit={() => openEdit(lesson)} onStatus={handleStatus} onDelete={handleDelete} />
                    ))}
                  </div>

                  {dayLessons.length === 0 && (
                    <p className="text-[10px] text-gray-300 text-center mt-4">Ders yok</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile: vertical list */}
          <div className="md:hidden space-y-3">
            {days.map(day => {
              const dateStr = fmtDate(day);
              const dayLessons = lessonsByDate[dateStr] || [];
              const today = isToday(day);
              const past = isPast(day);

              return (
                <div
                  key={dateStr}
                  className={`rounded-2xl border p-4 transition-all ${
                    today
                      ? 'border-blue-300 bg-blue-50/50 shadow-md'
                      : past
                      ? 'border-gray-100 bg-gray-50/50 opacity-70'
                      : 'border-gray-100 bg-white'
                  }`}
                >
                  <div className={`flex items-center gap-2 mb-3 ${today ? 'text-blue-700' : 'text-gray-700'}`}>
                    <span className="text-lg font-black">{day.getDate()}</span>
                    <span className="text-sm font-semibold">{DAY_FULL[day.getDay()]}</span>
                    <span className="text-xs text-gray-400">{MONTH_NAMES[day.getMonth()]}</span>
                    {today && <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full ml-auto">BUGÜN</span>}
                  </div>

                  {dayLessons.length === 0 ? (
                    <p className="text-xs text-gray-300 pl-1">Ders yok</p>
                  ) : (
                    <div className="space-y-2">
                      {dayLessons.map(lesson => (
                        <LessonCard key={lesson.id} lesson={lesson} onEdit={() => openEdit(lesson)} onStatus={handleStatus} onDelete={handleDelete} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal */}
      <AgendaModal
        show={showModal}
        onClose={() => { setShowModal(false); setEditLesson(null); }}
        onSave={handleSave}
        students={students}
        editLesson={editLesson}
      />

      {/* Modal animation style */}
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ---- Lesson Card Component ----
function LessonCard({ lesson, compact, onEdit, onStatus, onDelete }) {
  const isOnline = lesson.lesson_type === 'online';
  const isCompleted = lesson.status === 'completed';
  const isCancelled = lesson.status === 'cancelled';
  const studentName = lesson.student?.name || '—';
  const time = lesson.start_time?.slice(0, 5);

  const bgClass = isCancelled
    ? 'bg-red-50/60 border-red-200 opacity-60'
    : isCompleted
    ? 'bg-emerald-50/60 border-emerald-200'
    : isOnline
    ? 'bg-teal-50/60 border-teal-200 hover:border-teal-300'
    : 'bg-blue-50/60 border-blue-200 hover:border-blue-300';

  return (
    <div className={`group rounded-xl border p-2.5 transition-all ${bgClass} ${compact ? 'text-[10px]' : 'text-xs'}`}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <div className={`font-bold truncate ${isCompleted ? 'text-emerald-700' : isCancelled ? 'text-red-400 line-through' : isOnline ? 'text-teal-700' : 'text-blue-700'}`}>
            {studentName}
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-gray-500 flex-wrap">
            <span>🕐 {time}</span>
            <span>· {lesson.duration_minutes}dk</span>
            {!compact && <span>· {isOnline ? '💻' : '🏫'}</span>}
          </div>
          {lesson.subject && !compact && (
            <div className="text-gray-400 mt-0.5 truncate">📝 {lesson.subject}</div>
          )}
          {!compact && (
            <div className="text-gray-500 font-semibold mt-0.5">{Number(lesson.price).toLocaleString('tr-TR')}₺</div>
          )}
        </div>

        {/* Status badge */}
        {(isCompleted || isCancelled) && (
          <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
            isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'
          }`}>
            {isCompleted ? '✓' : '✕'}
          </span>
        )}
      </div>

      {/* Action buttons */}
      {lesson.status === 'scheduled' && (
        <div className={`flex gap-1 mt-1.5 ${compact ? 'opacity-0 group-hover:opacity-100' : ''} transition-opacity`}>
          <button
            onClick={(e) => { e.stopPropagation(); onStatus(lesson, 'completed'); }}
            className="flex-1 py-1 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-bold transition-all text-[10px]"
            title="Onayla"
          >
            ✓
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onStatus(lesson, 'cancelled'); }}
            className="flex-1 py-1 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 font-bold transition-all text-[10px]"
            title="İptal"
          >
            ✕
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="flex-1 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-bold transition-all text-[10px]"
            title="Düzenle"
          >
            ✏️
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(lesson); }}
            className="py-1 px-1.5 rounded-lg bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-500 font-bold transition-all text-[10px]"
            title="Sil"
          >
            🗑
          </button>
        </div>
      )}
    </div>
  );
}
