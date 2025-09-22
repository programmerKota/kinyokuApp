import React from 'react';
import type { GestureResponderEvent } from 'react-native';
import {
  Modal as RNModal,
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';

import { colors, spacing, typography, shadows } from '@shared/theme';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
}) => {
  const handleBackdropPress = () => {
    Keyboard.dismiss();
    onClose();
  };

  const handleContentPress = (event: GestureResponderEvent) => {
    // モーダル内部タップでキーボードを閉じる
    event.stopPropagation();
    Keyboard.dismiss();
  };

  return (
    <RNModal visible={visible} animationType='slide' transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
          >
            <TouchableWithoutFeedback onPress={handleContentPress}>
              <View style={styles.modalContainer}>
                <View style={styles.header}>
                  <Text style={styles.title}>{title}</Text>
                  {showCloseButton && (
                    <TouchableWithoutFeedback onPress={onClose}>
                      <View style={styles.closeButton}>
                        <Text style={styles.closeButtonText}>x</Text>
                      </View>
                    </TouchableWithoutFeedback>
                  )}
                </View>
                <ScrollView
                  style={styles.content}
                  keyboardShouldPersistTaps='handled'
                  showsVerticalScrollIndicator={false}
                >
                  {children}
                </ScrollView>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['4xl'],
  },
  keyboardAvoidingView: {
    width: '100%',
    maxHeight: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '100%',
    shadowColor: shadows.xl.shadowColor,
    shadowOffset: shadows.xl.shadowOffset,
    shadowOpacity: shadows.xl.shadowOpacity,
    shadowRadius: shadows.xl.shadowRadius,
    elevation: shadows.xl.elevation,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
    color: colors.gray800,
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: typography.fontSize.lg,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  content: {
    padding: spacing['2xl'],
  },
});

export default Modal;


