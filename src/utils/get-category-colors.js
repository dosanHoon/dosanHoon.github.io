import { CATEGORY_COLORS, DEFAULT_CATEGORY_COLORS } from '../constants';

const getCategoryColors = (category) => CATEGORY_COLORS[category] || DEFAULT_CATEGORY_COLORS;

export default getCategoryColors;
