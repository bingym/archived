import { Button } from "antd";
import { resolveImg } from "../lib/img";
import type { BookItem } from "./types";
import ListPagination from "./ListPagination";

interface Props {
  books: BookItem[];
  authed: boolean;
  page: number;
  setPage: (n: number) => void;
  total: number;
  pageSize: number;
  onEdit: (item: BookItem) => void;
  onDelete: (item: BookItem) => void;
}

export default function PersonBooksTab({
  books,
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
      <div style={{ display: "flex", flexWrap: "wrap", gap: "32px 24px", justifyContent: "flex-start" }}>
        {books.map((item) => (
          <div
            key={item.id}
            style={{
              background: "#fff",
              borderRadius: 8,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              position: "relative",
            }}
          >
            {authed && (
              <div className="absolute top-1 right-1 flex gap-1">
                <Button size="small" onClick={() => onEdit(item)}>
                  编辑
                </Button>
                <Button size="small" danger onClick={() => onDelete(item)}>
                  ×
                </Button>
              </div>
            )}
            {item.cover && (
              <img
                src={resolveImg(item.cover)}
                alt={item.title}
                style={{ width: "10rem", height: "10rem", objectFit: "cover", borderRadius: 4, marginBottom: 12 }}
              />
            )}
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontWeight: 700, fontSize: 16, color: "#0078d7", textAlign: "center", textDecoration: "none" }}
              >
                {item.title}
              </a>
            ) : (
              <span style={{ fontWeight: 700, fontSize: 16, textAlign: "center" }}>{item.title}</span>
            )}
          </div>
        ))}
      </div>
      <ListPagination page={page} setPage={setPage} total={total} pageSize={pageSize} />
    </div>
  );
}
