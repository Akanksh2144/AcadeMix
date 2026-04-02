import React, { useState, useEffect } from 'react';
import { WarningOctagon, Student, SlidersHorizontal, CaretDown, CaretUp } from '@phosphor-icons/react';
import { hodToolsAPI } from '../../services/api';

export default function AtRiskAlerts({ user }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(5.0);
  const [showSettings, setShowSettings] = useState(false);
  const [sortField, setSortField] = useState('cgpa');
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await hodToolsAPI.atRiskStudents(threshold);
        setStudents(res.data);
      } catch (err) {
        console.error('Failed to fetch at-risk students:', err);
      }
      setLoading(false);
    };
    fetch();
  }, [threshold]);

  const sorted = [...students].sort((a, b) => {
    const mul = sortAsc ? 1 : -1;
    if (sortField === 'cgpa') return (a.cgpa - b.cgpa) * mul;
    if (sortField === 'backlogs') return (a.backlogs - b.backlogs) * mul;
    if (sortField === 'name') return a.name.localeCompare(b.name) * mul;
    return 0;
  });

  const criticalCount = students.filter(s => s.severity === 'critical').length;
  const warningCount = students.filter(s => s.severity === 'warning').length;

  const handleSort = (field) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortAsc ? <CaretUp size={12} weight="bold" /> : <CaretDown size={12} weight="bold" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h4 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <WarningOctagon size={24} weight="duotone" className="text-red-500" />
            At-Risk Student Alerts
          </h4>
          <p className="text-sm text-slate-500 mt-1">Students flagged for low CGPA or multiple backlogs</p>
        </div>
        <button onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all">
          <SlidersHorizontal size={16} /> Settings
        </button>
      </div>

      {/* Settings */}
      {showSettings && (
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
          <h5 className="font-bold text-slate-700 text-sm">Alert Thresholds</h5>
          <div className="flex items-center gap-4">
            <label className="text-sm text-slate-600">CGPA below:</label>
            <input type="range" min="3" max="8" step="0.5" value={threshold}
              onChange={e => setThreshold(parseFloat(e.target.value))}
              className="flex-1 accent-indigo-600" />
            <span className="text-lg font-bold text-indigo-600 min-w-[48px] text-center">{threshold}</span>
          </div>
          <p className="text-xs text-slate-400">
            Students with CGPA &lt; {threshold} OR with 2+ backlogs will be flagged. 
            Severity = <strong className="text-red-500">Critical</strong> if CGPA &lt; {(threshold - 1.5).toFixed(1)} or 4+ backlogs.
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
          <div className="text-3xl font-black text-red-600">{criticalCount}</div>
          <div className="text-xs font-semibold text-red-500 uppercase mt-1">Critical</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
          <div className="text-3xl font-black text-amber-600">{warningCount}</div>
          <div className="text-xs font-semibold text-amber-500 uppercase mt-1">Warning</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
          <div className="text-3xl font-black text-slate-600">{students.length}</div>
          <div className="text-xs font-semibold text-slate-500 uppercase mt-1">Total Flagged</div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Scanning student records...</div>
      ) : students.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Student size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-emerald-600">No At-Risk Students Found 🎉</p>
          <p className="text-sm mt-1">All students are above the CGPA threshold of {threshold}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-3 text-left text-xs font-semibold text-slate-500 uppercase">Severity</th>
                <th className="p-3 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:text-indigo-600"
                  onClick={() => handleSort('name')}>
                  <span className="flex items-center gap-1">Student <SortIcon field="name" /></span>
                </th>
                <th className="p-3 text-left text-xs font-semibold text-slate-500 uppercase">College ID</th>
                <th className="p-3 text-left text-xs font-semibold text-slate-500 uppercase">Section</th>
                <th className="p-3 text-center text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:text-indigo-600"
                  onClick={() => handleSort('cgpa')}>
                  <span className="flex items-center justify-center gap-1">CGPA <SortIcon field="cgpa" /></span>
                </th>
                <th className="p-3 text-center text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:text-indigo-600"
                  onClick={() => handleSort('backlogs')}>
                  <span className="flex items-center justify-center gap-1">Backlogs <SortIcon field="backlogs" /></span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((student, idx) => (
                <tr key={student.id} className={`border-t border-slate-100 hover:bg-slate-50/50 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                  <td className="p-3">
                    {student.severity === 'critical' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                        <WarningOctagon size={12} weight="fill" /> Critical
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                        <WarningOctagon size={12} /> Warning
                      </span>
                    )}
                  </td>
                  <td className="p-3 font-semibold text-sm text-slate-700">{student.name}</td>
                  <td className="p-3 text-sm text-indigo-600 font-mono">{student.college_id}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold">{student.section}</span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`text-sm font-bold ${student.cgpa < (threshold - 1.5) ? 'text-red-600' : 'text-amber-600'}`}>
                      {student.cgpa}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${student.backlogs >= 4 ? 'bg-red-100 text-red-700' : student.backlogs >= 2 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                      {student.backlogs}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
