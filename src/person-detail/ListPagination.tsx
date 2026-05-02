import { Pagination } from "antd";

export interface ListPaginationProps {
  page: number;
  setPage: (n: number) => void;
  total: number;
  pageSize: number;
}

export default function ListPagination({ page, setPage, total, pageSize }: ListPaginationProps) {
  return (
    <div className="flex justify-center my-4">
      <Pagination
        current={page}
        total={total}
        pageSize={pageSize}
        onChange={setPage}
        showSizeChanger={false}
        hideOnSinglePage
        showLessItems
      />
    </div>
  );
}
