import { FontResolver, createStyled } from '@gluestack-style/react';
import { Platform } from 'react-native';

import { aliases } from './aliases';
import { fontSizes } from './fontSizes';
import { fontWeights } from './fontWeights';
import { lineHeights } from './lineHeights';
import { radii } from './radii';
import { space } from './space';

export const theme = {
  aliases,
  radii,
  space,
  fontWeights,
  fontSizes,
  lineHeights,
};

export const styled = createStyled([
  new FontResolver({
    mapFonts: (style) => {
      if (Platform.OS !== 'web') {
        style.fontFamily =
          style.fontFamily +
          '_' +
          style.fontWeight +
          (style.fontStyle === 'italic' ? `_italic` : '');
        style.fontWeight = undefined;
        style.fontStyle = undefined;
      }
    },
  }),
]);
