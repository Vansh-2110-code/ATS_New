import { createBrowserRouter } from 'react-router';

import { PublicLayout } from './components/layout/PublicLayout';
import { DashboardLayout } from './components/layout/DashboardLayout';

import { LandingPage } from './pages/public/LandingPage';
import { AboutPage } from './pages/public/AboutPage';
import { ServicesPage } from './pages/public/ServicesPage';
import { ApplyPage } from './pages/public/ApplyPage';

import { LoginPage } from './pages/auth/LoginPage';
import { OTPPage } from './pages/auth/OTPPage';

import { RecruiterDashboard } from './pages/recruiter/RecruiterDashboard';
import { ResumeListPage, RejectedCandidatesPage } from './pages/recruiter/ResumeListPage';
import { CandidateProfilePage } from './pages/recruiter/CandidateProfilePage';
import { CallingScreen } from './pages/recruiter/CallingScreen';
import { ResumeScanPage } from './pages/recruiter/ResumeScanPage';
import { WalkInQueuePage } from './pages/recruiter/WalkInQueuePage';
import { AddCandidatePage } from './pages/recruiter/AddCandidatePage';
import { InterviewSchedulePage } from './pages/recruiter/InterviewSchedulePage';
import { JobCreatePage } from './pages/recruiter/JobCreatePage';
import { BulkJobPostPage } from './pages/recruiter/BulkJobPostPage';
import { JoiningFormPage } from './pages/recruiter/JoiningFormPage';
import { TodaysCallsPage } from './pages/recruiter/TodaysCallsPage';
import { WalkInManagementPage } from './pages/recruiter/WalkInManagementPage';
import { WalkInInterviewFormPage } from './pages/recruiter/WalkInInterviewFormPage';
import { JRSummaryPage } from './pages/recruiter/JRSummaryPage';

import { WalkInPage } from './pages/walkin/WalkInPage';
import { WalkInLoginPage } from './pages/walkin/WalkInLoginPage';
import { WalkInLandingPage } from './pages/walkin/WalkInLandingPage';
import { WalkInFormPage } from './pages/walkin/WalkInFormPage';
import { WalkInThankYouPage } from './pages/walkin/WalkInThankYouPage';
import { WalkInDashboard } from './pages/walkin/WalkInDashboard';
import { WalkInDemoRegistrationForm } from './pages/walkin/WalkInDemoRegistrationForm';

import { TLDashboard } from './pages/tl/TLDashboard';
import { MyTeamPage } from './pages/tl/MyTeamPage';
import { TLFollowUpPage } from './pages/tl/TLFollowUpPage';

import { ManagerDashboard } from './pages/manager/ManagerDashboard';
import { ReportsPage } from './pages/manager/ReportsPage';

import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AttendancePage } from './pages/admin/AttendancePage';
import { AccessControlPage } from './pages/admin/AccessControlPage';
import { SystemLogsPage } from './pages/admin/SystemLogsPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { CandidateDatabasePage } from './pages/admin/CandidateDatabasePage';
import { JobsListPage } from './pages/admin/JobsListPage';
import { CompaniesPage } from './pages/admin/CompaniesPage';
import { EmployeeProfilePage } from './pages/admin/EmployeeProfilePage';
import { ExcelCandidateImportPage } from './pages/admin/ExcelCandidateImportPage';
import { AtsDashboardPage } from './pages/shared/AtsDashboardPage';
import { TaskManagementPage } from './pages/admin/TaskManagementPage';
import { RecruiterPortalsPage } from './pages/shared/RecruiterPortalsPage';
import { JoiningSubmissionsPage } from './pages/admin/JoiningSubmissionsPage';
import { TLActivityPage } from './pages/admin/TLActivityPage';
import { EmailCenterPage } from './pages/shared/EmailCenterPage';
import { NotificationsPage } from './pages/shared/NotificationsPage';
import { PerformanceReviewPage } from './pages/admin/PerformanceReviewPage';

import { AnalyticsPage } from './pages/analytics/AnalyticsPage';

import { SalaryPage } from './pages/finance/SalaryPage';
import { SalarySlipPage } from './pages/employee/SalarySlipPage';
import { SalaryAccessManagementPage } from './pages/employee/SalaryAccessManagementPage';
import { MyLeavesPage } from './pages/employee/MyLeavesPage';
import { LeaveManagementPage } from './pages/admin/LeaveManagementPage';
import { RevenueDashboard } from './pages/finance/RevenueDashboard';
import { RevenueEntryPage } from './pages/finance/RevenueEntryPage';
import { CreateInvoicePage } from './pages/finance/CreateInvoicePage';
import { ProformaInvoiceListPage } from './pages/finance/ProformaInvoiceListPage';
import { CreateProformaPage } from './pages/finance/CreateProformaPage';
import { CreditNoteListPage } from './pages/finance/CreditNoteListPage';
import { CreateCreditNotePage } from './pages/finance/CreateCreditNotePage';
import { FieldConfigurationPage } from './pages/admin/FieldConfigurationPage';

import { NotFoundPage } from './pages/NotFoundPage';

export const router = createBrowserRouter([
  // Public Routes
  {
    path: '/',
    Component: PublicLayout,
    children: [
      { index: true, Component: LandingPage },
      { path: 'about', Component: AboutPage },
      { path: 'services', Component: ServicesPage },
      { path: 'apply', Component: ApplyPage },
    ],
  },

  // Auth Routes (standalone)
  { path: '/login', Component: LoginPage },
  { path: '/otp', Component: OTPPage },

  // Walk-In (standalone, tablet-friendly)
  { path: '/walk-in', Component: WalkInLandingPage },
  { path: '/walkin/login', Component: WalkInLoginPage },
  { path: '/walkin/form', Component: WalkInFormPage },
  { path: '/walkin/thank-you', Component: WalkInThankYouPage },
  { path: '/walkin/dashboard', Component: WalkInDashboard },
  { path: '/walkin/demo-registration', Component: WalkInDemoRegistrationForm },
  { path: '/walkin', Component: WalkInPage }, // Old walk-in office check-in

  // Private Dashboard Routes (use DashboardLayout as pathless wrapper)
  {
    Component: DashboardLayout,
    children: [
      // Recruiter
      { path: '/recruiter', Component: RecruiterDashboard },
      { path: '/recruiter/resumes', Component: ResumeListPage },
      { path: '/recruiter/rejected', Component: RejectedCandidatesPage },
      { path: '/recruiter/candidate/:id', Component: CandidateProfilePage },
      { path: '/recruiter/call/:id', Component: CallingScreen },
      { path: '/recruiter/scan', Component: ResumeScanPage },
      { path: '/recruiter/ats-database', Component: AtsDashboardPage },
      { path: '/recruiter/walkin-queue', Component: WalkInQueuePage },
      { path: '/recruiter/add', Component: AddCandidatePage },
      { path: '/recruiter/interviews', Component: InterviewSchedulePage },
      { path: '/recruiter/jobs/new',   Component: JobCreatePage },
      { path: '/recruiter/jobs/bulk',  Component: BulkJobPostPage },
      { path: '/recruiter/joining',    Component: JoiningFormPage },
      { path: '/recruiter/calls/today', Component: TodaysCallsPage },
      { path: '/recruiter/walkins',     Component: WalkInManagementPage },
      { path: '/recruiter/walkin-interview', Component: WalkInInterviewFormPage },
      { path: '/recruiter/jobs/:id/summary', Component: JRSummaryPage },

      // Team Lead
      { path: '/tl', Component: TLDashboard },
      { path: '/tl/my-team', Component: MyTeamPage },
      { path: '/tl/follow-ups', Component: TLFollowUpPage },
      { path: '/tl/performance-reviews', Component: PerformanceReviewPage },

      // Manager
      { path: '/manager', Component: ManagerDashboard },
      { path: '/manager/reports', Component: ReportsPage },
      { path: '/manager/performance-reviews', Component: PerformanceReviewPage },

      // Admin
      { path: '/admin', Component: AdminDashboard },
      { path: '/admin/attendance', Component: AttendancePage },
      { path: '/admin/access', Component: AccessControlPage },
      { path: '/admin/logs', Component: SystemLogsPage },
      { path: '/admin/users', Component: UserManagementPage },
      { path: '/admin/candidates', Component: CandidateDatabasePage },
      { path: '/admin/excel-import', Component: ExcelCandidateImportPage },
      { path: '/admin/ats-records',  Component: AtsDashboardPage },
      { path: '/admin/field-config', Component: FieldConfigurationPage },
      { path: '/admin/jobs', Component: JobsListPage },
      { path: '/admin/companies', Component: CompaniesPage },
      { path: '/admin/employee/:id', Component: EmployeeProfilePage },
      { path: '/admin/tasks', Component: TaskManagementPage },
      { path: '/admin/joining', Component: JoiningSubmissionsPage },
      { path: '/admin/tl-activity', Component: TLActivityPage },
      { path: '/admin/performance-reviews', Component: PerformanceReviewPage },
      { path: '/manager/tl-activity', Component: TLActivityPage },

      // Shared
      { path: '/email', Component: EmailCenterPage },
      { path: '/notifications', Component: NotificationsPage },
      { path: '/recruiter-portals', Component: RecruiterPortalsPage },

      // Analytics
      { path: '/analytics', Component: AnalyticsPage },

      // Finance & Employee Self-Service
      { path: '/leaves', Component: MyLeavesPage },
      { path: '/employee/leaves', Component: MyLeavesPage },
      { path: '/admin/leaves', Component: LeaveManagementPage },
      { path: '/tl/leaves', Component: LeaveManagementPage },
      { path: '/manager/leaves', Component: LeaveManagementPage },
      { path: '/salary', Component: SalaryPage },
      { path: '/salary/slip', Component: SalarySlipPage },
      { path: '/salary-slip', Component: SalarySlipPage },
      { path: '/employee/salary-slips', Component: SalarySlipPage },
      { path: '/salary/access-requests', Component: SalaryAccessManagementPage },
      { path: '/revenue', Component: RevenueDashboard },
      { path: '/revenue/add', Component: RevenueEntryPage },
      { path: '/invoices/create', Component: CreateInvoicePage },
      { path: '/proformas', Component: ProformaInvoiceListPage },
      { path: '/proformas/create', Component: CreateProformaPage },
      { path: '/proformas/edit/:id', Component: CreateProformaPage },
      { path: '/credit-notes', Component: CreditNoteListPage },
      { path: '/credit-notes/create', Component: CreateCreditNotePage },
      { path: '/credit-notes/view/:id', Component: CreateCreditNotePage },
    ],
  },

  // 404 catch-all
  { path: '*', Component: NotFoundPage },
]);