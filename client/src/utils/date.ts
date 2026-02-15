import { format, formatDistanceToNow } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';

/**
 * Returns the correct date-fns locale based on the language string.
 */
export const getDateLocale = (lang: string) => {
  if (lang?.startsWith('tr')) return tr;
  return enUS;
};

/**
 * Formats a date using date-fns and the provided locale.
 * @param date The date to format
 * @param formatStr The format string or a key from translation (passed as the actual pattern)
 * @param lang Current language
 */
export const formatDate = (
  date: Date | string | number | null | undefined,
  formatStr: string = 'PPp',
  lang: string = 'en'
): string => {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return format(d, formatStr, { locale: getDateLocale(lang) });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Returns a relative time string (e.g. "2 days ago")
 * @param date The date to format
 * @param lang Current language
 */
export const formatRelative = (
  date: Date | string | number | null | undefined,
  lang: string = 'en'
): string => {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return formatDistanceToNow(d, {
      locale: getDateLocale(lang),
      addSuffix: true,
      includeSeconds: true,
    });
  } catch (error) {
    console.error('Error formatting relative date:', error);
    return '';
  }
};
