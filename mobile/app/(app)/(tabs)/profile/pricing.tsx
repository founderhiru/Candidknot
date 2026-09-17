import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ErrorText } from "@/components/ErrorText";
import { RequireAuthScreen } from "@/components/RequireAuthScreen";
import { Screen } from "@/components/Screen";
import { Skeleton } from "@/components/Skeleton";
import { checkEntitlement, purchaseEntitlement } from "@/lib/entitlement-api";
import { CONNECTION_MESSAGING_SERVICE } from "@/lib/entitlement-contracts";
import { colors, radius, spacing, typography } from "@/theme/tokens";

/**
 * The same real Connection Service entitlement this app already gates
 * matched-conversation messaging with (see the paywall in
 * matches/[conversationId]/conversation.tsx) — surfaced here as a
 * standalone, proactively discoverable screen, since previously the
 * ONLY way to ever see pricing info was to complete a match and send 3
 * messages first. This is not a second/parallel purchase system: it
 * calls the exact same checkEntitlement/purchaseEntitlement wrappers
 * with no conversation scope (an account-wide check/intent), so it
 * reuses 100% of the existing, already-tested entitlement API.
 *
 * Purchasing always returns "not configured yet" today (no payment
 * provider is wired up — see src/lib/payments/provider.ts on the
 * backend) — this screen shows that plainly, the same as the
 * in-conversation paywall does, and never fakes a successful purchase.
 */
function PricingContent() {
  const [active, setActive] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseUnavailable, setPurchaseUnavailable] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const result = await checkEntitlement(CONNECTION_MESSAGING_SERVICE);
      setActive(result.active);
    } catch {
      setLoadError(
        "Couldn't check your Connection Service status. Check your connection.",
      );
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handlePurchase() {
    setPurchaseUnavailable(false);
    setPurchasing(true);
    try {
      await purchaseEntitlement(CONNECTION_MESSAGING_SERVICE);
      await load();
    } catch {
      setPurchaseUnavailable(true);
    } finally {
      setPurchasing(false);
    }
  }

  if (loadError) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ErrorText>{loadError}</ErrorText>
          <View style={styles.retryButton}>
            <Button label="Retry" onPress={load} variant="secondary" />
          </View>
        </View>
      </Screen>
    );
  }

  if (active === null) {
    return (
      <Screen>
        <View style={styles.skeletonWrap}>
          <Skeleton height={22} width="60%" />
          <Skeleton height={90} style={styles.gapTop} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={[typography.title, styles.heading]}>Connection Service</Text>
      <Text style={[typography.bodyMuted, styles.intro]}>
        Browsing, creating your profile, and expressing interest are always
        free. A match starts with a few free messages so you can get to know
        each other — Connection Service keeps the conversation going after that.
      </Text>

      <Card style={styles.statusCard}>
        {active ? (
          <>
            <Text style={styles.statusTitle}>
              ✓ Connection Service is active
            </Text>
            <Text style={typography.bodyMuted}>
              You can keep messaging your matches without limit.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.statusTitle}>Not active</Text>
            <Text style={typography.bodyMuted}>
              You're on the free plan — every new match still gets a few free
              messages to start with.
            </Text>
          </>
        )}
      </Card>

      {!active && (
        <View style={styles.purchaseWrap}>
          <Button
            label="Get Connection Service"
            onPress={handlePurchase}
            loading={purchasing}
            disabled={purchasing}
          />
          {purchaseUnavailable ? (
            <Text style={[typography.caption, styles.unavailable]}>
              Connection Service isn't available to purchase yet — check back
              soon.
            </Text>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

export default function PricingScreen() {
  return (
    <RequireAuthScreen>
      <PricingContent />
    </RequireAuthScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  retryButton: { marginTop: spacing.md },
  skeletonWrap: { paddingTop: spacing.lg },
  gapTop: { marginTop: spacing.lg },
  heading: { marginTop: spacing.lg },
  intro: { marginTop: spacing.sm },
  statusCard: { marginTop: spacing.xl, borderRadius: radius.lg },
  statusTitle: { ...typography.sectionTitle, marginBottom: spacing.xs },
  purchaseWrap: { marginTop: spacing.xl, alignItems: "flex-start" },
  unavailable: { marginTop: spacing.sm, color: colors.textMuted },
});
