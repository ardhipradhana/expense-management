import { ExpenseRequest, AIProposalResponse, AIProposedAccounting } from '../modules/expenses/types';

const N8N_WEBHOOK_URL = 'https://montpro.app.n8n.cloud/webhook/expense-ai-response';

/**
 * Process Finance AI for an expense
 * Calls n8n webhook to get GL account, AP/AR, and journal entry proposals
 */
export async function processFinanceAI(expense: ExpenseRequest): Promise<AIProposedAccounting | null> {
    try {
        console.log('🤖 Processing Finance AI for expense:', expense.id);

        // Prepare request payload
        const payload = {
            expenseId: expense.id,
            vendor: expense.vendor || '',
            category: expense.category,
            amount: expense.amount,
            description: expense.description,
            expenseType: expense.expenseType,
            payTo: expense.payTo,
            reference: expense.reference || '',
            invoiceDate: expense.invoiceDate || expense.date
        };

        // Call n8n webhook
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`n8n webhook failed: ${response.status} ${response.statusText}`);
        }

        const aiResponse: AIProposalResponse = await response.json();

        console.log('✅ AI proposals received:', aiResponse);

        // Convert to AIProposedAccounting format
        const proposedAccounting: AIProposedAccounting = {
            glAccount: aiResponse.glAccount,
            apArTransaction: aiResponse.apArTransaction,
            journalEntry: aiResponse.journalEntry,
            processedAt: new Date().toISOString(),
            status: 'completed'
        };

        return proposedAccounting;

    } catch (error) {
        console.error('❌ Finance AI processing failed:', error);

        // Return failed status
        return {
            glAccount: {
                accountId: '',
                accountCode: '',
                accountName: '',
                confidence: 0,
                reasoning: 'AI processing failed'
            },
            apArTransaction: {
                type: 'AP',
                company: expense.payTo,
                amount: expense.amount,
                dueDate: '',
                reference: expense.reference || ''
            },
            journalEntry: {
                debitAccount: '',
                debitAmount: expense.amount,
                creditAccount: '',
                creditAmount: expense.amount,
                description: expense.description
            },
            processedAt: new Date().toISOString(),
            status: 'failed'
        };
    }
}

/**
 * Mock Finance AI for testing (when n8n is not available)
 */
export async function mockProcessFinanceAI(expense: ExpenseRequest): Promise<AIProposedAccounting> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock GL account based on category
    const glAccountMap: Record<string, { code: string; name: string }> = {
        'Travel': { code: '6100', name: 'Travel Expenses' },
        'Meals': { code: '6200', name: 'Meals & Entertainment' },
        'Office': { code: '6300', name: 'Office Supplies' },
        'Software': { code: '6400', name: 'Software & Subscriptions' },
        'Marketing': { code: '6500', name: 'Marketing Expenses' }
    };

    const glAccount = glAccountMap[expense.category] || { code: '6000', name: 'General Expenses' };

    return {
        glAccount: {
            accountId: `gl_${glAccount.code}`,
            accountCode: glAccount.code,
            accountName: glAccount.name,
            confidence: 0.92,
            reasoning: `Category "${expense.category}" typically maps to ${glAccount.name}`
        },
        apArTransaction: {
            type: expense.expenseType === 'reimbursement' ? 'AP' : 'AP',
            company: expense.payTo,
            amount: expense.amount,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
            reference: expense.reference || expense.id
        },
        journalEntry: {
            debitAccount: `${glAccount.code} - ${glAccount.name}`,
            debitAmount: expense.amount,
            creditAccount: '2100 - Accounts Payable',
            creditAmount: expense.amount,
            description: `${expense.vendor || 'Expense'} - ${expense.description}`
        },
        processedAt: new Date().toISOString(),
        status: 'completed'
    };
}
