import { setTimeout, clearTimeout } from 'node:timers';
import * as fs from 'node:fs';
import { promises as fsP } from 'node:fs';
import * as path from 'node:path';
import type { SaveDialogReturnValue } from 'electron';
import {
  Fragment,
  useState,
  useMemo,
  type ReactElement,
  type Dispatch as D,
  type SetStateAction as S,
  type MouseEvent
} from 'react';
import { Button, message, Pagination } from 'antd';
import type { DefaultOptionType } from 'rc-select/es/select';
import type { LabeledValue, UseMessageReturnType } from '@48tools-types/antd';
import { useSelector, useDispatch } from 'react-redux';
import type { Dispatch } from '@reduxjs/toolkit';
import { createStructuredSelector, Selector } from 'reselect';
import * as dayjs from 'dayjs';
import style from './searchMessage.sass';
import FixSelect from './FixSelect';
import Header from '../../../../components/Header/Header';
import Pocket48Login from '../../../../functionalComponents/Pocket48Login/Pocket48Login';
import {
  setSearchSelectValue,
  setSearchServerResult,
  setQueryRecord,
  setHomeMessage,
  type RoomMessageInitialState
} from '../../reducers/roomMessage';
import { requestServerSearch, requestServerJump, requestHomeownerMessage } from '../../services/pocket48';
import { formatDataArray, formatSendData } from '../formatData';
import MessageDisplay from '../MessageDisplay/MessageDisplay';
import { showSaveDialog } from '../../../../utils/remote/dialog';
import { fileTimeFormat } from '../../../../utils/utils';
import type {
  ServerSearchResult,
  ServerApiItem,
  ServerJumpResult,
  HomeMessageResult,
  CustomMessageV2
} from '../../services/interface';
import type { QueryRecord, FormatCustomMessage, SendDataItem } from '../../types';

/* 分页 */
interface Page {
  current: number;
  pageSize: number;
}

/* 搜索 */
let serverSearchTimer: NodeJS.Timeout | null = null;

/* redux selector */
type RState = { roomMessage: RoomMessageInitialState };

const selector: Selector<RState, RoomMessageInitialState> = createStructuredSelector({
  // 搜索的值
  searchSelectValue: ({ roomMessage }: RState): LabeledValue | undefined => roomMessage.searchSelectValue,

  // 搜索的结果
  searchServerResult: ({ roomMessage }: RState): Array<ServerApiItem> => roomMessage.searchServerResult,

  // 查询条件
  query: ({ roomMessage }: RState): QueryRecord | {} => roomMessage.query,

  // 查询结果
  homeMessage: ({ roomMessage }: RState): Array<FormatCustomMessage> => roomMessage.homeMessage,

  // 原始数据
  homeMessageRaw: ({ roomMessage }: RState): Array<CustomMessageV2> => roomMessage.homeMessageRaw
});

/* 搜索和导出房间消息 */
function SearchMessage(props: {}): ReactElement {
  const {
    searchSelectValue,
    searchServerResult,
    query,
    homeMessage,
    homeMessageRaw
  }: RoomMessageInitialState = useSelector(selector);
  const dispatch: Dispatch = useDispatch();
  const [messageApi, messageContextHolder]: UseMessageReturnType = message.useMessage();
  const [searchLoading, setSearchLoading]: [boolean, D<S<boolean>>] = useState(false); // 搜索的loading状态
  const [homeMessageLoading, setHomeMessageLoading]: [boolean, D<S<boolean>>] = useState(false); // 加载数据的loading状态
  const [homeMessagePage, setHomeMessagePagePage]: [Page, D<S<Page>>] = useState({
    current: 0,
    pageSize: 350
  });

  // 点击导出数据到文件夹中
  async function handleSaveDataClick(event: MouseEvent): Promise<void> {
    try {
      const result: SaveDialogReturnValue = await showSaveDialog({
        defaultPath: `${ query['ownerName'] }_${ query['ownerId'] }_${ dayjs().format(fileTimeFormat) }`
      });

      if (result.canceled || !result.filePath) return;

      messageApi.info('正在创建文件夹并保存数据。');

      // 创建目录
      if (!fs.existsSync(result.filePath)) {
        await fsP.mkdir(result.filePath);
      }

      // 写入json文件
      for (let i: number = 0, j: number = homeMessageRaw.length, k: number = 0; i < j; i += 3000, k++) {
        const dataSlice: Array<SendDataItem> = formatSendData(homeMessageRaw.slice(i, i + 3000));
        const fileName: string = path.join(result.filePath, `${ k }.json`);

        await fsP.writeFile(fileName, JSON.stringify({ message: dataSlice }, null, 2), {
          encoding: 'utf8'
        });
      }

      messageApi.success('成功保存数据！');
    } catch (err) {
      console.error(err);
      messageApi.error('在保存数据的过程中出现错误！');
    }
  }

  // 渲染searchServerResult
  const serverResultOptions: Array<DefaultOptionType> = useMemo(function(): Array<DefaultOptionType> {
    return searchServerResult.map((o: ServerApiItem): DefaultOptionType => ({
      label: o.serverDefaultName,
      value: `${ o.serverOwner }`
    }));
  }, [searchServerResult]);

  // homeMessage分页
  const homeMessageSlice: Array<FormatCustomMessage> = useMemo(function(): Array<FormatCustomMessage> {
    const index: number = homeMessagePage.pageSize * homeMessagePage.current;

    return homeMessage.slice(index, index + homeMessagePage.pageSize);
  }, [homeMessagePage.current, homeMessagePage.pageSize, homeMessage]);

  // 分页变化
  function handlePageChange(page: number, pageSize: number): void {
    setHomeMessagePagePage((prevState: Page): Page => ({ ...prevState, current: page - 1 }));
  }

  // 获取数据
  async function handleGetHomeownerMessageClick(event: MouseEvent): Promise<void> {
    if (searchSelectValue === undefined) {
      messageApi.warning('请先选择要查询的成员！');

      return;
    }

    setHomeMessageLoading(true);

    try {
      let queryRecord: QueryRecord | {} = query;

      // 如果没有query或者query的ownerId和select的不一致，需要重置query
      if (!('ownerId' in query) || query.ownerId !== Number(searchSelectValue.value)) {
        const jumpRes: ServerJumpResult | undefined = await requestServerJump(Number(searchSelectValue.value));

        if (jumpRes?.content?.channelId && jumpRes?.content?.serverId) {
          queryRecord = {
            ownerName: searchSelectValue.label,
            ownerId: Number(searchSelectValue.value),
            channelId: jumpRes.content.channelId,
            serverId: jumpRes.content.serverId,
            nextTime: 0
          };
          dispatch(setQueryRecord(queryRecord));
        }
      }

      // 请求房间消息
      const homeownerMessageRes: HomeMessageResult | undefined = await requestHomeownerMessage(
        (queryRecord as QueryRecord).channelId,
        (queryRecord as QueryRecord).serverId,
        (queryRecord as QueryRecord).nextTime);

      // 判断是否有数据
      if (homeownerMessageRes?.content?.message?.length) {
        if ((queryRecord as QueryRecord).nextTime === 0) {
          dispatch(setHomeMessage({
            formatData: formatDataArray(homeownerMessageRes.content.message),
            rawData: homeownerMessageRes.content.message
          }));
          setHomeMessagePagePage((prevState: Page): Page => ({ ...prevState, current: 0 }));
        } else {
          dispatch(setHomeMessage({
            formatData: homeMessage.concat(formatDataArray(homeownerMessageRes.content.message)),
            rawData: homeMessageRaw.concat(homeownerMessageRes.content.message)
          }));
        }

        dispatch(setQueryRecord({
          ...queryRecord,
          nextTime: homeownerMessageRes.content.nextTime
        }));
      } else {
        messageApi.warning('没有获取到数据！');
      }
    } catch (err) {
      console.error(err);
      messageApi.error('获取数据失败！');
    }

    setHomeMessageLoading(false);
  }

  // 选择一个房间
  function handleOwnerSelect(value: string, option: DefaultOptionType): void {
    dispatch(setSearchSelectValue({
      label: option.label,
      value: option.value
    }));
  }

  // 搜索名字
  function handleServerSearch(value: string): void {
    if (serverSearchTimer !== null) {
      clearTimeout(serverSearchTimer);
      serverSearchTimer = null;
    }

    if (!(value && /[\u4E00-\u9FFF]+/.test(value))) {
      setSearchLoading(false);

      return;
    }

    setSearchLoading(true);
    serverSearchTimer = setTimeout(async (): Promise<void> => {
      const res: ServerSearchResult | undefined = await requestServerSearch(value);

      if (res?.content?.serverApiList?.length) {
        dispatch(setSearchServerResult(res.content.serverApiList));
      }

      setSearchLoading(false);
    }, 1_000);
  }

  return (
    <Fragment>
      <Header>
        <FixSelect className={ style.searchSelect }
          showSearch={ true }
          value={ searchSelectValue }
          loading={ searchLoading }
          options={ serverResultOptions }
          placeholder="输入成员名字搜索"
          onSearch={ handleServerSearch }
          onSelect={ handleOwnerSelect }
        />
        <Button className="mx-[8px]"
          disabled={ searchSelectValue === undefined || homeMessageLoading }
          onClick={ handleGetHomeownerMessageClick }
        >
          加载数据
        </Button>
        <Button className="mr-[8px]"
          disabled={ homeMessageRaw.length === 0 }
          onClick={ handleSaveDataClick }
        >
          导出当前数据
        </Button>
        <Pocket48Login />
      </Header>
      <div className="flex-grow overflow-hidden">
        <MessageDisplay data={ homeMessageSlice } loading={ homeMessageLoading } />
      </div>
      <div className="pt-[8px]">
        <Pagination pageSize={ homeMessagePage.pageSize }
          current={ homeMessagePage.current + 1 }
          showQuickJumper={ true }
          showSizeChanger={ false }
          total={ homeMessage.length }
          showTotal={ (total: number): string => `共${ total }条数据` }
          onChange={ handlePageChange }
        />
      </div>
      { messageContextHolder }
    </Fragment>
  );
}

export default SearchMessage;