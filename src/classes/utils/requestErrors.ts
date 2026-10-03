import { ApiPermissionError } from "../../primitives/ApiBroker";

export const shouldShowRequestError = (error: unknown) => !(error instanceof ApiPermissionError);
