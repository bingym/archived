import { Button, Empty, Flex, Space, Typography, theme } from "antd";
import { DeleteOutlined, EditOutlined, LinkOutlined } from "@ant-design/icons";
import type { ItemPageSize } from "./constants";
import type { VideoItem } from "./types";
import ListPagination from "./ListPagination";

const { Link, Text } = Typography;

interface Props {
  videos: VideoItem[];
  authed: boolean;
  nextCursor: string | null;
  prevCursor: string | null;
  onNext: () => void;
  onPrev: () => void;
  pageSize: ItemPageSize;
  onPageSizeChange?: (size: ItemPageSize) => void;
  onEdit: (item: VideoItem) => void;
  onDelete: (item: VideoItem) => void;
}

export default function PersonVideosTab({
  videos,
  authed,
  nextCursor,
  prevCursor,
  onNext,
  onPrev,
  pageSize,
  onPageSizeChange,
  onEdit,
  onDelete,
}: Props) {
  const { token } = theme.useToken();

  return (
    <div>
      {videos.length === 0 ? (
        <Empty description="暂无视频" />
      ) : (
        <Flex vertical>
          {videos.map((item) => (
            <Flex
              key={item.id}
              align="center"
              justify="space-between"
              gap={token.marginSM}
              style={{
                padding: `${token.paddingSM}px 0`,
                borderBottom: `1px solid ${token.colorSplit}`,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                {item.url ? (
                  <Link href={item.url} target="_blank" rel="noopener noreferrer">
                    <LinkOutlined style={{ marginRight: 6 }} />
                    {item.title}
                  </Link>
                ) : (
                  <Text strong>{item.title}</Text>
                )}
              </div>
              {authed ? (
                <Space size={0}>
                  <Button type="text" size="small" icon={<EditOutlined />} onClick={() => onEdit(item)} />
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => onDelete(item)} />
                </Space>
              ) : null}
            </Flex>
          ))}
        </Flex>
      )}
      <ListPagination nextCursor={nextCursor} prevCursor={prevCursor} onNext={onNext} onPrev={onPrev} pageSize={pageSize} onPageSizeChange={onPageSizeChange} />
    </div>
  );
}
