/**
 * @zirve/ui — Zirve Tarım tasarım sistemi bileşenleri.
 *
 * Tasarım kaynağı: "Agro-Financial Intelligence System" token seti
 * (bkz. src/styles.css ve docs/DESIGN-SYSTEM.md).
 *
 * shadcn/ui yaklaşımı: bileşenler kaynak olarak burada durur, derlenmez.
 * Tüketen uygulama Tailwind ile birlikte transpile eder
 * (next.config.ts -> transpilePackages).
 */

export { Alert, alertVariants, type AlertProps } from './components/alert';
export { Avatar, avatarVariants, getInitials, type AvatarProps } from './components/avatar';
export { Badge, badgeVariants, type BadgeProps } from './components/badge';
export { Button, buttonVariants, type ButtonProps } from './components/button';
export {
  CheckboxGroup,
  type CheckboxGroupProps,
  type CheckboxOption,
} from './components/checkbox-group';
export { TabPanel, Tabs, type TabItem, type TabsProps } from './components/tabs';
export {
  DataTable,
  type DataTableColumn,
  type DataTableProps,
  type SortDirection,
} from './components/data-table';
export {
  ConfirmDialog,
  FormDialog,
  type ConfirmDialogProps,
  type FormDialogProps,
} from './components/form-dialog';
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './components/card';
export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './components/dialog';
export { FieldError, FieldHint, FormField, Label } from './components/form-field';
export { Input, type InputProps } from './components/input';
export { PageHeader, type PageHeaderProps } from './components/page-header';
export { Pagination, type PaginationProps } from './components/pagination';
export { Select, type SelectProps } from './components/select';
export { Skeleton, TableSkeleton } from './components/skeleton';
export { StatCard, type StatCardProps } from './components/stat-card';
export {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from './components/table';
export { cn } from './lib/utils';
