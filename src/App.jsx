import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calculator, IndianRupee, User, 
  ArrowRight, CheckCircle2, RefreshCcw, CreditCard, 
  Briefcase, FileText, PieChart, Info
} from 'lucide-react';
import schema from './data/structuring.json';

// --- STYLES ---
const STYLES = {
  container: { maxWidth: '1300px', margin: '0 auto', padding: '0 1.5rem' },
  card: { background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  sectionTitle: { fontSize: '0.9rem', fontWeight: 700, color: '#475569', marginBottom: '1.25rem', marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f1f5f9', padding: '0.5rem 0.75rem', borderRadius: '8px' },
  input: { width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.875rem', outline: 'none', transition: 'all 0.2s', backgroundColor: '#fffdf2', color: '#64748b' }, 
  tableCell: { padding: '0.6rem 0.75rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem', color: '#475569' },
};

const formatINR = (val) => {
  if (isNaN(val) || val === null) return '₹0';
  const rounded = Math.round(val);
  return rounded < 0 ? `(₹${Math.abs(rounded).toLocaleString('en-IN')})` : `₹${rounded.toLocaleString('en-IN')}`;
};

const App = () => {
  // Initialize state from schema
  const [formData, setFormData] = useState(() => {
    const initialState = {};
    schema.inputs.forEach(input => {
      if (input.key) initialState[input.key] = input.default ?? (input.type === 'text' ? '' : 0);
    });
    return initialState;
  });

  const [results, setResults] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    calculateTax();
  }, [formData]);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? value : (value === 'true' ? true : (value === 'false' ? false : value))
    }));
  };

  const calculateTax = () => {
    // Numeric conversion helper
    const n = (key) => isNaN(parseFloat(formData[key])) ? 0 : parseFloat(formData[key]);

    // Gross Salary Calculation
    const gross = n('basic') + n('da') + n('bonus') + n('hraReceived') + n('specialAllowance') + 
                  n('gift') + n('childEdAllowance') + n('hostelAllowance') + n('mealCard') + 
                  n('motorCar') + n('uniformAllowance') + n('transportAllowance') + 
                  n('employerLoan') + n('chauffeur') + n('employerPF_taxable') + 
                  n('salaryAdjustment') + n('otherIncome');

    // HRA Exemption (Old Regime)
    const hraSal = n('hraSalary') > 0 ? n('hraSalary') : (n('basic') + n('da'));
    const rentEx = Math.max(0, n('rentPaid') - (hraSal * 0.1));
    const metroEx = hraSal * (Boolean(formData.isMetro === true || formData.isMetro === 'true') ? 0.5 : 0.4);
    const hraExemption = Math.min(n('hraReceived'), rentEx, metroEx);

    // Minor Exemptions
    const childEx = Math.min(n('childEdAllowance'), Math.min(2, n('numChildrenEd')) * 100 * 12);
    const hostelEx = Math.min(n('hostelAllowance'), Math.min(2, n('numChildrenHostel')) * 300 * 12);
    const mealEx = Math.min(n('mealCard'), n('mealsPerDay') * 50 * n('workingDays') * n('workingMonths'));
    const uniformEx = n('uniformAllowance'); // Fully exempt if bills provided

    // OLD REGIME CALCULATION
    const oldExemptions = hraExemption + childEx + hostelEx + mealEx + uniformEx + n('gift') + n('employerLoan') + n('ltaExemption');
    const oldDeductions = 50000 + n('professionalTax') + Math.min(150000, n('employeePF') + n('investment80C')) + 
                          Math.min(25000, n('medical80D')) + n('homeLoanInterest') + n('nps80CCD') + n('otherDeductions');
    const taxableOld = Math.max(0, gross - oldExemptions - oldDeductions);

    // NEW REGIME CALCULATION
    const newExemptions = mealEx + n('gift') + uniformEx + n('employerLoan');
    const newDeductions = 75000;
    const taxableNew = Math.max(0, gross - newExemptions - newDeductions);

    const getTax = (income, regime) => {
      let tax = 0;
      if (regime === 'OLD') {
        if (income <= 500000) return 0;
        if (income <= 250000) tax = 0;
        else if (income <= 500000) tax = (income - 250000) * 0.05;
        else if (income <= 1000000) tax = 12500 + (income - 500000) * 0.2;
        else tax = 112500 + (income - 1000000) * 0.3;
      } else {
        if (income <= 700000) return 0;
        if (income <= 300000) tax = 0;
        else if (income <= 600000) tax = (income - 300000) * 0.05;
        else if (income <= 900000) tax = 15000 + (income - 600000) * 0.1;
        else if (income <= 1200000) tax = 45000 + (income - 900000) * 0.15;
        else if (income <= 1500000) tax = 90000 + (income - 1200000) * 0.2;
        else tax = 150000 + (income - 1500000) * 0.3;
      }
      return tax * 1.04;
    };

    const taxOld = getTax(taxableOld, 'OLD');
    const taxNew = getTax(taxableNew, 'NEW');

    setResults({
      gross,
      old: { taxable: taxableOld, tax: taxOld, ex: oldExemptions, ded: oldDeductions },
      new: { taxable: taxableNew, tax: taxNew, ex: newExemptions, ded: newDeductions },
      saving: Math.abs(taxOld - taxNew),
      better: taxOld < taxNew ? 'OLD' : 'NEW'
    });
  };

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '2rem 0' }}>
      <div style={STYLES.container}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 450px', gap: '2rem', alignItems: 'start' }}>
          
          {/* LEFT: INPUT FORM (The Excel Fill-out) */}
          <div style={STYLES.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', borderBottom: '2px solid #94a3b8', paddingBottom: '1rem' }}>
              <div style={{ backgroundColor: '#94a3b8', padding: '0.5rem', borderRadius: '8px' }}><FileText color="white" size={24} /></div>
              <div>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#475569', margin:0 }}>Salary Input Form</h1>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Fill yellow cells for comparison</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.5rem' }}>
              {schema.inputs.map((input, idx) => {
                if (input.section) {
                  return <div key={`s-${idx}`} style={{...STYLES.sectionTitle, gridColumn: '1 / -1'}}>{input.section}</div>;
                }
                return (
                  <div key={input.key} style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>{input.label}</label>
                      <div className="tooltip-trigger" style={{ cursor: 'pointer', color: '#9ca3af' }}><Info size={12} /></div>
                    </div>
                    {input.type === 'select' ? (
                      <select name={input.key} value={formData[input.key]} onChange={handleInputChange} style={STYLES.input}>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    ) : (
                      <input 
                        type={input.type || 'number'} 
                        name={input.key} 
                        value={formData[input.key]} 
                        onChange={handleInputChange} 
                        style={STYLES.input}
                        placeholder={input.hint}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: OUTPUT CALCULATION (The Excel Result) */}
          <div style={{ position: 'sticky', top: '2rem' }}>
            {results && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={STYLES.card}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569' }}>
                    <PieChart size={20} color="#64748b" /> Calculation Summary
                  </h3>
                  
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ flex: 1, padding: '1rem', borderRadius: '12px', background: results.better === 'OLD' ? 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)' : '#f8fafc', color: results.better === 'OLD' ? 'white' : '#64748b', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.8 }}>OLD REGIME</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{formatINR(results.old.tax)}</div>
                    </div>
                    <div style={{ flex: 1, padding: '1rem', borderRadius: '12px', background: results.better === 'NEW' ? 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)' : '#f8fafc', color: results.better === 'NEW' ? 'white' : '#64748b', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.8 }}>NEW REGIME</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{formatINR(results.new.tax)}</div>
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#fff7ed', padding: '1.25rem', borderRadius: '12px', border: '1px solid #ffedd5', textAlign: 'center' }}>
                    <p style={{ color: '#9a3412', fontSize: '0.85rem', fontWeight: 700 }}>Recommended Selection: {results.better === 'OLD' ? 'Old Regime' : 'New Regime'}</p>
                    <h2 style={{ color: '#c2410c', fontSize: '1.75rem', fontWeight: 900, margin: '0.25rem 0' }}>{formatINR(results.saving)} SAVED</h2>
                  </div>
                </div>

                <div style={STYLES.card}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detail Breakdown</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <th style={STYLES.tableCell}>Particulars</th>
                        <th style={{...STYLES.tableCell, textAlign: 'right'}}>Old</th>
                        <th style={{...STYLES.tableCell, textAlign: 'right'}}>New</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td style={STYLES.tableCell}>Gross Salary</td><td style={{...STYLES.tableCell, textAlign: 'right'}}>{formatINR(results.gross)}</td><td style={{...STYLES.tableCell, textAlign: 'right'}}>{formatINR(results.gross)}</td></tr>
                      <tr><td style={STYLES.tableCell}>Exemptions</td><td style={{...STYLES.tableCell, textAlign: 'right', color: '#059669'}}>- {formatINR(results.old.ex)}</td><td style={{...STYLES.tableCell, textAlign: 'right', color: '#059669'}}>- {formatINR(results.new.ex)}</td></tr>
                      <tr><td style={STYLES.tableCell}>Deductions</td><td style={{...STYLES.tableCell, textAlign: 'right', color: '#059669'}}>- {formatINR(results.old.ded)}</td><td style={{...STYLES.tableCell, textAlign: 'right', color: '#059669'}}>- {formatINR(results.new.ded)}</td></tr>
                      <tr style={{ fontWeight: 800, backgroundColor: '#f1f5f9' }}><td style={STYLES.tableCell}>Taxable Income</td><td style={{...STYLES.tableCell, textAlign: 'right'}}>{formatINR(results.old.taxable)}</td><td style={{...STYLES.tableCell, textAlign: 'right'}}>{formatINR(results.new.taxable)}</td></tr>
                      <tr style={{ background: '#f1f5f9', borderLeft: '4px solid #64748b' }}>
                        <td style={{...STYLES.tableCell, fontWeight: 800}}>TAX PAYABLE</td>
                        <td style={{...STYLES.tableCell, textAlign: 'right', fontWeight: 900}}>{formatINR(results.old.tax)}</td>
                        <td style={{...STYLES.tableCell, textAlign: 'right', fontWeight: 900}}>{formatINR(results.new.tax)}</td>
                      </tr>
                      <tr style={{ fontWeight: 800 }}>
                        <td style={STYLES.tableCell}>Advance Tax Paid</td>
                        <td style={{...STYLES.tableCell, textAlign: 'right', color: '#94a3b8'}}>{formatINR(formData.advanceTax)}</td>
                        <td style={{...STYLES.tableCell, textAlign: 'right', color: '#94a3b8'}}>{formatINR(formData.advanceTax)}</td>
                      </tr>
                      <tr style={{ background: '#475569', color: 'white' }}>
                        <td style={{...STYLES.tableCell, borderRadius: '0 0 0 8px'}}>NET DUE / (REFUND)</td>
                        <td style={{...STYLES.tableCell, textAlign: 'right', fontWeight: 900}}>{formatINR(results.old.tax - formData.advanceTax)}</td>
                        <td style={{...STYLES.tableCell, textAlign: 'right', fontWeight: 900, borderRadius: '0 0 8px 0'}}>{formatINR(results.new.tax - formData.advanceTax)}</td>
                      </tr>
                    </tbody>
                  </table>
                  
                  <button onClick={() => setSubmitted(true)} style={{ marginTop: '1.5rem', width: '100%', padding: '1rem', background: '#ff5733', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 14px 0 rgba(255,87,51,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <CreditCard size={18} /> Pay ₹1,000 & File
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {submitted && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{...STYLES.card, textAlign: 'center', maxWidth: '400px'}}>
               <div style={{ background: '#dcfce7', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                 <CheckCircle2 color="#059669" size={32} />
               </div>
               <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827' }}>Filing Scheduled!</h2>
               <p style={{ color: '#6b7280', margin: '0.75rem 0 1.5rem', fontSize: '0.9rem' }}>We've received your salary data. A tax expert will call you shortly to review your filing and structure.</p>
               <button onClick={() => setSubmitted(false)} style={{ background: '#2563eb', color: 'white', width: '100%', padding: '0.75rem', border: 'none', borderRadius: '8px', fontWeight: 700 }}>Great!</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        input:focus { border-color: #2563eb !important; background-color: #f0f7ff !important; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
};

export default App;
