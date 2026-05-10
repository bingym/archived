import { Button, Card, Flex, Image, Pagination, Segmented, Select, Typography, theme } from "antd";
import { DeleteOutlined, EditOutlined, StarFilled } from "@ant-design/icons";
import { resolveImg } from "../lib/img";
import { ITEM_PAGE_SIZE_OPTIONS, normalizeItemPageSize, type ItemPageSize } from "./constants";
import type { TweetItem } from "./types";
import type { TweetsStarredFilter } from "./personDetailUrl";

const { Text } = Typography;

interface Props {
  tweets: TweetItem[];
  authed: boolean;
  starredFilter: TweetsStarredFilter;
  onStarredFilterChange: (next: TweetsStarredFilter) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: ItemPageSize;
  onPageSizeChange?: (size: ItemPageSize) => void;
  onEdit: (item: TweetItem) => void;
  onDelete: (item: TweetItem) => void;
}

export default function PersonTweetsTab({
  tweets,
  authed,
  starredFilter,
  onStarredFilterChange,
  page,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  onEdit,
  onDelete,
}: Props) {
  const { token } = theme.useToken();
  return (
    <div className="tweets-reading-container">
      <Flex align="center" wrap="wrap" gap={token.marginSM} style={{ marginBottom: 20 }}>
        <Segmented<TweetsStarredFilter>
          value={starredFilter}
          onChange={onStarredFilterChange}
          options={[
            { label: "全部", value: "all" },
            { label: "已星标", value: "starred" },
          ]}
        />
      </Flex>
      <Flex vertical gap={24}>
        {tweets.map((item) => (
          <Card
            key={item.id}
            className="tweet-card"
            styles={{
              body: {
                padding: "24px 28px",
              },
            }}
            style={{ borderRadius: 12 }}
          >
            <Flex justify="space-between" align="flex-start" gap={token.marginSM} wrap="wrap">
              <Flex align="center" gap={8} wrap="wrap">
                {item.starred && (
                  <StarFilled style={{ color: "#b8860b", fontSize: 13 }} aria-label="已星标" />
                )}
                <Text style={{ fontSize: 13, color: "#9ca3af", letterSpacing: "0.2px" }}>
                  {item.datetime}
                </Text>
              </Flex>
              {authed && (
                <Flex gap={2}>
                  <Button type="text" size="small" icon={<EditOutlined />} onClick={() => onEdit(item)} aria-label="编辑" />
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => onDelete(item)} aria-label="删除" />
                </Flex>
              )}
            </Flex>
            <div
              className="tweet-content"
              style={{ marginTop: 12 }}
              dangerouslySetInnerHTML={{ __html: item.content ?? "" }}
            />
            {item.metadata != null && item.metadata.trim() !== "" && (
              <Text
                className="tweet-meta"
                style={{
                  display: "block",
                  marginTop: 12,
                  fontSize: 13,
                  color: "#9ca3af",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                <span style={{ fontWeight: 500 }}>Meta：</span>
                {item.metadata}
              </Text>
            )}
            {item.imgs && item.imgs.length > 0 && (
              <Flex wrap="wrap" gap={12} style={{ marginTop: 16 }}>
                {item.imgs.map((k) => (
                  <Image
                    key={k}
                    src={resolveImg(k, { width: 400, height: 400, fit: "cover" })}
                    alt=""
                    width={200}
                    height={200}
                    className="tweet-img"
                    style={{ objectFit: "cover", borderRadius: 12 }}
                    preview={{ src: resolveImg(k, { quality: 90 }) }}
                  />
                ))}
              </Flex>
            )}
          </Card>
        ))}
      </Flex>
      {totalPages > 0 && (
        <Flex justify="center" align="center" gap={12} style={{ marginTop: 32, marginBottom: 16 }}>
          <Pagination
            current={page}
            total={totalPages * pageSize}
            pageSize={pageSize}
            onChange={onPageChange}
            showSizeChanger={false}
            hideOnSinglePage={!onPageSizeChange}
            simple={true}
          />
          {onPageSizeChange && (
            <Select
              value={pageSize}
              onChange={(v) => onPageSizeChange(normalizeItemPageSize(v))}
              options={ITEM_PAGE_SIZE_OPTIONS.map((n) => ({ label: `${n} 条/页`, value: n }))}
              size="middle"
            />
          )}
        </Flex>
      )}
    </div>
  );
}
