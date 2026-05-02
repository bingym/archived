import { Button, Card } from "antd";
import type { AnswerItem } from "./types";
import { formatDatetime } from "./utils";
import ListPagination from "./ListPagination";

interface Props {
  answers: AnswerItem[];
  authed: boolean;
  page: number;
  setPage: (n: number) => void;
  total: number;
  pageSize: number;
  onEdit: (item: AnswerItem) => void;
  onDelete: (item: AnswerItem) => void;
}

export default function PersonAnswersTab({
  answers,
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
        {answers.map((item) => (
          <li key={item.id} className="mb-4">
            <Card styles={{ body: { padding: 16 } }}>
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-400 mb-1">{formatDatetime(item.datetime)}</div>
                {authed && (
                  <div className="flex gap-1">
                    <Button size="small" onClick={() => onEdit(item)}>
                      编辑
                    </Button>
                    <Button size="small" danger onClick={() => onDelete(item)}>
                      ×
                    </Button>
                  </div>
                )}
              </div>
              <div className="font-bold mb-2">Q: {item.question}</div>
              <div className="text-base whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: item.content ?? "" }} />
            </Card>
          </li>
        ))}
      </ul>
      <ListPagination page={page} setPage={setPage} total={total} pageSize={pageSize} />
    </div>
  );
}
