import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal as RNModal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  GestureResponderEvent,
} from 'react-native';

import { useModerationGuard } from '../hooks/useModerationGuard';
import { colors, spacing, typography } from '../theme';
import uiStyles from '../ui/styles';
import { getBlockLeftMargin } from '../utils/nameUtils';

interface ReplyModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (replyData: { content: string }) => void;
  postAuthorName: string;
}

const ReplyModal: React.FC<ReplyModalProps> = ({ visible, onClose, onSubmit, postAuthorName }) => {
  const [content, setContent] = useState('');
  const guard = useModerationGuard(content);

  const handleSubmit = () => {
    if (!content.trim() || !guard.canSend) return;
    onSubmit({ content: content.trim() });
    setContent('');
    onClose();
  };

  const handleClose = () => {
    setContent('');
    onClose();
  };

  const handleBackdropPress = () => {
    handleClose();
  };

  const handleContentPress = (e: GestureResponderEvent) => {
    e.stopPropagation();
  };

  return (
    <RNModal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
          >
            <TouchableWithoutFeedback onPress={handleContentPress}>
              <View style={styles.modalContainer}>
                {/* 繝倥ャ繝繝ｼ */}
                <View style={[uiStyles.rowBetween, styles.header]}>
                  <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.headerTitle}>{postAuthorName}縺ｫ霑比ｿ｡</Text>
                  <TouchableOpacity
                    onPress={handleSubmit}
                    style={[
                      styles.replyButton,
                      (!content.trim() || !guard.canSend) && styles.replyButtonDisabled,
                    ]}
                    disabled={!content.trim() || !guard.canSend}
                  >
                    <Text
                      style={[
                        styles.replyButtonText,
                        !content.trim() && styles.replyButtonTextDisabled,
                      ]}
                    >
                      霑比ｿ｡
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 繝｡繧､繝ｳ繧ｳ繝ｳ繝・Φ繝・*/}
                <View style={styles.content}>
                  <TextInput
                    style={styles.textInput}
                    placeholder={`${postAuthorName}縺ｫ霑比ｿ｡...`}
                    placeholderTextColor={colors.textSecondary}
                    value={content}
                    onChangeText={setContent}
                    multiline
                    maxLength={280}
                    autoFocus
                  />

                  {/* 譁・ｭ玲焚繧ｫ繧ｦ繝ｳ繧ｿ繝ｼ */}
                  <View style={styles.counterContainer}>
                    <Text style={[styles.counter, content.length > 260 && styles.counterWarning]}>
                      {content.length}/280
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
  },
  closeButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.md,
  },
  replyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  replyButtonDisabled: {
    backgroundColor: colors.gray300,
  },
  replyButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  replyButtonTextDisabled: {
    color: colors.gray500,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  textInput: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    minHeight: 120,
    textAlignVertical: 'top',
    padding: 0,
    paddingLeft: getBlockLeftMargin('small'),
  },
  counterContainer: {
    alignItems: 'flex-end',
    marginTop: spacing.md,
  },
  counter: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  counterWarning: {
    color: colors.warning,
  },
});

export default ReplyModal;

