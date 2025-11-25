import React, { useState, useRef, useEffect } from 'react';
import { User, OrgMatrix, ExpenseRequest, ConfidenceScores } from './types';
import { useToast } from '../../components/ToastContext';
import { extractExpenseFromFiles, mockExtractExpenseFromFiles } from '../../services/AIExtractionService';

interface ExpenseFormProps {
    currentUser: User;
    orgMatrix: OrgMatrix;
    onSubmit: (expense: ExpenseRequest) => void;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ currentUser, orgMatrix, onSubmit }) => {
    const { showToast } = useToast();
    const [amount, setAmount] = useState<number>(0);
    const [category, setCategory] = useState<string>('Travel');
    const [description, setDescription] = useState<string>('');
    const [date] = useState<string>(new Date().toISOString().split('T')[0]);

    // New Fields
    const [vendor, setVendor] = useState<string>('');
    const [reference, setReference] = useState<string>('');
    const [taxAmount, setTaxAmount] = useState<number>(0);
    const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState<string>('');
    const [attachments, setAttachments] = useState<string[]>([]);
    const [urgency, setUrgency] = useState<'Normal' | 'Urgent'>('Normal');

    // AI Extraction State
    const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [aiExtracted, setAiExtracted] = useState(false);
    const [confidenceScores, setConfidenceScores] = useState<ConfidenceScores | null>(null);
    const [overallConfidence, setOverallConfidence] = useState<number>(0);

    // Multi-Expense Submission State
    const [submissionName, setSubmissionName] = useState<string>('');
    const [expenseType, setExpenseType] = useState<'reimbursement' | 'vendor_payment'>('reimbursement');
    const [payTo, setPayTo] = useState<string>(currentUser.name);
    const [draftExpenses, setDraftExpenses] = useState<ExpenseRequest[]>([]);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showAddAnotherModal, setShowAddAnotherModal] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            const newAttachments = newFiles.map(file => URL.createObjectURL(file));

            setAttachmentFiles([...attachmentFiles, ...newFiles]);
            setAttachments([...attachments, ...newAttachments]);
            setAiExtracted(false); // Reset AI state when new files added
        }
    };

    const handleRemoveAttachment = (index: number) => {
        const newAttachments = attachments.filter((_, idx) => idx !== index);
        const newFiles = attachmentFiles.filter((_, idx) => idx !== index);
        setAttachments(newAttachments);
        setAttachmentFiles(newFiles);

        // Reset AI extraction if all files removed
        if (newAttachments.length === 0) {
            setAiExtracted(false);
            setConfidenceScores(null);
            setOverallConfidence(0);
        }
    };

    const calculateOverallConfidence = (scores: ConfidenceScores): number => {
        // Get all values that are numbers AND greater than 0
        // This excludes fields where AI couldn't extract data (confidence = 0)
        const values = Object.values(scores).filter((v): v is number => typeof v === 'number' && v > 0);

        if (values.length === 0) return 0;

        const average = values.reduce((sum, val) => sum + val, 0) / values.length;
        return Math.round(average * 100);
    };

    // Auto-update Pay To based on expense type
    useEffect(() => {
        if (expenseType === 'reimbursement') {
            setPayTo(currentUser.name);
        } else if (expenseType === 'vendor_payment' && vendor) {
            setPayTo(vendor);
        }
    }, [expenseType, vendor, currentUser.name]);

    const handleAIExtraction = async () => {
        if (attachmentFiles.length === 0) {
            showToast('Please upload files first', 'warning');
            return;
        }

        setIsProcessing(true);

        try {
            // Calling real API - sends to n8n webhook
            const result = await extractExpenseFromFiles({
                files: attachmentFiles,
                userId: currentUser.id,
                currency: 'IDR'
            });

            if (result.success && result.data) {
                // Auto-fill form fields with AI suggestions
                if (result.data.vendor) setVendor(result.data.vendor);
                if (result.data.amount) setAmount(result.data.amount);
                if (result.data.taxAmount) setTaxAmount(result.data.taxAmount);
                if (result.data.invoiceDate) setInvoiceDate(result.data.invoiceDate);
                if (result.data.dueDate) setDueDate(result.data.dueDate);
                if (result.data.reference) setReference(result.data.reference);
                if (result.data.description) setDescription(result.data.description);
                if (result.data.category) setCategory(result.data.category);

                setConfidenceScores(result.data.confidence);
                setOverallConfidence(calculateOverallConfidence(result.data.confidence));
                setAiExtracted(true);

                showToast('Details extracted successfully! Please review.', 'success');
            } else {
                showToast(result.error?.message || 'Failed to extract details', 'error');
            }
        } catch (error) {
            console.error('AI Extraction Error:', error);
            showToast('Failed to process receipt. Please try again.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    // Helper function to build expense object from current form state
    const buildExpenseObject = (): ExpenseRequest => {
        const manager = orgMatrix.users.find(u => u.id === currentUser.managerId);
        const chain: any[] = [];

        if (manager) {
            chain.push({
                approverRole: 'Manager',
                approverId: manager.id,
                status: 'Pending'
            });
        }

        if (amount > orgMatrix.approvalLimits.manager) {
            chain.push({
                approverRole: 'CFO',
                status: 'Pending'
            });
        }

        if (amount > orgMatrix.approvalLimits.cfo) {
            chain.push({
                approverRole: 'CEO',
                status: 'Pending'
            });
        }

        chain.push({
            approverRole: 'Finance',
            status: 'Pending'
        });

        return {
            id: Math.random().toString(36).substr(2, 9),
            requesterId: currentUser.id,
            amount,
            currency: 'IDR',
            date,
            category,
            description,
            status: 'Submitted',
            vendor,
            reference,
            taxAmount,
            invoiceDate,
            dueDate,
            urgency,
            expenseType,
            payTo,
            submissionName,
            attachments,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            approvalChain: chain,
            currentStepIndex: 0
        };
    };

    // Reset form to blank state (keep submission name)
    const resetForm = () => {
        setAmount(0);
        setDescription('');
        setVendor('');
        setReference('');
        setTaxAmount(0);
        setCategory('Travel');
        setDueDate('');
        setAttachments([]);
        setAttachmentFiles([]);
        setUrgency('Normal');
        setAiExtracted(false);
        setConfidenceScores(null);
        setOverallConfidence(0);
        // Keep submissionName and expenseType
    };

    // Handle "Add Another" button click
    const handleAddAnother = () => {
        const currentExpense = buildExpenseObject();
        setDraftExpenses([...draftExpenses, currentExpense]);
        setShowAddAnotherModal(true);
    };

    // Handle "Duplicate This" option
    const handleDuplicate = () => {
        // Keep vendor, category, expense type, pay to
        // Clear amount, description, reference, attachments
        setAmount(0);
        setDescription('');
        setReference('');
        setAttachments([]);
        setAttachmentFiles([]);
        setAiExtracted(false);
        setConfidenceScores(null);
        setOverallConfidence(0);
        setShowAddAnotherModal(false);
        showToast('Form duplicated! Update the amount and details.', 'success');
    };

    // Handle "New Blank" option
    const handleNewBlank = () => {
        resetForm();
        setShowAddAnotherModal(false);
        showToast('New blank form ready!', 'success');
    };

    // Handle "Review & Submit" - show review modal
    const handleReviewAndSubmit = () => {
        const currentExpense = buildExpenseObject();
        setDraftExpenses([...draftExpenses, currentExpense]);
        setShowReviewModal(true);
    };

    // Handle editing an expense from review modal
    const handleEdit = (index: number) => {
        const expense = draftExpenses[index];

        // Load expense data back into form
        setAmount(expense.amount);
        setVendor(expense.vendor || '');
        setCategory(expense.category);
        setDescription(expense.description);
        setReference(expense.reference || '');
        setTaxAmount(expense.taxAmount || 0);
        setInvoiceDate(expense.invoiceDate || '');
        setDueDate(expense.dueDate || '');
        setUrgency(expense.urgency);
        setExpenseType(expense.expenseType);
        setPayTo(expense.payTo);
        setAttachments(expense.attachments);

        // Remove from drafts (will be re-added when user clicks Add Another or Submit)
        setDraftExpenses(draftExpenses.filter((_, idx) => idx !== index));
        setEditingIndex(index);
        setShowReviewModal(false);

        showToast('Expense loaded for editing', 'info');
    };

    // Handle removing an expense from drafts
    const handleRemove = (index: number) => {
        setDraftExpenses(draftExpenses.filter((_, idx) => idx !== index));
        showToast('Expense removed from drafts', 'info');

        // Close modal if no expenses left
        if (draftExpenses.length === 1) {
            setShowReviewModal(false);
        }
    };

    // Handle submitting all expenses from review modal
    const handleSubmitAll = () => {
        draftExpenses.forEach(expense => onSubmit(expense));
        showToast(`${draftExpenses.length} expenses submitted successfully!`, 'success');

        // Clear everything
        setDraftExpenses([]);
        setShowReviewModal(false);
        resetForm();
        setSubmissionName('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const currentExpense = buildExpenseObject();

        // If there are drafts, submit all including current
        if (draftExpenses.length > 0) {
            const allExpenses = [...draftExpenses, currentExpense];
            allExpenses.forEach(expense => onSubmit(expense));
            showToast(`${allExpenses.length} expenses submitted successfully!`, 'success');
            setDraftExpenses([]);
        } else {
            // Single expense submission
            onSubmit(currentExpense);
            showToast('Expense submitted successfully!', 'success');
        }

        // Reset form completely
        resetForm();
        setSubmissionName('');
    };

    return (
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-6">
                <h2 className="text-2xl font-bold text-white">Submit New Expense</h2>
                <p className="text-blue-100 mt-1">Fill in the details below to process your reimbursement.</p>
            </div>

            {/* Processing Overlay */}
            {isProcessing && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl p-8 max-w-md text-center shadow-2xl">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Receipt...</h3>
                        <p className="text-gray-600">AI is extracting expense details from your attachments</p>
                        <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-purple-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span>Powered by AI</span>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="p-8">
                {/* AI Extracted Badge */}
                {aiExtracted && (
                    <div className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <svg className="w-6 h-6 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-purple-900">AI-Extracted Details ✨</p>
                                <p className="text-xs text-purple-700 mt-0.5">Please review and edit as needed before submitting</p>
                            </div>
                        </div>
                        <div className={`px-3 py-1.5 rounded-full font-semibold text-sm flex items-center space-x-1 ${overallConfidence >= 90 ? 'bg-green-100 text-green-700' :
                            overallConfidence >= 70 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-orange-100 text-orange-700'
                            }`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{overallConfidence}% confident</span>
                        </div>
                    </div>
                )}

                {/* Submission Name Field */}
                <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Submission Name (Optional)
                    </label>
                    <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        value={submissionName}
                        onChange={(e) => setSubmissionName(e.target.value)}
                        placeholder="e.g., Business Trip - Jakarta Nov 2025"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Group multiple related expenses under one submission name
                    </p>
                </div>

                {/* Expense Type Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Expense Type
                    </label>
                    <div className="space-y-3">
                        <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${expenseType === 'reimbursement' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                            <input
                                type="radio"
                                name="expenseType"
                                value="reimbursement"
                                checked={expenseType === 'reimbursement'}
                                onChange={() => setExpenseType('reimbursement')}
                                className="mr-3"
                            />
                            <div>
                                <p className="font-medium text-gray-900">💰 Reimbursement</p>
                                <p className="text-xs text-gray-600">I paid with my own money and need reimbursement</p>
                            </div>
                        </label>

                        <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${expenseType === 'vendor_payment' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                            <input
                                type="radio"
                                name="expenseType"
                                value="vendor_payment"
                                checked={expenseType === 'vendor_payment'}
                                onChange={() => setExpenseType('vendor_payment')}
                                className="mr-3"
                            />
                            <div>
                                <p className="font-medium text-gray-900">🏢 Vendor Payment</p>
                                <p className="text-xs text-gray-600">Company pays vendor directly (invoice/bill)</p>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column */}
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Vendor / Payee</label>
                            <input
                                type="text"
                                required
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                value={vendor}
                                onChange={(e) => setVendor(e.target.value)}
                                placeholder="e.g. Amazon AWS, Delta Airlines"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Pay To
                                {expenseType === 'reimbursement' && (
                                    <span className="ml-2 text-xs text-blue-600">(Auto-filled with your name)</span>
                                )}
                                {expenseType === 'vendor_payment' && (
                                    <span className="ml-2 text-xs text-blue-600">(Auto-filled with vendor name)</span>
                                )}
                            </label>
                            <input
                                type="text"
                                required
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50"
                                value={payTo}
                                onChange={(e) => setPayTo(e.target.value)}
                                placeholder="Who should receive the payment?"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {expenseType === 'reimbursement'
                                    ? 'This is who will be reimbursed'
                                    : 'This is who Finance will pay directly'}
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Total Amount (IDR)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-gray-500 font-medium">Rp</span>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono text-lg"
                                    value={amount}
                                    onChange={(e) => setAmount(parseFloat(e.target.value))}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Invoice Date</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    value={invoiceDate}
                                    onChange={(e) => setInvoiceDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Due Date (Optional)</label>
                                <input
                                    type="date"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Urgency</label>
                            <div className="flex space-x-4">
                                <label className={`flex-1 cursor-pointer p-3 rounded-lg border-2 text-center transition-all ${urgency === 'Normal' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}>
                                    <input
                                        type="radio"
                                        name="urgency"
                                        value="Normal"
                                        checked={urgency === 'Normal'}
                                        onChange={() => setUrgency('Normal')}
                                        className="hidden"
                                    />
                                    <span className="font-medium">Normal</span>
                                </label>
                                <label className={`flex-1 cursor-pointer p-3 rounded-lg border-2 text-center transition-all ${urgency === 'Urgent' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 hover:border-gray-300'}`}>
                                    <input
                                        type="radio"
                                        name="urgency"
                                        value="Urgent"
                                        checked={urgency === 'Urgent'}
                                        onChange={() => setUrgency('Urgent')}
                                        className="hidden"
                                    />
                                    <span className="font-medium">Urgent ⚡</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Reference / Invoice #</label>
                            <input
                                type="text"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                placeholder="e.g. INV-2023-001"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                            <select
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                            >
                                <option value="Travel">Travel & Transportation</option>
                                <option value="Meals">Meals & Entertainment</option>
                                <option value="Software">Software & Subscriptions</option>
                                <option value="Office">Office Supplies</option>
                                <option value="Training">Training & Education</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Tax Amount (Optional)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-gray-500 font-medium">Rp</span>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    value={taxAmount}
                                    onChange={(e) => setTaxAmount(parseFloat(e.target.value))}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Attachments</label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <input
                                    type="file"
                                    multiple
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <p className="mt-1 text-sm text-gray-600">Click to upload or drag and drop</p>
                                <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                            </div>
                            {attachments.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    {attachments.map((_, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg group hover:bg-blue-100 transition-colors">
                                            <div className="flex items-center text-sm text-blue-600">
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                </svg>
                                                <span className="font-medium">Attachment {idx + 1}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveAttachment(idx)}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-100 p-1 rounded transition-colors"
                                                title="Remove attachment"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* AI Extraction Button */}
                            {attachments.length > 0 && !aiExtracted && (
                                <button
                                    type="button"
                                    onClick={handleAIExtraction}
                                    disabled={isProcessing}
                                    className="mt-3 w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center justify-center space-x-2 font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isProcessing ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            <span>Processing with AI...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            <span>Extract Details with AI ✨</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <textarea
                        required
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe the business purpose of this expense..."
                    />
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                        {draftExpenses.length > 0 && (
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                                {draftExpenses.length} expense{draftExpenses.length > 1 ? 's' : ''} in draft
                            </span>
                        )}
                    </div>

                    <div className="flex space-x-3">
                        <button
                            type="button"
                            onClick={handleAddAnother}
                            className="px-6 py-3 bg-purple-100 text-purple-700 font-semibold rounded-lg hover:bg-purple-200 transition-all flex items-center space-x-2"
                        >
                            <span>➕</span>
                            <span>Add Another</span>
                        </button>

                        <button
                            type={draftExpenses.length > 0 ? "button" : "submit"}
                            onClick={draftExpenses.length > 0 ? handleReviewAndSubmit : undefined}
                            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                        >
                            {draftExpenses.length > 0
                                ? `Review & Submit (${draftExpenses.length + 1})`
                                : 'Submit Expense Request'
                            }
                        </button>
                    </div>
                </div>
            </form>

            {/* Add Another Modal */}
            {showAddAnotherModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Add Another Expense</h3>
                        <p className="text-sm text-gray-600 mb-6">Current expense saved to drafts. What would you like to do next?</p>

                        <div className="space-y-3">
                            <button
                                onClick={handleDuplicate}
                                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                            >
                                <div className="flex items-start space-x-3">
                                    <span className="text-2xl">📋</span>
                                    <div>
                                        <p className="font-semibold text-gray-900">Duplicate This</p>
                                        <p className="text-xs text-gray-600">Keep vendor, category, and expense type</p>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={handleNewBlank}
                                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                            >
                                <div className="flex items-start space-x-3">
                                    <span className="text-2xl">✨</span>
                                    <div>
                                        <p className="font-semibold text-gray-900">New Blank</p>
                                        <p className="text-xs text-gray-600">Start fresh with empty form</p>
                                    </div>
                                </div>
                            </button>
                        </div>

                        <button
                            onClick={() => setShowAddAnotherModal(false)}
                            className="mt-4 w-full py-2 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Review Modal */}
            {showReviewModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-8 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Review Expenses {submissionName && `- ${submissionName}`}
                        </h2>
                        <p className="text-gray-600 mb-6">
                            {draftExpenses.length} expense{draftExpenses.length > 1 ? 's' : ''} ready to submit
                        </p>

                        {/* Expense List */}
                        <div className="space-y-3 mb-6">
                            {draftExpenses.map((expense, idx) => (
                                <div key={idx} className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-all">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <h4 className="text-lg font-semibold text-gray-900">
                                                    {expense.vendor || 'No Vendor'}
                                                </h4>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${expense.expenseType === 'reimbursement'
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-green-100 text-green-700'
                                                    }`}>
                                                    {expense.expenseType === 'reimbursement' ? '💰 Reimbursement' : '🏢 Vendor Payment'}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                                <div><span className="font-medium">Amount:</span> Rp {expense.amount.toLocaleString()}</div>
                                                <div><span className="font-medium">Category:</span> {expense.category}</div>
                                                <div><span className="font-medium">Date:</span> {expense.invoiceDate}</div>
                                                <div><span className="font-medium">Pay To:</span> {expense.payTo}</div>
                                                {expense.reference && (
                                                    <div><span className="font-medium">Reference:</span> {expense.reference}</div>
                                                )}
                                                {expense.description && (
                                                    <div className="col-span-2"><span className="font-medium">Description:</span> {expense.description}</div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex space-x-2 ml-4">
                                            <button
                                                onClick={() => handleEdit(idx)}
                                                className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium text-sm"
                                                title="Edit expense"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleRemove(idx)}
                                                className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium text-sm"
                                                title="Remove expense"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Total */}
                        <div className="border-t-2 border-gray-200 pt-4 mb-6">
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-semibold text-gray-700">Total Amount:</span>
                                <span className="text-2xl font-bold text-blue-600">
                                    Rp {draftExpenses.reduce((sum, exp) => sum + exp.amount, 0).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-between items-center">
                            <button
                                onClick={() => setShowReviewModal(false)}
                                className="px-6 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                            >
                                ← Add More Expenses
                            </button>
                            <button
                                onClick={handleSubmitAll}
                                className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                            >
                                Submit All ({draftExpenses.length}) →
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
