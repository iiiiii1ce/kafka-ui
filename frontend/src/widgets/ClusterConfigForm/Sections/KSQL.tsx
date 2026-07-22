import React, { useState } from 'react';
import Input from 'components/common/Input/Input';
import { useFormContext } from 'react-hook-form';
import SectionHeader from 'widgets/ClusterConfigForm/common/SectionHeader';
import SSLForm from 'widgets/ClusterConfigForm/common/SSLForm';
import Credentials from 'widgets/ClusterConfigForm/common/Credentials';
import { useTranslation } from 'react-i18next';

const KSQL = () => {
  const { t } = useTranslation();
  const { setValue, watch } = useFormContext();
  const ksql = watch('ksql');
  const [configOpen, setConfigOpen] = useState(false);
  const toggleConfig = () => {
    setConfigOpen((prevConfigOpen) => !prevConfigOpen);
    setValue(
      'ksql',
      ksql ? { isActive: false } : { isActive: false, url: '', isAuth: false },
      {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      }
    );
  };
  return (
    <>
      <SectionHeader
        title={t('clusterConfig.sections.ksqlDb')}
        adding={!configOpen}
        addButtonText={t('clusterConfig.actions.configureTechnical', {
          section: t('clusterConfig.sections.ksqlDb'),
        })}
        onClick={toggleConfig}
      />
      {configOpen && (
        <>
          <Input
            label={t('clusterConfig.fields.url')}
            name="ksql.url"
            type="text"
            placeholder="http://localhost:8088"
            withError
          />
          <Credentials
            prefix="ksql"
            title={t('clusterConfig.questions.ksqlAuth')}
          />
          <SSLForm
            prefix="ksql.keystore"
            title={t('clusterConfig.sections.ksqlKeystore')}
          />
        </>
      )}
    </>
  );
};
export default KSQL;
