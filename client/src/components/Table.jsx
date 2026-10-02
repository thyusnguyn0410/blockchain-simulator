export default function DataTable({ columns, rows, emptyMessage = "No data available." }) {
  return <div className="table-wrapper"><table className="transactions-table"><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={row.id || row.hash || index}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key] ?? "—"}</td>)}</tr>) : <tr><td className="empty-table" colSpan={columns.length}>{emptyMessage}</td></tr>}</tbody></table></div>;
}
