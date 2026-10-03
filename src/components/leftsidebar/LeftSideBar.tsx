import { ReactElement, useContext, useEffect, useRef, useState } from "react";
import { Center, Stack, Tooltip } from "@mantine/core";
import classes from "@components/leftsidebar/component.module.css";
import {
  PetIconGrooming,
  PetIconShop,
  PetIconVet,
  PetIconHotel,
  PetIconHacker,
  PetIconSettings,
  PetIconPetOwner,
  PetIconPet,
  PetIconSchedule,
  PetIconInventory,
  PetIconHouses,
} from "../peticons/PetIcons";

import Logo from "/logo.svg";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { UserContext, UserContextInterface } from "../../classes/contexts/UserContext";
import { decodeAccessToken } from "../../classes/utils/auth";
import { RoutePermissionContext } from "../../classes/contexts/RoutePermissionContext";
import { useI18n } from "../../i18n/I18nContext";
import { useNavigationStack } from "../../classes/contexts/NavigationStackContext";
import { useActivityDiscardGuard } from "../activity/ActivityModal";

const sidebarOperations: Record<string, string> = {
  "/home/main": "dashboard.view",
  "/home/tutors": "tutors.view",
  "/home/animals": "animals.view",
  "/home/storefront": "storefront.view",
  "/home/veterinaria": "veterinary.view",
  "/home/grooming": "grooming.view",
  "/home/hotel": "hotel.view",
  "/home/inventory": "inventory.view",
  "/home/button-showcase": "ui.showcase",
  "/actions/logout": "session.logout",
  "/home/rules": "rules.view",
};

interface NavbarLinkProps {
  icon: ReactElement;
  label: string;
  active?: boolean;
  onClick?: () => void;
  clickUrl?: string;
  operation?: string;
}

function NavbarLink({ icon, label, clickUrl, onClick, active, operation: explicitOperation }: NavbarLinkProps) {
  const permissions = useContext(RoutePermissionContext);
  const { clearNavigationStack } = useNavigationStack();
  const requestDiscard = useActivityDiscardGuard();
  const navigate = useNavigate();
  const operation = explicitOperation || (clickUrl ? sidebarOperations[clickUrl] : undefined);
  if (clickUrl && (!permissions?.routes || !permissions.canPerform(operation ?? ""))) return null;
  return (
    <Tooltip label={label} position="right" zIndex={11010} withinPortal transitionProps={{ duration: 0 }}>
      {onClick ? (
        <button className={classes.link} type="button" onClick={onClick} data-active={active || undefined} data-permission-operation={operation} data-permission-audience="KAHU">
          {icon}
        </button>
      ) : (
        <Link className={classes.link} to={{ pathname: clickUrl }} onClick={(event) => { event.preventDefault(); requestDiscard(() => { clearNavigationStack(); navigate(clickUrl!); }); }} viewTransition data-active={active || undefined} data-permission-operation={operation} data-permission-audience="KAHU">
          {icon}
        </Link>
      )}
    </Tooltip>
  );
}

export default function LeftSideBar() {
  const userContext = useContext(UserContext) as UserContextInterface;
  const identity = decodeAccessToken(userContext.config.apiData.apiAuthHeaderValue);
  const [topOffset, setTopOffset] = useState(0);
  const navbarRef = useRef<HTMLElement | null>(null);
  const location = useLocation();
  const isSuperuser = identity?.clearance === "SUP";
  const { t } = useI18n();
  const { clearNavigationStack } = useNavigationStack();

  const isActiveRoute = (path?: string) => {
    if (!path) return false;

    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  useEffect(() => {
    const updateOffset = () => {
      const navbar = navbarRef.current;
      if (!navbar) return;

      const contentHeight = navbar.scrollHeight;
      const viewportHeight = window.innerHeight;
      document.body.style.minHeight = `${contentHeight}px`;

      if (contentHeight <= viewportHeight) {
        setTopOffset(0);
        return;
      }

      const lowestTop = viewportHeight - contentHeight;
      setTopOffset(Math.max(lowestTop, -window.scrollY));
    };

    updateOffset();
    window.addEventListener("scroll", updateOffset, { passive: true });
    window.addEventListener("resize", updateOffset);

    return () => {
      window.removeEventListener("scroll", updateOffset);
      window.removeEventListener("resize", updateOffset);
      document.body.style.minHeight = "";
    };
  }, [isSuperuser]);

  return (
    <>
      <nav ref={navbarRef} className={classes.navbar} style={{ top: topOffset }}>
        <Center>
          <Link to="/home/dash" className={classes.logoLink} onClick={clearNavigationStack} aria-label={t("app.dashboard.title")} viewTransition data-permission-operation="dashboard.view" data-permission-audience="KAHU">
            <img src={Logo} alt={t("common.logoAlt")} className={classes.logo} />
          </Link>
        </Center>

        <div className={classes.navbarMain}>
          <Stack justify="center" gap={0}>
            <NavbarLink
              icon={<PetIconHouses />}
              label={t("nav.main")}
              clickUrl="/home/main"
              active={isActiveRoute("/home/main")}
            />
            <NavbarLink
              icon={<PetIconPetOwner />}
              label={t("nav.tutors")}
              clickUrl="/home/tutors"
              active={isActiveRoute("/home/tutors")}
            />
            <NavbarLink
              icon={<PetIconPet />}
              label={t("nav.animals")}
              clickUrl="/home/animals"
              active={isActiveRoute("/home/animals")}
            />
            <NavbarLink
              icon={<PetIconShop />}
              label={t("nav.shop")}
              clickUrl="/home/storefront"
              active={isActiveRoute("/home/storefront")}
            />
            <NavbarLink
              icon={<PetIconVet />}
              label={t("nav.vet")}
              clickUrl="/home/veterinaria"
              active={isActiveRoute("/home/veterinaria") || isActiveRoute("/home/veterinary")}
            />
            <NavbarLink
              icon={<PetIconGrooming />}
              label={t("nav.grooming")}
              clickUrl="/home/grooming"
              active={isActiveRoute("/home/grooming")}
            />
           
            <NavbarLink
              icon={<PetIconHotel />}
              label={t("nav.hotel")}
              clickUrl="/home/hotel"
              active={isActiveRoute("/home/hotel")}
            />
            <NavbarLink
              icon={<PetIconInventory />}
              label={t("nav.inventory")}
              clickUrl="/home/inventory"
              active={isActiveRoute("/home/inventory")}
            />
          </Stack>
        </div>

        <Stack justify="center" gap={0}>
          <NavbarLink
            icon={<PetIconSchedule />}
            label={t("nav.buttonShowcase")}
            clickUrl="/home/button-showcase"
            active={isActiveRoute("/home/button-showcase") || isActiveRoute("/home/buttons")}
          />
          <NavbarLink
            icon={<PetIconHacker />}
            label={t("nav.user")}
            clickUrl="/actions/logout"
            active={isActiveRoute("/actions/logout")}
          />
          <NavbarLink
            icon={<PetIconSettings />}
            label={t("nav.settings")}
            clickUrl="/home/rules"
            active={isActiveRoute("/home/rules")}
          />
        </Stack>
      </nav>
    </>
  );
}
