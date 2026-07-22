import * as React from 'react';
import Input from 'components/common/Input/Input';
import * as S from 'widgets/ClusterConfigForm/ClusterConfigForm.styled';
import Checkbox from 'components/common/Checkbox/Checkbox';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

type CredentialsProps = {
  prefix: string;
  title?: string;
};

const Credentials: React.FC<CredentialsProps> = ({ prefix, title }) => {
  const { t } = useTranslation();
  const { watch } = useFormContext();
  const resolvedTitle = title ?? t('clusterConfig.fields.securedWithAuth');

  return (
    <S.GroupFieldWrapper>
      <Checkbox name={`${prefix}.isAuth`} label={resolvedTitle} />
      {watch(`${prefix}.isAuth`) && (
        <S.FlexRow>
          <S.FlexGrow1>
            <Input
              label={t('clusterConfig.fields.username')}
              type="text"
              name={`${prefix}.username`}
              withError
            />
          </S.FlexGrow1>
          <S.FlexGrow1>
            <Input
              label={t('clusterConfig.fields.password')}
              type="password"
              name={`${prefix}.password`}
              withError
            />
          </S.FlexGrow1>
        </S.FlexRow>
      )}
    </S.GroupFieldWrapper>
  );
};

export default Credentials;
