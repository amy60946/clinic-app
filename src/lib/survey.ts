import { supabase } from './supabase';
import data from '../data/survey.json';

// Uzman karşılama anketi (ortak/sozlesme/akislar.md 15, proposed/20261027100000_clinician_survey.sql).
// Kayıttan sonraki ilk girişte bir kez; "Şimdilik geç" de kayıt sayılır. Seçenekler ortak veri/uzman_anketi.json'dan
// (node tools/sync-survey.mjs <ortak>/veri/uzman_anketi.json). Cevaplar aileye görünmez.
export type SurveyOption = { key: string; label: string; icon?: string; group?: string };
export type SurveyQuestion = { title: string; hint: string; options: SurveyOption[]; groups?: { key: string; label: string }[] };
export const SURVEY = data as {
  version: number; profession: SurveyQuestion; challenges: SurveyQuestion; features: SurveyQuestion; intent: SurveyQuestion;
};
export type Intent = 'trial' | 'family' | 'team' | 'org';
export type SurveyAnswers = { profession: string | null; challenges: string[]; features: string[]; intent: Intent | null };

const missing = (e: { code?: string } | null) => e?.code === 'PGRST202' || e?.code === '42883';

// true: cevaplanmış (ya da geçilmiş) · false: anket gösterilir · null: sunucuda anket yok (gösterilmez)
export async function surveyAnswered(): Promise<boolean | null> {
  const { data: d, error } = await supabase.rpc('clinician_survey_me');
  if (missing(error)) return null;
  if (error) return null;   // ağ hatasında soru sorup kullanıcıyı bekletmeyiz
  return d != null;
}

export async function saveSurvey(a: SurveyAnswers | null): Promise<void> {
  const { error } = await supabase.rpc('clinician_survey_save', a
    ? { p_profession: a.profession, p_challenges: a.challenges, p_features: a.features, p_intent: a.intent, p_skipped: false }
    : { p_profession: null, p_challenges: [], p_features: [], p_intent: null, p_skipped: true });
  if (error && !missing(error)) throw new Error(error.message);
}
