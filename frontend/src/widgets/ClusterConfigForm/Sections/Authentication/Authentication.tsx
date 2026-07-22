import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { AUTH_OPTIONS, SECURITY_PROTOCOL_OPTIONS } from 'lib/constants';
import ControlledSelect from 'components/common/Select/ControlledSelect';
import SectionHeader from 'widgets/ClusterConfigForm/common/SectionHeader';
import { useTranslation } from 'react-i18next';

import AuthenticationMethods from './AuthenticationMethods';

const Authentication: React.FC = () => {
  const { t } = useTranslation();
  const { watch, setValue } = useFormContext();
  const hasAuth = !!watch('auth');
  const authMethod = watch('auth.method');
  const [configOpen, setConfigOpen] = useState(false);
  const hasSecurityProtocolField =
    authMethod && !['Delegation tokens', 'mTLS'].includes(authMethod);
  const authOptions = React.useMemo(
    () =>
      AUTH_OPTIONS.map((option) =>
        option.value === 'Delegation tokens'
          ? { ...option, label: t('clusterConfig.options.delegationTokens') }
          : option
      ),
    [t]
  );

  const toggle = () => {
    setConfigOpen((prevConfigOpen) => !prevConfigOpen);
    setValue('auth', hasAuth ? { isActive: false } : { isActive: true }, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  return (
    <>
      <SectionHeader
        title={t('clusterConfig.sections.authentication')}
        adding={!configOpen}
        addButtonText={t('clusterConfig.actions.configure', {
          section: t('clusterConfig.sections.authentication'),
        })}
        onClick={toggle}
      />
      {configOpen && (
        <>
          <ControlledSelect
            name="auth.method"
            label={t('clusterConfig.fields.authMethod')}
            placeholder={t('clusterConfig.placeholders.authMethod')}
            options={authOptions}
          />
          {hasSecurityProtocolField && (
            <ControlledSelect
              name="auth.securityProtocol"
              label={t('clusterConfig.fields.securityProtocol')}
              placeholder={t('clusterConfig.placeholders.securityProtocol')}
              options={SECURITY_PROTOCOL_OPTIONS}
            />
          )}
          <AuthenticationMethods method={authMethod} />
        </>
      )}
    </>
  );
};

export default Authentication;
