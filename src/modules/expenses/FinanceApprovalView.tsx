import React, { useState, useEffect } from 'react';
import { ExpenseRequest, FinanceApprovalData } from './types';
import { formatCurrency } from '../../utils/currency';
import { processFinanceAI } from '../../services/FinanceAIService';
import { GL_ACCOUNTS } from '../../data/glAccounts';

interface FinanceApprovalViewProps {
    expense: ExpenseRequest;
    onApprove: (data: FinanceApprovalData) => void;
    onReject: (comment: string) => void;
    onClose: () => void;
}

export const FinanceApprovalView: React.FC<FinanceApprovalViewProps> = ({
    expense,
    onApprove,
    onReject,
    onClose
}) => {
    // AI Generation State
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiProposals, setAiProposals] = useState(expense.aiProposedAccounting);

    // Editable Fields State
    const [selectedGLAccount, setSelectedGLAccount] = useState('');
    const [apArType, setApArType] = useState<'AP' | 'AR'>('AP');
    const [apArCompany, setApArCompany] = useState('');
    const [apArAmount, setApArAmount] = useState(0);
    const [apArDueDate, setApArDueDate] = useState('');
    const [debitAccount, setDebitAccount] = useState('');
    const [debitAmount, setDebitAmount] = useState(0);
    const [creditAccount, setCreditAccount] = useState('');
    const [creditAmount, setCreditAmount] = useState(0);
    const [journalDescription, setJournalDescription] = useState('');

    const [createAPTransaction, setCreateAPTransaction] = useState(true);
    const [postJournalEntry, setPostJournalEntry] = useState(true);
    const [comments, setComments] = useState('');

    const isAIAvailable = aiProposals && aiProposals.status === 'completed';

    // Initialize editable fields from AI proposals
    useEffect(() => {
        if (aiProposals && aiProposals.status === 'completed') {
            setSelectedGLAccount(`${aiProposals.glAccount.accountCode} - ${aiProposals.glAccount.accountName}`);
            setApArType(aiProposals.apArTransaction.type);
            setApArCompany(aiProposals.apArTransaction.company);
            setApArAmount(aiProposals.apArTransaction.amount);
            setApArDueDate(aiProposals.apArTransaction.dueDate);
            setDebitAccount(aiProposals.journalEntry.debitAccount);
            setDebitAmount(aiProposals.journalEntry.debitAmount);
            setCreditAccount(aiProposals.journalEntry.creditAccount);
            setCreditAmount(aiProposals.journalEntry.creditAmount);
            setJournalDescription(aiProposals.journalEntry.description);
        } else {
            // Set defaults from expense
            setApArCompany(expense.payTo);
            setApArAmount(expense.amount);
            setDebitAmount(expense.amount);
            setCreditAmount(expense.amount);
            setJournalDescription(`${expense.vendor || 'Expense'} - ${expense.description}`);
        }
    }, [aiProposals, expense]);

    // Manual AI Generation
    const handleGenerateAI = async () => {
        setIsGenerating(true);
        try {
            const proposals = await processFinanceAI(expense);
            if (proposals) {
                setAiProposals(proposals);
            }
        } catch (error) {
            console.error('Failed to generate AI proposals:', error);
            alert('Failed to generate AI proposals. Please enter manually.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleApprove = () => {
        // Validate amounts balance
        if (debitAmount !== creditAmount) {
            alert('Journal entry must balance! Debit and Credit amounts must be equal.');
            return;
        }

        const approvalData: FinanceApprovalData = {
            glAccountId: selectedGLAccount,
            createAPTransaction,
            postJournalEntry,
            comments
        };
        onApprove(approvalData);
    };

    const handleReject = () => {
        if (!comments.trim()) {
            alert('Please provide a reason for rejection');
            return;
        }
        onReject(comments);
    };

    // Confidence color
    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.9) return 'text-green-600';
        if (confidence >= 0.7) return 'text-yellow-600';
        return 'text-orange-600';
    };

    // Check if amounts balance
    const amountsBalance = debitAmount === creditAmount;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                Finance Approval
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                {expense.submissionName || expense.vendor || 'Expense Review'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="px-8 py-6 space-y-6">
                    {/* Expense Details */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">📋 Expense Details</h3>
                        <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-medium text-gray-700">Vendor:</span>
                                <span className="ml-2 text-gray-900">{expense.vendor || '-'}</span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Amount:</span>
                                <span className="ml-2 text-gray-900 font-semibold">{formatCurrency(expense.amount)}</span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Category:</span>
                                <span className="ml-2 text-gray-900">{expense.category}</span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Pay To:</span>
                                <span className="ml-2 text-gray-900">
                                    {expense.payTo}
                                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${expense.expenseType === 'reimbursement'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-green-100 text-green-700'
                                        }`}>
                                        {expense.expenseType === 'reimbursement' ? '💰 Reimbursement' : '🏢 Vendor Payment'}
                                    </span>
                                </span>
                            </div>
                            {expense.reference && (
                                <div>
                                    <span className="font-medium text-gray-700">Reference:</span>
                                    <span className="ml-2 text-gray-900">{expense.reference}</span>
                                </div>
                            )}
                            {expense.description && (
                                <div className="col-span-2">
                                    <span className="font-medium text-gray-700">Description:</span>
                                    <span className="ml-2 text-gray-900">{expense.description}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AI Proposed Accounting or Manual Entry */}
                    {!isAIAvailable && !isGenerating && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                            <p className="text-yellow-800 mb-4">
                                ⚠️ AI proposals not available
                            </p>
                            <button
                                onClick={handleGenerateAI}
                                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
                            >
                                🤖 Generate AI Proposals
                            </button>
                            <p className="text-sm text-gray-600 mt-4">
                                Or enter accounting details manually below
                            </p>
                        </div>
                    )}

                    {isGenerating && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                            <p className="text-blue-800">
                                ⏳ Generating AI proposals...
                            </p>
                        </div>
                    )}

                    {/* Accounting Entry Form (Always Shown, Editable) */}
                    <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            {isAIAvailable ? '🤖 AI-Proposed Accounting (Editable)' : '📝 Manual Accounting Entry'}
                        </h3>

                        {/* GL Account Mapping */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-4">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                                <span className="text-xl mr-2">📊</span>
                                GL Account Mapping
                            </h4>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Expense Account
                                    </label>
                                    <select
                                        value={selectedGLAccount}
                                        onChange={(e) => setSelectedGLAccount(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Select GL Account...</option>
                                        {GL_ACCOUNTS.map((account) => (
                                            <option
                                                key={account.account_code}
                                                value={`${account.account_code} - ${account.account_name}`}
                                            >
                                                {account.account_code} - {account.account_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {isAIAvailable && aiProposals && (
                                    <div className="bg-white bg-opacity-60 rounded p-3 flex items-center justify-between">
                                        <p className="text-xs text-gray-600">
                                            <span className="font-medium">💡 AI Reasoning:</span> {aiProposals.glAccount.reasoning}
                                        </p>
                                        <span className={`text-sm font-semibold ${getConfidenceColor(aiProposals.glAccount.confidence)}`}>
                                            ✓ {Math.round(aiProposals.glAccount.confidence * 100)}% confident
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* AP/AR Transaction */}
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-5 mb-4">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                                <span className="text-xl mr-2">📝</span>
                                AP/AR Transaction (Editable)
                            </h4>

                            <div className="space-y-4">
                                {/* Type Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                                    <div className="flex space-x-4">
                                        <label className="flex items-center cursor-pointer">
                                            <input
                                                type="radio"
                                                value="AP"
                                                checked={apArType === 'AP'}
                                                onChange={() => setApArType('AP')}
                                                className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">AP (Accounts Payable)</span>
                                        </label>
                                        <label className="flex items-center cursor-pointer">
                                            <input
                                                type="radio"
                                                value="AR"
                                                checked={apArType === 'AR'}
                                                onChange={() => setApArType('AR')}
                                                className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">AR (Accounts Receivable)</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Payee/Company</label>
                                        <input
                                            type="text"
                                            value={apArCompany}
                                            onChange={(e) => setApArCompany(e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                                        <input
                                            type="number"
                                            value={apArAmount}
                                            onChange={(e) => setApArAmount(Number(e.target.value))}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                                        <input
                                            type="date"
                                            value={apArDueDate}
                                            onChange={(e) => setApArDueDate(e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        />
                                    </div>
                                </div>

                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={createAPTransaction}
                                        onChange={(e) => setCreateAPTransaction(e.target.checked)}
                                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        Create {apArType} Transaction on approval
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Journal Entry */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-5">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                                <span className="text-xl mr-2">📖</span>
                                Journal Entry (Editable)
                            </h4>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Debit Account</label>
                                        <select
                                            value={debitAccount}
                                            onChange={(e) => setDebitAccount(e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        >
                                            <option value="">Select Account...</option>
                                            {GL_ACCOUNTS.map((account) => (
                                                <option
                                                    key={account.account_code}
                                                    value={`${account.account_code} - ${account.account_name}`}
                                                >
                                                    {account.account_code} - {account.account_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Debit Amount</label>
                                        <input
                                            type="number"
                                            value={debitAmount}
                                            onChange={(e) => setDebitAmount(Number(e.target.value))}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Credit Account</label>
                                        <select
                                            value={creditAccount}
                                            onChange={(e) => setCreditAccount(e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        >
                                            <option value="">Select Account...</option>
                                            {GL_ACCOUNTS.map((account) => (
                                                <option
                                                    key={account.account_code}
                                                    value={`${account.account_code} - ${account.account_name}`}
                                                >
                                                    {account.account_code} - {account.account_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Credit Amount</label>
                                        <input
                                            type="number"
                                            value={creditAmount}
                                            onChange={(e) => setCreditAmount(Number(e.target.value))}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                    <input
                                        type="text"
                                        value={journalDescription}
                                        onChange={(e) => setJournalDescription(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    />
                                </div>

                                {/* Balance Warning */}
                                {!amountsBalance && (
                                    <div className="bg-red-50 border border-red-200 rounded p-3 flex items-center space-x-2">
                                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <span className="text-sm font-medium text-red-800">
                                            ⚠️ Journal entry must balance! Debit ({formatCurrency(debitAmount)}) ≠ Credit ({formatCurrency(creditAmount)})
                                        </span>
                                    </div>
                                )}

                                {amountsBalance && (debitAmount > 0 || creditAmount > 0) && (
                                    <div className="bg-green-50 border border-green-200 rounded p-3 flex items-center space-x-2">
                                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className="text-sm font-medium text-green-800">
                                            ✓ Journal entry balanced!
                                        </span>
                                    </div>
                                )}

                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={postJournalEntry}
                                        onChange={(e) => setPostJournalEntry(e.target.checked)}
                                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        Post to General Ledger on approval
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Finance Comments */}
                    <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">💬 Finance Comments (Optional)</h3>
                        <textarea
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            rows={3}
                            placeholder="Add any comments or notes..."
                        />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-8 py-4 flex justify-between items-center">
                    <button
                        onClick={handleReject}
                        className="px-6 py-3 bg-white border-2 border-red-300 text-red-700 font-semibold rounded-lg hover:bg-red-50 transition-all"
                    >
                        ← Reject
                    </button>
                    <button
                        onClick={handleApprove}
                        disabled={!amountsBalance}
                        className={`px-8 py-3 font-semibold rounded-lg shadow-lg transition-all transform ${amountsBalance
                            ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-xl hover:-translate-y-0.5'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        Approve & Post to Accounting →
                    </button>
                </div>
            </div>
        </div>
    );
};
