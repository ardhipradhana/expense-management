import React, { useState, useMemo } from 'react';
import { User, ExpenseRequest, ExpenseStatus, FinanceApprovalData } from './types';
import { StatusTracker } from './StatusTracker';
import { formatCurrency } from '../../utils/currency';
import { useToast } from '../../components/ToastContext';
import { processFinanceAI } from '../../services/FinanceAIService';
import { FinanceApprovalView } from './FinanceApprovalView';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ApprovalDashboardProps {
    currentUser: User;
    expenses: ExpenseRequest[];
    onUpdateExpense: (expense: ExpenseRequest) => void;
}

export const ApprovalDashboard: React.FC<ApprovalDashboardProps> = ({ currentUser, expenses, onUpdateExpense }) => {
    const { showToast } = useToast();
    const [selectedExpense, setSelectedExpense] = useState<ExpenseRequest | null>(null);
    const [comment, setComment] = useState('');
    const [postToAP, setPostToAP] = useState(false);
    const [postToGL, setPostToGL] = useState(false);
    const [activeTab, setActiveTab] = useState<'my_submissions' | 'my_approvals'>('my_submissions');

    // Search & Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<ExpenseStatus | 'All'>('All');
    const [sortOption, setSortOption] = useState<'DateNewest' | 'DateOldest' | 'AmountHigh' | 'AmountLow'>('DateNewest');

    // --- Derived Data & Filtering ---

    const mySubmissions = useMemo(() => {
        return expenses.filter(e => e.requesterId === currentUser.id);
    }, [expenses, currentUser.id]);

    const myApprovals = useMemo(() => {
        return expenses.filter(e => {
            // Exclude own submissions from approvals
            if (e.requesterId === currentUser.id) return false;

            // 1. Pending my approval
            const currentStep = e.approvalChain[e.currentStepIndex];
            const isPendingForMe = currentStep &&
                currentStep.status === 'Pending' &&
                currentStep.approverRole === currentUser.role &&
                (!currentStep.approverId || currentStep.approverId === currentUser.id);

            // 2. I have acted on it
            const hasActed = e.approvalChain.some(step =>
                step.approverRole === currentUser.role &&
                (step.status === 'Approved' || step.status === 'Rejected') &&
                (!step.approverId || step.approverId === currentUser.id)
            );

            return isPendingForMe || hasActed;
        });
    }, [expenses, currentUser.id, currentUser.role]);

    const currentList = activeTab === 'my_submissions' ? mySubmissions : myApprovals;

    const filteredAndSortedList = useMemo(() => {
        let result = [...currentList];

        // Search
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(e =>
                (e.vendor?.toLowerCase().includes(lowerTerm)) ||
                (e.reference?.toLowerCase().includes(lowerTerm)) ||
                (e.description.toLowerCase().includes(lowerTerm))
            );
        }

        // Filter
        if (filterStatus !== 'All') {
            result = result.filter(e => e.status === filterStatus);
        }

        // Sort
        result.sort((a, b) => {
            switch (sortOption) {
                case 'DateNewest': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                case 'DateOldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                case 'AmountHigh': return b.amount - a.amount;
                case 'AmountLow': return a.amount - b.amount;
                default: return 0;
            }
        });

        return result;
    }, [currentList, searchTerm, filterStatus, sortOption]);

    // --- Widgets Data ---
    const totalPendingAmount = useMemo(() => {
        return myApprovals
            .filter(e => {
                const step = e.approvalChain[e.currentStepIndex];
                return step && step.status === 'Pending' && step.approverRole === currentUser.role;
            })
            .reduce((sum, e) => sum + e.amount, 0);
    }, [myApprovals, currentUser.role]);

    const pendingCount = useMemo(() => {
        return myApprovals.filter(e => {
            const step = e.approvalChain[e.currentStepIndex];
            return step && step.status === 'Pending' && step.approverRole === currentUser.role;
        }).length;
    }, [myApprovals, currentUser.role]);

    const myApprovedAmount = useMemo(() => {
        return myApprovals
            .filter(e => e.approvalChain.some(s => s.approverRole === currentUser.role && s.status === 'Approved'))
            .reduce((sum, e) => sum + e.amount, 0);
    }, [myApprovals, currentUser.role]);

    // --- Actions ---

    const handleAction = (action: 'Approve' | 'Reject') => {
        if (!selectedExpense) return;

        const updatedExpense = { ...selectedExpense };
        const currentStep = updatedExpense.approvalChain[updatedExpense.currentStepIndex];

        if (!currentStep) return;

        // Update current step
        currentStep.status = action === 'Approve' ? 'Approved' : 'Rejected';
        currentStep.actionDate = new Date().toISOString();
        currentStep.comment = comment;
        currentStep.approverId = currentUser.id; // Stamp with actual approver

        if (action === 'Reject') {
            updatedExpense.status = 'Rejected';
            showToast(`Expense rejected.`, 'error');
        } else {
            // Move to next step or Finalize
            if (updatedExpense.currentStepIndex < updatedExpense.approvalChain.length - 1) {
                updatedExpense.currentStepIndex++;
                // Check if next step is auto-skippable or something? For now just move.
                // Update main status if needed (e.g. "ManagerApproved")
                if (currentUser.role === 'Manager') updatedExpense.status = 'ManagerApproved';
                if (currentUser.role === 'CFO') updatedExpense.status = 'CFOApproved';
                if (currentUser.role === 'CEO') updatedExpense.status = 'CEOApproved';

                // 🤖 Trigger Finance AI if moving to Finance stage
                const nextStep = updatedExpense.approvalChain[updatedExpense.currentStepIndex];
                if (nextStep && nextStep.approverRole === 'Finance') {
                    console.log('🤖 Triggering Finance AI for expense:', updatedExpense.id);

                    // Process Finance AI in background (don't wait)
                    processFinanceAI(updatedExpense)
                        .then(proposals => {
                            if (proposals) {
                                updatedExpense.aiProposedAccounting = proposals;
                                onUpdateExpense(updatedExpense);
                                console.log('✅ Finance AI proposals added to expense');
                            }
                        })
                        .catch(error => {
                            console.error('❌ Finance AI failed:', error);
                        });
                }

                showToast(`Expense approved. Forwarded to next approver.`, 'success');
            } else {
                updatedExpense.status = 'FinanceApproved'; // Final
                showToast(`Expense fully approved and processed!`, 'success');

                // Integration Simulation
                if (currentUser.role === 'Finance') {
                    if (postToAP) console.log("Posting to AP/AR...", updatedExpense);
                    if (postToGL) console.log("Posting to GL...", updatedExpense);
                }
            }
        }

        updatedExpense.updatedAt = new Date().toISOString();
        onUpdateExpense(updatedExpense);
        setSelectedExpense(null);
        setComment('');
        setPostToAP(false);
        setPostToGL(false);
    };

    // Finance-specific approval handler
    const handleFinanceApprove = (approvalData: FinanceApprovalData) => {
        if (!selectedExpense) return;

        const updatedExpense = { ...selectedExpense };
        const currentStep = updatedExpense.approvalChain[updatedExpense.currentStepIndex];

        if (!currentStep) return;

        // Update current step
        currentStep.status = 'Approved';
        currentStep.actionDate = new Date().toISOString();
        currentStep.comment = approvalData.comments || '';
        currentStep.approverId = currentUser.id;

        // Final approval
        updatedExpense.status = 'FinanceApproved';
        updatedExpense.updatedAt = new Date().toISOString();

        // Simulate posting to accounting systems
        if (approvalData.createAPTransaction) {
            console.log('📝 Creating AP/AR Transaction:', updatedExpense.aiProposedAccounting?.apArTransaction);
            // TODO: Actual Supabase integration
        }

        if (approvalData.postJournalEntry) {
            console.log('📖 Posting Journal Entry:', updatedExpense.aiProposedAccounting?.journalEntry);
            // TODO: Actual Supabase integration
        }

        onUpdateExpense(updatedExpense);
        setSelectedExpense(null);
        showToast(`Expense approved and posted to accounting!`, 'success');
    };

    // Finance-specific rejection handler
    const handleFinanceReject = (rejectComment: string) => {
        if (!selectedExpense) return;

        const updatedExpense = { ...selectedExpense };
        const currentStep = updatedExpense.approvalChain[updatedExpense.currentStepIndex];

        if (!currentStep) return;

        currentStep.status = 'Rejected';
        currentStep.actionDate = new Date().toISOString();
        currentStep.comment = rejectComment;
        currentStep.approverId = currentUser.id;

        updatedExpense.status = 'Rejected';
        updatedExpense.updatedAt = new Date().toISOString();

        onUpdateExpense(updatedExpense);
        setSelectedExpense(null);
        showToast(`Expense rejected.`, 'error');
    };

    const handleExportCSV = () => {
        const headers = ['ID', 'Date', 'Vendor', 'Reference', 'Category', 'Amount', 'Status', 'Urgency'];
        const rows = filteredAndSortedList.map(e => [
            e.id,
            new Date(e.date).toLocaleDateString(),
            e.vendor || '-',
            e.reference || '-',
            e.category,
            e.amount,
            e.status,
            e.urgency
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `expenses_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('CSV Export downloaded', 'success');
    };

    const handleExportPDF = (expense: ExpenseRequest) => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.setTextColor(41, 128, 185);
        doc.text("Expense Voucher", 105, 20, { align: "center" });

        // Details
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);

        const details = [
            [`ID`, expense.id],
            [`Date`, new Date(expense.date).toLocaleDateString()],
            [`Vendor`, expense.vendor || '-'],
            [`Reference`, expense.reference || '-'],
            [`Category`, expense.category],
            [`Amount`, formatCurrency(expense.amount)],
            [`Tax Amount`, expense.taxAmount ? formatCurrency(expense.taxAmount) : '-'],
            [`Status`, expense.status],
            [`Urgency`, expense.urgency],
            [`Description`, expense.description]
        ];

        (doc as any).autoTable({
            startY: 30,
            head: [['Field', 'Value']],
            body: details,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] }
        });

        // Approval Chain
        const approvals = expense.approvalChain.map(step => [
            step.approverRole,
            step.status,
            step.actionDate ? new Date(step.actionDate).toLocaleDateString() : '-',
            step.comment || '-'
        ]);

        doc.text("Approval History", 14, (doc as any).lastAutoTable.finalY + 15);

        (doc as any).autoTable({
            startY: (doc as any).lastAutoTable.finalY + 20,
            head: [['Role', 'Status', 'Date', 'Comment']],
            body: approvals,
            theme: 'striped'
        });

        doc.save(`expense_${expense.id}.pdf`);
        showToast('PDF Voucher downloaded', 'success');
    };

    // Badges
    const pendingApprovalsCount = myApprovals.filter(e => {
        const step = e.approvalChain[e.currentStepIndex];
        return step && step.status === 'Pending' && step.approverRole === currentUser.role && (!step.approverId || step.approverId === currentUser.id);
    }).length;

    const rejectedCount = mySubmissions.filter(e => e.status === 'Rejected').length;

    return (
        <div className="space-y-8">
            {/* Dashboard Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Pending Your Approval</p>
                        <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
                    </div>
                    <div className="bg-orange-100 p-3 rounded-full text-orange-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Pending Amount</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPendingAmount)}</p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">You Approved (Total)</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(myApprovedAmount)}</p>
                    </div>
                    <div className="bg-green-100 p-3 rounded-full text-green-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Tabs & Controls */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="border-b border-gray-100 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    {/* Tabs */}
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('my_submissions')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'my_submissions' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            My Submissions
                            {rejectedCount > 0 && (
                                <span className="ml-2 bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs">{rejectedCount}</span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('my_approvals')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'my_approvals' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            My Approvals
                            {pendingApprovalsCount > 0 && (
                                <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">{pendingApprovalsCount}</span>
                            )}
                        </button>
                    </div>

                    {/* Search & Actions */}
                    <div className="flex items-center space-x-3 w-full md:w-auto">
                        <select
                            className="border border-gray-200 rounded-lg text-sm py-2 px-3 focus:ring-2 focus:ring-blue-500"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                        >
                            <option value="All">All Status</option>
                            <option value="Submitted">Submitted</option>
                            <option value="ManagerApproved">Manager Approved</option>
                            <option value="CFOApproved">CFO Approved</option>
                            <option value="CEOApproved">CEO Approved</option>
                            <option value="FinanceApproved">Finance Approved</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                        <div className="relative flex-1 md:w-64">
                            <input
                                type="text"
                                placeholder="Search vendor, ref..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>

                        <select
                            className="border border-gray-200 rounded-lg text-sm py-2 px-3 focus:ring-2 focus:ring-blue-500"
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value as any)}
                        >
                            <option value="DateNewest">Newest</option>
                            <option value="DateOldest">Oldest</option>
                            <option value="AmountHigh">Amount: High</option>
                            <option value="AmountLow">Amount: Low</option>
                        </select>

                        <button
                            onClick={handleExportCSV}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Export CSV"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="divide-y divide-gray-100">
                    {filteredAndSortedList.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No expenses found matching your criteria.
                        </div>
                    ) : (
                        filteredAndSortedList.map(expense => {
                            const isPendingForMe = expense.approvalChain[expense.currentStepIndex]?.status === 'Pending' &&
                                expense.approvalChain[expense.currentStepIndex]?.approverRole === currentUser.role &&
                                (!expense.approvalChain[expense.currentStepIndex]?.approverId || expense.approvalChain[expense.currentStepIndex]?.approverId === currentUser.id);

                            const hasActed = expense.approvalChain.some(step =>
                                step.approverRole === currentUser.role &&
                                (step.status === 'Approved' || step.status === 'Rejected') &&
                                (!step.approverId || step.approverId === currentUser.id)
                            );

                            return (
                                <div
                                    key={expense.id}
                                    onClick={() => setSelectedExpense(expense)}
                                    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-start space-x-4">
                                            <div className={`p-3 rounded-lg ${expense.urgency === 'Urgent' ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                                {expense.urgency === 'Urgent' ? (
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center space-x-2">
                                                    <h4 className="font-semibold text-gray-900">{expense.submissionName || expense.vendor || 'Unknown Expense'}</h4>
                                                    {expense.urgency === 'Urgent' && (
                                                        <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">Urgent</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500 mt-0.5">{expense.description}</p>
                                                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                                                    <span>{new Date(expense.date).toLocaleDateString()}</span>
                                                    <span>•</span>
                                                    <span>{expense.category}</span>
                                                    {expense.reference && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="font-mono bg-gray-100 px-1 rounded">{expense.reference}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-gray-900">{formatCurrency(expense.amount)}</p>
                                            <div className="mt-1 flex justify-end space-x-2">
                                                {/* Status Badge */}
                                                {expense.status === 'FinanceApproved' && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        Fully Approved
                                                    </span>
                                                )}
                                                {expense.status === 'Rejected' && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                        Rejected
                                                    </span>
                                                )}
                                                {activeTab === 'my_approvals' && isPendingForMe && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 animate-pulse">
                                                        Action Required
                                                    </span>
                                                )}
                                                {activeTab === 'my_approvals' && hasActed && !isPendingForMe && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                        You Approved/Rejected
                                                    </span>
                                                )}
                                            </div>

                                            {/* Status Tracker (Mini) */}
                                            <div className="mt-2 w-32 ml-auto">
                                                <StatusTracker
                                                    status={expense.status}
                                                    approvalChain={expense.approvalChain}
                                                    currentStepIndex={expense.currentStepIndex}
                                                    compact={true}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Approval Modal/Panel */}
            {selectedExpense && (() => {
                const currentStep = selectedExpense.approvalChain[selectedExpense.currentStepIndex];
                const canApprove = currentStep &&
                    currentStep.status === 'Pending' &&
                    currentStep.approverRole === currentUser.role &&
                    (!currentStep.approverId || currentStep.approverId === currentUser.id);

                // Show Finance Approval View for Finance users who can approve
                if (currentUser.role === 'Finance' && canApprove) {
                    return (
                        <FinanceApprovalView
                            expense={selectedExpense}
                            onApprove={handleFinanceApprove}
                            onReject={handleFinanceReject}
                            onClose={() => setSelectedExpense(null)}
                        />
                    );
                }

                // Show standard approval modal for other users
                return (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
                        onClick={() => setSelectedExpense(null)}
                    >
                        <div
                            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center space-x-3">
                                    <h3 className="text-2xl font-bold text-gray-900">Review Expense</h3>
                                    {selectedExpense.urgency === 'Urgent' && (
                                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold">URGENT</span>
                                    )}
                                </div>
                                <div className="flex items-center space-x-2">
                                    {currentUser.role === 'Finance' && (
                                        <button
                                            onClick={() => handleExportPDF(selectedExpense)}
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                                        >
                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Export PDF
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setSelectedExpense(null)}
                                        className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Status Tracker in Modal */}
                            <div className="mb-8 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <StatusTracker
                                    status={selectedExpense.status}
                                    approvalChain={selectedExpense.approvalChain}
                                    currentStepIndex={selectedExpense.currentStepIndex}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6 mb-8">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendor</label>
                                        <p className="text-lg font-medium text-gray-900">{selectedExpense.vendor || '-'}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</label>
                                        <p className="text-lg font-bold text-gray-900">{formatCurrency(selectedExpense.amount)}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tax Amount</label>
                                        <p className="text-gray-700">{selectedExpense.taxAmount ? formatCurrency(selectedExpense.taxAmount) : '-'}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</label>
                                        <p className="text-gray-700">{selectedExpense.category}</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Reference</label>
                                        <p className="text-gray-700 font-mono bg-gray-100 inline-block px-2 py-0.5 rounded">{selectedExpense.reference || '-'}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice Date</label>
                                        <p className="text-gray-700">{selectedExpense.invoiceDate ? new Date(selectedExpense.invoiceDate).toLocaleDateString() : '-'}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</label>
                                        <p className="text-gray-700">{selectedExpense.dueDate ? new Date(selectedExpense.dueDate).toLocaleDateString() : '-'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-8">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Description</label>
                                <div className="bg-gray-50 p-4 rounded-lg text-gray-700 border border-gray-100">
                                    {selectedExpense.description}
                                </div>
                            </div>

                            {selectedExpense.attachments && selectedExpense.attachments.length > 0 && (
                                <div className="mb-8">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Attachments</label>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedExpense.attachments.map((url, idx) => (
                                            <a
                                                key={idx}
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center p-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                                            >
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                </svg>
                                                Attachment {idx + 1}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {canApprove && (
                                <>
                                    {/* Finance Integration Options */}
                                    {currentUser.role === 'Finance' && (
                                        <div className="bg-blue-50 p-5 rounded-lg mb-8 border border-blue-100">
                                            <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                </svg>
                                                Finance Actions
                                            </h4>
                                            <div className="space-y-3">
                                                <label className="flex items-center space-x-3 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={postToAP}
                                                        onChange={(e) => setPostToAP(e.target.checked)}
                                                        className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                                    />
                                                    <span className="text-gray-700 group-hover:text-gray-900">Post to AP/AR Tracking</span>
                                                </label>
                                                <label className="flex items-center space-x-3 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={postToGL}
                                                        onChange={(e) => setPostToGL(e.target.checked)}
                                                        className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                                    />
                                                    <span className="text-gray-700 group-hover:text-gray-900">Post to Financial Statements (GL)</span>
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Comment</label>
                                        <textarea
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                            rows={3}
                                            placeholder="Add a comment regarding your decision..."
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                        />
                                    </div>

                                    <div className="flex space-x-4 pt-4 border-t border-gray-100">
                                        <button
                                            onClick={() => handleAction('Reject')}
                                            className="flex-1 py-3 px-4 border border-red-200 text-red-700 rounded-lg hover:bg-red-50 hover:border-red-300 transition-all font-medium"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => handleAction('Approve')}
                                            className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-lg transition-all font-medium"
                                        >
                                            {currentUser.role === 'Finance' ? 'Approve & Process' : 'Approve'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};
