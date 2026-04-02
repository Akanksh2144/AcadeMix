import React from 'react';
import { FileXls, FilePdf, Download } from '@phosphor-icons/react';
import * as XLSX from 'xlsx';

export function exportToExcel(data, filename = 'export') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function ExportButton({ data, filename, label = 'Export Excel', className = '' }) {
  const handleExport = () => {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }
    exportToExcel(data, filename);
  };
  return (
    <button onClick={handleExport}
      className={`flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold hover:bg-emerald-100 transition-all border border-emerald-200 ${className}`}>
      <FileXls size={16} weight="duotone" /> {label}
    </button>
  );
}

export function PrintButton({ label = 'Export PDF', className = '' }) {
  return (
    <button onClick={() => window.print()}
      className={`flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-xl text-xs font-semibold hover:bg-red-100 transition-all border border-red-200 ${className}`}>
      <FilePdf size={16} weight="duotone" /> {label}
    </button>
  );
}

export default function ExportReports({ students = [], assignments = [], submissions = [], compact = false }) {
  const studentData = students.map(s => ({
    'College ID': s.college_id, 'Name': s.name,
    'Department': s.department, 'Section': s.section, 'Batch': s.batch,
  }));

  const assignmentData = assignments.map(a => ({
    'Teacher': a.teacher_name, 'Subject Code': a.subject_code,
    'Subject': a.subject_name, 'Section': a.section,
    'Batch': a.batch, 'Semester': a.semester,
  }));

  const submissionData = submissions.map(s => ({
    'Subject': s.subject_name, 'Teacher': s.teacher_name,
    'Exam': s.exam_type, 'Status': s.status,
    'Students': s.entries?.length || 0, 'Section': s.section,
  }));

  const content = (
    <>
      <div className={compact ? 'space-y-2 p-3' : 'grid grid-cols-1 md:grid-cols-3 gap-4'}>
        <div className={`${compact ? 'flex items-center justify-between p-3 rounded-xl hover:bg-slate-50' : 'bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3'}`}>
          <div>
            <div className="text-sm font-bold text-slate-700">Student List</div>
            <div className="text-xs text-slate-500">{students.length} students</div>
          </div>
          <ExportButton data={studentData} filename="student_list" label={compact ? 'Excel' : 'Download Excel'} />
        </div>
        <div className={`${compact ? 'flex items-center justify-between p-3 rounded-xl hover:bg-slate-50' : 'bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3'}`}>
          <div>
            <div className="text-sm font-bold text-slate-700">Faculty Assignments</div>
            <div className="text-xs text-slate-500">{assignments.length} assignments</div>
          </div>
          <ExportButton data={assignmentData} filename="faculty_assignments" label={compact ? 'Excel' : 'Download Excel'} />
        </div>
        <div className={`${compact ? 'flex items-center justify-between p-3 rounded-xl hover:bg-slate-50' : 'bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3'}`}>
          <div>
            <div className="text-sm font-bold text-slate-700">Marks Submissions</div>
            <div className="text-xs text-slate-500">{submissions.length} submissions</div>
          </div>
          <ExportButton data={submissionData} filename="marks_submissions" label={compact ? 'Excel' : 'Download Excel'} />
        </div>
      </div>
      <div className={`${compact ? 'p-3 pt-1' : 'mt-4'} flex justify-end`}>
        <PrintButton label="Print Dashboard (PDF)" />
      </div>
    </>
  );

  if (compact) return content;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <Download size={22} weight="duotone" className="text-indigo-500" />
        <h4 className="text-lg font-bold text-slate-800">Export Reports</h4>
      </div>
      {content}
    </div>
  );
}
