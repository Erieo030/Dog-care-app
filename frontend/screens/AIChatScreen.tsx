import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { sendAIChat, ChatResponse } from '../services/aiService';

type Message = { role: 'user'|'assistant'; text: string; result?: ChatResponse };
const suggestions = ['最近體重如何？','最近有什麼健康異常？','現在正在吃什麼藥？','上次疫苗是什麼時候？','今天有什麼提醒？'];
export default function AIChatScreen() {
  const { session } = useAuth(); const { selectedPet } = usePet();
  const [messages, setMessages] = useState<Message[]>([]); const [input, setInput] = useState(''); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const send = async (value=input) => { const text=value.trim(); if (!text || !session?.userId || !selectedPet || loading) return; setInput(''); setError(''); setMessages((items)=>[...items,{role:'user',text}]); setLoading(true); try { const result=await sendAIChat(session.userId, selectedPet.id, text); setMessages((items)=>[...items,{role:'assistant',text:result.answer,result}]); } catch (e) { setError((e as Error).message || '目前無法取得回覆'); } finally { setLoading(false); } };
  return <KeyboardAvoidingView style={s.root} behavior={Platform.OS==='ios'?'padding':undefined}>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>PawLog AI 助手</Text><Text style={s.subtitle}>詢問 {selectedPet?.name || '毛孩'} 的健康與照護紀錄</Text>
      {!messages.length && <><Text style={s.intro}>你可以詢問 PawLog 中已記錄的資料。</Text><View style={s.suggestions}>{suggestions.map((item)=><TouchableOpacity key={item} style={s.chip} onPress={()=>send(item)}><Text style={s.chipText}>{item}</Text></TouchableOpacity>)}</View></>}
      {messages.map((item,index)=><View key={`${item.role}-${index}`} style={[s.bubble,item.role==='user'?s.userBubble:s.assistantBubble]}><Text style={s.bubbleText}>{item.text}</Text></View>)}
      {loading && <Text style={s.muted}>正在整理紀錄…</Text>}{error && <Text style={s.error}>{error}</Text>}
      <Text style={s.disclaimer}>PawLog AI 依 App 中已記錄的資料提供整理與查詢，不提供疾病診斷或藥物處方。</Text>
    </ScrollView>
    <View style={s.composer}><TextInput style={s.input} value={input} onChangeText={setInput} placeholder="輸入想查詢的內容" maxLength={1000} onSubmitEditing={()=>send()} returnKeyType="send"/><TouchableOpacity style={s.send} onPress={()=>send()} disabled={loading}><Text style={s.sendText}>送出</Text></TouchableOpacity></View>
  </KeyboardAvoidingView>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#FFFDF9'},content:{padding:20,gap:12},title:{fontSize:24,fontWeight:'700',color:'#2D2926'},subtitle:{color:'#766F69'},intro:{marginTop:20,color:'#514A45'},suggestions:{gap:8},chip:{padding:12,borderRadius:16,backgroundColor:'#F1E8DD',alignSelf:'flex-start'},chipText:{color:'#4E4036'},bubble:{maxWidth:'88%',padding:12,borderRadius:16},userBubble:{alignSelf:'flex-end',backgroundColor:'#E5D4C3'},assistantBubble:{alignSelf:'flex-start',backgroundColor:'#F3F0EC'},bubbleText:{color:'#302B27',lineHeight:21},muted:{color:'#8A8179'},error:{color:'#B4473F'},disclaimer:{fontSize:12,color:'#8A8179',marginTop:12},composer:{flexDirection:'row',padding:12,borderTopWidth:1,borderTopColor:'#E8E0D8',backgroundColor:'#FFF'},input:{flex:1,minHeight:44,borderWidth:1,borderColor:'#D9CEC2',borderRadius:14,paddingHorizontal:12},send:{marginLeft:8,justifyContent:'center',paddingHorizontal:16,borderRadius:14,backgroundColor:'#8B6B52'},sendText:{color:'#FFF',fontWeight:'600'}});
