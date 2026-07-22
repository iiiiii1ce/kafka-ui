import React, { type FC } from 'react';
import { useClusters } from 'lib/hooks/api/clusters';
import useCurrentClusterName from 'lib/hooks/useCurrentClusterName';
import { useTranslation } from 'react-i18next';

import * as S from './Nav.styled';
import MenuItem from './Menu/MenuItem';
import ClusterMenu from './ClusterMenu/ClusterMenu';

const Nav: FC = () => {
  const clusters = useClusters();
  const clusterName = useCurrentClusterName();
  const { t } = useTranslation();

  return (
    <aside aria-label={t('nav.sidebarLabel')}>
      <S.List>
        <MenuItem variant="primary" to="/" title={t('nav.dashboard')} />
      </S.List>
      {clusters.isSuccess &&
        clusters.data.map((cluster) => (
          <ClusterMenu
            key={cluster.name}
            name={cluster.name}
            status={cluster.status}
            features={cluster.features}
            opened={clusters.data.length === 1 || cluster.name === clusterName}
          />
        ))}
    </aside>
  );
};

export default Nav;
