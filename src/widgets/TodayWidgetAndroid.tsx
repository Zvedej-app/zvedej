import { Column, Row, Spacer, Text } from '@expo/ui/jetpack-compose';
import { background, fillMaxSize, paddingAll, weight } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget } from 'expo-widgets';
import type { TodayWidgetProps } from './TodayWidget';

/** Android widget na plochu: dnešní trénink, série týdnů, odtrénované dny (stejná data jako na iOS). */
const TodayWidgetAndroid = (props: TodayWidgetProps) => {
  'widget';
  const names = props.dayNames.split(',');
  return (
    <Column modifiers={[fillMaxSize(), background('#000072'), paddingAll(12)]}>
      <Row>
        <Text color="#FFFFFF" style={{ fontSize: 12, fontWeight: 'bold' }}>
          ZVEDEJ
        </Text>
        <Spacer modifiers={[weight(1)]} />
        <Text color="#FF8A3D" style={{ fontSize: 13, fontWeight: 'bold' }}>
          {`🔥 ${props.streak}`}
        </Text>
      </Row>
      <Text color="#FFFFFF" maxLines={2} style={{ fontSize: 18, fontWeight: '900' }}>
        {props.title}
      </Text>
      <Text color="#C9CCE6" maxLines={2} style={{ fontSize: 12 }}>
        {props.detail}
      </Text>
      <Spacer modifiers={[weight(1)]} />
      <Row>
        {props.days.split('').map((d, i) => (
          <Column key={i} modifiers={[weight(1)]}>
            <Text color="#FFFFFF" style={{ fontSize: 9 }}>
              {names[i] ?? ''}
            </Text>
            <Text color={d === '1' ? '#D4060D' : '#7F85B8'} style={{ fontSize: 12 }}>
              {d === '1' ? '●' : '○'}
            </Text>
          </Column>
        ))}
      </Row>
    </Column>
  );
};

export default createWidget('TodayWidget', TodayWidgetAndroid, {
  title: 'Zvedej',
  detail: '',
  streak: 0,
  streakLabel: '',
  days: '0000000',
  dayNames: 'Po,Út,St,Čt,Pá,So,Ne',
  weekLabel: '',
});
