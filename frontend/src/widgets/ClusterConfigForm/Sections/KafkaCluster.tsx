import React, { useState } from 'react';
import Input from 'components/common/Input/Input';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { FormError, InputHint } from 'components/common/Input/Input.styled';
import { ErrorMessage } from '@hookform/error-message';
import CloseCircleIcon from 'components/common/Icons/CloseCircleIcon';
import { Button } from 'components/common/Button/Button';
import PlusIcon from 'components/common/Icons/PlusIcon';
import * as S from 'widgets/ClusterConfigForm/ClusterConfigForm.styled';
import Heading from 'components/common/heading/Heading.styled';
import { InputLabel } from 'components/common/Input/InputLabel.styled';
import Checkbox from 'components/common/Checkbox/Checkbox';
import SectionHeader from 'widgets/ClusterConfigForm/common/SectionHeader';
import SSLForm from 'widgets/ClusterConfigForm/common/SSLForm';
import { useTranslation } from 'react-i18next';

const KafkaCluster: React.FC = () => {
  const { t } = useTranslation();
  const { control, watch, setValue } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'bootstrapServers',
  });

  const [hasTrustStore, setHasTrustStore] = useState(false);

  const toggleSection = (section: string) => () => {
    setHasTrustStore((prevConfigOpen) => !prevConfigOpen);
    setValue(
      section,
      watch(section)
        ? { isActive: false }
        : {
            isActive: true,
            location: '',
            password: '',
          },
      { shouldValidate: true, shouldDirty: true, shouldTouch: true }
    );
  };

  return (
    <>
      <Heading level={3}>{t('clusterConfig.sections.kafkaCluster')}</Heading>
      <Input
        label={t('clusterConfig.fields.clusterName')}
        type="text"
        name="name"
        withError
        hint={t('clusterConfig.hints.clusterName')}
      />
      <Checkbox
        name="readOnly"
        label={t('clusterConfig.fields.readOnly')}
        hint={t('clusterConfig.hints.readOnly')}
      />
      <div>
        <InputLabel htmlFor="bootstrapServers">
          {t('clusterConfig.fields.bootstrapServers')}
        </InputLabel>
        <InputHint>{t('clusterConfig.hints.bootstrapServers')}</InputHint>
        <S.GroupFieldWrapper>
          {fields.map((field, index) => (
            <S.BootstrapServer key={field.id}>
              <div>
                <Input
                  name={`bootstrapServers.${index}.host`}
                  placeholder={t('clusterConfig.fields.host')}
                  type="text"
                  inputSize="L"
                  withError
                />
              </div>
              <div>
                <Input
                  name={`bootstrapServers.${index}.port`}
                  placeholder={t('clusterConfig.fields.port')}
                  type="number"
                  positiveOnly
                  withError
                />
              </div>
              <S.BootstrapServerActions
                aria-label={t('clusterConfig.actions.removeItem')}
                onClick={() => remove(index)}
              >
                <CloseCircleIcon aria-hidden />
              </S.BootstrapServerActions>
            </S.BootstrapServer>
          ))}
          <FormError>
            <ErrorMessage name="bootstrapServers" />
          </FormError>
          <div>
            <Button
              type="button"
              buttonSize="M"
              buttonType="secondary"
              onClick={() => append({ host: '', port: '' })}
            >
              <PlusIcon />
              {t('clusterConfig.actions.addBootstrapServer')}
            </Button>
          </div>
        </S.GroupFieldWrapper>
      </div>
      <hr />
      <SectionHeader
        title={t('clusterConfig.sections.truststore')}
        addButtonText={t('clusterConfig.actions.configure', {
          section: t('clusterConfig.sections.truststore'),
        })}
        adding={!hasTrustStore}
        onClick={toggleSection('truststore')}
      />
      {hasTrustStore && (
        <SSLForm
          prefix="truststore"
          title={t('clusterConfig.sections.truststore')}
        />
      )}
    </>
  );
};
export default KafkaCluster;
