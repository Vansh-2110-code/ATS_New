import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Upload, FileText, X, Plus, Tag, Briefcase,
  Building2, Hash, CheckCircle2, ChevronDown, Save, Loader2,
  Mail, Users, ChevronUp,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// const DEPARTMENTS = ['BPO', 'ITES', 'IT', 'Non-IT', 'Healthcare', 'Sales', 'Finance'];
const JOB_TYPES = ['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Freelance'];
const JOB_PRIORITIES = ['Urgent', 'High', 'Medium', 'Low', 'Hold', 'Closed'];

const PRIORITY_COLORS: Record<string, string> = {
  Urgent: 'bg-red-100 text-red-700 border-red-200',
  High:   'bg-orange-100 text-orange-700 border-orange-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  Low:    'bg-green-100 text-green-700 border-green-200',
  Hold:   'bg-slate-100 text-slate-600 border-slate-200',
  Closed: 'bg-gray-100 text-gray-500 border-gray-200',
};

const SUGGESTED_KEYWORDS_MOCK = [
  'React.js', 'JavaScript', '3+ years experience', 'TypeScript', 'Node.js',
  'REST APIs', 'Agile methodology', 'Git', 'Problem solving', 'Team collaboration',
  "Bachelor's degree", 'Communication skills', 'Unit testing', 'Code review',
];

export function JobCreatePage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const [form, setForm] = useState({
    companyName: '',
    client: '',
    jobTitle: '',
    division: 'BPO',
    jobType: '',
    experience: '',
    location: '',
    positions: '1',
    description: '',
    requirements: '',
    hrName: '',
    hrEmail: '',
    spocName: '',
    recruiterName: user?.name || '',
    priority: 'Medium',
  });
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [assignedRecruiters, setAssignedRecruiters] = useState<any[]>([]);
  const [recruitersList, setRecruitersList] = useState<any[]>([]);
  const [companiesList, setCompaniesList] = useState<any[]>([]);
  const [recruiterDropOpen, setRecruiterDropOpen] = useState(false);
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getRecruiters().then((data: any) => {
      setRecruitersList(Array.isArray(data) ? data : (data.users || data.recruiters || []));
    }).catch(() => {});
    
    api.getCompanyList().then((data: any) => {
      setCompaniesList(Array.isArray(data) ? data : (data.companies || []));
    }).catch(() => {});
  }, []);

  const toggleRecruiter = (rec: any) => {
    setAssignedRecruiters(prev => {
      const exists = prev.find(r => r._id === rec._id);
      return exists ? prev.filter(r => r._id !== rec._id) : [...prev, rec];
    });
  };

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills(prev => [...prev, s]);
    setSkillInput('');
  };

  const removeSkill = (s: string) => setSkills(prev => prev.filter(x => x !== s));

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setJdFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setJdFile(file);
  };

  const handleSave = async () => {
    if (!form.jobTitle || !form.hrEmail) return;
    try {
      setSaving(true);
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) formData.append(k, v); });
      formData.append('skills', skills.join(','));
      formData.append('assignedRecruiters', JSON.stringify(
        assignedRecruiters.map(r => ({ recruiterId: r._id, recruiterName: r.name, recruiterEmail: r.email }))
      ));
      if (jdFile) formData.append('jdFile', jdFile);
      const job = await api.createJob(formData);
      setSaved(true);
      const jobId = job._id || job.id;
      setTimeout(() => navigate(`/recruiter/jobs/${jobId}/summary`), 800);
    } catch (err) {
      console.error('Failed to save job:', err);
      setSaving(false);
    }
  };

  if (saved) {
    const isAdmin = user?.role === 'admin';
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h2 className="text-slate-800 mb-2" style={{ fontWeight: 700, fontSize: '1.25rem' }}>Job Requirement Saved!</h2>
          <p className="text-slate-500 text-sm">Opening JR Summary...</p>
        </div>
        {!isAdmin && (
          <div className="max-w-md bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-800 text-sm font-semibold mb-1">JR Posted – Locked for Editing</p>
                <p className="text-amber-700 text-xs">Only Admins can edit posted job requirements. Contact your Admin if changes are needed.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-slate-800" style={{ fontWeight: 700, fontSize: '1.4rem' }}>Create Job Requirement</h1>
          <p className="text-slate-500 text-sm mt-0.5">Define the role, upload JD, and set sourcing requirements</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2.5 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors"
            style={{ fontWeight: 500 }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.jobTitle || !form.hrEmail}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            style={{ fontWeight: 600 }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Job'}
          </button>
        </div>
      </div>

      {/* ── SECTION 1: JR Info ── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
            <Building2 className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h2 className="text-slate-800 text-sm" style={{ fontWeight: 600 }}>Client & Stakeholders</h2>
            <p className="text-slate-400 text-xs">JR number is auto-generated on save</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide" style={{ fontWeight: 600 }}>
              Client Company
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={form.client}
                onChange={e => setForm(f => ({ ...f, client: e.target.value, companyName: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-green-400 transition-colors bg-white appearance-none"
              >
                <option value="" disabled>Select Company</option>
                {companiesList.map((c: any) => (
                  <option key={c._id || c.id} value={c.companyName}>{c.companyName}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide" style={{ fontWeight: 600 }}>
              JR Number
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value="Auto-generated (e.g. JRWH0001)"
                readOnly
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide" style={{ fontWeight: 600 }}>HR Name</label>
            <input
              type="text"
              value={form.hrName}
              onChange={e => setForm(f => ({ ...f, hrName: e.target.value }))}
              placeholder="e.g. Taj"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-green-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide" style={{ fontWeight: 600 }}>
              HR Email ID <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={form.hrEmail}
                onChange={e => setForm(f => ({ ...f, hrEmail: e.target.value }))}
                placeholder="hr@company.com"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-green-400 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide" style={{ fontWeight: 600 }}>SPOC Name</label>
            <input
              type="text"
              value={form.spocName}
              onChange={e => setForm(f => ({ ...f, spocName: e.target.value }))}
              placeholder="e.g. Taj"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-green-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide" style={{ fontWeight: 600 }}>Priority</label>
            <div className="flex flex-wrap gap-2">
              {JOB_PRIORITIES.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, priority: p }))}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${form.priority === p ? PRIORITY_COLORS[p] + ' ring-1 ring-offset-1 ring-current' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                  style={{ fontWeight: 600 }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide" style={{ fontWeight: 600 }}>
              <Users className="inline w-3.5 h-3.5 mr-1" />
              Assign Team Leads & Recruiters (Multi-select)
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setRecruiterDropOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-green-400 bg-white hover:bg-slate-50 transition-colors"
              >
                <span className="text-slate-600">
                  {assignedRecruiters.length === 0
                    ? 'Select recruiters or team leads…'
                    : `${assignedRecruiters.length} member${assignedRecruiters.length > 1 ? 's' : ''} assigned`}
                </span>
                {recruiterDropOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {recruiterDropOpen && (
                <div className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                  {recruitersList.length === 0 ? (
                    <p className="px-4 py-3 text-slate-400 text-sm">No recruiters or team leads found</p>
                  ) : recruitersList.map((rec: any) => (
                    <label key={rec._id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-green-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0">
                      <input
                        type="checkbox"
                        checked={assignedRecruiters.some(r => r._id === rec._id)}
                        onChange={() => toggleRecruiter(rec)}
                        className="rounded border-slate-300 text-green-600 focus:ring-green-500"
                      />
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-slate-700">{rec.name}</span>
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          rec.role === 'tl'
                            ? 'bg-violet-100 text-violet-700 border border-violet-200'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}>
                          {rec.role === 'tl' ? 'Team Lead' : 'Recruiter'}
                        </span>
                      </div>
                      {rec.email && <span className="text-xs text-slate-400 ml-auto truncate max-w-[180px]">{rec.email}</span>}
                    </label>
                  ))}
                </div>
              )}
            </div>
            {assignedRecruiters.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {assignedRecruiters.map(r => (
                  <span key={r._id} className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border ${
                    r.role === 'tl'
                      ? 'bg-violet-50 text-violet-700 border-violet-200'
                      : 'bg-green-50 text-green-700 border-green-200'
                  }`} style={{ fontWeight: 500 }}>
                    <span className="font-semibold">{r.name}</span>
                    <span className="text-[10px] opacity-75">({r.role === 'tl' ? 'TL' : 'Recruiter'})</span>
                    <button type="button" onClick={() => toggleRecruiter(r)} className="text-slate-400 hover:text-red-500 transition-colors ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION 2: Job Details ── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-green-600" />
          </div>
          <h2 className="text-slate-800 text-sm" style={{ fontWeight: 600 }}>Job Details</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide" style={{ fontWeight: 600 }}>Job Title *</label>
            <input
              type="text"
              value={form.jobTitle}
              onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))}
              placeholder="e.g. Senior React Developer"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-green-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide" style={{ fontWeight: 600 }}>Division *</label>
            <select
              value={form.division}
              onChange={e => setForm(f => ({ ...f, division: e.target.value }))}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-green-400 bg-white"
            >
              <option value="BPO">BPO</option>
              <option value="IT">IT</option>
              <option value="Lateral">Lateral</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide" style={{ fontWeight: 600 }}>Job Type</label>
            <select value={form.jobType} onChange={e => setForm(f => ({ ...f, jobType: e.target.value }))} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-green-400 bg-white">
              <option value="">Select type</option>
              {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide" style={{ fontWeight: 600 }}>Experience Required</label>
            <input
              type="text"
              value={form.experience}
              onChange={e => setForm(f => ({ ...f, experience: e.target.value }))}
              placeholder="e.g. 3–5 years"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-green-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide" style={{ fontWeight: 600 }}>No. of Positions</label>
            <input
              type="number"
              min="1"
              value={form.positions}
              onChange={e => setForm(f => ({ ...f, positions: e.target.value }))}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-green-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide" style={{ fontWeight: 600 }}>Location</label>
            <input
              type="text"
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Mumbai / Hybrid"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-green-400 transition-colors"
            />
          </div>

          {/* Skills */}
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide" style={{ fontWeight: 600 }}>Required Skills</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                placeholder="Add a skill and press Enter"
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-green-400 transition-colors"
              />
              <button type="button" onClick={addSkill} className="px-4 py-3 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700" style={{ fontWeight: 500 }}>
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {skills.map(s => (
                  <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-xs rounded-full border border-green-100" style={{ fontWeight: 500 }}>
                    {s}
                    <button type="button" onClick={() => removeSkill(s)} className="text-green-400 hover:text-green-600">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide" style={{ fontWeight: 600 }}>Job Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={4}
              placeholder="Describe the role, responsibilities, and ideal candidate profile..."
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-green-400 transition-colors resize-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide" style={{ fontWeight: 600 }}>Requirements / Qualifications</label>
            <textarea
              value={form.requirements}
              onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))}
              rows={3}
              placeholder="Minimum qualifications, certifications, and must-have skills..."
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-green-400 transition-colors resize-none"
            />
          </div>
        </div>
      </div>

      {/* ── SECTION 3: JD Upload ── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
            <Upload className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h2 className="text-slate-800 text-sm" style={{ fontWeight: 600 }}>Upload Job Description</h2>
            <p className="text-slate-400 text-xs">PDF or Word document — keywords auto-suggested on upload</p>
          </div>
        </div>

        {!jdFile ? (
          <label
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl py-12 cursor-pointer transition-colors ${
              dragOver ? 'border-green-400 bg-green-50' : 'border-slate-200 hover:border-green-300 hover:bg-green-50/30'
            }`}
          >
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileChange} />
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-colors ${dragOver ? 'bg-green-100' : 'bg-slate-100'}`}>
              <Upload className={`w-7 h-7 transition-colors ${dragOver ? 'text-green-600' : 'text-slate-400'}`} />
            </div>
            <p className="text-slate-600 text-sm" style={{ fontWeight: 500 }}>Drag & drop JD file here</p>
            <p className="text-slate-400 text-xs mt-1">
              or <span className="text-green-600 underline">browse</span> to upload
            </p>
            <p className="text-slate-300 text-xs mt-2">Supported: PDF, DOCX (max 10 MB)</p>
          </label>
        ) : (
          <div className="space-y-5">
            {/* Uploaded File */}
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-700 text-sm truncate" style={{ fontWeight: 500 }}>{jdFile.name}</p>
                <p className="text-slate-400 text-xs">{(jdFile.size / 1024).toFixed(1)} KB · Uploaded successfully</p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              <button
                onClick={() => setJdFile(null)}
                className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── Suggested Keywords Section ── */}
            <div className="border border-dashed border-green-200 rounded-xl p-5 bg-green-50/40">
              <div className="flex items-center gap-2 mb-1">
                <Tag className="w-4 h-4 text-green-600" />
                <p className="text-slate-700 text-sm" style={{ fontWeight: 600 }}>Suggested Keywords</p>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full" style={{ fontWeight: 600 }}>
                  AI Extracted
                </span>
              </div>
              <p className="text-slate-500 text-xs mb-4">
                Keywords extracted from the uploaded JD — used for resume matching and candidate scoring.
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_KEYWORDS_MOCK.map((kw, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-200 text-green-700 text-xs rounded-full shadow-sm select-none"
                    style={{ fontWeight: 500 }}
                  >
                    <Tag className="w-3 h-3 text-green-400" />
                    {kw}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-4 italic flex items-center gap-1.5">
                <span className="w-3 h-3 border border-slate-300 rounded-full inline-block flex-shrink-0" />
                Read-only — keywords are auto-extracted from the uploaded document
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end gap-3 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-3 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50 transition-colors"
          style={{ fontWeight: 500 }}
        >
          Discard
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !form.jobTitle || !form.hrEmail}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
          style={{ fontWeight: 600 }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Job Requirement'}
        </button>
      </div>
    </div>
  );
}
