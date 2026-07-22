import * as React from 'react';
import * as S from 'widgets/ClusterConfigForm/ClusterConfigForm.styled';
import { Button } from 'components/common/Button/Button';
import Input from 'components/common/Input/Input';
import { useFieldArray, useFormContext } from 'react-hook-form';
import PlusIcon from 'components/common/Icons/PlusIcon';
import CloseCircleIcon from 'components/common/Icons/CloseCircleIcon';
import Heading from 'components/common/heading/Heading.styled';
import { useTranslation } from 'react-i18next';

const PropertiesFields = ({ nestedId }: { nestedId: number }) => {
  const { t } = useTranslation();
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `serde.${nestedId}.properties`,
  });

  return (
    <S.GroupFieldWrapper>
      <Heading level={4}>{t('clusterConfig.fields.serdeProperties')}</Heading>
      {fields.map((propsField, propsIndex) => (
        <S.SerdeProperties key={propsField.id}>
          <Input
            name={`serde.${nestedId}.properties.${propsIndex}.key`}
            placeholder={t('clusterConfig.fields.key')}
            type="text"
            withError
          />
          <Input
            name={`serde.${nestedId}.properties.${propsIndex}.value`}
            placeholder={t('clusterConfig.fields.value')}
            type="text"
            withError
          />
          <S.SerdePropertiesActions
            aria-label={t('clusterConfig.actions.removeItem')}
            onClick={() => remove(propsIndex)}
          >
            <CloseCircleIcon aria-hidden />
          </S.SerdePropertiesActions>
        </S.SerdeProperties>
      ))}
      <div>
        <Button
          type="button"
          buttonSize="M"
          buttonType="secondary"
          onClick={() => append({ key: '', value: '' })}
        >
          <PlusIcon />
          {t('clusterConfig.actions.addProperty')}
        </Button>
      </div>
    </S.GroupFieldWrapper>
  );
};

export default PropertiesFields;
