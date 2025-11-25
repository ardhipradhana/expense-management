export interface User {
    id: string;
    name: string;
    email: string;
    role: 'Requester' | 'Manager' | 'CFO' | 'CEO' | 'Finance';
    managerId?: string;
}

export interface OrgMatrix {
    approvalLimits: {
        manager: number; // Default limit for manager (e.g. 1000)
        cfo: number;     // Expenses above this go to CFO
        ceo: number;     // Expenses above this go to CEO
    };
    users: User[];
}

export type ExpenseStatus = 'Draft' | 'Submitted' | 'ManagerApproved' | 'CFOApproved' | 'CEOApproved' | 'FinanceApproved' | 'Rejected';

export interface ExpenseRequest {
    id: string;
    requesterId: string;
    amount: number;
    currency: string;
    date: string;
    category: string;
    description: string;
    status: ExpenseStatus;

    // Enhanced fields
    vendor?: string;
    reference?: string;
    taxAmount?: number;
    invoiceDate?: string; // Mandatory
    dueDate?: string;     // Optional
    urgency: 'Urgent' | 'Normal'; // New field

    // Multi-expense submission fields
    expenseType: 'reimbursement' | 'vendor_payment';
    payTo: string; // Who receives the payment
    submissionName?: string; // Optional grouping name

    // AI-Proposed Accounting (Finance approval)
    aiProposedAccounting?: AIProposedAccounting;

    attachments: string[]; // URLs
    createdAt: string;
    updatedAt: string;
    approvalChain: ApprovalStep[];
    currentStepIndex: number;
}

export interface ApprovalStep {
    approverRole: User['role'];
    approverId?: string; // Specific user if known, or any with role
    status: 'Pending' | 'Approved' | 'Rejected' | 'Skipped';
    actionDate?: string;
    comment?: string;
}

// --- Integration Schemas (Provided) ---

export interface GLAccount {
    id: string;
    organization_id: string;
    accounts: string;
    category: string;
    created_at: string;
    updated_at: string;
    gl_groups: string;
}

export interface APARTransaction {
    id: string;
    organization_id: string;
    type: 'AP' | 'AR';
    reference: string;
    company: string;
    description: string;
    amount: number;
    currency: string;
    invoice_date: string;
    due_date: string;
    payment_terms_day: number;
    status: string;
    tax_amount: number;
    tax_rate: number;
    category: string;
    tags: string[];
    notes: string;
    paid_amount: number;
    last_payment_date?: string;
    linked_financial_id?: string;
    source_url?: string;
    source_type?: string;
    embedding?: string;
    created_at: string;
    updated_at: string;
    creator: string;
}

export interface GLTransaction {
    id: string;
    organization_id: string;
    gl_account_id: string;
    ap_ar_transaction_id?: string;
    transaction_date: string;
    account_name: string;
    description: string;
    debit_amount: number;
    credit_amount: number;
    reference: string;
    category: string;
    source: string;
    notes: string;
    is_system_generated: boolean;
    embedding?: string;
    created_at: string;
    updated_at: string;
    account_code: string;
    creator: string;
}

// --- AI Extraction Types ---

export interface ExtractedExpenseData {
    vendor?: string;
    amount?: number;
    taxAmount?: number;
    invoiceDate?: string;
    dueDate?: string;
    reference?: string;
    description?: string;
    category?: string;
    confidence: ConfidenceScores;
    rawText?: string;
    processingTime: number;
}

export interface ConfidenceScores {
    vendor?: number;
    amount?: number;
    taxAmount?: number;
    invoiceDate?: number;
    dueDate?: number;
    reference?: number;
    description?: number;
    category?: number;
}

// Finance AI Proposal Interfaces
export interface AIProposalResponse {
    glAccount: {
        accountId: string;
        accountCode: string;
        accountName: string;
        confidence: number;
        reasoning: string;
    };
    apArTransaction: {
        type: 'AP' | 'AR';
        company: string;
        amount: number;
        dueDate: string;
        reference: string;
    };
    journalEntry: {
        debitAccount: string;
        debitAmount: number;
        creditAccount: string;
        creditAmount: number;
        description: string;
    };
}

export interface AIProposedAccounting {
    glAccount: {
        accountId: string;
        accountCode: string;
        accountName: string;
        confidence: number;
        reasoning: string;
    };
    apArTransaction: {
        type: 'AP' | 'AR';
        company: string;
        amount: number;
        dueDate: string;
        reference: string;
    };
    journalEntry: {
        debitAccount: string;
        debitAmount: number;
        creditAccount: string;
        creditAmount: number;
        description: string;
    };
    processedAt: string;
    status: 'pending' | 'completed' | 'failed';
}

export interface FinanceApprovalData {
    glAccountId: string;
    createAPTransaction: boolean;
    postJournalEntry: boolean;
    comments?: string;
}
