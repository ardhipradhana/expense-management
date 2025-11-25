import { ExpenseRequest, OrgMatrix, ApprovalStep } from './types';

export const generateApprovalChain = (
    requesterId: string,
    amount: number,
    matrix: OrgMatrix
): ApprovalStep[] => {
    const chain: ApprovalStep[] = [];
    const requester = matrix.users.find((u) => u.id === requesterId);

    if (!requester) {
        throw new Error('Requester not found');
    }

    // Step 1: Requester (Initiator) - Already done by submission, but good to track
    chain.push({
        approverRole: 'Requester',
        approverId: requester.id,
        status: 'Approved', // Auto-approved upon submission
        actionDate: new Date().toISOString(),
        comment: 'Submitted',
    });

    // Step 2: Manager (N+1)
    if (requester.managerId) {
        const manager = matrix.users.find((u) => u.id === requester.managerId);
        if (manager) {
            chain.push({
                approverRole: 'Manager',
                approverId: manager.id,
                status: 'Pending',
            });
        }
    }

    // Step 3: High Value Checks (CFO/CEO)
    // Note: These are inserted *after* manager, but *before* finance.

    if (amount > matrix.approvalLimits.cfo) {
        const cfo = matrix.users.find((u) => u.role === 'CFO');
        chain.push({
            approverRole: 'CFO',
            approverId: cfo?.id, // Might be undefined if not set, handled in UI
            status: 'Pending',
        });
    }

    if (amount > matrix.approvalLimits.ceo) {
        const ceo = matrix.users.find((u) => u.role === 'CEO');
        chain.push({
            approverRole: 'CEO',
            approverId: ceo?.id,
            status: 'Pending',
        });
    }

    // Step 4: Finance (Finalizer)
    // Finance is a role, not necessarily a specific person ID initially
    chain.push({
        approverRole: 'Finance',
        status: 'Pending',
    });

    return chain;
};

export const getNextStatus = (
    _currentStatus: ExpenseRequest['status'],
    action: 'Approve' | 'Reject',
    currentStepIndex: number,
    chain: ApprovalStep[]
): ExpenseRequest['status'] => {
    if (action === 'Reject') return 'Rejected';

    const nextStep = chain[currentStepIndex + 1];

    if (!nextStep) {
        // No more steps, fully approved
        // The last step is Finance, so if Finance approves, it's FinanceApproved
        return 'FinanceApproved';
    }

    // Map role to status
    switch (nextStep.approverRole) {
        case 'Manager': return 'Submitted'; // Still in submitted/pending manager state
        case 'CFO': return 'ManagerApproved';
        case 'CEO': return 'CFOApproved';
        case 'Finance':
            // If previous was CEO, it's CEOApproved. If previous was CFO, CFOApproved.
            // If previous was Manager, ManagerApproved.
            const prevRole = chain[currentStepIndex].approverRole;
            if (prevRole === 'CEO') return 'CEOApproved';
            if (prevRole === 'CFO') return 'CFOApproved';
            return 'ManagerApproved';
        default: return 'Submitted';
    }
};
