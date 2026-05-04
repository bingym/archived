import { Button, Card, Flex, Image, Segmented, Typography, theme } from "antd";
import { DeleteOutlined, EditOutlined, StarFilled } from "@ant-design/icons";
import { resolveImg } from "../lib/img";
import type { ItemPageSize } from "./constants";
import type { TweetItem } from "./types";
import type { TweetsStarredFilter } from "./personDetailUrl";
import ListPagination from "./ListPagination";

const { Text } = Typography;

const CARD_GAP = 16;

interface Props {
  tweets: TweetItem[];
  authed: boolean;
  starredFilter: TweetsStarredFilter;
  onStarredFilterChange: (next: TweetsStarredFilter) => void;
  nextCursor: string | null;
  prevCursor: string | null;
  onNext: () => void;
  onPrev: () => void;
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
      <ListPagination nextCursor={nextCursor} prevCursor={prevCursor} onNext={onNext} onPrev={onPrev} pageSize={pageSize} onPageSizeChange={onPageSizeChange} />
    </div>
  );
}
