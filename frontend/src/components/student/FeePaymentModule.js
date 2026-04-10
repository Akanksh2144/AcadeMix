import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, CheckCircle, WarningOctagon, Clock, ArrowRight } from '@phosphor-icons/react';
import { feesAPI } from '../../services/api';

const FeePaymentModule = ({ user }) => {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchDueFees();
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

  return (
    <div className="space-y-6">
      {message.text && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-bold ${message.type === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'}`}>
          {message.type === 'error' ? <WarningOctagon size={20} /> : <CheckCircle size={20} />}
          {message.text}
        </div>
      )}

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
    </div>
  );
};

export default FeePaymentModule;
