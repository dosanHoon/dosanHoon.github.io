import { CATEGORY_LABELS } from '../constants';

const getCategoryLabel = (category) => CATEGORY_LABELS[category] || category;

export default getCategoryLabel;
