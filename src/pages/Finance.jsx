import { useEffect, useMemo, useRef, useState } from "react";
import apiClient from "../services/apiClient";
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

  const yearOptions = useMemo(() => {
    const years = [];
    for (let year = 2015; year <= currentYear; year += 1) {
      years.push(year);
    }
    return years;
  }, [currentYear]);

  const filterKey = `${period}-${selectedYear}-${selectedMonth}-${selectedQuarter}`;
  const lastFilterRef = useRef(filterKey);

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
      setNotice("");
      setError("");
    } catch (fetchError) {
      setError("Không thể tải dữ liệu doanh thu. Vui lòng thử lại.");
    }
  };

  const fetchTransactions = async () => {
    setTransactionLoading(true);
    setTransactionError("");
    try {
      const params = {
        page: transactionPage,
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
      const data = response.data;
      const results = Array.isArray(data) ? data : data?.results || [];
      setTransactions(results);
      setTransactionCount(data?.count ?? results.length);
      setHasNext(Boolean(data?.next));
      setHasPrev(Boolean(data?.previous));
    } catch (fetchError) {
      const apiError = fetchError?.response?.data;
      const message =
        apiError?.detail ||
        apiError?.message ||
        "Không thể tải giao dịch. Vui lòng thử lại.";
      setTransactionError(message);
    } finally {
      setTransactionLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary({
      year: selectedYear,
      selectedPeriod: period,
      month: selectedMonth,
      quarter: selectedQuarter,
    });
  }, [filterKey]);

  useEffect(() => {
    if (lastFilterRef.current !== filterKey) {
      lastFilterRef.current = filterKey;
      setTransactionPage(1);
      return;
    }
    fetchTransactions();
  }, [filterKey, transactionPage]);

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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>Doanh thu</p>
          <h1>Thống kê thu chi</h1>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.filters}>
            <label className={styles.select}>
              <span>Kỳ</span>
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
            </label>
            <label className={styles.select}>
              <span>Năm</span>
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
            </label>
            {period === "month" && (
              <label className={styles.select}>
                <span>Tháng</span>
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
              </label>
            )}
            {period === "quarter" && (
              <label className={styles.select}>
                <span>Quý</span>
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
              </label>
            )}
          </div>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => {
              setImportError("");
              setIsImportOpen(true);
            }}
          >
            Import Excel
          </button>
        </div>
      </header>

      {notice && <div className={styles.notice}>{notice}</div>}
      {error && <div className={styles.error}>{error}</div>}

      <section className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span>Tổng thu</span>
          <strong className={styles.positive}>{formatCurrency(totals.income)}</strong>
          <small>{periodLabel}</small>
        </div>
        <div className={styles.summaryCard}>
          <span>Tổng chi</span>
          <strong className={styles.negative}>{formatCurrency(totals.expense)}</strong>
          <small>{periodLabel}</small>
        </div>
        <div className={styles.summaryCard}>
          <span>Lợi nhuận</span>
          <strong>{formatCurrency(totals.net)}</strong>
          <small>Thu - Chi</small>
        </div>
      </section>

      <section className={styles.chartPanel}>
        <div className={styles.chartHeader}>
          <div>
            <h2>Biểu đồ thu chi</h2>
            <p>So sánh thu và chi theo {periodLabel.toLowerCase()}.</p>
          </div>
          <div className={styles.legend}>
            <span>
              <i data-tone="income" /> Thu
            </span>
            <span>
              <i data-tone="expense" /> Chi
            </span>
          </div>
        </div>
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
      </section>

      <section className={styles.transactions}>
        <div className={styles.transactionsHeader}>
          <div>
            <h2>Giao dịch</h2>
            <p>Danh sách giao dịch theo {periodLabel.toLowerCase()}.</p>
          </div>
        </div>
        {transactionLoading && <div className={styles.state}>Đang tải giao dịch...</div>}
        {!transactionLoading && transactionError && (
          <div className={`${styles.state} ${styles.stateError}`}>{transactionError}</div>
        )}
        {!transactionLoading && !transactionError && transactions.length === 0 && (
          <div className={styles.state}>Chưa có giao dịch.</div>
        )}
        {!transactionLoading && !transactionError && transactions.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.transactionsTable}>
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Người giao dịch</th>
                  <th>Loại</th>
                  <th>Số tiền</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((entry) => {
                  const isIncome = entry.entry_type === "income";
                  return (
                    <tr key={entry.id}>
                      <td>{formatDate(entry.entry_date)}</td>
                      <td>
                        <strong className={styles.transactionName}>
                          {getTransactionName(entry)}
                        </strong>
                        {entry.description ? (
                          <span className={styles.transactionMeta}>{entry.description}</span>
                        ) : null}
                      </td>
                      <td>{getTransactionType(entry)}</td>
                      <td className={isIncome ? styles.amountPositive : styles.amountNegative}>
                        {isIncome ? "+" : "-"}
                        {formatCurrency(entry.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className={styles.transactionsFooter}>
          <span>
            {startIndex}-{endIndex} / {transactionCount}
          </span>
          <div className={styles.paginationButtons}>
            <button
              type="button"
              className={styles.iconButton}
              aria-label="Trang trước"
              disabled={!hasPrev}
              onClick={() => hasPrev && setTransactionPage((prev) => Math.max(prev - 1, 1))}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="m14 7-5 5 5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              className={styles.iconButton}
              aria-label="Trang sau"
              disabled={!hasNext}
              onClick={() => hasNext && setTransactionPage((prev) => prev + 1)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="m10 7 5 5-5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {isImportOpen && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <header className={styles.modalHeader}>
              <h2>Import doanh thu</h2>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Đóng"
                onClick={() => setIsImportOpen(false)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M6 6 18 18M6 18 18 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </header>
            <form className={styles.modalBody} onSubmit={handleImport}>
              <p className={styles.note}>
                Chọn file thu học phí và file chi lương theo mẫu để cập nhật biểu đồ.
              </p>
              <div className={styles.formGrid}>
                <label className={styles.formGroup}>
                  <span>File thu học phí</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(event) => setTuitionFile(event.target.files?.[0] || null)}
                  />
                </label>
                <label className={styles.formGroup}>
                  <span>File chi lương</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(event) => setSalaryFile(event.target.files?.[0] || null)}
                  />
                </label>
              </div>
              {importError && <div className={styles.error}>{importError}</div>}
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setIsImportOpen(false)}
                >
                  Đóng
                </button>
                <button type="submit" className={styles.primaryButton} disabled={importLoading}>
                  {importLoading ? "Đang import..." : "Import"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Finance;
