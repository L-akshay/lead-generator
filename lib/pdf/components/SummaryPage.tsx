import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { Audit } from '@/lib/llm/audit-schema';
import type { Theme } from '../theme';

interface Props { audit: Audit; theme: Theme; }

export function SummaryPage({ audit, theme }: Props) {
  const styles = makeStyles(theme);

  return (
    <Page size="A4" style={styles.page}>
      <PageHeader pageNumber={2} theme={theme} />

      {/* Executive Summary */}
      <Text style={styles.sectionEyebrow}>Executive Summary</Text>
      <Text style={styles.headline}>{audit.executiveSummary.headline}</Text>
      <Text style={styles.body}>{audit.executiveSummary.text}</Text>

      <View style={{ height: theme.spacing.sectionGap }} />

      {/* Company Snapshot */}
      <Text style={styles.sectionEyebrow}>Company Snapshot</Text>
      <View style={styles.snapshotGrid}>
        <SnapshotItem label="What they do" value={audit.companySnapshot.whatTheyDo} theme={theme} />
        <SnapshotItem label="Target customer" value={audit.companySnapshot.targetCustomer} theme={theme} />
        <SnapshotItem label="Business model" value={audit.companySnapshot.businessModel} theme={theme} />
      </View>

      <View style={{ height: theme.spacing.blockGap }} />
      <Text style={styles.subLabel}>Scale signals</Text>
      <View>
        {audit.companySnapshot.scaleSignals.map((signal, i) => (
          <View key={i} style={styles.bulletRow}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>{signal}</Text>
          </View>
        ))}
      </View>
    </Page>
  );
}

function SnapshotItem({ label, value, theme }: { label: string; value: string; theme: Theme }) {
  const styles = StyleSheet.create({
    item: { marginBottom: 12 },
    label: { fontSize: theme.type.micro, letterSpacing: 1, textTransform: 'uppercase', color: theme.colors.muted, marginBottom: 4 },
    value: { fontSize: theme.type.body, color: theme.colors.body, lineHeight: theme.type.lineHeight },
  });
  return (
    <View style={styles.item}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function PageHeader({ pageNumber, theme }: { pageNumber: number; theme: Theme }) {
  const styles = StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderBottomColor: theme.colors.rule,
      borderBottomWidth: 0.5,
      paddingBottom: 8,
      marginBottom: theme.spacing.sectionGap,
    },
    label: { fontSize: theme.type.micro, color: theme.colors.muted, letterSpacing: 1, textTransform: 'uppercase' },
  });
  return (
    <View style={styles.header}>
      <Text style={styles.label}>SimplifIQ · Strategic Audit</Text>
      <Text style={styles.label}>{String(pageNumber).padStart(2, '0')}</Text>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    page: {
      backgroundColor: theme.colors.paper,
      paddingHorizontal: theme.spacing.pagePadX,
      paddingVertical: theme.spacing.pagePadY,
      fontFamily: 'Helvetica',
    },
    sectionEyebrow: {
      fontSize: theme.type.micro,
      letterSpacing: 2,
      textTransform: 'uppercase',
      color: theme.colors.accent,
      fontFamily: 'Helvetica-Bold',
      marginBottom: 8,
    },
    headline: {
      fontSize: theme.type.h1,
      fontFamily: 'Helvetica-Bold',
      color: theme.colors.ink,
      lineHeight: 1.25,
      marginBottom: 12,
    },
    body: {
      fontSize: theme.type.body,
      color: theme.colors.body,
      lineHeight: theme.type.lineHeight,
    },
    snapshotGrid: { marginTop: 4 },
    subLabel: {
      fontSize: theme.type.h3,
      fontFamily: 'Helvetica-Bold',
      color: theme.colors.ink,
      marginBottom: 6,
    },
    bulletRow: { flexDirection: 'row', marginBottom: 4 },
    bulletDot: { width: 10, fontSize: theme.type.body, color: theme.colors.accent },
    bulletText: { flex: 1, fontSize: theme.type.body, color: theme.colors.body, lineHeight: theme.type.lineHeight },
  });
}
