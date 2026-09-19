import { useState, useEffect, useRef } from 'react';
import {
  X, Sparkles, Plus, Trash2, CheckCircle2, Briefcase, FileText,
  Tag, Layers, Loader2, AlertCircle, Upload, Download, FileSpreadsheet, FolderArchive
} from 'lucide-react';
import api from '../../services/api';

interface CustomJdManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJdCreated?: (newJd: any) => void;
}

export function CustomJdManagerModal({ isOpen, onClose, onJdCreated }: CustomJdManagerModalProps) {
  const [tab, setTab] = useState<'bulk' | 'create' | 'library'>('bulk');
  const [rawText, setRawText] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Finance & Procurement Operations');
  const [experience, setExperience] = useState('1-5 Years');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedJds, setSavedJds] = useState<any[]>([]);
  const [loadingJds, setLoadingJds] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Bulk Import state
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [defaultClientName, setDefaultClientName] = useState('');
  const [defaultLocation, setDefaultLocation] = useState('Bangalore, India');
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResults, setBulkResults] = useState<{ total: number; createdJobs: any[]; failed: any[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const CATEGORIES = [
    'Finance & Procurement Operations',
    'IT & Software Development',
    'BPO / Customer Operations',
    'Human Resources',
    'Sales & Business Development',
    'Healthcare & Medical BPO',
    'General Operations & Admin'
  ];

  const fetchSavedJds = async () => {
    setLoadingJds(true);
    try {
      const data = await api.getCustomJds();
      if (Array.isArray(data)) setSavedJds(data);
    } catch (err) {
      console.error('Failed to fetch custom JDs:', err);
    } finally {
      setLoadingJds(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSavedJds();
      setBulkResults(null);
      setBulkFiles([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExtract = async () => {
    if (!rawText.trim()) {
      setFeedback({ type: 'error', message: 'Please paste the Job Description text first.' });
      return;
    }

    setExtracting(true);
    setFeedback(null);
    try {
      const res = await api.extractJdDetails(rawText);
      if (res) {
        if (res.suggestedTitle) setTitle(res.suggestedTitle);
        if (res.category) setCategory(res.category);
        if (res.suggestedExp) setExperience(res.suggestedExp);
        if (Array.isArray(res.skills) && res.skills.length > 0) {
          setSkills(Array.from(new Set([...skills, ...res.skills])));
        }
        setFeedback({
          type: 'success',
          message: `✨ Extracted ${res.skills?.length || 0} skills, title, and category successfully!`
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to auto-extract details from text.' });
    } finally {
      setExtracting(false);
    }
  };

  const handleAddSkill = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      const val = skillInput.trim();
      if (!skills.includes(val)) {
        setSkills([...skills, val]);
      }
      setSkillInput('');
    }
  };

  const removeSkill = (toRemove: string) => {
    setSkills(skills.filter(s => s !== toRemove));
  };

  const handleSaveSingle = async () => {
    if (!title.trim()) {
      setFeedback({ type: 'error', message: 'Please provide a Job Title.' });
      return;
    }
    if (!rawText.trim()) {
      setFeedback({ type: 'error', message: 'Job Description content is required.' });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const created = await api.createCustomJd({
        title: title.trim(),
        category,
        experience,
        skills,
        text: rawText
      });

      setFeedback({ type: 'success', message: `✅ Successfully saved "${title}" into active presets library!` });
      setSavedJds([created, ...savedJds]);
      if (onJdCreated) {
        onJdCreated(created);
      }
      // Reset form
      setTitle('');
      setRawText('');
      setSkills([]);
      setSkillInput('');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save Job Description.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteJd = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this Job Description from the library?')) return;
    try {
      await api.deleteCustomJd(id);
      setSavedJds(savedJds.filter(j => j._id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete JD');
    }
  };

  // ─── Bulk Upload Handlers ───
  const handleBulkFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setBulkFiles(Array.from(e.target.files));
      setBulkResults(null);
      setFeedback(null);
    }
  };

  const handleBulkDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setBulkFiles(Array.from(e.dataTransfer.files));
      setBulkResults(null);
      setFeedback(null);
    }
  };

  const handleBulkImport = async () => {
    if (bulkFiles.length === 0) {
      setFeedback({ type: 'error', message: 'Please select or drag & drop JD files, a ZIP archive, or an Excel sheet.' });
      return;
    }

    setBulkImporting(true);
    setFeedback(null);
    setBulkResults(null);

    try {
      const fd = new FormData();
      bulkFiles.forEach(f => {
        fd.append('file', f);
      });
      if (defaultClientName.trim()) {
        fd.append('defaultClientName', defaultClientName.trim());
      }
      if (defaultLocation.trim()) {
        fd.append('defaultLocation', defaultLocation.trim());
      }

      const res = await api.bulkImportJdFiles(fd);
      if (res && res.success) {
        setBulkResults({
          total: res.createdCount || 0,
          createdJobs: res.createdJobs || [],
          failed: res.failed || []
        });

        setFeedback({
          type: 'success',
          message: `🎉 Success! Created ${res.createdCount} new Active JRs in the White Horse database!`
        });

        // Trigger parent callback to refresh active JRs list
        if (onJdCreated && res.createdJobs?.length > 0) {
          onJdCreated(res.createdJobs[0]);
        }
      } else {
        setFeedback({
          type: 'error',
          message: res?.message || 'Bulk import failed. Please check file formatting.'
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to process bulk JDs.'
      });
    } finally {
      setBulkImporting(false);
    }
  };

  const handleDownloadSampleCsv = () => {
    const csvHeader = "Job Title,Client Name,Experience,Location,Skills,Job Description\n";
    const sampleRows = 
      "Senior React Developer,Amazon,3-5 Years,Bangalore,\"React.js, TypeScript, Node.js, Redux\",Building high scale web applications and mentoring juniors\n" +
      "Procurement Operations Specialist,Infosys,2-6 Years,Hyderabad,\"P2P, Accounts Payable, SAP, Purchase Orders\",End-to-end procurement and invoice clearing operations\n" +
      "Customer Support Executive,Wipro,0-2 Years,Bangalore,\"Voice Support, Customer Service, BPO\",Handling inbound client queries with excellent English communication\n";
    const blob = new Blob([csvHeader + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'WhiteHorse_Bulk_JDs_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Client JD & JR Manager</h3>
              <p className="text-xs text-slate-400">Import client JDs directly into Active JRs for immediate candidate matching</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 bg-white px-6 pt-2">
          <button
            onClick={() => setTab('bulk')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 mr-6 flex items-center gap-1.5 ${
              tab === 'bulk'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5" /> ⚡ Bulk Import Active JRs (Files / ZIP / Excel)
          </button>
          <button
            onClick={() => setTab('create')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 mr-6 flex items-center gap-1.5 ${
              tab === 'create'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Single JD (Paste Text)
          </button>
          <button
            onClick={() => setTab('library')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              tab === 'library'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Presets Library ({savedJds.length})
          </button>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`px-6 py-2.5 text-xs font-semibold flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-100'
                : 'bg-red-50 text-red-700 border-b border-red-100'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* ══════════════════════════════════════════════════════ */}
          {/* ⚡ TAB 1: BULK IMPORT (FILES / ZIP / EXCEL) */}
          {/* ══════════════════════════════════════════════════════ */}
          {tab === 'bulk' && (
            <div className="space-y-4">
              {/* Info Callout */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Direct Active JR Integration</span>
                </div>
                <p className="text-emerald-700 leading-relaxed">
                  Upload multiple client JDs at once. Each JD automatically gets an official JR Number (e.g. <strong>JRWH0350</strong>), joins the <strong>Active JRs count</strong>, and immediately matches all scanned resumes.
                </p>
              </div>

              {/* Client & Location Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Client / Company Name
                  </label>
                  <input
                    type="text"
                    value={defaultClientName}
                    onChange={(e) => setDefaultClientName(e.target.value)}
                    placeholder="e.g. Amazon, Cognizant, or Client Mandate"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Applied to uploaded JDs unless specified in file</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Location / Branch
                  </label>
                  <input
                    type="text"
                    value={defaultLocation}
                    onChange={(e) => setDefaultLocation(e.target.value)}
                    placeholder="e.g. Bangalore, India"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Drag & Drop Upload Box */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleBulkDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/20 hover:bg-emerald-50/40 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".zip,.rar,.pdf,.docx,.doc,.txt,.xlsx,.xls,.csv"
                  onChange={handleBulkFileSelect}
                  className="hidden"
                />
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 group-hover:bg-emerald-200 text-emerald-700 flex items-center justify-center transition-colors">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Click to browse or Drag & Drop Multiple Client JDs
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Supports <strong>ZIP archives</strong>, Word (<strong>.docx</strong>, <strong>.doc</strong>), <strong>PDF</strong>, Text (<strong>.txt</strong>), or Excel sheets (<strong>.xlsx</strong>, <strong>.csv</strong>)
                  </p>
                </div>
                {bulkFiles.length > 0 && (
                  <div className="pt-2">
                    <span className="px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-bold shadow-xs">
                      📁 {bulkFiles.length} file(s) selected
                    </span>
                  </div>
                )}
              </div>

              {/* Template Helper Strip */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                <span className="text-[11px] text-slate-400">Prefer uploading via spreadsheet?</span>
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Download Excel/CSV Template
                </button>
              </div>

              {/* Bulk Results Display */}
              {bulkResults && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Created {bulkResults.total} Active JRs
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Ready for Matching
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-slate-200/60 text-xs">
                    {bulkResults.createdJobs.map((cj) => (
                      <div key={cj._id || cj.jrNumber} className="py-1.5 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-800">{cj.jrNumber}:</span>{' '}
                          <span className="text-slate-600">{cj.jobTitle}</span>{' '}
                          <span className="text-slate-400 text-[10px]">({cj.companyName})</span>
                        </div>
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded">
                          {cj.experience}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleBulkImport}
                  disabled={bulkFiles.length === 0 || bulkImporting}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {bulkImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Parsing & Adding to Active JRs...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      🚀 Import & Create Active JRs ({bulkFiles.length} files)
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* ➕ TAB 2: SINGLE JD (PASTE TEXT) */}
          {/* ══════════════════════════════════════════════════════ */}
          {tab === 'create' && (
            <div className="space-y-4">
              {/* Raw Text Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Paste Raw Job Description Text
                  </label>
                  <button
                    type="button"
                    onClick={handleExtract}
                    disabled={extracting || !rawText.trim()}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer disabled:opacity-40"
                  >
                    {extracting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                    )}
                    Auto-Extract Skills & Details
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste the raw text of the job description here..."
                  className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 outline-none leading-relaxed font-mono"
                />
              </div>

              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Job Title / Role Name *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Senior Java Full Stack Developer"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Industry Domain / Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 outline-none bg-white cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Experience Range */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Experience Required
                </label>
                <input
                  type="text"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  placeholder="e.g. 3-6 Years"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Skills Tags */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Required Skills & Keywords ({skills.length})
                </label>
                <div className="p-2 border border-slate-200 rounded-xl min-h-[44px] flex flex-wrap items-center gap-1.5">
                  {skills.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => removeSkill(s)}
                        className="text-emerald-600 hover:text-emerald-900 ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleAddSkill}
                    placeholder="Type skill & press Enter..."
                    className="flex-1 min-w-[150px] text-xs px-2 py-1 outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSingle}
                  disabled={saving || !title.trim() || !rawText.trim()}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Single JD
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* 📚 TAB 3: SAVED JDS LIBRARY */}
          {/* ══════════════════════════════════════════════════════ */}
          {tab === 'library' && (
            <div className="space-y-3">
              {loadingJds ? (
                <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> Loading saved presets...
                </div>
              ) : savedJds.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No custom JDs saved yet. Use the Bulk Import or Add New JD tab to upload client requirements.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {savedJds.map((jd) => (
                    <div
                      key={jd._id}
                      className="p-4 border border-slate-200/80 rounded-xl hover:border-emerald-300 transition-colors bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-800 text-xs truncate">{jd.title}</h4>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold">
                            {jd.category}
                          </span>
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold">
                            {jd.experience}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {(jd.skills || []).slice(0, 6).map((s: string) => (
                            <span
                              key={s}
                              className="px-1.5 py-0.2 bg-slate-50 border border-slate-200 text-slate-600 rounded text-[9px]"
                            >
                              {s}
                            </span>
                          ))}
                          {(jd.skills || []).length > 6 && (
                            <span className="text-[9px] text-slate-400 self-center">
                              +{jd.skills.length - 6} more
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (onJdCreated) onJdCreated(jd);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-colors"
                        >
                          Use in Scanner
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteJd(jd._id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete JD Preset"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
