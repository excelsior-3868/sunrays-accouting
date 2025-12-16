import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { AuthProvider } from '@/contexts/AuthContext';
import RequireAuth from '@/components/auth/RequireAuth';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import SettingsPage from '@/pages/SettingsPage';
import ChartOfAccountsPage from '@/pages/ChartOfAccountsPage';
import FeeStructuresPage from '@/pages/FeeStructuresPage';
import InvoicesPage from '@/pages/InvoicesPage';
import InvoiceDetailsPage from '@/pages/InvoiceDetailsPage';
import ExpensesPage from '@/pages/ExpensesPage';
import SalaryStructuresPage from '@/pages/SalaryStructuresPage';
import PayrollPage from '@/pages/PayrollPage';
import ReportsPage from '@/pages/ReportsPage';
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

            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/salary-structures" element={<SalaryStructuresPage />} />
            <Route path="/settings/staffs" element={<StaffsPage />} />

            <Route path="/payroll" element={
              <ProtectedRoute requiredPermission="payroll.view">
                <PayrollPage />
              </ProtectedRoute>
            } />

            <Route path="/reports" element={<ReportsPage />} />
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
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
