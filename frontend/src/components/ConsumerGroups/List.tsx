import React from 'react';
import Search from 'components/common/Search/Search';
import { ControlPanelWrapper } from 'components/common/ControlPanel/ControlPanel.styled';
import {
  ConsumerGroup,
  ConsumerGroupOrdering,
  ConsumerGroupState,
  SortOrder,
} from 'generated-sources';
import useAppParams from 'lib/hooks/useAppParams';
import { clusterConsumerGroupDetailsPath, ClusterNameRoute } from 'lib/paths';
import { ColumnDef } from '@tanstack/react-table';
import Table, { LinkCell, TagCell } from 'components/common/NewTable';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CONSUMER_GROUP_STATE_TOOLTIPS, PER_PAGE } from 'lib/constants';
import { useConsumerGroups } from 'lib/hooks/api/consumers';
import Tooltip from 'components/common/Tooltip/Tooltip';
import ResourcePageHeading from 'components/common/ResourcePageHeading/ResourcePageHeading';
import { useLocalStoragePersister } from 'components/common/NewTable/ColumnResizer/lib';
import useFts from 'components/common/Fts/useFts';
import Fts from 'components/common/Fts/Fts';
import { DownloadCsvButton } from 'components/common/DownloadCsvButton/DownloadCsvButton';
import { consumerGroupsApiClient } from 'lib/api';
import { RefreshRateSelect } from 'components/common/RefreshRateSelect/RefreshRateSelect';
import useQueryPersister from 'components/common/NewTable/ColumnFilter/lib/persisters/queryPersister';
import PageLoader from 'components/common/PageLoader/PageLoader';
import ErrorPage from 'components/ErrorPage/ErrorPage';
import { LagTrendComponent } from 'lib/consumerGroups';
import { useConsumerGroupsLagTrends } from 'components/ConsumerGroups/lib/useConsumerGroupsLagTrends';
import { useTranslation } from 'react-i18next';

const List = () => {
  const { t } = useTranslation();
  const { clusterName } = useAppParams<ClusterNameRoute>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isFtsEnabled } = useFts('consumer_groups');

  const params = {
    clusterName,
    orderBy: (searchParams.get('sortBy') as ConsumerGroupOrdering) || undefined,
    sortOrder:
      (searchParams.get('sortDirection')?.toUpperCase() as SortOrder) ||
      undefined,
    search: searchParams.get('q') || '',
    fts: isFtsEnabled,
  };

  const consumerGroups = useConsumerGroups({
    ...params,
    page: Number(searchParams.get('page') || 1),
    perPage: Number(searchParams.get('perPage') || PER_PAGE),
    state: searchParams
      .get(ConsumerGroupOrdering.STATE)
      ?.split(',') as ConsumerGroupState[],
  });

  const { consumerGroupsLag, lagTrends } = useConsumerGroupsLagTrends({
    clusterName,
    ids: consumerGroups.data?.consumerGroups?.map((cg) => cg.groupId) || [],
    storageKey: 'consumer-groups-refresh-rate',
  });

  const columns: ColumnDef<ConsumerGroup>[] = [
    {
      id: ConsumerGroupOrdering.NAME,
      header: t('consumers.groupId'),
      accessorKey: 'groupId',
      // eslint-disable-next-line react/no-unstable-nested-components
      cell: ({ getValue }) => (
        <LinkCell
          wordBreak
          value={`${getValue<string | number>()}`}
          to={encodeURIComponent(`${getValue<string | number>()}`)}
        />
      ),
      size: 600,
      meta: {
        csvFn: (row) => row.groupId,
      },
    },
    {
      id: ConsumerGroupOrdering.MEMBERS,
      header: t('consumers.members'),
      accessorKey: 'members',
      size: 140,
    },
    {
      id: ConsumerGroupOrdering.TOPIC_NUM,
      header: t('consumers.topics'),
      accessorKey: 'topics',
      size: 140,
    },
    {
      id: ConsumerGroupOrdering.MESSAGES_BEHIND,
      header: t('consumers.lag'),
      accessorKey: 'consumerLag',
      // eslint-disable-next-line react/no-unstable-nested-components
      cell: ({ row }) => {
        const { groupId } = row.original;
        const lag = consumerGroupsLag?.consumerGroups?.[groupId]?.lag;
        const trend = lagTrends.groupLagTrends[groupId];

        return <LagTrendComponent lag={lag} trend={trend} />;
      },
      size: 124,
    },
    {
      header: t('consumers.coordinator'),
      accessorKey: 'coordinator.id',
      enableSorting: false,
      size: 104,
      meta: {
        csvFn: (row) => String(row.coordinator?.id) || '-',
      },
    },
    {
      id: ConsumerGroupOrdering.STATE,
      header: t('consumers.state'),
      accessorKey: 'state',
      // eslint-disable-next-line react/no-unstable-nested-components
      cell: (args) => {
        const value = args.getValue() as ConsumerGroupState;
        return (
          <Tooltip
            value={<TagCell {...args} />}
            content={CONSUMER_GROUP_STATE_TOOLTIPS[value]}
            placement="bottom-end"
          />
        );
      },
      size: 124,
      filterFn: 'noop',
      meta: {
        filterKey: ConsumerGroupOrdering.STATE,
        filterVariant: 'multi-select',
        filterValues: Object.keys(ConsumerGroupState).filter(
          (v) => v !== ConsumerGroupState.UNKNOWN
        ),
        csvFn: (row) => String(row.state),
      },
    },
  ];

  const columnSizingPersister = useLocalStoragePersister('Consumers');
  const filterPersister = useQueryPersister(columns);

  const fetchCsv = async () => {
    return consumerGroupsApiClient.getConsumerGroupsCsv(params);
  };

  return (
    <>
      <ResourcePageHeading text={t('consumers.title')}>
        <DownloadCsvButton
          filePrefix={`consumers-${clusterName}`}
          fetchCsv={fetchCsv}
        />
      </ResourcePageHeading>
      <ControlPanelWrapper hasInput>
        <Search
          key={clusterName}
          placeholder={t('consumers.search')}
          extraActions={<Fts resourceName="consumer_groups" />}
        />
        <RefreshRateSelect storageKey="consumer-groups-refresh-rate" />
      </ControlPanelWrapper>
      {(consumerGroups.isLoading || consumerGroups.isRefetching) && (
        <PageLoader offsetY={300} />
      )}
      {consumerGroups.error && (
        <ErrorPage
          offsetY={300}
          status={consumerGroups.error.status}
          onClick={consumerGroups.refetch}
          text={consumerGroups.error.message}
        />
      )}
      {consumerGroups.isSuccess && (
        <Table
          columns={columns}
          pageCount={consumerGroups.data?.pageCount || 0}
          filterPersister={filterPersister}
          data={consumerGroups.data?.consumerGroups || []}
          emptyMessage={t('consumers.none')}
          serverSideProcessing
          enableSorting
          onRowClick={({ original }) =>
            navigate(
              clusterConsumerGroupDetailsPath(clusterName, original.groupId)
            )
          }
          enableColumnResizing
          columnSizingPersister={columnSizingPersister}
          disabled={consumerGroups.isFetching}
        />
      )}
    </>
  );
};

export default List;
