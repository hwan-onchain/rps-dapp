import { createConfig, http } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(),
  ],
  transports: {
    [baseSepolia.id]: http(),
  },
})

export const CONTRACT_ADDRESS = '0xBcFDf92dF73ac551aFAb6fbFB199642974Ddd3C7'