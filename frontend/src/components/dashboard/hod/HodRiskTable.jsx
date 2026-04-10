import React from 'react';
import { useHodAtRiskStudents } from '../../../hooks/queries/useHodQueries';
import { ShieldAlert, TrendingDown, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HodRiskTable({ onActionSelect }) {
  const { data: students, isLoading, isError } = useHodAtRiskStudents(5.0);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm h-64 animate-pulse">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-md mb-6"></div>
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800/50 rounded-lg"></div>)}
        </div>
      </div>
    );
  }

  if (isError) {
    return null;
  }

  return (
    <div className="bg-white/80 dark:bg-[#0f1423]/80 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-slate-800/60 p-8 shadow-xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-red-500" />
            Intervention Required
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Students below 5.0 CGPA or with multiple arrears</p>
        </div>
      </div>

      {!students || students.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800/20 border border-dashed border-slate-200 dark:border-slate-700">
          <ShieldAlert className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">All Clear</h3>
          <p className="text-sm text-slate-500 mt-1">No students are currently flagged as at-risk.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold bg-slate-50/50 dark:bg-slate-900/30">
                <th className="p-4 rounded-tl-xl text-left">Student</th>
                <th className="p-4 text-center">Batch/Sec</th>
                <th className="p-4 text-center">CGPA</th>
                <th className="p-4 text-center">Arrears</th>
                <th className="p-4 text-right rounded-tr-xl">Action</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, idx) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={student.id} 
                  className="group border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/40 dark:to-orange-900/40 flex items-center justify-center text-red-600 dark:text-red-400 font-bold border border-red-200 dark:border-red-800/50">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-200">{student.name}</p>
                        <p className="text-xs text-slate-500 font-medium">{student.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {student.profile_data?.batch || 'N/A'} - {student.profile_data?.section || 'N/A'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1 text-red-600 dark:text-red-400 font-bold">
                      <TrendingDown className="w-4 h-4 opacity-70" />
                      {student.cgpa || "N/A"}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center justify-center h-7 px-3 rounded-full text-xs font-bold bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                      {student.arrear_count} Arrears
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => onActionSelect && onActionSelect(student)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all shadow-sm"
                    >
                      Summon
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
