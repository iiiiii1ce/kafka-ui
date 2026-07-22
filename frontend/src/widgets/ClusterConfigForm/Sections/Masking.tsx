import * as React from 'react';
import * as S from 'widgets/ClusterConfigForm/ClusterConfigForm.styled';
import { Button } from 'components/common/Button/Button';
import Input from 'components/common/Input/Input';
import { useFieldArray, useFormContext } from 'react-hook-form';
import PlusIcon from 'components/common/Icons/PlusIcon';
import IconButtonWrapper from 'components/common/Icons/IconButtonWrapper';
import CloseCircleIcon from 'components/common/Icons/CloseCircleIcon';
import {
  FieldContainer,
  FieldWrapper,
  FlexGrow1,
  FlexRow,
} from 'widgets/ClusterConfigForm/ClusterConfigForm.styled';
import SectionHeader from 'widgets/ClusterConfigForm/common/SectionHeader';
import { MASKING_OPTIONS } from 'lib/constants';
import ControlledSelect from 'components/common/Select/ControlledSelect';
import { FormError } from 'components/common/Input/Input.styled';
import { ErrorMessage } from '@hookform/error-message';
import { useTranslation } from 'react-i18next';

const Fields = ({ nestedIdx }: { nestedIdx: number }) => {
  const { t } = useTranslation();
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `masking.${nestedIdx}.fields`,
  });

  const handleAppend = () => append({ value: '' });

  return (
    <FlexGrow1>
      <FieldWrapper>
        <FieldWrapper>
          {fields.map((item, index) => (
            <FieldContainer key={item.id}>
              <Input
                label={t('clusterConfig.fields.field')}
                name={`masking.${nestedIdx}.fields.${index}.value`}
                placeholder={t('clusterConfig.fields.field')}
                type="text"
                withError
              />

              {fields.length > 1 && (
                <S.RemoveButton
                  style={{ marginTop: '18px' }}
                  onClick={() => remove(index)}
                >
                  <IconButtonWrapper
                    aria-label={t('clusterConfig.actions.removeItem')}
                  >
                    <CloseCircleIcon aria-hidden />
                  </IconButtonWrapper>
                </S.RemoveButton>
              )}
            </FieldContainer>
          ))}
        </FieldWrapper>

        <Button
          style={{ marginTop: '20px' }}
          type="button"
          buttonSize="M"
          buttonType="secondary"
          onClick={handleAppend}
        >
          <PlusIcon />
          {t('clusterConfig.actions.addField')}
        </Button>
      </FieldWrapper>

      <FormError>
        <ErrorMessage name={`masking.${nestedIdx}.fields`} />
      </FormError>
    </FlexGrow1>
  );
};

const MaskingCharReplacement = ({ nestedIdx }: { nestedIdx: number }) => {
  const { t } = useTranslation();
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `masking.${nestedIdx}.maskingCharsReplacement`,
  });

  const handleAppend = () => append({ value: '' });

  return (
    <FlexGrow1>
      <FieldWrapper>
        <FieldWrapper>
          {fields.map((item, index) => (
            <FieldContainer key={item.id}>
              <Input
                label={t('clusterConfig.fields.field')}
                name={`masking.${nestedIdx}.maskingCharsReplacement.${index}.value`}
                placeholder={t('clusterConfig.fields.field')}
                type="text"
                withError
              />

              {fields.length > 1 && (
                <S.RemoveButton
                  style={{ marginTop: '18px' }}
                  onClick={() => remove(index)}
                >
                  <IconButtonWrapper
                    aria-label={t('clusterConfig.actions.removeItem')}
                  >
                    <CloseCircleIcon aria-hidden />
                  </IconButtonWrapper>
                </S.RemoveButton>
              )}
            </FieldContainer>
          ))}
        </FieldWrapper>

        <Button
          style={{ marginTop: '20px' }}
          type="button"
          buttonSize="M"
          buttonType="secondary"
          onClick={handleAppend}
        >
          <PlusIcon />
          {t('clusterConfig.actions.addMaskingReplacement')}
        </Button>
      </FieldWrapper>

      <FormError>
        <ErrorMessage name={`masking.${nestedIdx}.maskingCharsReplacement`} />
      </FormError>
    </FlexGrow1>
  );
};

const Masking = () => {
  const { t } = useTranslation();
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'masking',
  });
  const handleAppend = () =>
    append({
      type: undefined,
      fields: [{ value: '' }],
      fieldsNamePattern: '',
      maskingCharsReplacement: [{ value: '' }],
      replacement: '',
      topicKeysPattern: '',
      topicValuesPattern: '',
    });
  const toggleConfig = () => (fields.length === 0 ? handleAppend() : remove());

  const hasFields = fields.length > 0;
  const maskingOptions = React.useMemo(
    () =>
      MASKING_OPTIONS.map((option) => ({
        ...option,
        label: t(`clusterConfig.options.${option.value.toLowerCase()}`),
      })),
    [t]
  );

  return (
    <>
      <SectionHeader
        title={t('clusterConfig.sections.masking')}
        addButtonText={t('clusterConfig.actions.configure', {
          section: t('clusterConfig.sections.masking'),
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
                  <ControlledSelect
                    name={`masking.${index}.type`}
                    label={t('clusterConfig.fields.maskingType')}
                    placeholder={t('clusterConfig.placeholders.maskingType')}
                    options={maskingOptions}
                  />
                  <Fields nestedIdx={index} />
                  <Input
                    label={t('clusterConfig.fields.fieldsNamePattern')}
                    name={`masking.${index}.fieldsNamePattern`}
                    placeholder={t('clusterConfig.placeholders.pattern')}
                    type="text"
                    withError
                  />
                  <MaskingCharReplacement nestedIdx={index} />
                  <Input
                    label={t('clusterConfig.fields.replacement')}
                    name={`masking.${index}.replacement`}
                    placeholder={t('clusterConfig.fields.replacement')}
                    type="text"
                  />
                  <Input
                    label={t('clusterConfig.fields.optionalTopicKeysPattern')}
                    name={`masking.${index}.topicKeysPattern`}
                    placeholder={t('clusterConfig.placeholders.keysPattern')}
                    type="text"
                  />
                  <Input
                    label={t('clusterConfig.fields.optionalTopicValuesPattern')}
                    name={`masking.${index}.topicValuesPattern`}
                    placeholder={t('clusterConfig.placeholders.valuesPattern')}
                    type="text"
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
            {t('clusterConfig.actions.addMasking')}
          </Button>
        </S.GroupFieldWrapper>
      )}
    </>
  );
};
export default Masking;
