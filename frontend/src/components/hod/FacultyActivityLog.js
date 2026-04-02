import React, { useState, useMemo } from 'react';
import { ClipboardText, CheckCircle, XCircle, PencilSimple, PaperPlaneTilt, FunnelSimple, MagnifyingGlass } from '@phosphor-icons/react';

const eventTypes = {
  created: { label: 'Marks Created', icon: ClipboardText, color: 'bg-blue-50 text-blue-500', dot: 'bg-blue-500' },
  submitted: { label: 'Submitted for Review', icon: PaperPlaneTilt, color: 'bg-amber-50 text-amber-500', dot: 'bg-amber-500' },
  approved: { label: 'Approved', icon: CheckCircle, color: 'bg-emerald-50 text-emerald-500', dot: 'bg-emerald-500' },
  rejected: { label: 'Rejected', icon: XCircle, color: 'bg-red-50 text-red-500', dot: 'bg-red-500' },
  revised: { label: 'Revised After Approval', icon: PencilSimple, color: 'bg-orange-50 text-orange-500', dot: 'bg-orange-500' },
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 0) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

export default function FacultyActivityLog({ submissions = [] }) {
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Build a flat timeline of events from all submissions
  const events = useMemo(() => {
    const allEvents = [];

    submissions.forEach(s => {
      // Created event
      if (s.created_at) {
        allEvents.push({
          type: 'created',
          teacher: s.teacher_name,
          subject: `${s.subject_code} - ${s.subject_name}`,
          section: `${s.batch} ${s.section}`,
          exam: s.exam_type?.toUpperCase(),
          students: s.entries?.length || 0,
          timestamp: s.created_at,
        });
      }

      // Submitted event
      if (s.submitted_at) {
        allEvents.push({
          type: 'submitted',
          teacher: s.teacher_name,
          subject: `${s.subject_code} - ${s.subject_name}`,
          section: `${s.batch} ${s.section}`,
          exam: s.exam_type?.toUpperCase(),
          students: s.entries?.length || 0,
          timestamp: s.submitted_at,
        });
      }

      // Reviewed event (approved/rejected)
      if (s.reviewed_at) {
        allEvents.push({
          type: s.status === 'approved' ? 'approved' : s.status === 'rejected' ? 'rejected' : 'approved',
          teacher: s.teacher_name,
          reviewer: s.reviewer_name,
          subject: `${s.subject_code} - ${s.subject_name}`,
          section: `${s.batch} ${s.section}`,
          exam: s.exam_type?.toUpperCase(),
          remarks: s.review_remarks,
          timestamp: s.reviewed_at,
        });
      }

      // Revision events
      if (s.revision_history && s.revision_history.length > 0) {
        s.revision_history.forEach(rev => {
          allEvents.push({
            type: 'revised',
            teacher: rev.reviser_name,
            subject: `${s.subject_code} - ${s.subject_name}`,
            section: `${s.batch} ${s.section}`,
            exam: s.exam_type?.toUpperCase(),
            reason: rev.reason,
            timestamp: rev.revised_at,
          });
        });
      }
    });

    // Sort by timestamp descending
    allEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return allEvents;
  }, [submissions]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (filterType !== 'all' && e.type !== filterType) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          e.teacher?.toLowerCase().includes(q) ||
          e.subject?.toLowerCase().includes(q) ||
          e.reviewer?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [events, filterType, searchQuery]);

  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups = {};
    filteredEvents.forEach(e => {
      const date = new Date(e.timestamp).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(e);
    });
    return groups;
  }, [filteredEvents]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">Faculty Activity Log</h3>
          <p className="text-sm text-slate-500 mt-1">Audit trail of all marks-related activities</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 rounded-lg">{events.length} events</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by teacher or subject..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
          />
        </div>
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          <FunnelSimple size={14} className="text-slate-400 ml-2" />
          {[
            { key: 'all', label: 'All' },
            { key: 'submitted', label: 'Submitted' },
            { key: 'approved', label: 'Approved' },
            { key: 'rejected', label: 'Rejected' },
            { key: 'revised', label: 'Revised' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterType(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === f.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      {Object.keys(groupedEvents).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedEvents).map(([date, dayEvents]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{date}</span>
                <div className="flex-1 h-px bg-slate-100"></div>
                <span className="text-[10px] font-bold text-slate-300">{dayEvents.length} events</span>
              </div>

              <div className="relative ml-3">
                {/* Timeline line */}
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200"></div>

                <div className="space-y-1">
                  {dayEvents.map((event, i) => {
                    const config = eventTypes[event.type] || eventTypes.created;
                    const Icon = config.icon;
                    return (
                      <div key={i} className="relative flex items-start gap-4 pl-6 py-3 rounded-xl hover:bg-slate-50/80 transition-colors group">
                        {/* Timeline dot */}
                        <div className={`absolute left-0 top-4 w-[15px] h-[15px] rounded-full border-[3px] border-white ${config.dot} shadow-sm z-10`}></div>

                        {/* Icon */}
                        <div className={`${config.color} p-2 rounded-xl flex-shrink-0`}>
                          <Icon size={16} weight="duotone" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-bold text-slate-800">
                                {event.teacher}
                                <span className="font-normal text-slate-400 ml-1.5">{config.label.toLowerCase()}</span>
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {event.subject} • {event.exam} • {event.section}
                                {event.students ? ` • ${event.students} students` : ''}
                              </p>
                            </div>
                            <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap flex-shrink-0">
                              {timeAgo(event.timestamp)}
                            </span>
                          </div>

                          {/* Extra info */}
                          {event.reviewer && (
                            <p className="text-xs text-slate-500 mt-1.5">
                              {event.type === 'approved' ? '✅' : '❌'} Reviewed by <span className="font-semibold text-slate-700">{event.reviewer}</span>
                            </p>
                          )}
                          {event.remarks && (
                            <p className="text-xs text-slate-500 mt-0.5 italic">"{event.remarks}"</p>
                          )}
                          {event.reason && (
                            <div className="mt-1.5 px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
                              <p className="text-xs text-amber-700">
                                <span className="font-semibold">Revision reason:</span> {event.reason}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="soft-card p-12 text-center">
          <ClipboardText size={40} weight="duotone" className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No activity logs found</p>
          <p className="text-xs text-slate-300 mt-1">Activity will appear here as faculty submit and review marks</p>
        </div>
      )}
    </div>
  );
}
