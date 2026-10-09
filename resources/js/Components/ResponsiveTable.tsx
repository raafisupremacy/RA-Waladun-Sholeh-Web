export type TableColumn<T> = { key: keyof T; label: string; render?: (value: T[keyof T], row: T) => React.ReactNode };

export default function ResponsiveTable<T extends { id: string | number }>({ columns, rows }: { columns: TableColumn<T>[]; rows: T[] }) {
    return <div className="responsive-table">
        {rows.length === 0 && <p className="empty-state px-6">Belum ada data yang sesuai dengan pilihan Anda.</p>}
        <div className="table-desktop"><table><thead><tr>{columns.map((column) => <th key={String(column.key)}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}>{columns.map((column) => <td key={String(column.key)}>{column.render ? column.render(row[column.key], row) : row[column.key] as React.ReactNode}</td>)}</tr>)}</tbody></table></div>
        <div className="table-mobile">{rows.map((row) => <article className="table-mobile-row" key={row.id}>{columns.map((column) => <div key={String(column.key)}><strong>{column.label}</strong><span>{column.render ? column.render(row[column.key], row) : row[column.key] as React.ReactNode}</span></div>)}</article>)}</div>
    </div>;
}
