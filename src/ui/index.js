/**
 * Tầng giao diện dùng chung của VISTA CRM — NGUỒN CHUẨN DUY NHẤT.
 *
 * Màn mới (và màn đang chuyển đổi) chỉ import từ đây, không tự dựng lại
 * nút / bảng / hộp thoại / đầu trang nữa.
 *
 *   import { Page, PageHeader, Card, DataTable, Modal, Button, Badge } from "../ui";
 */
import "../styles/ui.css";

export { default as Button } from "./Button";
export { default as Modal } from "./Modal";
export { default as DataTable } from "./DataTable";
export { Page, PageWithAside, PageHeader } from "./Page";
export { Card, Badge, KpiGrid, Kpi, EmptyState, Field } from "./Primitives";
