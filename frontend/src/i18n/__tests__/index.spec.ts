import { normalizeLanguage } from 'i18n';

describe('normalizeLanguage', () => {
  it.each([
    ['zh', 'zh-CN'],
    ['zh-TW', 'zh-CN'],
    ['zh-CN', 'zh-CN'],
    ['en-US', 'en'],
    ['fr-FR', 'en'],
    [undefined, 'en'],
  ])('normalizes %s to %s', (language, expected) => {
    expect(normalizeLanguage(language)).toBe(expected);
  });
});
