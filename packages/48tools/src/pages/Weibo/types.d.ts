import type { SuperItem } from '@48tools-api/weibo/super';

export interface WeiboCheckinResult extends Pick<SuperItem, 'title' | 'pic' | 'content1' | 'link'> {
  code?: number;
  result?: string;
  superId: string; // 超话id
}

export interface Quantity {
  checkedInLen: number; // 已签到数
  total: number;        // 签到总数
}

/* 直播 */
export interface LiveItem {
  qid: string;
  liveId: string;
  url: string;
  worker: Worker;
  title: string;
  status: 0 | 1; // 0：已停止 1：录制中
}