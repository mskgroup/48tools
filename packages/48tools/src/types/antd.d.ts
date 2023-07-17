/**
 * antd中useModal和useMessage的返回值
 */

import type { ReactElement, JSXElementConstructor } from 'react';
import type { ModalStaticFunctions } from 'antd/es/modal/confirm';
import type { ModalFuncProps } from 'antd/es/modal/interface';
import type { MessageInstance } from 'antd/es/message/interface';
import type { NotificationInstance } from 'antd/es/notification/interface';
import type { DefaultOptionType } from 'rc-select/es/Select';

type ContextHolderType = ReactElement<any, string | JSXElementConstructor<any>>;

export type UseModalReturnType = readonly [Omit<ModalStaticFunctions, 'warn'>, ContextHolderType];
export type UseMessageReturnType = readonly [MessageInstance, ContextHolderType];
export type UseNotificationReturnType = readonly [NotificationInstance, ContextHolderType];

type ConfigUpdate = ModalFuncProps | ((prevConfig: ModalFuncProps) => ModalFuncProps);

export interface ModuleFuncReturn {
  destroy: () => void;
  update: (configUpdate: ConfigUpdate) => void;
}

/* select */
export interface LabeledValue extends DefaultOptionType {
  label: string;
  value: string;
}