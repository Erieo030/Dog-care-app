import React, { useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { sendAIChat, ChatResponse, AIUsage } from '../services/aiService';
import { loadAISession, saveActiveAISession } from '../services/aiSessionService';
import { Colors } from '../constants/Colors';

type Message = { role: 'user'|'assistant'; text: string; result?: ChatResponse };
const QUICK_PROMPTS = ['最近體重如何？', '今天有什麼提醒？', '上次疫苗是什麼時候？', '現在正在吃什麼藥？'];
export default function AIChatScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { session } = useAuth(); const { selectedPet } = usePet();
  const [messages, setMessages] = useState<Message[]>([]); const [usage, setUsage] = useState<AIUsage | null>(null); const [input, setInput] = useState(''); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const refreshActiveSession = React.useCallback(() => {
    if (!session?.userId || !selectedPet?.id) return;
    loadAISession(session.userId, selectedPet.id).then((saved) => {
      setMessages(saved.messages || []);
      if (saved.usage) setUsage(saved.usage);
    }).catch(() => undefined);
  }, [session?.userId, selectedPet?.id]);
  useFocusEffect(refreshActiveSession);
  const send = async (value=input) => { const text=value.trim(); if (!text || !session?.userId || !selectedPet || loading) return; setInput(''); setError(''); setMessages((items)=>[...items,{role:'user',text}]); setLoading(true); try { const result=await sendAIChat(session.userId, selectedPet.id, text); const assistantText = result.errorMessage ? result.answer + "\n" + result.errorMessage : result.answer; const nextMessages: Message[] = [...messages, { role: 'user', text }, { role: 'assistant', text: assistantText, result }]; setMessages(nextMessages); if (result.usage) setUsage(result.usage); await saveActiveAISession(session.userId, selectedPet.id, nextMessages.map(({ role, text: messageText }) => ({ role, text: messageText })), result.usage); } catch (e) { setError((e as Error).message || '目前無法取得回覆'); } finally { setLoading(false); } };
  return <SafeAreaView style={s.safeArea}><KeyboardAvoidingView style={s.root} behavior={Platform.OS==='ios'?'padding':undefined}>
    <View style={s.header}><TouchableOpacity accessibilityLabel="MEGO AI 主頁" style={s.headerAction} onPress={() => { const parent = navigation.getParent(); if (parent) parent.navigate('Health', { screen: 'HealthOverview' }); else navigation.navigate('HealthOverview'); }}><Ionicons name="apps-outline" size={22} color={Colors.text} /></TouchableOpacity><View style={s.titleBody}><Text style={s.eyebrow}>MEGO AI</Text><Text style={s.title}>與 {selectedPet?.name || '毛孩'} 對話</Text></View>{selectedPet?.avatarUrl ? <Image source={{ uri: selectedPet.avatarUrl }} style={s.avatar} /> : <View style={s.avatarFallback}><Ionicons name="paw-outline" size={19} color={Colors.primary} /></View>}</View>
    {usage && <View style={s.usageBadge}><Ionicons name="sparkles-outline" size={14} color={Colors.primary} /><Text style={s.usage}>{usage.unlimited ? `今日已用 ${usage.used} 次 · 不限次數` : `今日已用 ${usage.used} 次 · 還有 ${usage.remaining} 次`}</Text></View>}
    <Text style={s.subtitle}>查詢照護紀錄，也能協助一般生活與知識問題</Text>
    <FlatList
      data={messages}
      keyExtractor={(item, index) => `${item.role}-${index}`}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={!messages.length ? <>
        <Text style={s.intro}>可以詢問毛孩照護紀錄，也可以問一般生活與知識問題。疾病診斷與用藥仍請交由獸醫判斷。</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="準備看醫生" style={s.vetTool} onPress={() => navigation.navigate('VetVisitBrief')}>
          <Ionicons name="medkit-outline" size={19} color="#5F9274" />
          <View style={s.vetToolText}><Text style={s.vetToolTitle}>準備看醫生</Text><Text style={s.vetToolHint}>整理近期紀錄，帶著重點和獸醫溝通</Text></View>
          <Ionicons name="chevron-forward" size={18} color="#8A8179" />
        </TouchableOpacity>
        <Text style={s.quickPromptTitle}>可以先問問看</Text>
        <View style={s.quickPrompts}>{QUICK_PROMPTS.map((prompt) => <TouchableOpacity key={prompt} accessibilityRole="button" accessibilityLabel={`快速提問：${prompt}`} style={s.quickPrompt} onPress={() => send(prompt)}><Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.success} /><Text style={s.quickPromptText}>{prompt}</Text></TouchableOpacity>)}</View>
      </> : null}
      renderItem={({ item }) => <View style={[s.bubble,item.role==='user'?s.userBubble:s.assistantBubble]}><Text style={s.bubbleText}>{item.text}</Text></View>}
      ListFooterComponent={<>
        {loading && <Text style={s.muted}>正在整理紀錄…</Text>}
        {error && <Text style={s.error}>{error}</Text>}
        <Text style={s.disclaimer}>MEGO AI 依 App 中已記錄的資料提供整理與查詢，不提供疾病診斷或藥物處方。</Text>
      </>}
    />
    <View style={s.composer}><TextInput style={s.input} value={input} onChangeText={setInput} placeholder="輸入想查詢的內容" placeholderTextColor={Colors.subtext} maxLength={1000} onSubmitEditing={()=>send()} returnKeyType="send"/><TouchableOpacity style={s.send} onPress={()=>send()} disabled={loading}><Ionicons name="arrow-up" size={22} color="#FFF" /></TouchableOpacity></View>
  </KeyboardAvoidingView></SafeAreaView>;
}
const s=StyleSheet.create({
  safeArea:{flex:1,backgroundColor:Colors.background},root:{flex:1,backgroundColor:Colors.background},
  header:{flexDirection:'row',alignItems:'center',paddingHorizontal:20,paddingTop:8,paddingBottom:4},
  content:{paddingHorizontal:20,paddingTop:12,paddingBottom:20,gap:12},titleBody:{flex:1,marginLeft:8},eyebrow:{fontSize:11,fontWeight:'800',letterSpacing:1.4,color:Colors.primary},title:{fontSize:24,fontWeight:'800',color:Colors.text,marginTop:2},headerAction:{width:40,height:40,alignItems:'center',justifyContent:'center'},avatar:{width:46,height:46,borderRadius:16},avatarFallback:{width:46,height:46,borderRadius:16,backgroundColor:Colors.primarySoft,alignItems:'center',justifyContent:'center'},
  usageBadge:{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:5,marginHorizontal:20,marginTop:4,paddingHorizontal:10,paddingVertical:5,borderRadius:12,backgroundColor:Colors.primarySoft},usage:{fontSize:12,color:Colors.primary,fontWeight:'700'},subtitle:{marginHorizontal:20,marginTop:8,color:Colors.subtext,fontSize:15,lineHeight:22},
  vetTool:{flexDirection:'row',alignItems:'center',padding:14,borderRadius:18,backgroundColor:Colors.successSoft,borderWidth:1,borderColor:Colors.border},quickPromptTitle:{fontSize:14,fontWeight:'700',color:Colors.text,marginTop:4},quickPrompts:{flexDirection:'row',flexWrap:'wrap',gap:8},quickPrompt:{flexDirection:'row',alignItems:'center',width:'48%',minHeight:42,paddingHorizontal:10,paddingVertical:8,borderRadius:14,backgroundColor:Colors.surfaceSoft,borderWidth:1,borderColor:Colors.border},quickPromptText:{flex:1,marginLeft:6,color:Colors.text,fontSize:13,fontWeight:'600'},vetToolText:{flex:1,marginLeft:10},vetToolTitle:{color:Colors.success,fontWeight:'700',fontSize:15},vetToolHint:{color:Colors.subtext,fontSize:12,marginTop:3},intro:{marginTop:4,color:Colors.text,lineHeight:21,fontSize:15},
  bubble:{maxWidth:'88%',paddingHorizontal:16,paddingVertical:13,borderRadius:20},userBubble:{alignSelf:'flex-end',backgroundColor:Colors.primarySoft,borderBottomRightRadius:6},assistantBubble:{alignSelf:'flex-start',backgroundColor:Colors.surface,borderBottomLeftRadius:6},bubbleText:{color:Colors.text,lineHeight:23,fontSize:16},muted:{color:Colors.subtext},error:{color:Colors.danger},disclaimer:{fontSize:12,color:Colors.subtext,marginTop:12,lineHeight:18},
  composer:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:12,borderTopWidth:1,borderTopColor:Colors.border,backgroundColor:Colors.surface},input:{flex:1,minHeight:48,borderWidth:1,borderColor:Colors.border,borderRadius:24,paddingHorizontal:18,color:Colors.text,backgroundColor:Colors.surfaceSoft,fontSize:16},send:{marginLeft:10,width:50,height:50,alignItems:'center',justifyContent:'center',borderRadius:25,backgroundColor:Colors.primary}
});
