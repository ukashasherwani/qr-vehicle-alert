import { ClerkProvider } from '@clerk/clerk-react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import Home from './pages/Home'
import OwnerDashboard from './pages/OwnerDashboard'
import PublicScan from './pages/PublicScan'
import './App.css'

function App() {
  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<OwnerDashboard />} />
          <Route path="/scan/:vehicleId" element={<PublicScan />} />
        </Routes>
      </BrowserRouter>
    </ClerkProvider>
  )
}

export default App
