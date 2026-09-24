import { ClerkProvider } from '@clerk/clerk-react'
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import { ThemeProvider } from './context/ThemeContext'
import AdminProtectedRoute from './components/AdminProtectedRoute'
import Home from './pages/Home'
import OwnerDashboard from './pages/OwnerDashboard'
import PublicScan from './pages/PublicScan'
import AdminLogin from './pages/admin/AdminLogin'
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminVehicles from './pages/admin/AdminVehicles'
import AdminSosLogs from './pages/admin/AdminSosLogs'
import AdminMessages from './pages/admin/AdminMessages'
import './App.css'

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
  ?.trim()
  .replace(/^['"]|['"]$/g, '')

/**
 * Public Layout Component
 * Renders the main public navbar and pages (Home, Owner Dashboard, Public Scan).
 * Dedicated floating Dark/Light mode toggle is rendered here outside the navbar.
 */
function PublicLayout() {
  return (
    <>
      <Header />
      <div className="pt-20">
        <Outlet />
      </div>
    </>
  )
}

function App() {
  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            {/* Public & Vehicle Owner Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<OwnerDashboard />} />
              <Route path="/scan/:vehicleId" element={<PublicScan />} />
            </Route>

            {/* Isolated Admin Login (Direct URL Access Only) */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Protected Hidden Admin Portal */}
            <Route
              path="/admin"
              element={
                <AdminProtectedRoute>
                  <AdminLayout />
                </AdminProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="vehicles" element={<AdminVehicles />} />
              <Route path="sos-logs" element={<AdminSosLogs />} />
              <Route path="messages" element={<AdminMessages />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </ClerkProvider>
  )
}

export default App
