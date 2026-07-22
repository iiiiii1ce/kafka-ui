import React, { type FC } from 'react';
import { Cluster, ClusterFeaturesEnum } from 'generated-sources';
import * as S from 'components/Nav/Nav.styled';
import MenuTab from 'components/Nav/Menu/MenuTab';
import MenuItem from 'components/Nav/Menu/MenuItem';
import {
  clusterACLPath,
  clusterBrokersPath,
  clusterConnectsPath,
  clusterConnectorsPath,
  clusterConsumerGroupsPath,
  clusterKsqlDbPath,
  clusterSchemasPath,
  clusterTopicsPath,
  kafkaConnectPath,
} from 'lib/paths';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLocalStorage } from 'lib/hooks/useLocalStorage';
import { ClusterColorKey } from 'theme/theme';
import useScrollIntoView from 'lib/hooks/useScrollIntoView';
import { useTranslation } from 'react-i18next';

interface ClusterMenuProps {
  name: Cluster['name'];
  status: Cluster['status'];
  features: Cluster['features'];
  opened?: boolean;
}

const ClusterMenu: FC<ClusterMenuProps> = ({
  name,
  status,
  features,
  opened = false,
}) => {
  const { t } = useTranslation();
  const hasFeatureConfigured = (key: ClusterFeaturesEnum) =>
    features?.includes(key);

  const [isOpen, setIsOpen] = useLocalStorage<boolean>(
    `clusterMenu-${name}-isOpen`,
    opened
  );
  const location = useLocation();
  const navigate = useNavigate();
  const [colorKey, setColorKey] = useLocalStorage<ClusterColorKey>(
    `clusterColor-${name}`,
    'transparent'
  );
  const getIsMenuItemActive = (path: string) => {
    return location.pathname.includes(path);
  };

  const { ref } = useScrollIntoView<HTMLUListElement>(opened);

  const handleClusterNameClick = () => {
    if (!isOpen) {
      setIsOpen(true);
    }
    navigate(clusterBrokersPath(name));
  };

  const handleToggleMenu = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <S.ClusterList role="menu" $colorKey={colorKey} ref={ref}>
      <MenuTab
        title={name}
        status={status}
        isOpen={isOpen}
        toggleClusterMenu={handleToggleMenu}
        onClusterNameClick={handleClusterNameClick}
        setColorKey={setColorKey}
        isActive={opened}
      />
      {isOpen && (
        <S.List>
          <MenuItem
            isActive={getIsMenuItemActive(clusterBrokersPath(name))}
            to={clusterBrokersPath(name)}
            title={t('nav.brokers')}
          />
          <MenuItem
            isActive={getIsMenuItemActive(clusterTopicsPath(name))}
            to={clusterTopicsPath(name)}
            title={t('nav.topics')}
          />
          <MenuItem
            isActive={getIsMenuItemActive(clusterConsumerGroupsPath(name))}
            to={clusterConsumerGroupsPath(name)}
            title={t('nav.consumers')}
          />
          {hasFeatureConfigured(ClusterFeaturesEnum.SCHEMA_REGISTRY) && (
            <MenuItem
              isActive={getIsMenuItemActive(clusterSchemasPath(name))}
              to={clusterSchemasPath(name)}
              title={t('nav.schemaRegistry')}
            />
          )}
          {hasFeatureConfigured(ClusterFeaturesEnum.KAFKA_CONNECT) && (
            <MenuItem
              isActive={
                getIsMenuItemActive(kafkaConnectPath(name)) ||
                getIsMenuItemActive(clusterConnectorsPath(name)) ||
                getIsMenuItemActive(clusterConnectsPath(name))
              }
              to={kafkaConnectPath(name)}
              title={t('nav.kafkaConnect')}
            />
          )}
          {hasFeatureConfigured(ClusterFeaturesEnum.KSQL_DB) && (
            <MenuItem
              isActive={getIsMenuItemActive(clusterKsqlDbPath(name))}
              to={clusterKsqlDbPath(name)}
              title={t('nav.ksqlDb')}
            />
          )}
          {(hasFeatureConfigured(ClusterFeaturesEnum.KAFKA_ACL_VIEW) ||
            hasFeatureConfigured(ClusterFeaturesEnum.KAFKA_ACL_EDIT)) && (
            <MenuItem
              isActive={getIsMenuItemActive(clusterACLPath(name))}
              to={clusterACLPath(name)}
              title={t('nav.acl')}
            />
          )}
        </S.List>
      )}
    </S.ClusterList>
  );
};

export default ClusterMenu;
