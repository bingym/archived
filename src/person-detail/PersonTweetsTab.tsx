import { Button, Card, Flex, Image, Segmented, Typography, theme } from "antd";
import { DeleteOutlined, EditOutlined, StarFilled } from "@ant-design/icons";
import { resolveImg } from "../lib/img";
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
  starredFilter,
  onStarredFilterChange,
  page,
  setPage,
  total,
  pageSize,
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
            { label: "未星标", value: "unstarred" },
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
      <ListPagination page={page} setPage={setPage} total={total} pageSize={pageSize} />
    </div>
  );
}
