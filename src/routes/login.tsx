import {
  Anchor,
  Button,
  Checkbox,
  Paper,
  PasswordInput,
  TextInput,
  Title,
} from "@mantine/core";

import classes from "@css/login.module.css";
import sidebarClasses from "@css/create-account.module.css";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ThreeDots } from "react-loader-spinner";
import { notifications } from "@mantine/notifications";
import LoginBroker from "../classes/brokers/LoginBroker";
import { loginResponse } from "../primitives/apiBrokerInterfaces";
import { kahuAuthApp } from "../classes/utils/sessionRenewal";
import { UserContext, UserContextInterface } from "../classes/contexts/UserContext";
import Logo from "/logo.svg";
import { useI18n } from "../i18n/I18nContext";





const backgrounds = [
  "/photos/1.jpeg",
  "/photos/2.jpeg",
  "/photos/3.jpeg",
  "/photos/4.jpeg",
  "/photos/5.jpeg",
  "/photos/6.jpeg",
  "/photos/7.jpeg",
];

export default function Login() {
  const [login, setLogin] = useState(localStorage.getItem("login") || "");
  const [password, setPassword] = useState("");
  const [keepLogged, setKeepLogged] = useState(
    localStorage.getItem("keepLogged") === "true"
  );
  const [visibleBackground, setVisibleBackground] = useState(() =>
    Math.floor(Math.random() * backgrounds.length)
  );
  const [enabledButton, setEnabledButton] = useState(true);
  const submittingRef = useRef(false);
  const userContext = useContext(UserContext) as UserContextInterface;
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    userContext.config.clearApiData();
    userContext.setImpersonatedUser(null);
  }, [userContext]);

  const advanceBackground = useCallback(() => {
    setVisibleBackground((current) => (current + 1) % backgrounds.length);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(advanceBackground, 15000);
    return () => window.clearTimeout(timeoutId);
  }, [advanceBackground, visibleBackground]);

  const stopFormClickPropagation = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    <div
      className={classes.wrapper}
      onClick={advanceBackground}
    >
      {backgrounds.map((background, index) => (
        <div
          className={`${classes.backgroundLayer} ${
            index === visibleBackground ? classes.backgroundLayerVisible : ""
          }`}
          key={background}
          style={{ backgroundImage: `url(${background})` }}
        />
      ))}
      <Paper
        className={`${sidebarClasses.aside} ${classes.form}`}
        radius={0}
        onClick={stopFormClickPropagation}
      >
        <div className={sidebarClasses.asideContent}>
        <Title order={2} className={classes.title} ta="center" mt={0} mb={0}>
          <img src={Logo} alt={t("common.logoAlt")} className={sidebarClasses.brand} />
        </Title>

        <div className={classes.fields}>
        <TextInput
          label={t("common.fields.login")}
          placeholder="meu@email.com"
          size="md"
          value={login}
          onChange={(event) => setLogin(event.currentTarget.value)}
        />
        <PasswordInput
          label={t("common.fields.password")}
          placeholder={t("login.passwordPlaceholder")}
          mt="md"
          size="md"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
        />
        <Checkbox
        color="light.1"
          label={t("login.keepCredentials")}
          mt="xl"
          size="md"
          checked={keepLogged}
          onChange={() => {
            setKeepLogged(!keepLogged);
          }}
        />
        <Button
        color="light.1"
          fullWidth
          mt="xl"
          size="md"
          disabled={!enabledButton}
          onClick={() => {
            if (submittingRef.current) return;
            submittingRef.current = true;
            setEnabledButton(false);

            if (keepLogged) {
              localStorage.setItem("login", login);
              localStorage.setItem("keepLogged", keepLogged.toString());
            } else {
              localStorage.removeItem("login");
              localStorage.removeItem("keepLogged");
            }

            userContext.config.clearApiData();
            userContext.setImpersonatedUser(null);
            const loginBroker = new LoginBroker(userContext.config.apiData);

            loginBroker
              .login({
                route: userContext.config.getRoute("login"),
                data: {
                  login: login,
                  password: password,
                  app: kahuAuthApp,
                },
              })
              .then((response: loginResponse) => {
                if (response?.status == 1) {
                  notifications.show({
                    color: "red",
                    title: t("common.error.title", { message: response.message }),
                    message:
                      t("login.invalidCredentials"),
                    position: "top-center",
                    classNames: classes,
                    autoClose: 2000,
                    style: { border: "1px solid #ccc" },
                    onClose: () => {
                      submittingRef.current = false;
                      setEnabledButton(true);
                    },
                  });
                } else if (response?.status == 0) {
                  //console.log(response);

                  userContext.config.setApiData({
                    ...userContext.config.apiData,
                    apiAuthHeaderValue: response.session.token,
                    apiRefreshToken: response.session.refreshToken,
                    apiExpiration: response.session.expiration,
                    apiTomaClientToken: response.session.toma?.clientToken ?? "",
                    apiTomaSocketUrl: response.session.toma?.socketUrl ?? "",
                    apiTomaCredentialVersion: response.session.toma?.credentialVersion ?? "",
                  });
                  userContext.config.storeApiData();

                  notifications.show({
                    color: "green",
                    title: t("login.successTitle", { message: response.message }),
                    message: t("login.successMessage"),
                    position: "top-center",
                    autoClose: 1200,
                    style: { border: "1px solid #ccc" },
                    loading: true,
                    classNames: classes,
                  });
                  navigate("/home/dash", { replace: true });
                }
              }).catch((e:Error) => {
                notifications.show({
                  color: "red",
                  title: t("common.error.title", { message: e.message }),
                  message:
                    t("login.failureMessage"),
                  position: "top-center",
                  classNames: classes,
                  autoClose: 2000,
                  style: { border: "1px solid #ccc" },
                  onClose: () => {
                    submittingRef.current = false;
                    setEnabledButton(true);
                  },
                });
              }) ;
          }}
        >
          {enabledButton && <>{t("login.signIn")}</>}
          {!enabledButton && <ThreeDots color="grey" height={10} width={30} />}
        </Button>
        </div>
        <div className={`${classes.createAccount} ${sidebarClasses.loginLink}`}>
          <span>{t("login.noAccount")}</span>
          <Anchor component={Link} to="/create">
            {t("login.createAccount")}
          </Anchor>
        </div>
        </div>
      </Paper>
    </div>
  );
}
