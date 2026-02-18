import { useState } from 'react'

import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { config } from './config/wagmi';
import Header from './components/Header';

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        hello world
      </div>
    </>
  )
}

export default App
