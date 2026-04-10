import { ChevronLeft, ChevronRight } from "lucide-react";

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

  // Generate an array of page numbers to display
  // Show up to 5 pages around the current page to prevent massive lists
  const pageNumbers = [];
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, startPage + 4);
  
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
      <span>
        Mostrando {totalItems === 0 ? "0 de 0" : `${startItem} a ${endItem} de ${totalItems}`} {label}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {pageNumbers.map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                page === currentPage
                  ? "bg-teal-600 text-white"
                  : "hover:bg-gray-200 text-gray-700"
              }`}
            >
              {page}
            </button>
          ))}
          <button
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
