import { Button, Card, Empty, Flex, Typography, theme } from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import type { ItemPageSize } from "./constants";
import type { AnswerItem } from "./types";
import { formatDatetime } from "./utils";
import ListPagination from "./ListPagination";

const { Text, Title } = Typography;

interface Props {
  answers: AnswerItem[];
  authed: boolean;
  page: number;
  setPage: (n: number) => void;
  total: number;
  pageSize: ItemPageSize;
  onPageSizeChange?: (size: ItemPageSize) => void;
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
  onPageSizeChange,
  onEdit,
  onDelete,
}: Props) {
  const { token } = theme.useToken();
  return (
    <div>
      {answers.length === 0 ? (
        <Empty description="暂无问答" />
      ) : (
        <Flex vertical>
          {answers.map((item) => (
            <Flex
              key={item.id}
              vertical
              style={{ paddingBlock: token.paddingMD, borderBlockEnd: `1px solid ${token.colorSplit}` }}
            >
              <Card size="small" styles={{ body: { padding: token.paddingLG } }}>
                <Flex justify="space-between" align="flex-start" gap={token.marginSM} wrap="wrap">
                  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    {formatDatetime(item.datetime)}
                  </Text>
                  {authed && (
                    <Flex gap={token.marginXXS}>
                      <Button type="text" size="small" icon={<EditOutlined />} onClick={() => onEdit(item)} />
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => onDelete(item)} />
                    </Flex>
                  )}
                </Flex>
                <Title level={5} style={{ marginTop: token.marginSM, marginBottom: token.marginXS }}>
                  Q: {item.question}
                </Title>
                <div
                  style={{ fontSize: token.fontSize, lineHeight: token.lineHeight }}
                  dangerouslySetInnerHTML={{ __html: item.content ?? "" }}
                />
              </Card>
            </Flex>
          ))}
        </Flex>
      )}
      <ListPagination page={page} setPage={setPage} total={total} pageSize={pageSize} onPageSizeChange={onPageSizeChange} />
    </div>
  );
}
