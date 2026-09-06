import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/AuthProvider'
import { DiscogsSyncProvider } from './hooks/DiscogsSyncProvider'
import Footer from './components/layout/Footer'

// Chargées à la demande plutôt qu'importées en dur : évite qu'un seul
// bundle JS contienne tout (Landing, Collection, Dashboard, Journal,
// Settings) alors qu'on n'en visite qu'une page à la fois.
const LandingPage = lazy(() => import('./pages/LandingPage'))
const CollectionPage = lazy(() => import('./pages/CollectionPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const JournalPage = lazy(() => import('./pages/JournalPage'))

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#333] border-t-[#f5a623]" />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <DiscogsSyncProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Landing — liste des utilisateurs publics */}
              <Route path="/" element={<LandingPage />} />

              {/* Paramètres du compte connecté */}
              <Route path="/settings" element={<SettingsPage />} />

              {/* Collection publique/privée d'un utilisateur */}
              <Route path="/:username" element={<CollectionPage />} />

              {/* Dashboard statistiques */}
              <Route path="/:username/dashboard" element={<DashboardPage />} />

              {/* Journal d'écoute */}
              <Route path="/:username/journal" element={<JournalPage />} />
            </Routes>
          </Suspense>
          <Footer />
        </DiscogsSyncProvider>
      </BrowserRouter>
    </AuthProvider>
  )
}
