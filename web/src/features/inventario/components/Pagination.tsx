type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  label: string;
  onPageChange: (page: number) => void;
};

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  label,
  onPageChange,
}: PaginationProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 md:px-6 py-4 border-t bg-gray-50">
      <div className="text-xs md:text-sm text-gray-600 text-center md:text-left">
        Mostrando {startItem} - {endItem} de {totalItems} {label}
      </div>
      <div className="flex items-center gap-2 md:gap-4 flex-wrap justify-center">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 md:px-4 py-2 rounded-md bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm font-medium text-gray-700"
        >
          Anterior
        </button>
        <span className="text-xs md:text-sm text-gray-700 min-w-[100px] md:min-w-[120px] text-center">
          Pagina {currentPage} de {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3 md:px-4 py-2 rounded-md bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm font-medium text-gray-700"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
