import React from 'react';

export default function DataTable({ columns, rows, emptyMessage = 'No data available.' }) {
  return <div className="table-wrapper"><table className="transactions-table"><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={row.id || row.hash || index}>{columns.map((column) => <td key={column.key} className={column.className || ''}>{column.render ? column.render(row) : row[column.key]}</td>)}</tr>) : <tr><td colSpan={columns.length} style={{ textAlign: 'center', color: '#64748b', padding: '32px' }}>{emptyMessage}</td></tr>}</tbody></table></div>;
}
