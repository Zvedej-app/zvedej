import { useEffect } from 'react';
import { Platform } from 'react-native';
import { addDays } from '../lib/date';
import { updateHomeWidget } from '../lib/homeWidget';
import { widgetProps } from '../lib/widgetData';
import { useSettings } from '../providers/SettingsProvider';
import { useTraining } from '../providers/TrainingProvider';

/** Posílá widgetu na ploše aktuální data při každé změně tréninků nebo jazyka. */
export function HomeWidgetBridge() {
  const { data, ready } = useTraining();
  const { settings, t } = useSettings();
  useEffect(() => {
    if (Platform.OS === 'web' || !ready) return;
    const id = setTimeout(() => {
      updateHomeWidget(widgetProps(data, settings.lang, t), widgetProps(data, settings.lang, t, addDays(new Date(), 1)));
    }, 800);
    return () => clearTimeout(id);
  }, [data, ready, settings.lang, t]);
  return null;
}
