import React from 'react';
import { ArrowLeft, Trophy, Fire, Target, Medal } from '@phosphor-icons/react';

const Leaderboard = ({ navigate, user, userRole }) => {
  const leaderboardData = [
    { rank: 1, name: 'Priya Sharma', rollNo: 'S2024101', avgScore: 94.5, quizzesTaken: 28, cgpa: 9.2, badge: 'gold' },
    { rank: 2, name: 'Amit Patel', rollNo: 'S2024045', avgScore: 92.8, quizzesTaken: 27, cgpa: 9.0, badge: 'gold' },
    { rank: 3, name: 'Sneha Reddy', rollNo: 'S2024089', avgScore: 91.2, quizzesTaken: 26, cgpa: 8.9, badge: 'gold' },
    { rank: 4, name: 'Rahul Kumar', rollNo: 'S2024034', avgScore: 89.7, quizzesTaken: 25, cgpa: 8.8, badge: 'silver' },
    { rank: 5, name: 'Ananya Singh', rollNo: 'S2024067', avgScore: 88.9, quizzesTaken: 28, cgpa: 8.7, badge: 'silver' },
    { rank: 6, name: 'Vikram Mehta', rollNo: 'S2024123', avgScore: 87.5, quizzesTaken: 24, cgpa: 8.6, badge: 'silver' },
    { rank: 7, name: 'Divya Iyer', rollNo: 'S2024078', avgScore: 86.8, quizzesTaken: 27, cgpa: 8.5, badge: 'bronze' },
    { rank: 8, name: 'Karan Malhotra', rollNo: 'S2024112', avgScore: 86.2, quizzesTaken: 26, cgpa: 8.5, badge: 'bronze' },
    { rank: 9, name: 'Pooja Gupta', rollNo: 'S2024056', avgScore: 85.9, quizzesTaken: 25, cgpa: 8.4, badge: 'bronze' },
    { rank: 10, name: 'Arjun Nair', rollNo: 'S2024091', avgScore: 85.3, quizzesTaken: 27, cgpa: 8.4, badge: 'bronze' },
    { rank: 11, name: 'Neha Desai', rollNo: 'S2024043', avgScore: 84.7, quizzesTaken: 24, cgpa: 8.3 },
    { rank: 12, name: 'Rajesh Kumar', rollNo: 'S2024001', avgScore: 84.2, quizzesTaken: 24, cgpa: 8.5, highlight: true },
  ];

  const getBadgeStyle = (badge) => {
    if (badge === 'gold') return { icon: Trophy, bg: 'bg-amber-50', text: 'text-amber-500' };
    if (badge === 'silver') return { icon: Medal, bg: 'bg-slate-100', text: 'text-slate-500' };
    if (badge === 'bronze') return { icon: Target, bg: 'bg-orange-50', text: 'text-orange-500' };
    return null;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="glass-header">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button data-testid="back-button" onClick={() => navigate((userRole || user?.role) === 'student' ? 'student-dashboard' : (userRole || user?.role) === 'hod' ? 'hod-dashboard' : (userRole || user?.role) === 'exam_cell' ? 'examcell-dashboard' : (userRole || user?.role) === 'admin' ? 'admin-dashboard' : 'teacher-dashboard')}
              className="p-2.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-500 transition-colors" aria-label="Go back">
              <ArrowLeft size={22} weight="duotone" />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Leaderboard</h1>
              <p className="text-sm font-medium text-slate-400">Top performers this semester</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Top 3 Podium */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Rank 2 */}
          <div className="soft-card-hover p-6 bg-gradient-to-br from-slate-50 to-white" data-testid="podium-rank-2">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                <Medal size={36} weight="duotone" className="text-slate-500" />
              </div>
            </div>
            <div className="text-center">
              <span className="soft-badge bg-slate-100 text-slate-600 mb-2">#2</span>
              <h3 className="text-xl font-extrabold text-slate-900 mt-2">{leaderboardData[1].name}</h3>
              <p className="text-sm font-medium text-slate-400 mb-4">{leaderboardData[1].rollNo}</p>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-2xl font-extrabold text-slate-900">{leaderboardData[1].avgScore}%</p><p className="text-xs font-bold text-slate-400 uppercase">Score</p></div>
                <div><p className="text-2xl font-extrabold text-slate-900">{leaderboardData[1].cgpa}</p><p className="text-xs font-bold text-slate-400 uppercase">CGPA</p></div>
              </div>
            </div>
          </div>

          {/* Rank 1 */}
          <div className="soft-card-hover p-8 bg-gradient-to-br from-amber-50 via-amber-50 to-orange-50 md:-translate-y-4" data-testid="podium-rank-1">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center">
                <Trophy size={48} weight="duotone" className="text-amber-500" />
              </div>
            </div>
            <div className="text-center">
              <span className="soft-badge bg-amber-100 text-amber-700 mb-2 text-sm px-4">#1 CHAMPION</span>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-3">{leaderboardData[0].name}</h3>
              <p className="text-sm font-medium text-slate-400 mb-4">{leaderboardData[0].rollNo}</p>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-3xl font-extrabold text-slate-900">{leaderboardData[0].avgScore}%</p><p className="text-xs font-bold text-slate-400 uppercase">Score</p></div>
                <div><p className="text-3xl font-extrabold text-slate-900">{leaderboardData[0].cgpa}</p><p className="text-xs font-bold text-slate-400 uppercase">CGPA</p></div>
              </div>
            </div>
          </div>

          {/* Rank 3 */}
          <div className="soft-card-hover p-6 bg-gradient-to-br from-orange-50 to-white" data-testid="podium-rank-3">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center">
                <Target size={36} weight="duotone" className="text-orange-500" />
              </div>
            </div>
            <div className="text-center">
              <span className="soft-badge bg-orange-50 text-orange-600 mb-2">#3</span>
              <h3 className="text-xl font-extrabold text-slate-900 mt-2">{leaderboardData[2].name}</h3>
              <p className="text-sm font-medium text-slate-400 mb-4">{leaderboardData[2].rollNo}</p>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-2xl font-extrabold text-slate-900">{leaderboardData[2].avgScore}%</p><p className="text-xs font-bold text-slate-400 uppercase">Score</p></div>
                <div><p className="text-2xl font-extrabold text-slate-900">{leaderboardData[2].cgpa}</p><p className="text-xs font-bold text-slate-400 uppercase">CGPA</p></div>
              </div>
            </div>
          </div>
        </div>

        {/* Full Table */}
        <div className="soft-card p-6">
          <h3 className="text-2xl font-bold text-slate-800 mb-6">Complete Rankings</h3>
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="leaderboard-table">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Rank</th>
                  <th className="text-left p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Student</th>
                  <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Avg Score</th>
                  <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Quizzes</th>
                  <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-slate-400">CGPA</th>
                  <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Badge</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardData.map((student) => {
                  const badgeInfo = getBadgeStyle(student.badge);
                  return (
                    <tr key={student.rollNo}
                      className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${student.highlight ? 'bg-indigo-50/50' : ''}`}
                      data-testid={`leaderboard-row-${student.rank}`}>
                      <td className="text-center p-4"><span className="text-xl font-extrabold text-slate-900">{student.rank}</span></td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {student.rank <= 3 && <Fire size={20} weight="duotone" className="text-amber-500" />}
                          <div>
                            <p className="font-bold text-slate-800">{student.name}</p>
                            <p className="text-sm font-medium text-slate-400">{student.rollNo}</p>
                          </div>
                          {student.highlight && <span className="soft-badge bg-indigo-100 text-indigo-600 text-xs">YOU</span>}
                        </div>
                      </td>
                      <td className="text-center p-4"><p className="text-lg font-extrabold text-slate-900">{student.avgScore}%</p></td>
                      <td className="text-center p-4"><p className="font-bold text-slate-600">{student.quizzesTaken}</p></td>
                      <td className="text-center p-4"><p className="text-lg font-extrabold text-slate-900">{student.cgpa}</p></td>
                      <td className="text-center p-4">
                        {badgeInfo && (
                          <div className="flex justify-center">
                            <div className={`${badgeInfo.bg} ${badgeInfo.text} p-2 rounded-xl`}><badgeInfo.icon size={18} weight="duotone" /></div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
