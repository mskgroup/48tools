import {
  useState,
  useEffect,
  useRef,
  forwardRef,
  type ReactElement,
  type Dispatch as D,
  type SetStateAction as S,
  type FunctionComponent,
  type MutableRefObject,
  type RefObject,
  type MouseEvent
} from 'react';
import { Spin, Empty } from 'antd';
import * as classNames from 'classnames';
import VirtualList, { type ListRef } from 'rc-virtual-list';
import commonStyle from '../../../common.sass';
import { requestDanmuFile } from '../services/danmu';
import formatDanmu from '../function/formatDanmu';
import { VIDEO_ID } from '../Video/RecordVideo';
import type { LiveRoomInfo } from '../../48/services/interface';
import type { DanmuItem } from '../types';

const VirtualItemClassName: string = 'Virtual-Item-3';

// 点击视频跳转
function handleVideoGoToClick(event: MouseEvent<HTMLAnchorElement>): void {
  event.preventDefault();

  const currentTime: string | undefined = event.target['getAttribute']('data-time');

  if (!currentTime) return;

  const video: HTMLElement | null = document.getElementById(VIDEO_ID);

  if (!video) return;

  (video as HTMLVideoElement).currentTime = Number(currentTime);
}

/* 显示单条弹幕 */
interface DanmuItemProps {
  item: DanmuItem;
  index: number;
}

const DanmuItemComponent: FunctionComponent<DanmuItemProps> = forwardRef(
  function(props: DanmuItemProps, ref: any): ReactElement | null {
    const { item, index }: DanmuItemProps = props;
    const [height, setHeight]: [number, D<S<number>>] = useState(26);
    const divRef: RefObject<HTMLDivElement> = useRef(null);

    useEffect(function(): void {
      if (divRef.current) {
        const newHeight: number = divRef.current!.getBoundingClientRect().height + 2;

        if (newHeight > 26) {
          setHeight((prevState: number): number => newHeight);
        }
      }
    }, []);

    return (
      <div ref={ ref }
        className={ classNames('py-[1px] pl-[6px] pr-[20px]', VirtualItemClassName) }
        style={{ height }}
        data-index={ index }
      >
        <div ref={ divRef }>
          <div className="flex leading-[26px]">
            {
              item.time && (
                <div className="shrink-0 mr-[6px]">
                  <a className={ commonStyle.link }
                    role="button"
                    aria-label="时间"
                    tabIndex={ 0 }
                    data-time={ item.currentTime }
                    onClick={ handleVideoGoToClick }
                  >
                    [{ item.time }]
                  </a>
                </div>
              )
            }
            <div className="grow">
              { item.nickname }：
              { item.message }
            </div>
          </div>
        </div>
      </div>
    );
  });

/* 弹幕 */
interface DanmuProps {
  info: LiveRoomInfo | undefined;
}

function RecordDanmu(props: DanmuProps): ReactElement {
  const { info }: DanmuProps = props;
  const [loading, setLoading]: [boolean, D<S<boolean>>] = useState<boolean>(false); // 加载状态
  const [danmuList, setDanmuList]: [Array<DanmuItem>, D<S<Array<DanmuItem>>>] = useState([]);
  const [danmuListHeight, setDanmuListHeight]: [number, D<S<number>>] = useState(0);
  const resizeObserverRef: MutableRefObject<ResizeObserver | null> = useRef(null);
  const danmuListRef: RefObject<HTMLDivElement> = useRef(null);
  const virtualListRef: RefObject<ListRef> = useRef(null);

  // 加载弹幕
  async function getDanmu(): Promise<void> {
    if (!info) return;

    setLoading((): boolean => true);

    try {
      const res: string = await requestDanmuFile(info.content.msgFilePath);
      const formatRes: Array<DanmuItem> = formatDanmu(res);

      setDanmuList((): Array<DanmuItem> => formatRes);
    } catch (err) {
      console.error(err);
    }

    setLoading((): boolean => false);
  }

  function handleResizeObserverCallback(entries: ResizeObserverEntry[], observer: ResizeObserver): void {
    setDanmuListHeight((prevState: number): number => entries[0].contentRect.height);
  }

  // 上下滚动
  function handleScrollKeydown(event: KeyboardEvent): void {
    if (danmuListRef.current && virtualListRef.current && (event.code === 'ArrowUp' || event.code === 'ArrowDown')) {
      const antListItem: HTMLElement | null = danmuListRef.current.querySelector(`.${ VirtualItemClassName }`);

      if (antListItem) {
        const indexStr: string | null = antListItem.getAttribute('data-index');

        if (indexStr) {
          const index: number = Number(indexStr);

          virtualListRef.current.scrollTo({
            index: event.code === 'ArrowUp' ? (index - 3) : (index + 3),
            align: 'top'
          });
        }
      }
    }
  }

  useEffect(function() {
    getDanmu();
  }, [info]);

  useEffect(function(): () => void {
    document.addEventListener('keydown', handleScrollKeydown);
    resizeObserverRef.current = new ResizeObserver(handleResizeObserverCallback);
    danmuListRef.current && resizeObserverRef.current.observe(danmuListRef.current);

    return function(): void {
      document.removeEventListener('keydown', handleScrollKeydown);
      resizeObserverRef.current?.disconnect?.();
      resizeObserverRef.current = null;
    };
  }, [info]);

  return (
    <div ref={ danmuListRef } className={ classNames('grow relative z-50 overflow-hidden', commonStyle.virtualList) }>
      {
        loading && (
          <div className="text-center">
            <Spin />
            <p>正在加载弹幕</p>
          </div>
        )
      }
      {
        !loading && (danmuList.length ? (
          <VirtualList ref={ virtualListRef } data={ danmuList } height={ danmuListHeight } itemHeight={ 26 } itemKey="vid">
            {
              (item: DanmuItem, index: number): ReactElement =>
                <DanmuItemComponent key={ item.vid } item={ item } index={ index } />
            }
          </VirtualList>
        ) : <Empty />)
      }
    </div>
  );
}

export default RecordDanmu;