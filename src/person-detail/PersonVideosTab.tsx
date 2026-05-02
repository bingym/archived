import { Button, List, Typography } from "antd";
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
  return (
    <div>
      <List
        itemLayout="horizontal"
        dataSource={videos}
        locale={{ emptyText: "暂无视频" }}
        renderItem={(item) => (
          <List.Item
            actions={
              authed
                ? [
                    <Button key="edit" type="text" size="small" icon={<EditOutlined />} onClick={() => onEdit(item)} />,
                    <Button key="del" type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => onDelete(item)} />,
                  ]
                : []
            }
          >
            <List.Item.Meta
              title={
                item.url ? (
                  <Link href={item.url} target="_blank" rel="noopener noreferrer">
                    <LinkOutlined style={{ marginRight: 6 }} />
                    {item.title}
                  </Link>
                ) : (
                  <Text strong>{item.title}</Text>
                )
              }
            />
          </List.Item>
        )}
      />
      <ListPagination page={page} setPage={setPage} total={total} pageSize={pageSize} />
    </div>
  );
}
