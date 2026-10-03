/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import {
  CSSProperties,
  ReactElement,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActionIcon,
  Box,
  Button,
  Checkbox,
  Input,
  LoadingOverlay,
  Paper,
  CloseButton,
  Text,
  TextInput,
  Pagination,
} from "@mantine/core";

import FeatherIcon from "feather-icons-react";
import { notifications } from "@mantine/notifications";
import { useClickOutside } from '@mantine/hooks';
import { useI18n } from "../../i18n/I18nContext";


interface predefinedRowActionsInterface {
  onRowClick?: Function;
  onRowDoubleClick?: Function;
  onRowHover?: Function;
  onRowHoverExit?: Function;
  onRowSelectionChange?: Function;
}

interface predefinedColumnActionsInterface {
  onHeaderClick?: Function;
  onHeaderDoubleClick?: Function;
  onHeaderHover?: Function;
  onHeaderHoverExit?: Function;
  onColumnClick?: Function;
  onColumnDoubleClick?: Function;
  onColumnHover?: Function;
  onColumnHoverExit?: Function;
}

interface groupActionInterface {
  caption: string;
  action: Function;
  icon?: ReactElement;
}

interface dataTableActionsInterface {
  icon?: ReactElement;
  caption?: string;
  action: Function;
}

interface dataTableColumnInterface {
  index?: boolean;
  actions?: boolean;
  filterable?: boolean;
  orderable?: boolean;
  searchable?: boolean;
  visible?: boolean;
  caption: string;
  field: string;
  type?: string;
  width?: string;
  align?: string;
  headerAlign?: string;
  formatter?: Function;
  dereferencer?: Function;
  columnActions?: predefinedColumnActionsInterface;
}

interface dataTableDataInterface {
  [key: string]: any;
}

interface orderQuery {
  f: string;
  d: "ASC" | "DESC";
}

interface filterQuery {
  f: string;
  o:
    | "="
    | ">"
    | "<"
    | "!="
    | ">="
    | "<="
    | "LIKE"
    | "IN"
    | "STARTS"
    | "HAS"
    | "ENDS";
  v: string;
}

interface dataTablePaginationInterface {
  enabled: boolean;
  pageSize: number;
  pageIndex: number;
  totalRows: number;
  pageSizeOptions: Array<number>;
  pageSizeCaption?: string;
  filters?: Array<filterQuery>;
  orders?: Array<orderQuery>;
  onPaginationChange?: Function;
}

export interface dataTablePaginationReturnInterface {
  pageSize: number;
  pageIndex: number;
  filters?: Array<filterQuery>;
  orders?: Array<orderQuery>;
}

interface dataTableSelectionInterface {
  enabled: boolean;
  selectAllRows?: boolean;
  onSelectionChange?: Function;
}

interface dataTableOptionsInterface {
  showDataControls?: boolean;
  showFiltersOverlay?: boolean;
  actions?: predefinedRowActionsInterface;
  actionsColumn?: Array<dataTableActionsInterface>;
  selection?: dataTableSelectionInterface;
  pagination?: dataTablePaginationInterface;
  groupActions?: Array<groupActionInterface>;
}

export interface dataTableParamsInterface {
  caption?: ReactElement;
  columns: Array<dataTableColumnInterface>;
  data: Array<dataTableDataInterface>;
  options?: dataTableOptionsInterface;
  subTable?: dataTableParamsInterface;
  loading?: boolean;
  changeLoading?: Function;
}

function DataManagementControls({
  config,
  cssstyles,
}: {
  config: dataTableParamsInterface;
  cssstyles?: CSSProperties;
}) {
  const { t } = useI18n();

  const styles: { [key: string]: CSSProperties } = (cssstyles as {
    [key: string]: CSSProperties;
  }) || {
    formContainer: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    acbutton: {
      color: "white",
      padding: "0.5rem",
      margin: "0.5rem",
      border: "none",
      borderRadius: "0.25rem",
      cursor: "pointer",
    },
  };

  const filterOptionsReference = {
    "=": t("datatable.operator.equals"),
    "!=": t("datatable.operator.notEquals"),
    ">": t("datatable.operator.greaterThan"),
    "<": t("datatable.operator.lessThan"),
    ">=": t("datatable.operator.greaterOrEqual"),
    "<=": t("datatable.operator.lessOrEqual"),
    LIKE: null,
    IN: t("datatable.operator.in"),
    STARTS: t("datatable.operator.starts"),
    HAS: t("datatable.operator.has"),
    ENDS: t("datatable.operator.ends"),
  };

  const [viewFilterMenu, setViewFilterMenu] = useState<boolean>(false);

  const [searchField, setSearchField] = useState<string>("__empty");
  const uncommitedSearch = useRef<string>("");
  const searchFilter = useRef<filterQuery>({} as filterQuery);
  const [filters, setFilters] = useState<Array<filterQuery>>([]);

  const uncommitedFilterField = useRef<string>("");
  const uncommitedFilterOperator = useRef<string>("");
  const uncommitedFilterValue = useRef<string>("");

  const filterOverlayControl = useClickOutside(() => {
    setViewFilterMenu(false);
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",

        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        marginBottom: "1rem",
      }}
    >
      {config.options?.showFiltersOverlay && (
        <div>
          <Button
            style={styles.acbutton}
            color="light.1"
            leftSection={<FeatherIcon icon="filter" size={16}></FeatherIcon>}
            
            onClick={() => {
              setViewFilterMenu(!viewFilterMenu);
              uncommitedFilterField.current = "__empty";
              uncommitedFilterOperator.current = "__empty";
              uncommitedFilterValue.current = "";
            }}
          >
            {t("datatable.filters.button")}
          </Button>
          {viewFilterMenu && (
            <Paper
              ref={filterOverlayControl}
              shadow="xl"
              radius="md"
              style={{
                margin: "0.5rem",
                position: "absolute",
                boxShadow: "0px 1px 4px 0px rgb(139, 139, 139)",
                zIndex: 700,
                border: "1px solid #ccc",
                maxWidth: "30rem",
                padding: "1rem",
              }}
              onMouseLeave={() => {
                //setViewFilterMenu(false);
              }}
            > <div style={{ display: "flex", flexDirection: "row", alignContent: "right", justifyContent: "right" }}>
              
              <></>
              



              </div>
              <div style={{ display: "flex", flexDirection: "row" }}>
                <Input.Wrapper
                  style={{
                    marginLeft: "0rem",
                    display: "flex",
                    marginTop: "0rem",
                  }}
                >
                  <Input
                    component="select"
                    id="filterField1"
                    pointer
                    style={{ minWidth: "7rem" }}
                    rightSection={
                      <div style={{ marginTop: "0.5rem" }}>
                        <FeatherIcon icon="chevron-down"></FeatherIcon>{" "}
                      </div>
                    }
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      uncommitedFilterField.current = e.target.value;
                    }}
                  >
                    <option value={"__empty"}>{t("datatable.filters.fieldPlaceholder")}</option>
                    {config.columns.map(
                      (column) =>
                        column.filterable && (
                          <option key={column.field} value={column.field}>
                            {column.caption}
                          </option>
                        )
                    )}
                  </Input>

                  <Input
                    component="select"
                    id="filterOperator1"
                    pointer
                    style={{ minWidth: "7rem" }}
                    rightSection={
                      <div style={{ marginTop: "0.5rem" }}>
                        <FeatherIcon icon="chevron-down"></FeatherIcon>{" "}
                      </div>
                    }
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      uncommitedFilterOperator.current = e.target.value;
                    }}
                  >
                    <option value={"__empty"}>{t("datatable.filters.operatorPlaceholder")}</option>
                    <option value={"="}>(=) {t("datatable.operator.equals")}</option>
                    <option value={"!="}>(!=) {t("datatable.operator.notEquals")}</option>
                    <option value={">"}>(&gt;) {t("datatable.operator.greaterThan")}</option>
                    <option value={"<"}>(&lt;) {t("datatable.operator.lessThan")}</option>
                    <option value={">="}>(&gt;=) {t("datatable.operator.greaterOrEqual")}</option>
                    <option value={"<="}>(&lt;=) {t("datatable.operator.lessOrEqual")}</option>
                    <option value={"IN"}>(IN) {t("datatable.operator.in")}</option>
                    <option value={"STARTS"}>(STARTS) {t("datatable.operator.starts")}</option>
                    <option value={"HAS"}>(HAS) {t("datatable.operator.has")}</option>
                    <option value={"ENDS"}>(ENDS) {t("datatable.operator.ends")}</option>
                  </Input>

                  <TextInput
                    id="filterValue1"
                    style={{ width: "10rem", marginLeft: "0rem" }}
                    placeholder={t("datatable.filters.valuePlaceholder")}
                    rightSection={
                      <div style={{ marginTop: "0.5rem" }}>
                        <FeatherIcon
                          icon="corner-down-left"
                          size={16}
                        ></FeatherIcon>{" "}
                      </div>
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (
                          uncommitedFilterField.current === "__empty" ||
                          uncommitedFilterOperator.current === "__empty" ||
                          uncommitedFilterValue.current === ""
                        ) {
                          notifications.show({
                            color: "red",
                            title: t("common.error.prefix"),
                            message: t("datatable.error.allFieldsRequired"),
                            position: "top-center",
                            autoClose: 2000,
                            style: { border: "1px solid #ccc" },
                          });
                          return;
                        } else {
                          setFilters([
                            ...filters,
                            {
                              f: uncommitedFilterField.current,
                              o: uncommitedFilterOperator.current as
                                | "="
                                | "!="
                                | ">"
                                | "<"
                                | ">="
                                | "<="
                                | "LIKE"
                                | "IN"
                                | "STARTS"
                                | "HAS"
                                | "ENDS",
                              v: uncommitedFilterValue.current,
                            },
                          ]);
                        }
                      }
                    }}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      uncommitedFilterValue.current = e.target.value;
                    }}
                  />
                  <ActionIcon
                    color="light.1"
                    style={{
                      marginLeft: "1rem",
                      marginTop: "0.3rem",
                      display: "flex",
                      float: "right",
                    }}
                    onClick={() => {
                      if (
                        uncommitedFilterField.current === "__empty" ||
                        uncommitedFilterOperator.current === "__empty" ||
                        uncommitedFilterValue.current === ""
                      ) {
                        notifications.show({
                          color: "red",
                          title: t("common.error.prefix"),
                          message: t("datatable.error.allFieldsRequired"),
                          position: "top-center",
                          autoClose: 2000,
                          style: { border: "1px solid #ccc" },
                        });
                        return;
                      } else {
                        setFilters([
                          ...filters,
                          {
                            f: uncommitedFilterField.current,
                            o: uncommitedFilterOperator.current as
                              | "="
                              | "!="
                              | ">"
                              | "<"
                              | ">="
                              | "<="
                              | "LIKE"
                              | "IN"
                              | "STARTS"
                              | "HAS"
                              | "ENDS",
                            v: uncommitedFilterValue.current,
                          },
                        ]);
                      }
                    }}
                  >
                    <FeatherIcon icon="plus" size={20}></FeatherIcon>
                  </ActionIcon>
                </Input.Wrapper>
              </div>
              <div>
                <div
                  style={{
                    marginTop: "1rem",
                    marginBottom: "1rem",
                    display: "flex",
                    flexWrap: "wrap",
                  }}
                >
                  {filters.map((filter, index) => (
                    <div key={filter.f + index}>
                      <div
                        style={{
                          margin: "0.1rem",
                          position: "relative",
                          display: "flex",
                          fontSize: "0.8rem",
                        }}
                      >
                        <div
                          style={{
                            color: "grey",
                            fontWeight: "900",
                            backgroundColor: "white",
                            padding: "0.5em",
                            paddingTop: "0.2em",
                            paddingBottom: "0.2em",
                            border: "1px solid",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          {
                            config.columns.find((el) => el.field == filter.f)
                              ?.caption
                          }{" "}
                        </div>
                        <div
                          style={{
                            color: "white",
                            fontWeight: "900",
                            backgroundColor: "grey",
                            padding: "0.5em",
                            paddingTop: "0.2em",
                            paddingBottom: "0.2em",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          {filterOptionsReference[filter.o]}
                        </div>
                        <div
                          style={{
                            color: "grey",
                            fontWeight: "900",
                            backgroundColor: "white",
                            padding: "0.5em",
                            paddingTop: "0.2em",
                            paddingBottom: "0.2em",
                            border: "1px solid",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          {filter.v}
                        </div>
                        <div
                          style={{
                            color: "grey",
                            fontWeight: "900",
                            backgroundColor: "white",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <CloseButton
                            onClick={() => {
                              setFilters(filters.filter((f) => f !== filter));
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "right",
                  marginRight: "0.0rem",
                }}
              >
                <Button
                  style={styles.acbutton}
                  color="light.1"
                  leftSection={
                    <FeatherIcon icon="trash" size={16}></FeatherIcon>
                  }
                  onClick={() => {
                    setFilters([]);
                  }}
                >
                  {t("common.actions.clear")}
                </Button>
                &nbsp;
                <Button
                  style={styles.acbutton}
                  color="light.1"
                  leftSection={
                    <FeatherIcon icon="check" size={16}></FeatherIcon>
                  }
                  onClick={() => {
                    config.options?.pagination?.onPaginationChange &&
                      config.options?.pagination?.onPaginationChange({
                        pageSize: config.options?.pagination?.pageSize || 0,
                        pageIndex: 1,
                        filters: [searchFilter.current].concat(filters),
                      });
                  }}
                >
                  {t("common.actions.apply")}
                </Button>
              </div>
            </Paper>
          )}
        </div>
      )}
      <div
        style={{
          ...styles.formContainer,
          display: "flex",
          flexDirection: "row",
          marginTop: "0rem",
          marginBottom: "0rem",
          marginRight: "1rem",
          justifyContent: "flex-end",
        }}
      >
        <Input.Wrapper
          style={{ marginLeft: "1rem", display: "flex", marginTop: "0rem" }}
        >
          <Input
            component="select"
            pointer
            style={{ minWidth: "10rem" }}
            rightSection={
              <div style={{ marginTop: "0.5rem" }}>
                <FeatherIcon icon="chevron-down"></FeatherIcon>{" "}
              </div>
            }
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setSearchField(e.target.value);
              document.getElementById("searchInput")?.focus();
              (
                document.getElementById("searchInput") as HTMLInputElement
              )?.select();
            }}
          >
            <option value={"__empty"}>{t("datatable.search.fieldPlaceholder")}</option>
            {config.columns.map(
              (column) =>
                column.searchable && (
                  <option key={column.field} value={column.field}>
                    {column.caption}
                  </option>
                )
            )}
          </Input>

          <TextInput
            id="searchInput"
            ref={(el) => (uncommitedSearch.current = el?.value || "")}
            style={{ width: "15rem", marginLeft: "1rem" }}
            placeholder={t("datatable.search.placeholder")}
            rightSection={
              <div style={{ marginTop: "0.5rem" }}>
                <FeatherIcon icon="corner-down-left" size={16}></FeatherIcon>{" "}
              </div>
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (searchField === "__empty") {
                  notifications.show({
                    color: "red",
                    title: t("common.error.prefix"),
                    message: t("datatable.error.searchFieldRequired"),
                    position: "top-center",
                    autoClose: 2000,
                    style: { border: "1px solid #ccc" },
                  });
                  return;
                }
                if (uncommitedSearch.current.length < 3) {
                  notifications.show({
                    color: "red",
                    title: t("common.error.prefix"),
                    message: t("datatable.error.searchTooShort"),
                    position: "top-center",
                    autoClose: 2000,
                    style: { border: "1px solid #ccc" },
                  });
                  return;
                } else {
                  const dereferencer = config.columns.find(
                    (column) => column.field === searchField
                  )?.dereferencer;

                  let dereferenced: string[] = [];
                  if (dereferencer) {
                    dereferenced = dereferencer(
                      (e.currentTarget as HTMLInputElement).value
                    );
                  } else {
                    dereferenced = [
                      (e.currentTarget as HTMLInputElement).value,
                    ];
                  }

                  if (dereferenced.length == 0) {
                    searchFilter.current = {
                      f: searchField,
                      o: "IN",
                      v: "-1",
                    };
                  } else if (dereferenced.length == 1) {
                    if (dereferencer) {
                      searchFilter.current = {
                        f: searchField,
                        o: "=",
                        v: dereferenced[0],
                      };
                    } else {
                      searchFilter.current = {
                        f: searchField,
                        o: "HAS",
                        v: dereferenced[0],
                      };
                    }
                  } else {
                    searchFilter.current = {
                      f: searchField,
                      o: "IN",
                      v: dereferenced.join(","),
                    };
                  }
                }

                config.options?.pagination?.onPaginationChange &&
                  config.options?.pagination?.onPaginationChange({
                    pageSize: config.options?.pagination?.pageSize || 0,
                    pageIndex: 1,
                    filters: [searchFilter.current].concat(filters),
                  });
              }
            }}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              if (
                e.target.value.length < 3 &&
                uncommitedSearch.current.length >= 3
              ) {
                searchFilter.current = {} as filterQuery;

                config.options?.pagination?.onPaginationChange &&
                  config.options?.pagination?.onPaginationChange({
                    pageSize: config.options?.pagination?.pageSize || 0,
                    pageIndex: 1,
                    filters: [searchFilter.current].concat(filters),
                  });
              }
              uncommitedSearch.current = e.target.value;
            }}
          />
        </Input.Wrapper>
      </div>
    </div>
  );
}

function PaginationControls({
  config,
  cssstyles,
}: {
  config: dataTableParamsInterface;
  cssstyles?: CSSProperties;
}) {
  const { t } = useI18n();

  const styles: { [key: string]: CSSProperties } = (cssstyles as {
    [key: string]: CSSProperties;
  }) || {
    formContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    acbutton: {
      padding: "0.5rem",
      margin: "0.5rem",
      border: "none",
      borderRadius: "0.25rem",
      cursor: "pointer",
    },
  };
  const options = config.options?.pagination;

  if (!options?.pageSizeOptions.find((option) => options.pageSize === option)) {
    throw new Error(t("datatable.pagination.rowsPerPageError"));
  }

  const [page, setPage] = useState<number>(options?.pageIndex || 1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(options.pageSize);
  const [totalRows, setTotalRows] = useState<number>(options.totalRows);

  const pageRef = useRef<number>(page);

  useEffect(() => {
    if (options.totalRows !== totalRows) {
      setTotalRows(options.totalRows);
    }
    pageRef.current = options.pageIndex + 1;
    }, [options, rowsPerPage, totalRows]);

  useEffect(() => {
    options.onPaginationChange &&
      options.onPaginationChange({
        pageSize: rowsPerPage,
        pageIndex: options.pageIndex || 1,
        filters: options.filters,
        orders: options.orders,
      });
    }, [options, rowsPerPage]);

  const setPageRef = (value: number) => {
    pageRef.current = value;

    options.onPaginationChange &&
      options.onPaginationChange({
        pageSize: rowsPerPage,
        pageIndex: pageRef.current,
        filters: options.filters,
        orders: options.orders,
      });
    setPage(value);
  };

  return (
    <div
      style={{
        ...styles.formContainer,
        display: "flex",
        flexDirection: "row",
        marginTop: "1rem",
        marginBottom: "8rem",
      }}
    >
      <Pagination
        color="light.1"
        total={Math.ceil(totalRows / rowsPerPage)}
        value={pageRef.current}
        onChange={setPageRef}
      />

      <Input.Wrapper
        style={{ marginLeft: "1rem", display: "flex", marginTop: "-0.1rem" }}
      >
        <Input
          component="select"
          value={rowsPerPage}
          onChange={(e) => {
            setRowsPerPage(Number(e.target.value));
            setPageRef(1);
          }}
          pointer
          rightSection={
            <div style={{ marginTop: "0.5rem" }}>
              <FeatherIcon icon="chevron-down"></FeatherIcon>{" "}
            </div>
          }
        >
          {options?.pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Input>
        <div style={{ marginTop: "0.5em", marginLeft: "1em" }}>
          <Text size="sm">{options?.pageSizeCaption}</Text>
        </div>
      </Input.Wrapper>
    </div>
  );
}

export function DataTable({
  config,
  cssstyles,
}: {
  config: dataTableParamsInterface;
  cssstyles?: CSSProperties;
}) {
  const { t } = useI18n();

  const styles: { [key: string]: CSSProperties } = (cssstyles as {
    [key: string]: CSSProperties;
  }) && {
    rulesContainer: {
      display: "flex",
      flexDirection: "column",
      width: "100%",
    },
    acbutton: {
      padding: "0.5rem",
      margin: "0.5rem",
      border: "none",
      borderRadius: "0.25rem",
      cursor: "pointer",
    },
    formGroup: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    tableContainer: {
      height: "clamp(410px, 37.963vh, 820px)",
      overflowY: "auto",
      width: "100%",
      borderBottom: "1px solid #ddd",
      marginBottom: "1rem",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
    },
    thead: {
      position: "sticky",
      top: "0px",
      backgroundColor: "white",
      zIndex: 80,
      borderBottom: "1px solid #ccc",
      borderCollapse: "separate",
      boxShadow: "0px 1px 1px 0px rgb(199, 199, 199)",
      paddingBottom: "10px",
    },
    tbody: {
      overflowY: "auto",
    },
    th: {
      padding: "0.5rem",
      borderBottom: "2px solid #ccc",
      textAlign: "left",
      marginBottom: "1rem",
    },
    td: {
      padding: "0.5rem",
      borderBottom: "2px solid #ccc",
      textAlign: "left",
      marginBottom: "1rem",
    },
  };

  const [selectedRows, setSelectedRows] = useState<Array<unknown>>([]);
  const [viewActionsMenu, setViewActionsMenu] = useState<boolean>(false);

  useEffect(() => {
    if (config.options?.selection?.onSelectionChange)
      config.options?.selection?.onSelectionChange(selectedRows);
    }, [config.options?.selection, selectedRows]);

  useEffect(() => {
    setSelectedRows([]);
  }, [
    config.options?.pagination?.filters,
    config.options?.pagination?.orders,
    config.options?.pagination?.pageIndex,
    config.options?.pagination?.pageSize,
  ]);

  return (
    <Box pos="relative">
      <LoadingOverlay
        visible={config.loading || false}
        overlayProps={{ zIndex: 1000, opacity: 10, radius: "xs" }}
      />
      <div style={styles.rulesContainer}>
        {config.caption && config.caption}
        {config.options?.showDataControls && (
          <DataManagementControls config={config} cssstyles={cssstyles} />
        )}

        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead style={styles.thead}>
              <tr style={styles.thead}>
                {!config.options?.selection?.selectAllRows &&
                  config.options?.selection?.enabled && (
                    <th
                      style={{
                        padding: "0.5rem",
                        borderBottom: "2px solid #ccc",
                        textAlign: "left",
                        marginBottom: "1rem",
                      }}
                    ></th>
                  )}

                {config.options?.selection?.enabled &&
                  config.options?.selection?.selectAllRows && (
                    <th
                      style={{
                        padding: "0.5rem",
                        paddingLeft: "0.5rem",
                        borderBottom: "2px solid #ccc",
                        textAlign: "left",
                      }}
                    >
                      <Checkbox
                        color="light.1"
                        title={t("datatable.selection.all")}
                        checked={
                          selectedRows.length == config.data.length
                            ? true
                            : false
                        }
                        onChange={() => {
                          if (selectedRows === config.data) {
                            setSelectedRows([]);
                          } else {
                            setSelectedRows(config.data);
                          }
                        }}
                        style={{
                          accentColor:
                            selectedRows != config.data &&
                            selectedRows.length > 0
                              ? "grey"
                              : "",
                        }}
                      />
                    </th>
                  )}
                {config.columns.map(
                  (column) =>
                    column.visible !== false && (
                      <th
                        key={column.field}
                        style={{
                          borderBottom: "2px solid #ccc",
                          paddingRight: "0.5rem",
                          paddingLeft: "0.5rem",
                          paddingBottom: "0.0rem",
                          textAlign:
                            (column.align as "left" | "right" | "center") ||
                            "left",
                          width: column.width || "auto",
                        }}
                      >
                        {(config.options?.groupActions && column.actions && (
                          <>
                            <Button
                              disabled={selectedRows.length === 0}
                              style={styles.acbutton}
                              color="light.1"
                              leftSection={
                                <FeatherIcon
                                  icon="menu"
                                  size={16}
                                ></FeatherIcon>
                              }
                              rightSection={
                                <div
                                  style={{
                                    marginLeft: "0.5rem",
                                    backgroundColor: "#fff",
                                    color: "CaptionText",
                                    borderRadius: "0.25rem",
                                    padding: "0.25rem",
                                  }}
                                >
                                  {selectedRows.length > 0
                                    ? selectedRows.length
                                    : "\u00A0\u00A0"}
                                </div>
                              }
                              onClick={() => {
                                setViewActionsMenu(!viewActionsMenu);
                              }}
                            >
                              {column.caption}
                            </Button>
                            {viewActionsMenu && (
                              <Paper
                                shadow="xl"
                                radius="md"
                                style={{
                                  margin: "0rem",
                                  marginTop: "-0.2rem",
                                  position: "absolute",
                                  zIndex: 900,
                                  border: "1px solid #ccc",
                                  boxShadow:
                                    "0px 1px 4px 0px rgb(139, 139, 139)",
                                  maxWidth: "30rem",
                                  padding: "0.2rem",
                                  right: "10px",
                                }}
                                onMouseLeave={() => {
                                  setViewActionsMenu(false);
                                }}
                              >
                                <Button.Group orientation="vertical">
                                  {config.options?.groupActions?.map(
                                    (action, index) => (
                                      <Button
                                        key={action.caption + index}
                                        variant="light"
                                        color="#666"
                                        autoContrast
                                        style={{
                                          minWidth: "130px",
                                        }}
                                        onClick={() => {
                                          setViewActionsMenu(false);
                                          action.action(selectedRows);
                                        }}
                                        leftSection={action.icon}
                                      >
                                        {action.caption}
                                      </Button>
                                    )
                                  )}
                                </Button.Group>
                              </Paper>
                            )}
                          </>
                        )) ||
                          column.caption}
                      </th>
                    )
                )}
              </tr>
            </thead>

            <tbody>
              {config.data
                .slice(0, config.options?.pagination?.pageSize)
                .map((row) => (
                  <tr key={row.id}>
                    {config.options?.selection?.enabled && (
                      <td
                        style={{
                          padding: "0.5rem",
                          borderBottom: "1px solid #ddd",
                          textAlign: "left",
                        }}
                      >
                        <Checkbox
                          color="light.1"
                          title={t("datatable.selection.row")}
                          checked={selectedRows.includes(row)}
                          onChange={() => {
                            if (selectedRows.includes(row)) {
                              setSelectedRows(
                                selectedRows.filter((r) => r !== row)
                              );
                            } else {
                              setSelectedRows([...selectedRows, row]);
                            }
                          }}
                        />
                      </td>
                    )}
                    {config.columns.map(
                      (column) =>
                        (!column.actions && column.visible !== false && (
                          <td
                            key={column.field}
                            style={{
                              padding: "0.5rem",
                              borderBottom: "1px solid #ddd",
                              textAlign:
                                (column.align as "left" | "right" | "center") ||
                                "left",
                              width: column.width || "auto",
                            }}
                          >
                            {(column.formatter &&
                              column.formatter(row[column.field])) ||
                              row[column.field]}
                          </td>
                        )) ||
                        (column.actions && column.visible !== false && (
                          <td
                            key={column.field}
                            style={{
                              padding: "0.5rem",
                              borderBottom: "1px solid #ddd",
                              textAlign:
                                (column.align as "left" | "right" | "center") ||
                                "left",
                              width: column.width || "auto",
                            }}
                          >
                            {config.options?.actionsColumn?.map((action) => (
                              <Button
                                color="light.1"
                                key={action.caption}
                                style={styles.acbutton}
                                onClick={() => action.action(row)}
                              >
                                {action.icon}&nbsp;
                                {action.caption}
                              </Button>
                            ))}
                          </td>
                        ))
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div>
          <div style={{ float: "right", marginRight: "1rem" }}>
            {config.options?.pagination?.enabled && (
              <PaginationControls config={config} cssstyles={cssstyles} />
            )}
          </div>
        </div>
      </div>
    </Box>
  );
}
