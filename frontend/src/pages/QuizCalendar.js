import React, { useState, useEffect, useMemo } from 'react';
import { CaretLeft, CaretRight, Calendar, Clock, Users, Eye, PencilLine, Fire, Clipboard, CalendarBlank } from '@phosphor-icons/react';
import PageHeader from '../components/PageHeader';
import { analyticsAPI } from '../services/api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const statusConfig = {
  active:    { label: 'Active',    dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-600 ring-emerald-200',  bg: 'bg-emerald-50/60', border: 'border-emerald-200' },
  ended:     { label: 'Ended',     dot: 'bg-slate-400',   badge: 'bg-slate-100 text-slate-500 dark:text-slate-400 ring-slate-200',       bg: 'bg-slate-50 dark:bg-slate-800/50/60',   border: 'border-slate-200 dark:border-slate-700' },
  scheduled: { label: 'Scheduled', dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-600 ring-amber-200',       bg: 'bg-amber-50/60',   border: 'border-amber-200' },
  draft:     { label: 'Draft',     dot: 'bg-purple-500',  badge: 'bg-purple-50 text-purple-600 ring-purple-200',     bg: 'bg-purple-50/60',  border: 'border-purple-200' },
};

const QuizCalendar = ({ navigate, user }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const { data } = await analyticsAPI.teacherDashboard();
        setQuizzes(data.quizzes || []);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchQuizzes();
  }, []);

  // Group quizzes by date string (YYYY-MM-DD)
  const quizMap = useMemo(() => {
    const map = {};
    quizzes.forEach(q => {
      const dateStr = q.created_at ? new Date(q.created_at).toISOString().split('T')[0] : null;
      if (dateStr) {
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(q);
      }
    });
    return map;
  }, [quizzes]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const days = [];

    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, current: false, dateStr });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, current: true, dateStr });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const dateStr = `${year}-${String(month + 2).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, current: false, dateStr });
    }

    return days;
  }, [year, month]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const today = new Date().toISOString().split('T')[0];

  const selectedDateQuizzes = selectedDate ? (quizMap[selectedDate] || []) : [];

  // Stats
  const totalActive = quizzes.filter(q => q.status === 'active').length;
  const totalScheduled = quizzes.filter(q => q.status === 'scheduled').length;
  const totalEnded = quizzes.filter(q => q.status === 'ended').length;

  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300 flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm font-bold text-slate-400">Loading calendar...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      <PageHeader
        navigate={navigate} user={user} title="Quiz Calendar"
        subtitle={`${totalActive} active • ${totalScheduled} scheduled • ${totalEnded} ended`}
        maxWidth="max-w-7xl"
        rightContent={
          <button onClick={goToday}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-500/150 text-white hover:bg-indigo-600 transition-colors flex items-center gap-1.5">
            <CalendarBlank size={14} weight="bold" /> Today
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mb-5" style={{animation: 'fadeInUp 0.2s ease'}}>
          {Object.entries(statusConfig).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`}></div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{cfg.label}</span>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-2 soft-card p-4 sm:p-6" style={{animation: 'fadeInUp 0.3s ease'}}>
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button onClick={prevMonth} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 text-slate-500 dark:text-slate-400 transition-colors">
                <CaretLeft size={20} weight="bold" />
              </button>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                {MONTHS[month]} {year}
              </h2>
              <button onClick={nextMonth} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 text-slate-500 dark:text-slate-400 transition-colors">
                <CaretRight size={20} weight="bold" />
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs font-bold uppercase tracking-wider text-slate-400 py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Day Cells */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((dayObj, i) => {
                const dayQuizzes = quizMap[dayObj.dateStr] || [];
                const hasQuizzes = dayQuizzes.length > 0;
                const isToday = dayObj.dateStr === today;
                const isSelected = dayObj.dateStr === selectedDate;

                return (
                  <button
                    key={i}
                    onClick={() => { setSelectedDate(dayObj.dateStr); setSelectedQuiz(null); }}
                    className={`relative min-h-[56px] sm:min-h-[72px] p-1.5 sm:p-2 rounded-xl text-left transition-all border ${
                      !dayObj.current ? 'opacity-30 border-transparent' :
                      isSelected ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200' :
                      isToday ? 'bg-blue-50/50 border-blue-200' :
                      hasQuizzes ? 'bg-white border-slate-100 dark:border-slate-700 hover:border-indigo-200 hover:bg-indigo-50/30' :
                      'bg-white border-transparent hover:bg-slate-50 dark:bg-slate-800/50'
                    }`}
                  >
                    <span className={`text-xs sm:text-sm font-bold block mb-1 ${
                      isToday ? 'text-indigo-600' :
                      !dayObj.current ? 'text-slate-300' :
                      'text-slate-700 dark:text-slate-300'
                    }`}>
                      {isToday ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-500/150 text-white text-xs">
                          {dayObj.day}
                        </span>
                      ) : dayObj.day}
                    </span>

                    {/* Quiz dots */}
                    {hasQuizzes && dayObj.current && (
                      <div className="flex flex-wrap gap-0.5">
                        {dayQuizzes.slice(0, 3).map((q, qi) => (
                          <div key={qi} className={`w-2 h-2 rounded-full ${statusConfig[q.status]?.dot || 'bg-slate-300'}`}></div>
                        ))}
                        {dayQuizzes.length > 3 && (
                          <span className="text-[9px] font-bold text-slate-400">+{dayQuizzes.length - 3}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar: Selected Date Details */}
          <div className="lg:col-span-1" style={{animation: 'fadeInUp 0.4s ease'}}>
            {selectedDate ? (
              <div className="soft-card p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar size={18} weight="duotone" className="text-indigo-500" />
                  <h3 className="font-extrabold text-slate-900 dark:text-white">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </h3>
                </div>

                {selectedDateQuizzes.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDateQuizzes.map((quiz, i) => {
                      const cfg = statusConfig[quiz.status] || statusConfig.ended;
                      const isExpanded = selectedQuiz === quiz.id;
                      return (
                        <button
                          key={quiz.id}
                          onClick={() => setSelectedQuiz(isExpanded ? null : quiz.id)}
                          className={`w-full text-left p-4 rounded-2xl border transition-all ${
                            isExpanded ? `${cfg.bg} ${cfg.border} border` : 'bg-slate-50 dark:bg-slate-800/50 border-transparent hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`}></div>
                            <h4 className="font-bold text-sm text-slate-900 truncate flex-1">{quiz.title}</h4>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ${cfg.badge}`}>
                              {cfg.label}
                            </span>
                          </div>

                          {quiz.subject && (
                            <p className="text-xs font-medium text-slate-400 ml-4 mb-1">{quiz.subject}</p>
                          )}

                          {isExpanded && (
                            <div className="mt-3 ml-4 space-y-2" style={{animation: 'fadeInUp 0.15s ease'}}>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                  <Clock size={13} weight="duotone" />
                                  <span className="font-medium">{quiz.duration_mins || '–'} min</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                  <Users size={13} weight="duotone" />
                                  <span className="font-medium">{(quiz.attempt_count || 0) + (quiz.active_count || 0)} students</span>
                                </div>
                                {quiz.avg_score > 0 && (
                                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                    <Fire size={13} weight="duotone" />
                                    <span className="font-medium">{quiz.avg_score}% avg</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex gap-2 pt-2">
                                {quiz.status === 'active' && (
                                  <button onClick={(e) => { e.stopPropagation(); navigate('live-monitor', quiz); }}
                                    className="text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                                    <Eye size={12} weight="bold" /> Monitor
                                  </button>
                                )}
                                {(quiz.status === 'draft' || quiz.status === 'scheduled') && (
                                  <button onClick={(e) => { e.stopPropagation(); navigate('quiz-builder', quiz); }}
                                    className="text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                                    <PencilLine size={12} weight="bold" /> Edit
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Clipboard size={24} weight="duotone" className="text-slate-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-400">No quizzes on this day</p>
                    <button onClick={() => navigate('quiz-builder')}
                      className="text-xs font-bold text-indigo-500 mt-2 hover:text-indigo-600 transition-colors">
                      + Create one
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="soft-card p-8 sm:p-10 text-center">
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Calendar size={32} weight="duotone" className="text-indigo-400" />
                </div>
                <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-1">Select a date</h3>
                <p className="text-sm text-slate-400">Click any day on the calendar to see quizzes scheduled for that date.</p>
              </div>
            )}

            {/* Upcoming Quizzes List */}
            {quizzes.filter(q => q.status === 'active' || q.status === 'scheduled').length > 0 && (
              <div className="soft-card p-5 sm:p-6 mt-4">
                <h3 className="font-extrabold text-slate-900 mb-3 flex items-center gap-2">
                  <Fire size={16} weight="fill" className="text-amber-500" />
                  Upcoming & Active
                </h3>
                <div className="space-y-2">
                  {quizzes
                    .filter(q => q.status === 'active' || q.status === 'scheduled')
                    .slice(0, 5)
                    .map(q => {
                      const cfg = statusConfig[q.status] || statusConfig.active;
                      const date = q.created_at ? new Date(q.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                      return (
                        <div key={q.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:bg-slate-800/50 transition-colors">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`}></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{q.title}</p>
                            <p className="text-xs text-slate-400">{date}{q.subject ? ` • ${q.subject}` : ''}</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default QuizCalendar;
