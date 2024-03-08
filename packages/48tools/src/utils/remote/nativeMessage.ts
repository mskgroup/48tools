import { ipcRenderer, type MessageBoxOptions } from 'electron';
import { IpcRemoteHandleChannel } from '@48tools/main/src/channelEnum';

/**
 * 显示native的message提示
 * @param { MessageBoxOptions | string } optionsOrMessageText - 配置
 */
export function nativeMessage(optionsOrMessageText: MessageBoxOptions | string): Promise<void> {
  const messageOptions: MessageBoxOptions = typeof optionsOrMessageText === 'string'
    ? { message: optionsOrMessageText } : optionsOrMessageText;

  if (typeof messageOptions.type !== 'string') {
    messageOptions.type = 'info';
  }

  return ipcRenderer.invoke(IpcRemoteHandleChannel.NativeMessage, messageOptions);
}

export function errorNativeMessage(messageText: string): Promise<void> {
  return nativeMessage({
    message: messageText,
    type: 'error'
  });
}

export function warningNativeMessage(messageText: string): Promise<void> {
  return nativeMessage({
    message: messageText,
    type: 'warning'
  });
}