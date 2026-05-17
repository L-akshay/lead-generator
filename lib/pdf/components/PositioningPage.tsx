import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { Audit } from '@/lib/llm/audit-schema';
import type { Theme } from '../theme';
import { PageHeader } from './SummaryPage';

interface Props { audit: Audit; theme: Theme; }

export function PositioningPage({ audit, theme }: Props) {
  const styles = StyleSheet.create({
    page: { backgroundColor: theme.colors.paper, paddingHorizontal: theme.spacing.pagePadX, paddingVertical: theme.spacing.pagePadY, fontFamily: 'Helvetica' },
    eyebrow: { fontSize: theme.type.micro, letterSpacing: 2, textTransform: 'uppercase', color: theme.colors.accent, fontFamily: 'Helvetica-Bold', marginBottom: 8 },
    h1: { fontSize: theme.type.h1, fontFamily: 'Helvetica-Bold', color: theme.colors.ink, marginBottom: 14 },
    body: { fontSize: theme.type.body, color: theme.colors.body, lineHeight: theme.type.lineHeight, marginBottom: theme.spacing.sectionGap },
    subLabel: { fontSize: theme.type.h3, fontFamily: 'Helvetica-Bold', color: theme.colors.ink, marginBottom: 10 },
    competitorRow: { flexDirection: 'row', marginBottom: 10, paddingBottom: 10, borderBottomWidth: 0.5, borderBottomColor: theme.colors.rule },
    competitorName: { width: 120, fontSize: theme.type.body, fontFamily: 'Helvetica-Bold', color: theme.colors.ink },
    competitorAngle: { flex: 1, fontSize: theme.type.body, color: theme.colors.body, lineHeight: theme.type.lineHeight },
    differentiatorBox: { backgroundColor: theme.colors.accentSoft, padding: 14, marginTop: theme.spacing.blockGap, borderRadius: 4 },
    differentiatorLabel: { fontSize: theme.type.micro, letterSpacing: 1, textTransform: 'uppercase', color: theme.colors.accent, marginBottom: 4, fontFamily: 'Helvetica-Bold' },
    differentiatorText: { fontSize: theme.type.body, color: theme.colors.ink, lineHeight: theme.type.lineHeight },
    strengthBlock: { marginBottom: 14 },
    strengthTitle: { fontSize: theme.type.h3, fontFamily: 'Helvetica-Bold', color: theme.colors.ink, marginBottom: 3 },
    strengthEvidence: { fontSize: theme.type.small, color: theme.colors.muted, marginBottom: 4, fontStyle: 'italic' },
    strengthDetail: { fontSize: theme.type.body, color: theme.colors.body, lineHeight: theme.type.lineHeight },
  });

  return (
    <Page size="A4" style={styles.page}>
      <PageHeader pageNumber={3} theme={theme} />

      <Text style={styles.eyebrow}>Industry & Positioning</Text>
      <Text style={styles.body}>{audit.industryPositioning.marketContext}</Text>

      <Text style={styles.subLabel}>Competitive landscape</Text>
      <View>
        {audit.industryPositioning.competitors.map((c, i) => (
          <View key={i} style={styles.competitorRow}>
            <Text style={styles.competitorName}>{c.name}</Text>
            <Text style={styles.competitorAngle}>{c.angle}</Text>
          </View>
        ))}
      </View>

      <View style={styles.differentiatorBox}>
        <Text style={styles.differentiatorLabel}>What sets them apart</Text>
        <Text style={styles.differentiatorText}>{audit.industryPositioning.differentiator}</Text>
      </View>

      <View style={{ height: theme.spacing.sectionGap }} />

      <Text style={styles.eyebrow}>Observed Strengths</Text>
      <View>
        {audit.observedStrengths.map((s, i) => (
          <View key={i} style={styles.strengthBlock} wrap={false}>
            <Text style={styles.strengthTitle}>{s.title}</Text>
            <Text style={styles.strengthEvidence}>{s.evidence}</Text>
            <Text style={styles.strengthDetail}>{s.detail}</Text>
          </View>
        ))}
      </View>
    </Page>
  );
}
