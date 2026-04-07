import React, { useState, useEffect, useCallback } from 'react';
import { parentAPI, grievanceAPI } from '../services/api';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const TABS = [
  { key: 'overview', label: '📊 Overview' },
  { key: 'academics', label: '🎓 Academics' },
  { key: 'attendance', label: '📋 Attendance' },
  { key: 'timetable', label: '🕐 Timetable' },
  { key: 'leaves', label: '📝 Leaves' },
  { key: 'grievances', label: '📢 Grievances' },
];

const glassCard = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '16px',
  padding: '24px',
  marginBottom: '20px',
  backdropFilter: 'blur(12px)',
};

const pillStyle = (active) => ({
  padding: '8px 20px',
  borderRadius: '24px',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '13px',
  background: active ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.06)',
  color: active ? '#fff' : 'rgba(255,255,255,0.6)',
  transition: 'all 0.2s',
});

export default function ParentDashboard({ navigate, user, onLogout }) {
  const [tab, setTab] = useState('overview');
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [academics, setAcademics] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [grievances, setGrievances] = useState([]);
  const [grievanceForm, setGrievanceForm] = useState({ category: 'academic', subject: '', description: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    parentAPI.getChildren().then(r => {
      setChildren(r.data);
      if (r.data.length > 0) setSelectedChild(r.data[0].student_id);
    }).catch(() => {});
  }, []);

  const loadTabData = useCallback(async () => {
    if (!selectedChild) return;
    setLoading(true);
    try {
      if (tab === 'overview' || tab === 'academics') {
        const r = await parentAPI.getAcademics(selectedChild);
        setAcademics(r.data);
      }
      if (tab === 'overview' || tab === 'attendance') {
        const r = await parentAPI.getAttendance(selectedChild);
        setAttendance(r.data);
      }
      if (tab === 'timetable') {
        const r = await parentAPI.getTimetable(selectedChild);
        setTimetable(r.data);
      }
      if (tab === 'leaves') {
        const r = await parentAPI.getLeaves(selectedChild);
        setLeaves(r.data);
      }
      if (tab === 'grievances') {
        const r = await grievanceAPI.getMine();
        setGrievances(r.data);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [selectedChild, tab]);

  useEffect(() => { loadTabData(); }, [loadTabData]);

  const overallAtt = attendance.length > 0
    ? (attendance.reduce((s, a) => s + a.present_count, 0) / Math.max(attendance.reduce((s, a) => s + a.total_count, 0), 1) * 100).toFixed(1)
    : 0;

  const currentChild = children.find(c => c.student_id === selectedChild);

  const submitGrievance = async () => {
    if (!grievanceForm.subject || !grievanceForm.description) return;
    await grievanceAPI.submit(grievanceForm);
    setGrievanceForm({ category: 'academic', subject: '', description: '' });
    loadTabData();
  };

  const openProgressReport = () => {
    if (!selectedChild) return;
    const token = localStorage.getItem('auth_token');
    window.open(`${API_URL}/api/parent/children/${selectedChild}/progress-report?token=${token}`, '_blank');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29, #1a1a2e, #16213e)', color: '#fff' }}>
      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', background: 'linear-gradient(135deg, #a78bfa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            👨‍👩‍👧 Parent Dashboard
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
            {user?.name} — Parent Portal
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {children.length > 1 && (
            <select
              value={selectedChild || ''}
              onChange={e => setSelectedChild(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', fontSize: '13px' }}
            >
              {children.map(c => (
                <option key={c.student_id} value={c.student_id} style={{ background: '#1a1a2e' }}>
                  {c.name} ({c.relationship})
                </option>
              ))}
            </select>
          )}
          <button onClick={onLogout} style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer', fontSize: '13px' }}>
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '16px 32px 0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} style={pillStyle(tab === t.key)} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '20px 32px', maxWidth: '1200px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.4)' }}>Loading...</div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {tab === 'overview' && (
              <div>
                {/* Child Info Card */}
                {currentChild && (
                  <div style={{ ...glassCard, background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                      <div>
                        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Student</div>
                        <div style={{ fontSize: '18px', fontWeight: 700 }}>{currentChild.name}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Department</div>
                        <div style={{ fontWeight: 600 }}>{currentChild.profile?.department || '-'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Batch</div>
                        <div style={{ fontWeight: 600 }}>{currentChild.profile?.batch || '-'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Relationship</div>
                        <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{currentChild.relationship}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stat Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  <div style={glassCard}>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Overall Attendance</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: overallAtt >= 75 ? '#22c55e' : '#ef4444' }}>{overallAtt}%</div>
                    {overallAtt < 80 && <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '4px' }}>⚠️ Below 80% threshold</div>}
                  </div>
                  <div style={glassCard}>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Current CGPA</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#818cf8' }}>
                      {academics?.semester_grades?.length > 0
                        ? academics.semester_grades[academics.semester_grades.length - 1].cgpa || '-'
                        : '-'}
                    </div>
                  </div>
                  <div style={glassCard}>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Semesters Completed</div>
                    <div style={{ fontSize: '28px', fontWeight: 700 }}>{academics?.semester_grades?.length || 0}</div>
                  </div>
                  <div style={glassCard}>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Leave Requests</div>
                    <div style={{ fontSize: '28px', fontWeight: 700 }}>{leaves.length}</div>
                  </div>
                </div>
              </div>
            )}

            {/* ACADEMICS TAB */}
            {tab === 'academics' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ margin: 0, fontSize: '18px' }}>📚 Academic Records</h2>
                  <button
                    onClick={openProgressReport}
                    style={{ padding: '10px 20px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                  >
                    📄 Download Progress Report
                  </button>
                </div>

                {/* Semester Grades */}
                <div style={glassCard}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#a78bfa' }}>Semester Grades</h3>
                  {academics?.semester_grades?.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                          <th style={{ padding: '10px', textAlign: 'left', color: 'rgba(255,255,255,0.5)' }}>Semester</th>
                          <th style={{ padding: '10px', textAlign: 'left', color: 'rgba(255,255,255,0.5)' }}>Year</th>
                          <th style={{ padding: '10px', textAlign: 'left', color: 'rgba(255,255,255,0.5)' }}>SGPA</th>
                          <th style={{ padding: '10px', textAlign: 'left', color: 'rgba(255,255,255,0.5)' }}>CGPA</th>
                          <th style={{ padding: '10px', textAlign: 'left', color: 'rgba(255,255,255,0.5)' }}>Credits</th>
                          <th style={{ padding: '10px', textAlign: 'left', color: 'rgba(255,255,255,0.5)' }}>Arrears</th>
                        </tr>
                      </thead>
                      <tbody>
                        {academics.semester_grades.map((g, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '10px' }}>{g.semester}</td>
                            <td style={{ padding: '10px' }}>{g.academic_year}</td>
                            <td style={{ padding: '10px', fontWeight: 600 }}>{g.sgpa || '-'}</td>
                            <td style={{ padding: '10px', fontWeight: 600, color: '#818cf8' }}>{g.cgpa || '-'}</td>
                            <td style={{ padding: '10px' }}>{g.earned_credits || 0}/{g.total_credits || 0}</td>
                            <td style={{ padding: '10px', color: g.arrear_count > 0 ? '#ef4444' : '#22c55e' }}>{g.arrear_count || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>No grade data available yet</p>
                  )}
                </div>

                {/* Current Registrations */}
                <div style={glassCard}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#a78bfa' }}>Current Registrations</h3>
                  {academics?.current_registrations?.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
                      {academics.current_registrations.map((r, i) => (
                        <div key={i} style={{ padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <div style={{ fontWeight: 600 }}>{r.subject_name || r.subject_code}</div>
                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{r.subject_code} • Sem {r.semester}</div>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: r.status === 'approved' ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.15)', color: r.status === 'approved' ? '#22c55e' : '#fbbf24', marginTop: '6px', display: 'inline-block' }}>
                            {r.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>No registrations found</p>
                  )}
                </div>
              </div>
            )}

            {/* ATTENDANCE TAB */}
            {tab === 'attendance' && (
              <div style={glassCard}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#a78bfa' }}>Subject-wise Attendance</h3>
                {attendance.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <th style={{ padding: '10px', textAlign: 'left', color: 'rgba(255,255,255,0.5)' }}>Subject</th>
                        <th style={{ padding: '10px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Present</th>
                        <th style={{ padding: '10px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Total</th>
                        <th style={{ padding: '10px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map((a, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '10px', fontWeight: 600 }}>{a.subject_code}</td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>{a.present_count}</td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>{a.total_count}</td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            <span style={{
                              padding: '4px 12px', borderRadius: '12px', fontWeight: 700, fontSize: '13px',
                              background: a.percentage >= 75 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                              color: a.percentage >= 75 ? '#22c55e' : '#ef4444'
                            }}>
                              {a.percentage}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>No attendance data available</p>
                )}
                <div style={{ marginTop: '16px', padding: '12px', background: overallAtt >= 75 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: '10px', textAlign: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: overallAtt >= 75 ? '#22c55e' : '#ef4444' }}>
                    Overall Attendance: {overallAtt}%
                  </span>
                </div>
              </div>
            )}

            {/* TIMETABLE TAB */}
            {tab === 'timetable' && (
              <div style={glassCard}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#a78bfa' }}>Weekly Timetable</h3>
                {timetable.length > 0 ? (
                  (() => {
                    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
                    const byDay = {};
                    days.forEach(d => { byDay[d] = []; });
                    timetable.forEach(s => { if (byDay[s.day]) byDay[s.day].push(s); });
                    Object.values(byDay).forEach(arr => arr.sort((a, b) => a.period_no - b.period_no));
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
                        {days.map(day => (
                          <div key={day} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '10px', color: '#a78bfa', textAlign: 'center' }}>{day}</div>
                            {byDay[day].length > 0 ? byDay[day].map((s, i) => (
                              <div key={i} style={{ padding: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', marginBottom: '6px', fontSize: '12px' }}>
                                <div style={{ fontWeight: 600, marginBottom: '2px' }}>{s.subject_name || s.subject_code}</div>
                                <div style={{ color: 'rgba(255,255,255,0.5)' }}>{s.start_time} - {s.end_time}</div>
                                <div style={{ color: 'rgba(255,255,255,0.4)' }}>{s.faculty_name}</div>
                              </div>
                            )) : (
                              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '12px', padding: '16px 0' }}>No classes</div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()
                ) : (
                  <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>No timetable data available</p>
                )}
              </div>
            )}

            {/* LEAVES TAB */}
            {tab === 'leaves' && (
              <div style={glassCard}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#a78bfa' }}>Leave History</h3>
                {leaves.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <th style={{ padding: '10px', textAlign: 'left', color: 'rgba(255,255,255,0.5)' }}>Type</th>
                        <th style={{ padding: '10px', textAlign: 'left', color: 'rgba(255,255,255,0.5)' }}>From</th>
                        <th style={{ padding: '10px', textAlign: 'left', color: 'rgba(255,255,255,0.5)' }}>To</th>
                        <th style={{ padding: '10px', textAlign: 'left', color: 'rgba(255,255,255,0.5)' }}>Reason</th>
                        <th style={{ padding: '10px', textAlign: 'left', color: 'rgba(255,255,255,0.5)' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaves.map((l, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '10px', textTransform: 'capitalize' }}>{l.leave_type}</td>
                          <td style={{ padding: '10px' }}>{l.from_date}</td>
                          <td style={{ padding: '10px' }}>{l.to_date}</td>
                          <td style={{ padding: '10px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.reason}</td>
                          <td style={{ padding: '10px' }}>
                            <span style={{
                              padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                              background: l.status === 'approved' ? 'rgba(34,197,94,0.15)' : l.status === 'rejected' ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.15)',
                              color: l.status === 'approved' ? '#22c55e' : l.status === 'rejected' ? '#ef4444' : '#fbbf24'
                            }}>
                              {l.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>No leave records found</p>
                )}
              </div>
            )}

            {/* GRIEVANCES TAB */}
            {tab === 'grievances' && (
              <div>
                {/* Submit Form */}
                <div style={glassCard}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#a78bfa' }}>Submit a Grievance</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '12px' }}>
                    <select
                      value={grievanceForm.category}
                      onChange={e => setGrievanceForm({ ...grievanceForm, category: e.target.value })}
                      style={{ padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', fontSize: '13px' }}
                    >
                      <option value="academic" style={{ background: '#1a1a2e' }}>Academic</option>
                      <option value="administrative" style={{ background: '#1a1a2e' }}>Administrative</option>
                      <option value="infrastructure" style={{ background: '#1a1a2e' }}>Infrastructure</option>
                      <option value="other" style={{ background: '#1a1a2e' }}>Other</option>
                    </select>
                    <input
                      placeholder="Subject"
                      value={grievanceForm.subject}
                      onChange={e => setGrievanceForm({ ...grievanceForm, subject: e.target.value })}
                      style={{ padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', fontSize: '13px' }}
                    />
                  </div>
                  <textarea
                    placeholder="Describe your grievance in detail..."
                    rows={3}
                    value={grievanceForm.description}
                    onChange={e => setGrievanceForm({ ...grievanceForm, description: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                  <button
                    onClick={submitGrievance}
                    style={{ marginTop: '12px', padding: '10px 24px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                  >
                    Submit Grievance
                  </button>
                </div>

                {/* My Grievances */}
                <div style={glassCard}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#a78bfa' }}>My Grievances</h3>
                  {grievances.length > 0 ? (
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {grievances.map((g, i) => (
                        <div key={i} style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 600 }}>{g.subject}</span>
                            <span style={{
                              padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                              background: g.status === 'resolved' ? 'rgba(34,197,94,0.15)' : g.status === 'in_review' ? 'rgba(59,130,246,0.15)' : 'rgba(251,191,36,0.15)',
                              color: g.status === 'resolved' ? '#22c55e' : g.status === 'in_review' ? '#3b82f6' : '#fbbf24'
                            }}>
                              {g.status}
                            </span>
                          </div>
                          <p style={{ margin: '0 0 6px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{g.description}</p>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                            Category: {g.category} • {g.created_at ? new Date(g.created_at).toLocaleDateString() : ''}
                          </div>
                          {g.resolution_notes && (
                            <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(34,197,94,0.08)', borderRadius: '8px', fontSize: '12px', color: '#22c55e' }}>
                              Resolution: {g.resolution_notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>No grievances submitted yet</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
