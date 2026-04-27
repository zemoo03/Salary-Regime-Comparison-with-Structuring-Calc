/**
 * Combined Tax & Salary Structure Utility (FY 2024-25)
 * Based on Perficios Optimal Structuring Model
 */

export const generateOptimalStructure = (ctc, isMetro, numChildren = 0, numHostelChildren = 0) => {
  const basic = ctc * 0.36;
  const bonus = ctc * 0.09;
  const hra = basic * (isMetro ? 0.5 : 0.4);
  
  // Fixed allowances based on screenshots (assumed optimal values per unit)
  const childEd = Math.min(2, numChildren) * 36000; // 72000 for 2 children
  const hostel = Math.min(2, numHostelChildren) * 108000; // 216000 for 2 children
  const gift = 15000;
  const mealCard = 105600;
  const motorCar = 84000;
  const chauffeur = 36000;
  const uniform = 50000;
  const transport = 300000;

  const usedSoFar = basic + bonus + hra + gift + childEd + hostel + mealCard + motorCar + chauffeur + uniform + transport;
  const specialAllowance = Math.max(0, ctc - usedSoFar);

  return {
    basic,
    bonus,
    hraReceived: hra,
    gift,
    childEd,
    hostel,
    mealCard,
    motorCar,
    chauffeur,
    uniform,
    transport,
    specialAllowance,
    total: basic + bonus + hra + gift + childEd + hostel + mealCard + motorCar + chauffeur + uniform + transport + specialAllowance
  };
};

export const calculateTax = (salaryData) => {
  const safeNum = (v) => isNaN(Number(v)) ? 0 : Number(v);

  const {
    ctc = 3300000,
    rentPaid = 0,
    isMetro = true,
    numChildren = 0,
    numHostelChildren = 0,
    professionalTax = 2500,
    investments80C = 150000,
    healthInsurance80D = 25000,
    homeLoanInterest = 0,
    nps80CCD = 0,
    otherDeductions = 0,
    employerLoan = 200000
  } = salaryData || {};

  const sCTC = safeNum(ctc);
  const sRent = safeNum(rentPaid);

  // Generate the optimal structure based on CTC
  const structure = generateOptimalStructure(sCTC, isMetro, numChildren, numHostelChildren);

  // 1. OLD REGIME CALCULATION
  // Prefer provided basic/da/hraReceived if they exist in salaryData, otherwise use structure
  const currentBasic = safeNum(salaryData.basic) || structure.basic;
  const currentDA = safeNum(salaryData.da);
  const currentHRAReceived = safeNum(salaryData.hraReceived) || structure.hraReceived;
  const hSalary = currentBasic + currentDA;

  const rentMinus10Basic = Math.max(0, sRent - (hSalary * 0.1));
  const basicPct = hSalary * (isMetro ? 0.5 : 0.4);
  const hraExemption = Math.min(currentHRAReceived, rentMinus10Basic, basicPct);

  // Exemptions in Old Regime (Image 3)
  const oldExemptions = [
    hraExemption,
    structure.gift,
    structure.childEd,
    structure.hostel,
    structure.mealCard,
    structure.uniform,
    structure.transport,
    employerLoan // Loan exemption as per image 3
  ].reduce((a, b) => a + b, 0);

  const oldStandardDeduction = 50000;
  const capped80C = Math.min(150000, investments80C);
  const capped80D = Math.min(25000, healthInsurance80D);
  const cappedNPS = Math.min(50000, nps80CCD);

  const totalOldDeductions = oldStandardDeduction + professionalTax + capped80C + capped80D + homeLoanInterest + cappedNPS + otherDeductions;
  const taxableIncomeOld = Math.max(0, sCTC - oldExemptions - totalOldDeductions);

  // 2. NEW REGIME CALCULATION
  const newExemptions = [
    structure.gift,
    structure.mealCard,
    structure.uniform,
    employerLoan
  ].reduce((a, b) => a + b, 0);

  const newStandardDeduction = 75000;
  const taxableIncomeNew = Math.max(0, sCTC - newExemptions - newStandardDeduction);

  // Tax Logic
  const calcTax = (income, regime) => {
    let tax = 0;
    if (regime === 'OLD') {
      if (income <= 500000) return 0; // Rebate 87A
      if (income <= 250000) tax = 0;
      else if (income <= 500000) tax = (income - 250000) * 0.05;
      else if (income <= 1000000) tax = 12500 + (income - 500000) * 0.20;
      else tax = 112500 + (income - 1000000) * 0.30;
    } else {
      // New Regime FY 24-25
      if (income <= 700000) return 0; // Rebate 87A
      if (income <= 300000) tax = 0;
      else if (income <= 700000) tax = (income - 300000) * 0.05;
      else if (income <= 1000000) tax = 20000 + (income - 700000) * 0.10;
      else if (income <= 1200000) tax = 50000 + (income - 1000000) * 0.15;
      else if (income <= 1500000) tax = 80000 + (income - 1200000) * 0.20;
      else tax = 140000 + (income - 1500000) * 0.30;
    }
    const cess = tax * 0.04;
    return tax + cess;
  };

  const oldTax = calcTax(taxableIncomeOld, 'OLD');
  const newTax = calcTax(taxableIncomeNew, 'NEW');

  return {
    structure,
    oldRegime: { taxableIncome: taxableIncomeOld, taxAmount: oldTax, exemptions: oldExemptions, deductions: totalOldDeductions },
    newRegime: { taxableIncome: taxableIncomeNew, taxAmount: newTax, exemptions: newExemptions, deductions: newStandardDeduction },
    recommendation: oldTax < newTax ? 'Old Regime' : 'New Regime',
    savings: Math.abs(oldTax - newTax)
  };
};
