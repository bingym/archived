import { Button, Card, Flex, Image, Pagination, Segmented, Select, Typography, theme } from "antd";
import { DeleteOutlined, EditOutlined, StarFilled } from "@ant-design/icons";
import { resolveImg } from "../lib/img";
import { ITEM_PAGE_SIZE_OPTIONS, normalizeItemPageSize, type ItemPageSize } from "./constants";
import type { TweetItem } from "./types";
import type { TweetsStarredFilter } from "./personDetailUrl";

const { Text } = Typography;

const CARD_GAP = 16;

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
    <div>
      <Flex align="center" wrap="wrap" gap={token.marginSM} style={{ marginBottom: token.marginMD }}>
        <Segmented<TweetsStarredFilter>
          value={starredFilter}
          onChange={onStarredFilterChange}
          options={[
            { label: "全部", value: "all" },
            { label: "已星标", value: "starred" },
          ]}
        />
      </Flex>
      <Flex vertical gap={CARD_GAP}>
        {tweets.map((item) => (
          <Card key={item.id} styles={{ body: { padding: token.paddingLG } }}>
            <Flex justify="space-between" align="flex-start" gap={token.marginSM} wrap="wrap">
              <Flex align="center" gap={token.marginXS} wrap="wrap">
                {item.starred && (
                  <StarFilled style={{ color: token.colorWarning, fontSize: token.fontSize }} aria-label="已星标" />
                )}
                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                  {item.datetime}
                </Text>
              </Flex>
              {authed && (
                <Flex gap={token.marginXXS}>
                  <Button type="text" size="small" icon={<EditOutlined />} onClick={() => onEdit(item)} aria-label="编辑" />
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => onDelete(item)} aria-label="删除" />
                </Flex>
              )}
            </Flex>
            <div
              style={{ marginTop: token.marginSM, fontSize: token.fontSize, lineHeight: token.lineHeight }}
              dangerouslySetInnerHTML={{ __html: item.content ?? "" }}
            />
            {item.metadata != null && item.metadata.trim() !== "" && (
              <Text
                type="secondary"
                style={{
                  display: "block",
                  marginTop: token.marginSM,
                  fontSize: token.fontSizeSM,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                <span style={{ fontWeight: token.fontWeightStrong }}>Meta：</span>
                {item.metadata}
              </Text>
            )}
            {item.imgs && item.imgs.length > 0 && (
              <Flex wrap="wrap" gap={token.marginSM} style={{ marginTop: token.marginMD }}>
                {item.imgs.map((k) => (
                  <Image
                    key={k}
                    src={resolveImg(k)}
                    alt=""
                    width={200}
                    height={200}
                    style={{ objectFit: "cover", borderRadius: token.borderRadius }}
                    preview={{ src: resolveImg(k) }}
                  />
                ))}
              </Flex>
            )}
          </Card>
        ))}
      </Flex>
      {totalPages > 0 && (
        <Flex justify="center" align="center" gap={token.marginSM} style={{ marginTop: token.marginLG, marginBottom: token.marginMD }}>
          <Pagination
            current={page}
            total={totalPages * pageSize}
            pageSize={pageSize}
            onChange={onPageChange}
            showSizeChanger={false}
            hideOnSinglePage={!onPageSizeChange}
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
