import { useRouter } from 'expo-router';
import { BookOpen, ArrowRight } from 'phosphor-react-native';
import { Text } from 'react-native';
import { ActionButton } from '@/components/ui-kit';
import { usePolyClawTheme } from '@/theme';
import { AccountItem } from './primitives';
import { accountStyles as styles } from './styles';
import type { AccountController } from './use-account-controller';

export function EducationItem({ controller }: { controller: AccountController }) {
  const { theme } = usePolyClawTheme();
  const router = useRouter();
  const expanded = controller.ui.expanded === 'guide';
  return <AccountItem
    Icon={BookOpen}
    title="How PolyClaw works"
    detail="Your paper-to-live walkthrough"
    status="Setup guide"
    expanded={expanded}
    onPress={() => controller.ui.toggleSection('guide')}
  >
    <Text style={[styles.body, { color: theme.textMuted }]}>See your exact next step, learn which wallet does what, and understand how paper qualification becomes controlled real-money Polymarket trading.</Text>
    <ActionButton label="Open setup guide" icon={ArrowRight as never} variant="secondary" onPress={() => router.push('/getting-started')} />
  </AccountItem>;
}
