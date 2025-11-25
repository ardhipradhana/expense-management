import React, { useState } from 'react';
import { OrgMatrix, User } from './types';

interface Props {
    data: OrgMatrix;
    onSave: (data: OrgMatrix) => void;
}

export const OrgMatrixSetup: React.FC<Props> = ({ data, onSave }) => {
    const [matrix, setMatrix] = useState<OrgMatrix>(data);

    const handleLimitChange = (role: keyof OrgMatrix['approvalLimits'], value: string) => {
        setMatrix({
            ...matrix,
            approvalLimits: {
                ...matrix.approvalLimits,
                [role]: Number(value),
            },
        });
    };

    const handleUserRoleChange = (userId: string, role: User['role']) => {
        setMatrix({
            ...matrix,
            users: matrix.users.map((u) => (u.id === userId ? { ...u, role } : u)),
        });
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6">Organization & Approval Setup</h2>

            {/* Approval Limits Section */}
            <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4 border-b pb-2">Approval Thresholds</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Manager Limit (Rp)</label>
                        <p className="text-xs text-gray-500 mb-2">Expenses below this only need Manager approval.</p>
                        <input
                            type="number"
                            value={matrix.approvalLimits.manager}
                            onChange={(e) => handleLimitChange('manager', e.target.value)}
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CFO Limit (Rp)</label>
                        <p className="text-xs text-gray-500 mb-2">Expenses above this require CFO approval.</p>
                        <input
                            type="number"
                            value={matrix.approvalLimits.cfo}
                            onChange={(e) => handleLimitChange('cfo', e.target.value)}
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CEO Limit (Rp)</label>
                        <p className="text-xs text-gray-500 mb-2">Expenses above this require CEO approval.</p>
                        <input
                            type="number"
                            value={matrix.approvalLimits.ceo}
                            onChange={(e) => handleLimitChange('ceo', e.target.value)}
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* User Roles Section */}
            <div>
                <h3 className="text-lg font-semibold mb-4 border-b pb-2">User Roles & Reporting</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reports To</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {matrix.users.map((user) => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <select
                                            value={user.role}
                                            onChange={(e) => handleUserRoleChange(user.id, e.target.value as User['role'])}
                                            className="p-1 border rounded"
                                        >
                                            <option value="Requester">Requester</option>
                                            <option value="Manager">Manager</option>
                                            <option value="CFO">CFO</option>
                                            <option value="CEO">CEO</option>
                                            <option value="Finance">Finance</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {user.managerId ? matrix.users.find(u => u.id === user.managerId)?.name : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-8 flex justify-end">
                <button
                    onClick={() => onSave(matrix)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                    Save Configuration
                </button>
            </div>
        </div>
    );
};
