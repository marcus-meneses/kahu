import { useParams, useNavigate } from "react-router-dom";
import LoginBroker from "../classes/brokers/LoginBroker";
import { UserContext, UserContextInterface } from "../classes/contexts/UserContext";
import { useContext, useEffect, useState } from "react";

export default function Actions() {
  const { action } = useParams();
  const navigate = useNavigate();
  const userContext = useContext(UserContext) as UserContextInterface;
  const [dump, setDump] = useState("");

  useEffect(() => {
    const loginBroker = new LoginBroker(userContext.config.apiData);
    const refreshToken = userContext.config.apiData.apiRefreshToken;

    if (action === "logout") {
      void loginBroker.logout({ route: userContext.config.routesData.logout, data: { refreshToken } }).finally(() => {
        userContext.config.clearApiData();
        userContext.setImpersonatedUser(null);
        navigate("/login", { replace: true });
      });
      return;
    }

    if (action === "renew") {
      void loginBroker
        .renew({ route: userContext.config.routesData.renew, data: { refreshToken } })
        .then((response) => {
          if (response.status === 0) {
            userContext.config.setApiData({
              ...userContext.config.apiData,
              apiAuthHeaderValue: response.session.token,
              apiRefreshToken: response.session.refreshToken,
              apiExpiration: response.session.expiration,
            });
            userContext.config.storeApiData();
          }
          navigate("/", { replace: true });
        });
      return;
    }

    if (action === "revoke") {
      void loginBroker.revoke({ route: userContext.config.routesData.revoke, data: { refreshToken } }).finally(() => {
        userContext.config.clearApiData();
        userContext.setImpersonatedUser(null);
        navigate("/", { replace: true });
      });
      return;
    }

    if (action === "dump") {
      void loginBroker.dump().then((response) => {
        setDump(JSON.stringify(response));
      });
    }
  }, [action, navigate, userContext.config]);

  return <div>{dump}</div>;
}
