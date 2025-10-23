import React, { useMemo } from "react";
import type { GestureResponderEvent } from "react-native";
import {
  Modal as RNModal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";

import { spacing, typography, shadows, useAppTheme } from "@shared/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  hideHeader?: boolean;
  maxWidth?: number;
  animationType?: "none" | "slide" | "fade";
  presentationStyle?:
    | "fullScreen"
    | "pageSheet"
    | "formSheet"
    | "overFullScreen";
  // When true (default), wraps content in a ScrollView. Set false when children include
  // VirtualizedList (FlatList/SectionList) to avoid nesting warning.
  scrollable?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
  hideHeader = false,
  maxWidth,
  animationType = "slide",
  presentationStyle = "overFullScreen",
  scrollable = true,
}) => {
  const { mode } = useAppTheme();
  const styles = useMemo(() => createStyles(mode), [mode]);
  const insets = useSafeAreaInsets();
  const contentBottomPad = spacing["2xl"] + Math.max(insets.bottom, 12);

  const handleBackdropPress = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <RNModal
      visible={visible}
      animationType={animationType}
      transparent
      onRequestClose={onClose}
      presentationStyle={presentationStyle as any}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Backdrop press area behind the content */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleBackdropPress}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
        >
          <View style={[styles.modalContainer, maxWidth ? { maxWidth } : null]}>
            {!hideHeader && (
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
            )}
            <View style={styles.contentWrap}>
              {scrollable ? (
                <ScrollView
                  style={styles.content}
                  contentContainerStyle={[
                    styles.contentInner,
                    { paddingBottom: contentBottomPad },
                  ]}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={true}
                  persistentScrollbar={true}
                >
                  {children}
                </ScrollView>
              ) : (
                <View
                  style={[
                    styles.content,
                    styles.contentInner,
                    { paddingBottom: contentBottomPad },
                  ]}
                >
                  {children}
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </RNModal>
  );
};

const createStyles = (mode: "light" | "dark") => {
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = colorSchemes[mode];

  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor:
        mode === "dark" ? "rgba(0, 0, 0, 0.7)" : "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing["4xl"],
      position: "relative",
    },
    keyboardAvoidingView: {
      width: "100%",
      maxHeight: "90%",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContainer: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 16,
      width: "100%",
      maxWidth: 400,
      maxHeight: "90%",
      overflow: "hidden",
      shadowColor: shadows.xl.shadowColor,
      shadowOffset: shadows.xl.shadowOffset,
      shadowOpacity: shadows.xl.shadowOpacity,
      shadowRadius: shadows.xl.shadowRadius,
      elevation: shadows.xl.elevation,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: spacing["2xl"],
      paddingVertical: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderPrimary,
    },
    title: {
      fontSize: typography.fontSize.xl,
      fontWeight: "bold",
      color: colors.textPrimary,
      flex: 1,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.gray100,
      justifyContent: "center",
      alignItems: "center",
    },
    closeButtonText: {
      fontSize: typography.fontSize.lg,
      color: colors.textSecondary,
      fontWeight: "bold",
    },
    content: {
      padding: spacing["2xl"],
    },
    contentWrap: {
      position: "relative",
      width: "100%",
      flexGrow: 1,
      flexShrink: 1,
      minHeight: 0,
      maxHeight: "100%",
    },
    contentInner: {
      paddingBottom: spacing["2xl"],
    },
  });
};

export default Modal;
