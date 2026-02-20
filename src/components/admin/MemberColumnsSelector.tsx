import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings2 } from 'lucide-react';

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
}

interface MemberColumnsSelectorProps {
  columns: ColumnConfig[];
  onColumnsChange: (columns: ColumnConfig[]) => void;
}

export function MemberColumnsSelector({ columns, onColumnsChange }: MemberColumnsSelectorProps) {
  const toggleColumn = (columnId: string) => {
    const updated = columns.map(col =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    );
    onColumnsChange(updated);
  };

  const showAll = () => {
    onColumnsChange(columns.map(col => ({ ...col, visible: true })));
  };

  const hideAll = () => {
    // Keep at least member_id and name visible
    onColumnsChange(columns.map(col => ({
      ...col,
      visible: col.id === 'member_id' || col.id === 'name'
    })));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-2" />
          คอลัมน์
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto">
        <DropdownMenuLabel>แสดง/ซ่อนคอลัมน์</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="flex gap-2 px-2 py-1.5">
          <Button variant="ghost" size="sm" className="flex-1 h-7 text-xs" onClick={showAll}>
            แสดงทั้งหมด
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 h-7 text-xs" onClick={hideAll}>
            ซ่อนทั้งหมด
          </Button>
        </div>
        <DropdownMenuSeparator />
        <div className="p-2 space-y-2">
          {columns.map(column => (
            <div key={column.id} className="flex items-center space-x-2">
              <Checkbox
                id={`col-${column.id}`}
                checked={column.visible}
                onCheckedChange={() => toggleColumn(column.id)}
              />
              <label
                htmlFor={`col-${column.id}`}
                className="text-sm cursor-pointer flex-1"
              >
                {column.label}
              </label>
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
