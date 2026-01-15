import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Motoristas from './pages/Motoristas'
import Corridas from './pages/Corridas'
import Mensagens from './pages/Mensagens'
import Configuracoes from './pages/Configuracoes'
import Relatorios from './pages/Relatorios'
import Assistencia from './pages/Assistencia'
import Avarias from './pages/Avarias'
import Chat from './pages/Chat'
import NovaCorrida from './pages/NovaCorrida'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="motoristas" element={<Motoristas />} />
          <Route path="corridas" element={<Corridas />} />
          <Route path="nova-corrida" element={<NovaCorrida />} />
          <Route path="mensagens" element={<Mensagens />} />
          <Route path="chat" element={<Chat />} />
          <Route path="assistencia" element={<Assistencia />} />
          <Route path="avarias" element={<Avarias />} />
          <Route path="relatorios" element={<Relatorios />} />
          <Route path="configuracoes" element={<Configuracoes />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
