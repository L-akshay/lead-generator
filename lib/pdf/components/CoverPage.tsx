import { Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import type { Audit } from '@/lib/llm/audit-schema';
import type { Theme } from '../theme';

interface Props {
  audit: Audit;
  logoUrl: string | null;
  theme: Theme;
}

export function CoverPage({ audit, logoUrl, theme }: Props) {
  const styles = StyleSheet.create({
    page: {
      backgroundColor: theme.colors.paper,
      paddingHorizontal: theme.spacing.pagePadX,
      paddingVertical: theme.spacing.pagePadY,
      fontFamily: 'Helvetica',
    },
    eyebrow: {
      fontSize: theme.type.micro,
      letterSpacing: 2,
      color: theme.colors.muted,
      textTransform: 'uppercase',
      fontFamily: 'Helvetica-Bold',
    },
    accentBar: {
      width: 64,
      height: 3,
      backgroundColor: theme.colors.accent,
      marginTop: 24,
      marginBottom: 32,
    },
    company: {
      fontSize: theme.type.cover,
      fontFamily: 'Helvetica-Bold',
      color: theme.colors.ink,
      letterSpacing: -0.5,
      lineHeight: 1.1,
    },
    tagline: {
      fontSize: theme.type.h2,
      color: theme.colors.body,
      marginTop: 16,
      lineHeight: 1.4,
      maxWidth: 380,
    },
    logoBox: {
      position: 'absolute',
      top: theme.spacing.pagePadY,
      right: theme.spacing.pagePadX,
      width: 80,
      height: 80,
      objectFit: 'contain',
    },
    footer: {
      position: 'absolute',
      bottom: theme.spacing.pagePadY,
      left: theme.spacing.pagePadX,
      right: theme.spacing.pagePadX,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    footerCol: {
      flexDirection: 'column',
    },
    footerLabel: {
      fontSize: theme.type.micro,
      color: theme.colors.muted,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    footerValue: {
      fontSize: theme.type.body,
      color: theme.colors.ink,
      fontFamily: 'Helvetica-Bold',
    },
  });

  return (
    <Page size="A4" style={styles.page}>
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      {logoUrl && <Image src={logoUrl} style={styles.logoBox} />}

      <Text style={styles.eyebrow}>SimplifIQ · Strategic Audit</Text>
      <View style={styles.accentBar} />

      <Text style={styles.company}>{audit.cover.companyName}</Text>
      <Text style={styles.tagline}>{audit.cover.tagline}</Text>

      <View style={styles.footer}>
        <View style={styles.footerCol}>
          <Text style={styles.footerLabel}>Industry</Text>
          <Text style={styles.footerValue}>{audit.cover.industry}</Text>
        </View>
        <View style={styles.footerCol}>
          <Text style={styles.footerLabel}>Prepared</Text>
          <Text style={styles.footerValue}>{audit.cover.preparedDate}</Text>
        </View>
      </View>
    </Page>
  );
}
