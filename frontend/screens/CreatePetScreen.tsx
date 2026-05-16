import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Colors } from '../constants/Colors';

interface PetData {
  name: string;
  gender: string;
  breed: string;
  birthday: string;
}

interface CreatePetScreenProps {
  onSubmit: (data: PetData) => void;
}

export default function CreatePetScreen({ onSubmit }: CreatePetScreenProps) {
  const currentYear = new Date().getFullYear();

  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [breed, setBreed] = useState('');

  const [year, setYear] = useState(String(currentYear));
  const [month, setMonth] = useState('1');
  const [day, setDay] = useState('1');

  const breedOptions = ['柴犬', '黃金獵犬'];

  const years = useMemo(() => {
    return Array.from({ length: 31 }, (_, index) => String(currentYear - index));
  }, [currentYear]);

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => String(index + 1));
  }, []);

  const getDaysInMonth = (selectedYear: string, selectedMonth: string) => {
    return new Date(Number(selectedYear), Number(selectedMonth), 0).getDate();
  };

  const days = useMemo(() => {
    const totalDays = getDaysInMonth(year, month);
    return Array.from({ length: totalDays }, (_, index) => String(index + 1));
  }, [year, month]);

  const formatBirthday = () => {
    const formattedMonth = month.padStart(2, '0');
    const formattedDay = day.padStart(2, '0');

    return `${year}-${formattedMonth}-${formattedDay}`;
  };

  const handleYearChange = (value: string) => {
    setYear(value);

    const maxDay = getDaysInMonth(value, month);
    if (Number(day) > maxDay) {
      setDay(String(maxDay));
    }
  };

  const handleMonthChange = (value: string) => {
    setMonth(value);

    const maxDay = getDaysInMonth(year, value);
    if (Number(day) > maxDay) {
      setDay(String(maxDay));
    }
  };

  const handlePress = () => {
    if (!name.trim()) {
      Alert.alert('提示', '請輸入狗狗姓名 🐾');
      return;
    }

    if (!gender) {
      Alert.alert('提示', '請選擇狗狗性別 🐾');
      return;
    }

    if (!breed) {
      Alert.alert('提示', '請選擇狗狗品種 🐾');
      return;
    }

    onSubmit({
      name: name.trim(),
      gender,
      breed,
      birthday: formatBirthday(),
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>建立毛孩檔案 🐾</Text>
          <Text style={styles.subtitle}>讓我們更了解你的寶貝</Text>

          <View style={styles.form}>
            <Text style={styles.label}>毛孩姓名</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="例如：Kuro"
              placeholderTextColor={Colors.subtext}
            />

            <Text style={styles.label}>性別</Text>
            <View style={styles.optionRow}>
              {['公犬', '母犬'].map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.optionButton,
                    gender === item && styles.optionButtonActive,
                  ]}
                  onPress={() => setGender(item)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      gender === item && styles.optionTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>品種</Text>
            <View style={styles.singlePickerBox}>
              <Picker
                selectedValue={breed}
                onValueChange={(value) => setBreed(value)}
                style={styles.singlePicker}
                itemStyle={styles.pickerItem}
              >
                {breedOptions.map((item) => (
                  <Picker.Item key={item} label={item} value={item} />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>生日</Text>
            <View style={styles.birthdayBox}>
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>年</Text>
                <Picker
                  selectedValue={year}
                  onValueChange={handleYearChange}
                  style={styles.datePicker}
                  itemStyle={styles.pickerItem}
                >
                  {years.map((item) => (
                    <Picker.Item key={item} label={`${item} 年`} value={item} />
                  ))}
                </Picker>
              </View>

              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>月</Text>
                <Picker
                  selectedValue={month}
                  onValueChange={handleMonthChange}
                  style={styles.datePicker}
                  itemStyle={styles.pickerItem}
                >
                  {months.map((item) => (
                    <Picker.Item key={item} label={`${item} 月`} value={item} />
                  ))}
                </Picker>
              </View>

              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>日</Text>
                <Picker
                  selectedValue={day}
                  onValueChange={(value) => setDay(value)}
                  style={styles.datePicker}
                  itemStyle={styles.pickerItem}
                >
                  {days.map((item) => (
                    <Picker.Item key={item} label={`${item} 日`} value={item} />
                  ))}
                </Picker>
              </View>
            </View>

            <Text style={styles.birthdayPreview}>
              目前選擇生日：{formatBirthday()}
            </Text>

            <TouchableOpacity style={styles.submitButton} onPress={handlePress}>
              <Text style={styles.submitText}>完成並進入首頁</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  content: {
    padding: 30,
    paddingBottom: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.subtext,
    textAlign: 'center',
    marginBottom: 30,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    marginLeft: 5,
  },
  input: {
    backgroundColor: Colors.surface,
    height: 55,
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  optionButton: {
    flex: 1,
    height: 50,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  optionTextActive: {
    color: '#FFFFFF',
  },

  singlePickerBox: {
    backgroundColor: Colors.surface,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
    overflow: 'hidden',
    height: Platform.OS === 'ios' ? 160 : 55,
    justifyContent: 'center',
  },
  singlePicker: {
    width: '100%',
    height: Platform.OS === 'ios' ? 160 : 55,
    color: Colors.text,
  },

  birthdayBox: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
    overflow: 'hidden',
    minHeight: Platform.OS === 'ios' ? 180 : 165,
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Platform.OS === 'ios' ? 180 : 165,
  },
  pickerLabel: {
    fontSize: 12,
    color: Colors.subtext,
    marginTop: 8,
    marginBottom: 2,
  },
  datePicker: {
    width: '100%',
    height: Platform.OS === 'ios' ? 150 : 130,
    color: Colors.text,
  },
  pickerItem: {
    fontSize: 16,
    color: Colors.text,
    height: 130,
  },
  birthdayPreview: {
    color: Colors.subtext,
    fontSize: 13,
    marginLeft: 5,
    marginBottom: 20,
  },

  submitButton: {
    backgroundColor: Colors.primary,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  submitText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});