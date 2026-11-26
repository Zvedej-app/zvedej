import React, { useEffect, useRef } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { registerTarget } from '../../lib/tour';

/** Obal prvku, který umí prohlídka zvýraznit. */
export function TourTarget({ id, children, style }: { id: string; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const ref = useRef<React.ComponentRef<typeof View>>(null);
  useEffect(() => registerTarget(id, ref), [id]);
  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}
