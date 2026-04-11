import React, { useState, useEffect } from 'react';
import { Trophy, Fire, Target, Medal, CircleNotch, ChartLine } from '@phosphor-icons/react';
import PageHeader from '../components/PageHeader';
import { analyticsAPI } from '../services/api';

const Leaderboard = ({ navigate, user, userRole }) => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const { data } = await analyticsAPI.leaderboard();
        setLeaderboardData(data || []);
      } catch (err) {
        console.error('Failed to fetch leaderboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const getBadgeStyle = (rank) => {
    if (rank === 1) return { icon: Trophy, bg: 'bg-amber-50 dark:bg-amber-500/15', text: 'text-amber-500' };
    if (rank === 2) return { icon: Medal, bg: 'bg-slate-100 dark:bg-slate-500/15', text: 'text-slate-500 dark:text-slate-400' };
    if (rank === 3) return { icon: Target, bg: 'bg-orange-50 dark:bg-orange-500/15', text: 'text-orange-500' };
    return null;
  };

  const top3 = leaderboardData.slice(0, 3);
  const currentUserId = user?.id;

  const backRoute = (userRole || user?.role) === 'student' ? 'student-dashboard'
    : (userRole || user?.role) === 'hod' ? 'hod-dashboard'
    : (userRole || user?.role) === 'exam_cell' ? 'examcell-dashboard'
    : (userRole || user?.role) === 'admin' ? 'admin-dashboard'
    : 'teacher-dashboard';

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      <PageHeader
        navigate={navigate} user={user} title="Leaderboard"
        subtitle="Top performers by quiz average score"
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <CircleNotch size={48} weight="bold" className="text-indigo-500 animate-spin mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">Loading leaderboard...</p>
          </div>
        ) : leaderboardData.length === 0 ? (
          <div className="soft-card p-16 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ChartLine size={32} weight="duotone" className="text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">No Data Yet</h3>
            <p className="text-slate-400">Leaderboard will populate once students complete quizzes.</p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {top3.length >= 3 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {/* Rank 2 */}
                <div className="soft-card-hover p-6" data-testid="podium-rank-2">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-500/15 rounded-2xl flex items-center justify-center">
                      <Medal size={36} weight="duotone" className="text-slate-500 dark:text-slate-400" />
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="soft-badge bg-slate-100 dark:bg-slate-500/15 text-slate-600 dark:text-slate-400 mb-2">#2</span>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-2">{top3[1]?.name}</h3>
                    <p className="text-sm font-medium text-slate-400 mb-4">{top3[1]?.college_id}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div><p className="text-2xl font-extrabold text-slate-900 dark:text-white">{top3[1]?.avg_score}%</p><p className="text-xs font-bold text-slate-400 uppercase">Score</p></div>
                      <div><p className="text-2xl font-extrabold text-slate-900 dark:text-white">{top3[1]?.cgpa || '-'}</p><p className="text-xs font-bold text-slate-400 uppercase">CGPA</p></div>
                    </div>
                  </div>
                </div>

                {/* Rank 1 */}
                <div className="soft-card-hover p-8 bg-gradient-to-br from-amber-50 via-amber-50 to-orange-50 dark:from-amber-500/10 dark:via-amber-500/5 dark:to-transparent md:-translate-y-4" data-testid="podium-rank-1">
                  <div className="flex justify-center mb-4">
                    <div className="w-20 h-20 bg-amber-100 dark:bg-amber-500/15 rounded-2xl flex items-center justify-center">
                      <Trophy size={48} weight="duotone" className="text-amber-500" />
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="soft-badge bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 mb-2 text-sm px-4">#1 CHAMPION</span>
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-3">{top3[0]?.name}</h3>
                    <p className="text-sm font-medium text-slate-400 mb-4">{top3[0]?.college_id}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div><p className="text-3xl font-extrabold text-slate-900 dark:text-white">{top3[0]?.avg_score}%</p><p className="text-xs font-bold text-slate-400 uppercase">Score</p></div>
                      <div><p className="text-3xl font-extrabold text-slate-900 dark:text-white">{top3[0]?.cgpa || '-'}</p><p className="text-xs font-bold text-slate-400 uppercase">CGPA</p></div>
                    </div>
                  </div>
                </div>

                {/* Rank 3 */}
                <div className="soft-card-hover p-6" data-testid="podium-rank-3">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-orange-100 dark:bg-orange-500/15 rounded-2xl flex items-center justify-center">
                      <Target size={36} weight="duotone" className="text-orange-500" />
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="soft-badge bg-orange-50 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 mb-2">#3</span>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-2">{top3[2]?.name}</h3>
                    <p className="text-sm font-medium text-slate-400 mb-4">{top3[2]?.college_id}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div><p className="text-2xl font-extrabold text-slate-900 dark:text-white">{top3[2]?.avg_score}%</p><p className="text-xs font-bold text-slate-400 uppercase">Score</p></div>
                      <div><p className="text-2xl font-extrabold text-slate-900 dark:text-white">{top3[2]?.cgpa || '-'}</p><p className="text-xs font-bold text-slate-400 uppercase">CGPA</p></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Full Table */}
            <div className="soft-card p-6">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">Complete Rankings</h3>
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="leaderboard-table">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700">
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
                      const badgeInfo = getBadgeStyle(student.rank);
                      const isMe = student.student_id === currentUserId;
                      return (
                        <tr key={student.student_id}
                          className={`border-b border-slate-50 dark:border-white/[0.06] hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors ${isMe ? 'bg-indigo-50/50 dark:bg-indigo-500/10' : ''}`}
                          data-testid={`leaderboard-row-${student.rank}`}>
                          <td className="text-center p-4"><span className="text-xl font-extrabold text-slate-900 dark:text-white">{student.rank}</span></td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {student.rank <= 3 && <Fire size={20} weight="duotone" className="text-amber-500" />}
                              <div>
                                <p className="font-bold text-slate-800 dark:text-slate-100">{student.name}</p>
                                <p className="text-sm font-medium text-slate-400">{student.college_id}</p>
                              </div>
                              {isMe && <span className="soft-badge bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs">YOU</span>}
                            </div>
                          </td>
                          <td className="text-center p-4"><p className="text-lg font-extrabold text-slate-900 dark:text-white">{student.avg_score}%</p></td>
                          <td className="text-center p-4"><p className="font-bold text-slate-600 dark:text-slate-400">{student.quizzes_taken}</p></td>
                          <td className="text-center p-4"><p className="text-lg font-extrabold text-slate-900 dark:text-white">{student.cgpa || '-'}</p></td>
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
          </>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
