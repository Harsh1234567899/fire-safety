import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, CheckCircle, Trash2, UserPlus, ShieldAlert, X, Lock, Key, Mail, Hash, Loader, Edit } from 'lucide-react';
import { getAllUsers } from '../services/user';
import { registerUser, deleteUser, updateUser, updatePassword } from '../services/auth';
import { toast } from 'react-hot-toast';
import { dataCache } from '../utils/dataCache';

const StaffScreen = () => {
    const [staffMembers, setStaffMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (dataCache.has('staff')) {
            setStaffMembers(dataCache.get('staff'));
            setLoading(false);
            return;
        }

        const fetchUsers = async () => {
            try {
                const response = await getAllUsers();
                const mappedUsers = response.data?.data?.map(u => ({
                    id: u._id,
                    name: u.name,
                    email: u.email,
                    systemId: u.systemId,
                    role: u.role.toUpperCase(),
                    status: 'ACTIVE',
                    initial: u.name.charAt(0).toUpperCase()
                })) || [];
                setStaffMembers(mappedUsers);
                dataCache.set('staff', mappedUsers);
            } catch (err) {
                console.error("Failed to fetch staff", err);
                setError("Failed to load staff members");
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUserId, setEditingUserId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        systemId: '',
        password: '',
        role: 'MANAGER'
    });

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to revoke this staff member\'s access?')) {
            try {
                await deleteUser(id);
                setStaffMembers(prev => prev.filter(m => m.id !== id));
            } catch (err) {
                console.error("Failed to delete user", err);
                alert("Failed to delete user: " + (err.response?.data?.message || err.message));
            }
        }
    };

    const openCreateModal = () => {
        setEditingUserId(null);
        setFormData({
            name: '',
            email: '',
            systemId: '',
            password: '',
            role: 'MANAGER'
        });
        setIsModalOpen(true);
    };

    const openEditModal = (member) => {
        setEditingUserId(member.id);
        setFormData({
            name: member.name,
            email: member.email,
            systemId: member.systemId,
            password: '',
            role: member.role
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.email || !formData.systemId || (!editingUserId && !formData.password)) {
            toast.error('Please fill all mandatory credential fields.');
            return;
        }

        const executeUpdate = async () => {
            try {
                const payload = {
                    name: formData.name,
                    email: formData.email,
                    systemId: formData.systemId,
                    role: formData.role.toLowerCase()
                };

                if (editingUserId) {
                    const response = await updateUser(editingUserId, payload);
                    const updatedUser = response.data?.data;

                    if (formData.password) {
                        try {
                            await updatePassword(editingUserId, { newPassword: formData.password });
                        } catch (pwdErr) {
                            console.error("Password update error full:", pwdErr);
                            console.error("Password update error response:", pwdErr.response?.data);
                            throw new Error("User details updated, but password update failed: " + (pwdErr.response?.data?.message || pwdErr.message));
                        }
                    }

                    if (updatedUser) {
                        setStaffMembers(prev => prev.map(m => m.id === editingUserId ? {
                            ...m,
                            name: updatedUser.name,
                            email: updatedUser.email,
                            systemId: updatedUser.systemId,
                            role: updatedUser.role.toUpperCase(),
                            initial: updatedUser.name.charAt(0).toUpperCase()
                        } : m));
                        setIsModalOpen(false);
                        toast.success(formData.password ? "Account and password updated" : "Account updated successfully");
                    }
                } else {
                    payload.password = formData.password;
                    const response = await registerUser(payload);
                    const createdUser = response.data?.data;

                    if (createdUser) {
                        const newMember = {
                            id: createdUser._id,
                            systemId: createdUser.systemId,
                            name: createdUser.name,
                            email: createdUser.email,
                            role: createdUser.role.toUpperCase(),
                            status: 'ACTIVE ACCESS',
                            initial: createdUser.name.charAt(0).toUpperCase()
                        };
                        setStaffMembers(prev => [...prev, newMember]);
                        setIsModalOpen(false);
                        toast.success("Account created successfully");
                    }
                }
            } catch (err) {
                console.error(editingUserId ? "Failed to update user" : "Failed to create user", err);
                toast.error((editingUserId ? err.message : "Failed to create user: " + (err.response?.data?.message || err.message)));
            }
        };

        if (editingUserId && formData.password) {
            toast((t) => (
                <div className="flex flex-col gap-3 p-1">
                    <div className="flex items-center gap-2 text-red-600 font-bold">
                        <ShieldAlert size={18} />
                        Confirm Password Change
                    </div>
                    <p className="text-sm text-gray-700">
                        You are about to change the password for <b>{formData.name}</b>.
                        They will need to use the new password to log in. Proceed?
                    </p>
                    <div className="flex gap-2 justify-end mt-2">
                        <button
                            className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition-colors"
                            onClick={() => toast.dismiss(t.id)}
                        >
                            CANCEL
                        </button>
                        <button
                            className="px-3 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition-colors"
                            onClick={() => {
                                toast.dismiss(t.id);
                                executeUpdate();
                            }}
                        >
                            UPDATE PASSWORD
                        </button>
                    </div>
                </div>
            ), { duration: Infinity });
        } else {
            executeUpdate();
        }
    };

    const getRoleIcon = (role) => {
        switch (role) {
            case 'ADMIN':
                return <ShieldAlert size={16} className="text-red-500" />;
            case 'MANAGER':
                return <ShieldCheck size={16} className="text-blue-500" />;
            default:
                return <Shield size={16} className="text-gray-400" />;
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative h-full">
            {/* Header Section */}
            <div className="mb-10">
                <div className="flex items-center gap-2 mb-2">
                    <Shield size={14} className="text-red-500" />
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Access Control Center</span>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-1">Staff Management</h1>
                        <p className="text-gray-500">Provision and manage internal operational accounts.</p>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center justify-center sm:justify-start w-full sm:w-auto gap-2 bg-[#ef4444] hover:bg-red-600 text-white px-6 py-3 rounded-full font-bold transition-all shadow-xl shadow-red-500/20 active:scale-95 uppercase tracking-widest text-xs"
                    >
                        <UserPlus size={18} />
                        <span>GENERATE CREDENTIALS</span>
                    </button>
                </div>
            </div>

            {/* Staff List */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="hidden lg:grid grid-cols-12 px-8 py-5 border-b border-gray-100 bg-gray-50/50">
                    <div className="col-span-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Staff Identity</div>
                    <div className="col-span-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">System ID</div>
                    <div className="col-span-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Role</div>
                    <div className="col-span-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Authorization</div>
                    <div className="col-span-2 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Operations</div>
                </div>

                <div className="divide-y divide-gray-50">
                    {loading ? <div className="p-8 text-center text-gray-400">Loading staff...</div> : staffMembers.map((member) => (
                        <div key={member.id} className="relative flex flex-col lg:grid lg:grid-cols-12 px-6 sm:px-8 py-6 items-start lg:items-center hover:bg-gray-50 transition-colors group gap-4 lg:gap-0">
                            <div className="col-span-3 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm shrink-0">
                                    {member.initial}
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900">{member.name}</h4>
                                    <p className="text-[10px] text-gray-400 font-medium">{member.email}</p>
                                </div>
                            </div>

                            {/* Mobile aggregated stats, hidden on desktop */}
                            <div className="flex items-center gap-3 flex-wrap lg:hidden w-full">
                                <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono font-bold text-gray-700">{member.systemId}</span>
                                <div className="flex items-center gap-1.5 bg-white border border-gray-100 shadow-sm px-2 py-1 rounded">
                                    {getRoleIcon(member.role)}
                                    <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">{member.role}</span>
                                </div>
                                <div className="flex items-center gap-1.5 ml-auto">
                                    <CheckCircle size={14} className="text-green-500 shrink-0" />
                                    <span className="text-[10px] font-bold text-green-600 uppercase tracking-wide shrink-0">{member.status}</span>
                                </div>
                            </div>

                            {/* Desktop only columns */}
                            <div className="hidden lg:block col-span-2">
                                <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono font-bold text-gray-700">{member.systemId}</span>
                            </div>

                            <div className="hidden lg:flex col-span-2 items-center gap-2">
                                <div className="p-1 rounded bg-white border border-gray-100 shadow-sm">
                                    {getRoleIcon(member.role)}
                                </div>
                                <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">{member.role}</span>
                            </div>

                            <div className="hidden lg:flex col-span-3 items-center gap-2">
                                <CheckCircle size={14} className="text-green-500" />
                                <span className="text-[10px] font-bold text-green-600 uppercase tracking-wide">{member.status}</span>
                            </div>

                            <div className="col-span-2 flex justify-end absolute right-4 top-4 lg:relative lg:right-0 lg:top-0 gap-2">
                                <button
                                    onClick={() => openEditModal(member)}
                                    className="p-2 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit Access"
                                >
                                    <Edit size={18} />
                                </button>
                                <button
                                    onClick={() => handleDelete(member.id)}
                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Revoke Access"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Onboarding Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>

                    <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-10 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{editingUserId ? 'Edit Account' : 'Account Provisioning'}</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{editingUserId ? 'Update User Details' : 'Manual Credential Generation'}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-gray-50 text-gray-400 hover:text-gray-600 rounded-xl flex items-center justify-center transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-red-100 rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Work Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-red-100 rounded-xl pl-8 sm:pl-10 pr-4 py-3 text-sm font-bold outline-none transition-all"
                                            placeholder="john@sahaj.com"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 sm:p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Liaison Credentials</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">System ID</label>
                                        <div className="relative">
                                            <Hash className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                            <input
                                                type="text"
                                                value={formData.systemId}
                                                onChange={(e) => setFormData({ ...formData, systemId: e.target.value })}
                                                className="w-full bg-white border border-slate-200 focus:border-red-400 rounded-xl pl-8 sm:pl-10 pr-4 py-3 text-sm font-bold outline-none transition-all"
                                                placeholder="jdoe01"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
                                            {editingUserId ? "New Password (Optional)" : "Password"}
                                        </label>
                                        <div className="relative">
                                            <Key className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                            <input
                                                type="text"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                className="w-full bg-white border border-slate-200 focus:border-red-400 rounded-xl pl-8 sm:pl-10 pr-4 py-3 text-sm font-bold outline-none transition-all"
                                                placeholder={editingUserId ? "Leave blank to keep" : "securePass123"}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Access Tier</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['ADMIN', 'MANAGER', 'GODOWN-MANAGER'].map((roleOption) => (
                                        <div
                                            key={roleOption}
                                            onClick={() => setFormData({ ...formData, role: roleOption })}
                                            className={`relative flex flex-col p-4 rounded-2xl border-2 cursor-pointer transition-all ${formData.role === roleOption
                                                ? 'border-red-100 bg-red-50/20'
                                                : 'border-gray-50 hover:border-gray-100 bg-white'
                                                }`}
                                        >
                                            <span className={`text-[10px] font-bold tracking-tighter uppercase leading-tight ${formData.role === roleOption ? 'text-red-600' : 'text-gray-400'
                                                }`}>
                                                {roleOption}
                                            </span>
                                            {formData.role === roleOption && <div className="absolute top-2 right-2 text-red-500"><CheckCircle size={14} /></div>}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                className="w-full bg-[#0f172a] hover:bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-xl shadow-slate-900/20 transition-all active:scale-[0.98] mt-4 uppercase tracking-[0.2em] text-xs"
                            >
                                {editingUserId ? 'UPDATE ACCOUNT' : 'AUTHORIZE & CREATE ACCOUNT'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffScreen;
