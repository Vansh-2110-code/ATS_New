const rawApiBase = '/api';

function normalizeApiBase(value: string) {
  // Local proxy mode in dev
  if (value === '/api') return '/api';

  // Absolute URL mode in production
  const withoutTrailingSlash = value.replace(/\/+$/, '');
  if (/^https?:\/\//i.test(withoutTrailingSlash)) {
    return withoutTrailingSlash.endsWith('/api') ? withoutTrailingSlash : `${withoutTrailingSlash}/api`;
  }

  // Fallback for relative custom values
  return withoutTrailingSlash || '/api';
}

const API_BASE = normalizeApiBase(rawApiBase);

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('ats_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('ats_token', token);
    } else {
      localStorage.removeItem('ats_token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('ats_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {};
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    });

    if (res.status === 401) {
      if (endpoint === '/auth/login') {
        const error = await res.json().catch(() => ({ message: 'Invalid credentials' }));
        throw new Error(error.message || 'Invalid credentials');
      }
      this.setToken(null);
      localStorage.removeItem('ats_user');
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    // Handle CSV/blob responses
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/csv')) {
      return (await res.text()) as unknown as T;
    }

    return res.json();
  }

  // Unauthenticated request for public endpoints (doesn't auto-logout on 401)
  private async publicRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {};
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/csv')) {
      return (await res.text()) as unknown as T;
    }

    return res.json();
  }

  // ─── Auth ───
  async login(employeeId: string, password: string, isWFH = false) {
    return this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ employeeId, password, isWFH }),
    });
  }

  async verifyOTP(userId: string, otp: string) {
    return this.request<any>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ userId, otp }),
    });
  }

  async sendOTP(userId: string) {
    return this.request<any>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    this.setToken(null);
  }

  // ─── Candidates ───
  async getCandidates(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/candidates${query ? `?${query}` : ''}`);
  }

  async exportCandidatesExcel(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/candidates/export${query ? `?${query}` : ''}`, {
      method: 'GET',
      headers,
    });

    if (res.status === 401) {
      this.setToken(null);
      localStorage.removeItem('ats_user');
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Export failed' }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    // Get filename from Content-Disposition header
    const contentDisposition = res.headers.get('content-disposition') || '';
    let filename = `Candidates_Export_${Date.now()}.xlsx`;
    const filenameMatch = contentDisposition.match(/filename="(.+?)"/);
    if (filenameMatch) {
      filename = filenameMatch[1];
    }

    // Convert response to blob and trigger download
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  getExportUrl(params: Record<string, string> = {}) {
    const base = window.location.origin;
    const query = new URLSearchParams(params).toString();
    return `${base}/api/candidates/export${query ? `?${query}` : ''}`;
  }

  // ─── Eligible Tracker ───
  async getEligibleTracker(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/candidates/eligible-tracker${query ? `?${query}` : ''}`);
  }

  async exportEligibleTrackerExcel(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/candidates/eligible-tracker/export${query ? `?${query}` : ''}`, {
      method: 'GET',
      headers,
    });

    if (res.status === 401) {
      this.setToken(null);
      localStorage.removeItem('ats_user');
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Export failed' }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    const contentDisposition = res.headers.get('content-disposition') || '';
    let filename = `Eligible_Tracker_${Date.now()}.xlsx`;
    const filenameMatch = contentDisposition.match(/filename="(.+?)"/);
    if (filenameMatch) {
      filename = filenameMatch[1];
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  async updateEligibleTrackerRow(id: string, data: Record<string, any>) {
    return this.request<any>(`/candidates/eligible-tracker/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async createEligibleTrackerCandidate(data: Record<string, any>) {
    return this.request<any>('/candidates/eligible-tracker', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async importCandidates(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('direct', 'true');
    const base = window.location.origin;
    const token = localStorage.getItem('ats_token');
    const res = await fetch(`${base}/api/candidates/import`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Import failed (${res.status})`);
    }
    return res.json();
  }

  async getCandidate(id: string) {
    return this.request<any>(`/candidates/${id}`);
  }

  async createCandidate(data: FormData) {
    return this.request<any>('/candidates', { method: 'POST', body: data });
  }

  async getCallBackReminders() {
    return this.request<any>('/candidates/callbacks');
  }

  async getRecruiters() {
    return this.request<any[]>('/users/recruiters');
  }

  async resetDemoData() {
    return this.request<any>('/users/reset-demo-data', { method: 'POST' });
  }

  async updateCandidate(id: string, data: FormData | Record<string, any>) {
    const body = data instanceof FormData ? data : JSON.stringify(data);
    return this.request<any>(`/candidates/${id}`, { method: 'PUT', body: body as any });
  }

  async updateCandidateStatus(id: string, status: string, expectedDateOfJoining?: string, offeredCTC?: string) {
    return this.request<any>(`/candidates/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, expectedDateOfJoining, offeredCTC }),
    });
  }

  async recordCandidateExit(id: string, exitDate: string, joiningDate?: string) {
    return this.request<any>(`/candidates/${id}/record-exit`, {
      method: 'POST',
      body: JSON.stringify({ exitDate, joiningDate }),
    });
  }

  async addCandidateNote(id: string, text: string, followUpDate?: string) {
    return this.request<any>(`/candidates/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ text, followUpDate }),
    });
  }

  async getFlaggedCandidates() {
    return this.request<any>('/candidates/flagged');
  }

  async correctCandidate(id: string, data: Record<string, any>) {
    return this.request<any>(`/candidates/${id}/correction`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async flagCandidate(id: string, reason: string) {
    return this.request<any>(`/candidates/${id}/flag`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  }

  // ─── Calls ───
  async initiateCall(candidateId: string) {
    return this.request<any>('/calls/initiate', {
      method: 'POST',
      body: JSON.stringify({ candidateId }),
    });
  }

  async endCall(callId: string, duration: number) {
    return this.request<any>(`/calls/${callId}/end`, {
      method: 'PUT',
      body: JSON.stringify({ duration }),
    });
  }

  async logCallOutcome(callId: string, outcome: string, notes?: string) {
    return this.request<any>(`/calls/${callId}/log`, {
      method: 'POST',
      body: JSON.stringify({ outcome, notes }),
    });
  }

  async getCandidateCalls(candidateId: string) {
    return this.request<any>(`/calls/candidate/${candidateId}`);
  }

  async getMyCalls(date?: string) {
    const query = date ? `?date=${date}` : '';
    return this.request<any>(`/calls/my${query}`);
  }

  // ─── Interviews ───
  async getInterviews(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/interviews${query ? `?${query}` : ''}`);
  }

  async createInterview(data: Record<string, any>) {
    return this.request<any>('/interviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInterviewStatus(id: string, status: string) {
    return this.request<any>(`/interviews/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // ─── Walk-In ───
  async registerWalkIn(data: FormData) {
    return this.request<any>('/walkin/register', { method: 'POST', body: data });
  }

  async getWalkInQueue(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/walkin/queue${query ? `?${query}` : ''}`);
  }

  async updateWalkInStatus(id: string, status: string) {
    return this.request<any>(`/walkin/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async assignWalkIn(id: string, recruiterId: string) {
    return this.request<any>(`/walkin/${id}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ recruiterId }),
    });
  }

  async getPublicJobs() {
    return this.request<any>('/public/jobs');
  }

  // ─── Jobs ───
  async getJobs(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/jobs${query ? `?${query}` : ''}`);
  }

  async getCandidatesForJob(id: string) {
    return this.request<any>(`/jobs/${id}/candidates`);
  }

  async getJob(id: string) {
    return this.request<any>(`/jobs/${id}`);
  }

  async createJob(data: FormData) {
    return this.request<any>('/jobs', { method: 'POST', body: data });
  }

  async extractJobKeywords(id: string) {
    return this.request<any>(`/jobs/${id}/extract-keywords`, { method: 'POST' });
  }

  async bulkCreateJobs(payload: { jobs: Record<string, any>[] } | FormData) {
    if (payload instanceof FormData) {
      return this.request<any>('/jobs/bulk', { method: 'POST', body: payload });
    }
    return this.request<any>('/jobs/bulk', { method: 'POST', body: JSON.stringify(payload) });
  }

  // ─── Users ───
  async getUsers(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/users${query ? `?${query}` : ''}`);
  }



  async createUser(data: Record<string, any>) {
    return this.request<any>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(id: string, data: Record<string, any>) {
    return this.request<any>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id: string) {
    return this.request<any>(`/users/${id}`, { method: 'DELETE' });
  }

  async toggleUserStatus(id: string) {
    return this.request<any>(`/users/${id}/status`, { method: 'PATCH' });
  }

  async resetUserPassword(id: string, data: { password: string }) {
    return this.request<any>(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ─── Attendance ───
  async getTodayAttendance() {
    return this.request<any>('/attendance/today');
  }

  async markAttendance(isWFH = false) {
    return this.request<any>('/attendance/mark', {
      method: 'POST',
      body: JSON.stringify({ isWFH }),
    });
  }

  async registerFace(faceDescriptor: number[]) {
    return this.request<any>('/users/register-face', {
      method: 'POST',
      body: JSON.stringify({ faceDescriptor }),
    });
  }

  async resetAllFaces() {
    return this.publicRequest<any>('/users/reset-all-faces', {
      method: 'POST',
    });
  }

  async sendSupportChat(message: string, action?: string, email?: string, phone?: string) {
    const token = this.getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const body = JSON.stringify({ message, action, email, phone });
    const res = await fetch(`${API_BASE}/support/chat`, {
      method: 'POST',
      headers: token ? { ...headers, Authorization: `Bearer ${token}` } : headers,
      body,
    });
    if (!res.ok) throw new Error('Failed to get chat response');
    return res.json() as Promise<{ text: string }>;
  }

  async getAttendance(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/attendance${query ? `?${query}` : ''}`);
  }

  async getAttendanceSummary() {
    return this.request<any>('/attendance/summary');
  }

  async getTLActivity(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/attendance/tl-activity${query ? `?${query}` : ''}`);
  }

  async getHolidays(year?: number) {
    const query = year ? `?year=${year}` : '';
    return this.request<any>(`/attendance/holidays${query}`);
  }

  async addHoliday(data: Record<string, any>) {
    return this.request<any>('/attendance/holidays', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getLeaveBalance(userId?: string) {
    const query = userId ? `?userId=${userId}` : '';
    return this.request<any>(`/leaves/balance${query}`);
  }

  async applyLeave(data: { leaveType: string; fromDate: string; toDate: string; daysCount: number; reason: string }) {
    return this.request<any>('/leaves/apply', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMyLeaveRequests() {
    return this.request<any[]>('/leaves/my');
  }

  async getPendingLeaveRequests() {
    return this.request<any[]>('/leaves/pending');
  }

  async reviewLeaveRequest(id: string, action: 'Approve' | 'Reject', reviewRemarks?: string) {
    return this.request<any>(`/leaves/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, reviewRemarks }),
    });
  }

  async getAllLeaveRequests(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any[]>(`/leaves/all${query ? `?${query}` : ''}`);
  }

  async checkSalarySlipDownload(month: number, year: number, userId?: string) {
    const query = new URLSearchParams({ month: String(month), year: String(year), ...(userId ? { userId } : {}) }).toString();
    return this.request<any>(`/finance/salary/download-status?${query}`);
  }

  async recordSalarySlipDownload(month: number, year: number, userId?: string) {
    return this.request<any>('/finance/salary/download-record', {
      method: 'POST',
      body: JSON.stringify({ month, year, userId }),
    });
  }

  async resetSalarySlipDownload(month: number, year: number, userId: string) {
    return this.request<any>('/finance/salary/download-reset', {
      method: 'POST',
      body: JSON.stringify({ month, year, userId }),
    });
  }

  async exportAttendanceExcel(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/attendance/export/excel${query ? `?${query}` : ''}`, {
      method: 'GET',
      headers,
    });

    if (res.status === 401) {
      this.setToken(null);
      localStorage.removeItem('ats_user');
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Export failed' }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    // Get filename from Content-Disposition header
    const contentDisposition = res.headers.get('content-disposition') || '';
    let filename = 'attendance.xlsx';
    const filenameMatch = contentDisposition.match(/filename="(.+?)"/);
    if (filenameMatch) {
      filename = filenameMatch[1];
    }

    // Convert response to blob and trigger download
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // ─── Permissions ───
  async getPermissions() {
    return this.request<any>('/permissions');
  }

  async updatePermissions(permissions: any[]) {
    return this.request<any>('/permissions', {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    });
  }

  // ─── Logs ───
  async getLogs(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/logs${query ? `?${query}` : ''}`);
  }

  async exportLogs(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<string>(`/logs/export${query ? `?${query}` : ''}`);
  }

  // ─── Performance Reviews ───
  async getReviews(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any[]>(`/reviews${query ? `?${query}` : ''}`);
  }

  async createReview(data: Record<string, any>) {
    return this.request<any>('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteReview(id: string) {
    return this.request<any>(`/reviews/${id}`, { method: 'DELETE' });
  }

  // ─── Dashboard ───
  async getRecruiterDashboard(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/dashboard/recruiter${query ? `?${query}` : ''}`);
  }

  async getTLDashboard(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/dashboard/tl${query ? `?${query}` : ''}`);
  }

  async getManagerDashboard(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/dashboard/manager${query ? `?${query}` : ''}`);
  }

  async getAdminDashboard(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/dashboard/admin${query ? `?${query}` : ''}`);
  }

  async getAllTeamsDashboard() {
    return this.request<any>('/dashboard/admin/all-teams');
  }

  async getManagerReports(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/dashboard/manager/reports${query ? `?${query}` : ''}`);
  }

  async bulkEmailCandidates(candidateIds: string[], subject: string, body: string) {
    return this.request<any>('/candidates/bulk-email', {
      method: 'POST',
      body: JSON.stringify({ candidateIds, subject, body })
    });
  }

  async getDivisionDashboard(division: string, company?: string, tlId?: string, recruiterId?: string, range?: string, from?: string, to?: string) {
    const params = new URLSearchParams({ division });
    if (company && company !== 'All Companies') params.append('company', company);
    if (tlId && tlId !== 'All Team Leaders') params.append('tlId', tlId);
    if (recruiterId && recruiterId !== 'All Recruiters') params.append('recruiterId', recruiterId);
    if (range) params.append('range', range);
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    return this.request<any>(`/dashboard/division?${params.toString()}`);
  }

  async getClientNames(): Promise<string[]> {
    const res = await this.request<any>('/companies');
    const list = Array.isArray(res) ? res : (res.companies || []);
    const names = list.map((c: any) => c.companyName || c.name || '').filter(Boolean);
    return Array.from(new Set(names)).sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }

  async getAdvancedReports(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/dashboard/reports/advanced${query ? `?${query}` : ''}`);
  }

  async searchGlobal(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/search/global${query ? `?${query}` : ''}`);
  }

  // ─── Notifications ───
  async getNotifications(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/notifications${query ? `?${query}` : ''}`);
  }

  async getNotificationUnreadCount() {
    return this.request<any>('/notifications/unread-count');
  }

  async markNotificationRead(id: string) {
    return this.request<any>(`/notifications/${id}/read`, { method: 'PUT' });
  }

  async markAllNotificationsRead() {
    return this.request<any>('/notifications/read-all', { method: 'PUT' });
  }

  // ─── Finance ───
  async getSalary(month?: number, year?: number) {
    const params: Record<string, string> = {};
    if (month) params.month = month.toString();
    if (year) params.year = year.toString();
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/finance/salary${query ? `?${query}` : ''}`);
  }

  async getMonthlyRevenue(year?: number) {
    const query = year ? `?year=${year}` : '';
    return this.request<any>(`/finance/revenue/monthly${query}`);
  }

  async getRecruiterContribution(month?: number, year?: number) {
    const params: Record<string, string> = {};
    if (month) params.month = month.toString();
    if (year) params.year = year.toString();
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/finance/revenue/recruiter-contribution${query ? `?${query}` : ''}`);
  }

  async getInvoices(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/finance/invoices${query ? `?${query}` : ''}`);
  }

  async getNextInvoiceNumber() {
    return this.request<any>('/finance/invoices/next-number');
  }

  async createInvoice(data: Record<string, any>) {
    return this.request<any>('/finance/invoices', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateInvoice(id: string, data: Record<string, any>) {
    return this.request<any>(`/finance/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async createSalary(data: Record<string, any>) {
    return this.request<any>('/finance/salary', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateSalary(id: string, data: Record<string, any>) {
    return this.request<any>(`/finance/salary/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteSalary(id: string) {
    return this.request<any>(`/finance/salary/${id}`, { method: 'DELETE' });
  }

  async addIncentive(salaryId: string, data: Record<string, any>) {
    return this.request<any>(`/finance/salary/${salaryId}/incentives`, { method: 'POST', body: JSON.stringify(data) });
  }

  async removeIncentive(salaryId: string, incentiveId: string) {
    return this.request<any>(`/finance/salary/${salaryId}/incentives/${incentiveId}`, { method: 'DELETE' });
  }

  // ─── Proforma Invoices ───
  async createProforma(data: Record<string, any>) {
    return this.request<any>('/finance/proformas', { method: 'POST', body: JSON.stringify(data) });
  }

  async getProformas(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/finance/proformas${query ? `?${query}` : ''}`);
  }

  async getProforma(id: string) {
    return this.request<any>(`/finance/proformas/${id}`);
  }

  async updateProforma(id: string, data: Record<string, any>) {
    return this.request<any>(`/finance/proformas/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async submitProformaForApproval(id: string) {
    return this.request<any>(`/finance/proformas/${id}/submit`, { method: 'PUT' });
  }

  async approveProforma(id: string, approvalNotes?: string) {
    return this.request<any>(`/finance/proformas/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ approvalNotes }),
    });
  }

  async rejectProforma(id: string, rejectionReason: string) {
    return this.request<any>(`/finance/proformas/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ rejectionReason }),
    });
  }

  async sendProformaToClient(id: string) {
    return this.request<any>(`/finance/proformas/${id}/send`, { method: 'PUT' });
  }

  async updateProformaPONumber(id: string, poNumber: string) {
    return this.request<any>(`/finance/proformas/${id}/po`, {
      method: 'PUT',
      body: JSON.stringify({ poNumber }),
    });
  }

  async convertProformaToInvoice(id: string) {
    return this.request<any>(`/finance/proformas/${id}/convert`, { method: 'POST' });
  }

  // ─── Credit Notes ───
  async createCreditNote(data: Record<string, any>) {
    return this.request<any>('/finance/credit-notes', { method: 'POST', body: JSON.stringify(data) });
  }

  async getCreditNotes(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/finance/credit-notes${query ? `?${query}` : ''}`);
  }

  async getNextCreditNoteNumber() {
    return this.request<any>('/finance/credit-notes/next-number');
  }

  async getCreditNote(id: string) {
    return this.request<any>(`/finance/credit-notes/${id}`);
  }

  async updateCreditNote(id: string, data: Record<string, any>) {
    return this.request<any>(`/finance/credit-notes/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteCreditNote(id: string) {
    return this.request<any>(`/finance/credit-notes/${id}`, { method: 'DELETE' });
  }

  // ─── Salary Slip Access Control ───
  async requestSalarySlipAccess(data: {
    month: number;
    year: number;
    reason: string;
    durationDays: number;
  }) {
    return this.request<any>('/finance/salary-access/request', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSalaryAccessRequests(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/finance/salary-access/requests${query ? `?${query}` : ''}`);
  }

  async checkSalarySlipAccess(month: number, year: number) {
    return this.request<any>(`/finance/salary-access/check?month=${month}&year=${year}`);
  }

  async approveSalaryAccessRequest(id: string, durationDays: number) {
    return this.request<any>(`/finance/salary-access/requests/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ durationDays }),
    });
  }

  async rejectSalaryAccessRequest(id: string, rejectionReason: string) {
    return this.request<any>(`/finance/salary-access/requests/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ rejectionReason }),
    });
  }

  // ─── Employee Attendance Detail ───
  async getEmployeeAttendanceSummary(userId: string, year?: number) {
    const query = year ? `?year=${year}` : '';
    return this.request<any>(`/attendance/employee/${userId}${query}`);
  }

  // ─── Jobs (admin CRUD + companies) ───
  async updateJob(id: string, data: FormData | Record<string, any>) {
    const isForm = data instanceof FormData;
    return this.request<any>(`/jobs/${id}`, {
      method: 'PUT',
      body: isForm ? data : JSON.stringify(data),
    });
  }

  async deleteJob(id: string) {
    return this.request<any>(`/jobs/${id}`, { method: 'DELETE' });
  }

  async getCompanies() {
    return this.request<any>('/companies');
  }

  async getCompanyStats() {
    return this.request<any>('/jobs/companies');
  }

  // ─── Company CRUD ───
  async createCompany(data: Record<string, any>) {
    return this.request<any>('/companies', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateCompany(id: string, data: Record<string, any>) {
    return this.request<any>(`/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async getCompanyList(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/companies${query ? `?${query}` : ''}`);
  }

  async deleteCompany(id: string) {
    return this.request<any>(`/companies/${id}`, { method: 'DELETE' });
  }

  // ─── Candidate Workflow ───
  async submitSecondCall(id: string, data: Record<string, any>) {
    return this.request<any>(`/candidates/${id}/second-call`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async reassignCandidate(id: string, data: { newRecruiterId: string; newRecruiterName: string; reason?: string }) {
    return this.request<any>(`/candidates/${id}/reassign`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async markCandidateDuplicate(id: string, duplicateOfId?: string) {
    return this.request<any>(`/candidates/${id}/mark-duplicate`, {
      method: 'POST',
      body: JSON.stringify({ duplicateOfId }),
    });
  }

  async requestCandidateReassign(id: string, note?: string) {
    return this.request<any>(`/candidates/${id}/request-reassign`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  }

  async tagCandidateToNewJr(id: string, data: { newJrNumber: string; notes?: string }) {
    return this.request<any>(`/candidates/${id}/tag-new-jr`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async uploadCandidateDocument(id: string, formData: FormData) {
    return this.request<any>(`/candidates/${id}/documents`, {
      method: 'POST',
      body: formData,
    });
  }

  async updateDocumentStatus(id: string, docId: string, status: string) {
    return this.request<any>(`/candidates/${id}/documents/${docId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteCandidateDocument(id: string, docId: string) {
    return this.request<any>(`/candidates/${id}/documents/${docId}`, {
      method: 'DELETE',
    });
  }

  // ─── Duplicate Check ───
  async checkDuplicate(params: { phone?: string; email?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<any>(`/candidates/check-duplicate${query ? `?${query}` : ''}`);
  }

  // ─── Tasks ───
  async getTasks(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/tasks${query ? `?${query}` : ''}`);
  }

  async getTasksForCandidate(candidateId: string) {
    return this.request<any>(`/tasks/for-candidate/${candidateId}`);
  }

  async createTask(data: Record<string, any>) {
    return this.request<any>('/tasks', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateTask(id: string, data: Record<string, any>) {
    return this.request<any>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteTask(id: string) {
    return this.request<any>(`/tasks/${id}`, { method: 'DELETE' });
  }

  async getTaskTeamSummary() {
    return this.request<any>('/tasks/team-summary');
  }

  // ─── Public ───
  async applyPublic(data: FormData) {
    return this.request<any>('/public/apply', { method: 'POST', body: data });
  }

  async submitJoining(data: Record<string, any>) {
    return this.request<any>('/public/joining', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getJoiningList(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/public/joining${query ? `?${query}` : ''}`);
  }

  async getJoiningDetail(id: string) {
    return this.request<any>(`/public/joining/${id}`);
  }

  async updateJoining(id: string, data: Record<string, any>) {
    return this.request<any>(`/public/joining/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async approveJoining(id: string) {
    return this.request<any>(`/public/joining/${id}/approve`, {
      method: 'POST',
    });
  }

  async rejectJoining(id: string, remarks: string, rejectedDocuments?: string[]) {
    return this.request<any>(`/public/joining/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ remarks, rejectedDocuments }),
    });
  }

  // ─── Comprehensive Joining Form ───
  async createOrUpdateJoiningForm(employeeId: string, formData: FormData) {
    const endpoint = employeeId ? `/candidates/${employeeId}/joining-form` : '/candidates/joining-form';
    return this.request<any>(endpoint, {
      method: 'POST',
      body: formData,
    });
  }

  async getJoiningForm(employeeId: string) {
    return this.request<any>(`/candidates/${employeeId}/joining-form`);
  }

  async getJoiningFormAutoFillData(employeeId?: string, jrId?: string) {
    const params: Record<string, string> = {};
    if (employeeId) params.employeeId = employeeId;
    if (jrId) params.jrId = jrId;
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/candidates/joining-form/autofill${query ? `?${query}` : ''}`);
  }

  // ─── Resume Scan ───
  async scanResume(data: FormData) {
    return this.request<any>('/resumes/scan', { method: 'POST', body: data });
  }

  // ─── ATS Records ───
  async getAtsRecords(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/ats-records${query ? `?${query}` : ''}`);
  }

  async exportAtsRecords(params: Record<string, string> = {}) {
    const query  = new URLSearchParams(params).toString();
    const url    = `${API_BASE}/ats-records/export${query ? `?${query}` : ''}`;
    const res    = await fetch(url, {
      headers: { Authorization: `Bearer ${this.getToken()}` },
    });
    if (!res.ok) throw new Error('Export failed');
    const blob     = await res.blob();
    const link     = document.createElement('a');
    link.href      = URL.createObjectURL(blob);
    link.download  = `ATS_Records_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async updateAtsRecord(id: string, data: Record<string, any>) {
    return this.request<any>(`/ats-records/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ─── Recruiter Portals ───
  async getRecruiterPortals() {
    return this.request<any[]>('/recruiter-portals');
  }

  async createRecruiterPortal(data: { name: string; url: string; description?: string }) {
    return this.request<any>('/recruiter-portals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRecruiterPortal(id: string, data: { name: string; url: string; description?: string }) {
    return this.request<any>(`/recruiter-portals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRecruiterPortal(id: string) {
    return this.request<any>(`/recruiter-portals/${id}`, {
      method: 'DELETE',
    });
  }

  // ─── Email ───
  async sendCandidateEmail(data: {
    candidateId: string;
    templateType: string;
    customSubject?: string;
    customBody?: string;
    role?: string;
    company?: string;
    interviewDate?: string;
    interviewTime?: string;
    interviewMode?: string;
    joiningDate?: string;
    offeredSalary?: string;
    jobLocation?: string;
  }) {
    return this.request<any>('/email/send', { method: 'POST', body: JSON.stringify(data) });
  }

  async getEmailTemplate(type: string, params: Record<string, string> = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request<any>(`/email/templates/${type}${q ? `?${q}` : ''}`);
  }

  async getSentEmails(params: Record<string, string> = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request<any>(`/email/sent${q ? `?${q}` : ''}`);
  }

  async getSmtpStatus() {
    return this.request<any>('/email/smtp-status');
  }

  // ═════════════════════════════════════════════════════════════
  // WALK-IN CANDIDATE MODULE APIS
  // ═════════════════════════════════════════════════════════════

  async walkInSignup(name: string, email: string, phone: string, password: string) {
    return this.publicRequest<any>('/walkin/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, phone, password }),
    });
  }

  async walkInLogin(email: string, password: string) {
    return this.publicRequest<any>('/walkin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async submitWalkInForm(formData: FormData) {
    const token = this.getToken() || localStorage.getItem('walkin_token');
    if (!token) {
      throw new Error('Please login to continue');
    }

    const init: RequestInit = {
      method: 'POST',
      body: formData,
      headers: new Headers({
        Authorization: `Bearer ${token}`,
      }),
    };

    const response = await fetch(`${API_BASE}/walkin/form`, init);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to submit form');
    }
    return response.json();
  }

  async getWalkInStatus(_walkinId?: string) {
    const token = this.getToken() || localStorage.getItem('walkin_token');
    if (!token) {
      throw new Error('Please login to continue');
    }

    const headers = token ? new Headers({ Authorization: `Bearer ${token}` }) : undefined;

    const response = await fetch(`${API_BASE}/walkin/status`, { headers });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch status');
    }
    return response.json();
  }

  async updateWalkInPassword(oldPassword: string, newPassword: string) {
    return this.request<any>('/walkin/password', {
      method: 'PUT',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  }

  // ─── Team Management ───


  // Add team member (TL can add recruiters)
  // Add team member (TL adds to their team, Admin adds to specific TL)
  async addTeamMember(employeeId: string, tlId?: string) {
    return this.request<any>('/teams/members/add', {
      method: 'POST',
      body: JSON.stringify(tlId ? { employeeId, tlId } : { employeeId }),
    });
  }

  // Remove team member
  async removeTeamMember(employeeId: string, tlId?: string) {
    return this.request<any>('/teams/members/remove', {
      method: 'POST',
      body: JSON.stringify(tlId ? { employeeId, tlId } : { employeeId }),
    });
  }

  // Get members of a team (TL gets own, Admin gets specific TL's)
  async getTeamMembers(tlId?: string) {
    const url = tlId ? `/teams/members?tlId=${tlId}` : '/teams/members';
    return this.request<any>(url, { method: 'GET' });
  }

  // Get all team leaders (for Admin/Manager)
  async getTeamLeaders() {
    return this.request<any>('/teams/leaders', { method: 'GET' });
  }

  // Add team leader (Admin/Manager only)
  async addTeamLeader(employeeId: string) {
    return this.request<any>('/teams/leaders/add', {
      method: 'POST',
      body: JSON.stringify({ employeeId }),
    });
  }

  // Remove team leader (Admin/Manager only)
  async removeTeamLeader(employeeId: string) {
    return this.request<any>('/teams/leaders/remove', {
      method: 'POST',
      body: JSON.stringify({ employeeId }),
    });
  }

  // Get available employees for team assignment
  async getAvailableEmployees(role?: string) {
    const url = role ? `/teams/available?role=${role}` : '/teams/available';
    return this.request<any>(url, { method: 'GET' });
  }

  // ─── Field Configuration ───

  // Get field configuration for a specific role
  async getFieldConfig(role: string) {
    return this.request<any>(`/admin/field-config/${role}`, { method: 'GET' });
  }

  // Update field configuration for a role
  async updateFieldConfig(role: string, config: any) {
    return this.request<any>(`/admin/field-config/${role}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  // Get all field configurations
  async getAllFieldConfigs() {
    return this.request<any>('/admin/field-config/all', { method: 'GET' });
  }

  // Reset field configuration to defaults
  async resetFieldConfigToDefaults(role: string) {
    return this.request<any>('/admin/field-config/reset', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  }

  // Get import presets for a role
  async getImportPresets(role: string) {
    return this.request<any>(`/admin/field-config/presets/list?role=${role}`, { method: 'GET' });
  }

  // Save a new import preset
  async saveImportPreset(role: string, name: string, description: string, mapping: any[]) {
    return this.request<any>('/admin/field-config/presets', {
      method: 'POST',
      body: JSON.stringify({ role, name, description, mapping }),
    });
  }

  // Delete an import preset
  async deleteImportPreset(role: string, presetId: string) {
    return this.request<any>(`/admin/field-config/presets/${presetId}?role=${role}`, { method: 'DELETE' });
  }

  // ─── HR Management ───

  // Get existing HR contacts for dropdown
  async getHRContacts() {
    return this.request<any>('/jobs/hr-contacts', { method: 'GET' });
  }

  // ─── Demo Flow ───

  // Login as a virtual demo user
  async demoWalkInLogin() {
    return this.request<any>('/walkin/demo-login', { method: 'POST' });
  }

  // Register candidate as a demo user
  async registerDemoCandidate(formData: FormData) {
    return this.request<any>('/walkin/register-demo', {
      method: 'POST',
      body: formData,
    });
  }

  // ─── Business Development ───
  async getBizDevRecords(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/business-development${query ? `?${query}` : ''}`);
  }

  async getBizDevStats(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/business-development/stats${query ? `?${query}` : ''}`);
  }

  async createBizDevRecord(data: Record<string, any>) {
    return this.request<any>('/business-development', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBizDevRecord(id: string, data: Record<string, any>) {
    return this.request<any>(`/business-development/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBizDevRecord(id: string) {
    return this.request<any>(`/business-development/${id}`, {
      method: 'DELETE',
    });
  }

  async exportBizDevExcel(params: Record<string, string> = {}) {
    const query  = new URLSearchParams(params).toString();
    const url    = `${API_BASE}/business-development/export${query ? `?${query}` : ''}`;
    const res    = await fetch(url, {
      headers: { Authorization: `Bearer ${this.getToken()}` },
    });
    if (!res.ok) throw new Error('Export failed');
    const blob     = await res.blob();
    const link     = document.createElement('a');
    link.href      = URL.createObjectURL(blob);
    link.download  = `Business_Development_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // ─── Payroll & Multi-Company Modules ─────────────────────────────
  async getPayrollCompanies() {
    return this.request<any[]>('/payroll/companies');
  }

  async getPayrollBranches(companyId?: string) {
    const q = companyId ? `?companyId=${companyId}` : '';
    return this.request<any[]>(`/payroll/branches${q}`);
  }

  async getPayrollComponents(companyId?: string) {
    const q = companyId ? `?companyId=${companyId}` : '';
    return this.request<any[]>(`/payroll/components${q}`);
  }

  async savePayrollComponent(data: any) {
    return this.request<any>('/payroll/components', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPayrollStructures(companyId?: string) {
    const q = companyId ? `?companyId=${companyId}` : '';
    return this.request<any[]>(`/payroll/structures${q}`);
  }

  async savePayrollStructure(data: any) {
    return this.request<any>('/payroll/structures', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPayrollStatutory(companyId?: string) {
    const q = companyId ? `?companyId=${companyId}` : '';
    return this.request<any>(`/payroll/statutory${q}`);
  }

  async savePayrollStatutory(data: any) {
    return this.request<any>('/payroll/statutory', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPayrollEmployees(params: Record<string, string> = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request<any[]>(`/payroll/employees${q ? `?${q}` : ''}`);
  }

  async updatePayrollEmployee(id: string, data: any) {
    return this.request<any>(`/payroll/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getPayrollDashboard(params: Record<string, string> = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request<any>(`/payroll/dashboard${q ? `?${q}` : ''}`);
  }

  async calculatePayroll(data: any) {
    return this.request<any>('/payroll/calculate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePayrollStatus(data: any) {
    return this.request<any>('/payroll/status', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPayrollRunRecords(runId: string) {
    return this.request<any[]>(`/payroll/runs/${runId}/records`);
  }

  async getPayslips(params: Record<string, string> = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request<{ records: any[]; count: number; totalDisbursed: number; totalGross: number }>(`/payroll/payslips${q ? `?${q}` : ''}`);
  }

  async getPayslipById(id: string) {
    return this.request<any>(`/payroll/payslips/${id}`);
  }

  async markPayslipDownloaded(id: string) {
    return this.request<any>(`/payroll/payslips/${id}/downloaded`, { method: 'POST' });
  }

  async getIncentives(params: Record<string, string> = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request<{ incentives: any[]; summary: any }>(`/payroll/incentives${q ? `?${q}` : ''}`);
  }

  async syncIncentives() {
    return this.request<any>('/payroll/incentives/sync', { method: 'POST' });
  }

  async updateIncentiveStatus(id: string, data: { status: string; notes?: string }) {
    return this.request<any>(`/payroll/incentives/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ─── Internal Employee Chat Suite ───
  async getChatRooms() {
    return this.request<any[]>('/internal-chat/rooms');
  }

  async getOrCreateDirectChat(targetUserId: string) {
    return this.request<any>('/internal-chat/rooms/direct', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
  }

  async getChatMessages(roomId: string, limit = 100) {
    return this.request<any[]>(`/internal-chat/rooms/${roomId}/messages?limit=${limit}`);
  }

  async sendChatMessage(roomId: string, data: { text?: string; attachments?: any[]; candidateId?: string }) {
    return this.request<any>(`/internal-chat/rooms/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async markChatRoomRead(roomId: string) {
    return this.request<any>(`/internal-chat/rooms/${roomId}/read`, {
      method: 'POST',
    });
  }

  async getChatColleagues() {
    return this.request<any[]>('/internal-chat/colleagues');
  }

  async getChatUnreadTotal() {
    return this.request<{ unreadTotal: number }>('/internal-chat/unread-total');
  }

  async uploadChatAttachment(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<{ name: string; url: string; fileType: string; size: number }>('/internal-chat/upload', {
      method: 'POST',
      body: formData,
    });
  }

  // ─── Offer Letters (Admin Only) ───
  async getOfferTemplates() {
    return this.request<{ success: boolean; templates: any[] }>('/offer-letters/templates');
  }

  async getOfferLetters(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<{ success: boolean; data: any[]; pagination: any }>(`/offer-letters${query ? `?${query}` : ''}`);
  }

  async getOfferLetter(id: string) {
    return this.request<{ success: boolean; data: any }>(`/offer-letters/${id}`);
  }

  async createOfferLetter(data: any) {
    return this.request<{ success: boolean; data: any }>('/offer-letters', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateOfferLetter(id: string, data: any) {
    return this.request<{ success: boolean; data: any }>(`/offer-letters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteOfferLetter(id: string) {
    return this.request<{ success: boolean; message: string }>(`/offer-letters/${id}`, {
      method: 'DELETE',
    });
  }

  async sendOfferLetterEmail(id: string) {
    return this.request<{ success: boolean; message: string }>(`/offer-letters/${id}/send-email`, {
      method: 'POST',
    });
  }

  async downloadOfferLetterDocx(id: string, filename: string) {
    const url = `${API_BASE}/offer-letters/${id}/download-docx`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.getToken()}` },
    });
    if (!res.ok) throw new Error('Failed to download Word document');
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename || 'Offer_Letter.docx';
    link.click();
    URL.revokeObjectURL(link.href);
  }
}

export const api = new ApiService();
export default api;
