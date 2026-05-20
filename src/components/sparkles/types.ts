export type AnimatedIconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};

export type AnimatedIconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
};
