import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, Check, Eye, Building2, MapPin, AlertCircle } from 'lucide-react';

interface JrSearchableSelectProps {
  jobs: any[];
  value: string; // jrNumber
  onChange: (jrNumber: string) => void;
  onPreviewJd: (job: any) => void;
  error?: string;
  disabled?: boolean;
}

export const JrSearchableSelect: React.FC<JrSearchableSelectProps> = ({
  jobs,
  value,
  onChange,
  onPreviewJd,
  error,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Identify currently selected job object
  const selectedJob = useMemo(() => {
    return jobs.find((j: any) => j.jrNumber === value) || null;
  }, [jobs, value]);

  // Dynamic filter matching JR Number, Job Title, Client Name, Location, or Recruiter
  const filteredJobs = useMemo(() => {
    if (!query.trim()) return jobs;
    const q = query.toLowerCase().trim();
    return jobs.filter((j: any) => {
      const jrNum = (j.jrNumber || '').toLowerCase();
      const title = (j.jobTitle || '').toLowerCase();
      const client = (j.client || j.companyName || '').toLowerCase();
      const loc = (j.location || '').toLowerCase();
      const owner = (j.recruiterName || '').toLowerCase();
      return (
        jrNum.includes(q) ||
        title.includes(q) ||
        client.includes(q) ||
        loc.includes(q) ||
        owner.includes(q)
      );
    });
  }, [jobs, query]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current && filteredJobs.length > 0) {
      const itemElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (itemElement) {
        itemElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen, filteredJobs.length]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredJobs.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredJobs.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredJobs[highlightedIndex]) {
        handleSelect(filteredJobs[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setQuery('');
    }
  };

  const handleSelect = (job: any) => {
    onChange(job.jrNumber);
    setIsOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className="w-full" ref={containerRef}>
      {/* Combobox Row with Preview Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Main Searchable Input Container */}
        <div className="relative flex-1">
          <div
            onClick={() => {
              if (!disabled) {
                setIsOpen(true);
                setTimeout(() => inputRef.current?.focus(), 50);
              }
            }}
            className={`w-full min-h-[44px] px-3.5 py-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
              error
                ? 'border-red-400 bg-red-50/20 ring-1 ring-red-300'
                : isOpen
                ? 'border-blue-500 ring-2 ring-blue-100 bg-white'
                : 'border-slate-300 hover:border-slate-400 bg-white'
            } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''}`}
          >
            {/* Search Icon */}
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />

            {/* Input or Selected Label */}
            <div className="flex-1 min-w-0">
              {isOpen ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => {
                    setQuery(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    selectedJob
                      ? `${selectedJob.jrNumber} – ${selectedJob.jobTitle}...`
                      : 'Type to filter JRs by name, title, or client...'
                  }
                  className="w-full bg-transparent text-sm outline-none text-slate-900 placeholder:text-slate-400"
                  autoFocus
                />
              ) : selectedJob ? (
                <div className="flex items-center gap-2 truncate">
                  <span className="font-mono font-bold text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded flex-shrink-0">
                    {selectedJob.jrNumber}
                  </span>
                  <span className="text-sm font-semibold text-slate-900 truncate">
                    {selectedJob.jobTitle}
                  </span>
                  <span className="text-xs text-slate-500 truncate hidden md:inline">
                    ({selectedJob.client || selectedJob.companyName || 'Client'})
                  </span>
                </div>
              ) : (
                <span className="text-sm text-slate-400">
                  -- Select JR ({jobs.length} available) * --
                </span>
              )}
            </div>

            {/* Actions: Clear or Chevron */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {selectedJob && !disabled && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                  title="Clear Selection"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-blue-600' : ''
                }`}
              />
            </div>
          </div>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
              {/* Header Info */}
              <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium">
                  Showing <strong>{filteredJobs.length}</strong> of {jobs.length} JRs
                </span>
                <span className="text-[11px] text-slate-400">
                  Use ↑ ↓ to navigate, Enter to select
                </span>
              </div>

              {/* Items List */}
              <div
                ref={listRef}
                className="max-h-64 sm:max-h-72 overflow-y-auto divide-y divide-slate-100"
              >
                {filteredJobs.length > 0 ? (
                  filteredJobs.map((j: any, index: number) => {
                    const isSelected = j.jrNumber === value;
                    const isHighlighted = index === highlightedIndex;

                    return (
                      <div
                        key={j._id || j.jrNumber}
                        onClick={() => handleSelect(j)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        className={`px-3.5 py-2.5 cursor-pointer text-left transition-colors flex items-center justify-between gap-3 ${
                          isHighlighted
                            ? 'bg-blue-50/70 text-blue-900'
                            : isSelected
                            ? 'bg-slate-50'
                            : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          {/* Row 1: JR Number + Title */}
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 flex-shrink-0">
                              {j.jrNumber}
                            </span>
                            <span className="font-semibold text-sm truncate text-slate-900" title={j.jobTitle}>
                              {j.jobTitle}
                            </span>
                          </div>

                          {/* Row 2: Client, Location, Owner */}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                            <span className="flex items-center gap-1 text-slate-700 font-medium truncate">
                              <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              {j.client || j.companyName || 'Client'}
                            </span>
                            {j.location && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="flex items-center gap-0.5 text-slate-600">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  {j.location}
                                </span>
                              </>
                            )}
                            {j.recruiterName && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-500">Owner: {j.recruiterName}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Selected Indicator */}
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="px-4 py-8 text-center text-slate-500 text-sm">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                    No Job Requisitions match "<strong>{query}</strong>"
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Preview JD Button */}
        <button
          type="button"
          onClick={() => {
            if (selectedJob) {
              onPreviewJd(selectedJob);
            }
          }}
          disabled={!selectedJob}
          className={`h-[44px] px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap shadow-sm ${
            selectedJob
              ? 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-blue-100 hover:shadow-md cursor-pointer'
              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
          }`}
          title={
            selectedJob
              ? `Preview full Job Description for ${selectedJob.jrNumber}`
              : 'Please select a JR first to view the complete Job Description'
          }
        >
          <Eye className="w-4 h-4 flex-shrink-0" />
          <span>Preview JD</span>
        </button>
      </div>

      {/* Field Error Message */}
      {error && (
        <p className="text-red-500 text-xs font-semibold mt-1.5 flex items-center gap-1.5 bg-red-50 p-2 rounded-lg border border-red-200">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
};
