// ParentApp'in görev şablonları (parent-app/src/data/templates.ts) — uzman önerisi aynı şablonlardan seçilir.
// ParentApp'teki liste değişirse burası da aynı tutulmalı (template_key ile eşleşir).
import { Difficulty } from './theme';

export type Category = 'home' | 'mind' | 'learn' | 'self';

export const categories: { id: Category; label: string; emoji: string }[] = [
  { id: 'home', label: 'Ev İşleri', emoji: '🏠' },
  { id: 'mind', label: 'Ruh Sağlığı', emoji: '🌈' },
  { id: 'learn', label: 'Öğrenme', emoji: '📚' },
  { id: 'self', label: 'Kişisel Bakım', emoji: '🪥' },
];

export type Template = {
  id: string;
  title: string;
  emoji: string;
  category: Category;
  difficulty: Difficulty;
  skill: string; // hangi beceriye hitap ediyor
  usedBy: number; // kaç ebeveyn kullandı
  custom?: boolean;
};

export const templates: Template[] = [
  { id: 't1', title: 'Yatağını topla', emoji: '🛏️', category: 'home', difficulty: 'easy', skill: 'Takım Çalışması', usedBy: 843 },
  { id: 't2', title: 'Oyuncaklarını topla', emoji: '🧸', category: 'home', difficulty: 'easy', skill: 'Takım Çalışması', usedBy: 659 },
  { id: 't3', title: 'Sofrayı kurmaya yardım et', emoji: '🍽️', category: 'home', difficulty: 'medium', skill: 'Takım Çalışması', usedBy: 477 },
  { id: 't4', title: 'Kirli çamaşırları sepete at', emoji: '🧺', category: 'home', difficulty: 'easy', skill: 'Takım Çalışması', usedBy: 296 },
  { id: 't5', title: 'Odanı süpür', emoji: '🧹', category: 'home', difficulty: 'medium', skill: 'Takım Çalışması', usedBy: 1015 },
  { id: 't6', title: 'Bulaşık makinesini boşalt', emoji: '🫧', category: 'home', difficulty: 'hard', skill: 'Takım Çalışması', usedBy: 834 },
  { id: 't7', title: 'Çiçekleri sula', emoji: '🪴', category: 'home', difficulty: 'easy', skill: 'Sorumluluk', usedBy: 653 },
  { id: 't8', title: 'Yarın için kıyafetini seç', emoji: '👕', category: 'self', difficulty: 'easy', skill: 'Bağımsızlık', usedBy: 412 },
  { id: 't9', title: 'Dişlerini fırçala', emoji: '🪥', category: 'self', difficulty: 'easy', skill: 'Öz Bakım', usedBy: 1320 },
  { id: 't10', title: '10 dakika kitap oku', emoji: '📖', category: 'learn', difficulty: 'medium', skill: 'Odaklanma', usedBy: 902 },
  { id: 't11', title: 'Ödevini bitir', emoji: '✏️', category: 'learn', difficulty: 'hard', skill: 'Sorumluluk', usedBy: 768 },
  { id: 't12', title: 'Derin nefes egzersizi yap', emoji: '🌬️', category: 'mind', difficulty: 'easy', skill: 'Sakinleşme', usedBy: 231 },
  { id: 't13', title: 'Bugün güzel olan 3 şeyi anlat', emoji: '🌈', category: 'mind', difficulty: 'medium', skill: 'Minnettarlık', usedBy: 188 },
  { id: 't14', title: 'Birine nazik bir söz söyle', emoji: '💬', category: 'mind', difficulty: 'easy', skill: 'Empati', usedBy: 154 },
];
