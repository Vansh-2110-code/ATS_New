import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { UserPlus, Search, Edit3, Trash2, CheckCircle2, X, Shield, Wifi, Monitor, Eye, EyeOff, Loader2, ChevronRight, Mail, Calendar, Clock, Lock, Key } from 'lucide-react';
import api from '../../services/api';

type Role = 'recruiter' | 'tl' | 'manager' | 'admin' | 'spoc' | 'walkin' | 'demo_walkin';

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  roles?: Role[];
  isWFH: boolean;
  status: 'Active' | 'Suspended';
  lastLogin: string;
  joinedDate: string;
  pseudoName?: string;
  loginStartTime?: string;
  loginEndTime?: string;
  allowHomeLogin?: boolean;
  disableBiometric?: boolean;
}

const INITIAL_USERS: SystemUser[] = [
  { id: 'REC001', name: 'Anika Sharma', email: 'rec001@whitehorsemanpower.io', role: 'recruiter', isWFH: false, status: 'Active', lastLogin: 'Feb 22, 2026 • 09:03 AM', joinedDate: 'Jan 10, 2025' },
  { id: 'REC002', name: 'Sneha Gupta', email: 'rec002@whitehorsemanpower.io', role: 'recruiter', isWFH: true, status: 'Active', lastLogin: 'Feb 22, 2026 • 09:15 AM', joinedDate: 'Mar 5, 2025' },
  { id: 'REC003', name: 'Rahul Gupta', email: 'rec003@whitehorsemanpower.io', role: 'recruiter', isWFH: false, status: 'Active', lastLogin: 'Feb 22, 2026 • 09:30 AM', joinedDate: 'Feb 20, 2025' },
  { id: 'REC004', name: 'Meera Pillai', email: 'rec004@whitehorsemanpower.io', role: 'recruiter', isWFH: false, status: 'Active', lastLogin: 'Feb 22, 2026 • 08:58 AM', joinedDate: 'Apr 12, 2025' },
  { id: 'REC005', name: 'Vijay Kumar', email: 'rec005@whitehorsemanpower.io', role: 'recruiter', isWFH: false, status: 'Active', lastLogin: 'Feb 22, 2026 • 09:45 AM', joinedDate: 'Jun 1, 2025' },
  { id: 'REC006', name: 'Sana Khan', email: 'rec006@whitehorsemanpower.io', role: 'recruiter', isWFH: false, status: 'Suspended', lastLogin: 'Feb 19, 2026 • 09:10 AM', joinedDate: 'Aug 15, 2025' },
  { id: 'TL001', name: 'Rohan Mehta', email: 'tl001@whitehorsemanpower.io', role: 'tl', isWFH: false, status: 'Active', lastLogin: 'Feb 22, 2026 • 08:45 AM', joinedDate: 'Sep 3, 2024' },
  { id: 'TL002', name: 'Divya Krishnan', email: 'tl002@whitehorsemanpower.io', role: 'tl', isWFH: true, status: 'Active', lastLogin: 'Feb 22, 2026 • 09:02 AM', joinedDate: 'Nov 20, 2024' },
  { id: 'MGR001', name: 'Priya Nair', email: 'mgr001@whitehorsemanpower.io', role: 'manager', isWFH: false, status: 'Active', lastLogin: 'Feb 22, 2026 • 08:30 AM', joinedDate: 'Jul 1, 2024' },
  { id: 'ADM001', name: 'Vikram Singh', email: 'adm001@whitehorsemanpower.io', role: 'admin', isWFH: false, status: 'Active', lastLogin: 'Feb 22, 2026 • 08:00 AM', joinedDate: 'Jan 1, 2024' },
];

const ROLE_COLORS: Record<Role, string> = {
  recruiter: 'bg-emerald-100 text-emerald-700',
  tl: 'bg-violet-100 text-violet-700',
  manager: 'bg-amber-100 text-amber-700',
  admin: 'bg-red-100 text-red-700',
  spoc: 'bg-sky-100 text-sky-700',
  walkin: 'bg-teal-100 text-teal-700',
  demo_walkin: 'bg-indigo-100 text-indigo-700',
};

const ROLE_LABELS: Record<Role, string> = {
  recruiter: 'Recruiter',
  tl: 'Team Lead',
  manager: 'Manager',
  admin: 'Admin',
  spoc: 'SPOC',
  walkin: 'Walk-In',
  demo_walkin: 'Demo Walk-In',
};

interface AddUserForm {
  name: string;
  email: string;
  role: Role;
  roles: Role[];
  isWFH: boolean;
  password: string;
  pseudoName?: string;
  eid?: string;
  loginStartTime?: string;
  loginEndTime?: string;
  allowHomeLogin?: boolean;
  disableBiometric?: boolean;
}

const EMPTY_FORM: AddUserForm = {
  name: '', email: '', role: 'recruiter', roles: ['recruiter'], isWFH: false, password: '', pseudoName: '', eid: '',
  loginStartTime: '09:00', loginEndTime: '19:00', allowHomeLogin: true, disableBiometric: false,
};

// EID Generator - Auto-generates Employee ID based on Full Name and Role
function generateEID(fullName: string, role: Role): string {
  if (!fullName.trim()) return '';
  const mockSeq = Date.now().toString().slice(-4);
  return `WH00${mockSeq}`;
}

export function UserManagementPage() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<SystemUser | null>(null);
  const [form, setForm] = useState<AddUserForm>({ ...EMPTY_FORM });
  const [showPass, setShowPass] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [generatedEID, setGeneratedEID] = useState('');
  const [resetPassUser, setResetPassUser] = useState<SystemUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await api.getUsers();
        const list = (data.users || data || []).map((u: any) => ({
          id: u.employeeId || u._id || u.id,
          name: u.name || '',
          email: u.email || '',
          role: u.role || 'recruiter',
          roles: u.roles || [u.role || 'recruiter'],
          isWFH: u.isWFH ?? false,
          status: u.status ? (u.status as 'Active' | 'Suspended') : (u.isActive === false ? 'Suspended' as const : 'Active' as const),
          lastLogin: u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '—',
          joinedDate: u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
          pseudoName: u.pseudoName || u.aliasName || '',
          loginStartTime: u.loginStartTime || '09:00',
          loginEndTime: u.loginEndTime || '19:00',
          allowHomeLogin: u.allowHomeLogin ?? true,
          disableBiometric: u.disableBiometric ?? false,
        }));
        setUsers(list);
      } catch (err) {
        console.error('Failed to load users:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Auto-generate EID when name or role changes (only for new users)
  useEffect(() => {
    if (!editUser && (form.name || form.role)) {
      const eid = generateEID(form.name, form.role);
      setGeneratedEID(eid);
    }
  }, [form.name, form.role, editUser]);

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.id.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'All' || u.role === roleFilter;
    const matchStatus =
      statusFilter === 'all' ? true :
      statusFilter === 'active' ? u.status === 'Active' :
      statusFilter === 'suspended' ? u.status === 'Suspended' :
      statusFilter === 'wfh' ? u.isWFH : true;
    return matchSearch && matchRole && matchStatus;
  });

const ROLE_ORDER: Role[] = ['walkin', 'recruiter', 'spoc', 'tl', 'manager', 'admin'];
const getHighestRole = (roles: Role[]): Role => {
  if (!roles || roles.length === 0) return 'recruiter';
  let highest = roles[0];
  roles.forEach(r => {
    if (ROLE_ORDER.indexOf(r) > ROLE_ORDER.indexOf(highest)) {
      highest = r;
    }
  });
  return highest;
};

  const handleSave = async () => {
    if (!form.name || !form.email) return;
    try {
      const computedRole = getHighestRole(form.roles);
      if (editUser) {
        await api.updateUser(editUser.id, {
          name: form.name,
          email: form.email,
          role: computedRole,
          roles: form.roles,
          isWFH: form.isWFH,
          pseudoName: form.pseudoName,
          loginStartTime: form.loginStartTime,
          loginEndTime: form.loginEndTime,
          allowHomeLogin: form.allowHomeLogin,
          disableBiometric: form.disableBiometric,
        });
        setUsers(prev => prev.map(u => u.id === editUser.id
          ? {
              ...u,
              name: form.name,
              email: form.email,
              role: computedRole,
              roles: form.roles,
              isWFH: form.isWFH,
              pseudoName: form.pseudoName,
              loginStartTime: form.loginStartTime,
              loginEndTime: form.loginEndTime,
              allowHomeLogin: form.allowHomeLogin,
              disableBiometric: form.disableBiometric,
            }
          : u
        ));
      } else {
        const res = await api.createUser({
          name: form.name,
          email: form.email,
          role: computedRole,
          roles: form.roles,
          isWFH: form.isWFH,
          password: form.password,
          pseudoName: form.pseudoName,
          employeeId: generatedEID,
          loginStartTime: form.loginStartTime,
          loginEndTime: form.loginEndTime,
          allowHomeLogin: form.allowHomeLogin,
          disableBiometric: form.disableBiometric,
        });
        const newUser: SystemUser = {
          id: generatedEID || res.employeeId || res.user?.employeeId || res._id || '',
          name: form.name,
          email: form.email,
          role: computedRole,
          roles: form.roles,
          isWFH: form.isWFH,
          status: 'Active',
          lastLogin: '—',
          joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          pseudoName: form.pseudoName,
          loginStartTime: form.loginStartTime,
          loginEndTime: form.loginEndTime,
          allowHomeLogin: form.allowHomeLogin,
          disableBiometric: form.disableBiometric,
        };
        setUsers(prev => [...prev, newUser]);
      }
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setShowModal(false);
        setEditUser(null);
        setForm({ ...EMPTY_FORM });
        setGeneratedEID('');
      }, 1200);
    } catch (err) {
      console.error('Failed to save user:', err);
    }
  };

  const handleEdit = (user: SystemUser) => {
    setEditUser(user);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      roles: user.roles || [user.role],
      isWFH: user.isWFH,
      password: '',
      pseudoName: user.pseudoName || '',
      eid: user.id,
      loginStartTime: user.loginStartTime || '09:00',
      loginEndTime: user.loginEndTime || '19:00',
      allowHomeLogin: user.allowHomeLogin ?? true,
      disableBiometric: user.disableBiometric ?? false,
    });
    setShowModal(true);
  };

  const toggleStatus = async (id: string) => {
    try {
      const res = await api.toggleUserStatus(id);
      const serverStatus = res?.status;
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: serverStatus || (u.status === 'Active' ? 'Suspended' as const : 'Active' as const) } : u));
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const activeCount = users.filter(u => u.status === 'Active').length;
  const wfhCount = users.filter(u => u.isWFH).length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-slate-800" style={{ fontWeight: 700, fontSize: '1.4rem' }}>User Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">Add, edit, and manage system user accounts</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700 transition-colors"
          style={{ fontWeight: 600 }}
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: users.length, color: 'slate', filter: 'all' },
          { label: 'Active', value: activeCount, color: 'emerald', filter: 'active' },
          { label: 'Suspended', value: users.length - activeCount, color: 'red', filter: 'suspended' },
          { label: 'WFH Users', value: wfhCount, color: 'blue', filter: 'wfh' },
        ].map(({ label, value, color, filter }) => {
          const c: Record<string, string> = {
            slate: 'bg-slate-50 border-slate-100 text-slate-700',
            emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
            red: 'bg-red-50 border-red-100 text-red-600',
            blue: 'bg-green-50 border-green-100 text-green-700',
          };
          const active = statusFilter === filter;
          return (
            <button
              key={label}
              onClick={() => setStatusFilter(active ? 'all' : filter)}
              className={`rounded-xl border p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${c[color]} ${
                active ? 'ring-2 ring-green-400 ring-offset-1' : ''
              }`}
            >
              <div style={{ fontWeight: 700, fontSize: '1.75rem' }}>{value}</div>
              <div className="text-sm opacity-80">{label}</div>
              {active && <div className="text-xs mt-1 opacity-60">Click to clear</div>}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, ID, or email..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['All', 'recruiter', 'tl', 'manager', 'admin', 'spoc'].map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 text-xs rounded-lg capitalize transition-colors ${roleFilter === r ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              style={{ fontWeight: roleFilter === r ? 600 : 400 }}
            >
              {r === 'tl' ? 'Team Lead' : r === 'spoc' ? 'SPOC' : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Employee', 'ID', 'Role', 'Type', 'Status', 'Last Login', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-slate-500 uppercase tracking-wide whitespace-nowrap" style={{ fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(user => (
                <tr key={user.id} className={`hover:bg-slate-50/60 transition-colors ${user.status === 'Suspended' ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-green-700 text-xs" style={{ fontWeight: 600 }}>
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/admin/employee/${user.id}`)}
                            className="text-slate-700 text-sm hover:text-green-700 hover:underline text-left"
                            style={{ fontWeight: 500 }}
                          >{user.name}</button>
                          {user.pseudoName && (
                            <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded" style={{ fontWeight: 500 }}>
                              "{user.pseudoName}"
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 text-xs">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 text-sm">{user.id}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full ${ROLE_COLORS[user.role]}`} style={{ fontWeight: 500 }}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {user.isWFH
                      ? <span className="flex items-center gap-1 text-green-600 text-xs"><Wifi className="w-3 h-3" /> WFH</span>
                      : <span className="flex items-center gap-1 text-slate-500 text-xs"><Monitor className="w-3 h-3" /> Office</span>
                    }
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => user.id !== 'ADM001' && toggleStatus(user.id)}
                      disabled={user.id === 'ADM001'}
                      className={`text-xs px-2.5 py-1 rounded-full cursor-pointer ${
                        user.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-red-100 text-red-600 hover:bg-red-200'
                      } disabled:cursor-default`}
                      style={{ fontWeight: 500 }}
                    >
                      {user.status}
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 text-xs whitespace-nowrap">{user.lastLogin}</td>
                  <td className="px-4 py-3.5 text-slate-400 text-xs">{user.joinedDate}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => navigate(`/admin/employee/${user.id}`)}
                        className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-md"
                        title="View Profile"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setResetPassUser(user);
                        }}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md"
                        title="Reset Password"
                      >
                        <Key className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-md"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {user.id !== 'ADM001' && (
                        <button
                          onClick={() => setDeleteConfirm(user.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {filtered.map(user => (
            <div key={user.id} className={`p-4 ${user.status === 'Suspended' ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-700 text-xs" style={{ fontWeight: 600 }}>{user.name.split(' ').map(n => n[0]).join('')}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-slate-700 text-sm" style={{ fontWeight: 500 }}>{user.name}</p>
                      {user.pseudoName && (
                        <span className="text-xs px-1 py-0.5 bg-blue-50 text-blue-600 rounded" style={{ fontWeight: 500 }}>
                          "{user.pseudoName}"
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-xs">{user.id}</p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full ${ROLE_COLORS[user.role]}`} style={{ fontWeight: 500 }}>
                  {ROLE_LABELS[user.role]}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <span className={`text-xs px-2 py-0.5 rounded-full ${user.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                  {user.status}
                </span>
                {user.isWFH && <span className="text-xs text-green-600">WFH</span>}
                <div className="ml-auto flex gap-1.5">
                  <button onClick={() => navigate(`/admin/employee/${user.id}`)} className="text-xs text-blue-600 px-2 py-1 bg-blue-50 rounded-md" style={{ fontWeight: 500 }}>Profile</button>
                  <button onClick={() => setResetPassUser(user)} className="text-xs text-amber-600 px-2 py-1 bg-amber-50 rounded-md" style={{ fontWeight: 500 }}>Reset Pass</button>
                  <button onClick={() => handleEdit(user)} className="text-xs text-green-600 px-2 py-1 bg-green-50 rounded-md" style={{ fontWeight: 500 }}>Edit</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Reset Password Modal */}
        {resetPassUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-800 font-bold">Reset Password</h3>
                <button onClick={() => { setResetPassUser(null); setNewPassword(''); setResetError(''); }} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {resetSuccess && (
                <div className="mb-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-emerald-700 text-xs">
                  <CheckCircle2 className="w-4 h-4" /> Password reset successfully!
                </div>
              )}

              {resetError && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-600 text-xs animate-pulse">
                  {resetError}
                </div>
              )}

              <p className="text-xs text-slate-500 mb-4">
                Enter a new password for <strong className="text-slate-700">{resetPassUser.name}</strong>.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wide mb-1" style={{ fontWeight: 600 }}>New Password *</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  onClick={async () => {
                    if (!newPassword || newPassword.length < 6) {
                      setResetError('Password must be at least 6 characters long.');
                      return;
                    }
                    try {
                      setResetError('');
                      await api.resetUserPassword(resetPassUser.id, { password: newPassword });
                      setResetSuccess(true);
                      setTimeout(() => {
                        setResetSuccess(false);
                        setResetPassUser(null);
                        setNewPassword('');
                      }, 1500);
                    } catch (err: any) {
                      setResetError(err.message || 'Failed to reset password.');
                    }
                  }}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-xs rounded-xl font-bold"
                >
                  Reset Password
                </button>
                <button
                  onClick={() => { setResetPassUser(null); setNewPassword(''); setResetError(''); }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-5 flex-shrink-0">
              <h3 className="text-slate-800" style={{ fontWeight: 700 }}>
                {editUser ? 'Edit User' : 'Add New User'}
              </h3>
              <button onClick={() => { setShowModal(false); setEditUser(null); }} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            {saved && (
              <div className="mb-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-emerald-700 text-sm flex-shrink-0">
                <CheckCircle2 className="w-4 h-4" /> {editUser ? 'Changes saved!' : 'User added!'}
              </div>
            )}

            <div className="space-y-4 overflow-y-auto pr-1.5 flex-1 min-h-0">
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>Full Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Employee full name"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400"
                />
              </div>
              {editUser ? (
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>Employee ID</label>
                  <div className="flex items-center gap-2 px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50">
                    <Lock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="text-sm text-slate-500">{editUser.id}</span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>Employee ID (Auto-Generated)</label>
                  <div className="flex items-center gap-2 px-3 py-2.5 border border-dashed border-green-200 rounded-lg bg-green-50">
                    <Lock className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                    <span className="text-sm font-mono text-green-700 font-semibold">
                      WHXXXXXX (Auto-assigned sequentially on save)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Format: WH000001</p>
                </div>
              )}
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="employee@whitehorsemanpower.io"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>Pseudo Name (Alias)</label>
                <input
                  type="text"
                  value={form.pseudoName || ''}
                  onChange={e => setForm(f => ({ ...f, pseudoName: e.target.value }))}
                  placeholder="Optional nickname or alias"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400"
                />
                <p className="text-xs text-slate-400 mt-1">Optional: Enter a nickname or alias for this user</p>
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-2" style={{ fontWeight: 600 }}>Roles (Select all that apply) *</label>
                <div className="grid grid-cols-3 gap-2 px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50">
                  {([
                    { val: 'recruiter', label: 'Recruiter' },
                    { val: 'tl', label: 'Team Lead' },
                    { val: 'manager', label: 'Manager' },
                    { val: 'admin', label: 'Admin' },
                    { val: 'spoc', label: 'SPOC' },
                    { val: 'walkin', label: 'Walk-In' }
                  ] as const).map(({ val, label }) => {
                    const isChecked = form.roles?.includes(val);
                    return (
                      <label key={val} className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none font-semibold">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setForm(f => {
                              const currentRoles = f.roles || [];
                              const updated = currentRoles.includes(val)
                                ? currentRoles.filter(r => r !== val)
                                : [...currentRoles, val];
                              return { ...f, roles: updated, role: getHighestRole(updated) };
                            });
                          }}
                          className="w-3.5 h-3.5 text-green-600 focus:ring-green-500 border-slate-300 rounded"
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>Work Type</label>
                <select
                  value={form.isWFH ? 'wfh' : 'office'}
                  onChange={e => setForm(f => ({ ...f, isWFH: e.target.value === 'wfh' }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white"
                >
                  <option value="office">Office</option>
                  <option value="wfh">WFH (OTP required)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>Login Start Time</label>
                  <input
                    type="time"
                    value={form.loginStartTime || '09:00'}
                    onChange={e => setForm(f => ({ ...f, loginStartTime: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>Login Cut-off Time</label>
                  <input
                    type="time"
                    value={form.loginEndTime || '19:00'}
                    onChange={e => setForm(f => ({ ...f, loginEndTime: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>Allow WFH/Home Login</label>
                <select
                  value={form.allowHomeLogin ? 'allow' : 'block'}
                  onChange={e => setForm(f => ({ ...f, allowHomeLogin: e.target.value === 'allow' }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white"
                >
                  <option value="allow">Allowed (requires OTP if WFH)</option>
                  <option value="block">Blocked (avoids home/remote login)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>Biometric Face Attendance</label>
                <select
                  value={form.disableBiometric ? 'disabled' : 'enabled'}
                  onChange={e => setForm(f => ({ ...f, disableBiometric: e.target.value === 'disabled' }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white"
                >
                  <option value="enabled">Enabled (Requires face scan)</option>
                  <option value="disabled">Disabled (Bypasses face scan)</option>
                </select>
              </div>
              {!editUser && (
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 600 }}>Temporary Password *</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Set temporary password"
                      className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-5 flex-shrink-0">
              <button
                onClick={handleSave}
                className="flex-1 py-2.5 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700"
                style={{ fontWeight: 600 }}
              >
                {editUser ? 'Save Changes' : 'Add User'}
              </button>
              <button
                onClick={() => { setShowModal(false); setEditUser(null); }}
                className="px-4 py-2.5 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-slate-800 mb-2" style={{ fontWeight: 700 }}>Remove User?</h3>
            <p className="text-slate-500 text-sm mb-5">
              This will permanently remove <strong className="text-slate-700">{users.find(u => u.id === deleteConfirm)?.name}</strong> from the system.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 bg-red-500 text-white text-sm rounded-xl hover:bg-red-600"
                style={{ fontWeight: 600 }}
              >
                Remove
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
