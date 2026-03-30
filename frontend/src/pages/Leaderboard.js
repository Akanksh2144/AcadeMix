import React from 'react';
import { ArrowLeft, Trophy, Fire, Target, Medal } from '@phosphor-icons/react';

const Leaderboard = ({ navigate, userRole }) => {
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

  const getBadgeIcon = (badge) => {
    if (badge === 'gold') return { icon: Trophy, color: 'bg-[#FDF5A9]' };
    if (badge === 'silver') return { icon: Medal, color: 'bg-[#F0EFEB]' };
    if (badge === 'bronze') return { icon: Target, color: 'bg-[#FF9EC6]' };
    return null;
  };

  return (
    <div className="min-h-screen bg-[#FDFCF8]">
      {/* Header */}
      <header className="bg-[#FDFCF8] border-b-2 border-[#0A0A0A] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              data-testid="back-button"
              onClick={() => navigate(userRole === 'student' ? 'student-dashboard' : 'teacher-dashboard')}
              className="neo-button p-2 bg-white"
            >
              <ArrowLeft size={24} weight="bold" />
            </button>
            <div>
              <h1 className="text-3xl font-black tracking-tighter">Leaderboard 🏆</h1>
              <p className="text-sm font-medium text-[#0A0A0A]/60">Top performers this semester</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Top 3 Podium */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Rank 2 */}
          <div className="neo-card-hover p-6 bg-gradient-to-br from-[#F0EFEB] to-white transition-all" data-testid="podium-rank-2">
            <div className="flex justify-center mb-4">
              <div className="neo-card p-4 bg-[#F0EFEB]">
                <Medal size={48} weight="bold" />
              </div>
            </div>
            <div className="text-center">
              <span className="neo-badge bg-[#F0EFEB] mb-2">#2</span>
              <h3 className="text-xl font-black mt-2">{leaderboardData[1].name}</h3>
              <p className="text-sm font-medium text-[#0A0A0A]/60 mb-3">{leaderboardData[1].rollNo}</p>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <p className="text-2xl font-black">{leaderboardData[1].avgScore}%</p>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#0A0A0A]/60">Score</p>
                </div>
                <div>
                  <p className="text-2xl font-black">{leaderboardData[1].cgpa}</p>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#0A0A0A]/60">CGPA</p>
                </div>
              </div>
            </div>
          </div>

          {/* Rank 1 */}
          <div className="neo-card-hover p-8 bg-gradient-to-br from-[#FDF5A9] to-[#FF9EC6] transition-all md:-translate-y-4" data-testid="podium-rank-1">
            <div className="flex justify-center mb-4">
              <div className="neo-card p-6 bg-[#FDF5A9] animate-pulse">
                <Trophy size={64} weight="bold" />
              </div>
            </div>
            <div className="text-center">
              <span className="neo-badge bg-[#FDF5A9] mb-2 text-lg px-4 py-2">#1 CHAMPION</span>
              <h3 className="text-2xl font-black mt-3">{leaderboardData[0].name}</h3>
              <p className="text-sm font-medium text-[#0A0A0A]/60 mb-4">{leaderboardData[0].rollNo}</p>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-3xl font-black">{leaderboardData[0].avgScore}%</p>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#0A0A0A]/60">Score</p>
                </div>
                <div>
                  <p className="text-3xl font-black">{leaderboardData[0].cgpa}</p>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#0A0A0A]/60">CGPA</p>
                </div>
              </div>
            </div>
          </div>

          {/* Rank 3 */}
          <div className="neo-card-hover p-6 bg-gradient-to-br from-[#FF9EC6] to-white transition-all" data-testid="podium-rank-3">
            <div className="flex justify-center mb-4">
              <div className="neo-card p-4 bg-[#FF9EC6]">
                <Target size={48} weight="bold" />
              </div>
            </div>
            <div className="text-center">
              <span className="neo-badge bg-[#FF9EC6] mb-2">#3</span>
              <h3 className="text-xl font-black mt-2">{leaderboardData[2].name}</h3>
              <p className="text-sm font-medium text-[#0A0A0A]/60 mb-3">{leaderboardData[2].rollNo}</p>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <p className="text-2xl font-black">{leaderboardData[2].avgScore}%</p>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#0A0A0A]/60">Score</p>
                </div>
                <div>
                  <p className="text-2xl font-black">{leaderboardData[2].cgpa}</p>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#0A0A0A]/60">CGPA</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full Leaderboard Table */}
        <div className="neo-card p-6">
          <h3 className="text-2xl font-bold mb-6">Complete Rankings</h3>
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="leaderboard-table">
              <thead>
                <tr className="border-b-2 border-[#0A0A0A] bg-[#F0EFEB]">
                  <th className="text-center p-4 text-xs tracking-[0.2em] uppercase font-bold">Rank</th>
                  <th className="text-left p-4 text-xs tracking-[0.2em] uppercase font-bold">Student</th>
                  <th className="text-center p-4 text-xs tracking-[0.2em] uppercase font-bold">Avg Score</th>
                  <th className="text-center p-4 text-xs tracking-[0.2em] uppercase font-bold">Quizzes</th>
                  <th className="text-center p-4 text-xs tracking-[0.2em] uppercase font-bold">CGPA</th>
                  <th className="text-center p-4 text-xs tracking-[0.2em] uppercase font-bold">Badge</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardData.map((student) => {
                  const badgeInfo = getBadgeIcon(student.badge);
                  return (
                    <tr 
                      key={student.rollNo} 
                      className={`border-b border-[#0A0A0A]/20 ${
                        student.highlight ? 'bg-[#B4D8E7]/30' : ''
                      }`}
                      data-testid={`leaderboard-row-${student.rank}`}
                    >
                      <td className="text-center p-4">
                        <span className="text-xl font-black">{student.rank}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {student.rank <= 3 && (
                            <Fire size={24} weight="bold" className="text-[#FF9EC6]" />
                          )}
                          <div>
                            <p className="font-bold">{student.name}</p>
                            <p className="text-sm font-medium text-[#0A0A0A]/60">{student.rollNo}</p>
                          </div>
                          {student.highlight && (
                            <span className="neo-badge bg-[#B4D8E7] text-xs">YOU</span>
                          )}
                        </div>
                      </td>
                      <td className="text-center p-4">
                        <p className="text-lg font-black">{student.avgScore}%</p>
                      </td>
                      <td className="text-center p-4">
                        <p className="font-bold">{student.quizzesTaken}</p>
                      </td>
                      <td className="text-center p-4">
                        <p className="text-lg font-black">{student.cgpa}</p>
                      </td>
                      <td className="text-center p-4">
                        {badgeInfo && (
                          <div className="flex justify-center">
                            <div className={`${badgeInfo.color} p-2 border-2 border-[#0A0A0A]`}>
                              <badgeInfo.icon size={20} weight="bold" />
                            </div>
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