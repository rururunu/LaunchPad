import { ref } from 'vue';
import { storage } from '@/utils/storage';
export type AppearanceMode = 'system' | 'light' | 'dark';
const mode = ref<AppearanceMode>('system');
const resolved = ref<'light' | 'dark'>('light');
const media = window.matchMedia('(prefers-color-scheme: dark)');
function apply() {
  resolved.value = mode.value === 'system' ? (media.matches ? 'dark' : 'light') : mode.value;
  document.documentElement.dataset.theme = resolved.value;
  document.documentElement.style.colorScheme = resolved.value;
}
function accept(value: unknown) { mode.value = value === 'dark' || value === 'light' ? value : 'system'; apply(); }
try { accept(localStorage.getItem('appearanceMode')); } catch { apply(); }
media.addEventListener('change', apply);
let revision = 0;
const initialRevision = revision;
void storage.get('appearanceMode').then(value => { if (revision === initialRevision) accept(value); });
storage.onChange('appearanceMode', changes => {
  revision++;
  accept(changes.appearanceMode?.newValue);
  try { localStorage.setItem('appearanceMode', mode.value); } catch {}
});
export function useAppearance() {
  return { mode, resolved, async setMode(value: AppearanceMode) {
    revision++;
    const previous = mode.value;
    accept(value);
    try { await storage.set('appearanceMode', value); try { localStorage.setItem('appearanceMode', value); } catch {} }
    catch (error) { accept(previous); throw error; }
  } };
}
