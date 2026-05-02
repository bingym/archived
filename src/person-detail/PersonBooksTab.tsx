import { Button, Card, Col, Image, Row, Typography, theme } from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { resolveImg } from "../lib/img";
import type { BookItem } from "./types";
import ListPagination from "./ListPagination";

const { Link, Text } = Typography;

interface Props {
  books: BookItem[];
  authed: boolean;
  page: number;
  setPage: (n: number) => void;
  total: number;
  pageSize: number;
  onEdit: (item: BookItem) => void;
  onDelete: (item: BookItem) => void;
}

export default function PersonBooksTab({
  books,
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
      <ListPagination page={page} setPage={setPage} total={total} pageSize={pageSize} />
    </div>
  );
}
