import { Flex, Pagination, theme } from "antd";

export interface ListPaginationProps {
  page: number;
  setPage: (n: number) => void;
  total: number;
  pageSize: number;
}

export default function ListPagination({ page, setPage, total, pageSize }: ListPaginationProps) {
  const { token } = theme.useToken();
  return (
    <Flex justify="center" style={{ marginTop: token.marginLG, marginBottom: token.marginMD }}>
      <Pagination
        current={page}
        total={total}
        pageSize={pageSize}
        onChange={setPage}
        showSizeChanger={false}
        hideOnSinglePage
        showLessItems
      />
    </Flex>
  );
}
