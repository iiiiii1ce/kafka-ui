import * as React from 'react';
import * as S from 'widgets/ClusterConfigForm/ClusterConfigForm.styled';
import { Button } from 'components/common/Button/Button';
import Input from 'components/common/Input/Input';
import { useFieldArray, useFormContext } from 'react-hook-form';
import PlusIcon from 'components/common/Icons/PlusIcon';
import IconButtonWrapper from 'components/common/Icons/IconButtonWrapper';
import CloseCircleIcon from 'components/common/Icons/CloseCircleIcon';
import {
  FlexGrow1,
  FlexRow,
} from 'widgets/ClusterConfigForm/ClusterConfigForm.styled';
import SectionHeader from 'widgets/ClusterConfigForm/common/SectionHeader';
import Credentials from 'widgets/ClusterConfigForm/common/Credentials';
import SSLForm from 'widgets/ClusterConfigForm/common/SSLForm';
import { useTranslation } from 'react-i18next';

const KafkaConnect = () => {
  const { t } = useTranslation();
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'kafkaConnect',
  });
  const handleAppend = () => append({ name: '', address: '' });
  const toggleConfig = () => (fields.length === 0 ? handleAppend() : remove());

  const hasFields = fields.length > 0;

  return (
    <>
      <SectionHeader
        title={t('clusterConfig.sections.kafkaConnect')}
        addButtonText={t('clusterConfig.actions.configureTechnical', {
          section: t('clusterConfig.sections.kafkaConnect'),
        })}
        adding={!hasFields}
        onClick={toggleConfig}
      />
      {hasFields && (
        <S.GroupFieldWrapper>
          {fields.map((item, index) => (
            <div key={item.id}>
              <FlexRow>
                <FlexGrow1>
                  <Input
                    label={t('clusterConfig.fields.connectName')}
                    name={`kafkaConnect.${index}.name`}
                    placeholder={t('clusterConfig.placeholders.name')}
                    type="text"
                    hint={t('clusterConfig.hints.connectName')}
                    withError
                  />
                  <Input
                    label={t('clusterConfig.fields.connectUrl')}
                    name={`kafkaConnect.${index}.address`}
                    placeholder={t('clusterConfig.placeholders.connectUrl')}
                    type="text"
                    hint={t('clusterConfig.hints.connectUrl')}
                    withError
                  />
                  <Credentials
                    prefix={`kafkaConnect.${index}`}
                    title={t('clusterConfig.questions.connectAuth')}
                  />
                  <SSLForm
                    prefix={`kafkaConnect.${index}.keystore`}
                    title={t('clusterConfig.sections.keystore')}
                  />
                </FlexGrow1>
                <S.RemoveButton onClick={() => remove(index)}>
                  <IconButtonWrapper
                    aria-label={t('clusterConfig.actions.removeItem')}
                  >
                    <CloseCircleIcon aria-hidden />
                  </IconButtonWrapper>
                </S.RemoveButton>
              </FlexRow>

              <hr />
            </div>
          ))}
          <Button
            type="button"
            buttonSize="M"
            buttonType="secondary"
            onClick={handleAppend}
          >
            <PlusIcon />
            {t('clusterConfig.actions.addKafkaConnect')}
          </Button>
        </S.GroupFieldWrapper>
      )}
    </>
  );
};
export default KafkaConnect;
