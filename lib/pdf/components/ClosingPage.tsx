import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { Audit } from '@/lib/llm/audit-schema';
import type { Theme } from '../theme';
import { PageHeader } from './SummaryPage';

interface Props { audit: Audit; theme: Theme; }

export function ClosingPage({ audit, theme }: Props) {
  const styles = StyleSheet.create({
    page: { backgroundColor: theme.colors.paper, paddingHorizontal: theme.spacing.pagePadX, paddingVertical: theme.spacing.pagePadY, fontFamily: 'Helvetica' },
    eyebrow: { fontSize: theme.type.micro, letterSpacing: 2, textTransform: 'uppercase', color: theme.colors.accent, fontFamily: 'Helvetica-Bold', marginBottom: 8 },
    h1: { fontSize: theme.type.h1, fontFamily: 'Helvetica-Bold', color: theme.colors.ink, marginBottom: 18 },
    stepBlock: { flexDirection: 'row', marginBottom: 14, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: theme.colors.rule },
    stepNumber: { width: 26, fontSize: theme.type.h2, fontFamily: 'Helvetica-Bold', color: theme.colors.accent },
    stepBody: { flex: 1 },
    stepAction: { fontSize: theme.type.body, fontFamily: 'Helvetica-Bold', color: theme.colors.ink, marginBottom: 4 },
    stepRationale: { fontSize: theme.type.small, color: theme.colors.muted, lineHeight: theme.type.lineHeight },
    closingBox: { backgroundColor: theme.colors.panel, padding: 20, marginTop: theme.spacing.sectionGap },
    closingLabel: { fontSize: theme.type.micro, letterSpacing: 1, textTransform: 'uppercase', color: theme.colors.muted, marginBottom: 8 },
    closingText: { fontSize: theme.type.h3, color: theme.colors.ink, lineHeight: 1.55, fontStyle: 'italic' },
    footer: { position: 'absolute', bottom: theme.spacing.pagePadY, left: theme.spacing.pagePadX, right: theme.spacing.pagePadX, alignItems: 'center' },
    footerText: { fontSize: theme.type.micro, color: theme.colors.muted, letterSpacing: 1 },
  });

  return (
    <Page size="A4" style={styles.page}>
      <PageHeader pageNumber={5} theme={theme} />

      <Text style={styles.eyebrow}>Suggested Next Steps</Text>
      <Text style={styles.h1}>Where we&apos;d start</Text>

      {audit.nextSteps.map((step, i) => (
        <View key={i} style={styles.stepBlock} wrap={false}>
          <Text style={styles.stepNumber}>{String(i + 1).padStart(2, '0')}</Text>
          <View style={styles.stepBody}>
            <Text style={styles.stepAction}>{step.action}</Text>
            <Text style={styles.stepRationale}>{step.rationale}</Text>
          </View>
        </View>
      ))}

      <View style={styles.closingBox}>
        <Text style={styles.closingLabel}>A note from SimplifIQ</Text>
        <Text style={styles.closingText}>{audit.closingNote}</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>simplifiq · prepared with care</Text>
      </View>
    </Page>
  );
}
