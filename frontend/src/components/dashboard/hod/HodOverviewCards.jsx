import React from 'react';
import { Users, AlertTriangle, Clock, Activity } from 'lucide-react';
import { useHodDashboard } from '../../../hooks/queries/useHodQueries';
import { motion } from 'framer-motion';

const StatCard = ({ title, value, subtitle, icon: Icon, color, delay }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className="relative group overflow-hidden bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-6 hover:shadow-2xl transition-all duration-300"
  >
    {/* Subtle Glow Effect */}
    <div className={`absolute -inset-0.5 bg-gradient-to-r ${color} rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-500`} />
    
    <div className="relative flex justify-between items-start">
      <div>
        <p className="text-sm font-medium tracking-wide text-slate-500 dark:text-slate-400 mb-1">{title}</p>
        <h3 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">{value}</h3>
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">{subtitle}</p>
      </div>
      <div className={`p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-inner group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  </motion.div>
);

export default function HodOverviewCards() {
  const { data, isLoading, isError } = useHodDashboard();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-4 mb-8 text-sm text-red-500 bg-red-100 dark:bg-red-900/30 rounded-xl border border-red-200 dark:border-red-800">
        Failed to dynamically load dashboard metrics.
      </div>
    );
  }

  const metrics = [
    {
      title: "TOTAL STUDENTS",
      value: data.total_students || 0,
      subtitle: "+4% from last semester",
      icon: Users,
      color: "from-blue-500 to-cyan-400",
      delay: 0.0
    },
    {
      title: "AT RISK STUDENTS",
      value: data.at_risk_count || 0,
      subtitle: "Requires immediate mentorship",
      icon: AlertTriangle,
      color: "from-red-500 to-orange-400",
      delay: 0.1
    },
    {
      title: "PENDING LEAVES",
      value: data.pending_leaves || 0,
      subtitle: "Awaiting HOD approval",
      icon: Clock,
      color: "from-amber-400 to-yellow-500",
      delay: 0.2
    },
    {
      title: "ATTENDANCE AVG",
      value: `${data.avg_attendance || 0}%`,
      subtitle: "Department overall average",
      icon: Activity,
      color: "from-emerald-500 to-green-400",
      delay: 0.3
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metrics.map((m, i) => (
        <StatCard key={i} {...m} />
      ))}
    </div>
  );
}
