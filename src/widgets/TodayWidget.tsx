import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  lineLimit,
  minimumScaleFactor,
  padding,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

/**
 * iOS widget na plochu: dnešní trénink, série týdnů a odtrénované dny tohoto týdne.
 * Data posílá aplikace (src/lib/homeWidget.ios.ts) při každé změně tréninků.
 */
export type TodayWidgetProps = {
  /** název dnešního tréninku, nebo „Dnes volno“ */
  title: string;
  /** cviky dnešního tréninku (krátce) */
  detail: string;
  /** série týdnů v řadě */
  streak: number;
  streakLabel: string;
  /** odtrénované dny po–ne, např. „1010100“ */
  days: string;
  dayNames: string;
  weekLabel: string;
};

const TodayWidget = (props: TodayWidgetProps, env: WidgetEnvironment) => {
  'widget';
  const BLUE = '#000072';
  const RED = '#D4060D';
  const names = props.dayNames.split(',');
  const dots = props.days.split('').map((d, i) => (
    <VStack key={i} spacing={2}>
      <Text modifiers={[font({ size: 9 }), foregroundStyle('#FFFFFF')]}>{names[i] ?? ''}</Text>
      <Text modifiers={[font({ size: 12 }), foregroundStyle(d === '1' ? RED : '#7F85B8')]}>{d === '1' ? '●' : '○'}</Text>
    </VStack>
  ));
  const small = env.widgetFamily === 'systemSmall';
  return (
    <VStack
      alignment="leading"
      spacing={6}
      modifiers={[padding({ all: small ? 2 : 4 }), containerBackground(BLUE, 'widget'), widgetURL('zvedej://training')]}
    >
      <HStack>
        <Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle('#FFFFFF')]}>ZVEDEJ</Text>
        <Spacer />
        <Text modifiers={[font({ size: 13, weight: 'black' }), foregroundStyle('#FF8A3D')]}>🔥 {props.streak}</Text>
      </HStack>
      <Text
        modifiers={[
          font({ size: small ? 17 : 20, weight: 'black' }),
          foregroundStyle('#FFFFFF'),
          lineLimit(2),
          minimumScaleFactor(0.7),
        ]}
      >
        {props.title}
      </Text>
      {props.detail ? (
        <Text modifiers={[font({ size: 12 }), foregroundStyle('#C9CCE6'), lineLimit(small ? 2 : 3)]}>{props.detail}</Text>
      ) : null}
      <Spacer />
      {small ? (
        <Text modifiers={[font({ size: 11 }), foregroundStyle('#C9CCE6')]}>{props.streakLabel}</Text>
      ) : (
        <HStack spacing={8}>{dots}</HStack>
      )}
    </VStack>
  );
};

export default createWidget('TodayWidget', TodayWidget, {
  title: 'Zvedej',
  detail: '',
  streak: 0,
  streakLabel: '',
  days: '0000000',
  dayNames: 'Po,Út,St,Čt,Pá,So,Ne',
  weekLabel: '',
});
