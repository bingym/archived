import { Button } from "antd";
import type { VideoItem } from "./types";
import ListPagination from "./ListPagination";

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
      <ul>
        {videos.map((item) => (
          <li key={item.id} style={{ marginBottom: 12 }} className="flex items-center gap-2">
            {item.url ? (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline font-bold">
                {item.title}
              </a>
            ) : (
              <span className="font-bold">{item.title}</span>
            )}
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
        ))}
      </ul>
      <ListPagination page={page} setPage={setPage} total={total} pageSize={pageSize} />
    </div>
  );
}
