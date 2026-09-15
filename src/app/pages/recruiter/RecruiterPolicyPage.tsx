import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router';
import {
  BookOpen, Clock, Coffee, CheckSquare, AlertTriangle, ShieldAlert,
  Search, Printer, CheckCircle2, ChevronRight, FileText, UserCheck,
  Target, Flame, Award, Users, AlertCircle, PhoneCall, Mail,
  Sparkles, Check, Download, Layers, ShieldCheck, HeartHandshake,
  TrendingUp, BarChart2, Compass, Briefcase, Star, HelpCircle, MapPin, DollarSign
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function RecruiterPolicyPage() {
  const { user } = useAuth();
  const location = useLocation();

  // Active Policy Tab: Recruiter, Team Leader, or Manager
  const [activeTab, setActiveTab] = useState<'recruiter' | 'tl' | 'manager'>(() => {
    if (location.pathname.includes('/tl')) return 'tl';
    if (location.pathname.includes('/manager')) return 'manager';
    return 'recruiter';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Branch Selection: Bangalore or Hyderabad (as requested by Ahmed Ats)
  const [selectedBranch, setSelectedBranch] = useState<'Bangalore' | 'Hyderabad'>('Hyderabad');

  // Checklists state
  const [recMorningChecklist, setRecMorningChecklist] = useState<Record<number, boolean>>({});
  const [recEodChecklist, setRecEodChecklist] = useState<Record<number, boolean>>({});
  const [tlMorningChecklist, setTlMorningChecklist] = useState<Record<number, boolean>>({});
  const [tlEodChecklist, setTlEodChecklist] = useState<Record<number, boolean>>({});
  const [mgrMorningChecklist, setMgrMorningChecklist] = useState<Record<number, boolean>>({});
  const [mgrMiddayChecklist, setMgrMiddayChecklist] = useState<Record<number, boolean>>({});
  const [mgrEveningChecklist, setMgrEveningChecklist] = useState<Record<number, boolean>>({});

  // Acknowledgement State
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const [ackDate, setAckDate] = useState<string>('');

  const employeeName = user?.name || user?.username || 'Employee';
  const employeeId = user?.employeeId || 'WH-EMP';

  // Dynamic designation based on tab
  const getDesignation = () => {
    if (activeTab === 'manager') return 'Branch / Operations / Team Manager';
    if (activeTab === 'tl') return 'Team Leader – Recruitment';
    return user?.role ? (user.role.toUpperCase() === 'RECRUITER' ? 'Recruitment Executive' : user.role.toUpperCase()) : 'Recruitment Executive';
  };

  useEffect(() => {
    // Sync default tab if pathname changed
    if (location.pathname.includes('/tl')) setActiveTab('tl');
    else if (location.pathname.includes('/manager')) setActiveTab('manager');
  }, [location.pathname]);

  useEffect(() => {
    // Reset category filter and load acknowledgement on tab switch
    setSelectedCategory('all');
    setSearchQuery('');
    const storageKey = `whitehorse_policy_ack_${activeTab}_${user?.id || user?.employeeId || 'default'}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setIsAcknowledged(parsed.acknowledged);
        setAckDate(parsed.date);
        if (parsed.branch) setSelectedBranch(parsed.branch);
      } catch {
        setIsAcknowledged(false);
        setAckDate('');
      }
    } else {
      setIsAcknowledged(false);
      setAckDate('');
    }
  }, [activeTab, user]);

  const handleAcknowledge = () => {
    const todayStr = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    setIsAcknowledged(true);
    setAckDate(todayStr);

    const storageKey = `whitehorse_policy_ack_${activeTab}_${user?.id || user?.employeeId || 'default'}`;
    localStorage.setItem(storageKey, JSON.stringify({
      acknowledged: true,
      date: todayStr,
      employeeName,
      employeeId,
      branch: selectedBranch,
      policy: activeTab
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper filter function
  const isMatch = (sectionNum: string | number, textContent: string, categories: string[]) => {
    if (selectedCategory !== 'all' && !categories.includes(selectedCategory)) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return textContent.toLowerCase().includes(q) || sectionNum.toString() === q;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Print Specific CSS */}
      <style>{`
        @media print {
          nav, header, aside, .no-print, button, input, select {
            display: none !important;
          }
          body, .min-h-screen {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .printable-doc {
            display: block !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
          }
          .page-break {
            page-break-before: always;
          }
        }
      `}</style>

      {/* Top Banner (No-Print) */}
      <div className="no-print bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-600/30 border border-blue-400/40 rounded-xl text-blue-400">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase tracking-wide">
                    White Horse Manpower Policy Manual
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Mandatory Standard
                  </span>
                </div>
                <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-white mt-0.5">
                  Operating Policy, Job Description &amp; Code of Conduct
                </h1>
              </div>
            </div>

            {/* Quick Action Controls */}
            <div className="flex items-center flex-wrap gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all shadow-sm cursor-pointer"
                title="Print official document or save as PDF"
              >
                <Printer className="w-4 h-4 text-slate-400" />
                <span>Print / Download PDF</span>
              </button>

              {isAcknowledged ? (
                <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Acknowledged ({selectedBranch})</span>
                </div>
              ) : (
                <a
                  href="#acknowledgement-section"
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-all shadow-sm animate-pulse"
                >
                  <AlertCircle className="w-4 h-4 text-slate-950" />
                  <span>Sign Acknowledgement</span>
                </a>
              )}
            </div>
          </div>

          {/* 3 Main Role Policy Tabs */}
          <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-slate-800/80 overflow-x-auto scrollbar-thin">
            <button
              onClick={() => setActiveTab('recruiter')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'recruiter'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>1. Recruiter Operating Policy (63 Clauses)</span>
            </button>

            <button
              onClick={() => setActiveTab('tl')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'tl'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>2. Team Leader Operating Policy (60 Sections)</span>
            </button>

            <button
              onClick={() => setActiveTab('manager')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'manager'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>3. Manager Operating Policy (Parts I – XXX)</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* Branch Selector Bar (No-Print) */}
        <div className="no-print bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm mb-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs text-slate-700">
            <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-bold text-slate-900">Select Operating Branch:</span>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
              <button
                type="button"
                onClick={() => setSelectedBranch('Hyderabad')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  selectedBranch === 'Hyderabad'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hyderabad Branch
              </button>
              <button
                type="button"
                onClick={() => setSelectedBranch('Bangalore')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  selectedBranch === 'Bangalore'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bangalore Branch
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Active Office: <span className="font-bold text-slate-800">{selectedBranch}</span> • Timings: <span className="font-bold text-blue-900">9:00 AM – 6:30 PM</span>
          </div>
        </div>

        {/* Live Search Bar (No-Print) */}
        <div className="no-print bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search in ${activeTab === 'recruiter' ? 'Recruiter (63 clauses)' : activeTab === 'tl' ? 'Team Leader (60 sections)' : 'Manager (Parts I-XXX)'} policy by rule, keyword, or number...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAIN DOCUMENT CONTAINER (PRINTABLE) */}
        {/* ========================================================================= */}
        <div className="printable-doc bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10">

          {/* Official Header */}
          <div className="border-b-2 border-slate-900 pb-6 mb-8 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="inline-block px-2.5 py-1 bg-blue-100 text-blue-900 font-bold text-xs rounded tracking-wider uppercase mb-2">
                  White Horse Manpower Consultancy Private Limited
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {activeTab === 'recruiter' && 'RECRUITMENT EXECUTIVE'}
                  {activeTab === 'tl' && 'TEAM LEADER – RECRUITMENT'}
                  {activeTab === 'manager' && 'RECRUITMENT & OPERATIONS MANAGER'}
                </h2>
                <p className="text-base sm:text-lg font-bold text-blue-800 mt-1">
                  {activeTab === 'recruiter' && 'JOB DESCRIPTION, RECRUITMENT OPERATING POLICY & CORPORATE CODE OF CONDUCT'}
                  {activeTab === 'tl' && 'JOB DESCRIPTION, OPERATING POLICY, PERFORMANCE STANDARDS & LEADERSHIP CODE'}
                  {activeTab === 'manager' && 'JOB DESCRIPTION + OPERATING POLICY + LEADERSHIP & CORPORATE CULTURE MANUAL'}
                </p>
                <div className="mt-1 text-xs font-semibold text-slate-600">
                  Document Status: Official Operating Standard • System: NEXORA ATS
                </div>
              </div>

              <div className="text-xs text-slate-600 sm:text-right border sm:border-0 p-3 sm:p-0 rounded-lg bg-slate-50 sm:bg-transparent">
                <p className="font-bold text-slate-800">Corporate Office:</p>
                <p>#12, Office 156, 3rd Floor, Jumma Masjid Golden Complex,</p>
                <p>Jumma Masjid Road, Exit of Commercial Street,</p>
                <p>Bangalore – 560051</p>
                <div className="mt-1 font-extrabold text-blue-900">
                  Bangalore • Hyderabad Branch ({selectedBranch})
                </div>
              </div>
            </div>

            {/* Timings Strip */}
            <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="font-bold text-slate-700">Working Hours:</span>{' '}
                <span className="font-extrabold text-blue-900">9:00 AM – 6:30 PM</span>
              </div>
              <div>
                <span className="font-bold text-slate-700">Breaks:</span>{' '}
                <span className="font-semibold text-slate-900">Lunch: 1:30 PM – 2:15 PM</span> |{' '}
                <span className="font-semibold text-slate-900">Short: 4:00 PM – 4:15 PM</span>
              </div>
              <div>
                <span className="font-bold text-slate-700">Branch Location:</span>{' '}
                <span className="font-extrabold text-emerald-800">{selectedBranch}</span>
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* TAB 1: RECRUITER OPERATING POLICY (63 CLAUSES) */}
          {/* ===================================================================== */}
          {activeTab === 'recruiter' && (
            <div>
              {/* SECTION 1 */}
              {isMatch(1, 'PURPOSE OF THIS POLICY', ['all']) && (
                <div className="mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded">1</span>
                    <h3 className="text-lg font-bold text-slate-900">PURPOSE OF THIS POLICY</h3>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    This document defines the complete expectations of every Recruitment Executive working with{' '}
                    <strong>White Horse Manpower Consultancy Private Limited</strong>.
                  </p>
                  <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">It covers:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs text-slate-700">
                      <div>• Job responsibilities</div>
                      <div>• Recruitment process</div>
                      <div>• Daily operating procedures</div>
                      <div>• Performance targets</div>
                      <div>• Candidate ownership</div>
                      <div>• ATS discipline</div>
                      <div>• Calling standards</div>
                      <div>• Candidate management</div>
                      <div>• HR/client communication</div>
                      <div>• Attendance &amp; punctuality</div>
                      <div>• Dress code &amp; grooming</div>
                      <div>• Floor &amp; mobile discipline</div>
                      <div>• Corporate behaviour</div>
                      <div>• Teamwork &amp; confidentiality</div>
                      <div>• Performance management</div>
                      <div>• Training &amp; escalation</div>
                      <div>• Professional ethics</div>
                      <div>• Selection-to-joining ownership</div>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-600 rounded-r-lg text-xs font-medium text-blue-950">
                    <strong>Notice:</strong> This is not merely a Job Description. It is the day-to-day operating standard for every White Horse Recruiter.
                  </div>
                </div>
              )}

              {/* SECTION 2 */}
              {isMatch(2, 'CORE PURPOSE', ['all']) && (
                <div className="mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded">2</span>
                    <h3 className="text-lg font-bold text-slate-900">THE WHITE HORSE RECRUITER – CORE PURPOSE</h3>
                  </div>
                  <p className="text-sm text-slate-700 font-semibold mb-2">
                    The primary responsibility of a recruiter is:
                  </p>
                  <blockquote className="my-2 p-3 bg-slate-50 border-l-4 border-slate-800 text-xs sm:text-sm font-medium text-slate-900 italic">
                    &quot;To convert client requirements into successful candidate joinings through quality sourcing, 100% screening, professional communication, continuous follow-up and disciplined recruitment execution.&quot;
                  </blockquote>
                  <p className="text-xs text-slate-600 mt-2">A recruiter is NOT employed merely to:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1 text-xs text-rose-700 font-medium">
                    <div className="bg-rose-50 p-2 rounded border border-rose-200">❌ Make calls only</div>
                    <div className="bg-rose-50 p-2 rounded border border-rose-200">❌ Download resumes</div>
                    <div className="bg-rose-50 p-2 rounded border border-rose-200">❌ Forward CVs</div>
                    <div className="bg-rose-50 p-2 rounded border border-rose-200">❌ Fill numbers</div>
                  </div>
                  <div className="mt-3 p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950">
                    <span className="font-extrabold text-amber-900 uppercase tracking-wide block mb-1">Golden Principle:</span>
                    <p className="font-semibold">
                      The recruitment job does not end when the CV is submitted. It does not end when the candidate is selected. <strong>It ends when the candidate joins.</strong>
                    </p>
                  </div>
                </div>
              )}

              {/* SECTION 3, 4, 5 */}
              {isMatch(3, 'PROFESSIONAL IDENTITY WORKING HOURS FIRST 15 MINUTES', ['all']) && (
                <div className="mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded">3, 4 &amp; 5</span>
                    <h3 className="text-lg font-bold text-slate-900">IDENTITY, WORKING HOURS &amp; FIRST 15 MINUTES (9:00 AM – 9:15 AM)</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-1">Section 3 &amp; 4: Identity &amp; Discipline</span>
                      <p className="text-slate-700">Represents: 1. Themselves, 2. White Horse, 3. The Client.</p>
                      <p className="text-blue-900 font-bold mt-1">Professionalism + Integrity + Speed + Accuracy + Respect + Ownership</p>
                      <div className="mt-2 pt-2 border-t border-slate-200 text-amber-900 font-semibold">
                        Important Rule: &quot;9:00 AM means ready to work at 9:00 AM sharp.&quot;
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-1">Section 5: Morning 15-Minute Routine (9:00–9:15 AM)</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-700">
                        {[
                          '1. Mark attendance', '2. Login to systems', '3. Open NEXORA ATS',
                          '4. Check assigned JRs', '5. Check emails', '6. Review pending cases',
                          '7. Today interviews', '8. Selected pipeline', '9. Joining candidates', '10. Urgent follow-ups'
                        ].map((s, i) => (
                          <div key={i} onClick={() => setRecMorningChecklist(p => ({ ...p, [i]: !p[i] }))} className={`p-1 rounded cursor-pointer ${recMorningChecklist[i] ? 'bg-emerald-100 text-emerald-900 font-bold' : ''}`}>
                            {recMorningChecklist[i] ? '✓' : '☐'} {s}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 6 to 8 */}
              {isMatch(6, 'DAILY TEAM HUDDLE FIRST ONE HOUR DAILY PRIORITY ORDER', ['all']) && (
                <div className="mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded">6, 7 &amp; 8</span>
                    <h3 className="text-lg font-bold text-slate-900">HUDDLE, FIRST WORKING HOUR &amp; PRIORITY HIERARCHY</h3>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-3 bg-blue-900 text-white rounded-xl">
                      <span className="font-bold text-amber-400 uppercase tracking-wide block mb-0.5">Section 6: Daily Team Huddle (9:15 AM – 9:30 AM)</span>
                      <p>Every recruiter must be clear on: <strong>&quot;What must I close today?&quot;</strong></p>
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <span className="font-bold text-amber-950 uppercase tracking-wide block mb-0.5">Section 7: First One Hour (Most Important Hour)</span>
                      <p className="text-slate-700">Do NOT begin with random sourcing. Follow up on today&apos;s interviews, yesterday&apos;s interviews, feedback, final rounds, selections, documentation, and joining-risk candidates.</p>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-1">Section 8: Daily Recruitment Priority Order:</span>
                      <p className="font-semibold text-slate-800">Priority 1: Candidate Follow-up ➔ Priority 2: Active JRs ➔ Priority 3: HR Relationship ➔ Priority 4: Sourcing ➔ Priority 5: NEXORA ATS Logging.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 9 to 14 */}
              {isMatch(9, 'LINE UP TARGETS BUSINESS TARGET 100 SCREENING NO UNSCREENED CLIENT FEEDBACK', ['all']) && (
                <div className="mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded">9–14</span>
                    <h3 className="text-lg font-bold text-slate-900">TARGETS, ELIGIBLE LINE-UPS &amp; MANDATORY 100% SCREENING</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-2">Section 9 &amp; 10: Operational &amp; Business Targets</span>
                      <div className="space-y-1.5 text-[11px]">
                        <div className="p-2 bg-white rounded border flex justify-between">
                          <span>Lateral / Vanilla IT</span>
                          <span className="font-bold text-blue-800">Min. 10 Line-ups / Day</span>
                        </div>
                        <div className="p-2 bg-white rounded border flex justify-between">
                          <span>Niche IT</span>
                          <span className="font-bold text-indigo-800">6–8 Line-ups / Day</span>
                        </div>
                        <div className="p-2 bg-white rounded border flex justify-between">
                          <span>BPO Voice Support</span>
                          <span className="font-bold text-emerald-800">Min. 15 Line-ups / Day</span>
                        </div>
                        <div className="p-2 bg-amber-50 rounded border border-amber-300 font-bold text-amber-950">
                          Primary Business Target: Monthly Salary × 5 (or 8 complete selections)
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl">
                      <span className="font-bold text-rose-900 block mb-2">Section 12 &amp; 13: 100% Screening Is Mandatory</span>
                      <p className="text-rose-950 font-semibold mb-1">
                        Screening must cover all 16 parameters (Exp, Skills, Location, Notice, CTC, Shift, Education, Stability).
                      </p>
                      <div className="p-2 bg-white rounded border border-rose-300 text-rose-800 font-bold text-[11px]">
                        GOLDEN RULE: &quot;If you have not properly screened the candidate, DO NOT submit the candidate.&quot;
                      </div>
                      <p className="text-[11px] text-slate-600 mt-2">
                        Section 14: Client feedback must become sourcing action immediately (Feedback ➔ Analyse ➔ Modify Search ➔ Source ➔ Screen ➔ Submit).
                      </p>
                    </div>
                  </div>

                  {/* SALARY & PERFORMANCE INCENTIVE */}
                  <div className="mt-3.5 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl text-xs">
                    <div className="flex items-center space-x-2 text-amber-900 font-extrabold text-sm mb-2">
                      <DollarSign className="w-5 h-5 text-amber-600 shrink-0" />
                      <span>SALARY &amp; PERFORMANCE INCENTIVE</span>
                    </div>
                    <div className="space-y-2 text-slate-800 text-[11px] leading-relaxed">
                      <p>
                        • <strong>Target &amp; Benchmark:</strong> The Recruiter is expected to achieve <strong>100% of the assigned monthly target</strong>, with <strong>75% being the minimum performance benchmark</strong>.
                      </p>
                      <p className="text-rose-900 font-medium">
                        • <strong>Sub-75% Performance:</strong> Performance below 75% may result in performance review and corrective action, subject to Company policy and including reduction in salary if so, or applicable law.
                      </p>
                      <p>
                        • <strong>Discretionary Incentive:</strong> Any performance incentive announced by the Company is discretionary and not a guaranteed or fixed component of salary. Incentives are subject to target achievement, performance verification, revenue realization/collection and the Company&apos;s financial and business circumstances.
                      </p>
                      <p>
                        • <strong>Company Rights:</strong> The Company reserves the right to defer, revise, reduce or withdraw any incentive that has not yet become due and payable, including an incentive previously announced, where business or financial circumstances warrant, subject to applicable law.
                      </p>
                      <p className="text-rose-950 font-semibold">
                        • <strong>Departure / Resignation Forfeiture:</strong> If the employee resigns, is terminated, abandons employment or leaves the Company before the incentive becomes due and payable, such unpaid/conditional incentive shall not be payable, subject to applicable law.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 15 to 25 */}
              {isMatch(15, 'ATS DATABASE CANDIDATE VALIDITY OWNERSHIP SELECTION SALARY SHIFT LOCATION JOINING RISK', ['all']) && (
                <div className="mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded">15–25</span>
                    <h3 className="text-lg font-bold text-slate-900">CANDIDATE OWNERSHIP, VALIDITY &amp; JOINING PROTECTION</h3>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-1">Section 15–17: ATS First, References &amp; 30-Day Candidate Validity</span>
                      <p className="text-slate-700">
                        Always search the existing NEXORA database first. Candidates have a <strong>30-day validity</strong> for recruiter ownership, after which unclosed candidates return to the company pool for active JRs.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="font-bold text-slate-900 block mb-1">Section 18–23: Ownership &amp; Confirmations</span>
                        <p className="text-slate-700">
                          Recruiter owns the candidate from submission through joining. Re-verify Salary, Shift, Location, and Joining Details.
                        </p>
                        <p className="text-rose-700 font-bold mt-1 text-[11px]">Never assume an accepted offer automatically means a joining!</p>
                      </div>

                      <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-xl">
                        <span className="font-extrabold text-rose-900 block mb-1">Section 25: Critical Joining-Risk Signals</span>
                        <p className="text-rose-950 text-[11px] mb-1 font-semibold">Immediate escalation required if candidate mentions:</p>
                        <div className="grid grid-cols-2 gap-1 text-[10px] text-rose-800 font-medium">
                          <div>⚠️ &quot;Thinking about it&quot;</div>
                          <div>⚠️ &quot;Another offer received&quot;</div>
                          <div>⚠️ &quot;Counteroffer received&quot;</div>
                          <div>⚠️ &quot;Shift not comfortable&quot;</div>
                          <div>⚠️ &quot;Location is difficult&quot;</div>
                          <div>⚠️ &quot;Salary concern&quot;</div>
                          <div>⚠️ &quot;Need more time&quot;</div>
                          <div>⚠️ &quot;May not be able to join&quot;</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 26 to 39 */}
              {isMatch(26, 'HR RELATIONSHIP EMAIL DISCIPLINE NEXORA ATS FLOOR DISCIPLINE PROHIBITED MOBILE DRESS GROOMING CORPORATE BEHAVIOUR DO NOT WAIT ATTENDANCE LEAVE', ['all']) && (
                <div className="mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded">26–39</span>
                    <h3 className="text-lg font-bold text-slate-900">SYSTEMS, FLOOR DISCIPLINE, DRESS CODE &amp; ATTENDANCE</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-1">Section 26–30: HR Communication &amp; ATS Discipline</span>
                      <p className="text-slate-700 text-[11px]">
                        <strong>Build Relationships, Not Just Requirements.</strong> Check email checklist before sending. No off-system records (no personal notebooks, WhatsApp, private sheets). NEXORA ATS is the official company record.
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-1">Section 31–35: Floor Discipline, Mobile &amp; Dress Code</span>
                      <p className="text-slate-700 text-[11px]">
                        No reels, shorts, games or shopping during work hours. Mon–Fri: Business Formal. Saturday: Smart Casual. Clean appearance and neat grooming.
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-900 text-white rounded-xl md:col-span-2">
                      <span className="text-amber-400 font-bold block text-xs uppercase mb-1">Section 36 &amp; 37: 7 Pillars &amp; &quot;DO NOT WAIT&quot; Culture</span>
                      <p className="text-slate-300 text-xs">
                        Respect • Integrity • Accountability • Ownership • Discipline • Learning • Teamwork.
                      </p>
                      <p className="text-blue-300 font-bold text-xs mt-1">
                        &quot;DO NOT WAIT: Call ➔ Understand ➔ Follow Up ➔ Resolve ➔ Track ➔ Close.&quot;
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 40 to 59 */}
              {isMatch(40, 'TRAINING CALLING INTERVIEWS REPORTING METRICS PERFORMANCE ZERO TOLERANCE LOW PERFORMANCE SATURDAY TL RESPONSIBILITY SELF CHECK', ['all']) && (
                <div className="mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded">40–59</span>
                    <h3 className="text-lg font-bold text-slate-900">TRAINING, CALLING STANDARDS, METRICS &amp; ZERO-TOLERANCE</h3>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-1">Section 40 &amp; 41: Calling Standard &amp; 1st Week Training</span>
                      <p className="text-slate-700">
                        Intro ➔ Requirement Explanation ➔ Screening ➔ Candidate Interest ➔ Availability ➔ Follow-up ➔ ATS Update. Never guarantee selection or misrepresent salary.
                      </p>
                    </div>

                    <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl">
                      <span className="font-extrabold text-rose-900 block mb-1">Section 55: Zero-Tolerance Serious Misconduct (Termination Under Policy &amp; Law)</span>
                      <p className="text-rose-900 text-[11px]">
                        Fake submissions, fake interviews, fake selections, attendance/biometric tampering, ATS record manipulation, candidate data leakage, client misrepresentation, kickbacks, harassment or abusive behaviour.
                      </p>
                    </div>

                    {/* Section 59 Interactive EOD Checklist */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-1.5">Section 59: Recruiter Self-Check Before Leaving (6:30 PM)</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-700">
                        {[
                          "1. Priority follow-ups completed?", "2. Today's interview candidates contacted?",
                          "3. Selected candidates engaged?", "4. Joining-risk candidates checked?",
                          "5. Sourced for active JRs?", "6. 100% screening verified?",
                          "7. Quality line-ups created?", "8. Followed up with HR?",
                          "9. NEXORA ATS fully updated?", "10. EOD report submitted to TL?",
                          "11. Tomorrow's priorities identified?"
                        ].map((chk, i) => (
                          <div key={i} onClick={() => setRecEodChecklist(p => ({ ...p, [i]: !p[i] }))} className={`p-1 rounded cursor-pointer ${recEodChecklist[i] ? 'bg-blue-100 text-blue-900 font-bold' : ''}`}>
                            {recEodChecklist[i] ? '✓' : '☐'} {chk}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 60 to 63: SUCCESS MODEL & 12 GOLDEN RULES */}
              {isMatch(60, 'SUCCESS MODEL 12 GOLDEN RULES CULTURE STATEMENT FINAL PRINCIPLE', ['all']) && (
                <div className="mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded">60–63</span>
                    <h3 className="text-lg font-bold text-slate-900">SUCCESS MODEL, 12 GOLDEN RULES &amp; FINAL PRINCIPLES</h3>
                  </div>

                  {/* 12 Golden Rules */}
                  <div className="mb-4">
                    <span className="text-xs font-bold text-amber-900 uppercase block mb-2 flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Section 61: The 12 Golden Rules of a White Horse Recruiter</span>
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                      {[
                        '1. Be on time — ready at 9:00 AM sharp.',
                        '2. Be professionally dressed and groomed.',
                        '3. Understand the requirement before sourcing.',
                        '4. Search existing ATS database first.',
                        '5. Screen 100% before submission.',
                        '6. Never submit random CVs to fill numbers.',
                        '7. Follow up before someone reminds you.',
                        '8. Protect every selection until joining.',
                        '9. Maintain professional HR relationships.',
                        '10. Keep NEXORA completely updated.',
                        '11. Respect colleagues, candidates and clients.',
                        '12. Take ownership of results.'
                      ].map((r, i) => (
                        <div key={i} className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-slate-800 font-medium text-[11px]">
                          {r}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Culture statement */}
                  <div className="p-4 bg-slate-900 text-white rounded-xl text-center">
                    <span className="text-amber-400 font-bold text-xs uppercase tracking-widest block mb-1">Section 62 &amp; 63: Culture Statement</span>
                    <p className="text-xl font-black text-white">&quot;WE DO NOT WAIT.&quot;</p>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl mx-auto">
                      We do not wait for candidate to call. We do not wait for HR to remind us. We do not wait for manager to ask. We identify the problem, take action, follow up, communicate, solve and close!
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 2: TEAM LEADER OPERATING POLICY (60 SECTIONS) */}
          {/* ===================================================================== */}
          {activeTab === 'tl' && (
            <div>
              {/* TL SECTION 1 TO 4 */}
              {isMatch(1, 'PURPOSE OF THE TEAM LEADER ROLE CORE RESPONSIBILITY ACCOUNTABLE LEADERSHIP PRINCIPLE', ['all']) && (
                <div className="mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-bold rounded">1–4</span>
                    <h3 className="text-lg font-bold text-slate-900">PURPOSE, CORE ACCOUNTABILITY &amp; LEADERSHIP PRINCIPLE</h3>
                  </div>
                  <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-xl text-xs mb-3">
                    <span className="font-bold text-purple-950 block text-sm mb-1">Section 1: The Team Leader Role</span>
                    <p className="text-purple-900 font-medium">
                      The Team Leader is responsible for converting the recruitment team into a productive, disciplined, skilled and revenue-generating unit.
                    </p>
                    <p className="font-bold text-purple-950 mt-1">
                      Responsible for: People + Process + Productivity + Pipeline + Performance + Candidate Quality + Client Relationship + Revenue + Discipline.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-1">Section 2: Team Leader Owns The Full Cycle</span>
                      <p className="text-slate-700 text-[11px]">
                        Requirement ➔ Allocation ➔ Sourcing ➔ Screening ➔ Line-up ➔ Submission ➔ Interview ➔ Selection ➔ Offer ➔ Joining.
                      </p>
                      <p className="text-slate-600 mt-1 text-[11px]">
                        The TL must constantly know: active JRs, pipeline volume, interview schedules, final rounds, offers, expected revenue, and recruiter roadblocks.
                      </p>
                    </div>

                    <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl">
                      <span className="font-bold text-amber-900 block mb-1">Section 3 &amp; 4: Accountability &amp; Leadership</span>
                      <p className="text-slate-800 text-[11px] font-semibold">
                        A TL cannot say: &quot;My recruiters are not performing.&quot;
                      </p>
                      <p className="text-slate-600 text-[11px] mt-0.5">
                        The TL must diagnose: sourcing skills, requirement understanding, screening, calling, follow-up, attendance, allocation, or training.
                      </p>
                      <div className="mt-2 p-1.5 bg-white border border-amber-300 rounded font-bold text-amber-900 text-center">
                        LEADERSHIP PRINCIPLE: &quot;COACH FIRST. CONTROL SECOND.&quot;
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TL SECTION 5 TO 12 */}
              {isMatch(5, 'DAILY TIMING MORNING TEAM HUDDLE REQUIREMENT ALLOCATION UNDERSTANDING TARGETS PRODUCTIVITY FIRST HOUR', ['all']) && (
                <div className="mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-bold rounded">5–12</span>
                    <h3 className="text-lg font-bold text-slate-900">DAILY TIMINGS, ALLOCATION &amp; TARGET MANAGEMENT</h3>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-1">Section 5 &amp; 6: TL Daily Schedule &amp; Team Huddle (9:15–9:30 AM)</span>
                      <p className="text-slate-700 text-[11px]">
                        9:00 AM: Present &amp; ready. 9:00–9:15 AM: Review attendance, availability, priority JRs, interviews, and joinings. 9:15–9:30 AM: Daily morning briefing. 9:30 AM onward: Remain actively connected on the recruitment floor (do not disappear into an office).
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="font-bold text-slate-900 block mb-1">Section 7 &amp; 8: Intelligent Allocation &amp; Understanding</span>
                        <p className="text-slate-700 text-[11px]">
                          Do not allocate difficult niche JRs blindly to new recruiters without support. Verify recruiter understanding of mandatory skills, CTC, notice period, and interview process before sourcing starts.
                        </p>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="font-bold text-slate-900 block mb-1">Section 9 &amp; 10: Target Cascading (Month ➔ Week ➔ Day)</span>
                        <p className="text-slate-700 text-[11px]">
                          Do not wait until the 25th or 28th to discover gaps. Track Monday expected activity, Wednesday progress, Friday gap, Saturday correction plan.
                        </p>
                        <p className="font-bold text-purple-900 mt-1 text-[11px]">Vanilla IT: 10 line-ups | Niche: 6–8 | BPO: 15 | Revenue: Salary × 5.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TL SECTION 13 TO 22 */}
              {isMatch(13, 'PIPELINE MANAGEMENT SELECTION PROTECTION JOINING RISK SCREENING QUALITY FEEDBACK ATS 30 DAY VALIDITY', ['all']) && (
                <div className="mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-bold rounded">13–22</span>
                    <h3 className="text-lg font-bold text-slate-900">PIPELINE VISIBILITY, QUALITY CONTROL &amp; SELECTION PROTECTION</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-1">Section 14 &amp; 15: Protect Every Selection &amp; Joining Risk</span>
                      <p className="text-slate-700 text-[11px]">
                        Maintain a live list of at-risk candidates. Counter-offers, notice period issues, shift/location concerns must be intervened by TL immediately.
                      </p>
                      <p className="text-rose-700 font-bold mt-1 text-[11px]">Every selection is valuable revenue — protect it until joining day.</p>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-1">Section 16 &amp; 17: 100% Screening Supervision &amp; Quality Audit</span>
                      <p className="text-slate-700 text-[11px]">
                        Conduct random quality audits. Regularly analyze why candidates get rejected: Was it skills, experience, CTC, communication, or resume presentation? Turn rejections into team coaching.
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl md:col-span-2">
                      <span className="font-bold text-slate-900 block mb-1">Section 19–22: NEXORA ATS Management &amp; 30-Day Validity Rule</span>
                      <p className="text-slate-700 text-[11px]">
                        NEXORA ATS must reflect actual floor activity. Zero tolerance for records kept only in personal notebooks or WhatsApp. Enforce the 30-day candidate validity rule — the database belongs to White Horse.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TL SECTION 23 TO 39 */}
              {isMatch(23, 'COACHING TRAINING FLOOR PRESENCE DISCIPLINE LEAD BY EXAMPLE LEADERSHIP COMMUNICATION PUBLIC PRIVATE CORRECTION CULTURE', ['all']) && (
                <div className="mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-bold rounded">23–39</span>
                    <h3 className="text-lg font-bold text-slate-900">RECRUITER COACHING, FLOOR PRESENCE &amp; LEADERSHIP CODE</h3>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="font-bold text-slate-900 block mb-1">Section 23–26: Recruiter Coaching &amp; Training</span>
                        <p className="text-slate-700 text-[11px]">
                          Coach in Boolean search, Naukri, Shine, LinkedIn, screening, and closing. Minimum 1 week hands-on training for new joiners seated near TL. Observe their first calls and provide immediate feedback.
                        </p>
                      </div>

                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="font-bold text-slate-900 block mb-1">Section 27–31: Floor Presence &amp; Lead by Example</span>
                        <p className="text-slate-700 text-[11px]">
                          The TL must be: <strong>Visible + Available + Approachable + Alert</strong>. Demonstrate punctuality, professional dress, and mobile discipline personally. A leader cannot demand what they do not follow.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl">
                      <span className="font-bold text-purple-950 block mb-1">Section 32 &amp; 33: Leadership Communication &amp; Correction</span>
                      <p className="text-purple-900 text-[11px]">
                        <strong>Public:</strong> Recognize good performance, behavior, and teamwork. <strong>Private:</strong> Correct poor performance, attendance, mistakes, and discipline. Never deliberately humiliate a recruiter in front of the team.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TL SECTION 40 TO 49 */}
              {isMatch(40, 'HR RELATIONSHIP CLIENT ESCALATION BUSINESS DEVELOPMENT DATA ANALYSIS HEALTH CHECK DAILY REPORT SATURDAY REVIEW', ['all']) && (
                <div className="mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-bold rounded">40–49</span>
                    <h3 className="text-lg font-bold text-slate-900">CLIENT RELATIONSHIPS, DATA RATIOS &amp; HEALTH CHECKS</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-1">Section 40–42: HR Relationships &amp; Escalation</span>
                      <p className="text-slate-700 text-[11px]">
                        Develop direct touch with client HR. Intervene before delayed feedback becomes a lost candidate. Never blame the recruiter in front of the client — correct internally.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-1">Section 44 &amp; 46: Recruitment Funnel &amp; JR Health</span>
                      <p className="text-slate-700 text-[11px]">
                        Understand recruitment ratios: 100 calls ➔ 30 connected ➔ 15 screened ➔ 8 submitted ➔ 4 interviews ➔ 2 selected ➔ 1 joined.
                      </p>
                      <p className="text-[11px] font-bold text-slate-800 mt-1">
                        JR Status: <span className="text-emerald-700">GREEN</span> (Healthy) | <span className="text-amber-700">AMBER</span> (Insufficient) | <span className="text-rose-700">RED</span> (Intervention).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TL SECTION 50: PERFORMANCE SCORECARD */}
              {isMatch(50, 'SCORECARD KPI WEIGHT REVENUE', ['all']) && (
                <div className="mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-bold rounded">50</span>
                    <h3 className="text-lg font-bold text-slate-900">TEAM LEADER PERFORMANCE SCORECARD</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border border-slate-200 rounded-lg">
                      <thead className="bg-slate-100 font-bold text-slate-800">
                        <tr>
                          <th className="p-2.5 border-b">KPI Metric</th>
                          <th className="p-2.5 border-b text-right">Weight</th>
                          <th className="p-2.5 border-b">Operational Focus</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        <tr><td className="p-2 font-bold text-blue-900">Team Revenue / Joinings</td><td className="p-2 text-right font-extrabold text-blue-900">25%</td><td className="p-2">Direct branch revenue and successful joinings</td></tr>
                        <tr><td className="p-2 font-bold text-indigo-900">Team Target Achievement</td><td className="p-2 text-right font-extrabold text-indigo-900">15%</td><td className="p-2">Consolidated line-up and placement targets</td></tr>
                        <tr><td className="p-2 font-semibold">Selection Conversion</td><td className="p-2 text-right font-bold">10%</td><td className="p-2">Ratio of interviews turning into client selections</td></tr>
                        <tr><td className="p-2 font-semibold">Candidate Quality</td><td className="p-2 text-right font-bold">10%</td><td className="p-2">Zero irrelevant submissions, 100% screened</td></tr>
                        <tr><td className="p-2 font-semibold">Client Satisfaction</td><td className="p-2 text-right font-bold">10%</td><td className="p-2">Positive HR feedback and repeat requirements</td></tr>
                        <tr><td className="p-2 font-semibold">Recruiter Productivity</td><td className="p-2 text-right font-bold">10%</td><td className="p-2">Daily calls, line-ups, and individual growth</td></tr>
                        <tr><td className="p-2">Recruiter Development</td><td className="p-2 text-right">5%</td><td className="p-2">Coaching and training new/existing recruiters</td></tr>
                        <tr><td className="p-2">ATS Discipline</td><td className="p-2 text-right">5%</td><td className="p-2">100% NEXORA data accuracy and JR tagging</td></tr>
                        <tr><td className="p-2">Attendance &amp; Floor Discipline</td><td className="p-2 text-right">5%</td><td className="p-2">Punctuality, break control, and floor decorum</td></tr>
                        <tr><td className="p-2">Leadership / Team Culture</td><td className="p-2 text-right">5%</td><td className="p-2">Fairness, motivation, zero internal politics</td></tr>
                        <tr className="bg-purple-50 font-extrabold text-purple-950">
                          <td className="p-2.5">TOTAL COMPOSITE EVALUATION</td>
                          <td className="p-2.5 text-right text-sm">100%</td>
                          <td className="p-2.5">Evaluates team success, not individual billing alone</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* SALARY & PERFORMANCE INCENTIVE */}
                  <div className="mt-3.5 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-xl text-xs">
                    <div className="flex items-center space-x-2 text-purple-950 font-extrabold text-sm mb-2">
                      <DollarSign className="w-5 h-5 text-purple-600 shrink-0" />
                      <span>SALARY &amp; PERFORMANCE INCENTIVE POLICY</span>
                    </div>
                    <div className="space-y-2 text-slate-800 text-[11px] leading-relaxed">
                      <p>
                        • <strong>Target &amp; Benchmark:</strong> The Team Leader and Recruiter are expected to achieve <strong>100% of the assigned monthly target</strong>, with <strong>75% being the minimum performance benchmark</strong>.
                      </p>
                      <p className="text-rose-900 font-medium">
                        • <strong>Sub-75% Performance:</strong> Performance below 75% may result in performance review and corrective action, subject to Company policy and including reduction in salary if so, or applicable law.
                      </p>
                      <p>
                        • <strong>Discretionary Incentive:</strong> Any performance incentive announced by the Company is discretionary and not a guaranteed or fixed component of salary. Incentives are subject to target achievement, performance verification, revenue realization/collection and the Company&apos;s financial and business circumstances.
                      </p>
                      <p>
                        • <strong>Company Rights:</strong> The Company reserves the right to defer, revise, reduce or withdraw any incentive that has not yet become due and payable, including an incentive previously announced, where business or financial circumstances warrant, subject to applicable law.
                      </p>
                      <p className="text-rose-950 font-semibold">
                        • <strong>Departure / Resignation Forfeiture:</strong> If the employee resigns, is terminated, abandons employment or leaves the Company before the incentive becomes due and payable, such unpaid/conditional incentive shall not be payable, subject to applicable law.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TL SECTION 51 TO 58 */}
              {isMatch(51, 'REVENUE ACCOUNTABILITY NOT COMPETE ESCALATION CONFIDENTIALITY FAVOURITISM POLITICS CONFLICT ZERO TOLERANCE', ['all']) && (
                <div className="mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-bold rounded">51–58</span>
                    <h3 className="text-lg font-bold text-slate-900">REVENUE ACCOUNTABILITY, CONFLICT RESOLUTION &amp; ZERO-TOLERANCE</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-1">Section 52: TL Should Not Compete With The Team</span>
                      <p className="text-slate-700 text-[11px]">
                        A TL may personally close difficult positions, but the primary responsibility is to <strong>make the team successful</strong>. A TL who generates billing personally but leaves the team failing is not fulfilling leadership.
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-1">Section 57: Conflict Management (7-Step Standard)</span>
                      <p className="text-slate-700 text-[11px]">
                        1. Listen to both sides ➔ 2. Check NEXORA records ➔ 3. Verify actual activity ➔ 4. Establish facts ➔ 5. Apply company rules ➔ 6. Resolve professionally ➔ 7. Escalate if necessary. Never decide based on emotion.
                      </p>
                    </div>

                    <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl md:col-span-2">
                      <span className="font-extrabold text-rose-900 block mb-1">Section 58: Zero-Tolerance Leadership Violations</span>
                      <p className="text-rose-900 text-[11px]">
                        Manipulating performance numbers, fake reporting, hiding candidate information, ATS manipulation, client misrepresentation, financial misconduct, confidential data leakage, discrimination, or abusive behaviour.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TL SECTION 59 & 60: 15 GOLDEN RULES & LEADERSHIP MODEL */}
              {isMatch(59, '15 GOLDEN RULES LEADERSHIP CULTURE MODEL MOTTO', ['all']) && (
                <div className="mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-bold rounded">59 &amp; 60</span>
                    <h3 className="text-lg font-bold text-slate-900">THE TEAM LEADER&apos;S 15 GOLDEN RULES &amp; LEADERSHIP MODEL</h3>
                  </div>

                  <div className="mb-4">
                    <span className="text-xs font-bold text-purple-900 uppercase block mb-2">
                      Section 59: The Team Leader&apos;s 15 Golden Rules
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                      {[
                        '1. Arrive prepared before floor start.',
                        '2. Know your numbers every day.',
                        '3. Know your requirements intimately.',
                        '4. Know your candidates & pipeline.',
                        "5. Know your team's strengths & weaknesses.",
                        '6. Never ignore a final-round candidate.',
                        '7. Never allow poor submissions to become normal.',
                        '8. Coach before criticising.',
                        '9. Correct privately and recognise publicly.',
                        '10. Use data, not emotion.',
                        '11. Maintain proactive HR relationships.',
                        '12. Keep NEXORA 100% accurate.',
                        '13. Protect every genuine selection.',
                        '14. Build people, not dependency.',
                        "15. Own the entire team's result."
                      ].map((r, i) => (
                        <div key={i} className="p-2.5 bg-purple-50/70 border border-purple-200 rounded-lg text-slate-800 font-medium text-[11px]">
                          {r}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Team Leader Model */}
                  <div className="p-4 bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white rounded-xl text-center">
                    <span className="text-amber-400 font-bold text-xs uppercase tracking-widest block mb-1">
                      THE WHITE HORSE TEAM LEADER MODEL
                    </span>
                    <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-slate-200 my-2">
                      <span>LEAD</span> ➔ <span>TRAIN</span> ➔ <span>PLAN</span> ➔ <span>ALLOCATE</span> ➔ <span>MONITOR</span> ➔ <span>COACH</span> ➔ <span>CORRECT</span> ➔ <span>MOTIVATE</span> ➔ <span>CONVERT</span> ➔ <span>CLOSE</span> ➔ <span className="font-bold text-emerald-400">DEVELOP THE NEXT LEADER</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-amber-300 font-semibold text-left">
                      <div>&quot;DON&apos;T MANAGE ACTIVITY. BUILD PERFORMANCE.&quot;</div>
                      <div>&quot;DON&apos;T WAIT FOR PROBLEMS. IDENTIFY THEM EARLY.&quot;</div>
                      <div>&quot;DON&apos;T JUST DEMAND RESULTS. BUILD THE PEOPLE WHO PRODUCE THEM.&quot;</div>
                      <div>&quot;PROTECT CLIENT. PROTECT CANDIDATE. PROTECT TEAM. PROTECT BUSINESS.&quot;</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 3: MANAGER OPERATING POLICY (PARTS I – XXX) */}
          {/* ===================================================================== */}
          {activeTab === 'manager' && (
            <div>
              {/* PART I TO III: ROLE, ACCOUNTABILITY, MODEL */}
              {isMatch(1, 'PART I II III PURPOSE ACCOUNTABILITY SUCCESS EQUATION', ['all']) && (
                <div className="mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded">Parts I–III</span>
                    <h3 className="text-lg font-bold text-slate-900">MANAGER ROLE, TOTAL ACCOUNTABILITY &amp; SUCCESS EQUATION</h3>
                  </div>
                  <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs mb-3">
                    <span className="font-bold text-amber-950 block text-sm mb-1">Part I: Purpose of the Manager Role</span>
                    <p className="text-amber-900 font-medium">
                      The Manager is responsible for converting the company&apos;s recruitment capability into a disciplined, profitable, scalable and high-performing business operation.
                    </p>
                    <p className="font-bold text-amber-950 mt-1">
                      Fundamental Responsibility: &quot;Build the team, protect the business, develop the people and deliver predictable results.&quot;
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-1">Part II: Total Management Accountability (20 Checkpoints)</span>
                      <p className="text-slate-700 text-[11px]">
                        The Manager owns overall branch results: JR understanding, TL targets, intelligent allocation, productivity, screening relevance, selection protection, risk control, feedback loop, ATS accuracy, training, client relations, and revenue target achievement.
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-900 text-white rounded-xl">
                      <span className="font-bold text-amber-400 block mb-1">Part III: The Manager Success Equation</span>
                      <p className="text-xl font-extrabold text-white mt-1">PEOPLE + PROCESS + PERFORMANCE + PROFIT + CLIENT + CULTURE</p>
                      <p className="text-slate-300 text-[11px] mt-1">
                        Achieving revenue while damaging process or culture is not success. Maintaining discipline while missing business targets is also not success. The Manager must balance both.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* PART IV TO VI: DAILY DISCIPLINE, JRs, PERFORMANCE */}
              {isMatch(4, 'PART IV V VI WORKING HOURS HUDDLE REQUIREMENT OWNERSHIP PRIORITIZATION RED AMBER GREEN AGEING TARGET CASCADING', ['all']) && (
                <div className="mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded">Parts IV–VI</span>
                    <h3 className="text-lg font-bold text-slate-900">DAILY OPERATING DISCIPLINE, REQUIREMENT PRIORITIZATION &amp; TARGETS</h3>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-1">Part IV: Operating Hours &amp; First 15 Minutes</span>
                      <p className="text-slate-700 text-[11px]">
                        Timings: <strong>9:00 AM – 6:30 PM</strong> (Lunch: 1:30–2:15 PM, Break: 4:00–4:15 PM). The Manager must not routinely leave the recruitment floor during critical operating periods. First 15 mins: Verify attendance, critical requirements, expected joins, and high-risk candidates.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                        <span className="font-extrabold text-rose-900 block mb-0.5">RED — Critical JRs</span>
                        <p className="text-rose-800 text-[11px]">Client escalation, immediate joining, old ageing, low pipeline, high revenue value. Reviewed daily.</p>
                      </div>
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <span className="font-extrabold text-amber-900 block mb-0.5">AMBER — Watch JRs</span>
                        <p className="text-amber-800 text-[11px]">Moderate pipeline, pending client feedback, difficult skill sourcing, slow client response.</p>
                      </div>
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <span className="font-extrabold text-emerald-900 block mb-0.5">GREEN — Healthy JRs</span>
                        <p className="text-emerald-800 text-[11px]">Good pipeline, regular interviews progressing, positive feedback, expected selections.</p>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-1">Part VI: Target Cascading Math Model</span>
                      <p className="text-slate-700 text-[11px]">
                        Break monthly branch target (e.g. ₹10,00,000) into required line-ups, interviews, selections, conversion rates, and revenue per join. Targets must be mathematically supported by pipeline.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* PART VII TO XII: REVENUE PROTECTION, CLIENTS, ATS, PEOPLE */}
              {isMatch(7, 'PART VII VIII IX X XI XII CANDIDATE SELECTION JOINING RISK CLIENT HR NEXORA ATS PEOPLE COACHING FLOOR DISCIPLINE', ['all']) && (
                <div className="mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded">Parts VII–XII</span>
                    <h3 className="text-lg font-bold text-slate-900">CANDIDATE PROTECTION, CLIENT RELATIONSHIPS &amp; FLOOR CULTURE</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-1">Part VII: Selection Protection &amp; Dropout Analysis</span>
                      <p className="text-slate-700 text-[11px]">
                        Personally review candidates with counteroffers, salary disputes, or long notice. When a dropout occurs, find the root cause ➔ correct the process ➔ prevent recurrence.
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-1">Part VIII: Client Ownership &amp; Escalation</span>
                      <p className="text-slate-700 text-[11px]">
                        When a client complains, own the issue immediately. Establish what happened, why, who owns action, by when, and how recurrence will be stopped. Never blame recruiters to clients.
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-1">Part IX: NEXORA ATS Audit</span>
                      <p className="text-slate-700 text-[11px]">
                        Regular audits for missing statuses, unclosed JRs, and unlogged follow-ups. If it is not in the system, management cannot reliably control it.
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-1">Part X &amp; XII: People Builder &amp; Communication</span>
                      <p className="text-slate-700 text-[11px]">
                        Communication standard: Situation ➔ Impact ➔ Action ➔ Owner ➔ Deadline ➔ Follow-up. (No vague &quot;do something&quot; instructions). Public appreciation, private correction.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* PART XIII TO XVI: REVENUE, PROFITABILITY & SCORECARD */}
              {isMatch(13, 'PART XIII XIV XV XVI REVENUE PROFITABILITY PAYMENT INVOICE SCORECARD SCOREBOARD', ['all']) && (
                <div className="mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded">Parts XIII–XVI</span>
                    <h3 className="text-lg font-bold text-slate-900">REVENUE, PROFITABILITY &amp; MANAGER SCORECARD</h3>
                  </div>

                  <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs mb-3">
                    <span className="font-bold text-amber-950 block">Part XV: Profitability Awareness: Revenue ≠ Profit</span>
                    <p className="text-slate-800 text-[11px] mt-0.5">
                      Monitor salary cost, portal cost, office expenses, recruitment productivity, and client payment cycle. Completed placements must move swiftly: <strong>Joining ➔ Eligibility ➔ Invoice ➔ Client Submission ➔ Payment Tracking.</strong>
                    </p>
                  </div>

                  <div className="overflow-x-auto mb-4">
                    <table className="w-full text-xs text-left border border-slate-200 rounded-lg">
                      <thead className="bg-slate-100 font-bold text-slate-800">
                        <tr>
                          <th className="p-2.5 border-b">Manager Evaluation KPI</th>
                          <th className="p-2.5 border-b text-right">Weight</th>
                          <th className="p-2.5 border-b">Performance Focus</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        <tr><td className="p-2 font-bold text-blue-900">Revenue / Joining Achievement</td><td className="p-2 text-right font-extrabold text-blue-900">25%</td><td className="p-2">Target vs actual branch billing</td></tr>
                        <tr><td className="p-2 font-bold text-indigo-900">Team Target Achievement</td><td className="p-2 text-right font-extrabold text-indigo-900">15%</td><td className="p-2">Line-up, interview, and offer milestones</td></tr>
                        <tr><td className="p-2 font-semibold">Recruitment Conversion</td><td className="p-2 text-right font-bold">10%</td><td className="p-2">Selection and offer-to-join ratios</td></tr>
                        <tr><td className="p-2 font-semibold">Client Satisfaction &amp; Retention</td><td className="p-2 text-right font-bold">10%</td><td className="p-2">Account retention, expansion, and feedback</td></tr>
                        <tr><td className="p-2 font-semibold">Team Productivity</td><td className="p-2 text-right font-bold">10%</td><td className="p-2">Output per recruiter and per TL</td></tr>
                        <tr><td className="p-2">Candidate Quality</td><td className="p-2 text-right">5%</td><td className="p-2">Rejection reduction and dropout control</td></tr>
                        <tr><td className="p-2">Requirement Management</td><td className="p-2 text-right">5%</td><td className="p-2">JR ageing control and allocation balance</td></tr>
                        <tr><td className="p-2">People Development</td><td className="p-2 text-right">5%</td><td className="p-2">Developing future TLs and managers</td></tr>
                        <tr><td className="p-2">NEXORA / Process Compliance</td><td className="p-2 text-right">5%</td><td className="p-2">ATS audit scores and data integrity</td></tr>
                        <tr><td className="p-2">Attendance &amp; Discipline</td><td className="p-2 text-right">5%</td><td className="p-2">Punctuality, floor order, and compliance</td></tr>
                        <tr><td className="p-2">Leadership &amp; Corporate Culture</td><td className="p-2 text-right">5%</td><td className="p-2">Leading by example, fairness, zero politics</td></tr>
                        <tr className="bg-amber-50 font-extrabold text-amber-950">
                          <td className="p-2.5">TOTAL COMPOSITE EVALUATION</td>
                          <td className="p-2.5 text-right text-sm">100%</td>
                          <td className="p-2.5">90–100%: Exceptional | 80–89%: Excellent | 70–79%: Good</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* SALARY & PERFORMANCE INCENTIVE */}
                  <div className="mt-3.5 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl text-xs">
                    <div className="flex items-center space-x-2 text-amber-950 font-extrabold text-sm mb-2">
                      <DollarSign className="w-5 h-5 text-amber-600 shrink-0" />
                      <span>SALARY &amp; PERFORMANCE INCENTIVE POLICY</span>
                    </div>
                    <div className="space-y-2 text-slate-800 text-[11px] leading-relaxed">
                      <p>
                        • <strong>Target &amp; Benchmark:</strong> The Manager, Team Leader, and Recruiter are expected to achieve <strong>100% of the assigned monthly target</strong>, with <strong>75% being the minimum performance benchmark</strong>.
                      </p>
                      <p className="text-rose-900 font-medium">
                        • <strong>Sub-75% Performance:</strong> Performance below 75% may result in performance review and corrective action, subject to Company policy and including reduction in salary if so, or applicable law.
                      </p>
                      <p>
                        • <strong>Discretionary Incentive:</strong> Any performance incentive announced by the Company is discretionary and not a guaranteed or fixed component of salary. Incentives are subject to target achievement, performance verification, revenue realization/collection and the Company&apos;s financial and business circumstances.
                      </p>
                      <p>
                        • <strong>Company Rights:</strong> The Company reserves the right to defer, revise, reduce or withdraw any incentive that has not yet become due and payable, including an incentive previously announced, where business or financial circumstances warrant, subject to applicable law.
                      </p>
                      <p className="text-rose-950 font-semibold">
                        • <strong>Departure / Resignation Forfeiture:</strong> If the employee resigns, is terminated, abandons employment or leaves the Company before the incentive becomes due and payable, such unpaid/conditional incentive shall not be payable, subject to applicable law.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* PART XX TO XXV: ESCALATIONS, ETHICS, BEHAVIOUR, PHILOSOPHY */}
              {isMatch(20, 'PART XX XXI XXII XXIII XXIV XXV ESCALATION CONFIDENTIALITY ZERO TOLERANCE DECISION FRAMEWORK BEHAVIOURAL PHILOSOPHY', ['all']) && (
                <div className="mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded">Parts XX–XXV</span>
                    <h3 className="text-lg font-bold text-slate-900">ESCALATION, BUSINESS INTEGRITY &amp; DECISION FRAMEWORK</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 block mb-1">Part XX: Escalation Principle</span>
                      <p className="text-slate-700 text-[11px]">
                        Never hide a problem. A hidden problem becomes a disaster.
                      </p>
                      <p className="text-blue-900 font-extrabold mt-1 text-[11px]">
                        &quot;Early escalation is leadership. Late escalation is negligence.&quot;
                      </p>
                    </div>

                    <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl">
                      <span className="font-extrabold text-rose-900 block mb-1">Part XXII: Zero Tolerance – Business Integrity</span>
                      <p className="text-rose-900 text-[11px]">
                        Data theft, false reporting, fake candidates/interviews/joins, ATS manipulation, client misrepresentation, bribery/kickbacks, confidential leaks. Subject to termination under policy &amp; law.
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl md:col-span-2">
                      <span className="font-bold text-slate-900 block mb-1">Part XXIII: 7-Question Decision Framework</span>
                      <p className="text-slate-700 text-[11px] mb-1">Before making any major decision, ask:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[10px] text-slate-800">
                        <div>1. Good for candidate?</div>
                        <div>2. Good for client?</div>
                        <div>3. Good for employee?</div>
                        <div>4. Good for White Horse?</div>
                        <div>5. Compliant with policy?</div>
                        <div>6. Financially sensible?</div>
                        <div>7. Defensible to management?</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PART XXVI: MANAGER'S DAILY CHECKLISTS */}
              {isMatch(26, 'PART XXVI DAILY CHECKLIST MORNING MIDDAY EVENING', ['all']) && (
                <div className="mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded">Part XXVI</span>
                    <h3 className="text-lg font-bold text-slate-900">MANAGER&apos;S DAILY OPERATING CHECKLISTS</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-blue-900 block mb-2">Section 67: Morning Routine</span>
                      <div className="space-y-1 text-[11px] text-slate-700">
                        {[
                          'Attendance checked', 'Critical JRs reviewed', "Today's interviews reviewed",
                          'Joining pipeline checked', 'High-risk candidates tagged', 'TLs briefed', 'Priority JRs allocated'
                        ].map((c, i) => (
                          <div key={i} onClick={() => setMgrMorningChecklist(p => ({ ...p, [i]: !p[i] }))} className={`p-1 rounded cursor-pointer ${mgrMorningChecklist[i] ? 'bg-blue-100 text-blue-900 font-bold' : ''}`}>
                            {mgrMorningChecklist[i] ? '✓' : '☐'} {c}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-amber-900 block mb-2">Section 68: Midday Routine</span>
                      <div className="space-y-1 text-[11px] text-slate-700">
                        {[
                          'Recruiter output checked', 'Interview status tracked', 'Client feedback checked',
                          'Critical candidates called', 'RED JRs reviewed', 'Underperformers coached'
                        ].map((c, i) => (
                          <div key={i} onClick={() => setMgrMiddayChecklist(p => ({ ...p, [i]: !p[i] }))} className={`p-1 rounded cursor-pointer ${mgrMiddayChecklist[i] ? 'bg-amber-100 text-amber-900 font-bold' : ''}`}>
                            {mgrMiddayChecklist[i] ? '✓' : '☐'} {c}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-emerald-900 block mb-2">Section 69: Evening Routine</span>
                      <div className="space-y-1 text-[11px] text-slate-700">
                        {[
                          'Selections confirmed', 'Joining pipeline updated', 'Candidate risks reviewed',
                          'Client follow-ups done', 'NEXORA updated', 'Team reviewed', "Tomorrow's priorities set"
                        ].map((c, i) => (
                          <div key={i} onClick={() => setMgrEveningChecklist(p => ({ ...p, [i]: !p[i] }))} className={`p-1 rounded cursor-pointer ${mgrEveningChecklist[i] ? 'bg-emerald-100 text-emerald-900 font-bold' : ''}`}>
                            {mgrEveningChecklist[i] ? '✓' : '☐'} {c}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PART XXVII TO XXX: 20 GOLDEN RULES & FINAL MOTTO */}
              {isMatch(27, 'PART XXVII XXVIII XXIX XXX 20 GOLDEN RULES CORE SCOREBOARD ACCOUNTABILITY MATRIX FINAL PRINCIPLE MOTTO', ['all']) && (
                <div className="mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded">Parts XXVII–XXX</span>
                    <h3 className="text-lg font-bold text-slate-900">20 GOLDEN RULES, SCOREBOARD &amp; FINAL MANAGEMENT STANDARD</h3>
                  </div>

                  {/* 20 Golden Rules */}
                  <div className="mb-4">
                    <span className="text-xs font-bold text-amber-950 uppercase block mb-2">
                      Section 70: 20 Golden Management Rules
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                      {[
                        '1. Own the result.', '2. Never hide a problem.', '3. Do not wait for escalation.',
                        '4. Know your numbers daily.', '5. Know your people.', '6. Know your requirements.',
                        '7. Protect every selection.', '8. Feedback = business intel.', '9. NEXORA is source of truth.',
                        '10. Coach before you punish.', '11. Correct privately.', '12. Recognize publicly.',
                        '13. Never show favoritism.', '14. Stop internal politics.', '15. Lead by example.',
                        '16. Build future leaders.', '17. Protect candidate/client data.', '18. Reputation > revenue.',
                        '19. Never sacrifice ethics for target.', '20. Leave team stronger than found.'
                      ].map((r, i) => (
                        <div key={i} className="p-2 bg-amber-50/70 border border-amber-200 rounded text-slate-800 font-medium text-[11px]">
                          {r}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Final Motto Card */}
                  <div className="p-5 bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white rounded-xl text-center">
                    <span className="text-amber-400 font-bold text-xs uppercase tracking-widest block mb-1">
                      PART XXX: THE WHITE HORSE MANAGER&apos;S FINAL PRINCIPLE
                    </span>
                    <p className="text-xs sm:text-sm text-slate-200 max-w-2xl mx-auto italic mb-3">
                      &quot;A Manager is not successful because the Manager personally solves every problem. A Manager is successful when the team can solve problems, achieve targets, serve clients and grow the business without constant dependency on the Manager.&quot;
                    </p>
                    <div className="pt-3 border-t border-slate-800 text-amber-300 font-black text-sm tracking-wider">
                      BUILD PEOPLE. CONTROL PROCESS. PROTECT CLIENTS. DELIVER RESULTS. GROW REVENUE. DEVELOP LEADERS.
                    </div>
                    <div className="text-white font-extrabold text-base sm:text-lg mt-1 tracking-wide">
                      &quot;DON&apos;T JUST MANAGE THE BRANCH. BUILD THE BRANCH.&quot;
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* EMPLOYEE ACKNOWLEDGEMENT & SIGNATURE SECTION (WITH BANGALORE / HYD OPTION) */}
          {/* ========================================================================= */}
          <div id="acknowledgement-section" className="pt-4">
            <div className="border-2 border-blue-600/70 rounded-2xl p-6 sm:p-8 bg-blue-50/30">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-blue-200 pb-3 mb-4">
                <div className="flex items-center space-x-2 text-blue-900 font-black text-base sm:text-lg">
                  <FileText className="w-6 h-6 text-blue-700" />
                  <span>
                    {activeTab === 'recruiter' && 'RECRUITER EMPLOYEE ACKNOWLEDGEMENT'}
                    {activeTab === 'tl' && 'TEAM LEADER LEADERSHIP UNDERTAKING & ACKNOWLEDGEMENT'}
                    {activeTab === 'manager' && 'MANAGER OPERATING COMPLIANCE & UNDERTAKING'}
                  </span>
                </div>

                {/* Branch selector toggle in acknowledgement */}
                <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg border border-blue-200 text-xs">
                  <span className="font-bold text-slate-700">Select Branch:</span>
                  <label className="flex items-center space-x-1 cursor-pointer font-semibold text-slate-800">
                    <input
                      type="radio"
                      name="ackBranchSelect"
                      value="Hyderabad"
                      checked={selectedBranch === 'Hyderabad'}
                      onChange={() => setSelectedBranch('Hyderabad')}
                      className="text-blue-600"
                    />
                    <span>Hyderabad</span>
                  </label>
                  <label className="flex items-center space-x-1 cursor-pointer font-semibold text-slate-800 ml-2">
                    <input
                      type="radio"
                      name="ackBranchSelect"
                      value="Bangalore"
                      checked={selectedBranch === 'Bangalore'}
                      onChange={() => setSelectedBranch('Bangalore')}
                      className="text-blue-600"
                    />
                    <span>Bangalore</span>
                  </label>
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">
                I confirm that I have read, understood and agree to follow the <strong>White Horse Manpower Consultancy Private Limited</strong>{' '}
                {activeTab === 'recruiter' && 'Recruitment Operating Policy, Job Responsibilities, Performance Targets and Corporate Code of Conduct.'}
                {activeTab === 'tl' && 'Team Leader Operating Policy, Leadership Code, Performance Scorecard and Golden Rules.'}
                {activeTab === 'manager' && 'Management Operating Policy, Total Accountability Matrix, Leadership Manual and 20 Golden Rules.'}
              </p>
              <p className="text-xs text-slate-700 leading-relaxed mt-1">
                I understand that my responsibilities include recruitment outcomes, attendance, floor discipline, candidate ownership, NEXORA ATS accuracy, confidentiality, professional ethics and adherence to company standards.
              </p>
              <div className="mt-2.5 p-3 bg-amber-50/80 border border-amber-300 rounded-lg text-xs text-slate-800 leading-relaxed">
                <span className="font-bold text-amber-950 block mb-1 flex items-center space-x-1.5">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                  <span>Salary &amp; Performance Incentive Undertaking:</span>
                </span>
                I expressly understand and agree that I am expected to achieve 100% of my assigned monthly target, with 75% being the minimum performance benchmark (performance below 75% may result in performance review, corrective action, or salary reduction as per policy/law). I understand that any performance incentive is purely discretionary, conditional on revenue realization, and not a fixed salary component. Furthermore, I agree that if I resign, abandon employment, or leave the Company before an incentive becomes due and payable, such conditional incentive shall not be payable.
              </div>

              {/* Form Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-5 text-xs">
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Employee Name:</span>
                  <span className="font-bold text-slate-900 text-sm">{employeeName}</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Employee ID:</span>
                  <span className="font-bold text-slate-900 text-sm">{employeeId}</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Designation:</span>
                  <span className="font-bold text-slate-900 text-sm">{getDesignation()}</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Operating Branch:</span>
                  <span className="font-extrabold text-blue-900 text-sm">{selectedBranch}</span>
                </div>
              </div>

              {/* Printable Signatures Block (with Bangalore or Hyd Option) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 border-t border-slate-300 text-xs">
                <div>
                  <div className="h-12 border-b border-dashed border-slate-400 mb-1 flex items-end">
                    {isAcknowledged && (
                      <span className="text-emerald-700 font-bold text-sm italic pb-1">
                        Digitally Signed: {employeeName}
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-slate-800 block">Employee Signature</span>
                  <span className="text-slate-500 text-[11px]">
                    Date: {isAcknowledged ? ackDate : new Date().toLocaleDateString('en-IN')}
                  </span>
                </div>

                <div>
                  <div className="h-12 border-b border-dashed border-slate-400 mb-1"></div>
                  <span className="font-bold text-slate-800 block">Team Manager / TL Signature</span>
                  <span className="text-slate-700 font-bold text-[11px]">
                    Branch: {selectedBranch}
                  </span>
                </div>
              </div>

              {/* Action Controls (No-Print) */}
              <div className="no-print mt-6 pt-4 border-t border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  {isAcknowledged ? (
                    <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>Acknowledged for {selectedBranch} Branch on {ackDate}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600">
                      Click below to formally record your adherence. This compliance record is stored under your employee profile.
                    </p>
                  )}
                </div>

                {!isAcknowledged ? (
                  <button
                    onClick={handleAcknowledge}
                    className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>I Agree &amp; Formally Acknowledge This Policy ({selectedBranch})</span>
                  </button>
                ) : (
                  <button
                    onClick={handlePrint}
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Signed Document</span>
                  </button>
                )}
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
