import TodayWidget from '../widgets/TodayWidgetAndroid';
import type { TodayWidgetProps } from '../widgets/TodayWidget';

/** Android: widget podporuje jen okamžitý stav (aktualizuje se při každé změně tréninků). */
export function updateHomeWidget(today: TodayWidgetProps, _tomorrow: TodayWidgetProps) {
  try {
    TodayWidget.updateSnapshot(today);
  } catch {}
}
