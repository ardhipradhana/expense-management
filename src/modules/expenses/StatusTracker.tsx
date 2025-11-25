import React from 'react';
import { ApprovalStep, ExpenseStatus } from './types';

interface Props {
    status: ExpenseStatus;
    approvalChain: ApprovalStep[];
    currentStepIndex: number;
    compact?: boolean;
}

export const StatusTracker: React.FC<Props> = ({ status, approvalChain, currentStepIndex, compact = false }) => {
    // Helper to determine step status color
    const getStepColor = (stepIndex: number, stepStatus: string) => {
        if (status === 'Rejected' && stepIndex === currentStepIndex) return 'bg-red-100 text-red-700 border-red-300';
        if (stepStatus === 'Approved') return 'bg-green-100 text-green-700 border-green-300';
        if (stepStatus === 'Pending' && stepIndex === currentStepIndex) return 'bg-blue-100 text-blue-700 border-blue-300 ring-2 ring-blue-400 ring-opacity-50';
        if (stepStatus === 'Skipped') return 'bg-gray-100 text-gray-400 border-gray-200';
        return 'bg-gray-50 text-gray-500 border-gray-200';
    };

    const getIcon = (stepStatus: string, isCurrent: boolean) => {
        if (status === 'Rejected' && isCurrent) return (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        );
        if (stepStatus === 'Approved') return (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
        );
        if (stepStatus === 'Pending') return (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        );
        return (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
        );
    };

    if (compact) {
        return (
            <div className="flex items-center space-x-1">
                {approvalChain.map((step, index) => {
                    const isCurrent = index === currentStepIndex;
                    let colorClass = 'bg-gray-200';
                    if (step.status === 'Approved') colorClass = 'bg-green-500';
                    if (step.status === 'Rejected') colorClass = 'bg-red-500';
                    if (step.status === 'Pending' && isCurrent) colorClass = 'bg-blue-500 animate-pulse';

                    return (
                        <div
                            key={index}
                            className={`h-2 w-full rounded-full ${colorClass}`}
                            title={`${step.approverRole}: ${step.status}`}
                        />
                    );
                })}
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="flex items-center justify-between relative">
                {/* Connecting Line */}
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-100 -z-10" />

                {approvalChain.map((step, index) => {
                    const isCurrent = index === currentStepIndex;
                    const colorClass = getStepColor(index, step.status);

                    return (
                        <div key={index} className="flex flex-col items-center bg-white px-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${colorClass}`}>
                                {getIcon(step.status, isCurrent)}
                            </div>
                            <span className={`mt-2 text-xs font-medium ${isCurrent ? 'text-blue-700' : 'text-gray-500'}`}>
                                {step.approverRole}
                            </span>
                            {step.status === 'Approved' && step.actionDate && (
                                <span className="text-[10px] text-gray-400 mt-0.5">
                                    {new Date(step.actionDate).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
