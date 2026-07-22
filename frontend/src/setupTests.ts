import 'whatwg-fetch';
import 'jest-styled-components';
import '@testing-library/jest-dom/jest-globals';
import i18n, { LANGUAGE_STORAGE_KEY } from 'i18n';

beforeEach(() => {
  window.localStorage.removeItem(LANGUAGE_STORAGE_KEY);
  i18n.changeLanguage('en');
});
