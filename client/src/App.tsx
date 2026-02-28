import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './config/wagmi';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Markets from './components/Markets';
import Supply from './components/Supply';
import Borrow from './components/Borrow';

// Create a react-query client
const queryClient = new QueryClient();

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
            <Header />
            <main style={{ padding: '24px 32px' }}>
              <Routes>
                <Route path='/' element={<Dashboard />} />
                <Route path='/dashboard' element={<Dashboard />} />
                <Route path='/markets' element={<Markets />} />
                <Route path='/supply' element={<Supply />} />
                <Route path='/borrow' element={<Borrow />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
