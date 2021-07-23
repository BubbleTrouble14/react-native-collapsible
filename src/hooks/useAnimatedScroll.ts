/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useState } from 'react';
import { Dimensions, LayoutChangeEvent } from 'react-native';
import {
  runOnJS,
  useAnimatedScrollHandler,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import { useCollapsibleContext } from './useCollapsibleContext';
import { useInternalCollapsibleContext } from './useInternalCollapsibleContext';

const { height: wHeight } = Dimensions.get('window');

type Props = {
  persistHeaderHeight: number;
  headerSnappable: boolean;
  scrollTo: (yValue: number, animated?: boolean) => void;
};

export default function useAnimatedScroll({
  persistHeaderHeight,
  headerSnappable,
  scrollTo,
}: Props) {
  const scrollDirection = useSharedValue('unknown');
  const {
    scrollY,
    headerHeight,
    persistHeaderHeight: animatedPersistHeaderHeight,
    headerCollapsed,
    contentMinHeight,
  } = useCollapsibleContext();
  const { setCollapsibleHandlers } = useInternalCollapsibleContext();
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    if (scrollY.value > 0) {
      requestAnimationFrame(() => scrollTo(scrollY.value, false));
    }
  }, []);

  useEffect(() => {
    animatedPersistHeaderHeight.value = persistHeaderHeight;
  }, [persistHeaderHeight]);

  const collapse = useCallback(
    () => scrollTo(headerHeight.value - persistHeaderHeight),
    [scrollTo]
  );

  const expand = useCallback(() => scrollTo(0), [scrollTo]);

  useEffect(() => {
    setCollapsibleHandlers({
      collapse,
      expand,
    });
  }, [setCollapsibleHandlers, collapse, expand]);

  const scrollHandler = useAnimatedScrollHandler(
    {
      onScroll: (event) => {
        const offset = event.contentOffset.y;
        const diff = scrollY.value - offset;
        scrollDirection.value = diff > 0 ? 'down' : diff < 0 ? 'up' : 'unknown';
        scrollY.value = offset;
        const maxY = headerHeight.value - persistHeaderHeight;
        const isCollapsed = offset >= maxY;
        if (headerCollapsed) {
          headerCollapsed.value = isCollapsed;
        }
      },
      onEndDrag: () => {
        if (!headerSnappable) return;
        const maxY = headerHeight.value - persistHeaderHeight;
        if (scrollY.value < maxY) {
          const delta = Math.abs(scrollY.value - maxY);
          if (delta < wHeight / 2) {
            let yValue = 0;
            if (scrollDirection.value === 'up') {
              yValue = maxY;
            }
            runOnJS(scrollTo)(yValue);
          }
        }
      },
    },
    [scrollTo, persistHeaderHeight, headerSnappable]
  );

  const handleContainerLayout = useCallback((layout: LayoutChangeEvent) => {
    const height = layout.nativeEvent.layout.height;
    setContainerHeight(height);
  }, []);

  useDerivedValue(() => {
    contentMinHeight.value =
      containerHeight + headerHeight.value - persistHeaderHeight;
  }, [persistHeaderHeight, containerHeight]);

  return {
    scrollHandler,
    collapse,
    expand,
    handleContainerLayout,
  };
}
