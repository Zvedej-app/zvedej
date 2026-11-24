import { Button, HStack, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { activityBackgroundTint, background, clipShape, font, foregroundStyle, lineLimit, minimumScaleFactor, monospacedDigit, padding, scaleEffect, tint } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

/**
 * iOS Live Activity: pauza mezi sériemi na zamčené obrazovce a v Dynamic Islandu.
 * Odpočet i pruh běží samy (SwiftUI timerInterval), aplikace nemusí běžet.
 */
export type RestActivityProps = {
  /** čas začátku a konce pauzy (ms od 1970) */
  start: number;
  end: number;
  exercise: string;
  load: string;
  /** pauza skončila (aplikace to nastaví, pokud běží) */
  over: boolean;
  done: boolean;
  doneLabel: string;
  restLabel: string;
  nextLabel: string;
};

const BLUE = '#000072';
const RED = '#D4060D';

const RestActivity = (props: RestActivityProps, env: LiveActivityEnvironment) => {
  'widget';
  const lower = new Date(props.start);
  const upper = new Date(props.end);
  const check = props.done ? (
    <Text modifiers={[font({ size: 30 }), foregroundStyle('#FFFFFF')]}>✓</Text>
  ) : (
    <Button
      systemImage="checkmark.circle"
      label={props.doneLabel}
      target="markDone"
      onPress={() => ({ ...props, done: true })}
      modifiers={[tint('#FFFFFF'), font({ size: 30 })]}
    />
  );

  const banner = props.over ? (
    <HStack modifiers={[padding({ all: 16 }), activityBackgroundTint(BLUE)]}>
      <VStack alignment="leading">
        <Text modifiers={[font({ size: 13 }), foregroundStyle('#FFFFFF')]}>{props.nextLabel}</Text>
        <Text modifiers={[font({ size: 34, weight: 'black' }), foregroundStyle('#FFFFFF'), lineLimit(1), minimumScaleFactor(0.5)]}>
          {props.exercise}
        </Text>
        <Text modifiers={[font({ size: 18, weight: 'bold' }), foregroundStyle('#FFFFFF')]}>{props.load}</Text>
      </VStack>
      <Spacer />
      {check}
    </HStack>
  ) : (
    // stejné rozložení jako panel pauzy v aplikaci: Pauza, velký odpočet, cvik · váha, pruh
    <VStack alignment="leading" spacing={10} modifiers={[padding({ all: 16 }), activityBackgroundTint(BLUE)]}>
      <HStack>
        <VStack alignment="leading" spacing={0}>
          <Text modifiers={[font({ size: 14 }), foregroundStyle('#FFFFFF')]}>{props.restLabel}</Text>
          <Text
            timerInterval={{ lower, upper }}
            countsDown
            modifiers={[font({ size: 44, weight: 'black' }), monospacedDigit(), foregroundStyle('#FFFFFF')]}
          />
          <Text modifiers={[font({ size: 16, weight: 'bold' }), foregroundStyle('#FFFFFF'), lineLimit(1)]}>
            {props.exercise} · {props.load}
          </Text>
        </VStack>
        <Spacer />
        {check}
      </HStack>
      {/* pruh jako v aplikaci: červený podklad, modrá plynule ubývá */}
      <ProgressView
        timerInterval={{ lower, upper }}
        countsDown
        modifiers={[
          tint(env.isLuminanceReduced ? '#FFFFFF' : '#2F6DB5'),
          scaleEffect({ x: 1, y: 3 }),
          background(RED),
          clipShape('capsule'),
        ]}
      />
    </VStack>
  );

  return {
    banner,
    compactLeading: <Text modifiers={[foregroundStyle(RED)]}>{props.exercise.slice(0, 1)}</Text>,
    compactTrailing: props.over ? (
      <Text modifiers={[foregroundStyle(RED)]}>✓</Text>
    ) : (
      <Text timerInterval={{ lower, upper }} countsDown modifiers={[monospacedDigit(), foregroundStyle('#FFFFFF')]} />
    ),
    minimal: <Text modifiers={[foregroundStyle(RED)]}>●</Text>,
    expandedLeading: (
      <Text modifiers={[font({ size: 15, weight: 'bold' }), lineLimit(1)]}>{props.exercise}</Text>
    ),
    expandedTrailing: props.over ? (
      <Text>{props.load}</Text>
    ) : (
      <Text timerInterval={{ lower, upper }} countsDown modifiers={[font({ size: 22, weight: 'black' }), monospacedDigit()]} />
    ),
    expandedBottom: props.over ? (
      check
    ) : (
      <ProgressView timerInterval={{ lower, upper }} countsDown modifiers={[tint(RED)]} />
    ),
  };
};

export default createLiveActivity('RestActivity', RestActivity);
