// i18n translation keys
export const i18nKeys = {
  common: {
    loading: "common.loading",
    error: "common.error",
    save: "common.save",
    cancel: "common.cancel",
    delete: "common.delete",
  },
} as const;

export type I18nKey = typeof i18nKeys;
