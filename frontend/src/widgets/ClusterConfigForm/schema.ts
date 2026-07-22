import { object, string, number, array, boolean, mixed, lazy } from 'yup';
import { ApplicationConfigPropertiesKafkaMaskingTypeEnum } from 'generated-sources';
import { TFunction } from 'i18next';

const createFormSchema = (t: TFunction) => {
  const requiredMessage = t('clusterConfig.validation.required');
  const fieldsOrPatternMessage = t('clusterConfig.validation.fieldsOrPattern');
  const requiredString = string().required(requiredMessage);

  const portSchema = number()
    .positive(t('clusterConfig.validation.positiveOnly'))
    .typeError(t('clusterConfig.validation.numbersOnly'))
    .required(requiredMessage);

  const bootstrapServerSchema = object({
    host: requiredString,
    port: portSchema,
  });

  const sslSchema = lazy((value) => {
    if (typeof value === 'object') {
      return object({
        location: string().when('password', {
          is: (v: string) => !!v,
          then: (schema) => schema.required(requiredMessage),
        }),
        password: string(),
      });
    }
    return mixed().optional();
  });

  const urlWithAuthSchema = lazy((value) => {
    if (typeof value === 'object') {
      return object({
        url: requiredString,
        isAuth: boolean(),
        username: string().when('isAuth', {
          is: true,
          then: (schema) => schema.required(requiredMessage),
        }),
        password: string().when('isAuth', {
          is: true,
          then: (schema) => schema.required(requiredMessage),
        }),
        keystore: sslSchema,
      });
    }
    return mixed().optional();
  });

  const serdeSchema = object({
    name: requiredString,
    className: requiredString,
    filePath: requiredString,
    topicKeysPattern: requiredString,
    topicValuesPattern: requiredString,
    properties: array().of(
      object({
        key: requiredString,
        value: requiredString,
      })
    ),
  });

  const serdesSchema = lazy((value) => {
    if (Array.isArray(value)) {
      return array().of(serdeSchema);
    }
    return mixed().optional();
  });

  const kafkaConnectSchema = object({
    name: requiredString,
    address: requiredString,
    isAuth: boolean(),
    username: string().when('isAuth', {
      is: true,
      then: (schema) => schema.required(requiredMessage),
    }),
    password: string().when('isAuth', {
      is: true,
      then: (schema) => schema.required(requiredMessage),
    }),
    keystore: sslSchema,
  });

  const kafkaConnectsSchema = lazy((value) => {
    if (Array.isArray(value)) {
      return array().of(kafkaConnectSchema);
    }
    return mixed().optional();
  });

  const metricsSchema = lazy((value) => {
    if (typeof value === 'object') {
      return object({
        type: string().oneOf(['JMX', 'PROMETHEUS']).required(requiredMessage),
        port: portSchema,
        isAuth: boolean(),
        username: string().when('isAuth', {
          is: true,
          then: (schema) => schema.required(requiredMessage),
        }),
        password: string().when('isAuth', {
          is: true,
          then: (schema) => schema.required(requiredMessage),
        }),
        keystore: sslSchema,
      });
    }
    return mixed().optional();
  });

  const authPropsSchema = lazy((_, { parent }) => {
    switch (parent.method) {
      case 'SASL/JAAS':
        return object({
          saslJaasConfig: requiredString,
          saslMechanism: requiredString,
        });
      case 'SASL/GSSAPI':
        return object({
          saslKerberosServiceName: requiredString,
          keyTabFile: string(),
          storeKey: boolean(),
          principal: requiredString,
        });
      case 'SASL/OAUTHBEARER':
        return object({
          unsecuredLoginStringClaim_sub: requiredString,
        });
      case 'SASL/PLAIN':
      case 'SASL/SCRAM-256':
      case 'SASL/SCRAM-512':
      case 'SASL/LDAP':
        return object({
          username: requiredString,
          password: requiredString,
        });
      case 'Delegation tokens':
        return object({
          tokenId: requiredString,
          tokenValue: requiredString,
        });
      case 'SASL/AWS IAM':
        return object({
          awsProfileName: string(),
          awsRoleArn: string(),
          awsRoleSessionName: string(),
          awsStsRegion: string(),
        });
      case 'SASL/Azure Entra':
      case 'SASL/GCP IAM':
      case 'mTLS':
      default:
        return mixed().optional();
    }
  });

  const authSchema = lazy((value) => {
    if (typeof value === 'object') {
      return object({
        method: string()
          .required(requiredMessage)
          .oneOf([
            'SASL/JAAS',
            'SASL/GSSAPI',
            'SASL/OAUTHBEARER',
            'SASL/PLAIN',
            'SASL/SCRAM-256',
            'SASL/SCRAM-512',
            'Delegation tokens',
            'SASL/LDAP',
            'SASL/AWS IAM',
            'SASL/Azure Entra',
            'SASL/GCP IAM',
            'mTLS',
          ]),
        securityProtocol: string()
          .oneOf(['SASL_SSL', 'SASL_PLAINTEXT'])
          .when('method', {
            is: (v: string) => {
              return [
                'SASL/JAAS',
                'SASL/GSSAPI',
                'SASL/OAUTHBEARER',
                'SASL/PLAIN',
                'SASL/SCRAM-256',
                'SASL/SCRAM-512',
                'SASL/LDAP',
                'SASL/AWS IAM',
                'SASL/Azure Entra',
                'SASL/GCP IAM',
              ].includes(v);
            },
            then: (schema) => schema.required(requiredMessage),
          }),
        keystore: lazy((_, { parent }) => {
          if (parent.method === 'mTLS') {
            return object({
              location: requiredString,
              password: string(),
            });
          }
          return mixed().optional();
        }),
        props: authPropsSchema,
      });
    }
    return mixed().optional();
  });

  const maskingSchema = object({
    type: mixed<ApplicationConfigPropertiesKafkaMaskingTypeEnum>()
      .oneOf(Object.values(ApplicationConfigPropertiesKafkaMaskingTypeEnum))
      .required(requiredMessage),
    fields: array().of(
      object().shape({
        value: string().test(
          'fieldsOrPattern',
          fieldsOrPatternMessage,
          (value, { path, parent, ...ctx }) => {
            const maskingItem = ctx.from?.[1].value;

            if (value && value.trim() !== '') {
              return true;
            }

            const otherFieldHasValue =
              maskingItem.fields &&
              maskingItem.fields.some(
                (field: { value: string }) =>
                  field.value && field.value.trim() !== ''
              );

            if (otherFieldHasValue) {
              return true;
            }

            const hasPattern =
              maskingItem.fieldsNamePattern &&
              maskingItem.fieldsNamePattern.trim() !== '';

            return hasPattern;
          }
        ),
      })
    ),
    fieldsNamePattern: string().test(
      'fieldsOrPattern',
      fieldsOrPatternMessage,
      (value, { parent }) => {
        const hasValidFields =
          parent.fields &&
          parent.fields.length > 0 &&
          parent.fields.some(
            (field: { value: string }) =>
              field.value && field.value.trim() !== ''
          );

        const hasPattern = value && value.trim() !== '';

        return hasValidFields || hasPattern;
      }
    ),
    maskingCharsReplacement: array().of(object().shape({ value: string() })),
    replacement: string(),
    topicKeysPattern: string(),
    topicValuesPattern: string(),
  });

  const maskingsSchema = lazy((value) => {
    if (Array.isArray(value)) {
      return array().of(maskingSchema);
    }
    return mixed().optional();
  });

  const formSchema = object({
    name: string()
      .required(requiredMessage)
      .min(3, t('clusterConfig.validation.clusterNameLength')),
    readOnly: boolean().required(requiredMessage),
    bootstrapServers: array().of(bootstrapServerSchema).min(1, requiredMessage),
    truststore: sslSchema,
    auth: authSchema,
    schemaRegistry: urlWithAuthSchema,
    ksql: urlWithAuthSchema,
    serde: serdesSchema,
    kafkaConnect: kafkaConnectsSchema,
    masking: maskingsSchema,
    metrics: metricsSchema,
  });

  return formSchema;
};

export default createFormSchema;
