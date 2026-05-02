import { Button, Card, Flex, Image, Typography, theme } from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { resolveImg } from "../lib/img";
import type { TweetItem } from "./types";
import ListPagination from "./ListPagination";

const { Text } = Typography;

const CARD_GAP = 16;

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
  const { token } = theme.useToken();
  return (
    <div>
      <Flex vertical gap={CARD_GAP}>
        {tweets.map((item) => (
          <Card key={item.id} styles={{ body: { padding: token.paddingLG } }}>
            <Flex justify="space-between" align="flex-start" gap={token.marginSM} wrap="wrap">
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                {item.datetime}
              </Text>
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
