/** 用途：建立不含帳號與健康資料的問題回報環境資訊。 */
import Constants from 'expo-constants';
import {File,Paths} from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {Platform} from 'react-native';
export async function shareFeedbackInfo(){const version=Constants.expoConfig?.version||'尚未確認';const build=Constants.expoConfig?.android?.versionCode||Constants.expoConfig?.ios?.buildNumber||'開發版本';const text=`PawLog 問題回報\n\n請描述遇到的問題：\n\nApp Version: ${version}\nBuild: ${build}\nPlatform: ${Platform.OS}\nOS Version: ${Platform.Version}\n`;const file=new File(Paths.cache,'pawlog-feedback.txt');file.write(text);if(!await Sharing.isAvailableAsync())throw new Error('此裝置不支援系統分享');await Sharing.shareAsync(file.uri,{mimeType:'text/plain',dialogTitle:'分享問題資訊'});}
