import React from 'react';
import Input from 'components/common/Input/Input';
import Checkbox from 'components/common/Checkbox/Checkbox';
import Fileupload from 'widgets/ClusterConfigForm/common/Fileupload';
import SSLForm from 'widgets/ClusterConfigForm/common/SSLForm';
import Credentials from 'widgets/ClusterConfigForm/common/Credentials';
import { useTranslation } from 'react-i18next';

const AuthenticationMethods: React.FC<{ method: string }> = ({ method }) => {
  const { t } = useTranslation();
  switch (method) {
    case 'SASL/JAAS':
      return (
        <>
          <Input
            type="text"
            name="auth.props.saslJaasConfig"
            label="sasl.jaas.config"
            withError
          />
          <Input
            type="text"
            name="auth.props.saslMechanism"
            label="sasl.mechanism"
            withError
          />
        </>
      );
    case 'SASL/GSSAPI':
      return (
        <>
          <Input
            label={t('clusterConfig.fields.kerberosServiceName')}
            type="text"
            name="auth.props.saslKerberosServiceName"
            withError
          />
          <Checkbox
            name="auth.props.storeKey"
            label={t('clusterConfig.fields.storeKey')}
          />
          <Fileupload
            name="auth.props.keyTabFile"
            label={t('clusterConfig.fields.keyTab')}
          />
          <Input
            type="text"
            name="auth.props.principal"
            label={t('clusterConfig.fields.principal')}
            withError
          />
        </>
      );
    case 'SASL/OAUTHBEARER':
      return (
        <Input
          label={t('clusterConfig.fields.unsecuredClaim')}
          type="text"
          name="auth.props.unsecuredLoginStringClaim_sub"
          withError
        />
      );
    case 'SASL/PLAIN':
    case 'SASL/SCRAM-256':
    case 'SASL/SCRAM-512':
    case 'SASL/LDAP':
      return <Credentials prefix="auth.props" />;
    case 'Delegation tokens':
      return (
        <>
          <Input
            label={t('clusterConfig.fields.tokenId')}
            type="text"
            name="auth.props.tokenId"
            withError
          />
          <Input
            label={t('clusterConfig.fields.tokenValue')}
            type="text"
            name="auth.props.tokenValue"
            withError
          />
        </>
      );
    case 'SASL/AWS IAM':
      return (
        <>
          <Input
            label={t('clusterConfig.fields.awsProfileName')}
            type="text"
            name="auth.props.awsProfileName"
            withError
          />
          <Input
            label={t('clusterConfig.fields.awsRoleArn')}
            type="text"
            name="auth.props.awsRoleArn"
            withError
          />
          <Input
            label={t('clusterConfig.fields.awsRoleSessionName')}
            type="text"
            name="auth.props.awsRoleSessionName"
            withError
          />
          <Input
            label={t('clusterConfig.fields.awsStsRegion')}
            type="text"
            name="auth.props.awsStsRegion"
            withError
          />
        </>
      );
    case 'mTLS':
      return (
        <SSLForm
          prefix="auth.keystore"
          title={t('clusterConfig.sections.keystore')}
        />
      );
    default:
      return null;
  }
};

export default AuthenticationMethods;
