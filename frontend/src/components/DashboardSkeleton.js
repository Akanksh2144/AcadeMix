import React from 'react';

/* ─── Base shimmer block ─────────────────────────────────────────────── */
const Shimmer = ({ className = '' }) => (
  <div className={`skeleton-shimmer rounded-2xl ${className}`} />
);

/* ─── Shared header skeleton (used across all dashboards) ────────────── */
const HeaderSkeleton = () => (
  <div className="bg-white/70 dark:bg-[#131825]/80 backdrop-blur-xl border-b border-slate-100/50 dark:border-white/5 sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Shimmer className="w-10 h-10 !rounded-xl" />
        <div>
          <Shimmer className="w-24 h-5 mb-1.5" />
          <Shimmer className="w-16 h-3" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Shimmer className="w-10 h-10 !rounded-full" />
        <Shimmer className="w-36 h-10 hidden sm:block" />
        <Shimmer className="w-10 h-10 !rounded-full" />
      </div>
    </div>
  </div>
);

/* ─── Greeting + CGPA skeleton (student) ─────────────────────────────── */
const GreetingSkeleton = ({ showCGPA = false }) => (
  <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
    <div>
      <Shimmer className="w-80 h-10 sm:h-12 mb-2" />
      <Shimmer className="w-56 h-4" />
    </div>
    {showCGPA && <Shimmer className="w-40 h-20 !rounded-3xl" />}
  </div>
);

/* ─── Tab bar skeleton ───────────────────────────────────────────────── */
const TabBarSkeleton = ({ count = 5 }) => (
  <div className="flex gap-1 p-1.5 bg-white dark:bg-[#1A202C] rounded-2xl border border-slate-100/50 dark:border-white/5 mb-6 sm:mb-8 overflow-x-auto" style={{ boxShadow: '0 4px 20px rgb(0 0 0 / 0.03)' }}>
    {[...Array(count)].map((_, i) => (
      <Shimmer key={i} className={`h-10 !rounded-xl flex-shrink-0 ${i === 0 ? 'w-28' : 'w-24'}`} />
    ))}
  </div>
);

/* ─── Stat card row skeleton ─────────────────────────────────────────── */
const StatCardsSkeleton = ({ count = 4 }) => (
  <div className={`grid grid-cols-2 lg:grid-cols-${count} gap-3 sm:gap-6 mb-6 sm:mb-8`}>
    {[...Array(count)].map((_, i) => (
      <div key={i} className="bg-white dark:bg-[#1A202C] rounded-3xl border border-slate-100/50 dark:border-white/5 p-4 sm:p-6" style={{ boxShadow: '0 8px 30px rgb(0 0 0 / 0.04)' }}>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <Shimmer className="w-20 h-3" />
          <Shimmer className="w-9 h-9 !rounded-xl" />
        </div>
        <Shimmer className="w-16 h-8 mb-1.5" />
        <Shimmer className="w-24 h-3" />
      </div>
    ))}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════
   STUDENT SKELETON — greeting + CGPA pill, tab bar, 4 stat cards, 
   chart area + activity feed
   ═══════════════════════════════════════════════════════════════════════ */
const StudentSkeleton = () => (
  <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19]">
    <HeaderSkeleton />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <GreetingSkeleton showCGPA />
      <TabBarSkeleton count={7} />
      <StatCardsSkeleton count={4} />
      {/* Score trend chart placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-[#1A202C] rounded-3xl border border-slate-100/50 dark:border-white/5 p-5 sm:p-6" style={{ boxShadow: '0 8px 30px rgb(0 0 0 / 0.04)' }}>
          <Shimmer className="w-36 h-5 mb-5" />
          <Shimmer className="w-full h-48 !rounded-xl" />
        </div>
        {/* Activity feed */}
        <div className="bg-white dark:bg-[#1A202C] rounded-3xl border border-slate-100/50 dark:border-white/5 p-5 sm:p-6" style={{ boxShadow: '0 8px 30px rgb(0 0 0 / 0.04)' }}>
          <Shimmer className="w-32 h-5 mb-5" />
          <div className="space-y-3">
            {[...Array(5)].map((_, j) => (
              <div key={j} className="flex items-center gap-3">
                <Shimmer className="w-8 h-8 !rounded-lg flex-shrink-0" />
                <div className="flex-1">
                  <Shimmer className="w-full h-3 mb-1" />
                  <Shimmer className="w-1/2 h-2.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════
   HOD SKELETON — greeting, tab bar (9 tabs), 2x4 stat grid, 
   table-style list
   ═══════════════════════════════════════════════════════════════════════ */
const HodSkeleton = () => (
  <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19]">
    <HeaderSkeleton />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <GreetingSkeleton />
      <TabBarSkeleton count={9} />
      {/* 2x4 stat cards (HOD overview has 8 cards in 2 rows) */}
      <StatCardsSkeleton count={4} />
      <StatCardsSkeleton count={4} />
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════
   TPO SKELETON — header, stat row, 2 gradient summary cards + export
   ═══════════════════════════════════════════════════════════════════════ */
const TpoSkeleton = () => (
  <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19]">
    <HeaderSkeleton />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6">
        <Shimmer className="w-64 h-10 mb-2" />
        <Shimmer className="w-80 h-4" />
      </div>
      <TabBarSkeleton count={4} />
      <StatCardsSkeleton count={4} />
      {/* Placement season + Top recruiter cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Shimmer className="h-36 !rounded-3xl" />
        <Shimmer className="h-36 !rounded-3xl" />
        <div className="bg-white dark:bg-[#1A202C] rounded-3xl border border-slate-100/50 dark:border-white/5 p-6 flex items-center gap-4" style={{ boxShadow: '0 8px 30px rgb(0 0 0 / 0.04)' }}>
          <Shimmer className="w-14 h-14 !rounded-2xl flex-shrink-0" />
          <div className="flex-1">
            <Shimmer className="w-36 h-5 mb-2" />
            <Shimmer className="w-48 h-3" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════
   ADMIN SKELETON — simple stat grid + department table
   ═══════════════════════════════════════════════════════════════════════ */
const AdminSkeleton = () => (
  <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19]">
    <HeaderSkeleton />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <GreetingSkeleton />
      <TabBarSkeleton count={6} />
      <StatCardsSkeleton count={4} />
      {/* Table skeleton */}
      <div className="bg-white dark:bg-[#1A202C] rounded-3xl border border-slate-100/50 dark:border-white/5 p-5 sm:p-6" style={{ boxShadow: '0 8px 30px rgb(0 0 0 / 0.04)' }}>
        <Shimmer className="w-40 h-5 mb-5" />
        <div className="space-y-3">
          {[...Array(6)].map((_, j) => (
            <div key={j} className="flex items-center gap-4 py-2 border-b border-slate-50 dark:border-white/5 last:border-0">
              <Shimmer className="w-10 h-10 !rounded-xl flex-shrink-0" />
              <Shimmer className="flex-1 h-4" />
              <Shimmer className="w-20 h-4" />
              <Shimmer className="w-16 h-7 !rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════
   EXAM CELL SKELETON — stat cards + data table
   ═══════════════════════════════════════════════════════════════════════ */
const ExamCellSkeleton = () => (
  <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19]">
    <HeaderSkeleton />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <GreetingSkeleton />
      <TabBarSkeleton count={5} />
      <StatCardsSkeleton count={4} />
      {/* Data table skeleton */}
      <div className="bg-white dark:bg-[#1A202C] rounded-3xl border border-slate-100/50 dark:border-white/5 p-5 sm:p-6" style={{ boxShadow: '0 8px 30px rgb(0 0 0 / 0.04)' }}>
        <div className="flex items-center justify-between mb-5">
          <Shimmer className="w-40 h-5" />
          <Shimmer className="w-24 h-8 !rounded-xl" />
        </div>
        <div className="space-y-2">
          {/* Table header */}
          <div className="flex gap-4 py-2 border-b border-slate-100 dark:border-white/5">
            {[...Array(5)].map((_, i) => <Shimmer key={i} className="flex-1 h-3" />)}
          </div>
          {[...Array(5)].map((_, j) => (
            <div key={j} className="flex items-center gap-4 py-3">
              {[...Array(5)].map((_, i) => <Shimmer key={i} className="flex-1 h-3.5" />)}
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════
   TEACHER SKELETON — assignment cards grid + recent submissions
   ═══════════════════════════════════════════════════════════════════════ */
const TeacherSkeleton = () => (
  <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19]">
    <HeaderSkeleton />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <GreetingSkeleton />
      <TabBarSkeleton count={6} />
      <StatCardsSkeleton count={3} />
      {/* Assignment cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-[#1A202C] rounded-3xl border border-slate-100/50 dark:border-white/5 p-5 sm:p-6" style={{ boxShadow: '0 8px 30px rgb(0 0 0 / 0.04)' }}>
            <div className="flex items-start gap-3 mb-4">
              <Shimmer className="w-12 h-12 !rounded-xl flex-shrink-0" />
              <div className="flex-1">
                <Shimmer className="w-full h-4 mb-2" />
                <Shimmer className="w-2/3 h-3" />
              </div>
            </div>
            <Shimmer className="w-full h-3 mb-2" />
            <Shimmer className="w-3/4 h-3" />
            <div className="flex gap-2 mt-4">
              <Shimmer className="w-16 h-6 !rounded-lg" />
              <Shimmer className="w-16 h-6 !rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════
   CONTENT-ONLY SKELETON — for tab content loading (no header/greeting)
   Used when switching tabs within an already-loaded dashboard
   ═══════════════════════════════════════════════════════════════════════ */
const ContentSkeleton = ({ variant = 'cards' }) => {
  if (variant === 'cards') {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between mb-2">
          <Shimmer className="w-44 h-7" />
          <Shimmer className="w-32 h-10 !rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#1A202C] rounded-3xl border border-slate-100/50 dark:border-white/5 p-6" style={{ boxShadow: '0 8px 30px rgb(0 0 0 / 0.04)' }}>
              <div className="flex items-start gap-4 mb-4">
                <Shimmer className="w-12 h-12 !rounded-xl flex-shrink-0" />
                <div className="flex-1">
                  <Shimmer className="w-full h-5 mb-2" />
                  <Shimmer className="w-2/3 h-3" />
                </div>
              </div>
              <Shimmer className="w-full h-3 mb-2" />
              <Shimmer className="w-1/2 h-3" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (variant === 'list') {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between mb-2">
          <Shimmer className="w-44 h-7" />
          <Shimmer className="w-32 h-10 !rounded-xl" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#1A202C] rounded-2xl border border-slate-100/50 dark:border-white/5 p-5 flex items-center gap-4" style={{ boxShadow: '0 8px 30px rgb(0 0 0 / 0.04)' }}>
              <Shimmer className="w-12 h-12 !rounded-xl flex-shrink-0" />
              <div className="flex-1">
                <Shimmer className="w-48 h-4 mb-1.5" />
                <Shimmer className="w-32 h-3" />
              </div>
              <Shimmer className="w-20 h-7 !rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  // table variant
  return (
    <div className="bg-white dark:bg-[#1A202C] rounded-3xl border border-slate-100/50 dark:border-white/5 p-5 sm:p-6" style={{ boxShadow: '0 8px 30px rgb(0 0 0 / 0.04)' }}>
      <div className="flex items-center justify-between mb-5">
        <Shimmer className="w-44 h-6" />
        <div className="flex gap-2">
          <Shimmer className="w-24 h-8 !rounded-xl" />
          <Shimmer className="w-24 h-8 !rounded-xl" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex gap-4 py-2 border-b border-slate-100 dark:border-white/5">
          {[...Array(5)].map((_, i) => <Shimmer key={i} className="flex-1 h-3" />)}
        </div>
        {[...Array(6)].map((_, j) => (
          <div key={j} className="flex gap-4 py-3">
            {[...Array(5)].map((_, i) => <Shimmer key={i} className="flex-1 h-3.5" />)}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   DEFAULT — fallback generic skeleton (original behavior)
   ═══════════════════════════════════════════════════════════════════════ */
const DashboardSkeleton = ({ variant = 'default' }) => {
  const skeletonMap = {
    student: StudentSkeleton,
    hod: HodSkeleton,
    tpo: TpoSkeleton,
    admin: AdminSkeleton,
    exam_cell: ExamCellSkeleton,
    examcell: ExamCellSkeleton,
    teacher: TeacherSkeleton,
    'content-cards': () => <ContentSkeleton variant="cards" />,
    'content-list': () => <ContentSkeleton variant="list" />,
    'content-table': () => <ContentSkeleton variant="table" />,
  };

  const SkeletonComponent = skeletonMap[variant];

  if (SkeletonComponent) return <SkeletonComponent />;

  // Default fallback
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19]">
      <HeaderSkeleton />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <GreetingSkeleton />
        <StatCardsSkeleton count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#1A202C] rounded-3xl border border-slate-100/50 dark:border-white/5 p-5 sm:p-6" style={{ boxShadow: '0 8px 30px rgb(0 0 0 / 0.04)' }}>
              <Shimmer className="w-28 h-5 mb-5" />
              <div className="space-y-3">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="flex items-center gap-3">
                    <Shimmer className="w-8 h-8 !rounded-lg flex-shrink-0" />
                    <div className="flex-1">
                      <Shimmer className="w-full h-3 mb-1" />
                      <Shimmer className="w-1/2 h-2.5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
