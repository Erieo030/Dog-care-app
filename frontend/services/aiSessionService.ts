import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIUsage } from './aiService';

const key = (userId: string, petId: string) => `mego:ai-session:${userId}:${petId}`;
const historyKey = (userId: string, petId: string) => `mego:ai-sessions:${userId}:${petId}`;
export type StoredMessage = { role: 'user' | 'assistant'; text: string };
export type AISession = { sessionId?: string; messages?: StoredMessage[]; usage?: AIUsage };

export async function loadAISession(userId: string, petId: string): Promise<AISession> {
  try { return JSON.parse((await AsyncStorage.getItem(key(userId, petId))) || '{}'); } catch { return {}; }
}
export async function saveAISession(userId: string, petId: string, value: AISession) {
  await AsyncStorage.setItem(key(userId, petId), JSON.stringify(value));
}

export type AISessionRecord = { id: string; title: string; messages: StoredMessage[]; createdAt: string; updatedAt: string };
export async function createNewAISession(userId: string, petId: string) {
  const current = await loadAISession(userId, petId);
  const history: AISessionRecord[] = JSON.parse((await AsyncStorage.getItem(historyKey(userId, petId))) || '[]');
  if (current.messages?.length) history.push({ id: `session-${Date.now()}`, title: current.messages.find((m) => m.role === 'user')?.text.slice(0, 24) || '未命名對話', messages: current.messages, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  const ordered = history.sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
  const overflow = ordered.length > 5 ? ordered[ordered.length - 1] : undefined;
  return { sessions: ordered.slice(0, 5), overflow };
}
export async function commitNewAISession(userId: string, petId: string, sessions: AISessionRecord[]) {
  await AsyncStorage.setItem(historyKey(userId, petId), JSON.stringify(sessions.slice(0, 5)));
  await saveAISession(userId, petId, { messages: [] });
}

export async function loadAISessions(userId: string, petId: string): Promise<AISessionRecord[]> {
  try { return JSON.parse((await AsyncStorage.getItem(historyKey(userId, petId))) || '[]'); } catch { return []; }
}

export async function deleteAISession(userId: string, petId: string, sessionId: string) {
  const sessions = await loadAISessions(userId, petId);
  await AsyncStorage.setItem(historyKey(userId, petId), JSON.stringify(sessions.filter((item) => item.id !== sessionId)));
}

export async function activateAISession(userId: string, petId: string, session: AISessionRecord) {
  const current = await loadAISession(userId, petId);
  await saveAISession(userId, petId, { sessionId: session.id, messages: session.messages, usage: current.usage });
}

export async function activateEmptyAISession(userId: string, petId: string) {
  const current = await loadAISession(userId, petId);
  await saveAISession(userId, petId, { sessionId: `session-${Date.now()}`, messages: [], usage: current.usage });
}

export async function saveActiveAISession(userId: string, petId: string, messages: StoredMessage[], usage?: AIUsage) {
  const current = await loadAISession(userId, petId);
  const sessionId = current.sessionId || `session-${Date.now()}`;
  const now = new Date().toISOString();
  const sessions = await loadAISessions(userId, petId);
  const previous = sessions.find((item) => item.id === sessionId);
  const record: AISessionRecord = {
    id: sessionId,
    title: messages.find((message) => message.role === 'user')?.text.slice(0, 24) || '新的對話',
    messages,
    createdAt: previous?.createdAt || now,
    updatedAt: now,
  };
  const updated = [record, ...sessions.filter((item) => item.id !== sessionId)]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);
  await AsyncStorage.setItem(historyKey(userId, petId), JSON.stringify(updated));
  await saveAISession(userId, petId, { sessionId, messages, usage });
}
