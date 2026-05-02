import { Button, Empty, Flex, Space, Typography, theme } from "antd";
import { DeleteOutlined, EditOutlined, LinkOutlined } from "@ant-design/icons";
import type { VideoItem } from "./types";
import ListPagination from "./ListPagination";

const { Link, Text } = Typography;

interface Props {
  videos: VideoItem[];
  authed: boolean;
  page: number;
  setPage: (n: number) => void;
  total: number;
  pageSize: number;
  onEdit: (item: VideoItem) => void;
  onDelete: (item: VideoItem) => void;
}

export default function PersonVideosTab({
  videos,
  authed,
  page,
  setPage,
  total,
  pageSize,
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
      <ListPagination page={page} setPage={setPage} total={total} pageSize={pageSize} />
    </div>
  );
}
