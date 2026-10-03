enum installmentStatus {
  pending = 0,
  paid = 1,
}

enum categoryRecursivity {
  oneTime = 0,
  recursive = 1,
}

enum scheduleStatus {
  noSchedule = 0,
  hasSchedule = 1,
}

enum connectionStatusFlags {
  disconnected = 0,
  connected = 1,
}

enum operationStatus {
  success = 0,
  error = 1,
}

enum logLevel {
  none = "none",
  debug = "debug",
  info = "info",
  warning = "warning",
  error = "error",
}

enum databaseMode {
  mock = 0,
  live = 1,
}

enum paramOrigin {
  body = "body",
  query = "query",
  session = "session",
}

export {
  categoryRecursivity,
  connectionStatusFlags,
  installmentStatus,
  operationStatus,
  scheduleStatus,
  logLevel,
  databaseMode, 
  paramOrigin
};
