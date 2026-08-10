import { useEffect, useMemo, useState } from "react";
import apiClient from "../services/apiClient";
import {
  Page,
  PageHeader,
  Card,
  DataTable,
  Modal,
  Button,
  KpiGrid,
  Kpi,
  EmptyState,
  Field,
} from "../ui";
import "../styles/vista4.css";
import styles from "../styles/finance.module.css";

const periodOptions = [
  { value: "month", label: "Tháng" },
  { value: "quarter", label: "Quý" },
  { value: "year", label: "Năm" },
];

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: `Tháng ${index + 1}`,
}));

const quarterOptions = [
  { value: 1, label: "Quý 1" },
  { value: 2, label: "Quý 2" },
  { value: 3, label: "Quý 3" },
  { value: 4, label: "Quý 4" },
];

const transactionPageSize = 8;

function Finance() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentQuarter = Math.floor((currentMonth - 1) / 3) + 1;

  const [period, setPeriod] = useState("month");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedQuarter, setSelectedQuarter] = useState(currentQuarter);
  const [series, setSeries] = useState([]);
  const [totals, setTotals] = useState({ income: 0, expense: 0, net: 0 });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [tuitionFile, setTuitionFile] = useState(null);
  const [salaryFile, setSalaryFile] = useState(null);
  const [importError, setImportError] = useState("");
  const [importLoading, setImportLoading] = useState(false);

  const [transactions, setTransactions] = useState([]);
  const [transactionCount, setTransactionCount] = useState(0);
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [transactionError, setTransactionError] = useState("");
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const yearOptions = useMemo(() => {
    const years = [];
    for (let year = 2015; year <= currentYear; year += 1) {
      years.push(year);
    }
    return years;
  }, [currentYear]);

  const filterKey = `${period}-${selectedYear}-${selectedMonth}-${selectedQuarter}`;

  const periodLabel = useMemo(() => {
    if (period === "month") {
      return `Tháng ${selectedMonth}/${selectedYear}`;
    }
    if (period === "quarter") {
      return `Quý ${selectedQuarter}/${selectedYear}`;
    }
    return `Năm ${selectedYear}`;
  }, [period, selectedMonth, selectedQuarter, selectedYear]);

  const chartMax = Math.max(
    1,
    ...series.flatMap((item) => [item.income || 0, item.expense || 0])
  );
  const chartTicks = [1, 0.75, 0.5, 0.25, 0];

  const formatCurrency = (value) =>
    `${new Intl.NumberFormat("vi-VN").format(Math.round(value || 0))} ₫`;

  const formatCompact = (value) =>
    new Intl.NumberFormat("vi-VN", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value || 0);

  const formatDate = (value) => {
    if (!value) return "--";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleDateString("vi-VN");
  };

  const getTransactionName = (entry) => {
    const description = entry.description?.trim();
    if (!description) {
      return entry.entry_type === "income" ? "Thu học phí" : "Chi lương";
    }
    if (description.includes("PH:")) {
      const parts = description.split("PH:");
      if (parts[1]) {
        return parts[1].split("|")[0].trim();
      }
    }
    if (description.toLowerCase().startsWith("lương")) {
      return description.replace(/lương/i, "").trim() || description;
    }
    return description;
  };

  const getTransactionType = (entry) => {
    const sourceMap = {
      tuition: "Học phí",
      salary: "Lương",
      manual: "Thủ công",
    };
    const base = entry.entry_type === "income" ? "Thu" : "Chi";
    const source = sourceMap[entry.source] || "";
    return `${base} ${source}`.trim();
  };

  const fetchSummary = async ({
    year,
    selectedPeriod,
    month,
    quarter,
  }) => {
    try {
      const params = {};
      if (year) {
        params.year = year;
      }
      if (selectedPeriod) {
        params.period = selectedPeriod;
      }
      if (selectedPeriod === "month" && month) {
        params.month = month;
      }
      if (selectedPeriod === "quarter" && quarter) {
        params.quarter = quarter;
      }

      const response = await apiClient.get("/finances/entries/summary/", {
        params,
      });
      const data = response.data || {};
      const nextSeries = Array.isArray(data.series) ? data.series : [];
      setSeries(nextSeries);
      const periodIncome = nextSeries.reduce(
        (sum, item) => sum + (Number(item.income) || 0),
        0
      );
      const periodExpense = nextSeries.reduce(
        (sum, item) => sum + (Number(item.expense) || 0),
        0
      );
      setTotals({
        income: periodIncome,
        expense: periodExpense,
        net: periodIncome - periodExpense,
      });
      setError("");
    } catch (fetchError) {
      setError("Không thể tải dữ liệu doanh thu. Vui lòng thử lại.");
    }
  };

  const fetchTransactions = async ({ page, isStale }) => {
    const stale = () => (typeof isStale === "function" ? isStale() : false);
    setTransactionLoading(true);
    setTransactionError("");
    try {
      const params = {
        page,
        page_size: transactionPageSize,
        year: selectedYear,
        period,
      };
      if (period === "month") {
        params.month = selectedMonth;
      }
      if (period === "quarter") {
        params.quarter = selectedQuarter;
      }
      const response = await apiClient.get("/finances/entries/", { params });
      if (stale()) return;
      const data = response.data;
      const results = Array.isArray(data) ? data : data?.results || [];
      setTransactions(results);
      setTransactionCount(data?.count ?? results.length);
      setHasNext(Boolean(data?.next));
      setHasPrev(Boolean(data?.previous));
    } catch (fetchError) {
      if (stale()) return;
      const apiError = fetchError?.response?.data;
      const message =
        apiError?.detail ||
        apiError?.message ||
        "Không thể tải giao dịch. Vui lòng thử lại.";
      setTransactionError(message);
    } finally {
      if (!stale()) {
        setTransactionLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchSummary({
      year: selectedYear,
      selectedPeriod: period,
      month: selectedMonth,
      quarter: selectedQuarter,
    });
  }, [filterKey, reloadKey]);

  // Đổi bộ lọc thì luôn quay về trang 1 và dọn thông báo của lần import trước.
  useEffect(() => {
    setTransactionPage(1);
    setNotice("");
  }, [filterKey]);

  // Luôn tải lại giao dịch khi bộ lọc / trang / lần import thay đổi.
  useEffect(() => {
    let cancelled = false;
    fetchTransactions({ page: transactionPage, isStale: () => cancelled });
    return () => {
      cancelled = true;
    };
  }, [filterKey, transactionPage, reloadKey]);

  const handleImport = async (event) => {
    event.preventDefault();
    setImportError("");
    setNotice("");

    if (!tuitionFile && !salaryFile) {
      setImportError("Vui lòng chọn ít nhất 1 file để import.");
      return;
    }

    setImportLoading(true);
    try {
      const formData = new FormData();
      if (tuitionFile) {
        formData.append("tuition_file", tuitionFile);
      }
      if (salaryFile) {
        formData.append("salary_file", salaryFile);
      }
      const response = await apiClient.post(
        "/finances/entries/import_finances/",
        formData
      );
      const incomeYears = (response?.data?.income_years || []).map(Number);
      const expenseYears = (response?.data?.expense_years || []).map(Number);
      const allYears = (response?.data?.years || []).map(Number);
      const intersection = incomeYears.filter((year) => expenseYears.includes(year));
      let targetYear = null;
      if (intersection.length) {
        targetYear = Math.max(...intersection);
      } else if (expenseYears.length) {
        targetYear = Math.max(...expenseYears);
      } else if (incomeYears.length) {
        targetYear = Math.max(...incomeYears);
      } else if (allYears.length) {
        targetYear = Math.max(...allYears);
      }
      if (targetYear) {
        setSelectedYear(targetYear);
      }
      setReloadKey((value) => value + 1);
      setNotice("Đã import dữ liệu thu/chi thành công.");
      setIsImportOpen(false);
      setTuitionFile(null);
      setSalaryFile(null);
    } catch (importErr) {
      const apiError = importErr?.response?.data;
      const message =
        apiError?.detail ||
        (Array.isArray(apiError?.errors) && apiError.errors.join(", ")) ||
        importErr?.message ||
        "Không thể import file. Vui lòng kiểm tra lại.";
      setImportError(message);
    } finally {
      setImportLoading(false);
    }
  };

  const startIndex = transactionCount === 0 ? 0 : (transactionPage - 1) * transactionPageSize + 1;
  const endIndex = transactionCount === 0 ? 0 : startIndex + transactions.length - 1;

  const transactionColumns = [
    {
      key: "entry_date",
      header: "Ngày",
      width: 110,
      render: (entry) => formatDate(entry.entry_date),
    },
    {
      key: "name",
      header: "Người giao dịch",
      render: (entry) => (
        <>
          <strong className={styles.transactionName}>{getTransactionName(entry)}</strong>
          {entry.description ? (
            <span className={styles.transactionMeta}>{entry.description}</span>
          ) : null}
        </>
      ),
    },
    {
      key: "type",
      header: "Loại",
      width: 140,
      render: (entry) => getTransactionType(entry),
    },
    {
      key: "amount",
      header: "Số tiền",
      align: "right",
      width: 160,
      render: (entry) => {
        const isIncome = entry.entry_type === "income";
        return (
          <span className={`money ${isIncome ? "green" : "red"}`}>
            {isIncome ? "+" : "-"}
            {formatCurrency(entry.amount)}
          </span>
        );
      },
    },
  ];

  return (
    <Page>
      <PageHeader
        crumbs={[{ label: "Tổng quan", to: "/" }, { label: "Tài chính" }]}
        title="Thống kê thu chi"
        description="Theo dõi thu, chi và lợi nhuận của trung tâm theo tháng, quý hoặc năm."
        actions={
          <div className={styles.headerActions}>
            <Field label="Kỳ">
              <select
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
              >
                {periodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Năm">
              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(Number(event.target.value))}
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </Field>
            {period === "month" && (
              <Field label="Tháng">
                <select
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(Number(event.target.value))}
                >
                  {monthOptions.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {period === "quarter" && (
              <Field label="Quý">
                <select
                  value={selectedQuarter}
                  onChange={(event) => setSelectedQuarter(Number(event.target.value))}
                >
                  {quarterOptions.map((quarter) => (
                    <option key={quarter.value} value={quarter.value}>
                      {quarter.label}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Button
              variant="primary"
              icon="📥"
              onClick={() => {
                setImportError("");
                setIsImportOpen(true);
              }}
            >
              Import Excel
            </Button>
          </div>
        }
      />

      {notice && <div className={styles.notice}>{notice}</div>}
      {error && <div className={styles.error}>{error}</div>}

      <KpiGrid cols={3} className={styles.kpiRow}>
        <Kpi
          ico="💰"
          icoClass="orange"
          label="Tổng thu"
          value={formatCurrency(totals.income)}
          sub={periodLabel}
        />
        <Kpi
          ico="💸"
          icoClass="yellow"
          label="Tổng chi"
          value={formatCurrency(totals.expense)}
          sub={periodLabel}
        />
        <Kpi
          ico="📈"
          icoClass="green"
          label="Lợi nhuận"
          value={formatCurrency(totals.net)}
          sub="Thu - Chi"
        />
      </KpiGrid>

      <Card
        title={
          <div>
            <h3>Biểu đồ thu chi</h3>
            <p className={styles.cardSub}>So sánh thu và chi theo {periodLabel.toLowerCase()}.</p>
          </div>
        }
        action={
          <div className={styles.legend}>
            <span>
              <i data-tone="income" /> Thu
            </span>
            <span>
              <i data-tone="expense" /> Chi
            </span>
          </div>
        }
      >
        {series.length === 0 ? (
          <EmptyState
            icon="📊"
            title="Chưa có dữ liệu thu chi."
            hint={`Chưa ghi nhận khoản thu hoặc chi nào trong ${periodLabel.toLowerCase()}.`}
          />
        ) : (
          <div className={styles.chartCanvas} role="img" aria-label="Biểu đồ thu chi">
            <div className={styles.axis}>
              {chartTicks.map((tick) => (
                <span key={tick}>{formatCompact(chartMax * tick)}</span>
              ))}
            </div>
            <div className={styles.bars}>
              {series.map((item) => (
                <div key={item.label} className={styles.column}>
                  <div className={styles.barStack}>
                    <span
                      className={styles.bar}
                      data-tone="income"
                      style={{ "--bar-height": `${((item.income || 0) / chartMax) * 100}%` }}
                      title={`Thu: ${formatCurrency(item.income || 0)}`}
                    />
                    <span
                      className={styles.bar}
                      data-tone="expense"
                      style={{ "--bar-height": `${((item.expense || 0) / chartMax) * 100}%` }}
                      title={`Chi: ${formatCurrency(item.expense || 0)}`}
                    />
                  </div>
                  <span className={styles.label}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card
        title={
          <div>
            <h3>Giao dịch</h3>
            <p className={styles.cardSub}>Danh sách giao dịch theo {periodLabel.toLowerCase()}.</p>
          </div>
        }
      >
        {!transactionLoading && transactionError ? (
          <div className={styles.stateError}>{transactionError}</div>
        ) : (
          <DataTable
            columns={transactionColumns}
            rows={transactions}
            loading={transactionLoading}
            empty="Chưa có giao dịch."
            rowKey={(entry) => entry.id}
            minWidth={640}
          />
        )}

        <div className={styles.tableFoot}>
          <span className="small muted">
            {startIndex}-{endIndex} / {transactionCount}
          </span>
          <div className={styles.pager}>
            <Button
              size="sm"
              aria-label="Trang trước"
              disabled={!hasPrev}
              onClick={() => hasPrev && setTransactionPage((prev) => Math.max(prev - 1, 1))}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={styles.pagerIcon}>
                <path
                  d="m14 7-5 5 5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
            <Button
              size="sm"
              aria-label="Trang sau"
              disabled={!hasNext}
              onClick={() => hasNext && setTransactionPage((prev) => prev + 1)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={styles.pagerIcon}>
                <path
                  d="m10 7 5 5-5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Import doanh thu"
        subtitle="Chọn file thu học phí và file chi lương theo mẫu để cập nhật biểu đồ."
        size="md"
        footer={
          <>
            <Button onClick={() => setIsImportOpen(false)}>Đóng</Button>
            <Button
              type="submit"
              form="finance-import-form"
              variant="primary"
              loading={importLoading}
              loadingText="Đang import..."
            >
              Import
            </Button>
          </>
        }
      >
        <form id="finance-import-form" onSubmit={handleImport}>
          <div className="ui-form-grid">
            <Field label="File thu học phí">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(event) => setTuitionFile(event.target.files?.[0] || null)}
              />
            </Field>
            <Field label="File chi lương">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(event) => setSalaryFile(event.target.files?.[0] || null)}
              />
            </Field>
          </div>
          {importError && <div className={styles.formError}>{importError}</div>}
        </form>
      </Modal>
    </Page>
  );
}

export default Finance;
