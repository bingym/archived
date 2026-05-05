import { useState } from "react";
import { Button, Empty, Flex, Modal, Space, Typography, theme } from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import type { ItemPageSize } from "./constants";
import type { ArticleItem } from "./types";
import ListPagination from "./ListPagination";

const { Paragraph } = Typography;

interface Props {
  articles: ArticleItem[];
  authed: boolean;
  nextCursor: string | null;
  prevCursor: string | null;
  onNext: () => void;
  onPrev: () => void;
  pageSize: ItemPageSize;
  onPageSizeChange?: (size: ItemPageSize) => void;
  onEdit: (item: ArticleItem) => void;
  onDelete: (item: ArticleItem) => void;
}

export default function PersonArticlesTab({
  articles,
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
  const [modalContent, setModalContent] = useState<string | null>(null);

  return (
    <div>
      {articles.length === 0 ? (
        <Empty description="暂无文章" />
      ) : (
        <Flex vertical>
          {articles.map((item) => {
            const displayTitle =
              (item.title ?? "").trim() ||
              ((item.content ?? "").split("\n")[0] || "")
                .replace(/^#+\s*/, "")
                .trim();
            return (
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
                  <Button
                    type="link"
                    onClick={() => setModalContent(item.content ?? "")}
                    style={{ padding: 0, height: "auto", fontWeight: token.fontWeightStrong }}
                  >
                    {displayTitle || "(Untitled)"}
                  </Button>
                </div>
                {authed ? (
                  <Space size={0}>
                    <Button type="text" size="small" icon={<EditOutlined />} onClick={() => onEdit(item)} />
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => onDelete(item)} />
                  </Space>
                ) : null}
              </Flex>
            );
          })}
        </Flex>
      )}
      <Modal
        open={modalContent !== null}
        onCancel={() => setModalContent(null)}
        footer={null}
        width={960}
        style={{ top: 48 }}
        zIndex={1000}
        title="正文"
        destroyOnHidden
        mask={{ closable: true }}
      >
        <Paragraph style={{ whiteSpace: "pre-wrap", marginBottom: 0, maxHeight: "70vh", overflow: "auto" }}>
          {modalContent ?? ""}
        </Paragraph>
      </Modal>
      <ListPagination nextCursor={nextCursor} prevCursor={prevCursor} onNext={onNext} onPrev={onPrev} pageSize={pageSize} onPageSizeChange={onPageSizeChange} />
    </div>
  );
}
