import React from 'react';
import Select, { SelectOption } from 'components/common/Select/Select';
import { useTranslation } from 'react-i18next';
import { normalizeLanguage, SupportedLanguage } from 'i18n';

const languageOptions: SelectOption<SupportedLanguage>[] = [
  { label: 'English', value: 'en' },
  { label: '中文', value: 'zh-CN' },
];

const LanguageSwitcher = () => {
  const { t, i18n } = useTranslation();
  const currentLanguage = normalizeLanguage(i18n.resolvedLanguage);

  const handleLanguageChange = (language: SupportedLanguage) => {
    i18n.changeLanguage(language);
  };

  return (
    <Select
      aria-label={t('navbar.language')}
      options={languageOptions}
      value={currentLanguage}
      onChange={handleLanguageChange}
      selectSize="M"
      minWidth="86px"
      formatSelectedOption={({ value }) => (value === 'zh-CN' ? '中文' : 'EN')}
    />
  );
};

export default LanguageSwitcher;
