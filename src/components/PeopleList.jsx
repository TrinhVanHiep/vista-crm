import { useEffect, useMemo, useState } from "react";
import apiClient from "../services/apiClient";
import styles from "../styles/employeeList.module.css";
import {
  getAvatarColor,
  getFullName,
  getInitials,
} from "../utils/userFormatters";

const tabs = ["Danh sách", "Hoạt động"];

function PeopleList({
  title,
  addLabel,
  endpoint,
  searchPlaceholder,
  emptyLabel,
  fields,
  actions,
  reloadKey,
  onAddClick,
  children,
  rowActions,
  onRowClick,
}) {
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let isActive = true;

    const fetchList = async () => {
      setLoading(true);
      setErrorMessage("");
      try {
        const response = await apiClient.get(endpoint, {
          params: {
            page,
            search: debouncedSearch || undefined,
          },
        });
        if (!isActive) return;
        const data = response.data;
        if (Array.isArray(data)) {
          setItems(data);
          setCount(data.length);
          setHasNext(false);
          setHasPrev(false);
          setPageSize(data.length || 10);
        } else {
          const results = data?.results ?? [];
          setItems(results);
          setCount(data?.count ?? results.length);
          setHasNext(Boolean(data?.next));
          setHasPrev(Boolean(data?.previous));
          if (page === 1) {
            setPageSize(results.length || 10);
          }
        }
      } catch (error) {
        if (!isActive) return;
        const apiError = error?.response?.data;
        const message =
          apiError?.detail ||
          apiError?.message ||
          "Không thể tải dữ liệu. Vui lòng thử lại.";
        setErrorMessage(message);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchList();
    return () => {
      isActive = false;
    };
  }, [debouncedSearch, endpoint, page, reloadKey]);

  const visibleItems = useMemo(() => {
    return items;
  }, [items]);

  const totalCount = count || visibleItems.length;
  const startIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex =
    totalCount === 0 ? 0 : (page - 1) * pageSize + visibleItems.length;

  return (
    <div className={styles.page}>
      <div className={styles.searchRow}>
        <label className={styles.search}>
          <span className={styles.searchIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="m20.25 19.19-3.9-3.9a6.5 6.5 0 1 0-1.06 1.06l3.9 3.9a.75.75 0 1 0 1.06-1.06ZM6.75 11a4.25 4.25 0 1 1 4.25 4.25A4.25 4.25 0 0 1 6.75 11Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
        </label>
      </div>

      <header className={styles.header}>
        <div>
          <h1>
            {title} <span>({totalCount})</span>
          </h1>
        </div>
        <div className={styles.tabs} role="tablist" aria-label="Chế độ hiển thị">
          {tabs.map((tab, index) => (
            <button
              key={tab}
              type="button"
              className={`${styles.tab} ${index === 0 ? styles["tab--active"] : ""}`}
              aria-pressed={index === 0}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className={styles.actions}>
          {actions || (
            <>
              <button type="button" className={styles.iconButton} aria-label="Bộ lọc">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M4 6.5h16a.75.75 0 0 1 .58 1.23L14 15.5v4a.75.75 0 0 1-1.12.66l-2-1.1a.75.75 0 0 1-.38-.66v-2.9L3.42 7.73A.75.75 0 0 1 4 6.5Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
              {addLabel && (
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={onAddClick}
                >
                  {addLabel}
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {children}

      <section className={styles.list}>
        {loading && <div className={styles.state}>Đang tải dữ liệu...</div>}
        {!loading && errorMessage && (
          <div className={`${styles.state} ${styles["state--error"]}`}>
            {errorMessage}
          </div>
        )}
        {!loading && !errorMessage && visibleItems.length === 0 && (
          <div className={styles.state}>{emptyLabel}</div>
        )}
        {!loading &&
          !errorMessage &&
          visibleItems.map((item) => {
            const user = item.user || {};
            const name = getFullName(user);
            const email = user.email || user.username || "--";
            const initials = getInitials(name, email);
            const color = getAvatarColor(name || email);
            const actionNode =
              typeof rowActions === "function" ? rowActions(item) : rowActions;
            const handleRowClick = onRowClick
              ? () => onRowClick(item)
              : undefined;
            const handleRowKeyDown = (event) => {
              if (!onRowClick) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onRowClick(item);
              }
            };
            return (
              <article
                key={item.id || email}
                className={`${styles.card} ${onRowClick ? styles.cardClickable : ""}`}
                onClick={handleRowClick}
                onKeyDown={handleRowKeyDown}
                role={onRowClick ? "button" : undefined}
                tabIndex={onRowClick ? 0 : undefined}
              >
                <div className={styles.user}>
                  <div className={styles.avatar} style={{ background: color }}>
                    {initials}
                  </div>
                  <div>
                    <strong>{name}</strong>
                    <span>{email}</span>
                  </div>
                </div>
                {fields.map((field) => (
                  <div key={field.label} className={styles.field}>
                    <span>{field.label}</span>
                    <strong>{field.getValue(item)}</strong>
                  </div>
                ))}
                {actionNode || (
                  <button
                    type="button"
                    className={styles.menuButton}
                    aria-label="Tùy chọn"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path
                        d="M12 6.75a1.25 1.25 0 1 1-1.25 1.25A1.25 1.25 0 0 1 12 6.75Zm0 7a1.25 1.25 0 1 1-1.25 1.25A1.25 1.25 0 0 1 12 13.75Zm0-3.5A1.25 1.25 0 1 1 10.75 12 1.25 1.25 0 0 1 12 10.25Z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                )}
              </article>
            );
          })}
      </section>

      <div className={styles.pagination}>
        <span>
          {startIndex}-{endIndex} of {totalCount}
        </span>
        <div className={styles.paginationButtons}>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Trang trước"
            disabled={!hasPrev}
            onClick={() => hasPrev && setPage((prev) => Math.max(prev - 1, 1))}
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
            onClick={() => hasNext && setPage((prev) => prev + 1)}
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
    </div>
  );
}

export default PeopleList;
