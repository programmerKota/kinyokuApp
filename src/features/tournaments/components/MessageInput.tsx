import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

import { useModerationGuard } from '@shared/hooks/useModerationGuard';
import { colors, spacing, typography } from '@shared/theme';

interface MessageInputProps {
  onSend: (text: string) => void;
  placeholder?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  placeholder = 'メッセージを入力...',
}) => {
  const [messageText, setMessageText] = useState('');
  const guard = useModerationGuard(messageText);

  const handleSend = () => {
    if (!messageText.trim() || !guard.canSend) return;
    onSend(messageText.trim());
    setMessageText('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder={placeholder}
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={500}
          placeholderTextColor={colors.textTertiary}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!messageText.trim() || !guard.canSend) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!messageText.trim() || !guard.canSend}
        >
          <Ionicons
            name="send"
            size={20}
            color={messageText.trim() && guard.canSend ? colors.white : colors.textTertiary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.borderPrimary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.lg,
    minHeight: 60,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginRight: spacing.md,
    maxHeight: 100,
    fontSize: typography.fontSize.base,
    backgroundColor: colors.backgroundSecondary,
  },
  sendButton: {
    backgroundColor: colors.info,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.info,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: colors.gray200,
    shadowOpacity: 0,
    elevation: 0,
  },
});

export default MessageInput;
