import { useState, useEffect } from 'react';
import {
  Globe, Search, Plus, Edit3, Trash2, ExternalLink, X,
  Save, Loader2, Info, AlertTriangle, ShieldCheck, Copy, Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

interface RecruiterPortal {
  _id: string;
  name: string;
  url: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export function RecruiterPortalsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [portals, setPortals] = useState<RecruiterPortal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPortal, setEditingPortal] = useState<RecruiterPortal | null>(null);
  const [formData, setFormData] = useState({ name: '', url: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete Confirmation State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchPortals = async () => {
    setLoading(true);
    try {
      const data = await api.getRecruiterPortals();
      setPortals(data || []);
    } catch (err) {
      console.error('Failed to load portals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortals();
  }, []);

  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openAddModal = () => {
    setEditingPortal(null);
    setFormData({ name: '', url: '', description: '' });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (portal: RecruiterPortal) => {
    setEditingPortal(portal);
    setFormData({
      name: portal.name,
      url: portal.url,
      description: portal.description || '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim() || !formData.url.trim()) {
      setFormError('Name and URL are required.');
      return;
    }

    // Basic URL validation
    let formattedUrl = formData.url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    setSubmitting(true);
    try {
      if (editingPortal) {
        const updated = await api.updateRecruiterPortal(editingPortal._id, {
          name: formData.name.trim(),
          url: formattedUrl,
          description: formData.description.trim(),
        });
        setPortals(prev => prev.map(p => p._id === updated._id ? updated : p));
      } else {
        const created = await api.createRecruiterPortal({
          name: formData.name.trim(),
          url: formattedUrl,
          description: formData.description.trim(),
        });
        setPortals(prev => [...prev, created]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Operation failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteRecruiterPortal(id);
      setPortals(prev => prev.filter(p => p._id !== id));
      setDeleteId(null);
    } catch (err) {
      alert('Failed to delete portal.');
    }
  };

  // Filter portals by name or description
  const filteredPortals = portals.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-slate-800 font-extrabold text-2xl flex items-center gap-2">
            <Globe className="w-8 h-8 text-green-600 animate-pulse" />
            Recruiter Portals
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Quick links to client vendor portals, external systems, and candidate databases.
          </p>
        </div>
        
        {isAdmin && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-all shadow-sm hover:shadow-green-100"
          >
            <Plus className="w-4 h-4" />
            Add Portal
          </button>
        )}
      </div>

      {/* Info Notice */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-slate-700">{isAdmin ? 'Admin Portal Manager' : 'Recruiter Access & Copy Details'}</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin 
              ? 'You can add, edit, or delete external portal links and credentials for your team.' 
              : 'You can view all portal credentials, copy details with 1 click, and launch portal links directly. To request changes, contact Admin.'}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search portals by name, agency ID, company..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-green-400"
          />
        </div>
      </div>

      {/* Portals Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mb-3" />
          <p className="text-sm">Loading external portals...</p>
        </div>
      ) : filteredPortals.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-sm">
          <Globe className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No portals found.</p>
          <p className="text-slate-400 text-xs mt-1">Try refining your search keyword.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPortals.map(portal => (
            <div
              key={portal._id}
              className="group relative bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              {/* Card Accent line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-green-50 text-green-700 rounded-xl group-hover:bg-green-600 group-hover:text-white transition-colors duration-300">
                      <Globe className="w-5 h-5" />
                    </div>
                    <h3 className="text-slate-800 font-bold text-lg group-hover:text-green-700 transition-colors">
                      {portal.name}
                    </h3>
                  </div>
                  
                  {/* Admin Only: Edit & Delete Actions */}
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(portal)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit portal (Admin only)"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(portal._id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete portal (Admin only)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded Details Box with 1-Click Copy */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Credentials & Access Details
                    </span>
                    {portal.description && (
                      <button
                        onClick={() => handleCopy(portal.description, portal._id)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-green-700 hover:text-green-800 bg-white hover:bg-green-50 border border-slate-200 px-2 py-0.5 rounded-md transition-colors shadow-2xs"
                        title="Copy all portal details"
                      >
                        {copiedId === portal._id ? (
                          <>
                            <Check className="w-3 h-3 text-green-600" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  
                  <div className="text-xs font-mono text-slate-700 whitespace-pre-wrap break-words leading-relaxed select-all max-h-48 overflow-y-auto pr-1">
                    {portal.description || 'No credentials or instructions provided.'}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <a
                  href={portal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-green-600 hover:text-green-800 group/link bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Launch Portal
                  <ExternalLink className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                </a>

                <button
                  onClick={() => handleCopy(portal.url, `url-${portal._id}`)}
                  className="text-slate-400 hover:text-slate-600 text-xs flex items-center gap-1 transition-colors"
                  title="Copy portal URL"
                >
                  {copiedId === `url-${portal._id}` ? (
                    <span className="text-green-600 font-semibold flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> URL Copied
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5">
                      <Copy className="w-3 h-3" /> Copy URL
                    </span>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Globe className="w-5 h-5 text-green-600" />
                {editingPortal ? 'Edit Recruiter Portal' : 'Add Recruiter Portal'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Portal / Client Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HSBC, Infosys Vendor Portal, Shine"
                  value={formData.name}
                  onChange={e => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 bg-slate-50 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Portal Login URL
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. https://recruiter.portal.hsbc.com"
                  value={formData.url}
                  onChange={e => handleInputChange('url', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 bg-slate-50 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Credentials & Portal Details (Agency ID, Company ID, Email, Notes)
                </label>
                <textarea
                  rows={5}
                  placeholder={`Agency ID: IND_AGCY_1288\nCompany ID: hsbcholdin\nEmail: recruiter@whitehorse.in\nNotes: Use Chrome browser for best compatibility`}
                  value={formData.description}
                  onChange={e => handleInputChange('description', e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 bg-slate-50 focus:bg-white transition-colors"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingPortal ? 'Save Changes' : 'Add Portal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 bg-red-50 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Confirm Delete</h3>
            </div>
            
            <p className="text-slate-500 text-sm">
              Are you sure you want to remove this portal? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
