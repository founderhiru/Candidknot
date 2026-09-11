import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { ErrorText } from "@/components/ErrorText";
import { RequireAuthScreen } from "@/components/RequireAuthScreen";
import { Screen } from "@/components/Screen";
import { Skeleton } from "@/components/Skeleton";
import { listNotifications } from "@/lib/notification-api";
import type { NotificationEventItem } from "@/lib/notification-contracts";
import {
  colors,
  pressedOpacity,
  radius,
  spacing,
  typography,
} from "@/theme/tokens";

/** Where tapping a notification should take the user, or null if there's nowhere useful to go. */
function notificationDestination(item: NotificationEventItem): string | null {
  switch (item.type) {
    case "interest_received":
    case "interest_accepted":
    case "match_created":
      return "/(app)/(tabs)/matches";
    case "message_received": {
      const conversationId = item.payload.conversationId;
      return typeof conversationId === "string"
        ? `/(app)/(tabs)/matches/${conversationId}/conversation`
        : "/(app)/(tabs)/matches";
    }
    default:
      return null;
  }
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function NotificationRow({ item }: { item: NotificationEventItem }) {
  const destination = notificationDestination(item);

  return (
    <Pressable
      onPress={destination ? () => router.push(destination) : undefined}
      disabled={!destination}
      style={({ pressed }) => [
        styles.row,
        !item.read && styles.rowUnread,
        pressed && destination ? { opacity: pressedOpacity } : null,
      ]}
      accessibilityRole={destination ? "button" : undefined}
    >
      {!item.read ? (
        <View style={styles.unreadDot} />
      ) : (
        <View style={styles.unreadDotSpacer} />
      )}
      <View style={styles.rowText}>
        <Text style={typography.body}>{item.message}</Text>
        <Text style={[typography.caption, styles.rowWhen]}>
          {formatWhen(item.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
}

function NotificationsContent() {
  const [notifications, setNotifications] = useState<
    NotificationEventItem[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await listNotifications();
      setNotifications(result.items);
    } catch {
      setError("Couldn't load your notifications. Check your connection.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (notifications === null && !error) {
    return (
      <Screen>
        <View style={styles.skeletonWrap}>
          <Skeleton height={56} />
          <Skeleton height={56} style={styles.gap} />
          <Skeleton height={56} style={styles.gap} />
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ErrorText>{error}</ErrorText>
          <View style={styles.retryButton}>
            <Button label="Retry" onPress={load} variant="secondary" />
          </View>
        </View>
      </Screen>
    );
  }

  if (notifications && notifications.length === 0) {
    return (
      <Screen>
        <EmptyState
          emoji="🔔"
          title="No notifications yet"
          message="We'll let you know here when someone's interested, you match, or you get a message."
        />
      </Screen>
    );
  }

  return (
    <Screen noPadding>
      <FlatList
        data={notifications ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationRow item={item} />}
        contentContainerStyle={styles.list}
      />
    </Screen>
  );
}

export default function NotificationsScreen() {
  return (
    <RequireAuthScreen>
      <NotificationsContent />
    </RequireAuthScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  retryButton: { marginTop: spacing.md },
  skeletonWrap: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.screenPadding,
  },
  gap: { marginTop: spacing.md },
  list: { paddingBottom: spacing.xl },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  rowUnread: { backgroundColor: colors.backgroundAlt },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    marginTop: 6,
  },
  unreadDotSpacer: { width: 8, height: 8, marginTop: 6 },
  rowText: { flex: 1 },
  rowWhen: { marginTop: spacing.xs },
});
