import React from 'react';
import { KeyboardAvoidingView, Platform, ViewStyle } from 'react-native';

interface KeyboardAwareScrollViewProps {
    children: React.ReactNode;
    style?: ViewStyle;
    keyboardVerticalOffset?: number;
}

const KeyboardAwareScrollView: React.FC<KeyboardAwareScrollViewProps> = ({
    children,
    style,
    keyboardVerticalOffset = Platform.OS === 'ios' ? 0 : 20,
}) => {
    return (
        <KeyboardAvoidingView
            style={[{ flex: 1 }, style]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={keyboardVerticalOffset}
        >
            {children}
        </KeyboardAvoidingView>
    );
};

export default KeyboardAwareScrollView;

