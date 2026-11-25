import TodayWidget, { type TodayWidgetProps } from '../widgets/TodayWidget';

/** iOS: dnešek hned, o půlnoci se widget sám přepne na zítřek (i když aplikace neběží). */
export function updateHomeWidget(today: TodayWidgetProps, tomorrow: TodayWidgetProps) {
  try {
    const midnight = new Date();
    midnight.setHours(24, 0, 5, 0);
    TodayWidget.updateTimeline([
      { date: new Date(), props: today },
      { date: midnight, props: tomorrow },
    ]);
  } catch {}
}
