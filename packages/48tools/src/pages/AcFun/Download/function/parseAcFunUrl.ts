import { requestAcFunHtml } from '@48tools-api/acfun';
import type { KsPlayJson, PageInfo, Representation, VideoInfo } from '../../types';

/**
 * 解析window.pageInfo
 * @param { string } html
 */
function getWindowPageInfo(html: string): PageInfo | undefined {
  const parseDocument: Document = new DOMParser().parseFromString(html, 'text/html');
  const scripts: NodeListOf<HTMLScriptElement> = parseDocument.querySelectorAll('script');
  let pageInfo: PageInfo | undefined = undefined;

  for (const script of scripts) {
    const data: string = script.innerHTML;

    if (/window\.pageInfo\s*=\s*/i.test(data)) {
      const dataArr: string[] = data.split(/\n/)
        .filter((o: string): boolean => /window\.pageInfo\s*=\s*/i.test(o));
      const pageInfoStr: string = dataArr[0]
        .replace(/^\s*window\.[a-zA-Z]+\s*=\s*window\.[a-zA-Z]+\s*=\s*/i, '')
        .replace(/;\s*$/, '');

      pageInfo = JSON.parse(pageInfoStr);
      break;
    }
  }

  return pageInfo;
}

export interface ParseAcFunUrlResult {
  representation: Array<Representation> | undefined;
  videoList: Array<VideoInfo> | undefined;
}

/**
 * 解析acfun视频地址
 * https://www.acfun.cn/v/ac21923704 高清视频测试
 * @param { string } type - 视频类型
 * @param { string } id - 视频id
 */
export async function parseAcFunUrl(type: string, id: string): Promise<ParseAcFunUrlResult> {
  const uri: string = `https://www.acfun.cn/${ type === 'aa' ? 'bangumi' : 'v' }/${ type }${ id }`;
  const res: string = await requestAcFunHtml(uri);
  const pageInfo: PageInfo | undefined = getWindowPageInfo(res);
  const result: ParseAcFunUrlResult = { representation: undefined, videoList: undefined };

  if (pageInfo) {
    const ksPlayJson: KsPlayJson = JSON.parse(pageInfo.currentVideoInfo.ksPlayJson);

    result.representation = ksPlayJson?.adaptationSet?.[0]?.representation;
    result.videoList = pageInfo.videoList;
  }

  return result;
}