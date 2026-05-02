import { useState } from "react";
import { Button, Modal, Typography } from "antd";
import type { ArticleItem } from "./types";
import ListPagination from "./ListPagination";

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
  const [modalContent, setModalContent] = useState<string | null>(null);

  return (
    <div>
      <ul>
        {articles.map((item) => {
          const firstLine = ((item.content ?? "").split("\n")[0] || item.title).replace(/^#+\s*/, "") || item.title;
          return (
            <li key={item.id} style={{ marginBottom: 16 }} className="flex items-center gap-2">
              <button
                type="button"
                className="text-blue-700 underline font-bold hover:text-blue-900 bg-transparent border-0 cursor-pointer p-0 font-inherit"
                onClick={() => setModalContent(item.content ?? "")}
              >
                {firstLine}
              </button>
              {authed && (
                <>
                  <Button size="small" onClick={() => onEdit(item)}>
                    编辑
                  </Button>
                  <Button size="small" danger onClick={() => onDelete(item)}>
                    ×
                  </Button>
                </>
              )}
            </li>
          );
        })}
      </ul>
      <Modal
        open={modalContent !== null}
        onCancel={() => setModalContent(null)}
        footer={null}
        width="80vw"
        style={{ top: 40 }}
        zIndex={1000}
        title="正文"
        destroyOnClose
      >
        <Typography.Paragraph style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>
          {modalContent ?? ""}
        </Typography.Paragraph>
      </Modal>
      <ListPagination page={page} setPage={setPage} total={total} pageSize={pageSize} />
    </div>
  );
}
