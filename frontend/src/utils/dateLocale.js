import i18n from "../i18n/i18n";
import { el, enUS } from "date-fns/locale";

const localeMap = { en: "en-US", gr: "el-GR" };
const dateFnsLocaleMap = { en: enUS, gr: el };

/** BCP 47 locale string for toLocaleDateString/toLocaleString */
export const getDateLocale = () => localeMap[i18n.language] || "el-GR";

/** date-fns locale object for format() */
export const getDateFnsLocale = () => dateFnsLocaleMap[i18n.language] || el;
