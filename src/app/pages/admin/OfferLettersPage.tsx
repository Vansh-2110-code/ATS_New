import React, { useState, useEffect, useRef } from 'react';
import {
  FileSignature, Plus, Search, Filter, Download, Mail, Eye, Edit2, Trash2,
  CheckCircle2, Clock, AlertCircle, Printer, X, ChevronRight, User, Building,
  DollarSign, Briefcase, Calendar, MapPin, RefreshCw, Send, Check
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface TemplateOption {
  key: string;
  name: string;
  filename: string;
  defaultDesignation: string;
  defaultReportingTo: string;
  defaultPlaceOfPosting: string;
  defaultKpis: { area: string; measurement: string }[];
}

interface OfferLetterItem {
  _id: string;
  offerNumber: string;
  templateKey: string;
  templateName: string;
  recipientType: 'candidate' | 'employee' | 'custom';
  recipient: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    designation: string;
    dateOfJoining?: string;
    dateOfJoiningStr?: string;
    reportingTo?: string;
    placeOfPosting?: string;
  };
  terms: {
    probationMonths: number;
    probationNoticeDays: number;
    confirmedNoticeDays: number;
    workLocation: string;
  };
  salary: {
    grossMonthly: number;
    grossAnnual: number;
    basicMonthly: number;
    basicAnnual: number;
    hraMonthly: number;
    hraAnnual: number;
    specialAllowanceMonthly: number;
    specialAllowanceAnnual: number;
    pfMonthly: string;
    pfAnnual: string;
    esiMonthly: string;
    esiAnnual: string;
    ptMonthly: string;
    ptAnnual: string;
    tdsMonthly: string;
    tdsAnnual: string;
    netSalaryEstimated: string;
  };
  kpiDetails: { area: string; measurement: string }[];
  customClauses?: string;
  status: 'Draft' | 'Issued' | 'Sent' | 'Accepted' | 'Declined';
  issuedDate?: string;
  issuedByName?: string;
  createdAt: string;
}

export function OfferLettersPage() {
  const { user } = useAuth();
  const [letters, setLetters] = useState<OfferLetterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [templateFilter, setTemplateFilter] = useState('All');
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [activeModal, setActiveModal] = useState<'create' | 'edit' | 'preview' | null>(null);
  const [selectedLetter, setSelectedLetter] = useState<OfferLetterItem | null>(null);

  // Form states
  const [formTemplateKey, setFormTemplateKey] = useState('master');
  const [formRecipientType, setFormRecipientType] = useState<'candidate' | 'employee' | 'custom'>('candidate');
  const [candidatesList, setCandidatesList] = useState<any[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  
  // Recipient form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [designation, setDesignation] = useState('');
  const [dateOfJoining, setDateOfJoining] = useState('');
  const [reportingTo, setReportingTo] = useState('Team Leader / Manager');
  const [placeOfPosting, setPlaceOfPosting] = useState('Bangalore');

  // Terms
  const [probationMonths, setProbationMonths] = useState(3);
  const [probationNoticeDays, setProbationNoticeDays] = useState(30);
  const [confirmedNoticeDays, setConfirmedNoticeDays] = useState(90);

  // Salary
  const [grossMonthly, setGrossMonthly] = useState<number>(30000);
  const [grossAnnual, setGrossAnnual] = useState<number>(360000);
  const [basicMonthly, setBasicMonthly] = useState<number>(15000);
  const [basicAnnual, setBasicAnnual] = useState<number>(180000);
  const [hraMonthly, setHraMonthly] = useState<number>(7500);
  const [hraAnnual, setHraAnnual] = useState<number>(90000);
  const [specialAllowanceMonthly, setSpecialAllowanceMonthly] = useState<number>(7500);
  const [specialAllowanceAnnual, setSpecialAllowanceAnnual] = useState<number>(90000);
  const [pfMonthly, setPfMonthly] = useState('Not Applicable');
  const [esiMonthly, setEsiMonthly] = useState('As applicable');
  const [ptMonthly, setPtMonthly] = useState('As applicable');

  // KPIs
  const [kpis, setKpis] = useState<{ area: string; measurement: string }[]>([]);
  const [customClauses, setCustomClauses] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [actionErrorMsg, setActionErrorMsg] = useState('');

  const printableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadOfferLetters();
    loadTemplates();
    loadCandidates();
    loadUsers();
  }, []);

  const loadOfferLetters = async () => {
    try {
      setLoading(true);
      const res = await api.getOfferLetters({
        search,
        status: statusFilter,
        templateKey: templateFilter,
      });
      if (res.success) {
        setLetters(res.data || []);
      }
    } catch (err: any) {
      console.error('Failed to load offer letters:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await api.getOfferTemplates();
      if (res.success && res.templates) {
        setTemplates(res.templates);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const loadCandidates = async () => {
    try {
      const res = await api.getCandidates({ limit: '200' });
      setCandidatesList(res.candidates || res.data || []);
    } catch (err) {
      console.error('Failed to load candidates:', err);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await api.getUsers({ limit: '100' });
      setUsersList(res.users || res.data || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  // When template changes in creation form, update defaults
  const handleTemplateSelect = (tmplKey: string) => {
    setFormTemplateKey(tmplKey);
    const tmpl = templates.find(t => t.key === tmplKey);
    if (tmpl) {
      if (!designation || templates.some(t => t.defaultDesignation === designation)) {
        setDesignation(tmpl.defaultDesignation);
      }
      setReportingTo(tmpl.defaultReportingTo);
      setPlaceOfPosting(tmpl.defaultPlaceOfPosting);
      setKpis([...tmpl.defaultKpis]);
    }
  };

  // When candidate is selected, auto-fill recipient details
  const handleCandidateSelect = (candId: string) => {
    setSelectedCandidateId(candId);
    const cand = candidatesList.find(c => c._id === candId);
    if (cand) {
      setName(cand.name || '');
      setEmail(cand.email || '');
      setPhone(cand.phone || '');
      setAddress(cand.currentLocation || cand.address || cand.city || 'Bangalore, India');
      if (cand.positionApplied) {
        setDesignation(cand.positionApplied);
      }
      if (cand.expectedCTC || cand.joiningSalary) {
        const salaryVal = parseInt(String(cand.joiningSalary || cand.expectedCTC).replace(/\D/g, ''));
        if (salaryVal && salaryVal > 5000) {
          updateSalaryCalculations(salaryVal);
        }
      }
    }
  };

  // When user/employee is selected, auto-fill
  const handleUserSelect = (uId: string) => {
    setSelectedUserId(uId);
    const usr = usersList.find(u => u._id === uId);
    if (usr) {
      setName(usr.name || '');
      setEmail(usr.email || '');
      setPhone(usr.phone || '');
      setDesignation(usr.role === 'recruiter' ? 'Senior Recruiter' : usr.role === 'tl' ? 'Team Leader - Recruitment' : 'Operations Associate');
    }
  };

  // Auto-calculate standard salary breakdown from Gross Monthly
  const updateSalaryCalculations = (grossVal: number) => {
    const gross = Math.max(0, grossVal || 0);
    const annual = gross * 12;
    const basic = Math.round(gross * 0.50);
    const hra = Math.round(gross * 0.25);
    const special = gross - basic - hra;

    setGrossMonthly(gross);
    setGrossAnnual(annual);
    setBasicMonthly(basic);
    setBasicAnnual(basic * 12);
    setHraMonthly(hra);
    setHraAnnual(hra * 12);
    setSpecialAllowanceMonthly(special);
    setSpecialAllowanceAnnual(special * 12);
  };

  // Open Create Modal
  const openCreateModal = () => {
    setSelectedLetter(null);
    const defaultTmpl = templates.find(t => t.key === 'master') || templates[0];
    setFormTemplateKey(defaultTmpl ? defaultTmpl.key : 'master');
    setFormRecipientType('candidate');
    setSelectedCandidateId('');
    setSelectedUserId('');
    setName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setDesignation(defaultTmpl?.defaultDesignation || 'Recruiter / Operations Associate');
    
    // Default joining date: next Monday or +7 days
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setDateOfJoining(nextWeek.toISOString().slice(0, 10));
    
    setReportingTo(defaultTmpl?.defaultReportingTo || 'Team Leader / Manager');
    setPlaceOfPosting(defaultTmpl?.defaultPlaceOfPosting || 'Bangalore');
    setProbationMonths(3);
    setProbationNoticeDays(30);
    setConfirmedNoticeDays(90);
    updateSalaryCalculations(30000);
    setKpis(defaultTmpl?.defaultKpis ? [...defaultTmpl.defaultKpis] : []);
    setCustomClauses('');
    setActiveModal('create');
  };

  // Open Edit Modal
  const openEditModal = (letter: OfferLetterItem) => {
    setSelectedLetter(letter);
    setFormTemplateKey(letter.templateKey);
    setFormRecipientType(letter.recipientType || 'candidate');
    setName(letter.recipient.name || '');
    setEmail(letter.recipient.email || '');
    setPhone(letter.recipient.phone || '');
    setAddress(letter.recipient.address || '');
    setDesignation(letter.recipient.designation || '');
    setDateOfJoining(letter.recipient.dateOfJoining ? new Date(letter.recipient.dateOfJoining).toISOString().slice(0, 10) : '');
    setReportingTo(letter.recipient.reportingTo || '');
    setPlaceOfPosting(letter.recipient.placeOfPosting || 'Bangalore');
    setProbationMonths(letter.terms?.probationMonths ?? 3);
    setProbationNoticeDays(letter.terms?.probationNoticeDays ?? 30);
    setConfirmedNoticeDays(letter.terms?.confirmedNoticeDays ?? 90);

    setGrossMonthly(letter.salary.grossMonthly || 30000);
    setGrossAnnual(letter.salary.grossAnnual || 360000);
    setBasicMonthly(letter.salary.basicMonthly || 15000);
    setBasicAnnual(letter.salary.basicAnnual || 180000);
    setHraMonthly(letter.salary.hraMonthly || 7500);
    setHraAnnual(letter.salary.hraAnnual || 90000);
    setSpecialAllowanceMonthly(letter.salary.specialAllowanceMonthly || 7500);
    setSpecialAllowanceAnnual(letter.salary.specialAllowanceAnnual || 90000);
    setPfMonthly(letter.salary.pfMonthly || 'Not Applicable');
    setEsiMonthly(letter.salary.esiMonthly || 'As applicable');
    setPtMonthly(letter.salary.ptMonthly || 'As applicable');

    setKpis(letter.kpiDetails ? [...letter.kpiDetails] : []);
    setCustomClauses(letter.customClauses || '');
    setActiveModal('edit');
  };

  // Open Preview Modal
  const openPreviewModal = (letter: OfferLetterItem) => {
    setSelectedLetter(letter);
    setActiveModal('preview');
  };

  // KPI management inside editor
  const addKpiRow = () => {
    setKpis([...kpis, { area: '', measurement: '' }]);
  };

  const updateKpiRow = (idx: number, field: 'area' | 'measurement', val: string) => {
    const updated = [...kpis];
    updated[idx][field] = val;
    setKpis(updated);
  };

  const removeKpiRow = (idx: number) => {
    setKpis(kpis.filter((_, i) => i !== idx));
  };

  // Handle Save (Draft or Issued)
  const handleSave = async (statusToSet: 'Draft' | 'Issued') => {
    if (!name.trim()) {
      alert('Recipient Full Name is required');
      return;
    }
    if (!designation.trim()) {
      alert('Designation is required');
      return;
    }

    try {
      setSubmitting(true);
      const payload: any = {
        templateKey: formTemplateKey,
        recipientType: formRecipientType,
        candidateId: selectedCandidateId || undefined,
        userId: selectedUserId || undefined,
        name,
        email,
        phone,
        address,
        designation,
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : new Date(),
        reportingTo,
        placeOfPosting,
        terms: {
          probationMonths,
          probationNoticeDays,
          confirmedNoticeDays,
          workLocation: placeOfPosting,
        },
        salary: {
          grossMonthly,
          grossAnnual,
          basicMonthly,
          basicAnnual,
          hraMonthly,
          hraAnnual,
          specialAllowanceMonthly,
          specialAllowanceAnnual,
          pfMonthly,
          pfAnnual: pfMonthly,
          esiMonthly,
          esiAnnual: esiMonthly,
          ptMonthly,
          ptAnnual: ptMonthly,
          tdsMonthly: 'As applicable',
          tdsAnnual: 'As applicable',
          netSalaryEstimated: 'Subject to statutory deductions',
        },
        kpiDetails: kpis.filter(k => k.area.trim()),
        customClauses,
        status: statusToSet,
      };

      if (activeModal === 'create') {
        const res = await api.createOfferLetter(payload);
        if (res.success) {
          setActionSuccessMsg(`Offer letter ${res.data.offerNumber} created successfully!`);
          setActiveModal(null);
          loadOfferLetters();
        }
      } else if (activeModal === 'edit' && selectedLetter) {
        const res = await api.updateOfferLetter(selectedLetter._id, payload);
        if (res.success) {
          setActionSuccessMsg(`Offer letter ${selectedLetter.offerNumber} updated successfully!`);
          setActiveModal(null);
          loadOfferLetters();
        }
      }
    } catch (err: any) {
      console.error('Save failed:', err);
      setActionErrorMsg(err?.message || 'Failed to save offer letter');
    } finally {
      setSubmitting(false);
      setTimeout(() => {
        setActionSuccessMsg('');
        setActionErrorMsg('');
      }, 4000);
    }
  };

  // Download DOCX handler
  const handleDownloadDocx = async (letter: OfferLetterItem) => {
    try {
      const cleanName = letter.recipient.name.replace(/\s+/g, '_');
      const filename = `Offer_Letter_${cleanName}_${letter.offerNumber.replace(/\//g, '_')}.docx`;
      await api.downloadOfferLetterDocx(letter._id, filename);
    } catch (err: any) {
      alert('Failed to download Word document: ' + err?.message);
    }
  };

  // Send Email handler
  const handleSendEmail = async (letter: OfferLetterItem) => {
    if (!letter.recipient.email) {
      alert('Candidate does not have an email address specified.');
      return;
    }
    if (!confirm(`Send official offer letter email to ${letter.recipient.name} (${letter.recipient.email})?`)) {
      return;
    }

    try {
      setLoading(true);
      const res = await api.sendOfferLetterEmail(letter._id);
      if (res.success) {
        setActionSuccessMsg(`Offer letter email sent successfully to ${letter.recipient.email}`);
        loadOfferLetters();
      }
    } catch (err: any) {
      alert('Failed to send email: ' + err?.message);
    } finally {
      setLoading(false);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    }
  };

  // Delete Offer Letter handler
  const handleDelete = async (letter: OfferLetterItem) => {
    if (!confirm(`Are you sure you want to delete offer letter ${letter.offerNumber}? This action cannot be undone.`)) {
      return;
    }
    try {
      setLoading(true);
      const res = await api.deleteOfferLetter(letter._id);
      if (res.success) {
        setActionSuccessMsg('Offer letter deleted successfully');
        loadOfferLetters();
      }
    } catch (err: any) {
      alert('Delete failed: ' + err?.message);
    } finally {
      setLoading(false);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    }
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Issued':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Issued</span>;
      case 'Sent':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Sent via Email</span>;
      case 'Accepted':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">Accepted</span>;
      case 'Declined':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">Declined</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">Draft</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Alert Banners */}
      {actionSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-3 text-emerald-800 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          {actionSuccessMsg}
        </div>
      )}
      {actionErrorMsg && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-800 text-sm font-medium">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          {actionErrorMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-md uppercase tracking-wider">
              Admin Only
            </span>
            <span className="text-slate-400 text-xs">Official 2026 Templates</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Offer & Appointment Letters</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Assign, edit, preview, and generate official offer letters across all 5 standard company templates.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl shadow-md hover:from-indigo-700 hover:to-indigo-800 font-semibold text-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Generate Offer Letter
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Letters</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{letters.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Issued & Active</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {letters.filter(l => ['Issued', 'Sent', 'Accepted'].includes(l.status)).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Drafts</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">
            {letters.filter(l => l.status === 'Draft').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Accepted</p>
          <p className="text-2xl font-bold text-purple-700 mt-1">
            {letters.filter(l => l.status === 'Accepted').length}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadOfferLetters()}
            placeholder="Search by name, ref #, role..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 bg-white"
          >
            <option value="All">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Issued">Issued</option>
            <option value="Sent">Sent</option>
            <option value="Accepted">Accepted</option>
            <option value="Declined">Declined</option>
          </select>

          <select
            value={templateFilter}
            onChange={e => { setTemplateFilter(e.target.value); }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 bg-white"
          >
            <option value="All">All Templates</option>
            <option value="master">Master Offer Letter</option>
            <option value="sr_recruiter">Sr Recruiter</option>
            <option value="team_leader">Team Leader</option>
            <option value="branch_manager">Branch Manager</option>
            <option value="business_developer">Business Developer</option>
          </select>

          <button
            onClick={loadOfferLetters}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Offer Letters Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Offer Ref</th>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Template & Designation</th>
                <th className="py-3 px-4">Gross CTC</th>
                <th className="py-3 px-4">Joining Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading offer letters...
                  </td>
                </tr>
              ) : letters.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileSignature className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No offer letters found</p>
                    <p className="text-xs text-slate-400 mt-1">Click "Generate Offer Letter" above to assign the first one.</p>
                  </td>
                </tr>
              ) : (
                letters.map(letter => (
                  <tr key={letter._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-xs text-indigo-700">
                      {letter.offerNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{letter.recipient.name}</div>
                      <div className="text-xs text-slate-400">{letter.recipient.email || letter.recipient.phone || 'No contact'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{letter.recipient.designation}</div>
                      <div className="text-xs text-slate-400">{letter.templateName}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">₹{(letter.salary?.grossMonthly || 0).toLocaleString('en-IN')}/mo</div>
                      <div className="text-xs text-slate-400">₹{(letter.salary?.grossAnnual || 0).toLocaleString('en-IN')}/yr</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-xs">
                      {letter.recipient.dateOfJoining ? new Date(letter.recipient.dateOfJoining).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(letter.status)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openPreviewModal(letter)}
                          className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"
                          title="View & Print"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadDocx(letter)}
                          className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                          title="Download Word (.docx)"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleSendEmail(letter)}
                          className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors"
                          title="Email to Candidate"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(letter)}
                          className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(letter)}
                          className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CREATE / EDIT MODAL ── */}
      {(activeModal === 'create' || activeModal === 'edit') && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {activeModal === 'create' ? 'Generate & Assign Offer Letter' : `Edit Offer Letter (${selectedLetter?.offerNumber})`}
                </h2>
                <p className="text-xs text-slate-500">
                  Select a standard template and configure recipient, designation, CTC, and KPIs.
                </p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              {/* Step 1: Template Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  1. Choose Offer Letter Template *
                </label>
                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    { key: 'master', title: 'Master Offer Letter', desc: 'Standard comprehensive letter with general KPIs & clauses' },
                    { key: 'sr_recruiter', title: 'Senior Recruiter', desc: 'Sourcing, screening, line-ups & joining conversion metrics' },
                    { key: 'team_leader', title: 'Team Leader', desc: 'Team joinings, recruiter coaching, conversion & attendance' },
                    { key: 'branch_manager', title: 'Branch Manager', desc: 'Branch P&L, revenue targets, client acquisition & operations' },
                    { key: 'business_developer', title: 'Business Developer', desc: 'Corporate prospecting, decision makers & revenue mandates' },
                  ].map(tmpl => (
                    <div
                      key={tmpl.key}
                      onClick={() => handleTemplateSelect(tmpl.key)}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        formTemplateKey === tmpl.key
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-800">{tmpl.title}</span>
                        {formTemplateKey === tmpl.key && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{tmpl.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 2: Assign To Recipient */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    2. Assign To Recipient
                  </label>
                  <div className="flex bg-white rounded-lg p-0.5 border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setFormRecipientType('candidate')}
                      className={`px-3 py-1 rounded-md font-semibold transition-all ${
                        formRecipientType === 'candidate' ? 'bg-indigo-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      From ATS Candidates
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormRecipientType('employee')}
                      className={`px-3 py-1 rounded-md font-semibold transition-all ${
                        formRecipientType === 'employee' ? 'bg-indigo-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      From ATS Users
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormRecipientType('custom')}
                      className={`px-3 py-1 rounded-md font-semibold transition-all ${
                        formRecipientType === 'custom' ? 'bg-indigo-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      Manual Recipient
                    </button>
                  </div>
                </div>

                {/* Auto-fill Pickers */}
                {formRecipientType === 'candidate' && (
                  <div>
                    <label className="block text-xs text-slate-500 mb-1 font-medium">Select Candidate to Auto-fill</label>
                    <select
                      value={selectedCandidateId}
                      onChange={e => handleCandidateSelect(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Choose Candidate from ATS Database --</option>
                      {candidatesList.map(cand => (
                        <option key={cand._id} value={cand._id}>
                          {cand.name} ({cand.phone || cand.email || 'No phone'}) - {cand.positionApplied || cand.status || 'Candidate'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formRecipientType === 'employee' && (
                  <div>
                    <label className="block text-xs text-slate-500 mb-1 font-medium">Select User / Employee to Auto-fill</label>
                    <select
                      value={selectedUserId}
                      onChange={e => handleUserSelect(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Choose Employee / User --</option>
                      {usersList.map(u => (
                        <option key={u._id} value={u._id}>
                          {u.name} ({u.role}) - {u.email}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Recipient Details Fields */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1 font-semibold">Full Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1 font-semibold">Email Address *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="candidate@example.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1 font-semibold">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1 font-semibold">Employee Address</label>
                    <input
                      type="text"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="Residential address as per KYC"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Appointment & Employment Terms */}
              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  3. Appointment & Job Terms
                </label>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1 font-semibold">Designation *</label>
                    <input
                      type="text"
                      value={designation}
                      onChange={e => setDesignation(e.target.value)}
                      placeholder="e.g. Senior IT Recruiter"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1 font-semibold">Date of Joining *</label>
                    <input
                      type="date"
                      value={dateOfJoining}
                      onChange={e => setDateOfJoining(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1 font-semibold">Place of Posting</label>
                    <input
                      type="text"
                      value={placeOfPosting}
                      onChange={e => setPlaceOfPosting(e.target.value)}
                      placeholder="e.g. Bangalore"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1 font-semibold">Reporting Manager / Designation</label>
                    <input
                      type="text"
                      value={reportingTo}
                      onChange={e => setReportingTo(e.target.value)}
                      placeholder="e.g. Team Leader / Manager"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1 font-semibold">Probation Period (Months)</label>
                    <input
                      type="number"
                      value={probationMonths}
                      onChange={e => setProbationMonths(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1 font-semibold">Notice Period (Probation / Confirmed)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={probationNoticeDays}
                        onChange={e => setProbationNoticeDays(parseInt(e.target.value) || 0)}
                        placeholder="30"
                        className="w-1/2 px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs outline-none focus:border-indigo-500"
                      />
                      <span className="text-xs text-slate-400">/</span>
                      <input
                        type="number"
                        value={confirmedNoticeDays}
                        onChange={e => setConfirmedNoticeDays(parseInt(e.target.value) || 0)}
                        placeholder="90"
                        className="w-1/2 px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs outline-none focus:border-indigo-500"
                      />
                      <span className="text-xs text-slate-400">days</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4: Annexure 1 - Salary Structure */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      4. Annexure 1 – Salary & Compensation Structure
                    </label>
                    <p className="text-xs text-slate-500">Edit Monthly Gross to auto-calculate standard breakdown or adjust line items directly.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">Quick Monthly Gross:</span>
                    <input
                      type="number"
                      value={grossMonthly}
                      onChange={e => updateSalaryCalculations(parseInt(e.target.value) || 0)}
                      className="w-32 px-2.5 py-1.5 border border-indigo-300 rounded-lg font-bold text-indigo-700 bg-white text-right outline-none"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Salary Component</th>
                        <th className="py-2.5 px-3 text-right">Monthly (₹)</th>
                        <th className="py-2.5 px-3 text-right">Annual (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2 px-3 font-semibold text-slate-800">Gross Salary</td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            value={grossMonthly}
                            onChange={e => {
                              const v = parseInt(e.target.value) || 0;
                              setGrossMonthly(v);
                              setGrossAnnual(v * 12);
                            }}
                            className="w-24 text-right px-2 py-1 border border-slate-200 rounded"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-800">₹{grossAnnual.toLocaleString('en-IN')}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-600">Basic Salary (50%)</td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            value={basicMonthly}
                            onChange={e => {
                              const v = parseInt(e.target.value) || 0;
                              setBasicMonthly(v);
                              setBasicAnnual(v * 12);
                            }}
                            className="w-24 text-right px-2 py-1 border border-slate-200 rounded"
                          />
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600">₹{basicAnnual.toLocaleString('en-IN')}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-600">House Rent Allowance (HRA - 25%)</td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            value={hraMonthly}
                            onChange={e => {
                              const v = parseInt(e.target.value) || 0;
                              setHraMonthly(v);
                              setHraAnnual(v * 12);
                            }}
                            className="w-24 text-right px-2 py-1 border border-slate-200 rounded"
                          />
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600">₹{hraAnnual.toLocaleString('en-IN')}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-600">Special Allowance / Other</td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            value={specialAllowanceMonthly}
                            onChange={e => {
                              const v = parseInt(e.target.value) || 0;
                              setSpecialAllowanceMonthly(v);
                              setSpecialAllowanceAnnual(v * 12);
                            }}
                            className="w-24 text-right px-2 py-1 border border-slate-200 rounded"
                          />
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600">₹{specialAllowanceAnnual.toLocaleString('en-IN')}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-600">Provident Fund – Employee Contribution</td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="text"
                            value={pfMonthly}
                            onChange={e => setPfMonthly(e.target.value)}
                            className="w-32 text-right px-2 py-1 border border-slate-200 rounded"
                          />
                        </td>
                        <td className="py-2 px-3 text-right text-slate-500">Not Applicable</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-600">ESI – Employee Contribution</td>
                        <td className="py-2 px-3 text-right text-slate-500">As applicable</td>
                        <td className="py-2 px-3 text-right text-slate-500">As applicable</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-600">Professional Tax</td>
                        <td className="py-2 px-3 text-right text-slate-500">As applicable</td>
                        <td className="py-2 px-3 text-right text-slate-500">As applicable</td>
                      </tr>
                      <tr className="bg-slate-50/70 font-semibold text-slate-900">
                        <td className="py-2 px-3">Estimated Net Salary</td>
                        <td colSpan={2} className="py-2 px-3 text-right text-emerald-700">Subject to statutory deductions</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Step 5: Annexure 2 - Role & KPIs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    5. Annexure 2 – Role & Key Performance Indicators (KPIs)
                  </label>
                  <button
                    type="button"
                    onClick={addKpiRow}
                    className="flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add KPI Row
                  </button>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3 w-1/2">Performance Area / Responsibility</th>
                        <th className="py-2.5 px-3 w-1/2">Measurement / Target</th>
                        <th className="py-2.5 px-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {kpis.map((kpi, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={kpi.area}
                              onChange={e => updateKpiRow(idx, 'area', e.target.value)}
                              placeholder="e.g. Successful Joinings"
                              className="w-full px-2 py-1 border border-slate-200 rounded outline-none focus:border-indigo-400"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={kpi.measurement}
                              onChange={e => updateKpiRow(idx, 'measurement', e.target.value)}
                              placeholder="e.g. Target assigned by Company"
                              className="w-full px-2 py-1 border border-slate-200 rounded outline-none focus:border-indigo-400"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeKpiRow(idx)}
                              className="text-slate-400 hover:text-red-600 p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Step 6: Custom Clauses or Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  6. Custom Clauses / Special Terms (Optional)
                </label>
                <textarea
                  value={customClauses}
                  onChange={e => setCustomClauses(e.target.value)}
                  rows={2}
                  placeholder="Enter any additional agreed conditions, client assignment details, or specific clauses..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500 bg-white"
                />
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-white text-xs font-semibold"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSave('Draft')}
                  className="px-5 py-2 border border-slate-300 bg-white text-slate-700 rounded-xl hover:bg-slate-100 text-xs font-semibold disabled:opacity-50"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSave('Issued')}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-xs font-semibold disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Issue Official Offer Letter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PREVIEW & PRINTABLE LETTER MODAL ── */}
      {activeModal === 'preview' && selectedLetter && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
            {/* Action Bar */}
            <div className="px-6 py-3 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-indigo-300 font-semibold">{selectedLetter.offerNumber}</span>
                <span className="text-slate-400">|</span>
                <span className="text-xs font-medium">{selectedLetter.templateName}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / PDF
                </button>
                <button
                  onClick={() => handleDownloadDocx(selectedLetter)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
                >
                  <Download className="w-3.5 h-3.5" /> Word (.docx)
                </button>
                <button
                  onClick={() => handleSendEmail(selectedLetter)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
                >
                  <Mail className="w-3.5 h-3.5" /> Email
                </button>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Area */}
            <div className="p-8 overflow-y-auto font-serif text-slate-900 bg-white" ref={printableRef}>
              <div className="max-w-3xl mx-auto space-y-6 text-sm leading-relaxed border p-8 rounded-lg shadow-sm border-slate-200 print:border-none print:shadow-none print:p-0">
                
                {/* Official Letterhead */}
                <div className="text-center border-b-2 border-slate-800 pb-4">
                  <h2 className="text-xl font-bold tracking-wider text-slate-900 font-sans uppercase">
                    WHITE HORSE MANPOWER CONSULTANCY PRIVATE LIMITED
                  </h2>
                  <p className="text-[11px] text-slate-600 font-sans mt-1">
                    #12 Office 156, 3rd Floor, Jumma Masjid Golden Complex, Jumma Masjid Road (Exit of Commercial Street), Bangalore – 560051
                  </p>
                  <div className="mt-3 inline-block px-4 py-1 bg-slate-100 rounded text-xs font-bold tracking-wider font-sans uppercase">
                    {selectedLetter.templateName.toUpperCase()}
                  </div>
                </div>

                {/* Candidate Reference Block */}
                <div className="grid grid-cols-2 gap-4 text-xs font-sans border-b border-slate-200 pb-4">
                  <div className="space-y-1">
                    <p><strong>Date:</strong> {selectedLetter.issuedDate ? new Date(selectedLetter.issuedDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}</p>
                    <p><strong>Employee Name:</strong> {selectedLetter.recipient.name}</p>
                    <p><strong>Address:</strong> {selectedLetter.recipient.address || 'On file'}</p>
                  </div>
                  <div className="space-y-1">
                    <p><strong>Designation:</strong> {selectedLetter.recipient.designation}</p>
                    <p><strong>Date of Joining:</strong> {selectedLetter.recipient.dateOfJoining ? new Date(selectedLetter.recipient.dateOfJoining).toLocaleDateString('en-GB') : 'To be confirmed'}</p>
                    <p><strong>Reporting To:</strong> {selectedLetter.recipient.reportingTo || 'Team Leader / Manager'}</p>
                    <p><strong>Place of Posting:</strong> {selectedLetter.recipient.placeOfPosting || 'Bangalore'}</p>
                  </div>
                </div>

                {/* Subject & Opening */}
                <div className="space-y-3 font-sans">
                  <p className="font-bold text-slate-900 underline">Subject: Offer and Appointment Letter</p>
                  <p>Dear <strong>{selectedLetter.recipient.name}</strong>,</p>
                  <p>
                    We are pleased to offer you employment with <strong>White Horse Manpower Consultancy Private Limited</strong> (“Company”) as <strong>{selectedLetter.recipient.designation}</strong>, subject to the terms and conditions contained in this Master Offer & Appointment Letter, the applicable Salary Annexure, Role & KPI Annexure, Company policies, and applicable laws.
                  </p>
                  <p>
                    Your appointment shall be effective from <strong>{selectedLetter.recipient.dateOfJoining ? new Date(selectedLetter.recipient.dateOfJoining).toLocaleDateString('en-GB') : 'your joining date'}</strong>.
                  </p>
                </div>

                {/* Key Employment Clauses */}
                <div className="space-y-4 font-sans text-xs text-slate-800 leading-normal">
                  <div>
                    <h4 className="font-bold text-slate-900 uppercase">1. Designation and Responsibilities</h4>
                    <p className="mt-1">
                      You are appointed as {selectedLetter.recipient.designation} and shall perform the duties and responsibilities assigned to you by the Company from time to time. Your detailed role, responsibilities, performance parameters, and applicable Key Performance Indicators (KPIs) are provided in Annexure 2.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 uppercase">2. Place of Work</h4>
                    <p className="mt-1">
                      Your initial place of posting shall be <strong>{selectedLetter.recipient.placeOfPosting || 'Bangalore'}</strong>. Based on business requirements, you may be required to work from another Company office, client location, or project location.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 uppercase">3. Compensation</h4>
                    <p className="mt-1">
                      Your compensation shall be as specified in <strong>Annexure 1 – Salary & Compensation Structure</strong>, which forms an integral part of this appointment letter. Salary shall be subject to applicable statutory deductions, contributions, and taxes.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 uppercase">4. Probation and Notice Period</h4>
                    <p className="mt-1">
                      You shall initially be on probation for a period of <strong>{selectedLetter.terms?.probationMonths ?? 3} months</strong> from your Date of Joining. During probation, either party may terminate employment by giving <strong>{selectedLetter.terms?.probationNoticeDays ?? 30} days</strong> written notice or salary in lieu thereof. Post confirmation, the notice period shall be <strong>{selectedLetter.terms?.confirmedNoticeDays ?? 90} days</strong>.
                    </p>
                  </div>

                  {selectedLetter.customClauses && (
                    <div>
                      <h4 className="font-bold text-slate-900 uppercase">5. Special Conditions</h4>
                      <p className="mt-1 whitespace-pre-wrap">{selectedLetter.customClauses}</p>
                    </div>
                  )}
                </div>

                {/* ANNEXURE 1: SALARY */}
                <div className="pt-4 border-t border-slate-300 font-sans">
                  <h3 className="font-bold text-sm text-center uppercase tracking-wider mb-2">
                    ANNEXURE 1 – SALARY & COMPENSATION STRUCTURE
                  </h3>
                  <table className="w-full text-xs border border-slate-300">
                    <thead className="bg-slate-100 font-bold border-b border-slate-300">
                      <tr>
                        <th className="py-2 px-3 text-left border-r border-slate-300">Salary Component</th>
                        <th className="py-2 px-3 text-right border-r border-slate-300">Monthly (₹)</th>
                        <th className="py-2 px-3 text-right">Annual (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr className="font-bold bg-slate-50">
                        <td className="py-2 px-3 border-r border-slate-300">Gross Salary</td>
                        <td className="py-2 px-3 text-right border-r border-slate-300">₹{(selectedLetter.salary?.grossMonthly || 0).toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-right">₹{(selectedLetter.salary?.grossAnnual || 0).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3 border-r border-slate-300">Basic Salary</td>
                        <td className="py-1.5 px-3 text-right border-r border-slate-300">₹{(selectedLetter.salary?.basicMonthly || 0).toLocaleString('en-IN')}</td>
                        <td className="py-1.5 px-3 text-right">₹{(selectedLetter.salary?.basicAnnual || 0).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3 border-r border-slate-300">House Rent Allowance (HRA)</td>
                        <td className="py-1.5 px-3 text-right border-r border-slate-300">₹{(selectedLetter.salary?.hraMonthly || 0).toLocaleString('en-IN')}</td>
                        <td className="py-1.5 px-3 text-right">₹{(selectedLetter.salary?.hraAnnual || 0).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3 border-r border-slate-300">Special Allowance</td>
                        <td className="py-1.5 px-3 text-right border-r border-slate-300">₹{(selectedLetter.salary?.specialAllowanceMonthly || 0).toLocaleString('en-IN')}</td>
                        <td className="py-1.5 px-3 text-right">₹{(selectedLetter.salary?.specialAllowanceAnnual || 0).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3 border-r border-slate-300">Provident Fund (Employee)</td>
                        <td className="py-1.5 px-3 text-right border-r border-slate-300">{selectedLetter.salary?.pfMonthly || 'Not Applicable'}</td>
                        <td className="py-1.5 px-3 text-right">Not Applicable</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3 border-r border-slate-300">ESI / Professional Tax / TDS</td>
                        <td className="py-1.5 px-3 text-right border-r border-slate-300">As applicable</td>
                        <td className="py-1.5 px-3 text-right">As applicable</td>
                      </tr>
                      <tr className="font-bold bg-slate-50">
                        <td className="py-2 px-3 border-r border-slate-300">Estimated Net Salary</td>
                        <td colSpan={2} className="py-2 px-3 text-right text-emerald-800">Subject to statutory deductions</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* ANNEXURE 2: ROLE & KPIS */}
                {selectedLetter.kpiDetails && selectedLetter.kpiDetails.length > 0 && (
                  <div className="pt-4 border-t border-slate-300 font-sans">
                    <h3 className="font-bold text-sm text-center uppercase tracking-wider mb-2">
                      ANNEXURE 2 – ROLE & KEY PERFORMANCE INDICATORS (KPIS)
                    </h3>
                    <table className="w-full text-xs border border-slate-300">
                      <thead className="bg-slate-100 font-bold border-b border-slate-300">
                        <tr>
                          <th className="py-2 px-3 text-left border-r border-slate-300 w-1/2">Performance / Responsibility Area</th>
                          <th className="py-2 px-3 text-left w-1/2">Measurement / Target Benchmark</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {selectedLetter.kpiDetails.map((k, i) => (
                          <tr key={i}>
                            <td className="py-1.5 px-3 border-r border-slate-300 font-medium">{k.area}</td>
                            <td className="py-1.5 px-3 text-slate-700">{k.measurement}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Signatures & Acceptance */}
                <div className="pt-8 grid grid-cols-2 gap-8 font-sans text-xs border-t border-slate-300">
                  <div className="space-y-8">
                    <p>For <strong>White Horse Manpower Consultancy Pvt. Ltd.</strong></p>
                    <div className="pt-8">
                      <p className="font-bold">Authorized Signatory</p>
                      <p className="text-slate-500">Human Resources Department</p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <p><strong>Employee Acceptance:</strong></p>
                    <div className="pt-8 border-t border-slate-400">
                      <p>Signature: _________________________</p>
                      <p className="mt-1">Name: {selectedLetter.recipient.name}</p>
                      <p className="mt-1">Date: _____________________________</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
