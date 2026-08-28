import { PrivyProvider, useEmbeddedEthereumWallet, useIdentityToken, usePrivy } from '@privy-io/expo';
import { createContext, useContext, type ReactNode } from 'react';
import { polygon } from 'viem/chains';
import { stringToHex } from 'viem';
import { useAuth } from '@/auth/provider';

type WalletValue = {
  configured: boolean;
  ready: boolean;
  privyUserId: string | null;
  ownerAddress: string | null;
  ensureOwnerWallet: () => Promise<{ privyUserId: string; ownerAddress: string; privyIdentityToken: string }>;
  signMessage: (message: string) => Promise<string>;
  signTypedData: (typedData: Record<string, unknown>) => Promise<string>;
};

const unavailable = async () => { throw new Error('Privy wallet setup is not configured for this build.'); };
const Context = createContext<WalletValue>({ configured: false, ready: true, privyUserId: null, ownerAddress: null, ensureOwnerWallet: unavailable, signMessage: unavailable, signTypedData: unavailable });

function WalletBridge({ children }: { children: ReactNode }) {
  const { user, isReady } = usePrivy();
  const { getIdentityToken } = useIdentityToken();
  const embedded = useEmbeddedEthereumWallet();
  const wallet = embedded.wallets[0] ?? null;
  const ensureOwnerWallet = async () => {
    if (!user) throw new Error('Wallet identity is not ready. Please sign in again.');
    if (wallet) {
      const privyIdentityToken = await getIdentityToken();
      if (!privyIdentityToken) throw new Error('Privy did not return a verifiable wallet identity token. Please sign in again.');
      return { privyUserId: user.id, ownerAddress: wallet.address, privyIdentityToken };
    }
    const created = await embedded.create();
    const account = (created.user as unknown as { linked_accounts?: { type?: string; chain_type?: string; address?: string }[] }).linked_accounts
      ?.find((candidate) => candidate.type === 'wallet' && candidate.chain_type === 'ethereum' && candidate.address);
    if (!account?.address) throw new Error('Privy created the owner wallet but did not return its address. Refresh wallet setup before continuing.');
    const privyIdentityToken = await getIdentityToken();
    if (!privyIdentityToken) throw new Error('Privy created the owner wallet but did not return a verifiable identity token. Please retry wallet setup.');
    return { privyUserId: created.user.id, ownerAddress: account.address, privyIdentityToken };
  };
  const signMessage = async (message: string) => {
    const current = embedded.wallets[0];
    if (!current) throw new Error('Create the embedded owner wallet first.');
    const provider = await current.getProvider();
    const result = await provider.request({ method: 'personal_sign', params: [stringToHex(message), current.address] });
    if (typeof result !== 'string') throw new Error('The owner wallet did not return a signature.');
    return result;
  };
  const signTypedData = async (typedData: Record<string, unknown>) => {
    const current = embedded.wallets[0];
    if (!current) throw new Error('Create the embedded owner wallet first.');
    const provider = await current.getProvider();
    const result = await provider.request({ method: 'eth_signTypedData_v4', params: [current.address, JSON.stringify(typedData)] });
    if (typeof result !== 'string') throw new Error('The owner wallet did not return a typed-data signature.');
    return result;
  };
  const value: WalletValue = { configured: true, ready: isReady, privyUserId: user?.id ?? null, ownerAddress: wallet?.address ?? null, ensureOwnerWallet, signMessage, signTypedData };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function PolyClawWalletProvider({ children }: { children: ReactNode }) {
  const { state, consumer } = useAuth();
  const appId = process.env.EXPO_PUBLIC_PRIVY_APP_ID?.trim();
  const clientId = process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID?.trim();
  if (!appId || !clientId) return <Context.Provider value={{ configured: false, ready: true, privyUserId: null, ownerAddress: null, ensureOwnerWallet: unavailable, signMessage: unavailable, signTypedData: unavailable }}>{children}</Context.Provider>;
  return (
    <PrivyProvider
      appId={appId}
      clientId={clientId}
      supportedChains={[polygon]}
      config={{
        customAuth: {
          isLoading: state === 'hydrating',
          getCustomAccessToken: async () => state === 'authenticated' ? (await consumer<{ token: string }>('walletIdentityToken')).token : undefined,
        },
        embedded: { ethereum: { createOnLogin: 'users-without-wallets' } },
      }}
    >
      <WalletBridge>{children}</WalletBridge>
    </PrivyProvider>
  );
}

export function usePolyClawWallet() {
  return useContext(Context);
}
