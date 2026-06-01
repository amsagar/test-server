import React from 'react';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CloseOutlined,
  CheckOutlined,
  SendOutlined,
  ReloadOutlined,
  SettingOutlined,
  ToolOutlined,
  KeyOutlined,
  BulbOutlined,
  FileTextOutlined,
  HighlightOutlined,
  ApiOutlined,
  PlayCircleOutlined,
  InboxOutlined,
  RobotOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  LoadingOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  RollbackOutlined,
  SaveOutlined,
  UploadOutlined,
  DownloadOutlined,
  SearchOutlined,
  MoreOutlined,
  ArrowUpOutlined,
  ArrowLeftOutlined,
  StopOutlined,
  MessageOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  InfoCircleOutlined,
  CopyOutlined,
  LikeOutlined,
  DislikeOutlined,
} from '@ant-design/icons';

export type CustomIconName =
  | 'plus'
  | 'delete'
  | 'edit'
  | 'close'
  | 'check'
  | 'send'
  | 'reload'
  | 'settings'
  | 'tool'
  | 'key'
  | 'skill'
  | 'document'
  | 'style'
  | 'mcp'
  | 'play'
  | 'inbox'
  | 'robot'
  | 'caret-down'
  | 'caret-right'
  | 'loading'
  | 'warning'
  | 'check-circle'
  | 'close-circle'
  | 'undo'
  | 'save'
  | 'upload'
  | 'download'
  | 'search'
  | 'more'
  | 'arrowUp'
  | 'arrowLeft'
  | 'stop'
  | 'message'
  | 'sidebarFold'
  | 'sidebarUnfold'
  | 'info'
  | 'copy'
  | 'like'
  | 'dislike';

const iconMap: Record<
  CustomIconName,
  React.ComponentType<{
    style?: React.CSSProperties;
    className?: string;
  }>
> = {
  plus: PlusOutlined,
  delete: DeleteOutlined,
  edit: EditOutlined,
  close: CloseOutlined,
  check: CheckOutlined,
  send: SendOutlined,
  reload: ReloadOutlined,
  settings: SettingOutlined,
  tool: ToolOutlined,
  key: KeyOutlined,
  skill: BulbOutlined,
  document: FileTextOutlined,
  style: HighlightOutlined,
  mcp: ApiOutlined,
  play: PlayCircleOutlined,
  inbox: InboxOutlined,
  robot: RobotOutlined,
  'caret-down': CaretDownOutlined,
  'caret-right': CaretRightOutlined,
  loading: LoadingOutlined,
  warning: WarningOutlined,
  'check-circle': CheckCircleOutlined,
  'close-circle': CloseCircleOutlined,
  undo: RollbackOutlined,
  save: SaveOutlined,
  upload: UploadOutlined,
  download: DownloadOutlined,
  search: SearchOutlined,
  more: MoreOutlined,
  arrowUp: ArrowUpOutlined,
  arrowLeft: ArrowLeftOutlined,
  stop: StopOutlined,
  message: MessageOutlined,
  sidebarFold: MenuFoldOutlined,
  sidebarUnfold: MenuUnfoldOutlined,
  info: InfoCircleOutlined,
  copy: CopyOutlined,
  like: LikeOutlined,
  dislike: DislikeOutlined,
};

export interface CustomIconProps {
  name: CustomIconName;
  size?: number;
  color?: string;
  className?: string;
}

const CustomIcon: React.FC<CustomIconProps> = ({
  name,
  size = 14,
  color,
  className,
}) => {
  const Comp = iconMap[name];
  return (
    <Comp
      className={className}
      style={{ fontSize: size, color }}
    />
  );
};

export default CustomIcon;
