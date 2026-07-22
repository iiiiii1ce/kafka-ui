import React, { useState } from 'react';
import Input from 'components/common/Input/Input';
import { useFormContext } from 'react-hook-form';
import SectionHeader from 'widgets/ClusterConfigForm/common/SectionHeader';
import SSLForm from 'widgets/ClusterConfigForm/common/SSLForm';
import Credentials from 'widgets/ClusterConfigForm/common/Credentials';
import { useTranslation } from 'react-i18next';

const SchemaRegistry = () => {
  const { t } = useTranslation();
  const { setValue, watch } = useFormContext();
  const schemaRegistry = watch('schemaRegistry');
  const [configOpen, setConfigOpen] = useState(false);
  const toggleConfig = () => {
    setConfigOpen((prevConfigOpen) => !prevConfigOpen);
    setValue(
      'schemaRegistry',
      schemaRegistry
        ? { isActive: false }
        : { isActive: true, url: '', isAuth: false },
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
        title={t('clusterConfig.sections.schemaRegistry')}
        adding={!configOpen}
        addButtonText={t('clusterConfig.actions.configureTechnical', {
          section: t('clusterConfig.sections.schemaRegistry'),
        })}
        onClick={toggleConfig}
      />
      {configOpen && (
        <>
          <Input
            label={t('clusterConfig.fields.url')}
            name="schemaRegistry.url"
            type="text"
            placeholder="http://localhost:8081"
            withError
          />
          <Credentials
            prefix="schemaRegistry"
            title={t('clusterConfig.questions.schemaRegistryAuth')}
          />
          <SSLForm
            prefix="schemaRegistry.keystore"
            title={t('clusterConfig.sections.keystore')}
          />
        </>
      )}
    </>
  );
};
export default SchemaRegistry;
