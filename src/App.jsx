import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { DiscogsSyncProvider } from './hooks/useDiscogsSync'
import LandingPage from './pages/LandingPage'
import CollectionPage from './pages/CollectionPage'
import DashboardPage from './pages/DashboardPage'
import WantlistPage from './pages/WantlistPage'
import SettingsPage from './pages/SettingsPage'
import JournalPage from './pages/JournalPage'
import Footer from './components/layout/Footer'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <DiscogsSyncProvider>
          <Routes>
            {/* Landing — liste des utilisateurs publics */}
            <Route path="/" element={<LandingPage />} />

            {/* Paramètres du compte connecté */}
            <Route path="/settings" element={<SettingsPage />} />

            {/* Collection publique/privée d'un utilisateur */}
            <Route path="/:username" element={<CollectionPage />} />

            {/* Dashboard statistiques */}
            <Route path="/:username/dashboard" element={<DashboardPage />} />

            {/* Wantlist */}
            <Route path="/:username/wantlist" element={<WantlistPage />} />

            {/* Journal d'écoute */}
            <Route path="/:username/journal" element={<JournalPage />} />
          </Routes>
          <Footer />
        </DiscogsSyncProvider>
      </BrowserRouter>
    </AuthProvider>
  )
}
