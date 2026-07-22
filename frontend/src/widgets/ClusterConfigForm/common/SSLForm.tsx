import * as React from 'react';
import Input from 'components/common/Input/Input';
import Fileupload from 'widgets/ClusterConfigForm/common/Fileupload';
import * as S from 'widgets/ClusterConfigForm/ClusterConfigForm.styled';
import { useTranslation } from 'react-i18next';

type SSLFormProps = {
  prefix: string;
  title: string;
};

const SSLForm: React.FC<SSLFormProps> = ({ prefix, title }) => {
  const { t } = useTranslation();
  return (
    <S.GroupFieldWrapper>
      <Fileupload
        name={`${prefix}.location`}
        label={t('clusterConfig.fields.sslLocation', { title })}
      />
      <Input
        label={t('clusterConfig.fields.sslPassword', { title })}
        name={`${prefix}.password`}
        type="password"
        withError
      />
    </S.GroupFieldWrapper>
  );
};

export default SSLForm;
