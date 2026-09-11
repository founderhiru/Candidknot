import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "@/components/Button";
import { ErrorText } from "@/components/ErrorText";
import { RequireAuthScreen } from "@/components/RequireAuthScreen";
import { Screen } from "@/components/Screen";
import { Skeleton } from "@/components/Skeleton";
import { ApiError } from "@/lib/api-client";
import { getConversation, sendMessage } from "@/lib/conversation-api";
import type {
  ConversationDetail,
  MessageItem,
} from "@/lib/conversation-contracts";
import { MESSAGE_MAX_LENGTH } from "@/lib/conversation-contracts";
import { checkEntitlement, purchaseEntitlement } from "@/lib/entitlement-api";
import { CONNECTION_MESSAGING_SERVICE } from "@/lib/entitlement-contracts";
import { colors, radius, spacing, typography } from "@/theme/tokens";

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function MessageBubble({ message }: { message: MessageItem }) {
  return (
    <View
      style={[
        styles.bubbleRow,
        message.isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs,
      ]}
    >
      <View
        style={[
          styles.bubble,
          message.isMine ? styles.bubbleMine : styles.bubbleTheirs,
        ]}
      >
        <Text
          style={
            message.isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs
          }
        >
          {message.body}
        </Text>
      </View>
      <Text style={[typography.caption, styles.timestamp]}>
        {formatTime(message.createdAt)}
      </Text>
    </View>
  );
}

/**
 * "You're matched — messaging needs a Connection service" state, shown
 * in place of the composer once the free intro messages run out. Purchase
 * always fails today (no payment provider configured, see
 * src/lib/payments/provider.ts) — this never claims success, only that
 * it isn't available yet.
 */
function ConnectionServicePaywall() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const [purchasing, setPurchasing] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  async function handlePurchase() {
    setPurchasing(true);
    try {
      await purchaseEntitlement(CONNECTION_MESSAGING_SERVICE, conversationId);
    } catch {
      setUnavailable(true);
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <View style={styles.paywall}>
      <Text style={typography.sectionTitle}>You're matched!</Text>
      <Text style={[typography.bodyMuted, styles.paywallBody]}>
        Messaging is available with a Connection service.
      </Text>
      {unavailable ? (
        <Text style={[typography.caption, styles.paywallUnavailable]}>
          Connection service isn't available to purchase yet — check back soon.
        </Text>
      ) : (
        <View style={styles.paywallButton}>
          <Button
            label="Get Connection Service"
            onPress={handlePurchase}
            loading={purchasing}
            disabled={purchasing}
          />
        </View>
      )}
    </View>
  );
}

function ConversationContent() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const [conversation, setConversation] = useState<ConversationDetail | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [freeMessagesRemaining, setFreeMessagesRemaining] = useState<
    number | null
  >(null);
  const [paywalled, setPaywalled] = useState(false);
  const listRef = useRef<FlatList<MessageItem>>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const result = await getConversation(conversationId);
      setConversation(result);
      // Best-effort — a failed entitlement check shouldn't block viewing
      // the conversation; a real send attempt will still enforce it.
      try {
        const entitlement = await checkEntitlement(
          CONNECTION_MESSAGING_SERVICE,
          conversationId,
        );
        setFreeMessagesRemaining(entitlement.freeMessagesRemaining);
        setPaywalled(
          !entitlement.active && entitlement.freeMessagesRemaining === 0,
        );
      } catch {
        // Ignore — see comment above.
      }
    } catch {
      setLoadError("Couldn't load this conversation. Check your connection.");
    }
  }, [conversationId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleSend() {
    const body = draft.trim();
    if (!body || sending) return;

    setSendError(null);
    setSending(true);
    try {
      const message = await sendMessage(conversationId, body);
      setConversation((prev) =>
        prev ? { ...prev, messages: [...prev.messages, message] } : prev,
      );
      setDraft("");
      setFreeMessagesRemaining((prev) =>
        prev !== null ? Math.max(0, prev - 1) : prev,
      );
      requestAnimationFrame(() =>
        listRef.current?.scrollToEnd({ animated: true }),
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setPaywalled(true);
      } else {
        setSendError("Couldn't send. Check your connection and try again.");
      }
    } finally {
      setSending(false);
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

  if (!conversation) {
    return (
      <Screen>
        <View style={styles.header}>
          <Skeleton height={20} width="40%" />
        </View>
        <View style={styles.skeletonWrap}>
          <Skeleton height={44} width="60%" style={styles.gapBottom} />
          <Skeleton
            height={44}
            width="50%"
            style={[styles.gapBottom, styles.alignEnd]}
          />
          <Skeleton height={44} width="55%" style={styles.gapBottom} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen noPadding edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={typography.sectionTitle} numberOfLines={1}>
            {conversation.otherUserName ?? "Owner"}
          </Text>
          <Text
            style={[typography.caption, styles.headerSubtitle]}
            numberOfLines={1}
          >
            About {conversation.targetDogName}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {conversation.messages.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[typography.bodyMuted, styles.emptyText]}>
              You're matched! Say hello to get the conversation started.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={conversation.messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => <MessageBubble message={item} />}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: false })
            }
          />
        )}

        {sendError ? (
          <View style={styles.sendErrorWrap}>
            <ErrorText>{sendError}</ErrorText>
          </View>
        ) : null}

        {paywalled ? (
          <ConnectionServicePaywall />
        ) : (
          <>
            {freeMessagesRemaining !== null && freeMessagesRemaining > 0 ? (
              <Text style={[typography.caption, styles.freeRemaining]}>
                {freeMessagesRemaining === 1
                  ? "1 free message left in this conversation"
                  : `${freeMessagesRemaining} free messages left in this conversation`}
              </Text>
            ) : null}
            <View style={styles.composer}>
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                placeholder="Message"
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={MESSAGE_MAX_LENGTH}
                editable={!sending}
              />
              <Button
                label="Send"
                onPress={handleSend}
                loading={sending}
                disabled={sending || draft.trim().length === 0}
              />
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

export default function ConversationScreen() {
  return (
    <RequireAuthScreen>
      <ConversationContent />
    </RequireAuthScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  retryButton: { marginTop: spacing.md },
  skeletonWrap: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
  },
  gapBottom: { marginBottom: spacing.md },
  alignEnd: { alignSelf: "flex-end" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  backArrow: { fontSize: 22, color: colors.text, paddingRight: spacing.xs },
  headerText: { flex: 1 },
  headerSubtitle: { marginTop: 2 },
  list: { padding: spacing.screenPadding, paddingBottom: spacing.lg },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  emptyText: { textAlign: "center" },
  bubbleRow: { marginBottom: spacing.md, maxWidth: "80%" },
  bubbleRowMine: { alignSelf: "flex-end", alignItems: "flex-end" },
  bubbleRowTheirs: { alignSelf: "flex-start", alignItems: "flex-start" },
  bubble: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleMine: { backgroundColor: colors.accent },
  bubbleTheirs: { backgroundColor: colors.surface },
  bubbleTextMine: { color: colors.accentText },
  bubbleTextTheirs: { color: colors.text },
  timestamp: { marginTop: spacing.xs },
  sendErrorWrap: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xs,
  },
  freeRemaining: {
    textAlign: "center",
    paddingBottom: spacing.xs,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
  },
  paywall: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: "center",
  },
  paywallBody: { textAlign: "center", marginTop: spacing.xs },
  paywallButton: { marginTop: spacing.md, minWidth: 220 },
  paywallUnavailable: { textAlign: "center", marginTop: spacing.md },
});
