import { useState } from 'react';
import { OrgMatrix, ExpenseRequest, User } from './modules/expenses/types';
import { initialOrgMatrix, initialExpenses } from './modules/expenses/store';
import { OrgMatrixSetup } from './modules/expenses/OrgMatrixSetup';
import { ExpenseForm } from './modules/expenses/ExpenseForm';
import { ApprovalDashboard } from './modules/expenses/ApprovalDashboard';
import { ToastProvider } from './components/ToastContext';

function App() {
    const [activeTab, setActiveTab] = useState<'setup' | 'submit' | 'approvals'>('setup');
    const [orgMatrix, setOrgMatrix] = useState<OrgMatrix>(initialOrgMatrix);
    const [expenses, setExpenses] = useState<ExpenseRequest[]>(initialExpenses);
    const [currentUser, setCurrentUser] = useState<User>(initialOrgMatrix.users[0]);

    const handleSaveMatrix = (newMatrix: OrgMatrix) => {
        setOrgMatrix(newMatrix);
        alert('Settings saved!');
    };

    const handleSubmitExpense = (expense: ExpenseRequest) => {
        setExpenses([...expenses, expense]);
        // Toast will be handled in ExpenseForm, but we can also show one here if needed.
        // For now, we rely on the form's internal logic or pass a callback.
        // But wait, the form needs access to showToast. 
        // Since ExpenseForm is a child of ToastProvider (which we are adding), it can use useToast().
        setActiveTab('approvals');
    };

    const handleUpdateExpense = (updatedExpense: ExpenseRequest) => {
        setExpenses(expenses.map(e => e.id === updatedExpense.id ? updatedExpense : e));
    };

    return (
        <ToastProvider>
            <div className="min-h-screen bg-gray-50">
                {/* Header & Navigation */}
                <header className="bg-white shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <div className="bg-blue-600 p-2 rounded-lg">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">MontPro</h1>
                        </div>

                        <div className="flex space-x-4">
                            <button
                                onClick={() => setActiveTab('setup')}
                                className={`px-3 py-2 rounded-md text-sm font-medium ${activeTab === 'setup' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Settings
                            </button>
                            <button
                                onClick={() => setActiveTab('submit')}
                                className={`px-3 py-2 rounded-md text-sm font-medium ${activeTab === 'submit' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Submit Expense
                            </button>
                            <button
                                onClick={() => setActiveTab('approvals')}
                                className={`px-3 py-2 rounded-md text-sm font-medium ${activeTab === 'approvals' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Approvals
                            </button>
                        </div>

                        {/* User Switcher for Demo */}
                        <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">Simulate User:</span>
                            <select
                                value={currentUser.id}
                                onChange={(e) => {
                                    const user = orgMatrix.users.find(u => u.id === e.target.value);
                                    if (user) setCurrentUser(user);
                                }}
                                className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                            >
                                {orgMatrix.users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {activeTab === 'setup' && (
                        <OrgMatrixSetup data={orgMatrix} onSave={handleSaveMatrix} />
                    )}

                    {activeTab === 'submit' && (
                        <ExpenseForm
                            currentUser={currentUser}
                            orgMatrix={orgMatrix}
                            onSubmit={handleSubmitExpense}
                        />
                    )}

                    {activeTab === 'approvals' && (
                        <ApprovalDashboard
                            currentUser={currentUser}
                            expenses={expenses}
                            onUpdateExpense={handleUpdateExpense}
                        />
                    )}
                </main>
            </div>
        </ToastProvider>
    );
}

export default App;
