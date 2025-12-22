import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import RequireAuth from '@/components/auth/RequireAuth';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/reports/DashboardPage';
import SettingsPage from '@/pages/SettingsPage';
import ChartOfAccountsPage from '@/pages/ChartOfAccountsPage';
import FeeStructuresPage from '@/pages/FeeStructuresPage';
import InvoicesPage from '@/pages/InvoicesPage';
import InvoiceDetailsPage from '@/pages/InvoiceDetailsPage';
import ExpensesPage from '@/pages/ExpensesPage';
import IncomePage from '@/pages/IncomePage';
import SalaryStructuresPage from '@/pages/SalaryStructuresPage';
import PayrollPage from '@/pages/PayrollPage';
import ReportsPage from '@/pages/ReportsPage';
import InventoryPage from '@/pages/InventoryPage';
import DefaultersReport from '@/pages/reports/DefaultersReport';
import StudentLedgerReport from '@/pages/reports/StudentLedgerReport';
import ProfitLossReport from '@/pages/reports/ProfitLossReport';
import CashFlowReport from '@/pages/reports/CashFlowReport';
import SalarySheetReport from '@/pages/reports/SalarySheetReport';
import StaffLedgerReport from '@/pages/reports/StaffLedgerReport';
import GLHeadReport from '@/pages/reports/GLHeadReport';
import StudentsPage from '@/pages/StudentsPage';
import TeachersPage from '@/pages/TeachersPage';
import StaffsPage from '@/pages/StaffsPage';
import UsersPage from '@/pages/UsersPage';
import RolesPage from '@/pages/RolesPage';

import ProtectedRoute from '@/components/auth/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/chart-of-accounts" element={<ChartOfAccountsPage />} />
            <Route path="/fee-structures" element={<FeeStructuresPage />} />

            <Route path="/invoices" element={
              <ProtectedRoute requiredPermission="invoices.view">
                <InvoicesPage />
              </ProtectedRoute>
            } />
            <Route path="/invoices/:id" element={
              <ProtectedRoute requiredPermission="invoices.view">
                <InvoiceDetailsPage />
              </ProtectedRoute>
            } />
            <Route path="/income" element={<IncomePage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            {/* Inventory Management Route */}
            <Route path="/inventory" element={<InventoryPage />} />

            <Route path="/salary-structures" element={<SalaryStructuresPage />} />
            <Route path="/settings/staffs" element={<StaffsPage />} />

            <Route path="/payroll" element={
              <ProtectedRoute requiredPermission="payroll.view">
                <PayrollPage />
              </ProtectedRoute>
            } />

            {/* <Route path="/reports" element={<ReportsPage />} /> */}
            <Route path="/reports/daybook" element={<ReportsPage />} /> {/* Maintaining old one as Daybook for now */}
            <Route path="/reports/defaulters" element={<DefaultersReport />} />
            <Route path="/reports/student-ledger" element={<StudentLedgerReport />} />
            <Route path="/reports/profit-loss" element={<ProfitLossReport />} />
            <Route path="/reports/cash-flow" element={<CashFlowReport />} />
            <Route path="/reports/salary-sheet" element={<SalarySheetReport />} />
            <Route path="/reports/staff-ledger" element={<StaffLedgerReport />} />
            <Route path="/reports/gl-head" element={<GLHeadReport />} />
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/teachers" element={<TeachersPage />} />

            <Route path="/users" element={
              <ProtectedRoute requiredPermission="users.view">
                <UsersPage />
              </ProtectedRoute>
            } />

            <Route path="/roles" element={
              <ProtectedRoute requiredPermission="roles.view">
                <RolesPage />
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        <Toaster />
      </BrowserRouter>
    </AuthProvider >
  )
}

export default App
