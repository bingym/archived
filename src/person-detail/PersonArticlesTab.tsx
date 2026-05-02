import { useState } from "react";
import { Button, List, Modal, Typography, theme } from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import type { ArticleItem } from "./types";
import ListPagination from "./ListPagination";

const { Paragraph } = Typography;

interface Props {
  articles: ArticleItem[];
  authed: boolean;
  page: number;
  setPage: (n: number) => void;
  total: number;
  pageSize: number;
  onEdit: (item: ArticleItem) => void;
  onDelete: (item: ArticleItem) => void;
}

export default function PersonArticlesTab({
  articles,
  authed,
  page,
  setPage,
  total,
  pageSize,
  onEdit,
  onDelete,
}: Props) {
  const { token } = theme.useToken();
  const [modalContent, setModalContent] = useState<string | null>(null);

  return (
    <div>
      <List
        itemLayout="horizontal"
        dataSource={articles}
        locale={{ emptyText: "暂无文章" }}
        renderItem={(item) => {
          const firstLine = ((item.content ?? "").split("\n")[0] || item.title).replace(/^#+\s*/, "") || item.title;
          return (
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
                  <Button
                    type="link"
                    onClick={() => setModalContent(item.content ?? "")}
                    style={{ padding: 0, height: "auto", fontWeight: token.fontWeightStrong }}
                  >
                    {firstLine}
                  </Button>
                }
              />
            </List.Item>
          );
        }}
      />
      <Modal
        open={modalContent !== null}
        onCancel={() => setModalContent(null)}
        footer={null}
        width={960}
        style={{ top: 48 }}
        zIndex={1000}
        title="正文"
        destroyOnClose
        maskClosable
      >
        <Paragraph style={{ whiteSpace: "pre-wrap", marginBottom: 0, maxHeight: "70vh", overflow: "auto" }}>
          {modalContent ?? ""}
        </Paragraph>
      </Modal>
      <ListPagination page={page} setPage={setPage} total={total} pageSize={pageSize} />
    </div>
  );
}
