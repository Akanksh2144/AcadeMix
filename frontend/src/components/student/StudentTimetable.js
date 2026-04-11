import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, BookOpen } from '@phosphor-icons/react';
import { timetableAPI } from '../../services/api';
import Lottie from 'lottie-react';
import { searchEmptyAnimation } from '../../assets/lottieAnimations';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_LABELS = { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday' };

const SUBJECT_COLORS = [
  'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30',
  'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30',
  'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30',
  'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30',
  'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30',
  'bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/30',
  'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30',
  'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/30',
];

const SUBJECT_TEXT_COLORS = [
  'text-indigo-700 dark:text-indigo-300',
  'text-emerald-700 dark:text-emerald-300',
  'text-amber-700 dark:text-amber-300',
  'text-rose-700 dark:text-rose-300',
  'text-purple-700 dark:text-purple-300',
  'text-teal-700 dark:text-teal-300',
  'text-orange-700 dark:text-orange-300',
  'text-cyan-700 dark:text-cyan-300',
];

const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };
const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };

const StudentTimetable = () => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await timetableAPI.getStudentTimetable();
        setSlots(data);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  // Build subject -> color index map
  const subjectColorMap = useMemo(() => {
    const subjects = [...new Set(slots.map(s => s.subject_code).filter(Boolean))];
    const map = {};
    subjects.forEach((s, i) => { map[s] = i % SUBJECT_COLORS.length; });
    return map;
  }, [slots]);

  // Build grid data: { day -> { period_no -> slot } }
  const grid = useMemo(() => {
    const g = {};
    DAYS.forEach(d => { g[d] = {}; });
    slots.forEach(s => {
      if (g[s.day]) g[s.day][s.period_no] = s;
    });
    return g;
  }, [slots]);

  const periods = useMemo(() => {
    const nums = [...new Set(slots.map(s => s.period_no))].sort((a, b) => a - b);
    return nums.length > 0 ? nums : [1, 2, 3, 4, 5, 6, 7, 8];
  }, [slots]);

  const todayDay = DAYS[new Date().getDay() - 1] || '';

  if (loading) {
    return (
      <div className="soft-card p-6 animate-pulse">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-6"></div>
        <div className="grid grid-cols-7 gap-2">{Array.from({ length: 42 }).map((_, i) => (
          <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
        ))}</div>
      </div>
    );
  }

  if (slots.length === 0) {
    const emptyPeriods = [1, 2, 3, 4, 5, 6];
    return (
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
        {/* Desktop empty grid */}
        <motion.div variants={itemVariants} className="soft-card p-4 sm:p-5 overflow-x-auto hidden md:block relative">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr>
                <th className="text-left text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 py-3 px-2 w-20">Day</th>
                {emptyPeriods.map(p => (
                  <th key={p} className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 py-3 px-1">P{p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map(day => (
                <tr key={day}>
                  <td className="py-1.5 px-2">
                    <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500">{DAY_LABELS[day]?.slice(0, 3)}</span>
                  </td>
                  {emptyPeriods.map(p => (
                    <td key={p} className="py-1.5 px-1">
                      <div className="h-16 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-dashed border-slate-200 dark:border-slate-700/50" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {/* Overlay message */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 dark:bg-[#0B0F19]/60 backdrop-blur-[1px] rounded-2xl">
            <Calendar size={36} weight="duotone" className="text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No timetable configured yet</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Your HOD will set this up for your class</p>
          </div>
        </motion.div>

        {/* Mobile empty state */}
        <motion.div variants={itemVariants} className="md:hidden soft-card p-8 text-center">
          <Calendar size={36} weight="duotone" className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No timetable configured yet</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Your HOD will set this up for your class</p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
      {/* Desktop Grid */}
      <motion.div variants={itemVariants} className="soft-card p-4 sm:p-5 overflow-x-auto hidden md:block">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr>
              <th className="text-left text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 py-3 px-2 w-20">Day</th>
              {periods.map(p => (
                <th key={p} className="text-center text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 py-3 px-1">P{p}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map(day => (
              <tr key={day} className={day === todayDay ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : ''}>
                <td className="py-1.5 px-2">
                  <span className={`text-xs font-extrabold ${day === todayDay ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {DAY_LABELS[day]?.slice(0, 3)}
                  </span>
                </td>
                {periods.map(p => {
                  const slot = grid[day]?.[p];
                  if (!slot || !slot.subject_code) {
                    return <td key={p} className="py-1.5 px-1"><div className="h-16 rounded-xl bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-slate-700"></div></td>;
                  }

                  const colorIdx = subjectColorMap[slot.subject_code] || 0;

                  return (
                    <td key={p} className="py-1.5 px-1">
                      <div className={`h-16 rounded-xl p-2 border flex flex-col justify-center ${SUBJECT_COLORS[colorIdx]}`}>
                        <p className={`text-xs font-extrabold truncate ${SUBJECT_TEXT_COLORS[colorIdx]}`}>{slot.subject_name || slot.subject_code}</p>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate mt-0.5">{slot.faculty_name || '—'}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">{slot.start_time}–{slot.end_time}</p>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {/* Mobile Day-by-Day */}
      <div className="md:hidden space-y-3">
        {DAYS.map(day => {
          const daySlots = periods.map(p => grid[day]?.[p]).filter(Boolean);
          if (daySlots.length === 0) return null;
          const isToday = day === todayDay;

          return (
            <motion.div key={day} variants={itemVariants} className={`soft-card p-4 ${isToday ? 'ring-2 ring-indigo-400 ring-offset-1 dark:ring-offset-[#0B0F19]' : ''}`}>
              <h4 className={`text-sm font-extrabold mb-3 ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>
                {DAY_LABELS[day]} {isToday && <span className="text-xs font-bold text-indigo-400 ml-1">(Today)</span>}
              </h4>
              <div className="space-y-2">
                {daySlots.map((slot, i) => {
                  const colorIdx = subjectColorMap[slot.subject_code] || 0;
                  return (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${SUBJECT_COLORS[colorIdx]}`}>
                      <div className="w-8 h-8 rounded-lg bg-white/60 dark:bg-black/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300">P{slot.period_no}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${SUBJECT_TEXT_COLORS[colorIdx]}`}>{slot.subject_name || slot.subject_code}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{slot.start_time}–{slot.end_time} • {slot.faculty_name || '—'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default StudentTimetable;
