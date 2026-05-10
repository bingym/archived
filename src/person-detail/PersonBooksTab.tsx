import { Button, Card, Col, Image, Row, Typography } from "antd";
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
  return (
    <div>
      <Row gutter={[20, 20]}>
        {books.map((item) => (
          <Col xs={24} sm={12} md={8} lg={6} key={item.id}>
            <Card
              hoverable
              className="book-card"
              styles={{ body: { padding: "16px" } }}
              style={{ borderRadius: 12, border: "1px solid #e8e5e0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              cover={
                item.cover ? (
                  <div style={{ padding: "12px 12px 0" }}>
                    <Image
                      alt={item.title}
                      src={resolveImg(item.cover, { width: 400, height: 360, fit: "cover" })}
                      width="100%"
                      style={{ height: 180, objectFit: "cover", borderRadius: 8 }}
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
                    <Link href={item.url} target="_blank" rel="noopener noreferrer" ellipsis style={{ fontSize: 14 }}>
                      {item.title}
                    </Link>
                  ) : (
                    <Text strong ellipsis style={{ fontSize: 14 }}>
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
