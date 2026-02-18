import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, sepolia, localhost } from "wagmi/chains";

export const config = getDefaultConfig({
    appName: "Defi-Lend",
    projectId: "YOUR_WALLETCONNECT_PROJECT_ID", 
    chains: [mainnet, sepolia, localhost],
    ssr: false,
});

