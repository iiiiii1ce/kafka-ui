import React from 'react';
import { Dropdown, DropdownItem } from 'components/common/Dropdown';
import UserIcon from 'components/common/Icons/UserIcon';
import DropdownArrowIcon from 'components/common/Icons/DropdownArrowIcon';
import { useUserInfo } from 'lib/hooks/useUserInfo';
import { useTranslation } from 'react-i18next';

import * as S from './UserInfo.styled';

const UserInfo = () => {
  const { t } = useTranslation();
  const { username } = useUserInfo();

  return username ? (
    <Dropdown
      label={
        <S.Wrapper>
          <UserIcon />
          <S.Text>{username}</S.Text>
          <DropdownArrowIcon isOpen={false} />
        </S.Wrapper>
      }
    >
      <DropdownItem href={`${window.basePath}/logout`}>
        {t('navbar.logout')}
      </DropdownItem>
    </Dropdown>
  ) : null;
};

export default UserInfo;
