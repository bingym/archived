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
  nextCursor: string | null;
  prevCursor: string | null;
  onNext: () => void;
  onPrev: () => void;
  pageSize: ItemPageSize;
  onPageSizeChange?: (size: ItemPageSize) => void;
  onEdit: (item: AnswerItem) => void;
  onDelete: (item: AnswerItem) => void;
}

export default function PersonAnswersTab({
  answers,
  authed,
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
      {answers.length === 0 ? (
        <Empty description="暂无问答" />
      ) : (
        <Flex vertical gap={20}>
          {answers.map((item) => (
            <Card
              key={item.id}
              styles={{ body: { padding: "24px 28px" } }}
              style={{ borderRadius: 12, border: "1px solid #e8e5e0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
            >
              <Flex justify="space-between" align="flex-start" gap={token.marginSM} wrap="wrap">
                <Text style={{ fontSize: 13, color: "#9ca3af", letterSpacing: "0.2px" }}>
                  {formatDatetime(item.datetime)}
                </Text>
                {authed && (
                  <Flex gap={2}>
                    <Button type="text" size="small" icon={<EditOutlined />} onClick={() => onEdit(item)} />
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => onDelete(item)} />
                  </Flex>
                )}
              </Flex>
              <Title level={5} style={{ marginTop: 12, marginBottom: 8, fontSize: 16, fontWeight: 600 }}>
                Q: {item.question}
              </Title>
              <div
                className="answer-content"
                dangerouslySetInnerHTML={{ __html: item.content ?? "" }}
              />
            </Card>
          ))}
        </Flex>
      )}
      <ListPagination nextCursor={nextCursor} prevCursor={prevCursor} onNext={onNext} onPrev={onPrev} pageSize={pageSize} onPageSizeChange={onPageSizeChange} />
    </div>
  );
}
