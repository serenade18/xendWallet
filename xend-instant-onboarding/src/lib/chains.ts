export type ChainType = "evm" | "stellar" | "tron" | "solana";

export interface TokenOption {
  symbol: string;
  label: string;
  address: string; // "NATIVE" for native token, contract/mint address for tokens
}

export interface ChainConfig {
  key: string;
  name: string;
  chainId: string;
  nativeSymbol: string;
  explorerUrl: string;
  explorerTxUrl: string;
  type: ChainType;
  addressPrefix?: string;
  addressLength?: number;
  tokens: TokenOption[];
}

export const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    key: "ethereum-sepolia",
    name: "Ethereum Sepolia",
    chainId: "eip155:11155111",
    nativeSymbol: "ETH",
    explorerUrl: "https://sepolia.etherscan.io/address/",
    explorerTxUrl: "https://sepolia.etherscan.io/tx/",
    type: "evm",
    addressPrefix: "0x",
    addressLength: 42,
    tokens: [
      { symbol: "USD", label: "USD", address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" },
    ],
  },
  {
    key: "base-sepolia",
    name: "Base Sepolia",
    chainId: "eip155:84532",
    nativeSymbol: "ETH",
    explorerUrl: "https://sepolia.basescan.org/address/",
    explorerTxUrl: "https://sepolia.basescan.org/tx/",
    type: "evm",
    addressPrefix: "0x",
    addressLength: 42,
    tokens: [
      { symbol: "USD", label: "USD", address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" },
    ],
  },
  {
    key: "solana-devnet",
    name: "Solana Devnet",
    chainId: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
    nativeSymbol: "SOL",
    explorerUrl: "https://explorer.solana.com/address/",
    explorerTxUrl: "https://explorer.solana.com/tx/",
    type: "solana",
    tokens: [
      { symbol: "USD", label: "USD", address: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU" },
    ],
  },
];

export const DEFAULT_CHAIN = SUPPORTED_CHAINS[2];

export function getChainByKey(key: string): ChainConfig {
  return SUPPORTED_CHAINS.find((c) => c.key === key) || DEFAULT_CHAIN;
}

export function validateAddress(address: string, chain: ChainConfig): boolean {
  switch (chain.type) {
    case "evm":
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    case "stellar":
      return /^G[A-Z2-7]{55}$/.test(address);
    case "tron":
      return /^T[a-zA-Z0-9]{33}$/.test(address);
    case "solana":
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    default:
      return false;
  }
}
