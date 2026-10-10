import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { en } from "../translations/en";
import { hi } from "../translations/hi";
import { mr } from "../translations/mr";
import { pa } from "../translations/pa";
import { te } from "../translations/te";
import { bn } from "../translations/bn";

const LOCAL_STORAGE_KEY = "kisanguard_language";

export type LanguageCode = "en" | "hi" | "mr" | "pa" | "te" | "bn";

export const LANGUAGES: Record<LanguageCode, { label: string; native: string }> = {
    en: { label: "English", native: "English" },
    hi: { label: "Hindi", native: "हिन्दी" },
    mr: { label: "Marathi", native: "मराठी" },
    pa: { label: "Punjabi", native: "ਪੰਜਾਬੀ" },
    te: { label: "Telugu", native: "తెలుగు" },
    bn: { label: "Bengali", native: "বাংলা" }
};

const dictionaries: Record<LanguageCode, typeof en> = {
    en,
    hi,
    mr,
    pa,
    te,
    bn
};

type NestedKeyOf<ObjectType extends object> = {
    [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<typeof en>;

interface LanguageContextType {
    language: LanguageCode;
    setLanguage: (lang: LanguageCode) => void;
    t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<LanguageCode>("en");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY) as LanguageCode;
        if (saved && dictionaries[saved]) {
            setLanguageState(saved);
        }
        setMounted(true);
    }, []);

    const setLanguage = (lang: LanguageCode) => {
        setLanguageState(lang);
        localStorage.setItem(LOCAL_STORAGE_KEY, lang);
    };

    const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
        const keys = key.split(".");
        let value: any = dictionaries[language];
        for (const k of keys) {
            if (value === undefined) break;
            value = value[k];
        }

        // Fallback to English if translation is missing
        if (value === undefined) {
            value = dictionaries["en"];
            for (const k of keys) {
                if (value === undefined) break;
                value = value[k];
            }
        }

        if (typeof value !== "string") {
            return key; // return key if not found
        }

        if (params) {
            return Object.entries(params).reduce(
                (str, [k, v]) => str.replace(new RegExp(`{${k}}`, "g"), String(v)),
                value
            );
        }

        return value;
    };

    const contextValue = useMemo(() => ({ language, setLanguage, t }), [language]);

    // Avoid hydration mismatch by waiting till mount
    if (!mounted) return null;

    return (
        <LanguageContext.Provider value={contextValue}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
}
