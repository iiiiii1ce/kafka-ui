import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { render } from 'lib/testHelpers';
import i18n, { LANGUAGE_STORAGE_KEY } from 'i18n';
import LanguageSwitcher from 'components/NavBar/LanguageSwitcher/LanguageSwitcher';

describe('LanguageSwitcher', () => {
  it('switches to Chinese and persists the preference', async () => {
    render(<LanguageSwitcher />);

    fireEvent.click(screen.getByRole('listbox', { name: 'Language' }));
    fireEvent.click(screen.getByRole('option', { name: '中文' }));

    expect(
      await screen.findByRole('listbox', { name: '语言' })
    ).toHaveTextContent('中文');
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('zh-CN');
    expect(document.documentElement.lang).toBe('zh-CN');
    expect(i18n.resolvedLanguage).toBe('zh-CN');
  });

  it('supports keyboard selection', async () => {
    render(<LanguageSwitcher />);

    fireEvent.keyDown(screen.getByRole('listbox', { name: 'Language' }), {
      key: 'Enter',
    });
    fireEvent.keyDown(screen.getByRole('option', { name: '中文' }), {
      key: 'Enter',
    });

    expect(
      await screen.findByRole('listbox', { name: '语言' })
    ).toHaveTextContent('中文');
  });
});
