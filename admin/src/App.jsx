import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Motoristas from './pages/Motoristas';
import Corridas from './pages/Corridas';
import NovaCorrida from './pages/NovaCorrida';
import Relatorios from './pages/Relatorios';
import Configuracoes from './pages/Configuracoes';
import ConfiguracaoWhatsapp from './pages/ConfiguracaoWhatsapp';
import Mensagens from './pages/Mensagens';
import Chat from './pages/Chat';
import Avarias from './pages/Avarias';
import Assistencia from './pages/Assistencia';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="motoristas" element={<Motoristas />} />
          <Route path="corridas" element={<Corridas />} />
          <Route path="corridas/nova" element={<NovaCorrida />} />
          <Route path="relatorios" element={<Relatorios />} />
          <Route path="configuracoes" element={<Configuracoes />} />
          <Route path="whatsapp" element={<ConfiguracaoWhatsapp />} />
          <Route path="mensagens" element={<Mensagens />} />
          <Route path="chat" element={<Chat />} />
          <Route path="avarias" element={<Avarias />} />
          <Route path="assistencia" element={<Assistencia />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
