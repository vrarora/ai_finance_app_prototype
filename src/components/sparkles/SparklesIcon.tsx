import { forwardRef, useImperativeHandle, useCallback, useRef } from 'react';
import type { AnimatedIconHandle, AnimatedIconProps } from './types';
import { motion, useAnimate } from 'motion/react';

const SparklesIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  (
    { size = 24, color = 'currentColor', strokeWidth = 2, className = '' },
    ref,
  ) => {
    const [scope, animate] = useAnimate();
    const loopTimerRef = useRef<number | null>(null);
    const isRunningRef = useRef(false);
    const mainAngleRef = useRef(0);
    const topAngleRef = useRef(0);
    const bottomAngleRef = useRef(0);

    const start = useCallback(async () => {
      if (isRunningRef.current) return;
      isRunningRef.current = true;

      const runOnce = () => {
        if (!isRunningRef.current) return;

        const nextMain = mainAngleRef.current + 180;
        const nextTop = topAngleRef.current + 180;
        const nextBottom = bottomAngleRef.current + 180;

        animate(
          '.sparkle-main',
          { rotate: [mainAngleRef.current, nextMain] },
          { duration: 0.62, ease: 'easeInOut' },
        );

        animate(
          '.sparkle-top',
          { rotate: [topAngleRef.current, nextTop] },
          { duration: 0.56, ease: 'easeInOut', delay: 0.05 },
        );

        animate(
          '.sparkle-bottom',
          { rotate: [bottomAngleRef.current, nextBottom] },
          { duration: 0.58, ease: 'easeInOut', delay: 0.02 },
        );

        mainAngleRef.current = nextMain;
        topAngleRef.current = nextTop;
        bottomAngleRef.current = nextBottom;

        loopTimerRef.current = window.setTimeout(() => {
          if (!isRunningRef.current) return;
          loopTimerRef.current = window.setTimeout(runOnce, 460);
        }, 660);
      };

      runOnce();
    }, [animate]);

    const stop = useCallback(() => {
      isRunningRef.current = false;
      if (loopTimerRef.current) {
        window.clearTimeout(loopTimerRef.current);
        loopTimerRef.current = null;
      }
      animate(
        '.sparkle-main',
        { rotate: 0 },
        { duration: 0.25, ease: 'easeOut' },
      );
      animate(
        '.sparkle-top',
        { rotate: 0 },
        { duration: 0.25, ease: 'easeOut' },
      );
      animate(
        '.sparkle-bottom',
        { rotate: 0 },
        { duration: 0.25, ease: 'easeOut' },
      );
      mainAngleRef.current = 0;
      topAngleRef.current = 0;
      bottomAngleRef.current = 0;
    }, [animate]);

    useImperativeHandle(ref, () => ({
      startAnimation: start,
      stopAnimation: stop,
    }));

    return (
      <motion.svg
        ref={scope}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={{ overflow: 'visible' }}
      >
        <motion.path
          className="sparkle-bottom"
          d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2z"
          style={{ transformOrigin: '18px 18px' }}
        />

        <motion.path
          className="sparkle-top"
          d="M16 6a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2z"
          style={{ transformOrigin: '18px 6px' }}
        />

        <motion.path
          className="sparkle-main"
          d="M9 18a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z"
          style={{ transformOrigin: '9px 12px' }}
        />
      </motion.svg>
    );
  },
);

SparklesIcon.displayName = 'SparklesIcon';
export default SparklesIcon;
