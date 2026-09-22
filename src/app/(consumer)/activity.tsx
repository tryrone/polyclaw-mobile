import { Redirect } from 'expo-router';

/** The decision ledger folded into the Trades tab; this route only keeps old links working. */
export default function LegacyActivityRedirect() {
  return <Redirect href="/(consumer)/trades" />;
}
