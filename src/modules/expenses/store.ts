import { OrgMatrix, User, ExpenseRequest } from './types';

// Initial Mock Data
export const initialUsers: User[] = [
    { id: 'u1', name: 'John Doe', email: 'john@example.com', role: 'Requester', managerId: 'u2' },
    { id: 'u2', name: 'Jane Manager', email: 'jane@example.com', role: 'Manager', managerId: 'u3' },
    { id: 'u3', name: 'Chief Financial', email: 'cfo@example.com', role: 'CFO', managerId: 'u4' },
    { id: 'u4', name: 'Chief Executive', email: 'ceo@example.com', role: 'CEO' },
    { id: 'u5', name: 'Finance Team', email: 'finance@example.com', role: 'Finance' },
];

export const initialOrgMatrix: OrgMatrix = {
    approvalLimits: {
        manager: 1000,
        cfo: 5000,
        ceo: 10000,
    },
    users: initialUsers,
};

export const initialExpenses: ExpenseRequest[] = [];
