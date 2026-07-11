import { createI18n } from "vue-i18n/dist/vue-i18n.esm-browser.prod.js";
import en from "./lang/en.json";

// Seede XR is English-only. Keeping just `en` avoids shipping 70+ locale chunks
// and the translation-maintenance burden. (Other src/lang/*.json files were removed.)
const languageList = {};

let messages = {
    en,
};

for (let lang in languageList) {
    messages[lang] = {
        languageName: languageList[lang],
    };
}

const rtlLangs = [];

/**
 * Find the best matching locale to display
 * If no locale can be matched, the default is "en"
 * @returns {string} the locale that should be displayed
 */
export function currentLocale() {
    for (const locale of [localStorage.locale, navigator.language, ...navigator.languages]) {
        // localstorage might not have a value or there might not be a language in `navigator.language`
        if (!locale) {
            continue;
        }
        if (locale in messages) {
            return locale;
        }
        // If the locale is a 2-letter code, we can try to find a regional variant
        // e.g. "fr" may not be in the messages, but "fr-FR" is
        if (locale.length === 2) {
            const regionalLocale = `${locale}-${locale.toUpperCase()}`;
            if (regionalLocale in messages) {
                return regionalLocale;
            }
        } else {
            // Some locales are further specified such as "en-US".
            // If we only have a generic locale for this, we can use it too
            const genericLocale = locale.slice(0, 2);
            if (genericLocale in messages) {
                return genericLocale;
            }
        }
    }
    return "en";
}

export const localeDirection = () => {
    return rtlLangs.includes(currentLocale()) ? "rtl" : "ltr";
};

export const i18n = createI18n({
    locale: currentLocale(),
    fallbackLocale: "en",
    silentFallbackWarn: true,
    silentTranslationWarn: true,
    messages: messages,
});
