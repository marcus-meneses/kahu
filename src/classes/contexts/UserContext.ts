import { createContext } from "react";

import { ConfigInterface } from "../config/Config";

export interface ImpersonatedUser {
  id: string;
  customerId: string;
  customerName: string;
  cityId?: string | null;
  login?: string | null;
  name?: string | null;
  email?: string | null;
  accessToken: string;
  expiresIn?: string;
}

export interface UserContextInterface {
  config: ConfigInterface;
  impersonatedUser: ImpersonatedUser | null;
  setImpersonatedUser: (user: ImpersonatedUser | null) => void;
}

export const UserContext = createContext<UserContextInterface | null>(null);
