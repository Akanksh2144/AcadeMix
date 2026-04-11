import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, CheckCircle, WarningOctagon, Clock, ArrowRight, Receipt, DownloadSimple, CalendarBlank } from '@phosphor-icons/react';
import { feesAPI } from '../../services/api';

const formatDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const downloadReceipt = (txn) => {
  // Generate a simple text receipt and download as file
  const lines = [
    '═══════════════════════════════════════════',
    '               AcadMix College',
    '              FEE PAYMENT RECEIPT',
    '═══════════════════════════════════════════',
    '',
    `  Payment ID    : ${txn.payment_id}`,
    `  Fee Type      : ${txn.fee_type}`,
    `  Academic Year : ${txn.academic_year}`,
    `  Amount Paid   : ₹${txn.amount?.toLocaleString('en-IN')}`,
    `  Status        : ${txn.status === 'success' ? 'PAID ✓' : txn.status.toUpperCase()}`,
    `  Transaction   : ${txn.transaction_ref || 'N/A'}`,
    `  Date          : ${formatDate(txn.paid_at)}`,
    '',
    '═══════════════════════════════════════════',
    '  This is a computer-generated receipt.',
    '  For queries contact accounts@college.edu',
    '═══════════════════════════════════════════',
  ].join('\n');

  const blob = new Blob([lines], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `receipt_${txn.fee_type.replace(/\s+/g, '_')}_${txn.payment_id.slice(0, 8)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
};

const FeePaymentModule = ({ user }) => {
  const [fees, setFees] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [tab, setTab] = useState('due'); // 'due' | 'history'

  useEffect(() => {
    fetchDueFees();
    fetchHistory();
  }, []);

  const fetchDueFees = async () => {
    try {
      const { data } = await feesAPI.getDue();
      setFees(data.data || []);
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Failed to load fee details', type: 'error' });
    }
    setLoading(false);
  };

  const fetchHistory = async () => {
    try {
      const { data } = await feesAPI.getHistory();
      setHistory(data.data || []);
    } catch (err) {
      console.error('Failed to load payment history:', err);
    }
    setHistoryLoading(false);
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async (invoice) => {
    setProcessingId(invoice.invoice_id);
    setMessage({ text: '', type: '' });

    const res = await loadRazorpayScript();
    if (!res) {
      setMessage({ text: 'Razorpay SDK failed to load. Are you online?', type: 'error' });
      setProcessingId(null);
      return;
    }

    try {
      // Create backend Order
      const { data } = await feesAPI.createOrder({
        invoice_id: invoice.invoice_id,
        amount_to_pay: invoice.amount_due
      });

      const order = data.order;
      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'AcadMix College',
        description: invoice.fee_type,
        order_id: order.order_id,
        handler: async function (response) {
          try {
            await feesAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            setMessage({ text: 'Payment successful!', type: 'success' });
            fetchDueFees(); // refresh amounts
            fetchHistory(); // refresh history
          } catch (err) {
            setMessage({ text: 'Payment verification failed', type: 'error' });
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email || '',
          contact: ''
        },
        theme: {
          color: '#10B981'
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Could not initialize payment wrapper', type: 'error' });
    }
    setProcessingId(null);
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading your fee structure...</div>;

  const successfulPayments = history.filter(h => h.status === 'success');
  const pendingPayments = history.filter(h => h.status === 'pending');

  return (
    <div className="space-y-6">
      {message.text && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-bold ${message.type === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'}`}>
          {message.type === 'error' ? <WarningOctagon size={20} /> : <CheckCircle size={20} />}
          {message.text}
        </div>
      )}

      {/* Tabs: Due Fees | Transaction History */}
      <div className="flex gap-1 p-1.5 bg-slate-100 dark:bg-white/[0.04] rounded-xl w-fit">
        <button
          onClick={() => setTab('due')}
          className={`relative px-4 py-2 rounded-xl text-sm font-bold transition-colors border border-transparent ${
            tab === 'due'
              ? 'bg-white dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 shadow-sm dark:border-indigo-500/25'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:bg-white/[0.04]'
          }`}
        >
          Due Fees
          {fees.length > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 flex items-center justify-center px-1 text-[10px] font-extrabold rounded-full bg-red-500 text-white shadow-sm ring-2 ring-white dark:ring-[#0B0F19]">{fees.length}</span>}
        </button>
        <button
          onClick={() => setTab('history')}
          className={`relative px-4 py-2 rounded-xl text-sm font-bold transition-colors border border-transparent ${
            tab === 'history'
              ? 'bg-white dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 shadow-sm dark:border-indigo-500/25'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:bg-white/[0.04]'
          }`}
        >
          Transaction History
          {successfulPayments.length > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 flex items-center justify-center px-1 text-[10px] font-extrabold rounded-full bg-emerald-500 text-white shadow-sm ring-2 ring-white dark:ring-[#0B0F19]">{successfulPayments.length}</span>}
        </button>
      </div>

      {/* ── Due Fees Tab ─────────────────────────── */}
      {tab === 'due' && (
        <>
          {fees.length === 0 ? (
            <div className="soft-card p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/15 rounded-2xl flex items-center justify-center mb-4">
                <CheckCircle size={32} weight="duotone" className="text-emerald-500" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">You're all caught up!</h3>
              <p className="text-slate-500 dark:text-slate-400">There are no outstanding fee dues for your academic profile at this time.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {fees.map((fee) => (
                <motion.div key={fee.invoice_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="soft-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors pointer-events-none" />
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 flex items-center justify-center shrink-0">
                      <CreditCard size={24} weight="duotone" className="text-indigo-500" />
                    </div>
                    <div>
                      <h4 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">{fee.fee_type}</h4>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">{fee.academic_year} • {fee.description || 'Academic Invoice'}</p>
                      
                      {fee.status === 'pending_gateway' && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-500/15 text-[10px] font-extrabold text-amber-600 dark:text-amber-400 mt-3">
                          <Clock size={12} weight="bold" /> Pending via Gateway
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end border-t border-slate-100 dark:border-slate-800 sm:border-0 pt-4 sm:pt-0">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total: ₹{(fee.total_amount).toLocaleString()}</p>
                    <div className="mb-3">
                      <span className="text-2xl font-extrabold text-slate-900 dark:text-white">₹{(fee.amount_due).toLocaleString()}</span>
                      <span className="text-xs font-bold text-slate-400 ml-1">DUE</span>
                    </div>
                    
                    <button
                      onClick={() => handlePayment(fee)}
                      disabled={processingId === fee.invoice_id}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {processingId === fee.invoice_id ? 'Processing...' : 'Pay with Razorpay'} <ArrowRight size={16} weight="bold" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Transaction History Tab ─────────────── */}
      {tab === 'history' && (
        <>
          {historyLoading ? (
            <div className="p-8 text-center text-slate-400">Loading transaction history...</div>
          ) : history.length === 0 ? (
            <div className="soft-card p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mb-4">
                <Receipt size={32} weight="duotone" className="text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-600 dark:text-slate-400 mb-1">No transactions yet</h3>
              <p className="text-sm text-slate-400">Your payment history will appear here after making a payment.</p>
            </div>
          ) : (
            <div className="soft-card overflow-hidden">
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700/50">
                      <th className="text-left text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 py-3 px-4">Fee Type</th>
                      <th className="text-left text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 py-3 px-4">Year</th>
                      <th className="text-right text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 py-3 px-4">Amount</th>
                      <th className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 py-3 px-4">Status</th>
                      <th className="text-left text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 py-3 px-4">Date</th>
                      <th className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 py-3 px-4">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {history.map((txn, i) => (
                      <tr key={txn.payment_id || i} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              txn.status === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/15' : 'bg-amber-50 dark:bg-amber-500/15'
                            }`}>
                              {txn.status === 'success'
                                ? <CheckCircle size={16} weight="duotone" className="text-emerald-500" />
                                : <Clock size={16} weight="duotone" className="text-amber-500" />
                              }
                            </div>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{txn.fee_type}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-sm text-slate-500 dark:text-slate-400">{txn.academic_year}</td>
                        <td className="py-3.5 px-4 text-sm font-extrabold text-slate-900 dark:text-white text-right">₹{txn.amount?.toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${
                            txn.status === 'success'
                              ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          }`}>
                            {txn.status === 'success' ? 'Paid' : 'Pending'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-sm text-slate-500 dark:text-slate-400">{formatDate(txn.paid_at)}</td>
                        <td className="py-3.5 px-4 text-center">
                          {txn.status === 'success' && (
                            <button
                              onClick={() => downloadReceipt(txn)}
                              className="p-2 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-500 transition-colors"
                              title="Download receipt"
                            >
                              <DownloadSimple size={16} weight="bold" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800/50">
                {history.map((txn, i) => (
                  <div key={txn.payment_id || i} className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      txn.status === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/15' : 'bg-amber-50 dark:bg-amber-500/15'
                    }`}>
                      {txn.status === 'success'
                        ? <CheckCircle size={20} weight="duotone" className="text-emerald-500" />
                        : <Clock size={20} weight="duotone" className="text-amber-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{txn.fee_type}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <CalendarBlank size={12} /> {formatDate(txn.paid_at)} • {txn.academic_year}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">₹{txn.amount?.toLocaleString('en-IN')}</p>
                      <span className={`text-[10px] font-extrabold uppercase ${
                        txn.status === 'success' ? 'text-emerald-500' : 'text-amber-500'
                      }`}>{txn.status === 'success' ? 'Paid' : 'Pending'}</span>
                    </div>
                    {txn.status === 'success' && (
                      <button
                        onClick={() => downloadReceipt(txn)}
                        className="p-2 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-500 transition-colors flex-shrink-0"
                        title="Download receipt"
                      >
                        <DownloadSimple size={16} weight="bold" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FeePaymentModule;
