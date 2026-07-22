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
import { useTranslation } from 'react-i18next';

import PropertiesFields from './PropertiesFields';

const Serdes = () => {
  const { t } = useTranslation();
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'serde',
  });

  const handleAppend = () =>
    append({
      name: '',
      className: '',
      filePath: '',
      topicKeysPattern: '%s-key',
      topicValuesPattern: '%s-value',
    });
  const toggleConfig = () => (fields.length === 0 ? handleAppend() : remove());

  const hasFields = fields.length > 0;

  return (
    <>
      <SectionHeader
        title={t('clusterConfig.sections.serdes')}
        addButtonText={t('clusterConfig.actions.configureTechnical', {
          section: t('clusterConfig.sections.serdes'),
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
                    label={t('clusterConfig.fields.name')}
                    name={`serde.${index}.name`}
                    placeholder={t('clusterConfig.placeholders.name')}
                    type="text"
                    hint={t('clusterConfig.hints.serdeName')}
                    withError
                  />
                  <Input
                    label={t('clusterConfig.fields.className')}
                    name={`serde.${index}.className`}
                    placeholder={t('clusterConfig.placeholders.className')}
                    type="text"
                    hint={t('clusterConfig.hints.serdeClassName')}
                    withError
                  />
                  <Input
                    label={t('clusterConfig.fields.filePath')}
                    name={`serde.${index}.filePath`}
                    placeholder={t('clusterConfig.placeholders.serdeFilePath')}
                    type="text"
                    hint={t('clusterConfig.hints.serdeFilePath')}
                    withError
                  />
                  <Input
                    label={t('clusterConfig.fields.topicKeysPattern')}
                    name={`serde.${index}.topicKeysPattern`}
                    placeholder={t(
                      'clusterConfig.placeholders.topicKeysPattern'
                    )}
                    type="text"
                    hint={t('clusterConfig.hints.serdeKeysPattern')}
                    withError
                  />
                  <Input
                    label={t('clusterConfig.fields.topicValuesPattern')}
                    name={`serde.${index}.topicValuesPattern`}
                    placeholder={t(
                      'clusterConfig.placeholders.topicValuesPattern'
                    )}
                    type="text"
                    hint={t('clusterConfig.hints.serdeValuesPattern')}
                    withError
                  />
                  <hr />
                  <PropertiesFields nestedId={index} />
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
            {t('clusterConfig.actions.addSerde')}
          </Button>
        </S.GroupFieldWrapper>
      )}
    </>
  );
};
export default Serdes;
