import { Button, Card, Col, Image, Row, Typography, theme } from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { resolveImg } from "../lib/img";
import type { ItemPageSize } from "./constants";
import type { BookItem } from "./types";
import ListPagination from "./ListPagination";

const { Link, Text } = Typography;

interface Props {
  books: BookItem[];
  authed: boolean;
  nextCursor: string | null;
  prevCursor: string | null;
  onNext: () => void;
  onPrev: () => void;
  pageSize: ItemPageSize;
  onPageSizeChange?: (size: ItemPageSize) => void;
  onEdit: (item: BookItem) => void;
  onDelete: (item: BookItem) => void;
}

export default function PersonBooksTab({
  books,
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
      <Row gutter={[token.marginLG, token.marginLG]}>
        {books.map((item) => (
          <Col xs={24} sm={12} md={8} lg={6} key={item.id}>
            <Card
              hoverable
              styles={{ body: { padding: token.paddingMD } }}
              cover={
                item.cover ? (
                  <div style={{ padding: token.paddingSM, paddingBottom: 0 }}>
                    <Image
                      alt={item.title}
                      src={resolveImg(item.cover)}
                      width="100%"
                      style={{ height: 160, objectFit: "cover" }}
                      preview={false}
                    />
                  </div>
                ) : undefined
              }
              actions={
                authed
                  ? [
                      <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => onEdit(item)} aria-label="编辑" />,
                      <Button key="del" type="text" danger icon={<DeleteOutlined />} onClick={() => onDelete(item)} aria-label="删除" />,
                    ]
                  : undefined
              }
            >
              <Card.Meta
                title={
                  item.url ? (
                    <Link href={item.url} target="_blank" rel="noopener noreferrer" ellipsis>
                      {item.title}
                    </Link>
                  ) : (
                    <Text strong ellipsis>
                      {item.title}
                    </Text>
                  )
                }
              />
            </Card>
          </Col>
        ))}
      </Row>
      <ListPagination nextCursor={nextCursor} prevCursor={prevCursor} onNext={onNext} onPrev={onPrev} pageSize={pageSize} onPageSizeChange={onPageSizeChange} />
    </div>
  );
}
