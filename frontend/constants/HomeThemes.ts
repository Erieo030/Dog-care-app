/** 用途：集中管理首頁居家照護世界的素材與輔助色彩。 */
import { ImageSourcePropType } from 'react-native';
import { HomeThemeId } from './HomeThemeIds';

export { DEFAULT_HOME_THEME, HOME_THEME_IDS, isHomeThemeId } from './HomeThemeIds';

export interface HomeTheme {
  id: HomeThemeId;
  title: string;
  description: string;
  background: ImageSourcePropType;
  marker: ImageSourcePropType;
  canvasWidth: number;
  canvasHeight: number;
  accent: string;
  iconSurface: string;
  iconBorder: string;
  iconColor: string;
  labelSurface: string;
}

export const HOME_THEMES: Record<HomeThemeId, HomeTheme> = {
  'morning-home': {
    id: 'morning-home',
    title: '晨光小屋',
    description: '窗邊晨光、牽繩與水碗，安靜開始今天的照護。',
    marker: require('../assets/artwork/themes/morning-home/marker-v1.webp'),
    background: require('../assets/artwork/themes/morning-home/background-v2.webp'),
    canvasWidth: 864,
    canvasHeight: 1820,
    accent: '#B7653B',
    iconSurface: 'rgba(243, 237, 220, 0.94)',
    iconBorder: 'rgba(183, 101, 59, 0.28)',
    iconColor: '#A9603D',
    labelSurface: 'rgba(255, 249, 239, 0.78)',
  },
  'afternoon-living-room': {
    id: 'afternoon-living-room',
    title: '午後客廳',
    description: '暖燈、玩具與水碗，留下一段安心的陪伴時光。',
    marker: require('../assets/artwork/themes/afternoon-living-room/marker-v1.webp'),
    background: require('../assets/artwork/themes/afternoon-living-room/background-v2.webp'),
    canvasWidth: 864,
    canvasHeight: 1821,
    accent: '#A96846',
    iconSurface: 'rgba(245, 232, 218, 0.94)',
    iconBorder: 'rgba(169, 104, 70, 0.28)',
    iconColor: '#92593C',
    labelSurface: 'rgba(255, 247, 240, 0.78)',
  },
  'garden-walk': {
    id: 'garden-walk',
    title: '花園散步',
    description: '綠意、牽繩與石板路，收藏一起出門的好心情。',
    marker: require('../assets/artwork/themes/garden-walk/marker-v1.webp'),
    background: require('../assets/artwork/themes/garden-walk/background-v2.webp'),
    canvasWidth: 864,
    canvasHeight: 1820,
    accent: '#64866D',
    iconSurface: 'rgba(230, 241, 231, 0.94)',
    iconBorder: 'rgba(100, 134, 109, 0.28)',
    iconColor: '#597A61',
    labelSurface: 'rgba(246, 250, 244, 0.78)',
  },
};
export const HOME_THEME_HEALTH_EMPTY_ARTWORK: Record<HomeThemeId, ImageSourcePropType> = {
  'morning-home': require('../assets/artwork/themes/morning-home/page-decorations/health-empty-v1.webp'),
  'afternoon-living-room': require('../assets/artwork/themes/afternoon-living-room/page-decorations/health-empty-v1.webp'),
  'garden-walk': require('../assets/artwork/themes/garden-walk/page-decorations/health-empty-v1.webp'),
};
