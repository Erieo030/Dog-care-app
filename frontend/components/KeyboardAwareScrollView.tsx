import React from 'react';
import { Platform } from 'react-native';
import {
  KeyboardAwareScrollView as ControllerAwareScrollView,
  type KeyboardAwareScrollViewProps,
} from 'react-native-keyboard-controller';

/** Shared keyboard-aware container for long forms and screens with text inputs. */
export default function KeyboardAwareScrollView({
  children,
  keyboardShouldPersistTaps = 'handled',
  keyboardDismissMode = Platform.OS === 'ios' ? 'interactive' : 'on-drag',
  ...scrollViewProps
}: KeyboardAwareScrollViewProps) {
  return (
    <ControllerAwareScrollView
      {...scrollViewProps}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      keyboardDismissMode={keyboardDismissMode}
    >
      {children}
    </ControllerAwareScrollView>
  );
}
