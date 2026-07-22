import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { render } from 'lib/testHelpers';
import i18n from 'i18n';
import ClusterConfigForm from 'widgets/ClusterConfigForm';
import createFormSchema from 'widgets/ClusterConfigForm/schema';

describe('ClusterConfigForm localization', () => {
  it('renders the cluster form and expandable sections in Chinese', async () => {
    await i18n.changeLanguage('zh-CN');

    render(<ClusterConfigForm />);

    expect(
      screen.getByRole('heading', { name: 'Kafka 集群' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('集群名称 *')).toBeInTheDocument();
    expect(
      screen.getByText('应用要连接的 Kafka 代理节点列表。')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '保存配置' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '配置身份认证' }));

    expect(await screen.findByText('认证方式')).toBeInTheDocument();
    expect(await screen.findByText('选择认证方式')).toBeInTheDocument();
  });

  it('returns localized validation messages', async () => {
    await i18n.changeLanguage('zh-CN');
    const schema = createFormSchema(i18n.t);

    await expect(
      schema.validate({
        name: 'ab',
        readOnly: false,
        bootstrapServers: [{ host: 'localhost', port: 9092 }],
      })
    ).rejects.toThrow('集群名称至少需要 3 个字符');
  });
});
