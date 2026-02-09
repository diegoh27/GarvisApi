type GenericColumn<T> = {
  key: string;
  header: string;
  headerClassName?: string;
  cellClassName?: string;
  render: (row: T, index: number) => React.ReactNode;
};

type GenericTableProps<T> = {
  columns: GenericColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  tableClassName?: string;
  theadClassName?: string;
  getRowClassName?: (row: T, index: number) => string;
  isLoading?: boolean;
  loadingState?: React.ReactNode;
  emptyState?: React.ReactNode;
};

export default function GenericTable<T>({
  columns,
  rows,
  rowKey,
  tableClassName,
  theadClassName,
  getRowClassName,
  isLoading = false,
  loadingState,
  emptyState,
}: GenericTableProps<T>) {
  const colSpan = columns.length;

  return (
    <table className={tableClassName}>
      <thead className={theadClassName}>
        <tr>
          {columns.map((column) => (
            <th key={column.key} className={column.headerClassName}>
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {isLoading ? (
          <tr>
            <td colSpan={colSpan} className="px-3 md:px-6 py-8 text-center text-gray-500">
              {loadingState ?? "Cargando..."}
            </td>
          </tr>
        ) : rows.length === 0 ? (
          <tr>
            <td colSpan={colSpan} className="px-3 md:px-6 py-8 text-center text-gray-500">
              {emptyState ?? "No hay registros"}
            </td>
          </tr>
        ) : (
          rows.map((row, index) => (
            <tr
              key={rowKey(row, index)}
              className={getRowClassName ? getRowClassName(row, index) : undefined}
            >
              {columns.map((column) => (
                <td key={column.key} className={column.cellClassName}>
                  {column.render(row, index)}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
