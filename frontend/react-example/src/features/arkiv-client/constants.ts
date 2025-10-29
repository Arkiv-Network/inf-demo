import type { Chain } from "@arkiv-network/sdk";

export const ARKIV_CHAIN: Chain = {
  id: 60138453045,
  name: "Arkiv InfuraDemo Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [`https://infurademo.hoodi.arkiv.network/rpc`],
      webSocket: [`wss://infurademo.hoodi.arkiv.network/rpc/ws`],
    },
  },
};

export const ENTITY_OWNER = "0xF46E23f6a6F6336D4C64D5D1c95599bF77a536f0";

export const PROTOCOL_VERSION = "0.1";
