import React, { useMemo } from 'react';
import { ChartBar, User, BookOpen, Warning } from '@phosphor-icons/react';

const WORKLOAD_COLORS = [
  { threshold: 0, bg: 'bg-slate-100', text: 'text-slate-400', label: 'None' },
  { threshold: 1, bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Light' },
  { threshold: 2, bg: 'bg-amber-100', text: 'text-amber-700', label: 'Moderate' },
  { threshold: 4, bg: 'bg-orange-200', text: 'text-orange-800', label: 'Heavy' },
  { threshold: 6, bg: 'bg-red-200', text: 'text-red-800', label: 'Overloaded' },
];

function getWorkloadStyle(count) {
  let style = WORKLOAD_COLORS[0];
  for (const level of WORKLOAD_COLORS) {
    if (count >= level.threshold) style = level;
  }
  return style;
}

const SECTIONS = ['ECE', 'IT-1', 'IT-2', 'CSC', 'AIML-1', 'AIML-2', 'AIML-3', 'DS-1', 'DS-2'];

export default function WorkloadMatrix({ teachers = [], assignments = [] }) {

  const matrix = useMemo(() => {
    return teachers.map(teacher => {
      const teacherAssignments = assignments.filter(a => a.teacher_id === teacher.id);
      const sectionCounts = {};
      let total = 0;
      SECTIONS.forEach(sec => {
        const count = teacherAssignments.filter(a => a.section === sec).length;
        sectionCounts[sec] = count;
        total += count;
      });
      return {
        ...teacher,
        sectionCounts,
        total,
        subjects: teacherAssignments.map(a => a.subject_name),
      };
    });
  }, [teachers, assignments]);

  const totalBySection = useMemo(() => {
    const totals = {};
    SECTIONS.forEach(sec => {
      totals[sec] = assignments.filter(a => a.section === sec).length;
    });
    return totals;
  }, [assignments]);

  if (!teachers.length) {
    return (
      <div className="text-center py-12 text-slate-400">
        <User size={48} className="mx-auto mb-3 opacity-40" />
        <p>No teachers found in department</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ChartBar size={22} weight="duotone" className="text-indigo-500" />
            Faculty Workload Matrix
          </h4>
          <p className="text-sm text-slate-500 mt-1">Section-wise teaching load distribution</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {WORKLOAD_COLORS.slice(1).map(level => (
            <span key={level.label} className={`px-2 py-1 rounded-full ${level.bg} ${level.text} font-medium`}>
              {level.label}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 rounded-tl-xl">
                Faculty
              </th>
              {SECTIONS.map(sec => (
                <th key={sec} className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 text-center min-w-[64px]">
                  {sec}
                </th>
              ))}
              <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 text-center rounded-tr-xl">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {matrix.map((teacher, idx) => {
              const totalStyle = getWorkloadStyle(teacher.total);
              return (
                <tr key={teacher.id} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-indigo-50/30 transition-colors`}>
                  <td className="p-3">
                    <div className="font-semibold text-slate-700 text-sm">{teacher.name}</div>
                    <div className="text-xs text-slate-400">{teacher.email}</div>
                  </td>
                  {SECTIONS.map(sec => {
                    const count = teacher.sectionCounts[sec];
                    const style = getWorkloadStyle(count);
                    return (
                      <td key={sec} className="p-2 text-center">
                        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-bold text-sm ${style.bg} ${style.text} transition-all hover:scale-110`}
                          title={`${teacher.name}: ${count} subject(s) in ${sec}`}>
                          {count || '—'}
                        </div>
                      </td>
                    );
                  })}
                  <td className="p-2 text-center">
                    <div className={`inline-flex items-center justify-center w-12 h-10 rounded-xl font-bold text-sm ${totalStyle.bg} ${totalStyle.text}`}>
                      {teacher.total}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100">
              <td className="p-3 text-xs font-semibold text-slate-600 uppercase rounded-bl-xl">
                Section Total
              </td>
              {SECTIONS.map(sec => (
                <td key={sec} className="p-3 text-center">
                  <span className="font-bold text-sm text-slate-700">{totalBySection[sec] || 0}</span>
                </td>
              ))}
              <td className="p-3 text-center rounded-br-xl">
                <span className="font-bold text-sm text-indigo-600">{assignments.length}</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Alerts */}
      {matrix.some(t => t.total >= 6) && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <Warning size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700">Overloaded Faculty Detected</p>
            <p className="text-xs text-red-600 mt-1">
              {matrix.filter(t => t.total >= 6).map(t => t.name).join(', ')} {matrix.filter(t => t.total >= 6).length === 1 ? 'has' : 'have'} 6+ subject assignments. Consider redistributing workload.
            </p>
          </div>
        </div>
      )}

      {matrix.some(t => t.total === 0) && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <Warning size={20} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-700">Unassigned Faculty</p>
            <p className="text-xs text-amber-600 mt-1">
              {matrix.filter(t => t.total === 0).map(t => t.name).join(', ')} {matrix.filter(t => t.total === 0).length === 1 ? 'has' : 'have'} no subject assignments.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
