import React, { useState, useEffect } from 'react';
import { Buildings, MapPin, CalendarBlank, Briefcase, Clock, Users, Star, CaretDown, CaretUp } from '@phosphor-icons/react';
import PageHeader from '../components/PageHeader';
import { placementsAPI } from '../services/api';

const formatDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

const getDaysUntil = (d) => {
  if (!d) return null;
  const diff = new Date(d).getTime() - Date.now();
  if (diff < 0) return { text: 'Completed', past: true };
  const days = Math.floor(diff / 86400000);
  if (days === 0) return { text: 'Today', urgent: true };
  if (days === 1) return { text: 'Tomorrow', urgent: true };
  if (days <= 3) return { text: `In ${days} days`, urgent: true };
  return { text: `In ${days} days`, urgent: false };
};

const Placements = ({ navigate, user }) => {
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('all'); // all, upcoming, completed

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await placementsAPI.studentPlacements();
        setPlacements(data);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetch();
  }, []);

  const now = new Date();
  const filtered = placements.filter(p => {
    if (filter === 'upcoming') return !p.drive_date || new Date(p.drive_date) >= now;
    if (filter === 'completed') return p.drive_date && new Date(p.drive_date) < now;
    return true;
  });

  const upcoming = placements.filter(p => !p.drive_date || new Date(p.drive_date) >= now);
  const completed = placements.filter(p => p.drive_date && new Date(p.drive_date) < now);

  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300 flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm font-bold text-slate-400">Loading placement drives...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      <PageHeader
        navigate={navigate} user={user} title="Placements"
        subtitle={`${upcoming.length} upcoming • ${completed.length} completed`}
        maxWidth="max-w-7xl"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1.5 bg-slate-100 dark:bg-white/[0.04] rounded-xl mb-6 sm:mb-8 w-fit" style={{animation: 'fadeInUp 0.2s ease'}}>
          {[
            { key: 'all', label: `All (${placements.length})` },
            { key: 'upcoming', label: `Upcoming (${upcoming.length})` },
            { key: 'completed', label: `Past (${completed.length})` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border border-transparent ${
                filter === tab.key
                  ? 'bg-white dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 shadow-sm dark:border-indigo-500/25'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/[0.04]'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Placement Cards */}
        {filtered.length > 0 ? (
          <div className="space-y-4">
            {filtered.map((p, i) => {
              const deadline = getDaysUntil(p.drive_date);
              const isExpanded = expandedId === p.id;
              const isPast = deadline?.past;

              return (
                <div key={p.id} className={`soft-card overflow-hidden ${isPast ? 'opacity-70' : ''}`}
                  style={{animation: `fadeInUp ${0.25 + i * 0.05}s ease`}}>
                  {/* Main row */}
                  <button
                    className="w-full text-left p-5 sm:p-6 flex items-start gap-4"
                    onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isPast ? 'bg-slate-100' : 'bg-indigo-50 dark:bg-indigo-500/15'
                    }`}>
                      <Buildings size={24} weight="duotone" className={isPast ? 'text-slate-400' : 'text-indigo-500'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-extrabold text-lg text-slate-900 truncate">{p.company_name || 'Company'}</h3>
                          {p.role && (
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <Briefcase size={14} weight="duotone" /> {p.role}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {deadline && (
                            <span className={`soft-badge ${
                              deadline.past ? 'bg-slate-100 text-slate-400' :
                              deadline.urgent ? 'bg-red-50 text-red-600' :
                              'bg-emerald-50 text-emerald-600'
                            }`}>
                              {deadline.urgent && <Clock size={12} weight="bold" className="mr-1 inline" />}
                              {deadline.text}
                            </span>
                          )}
                          {isExpanded ? <CaretUp size={16} className="text-slate-400" /> : <CaretDown size={16} className="text-slate-400" />}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm font-medium text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <CalendarBlank size={14} weight="duotone" />
                          <span>{formatDate(p.drive_date)}</span>
                        </div>
                        {p.location && (
                          <div className="flex items-center gap-1.5">
                            <MapPin size={14} weight="duotone" />
                            <span>{p.location}</span>
                          </div>
                        )}
                        {p.package_lpa && (
                          <div className="flex items-center gap-1.5">
                            <Star size={14} weight="duotone" />
                            <span>{p.package_lpa} LPA</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-0 border-t border-slate-100 dark:border-slate-700 mt-0"
                      style={{animation: 'fadeInUp 0.15s ease'}}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                        {p.description && (
                          <div className="sm:col-span-2">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">About</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{p.description}</p>
                          </div>
                        )}
                        {p.eligibility && (
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Eligibility</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{p.eligibility}</p>
                          </div>
                        )}
                        {p.package_lpa && (
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Package</p>
                            <p className="text-sm font-bold text-emerald-600">{p.package_lpa} LPA</p>
                          </div>
                        )}
                        {p.drive_date && (
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Date & Time</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{formatDate(p.drive_date)}{p.time ? ` at ${p.time}` : ''}</p>
                          </div>
                        )}
                        {p.location && (
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Location</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{p.location}</p>
                          </div>
                        )}
                        {p.contact_email && (
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Contact</p>
                            <p className="text-sm text-indigo-600 font-medium">{p.contact_email}</p>
                          </div>
                        )}
                        {p.rounds && (
                          <div className="sm:col-span-2">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Rounds</p>
                            <div className="flex flex-wrap gap-2">
                              {(typeof p.rounds === 'string' ? p.rounds.split(',') : p.rounds).map((r, ri) => (
                                <span key={ri} className="soft-badge bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600">{typeof r === 'string' ? r.trim() : r}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="soft-card p-12 sm:p-16 text-center" style={{animation: 'fadeInUp 0.3s ease'}}>
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase size={36} weight="duotone" className="text-slate-400" />
            </div>
            <h3 className="font-bold text-lg text-slate-600 dark:text-slate-400 mb-1">
              {filter === 'upcoming' ? 'No upcoming placement drives' :
                filter === 'completed' ? 'No past drives' : 'No placement drives yet'}
            </h3>
            <p className="text-sm text-slate-400">
              Placement drives will appear here when the placement cell publishes them.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Placements;
