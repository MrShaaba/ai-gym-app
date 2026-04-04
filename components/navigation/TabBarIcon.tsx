import { Ionicons } from '@expo/vector-icons';
import { type ComponentProps } from 'react';

interface TabBarIconProps {
  name: ComponentProps<typeof Ionicons>['name'];
  color: string;
  size?: number;
}

export function TabBarIcon({ name, color, size = 24 }: TabBarIconProps) {
  return <Ionicons name={name} size={size} color={color} />;
}
