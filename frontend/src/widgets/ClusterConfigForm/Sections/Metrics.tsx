import React, { useState } from 'react';
import Input from 'components/common/Input/Input';
import { useFormContext } from 'react-hook-form';
import ControlledSelect from 'components/common/Select/ControlledSelect';
import { METRICS_OPTIONS } from 'lib/constants';
import * as S from 'widgets/ClusterConfigForm/ClusterConfigForm.styled';
import SectionHeader from 'widgets/ClusterConfigForm/common/SectionHeader';
import SSLForm from 'widgets/ClusterConfigForm/common/SSLForm';
import Credentials from 'widgets/ClusterConfigForm/common/Credentials';
import { useTranslation } from 'react-i18next';

const Metrics = () => {
  const { t } = useTranslation();
  const { setValue, watch } = useFormContext();
  const visibleMetrics = !!watch('metrics');
  const [configOpen, setConfigOpen] = useState(false);
  const toggleMetrics = () => {
    setConfigOpen((prevConfigOpen) => !prevConfigOpen);
    setValue(
      'metrics',
      visibleMetrics
        ? { isActive: false }
        : {
            isActive: true,
            type: '',
            port: 0,
            isAuth: false,
          },
      { shouldValidate: true, shouldDirty: true, shouldTouch: true }
    );
  };

  return (
    <>
      <SectionHeader
        title={t('clusterConfig.sections.metrics')}
        adding={!configOpen}
        addButtonText={t('clusterConfig.actions.configure', {
          section: t('clusterConfig.sections.metrics'),
        })}
        onClick={toggleMetrics}
      />
      {configOpen && (
        <>
          <ControlledSelect
            name="metrics.type"
            label={t('clusterConfig.fields.metricsType')}
            placeholder={t('clusterConfig.placeholders.metricsType')}
            options={METRICS_OPTIONS}
          />
          <S.Port>
            <Input
              label={t('clusterConfig.fields.portRequired')}
              name="metrics.port"
              type="number"
              positiveOnly
              withError
            />
          </S.Port>
          <Credentials prefix="metrics" />
          <SSLForm
            prefix="metrics.keystore"
            title={t('clusterConfig.sections.metricsKeystore')}
          />
        </>
      )}
    </>
  );
};
export default Metrics;
