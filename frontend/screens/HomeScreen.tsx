// d:/my-app/screens/HomeScreen.tsx

import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../constants/Colors';

// 1. 定義 Props 型別，確保接收 onLogout 函式
interface HomeScreenProps {
    petData: {
        name: string;
        gender: string;
        breed: string;
        birthday: string;
    };
    onLogout: () => void;
}

export default function HomeScreen({ petData, onLogout }: HomeScreenProps) {

    const menuItems = [
        { title: '提醒', icon: '⏰' },
        { title: '記帳', icon: '💰' },
        { title: '寵物食譜', icon: '🍲' },
        { title: '囤貨', icon: '🛒' },
        { title: '記事', icon: '📒' },
        { title: '體重', icon: '⚖️' },
        { title: '病歷', icon: '🏥' },
        { title: '相簿', icon: '🖼️' },
    ];

    // 點擊登出時跳出確認視窗
    const handleLogoutPress = () => {
        Alert.alert(
            "提示",
            "確定要登出並返回登入頁面嗎？🐾",
            [
                { text: "取消", style: "cancel" },
                { text: "確定", onPress: onLogout, style: "destructive" }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <ScrollView contentContainerStyle={styles.content}>

                {/* 1. 頂部資訊區 */}
                <View style={styles.header}>
                    <View style={styles.avatarContainer}><Text style={styles.avatarEmoji}>😺</Text></View>
                    <View style={styles.infoContainer}>
                        <View style={styles.titleRow}>
                            <Text style={styles.petName}>{petData.name}</Text>
                            <Text style={styles.petGenderLabel}>{petData.gender}</Text>
                            <Text style={styles.petBreedText}>{petData.breed}</Text>
                            <Text style={styles.petBreedLabel}>主子</Text>
                        </View>
                        <Text style={styles.petAgeText}>
                            生日：{petData.birthday}
                        </Text>
                    </View>
                </View>

                {/* 2. 菜單宮格區 */}
                <View style={styles.menuGrid}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity key={index} style={styles.menuItem}>
                            <View style={styles.menuIconWrapper}>
                                <Text style={styles.menuEmoji}>{item.icon}</Text>
                            </View>
                            <Text style={styles.menuText}>{item.title}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* 3. 插畫區預留 */}
                <View style={styles.illustrationPlaceHolder}>
                    <Text style={styles.placeholderText}>(插畫區 - 正式版將使用插畫素材背景)</Text>
                </View>

                {/* 4. 登出按鈕 */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogoutPress}>
                    <Text style={styles.logoutText}>登出帳號</Text>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: 20 },

    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 30, marginTop: 10 },
    avatarContainer: {
        width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.text,
        justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, overflow: 'hidden'
    },
    avatarEmoji: { fontSize: 35 },
    infoContainer: { marginLeft: 15, flex: 1 },
    titleRow: { flexDirection: 'row', alignItems: 'center' },
    petName: { fontSize: 22, fontWeight: '700', color: Colors.text, marginRight: 8 },
    petGenderLabel: { color: Colors.primary, fontWeight: 'bold', marginRight: 5 },
    petBreedText: { color: Colors.subtext, fontSize: 14, marginRight: 3 },
    petBreedLabel: {
        backgroundColor: '#F0EBE3',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        fontSize: 10,
        color: Colors.subtext,
        overflow: 'hidden',
    },
    petAgeText: { color: Colors.subtext, fontSize: 12, marginTop: 3 },

    menuGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
    menuItem: { width: '23%', alignItems: 'center', marginBottom: 20 },
    menuIconWrapper: {
        width: 60, height: 60, borderRadius: 20, backgroundColor: Colors.surface,
        justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
        shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 1
    },
    menuEmoji: { fontSize: 32 },
    menuText: { fontSize: 12, color: Colors.text, marginTop: 8, fontWeight: '600' },

    illustrationPlaceHolder: {
        width: '100%', height: 250, justifyContent: 'center', alignItems: 'center',
        borderStyle: 'dashed', borderWidth: 1, borderColor: Colors.border, marginTop: 20, borderRadius: 20
    },
    placeholderText: { color: Colors.subtext, fontSize: 12 },

    // 登出按鈕樣式
    logoutButton: {
        marginTop: 40,
        marginBottom: 30,
        padding: 15,
        alignItems: 'center',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: '#FFF',
    },
    logoutText: {
        color: '#E57373', // 使用柔和的紅色:登出
        fontWeight: '600',
    }
});
