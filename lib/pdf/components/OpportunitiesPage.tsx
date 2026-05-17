import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { Audit } from '@/lib/llm/audit-schema';
import type { Theme } from '../theme';
import { PageHeader } from './SummaryPage';

interface Props { audit: Audit; theme: Theme; }

export function OpportunitiesPage({ audit, theme }: Props) {
  const styles = StyleSheet.create({
    page: { backgroundColor: theme.colors.paper, paddingHorizontal: theme.spacing.pagePadX, paddingVertical: theme.spacing.pagePadY, fontFamily: 'Helvetica' },
    eyebrow: { fontSize: theme.type.micro, letterSpacing: 2, textTransform: 'uppercase', color: theme.colors.accent, fontFamily: 'Helvetica-Bold', marginBottom: 8 },
    h1: { fontSize: theme.type.h1, fontFamily: 'Helvetica-Bold', color: theme.colors.ink, marginBottom: 18 },
    oppBlock: { marginBottom: 18, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: theme.colors.rule },
    oppHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
    oppNumber: { width: 26, fontSize: theme.type.h2, fontFamily: 'Helvetica-Bold', color: theme.colors.accent, lineHeight: 1 },
    oppTitle: { flex: 1, fontSize: theme.type.h2, fontFamily: 'Helvetica-Bold', color: theme.colors.ink, lineHeight: 1.2 },
    oppFieldLabel: { fontSize: theme.type.micro, letterSpacing: 1, textTransform: 'uppercase', color: theme.colors.muted, marginTop: 6, marginBottom: 2, fontFamily: 'Helvetica-Bold' },
    oppFieldText: { fontSize: theme.type.body, color: theme.colors.body, lineHeight: theme.type.lineHeight, paddingLeft: 26 },
  });

  return (
    <Page size="A4" style={styles.page}>
      <PageHeader pageNumber={4} theme={theme} />

      <Text style={styles.eyebrow}>Opportunity Areas</Text>
      <Text style={styles.h1}>Where we see room to move</Text>

      {audit.opportunityAreas.map((opp, i) => (
        <View key={i} style={styles.oppBlock} wrap={false}>
          <View style={styles.oppHeader}>
            <Text style={styles.oppNumber}>{String(i + 1).padStart(2, '0')}</Text>
            <Text style={styles.oppTitle}>{opp.title}</Text>
          </View>

          <Text style={styles.oppFieldLabel}>Finding</Text>
          <Text style={styles.oppFieldText}>{opp.finding}</Text>

          <Text style={styles.oppFieldLabel}>Recommendation</Text>
          <Text style={styles.oppFieldText}>{opp.recommendation}</Text>

          <Text style={styles.oppFieldLabel}>Impact</Text>
          <Text style={styles.oppFieldText}>{opp.impact}</Text>
        </View>
      ))}
    </Page>
  );
}
