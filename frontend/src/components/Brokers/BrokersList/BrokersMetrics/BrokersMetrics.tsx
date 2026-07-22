import React from 'react';
import * as Metrics from 'components/common/Metrics';
import { ControllerType } from 'generated-sources';
import { useTranslation } from 'react-i18next';

import * as S from './BrokersMetrics.styled';

type BrokersMetricsProps = {
  brokerCount: number | undefined;
  inSyncReplicasCount: number | undefined;
  outOfSyncReplicasCount: number | undefined;
  offlinePartitionCount: number | undefined;
  activeControllers: number | undefined;
  onlinePartitionCount: number | undefined;
  underReplicatedPartitionCount: number | undefined;
  version: string | undefined;
  controller: ControllerType | undefined;
};

export const BrokersMetrics = ({
  brokerCount,
  version,
  activeControllers,
  outOfSyncReplicasCount,
  inSyncReplicasCount,
  offlinePartitionCount,
  underReplicatedPartitionCount,
  onlinePartitionCount,
  controller,
}: BrokersMetricsProps) => {
  const { t } = useTranslation();
  const replicas = (inSyncReplicasCount ?? 0) + (outOfSyncReplicasCount ?? 0);
  const areAllInSync = inSyncReplicasCount && replicas === inSyncReplicasCount;
  const partitionIsOffline = offlinePartitionCount && offlinePartitionCount > 0;

  const isActiveControllerUnKnown = typeof activeControllers === 'undefined';

  return (
    <Metrics.Wrapper>
      <Metrics.Section title={t('brokers.uptime')}>
        <Metrics.Indicator label={t('brokers.brokerCount')}>
          {brokerCount}
        </Metrics.Indicator>

        <Metrics.Indicator
          label={t('brokers.activeController')}
          isAlert={isActiveControllerUnKnown}
        >
          {isActiveControllerUnKnown ? (
            <S.DangerText>{t('brokers.noActiveController')}</S.DangerText>
          ) : (
            activeControllers
          )}
        </Metrics.Indicator>

        <Metrics.Indicator label={t('brokers.version')}>
          {version}
        </Metrics.Indicator>
      </Metrics.Section>

      <Metrics.Section title={t('brokers.partitions')}>
        <Metrics.Indicator
          label={t('brokers.online')}
          isAlert
          alertType={partitionIsOffline ? 'error' : 'success'}
        >
          {partitionIsOffline ? (
            <Metrics.RedText>{onlinePartitionCount}</Metrics.RedText>
          ) : (
            onlinePartitionCount
          )}
          <Metrics.LightText>
            {t('brokers.of', {
              total: (onlinePartitionCount || 0) + (offlinePartitionCount || 0),
            })}
          </Metrics.LightText>
        </Metrics.Indicator>

        <Metrics.Indicator
          label="URP"
          title={t('brokers.underReplicatedPartitions')}
          isAlert
          alertType={!underReplicatedPartitionCount ? 'success' : 'error'}
        >
          {!underReplicatedPartitionCount ? (
            <Metrics.LightText>
              {underReplicatedPartitionCount}
            </Metrics.LightText>
          ) : (
            <Metrics.RedText>{underReplicatedPartitionCount}</Metrics.RedText>
          )}
        </Metrics.Indicator>

        <Metrics.Indicator
          label={t('brokers.inSyncReplicas')}
          isAlert
          alertType={areAllInSync ? 'success' : 'error'}
        >
          {areAllInSync ? (
            replicas
          ) : (
            <Metrics.RedText>{inSyncReplicasCount}</Metrics.RedText>
          )}
          <Metrics.LightText>
            {' '}
            {t('brokers.of', { total: replicas })}
          </Metrics.LightText>
        </Metrics.Indicator>

        <Metrics.Indicator label={t('brokers.outOfSyncReplicas')}>
          {outOfSyncReplicasCount}
        </Metrics.Indicator>

        <Metrics.Indicator label={t('brokers.controllerType')}>
          {(() => {
            switch (controller) {
              case ControllerType.KRAFT:
                return 'KRaft';
              case ControllerType.ZOOKEEPER:
                return 'ZooKeeper';
              default:
                return t('common.unknown');
            }
          })()}
        </Metrics.Indicator>
      </Metrics.Section>
    </Metrics.Wrapper>
  );
};
