import { Button, Flex, Select, theme } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { ITEM_PAGE_SIZE_OPTIONS, normalizeItemPageSize, type ItemPageSize } from "./constants";

export interface ListPaginationProps {
  nextCursor: string | null;
  prevCursor: string | null;
  onNext: () => void;
  onPrev: () => void;
  pageSize: ItemPageSize;
  onPageSizeChange?: (size: ItemPageSize) => void;
}

export default function ListPagination({
  nextCursor,
  prevCursor,
  onNext,
  onPrev,
  pageSize,
  onPageSizeChange,
}: ListPaginationProps) {
  const { token } = theme.useToken();

  const hasPrev = prevCursor !== null;
  const hasNext = nextCursor !== null;
  const showBar = hasPrev || hasNext || Boolean(onPageSizeChange);

  if (!showBar) return null;

  return (
    <Flex justify="center" align="center" gap={token.marginSM} style={{ marginTop: token.marginLG, marginBottom: token.marginMD }}>
      <Button
        icon={<LeftOutlined />}
        disabled={!hasPrev}
        onClick={onPrev}
      >
        上一页
      </Button>
      <Button
        disabled={!hasNext}
        onClick={onNext}
      >
        下一页
        <RightOutlined />
      </Button>
      {onPageSizeChange && (
        <Select
          value={pageSize}
          onChange={(v) => onPageSizeChange(normalizeItemPageSize(v))}
          options={ITEM_PAGE_SIZE_OPTIONS.map((n) => ({ label: `${n} 条/页`, value: n }))}
          style={{ marginLeft: token.marginSM }}
          size="middle"
        />
      )}
    </Flex>
  );
}
