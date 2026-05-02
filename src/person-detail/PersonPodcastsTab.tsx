import { Button, List, Typography } from "antd";
import { AudioOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import type { PodcastItem } from "./types";
import ListPagination from "./ListPagination";

const { Link, Text } = Typography;

interface Props {
  podcasts: PodcastItem[];
  authed: boolean;
  page: number;
  setPage: (n: number) => void;
  total: number;
  pageSize: number;
  onEdit: (item: PodcastItem) => void;
  onDelete: (item: PodcastItem) => void;
}

export default function PersonPodcastsTab({
  podcasts,
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
        dataSource={podcasts}
        locale={{ emptyText: "暂无播客" }}
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
                    <AudioOutlined style={{ marginRight: 6 }} />
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
