import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import {
  Building2, Briefcase, Users, RefreshCw, Search, ChevronRight, Plus, X,
  Save, Loader2, Mail, Phone, MapPin, Shield, FileText, Edit2, Trash2,
} from 'lucide-react';
import api from '../../services/api';

// ─── Location Data ─────────────────────────────────────────────────────────
const COUNTRIES = [
  'India', 'UAE', 'Saudi Arabia', 'Qatar', 'Bahrain', 'Kuwait', 'Oman',
  'Singapore', 'USA', 'UK', 'Australia', 'Canada', 'Germany', 'Other',
];

const STATES_BY_COUNTRY: Record<string, string[]> = {
  India: [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Delhi-NCR', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
    'Jammu-Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
    'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  ],
  UAE: ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah'],
  'Saudi Arabia': ['Riyadh', 'Mecca', 'Medina', 'Eastern Province', 'Asir', 'Jizan', 'Tabuk', 'Najran'],
  Qatar: ['Doha', 'Al Rayyan', 'Al Wakrah', 'Al Khor'],
  Bahrain: ['Manama', 'Riffa', 'Muharraq', 'Hamad Town'],
  Kuwait: ['Kuwait City', 'Hawalli', 'Salmiya', 'Ahmadi'],
  Oman: ['Muscat', 'Salalah', 'Sohar', 'Nizwa'],
  Singapore: ['Central Region', 'East Region', 'North Region', 'North-East Region', 'West Region'],
  USA: ['California', 'Texas', 'New York', 'Florida', 'Illinois', 'Washington'],
  UK: ['England', 'Scotland', 'Wales', 'Northern Ireland'],
  Australia: ['New South Wales', 'Victoria', 'Queensland', 'Western Australia', 'South Australia'],
  Canada: ['Ontario', 'Quebec', 'British Columbia', 'Alberta', 'Manitoba'],
  Germany: ['Bavaria', 'Berlin', 'Hamburg', 'Hesse', 'Baden-Württemberg'],
};

const CITIES_BY_STATE: Record<string, string[]> = {
  // India — Southern
  Karnataka: ['Bangalore', 'Mysore', 'Hubli', 'Mangalore', 'Belgaum', 'Gulbarga', 'Bellary', 'Bijapur'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tiruchirappalli', 'Tirunelveli', 'Vellore', 'Erode'],
  Telangana: ['Hyderabad', 'Warangal', 'Karimnagar', 'Nizamabad', 'Khammam', 'Nalgonda'],
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati', 'Kurnool', 'Nellore'],
  Kerala: ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Palakkad'],
  // India — Western
  Maharashtra: ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Aurangabad', 'Solapur', 'Kolhapur', 'Navi Mumbai'],
  Gujarat: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Gandhinagar', 'Jamnagar'],
  Goa: ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa'],
  Rajasthan: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner', 'Alwar'],
  // India — Northern
  'Delhi-NCR': ['Delhi', 'Noida', 'Gurgaon', 'Faridabad', 'Ghaziabad', 'Greater Noida', 'Meerut'],
  Haryana: ['Gurgaon', 'Faridabad', 'Rohtak', 'Hisar', 'Panipat', 'Ambala', 'Sonipat'],
  Punjab: ['Chandigarh', 'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Prayagraj', 'Meerut', 'Noida', 'Ghaziabad'],
  Uttarakhand: ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rishikesh'],
  'Himachal Pradesh': ['Shimla', 'Manali', 'Dharamsala', 'Solan', 'Mandi'],
  'Jammu-Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Sopore', 'Baramulla'],
  // India — Eastern
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman'],
  Bihar: ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga'],
  Jharkhand: ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh'],
  Odisha: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur'],
  Assam: ['Guwahati', 'Dibrugarh', 'Silchar', 'Jorhat', 'Nagaon'],
  // India — Central
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar'],
  Chhattisgarh: ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg'],
  // UAE
  Dubai: ['Deira', 'Bur Dubai', 'Jumeirah', 'Business Bay', 'Downtown Dubai', 'Jebel Ali', 'Dubai Marina', 'Al Quoz'],
  'Abu Dhabi': ['Abu Dhabi City', 'Al Ain', 'Khalifa City', 'Mussafah', 'Ruwais'],
  Sharjah: ['Sharjah City', 'Khor Fakkan', 'Kalba'],
  // Saudi Arabia
  Riyadh: ['Riyadh City', 'Al Diriyah', 'Al Kharj'],
  Mecca: ['Mecca City', 'Jeddah', 'Taif'],
  // Singapore
  'Central Region': ['Downtown Core', 'Orchard', 'Marina Bay', 'Bukit Timah'],
  'West Region': ['Jurong East', 'Jurong West', 'Clementi', 'Buona Vista'],
};

// ─── Form State ─────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  companyName: '', address: '', spoc: '',
  email: '', phone: '', gst: '', lut: '',
  country: 'India', state: '', city: '', localArea: '',
};

// ─── Component ──────────────────────────────────────────────────────────────
export function CompaniesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const focusCompany = (location.state as any)?.company as string | undefined;
  const { user } = useAuth();
  const isViewOnlyAdmin = user?.role === 'view_only_admin';

  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [showAddInfo, setShowAddInfo] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const stateOptions = STATES_BY_COUNTRY[form.country] || [];
  const cityOptions = CITIES_BY_STATE[form.state] || [];

  const setField = (key: string, value: string) =>
    setForm(f => ({ ...f, [key]: value }));

  const openAdd = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setSaveError('');
    setShowModal(true);
  };

  const openEdit = (c: any, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Editing company data:', c);
    
    setEditId(c._id);
    setForm({
      companyName: String(c.companyName || ''),
      address: String(c.address || ''),
      spoc: String(c.spoc || ''),
      email: String(c.email || ''),
      phone: String(c.phone || ''),
      gst: String(c.gst || ''),
      lut: String(c.lut || ''),
      country: String(c.country || 'India'),
      state: String(c.state || ''),
      city: String(c.city || ''),
      localArea: String(c.localArea || ''),
    });
    setSaveError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.companyName.trim()) { setSaveError('Company name is required'); return; }
    setSaving(true); setSaveError('');
    try {
      if (editId) {
        await api.updateCompany(editId, form);
        alert('Company details updated successfully!');
      } else {
        await api.createCompany(form);
        alert('Company created successfully!');
      }
      setShowModal(false);
      setForm({ ...EMPTY_FORM });
      setEditId(null);
      await fetchCompanies();
    } catch (err: any) {
      const msg = err.message || 'Failed to save company';
      setSaveError(msg);
      alert('Error saving company:\n' + msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this company?')) return;
    try {
      await api.deleteCompany(id);
      fetchCompanies();
    } catch { /* ignore */ }
  };

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const [data, statsData] = await Promise.all([
        api.getCompanies(),
        api.getCompanyStats().catch(() => ({ companies: [] })),
      ]);
      const statsMap: Record<string, any> = {};
      for (const s of (statsData.companies || [])) {
        statsMap[s.companyName] = s;
      }
      const merged = (data.companies || []).map((c: any) => ({
        ...c,
        ...(statsMap[c.companyName] ? {
          openJRs: statsMap[c.companyName].openJRs,
          closedJRs: statsMap[c.companyName].closedJRs,
          totalJRs: statsMap[c.companyName].totalJRs,
          totalPositions: statsMap[c.companyName].totalPositions,
          candidateCount: statsMap[c.companyName].candidateCount,
          lastActivity: statsMap[c.companyName].lastActivity,
        } : {}),
      }));
      setCompanies(merged);
    } catch {
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCompanies(); }, []);

  // Auto-open modal if a company is focused (e.g., coming from JRs)
  useEffect(() => {
    if (focusCompany && companies.length > 0) {
      const company = companies.find(c => c.companyName === focusCompany);
      if (company) {
        // Mock a click event for openEdit
        const mockEvent = { stopPropagation: () => {} } as any;
        openEdit(company, mockEvent);
      }
    }
  }, [focusCompany, companies]);

  const filtered = companies.filter(c =>
    !search || c.companyName?.toLowerCase().includes(search.toLowerCase())
      || c.spoc?.toLowerCase().includes(search.toLowerCase())
      || c.city?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPositions = companies.reduce((s, c) => s + (c.totalPositions || 0), 0);
  const totalOpen = companies.reduce((s, c) => s + (c.openJRs || 0), 0);

  const locationStr = (c: any) => [c.city, c.state, c.country].filter(Boolean).join(', ');

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl text-slate-800" style={{ fontWeight: 700 }}>Companies</h1>
            <p className="text-slate-500 text-sm mt-0.5">Client companies and their job requirements</p>
          </div>
          <div className="flex items-center gap-2">
            {!isViewOnlyAdmin && (
              <button onClick={openAdd}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700 transition-colors"
                style={{ fontWeight: 600 }}>
                <Plus className="w-4 h-4" /> Add Company
              </button>
            )}
            <button onClick={fetchCompanies} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Companies', value: companies.length, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Open JRs', value: totalOpen, icon: Briefcase, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Total Positions', value: totalPositions, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3`}>
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center flex-shrink-0">
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <div className={`text-xl ${s.color}`} style={{ fontWeight: 700 }}>{s.value}</div>
                <div className="text-slate-500 text-xs">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by company name, SPOC, or city…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500/30 shadow-sm" />
        </div>

        {/* Company Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No companies found</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((c, i) => (
              <div key={i}
                className={`bg-white rounded-2xl shadow-sm border-2 p-5 cursor-pointer hover:shadow-md transition-all ${focusCompany === c.companyName ? 'border-green-400' : 'border-slate-100 hover:border-slate-200'}`}
                onClick={(e) => openEdit(c, e)}>
                <div className="flex items-start justify-between gap-4">
                  {/* Left: info */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Building2 className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-slate-800" style={{ fontWeight: 700 }}>{c.companyName}</h3>

                      {/* Contact row */}
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        {c.spoc && (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Users className="w-3 h-3 text-slate-400" />
                            {c.spoc}
                          </span>
                        )}
                        {c.email && (
                          <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-green-600">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {c.email}
                          </a>
                        )}
                        {c.phone && (
                          <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-green-600">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {c.phone}
                          </a>
                        )}
                        {locationStr(c) && (
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <MapPin className="w-3 h-3" />
                            {locationStr(c)}
                          </span>
                        )}
                      </div>

                      {/* GST / LUT tags */}
                      {(c.gst || c.lut) && (
                        <div className="flex gap-2 mt-1.5">
                          {c.gst && (
                            <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                              <Shield className="w-3 h-3" /> GST: {c.gst}
                            </span>
                          )}
                          {c.lut && (
                            <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                              <FileText className="w-3 h-3" /> LUT: {c.lut}
                            </span>
                          )}
                        </div>
                      )}

                      {c.address && (
                        <p className="text-xs text-slate-400 mt-1 truncate">{c.address}</p>
                      )}

                      <p className="text-slate-400 text-xs mt-1">
                        Last activity: {c.lastActivity ? new Date(c.lastActivity).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Right: stats + actions */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="hidden sm:flex items-center gap-4">
                      {[
                        { val: c.openJRs || 0, label: 'Open JRs', color: 'text-emerald-600', link: true },
                        { val: c.closedJRs || 0, label: 'Closed', color: 'text-slate-500', link: true },
                        { val: c.totalPositions || 0, label: 'Positions', color: 'text-violet-600', link: false },
                        { val: c.totalJRs || 0, label: 'Total JRs', color: 'text-blue-600', link: true },
                        { val: c.candidateCount || 0, label: 'Candidates', color: 'text-pink-600', link: false },
                      ].map((s, idx) => (
                        <div key={idx} 
                          className={`text-center ${s.link ? 'hover:bg-slate-50 px-2 py-1 rounded-lg transition-colors cursor-help' : ''}`}
                          onClick={(e) => {
                            if (s.link) {
                              e.stopPropagation();
                              navigate('/admin/jobs', { state: { company: c.companyName } });
                            }
                          }}
                        >
                          <div className={`text-lg ${s.color}`} style={{ fontWeight: 700 }}>{s.val}</div>
                          <div className="text-xs text-slate-400">{s.label}</div>
                        </div>
                      ))}
                    </div>
                    {!isViewOnlyAdmin && (
                    <div className="flex items-center gap-1 ml-1">
                      <button
                        onClick={e => openEdit(c, e)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => handleDelete(c._id, e)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-slate-300 ml-1" />
                    </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════ Add / Edit Company Modal ══════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-green-600" />
                <h2 className="text-slate-800" style={{ fontWeight: 700 }}>
                  {editId ? 'Edit Company' : 'Add New Company'}
                </h2>
              </div>
              <button onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-6">
              {saveError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{saveError}</div>
              )}

              {/* ── Section 1: Basic Info ── */}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-3" style={{ fontWeight: 600 }}>Company Information</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>Company Name *</label>
                    <input type="text" value={form.companyName} onChange={e => setField('companyName', e.target.value)}
                      placeholder="e.g. Tech Mahindra"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-green-400" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>Address</label>
                    <textarea value={form.address} onChange={e => setField('address', e.target.value)} rows={2}
                      placeholder="Full company address"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-green-400 resize-none" />
                  </div>
                </div>
              </div>

              {/* ── Section 2: Contact Details ── */}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-3" style={{ fontWeight: 600 }}>Contact Details</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>
                      <Users className="inline w-3.5 h-3.5 mr-1" />SPOC (Contact Person)
                    </label>
                    <input type="text" value={form.spoc} onChange={e => setField('spoc', e.target.value)}
                      placeholder="e.g. Rajesh Kumar"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-green-400" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>
                      <Mail className="inline w-3.5 h-3.5 mr-1" />Email
                    </label>
                    <input type="email" value={form.email} onChange={e => setField('email', e.target.value)}
                      placeholder="contact@company.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-green-400" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>
                      <Phone className="inline w-3.5 h-3.5 mr-1" />Phone
                    </label>
                    <input type="tel" value={form.phone} onChange={e => setField('phone', e.target.value)}
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-green-400" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>
                      <Shield className="inline w-3.5 h-3.5 mr-1" />GST Number
                    </label>
                    <input type="text" value={form.gst} onChange={e => setField('gst', e.target.value.toUpperCase())}
                      placeholder="e.g. 22AAAAA0000A1Z5"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-green-400 uppercase" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-500 mb-1.5" style={{ fontWeight: 500 }}>
                      <FileText className="inline w-3.5 h-3.5 mr-1" />LUT Number
                    </label>
                    <input type="text" value={form.lut} onChange={e => setField('lut', e.target.value)}
                      placeholder="Letter of Undertaking number"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-green-400" />
                  </div>
                </div>
              </div>

              {/* ── Section 3: Location (4-step cascade) ── */}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-4" style={{ fontWeight: 600 }}>Location</p>

                {/* Step indicators */}
                <div className="flex items-center gap-1 mb-4">
                  {['Country', 'State', 'City', 'Local Area'].map((step, idx) => {
                    const vals = [form.country, form.state, form.city, form.localArea];
                    const done = !!vals[idx];
                    return (
                      <div key={step} className="flex items-center gap-1">
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors ${done ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`} style={{ fontWeight: done ? 600 : 400 }}>
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${done ? 'bg-green-500 text-white' : 'bg-slate-300 text-white'}`} style={{ fontWeight: 700, fontSize: '0.6rem' }}>
                            {idx + 1}
                          </span>
                          {step}
                        </div>
                        {idx < 3 && <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />}
                      </div>
                    );
                  })}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Step 1: Country */}
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5 flex items-center gap-1" style={{ fontWeight: 500 }}>
                      <span className="w-4 h-4 bg-green-500 text-white rounded-full flex items-center justify-center" style={{ fontSize: '0.6rem', fontWeight: 700 }}>1</span>
                      Country
                    </label>
                    <select value={form.country}
                      onChange={e => { setField('country', e.target.value); setField('state', ''); setField('city', ''); }}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-green-400 bg-white">
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Step 2: State */}
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5 flex items-center gap-1" style={{ fontWeight: 500 }}>
                      <span className={`w-4 h-4 text-white rounded-full flex items-center justify-center ${form.country ? 'bg-green-500' : 'bg-slate-300'}`} style={{ fontSize: '0.6rem', fontWeight: 700 }}>2</span>
                      State / Province / Emirate
                    </label>
                    <select value={form.state}
                      onChange={e => { setField('state', e.target.value); setField('city', ''); }}
                      disabled={!form.country || stateOptions.length === 0}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-green-400 bg-white disabled:bg-slate-50 disabled:text-slate-400">
                      <option value="">Select state</option>
                      {stateOptions.map(s => <option key={s} value={s}>{s}</option>)}
                      {form.country && stateOptions.length === 0 && <option value="Other">Other</option>}
                    </select>
                  </div>

                  {/* Step 3: City */}
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5 flex items-center gap-1" style={{ fontWeight: 500 }}>
                      <span className={`w-4 h-4 text-white rounded-full flex items-center justify-center ${form.state ? 'bg-green-500' : 'bg-slate-300'}`} style={{ fontSize: '0.6rem', fontWeight: 700 }}>3</span>
                      City
                    </label>
                    <select value={form.city} onChange={e => setField('city', e.target.value)}
                      disabled={!form.state}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-green-400 bg-white disabled:bg-slate-50 disabled:text-slate-400">
                      <option value="">Select city</option>
                      {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
                      {form.state && <option value="Other">Other</option>}
                    </select>
                  </div>

                  {/* Step 4: Local Area */}
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5 flex items-center gap-1" style={{ fontWeight: 500 }}>
                      <span className={`w-4 h-4 text-white rounded-full flex items-center justify-center ${form.city ? 'bg-green-500' : 'bg-slate-300'}`} style={{ fontSize: '0.6rem', fontWeight: 700 }}>4</span>
                      Local Area
                    </label>
                    <input type="text" value={form.localArea} onChange={e => setField('localArea', e.target.value)}
                      placeholder="e.g. Whitefield, Koramangala"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-green-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => { setShowModal(false); setForm({ ...EMPTY_FORM }); setSaveError(''); }}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50 transition-colors"
                style={{ fontWeight: 500 }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
                style={{ fontWeight: 600 }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving…' : editId ? 'Update Company' : 'Save Company'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ══════════ Add Company Info Modal ══════════ */}
      {showAddInfo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <Briefcase className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold">How to Add a Company</h3>
            </div>
            
            <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
              <p>
                To maintain data integrity, new companies must be initialized through the <span className="font-bold text-slate-800">Job Requirements</span> process.
              </p>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
                <p className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">1</span>
                  Go to "Job Requirements" section.
                </p>
                <p className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">2</span>
                  Create a new JR and enter the new Company name.
                </p>
                <p className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">3</span>
                  Once created, the company will appear here automatically.
                </p>
              </div>
              <p>
                After the company appears in this list, you can click the <span className="text-blue-600 font-semibold">Edit</span> icon to update its GST, address, and contact details.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setShowAddInfo(false)}
                className="px-6 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-900 transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
