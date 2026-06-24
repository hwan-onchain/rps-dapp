import { createConfig, http } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { coinbaseWallet, injected } from 'wagmi/connectors'

export const PAYMASTER_URL = 'https://api.developer.coinbase.com/rpc/v1/base-sepolia/90JipFoVJQQYrvNeYpC7dJXglsECOILI'

export const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    coinbaseWallet({
      appName: '가위바위보 dApp',
      preference: 'smartWalletOnly',
    }),
    injected(),
  ],
  transports: {
    [baseSepolia.id]: http(PAYMASTER_URL),
  },
})

export const CONTRACT_ADDRESS = '0xBcFDf92dF73ac551aFAb6fbFB199642974Ddd3C7'
