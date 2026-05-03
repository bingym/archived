import { Flex, Pagination, theme } from "antd";
import { ITEM_PAGE_SIZE_OPTIONS, normalizeItemPageSize, type ItemPageSize } from "./constants";

export interface ListPaginationProps {
  page: number;
  setPage: (n: number) => void;
  total: number;
  pageSize: ItemPageSize;
  /** 提供时在分页条展示每页条数切换（10 / 20 / 50），变更后应回到第 1 页 */
  onPageSizeChange?: (size: ItemPageSize) => void;
}

export default function ListPagination({ page, setPage, total, pageSize, onPageSizeChange }: ListPaginationProps) {
  const { token } = theme.useToken();
  const pageSizeOpts = ITEM_PAGE_SIZE_OPTIONS.map(String);
  /**
   * rc-pagination 在改 pageSize 时会先触发 onShowSizeChange 再触发 onChange(page, newSize)。
   * 若只把 onChange 绑到 goPage，第二次回调里仍读到旧的 pageSize，会用错误参数再 navigate 一次，把刚改好的 URL 盖掉。
   * 因此：每页条数变化时只走 onPageSizeChange（回到第 1 页）；仅翻页时走 setPage。
   */
  const handlePaginationChange = (nextPage: number, nextPageSize?: number) => {
    const resolved: ItemPageSize =
      nextPageSize !== undefined && Number.isFinite(Number(nextPageSize))
        ? normalizeItemPageSize(nextPageSize)
        : pageSize;
    if (onPageSizeChange && resolved !== pageSize) {
      onPageSizeChange(resolved);
      return;
    }
    setPage(nextPage);
  };

  return (
    <Flex justify="center" style={{ marginTop: token.marginLG, marginBottom: token.marginMD }}>
      <Pagination
        current={page}
        total={total}
        pageSize={pageSize}
        onChange={handlePaginationChange}
        showSizeChanger={Boolean(onPageSizeChange)}
        pageSizeOptions={pageSizeOpts}
        hideOnSinglePage={total === 0 || (total <= pageSize && !onPageSizeChange)}
        showLessItems
      />
    </Flex>
  );
}
