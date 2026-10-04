/** 用途：提供 MEGO AI 資料使用方式的唯讀說明。 */
import React from 'react';
import {
  SettingsDocumentHero,
  SettingsDocumentParagraph,
  SettingsDocumentSection,
  SettingsPage,
} from '../components/SettingsLayout';

const sections = [
  {
    title: '會送出哪些資料？',
    icon: 'cloud-upload-outline' as const,
    rows: [
      {
        label: '你的問題',
        text: '會送到 MEGO 設定的 AI 服務，以產生回答。',
      },
      {
        label: '同一段對話',
        text: '最近最多 10 則訊息可能一併傳送；不同對話不會互相帶入。',
      },
      {
        label: '毛孩照護資料',
        text: '問題需要個人化照護資訊時，才會依問題選取必要資料，例如基本資料、過敏或慢性病資訊，以及相關的日常、健康、就醫、用藥、疫苗、驅蟲或提醒紀錄。',
      },
    ],
  },
  {
    title: '什麼時候會使用毛孩紀錄？',
    icon: 'paw-outline' as const,
    rows: [
      { label: '一般生活問題', text: '不會附帶毛孩紀錄。' },
      {
        label: '毛孩個人化問題',
        text: '提到毛孩個人狀況或照護紀錄時，系統才會選取可能相關的資料；未使用的紀錄類別不會一併提供。',
      },
    ],
  },
  {
    title: '對話紀錄如何保存？',
    icon: 'phone-portrait-outline' as const,
    rows: [
      {
        label: '保存位置',
        text: '最近對話保存在這台裝置，用來顯示與延續同一段對話，不會由 MEGO 後端同步到其他裝置。',
      },
      { label: '刪除對話', text: '會將它從本機最近對話清單移除。' },
    ],
  },
  {
    title: '如何開始使用？',
    icon: 'checkmark-circle-outline' as const,
    rows: [
      {
        label: '開始前',
        text: '第一次開始 MEGO AI 對話前，會先顯示資料使用確認。',
      },
      {
        label: '繼續使用',
        text: '只有按下「我了解，繼續使用 MEGO AI」後，才會開始送出問題與必要資料。',
      },
      {
        label: '稍後再說或關閉',
        text: '不會送出資料，也不會消耗 AI 次數。',
      },
    ],
  },
  {
    title: '使用提醒',
    icon: 'medkit-outline' as const,
    rows: [
      {
        label: '一般使用',
        text: 'AI 回覆可能不完整或不正確，不是獸醫診斷、處方或緊急醫療服務。涉及症狀、治療或用藥，請向獸醫確認。',
      },
      {
        label: '緊急狀況',
        text: '疑似中毒、呼吸困難、昏厥等急症，請立即聯絡動物醫院。',
        emphasis: true,
      },
    ],
  },
];

export function AIDataUseInfoScreen() {
  return (
    <SettingsPage>
      <SettingsDocumentHero
        title="MEGO AI 資料使用說明"
        subtitle="供你隨時查看 AI 問答與毛孩資料的使用方式。"
        icon="lock-closed-outline"
      />
      {sections.map((section, index) => (
        <SettingsDocumentSection
          key={section.title}
          title={section.title}
          index={index + 1}
          icon={section.icon}
        >
            {section.rows.map((row) => (
              <SettingsDocumentParagraph key={row.label} label={row.label} emphasis={row.emphasis}>
                {row.text}
              </SettingsDocumentParagraph>
            ))}
        </SettingsDocumentSection>
      ))}
    </SettingsPage>
  );
}
