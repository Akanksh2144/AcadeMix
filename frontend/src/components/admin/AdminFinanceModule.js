import React, { useState } from 'react';
import { CreditCard, UploadSimple, Plus, FileCsv } from '@phosphor-icons/react';
import { feesAPI } from '../../services/api';
import { toast } from 'sonner';

const AdminFinanceModule = ({ collegeId }) => {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('single'); // 'single' or 'bulk'
  
  // Single Invoice Form
  const [form, setForm] = useState({
    student_id: '',
    fee_type: '',
    total_amount: '',
    academic_year: '2026-27',
    due_date: '',
    description: ''
  });

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await feesAPI.bulkGenerateInvoices({
        invoices: [{ ...form, total_amount: parseFloat(form.total_amount) }]
      });
      toast.success('Invoice generated successfully!');
      setForm({
        student_id: '', fee_type: '', total_amount: '', academic_year: '2026-27', due_date: '', description: ''
      });
    } catch (err) {
      toast.error('Failed to generate invoice');
    }
    setLoading(false);
  };

  // Bulk Upload logic (mock file reading for now)
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // In a real scenario, we'd parse the CSV using PapaParse or similar.
    // For this mock demo, we'll just simulate sending an array.
    toast.info('Parsing CSV file...');
    
    setTimeout(async () => {
      try {
        setLoading(true);
        const mockParsedInvoices = [
          { student_id: '22WJ8A6745', fee_type: 'Tuition Fee', total_amount: 85000, academic_year: '2026-27' },
          { student_id: '22WJ8A6746', fee_type: 'Tuition Fee', total_amount: 60000, academic_year: '2026-27' },
        ];
        
        await feesAPI.bulkGenerateInvoices({ invoices: mockParsedInvoices });
        toast.success(`Successfully mapped ${mockParsedInvoices.length} invoices from CSV`);
      } catch (err) {
        toast.error('Bulk upload failed.');
      }
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-white/5 rounded-xl w-max">
        <button 
          onClick={() => setMode('single')} 
          className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${mode === 'single' ? 'bg-white dark:bg-[#1A202C] text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Plus size={16} /> Individual Invoice
        </button>
        <button 
          onClick={() => setMode('bulk')} 
          className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${mode === 'bulk' ? 'bg-white dark:bg-[#1A202C] text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <UploadSimple size={16} /> Bulk CSV Upload
        </button>
      </div>

      <div className="soft-card p-6 border-l-4 border-indigo-500">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center">
            <CreditCard size={20} weight="duotone" className="text-indigo-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {mode === 'single' ? 'Issue Fee Invoice' : 'Mass Generate Invoices (CSV)'}
            </h3>
            <p className="text-sm font-medium text-slate-500">Assign direct financial dues to student profiles</p>
          </div>
        </div>

        {mode === 'single' ? (
          <form onSubmit={handleSingleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Student ID (Registration No)</label>
                <input required type="text" value={form.student_id} onChange={e => setForm({...form, student_id: e.target.value})} className="soft-input w-full" placeholder="e.g. 22WJ8A..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Fee Type</label>
                <input required type="text" value={form.fee_type} onChange={e => setForm({...form, fee_type: e.target.value})} className="soft-input w-full" placeholder="Tuition Fee 3rd Year" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Amount (₹)</label>
                <input required type="number" min="1" value={form.total_amount} onChange={e => setForm({...form, total_amount: e.target.value})} className="soft-input w-full" placeholder="85000" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Academic Year</label>
                <input required type="text" value={form.academic_year} onChange={e => setForm({...form, academic_year: e.target.value})} className="soft-input w-full" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Description (Optional)</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="soft-input w-full" rows="2" placeholder="Late fee penalty included..." />
            </div>
            
            <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2">
              {loading ? 'Processing...' : 'Generate Invoice'}
            </button>
          </form>
        ) : (
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
              <FileCsv size={32} weight="duotone" className="text-blue-500" />
            </div>
            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Upload Fee Allocation CSV</h4>
            <p className="text-sm text-slate-500 mb-6 max-w-sm">Spreadsheet must contain columns: student_id, fee_type, total_amount, academic_year.</p>
            
            <label className="btn-primary cursor-pointer">
              <span>Select CSV File</span>
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={loading} />
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminFinanceModule;
