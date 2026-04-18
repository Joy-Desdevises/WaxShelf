import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import CollectionPage from './pages/CollectionPage'
import DashboardPage from './pages/DashboardPage'
import WantlistPage from './pages/WantlistPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing — liste des utilisateurs publics */}
        <Route path="/" element={<LandingPage />} />

        {/* Collection publique/privée d'un utilisateur */}
        <Route path="/:username" element={<CollectionPage />} />

        {/* Dashboard statistiques */}
        <Route path="/:username/dashboard" element={<DashboardPage />} />

        {/* Wantlist */}
        <Route path="/:username/wantlist" element={<WantlistPage />} />
      </Routes>
    </BrowserRouter>
  )
}
