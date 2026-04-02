import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Trash, Plus, X, BookOpen, User } from '@phosphor-icons/react';
import { timetableAPI, facultyAPI } from '../../services/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIODS = [
  { num: 1, time: '9:00 – 9:50', session: 'morning' },
  { num: 2, time: '9:50 – 10:40', session: 'morning' },
  { num: 3, time: '10:50 – 11:40', session: 'morning' },
  { num: 4, time: '11:40 – 12:30', session: 'morning' },
  { num: 5, time: '1:30 – 2:20', session: 'afternoon' },
  { num: 6, time: '2:20 – 3:10', session: 'afternoon' },
];

const SECTIONS = ['ECE', 'IT-1', 'IT-2', 'CSC', 'AIML-1', 'AIML-2', 'AIML-3', 'DS-1', 'DS-2'];

const SLOT_COLORS = [
  'bg-indigo-100 text-indigo-800 border-indigo-200',
  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-rose-100 text-rose-800 border-rose-200',
  'bg-violet-100 text-violet-800 border-violet-200',
  'bg-cyan-100 text-cyan-800 border-cyan-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-teal-100 text-teal-800 border-teal-200',
];

export default function TimetableManager({ user, mockSubjects = [] }) {
  const [section, setSection] = useState('DS');
  const [semester, setSemester] = useState(3);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showSlotForm, setShowSlotForm] = useState(null); // { day, period }
  const [teachers, setTeachers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [slotForm, setSlotForm] = useState({ subject_code: '', subject_name: '', teacher_id: '', teacher_name: '' });

  const subjectColorMap = {};
  let colorIdx = 0;

  const getSubjectColor = (code) => {
    if (!subjectColorMap[code]) {
      subjectColorMap[code] = SLOT_COLORS[colorIdx % SLOT_COLORS.length];
      colorIdx++;
    }
    return subjectColorMap[code];
  };

  const fetchTimetable = useCallback(async () => {
    setLoading(true);
    try {
      const res = await timetableAPI.get(section, semester);
      setSlots(res.data);
    } catch (err) {
      console.error('Failed to fetch timetable:', err);
    }
    setLoading(false);
  }, [section, semester]);

  useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);

  useEffect(() => {
    const load = async () => {
      try {
        const [t, a] = await Promise.all([facultyAPI.teachers(), facultyAPI.assignments()]);
        setTeachers(t.data);
        setAssignments(a.data);
      } catch (e) { console.error(e); }
    };
    load();
  }, []);

  const getSlot = (day, period) => slots.find(s => s.day === day && s.period === period);

  const handleSaveSlot = async () => {
    if (!slotForm.subject_code || !slotForm.teacher_id) return;
    try {
      await timetableAPI.save({
        section, day: showSlotForm.day, period: showSlotForm.period,
        ...slotForm, semester,
      });
      setShowSlotForm(null);
      setSlotForm({ subject_code: '', subject_name: '', teacher_id: '', teacher_name: '' });
      fetchTimetable();
    } catch (err) {
      alert('Failed to save slot: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteSlot = async (slotId) => {
    try {
      await timetableAPI.delete(slotId);
      fetchTimetable();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubjectSelect = (subj) => {
    setSlotForm(f => ({ ...f, subject_code: subj.code, subject_name: subj.name }));
  };

  const handleTeacherSelect = (t) => {
    setSlotForm(f => ({ ...f, teacher_id: t.id, teacher_name: t.name }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h4 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar size={24} weight="duotone" className="text-indigo-500" />
            Timetable Manager
          </h4>
          <p className="text-sm text-slate-500 mt-1">View and manage weekly class schedules</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={section} onChange={e => setSection(e.target.value)} className="soft-input text-sm">
            {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={semester} onChange={e => setSemester(Number(e.target.value))} className="soft-input text-sm">
            {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Sem {s}</option>)}
          </select>
          <button onClick={() => setEditMode(!editMode)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${editMode ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}>
            {editMode ? 'Done Editing' : 'Edit Timetable'}
          </button>
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-gradient-to-r from-slate-50 to-slate-100">
              <th className="p-3 text-xs font-semibold text-slate-500 uppercase border-b border-r border-slate-200 w-[100px]">
                Period
              </th>
              {DAYS.map(day => (
                <th key={day} className="p-3 text-xs font-semibold text-slate-600 uppercase border-b border-r border-slate-200 text-center">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((period, pidx) => (
              <React.Fragment key={period.num}>
                {pidx === 4 && (
                  <tr>
                    <td colSpan={7} className="bg-gradient-to-r from-amber-50 to-orange-50 text-center py-2 text-xs font-bold text-amber-700 uppercase tracking-widest border-b border-slate-200">
                      🍽️ Lunch Break (12:30 – 1:30)
                    </td>
                  </tr>
                )}
                <tr className={period.session === 'afternoon' ? 'bg-slate-50/50' : ''}>
                  <td className="p-2 border-r border-b border-slate-200 text-center">
                    <div className="text-sm font-bold text-slate-700">P{period.num}</div>
                    <div className="text-[10px] text-slate-400">{period.time}</div>
                  </td>
                  {DAYS.map(day => {
                    const slot = getSlot(day, period.num);
                    return (
                      <td key={day} className="p-1.5 border-r border-b border-slate-200 min-h-[80px] h-[80px] relative">
                        {slot ? (
                          <div className={`p-2 rounded-xl border h-full flex flex-col justify-between ${getSubjectColor(slot.subject_code)} transition-all hover:shadow-md group`}>
                            <div>
                              <div className="text-xs font-bold truncate">{slot.subject_name}</div>
                              <div className="text-[10px] opacity-70 truncate">{slot.subject_code}</div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] opacity-60 flex items-center gap-1 truncate">
                                <User size={10} />{slot.teacher_name}
                              </span>
                              {editMode && (
                                <button onClick={() => handleDeleteSlot(slot.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-200 rounded transition-all">
                                  <Trash size={12} className="text-red-600" />
                                </button>
                              )}
                            </div>
                          </div>
                        ) : editMode ? (
                          <button onClick={() => { setShowSlotForm({ day, period: period.num }); setSlotForm({ subject_code: '', subject_name: '', teacher_id: '', teacher_name: '' }); }}
                            className="w-full h-full rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 flex items-center justify-center transition-all group">
                            <Plus size={16} className="text-slate-300 group-hover:text-indigo-500" />
                          </button>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-slate-200 text-xs">—</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Slot Assignment Modal */}
      {showSlotForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSlotForm(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-slate-800">
                Assign Slot — {showSlotForm.day} P{showSlotForm.period}
              </h4>
              <button onClick={() => setShowSlotForm(null)} className="p-2 hover:bg-slate-100 rounded-xl"><X size={20} /></button>
            </div>

            {/* Subject Selection */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">Subject</label>
              <div className="max-h-36 overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-2">
                {mockSubjects.map(subj => (
                  <button key={subj.code} onClick={() => handleSubjectSelect(subj)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${slotForm.subject_code === subj.code ? 'bg-indigo-100 text-indigo-800 font-semibold' : 'hover:bg-slate-50 text-slate-700'}`}>
                    <div className="flex items-center gap-2">
                      <BookOpen size={14} className="flex-shrink-0" />
                      <span className="truncate">{subj.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 ml-5">{subj.code}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Teacher Selection */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">Teacher</label>
              <div className="max-h-36 overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-2">
                {teachers.map(t => (
                  <button key={t.id} onClick={() => handleTeacherSelect(t)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${slotForm.teacher_id === t.id ? 'bg-indigo-100 text-indigo-800 font-semibold' : 'hover:bg-slate-50 text-slate-700'}`}>
                    <div className="flex items-center gap-2">
                      <User size={14} className="flex-shrink-0" />
                      <span>{t.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleSaveSlot}
              disabled={!slotForm.subject_code || !slotForm.teacher_id}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              Assign to Timetable
            </button>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="flex items-center gap-6 text-sm text-slate-500 bg-slate-50 rounded-2xl p-4">
        <span><strong className="text-slate-700">{slots.length}</strong> slots assigned</span>
        <span><strong className="text-slate-700">{DAYS.length * PERIODS.length - slots.length}</strong> free periods</span>
        <span>Section: <strong className="text-indigo-600">{section}</strong></span>
      </div>
    </div>
  );
}
