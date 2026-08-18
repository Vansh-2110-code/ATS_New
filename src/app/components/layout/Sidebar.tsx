import { Link, useLocation, useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  LayoutDashboard, Users, UserCheck, Phone, ClipboardList,
  BarChart2, FileText, Shield, Clock, LogOut, Star,
  DollarSign, TrendingUp, UserCog, Activity, ChevronRight,
  ScanLine, CalendarCheck, UserPlus, ListChecks, Briefcase, FileCheck,
  Building2, Database, ClipboardCheck, CheckSquare, MonitorCheck, Mail, LayoutGrid, Upload, Settings, Globe, XCircle,
} from 'lucide-react';
import { useAuth, Role, ROLE_DASHBOARD } from '../../context/AuthContext';
import logoImg from '../../../assets/Logo.png';
import { FaceVerificationModal } from '../attendance/FaceVerificationModal';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: Role[];
  category: 'Admin' | 'Manager' | 'Team Lead' | 'Recruiter';
}

const NAV_ITEMS: NavItem[] = [
  // Recruiter
  { label: 'Dashboard',        href: '/recruiter',               icon: LayoutDashboard, roles: ['recruiter', 'spoc'], category: 'Recruiter' },
  { label: 'Candidate Management', href: '/recruiter/resumes',       icon: Users,           roles: ['recruiter', 'spoc', 'tl'], category: 'Recruiter' },
  { label: 'Rejected Bucket',  href: '/recruiter/rejected',      icon: XCircle,         roles: ['recruiter', 'spoc', 'tl', 'manager', 'admin'], category: 'Recruiter' },
  { label: 'Add Candidate',    href: '/recruiter/add',           icon: UserPlus,        roles: ['recruiter', 'tl', 'spoc'], category: 'Recruiter' },
  { label: 'Walk-In Queue',    href: '/recruiter/walkin-queue',  icon: ListChecks,      roles: ['recruiter', 'tl', 'spoc'], category: 'Recruiter' },
  { label: 'Walk-In Mgmt',     href: '/recruiter/walkins',       icon: UserCheck,       roles: ['recruiter', 'tl', 'spoc'], category: 'Recruiter' },
  { label: 'Interviews',       href: '/recruiter/interviews',    icon: CalendarCheck,   roles: ['recruiter', 'tl', 'spoc'], category: 'Recruiter' },
  { label: 'ATS Scanner',      href: '/recruiter/scan',          icon: ScanLine,        roles: ['recruiter', 'tl'], category: 'Recruiter' },
  { label: 'ATS Database',     href: '/recruiter/ats-database',  icon: Database,        roles: ['recruiter', 'tl', 'spoc'], category: 'Recruiter' },
  { label: 'Recruiter Portals', href: '/recruiter-portals',       icon: Globe,           roles: ['admin', 'recruiter', 'tl', 'spoc', 'manager'], category: 'Recruiter' },
  { label: 'Job Requirements', href: '/admin/jobs',              icon: Briefcase,        roles: ['recruiter', 'spoc', 'tl', 'manager', 'admin'], category: 'Recruiter' },
  { label: 'Email Center',     href: '/email',                   icon: Mail,            roles: ['recruiter'], category: 'Recruiter' },
  { label: 'My Leaves',        href: '/employee/leaves',         icon: CalendarCheck,   roles: ['recruiter', 'spoc', 'tl', 'manager', 'admin'], category: 'Recruiter' },
  { label: 'My Salary Slip',   href: '/salary-slip',             icon: DollarSign,      roles: ['recruiter', 'spoc', 'tl'], category: 'Recruiter' },

  // Team Lead
  { label: 'Overview',         href: '/tl',                      icon: LayoutDashboard, roles: ['tl'], category: 'Team Lead' },
  { label: 'My Team',          href: '/tl/my-team',              icon: Users,           roles: ['tl'], category: 'Team Lead' },
  { label: 'Leave Approvals',  href: '/tl/leaves',               icon: CalendarCheck,   roles: ['tl'], category: 'Team Lead' },
  { label: 'Candidate Management', href: '/recruiter/resumes',   icon: Users,           roles: ['tl', 'manager', 'admin'], category: 'Team Lead' },
  { label: 'Job Requirements', href: '/admin/jobs',              icon: Briefcase,        roles: ['tl'], category: 'Team Lead' },
  { label: 'Create Job (JR)',  href: '/recruiter/jobs/new',      icon: FileText,         roles: ['tl', 'manager'], category: 'Team Lead' },
  { label: 'Bulk Job Post',    href: '/recruiter/jobs/bulk',     icon: LayoutGrid,       roles: ['tl', 'manager'], category: 'Team Lead' },
  { label: 'Performance Reviews', href: '/tl/performance-reviews', icon: Star, roles: ['tl'], category: 'Team Lead' },
  { label: 'Email Center',     href: '/email',                   icon: Mail,            roles: ['tl'], category: 'Team Lead' },

  // Manager
  { label: 'Overview',         href: '/manager',                 icon: LayoutDashboard, roles: ['manager'], category: 'Manager' },
  { label: 'Leave Approvals',  href: '/manager/leaves',          icon: CalendarCheck,   roles: ['manager'], category: 'Manager' },
  { label: 'Candidate DB',     href: '/admin/candidates',        icon: Database,         roles: ['manager'], category: 'Manager' },
  { label: 'Job Requirements', href: '/admin/jobs',              icon: Briefcase,        roles: ['manager'], category: 'Manager' },
  { label: 'Bulk Job Post',    href: '/recruiter/jobs/bulk',     icon: LayoutGrid,       roles: ['manager'], category: 'Manager' },
  { label: 'Reports',          href: '/manager/reports',         icon: BarChart2,        roles: ['manager'], category: 'Manager' },
  { label: 'Revenue',          href: '/revenue',                 icon: TrendingUp,       roles: ['manager'], category: 'Manager' },
  { label: 'Salary',           href: '/salary',                  icon: DollarSign,       roles: ['manager'], category: 'Manager' },
  { label: 'Performance Reviews', href: '/manager/performance-reviews', icon: Star, roles: ['manager'], category: 'Manager' },
  { label: 'TL Login Activity',href: '/manager/tl-activity',     icon: MonitorCheck,     roles: ['manager'], category: 'Manager' },

  // Admin
  { label: 'Dashboard',        href: '/admin',                   icon: LayoutDashboard, roles: ['admin'], category: 'Admin' },
  { label: 'User Management',  href: '/admin/users',             icon: UserCog,          roles: ['admin'], category: 'Admin' },
  { label: 'Attendance',       href: '/admin/attendance',        icon: Clock,            roles: ['admin'], category: 'Admin' },
  { label: 'Leave Approvals',  href: '/admin/leaves',            icon: CalendarCheck,   roles: ['admin'], category: 'Admin' },
  { label: 'Access Control',   href: '/admin/access',            icon: Shield,           roles: ['admin'], category: 'Admin' },
  { label: 'Candidate DB',     href: '/admin/candidates',        icon: Database,         roles: ['admin'], category: 'Admin' },
  { label: 'ATS Scan Database',href: '/admin/ats-records',       icon: ScanLine,         roles: ['admin'], category: 'Admin' },
  { label: 'Excel Import',     href: '/admin/excel-import',      icon: Upload,           roles: ['admin'], category: 'Admin' },
  { label: 'Field Config',     href: '/admin/field-config',      icon: Settings,         roles: ['admin'], category: 'Admin' },
  { label: 'Job Requirements', href: '/admin/jobs',              icon: Briefcase,        roles: ['admin'], category: 'Admin' },
  { label: 'Bulk Job Post',    href: '/recruiter/jobs/bulk',     icon: LayoutGrid,       roles: ['admin'], category: 'Admin' },
  { label: 'Companies',        href: '/admin/companies',         icon: Building2,        roles: ['admin'], category: 'Admin' },
  { label: 'Tasks',            href: '/admin/tasks',             icon: CheckSquare,      roles: ['admin', 'tl', 'recruiter'], category: 'Admin' },
  { label: 'My Joining Form', href: '/recruiter/joining', icon: FileCheck,        roles: ['admin', 'recruiter', 'tl'], category: 'Recruiter' },
  { label: 'Recruiter Records',  href: '/admin/joining',           icon: ClipboardCheck,   roles: ['admin', 'recruiter', 'tl'], category: 'Admin' },
  { label: 'Email Center',     href: '/email',                   icon: Mail,            roles: ['admin'], category: 'Admin' },
  { label: 'TL Login Activity',href: '/admin/tl-activity',       icon: MonitorCheck,     roles: ['admin'], category: 'Admin' },
  { label: 'Performance Reviews', href: '/admin/performance-reviews', icon: Star, roles: ['admin'], category: 'Admin' },
  { label: 'System Logs',      href: '/admin/logs',              icon: Activity,         roles: ['admin'], category: 'Admin' },
  { label: 'Salary',           href: '/salary',                  icon: DollarSign,       roles: ['admin'], category: 'Admin' },
  { label: 'Revenue',          href: '/revenue',                 icon: TrendingUp,       roles: ['admin', 'manager'], category: 'Admin' },
  { label: 'Credit Notes',     href: '/credit-notes',            icon: FileCheck,        roles: ['admin'], category: 'Admin' },
];

const ROLE_LABELS: Record<Role, string> = {
  recruiter: 'Recruiter',
  tl: 'Team Lead',
  manager: 'Manager',
  admin: 'Admin',
  spoc: 'SPOC',
  walkin: 'Walk-In',
  demo_walkin: 'Demo Walk-In',
};

const ROLE_COLORS: Record<Role, string> = {
  recruiter: 'bg-emerald-100 text-emerald-700',
  tl: 'bg-violet-100 text-violet-700',
  manager: 'bg-amber-100 text-amber-700',
  admin: 'bg-red-100 text-red-700',
  spoc: 'bg-sky-100 text-sky-700',
  walkin: 'bg-teal-100 text-teal-700',
  demo_walkin: 'bg-indigo-100 text-indigo-700',
};

interface SidebarProps {
  onClose?: () => void;
}

const ROLE_CATEGORIES: Record<string, string[]> = {
  admin: ['Admin', 'Manager', 'Team Lead', 'Recruiter'],
  manager: ['Manager', 'Team Lead', 'Recruiter'],
  tl: ['Team Lead', 'Recruiter'],
  recruiter: ['Recruiter'],
  spoc: ['Recruiter'],
};

export function Sidebar({ onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showCheckOutFaceModal, setShowCheckOutFaceModal] = useState(false);
  const [joiningApproved, setJoiningApproved] = useState(false);

  useEffect(() => {
    if (user && ['recruiter', 'tl'].includes(user.role) && user.employeeId) {
      api.getJoiningFormAutoFillData?.(user.employeeId)
        .then((data: any) => {
          if (data && data.isApproved) {
            setJoiningApproved(true);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  if (!user) return null;

  const userRoles = user.roles && user.roles.length > 0 ? user.roles : [user.role];
  const allowedCategoriesSet = new Set<string>();
  userRoles.forEach(r => {
    const cats = ROLE_CATEGORIES[r] || ['Recruiter'];
    cats.forEach(c => allowedCategoriesSet.add(c));
  });
  const categoryOrder = ['Admin', 'Manager', 'Team Lead', 'Recruiter'];
  const allowedCategories = categoryOrder.filter(c => allowedCategoriesSet.has(c));

  const rawFilteredNav = NAV_ITEMS.filter(item => allowedCategories.includes(item.category));
  
  // Deduplicate by href
  const seenHrefs = new Set<string>();
  const filteredNav = rawFilteredNav.filter(item => {
    if (seenHrefs.has(item.href)) {
      return false;
    }
    seenHrefs.add(item.href);
    return true;
  });

  const handleLogout = () => {
    if (user.role === 'admin' || user.disableBiometric) {
      completeLogout();
    } else {
      setShowCheckOutFaceModal(true);
    }
  };

  const completeLogout = () => {
    logout();
    navigate('/login');
    onClose?.();
  };

  const isActive = (href: string) => {
    if (href === '/recruiter' || href === '/tl' || href === '/manager' || href === '/admin') {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-100">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-slate-100">
        <Link to={user ? ROLE_DASHBOARD[user.role as keyof typeof ROLE_DASHBOARD] || '/' : '/'} className="flex items-center gap-2.5">
          <div className="bg-white p-1 rounded-lg border border-slate-50 shadow-sm flex items-center justify-center">
            <img src={logoImg} alt="White Horse Manpower" className="h-8 w-auto object-contain" />
          </div>
          <div>
            <span className="text-slate-800 block" style={{ fontWeight: 700, fontSize: '0.85rem', lineHeight: '1.2' }}>
              White Horse Manpower
            </span>
            <span className="text-green-600 block" style={{ fontWeight: 600, fontSize: '0.7rem', letterSpacing: '0.05em' }}>
              ATS SYSTEM
            </span>
          </div>
        </Link>
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm" style={{ fontWeight: 600 }}>
              {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-slate-800 text-sm truncate" style={{ fontWeight: 600 }}>{user.name}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${ROLE_COLORS[user.role]}`} style={{ fontWeight: 500 }}>
              {ROLE_LABELS[user.role]}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-4">
          {allowedCategories.filter(cat => filteredNav.some(item => item.category === cat)).map((category) => {
            const categoryItems = filteredNav.filter(item => item.category === category);
            return (
              <div key={category} className="space-y-1">
                {allowedCategories.length > 1 && (
                  <p className="text-[10px] font-bold text-slate-400 px-3 uppercase tracking-wider mb-2 mt-2">
                    {category} Portal
                  </p>
                )}
                {categoryItems.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group ${
                        active
                          ? 'bg-green-600 text-white'
                          : 'text-slate-600 hover:bg-green-50 hover:text-green-800'
                      }`}
                      style={{ fontWeight: active ? 600 : 400 }}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-green-600'}`} />
                      <span className="flex-1">
                        {item.href === '/admin/tasks' && user.role !== 'admin' ? 'My Tasks' : item.label}
                      </span>
                      {active && <ChevronRight className="w-3 h-3 opacity-70" />}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Bottom Actions */}
      <div className="border-t border-slate-100">
        {/* Logout Button */}
        <div className="px-3 py-4 space-y-0.5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full text-left rounded-lg text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            Sign Out
          </button>
        </div>
      </div>

      <FaceVerificationModal
        isOpen={showCheckOutFaceModal}
        disableBiometric={user.disableBiometric}
        onClose={() => setShowCheckOutFaceModal(false)}
        onSuccess={(descriptor, photo) => {
          setShowCheckOutFaceModal(false);
          completeLogout();
        }}
        actionType="checkout"
        preventCancel={false}
        registeredDescriptor={user.faceDescriptor}
      />
    </div>
  );
}
