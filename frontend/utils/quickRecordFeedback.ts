import { Alert } from 'react-native';

export function showQuickRecordFeedback({
  message,
  onDone,
  onAddAnother,
}: {
  message: string;
  onDone: () => void;
  onAddAnother: () => void;
}) {
  Alert.alert('已記錄', message, [
    { text: '完成', onPress: onDone },
    { text: '再記一筆', onPress: onAddAnother },
  ]);
}
