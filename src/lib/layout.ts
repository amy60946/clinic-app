import { useWindowDimensions } from 'react-native';

// Geniş ekran (web/iPad yatay): danışan listesi ve ayrıntı yan yana
export const useWide = () => useWindowDimensions().width >= 900;
