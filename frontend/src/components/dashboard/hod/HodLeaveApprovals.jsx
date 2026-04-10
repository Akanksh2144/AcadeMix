import React from 'react';
import { useHodPendingLeaves, useHodReviewLeave } from '../../../hooks/queries/useHodQueries';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HodLeaveApprovals() {
  const { data: leaves, isLoading, isError } = useHodPendingLeaves();
  const reviewMutation = useHodReviewLeave();

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm h-64 animate-pulse">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-md mb-6"></div>
        <div className="space-y-4">
          {[1,2].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800/50 rounded-xl"></div>)}
        </div>
      </div>
    );
  }

  if (isError) return null;

  const handleReview = (leaveId, action) => {
    reviewMutation.mutate({ 
      leaveId, 
      reviewData: { action, remarks: `${action} via HOD Quick Action` } 
    });
  };

  return (
    <div className="bg-white/80 dark:bg-[#0f1423]/80 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-slate-800/60 p-8 shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Leave Approvals
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Pending faculty leave requests</p>
        </div>
        {leaves?.length > 0 && (
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold text-sm">
            {leaves.length}
          </span>
        )}
      </div>

      {!leaves || leaves.length === 0 ? (
        <div className="text-center py-8 rounded-2xl bg-slate-50 dark:bg-slate-800/20 border border-dashed border-slate-200 dark:border-slate-700">
          <CheckCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-500">No pending approvals.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {leaves.map((l) => (
              <motion.div 
                key={l.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, x: -50, scale: 0.95 }}
                className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{l.applicant_id}</h4>
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5 uppercase tracking-wider">{l.leave_type}</p>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5"><Clock className="w-3 h-3" /> {new Date(l.from_date).toLocaleDateString()} - {new Date(l.to_date).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleReview(l.id, 'approve')}
                    disabled={reviewMutation.isPending}
                    className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/20 rounded-xl transition-colors border border-transparent hover:border-green-200 dark:hover:border-green-800"
                    title="Approve"
                  >
                    <CheckCircle className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleReview(l.id, 'reject')}
                    disabled={reviewMutation.isPending}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-xl transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-800"
                    title="Reject"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
