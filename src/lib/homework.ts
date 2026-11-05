// Seans kaydındaki "aileye ev ödevi" (C): Takip Planı'nın "Aileye gönder" özetiyle aynı maddeler (publishItems) ve aynı gönderim
// (care_plan_publish_selected). Ayrıca seans öncesi özet için bekleyen öneriler ve değerlendirme zamanı gelen hedefler.
import { loadPlan, loadModuleGoals, loadPublished, publishPlan, publishPlanSelected } from './plan';
import { listSuggestions, type Client, type Suggestion } from './clinic';
import { groupSuggestions, visibleGroup, publishItems, reviewDue, type PubItem } from './planCore';
import type { Task } from './metrics';

const COLORS = ['#2C4A9A', '#2F7D4A', '#9A6B00', '#7A3E9D', '#B3263E', '#1F7A8C'];

export type Homework = {
  items: PubItem[] | null;      // null: eski sunucu (gönderilmiş sürüm yok) — tek gönderim
  groups: { id: string | null; title: string; color: string; hidden: boolean }[];
  pending: { title: string }[];
  reviewDue: { title: string }[];
  drafts: number;
};

export async function loadHomework(client: Client, tasks: Task[], today: string): Promise<Homework> {
  const [plan, sugg] = await Promise.all([
    loadPlan({ kind: 'link', linkId: client.link_id, clinicId: client.clinic_id }),
    listSuggestions(client.link_id).catch(() => [] as Suggestion[]),
  ]);
  const ids = plan.modules.map((m) => m.id);
  const [links, pub] = await Promise.all([
    plan.legacy ? Promise.resolve(null) : loadModuleGoals(ids).catch(() => null),
    loadPublished(client.link_id).catch(() => null),
  ]);
  const groups = groupSuggestions(sugg, tasks, today).filter((r) => visibleGroup(r, today));
  const live = plan.goals.filter((g) => !g.archived);
  return {
    items: pub ? publishItems({ goals: plan.goals, modules: plan.modules, groups, changes: sugg, pub, links }) : null,
    groups: plan.goals.map((g, i) => ({ id: g.id, title: g.title, color: COLORS[i % COLORS.length], hidden: !g.shared })),
    pending: sugg.filter((s) => s.status === 'pending').map((s) => ({ title: s.title })),
    reviewDue: live.filter((g) => reviewDue(g, today)).map((g) => ({ title: g.title })),
    drafts: sugg.filter((s) => s.status === 'draft').length,
  };
}

export async function sendHomework(linkId: string, hold: string[], legacy: boolean): Promise<void> {
  if (legacy) return publishPlan(linkId);
  return publishPlanSelected(linkId, hold);
}
