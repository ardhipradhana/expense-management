// GL Accounts data extracted from CSV
// This is a simplified version for the prototype
// In production, this would be loaded from Supabase

export interface GLAccount {
    account_code: string;
    account_name: string;
    category: string;
    group?: string;
}

export const GL_ACCOUNTS: GLAccount[] = [
    // Assets
    { account_code: '1010', account_name: 'Cash and Cash Equivalents', category: 'Asset' },
    { account_code: '1020', account_name: 'Petty Cash', category: 'Asset' },
    { account_code: '1100', account_name: 'Accounts Receivable', category: 'Asset' },
    { account_code: '1110', account_name: 'Allowance for Doubtful Accounts', category: 'Asset' },
    { account_code: '1200', account_name: 'Inventory - Raw Materials', category: 'Asset' },
    { account_code: '1210', account_name: 'Inventory - Work in Process', category: 'Asset' },
    { account_code: '1220', account_name: 'Inventory - Finished Goods', category: 'Asset' },
    { account_code: '1300', account_name: 'Prepaid Expenses', category: 'Asset' },
    { account_code: '1310', account_name: 'Prepaid Insurance', category: 'Asset' },
    { account_code: '1320', account_name: 'Prepaid Rent', category: 'Asset' },
    { account_code: '1400', account_name: 'Office Supplies', category: 'Asset' },
    { account_code: '1500', account_name: 'Equipment', category: 'Asset' },
    { account_code: '1510', account_name: 'Accumulated Depreciation - Equipment', category: 'Asset' },
    { account_code: '1600', account_name: 'Vehicles', category: 'Asset' },
    { account_code: '1610', account_name: 'Accumulated Depreciation - Vehicles', category: 'Asset' },
    { account_code: '1700', account_name: 'Buildings', category: 'Asset' },
    { account_code: '1710', account_name: 'Accumulated Depreciation - Buildings', category: 'Asset' },
    { account_code: '1800', account_name: 'Land', category: 'Asset' },
    { account_code: '1900', account_name: 'Intangible Assets', category: 'Asset' },
    { account_code: '1910', account_name: 'Accumulated Amortization', category: 'Asset' },

    // Liabilities
    { account_code: '2010', account_name: 'Accounts Payable', category: 'Liability' },
    { account_code: '2020', account_name: 'Accrued Expenses', category: 'Liability' },
    { account_code: '2030', account_name: 'Wages Payable', category: 'Liability' },
    { account_code: '2040', account_name: 'Interest Payable', category: 'Liability' },
    { account_code: '2050', account_name: 'Unearned Revenue', category: 'Liability' },
    { account_code: '2100', account_name: 'Short-term Notes Payable', category: 'Liability' },
    { account_code: '2110', account_name: 'Current Portion of Long-term Debt', category: 'Liability' },
    { account_code: '2200', account_name: 'Long-term Debt', category: 'Liability' },
    { account_code: '2300', account_name: 'Mortgage Payable', category: 'Liability' },
    { account_code: '2400', account_name: 'Tax Liabilities', category: 'Liability' },
    { account_code: '2410', account_name: 'Income Tax Payable', category: 'Liability' },
    { account_code: '2420', account_name: 'VAT Payable', category: 'Liability' },
    { account_code: '2430', account_name: 'Payroll Tax Payable', category: 'Liability' },

    // Equity
    { account_code: '3010', account_name: "Owner's Capital", category: 'Equity' },
    { account_code: '3020', account_name: 'Retained Earnings', category: 'Equity' },
    { account_code: '3030', account_name: 'Additional Paid-in Capital', category: 'Equity' },
    { account_code: '3040', account_name: 'Treasury Stock', category: 'Equity' },
    { account_code: '3050', account_name: "Owner's Drawings", category: 'Equity' },

    // Revenue
    { account_code: '4010', account_name: 'Sales Revenue', category: 'Revenue' },
    { account_code: '4020', account_name: 'Service Revenue', category: 'Revenue' },
    { account_code: '4030', account_name: 'Interest Income', category: 'Revenue' },
    { account_code: '4040', account_name: 'Rental Income', category: 'Revenue' },
    { account_code: '4050', account_name: 'Other Income', category: 'Revenue' },
    { account_code: '4060', account_name: 'Sales Discounts', category: 'Revenue' },
    { account_code: '4070', account_name: 'Sales Returns and Allowances', category: 'Revenue' },
    { account_code: '4110', account_name: 'Gain on Sale of Assets', category: 'Revenue' },
    { account_code: '4120', account_name: 'Dividend Income', category: 'Revenue' },
    { account_code: '4130', account_name: 'Foreign Exchange Gain', category: 'Revenue' },

    // Expenses
    { account_code: '5010', account_name: 'Cost of Goods Sold', category: 'Expense' },
    { account_code: '5020', account_name: 'Purchase Discounts', category: 'Expense' },
    { account_code: '5030', account_name: 'Freight In', category: 'Expense' },
    { account_code: '5100', account_name: 'Salaries and Wages', category: 'Expense' },
    { account_code: '5110', account_name: 'Employee Benefits', category: 'Expense' },
    { account_code: '5120', account_name: 'Payroll Tax Expense', category: 'Expense' },
    { account_code: '5130', account_name: 'Workers Compensation Insurance', category: 'Expense' },
    { account_code: '5200', account_name: 'Rent Expense', category: 'Expense' },
    { account_code: '5210', account_name: 'Utilities Expense', category: 'Expense' },
    { account_code: '5220', account_name: 'Insurance Expense', category: 'Expense' },
    { account_code: '5230', account_name: 'Maintenance and Repairs', category: 'Expense' },
    { account_code: '5240', account_name: 'Cleaning Expense', category: 'Expense' },
    { account_code: '5250', account_name: 'Security Expense', category: 'Expense' },
    { account_code: '5300', account_name: 'Marketing and Advertising', category: 'Expense' },
    { account_code: '5310', account_name: 'Website and Digital Marketing', category: 'Expense' },
    { account_code: '5320', account_name: 'Trade Shows and Events', category: 'Expense' },
    { account_code: '5330', account_name: 'Sales Commissions', category: 'Expense' },
    { account_code: '5400', account_name: 'Professional Services', category: 'Expense' },
    { account_code: '5410', account_name: 'Legal Fees', category: 'Expense' },
    { account_code: '5420', account_name: 'Accounting Fees', category: 'Expense' },
    { account_code: '5430', account_name: 'Consulting Fees', category: 'Expense' },
    { account_code: '5440', account_name: 'Bank Charges and Fees', category: 'Expense' },
    { account_code: '5500', account_name: 'Office Supplies', category: 'Expense' },
    { account_code: '5510', account_name: 'Software and Subscriptions', category: 'Expense' },
    { account_code: '5520', account_name: 'Telecommunications', category: 'Expense' },
    { account_code: '5530', account_name: 'Internet and Communication', category: 'Expense' },
    { account_code: '5540', account_name: 'Postage and Shipping', category: 'Expense' },
    { account_code: '5550', account_name: 'Office Equipment Rental', category: 'Expense' },
    { account_code: '5600', account_name: 'Depreciation Expense', category: 'Expense' },
    { account_code: '5610', account_name: 'Amortization Expense', category: 'Expense' },
    { account_code: '5700', account_name: 'Interest Expense', category: 'Expense' },
    { account_code: '5710', account_name: 'Foreign Exchange Loss', category: 'Expense' },
    { account_code: '5720', account_name: 'Bad Debt Expense', category: 'Expense' },
    { account_code: '5800', account_name: 'Travel and Entertainment', category: 'Expense' },
    { account_code: '5810', account_name: 'Vehicle Expenses', category: 'Expense' },
    { account_code: '5820', account_name: 'Fuel Expense', category: 'Expense' },
    { account_code: '5830', account_name: 'Parking and Tolls', category: 'Expense' },
    { account_code: '5900', account_name: 'Training and Development', category: 'Expense' },
    { account_code: '5910', account_name: 'Books and Publications', category: 'Expense' },
    { account_code: '5920', account_name: 'Conference and Seminars', category: 'Expense' },
    { account_code: '5950', account_name: 'Licenses and Permits', category: 'Expense' },
    { account_code: '5960', account_name: 'Donations and Contributions', category: 'Expense' },
    { account_code: '5970', account_name: 'Miscellaneous Expense', category: 'Expense' },
    { account_code: '6010', account_name: 'Income Tax Expense', category: 'Expense' },
    { account_code: '6020', account_name: 'Extraordinary Loss', category: 'Expense' },
    { account_code: '6030', account_name: 'Loss on Sale of Assets', category: 'Expense' },
];

// Helper function to get account display text
export const getAccountDisplay = (code: string): string => {
    const account = GL_ACCOUNTS.find(acc => acc.account_code === code);
    return account ? `${account.account_code} - ${account.account_name}` : code;
};

// Helper function to find account by code
export const findAccountByCode = (code: string): GLAccount | undefined => {
    return GL_ACCOUNTS.find(acc => acc.account_code === code);
};
