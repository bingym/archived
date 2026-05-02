import { Button, Card } from "antd";
import { resolveImg } from "../lib/img";
import type { TweetItem } from "./types";
import ListPagination from "./ListPagination";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";

const CARD_BODY_PADDING = 16;
/** 推文卡片之间的垂直间距（原 mb-4 偏紧） */
const CARD_GAP = 8;

interface Props {
  tweets: TweetItem[];
  authed: boolean;
  page: number;
  setPage: (n: number) => void;
  total: number;
  pageSize: number;
  onEdit: (item: TweetItem) => void;
  onDelete: (item: TweetItem) => void;
}

export default function PersonTweetsTab({
  tweets,
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
      <div style={{ display: "flex", flexDirection: "column", gap: CARD_GAP }}>
        {tweets.map((item) => (
          <Card
            key={item.id}
            className="relative"
            styles={{
              body: {
                padding: CARD_BODY_PADDING,
              },
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-400">{item.datetime}</div>
              {authed && (
                <div className="flex gap-1">
                  <Button type="text" size="small" onClick={() => onEdit(item)} icon={<EditOutlined />} />
                  <Button type="text" size="small" danger onClick={() => onDelete(item)} icon={<DeleteOutlined />} />
                </div>
              )}
            </div>
            <div className="text-base whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: item.content ?? "" }} />
            {item.imgs && item.imgs.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-4">
                {item.imgs.map((k) => (
                  <a key={k} href={resolveImg(k)} target="_blank" rel="noopener noreferrer">
                    <img
                      src={resolveImg(k)}
                      alt=""
                      style={{ maxWidth: 200, maxHeight: 200, objectFit: "cover", borderRadius: 6 }}
                    />
                  </a>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
      <ListPagination page={page} setPage={setPage} total={total} pageSize={pageSize} />
    </div>
  );
}
