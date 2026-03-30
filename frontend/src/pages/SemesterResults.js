import React, { useState } from 'react';
import { ArrowLeft, Download, TrendUp, TrendDown } from '@phosphor-icons/react';

const SemesterResults = ({ navigate, userRole }) => {
  const [selectedSemester, setSelectedSemester] = useState(3);

  const semesterData = {
    3: {
      subjects: [
        { code: 'CS301', name: 'Database Management Systems', marks: 85, maxMarks: 100, grade: 'A+', attendance: 92 },
        { code: 'CS302', name: 'Operating Systems', marks: 78, maxMarks: 100, grade: 'A', attendance: 88 },
        { code: 'CS303', name: 'Computer Networks', marks: 82, maxMarks: 100, grade: 'A', attendance: 90 },
        { code: 'CS304', name: 'Software Engineering', marks: 88, maxMarks: 100, grade: 'A+', attendance: 95 },
        { code: 'MA301', name: 'Discrete Mathematics', marks: 75, maxMarks: 100, grade: 'B+', attendance: 85 },
      ],
      sgpa: 8.7,
      cgpa: 8.5,
      rank: 12,
      totalStudents: 120,
      status: 'Pass'
    }
  };

  const cgpaHistory = [
    { sem: 1, cgpa: 8.2 },
    { sem: 2, cgpa: 8.4 },
    { sem: 3, cgpa: 8.5 },
  ];

  const currentSem = semesterData[selectedSemester];
  const totalMarks = currentSem.subjects.reduce((sum, s) => sum + s.marks, 0);
  const maxTotalMarks = currentSem.subjects.reduce((sum, s) => sum + s.maxMarks, 0);
  const percentage = ((totalMarks / maxTotalMarks) * 100).toFixed(2);

  const getGradeColor = (grade) => {
    if (grade.startsWith('A')) return 'bg-[#A1E3D8]';
    if (grade.startsWith('B')) return 'bg-[#FDF5A9]';
    return 'bg-[#FF9EC6]';
  };

  return (
    <div className="min-h-screen bg-[#FDFCF8]">
      {/* Header */}
      <header className="bg-[#FDFCF8] border-b-2 border-[#0A0A0A] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                data-testid="back-button"
                onClick={() => navigate(userRole === 'student' ? 'student-dashboard' : 'teacher-dashboard')}
                className="neo-button p-2 bg-white"
              >
                <ArrowLeft size={24} weight="bold" />
              </button>
              <div>
                <h1 className="text-3xl font-black tracking-tighter">Semester Results</h1>
                <p className="text-sm font-medium text-[#0A0A0A]/60">Academic performance & grades</p>
              </div>
            </div>
            <button
              data-testid="download-report-button"
              className="neo-button px-4 py-2 bg-[#FF9EC6] flex items-center gap-2"
            >
              <Download size={20} weight="bold" />
              Download Report
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Semester Selector */}
        <div className="mb-8">
          <label className="block text-xs tracking-[0.2em] uppercase font-bold mb-3">Select Semester</label>
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
              <button
                key={sem}
                data-testid={`semester-${sem}-button`}
                onClick={() => setSelectedSemester(sem)}
                disabled={sem > 3}
                className={`px-6 py-3 border-2 border-[#0A0A0A] font-bold transition-all ${
                  selectedSemester === sem
                    ? 'bg-[#FF9EC6] shadow-[4px_4px_0px_0px_#0A0A0A]'
                    : sem <= 3
                    ? 'bg-white hover:bg-[#F0EFEB]'
                    : 'bg-[#F0EFEB] opacity-50 cursor-not-allowed'
                }`}
              >
                Sem {sem}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="neo-card p-6" data-testid="sgpa-card">
            <span className="text-xs tracking-[0.2em] uppercase font-bold text-[#0A0A0A]/60 block mb-2">SGPA</span>
            <p className="text-4xl font-black">{currentSem.sgpa}</p>
          </div>
          <div className="neo-card p-6" data-testid="cgpa-card">
            <span className="text-xs tracking-[0.2em] uppercase font-bold text-[#0A0A0A]/60 block mb-2">CGPA</span>
            <div className="flex items-center gap-2">
              <p className="text-4xl font-black">{currentSem.cgpa}</p>
              <TrendUp size={24} weight="bold" className="text-[#A1E3D8]" />
            </div>
          </div>
          <div className="neo-card p-6" data-testid="percentage-card">
            <span className="text-xs tracking-[0.2em] uppercase font-bold text-[#0A0A0A]/60 block mb-2">Percentage</span>
            <p className="text-4xl font-black">{percentage}%</p>
          </div>
          <div className="neo-card p-6" data-testid="rank-card">
            <span className="text-xs tracking-[0.2em] uppercase font-bold text-[#0A0A0A]/60 block mb-2">Rank</span>
            <p className="text-4xl font-black">#{currentSem.rank}</p>
          </div>
          <div className="neo-card p-6" data-testid="status-card">
            <span className="text-xs tracking-[0.2em] uppercase font-bold text-[#0A0A0A]/60 block mb-2">Status</span>
            <span className="neo-badge bg-[#A1E3D8] text-base">{currentSem.status}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Subject-wise Results */}
          <div className="lg:col-span-2">
            <div className="neo-card p-6">
              <h3 className="text-2xl font-bold mb-6">Subject-wise Results</h3>
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="subjects-table">
                  <thead>
                    <tr className="border-b-2 border-[#0A0A0A] bg-[#F0EFEB]">
                      <th className="text-left p-4 text-xs tracking-[0.2em] uppercase font-bold">Subject</th>
                      <th className="text-center p-4 text-xs tracking-[0.2em] uppercase font-bold">Marks</th>
                      <th className="text-center p-4 text-xs tracking-[0.2em] uppercase font-bold">Grade</th>
                      <th className="text-center p-4 text-xs tracking-[0.2em] uppercase font-bold">Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSem.subjects.map((subject, index) => (
                      <tr key={subject.code} className="border-b border-[#0A0A0A]/20" data-testid={`subject-row-${index}`}>
                        <td className="p-4">
                          <div>
                            <p className="font-bold">{subject.name}</p>
                            <p className="text-sm font-medium text-[#0A0A0A]/60">{subject.code}</p>
                          </div>
                        </td>
                        <td className="text-center p-4">
                          <div>
                            <p className="font-bold text-lg">{subject.marks}</p>
                            <p className="text-xs font-medium text-[#0A0A0A]/60">/ {subject.maxMarks}</p>
                          </div>
                        </td>
                        <td className="text-center p-4">
                          <span className={`neo-badge ${getGradeColor(subject.grade)}`}>
                            {subject.grade}
                          </span>
                        </td>
                        <td className="text-center p-4">
                          <p className="font-bold">{subject.attendance}%</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* CGPA Trend */}
            <div className="neo-card p-6">
              <h3 className="text-xl font-bold mb-4">CGPA Progression</h3>
              <div className="space-y-4">
                {cgpaHistory.map((item) => (
                  <div key={item.sem} className="flex items-center justify-between" data-testid={`cgpa-history-sem-${item.sem}`}>
                    <span className="font-bold">Semester {item.sem}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black">{item.cgpa}</span>
                      {item.sem > 1 && item.cgpa > cgpaHistory[item.sem - 2].cgpa && (
                        <TrendUp size={16} weight="bold" className="text-[#A1E3D8]" />
                      )}
                      {item.sem > 1 && item.cgpa < cgpaHistory[item.sem - 2].cgpa && (
                        <TrendDown size={16} weight="bold" className="text-[#FF6B6B]" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Summary */}
            <div className="neo-card p-6 bg-gradient-to-br from-[#A1E3D8] to-[#B4D8E7]">
              <h3 className="text-xl font-bold mb-3">Performance Summary</h3>
              <div className="space-y-2 text-sm font-medium">
                <p>• You scored above 80% in 4 subjects</p>
                <p>• Attendance is excellent in all subjects</p>
                <p>• You're in the top 10% of your batch</p>
                <p>• CGPA improved by 0.1 this semester</p>
              </div>
            </div>

            {/* Grade Distribution */}
            <div className="neo-card p-6">
              <h3 className="text-xl font-bold mb-4">Grade Distribution</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">A+ Grades</span>
                    <span className="font-bold">2</span>
                  </div>
                  <div className="h-2 bg-[#F0EFEB] border-2 border-[#0A0A0A]">
                    <div className="h-full bg-[#A1E3D8] border-r-2 border-[#0A0A0A]" style={{ width: '40%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">A Grades</span>
                    <span className="font-bold">2</span>
                  </div>
                  <div className="h-2 bg-[#F0EFEB] border-2 border-[#0A0A0A]">
                    <div className="h-full bg-[#B4D8E7] border-r-2 border-[#0A0A0A]" style={{ width: '40%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">B+ Grades</span>
                    <span className="font-bold">1</span>
                  </div>
                  <div className="h-2 bg-[#F0EFEB] border-2 border-[#0A0A0A]">
                    <div className="h-full bg-[#FDF5A9] border-r-2 border-[#0A0A0A]" style={{ width: '20%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SemesterResults;