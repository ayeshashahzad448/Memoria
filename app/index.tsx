import { Redirect } from 'expo-router';

import { useMemoria } from '@/lib/store';

/** Entry gate: route to auth, onboarding narrative, or the cosmos. */
export default function Index() {
  const isAuthed = useMemoria((s) => s.isAuthed);
  const hasOnboarded = useMemoria((s) => s.hasOnboarded);

  if (!isAuthed) return <Redirect href="/auth" />;
  if (!hasOnboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/cosmos" />;
}
