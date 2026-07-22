import React from 'react';
import { GetTopicsRequest, Topic, TopicColumnsToSort } from 'generated-sources';
import { ColumnDef } from '@tanstack/react-table';
import Table, { SizeCell } from 'components/common/NewTable';
import { useSearchParams } from 'react-router-dom';
import ClusterContext from 'components/contexts/ClusterContext';
import { useTopics } from 'lib/hooks/api/topics';
import { PER_PAGE } from 'lib/constants';
import { useLocalStoragePersister } from 'components/common/NewTable/ColumnResizer/lib';
import { formatBytes } from 'components/common/BytesFormatted/utils';
import PageLoader from 'components/common/PageLoader/PageLoader';
import ErrorPage from 'components/ErrorPage/ErrorPage';
import { useTranslation } from 'react-i18next';

import { TopicTitleCell } from './TopicTitleCell';
import ActionsCell from './ActionsCell';
import BatchActionsbar from './BatchActionsBar';

const TopicTable: React.FC<{ params: GetTopicsRequest }> = ({ params }) => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { isReadOnly } = React.useContext(ClusterContext);

  const { data, error, refetch, isLoading, isRefetching } = useTopics({
    ...params,
    page: Number(searchParams.get('page') || 1),
    perPage: Number(searchParams.get('perPage') || PER_PAGE),
  });

  const topics = data?.topics || [];
  const pageCount = data?.pageCount || 0;

  const columns = React.useMemo<ColumnDef<Topic>[]>(
    () => [
      {
        id: TopicColumnsToSort.NAME,
        header: t('topics.name'),
        accessorKey: 'name',
        cell: TopicTitleCell,
        size: 400,
        meta: {
          width: '100%',
        },
      },
      {
        id: TopicColumnsToSort.TOTAL_PARTITIONS,
        header: t('topics.partitions'),
        accessorKey: 'partitionCount',
        size: 100,
      },
      {
        id: TopicColumnsToSort.OUT_OF_SYNC_REPLICAS,
        header: t('topics.outOfSyncReplicas'),
        accessorKey: 'partitions',
        size: 154,
        cell: ({ getValue }) => {
          const partitions = getValue<Topic['partitions']>();
          if (partitions === undefined || partitions.length === 0) {
            return 0;
          }
          return partitions.reduce((memo, { replicas }) => {
            const outOfSync = replicas?.filter(({ inSync }) => !inSync);
            return memo + (outOfSync?.length || 0);
          }, 0);
        },
      },
      {
        id: TopicColumnsToSort.REPLICATION_FACTOR,
        header: t('topics.replicationFactor'),
        accessorKey: 'replicationFactor',
        size: 148,
        maxSize: 148,
      },
      {
        id: TopicColumnsToSort.MESSAGES_COUNT,
        header: t('topics.messageCount'),
        accessorKey: 'messagesCount',
        cell: (args) => {
          return args.getValue() ?? t('topics.notAvailable');
        },
        size: 146,
      },
      {
        id: TopicColumnsToSort.SIZE,
        header: t('topics.size'),
        accessorKey: 'segmentSize',
        size: 100,
        cell: SizeCell,
        meta: {
          csvFn: (row: Topic) => formatBytes(row.segmentSize, 0),
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ActionsCell,
        size: 60,
      },
    ],
    [t]
  );

  const columnSizingPersister = useLocalStoragePersister('Topics');

  if (isLoading || isRefetching) {
    return <PageLoader />;
  }

  if (error) {
    return <ErrorPage offsetY={201} status={error.status} onClick={refetch} />;
  }

  return (
    <Table
      data={topics}
      pageCount={pageCount}
      columns={columns}
      enableSorting
      serverSideProcessing
      batchActionsBar={BatchActionsbar}
      enableRowSelection={
        !isReadOnly ? (row) => !row.original.internal : undefined
      }
      enableColumnResizing
      columnSizingPersister={columnSizingPersister}
      emptyMessage={t('topics.none')}
    />
  );
};

export default TopicTable;
